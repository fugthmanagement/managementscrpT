import {durationForDemo,getGlobalDemoSettings} from "../../../lib/server/demo-settings";
import {NextResponse} from "next/server";
import {createHmac} from "node:crypto";
import {demoBusiness,demoAssistant,focusChoice,scenarioChoice,usNumber,DEMO_DURATION} from "../../../lib/server/voice-preview";
import {reserveDemo,recordDemoCall} from "../../../lib/server/demo-cooldown";
import {firebaseAdmin} from "../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(v,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"no-store"}});
const voiceKey=()=>process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY||"";
const numberId=()=>process.env.VAPI_PHONE_NUMBER_ID||process.env.VAPI_PHONE_NUMBER||"";
const secret=()=>process.env.DEMO_COOLDOWN_SECRET||voiceKey();
const storageReady=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
const configured=()=>Boolean(process.env.PUBLIC_DEMO_ENABLED==="true"&&voiceKey()&&numberId()&&storageReady()&&process.env.TURNSTILE_SECRET_KEY&&process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
function remoteAddress(req){
 const ip=req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"";
 return ip.slice(0,100);
}
async function verifyHuman(token,req){
 if(!token||String(token).length>2500)return false;
 const result=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
  method:"POST",body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:String(token),remoteip:remoteAddress(req)}),
  cache:"no-store",signal:AbortSignal.timeout(7500)
 });
 return result.ok&&(await result.json()).success===true;
}
export async function GET(){
 const {seconds}=await getGlobalDemoSettings();
 return reply({available:configured(),lengthSeconds:seconds,cooldownHours:3,
  reason:configured()?null:"Guest calling is turned off until the founder enables it. Account demos require founder approval or a paid AI plan."});
}
export async function POST(req){
 if(!configured())return reply({error:"Public calling is disabled. Ask FUGTH for an approved test invitation."},503);
 let body;
 try{const raw=await req.text();if(raw.length>4000)throw Error();body=JSON.parse(raw);}catch{return reply({error:"Invalid demo request."},400);}
 const number=usNumber(body.phone);
 if(!number)return reply({error:"Enter a valid US phone number."},400);
 if(body.consent!==true)return reply({error:"Confirm this is your number or that you have permission to receive the demo."},400);
 const ip=remoteAddress(req);if(!ip)return reply({error:"Could not verify your network for the guest demo."},403);
 if(!await verifyHuman(body.turnstileToken,req).catch(()=>false))
  return reply({error:"Please complete the human verification and try again."},403);
 const account="guest_"+createHmac("sha256",secret()).update(ip).digest("hex").slice(0,48);
 const focus=focusChoice(body.focus),scenario=scenarioChoice(body.scenario);
 const context=demoBusiness({businessName:String(body.businessName||"Your business").slice(0,75),
  businessType:String(body.businessType||"Local business").slice(0,65)});
 let reservation;
 try{
  // Signed-out guest demos belong to FUGTH's real verified founder account,
  // not a synthetic guest ID that cannot be accessed through Firebase Auth.
  let founderUid=process.env.FUGTH_FOUNDER_UID||"";
  if(!founderUid){
   const founder=await firebaseAdmin().auth().getUserByEmail("fugthmanagement@gmail.com");
   founderUid=founder.uid;
  }
  if(!/^[A-Za-z0-9_-]{8,128}$/.test(founderUid))
   return reply({error:"Guest demo call storage owner is not configured."},503);
  reservation=await reserveDemo(account,number,focus);
  const {seconds}=await getGlobalDemoSettings();
  const provider=await fetch("https://api.vapi.ai/call/phone",{
   method:"POST",headers:{Authorization:"Bearer "+voiceKey().trim(),"Content-Type":"application/json"},
   body:JSON.stringify({customer:{number},phoneNumberId:numberId().trim(),
    assistant:demoAssistant(context,focus,scenario,seconds),
    metadata:{fugthPreview:true,guestDemo:true,ownerId:founderUid,guestQuotaId:account,focus,scenario,industry:context.industry}}),
   cache:"no-store",signal:AbortSignal.timeout(16000)
  });
  const result=await provider.json().catch(()=>({}));
  if(!provider.ok||!result.id){
   await recordDemoCall(account,reservation.attemptId,null,"rejected").catch(()=>{});
   return reply({error:"The calling provider could not place the guest demo. Please contact FUGTH support.",cooldownUntil:reservation.cooldownUntil},502);
  }
  await recordDemoCall(account,reservation.attemptId,result.id,"started").catch(()=>{});
  return reply({success:true,callId:result.id,status:result.status||"queued",businessName:context.name,cooldownUntil:reservation.cooldownUntil,lengthSeconds:seconds});
 }catch(error){
  return reply({error:error.status?error.message:"We couldn't request your guest demo. Please try again later.",cooldownUntil:error.cooldownUntil||reservation?.cooldownUntil||null},error.status||503);
 }
}
