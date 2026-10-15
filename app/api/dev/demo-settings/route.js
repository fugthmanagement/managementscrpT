import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {DEMO_LENGTHS,getGlobalDemoSettings,getAccountDemoSettings,updateGlobalDemoSettings,updateAccountDemoSettings} from "../../../../lib/server/demo-settings";
import {getDemoCooldown,resetDemoCooldown} from "../../../../lib/server/demo-cooldown";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(v,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
const authorized=async request=>{
 const user=await authenticatedUser(request);
 return user&&isFounder(user)?user:null;
};
export async function GET(request){
 const user=await authorized(request);if(!user)return reply({error:"FUGTH Management access required."},403);
 const global=await getGlobalDemoSettings();
 const uid=new URL(request.url).searchParams.get("uid");
 if(!uid)return reply({global,allowed:DEMO_LENGTHS});
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid))return reply({error:"Invalid customer."},400);
 try{
  const [override,cooldown]=await Promise.all([getAccountDemoSettings(uid),getDemoCooldown(uid)]);
  return reply({global,allowed:DEMO_LENGTHS,uid,override,cooldown});
 }catch(error){
  return reply({global,allowed:DEMO_LENGTHS,uid,override:null,cooldown:null,
   error:"Customer demo timer information is temporarily unavailable.",issueCode:"DEMO_STORAGE"},200);
 }
}
export async function POST(request){
 const user=await authorized(request);if(!user)return reply({error:"FUGTH Management access required."},403);
 let body;try{const t=await request.text();if(t.length>1200)throw Error();body=JSON.parse(t);}
 catch{return reply({error:"Invalid demo settings."},400);}
 const action=String(body.action||""),uid=String(body.uid||"");
 try{
  if(action==="global"){
   return reply({saved:true,global:await updateGlobalDemoSettings(body.seconds,user.uid)});
  }
  if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid))return reply({error:"Select a customer."},400);
  await firebaseAdmin().auth().getUser(uid);
  if(action==="account"){
   return reply({saved:true,uid,override:await updateAccountDemoSettings(uid,body.seconds,user.uid)});
  }
  if(action==="reset"){
   const cooldown=await resetDemoCooldown(uid,user.uid);
   return reply({saved:true,uid,...cooldown});
  }
  return reply({error:"Unknown demo setting."},400);
 }catch(error){
  console.error("FUGTH demo settings save failure",{code:error?.code||"storage"});
  return reply({error:"FUGTH couldn't save this demo setting. Check the management account connection.",issueCode:"DEMO_STORAGE"},503);
 }
}
