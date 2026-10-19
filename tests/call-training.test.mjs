import test from "node:test";
import assert from "node:assert/strict";
import {TRAINING_LEVELS,TRAINING_PERSONAS,createPractice,practiceTurn,practiceReport} from "../lib/call-training-engine.js";

test("four difficulties and distinct call scenarios are available",()=>{
 assert.deepEqual(TRAINING_LEVELS.map(level=>level.id),["warmup","normal","hard","expert"]);
 assert.ok(TRAINING_PERSONAS.some(persona=>persona.id==="gatekeeper"));
});

test("friendly practice responds to speech turns and books only a simulated appointment",()=>{
 let call=createPractice({business:"Test Plumbing",difficulty:"warmup",persona:"friendly"});
 assert.match(call.lastProspect,/Test Plumbing/);
 const turns=[
  "Hi, this is Pierre with FUGTH, may I ask a quick question? How do you handle missed calls?",
  "We capture missed calls and help with customer appointment follow-ups.",
  "What is your best email address to send a short preview?",
  "Could we schedule a 15 minute walkthrough Thursday?",
  "Perfect, I'll confirm the email and time. Thanks for your time."
 ];
 for(const line of turns)call=practiceTurn(call,line);
 const result=practiceReport(call);
 assert.equal(call.done,true);
 assert.equal(call.result,"booked_simulated");
 assert.equal(result.outcome,"Simulated appointment");
 assert.ok(result.score>=70);
 assert.equal(call.skills.email,true);
 assert.equal(call.skills.meeting,true);
});

test("skeptical, price-focused scenarios require an honest objection response",()=>{
 let call=createPractice({difficulty:"hard",persona:"price",business:"Tampa Auto"});
 call=practiceTurn(call,"Hello, I'm Pierre with FUGTH. Could I ask a quick question?");
 assert.equal(call.phase,"objection");
 assert.equal(call.objection,"price");
 call=practiceTurn(call,"We help local shops capture leads with a website preview.");
 assert.equal(call.phase,"objection");
 assert.equal(call.skills.objection,false);
 call=practiceTurn(call,"I understand your budget concerns. I can explain actual website pricing and hosting plans before you decide.");
 assert.equal(call.skills.objection,true);
 assert.notEqual(call.result,"booked_simulated");
});

test("gatekeeper requires a reason and does not instantly become the owner",()=>{
 let call=createPractice({difficulty:"expert",persona:"gatekeeper",business:"Corner Roofing"});
 assert.equal(call.phase,"gatekeeper");
 call=practiceTurn(call,"Hi, this is Pierre with FUGTH. Can I speak to the owner?");
 assert.equal(call.phase,"gatekeeper");
 call=practiceTurn(call,"We help roofing teams handle missed calls. Could I speak with whoever manages the website?");
 assert.equal(call.phase,"opening");
 assert.match(call.lastProspect,/owner/);
});

test("a hard refusal requires a respectful ending and points to Pierre's stop node",()=>{
 const initial=createPractice({difficulty:"hard",persona:"skeptic"});
 const call=practiceTurn({...initial,phase:"refusal",objection:"trust"},"I understand. I respect your wishes. I won't call again. Have a good day.");
 assert.equal(call.done,true);
 assert.equal(call.result,"refusal_respected");
 assert.equal(call.skills.respect,true);
 assert.equal(call.scriptNode,"finish");
});

test("empty transcript and completed sessions do not advance or duplicate work",()=>{
 const call=createPractice({persona:"friendly"});
 assert.equal(practiceTurn(call,""),call);
 const ended={...call,done:true,result:"ended_early"};
 assert.equal(practiceTurn(ended,"Hello there"),ended);
});