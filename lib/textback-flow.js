/** FUGTH missed-call text-back. No SMS is sent until a verified provider is linked. */
export const TEXTBACK_PRICE_ID="price_1UTPooHGcNIhcRMjPDGqXQXf";
export const TEXTBACK_SAMPLE="Hi! This is {{business}}. Sorry we missed your call. What can we help you with? Reply here and our team will follow up.";
const clean=(value,max)=>String(value??"").replace(/[<>]/g,"").trim().slice(0,max);
export function defaultTextbackSettings(businessName="Your business"){
 return {businessName:clean(businessName,90)||"Your business",messageTemplate:TEXTBACK_SAMPLE,
  phoneNumber:"",provider:"unconnected",providerVerified:false,
  requestedEnabled:false,sendEnabled:false,replyDelaySeconds:0,quietHours:false,
  timezone:"America/New_York",updatedAt:null};
}
export function normalizeTextbackSettings(input={},previous=defaultTextbackSettings()){
 const businessName=clean(input.businessName??previous.businessName,90)||"Your business";
 const messageTemplate=clean(input.messageTemplate??previous.messageTemplate,500);
 if(messageTemplate.length<12||/https?:\/\/|bit\.ly|tinyurl\.com/i.test(messageTemplate))
  throw Error("Use a business-specific text between 12 and 500 characters without shortened or promotional links.");
 const phoneNumber=clean(input.phoneNumber??previous.phoneNumber,25);
 if(phoneNumber&&!/^\+1[2-9]\d{9}$/.test(phoneNumber))
  throw Error("Enter a valid US FUGTH SMS number in +1XXXXXXXXXX format.");
 const replyDelaySeconds=Number(input.replyDelaySeconds??previous.replyDelaySeconds);
 if(![0,30,60,120,300].includes(replyDelaySeconds))throw Error("Choose an approved delay of 0–300 seconds.");
 return {businessName,messageTemplate,phoneNumber,provider:"unconnected",
  providerVerified:false,requestedEnabled:input.requestedEnabled===true,
  sendEnabled:false,replyDelaySeconds,quietHours:input.quietHours===true,
  timezone:"America/New_York",updatedAt:new Date().toISOString()};
}
export function renderTextbackMessage(settings,caller=""){
 const name=clean(settings?.businessName,90)||"Your business";
 const who=clean(caller,50)||"there";
 return String(settings?.messageTemplate||TEXTBACK_SAMPLE).replace(/\{\{(business|caller)\}\}/g,(_,key)=>key==="business"?name:who);
}
export function isEligibleMissedCall(event){
 const outcome=String(event?.outcome||"").toLowerCase();
 return ["no_answer","missed","unanswered","busy"].includes(outcome)&&
  event?.answered!==true&&event?.smsOptOut!==true;
}
