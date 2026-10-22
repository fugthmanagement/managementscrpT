import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {firebaseAdmin} from "../../../../lib/server/auth";
import {classifyMissedCallEvent,normalizeUsPhone,renderTextbackMessage,
 readyForAutomaticTextback,CALLER_COOLDOWN_MS} from "../../../../lib/missed-call-textback";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(o,status=200)=>NextResponse.json(o,{status,headers:{"Cache-Control":"no-store"}});
const dayKey=()=>new Date().toISOString().slice(0,7);
function signed(raw,signature,secret){
 if(!secret||secret.length<24||!/^sha256=[a-f0-9]{64}$/i.test(signature||""))return false;
 const mac="sha256="+createHmac("sha256",secret).update(raw).digest("hex");
 const a=Buffer.from(mac,"ascii"),b=Buffer.from(signature,"ascii");
 return a.length===b.length&&timingSafeEqual(a,b);
}
async function sendViaTwilio({to,from,body}){
 const sid=process.env.TWILIO_ACCOUNT_SID||"",token=process.env.TWILIO_AUTH_TOKEN||"";
 if(!/^AC[a-f0-9]{32}$/i.test(sid)||!token)return {sent:false,code:"provider_not_connected"};
 const params=new URLSearchParams({To:to,From:from,Body:body});
 const r=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+sid+"/Messages.json",{
  method:"POST",headers:{Authorization:"Basic "+Buffer.from(sid+":"+token).toString("base64"),
   "Content-Type":"application/x-www-form-urlencoded"},body:params.toString(),
  signal:AbortSignal.timeout(10000),cache:"no-store"});
 const obj=await r.json().catch(()=>({}));
 return r.ok&&obj.sid?{sent:true,id:obj.sid}:{sent:false,code:"provider_http_"+r.status};
}
export async function POST(req){
 const secret=process.env.FUGTH_TEXTBACK_WEBHOOK_SECRET||"";
 if(!secret)return reply({received:false,error:"Missed-call webhook isn't activated."},503);
 const raw=await req.text();
 if(raw.length>12000)return reply({error:"Payload too large"},413);
 if(!signed(raw,req.headers.get("x-fugth-signature"),secret))return reply({error:"Signature invalid."},401);
 let payload;try{payload=JSON.parse(raw)}catch{return reply({error:"Invalid call event"},400)}
 const event=classifyMissedCallEvent(payload);
 if(!event.missed)return reply({received:true,skipped:true,reason:event.reason});
 let db;
 try{db=firebaseAdmin().firestore()}catch(e){return reply({error:"Calendar/account storage unavailable",code:e.code||"firebase_offline"},503)}
 const settingsRef=db.doc("users/"+event.uid+"/knowledge/missed-call-settings");
 const profileRef=db.doc("users/"+event.uid),identity=createHash("sha256").update(event.callId).digest("hex");
 const eventRef=db.doc("users/"+event.uid+"/messageBackEvents/"+identity);
 const senderHash=createHash("sha256").update(event.from).digest("hex");
 const stateRef=db.doc("users/"+event.uid+"/messageBackState/"+senderHash);
 try{
  const [settingsSnap,profileSnap,stateSnap]=await Promise.all([settingsRef.get(),profileRef.get(),stateRef.get()]);
  const config=settingsSnap.data()||{},profile=profileSnap.data()||{};
  if(profile.billingActive!==true||!(
   profile.planTier==="textback"||(
    ["starter","growth","elite"].includes(profile.planTier)&&
    (profile.billingAddons||[]).includes("sms")
   )
  ))return reply({received:true,skipped:true,reason:"paid_textback_entitlement_required"});
  if(config.phoneNumberId&&event.phoneNumberId!==config.phoneNumberId)
   return reply({received:true,skipped:true,reason:"unrecognized_business_number"});
  if(normalizeUsPhone(config.fromNumber)!==(event.to||normalizeUsPhone(config.fromNumber)))
   return reply({received:true,skipped:true,reason:"destination_mismatch"});
  if(stateSnap.data()?.optedOut===true)return reply({received:true,skipped:true,reason:"caller_opted_out"});
  if(config.blockedNumbers?.includes(event.from))return reply({received:true,skipped:true,reason:"blocked_caller"});
  const transportReady=Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN);
  const readiness=readyForAutomaticTextback(config,transportReady);
  const text=renderTextbackMessage(config.template,{
   business:config.businessName||profile.businessName||"our team",callerName:"there",
   bookingUrl:config.bookingUrl||""
  });
  const now=Date.now();
  const last=Date.parse(stateSnap.data()?.lastAttemptAt||"");
  const recentlyAttempted=Number.isFinite(last)&&now-last<CALLER_COOLDOWN_MS;
  let allowed=false;
  await db.runTransaction(async tx=>{
   const old=await tx.get(eventRef);
   if(old.exists)return;
   // A permanently unique eventId prevents duplicate provider webhooks.
   tx.create(eventRef,{callId:event.callId,customerPhone:event.from,
    businessNumber:event.to,phoneNumberId:event.phoneNumberId,uid:event.uid,
    status:!readiness.ready?"needs_configuration":recentlyAttempted?"cooldown":"queued",
    reason:!readiness.ready?readiness.reason:recentlyAttempted?"caller_cooldown":null,
    previewText:text,createdAt:new Date(now).toISOString(),month:dayKey()});
   allowed=readiness.ready&&!recentlyAttempted;
   if(allowed)tx.set(stateRef,{lastAttemptAt:new Date(now).toISOString(),lastCallId:event.callId},{merge:true});
  });
  if(!allowed)return reply({received:true,queued:false,reason:readiness.ready?"cooldown_or_duplicate":readiness.reason});
  // This path stays inert until the owner has verified registration,
  // consent, STOP handling and a carrier transport. Nothing is sent by default.
  const outcome=await sendViaTwilio({to:event.from,from:config.fromNumber,body:text});
  await eventRef.set({
   status:outcome.sent?"sent":"failed",
   providerMessageId:outcome.id||null,
   errorCode:outcome.code||null,updatedAt:new Date().toISOString()
  },{merge:true});
  return reply({received:true,queued:true,delivered:false,
   status:outcome.sent?"sent_to_provider":"provider_failed"});
 }catch(e){console.error("FUGTH_TEXTBACK_WEBHOOK",{code:e?.code||"write_failed"});
  return reply({error:"Missed call could not be processed; provider may retry."},503)}
}
