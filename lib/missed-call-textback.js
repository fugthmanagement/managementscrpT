/**
 * Missed-call text back. Standalone, zero-LLM composition logic.
 * Live delivery is intentionally opt-in and requires an SMS carrier.
 */

export const DEFAULT_TEXTBACK={
 enabled:false,complianceAttested:false,provider:"twilio",
 message:"Hi, this is {{business}}. Sorry we missed your call! Reply with what you need and we'll follow up. Reply STOP to opt out.",
 minimumRepeatHours:24
};
const text=(s,max=400)=>String(s??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,max);
export function phoneE164(input){
 const d=String(input||"").replace(/\D/g,"");
 if(d.length===10)return "+1"+d;
 if(d.length===11&&d[0]==="1")return "+"+d;
 return "";
}
export function missedCallOutcome(call){
 if(!call||call.type!=="inboundPhoneCall"||call.metadata?.fugthPreview||
  call.metadata?.founderOutbound)return {missed:false,reason:"not_real_inbound"};
 const status=String(call.status||"").toLowerCase();
 if(!["ended","failed"].includes(status))return {missed:false,reason:"not_final"};
 // Avoid texting callers the AI actually served. Provider end-reason values
 // are not stable across transfers. Only known unanswered/failed outcomes pass.
 const reason=String(call.endedReason||"").toLowerCase();
 if(!/^(?:no-answer|ring-timeout|unanswered|assistant-not-available|assistant-request-failed|assistant-not-found|phone-call-provider-closed-websocket)$/.test(reason))
  return {missed:false,reason:"handled_or_unknown"};
 if(Array.isArray(call.artifact?.messages)&&call.artifact.messages.some(m=>m.role==="assistant"&&m.message))
  return {missed:false,reason:"assistant_spoke"};
 if(!phoneE164(call.customer?.number))return {missed:false,reason:"missing_caller_number"};
 return {missed:true,reason};
}
export function cleanTextbackSettings(raw={}){
 const repeat=Number(raw.minimumRepeatHours);
 return {
  enabled:raw.enabled===true,
  complianceAttested:raw.complianceAttested===true,
  provider:"twilio",
  minimumRepeatHours:Number.isInteger(repeat)?Math.min(168,Math.max(1,repeat)):24,
  message:text(raw.message||DEFAULT_TEXTBACK.message,320)
 };
}
export function composeTextback(settings,profile,caller){
 const cfg=cleanTextbackSettings(settings);
 const business=text(profile?.businessName||profile?.name||"our business",90);
 const number=phoneE164(caller);
 if(!number)return null;
 let body=cfg.message.replace(/\{\{business\}\}/gi,business);
 body=body.replace(/\{\{phone\}\}/gi,text(profile?.businessPhone||profile?.phone||"",32));
 // Prevent unknown template variables being sent or text messages without STOP.
 body=body.replace(/\{\{[^}]+\}\}/g,"").trim();
 if(!/\bstop\b/i.test(body))body+=" Reply STOP to opt out.";
 return body.slice(0,600);
}
export const textbackProviderReady=env=>Boolean(
 env.TWILIO_ACCOUNT_SID&&env.TWILIO_AUTH_TOKEN&&phoneE164(env.TWILIO_FROM_NUMBER)&&
 /^[A-Za-z0-9_-]{8,128}$/.test(String(env.FUGTH_MESSAGING_OWNER_UID||""))
);
