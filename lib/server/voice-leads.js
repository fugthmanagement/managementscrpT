import {firebaseAdmin} from "./auth";
import {accessGoogleCalendar} from "./google-calendar";
import {validCallId} from "./vapi-recordings";

const clean=(v,n=150)=>typeof v==="string"?v.trim().slice(0,n):"";
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phone=v=>clean(v,40);
const textOf=value=>Array.isArray(value)?
 value.map(item=>typeof item==="string"?item:((item.role||item.speaker||"Speaker")+": "+(item.text||item.message||item.content||""))).join("\n"):
 clean(value,30000);
// Do not infer contact data from the assistant's speech.
const callerSpeech=call=>{
 const raw=call.artifact?.messages||call.messages;
 if(Array.isArray(raw))return raw.filter(msg=>/^(user|customer|caller)$/i.test(msg.role||msg.speaker||""))
  .map(msg=>msg.message||msg.text||msg.content||"").join("\n");
 const text=textOf(call.artifact?.transcript||call.transcript);
 return text.split("\n").filter(line=>/^\s*(user|caller|customer)\s*:/i.test(line)).join("\n");
};
export const leadDocumentId=id=>"call_"+id;
export function deriveVoiceLead(call,uid){
 if(!validCallId(call?.id)||call?.metadata?.ownerId!==uid)return null;
 const data=call.analysis?.structuredData||call.structuredData||{};
 const outputs=Array.isArray(call.artifact?.structuredOutputs)?call.artifact.structuredOutputs:[];
 const nested=outputs.find(x=>x?.result&&typeof x.result==="object")?.result||
  outputs.find(x=>x?.data&&typeof x.data==="object")?.data||{};
 const structured={...nested,...data};
 const transcript=textOf(call.artifact?.transcript||call.transcript||call.artifact?.messages);
 const speech=callerSpeech(call);
 const emailMatch=speech.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
 const emailCandidate=clean(structured.email||structured.customerEmail||structured.contactEmail||emailMatch?.[0]||"",200).toLowerCase();
 const email=validEmail(emailCandidate)?emailCandidate:"";
 const nameMatch=speech.match(/\b(?:my name is|this is|i am|i'm)\s+([a-z][a-z' -]{1,60})/i);
 // A short 15-second demo may never yield a name. Do not invent one.
 const name=clean(structured.customerName||structured.fullName||structured.name||nameMatch?.[1]?.split(/[.,!?]/)[0]||"",100);
 const givenPhone=phone(structured.phone||structured.customerPhone||call.customer?.number||"");
 const summary=clean(call.analysis?.summary||call.summary||structured.summary||"",1600)||
  (transcript?"Caller spoke with the receptionist. Review the transcript for requested service.":"Phone conversation completed; needs review.");
 const request=clean(structured.request||structured.service||structured.reason||structured.intent||"",200)||
  clean(summary,200);
 const requestedDate=clean(structured.preferredDate||structured.requestedDate||"",60);
 const requestedTime=clean(structured.preferredTime||structured.requestedTime||"",60);
 const now=new Date().toISOString(),start=clean(call.startedAt||call.createdAt||now,80);
 return {
  type:"call_lead",ownerId:uid,source:call.metadata?.fugthPreview?"fugth_demo":"vapi_call",
  sourceCallId:call.id,providerCallId:call.id,contactName:name,
  businessName:"",phone:givenPhone,email,service:request,summary,notes:summary,
  status:"new",marketingOptIn:false,unsubscribed:false,
  bookingStatus:requestedDate||requestedTime?"requested":"not_requested",
  requestedDate,requestedTime,calendarSyncStatus:"not_connected",
  createdAt:start,updatedAt:now
 };
}
function shortDisplay(lead){return lead.contactName||lead.phone||"Unknown caller";}
const notificationText=lead=>{
 const who=shortDisplay(lead);
 return "New FUGTH call lead: "+who+" — "+lead.summary.slice(0,150);
};
const destinationEmail=async(db,uid,profile)=>{
 const supplied=clean(profile.notificationEmail||profile.ownerEmail||profile.email||profile.contactEmail||"",200).toLowerCase();
 if(validEmail(supplied))return supplied;
 try{const user=await firebaseAdmin().auth().getUser(uid);return validEmail(user.email||"")?user.email:null;}
 catch{return null;}
};
const makeMime=({to,from,subject,body})=>{
 const cleanHeader=v=>String(v).replace(/[\r\n]/g," ").slice(0,180);
 const encoded=Buffer.from("Subject: =?UTF-8?B?"+Buffer.from(cleanHeader(subject)).toString("base64")+"?=\r\n"+
  "To: "+cleanHeader(to)+"\r\nFrom: "+cleanHeader(from)+"\r\n"+
  "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"+body).toString("base64url");
 return encoded;
};
async function notifyOwner(db,uid,lead,profile){
 // Per-call idempotence: retries and repeated end reports never duplicate a delivered alert.
 const notificationRef=db.doc("users/"+uid+"/notifications/"+leadDocumentId(lead.sourceCallId));
 await notificationRef.set({
  source:"vapi",type:"new_call_lead",leadId:leadDocumentId(lead.sourceCallId),
  callId:lead.sourceCallId,text:notificationText(lead),
  ownerId:uid,createdAt:lead.createdAt,updatedAt:new Date().toISOString()
 },{merge:true});
 const alertRef=db.doc("users/"+uid+"/callOwnerAlerts/"+lead.sourceCallId);
 let reserved=false;
 await db.runTransaction(async tx=>{
  const snap=await tx.get(alertRef);
  if(snap.exists)return;
  tx.create(alertRef,{status:"pending",createdAt:new Date().toISOString()});reserved=true;
 });
 if(!reserved)return {inApp:true,delivery:"previously_attempted"};
 const recipient=await destinationEmail(db,uid,profile);
 if(!recipient){
  await alertRef.set({status:"in_app_only",reason:"owner_email_not_registered"},{merge:true});
  return {inApp:true,delivery:"no_owner_email"};
 }
 try{
  const token=await accessGoogleCalendar(uid,"gmail.send");
  const account=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(5000)
  });
  if(!account.ok)throw Error("Gmail account unavailable");
  const from=(await account.json()).email;
  if(!validEmail(from||""))throw Error("Connected sender unavailable");
  const url=(process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space")+"/dashboard";
  const body="New FUGTH receptionist call\n\nCaller: "+shortDisplay(lead)+
   "\nPhone: "+(lead.phone||"Not provided")+"\nEmail: "+(lead.email||"Not provided")+
   "\nSummary: "+lead.summary+"\nRequested date: "+(lead.requestedDate||"Not supplied")+
   "\nRequested time: "+(lead.requestedTime||"Not supplied")+
   "\n\nReview the recording and lead privately in your workspace:\n"+url+
   "\n\nThis is an operational call alert, not a marketing message.";
  const delivery=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
   method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({raw:makeMime({to:recipient,from,subject:"FUGTH new call lead: "+shortDisplay(lead),body})}),
   cache:"no-store",signal:AbortSignal.timeout(9000)
  });
  if(!delivery.ok)throw Error("Gmail rejected call alert");
  const result=await delivery.json().catch(()=>({}));
  await alertRef.set({status:"email_sent",recipient,emailId:clean(result.id,160),sentAt:new Date().toISOString()},{merge:true});
  return {inApp:true,delivery:"email_sent"};
 }catch(error){
  await alertRef.set({status:"in_app_only",reason:"gmail_not_connected_or_failed"},{merge:true});
  return {inApp:true,delivery:"in_app_only"};
 }
}
export async function persistVoiceLead(call,uid){
 if(!firebaseAdmin().apps.length&&!(process.env.FIREBASE_SERVICE_ACCOUNT||process.env.FIREBASE_CLIENT_EMAIL))
  return {saved:false,reason:"Admin database credentials unavailable."};
 const lead=deriveVoiceLead(call,uid);
 if(!lead)return {saved:false,reason:"Call owner could not be verified."};
 const db=firebaseAdmin().firestore(),ref=db.doc("users/"+uid+"/leads/"+leadDocumentId(call.id));
 const previous=await ref.get();
 // Updating provider analysis must not erase human CRM changes or opt-in consent.
 const {status,marketingOptIn,unsubscribed,...fields}=lead;
 if(previous.exists){
  const old=previous.data()||{};
  fields.contactName=old.contactName||fields.contactName;
  fields.email=old.email||fields.email;
  fields.phone=old.phone||fields.phone;
  fields.bookingStatus=old.bookingStatus==="confirmed"?"confirmed":fields.bookingStatus;
  fields.calendarSyncStatus=old.calendarSyncStatus==="synced"?"synced":fields.calendarSyncStatus;
  await ref.set(fields,{merge:true});
 }else await ref.create(lead);
 const profile=(await db.doc("users/"+uid).get()).data()||{};
 const alert=await notifyOwner(db,uid,{...lead,...fields},profile);
 return {saved:true,leadId:ref.id,alert};
}
