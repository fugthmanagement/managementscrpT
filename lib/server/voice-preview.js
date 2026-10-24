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
 const rawType=cleanText((userData.businessType==="other"?userData.businessTypeOther:userData.businessType)||
    userData.industry||siteData.industry||"local business",65);
 const industry=detectIndustry([rawType,userData.businessDescription,name].filter(Boolean).join(" "));
 const preset=getIndustry(industry);
 const services=Array.isArray(siteData.services)&&siteData.services.length
  ?siteData.services.slice(0,6).map(item=>cleanText(item,70)).filter(Boolean)
  :Array.isArray(userData.services)&&userData.services.length
  ?userData.services.slice(0,6).map(item=>cleanText(typeof item==="string"?item:item?.name,70)).filter(Boolean)
  :preset.services;
 return {name,industry,industryName:rawType||preset.label,services,
  hours:cleanText(userData.hours||userData.businessHours||siteData.businessHours,90),
  area:cleanText(userData.serviceArea||siteData.serviceArea,90),
  description:cleanText(userData.businessDescription||userData.description||siteData.description,440),
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
  endCallMessage:"Thanks for calling "+businessName+". Our team can confirm any requested appointment. Goodbye!",
  // Explicit speech-to-text and turn-finalization prevent a first-message-only
  // demo where the provider never turns audible caller speech into model input.
  transcriber:{provider:"deepgram",model:"nova-3",language:"en",smartFormat:true,endpointing:250},
  startSpeakingPlan:{waitSeconds:0.45},
  stopSpeakingPlan:{numWords:2,backoffSeconds:0.7},
  model:{
   provider:"openai",model:"gpt-4o",temperature:0.5,
   messages:[{role:"system",content:
    "You are the live telephone receptionist for "+businessName+", a "+context.industryName+" business. "+
    "This is a real TWO-WAY voice conversation, not a prerecorded message. FUGTH rings the tester, but the caller is roleplaying as though they CALLED this business. Never pitch FUGTH or describe an outbound sales call. "+
    "Verified business data: business name="+businessName+"; industry="+context.industryName+
    "; actual services="+(context.services.join(", ")||"not supplied")+
    "; description="+(context.description||"not supplied")+
    "; hours="+(context.hours||"not supplied")+
    "; service area="+(context.area||"not supplied")+
    "; phone="+(context.contact||"not provided")+". "+
    emphasized+" "+scenarioHint+" "+
    "Critical listening rule: After the opening greeting, WAIT for the caller to finish and immediately answer what they actually asked. They may ask about services, opening hours, prices, their problem, or booking in any order. Do not ignore them or repeat your opening script. If speech is unclear, say 'Sorry, I didn't catch that. Could you say it again?' and listen. Do not speak over them. "+
    "For service questions, state only known services and useful verified details; ask which particular service or issue they need help with. For unknown prices or hours, admit the information is unavailable and offer a follow-up rather than guessing. "+
    "Maintain a small conversation checklist in memory across turns: caller first name, email, their actual service/problem, and—ONLY if they want an appointment—the preferred day, time and service. Ask at most ONE short question per turn. Never ask for information they already supplied. Answer their question before asking for missing contact information. "+
    "After learning the problem, politely ask their first name, and then their email so the business can follow up. Read back the email accurately once (particularly letters before @) and ask for confirmation. If the caller wants a booking, ask service/issue, preferred date and time, then repeat these and ask for confirmation. If a detail is unclear, ask to spell only that detail; never invent it. "+
    "IMPORTANT: You have no confirmed live appointment-booking tool in this preview. A requested time is only a REQUEST, not a confirmed booking. Say 'I can pass that appointment request to the team; they'll confirm availability.' Never claim to have booked or checked Google Calendar. "+
    "Respect callers declining contact details or declining an appointment. Do not ask repeatedly after refusal. Do not ask for payment details, medical details, sensitive identity numbers, or home addresses. Emergencies require real emergency services. "+
    "Speak naturally in concise complete sentences; a normal response can be one or two sentences. The phone call has a short maximum duration; prioritize solving the caller's question, remembering actual information and a useful next step. No vendor names or internal setup."
   }]
  },
  voice:{provider:"11labs",model:"eleven_flash_v2_5",voiceId:"sarah",stability:0.55,similarityBoost:0.75}
 };
}
