import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_TEXTBACK,missedCallOutcome,phoneE164,composeTextback,cleanTextbackSettings,textbackProviderReady} from "../lib/missed-call-textback.js";
import {BILLING_PLANS,validAddons,dollars} from "../lib/billing-catalog.js";
import {normalizePlan,planLevel} from "../lib/plan-access.js";

const missed={type:"inboundPhoneCall",status:"ended",endedReason:"no-answer",
 customer:{number:"+13055550199"},artifact:{messages:[]},metadata:{}};
test("only actual inbound missed calls qualify",()=>{
 assert.equal(missedCallOutcome(missed).missed,true);
 for(const alteration of [
  {...missed,type:"outboundPhoneCall"}, {...missed,status:"in-progress"},
  {...missed,endedReason:"customer-ended-call"},
  {...missed,customer:{number:"not a phone"}},
  {...missed,metadata:{fugthPreview:true}},
  {...missed,metadata:{founderOutbound:true}},
  {...missed,artifact:{messages:[{role:"assistant",message:"Hello caller"}]}},
  {...missed,artifact:{messages:{error:"malformed"}},endedReason:"customer-ended-call"}
 ])assert.equal(missedCallOutcome(alteration).missed,false,JSON.stringify(alteration));
});
test("caller phone formatting is US E.164 only",()=>{
 assert.equal(phoneE164("305-555-0149"),"+13055550149");
 assert.equal(phoneE164("+1 (305) 555-0149"),"+13055550149");
 assert.equal(phoneE164(""),"");
 assert.equal(phoneE164("555"),"");
});
test("text-back defaults off and must have carrier plus mapped owner",()=>{
 assert.equal(DEFAULT_TEXTBACK.enabled,false);
 assert.equal(DEFAULT_TEXTBACK.complianceAttested,false);
 assert.equal(textbackProviderReady({TWILIO_ACCOUNT_SID:"A",TWILIO_AUTH_TOKEN:"B",TWILIO_FROM_NUMBER:"+13055550149"}),false);
 assert.equal(textbackProviderReady({TWILIO_ACCOUNT_SID:"A",TWILIO_AUTH_TOKEN:"B",
  TWILIO_FROM_NUMBER:"+13055550149",FUGTH_MESSAGING_OWNER_UID:"owner_1234567890"}),true);
});
test("message template uses tenant business profile and STOP",()=>{
 const actual=composeTextback({message:"Hi, {{business}} missed you. Call {{phone}}"},
  {businessName:"CHAMPS ELECTRIC INC",phone:"305-555-0115"},"3055550149");
 assert.match(actual,/CHAMPS ELECTRIC INC/);
 assert.match(actual,/305-555-0115/);
 assert.match(actual,/STOP/);
 assert.equal(composeTextback({},{},"not phone"),null);
 assert.equal(cleanTextbackSettings({enabled:1,complianceAttested:"yes"}).enabled,false);
 assert.equal(cleanTextbackSettings({minimumRepeatHours:99999}).minimumRepeatHours,168);
});
test("text-back offer is $49.99 monthly and no upsell add-ons",()=>{
 assert.equal(BILLING_PLANS.textback.monthly,4999);
 assert.equal(BILLING_PLANS.textback.kind,"subscription");
 assert.equal(dollars(4999),"$49.99");
 assert.deepEqual(validAddons("textback",[]),[]);
 assert.equal(validAddons("textback",["sms"]),null);
 assert.equal(normalizePlan("textback",true),"textback");
 assert.ok(planLevel("textback")<planLevel("starter"));
});
