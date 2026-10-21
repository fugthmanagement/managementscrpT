import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
function serverCredentials(){
 const json=String(process.env.FIREBASE_SERVICE_ACCOUNT||"").trim();
 const email=String(process.env.FIREBASE_CLIENT_EMAIL||"").trim();
 const key=String(process.env.FIREBASE_PRIVATE_KEY||"").trim();
 const expected=String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"").trim();
 let actual=null,format="missing",parseOk=true;
 if(json){
  format="service_account_json";
  try{const value=JSON.parse(json);actual=String(value.project_id||value.projectId||"");parseOk=Boolean(actual&&value.client_email&&value.private_key);}
  catch{parseOk=false;}
 }else if(email||key){
  format="separate_env";
  parseOk=Boolean(email&&key);
 }
 // No credential values, raw provider exceptions or secrets in the diagnostic.
 return {format,projectId:expected||null,serviceProjectId:actual||null,
  complete:Boolean(format!=="missing"&&parseOk),projectMatches:!actual||!expected||expected===actual};
}
async function probe(uid,write=false){
 const checks={},cfg=serverCredentials();
 if(!cfg.complete)return {ok:false,checks,cfg,code:"missing_firebase_admin_credentials",
  message:"Vercel lacks a complete Firebase Admin service account for Production.",
  next:"Set FIREBASE_SERVICE_ACCOUNT or both FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY on Vercel Production, then redeploy."};
 if(!cfg.projectMatches)return {ok:false,checks,cfg,code:"firebase_project_mismatch",
  message:"The configured Firebase service account belongs to another Firebase project.",
  next:"Use the service account from the same Firebase project as NEXT_PUBLIC_FIREBASE_PROJECT_ID."};
 let db;
 try{db=firebaseAdmin().firestore();checks.initialize="ok"}
 catch(e){const issue=firestoreDemoFailure(e);return {ok:false,checks,cfg,code:"firebase_initialize_failed",
  message:"Firebase Admin could not initialize.",next:issue.hint}};
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
