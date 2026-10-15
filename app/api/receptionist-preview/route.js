import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../lib/server/auth";
import {fromFirestoreValue} from "../../../lib/server/firestore-admin";
import {demoBusiness,demoAssistant,DEMO_DURATION,DEMO_FOCUS_OPTIONS,DEMO_SCENARIOS,focusChoice,scenarioChoice,usNumber} from "../../../lib/server/voice-preview";
import {getDemoCooldown,reserveDemo,recordDemoCall} from "../../../lib/server/demo-cooldown";
import {saveVerifiedCall,ended} from "../../../lib/server/voice-call-history";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const projectId=()=>process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"";
const voiceKey=()=>process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY||"";
const numberId=()=>process.env.VAPI_PHONE_NUMBER_ID||process.env.VAPI_PHONE_NUMBER||"";
const hasAdminCredentials=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
// Founder calls use the pre-existing Vapi path and do not require Firestore Admin.
// Customer calls still require atomic Firestore quota enforcement.
const hasVoice=()=>Boolean(voiceKey());
const adminView=(account,view)=>view==="admin"&&isFounder(account.user);
const customerReady=()=>Boolean(hasVoice()&&numberId()&&hasAdminCredentials());
const unavailableReason=(admin)=>!hasVoice()?"FUGTH calling is not connected yet.":admin?null:!numberId()?"The FUGTH outgoing demo line is not configured.":"The FUGTH demo protection service is temporarily unavailable.";
const root=()=> "https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(projectId())+"/databases/(default)/documents";
function response(data,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});}
async function readDoc(path,token){
 const res=await fetch(root()+"/"+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(6500)});
 if(res.status===404)return null;
 if(!res.ok)throw Error("Saved business information could not be loaded.");
 const payload=await res.json();
 return Object.fromEntries(Object.entries(payload.fields||{}).map(([key,value])=>[key,fromFirestoreValue(value)]));
}
async function authenticated(req){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/,"").trim();
 if(!token||token.length>5000)return null;
 const user=await authenticatedUser(req);
 return user?.uid?{user,token}:null;
}
async function businessFor(user,token){
 const uid=encodeURIComponent(user.uid);
 const [profile,site]=await Promise.all([
  readDoc("users/"+uid,token),
  readDoc("publicSites/"+uid,token).catch(()=>null)
 ]);
 if(!profile?.businessName&&!site?.name)return null;
 return demoBusiness(profile||{},site||{});
}
export async function GET(req){
 const account=await authenticated(req);
 if(!account)return response({error:"Please sign in to preview your receptionist."},401);
 const params=new URL(req.url).searchParams;
 const admin=adminView(account,params.get("view"));
 const callId=params.get("callId");
 if(!hasVoice()||(!callId&&!admin&&!customerReady()))
  return response({available:false,adminMode:admin,reason:unavailableReason(admin)});
 if(callId){
  if(!/^[0-9a-f-]{36}$/i.test(callId))return response({error:"Invalid call ID."},400);
  try{
   const r=await fetch("https://api.vapi.ai/call/"+encodeURIComponent(callId),{
    headers:{Authorization:"Bearer "+voiceKey()},cache:"no-store",signal:AbortSignal.timeout(8000)
   });
   if(!r.ok)return response({error:"Call status not available."},503);
   const call=await r.json();
   if(call.metadata?.ownerId!==account.user.uid||call.metadata?.fugthPreview!==true)
    return response({error:"Call not found."},404);
   const outcome=ended(call)?await saveVerifiedCall(call,account.user.uid,account.token).catch(()=>({saved:false})):{saved:false};
   return response({status:call.status||"queued",endedReason:call.endedReason||null,
    summary:call.analysis?.summary||call.summary||null,
    saved:outcome.saved===true,recordingSaved:outcome.recordingSaved===true,recordingAvailable:outcome.recordingAvailable===true,leadSaved:outcome.leadSaved===true,leadId:outcome.leadId||null});
  }catch{return response({error:"Call status unavailable right now."},503);}
 }
 try{
  // A founder can still test Vapi if a Firestore user profile has not been provisioned.
  const business=await businessFor(account.user,account.token).catch(()=>null);
  const fallbackBusiness=business||demoBusiness({businessName:"FUGTH Management",businessType:"Local business"});
  const cooldown=admin?{cooldownUntil:null,remainingSeconds:0}:
   await getDemoCooldown(account.user.uid);
  return response({available:true,adminMode:admin,business:fallbackBusiness,warning:admin&&!numberId()?"Your outgoing FUGTH demo line needs setup.":null,requiresPhoneVerification:false,
   maxDurationSeconds:DEMO_DURATION,focusOptions:DEMO_FOCUS_OPTIONS,scenarioOptions:DEMO_SCENARIOS,
   ...cooldown});
 }catch{
  return response({available:false,reason:"The secure demo service is unavailable. Please try again later."},503);
 }
}
export async function POST(req){
 const account=await authenticated(req);
 if(!account)return response({error:"Please sign in to try your receptionist."},401);
 let body;
 try{
  const text=await req.text();if(text.length>3000)throw Error();
  body=JSON.parse(text);
 }catch{return response({error:"Invalid call request."},400);}
 const to=usNumber(body?.phone);
 if(!to)return response({error:"Enter a valid United States phone number."},400);
 if(body.consent!==true)return response({error:"Confirm that you own this number or have permission to receive this demo call."},400);
 const focus=focusChoice(body.focus),scenario=scenarioChoice(body.scenario);
 const admin=adminView(account,body.view);
 if(!hasVoice())return response({error:"FUGTH calling is not connected yet. Contact the management team."},503);
 if(!admin&&!customerReady())return response({error:unavailableReason(false)||"Customer demo service unavailable."},503);
 let reservation;
 try{
  const business=await businessFor(account.user,account.token).catch(()=>null);
  if(!admin)reservation=await reserveDemo(account.user.uid,to,focus);
  const context=business||demoBusiness({businessName:body.businessName||"FUGTH Management",businessType:body.businessType||"Local business"});
  // Reuse the same Vapi outbound mechanism that already powers founder test calls.
  // Transient per-call assistant holds business facts; no vendor keys reach the client.
  const payload={
   maxDurationSeconds:DEMO_DURATION,
   ...(numberId()?{phoneNumberId:numberId().trim()}:{}),customer:{number:to},
   assistant:demoAssistant(context,focus,scenario),
   metadata:{fugthPreview:true,ownerId:account.user.uid,industry:context.industry,focus,scenario,founderTest:admin}
  };
  const provider=await fetch("https://api.vapi.ai/call/phone",{
   method:"POST",headers:{Authorization:"Bearer "+voiceKey().trim(),"Content-Type":"application/json"},
   body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(16000)
  });
  const result=await provider.json().catch(()=>({}));
  if(!provider.ok){
   console.error("FUGTH preview provider rejection",{status:provider.status,code:result.error?.code||result.code||"unknown"});
   if(reservation)await recordDemoCall(account.user.uid,reservation.attemptId,null,"rejected").catch(()=>{});
   const providerMessage=String(result.message||result.error?.message||"").toLowerCase();
   const phoneProblem=/phone number|outbound|twilio|number not found|free plan/.test(providerMessage);
   const creditProblem=/credit|balance|billing|payment/.test(providerMessage);
   const reason=admin
    ?creditProblem?"FUGTH calling credits need attention."
     :phoneProblem?"Your FUGTH outgoing demo line needs to be connected."
     :"FUGTH could not connect the call (reference "+provider.status+"). Check the voice connection in Administration."
    :phoneProblem?"The FUGTH outbound number could not place this demo. Contact support."
     :"The demo call couldn't connect. Contact support to review and reset your cooldown.";
   return response({error:reason,...(reservation?{cooldownUntil:reservation.cooldownUntil}:{})},502);
  }
  if(!result.id){
   if(reservation)await recordDemoCall(account.user.uid,reservation.attemptId,null,"unconfirmed").catch(()=>{});
   return response({error:"Your demo request did not return a confirmed call ID. Contact support.",...(reservation?{cooldownUntil:reservation.cooldownUntil}:{})},502);
  }
  if(reservation)await recordDemoCall(account.user.uid,reservation.attemptId,result.id,"started").catch(()=>{});
  return response({success:true,callId:result.id,status:result.status||"queued",businessName:context.name,
   adminMode:admin,maxDurationSeconds:DEMO_DURATION,cooldownUntil:reservation?.cooldownUntil||null,focus,scenario});
 }catch(err){
  console.error("FUGTH live demo unavailable",err?.status||"internal");
  return response({error:err?.status?err.message:"The demo call could not be started right now. Please contact support if this persists.",
   cooldownUntil:err?.cooldownUntil||reservation?.cooldownUntil||null},err?.status||503);
 }
}
