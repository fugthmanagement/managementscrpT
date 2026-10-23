import test from "node:test";
import assert from "node:assert/strict";
import {BILLING_PLANS,validAddons,dollars} from "../lib/billing-catalog.js";
import {accountAccessPlan,normalizePlan,PLAN_LEVELS} from "../lib/plan-access.js";
import {TEXTBACK_PRICE_ID,TEXTBACK_SAMPLE,defaultTextbackSettings,
 normalizeTextbackSettings,renderTextbackMessage,isEligibleMissedCall} from "../lib/textback-flow.js";

test("Live text-back offer is an independent $49.99 monthly subscription, with zero setup",()=>{
 const p=BILLING_PLANS.textback;
 assert.equal(p.monthly,4999);assert.equal(p.setup,0);
 assert.equal(p.kind,"subscription");assert.equal(p.tier,"textback");
 assert.equal(TEXTBACK_PRICE_ID,"price_1UTPooHGcNIhcRMjPDGqXQXf");
 assert.equal(dollars(p.monthly),"$49.99");
 assert.deepEqual(validAddons("textback",[]),[]);
 assert.equal(validAddons("textback",["sms"]),null);
});
test("Standalone textback subscription grants its own tier without AI receptionist entitlements",()=>{
 assert.equal(normalizePlan("textback",true),"textback");
 assert.equal(normalizePlan("textback",false),"none");
 assert.equal(accountAccessPlan({billingActive:true,planTier:"textback"}),"textback");
 assert.ok(PLAN_LEVELS.textback<PLAN_LEVELS.starter);
});
test("Text-back setup cannot enable automatic sending without verified provider",()=>{
 const defaults=defaultTextbackSettings("CHAMPS ELECTRIC INC");
 assert.equal(defaults.sendEnabled,false);
 assert.equal(defaults.providerVerified,false);
 assert.match(TEXTBACK_SAMPLE,/\{\{business\}\}/);
 const saved=normalizeTextbackSettings({requestedEnabled:true,preferredProvider:"vapi_number",
  phoneNumber:"+13055550149",businessName:"CHAMPS ELECTRIC INC",messageTemplate:TEXTBACK_SAMPLE,
  replyDelaySeconds:30},defaults);
 assert.equal(saved.requestedEnabled,true);
 assert.equal(saved.sendEnabled,false);
 assert.equal(saved.providerVerified,false);
 assert.equal(saved.provider,"unconnected");
 assert.equal(saved.preferredProvider,"vapi_number");
 assert.match(renderTextbackMessage(saved),/CHAMPS ELECTRIC INC/);
});
test("Reject malformed business number, URL marketing and unapproved delay",()=>{
 assert.throws(()=>normalizeTextbackSettings({phoneNumber:"3055550149"}),/valid US/);
 assert.throws(()=>normalizeTextbackSettings({messageTemplate:"See http://unsafe.example/" }),/Use a business-specific/);
 assert.throws(()=>normalizeTextbackSettings({replyDelaySeconds:999}),/approved delay/);
});
test("Answered and opted-out calls never trigger an automated reply",()=>{
 assert.equal(isEligibleMissedCall({outcome:"missed",answered:false}),true);
 assert.equal(isEligibleMissedCall({outcome:"no_answer",answered:false}),true);
 assert.equal(isEligibleMissedCall({outcome:"busy",answered:false}),true);
 assert.equal(isEligibleMissedCall({outcome:"answered",answered:true}),false);
 assert.equal(isEligibleMissedCall({outcome:"missed",answered:true}),false);
 assert.equal(isEligibleMissedCall({outcome:"missed",smsOptOut:true}),false);
});
