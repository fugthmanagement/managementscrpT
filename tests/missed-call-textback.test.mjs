import test from "node:test";
import assert from "node:assert/strict";
import {TEXTBACK_MONTHLY_CENTS,TEXTBACK_DEFAULT_TEMPLATE,
 normalizeUsPhone,renderTextbackMessage,classifyMissedCallEvent,
 readyForAutomaticTextback} from "../lib/missed-call-textback.js";
test("standalone 49.99 plan and provider-independent phone normalization",()=>{
 assert.equal(TEXTBACK_MONTHLY_CENTS,4999);
 assert.equal(normalizeUsPhone("(305) 555-0149"),"+13055550149");
 assert.equal(normalizeUsPhone("+13055550149"),"+13055550149");
 assert.equal(normalizeUsPhone("1234"),null);
});
test("missed-call replies are personalized, prefilled and respect STOP language",()=>{
 const msg=renderTextbackMessage(TEXTBACK_DEFAULT_TEMPLATE,{business:"Champs Electric"});
 assert.match(msg,/Champs Electric/);
 assert.match(msg,/Sorry we missed your call/i);
 assert.match(msg,/STOP/i);
 const custom=renderTextbackMessage("Hey {caller}, thanks for reaching {business}!",{
  business:"Florida Electric",callerName:"Alex"});
 assert.match(custom,/Alex/);
 assert.match(custom,/Florida Electric/);
 assert.match(custom,/STOP/);
});
test("ordinary completed voice conversations are not falsely missed calls",()=>{
 assert.deepEqual(classifyMissedCallEvent({
  message:{type:"end-of-call-report",endedReason:"customer-ended-call",call:{
   type:"inboundPhoneCall",id:"call-123",metadata:{userUid:"owner-123456789"},
   customer:{number:"+13055550149"},phoneNumber:{number:"+13055550148"}}}
 }),{missed:false,reason:"not_verified_inbound_missed"});
});
test("confirmed missed inbound call captures tenant and caller identity",()=>{
 const x=classifyMissedCallEvent({
  message:{type:"end-of-call-report",endedReason:"no-answer",call:{
   type:"inboundPhoneCall",id:"call-123",metadata:{userUid:"owner-123456789"},
   phoneNumberId:"number-12345678",customer:{number:"3055550149"},
   phoneNumber:{number:"3055550148"}}}
 });
 assert.equal(x.missed,true);
 assert.equal(x.uid,"owner-123456789");
 assert.equal(x.from,"+13055550149");
 assert.equal(x.to,"+13055550148");
});
test("no automatic send without every provider and compliance prerequisite",()=>{
 const config={enabled:true,autoSend:true,
  fromNumber:"+13055550148",a2pRegistered:true,
  optOutHandlingVerified:true,consentRecorded:true};
 assert.equal(readyForAutomaticTextback(config,false).ready,false);
 assert.equal(readyForAutomaticTextback({...config,consentRecorded:false},true).ready,false);
 assert.equal(readyForAutomaticTextback({...config,optOutHandlingVerified:false},true).ready,false);
 assert.equal(readyForAutomaticTextback({...config,autoSend:false},true).ready,false);
 assert.equal(readyForAutomaticTextback(config,true).ready,true);
});
