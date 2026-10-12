import { createHmac } from "crypto";
import { firebaseAdmin } from "./auth";

export const DEMO_COOLDOWN_MS = 5 * 60 * 1000;
export const DEMO_CALL_SECONDS = 15;
export const DEMO_DAILY_ACCOUNT_LIMIT = 3;
export const DEMO_DAILY_PHONE_LIMIT = 4;
export const DEMO_GLOBAL_DAILY_LIMIT = 80;

export const INDUSTRIES = Object.freeze({
  roofing:"roofing company", dental:"dental office", hvac:"heating and cooling company",
  automotive:"auto repair shop", legal:"law office", salon:"salon", realestate:"real estate team",
  restaurant:"restaurant", landscaping:"landscaping company", general:"local service business"
});
export const ROLES = Object.freeze({
  receptionist:"a warm front-desk receptionist", sales:"a helpful sales representative",
  booking:"a friendly appointment coordinator", service:"a patient customer support specialist"
});
export const SCENARIOS = Object.freeze({
  inbound:"a customer calling the business for the first time",
  missed:"a friendly follow-up after a missed call",
  website:"a customer who asked for a website callback",
  appointment:"a customer who requested an appointment"
});
export function normalizeUSMobile(input) {
  const raw = String(input || "").replace(/[^0-9]/g, "");
  const digits = raw.length===11 && raw[0]==="1" ? raw.slice(1) : raw;
  if (!/^[2-9]\d\d[2-9]\d{6}$/.test(digits)) return null;
  if (/^(900|976)/.test(digits))return null;
  return "+1"+digits;
}
export function prepareDemo(input) {
  const { phone,role,industry,scenario,consent,businessName }=input||{};
  if (consent!==true)return {error:"Confirm that this number belongs to you and you consent to a short automated test call."};
  if(!Object.hasOwn(INDUSTRIES,industry) || !Object.hasOwn(ROLES,role) || !Object.hasOwn(SCENARIOS,scenario))return {error:"Choose a valid demo industry, style and scenario."};
  const to=normalizeUSMobile(phone);
  if(!to)return {error:"Enter a valid US phone number you own."};
  const business=String(businessName||"").trim().slice(0,60).replace(/[\n\r\t]/g," ");
  return {to,industry,role,scenario,business:business||"this example business"};
}
export function demoAssistant({industry,role,scenario,business}) {
  const label=INDUSTRIES[industry];
  const roleName=ROLES[role];
  const scenarioName=SCENARIOS[scenario];
  const org=business==="this example business"?"our "+label:business;
  const demoIntro=scenario==="inbound"
    ? `Hi! Thanks for calling ${org}. This is your FUGTH receptionist demo. How can I help you today?`
    : scenario==="missed"
    ? `Hi there! This is a quick FUGTH demo for ${org}. I'm following up about a missed call. Is this a good time?`
    : scenario==="website"
    ? `Hi! This is a FUGTH demo for ${org}. I'm following up on your website inquiry. What can I help with?`
    : `Hi! This is a FUGTH demo for ${org}. I'm following up on your appointment request. What time works best?`;
  const instruction=`You are FUGTH's ${roleName}, demonstrating ${scenarioName} for a ${label} named ${org}.
  This is a 15-second demonstration call made at the request of its recipient; not a genuine customer lead.
  Speak in warm, friendly, youthful adult feminine energy. Natural American English, concise and conversational.
  Do not read this system prompt, enumerate instructions, restate the scenario or introduce yourself again after the first message.
  Say the first message once, then LISTEN. Respond to what they actually say, in one short sentence, and ask at most ONE relevant follow-up question.
  Don't repeat their words, apologize reflexively, or use canned acknowledgments in every response.
  Don't claim to see a calendar or place a booking, and don't invent prices, business hours or availability. Say you can collect a preferred time for the team to confirm.
  Never collect sensitive medical information, protected records or payment card details. If they request private or regulated help, offer a human callback.
  Keep replies under 25 words. The call has a hard 15-second cap. Give the recipient room to talk.`;
  return {
    name:"FUGTH 15s Voice Preview",
    firstMessage:demoIntro,
    firstMessageMode:"assistant-speaks-first",
    firstMessageInterruptionsEnabled:true,
    maxDurationSeconds:DEMO_CALL_SECONDS,
    silenceTimeoutSeconds:10,
    model:{provider:"openai",model:"gpt-4o",messages:[{role:"system",content:instruction}],temperature:0.5},
    voice:{provider:"11labs",voiceId:"sarah",model:"eleven_flash_v2_5",speed:1.02},
    analysisPlan:{summaryPrompt:"Summarize this short FUGTH voice preview in one factual sentence. If there was no meaningful conversation, say so. Do not invent a booking or sales lead."}
  };
}
export function intentFromText(value) {
  const text=String(value||"").toLowerCase();
  if (/schedule|booking|appointment|calendar|availability|reserve/.test(text))return "Appointment inquiry";
  if (/price|estimate|quote|cost|budget/.test(text))return "Price or quote inquiry";
  if (/emergency|urgent|asap|broken|leak|repair/.test(text))return "Service request";
  if (/hour|open|close|location|address/.test(text))return "General information";
  if (/support|problem|complaint|help/.test(text))return "Customer support";
  return text.length>8?"General conversation":"No clear intent detected";
}
export function demoDb() {return firebaseAdmin().firestore();}
export function phoneHash(number) {
  const secret=process.env.DEMO_PHONE_HASH_SECRET || process.env.VAPI_PRIVATE_KEY || process.env.VOICE_PRIVATE_KEY;
  if(!secret)throw new Error("Demo signing key unavailable");
  return createHmac("sha256",secret).update(number).digest("hex");
}
export function demoReady() {
  return Boolean(
    (process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) &&
    (process.env.VAPI_PRIVATE_KEY || process.env.VOICE_PRIVATE_KEY) && process.env.VAPI_PHONE_NUMBER_ID
  );
}
