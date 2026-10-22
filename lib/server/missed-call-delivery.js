import {firebaseAdmin} from "./auth.js";
import {missedCallOutcome,phoneE164,phoneHash,composeTextback,cleanTextbackSettings,textbackProviderReady} from "./missed-call-textback.js";

/** Called only after Vapi API verification and per-number ownership checks. */
export async function maybeTextBackMissedCall(call,uid){
 const verdict=missedCallOutcome(call);
 if(!verdict.missed)return {sent:false,reason:verdict.reason};
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid))return {sent:false,reason:"missing_owner"};
 const db=firebaseAdmin().firestore();
 const cfgDoc=await db.doc("users/"+uid+"/knowledge/missedCallTextback").get();
 const cfg=cleanTextbackSettings(cfgDoc.data()||{});
 if(!cfg.enabled||!cfg.complianceAttested)return {sent:false,reason:"not_enabled"};
 if(!textbackProviderReady(process.env))return {sent:false,reason:"sms_provider_unconfigured"};
 if(process.env.FUGTH_MESSAGING_OWNER_UID!==uid)return {sent:false,reason:"sms_number_not_assigned_to_business"};
 const number=phoneE164(call.customer.number);
 const h=phoneHash(number,process.env.INTEGRATION_ENCRYPTION_KEY||uid);
 const ref=db.doc("users/"+uid+"/missedCallTextbacks/"+h);
 const optOut=db.doc("users/"+uid+"/smsOptOuts/"+h);
 const profileSnap=await db.doc("users/"+uid).get();
 const profile=profileSnap.data()||{};
 const body=composeTextback(cfg,profile,number);
 if(!body)return {sent:false,reason:"invalid_number"};
 let reserved=false;
 const now=new Date().toISOString();
 await db.runTransaction(async tx=>{
  const [prior,block]=await Promise.all([tx.get(ref),tx.get(optOut)]);
  if(block.exists&&block.data()?.suppressed!==false)return;
  const priorAt=Date.parse(prior.data()?.lastSentAt||prior.data()?.updatedAt||"");
  const gap=cfg.minimumRepeatHours*3600000;
  // Unknown delivery outcomes could already be billed; suppress every retry
  // inside the cooldown even when the carrier response failed.
  if(Number.isFinite(priorAt)&&Date.now()-priorAt<gap)return;
  if(prior.exists)tx.set(ref,{status:"pending",updatedAt:now,
   callId:call.id,lastFour:number.slice(-4),repeatHours:cfg.minimumRepeatHours},{merge:true});
  else tx.create(ref,{status:"pending",createdAt:now,updatedAt:now,
   callId:call.id,lastFour:number.slice(-4),repeatHours:cfg.minimumRepeatHours});
  reserved=true;
 });
 if(!reserved)return {sent:false,reason:"repeat_or_opted_out"};
 const sid=process.env.TWILIO_ACCOUNT_SID;
 try{
  const response=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+encodeURIComponent(sid)+"/Messages.json",{
   method:"POST",cache:"no-store",
   headers:{
    Authorization:"Basic "+Buffer.from(sid+":"+process.env.TWILIO_AUTH_TOKEN).toString("base64"),
    "Content-Type":"application/x-www-form-urlencoded"
   },
   body:new URLSearchParams({From:phoneE164(process.env.TWILIO_FROM_NUMBER),To:number,Body:body}),
   signal:AbortSignal.timeout(12000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.sid){
   await ref.set({status:"failed",updatedAt:new Date().toISOString(),providerStatus:response.status},{merge:true});
   return {sent:false,reason:"carrier_rejected"};
  }
  await ref.set({status:"sent",lastSentAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
   providerMessageId:String(result.sid).slice(0,80),providerStatus:response.status},{merge:true});
  await db.doc("users/"+uid+"/notifications/missed_text_"+call.id).set({
   type:"missed_call_textback",read:false,createdAt:new Date().toISOString(),
   title:"Missed-call text-back sent",text:"A text-back was sent to a missed caller ending "+number.slice(-4)+".",
   callId:call.id,status:"sent"
  },{merge:true});
  return {sent:true,reason:"sent"};
 }catch(error){
  await ref.set({status:"failed",updatedAt:new Date().toISOString(),providerStatus:"network_error"},{merge:true}).catch(()=>{});
  return {sent:false,reason:"carrier_network_error"};
 }
}
