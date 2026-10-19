import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { firebaseAdmin } from "./auth";

// Request only the two Google services customers need to connect first.
// Gmail's restricted scope requires additional Google verification and is
// deliberately NOT part of Calendar/Drive onboarding.
const CORE_GOOGLE_SCOPES=[
  "openid","email",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file"
];
const EXTRA_GOOGLE_SCOPES={
 sheets:["https://www.googleapis.com/auth/spreadsheets"],
 gmail:["https://www.googleapis.com/auth/gmail.send"]
};
const GOOGLE_SCOPE=CORE_GOOGLE_SCOPES.join(" ");

function secret() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new Error("INTEGRATION_ENCRYPTION_KEY must be a 64-character hexadecimal secret.");
  return Buffer.from(raw, "hex");
}
function googleConfig() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error("Google Calendar OAuth is not configured.");
  const canonical="https://www.fugthmanagement.space/api/integrations/google/callback";
  const configured=String(process.env.GOOGLE_OAUTH_REDIRECT_URI||"").trim();
  const base=new URL(process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space");
  const redirect=new URL(configured||(
    ["fugthmanagement.space","www.fugthmanagement.space"].includes(base.hostname)
      ?canonical:new URL("/api/integrations/google/callback",base.origin).toString()
  ));
  // No external redirect endpoints. Google tokens must only return to the
  // same deployment or canonical FUGTH host, never an untrusted domain.
  const allowedHost=new Set(["fugthmanagement.space","www.fugthmanagement.space",base.hostname]);
  if(redirect.protocol!=="https:"||!allowedHost.has(redirect.hostname)||
    redirect.pathname!=="/api/integrations/google/callback"||redirect.search||redirect.hash)
    throw Error("GOOGLE_OAUTH_REDIRECT_URI must be the trusted HTTPS FUGTH callback.");
  return {clientId:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    redirectUri:redirect.toString()};

}
export function googleOAuthPublicSettings(){
 const fallback="https://www.fugthmanagement.space/api/integrations/google/callback";
 let redirectUri=fallback,error=null;
 try{redirectUri=googleConfig().redirectUri;}
 catch(e){error=String(e.message||"OAuth settings incomplete").slice(0,130);
  try{
   const base=new URL(process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space");
   redirectUri=process.env.GOOGLE_OAUTH_REDIRECT_URI||
    (["fugthmanagement.space","www.fugthmanagement.space"].includes(base.hostname)
      ?fallback:new URL("/api/integrations/google/callback",base.origin).toString());
  }catch{}
 }
 return {redirectUri,oauthClientId:String(process.env.GOOGLE_CLIENT_ID||""),
  googleCloudUrl:"https://console.cloud.google.com/auth/clients",configError:error,
  setupHint:"The OAuth Web client identified by oauthClientId must have this exact redirectUri under Authorized redirect URIs. Scheme, www, slash and path matter."};
}
export function integrationConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_ENCRYPTION_KEY || "") &&
    (process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)));
}
export function buildGoogleUrl(uid,feature="core") {
  const config = googleConfig();
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ uid, feature, iat: Date.now(), nonce })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: [...CORE_GOOGLE_SCOPES,...(EXTRA_GOOGLE_SCOPES[feature]||[])].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: payload + "." + signature,
    include_granted_scopes: "true",
  });
  return { url: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(), nonce };
}
export function readGoogleState(state) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) throw new Error("Invalid authorization state.");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Authorization state mismatch.");
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!value.uid || !value.iat || value.iat > Date.now() + 60000 || Date.now() - value.iat > 10 * 60 * 1000) throw new Error("Authorization state expired.");
  if (!/^[a-f0-9]{32}$/i.test(value.nonce || "")) throw new Error("Missing authorization nonce.");
  return { uid: value.uid, nonce: value.nonce, feature:["core","sheets","gmail"].includes(value.feature)?value.feature:"core" };
}
export function encrypt(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
export function decrypt(value) {
  const decipher = createDecipheriv("aes-256-gcm", secret(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}
export function integrationDoc(uid) {
  return firebaseAdmin().firestore().doc(`users/${uid}/integrations/google_calendar`);
}
export async function googleToken({ code, refreshToken }) {
  const config = googleConfig();
  const params = refreshToken
    ? { client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }
    : { client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri, grant_type: "authorization_code" };
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    const code=String(result.error||"connection_failed").replace(/[^a-z_]/gi,"").slice(0,60);
    console.warn("FUGTH Google token exchange failed",{code,status:response.status});
    const reason=code==="invalid_grant"?"Google sign-in expired or was already used. Start connection again.":
      code==="unauthorized_client"||code==="invalid_client"?"Google OAuth client credentials were rejected. Check the Google Cloud web client and Vercel settings.":
      code==="redirect_uri_mismatch"?"Google OAuth callback does not match your authorized redirect URL.":
      "Google could not complete authorization ("+code+"). Check consent-screen permissions and try again.";
    throw Object.assign(new Error(reason),{oauthCode:code});
  }
  return result;
}
export async function accessGoogleCalendar(uid,requiredScope=null) {
  const ref = integrationDoc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Google Calendar is not connected.");
  const entry = snap.data();
  if(requiredScope && !String(entry.scopes||"").split(" ").includes("https://www.googleapis.com/auth/"+requiredScope))throw new Error("Reconnect your Google account to enable this service.");
  let stored = decrypt(entry.secret);
  if (!stored.refresh_token) throw new Error("Reconnect Google Calendar to enable refresh.");
  if (!stored.access_token || Date.now() >= Number(stored.expires_at || 0) - 90000) {
    let updated;
    try{updated=await googleToken({ refreshToken:stored.refresh_token });}
    catch(error){throw Error("Google access expired or was revoked. Reconnect Google in Settings → Connections.");}
    stored={...stored,access_token:updated.access_token,expires_at:Date.now()+(updated.expires_in||3600)*1000};
    await ref.set({secret:encrypt(stored),updatedAt:new Date().toISOString()},{merge:true});
  }
  return stored.access_token;
}

// The spreadsheet belongs to the business's connected Google account. FUGTH
// stores only the file pointer; it never creates a Google login for a customer.
// Each connected business receives its own Google Calendar inside the Google
// account it authorized. The FUGTH workspace keeps only the calendar ID.
async function calendarOwnerUid(businessUid){
 // Businesses with their own Google connection always own their calendar;
 // the optional founder calendar is only a fallback for unconnected accounts.
 const own=await integrationDoc(businessUid).get();
 if(own.exists)return businessUid;
 const central=String(process.env.FUGTH_CALENDAR_OWNER_EMAIL||"").trim().toLowerCase();
 if(!central)return businessUid;
 // Only a FUGTH founder-controlled account can host the common calendars.
 const approved=["fugthmanagement@gmail.com","mepenginestudio@gmail.com","fugthchat@gmail.com","novaeriahengine@gmail.com"];
 if(!approved.includes(central))throw Error("Central calendar account isn't approved.");
 const owner=await firebaseAdmin().auth().getUserByEmail(central);
 return owner.uid;
}
export async function ensureFugthBusinessCalendar(uid, token) {
 const db=firebaseAdmin().firestore();
 const ownerUid=await calendarOwnerUid(uid);
 const ownerToken=ownerUid===uid?token:await accessGoogleCalendar(ownerUid);
 const ref=db.doc("users/"+uid+"/integrations/fugth_business_calendar");
 const saved=await ref.get();
 // Pre-existing calendars in other accounts are left intact and are not
 // silently reused as though they belonged to the central calendar owner.
 if(saved.exists&&saved.data()?.calendarId&&
   (saved.data()?.ownerUid||uid)===ownerUid)return saved.data();
 const profile=(await db.doc("users/"+uid).get()).data()||{};
 const name=String(profile.businessName||profile.name||"Business").replace(/[\r\n]/g," ").trim().slice(0,80)||"Business";
 const response=await fetch("https://www.googleapis.com/calendar/v3/calendars",{
  method:"POST",headers:{Authorization:"Bearer "+ownerToken,"Content-Type":"application/json"},cache:"no-store",
  body:JSON.stringify({summary:"FUGTH — "+name,description:"Private appointments for "+name+" managed through FUGTH Management."}),
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new Error("The FUGTH business calendar couldn't be created.");
 const calendar=await response.json(),calendarId=String(calendar.id||"");
 if(!calendarId)throw new Error("The calendar connection returned no identifier.");
 const entry={calendarId,ownerUid,summary:calendar.summary||("FUGTH — "+name),
  timeZone:calendar.timeZone||"",createdAt:new Date().toISOString(),
  previousCalendarId:saved.exists?saved.data()?.calendarId||null:null};
 await ref.set(entry,{merge:true});
 // Share only with the verified owner of this business; never give customers
 // access to each other's calendar or to the founder's primary calendar.
 if(ownerUid!==uid){
  try{
   const customer=await firebaseAdmin().auth().getUser(uid);
   if(customer.email&&customer.emailVerified){
    const share=await fetch("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+"/acl?sendNotifications=true",{
     method:"POST",headers:{Authorization:"Bearer "+ownerToken,"Content-Type":"application/json"},
     body:JSON.stringify({role:"writer",scope:{type:"user",value:customer.email}}),
     cache:"no-store",signal:AbortSignal.timeout(10000)
    });
    if(!share.ok)console.warn("FUGTH calendar access invitation pending",{status:share.status});
   }
  }catch(error){console.warn("FUGTH calendar invitation pending",{code:error?.code||"google"});}
 }
 return entry;
}
export async function businessCalendarSession(uid){
 const ownerUid=await calendarOwnerUid(uid);
 const token=await accessGoogleCalendar(ownerUid);
 const calendar=await ensureFugthBusinessCalendar(uid,token);
 return {token,calendarId:calendar.calendarId,ownerUid,central:ownerUid!==uid};
}

export async function ensureGoogleOperationsSheet(uid, token) {
  const db=firebaseAdmin().firestore(),ref=db.doc(`users/${uid}/integrations/google_sheet`);
  const saved=await ref.get();
  if(saved.exists&&saved.data()?.url)return saved.data();
  const created=await fetch("https://sheets.googleapis.com/v4/spreadsheets",{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},cache:"no-store",
    body:JSON.stringify({properties:{title:"FUGTH Business Operations"},sheets:[{properties:{title:"Overview"}},{properties:{title:"Leads"}},{properties:{title:"Appointments"}},{properties:{title:"Cold Calls"}}]})
  });
  if(!created.ok)throw new Error("Google Sheets could not create the operations workbook.");
  const sheet=await created.json(),spreadsheetId=String(sheet.spreadsheetId||"");
  if(!spreadsheetId)throw new Error("Google Sheets did not return a workbook reference.");
  const values=[
    ["FUGTH BUSINESS OPERATIONS",""],["This workbook is created for your connected Google account.",""],["",""],["WORKSPACE","VALUE"],["Account","FUGTH connected"],["Website","Managed in FUGTH"],["",""],["LEADS","Use the Leads tab for exports and operational tracking."],["APPOINTMENTS","Use the Appointments tab for exports and operational tracking."]
  ];
  await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(spreadsheetId)+"/values/Overview!A1:append?valueInputOption=USER_ENTERED",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({values})});
  const entry={spreadsheetId,url:sheet.spreadsheetUrl||"https://docs.google.com/spreadsheets/d/"+encodeURIComponent(spreadsheetId)+"/edit",createdAt:new Date().toISOString()};
  await ref.set(entry,{merge:true});
  return entry;
}
