import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
import {resolveFirebaseAdminCredentials} from "../../../../lib/server/firebase-admin-credentials";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
function serverCredentials(){
 const preflight=resolveFirebaseAdminCredentials(process.env);
 return {
  ...preflight.report,
  complete:preflight.ok,
  projectMatches:preflight.report.code!=="firebase_project_mismatch",
  format:preflight.report.format||"missing"
 };
}
async function probe(uid,write=false){
 const checks={},cfg=serverCredentials();
 if(!cfg.complete)return {
  ok:false,checks,cfg,code:cfg.code||"firebase_credentials_invalid",
  message:cfg.message||"Firebase Admin credentials are invalid.",
  next:cfg.hint||"Update the Firebase Admin service-account credentials in Vercel Production."
 };
 let db;
 try{db=firebaseAdmin().firestore();checks.initialize="ok"}
 catch(e){
  const issue=firestoreDemoFailure(e);
  const reason=String(e?.code||"").toLowerCase();
  const keyFailure=reason.includes("invalid-credential")||reason.includes("invalid-private-key")||
   reason.includes("private_key");
  return {ok:false,checks,cfg,
   code:keyFailure?"firebase_private_key_invalid":"firebase_initialize_failed",
   message:keyFailure?
    "Firebase Admin rejected the service-account private key.":
    "Firebase Admin could not initialize even though the local credential checks passed.",
   next:keyFailure?
    "Replace FIREBASE_PRIVATE_KEY with the complete private_key from the matching Firebase service-account JSON in Vercel Production, then redeploy. Do not paste it in chat.":
    issue.hint
  };
 };
 try{await db.doc("users/"+uid).get();checks.ownerRead="ok";}
 catch(e){const issue=firestoreDemoFailure(e);return {ok:false,checks,cfg,code:issue.code,
  message:"The server cannot read a founder account document.",next:issue.hint}}
 try{await db.collection("prospectDemos").where("founderId","==",uid).limit(1).get();checks.demoList="ok";}
 catch(e){const issue=firestoreDemoFailure(e);checks.demoList=issue.code;
  return {ok:false,checks,cfg,code:issue.code,message:issue.error,next:issue.hint}}
 try{await db.doc("prospectDemos/__fugth_internal_absent_probe__").get();checks.publicPreviewRead="ok";}
 catch(e){const issue=firestoreDemoFailure(e);checks.publicPreviewRead=issue.code;return {
  ok:false,checks,cfg,code:issue.code,message:issue.error,next:issue.hint
 }}
 if(write){
  const id="probe_"+uid.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,75);
  const ref=db.doc("users/"+uid+"/systemChecks/"+id);
  try{
   await ref.set({purpose:"firestore_write_diagnostic",at:new Date().toISOString()},{merge:true});
   const snap=await ref.get();
   if(!snap.exists)throw Error("write verification failed");
   checks.write="ok";await ref.delete();
   checks.cleanup="ok";
  }catch(e){const issue=firestoreDemoFailure(e);checks.write=issue.code;return {
   ok:false,checks,cfg,code:issue.code,message:"Firestore write/read/delete test failed.",next:issue.hint
  }}
 }
 return {ok:true,checks,cfg,code:"connected",message:write?
  "Firebase server and preview reads and test writes succeeded.":"Firebase server and preview reads succeeded.",
  next:"Try refreshing saved demos, then generate a verified preview link."};
}
async function owner(req){
 const user=await authenticatedUser(req);
 return user&&isFounder(user)?user:null;
}
export async function GET(req){
 const u=await owner(req);if(!u)return response({error:"Verified founder session required."},403);
 const report=await probe(u.uid,false);return response(report,report.ok?200:503);
}
export async function POST(req){
 const u=await owner(req);if(!u)return response({error:"Verified founder session required."},403);
 let body;try{body=await req.json()}catch{return response({error:"Invalid probe request."},400)}
 if(body.action!=="verify_write")return response({error:"Unsupported diagnostic action."},400);
 const report=await probe(u.uid,true);return response(report,report.ok?200:503);
}
