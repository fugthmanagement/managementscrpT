// Persist Vapi-verified call history with the account owner's Firebase token.
// Browser Firebase Auth and server service-account credentials are independent;
// an owner can create their own call document under the existing Firestore rules.
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
function pickRecording(call){
 const a=call?.artifact||{};
 return clean(call.recordingUrl||call.recording||a.recordingUrl||a.recording?.mono?.combinedUrl||"",1800);
}
export function callHistoryRecord(call,uid){
 const transcript=transcriptFor(call.transcript||call.artifact?.transcript||call.artifact?.messages);
 const summary=clean(call.analysis?.summary||call.summary||call.analysis?.structuredData?.summary||
  (transcript?"Call summary is processing. Open the transcript for details.":"Call connected; no detailed summary available."),1200);
 const start=iso(call.startedAt||call.createdAt)||new Date().toISOString();
 const finish=iso(call.endedAt);
 const seconds=(start&&finish)?Math.max(0,Math.round((Date.parse(finish)-Date.parse(start))/1000)):0;
 const duration=Number(call.duration)||seconds;
 return {
  ownerId:uid,providerCallId:clean(call.id,100),source:call.metadata?.fugthPreview?"fugth_demo":"vapi",
  caller:clean(call.customer?.name||call.customer?.number||"Demo customer",100),
  phone:clean(call.customer?.number||"",40),
  createdAt:start,startedAt:start,endedAt:finish,
  timestamp:start,updatedAt:new Date().toISOString(),status:clean(call.status,40),
  summary,transcript,recording:pickRecording(call),
  outcome:clean(call.endedReason|| (call.analysis?.successEvaluation?"Request handled":"Completed"),100),
  duration:typeof duration==="number"?Math.floor(duration/60)+":"+String(Math.floor(duration%60)).padStart(2,"0"):clean(duration,15),
  durationSeconds:Number.isFinite(duration)?duration:0,
  aiHandled:true,focus:clean(call.metadata?.focus||"",30),scenario:clean(call.metadata?.scenario||"",30),
  followUpStatus:"unreviewed",favorite:false
 };
}
export async function saveVerifiedCall(call,uid,token){
 if(!project()||!token||!call?.id||!ended(call))return {saved:false,reason:"Call not finalized."};
 if(call.metadata?.ownerId!==uid||call.metadata?.fugthPreview!==true)
  return {saved:false,reason:"Call does not belong to this account."};
 const safeId=clean(call.id,100);
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(safeId))
  return {saved:false,reason:"Provider call ID invalid."};
 const record=callHistoryRecord(call,uid);
 // Firestore timestamps are native timestampValue values, not server receipt times.
 const fields=Object.fromEntries(Object.entries(record).map(([key,v])=>
  [key,["createdAt","startedAt","endedAt","updatedAt"].includes(key)&&v?{timestampValue:v}:value(v)]));
 const response=await fetch(uri(uid)+"?documentId="+encodeURIComponent(safeId),{
  method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({fields}),cache:"no-store",signal:AbortSignal.timeout(9500)
 });
 if(response.status===409)return {saved:true,alreadySaved:true};
 if(!response.ok){
  const data=await response.json().catch(()=>({}));
  return {saved:false,reason:"Firestore did not accept the call record: "+clean(data.error?.status||response.status,80)};
 }
 return {saved:true,alreadySaved:false};
}
