import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../lib/server/auth";
import {fromFirestoreValue} from "../../../lib/server/firestore-admin";
import {demoBusiness,demoAssistant,DEMO_DURATION,DEMO_DAILY_LIMIT,usNumber} from "../../../lib/server/voice-preview";
export const runtime="nodejs";
export const dynamic="force-dynamic";

const projectId=()=>process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"";
const voiceKey=()=>process.env.VAPI_PRIVATE_KEY||process.env.VOICE_PRIVATE_KEY||"";
const numberId=()=>process.env.VAPI_PHONE_NUMBER_ID||"";
const dbRoot=()=>`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/databases/(default)/documents`;
const canUseDemo=()=>Boolean(projectId()&&process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&voiceKey()&&numberId());
function response(data,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});}
async function readDoc(path,token){
 const res=await fetch(dbRoot()+"/"+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(6500)});
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
 const [userDoc,siteDoc]=await Promise.all([
   readDoc("users/"+uid,token),
   readDoc("publicSites/"+uid,token).catch(()=>null)
 ]);
 if(!userDoc?.businessName && !siteDoc?.name)return null;
 return demoBusiness(userDoc||{},siteDoc||{});
}
async function globalCapacity(){
 // The provider owns the source-of-truth list of actual calls. Never start
 // billable calls if its safety data cannot be checked.
 const since=new Date().toISOString().slice(0,10)+"T00:00:00.000Z";
 const url="https://api.vapi.ai/call?createdAtGt="+encodeURIComponent(since)+"&limit=1000";
 const r=await fetch(url,{headers:{Authorization:"Bearer "+voiceKey()},cache:"no-store",signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error("FUGTH call safety check is unavailable.");
 const calls=await r.json();
 if(!Array.isArray(calls))throw Error("FUGTH call safety check is unavailable.");
 if(calls.filter(c=>c.metadata?.fugthPreview===true).length>=80)
   throw Object.assign(new Error("Today's demo call capacity has been reached. Please try another day."),{status:429});
}
function slotName(day,slot){return "preview_"+day+"_"+slot;}
async function quota(user,token,to){
 const today=new Date().toISOString().slice(0,10).replaceAll("-","");
 for(let slot=1;slot<=DEMO_DAILY_LIMIT;slot++){
  const id=slotName(today,slot);
  const existing=await readDoc("users/"+encodeURIComponent(user.uid)+"/demoAttempts/"+id,token);
  if(existing){
   const elapsed=Date.now()-Date.parse(existing.createdAt||"");
   if(Number.isFinite(elapsed)&&elapsed<15*60*1000)
      throw Object.assign(new Error("You've recently tested your receptionist. You can try again after 15 minutes."),{status:429});
   continue;
  }
  const path=dbRoot()+"/users/"+encodeURIComponent(user.uid)+"/demoAttempts?documentId="+encodeURIComponent(id);
  const fields={
    ownerId:{stringValue:user.uid},kind:{stringValue:"voice_preview"},
    phone:{stringValue:to},createdAt:{stringValue:new Date().toISOString()}
  };
  const r=await fetch(path,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({fields}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(r.status===409)continue;
  if(!r.ok)throw Object.assign(new Error("Secure call verification is not active on this account. FUGTH support can enable it."),{status:503});
  return;
 }
 throw Object.assign(new Error("Your two daily previews have been used. Try again tomorrow."),{status:429});
}
export async function GET(req){
 const user=await authenticated(req);
 if(!user)return response({error:"Please sign in to preview your receptionist."},401);
 if(!canUseDemo())return response({available:false,reason:"The calling experience is being configured."});
 const params=new URL(req.url).searchParams;
 const callId=params.get("callId");
 if(callId){
  if(!/^[0-9a-f-]{36}$/i.test(callId))return response({error:"Invalid call ID."},400);
  try{
   const r=await fetch("https://api.vapi.ai/call/"+encodeURIComponent(callId),{
    headers:{Authorization:"Bearer "+voiceKey()},cache:"no-store",signal:AbortSignal.timeout(8000)
   });
   if(!r.ok)return response({error:"Call status not available."},503);
   const call=await r.json();
   if(call.metadata?.ownerId!==user.user.uid || call.metadata?.fugthPreview!==true)return response({error:"Call not found."},404);
   return response({status:call.status||"queued",endedReason:call.endedReason||null,summary:call.analysis?.summary||null});
  }catch{return response({error:"Call status unavailable right now."},503);}
 }
 const profile=await businessFor(user.user,user.token).catch(()=>null);
 return response({available:true,business:profile,verifiedPhone:usNumber(user.user.phone_number)||null,
   maxDurationSeconds:DEMO_DURATION,dailyLimit:DEMO_DAILY_LIMIT,requiresPhoneVerification:true});
}
export async function POST(req){
 const account=await authenticated(req);
 if(!account)return response({error:"Please sign in to try your receptionist."},401);
 if(!canUseDemo())return response({error:"Calls are not configured for this workspace."},503);
 let body={};
 try{body=await req.json();}catch{return response({error:"Invalid request."},400);}
 const to=usNumber(body.phone),linked=usNumber(account.user.phone_number);
 if(!to||!linked||to!==linked)return response({error:"Verify your own mobile number with a text message before requesting the test call."},403);
 if(body.consent!==true)return response({error:"Please consent to receive this one-time voice demo call."},400);
 try {
  const business=await businessFor(account.user,account.token);
  if(!business)return response({error:"Add your business name and type in Settings first."},400);
  // Global safety cap and an immutable one-user-per-slot quota: charged previews
  // cannot be triggered without the user's verified phone number and consent.
  await globalCapacity();
  await quota(account.user,account.token,to);
  const payload={
   phoneNumberId:numberId(),customer:{number:to},assistant:demoAssistant(business),
   metadata:{fugthPreview:true,ownerId:account.user.uid,industry:business.industry}
  };
  const provider=await fetch("https://api.vapi.ai/call",{
   method:"POST",headers:{"Authorization":"Bearer "+voiceKey(),"Content-Type":"application/json"},
   body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(16000)
  });
  const result=await provider.json().catch(()=>({}));
  if(!provider.ok){
   console.error("FUGTH receptionist preview rejected",{status:provider.status,code:result.error?.code||result.code||""});
   const detail=String(result.message||result.error?.message||"").toLowerCase();
   const unsupported=/free|outbound|phone number|number not found|twilio/.test(detail);
   return response({error:unsupported?"The configured FUGTH number may not support outbound calls yet. Contact FUGTH support.":"The test call couldn't be connected. Check your number and try again later."},502);
  }
  if(!result.id)return response({error:"Your preview request was accepted, but the call has not been confirmed."},502);
  return response({success:true,callId:result.id,status:result.status||"queued",businessName:business.name,
    maxDurationSeconds:DEMO_DURATION});
 }catch(err){
  console.error("FUGTH test call unavailable",err?.status||"internal");
  return response({error:err?.status?err.message:"Your test call could not be started right now."},err?.status||503);
 }
}
