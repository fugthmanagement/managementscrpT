import { NextResponse } from "next/server";
import { authenticatedUser } from "../../../../lib/server/auth";
import { buildGoogleUrl, decrypt, integrationConfigured, integrationDoc } from "../../../../lib/server/google-calendar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!integrationConfigured()) return NextResponse.json({ connected: false, configured: false });
  try {
    const snap = await integrationDoc(user.uid).get();
    const sheet=await (snap.exists?integrationDoc(user.uid).parent.doc("google_sheet").get():Promise.resolve(null));
    return NextResponse.json({ configured: true, connected: snap.exists, docsConnected: snap.exists && String(snap.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/drive.file"), sheetsConnected:snap.exists && String(snap.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/spreadsheets"), gmailConnected:snap.exists && String(snap.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/gmail.send"), operationsSheetUrl:sheet?.data()?.url||null, connectedAt: snap.data()?.connectedAt || null });
  } catch { return NextResponse.json({ configured: false, connected: false, error: "Calendar service configuration is incomplete." }); }
}
export async function POST(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!integrationConfigured()) return NextResponse.json({ error: "Google Calendar integration is not configured yet." }, { status: 503 });
  try {
    const { url, nonce } = buildGoogleUrl(user.uid);
    const response = NextResponse.json({ url });
    response.cookies.set("fugth_google_oauth", nonce, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/api/integrations/google/callback", maxAge: 600,
    });
    return response;
  } catch { return NextResponse.json({ error: "Unable to start calendar authorization." }, { status: 500 }); }
}
export async function DELETE(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const ref = integrationDoc(user.uid);
    const snap = await ref.get();
    if (snap.exists) {
      try {
        const token = decrypt(snap.data().secret).refresh_token;
        if (token) await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(token), { method: "POST" });
      } catch { /* Best effort revocation; credential is always removed locally. */ }
      await ref.delete();
    }
    return NextResponse.json({ connected: false });
  } catch { return NextResponse.json({ error: "Could not disconnect this calendar." }, { status: 500 }); }
}
