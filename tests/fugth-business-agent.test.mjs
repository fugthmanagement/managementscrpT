import test from "node:test";
import assert from "node:assert/strict";
import {runFugthBusinessAgent,assignedBusinessModel,businessDataWeight} from "../lib/server/fugth-business-agent.js";
test("light business defaults to the smaller Qwen model",()=>{
 const x=assignedBusinessModel({name:"Local Business",services:["Repairs"],contactEmail:"owner@example.com"});
 assert.equal(x.model,"0.5b");assert.equal(x.source,"auto_weighted");
});
test("dense approved business data selects the 1.5B model",()=>{
 const x=assignedBusinessModel({name:"Complex Business",
  services:["Electrical rewiring","Main panel installations","Commercial upgrades","Fixtures","Emergency estimates","Inspections"],
  faqItems:Array.from({length:5},(_,i)=>({question:"Service question "+i,answer:"Specific owner-approved service detail "+i+" confirmed."})),
  aboutDetail:"A locally operated service business with many confirmed services and policies."});
 assert.equal(x.model,"1.5b");
});
test("explicit model overrides automatic selection",()=>{
 const x=assignedBusinessModel({name:"Complex Business",aiAgentModel:"0.5b",services:["Repair"]});
 assert.equal(x.model,"0.5b");assert.equal(x.source,"owner_assigned");
});
test("independent sample design services are not a verified claim",async()=>{
 const x=await runFugthBusinessAgent({site:{name:"Design Demo",previewMode:true,
  industry:"contractor",description:"We are the best in the universe.",
  services:["Fake premium roof service"],showServices:true},
  question:"What services do you offer?",mode:"facts"});
 assert.doesNotMatch(x.reply,/Fake premium roof service|best in the universe/i);
 assert.equal(x.mode,"unverified");
});
test("known hours use deterministic approved facts without model generation",async()=>{
 const x=await runFugthBusinessAgent({site:{name:"Verified Repair",businessHours:"Monday-Friday 9AM-6PM",
  services:["Repair"],showServices:true},question:"What are your hours?",mode:"live"});
 assert.match(x.reply,/Monday-Friday 9AM-6PM/);
 assert.equal(x.mode,"verified_facts");
});
test("unrelated question is gated off even when the model mode is live",async()=>{
 const x=await runFugthBusinessAgent({site:{name:"Electrical Studio",services:["Wiring repairs"]},
  question:"Who was the first president of France?",mode:"live"});
 assert.equal(x.mode,"scope_filter");
});
