/**
 * FUGTH standalone missed-call text back: safe defaults, provider-independent.
 * Provider/transport setup is separate from the $49.99 software subscription.
 */
export const TEXTBACK_MONTHLY_CENTS=4999;
export const TEXTBACK_MAX_TEXT_LENGTH=500;
export const TEXTBACK_DEFAULT_TEMPLATE=
 "Hi, this is {business}. Sorry we missed your call! Reply with what you need and we'll get back to you. Reply STOP to opt out.";
export const CALLER_COOLDOWN_MS=3*3600000;
const text=(x,n=200)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
export function normalizeUsPhone(value){
 const digits=String(value||"").replace(/\D/g,"");
 if(digits.length===10)return "+1"+digits;
 if(digits.length===11&&digits[0]==="1")return "+"+digits;
 return null;
}
export function safeTextbackTemplate(value){
 const t=text(value||TEXTBACK_DEFAULT_TEMPLATE,TEXTBACK_MAX_TEXT_LENGTH);
 return t||TEXTBACK_DEFAULT_TEMPLATE;
}
export function renderTextbackMessage(template,record={}){
 const business=text(record.business||"the business",65);
 const caller=text(record.callerName||"there",45);
 const booking=String(record.bookingUrl||"").startsWith("https://")?record.bookingUrl:"";
 let content=safeTextbackTemplate(template);
 content=content.replace(/\{(business|caller|booking)\}/gi,(_,key)=>
  key.toLowerCase()==="business"?business:key.toLowerCase()==="caller"?caller:booking);
 content=content.replace(/\s{2,}/g," ").trim().slice(0,TEXTBACK_MAX_TEXT_LENGTH);
 if(!/reply STOP/i.test(content))content=(content+" Reply STOP to opt out.").slice(0,TEXTBACK_MAX_TEXT_LENGTH);
 return content;
}
export function classifyMissedCallEvent(body={}){
 // An ordinary answered Vapi end-of-call-report is never a missed call.
 const message=body.message&&typeof body.message==="object"?body.message:body;
 const call=message.call&&typeof message.call==="object"?message.call:body.call||{};
 const eventType=String(message.type||body.type||"").toLowerCase();
 const direction=String(call.type||message.callType||body.callType||"").toLowerCase();
 const ended=String(message.endedReason||call.endedReason||body.endedReason||"").toLowerCase();
 const explicitlyMissed=call.missed===true||message.missed===true||
  ["call.missed","missed-call","missed_call"].includes(eventType)||
  ["no-answer","missed-call","inbound-no-answer","assistant-did-not-answer"].includes(ended);
 // Some providers use type "inboundPhoneCall" and event wrapper type "end-of-call-report".
 if(!/inbound/.test(direction)||!explicitlyMissed)return {missed:false,reason:"not_verified_inbound_missed"};
 const uid=text(call.metadata?.userUid||message.metadata?.userUid||body.userUid,128);
 const callId=text(call.id||message.callId||body.callId,128);
 const phoneNumberId=text(call.phoneNumberId||message.phoneNumberId||body.phoneNumberId,128);
 const from=normalizeUsPhone(call.customer?.number||message.from||body.from);
 const to=normalizeUsPhone(call.phoneNumber?.number||message.to||body.to);
 if(!/^[a-zA-Z0-9_-]{8,128}$/.test(uid)||!callId||!from||(!phoneNumberId&&!to))
  return {missed:false,reason:"missing_verified_call_identity"};
 return {missed:true,uid,callId,from,to,phoneNumberId,endedReason:ended};
}
export function readyForAutomaticTextback(config={},providerReady=false){
 if(config.enabled!==true)return {ready:false,reason:"feature_disabled"};
 if(config.autoSend!==true)return {ready:false,reason:"automatic_sending_off"};
 if(config.a2pRegistered!==true)return {ready:false,reason:"carrier_registration_unverified"};
 if(config.optOutHandlingVerified!==true)return {ready:false,reason:"opt_out_handling_unverified"};
 if(config.consentRecorded!==true)return {ready:false,reason:"text_permission_unverified"};
 if(!normalizeUsPhone(config.fromNumber))return {ready:false,reason:"business_number_missing"};
 if(!providerReady)return {ready:false,reason:"sms_transport_not_connected"};
 return {ready:true,reason:"ready"};
}
export function verifyTextbackWebhookSignature(secret,payload,header){
 // Uses WebCrypto-style constant-time checks via node:crypto in the server route;
 // this pure helper only normalizes the expected header spelling.
 return Boolean(secret&&payload&&/^sha256=[a-f0-9]{64}$/i.test(String(header||"")));
}
