import {detectIndustry,getIndustry,cleanText} from "../site-presets";

// The server-configured demo duration is enforced by the assistant; do not
// promise a separate elapsed-time farewell hook when none is installed.
export const DEMO_DURATION=30;
export const DEMO_COOLDOWN_MS=3*60*60*1000;
export const DEMO_GLOBAL_DAILY_LIMIT=80;
export const DEMO_FOCUS_OPTIONS=[
 {id:"balanced",label:"Balanced — questions, prices & booking"},
 {id:"booking",label:"Booking — appointment requests"},
 {id:"pricing",label:"Pricing — estimates & costs"},
 {id:"information",label:"Information — services & FAQs"}
];

export const DEMO_SCENARIOS=[
 {id:"auto",label:"Automatic — match my industry"},
 {id:"new-customer",label:"New customer asking questions"},
 {id:"quote",label:"Customer requesting a quote"},
 {id:"schedule",label:"Customer requesting an appointment"}
];
export const scenarioChoice=value=>DEMO_SCENARIOS.some(x=>x.id===value)?value:"auto";
export function usNumber(value){
 const digits=String(value||"").replace(/\D/g,"");
 if(digits.length===10)return "+1"+digits;
 if(digits.length===11&&digits.startsWith("1"))return "+"+digits;
 return null;
}
export function focusChoice(value){
 return DEMO_FOCUS_OPTIONS.some(option=>option.id===value)?value:"balanced";
}
export function demoBusiness(userData={},siteData={}){
 const name=cleanText(userData.businessName||siteData.name||userData.displayName,75)||"Your business";
 const rawType=cleanText(userData.businessType||userData.industry||siteData.industry||"local business",65);
 const industry=detectIndustry(rawType||name);
 const preset=getIndustry(industry);
 const services=Array.isArray(siteData.services)&&siteData.services.length
  ?siteData.services.slice(0,6).map(item=>cleanText(item,70)).filter(Boolean)
  :Array.isArray(userData.services)&&userData.services.length
  ?userData.services.slice(0,6).map(item=>cleanText(typeof item==="string"?item:item?.name,70)).filter(Boolean)
  :preset.services;
 return {name,industry,industryName:rawType||preset.label,services,
  hours:cleanText(userData.hours||userData.businessHours||siteData.businessHours,90),
  area:cleanText(userData.serviceArea||siteData.serviceArea,90),
  description:cleanText(userData.description||siteData.description,240),
  contact:cleanText(userData.phone||siteData.phone,30)};
}
function intentFor(context,focus){
 const isService=/roof|contract|repair|hvac|plumb|electric|landscap|auto|clean|maint|construction|pest/i.test(context.industryName+" "+context.industry);
 const isAppointment=/dental|clinic|salon|barber|spa|legal|health|groom|real.?estate/i.test(context.industryName+" "+context.industry);
 const emphasized=focus==="booking"?"Prioritize asking which service and preferred appointment or estimate date/time.":focus==="pricing"?"Prioritize explaining how customers can request a quote, and ask one useful detail to estimate their needs.":focus==="information"?"Prioritize explaining the services and business information that are actually known.":"Balance answering questions, pricing inquiries and booking requests.";
 const opener=focus==="booking"?"Would you like to request an appointment?":focus==="pricing"?"Are you calling for an estimate or pricing?":focus==="information"?"What would you like to know about our services?":isService?"Do you need an estimate or an appointment?":isAppointment?"Would you like help booking an appointment?":"How can I help you today?";
 return {emphasized,opener};
}
export function demoAssistant(context,requestedFocus="balanced",requestedScenario="auto",durationSeconds=DEMO_DURATION){
 const duration=[15,30,45,60,90].includes(Number(durationSeconds))?Number(durationSeconds):DEMO_DURATION;
 const focus=focusChoice(requestedFocus);
 const {emphasized,opener}=intentFor(context,focus);
 const scenario=scenarioChoice(requestedScenario);
 const scenarioHint=scenario==="quote"?"The caller is likely looking for a quote.":scenario==="schedule"?"The caller likely wants an appointment request.":scenario==="new-customer"?"The caller is new and has questions.":"Adapt to what the caller asks.";
 const businessName=context.name.replace(/[\r\n]/g," ");
 return {
  name:"FUGTH preview - "+businessName.slice(0,24),
  firstMessage:"Thank you for calling "+businessName+". This call may be recorded. "+opener,
  firstMessageMode:"assistant-speaks-first",
  maxDurationSeconds:duration,
  server:{url:"https://www.fugthmanagement.space/api/vapi-webhook"},
  serverMessages:["end-of-call-report"],
  analysisPlan:{
   summaryPrompt:"Summarize the caller's request and proposed next step in 1-2 accurate sentences. Do not invent facts, prices or confirmed bookings.",
   structuredDataPrompt:"Extract only contact and booking details directly provided by the caller. Unknown fields must be empty strings; never invent identifying information.",
   structuredDataSchema:{type:"object",properties:{
    customerName:{type:"string"},email:{type:"string"},phone:{type:"string"},
    nameConfirmed:{type:"boolean"},emailConfirmed:{type:"boolean"},dateConfirmed:{type:"boolean"},timeConfirmed:{type:"boolean"},
    service:{type:"string"},request:{type:"string"},preferredDate:{type:"string"},preferredTime:{type:"string"}
   }}
  },
  artifactPlan:{recordingEnabled:true,recordingFormat:"mp3",loggingEnabled:true,
   transcriptPlan:{enabled:true,assistantName:"Receptionist",userName:"Caller"}},
  endCallMessage:"That concludes your FUGTH demo. Thanks for trying it!",
  model:{
   provider:"openai",model:"gpt-4o",temperature:0.5,
   messages:[{role:"system",content:
    "You are the friendly, confident, professional AI receptionist for "+businessName+
    ", a "+context.industryName+" business. This is a very short inbound-call roleplay: FUGTH initiated the outbound ring but the tester is pretending they CALLED the business. Do not act like a telemarketer or mention outbound calling. "+
    "Known facts: business="+businessName+"; type="+context.industryName+"; services="+(context.services.join(", ")||"not provided")+
    "; description="+(context.description||"not provided")+"; hours="+(context.hours||"not provided")+
    "; service area="+(context.area||"not provided")+". "+
    emphasized+" "+scenarioHint+" The caller may switch topics. Follow them naturally. "+
    "Never invent prices, discounts, appointment availability or policy details. If prices are not provided, describe the estimate process and ask which service they need. "+
    "Collect the requested service, preferred date and specific time when the caller wants an appointment. Repeat the proposed date and time back and ask them to confirm; do not claim the appointment is booked until a live calendar check succeeds. If no calendar tool is available, tell them the team will confirm. "+
    "If the caller gives a name, email, preferred date, or preferred time, repeat it back once before treating it as captured. If a name or email is unclear, ask them to spell only that item; never guess. Set the matching confirmation field false unless the caller confirms it. Always ask the caller for their first name naturally, ideally after the first service question, so the call creates a useful customer record. If they decline or time runs out, leave their name unknown and still save the phone number and request. Keep each spoken turn to one short sentence or question (ideally under 12 words). Don't solicit addresses, sensitive health/legal facts or payment details. In emergencies, direct callers to emergency services. "+
    "The call ends automatically at the configured time limit. Keep responses focused. Never claim a $3 per-call charge or reveal internal vendors."}]
  },
  voice:{provider:"11labs",model:"eleven_flash_v2_5",voiceId:"sarah",stability:0.55,similarityBoost:0.75}
 };
}
