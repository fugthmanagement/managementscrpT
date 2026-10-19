// Pure, browser-safe practice simulator. No live dialing, AI API, or CRM writes.
// Replies adapt to the trainee's words but are deterministic coaching scenarios.
export const TRAINING_LEVELS=[
 {id:"warmup",label:"Warm-up",detail:"Friendly owner · patient · gentle objections",maxTurns:18},
 {id:"normal",label:"Realistic",detail:"Busy owner · ordinary questions and hesitations",maxTurns:16},
 {id:"hard",label:"Hard",detail:"Pushback about price, trust, or existing website",maxTurns:15},
 {id:"expert",label:"Expert",detail:"Gatekeeper, interruptions and repeated objections",maxTurns:13}
];
export const TRAINING_PERSONAS=[
 {id:"friendly",label:"Interested owner",tag:"Cooperative",intro:"Hello, {business}. This is Alex, the owner. What's this regarding?"},
 {id:"busy",label:"Busy contractor",tag:"Time pressure",intro:"Yeah, {business}. I'm in the middle of a job. What do you need?"},
 {id:"skeptic",label:"Skeptical owner",tag:"Trust objection",intro:"{business}. Who is this? Is this another sales call?"},
 {id:"website",label:"Already has a website",tag:"Existing provider",intro:"Hello, {business}. Just so you know, we already have a website. What's the call about?"},
 {id:"price",label:"Price-focused owner",tag:"Budget objection",intro:"{business}. I'll be upfront—we're watching expenses. What are you offering?"},
 {id:"gatekeeper",label:"Gatekeeper",tag:"Reach the decision maker",intro:"Thanks for calling {business}, this is Taylor at the front desk. What can I help you with?"}
];
const rubric=[
 ["introduction","Clear, truthful introduction",12],
 ["permission","Asks permission / respects their time",12],
 ["discovery","Asks about current calls or website",16],
 ["value","Explains a specific, relevant benefit",15],
 ["objection","Acknowledges and answers an objection",15],
 ["email","Asks for the best email respectfully",12],
 ["meeting","Offers a concrete appointment or callback",13],
 ["respect","Respects a firm refusal / avoids pressure",5]
];
export const TRAINING_RUBRIC=rubric;
const cap=(n,min,max)=>Math.min(max,Math.max(min,n));
const substitute=(line,business)=>line.replaceAll("{business}",business);
const choose=(level,persona)=>{
 if(persona!=="random")return TRAINING_PERSONAS.find(p=>p.id===persona)||TRAINING_PERSONAS[0];
 const list=level==="warmup"?["friendly","busy"]:level==="normal"?["friendly","busy","website","price"]:["skeptic","price","busy","website","gatekeeper"];
 return TRAINING_PERSONAS[list[Math.floor(Math.random()*list.length)]];
};
const hit=(s,re)=>re.test(s);
const patterns={
 intro:/\b(my name is|this is|i'm|i am|calling from|with fugth|pierre|neslyson)\b/i,
 permission:/\b(do you have (?:a|one) (?:second|minute|moment)|is (?:now|this) a (?:good|bad) time|can i (?:ask|have|take)|may i|mind if|real quick|briefly|quick question)\b/i,
 discovery:/\b(how (?:do|are|is)|what (?:do|happens|about)|are you (?:getting|happy|using)|who (?:handles|manages)|do you (?:have|handle|currently)|what's your|what is your)\b/i,
 value:/\b(missed calls?|new (?:leads?|customers?)|appointment|bookings?|website|web page|business site|preview|inquir(?:y|ies)|reception(?:ist)?|follow.?up|save you time|capture|estimates?|free audit)\b/i,
 email:/\b(e.?mail|send (?:you|it|over)|best address|where (?:can|should) i send|inbox)\b/i,
 meeting:/\b(schedule|calendar|appointment|15.?minute|five.?minute|walkthrough|meeting|next week|tomorrow|monday|tuesday|wednesday|thursday|friday|call (?:you )?back|what time|what day|available)\b/i,
 acknowledge:/\b(i understand|understood|that makes sense|no pressure|fair (?:point|question)|of course|absolutely|i hear you|sorry|no worries|appreciate|respect|not trying to|not replacing)\b/i,
 cost:/\b(price|pricing|cost|fee|charge|budget|rates?|plans?|quote|no obligation|no commitment|monthly|upfront|transparent|depends on)\b/i,
 existing:/\b(already have|current provider|keep your|work with your|not replace|existing website|your web person)\b/i,
 gatekeeper:/\b(owner|decision|manager|person in charge|handles the website|best person|speak with|transfer|available)\b/i,
 end:/\b(goodbye|bye|have a good day|thank you for your time|end the call|i won't call|take care)\b/i,
 promise:/\b(guaranteed|guarantee you|definitely double|free forever|no fees ever|your friend told me|my mom's friend told me)\b/i
};
function analyze(raw){
 const text=String(raw||"").trim().slice(0,1600);
 const lower=text.toLowerCase();
 const tags=Object.fromEntries(Object.entries(patterns).map(([key,regex])=>[key,hit(lower,regex)]));
 return {...tags,text,words:lower.split(/\s+/).filter(Boolean).length};
}
const mark=(state,key)=>{state.skills[key]=true;};
const nodeFor=(phase,objection)=>{
 if(phase==="gatekeeper")return "who";
 if(phase==="opening")return "start";
 if(phase==="discovery")return "honest";
 if(phase==="value")return "features";
 if(phase==="objection")return ({price:"price",trust:"softno",website:"existing",busy:"busy",tech:"tech"}[objection]||"softno");
 if(phase==="email")return "positive";
 if(phase==="schedule")return "schedule";
 if(phase==="refusal")return "stop";
 if(phase==="done")return "finish";
 return "start";
};
function close(state,result,reply,tip){
 state.phase="done";state.done=true;state.result=result;
 state.lastProspect=reply;state.coachTip=tip;state.scriptNode="finish";
 return state;
}
const initialTip="Introduce yourself, confirm you're speaking to the right person, and ask permission to take a moment.";
export function createPractice(config={}){
 const difficulty=TRAINING_LEVELS.find(x=>x.id===config.difficulty)||TRAINING_LEVELS[1];
 const persona=choose(difficulty.id,config.persona||"random");
 const business=String(config.business||"Coastal Home Services").trim().slice(0,80)||"Coastal Home Services";
 const phase=persona.id==="gatekeeper"?"gatekeeper":"opening";
 return {
  business,difficulty:difficulty.id,persona:persona.id,pitch:config.pitch||"referral",
  phase,objection:null,skills:Object.fromEntries(rubric.map(x=>[x[0],false])),
  turns:0,maxTurns:difficulty.maxTurns,trust:difficulty.id==="warmup"?45:difficulty.id==="normal"?30:18,
  patience:difficulty.id==="expert"?2:4,
  pushbacks:0,refusals:0,emailSecured:false,appointmentAgreed:false,
  lastProspect:substitute(persona.intro,business),
  coachTip:initialTip,scriptNode:nodeFor(phase),done:false,result:null,history:[],
  createdAt:Date.now()
 };
}
function next(state,reply,tip,phase,objection=null){
 state.phase=phase;state.objection=objection;state.lastProspect=reply;
 state.coachTip=tip;state.scriptNode=nodeFor(phase,objection);
 return state;
}
export function practiceTurn(previous,text){
 if(!previous||previous.done)return previous;
 const signal=analyze(text);
 if(!signal.text)return previous;
 const st={...previous,skills:{...previous.skills},history:[...previous.history],
  turns:previous.turns+1};
 st.history.push({speaker:"trainee",text:signal.text});
 if(signal.intro)mark(st,"introduction");
 if(signal.permission)mark(st,"permission");
 if(signal.discovery)mark(st,"discovery");
 if(signal.value)mark(st,"value");
 if(signal.acknowledge&&st.objection)mark(st,"objection");
 if(signal.promise)st.trust=cap(st.trust-16,0,100);
 if(signal.permission)st.trust=cap(st.trust+8,0,100);
 if(signal.value&&signal.discovery)st.trust=cap(st.trust+13,0,100);
 if(signal.acknowledge)st.trust=cap(st.trust+8,0,100);
 if(signal.words>65)st.trust=cap(st.trust-8,0,100);
 const difficulty=st.difficulty,hard=["hard","expert"].includes(difficulty);
 let reply="",tip="",phase=st.phase,objection=null;

 if(st.phase==="gatekeeper"){
  if(signal.gatekeeper&&signal.intro){
   reply=hard?"The owner isn't usually free for sales calls. What's the specific reason you need them?":
    "Sure. The owner is around, but I'll need to know what the call is about first.";
   tip="Explain one relevant benefit in a sentence. Be polite to the gatekeeper.";
   phase="gatekeeper";st.trust+=8;
   if(st.pushbacks>=1){reply="Okay, I'll see if they have a minute. ... Hello, this is the owner. What's this about?";phase="opening";}
   st.pushbacks+=1;
  }else if(signal.value&&signal.gatekeeper||signal.value&&signal.permission){
   reply="I can pass on the reason. Hold on. ... Hi, this is the owner. How can I help?";
   phase="opening";tip="You reached the owner. Get permission and ask a discovery question.";
   st.trust+=10;
  }else{
   reply="Before I transfer you, can you tell me who you're with and what this is about?";
   tip="Ask for the appropriate decision maker and identify yourself honestly.";
   st.patience-=1;phase="gatekeeper";
  }
 }else if(st.phase==="opening"){
  if(signal.end)return close(st,"ended_early","Okay, thanks for calling. Goodbye.","Practice a clearer introduction and a concrete next step on your next attempt.");
  if(!signal.intro&&!signal.value&&!signal.discovery){
   reply=st.persona==="skeptic"?"I still don't know what you're offering. Can you be direct?":
     "Sorry, who's calling and what's this about?";
   tip="State your name, FUGTH and a short reason for calling.";
  }else if((st.persona==="busy"||difficulty==="expert")&&!signal.permission){
   reply="I'm in the middle of something. Do you have a quick point, or should you call back?";
   tip="Acknowledge their time and ask permission for a 20-second explanation.";
   phase="objection";objection="busy";
  }else if(st.persona==="website"&&!signal.existing&&!signal.discovery){
   reply="We already pay somebody to handle our website. What would be different?";
   tip="Don't criticize their existing website. Ask how inquiries and appointments are handled.";
   phase="objection";objection="website";
  }else if(st.persona==="price"&&!signal.cost&&hard){
   reply="I don't need a long explanation. What does something like this cost?";
   tip="Be clear that a preview is not a price quote. Offer to explain verified options.";
   phase="objection";objection="price";
  }else{
   reply=signal.discovery?"Most of our inquiries come through phone calls. We can't always answer when we're on jobs.":
    hard?"You have twenty seconds. What's the one reason I should care?":"Okay. What does FUGTH actually do?";
   tip=signal.discovery?"You found a possible pain point. Connect it to a specific benefit.":"Ask a discovery question, then make the value concrete.";
   phase=signal.discovery?"value":"discovery";
  }
 }else if(st.phase==="discovery"){
  if(signal.discovery){
   reply=st.persona==="website"?"We have a website, but the form isn't always followed up quickly.":
    "We mostly take calls and texts, and the crew sometimes misses a request.";
   tip="Repeat the pain in their words, then explain how FUGTH helps.";
   phase="value";st.trust+=12;
  }else if(signal.value){
   reply=hard?"How is that different from what my phone or website already does?":"That sounds useful. How would it work for a company like mine?";
   phase="value";tip="Tie your solution to one real situation for this business.";
  }else{
   reply="I understand, but what do you want to know about how we work?";
   tip="Ask one open-ended question about their incoming calls, website or booking process.";
  }
 }else if(st.phase==="value"){
  if(signal.value&&(signal.discovery||signal.acknowledge))st.trust=cap(st.trust+12,0,100);
  if(!signal.value){
   reply="Can you explain what I would actually get? I'm still not clear.";
   tip="Describe a concrete feature—missed-call follow-up, website preview or booking.";
  }else if(st.persona==="price"||difficulty==="expert"&&st.pushbacks===0){
   reply="What is that going to cost me? I don't want hidden fees.";
   phase="objection";objection="price";tip="Address pricing honestly, without invented prices or guarantees.";st.pushbacks+=1;
  }else if(st.persona==="skeptic"||difficulty==="hard"&&st.pushbacks===0){
   reply="I've heard this from other companies. How do I know this isn't just a pitch?";
   phase="objection";objection="trust";tip="Validate the concern and offer a no-pressure, verifiable demonstration.";st.pushbacks+=1;
  }else if(st.persona==="website"&&st.pushbacks===0){
   reply="We already have a website person. I don't want to replace them.";
   phase="objection";objection="tech";tip="Explain you can work alongside their current team.";st.pushbacks+=1;
  }else{
   reply=hard?"Maybe. If I look at it, am I signing up for something?":"Sounds interesting. Do you have an example I could see?";
   phase="email";tip="Offer the private preview without implying it is already built if it isn't. Ask permission to send.";
  }
 }else if(st.phase==="objection"){
  st.pushbacks+=1;
  const concern=st.objection||"trust";
  const answered=signal.acknowledge&&(
   concern==="price"?(signal.cost||signal.value):
   concern==="website"||concern==="tech"?(signal.existing||signal.discovery||signal.value):
   concern==="busy"?(signal.meeting||signal.permission||signal.email):
   signal.value||signal.permission||signal.cost);
  if(answered){
   mark(st,"objection");st.trust=cap(st.trust+18,0,100);
   if(concern==="busy"&&signal.meeting){
    reply="Tomorrow morning could work. What exactly would we cover?";
    phase="schedule";tip="Ask for a specific agreed time, not a vague callback.";
   }else if(hard&&st.pushbacks<3){
    reply=concern==="price"?"Okay, but I already have a site. Why switch?":
     "All right, but I still don't want a long sales demonstration. Can you just show me something?";
    phase="objection";objection=concern==="price"?"website":"trust";
    tip="Hard mode adds a second objection. Acknowledge, then pivot calmly toward a small next step.";
   }else{
    reply="That sounds reasonable. What would you need from me to see an example?";
    phase="email";tip="Ask for the preferred email address, without pressure.";
   }
  }else if(signal.email&&st.trust>48&&!hard){
   reply="Maybe send it to me, but keep it brief. What email should I use to reply?";
   phase="email";tip="Confirm their preferred contact address and avoid overpromising.";
  }else if(st.pushbacks>=3||st.patience<=1){
   reply="Look, I've said I'm not interested. Please don't follow up with me.";
   phase="refusal";tip="That is a firm refusal. Respect it, end politely and do not ask again.";
  }else{
   reply=concern==="price"?"You haven't answered what it costs. Is there a fee?":
    concern==="busy"?"I really don't have time. What do you need, exactly?":
    concern==="website"||concern==="tech"?"We have this handled already. What's new?":
    "I'm still not convinced. What makes this useful for my business?";
   phase="objection";objection=concern;tip="Acknowledge their actual objection first, then answer it with one concise fact.";
   st.patience-=1;
  }
 }else if(st.phase==="email"){
  if(signal.email){
   mark(st,"email");st.emailSecured=true;st.trust=cap(st.trust+10,0,100);
   reply=hard?"You can use alex@example.com for this exercise, but just one preview, okay?":
    "Sure, alex@example.com works for this practice. What is the next step?";
   // In practice we supply an invented example email; never send it.
   phase="schedule";tip="Read the sample address back, confirm spelling, and offer two realistic times.";
  }else if(signal.meeting){
   reply="I'd like to see an example first. Can you email a short preview?";
   phase="email";tip="Ask permission to send the preview, then confirm contact information.";
  }else{
   reply="Okay, how can I take a look without getting into a long meeting?";
   tip="Ask for an email to share a brief preview, and explain the next step.";
  }
 }else if(st.phase==="schedule"){
  if(signal.meeting){
   mark(st,"meeting");st.appointmentAgreed=true;
   reply="Thursday at 10:30 works for this exercise. Send the invite only after we confirm the details.";
   phase="closing";tip="Summarize the appointment and ask for confirmation; this is a simulation, not a real booking.";
  }else{
   reply="I could spare 15 minutes next week, depending on the day. Did you have a time in mind?";
   tip="Offer two specific options, then confirm the selected time.";
  }
 }else if(st.phase==="closing"){
  if(signal.end||signal.meeting||signal.email||signal.acknowledge||/\b(confirm|send (?:the|an) invite|see you|sounds good|perfect|talk (?:on|to you)|i.ll send)\b/i.test(signal.text)){
   mark(st,"respect");
   return close(st,"booked_simulated","Thanks, that works. Good talking with you.","Great close. You booked a simulated appointment; no calendar event was created.");
  }
  reply="Great. Can you confirm what day we'll talk again?";
  tip="Repeat the date and time, confirm the destination address, and close politely.";
 }else if(st.phase==="refusal"){
  if(signal.acknowledge||signal.end){
   mark(st,"respect");
   return close(st,"refusal_respected","I appreciate that. Goodbye.","Good. You honored an explicit do-not-contact request. This improves trust, even without a booking.");
  }
  return close(st,"prospect_lost","I asked not to be contacted again. Goodbye.","A firm refusal must be respected immediately. Don't loop objections once someone says no.");
 }
 st.trust=cap(st.trust,0,100);
 if(st.turns>=st.maxTurns){
  if(st.emailSecured)return close(st,"email_only","Please send the preview, and we'll leave it there for now. Thanks.","You captured a sample email, but the conversation ran out of time before booking.");
  return close(st,"time_expired","I'm sorry, I have to get back to work. Goodbye.","Keep the conversation concise and aim for one agreed next step.");
 }
 st.phase=phase;st.objection=objection;st.lastProspect=reply;st.coachTip=tip;st.scriptNode=nodeFor(phase,objection);
 st.history.push({speaker:"prospect",text:reply});
 return st;
}
export function practiceReport(state){
 const earned=rubric.filter(([key])=>state.skills[key]).reduce((total,[, ,points])=>total+points,0);
 const rate=state.result==="booked_simulated"?"Simulated appointment":state.result==="email_only"?"Sample email collected":
 state.result==="refusal_respected"?"Respectful close":state.result==="prospect_lost"?"Unsuccessful close":
 state.result==="time_expired"?"Ran out of time":state.result==="ended_early"?"Ended early":"Practice incomplete";
 return {score:cap(earned,0,100),earned:rubric.map(([key,label,points])=>({key,label,points,met:state.skills[key]===true})),
 outcome:rate,turns:state.turns,difficulty:state.difficulty,persona:state.persona,
 tip:state.result==="booked_simulated"?"You're ready to try a tougher prospect next.":
 "Practice the missing skills above, especially permission, listening and moving toward a clear next step."};
}