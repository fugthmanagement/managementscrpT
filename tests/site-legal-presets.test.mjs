import test from "node:test";
import assert from "node:assert/strict";
import {siteLegalPages} from "../lib/site-legal-defaults.js";
import {sitePresetQuestions,sitePresetAnswer} from "../lib/site-preset-questions.js";

const business={
 name:"CHAMPS ELECTRIC INC",industry:"contractor",contactEmail:"hello@champs.example",
 phone:"305-555-0123",serviceArea:"Miami",businessHours:"Every day, by appointment",
 description:"Residential and commercial electrical project consultations.",
 services:["Panel upgrades","EV charger consultations"],
 showServices:true,showFaq:true,
 faqItems:[{question:"Do you serve Miami?",answer:"Please contact us about Miami availability."}]
};

test("each generated preview receives business-specific privacy, terms and data policies",()=>{
 const pages=siteLegalPages(business,true);
 assert.deepEqual(Object.keys(pages),["privacy","terms","data"]);
 for(const type of ["privacy","terms","data"]){
  assert.equal(pages[type].sample,true);
  assert.match(pages[type].intro,/CHAMPS ELECTRIC INC/);
  assert.match(pages[type].contact,/hello@champs\.example/);
  assert.ok(pages[type].sections.length>=3);
 }
 assert.match(JSON.stringify(pages),/not.*confirm|not.*adopted|not.*guaranteed/i);
});
test("website owner can supply individual approved legal wording without replacing other policy pages",()=>{
 const pages=siteLegalPages({...business,legalApproved:true,
  legalPrivacyCustom:"Our verified privacy wording for customers."},false);
 assert.equal(pages.privacy.sample,false);
 assert.equal(pages.privacy.sections[0].body,"Our verified privacy wording for customers.");
 assert.ok(pages.terms.sections.length>=3);
});
test("preset visitor chatbot lists selectable, data-backed answers and no new booking claims",()=>{
 const qs=sitePresetQuestions(business,true);
 assert.ok(qs.length>=9);
 assert.match(sitePresetAnswer(business,"services",true),/Panel upgrades/);
 assert.match(sitePresetAnswer(business,"contact",true),/305-555-0123/);
 assert.match(sitePresetAnswer(business,"hours",true),/Every day/);
 assert.match(sitePresetAnswer(business,"appointment",true),/not book a service|consultation/i);
 assert.match(sitePresetAnswer(business,"booking-status",true),/cannot look up private appointments/);
 assert.equal(sitePresetAnswer(business,"arbitrary free text",true),null);
});
test("missing business hours and booking data are never hallucinated",()=>{
 const qs=sitePresetQuestions({name:"Sample",services:[],showServices:true},true);
 assert.match(qs.find(q=>q.id==="hours").answer,/not been added/);
 assert.match(qs.find(q=>q.id==="services").answer,/no verified service list/);
 assert.doesNotMatch(JSON.stringify(qs),/appointment confirmed/i);
});
