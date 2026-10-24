/**
 * Non-sensitive speech/transcript health signals for a user-owned test call.
 * A blank provider transcript is not conclusive proof that the caller's audio
 * never reached the telephony provider; phrase diagnostics accordingly.
 */
const who=v=>String(v||"").trim().toLowerCase();
export function callerSpeechEvidence(call){
 const messages=call?.artifact?.messages||call?.messages;
 if(Array.isArray(messages)&&messages.some(item=>{
  const role=who(item?.role||item?.speaker);
  const text=item?.message||item?.text||item?.content||"";
  return ["user","caller","customer"].includes(role)&&typeof text==="string"&&text.trim().length>0;
 }))return true;
 const transcript=call?.artifact?.transcript||call?.transcript;
 if(typeof transcript==="string"&&/(?:^|\n)\s*(caller|user|customer)\s*:\s*\S/im.test(transcript))return true;
 if(Array.isArray(transcript)&&transcript.some(item=>{
  const role=who(item?.role||item?.speaker);
  return ["user","caller","customer"].includes(role)&&String(item?.text||item?.message||"").trim();
 }))return true;
 return false;
}
export function voiceConversationHealth(call){
 const ended=String(call?.status||"").toLowerCase()==="ended"||String(call?.status||"").toLowerCase()==="failed";
 if(!ended)return {available:false,callerSpeechDetected:null,diagnostic:null};
 const heard=callerSpeechEvidence(call);
 const reason=who(call?.endedReason);
 const hint=/silence|no.?speech|no.?input|transcrib/i.test(reason)?
  "The test ended after silence or a transcription issue. Check telephone audio, call connection and voice transcription.":
  "No caller speech was found in the saved transcript. Try a longer test, speak after the greeting, and check call audio/voice transcription settings.";
 return {available:true,callerSpeechDetected:heard,diagnostic:heard?null:hint};
}
