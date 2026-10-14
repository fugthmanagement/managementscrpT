import {firebaseAdmin} from "./auth";
import {accessGoogleCalendar} from "./google-calendar";
import {validCallId,hasAdminStorage} from "./vapi-recordings";

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
 const rawName=structured.customerName||structured.fullName||structured.name||nameMatch?.[1]?.split(/\b(?:and|calling|because|from|about)\b|[.,!?]/i)[0]||"";
 const name=clean(rawName,100);
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
async function notifyOwner(db,uid,lead,profile,hasRealSummary){
 // Per-call idempotence: retries and repeated end reports never duplicate a delivered alert.
 const notificationRef=db.doc("users/"+uid+"/notifications/"+leadDocumentId(lead.sourceCallId));
 await notificationRef.set({
  source:"vapi",type:"new_call_lead",leadId:leadDocumentId(lead.sourceCallId),
  callId:lead.sourceCallId,text:notificationText(lead),
  ownerId:uid,createdAt:lead.createdAt,updatedAt:new Date().toISOString()
 },{merge:true});
 // Wait for Vapi's actual summary before sending an external notification.
 // The in-app notification always exists even while analysis is still pending.
 if(!hasRealSummary)return {inApp:true,delivery:"awaiting_summary"};
 const alertRef=db.doc("users/"+uid+"/callOwnerAlerts/"+lead.sourceCallId);
 let reserved=false;
 await db.runTransaction(async tx=>{
  const snap=await tx.get(alertRef);
  if(snap.exists)return;
  tx.create(alertRef,{status:"pending",createdAt:new Date().toISOString()});reserved=true;
 });
 if(!reserved)return {inApp:true,delivery:"previously_attempted"};
 // If an SMS provider is connected, send to the owner's configured business
 // notification number, not to the incoming caller.
 const sid=process.env.TWILIO_ACCOUNT_SID,auth=process.env.TWILIO_AUTH_TOKEN;
 const fromNumber=process.env.TWILIO_FROM_NUMBER;
 const registered=clean(profile.ownerMobile||profile.notificationPhone||"",32).replace(/[^+0-9]/g,"");
 const digits=registered.replace(/\D/g,"");
 const toNumber=digits.length===10?"+1"+digits:digits.length===11&&digits.startsWith("1")?"+"+digits:
  registered.startsWith("+")&&/^\+[1-9]\d{9,14}$/.test(registered)?registered:"";
 if(sid&&auth&&fromNumber&&toNumber&&profile.callSmsAlertsEnabled===true){
  try{
   const sms=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+encodeURIComponent(sid)+"/Messages.json",{
    method:"POST",
    headers:{Authorization:"Basic "+Buffer.from(sid+":"+auth).toString("base64"),
     "Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({From:fromNumber,To:toNumber,Body:notificationText(lead).slice(0,320)}),
    signal:AbortSignal.timeout(8500),cache:"no-store"
   });
   if(sms.ok){
    const reply=await sms.json().catch(()=>({}));
    await alertRef.set({status:"sms_sent",recipient:toNumber,smsId:clean(reply.sid,160),
      sentAt:new Date().toISOString()},{merge:true});
    return {inApp:true,delivery:"sms_sent"};
   }
  }catch{/* Fall back to connected Gmail and in-app notifications. */}
 }
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
const firestoreRoot=uid=>"https://firestore.googleapis.com/v1/projects/"+
 encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"")+
 "/databases/(default)/documents/users/"+encodeURIComponent(uid);
const asValue=v=>{
 if(v===undefined||v===null)return {nullValue:null};
 if(typeof v==="boolean")return {booleanValue:v};
 if(typeof v==="number")return {doubleValue:v};
 return {stringValue:String(v)};
};
async function saveWithOwnerToken(uid,token,lead){
 if(!token)return {saved:false,reason:"Missing signed-in Firebase token."};
 const root=firestoreRoot(uid),id=leadDocumentId(lead.sourceCallId);
 const fields=Object.fromEntries(Object.entries(lead).map(([k,v])=>[k,asValue(v)]));
 const url=root+"/leads?documentId="+encodeURIComponent(id);
 const headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
 const response=await fetch(url,{method:"POST",headers,body:JSON.stringify({fields}),
  cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(response.status===409){
  // A late Vapi analysis update should improve the call summary without
  // overwriting consent, CRM status, owner notes, or a confirmed booking.
  const updates=["summary","service","updatedAt","requestedDate","requestedTime"];
  const updateMask=updates.map(k=>"updateMask.fieldPaths="+encodeURIComponent(k)).join("&");
  await fetch(root+"/leads/"+encodeURIComponent(id)+"?"+updateMask,{
   method:"PATCH",headers,body:JSON.stringify({fields:Object.fromEntries(updates.map(k=>[k,fields[k]]))}),
   cache:"no-store",signal:AbortSignal.timeout(8000)
  }).catch(()=>{});
 }else if(!response.ok)return {saved:false,reason:"Firestore refused this lead."};
 const noteFields={
  type:"new_call_lead",source:"vapi",callId:lead.sourceCallId,leadId:id,ownerId:uid,
  text:notificationText(lead),createdAt:lead.createdAt
 };
 if(lead.bookingStatus==="requested"){
  const appointment={
   source:"voice_call",sourceCallId:lead.sourceCallId,leadId:id,customerName:lead.contactName||"Caller",
   phone:lead.phone,email:lead.email,service:lead.service,requestedDate:lead.requestedDate,
   requestedTime:lead.requestedTime,status:"requested",calendarSyncStatus:"awaiting_confirmation",
   date:"",time:"",createdAt:lead.createdAt,updatedAt:new Date().toISOString()
  };
  const appointmentFields=Object.fromEntries(Object.entries(appointment).map(([k,v])=>[k,asValue(v)]));
  await fetch(root+"/appointments?documentId="+encodeURIComponent(id),{
   method:"POST",headers,body:JSON.stringify({fields:appointmentFields}),cache:"no-store",
   signal:AbortSignal.timeout(8000)
  }).catch(()=>{});
 }
 const notification={fields:Object.fromEntries(Object.entries(noteFields).map(([k,v])=>[k,asValue(v)]))};
 await fetch(root+"/notifications?documentId="+encodeURIComponent(id),{
  method:"POST",headers,body:JSON.stringify(notification),cache:"no-store",signal:AbortSignal.timeout(8000)
 }).catch(()=>{});
 return {saved:true,leadId:id,alert:{inApp:true,delivery:"in_app_only"}};
}
export async function persistVoiceLead(call,uid,token){
 const lead=deriveVoiceLead(call,uid);
 if(!lead)return {saved:false,reason:"The source call owner could not be verified."};
 if(!hasAdminStorage())return saveWithOwnerToken(uid,token,lead);
 try{
  const db=firebaseAdmin().firestore(),ref=db.doc("users/"+uid+"/leads/"+leadDocumentId(call.id));
  const previous=await ref.get();
  // Provider updates never overwrite owner changes or an existing opt-in setting.
  const {status,marketingOptIn,unsubscribed,createdAt,...fields}=lead;
  if(previous.exists){
   const old=previous.data()||{};
   fields.contactName=old.contactName||fields.contactName;
   fields.email=old.email||fields.email;
   fields.phone=old.phone||fields.phone;
   fields.bookingStatus=old.bookingStatus==="confirmed"?"confirmed":fields.bookingStatus;
   fields.calendarSyncStatus=old.calendarSyncStatus==="synced"?"synced":fields.calendarSyncStatus;
   fields.notes=old.ownerNotes?old.notes:fields.notes;
   await ref.set(fields,{merge:true});
  }else await ref.create(lead);
  // Booking requests are not confirmed appointments until the owner or their
  // connected calendar accepts them. Source call ID ensures idempotence.
  if(lead.bookingStatus==="requested"){
   const appointmentRef=db.doc("users/"+uid+"/appointments/"+leadDocumentId(call.id));
   const previousRequest=await appointmentRef.get();
   if(!previousRequest.exists){
    await appointmentRef.create({
     source:"voice_call",sourceCallId:call.id,leadId:ref.id,
     customerName:lead.contactName||"Caller",phone:lead.phone,email:lead.email||"",
     service:lead.service,requestedDate:lead.requestedDate,
     requestedTime:lead.requestedTime,date:"",time:"",
     status:"requested",calendarSyncStatus:"awaiting_confirmation",
     createdAt:lead.createdAt,updatedAt:new Date().toISOString()
    });
   }
  }
  const profile=(await db.doc("users/"+uid).get()).data()||{};
  const hasRealSummary=Boolean(call.analysis?.summary||call.summary||call.artifact?.structuredOutputs?.length);
  const alert=await notifyOwner(db,uid,{...lead,...fields},profile,hasRealSummary);
  return {saved:true,leadId:ref.id,alert};
 }catch(error){
  console.warn("FUGTH lead server write unavailable",{type:error?.code||"unknown"});
  if(token)return saveWithOwnerToken(uid,token,lead);
  return {saved:false,reason:"Secure lead storage unavailable."};
 }
}
