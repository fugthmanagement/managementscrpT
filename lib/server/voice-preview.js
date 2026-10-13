import {detectIndustry,getIndustry,cleanText} from "../site-presets";
export const DEMO_DURATION=55;
export const DEMO_DAILY_LIMIT=2;
export function usNumber(value){
 const digits=String(value||"").replace(/\D/g,"");
 return digits.length===10?"+1"+digits:digits.length===11&&digits[0]==="1"?"+"+digits:null;
}
export function demoBusiness(userData={},siteData={}){
 const name=cleanText(userData.businessName||siteData.name||userData.displayName,75)||"Your business";
 const industry=detectIndustry(userData.businessType||userData.industry||siteData.industry||name);
 const preset=getIndustry(industry);
 const services=Array.isArray(siteData.services) && siteData.services.length
   ?siteData.services.slice(0,3).map(x=>cleanText(x,70)).filter(Boolean)
   :preset.services;
 return {name,industry,industryName:preset.label,services,
   hours:cleanText(userData.hours||siteData.businessHours,90),
   area:cleanText(userData.serviceArea||siteData.serviceArea,90)};
}
export function demoAssistant(context){
 const services=context.services.join(", ");
 const businessName=context.name.replace(/[\r\n]/g," ");
 return {
   name:"FUGTH demo - "+businessName.slice(0,32),
   firstMessage:`Thank you for calling ${businessName}! This is your FUGTH receptionist. How can I help you today?`,
   firstMessageMode:"assistant-speaks-first",
   maxDurationSeconds:DEMO_DURATION,
   endCallMessage:"Thanks for calling! This was a short FUGTH preview. Have a great day.",
   model:{
     provider:"openai",model:"gpt-4o",temperature:0.6,
     messages:[{role:"system",content:`You are the warm, polished, professional phone receptionist for ${businessName}, a ${context.industryName} business. This is a SHORT LIVE ROLEPLAY DEMONSTRATION of an INBOUND customer call even though FUGTH dialed the tester. NEVER announce an outbound marketing call. Start as if the person dialed ${businessName} for help.
Use only these known business facts: business name ${businessName}; sector ${context.industryName}; services ${services||"business services"}; working hours ${context.hours||"not provided"}; service area ${context.area||"not provided"}.
Act like this is a real caller asking about ${context.industryName} services. Ask what the caller needs, respond naturally to their answers, and offer to take a REQUEST for an appointment or consultation. If they want to book, ask their desired service, preferred day/time and name. Briefly repeat their request. You cannot read a calendar and cannot actually confirm a booking; clearly say it's a request for the team to confirm. Never claim an appointment was confirmed or that you checked availability. Do not collect payment, sensitive medical facts, legal case details or personal identifiers beyond first name and preference. If there's urgent danger or medical emergency, tell them to contact emergency services.
This is a demonstration and should sound welcoming, warm and conversational, not robotic. Keep each reply under about 20 words, don't repeat the introduction. The demo may end after ${DEMO_DURATION} seconds; gently close around 45 seconds. Never promise a specific callback. Don't mention provider platforms.`}]
   },
   voice:{provider:"11labs",model:"eleven_flash_v2_5",voiceId:"sarah",stability:0.55,similarityBoost:0.75}
 };
}
