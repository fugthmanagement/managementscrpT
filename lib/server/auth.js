import admin from "firebase-admin";

const DEFAULT_ADMIN_EMAILS = [
  "fugthmanagement@gmail.com",
  "mepenginestudio@gmail.com",
  "fugthchat@gmail.com",
  "novaeriahengine@gmail.com",
];

export function firebaseAdmin() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT;
    const email = process.env.FIREBASE_CLIENT_EMAIL;
    const key = String(process.env.FIREBASE_PRIVATE_KEY||"").trim().replace(/^["\x27]|["\x27]$/g,"").replace(/\\n/g,"\n");
    if (json) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    } else if (email && key) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: email, privateKey: key }) });
    } else {
      // Token signature verification needs the Firebase project ID. Database writes
      // still require a separate Admin service account on Vercel.
      admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
    }
  }
  return admin;
}

// Verify the active user's Firebase token even when the server-side service
// account has not yet been provisioned. Firebase Identity Toolkit validates the
// token itself; we never trust decoded client-supplied JWT claims.
async function lookupFirebaseToken(token) {
  const apiKey=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if(!apiKey || apiKey==="dummy_key_for_build")return null;
  try {
    const response=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(apiKey),{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({idToken:token}),cache:"no-store",
      signal:AbortSignal.timeout(6500)
    });
    if(!response.ok)return null;
    const payload=await response.json(),account=payload.users?.[0];
    if(!account?.localId || account.disabled)return null;
    // Firebase supplies validSince after global sign-out or password changes.
    if(account.validSince) {
      try {
        const jwt=JSON.parse(Buffer.from(token.split(".")[1],"base64url").toString("utf8"));
        if(Number(jwt.iat)<Number(account.validSince))return null;
      }catch{return null;}
    }
    return {uid:account.localId,email:account.email||null,
      email_verified:account.emailVerified===true,
      phone_number:account.phoneNumber||null};
  }catch{return null;}
}
export async function authenticatedUser(req) {
  const value=req.headers.get("authorization")||"";
  if(!value.startsWith("Bearer "))return null;
  const token=value.slice(7).trim();
  if(!token || token.length>5000)return null;
  const hasServiceCredential=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
  if(hasServiceCredential){
    try{return await firebaseAdmin().auth().verifyIdToken(token,true);}
    catch(error){
      // Independently verify the Firebase session instead of rejecting a valid
      // login because newly installed server credentials failed.
      console.warn("FUGTH alternate session verification",{code:error?.code||"admin"});
    }
  }
  return lookupFirebaseToken(token);
}

export function isAdminEmail(email) {
  if(!email)return false;
  const configured=process.env.ADMIN_EMAILS;
  // Always retain the verified original FUGTH founder accounts; extra configured
  // team emails can be added, but may not accidentally remove the original owners.
  const list=[...DEFAULT_ADMIN_EMAILS,...(configured?configured.split(","):[])];
  return list.map(value=>value.trim().toLowerCase()).includes(String(email).trim().toLowerCase());
}
export function isFounder(user) {
  return Boolean(user?.email_verified===true && isAdminEmail(user.email));
}

export function errorResponse(status, message) {
  return Response.json({ error: message }, { status });
}
