// Persist Vapi-verified call history while privately archiving audio by account.
// Browser Firebase Auth and server service-account credentials are independent;
// an owner can create their own call document under the existing Firestore rules.
import {firebaseAdmin} from "./auth";
import {persistVoiceLead} from "./voice-leads";
import {hasAdminStorage,fromFirebaseArchive,fetchVapiAudio,archiveWithAdmin,hasVapiRecording,recordingPath} from "./vapi-recordings";
const project=()=>process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"";
const uri=uid=>"https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(project())+
 "/databases/(default)/documents/users/"+encodeURIComponent(uid)+"/calls";
const clean=(v,max=20000)=>String(v??"").slice(0,max);
const iso=value=>{
 if(!value)return null;
 const date=new Date(value);
 return Number.isFinite(date.getTime())?date.toISOString():null;
};
const value=v=>{
 if(v===null||v===undefined)return {nullValue:null};
 if(typeof v==="boolean")return {booleanValue:v};
 if(typeof v==="number")return Number.isFinite(v)?{doubleValue:v}:{nullValue:null};
 return {stringValue:String(v)};
};
const transcriptFor=raw=>{
 if(typeof raw==="string")return clean(raw,30000);
 if(Array.isArray(raw))return raw.map(x=>typeof x==="string"?x:(x.role||x.speaker||"Speaker")+": "+(x.message||x.text||x.content||"")).join("\n").slice(0,30000);
 return "";
};
export const ended=call=>["ended","completed","failed"].includes(call?.status);
// Vapi artifact URLs are private. Playback must use the authenticated proxy.
function pickRecording(){return "";}
export function callHistoryRecord(call,uid,archived=false){
 const transcript=transcriptFor(call.artifact?.transcript||call.transcript||call.artifact?.messages);
 const summary=clean(call.analysis?.summary||call.summary||call.analysis?.structuredData?.summary||
  (transcript?"Call summary is processing. Open the transcript for details.":"Call connected; no detailed summary available."),1200);
 const start=iso(call.startedAt||call.createdAt)||new Date().toISOString();
 const finish=iso(call.endedAt);
 const seconds=(start&&finish)?Math.max(0,Math.round((Date.parse(finish)-Date.parse(start))/1000)):0;
 const duration=Number(call.duration)||seconds;
 return {
  ownerId:uid,providerCallId:clean(call.id,100),source:call.metadata?.fugthPreview?"fugth_demo":call.metadata?.founderOutbound?"founder_outbound":"vapi",
  caller:clean(call.customer?.name||call.customer?.number||"Demo customer",100),
  phone:clean(call.customer?.number||"",40),
  createdAt:start,startedAt:start,endedAt:finish,
  timestamp:start,updatedAt:new Date().toISOString(),status:clean(call.status,40),
  summary,transcript,recording:pickRecording(call),recordingAvailable:hasVapiRecording(call)||archived,recordingSaved:archived,recordingStoragePath:archived?recordingPath(uid,call.id):"",
  outcome:clean(call.endedReason|| (call.analysis?.successEvaluation?"Request handled":"Completed"),100),
  duration:typeof duration==="number"?Math.floor(duration/60)+":"+String(Math.floor(duration%60)).padStart(2,"0"):clean(duration,15),
  durationSeconds:Number.isFinite(duration)?duration:0,
  aiHandled:true,focus:clean(call.metadata?.focus||"",30),scenario:clean(call.metadata?.scenario||"",30),
  followUpStatus:"unreviewed",favorite:false
 };
}
export async function saveVerifiedCall(call,uid,token){
 if(!project()||(!token&&!hasAdminStorage())||!call?.id||!ended(call))return {saved:false,reason:"Call not finalized or secure storage unavailable."};
 if(call.metadata?.ownerId!==uid)return {saved:false,reason:"Call does not belong to this account."};
 const safeId=clean(call.id,100);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeId))
  return {saved:false,reason:"Provider call ID invalid."};
 let archived=false;
 if(hasAdminStorage()){
  const existing=await fromFirebaseArchive(uid,safeId);
  archived=Boolean(existing);
  if(!archived&&hasVapiRecording(call)){
   try{
    const audio=await fetchVapiAudio(safeId);
    const result=await archiveWithAdmin(uid,safeId,audio);
    archived=result.archived===true;
   }catch{/* Vapi may still be processing; the UI can retry. */}
  }
 }
 const record=callHistoryRecord(call,uid,archived);
 if(hasAdminStorage()){
  try{
   const ref=firebaseAdmin().firestore().doc("users/"+uid+"/calls/"+safeId);
   // Provider sync must never reset owner-created flags, ratings or follow-up work.
   const {favorite,followUpStatus,ownerRating,...providerFields}=record;
   await ref.set(providerFields,{merge:true});
   const lead=await persistVoiceLead(call,uid,token).catch(()=>({saved:false}));
   return {saved:true,recordingSaved:archived,recordingAvailable:record.recordingAvailable,leadSaved:lead.saved===true,leadId:lead.leadId||null,ownerAlert:lead.alert?.delivery||null};
  }catch(error){console.warn("FUGTH call Admin write unavailable",{code:error?.code||"firestore"});}
 }
 const fields=Object.fromEntries(Object.entries(record).map(([key,v])=>
  [key,["createdAt","startedAt","endedAt","updatedAt"].includes(key)&&v?{timestampValue:v}:value(v)]));
 const response=await fetch(uri(uid)+"?documentId="+encodeURIComponent(safeId),{
  method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({fields}),cache:"no-store",signal:AbortSignal.timeout(9500)
 });
 if(response.status===409){const lead=await persistVoiceLead(call,uid,token).catch(()=>({saved:false}));return {saved:true,alreadySaved:true,recordingSaved:archived,recordingAvailable:record.recordingAvailable,leadSaved:lead.saved===true,leadId:lead.leadId||null};}
 if(!response.ok){
  const data=await response.json().catch(()=>({}));
  return {saved:false,reason:"Firestore did not accept this call: "+clean(data.error?.status||response.status,80)};
 }
 const lead=await persistVoiceLead(call,uid,token).catch(()=>({saved:false}));
 return {saved:true,recordingSaved:archived,recordingAvailable:record.recordingAvailable,leadSaved:lead.saved===true,leadId:lead.leadId||null};
}
