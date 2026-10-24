import { NextResponse } from "next/server";
import { authenticatedUser,isFounder,firebaseAdmin } from "../../../../lib/server/auth";
import { buildGoogleUrl, decrypt, googleOAuthPublicSettings, integrationConfigured, integrationDoc } from "../../../../lib/server/google-calendar";
import {archiveConnection} from "../../../../lib/server/drive-recordings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const own=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
function configurationIssues(){const issues=[];
 if(!process.env.GOOGLE_CLIENT_ID)issues.push("GOOGLE_CLIENT_ID");
 if(!process.env.GOOGLE_CLIENT_SECRET)issues.push("GOOGLE_CLIENT_SECRET");
 if(!/^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_ENCRYPTION_KEY||""))issues.push("INTEGRATION_ENCRYPTION_KEY");
 if(!(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)))issues.push("FIREBASE_ADMIN");
 try{const url=new URL(process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space");if(url.protocol!=="https:")issues.push("APP_HTTPS_URL");}catch{issues.push("APP_HTTPS_URL");}
 return issues;
}
const permission=(scopes,name)=>String(scopes||"").split(" ").includes("https://www.googleapis.com/auth/"+name);

export async function GET(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const missing=configurationIssues();
  if(missing.length||!integrationConfigured())
    return NextResponse.json({connected:false,configured:false,missing,oauth:googleOAuthPublicSettings(),
      error:"Google connections need server setup. Ask the FUGTH administrator to check Vercel environment variables and authorized Google redirect URI."});

  try {
    const snap = await integrationDoc(user.uid).get();
    const sheet=await (snap.exists?integrationDoc(user.uid).parent.doc("google_sheet").get():Promise.resolve(null));
    const recordingArchive=await archiveConnection(user.uid);
    const scopes=snap.data()?.scopes||"";
    const calendarAuthorized=snap.exists&&permission(scopes,"calendar");
    const driveAuthorized=snap.exists&&permission(scopes,"drive.file");
    let calendarServiceReady=Boolean(calendarAuthorized);
    let centralCalendarReady=false;
    if(process.env.FUGTH_CALENDAR_OWNER_EMAIL){
      try{
        const owner=await firebaseAdmin().auth().getUserByEmail(process.env.FUGTH_CALENDAR_OWNER_EMAIL);
        const shared=await integrationDoc(owner.uid).get();
        centralCalendarReady=Boolean(shared.exists&&String(shared.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/calendar"));
        calendarServiceReady=calendarServiceReady||centralCalendarReady;
      }catch{/* Central setup is incomplete; customer can still connect their own calendar. */}
    }
    return NextResponse.json({ configured:true,missing:[],oauth:googleOAuthPublicSettings(),connected:snap.exists,
      calendarAuthorized,calendarServiceReady,centralCalendarReady,
      driveAuthorized,recordingDriveAuthorized:recordingArchive.connected,
      recordingArchiveCentral:recordingArchive.sharedArchive,
      docsConnected:driveAuthorized,sheetsConnected:snap.exists&&permission(scopes,"spreadsheets"),
      gmailConnected:snap.exists&&permission(scopes,"gmail.send"),
      connectedEmail:snap.data()?.googleEmail||null,
      operationsSheetUrl:sheet?.data()?.url||null,
      connectedAt:snap.data()?.connectedAt||null,
      healthUrl:"/api/integrations/google/health"
    });
  } catch(error) { console.warn("Google connection status failed",{code:error?.code||"google_status"});return NextResponse.json({configured:true,connected:false,error:"Could not access your saved connection. Check Firebase Admin permissions or integration encryption key.",missing:[]},{status:503}); }
}
export async function POST(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!integrationConfigured()) return NextResponse.json({ error: "Google Calendar integration is not configured yet." }, { status: 503 });
  try {
    let body={};
    try{const raw=await req.text();if(raw.length<400)body=raw?JSON.parse(raw):{};}catch{}
    const feature=["core","archive","sheets","gmail"].includes(body.feature)?body.feature:"core";
   if(feature==="archive"&&!isFounder(user))
    return NextResponse.json({error:"Private recording archive access requires the verified FUGTH founder account."},{status:403});
    const {url,nonce}=buildGoogleUrl(user.uid,feature);
    const response = NextResponse.json({ url });
    // OAuth starts on either apex or www. Sharing the short-lived CSRF cookie
    // across those two official hostnames avoids an "authorization expired" loop.
    const host=new URL(req.url).hostname.toLowerCase();
    const domain=["fugthmanagement.space","www.fugthmanagement.space"].includes(host)
      ?"fugthmanagement.space":undefined;
    response.cookies.set("fugth_google_oauth",nonce,{
      httpOnly:true,secure:true,sameSite:"lax",
      path:"/api/integrations/google/callback",maxAge:600,
      ...(domain?{domain}:{})
    });
    return response;
  } catch(error) {
    console.warn("Google OAuth start failed",{code:error?.code||"google_auth"});
    return NextResponse.json({error:"Unable to start Google authorization. Check the Google OAuth client, encryption key and authorized callback URL."},{status:503});
  }
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
