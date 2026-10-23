import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {sitePresetQuestions} from "../lib/site-preset-questions.js";
test("quick-answer previews never claim confirmed bookings",()=>{
 const answers=sitePresetQuestions({name:"Sample Electric",services:["Repairs"]},true);
 assert.ok(answers.some(x=>x.id==="booking-status"));
 assert.match(answers.find(x=>x.id==="appointment").answer,/not book a service/i);
});
test("portable preview contains only public marketing details, never private account secrets",()=>{
 const source=readFileSync("lib/portable-prospect-preview.js","utf8");
 const list=source.match(/const SAFE_PROPS=\[([\s\S]*?)\];/)?.[1]||"";
 assert.ok(list.length>100);
 for(const secret of ["stripeSecret","ownerUid","privateKey","password","accountNumber",
  "stripeSubscriptionId","customerId","billingActive","callTranscript"]){
  assert.doesNotMatch(list,new RegExp(secret));
 }
 assert.match(source,/legalApproved=false/);
 assert.match(source,/new edits require a NEW link/i);
 assert.match(source,/immutable/i);
});
test("portable public page clearly identifies independent unapproved concept",()=>{
 const page=readFileSync("app/demo/portable/page.jsx","utf8");
 assert.match(page,/not approved by this business/i);
 assert.match(page,/shareable snapshot/i);
});
