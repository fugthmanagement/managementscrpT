import { NextResponse } from "next/server";
import { decrypt, encrypt, googleToken, integrationDoc, readGoogleState } from "../../../../../lib/server/google-calendar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://www.fugthmanagement.space";
function back(result) {
  const url = new URL("/dashboard", BASE);
  url.searchParams.set("integration", result);
  const response = NextResponse.redirect(url);
  response.cookies.set("fugth_google_oauth", "", { path: "/api/integrations/google/callback", maxAge: 0, httpOnly: true, secure: true, sameSite: "lax" });
  return response;
}
export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.has("error")) return back("authorization-cancelled");
  try {
    const code = url.searchParams.get("code");
    if (!code) return back("authorization-error");
    const { uid, nonce } = readGoogleState(url.searchParams.get("state"));
    const cookie = req.cookies.get("fugth_google_oauth")?.value;
    if (!cookie || nonce !== cookie) return back("authorization-expired");
    const result = await googleToken({ code });
    const ref = integrationDoc(uid);
    const existing = await ref.get();
    const previous = existing.exists ? decrypt(existing.data().secret) : {};
    const credentials = {
      access_token: result.access_token,
      refresh_token: result.refresh_token || previous.refresh_token,
      expires_at: Date.now() + (result.expires_in || 3600) * 1000,
    };
    if (!credentials.refresh_token) return back("authorization-error");
    await ref.set({
      provider: "google_calendar",
      secret: encrypt(credentials),
      connectedAt: existing.data()?.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return back("google-connected");
  } catch { return back("authorization-error"); }
}
