import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {gatewayHealth,gatewayReadiness,loadAiPolicy,AI_POLICY_DEFAULTS} from "../../../../lib/server/meplifeos";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=25;
const respond=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
async function admin(request){
 const user=await authenticatedUser(request);
 return user?.uid&&isFounder(user)?user:null;
}
export async function GET(request){
 if(!await admin(request))return respond({error:"Verified FUGTH administrator required."},403);
 const status=await gatewayHealth(9500);
 const connection=gatewayReadiness();
 const policy=await loadAiPolicy();
 const color=!connection.configured||!status.online?"red":!status.ready||status.queue>=Math.max(1,status.queueLimit)?"orange":"green";
 return respond({connection:{...connection,configured:connection.configured},health:status,light:color,policy,
  wakeBehavior:"Wake checks the Space's public health URL; it cannot resume a manually paused Space."});
}
export async function POST(request){
 const user=await admin(request);
 if(!user)return respond({error:"Verified FUGTH administrator required."},403);
 let body;try{body=await request.json();}catch{return respond({error:"Invalid request."},400);}
 if(body?.action==="wake"){
  const health=await gatewayHealth(12000);
  const configured=gatewayReadiness().configured;
  const light=!health.online||!configured?"red":health.ready?"green":"orange";
  return respond({health,light,wakeRequested:true,
   note:health.online?"The gateway responded.":"The public wake request was sent but the gateway is not ready; check its Hugging Face logs."});
 }
 if(body?.action!=="configure")return respond({error:"Unknown action."},400);
 const allowed=["enabled","websiteEnabled","coldCallEnabled","emailEnabled","forceWebsiteModel","websiteModel","coldCallModel","emailModel"];
 const values=body.policy||{};
 const change={};
 for(const key of allowed){
  if(!Object.prototype.hasOwnProperty.call(values,key))continue;
  const value=values[key];
  if(key.endsWith("Model")){
   if(!["0.5b","1.5b"].includes(value))return respond({error:"Select 0.5b or 1.5b."},400);
   change[key]=value;
  }else{
   if(typeof value!=="boolean")return respond({error:"Feature controls must be true/false."},400);
   change[key]=value;
  }
 }
 if(!Object.keys(change).length)return respond({error:"No settings supplied."},400);
 try{
  const db=firebaseAdmin().firestore();
  await db.doc("systemSettings/fugthAi").set({...change,updatedAt:new Date().toISOString(),updatedBy:user.uid},{merge:true});
  await db.collection("systemAiEvents").add({event:"policy_change",keys:Object.keys(change),actor:user.uid,createdAt:new Date().toISOString()});
  return respond({saved:true,policy:await loadAiPolicy()});
 }catch{return respond({error:"Could not save model settings in Firestore."},503);}
}
