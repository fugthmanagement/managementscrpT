/**
 * FUGTH business-only retrieval gate. Pure JS: suitable for the website
 * preview and for the server. Only publicly approved SITE fields are indexed.
 * No unrestricted general Q&A or private Firestore customer retrieval.
 */
export const BUSINESS_AGENT_OFF_TOPIC=
 "I can only answer questions about this business's services, hours, service area, contact details and appointment requests. What would you like to know about this business?";
export const BUSINESS_AGENT_UNVERIFIED=
 "I couldn't find a confirmed answer in this business's published information. Please contact the business directly to verify.";
const common=new Set(("a an and are as at be been but by can could do does for from had has have how i i'd i'm if in is it its me my of on or our please so that the their them there these this to us was we were what when where who why will with would you your yes no they about any more tell know want need question ask explain information help now like thanks thank okay ok hey hi hello good morning afternoon evening").split(" "));
const actionStop=new Set(("service services offer offered provided provide business company store shop team work working help support doing done repair repairs fixing fix installed installation doing give makes make customer customers job jobs available availability general specific something anything handle handles handled request requesting please interested question details tell know do did does would can could have has").split(" "));
const stem=token=>{
 let x=String(token).toLowerCase().replace(/[^a-z0-9]/g,"");
 if(x.length>5&&x.endsWith("ies"))x=x.slice(0,-3)+"y";
 else if(x.length>5&&x.endsWith("ing"))x=x.slice(0,-3);
 else if(x.length>5&&x.endsWith("ed"))x=x.slice(0,-2);
 else if(x.length>4&&x.endsWith("es"))x=x.slice(0,-2);
 else if(x.length>3&&x.endsWith("s")&&!x.endsWith("ss"))x=x.slice(0,-1);
 return x;
};
export function businessTokens(raw,{domain=false}={}){
 const tokens=String(raw||"").toLowerCase().match(/[a-z0-9]+/g)||[];
 return [...new Set(tokens.map(stem).filter(x=>x.length>=3&&!common.has(x)&&(!domain||!actionStop.has(x))))];
}
const match=(text,regexp)=>regexp.test(String(text||"").toLowerCase());
const direct={
 hours:/\b(hours?|open|close|closing|opening|weekend|sunday|monday|tuesday|wednesday|thursday|friday|saturday|operating time)\b/i,
 contact:/\b(phone|telephone|call|number|email|contact|reach|message|text|customer support)\b/i,
 area:/\b(where (are|is)|address|located|location|service area|nearby|which (town|city|county|neighborhood)|serve (in|near)|delivery area)\b/i,
 services:/\b(service|services|offer|provide|help with|speciali[sz]|what (do|can) you do|what kind of work|what does .* do|what (do|does) (they|this business|this company) do|what they do)\b/i,
 pricing:/\b(price|pricing|cost|quote|estimate|rate|charge|fee|payment|financ|how much)\b/i,
 booking:/\b(appoint|book|schedule|reserv|availability|consultation|visit|meeting|set up a time)\b/i,
 identity:/\b(who are you|what is this company|tell me about (the|your) (company|business)|about your company|what's your business|business name)\b/i,
 faq:/\b(policy|policies|refund|return|warranty|guarantee|insured|licensed|certified|emergency|same.?day|experience|years|accept|hours|service)\b/i
};
const offTopic=/\b(french revolution|american revolution|world war|president of|prime minister|election|congress|senat(e|or)|quantum (physics|comput)|calculus|algebra|solve this equation|python code|javascript code|write (?:me )?(?:a )?(poem|essay|song|story)|play (a|the) game|bitcoin|ethereum|crypto market|weather forecast|stock market|capital of|historical figure|roman empire|astrology|celebrity|movie plot|sports score|football score|medical diagnosis|diagnose me|life advice|homework|how (?:do|can) i (?:make|repair|install|build|clean|fix) (?:a |an |my )?|how to (?:make|repair|install|build|clean|fix)|translate (this|to)|summarize (this|an?) (article|book))\b/i;
const injection=/\b(ignore (?:all|previous|your|the) instructions|forget (?:all|previous|your) instructions|system prompt|developer message|reveal (?:your|the) (?:prompt|instructions)|override your|bypass the (?:filter|rules)|pretend (?:you are|to be)|act as (?:an? )?(?:unrestricted|jailbroken)|do anything now|jailbreak|disregard your)\b/i;
const greeting=/^(?:hi|hello|hey|good (?:morning|afternoon|evening)|thank you|thanks|okay|ok)[!.\s?]*$/i;
const serviceQuestion=/\b(can you|could you|do you|does your|would you|are you able|i need|looking for|you guys)\b/i;
const nameCheck=raw=>String(raw||"").replace(/[<>]/g,"").trim().slice(0,80);
export function factChunks(site={}){
 const facts=[];
 const push=(id,type,text,topic="")=>{
  const cleaned=String(text||"").replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,850);
  if(cleaned)facts.push({id,type,text:cleaned,topic:topic||cleaned});
 };
 const name=nameCheck(site.name)||"This business";
 push("identity","identity","Business name: "+name,name);
 if(site.description)push("description","identity","Business overview: "+site.description);
 if(site.aboutDetail)push("about","identity","About the business: "+site.aboutDetail);
 if(site.showServices!==false&&Array.isArray(site.services)){
  for(const [i,text] of site.services.slice(0,8).entries())push("service-"+i,"services","Listed service: "+text,text);
 }
 if(site.businessHours)push("hours","hours","Published opening hours: "+site.businessHours);
 if(site.serviceArea)push("area","area","Published service area: "+site.serviceArea);
 if(site.phone)push("phone","contact","Business telephone: "+site.phone);
 if(site.contactEmail)push("email","contact","Business contact email: "+site.contactEmail);
 if(site.showFaq!==false&&Array.isArray(site.faqItems)){
  site.faqItems.slice(0,8).forEach((x,i)=>{
   if(x?.question&&x?.answer)push("faq-"+i,"faq","Q: "+x.question+" A: "+x.answer,x.question);
  });
 }
 return facts.slice(0,24);
}
function serviceCorpus(site,facts){
 const actual=facts.filter(x=>x.type==="services").map(x=>x.topic);
 return businessTokens(actual.join(" "),{domain:true});
}
function overlap(query,tokens){
 const q=new Set(businessTokens(query,{domain:true}));
 return tokens.filter(t=>q.has(t));
}
function domainMatches(question,site,facts){
 const domain=serviceCorpus(site,facts);
 const commonTokens=overlap(question,domain);
 const category=businessTokens((site.industry||"")+" "+(site.name||""),{domain:true});
 return {domain:commonTokens,identity:overlap(question,category)};
}
export function classifyBusinessQuestion(question,site={},facts=factChunks(site)){
 const raw=String(question||"").trim().slice(0,350);
 if(!raw)return {allowed:false,reason:"empty",intent:null,strength:0};
 // Visitors often type a single word or conversational shorthand instead of
 // a formal question. Interpret it as a request about THIS business only.
 if(/^(?:info|information|business info|details|about|about (?:you|them|the business)|business name and info(?: you know)?|tell me (?:more|about them)|company info)[?!.\s]*$/i.test(raw))
  return {allowed:true,reason:"business_overview_shorthand",intent:"identity",strength:3};
 if(/^(?:what they do|what do they do|what do you guys do|what do you do|services?|what services?|what (?:is|are) (?:their|your) services?|what they offer)[?!.\s]*$/i.test(raw))
  return {allowed:true,reason:"service_shorthand",intent:"services",strength:3};
 if(injection.test(raw))return {allowed:false,reason:"prompt_injection",intent:null,strength:0};
 if(offTopic.test(raw))return {allowed:false,reason:"off_topic",intent:null,strength:0};
 if(greeting.test(raw))return {allowed:true,reason:"greeting",intent:"greeting",strength:3};
 const types=Object.entries(direct).filter(([,regex])=>regex.test(raw)).map(([type])=>type);
 const {domain,identity}=domainMatches(raw,site,facts);
 const tokens=businessTokens(raw,{domain:true});
 const genericMention=/\b(your|you|this business|the business|your store|your company|the company|your services|your shop|your team|you guys)\b/i.test(raw);
 // A request for news, the meaning of life, someone else's products, etc.
 // should not pass merely because it contains a common word like "price".
 const foreignTarget=/\b(of|about|for) (?:bitcoin|stock|tesla car|openai|chatgpt|amazon|the world|the government|a president|a country|the internet)\b/i.test(raw);
 if(foreignTarget)return {allowed:false,reason:"off_topic",intent:null,strength:0};
 const intent=types[0]||null;
 if(intent){
  if(intent==="pricing"&&!genericMention&&!domain.length&&!identity.length)
   return {allowed:false,reason:"outside_business",intent:null,strength:0};
  // A question about a service not on the site can get a truthful "not
  // listed" answer, but will never trigger an open-ended model response.
  const strength=genericMention||domain.length||identity.length?3:1;
  return {allowed:true,reason:"business_intent",intent,strength,domain,identity};
 }
 if(domain.length>=2)return {allowed:true,reason:"domain_keyword_pair",intent:"services",strength:2,domain,identity};
 if(domain.length===1&&(genericMention||serviceQuestion.test(raw)))
  return {allowed:true,reason:"domain_keyword",intent:"services",strength:1,domain,identity};
 if(identity.length&&genericMention)return {allowed:true,reason:"business_name",intent:"identity",strength:1,domain,identity};
 return {allowed:false,reason:"off_topic",intent:null,strength:0};
}
function scoreFact(question,fact,intent){
 const q=businessTokens(question,{domain:true});
 const topic=businessTokens(fact.topic||fact.text,{domain:true});
 const tokens=businessTokens(fact.text,{domain:true});
 const set=new Set(q);
 const matches=topic.filter(x=>set.has(x)).length;
 const bulk=tokens.filter(x=>set.has(x)).length;
 const same=fact.type===intent?12:0;
 const faq=fact.type==="faq"&&bulk>=1?2:0;
 return same+matches*3+Math.min(7,bulk)+faq;
}
export function retrieveBusinessFacts(question,site={},facts=factChunks(site),gate=classifyBusinessQuestion(question,site,facts)){
 if(!gate.allowed)return [];
 if(gate.intent==="greeting")return facts.filter(f=>f.type==="identity").slice(0,1);
 const scored=facts.map(f=>({...f,score:scoreFact(question,f,gate.intent)}))
  .filter(f=>f.score>0).sort((a,b)=>b.score-a.score);
 if(gate.intent==="services"){
  const serviceRows=scored.filter(f=>f.type==="services");
  const generic=/^(?:what|which|list|show me|tell me|could you list|can you list)\b/i.test(question)&&
   /\b(services|offer|provide|do|work|speciali[sz])\b/i.test(question)&&
   businessTokens(question,{domain:true}).length<=2;
  if(!generic){
   const asked=businessTokens(question,{domain:true});
   const relevant=serviceRows.filter(f=>businessTokens(f.topic,{domain:true})
     .filter(token=>asked.includes(token)).length>=1);
   return relevant.slice(0,5);
  }
  return serviceRows.slice(0,6);
 }
 if(["contact","hours","area","identity"].includes(gate.intent)){
  const correct=scored.filter(f=>f.type===gate.intent);
  if(correct.length)return correct.slice(0,3);
 }
 if(gate.intent==="pricing"||gate.intent==="booking"){
  const faqs=scored.filter(f=>f.type==="faq"&&f.score>=4);
  const phone=facts.filter(f=>f.type==="contact");
  return [...faqs.slice(0,1),...phone.slice(0,2)].slice(0,3);
 }
 if(gate.intent==="faq"){
  const relevant=scored.filter(f=>f.type==="faq"&&
   overlap(question,businessTokens(f.topic,{domain:true})).length>=1);
  return relevant.slice(0,2);
 }
 if(scored[0]?.score>=4)return scored.slice(0,3);
 return [];
}
export function safeBusinessAnswer(question,site={},gate=classifyBusinessQuestion(question,site),facts=retrieveBusinessFacts(question,site,factChunks(site),gate)){
 const name=nameCheck(site.name)||"the business";
 if(!gate.allowed)return BUSINESS_AGENT_OFF_TOPIC;
 if(gate.intent==="greeting")return "Hello! Welcome to "+name+". I can help with listed services, hours, service area, and contact information.";
 if(gate.intent==="pricing"){
  const faq=facts.find(x=>x.type==="faq"&&/pric|price|cost|estimate|quot|rate/i.test(x.text));
  return faq?faq.text.slice(faq.text.indexOf(" A: ")+4):
   "Specific prices aren't confirmed on this website. Please contact "+name+" directly for an estimate.";
 }
 if(gate.intent==="booking"){
  const phone=site.phone?" Call "+site.phone+".":"";
  const email=site.contactEmail?" Email "+site.contactEmail+".":"";
  return "The team must confirm appointment availability. You can request a time through the contact options on this site."+(phone||email?phone+email:"");
 }
 if(gate.intent==="hours")return site.businessHours?
  "The listed business hours are: "+site.businessHours+".":"Business hours haven't been published yet. Please contact the team to confirm.";
 if(gate.intent==="area")return site.serviceArea?
  "The business lists this service area: "+site.serviceArea+".":"I couldn't find a confirmed service area. Please contact the business.";
 if(gate.intent==="contact"){
  return site.phone||site.contactEmail?
   "You can reach "+name+"."+(site.phone?" Phone: "+site.phone+".":"")+
    (site.contactEmail?" Email: "+site.contactEmail+".":""):
    "Contact details aren't published here yet.";
 }
 if(gate.intent==="identity"){
  const about=facts.find(x=>x.id==="description")||facts.find(x=>x.id==="about");
  const services=Array.isArray(site.services)&&site.showServices!==false?
   site.services.slice(0,4).filter(Boolean):[];
  const detail=about?about.text.replace(/^Business overview: |^About the business: /,""):
   name+" is the business featured on this website.";
  return (detail+(services.length?" Services shown: "+services.join(", ")+".":"")).slice(0,400);
 }
 if(gate.intent==="services"){
  const listed=(Array.isArray(site.services)&&site.showServices!==false?site.services:[])
   .map(x=>String(x||"").trim()).filter(Boolean).slice(0,6);
  if(!listed.length)return "I can't confirm that particular service from this website. Please contact the business directly.";
  const generic=/\b(?:what|which|list|show|tell|services?|offer|provide|work|what they do)\b/i.test(question)&&
   /\b(?:services?|offer|provide|they do|you do|work)\b/i.test(question)&&
   businessTokens(question,{domain:true}).length<=2;
  if(!generic&&!facts.some(x=>x.type==="services"))
   return "I can't confirm that particular service from this website. Please contact the business directly.";
  return "The website lists "+listed.join(", ")+". Please ask the team whether your particular job is covered.";
 }
 const faq=facts.find(f=>f.type==="faq"&&f.text.includes(" A: "));
 return faq?faq.text.split(" A: ").slice(1).join(" A: ").slice(0,420):BUSINESS_AGENT_UNVERIFIED;
}
/**
 * Preview concepts are NOT owner-verified business statements. Visitors may
 * still ask what the sample design shows (identity, example services, hours),
 * but every answer must clearly identify that information as provisional.
 */
export function previewConceptAnswer(question,site={}){
 const facts=factChunks(site),gate=classifyBusinessQuestion(question,site,facts);
 const chosen=retrieveBusinessFacts(question,site,facts,gate);
 const normal=safeBusinessAnswer(question,site,gate,chosen);
 if(!gate.allowed)return normal;
 if(gate.intent==="greeting")return "Welcome to the independent sample website for "+
  nameCheck(site.name)+". I can explain the example services, contact information, and other details displayed here.";
 if(gate.intent==="booking")return "This is a website concept, not an activated booking service. To discuss the preview, use the FUGTH consultation link at the top of the page.";
 if(gate.intent==="pricing"&&!chosen.some(x=>x.type==="faq"))return "Pricing is not verified for this sample website. Contact the business to confirm an actual estimate.";
 return ("In this independent website concept, "+normal.charAt(0).toLowerCase()+normal.slice(1)+
  " These details are examples until the business confirms them.").slice(0,440);
}
export function validateGroundedAnswer(output,facts=[],site={},fallback=""){
 const value=String(output||"").replace(/[\u0000-\u001f<>]/g," ").trim();
 if(value.length<5||value.length>440)return {valid:false,reason:"length"};
 if(/(?:https?:\/\/|www\.|<\w|as an ai language model|system prompt|internal instructions|developer message|i'm a large language model)/i.test(value))
  return {valid:false,reason:"unsafe_format"};
 const allowed=[...facts.map(f=>f.text),fallback].join(" ");
 const allowedNum=new Set((allowed.match(/[$€£]?\d[\d.,:%/-]*/g)||[]));
 const outputNum=value.match(/[$€£]?\d[\d.,:%/-]*/g)||[];
 if(outputNum.some(n=>!allowedNum.has(n)))return {valid:false,reason:"invented_number"};
 const evidence=new Set(businessTokens(allowed,{domain:true}));
 const answer=businessTokens(value,{domain:true});
 const grounded=answer.filter(x=>evidence.has(x));
 if(answer.length>=2&&grounded.length===0)return {valid:false,reason:"no_grounding"};
 if(answer.length>=5&&grounded.length/answer.length<.32)return {valid:false,reason:"weak_evidence"};
 if(/\b(guaranteed|definitely available|appointment (?:is|has been) booked|confirmed reservation|absolutely certified|always available)\b/i.test(value)&&
   !/booked|reserv|guaranteed/i.test(allowed))return {valid:false,reason:"unsupported_promise"};
 return {valid:true,reason:"supported"};
}
