/**
 * Server-only Firebase Admin credential preflight.
 *
 * Vercel environment variable editors, CLI uploads and encrypted environment
 * files can represent the same PEM as literal newlines, \n escapes, or as a
 * JSON-quoted string. Normalize only those known formats, then verify the
 * private key locally before Firebase Admin initializes.
 *
 * NEVER log, serialize or return normalized private keys.
 */
import {createPrivateKey} from "node:crypto";
import {resolveFirebaseProjectId,serviceAccountProjectFromEmail} from "./firebase-project.js";

const serviceEmail=/^[a-z0-9._-]+@[a-z0-9][a-z0-9-]*\.iam\.gserviceaccount\.com$/i;
const PEM_START=/^-----BEGIN (?:RSA )?PRIVATE KEY-----/;
const PEM_END=/-----END (?:RSA )?PRIVATE KEY-----$/;

export function normalizeFirebasePrivateKey(input){
 let value=String(input||"").replace(/^\uFEFF/,"").trim();
 // Protect against oversized or recursively quoted pasted environment values.
 if(value.length>32768)return "";
 for(let n=0;n<3;n++){
  if(value.length<2)break;
  if(value[0]==='"'&&value.at(-1)==='"'){
   try{
    const parsed=JSON.parse(value);
    if(typeof parsed==="string"){value=parsed.trim();continue}
   }catch{}
   value=value.slice(1,-1).trim();continue;
  }
  if(value[0]==="'"&&value.at(-1)==="'"){
   value=value.slice(1,-1).trim();continue;
  }
  break;
 }
 value=value.replace(/\\r\\n/g,"\n").replace(/\\n/g,"\n").replace(/\r\n?/g,"\n");
 return value.trim();
}

function inspectPem(key){
 if(!key)return {valid:false,code:"firebase_private_key_missing",
  message:"The Firebase private-key variable is empty."};
 if(!PEM_START.test(key)||!PEM_END.test(key)){
  if(/BEGIN ENCRYPTED PRIVATE KEY/.test(key))return {valid:false,code:"firebase_private_key_encrypted",
   message:"The Firebase private key is password-protected. Firebase Admin requires its unencrypted service-account JSON key."};
  return {valid:false,code:"firebase_private_key_format",
   message:"The Firebase private key does not contain a complete BEGIN/END PRIVATE KEY PEM block."};
 }
 try{
  const parsed=createPrivateKey(key);
  if(parsed.asymmetricKeyType!=="rsa")return {valid:false,code:"firebase_private_key_type",
   message:"Firebase requires the RSA private key from its Google service-account JSON."};
  return {valid:true,code:"valid",message:"The service-account private key parses successfully."};
 }catch{
  return {valid:false,code:"firebase_private_key_invalid",
   message:"The saved Firebase private key could not be parsed. It may be truncated, have extra characters, or not be a Google service-account key."};
 }
}

const keyHint="In Firebase Console → Project settings → Service accounts → Generate new private key, download the JSON locally. In Vercel Project → Settings → Environment Variables → Production, set FIREBASE_CLIENT_EMAIL to JSON client_email and FIREBASE_PRIVATE_KEY to the COMPLETE JSON private_key including BEGIN/END lines. Use the same Firebase project as the site, then redeploy. Do not paste the key in chat or Firestore.";
const projectHint="Check NEXT_PUBLIC_FIREBASE_PROJECT_ID/FIREBASE_PROJECT_ID and the project_id in the downloaded service-account JSON. They must refer to the same Firebase project.";
const formatHint="The FIREBASE_PRIVATE_KEY secret must contain the entire service-account private_key including BEGIN/END lines, not the Firebase web API key or an OAuth client secret. Literal \\n escapes are supported.";

function issue(code,message,hint,metadata){
 return {ok:false,credential:null,
  report:{status:"attention",code,message,hint,
   ...metadata}};
}
export function resolveFirebaseAdminCredentials(env={}){
 const expected=resolveFirebaseProjectId(env);
 const metadata={projectId:expected,
  projectSource:(env.FIREBASE_PROJECT_ID||env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||
   env.GOOGLE_CLOUD_PROJECT||env.GCLOUD_PROJECT)?"environment":"FUGTH default"};
 const rawJson=String(env.FIREBASE_SERVICE_ACCOUNT||"").trim();
 let account=null,format="separate_env";
 if(rawJson){
  format="service_account_json";
  try{account=JSON.parse(rawJson);}
  catch{return issue("firebase_service_account_json_invalid",
   "FIREBASE_SERVICE_ACCOUNT is not valid JSON.",
   "Replace it with the complete downloaded Firebase service-account JSON, or use FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY as separate Production secrets.",{...metadata,format})}
  if(!account||typeof account!=="object"||Array.isArray(account))return issue(
   "firebase_service_account_json_invalid","FIREBASE_SERVICE_ACCOUNT must be a JSON object.",
   "Use the complete JSON service-account object downloaded from Firebase.",{...metadata,format});
 }
 const email=String((account?account.client_email:env.FIREBASE_CLIENT_EMAIL)||"").trim();
 const key=normalizeFirebasePrivateKey(account?account.private_key:env.FIREBASE_PRIVATE_KEY);
 const credentialProject=String((account?account.project_id:serviceAccountProjectFromEmail(email))||"").trim();
 const reportMeta={...metadata,format,serviceProjectId:credentialProject||null,
  hasClientEmail:Boolean(email),hasPrivateKey:Boolean(key)};
 if(!email&&!key&&!account)return issue("firebase_credentials_missing",
  "Firebase Admin service-account credentials are missing.",
  "Set a Firebase service-account credential in the Vercel Production environment.",reportMeta);
 if(!email||!key)return issue("firebase_credentials_incomplete",
  "Firebase Admin needs both its service-account email and private key.",
  keyHint,reportMeta);
 if(!serviceEmail.test(email))return issue("firebase_service_account_email_invalid",
  "FIREBASE_CLIENT_EMAIL does not look like a Google service-account email.",
  "Use client_email (not your personal Gmail address) from the same downloaded Firebase service-account JSON.",reportMeta);
 if(credentialProject&&credentialProject!==expected)return issue("firebase_project_mismatch",
  "The Firebase Admin service account and the site's Firebase project do not match.",
  projectHint,reportMeta);
 const pem=inspectPem(key);
 if(!pem.valid)return issue(pem.code,pem.message,
  pem.code==="firebase_private_key_format"?formatHint:keyHint,reportMeta);
 return {ok:true,credential:{
  projectId:credentialProject||expected,
  clientEmail:email,privateKey:key
 },report:{status:"valid",code:"firebase_admin_credentials_valid",
  message:"Firebase Admin credential format and private key are valid. Firestore access still needs a live connection check.",
  ...reportMeta,hint:"Run the founder Firestore read/write test to confirm IAM and database permissions."}};
}
export function firebaseAdminCredentialError(preflight){
 const error=new Error(preflight.report.message);
 error.code=preflight.report.code;
 return error;
}
