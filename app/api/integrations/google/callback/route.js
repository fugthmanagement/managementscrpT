import { NextResponse } from "next/server";
import { decrypt, encrypt, googleToken, integrationDoc, readGoogleState, ensureGoogleOperationsSheet, ensureFugthBusinessCalendar } from "../../../../../lib/server/google-calendar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://www.fugthmanagement.space";
function back(result) {
  const url = new URL("/dashboard", BASE);
  url.searchParams.set("integration", result);
  const response = NextResponse.redirect(url);
  response.cookies.set("fugth_google_oauth","",{
    path:"/api/integrations/google/callback",maxAge:0,httpOnly:true,secure:true,sameSite:"lax",
    ...(new URL(BASE).hostname.endsWith("fugthmanagement.space")?{domain:"fugthmanagement.space"}:{})
  });
  return response;
}
export async function GET(req) {
  const url = new URL(req.url);
  if(url.searchParams.has("error")){
    const reason=url.searchParams.get("error");
    return back(reason==="access_denied"?"authorization-cancelled":"google-oauth-denied");
  }
  try {
    const code = url.searchParams.get("code");
    if (!code) return back("authorization-error");
    const {uid,nonce,feature}=readGoogleState(url.searchParams.get("state"));
    const cookie = req.cookies.get("fugth_google_oauth")?.value;
    if (!cookie || nonce !== cookie) return back("authorization-expired");
    const result = await googleToken({ code });
    const ref = integrationDoc(uid);
    const existing = await ref.get();
    const previous = existing.exists&&existing.data()?.secret ? decrypt(existing.data().secret) : {};
    const storedEntry=existing.exists?existing.data():{};
    const credentials = {
      access_token: result.access_token,
      refresh_token: result.refresh_token || previous.refresh_token,
      expires_at: Date.now() + (result.expires_in || 3600) * 1000,
    };
    if (!credentials.refresh_token) return back("google-refresh-missing");
    // Record the connected account for clear per-business ownership.
    let email="";
    try{
      const info=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{
        headers:{Authorization:"Bearer "+credentials.access_token},cache:"no-store",
        signal:AbortSignal.timeout(8000)});
      if(info.ok){const data=await info.json();if(data.email_verified)email=String(data.email||"").slice(0,180);}
    }catch{/* Connection can be completed without the display email. */}

    await ref.set({
      provider: "google_workspace",
      scopes: result.scope || storedEntry.scopes || "",
      ...(email?{googleEmail:email}:{}),
      secret: encrypt(credentials),
      connectedAt: storedEntry.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    // A workbook is provisioned in the customer's own connected Google account.
    // If Google Sheets is not enabled yet, Calendar remains connected and the
    // customer can reconnect after the provider setup is completed.
    if(feature==="sheets"||String(result.scope||"").includes("https://www.googleapis.com/auth/spreadsheets"))
      try{await ensureGoogleOperationsSheet(uid,credentials.access_token);}
      catch(error){console.warn("Google operations workbook setup pending",{code:error?.code||"sheets"});}
    try { await ensureFugthBusinessCalendar(uid,credentials.access_token); } catch (error) { console.warn("Google business calendar setup pending",error?.message||"unknown"); }
    return back("google-connected");
  } catch(error){
    console.warn("FUGTH Google OAuth callback failed",{reason:error?.oauthCode||error?.code||"callback"});
    return back(error?.oauthCode==="invalid_client"||error?.oauthCode==="unauthorized_client"
      ?"google-invalid-client":error?.oauthCode==="invalid_grant"?"google-authorization-expired":"authorization-error");
  }
}
