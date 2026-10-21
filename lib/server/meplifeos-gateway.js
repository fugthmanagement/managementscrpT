/**
 * Unified authenticated, server-only gateway for FUGTH agents and founder tools.
 * MEPLIFEOS implements /v1/chat (X-API-Key), not OpenAI chat/completions.
 */
import {firebaseAdmin} from "./auth.js";
import {encrypt,decrypt} from "./google-calendar.js";
export const MEPLIFEOS_ORIGIN="https://fugthchat-meplifeos.hf.space";
const SECRET_PATH="systemSettings/meplifeosSecret";
const cleanModel=model=>model==="1.5b"?"1.5b":"0.5b";
function healthModels(h={}){
 const arr=Array.isArray(h.loaded_models)?h.loaded_models:Array.isArray(h.models)?h.models:
  typeof h.models==="object"&&h.models?Object.entries(h.models).filter(([,v])=>v===true||v?.ready===true).map(([k])=>k):[];
 return [...new Set(arr.map(String).filter(x=>["0.5b","1.5b"].includes(x)))];
}
export async function gatewayCredentials(){
 let storeError=null,firestore=false;
 try{
  const snap=await firebaseAdmin().firestore().doc(SECRET_PATH).get();
  if(snap.exists&&snap.data()?.encrypted){
   const saved=decrypt(snap.data().encrypted);
   if(typeof saved?.apiKey==="string"&&saved.apiKey.length>=12&&saved.apiKey.length<500){
    return {key:saved.apiKey,source:"encrypted_firestore",savedAt:snap.data()?.updatedAt||null,firestore:true};
   }
  }
  firestore=true;
 }catch(e){storeError=e?.code||"firestore_unavailable"}
 const key=String(process.env.FUGTH_LOCAL_AGENT_API_KEY||process.env.FUGTH_API_KEY||"").trim();
 return {key,source:key?"vercel_environment":"not_configured",savedAt:null,firestore,storeError};
}
export async function setGatewaySecret(apiKey,actorUid){
 if(!/^[^\s]{12,450}$/.test(apiKey||""))throw Object.assign(Error("Enter the exact Space API key, without spaces or quotes."),{status:400});
 // Uses INTEGRATION_ENCRYPTION_KEY AES-256-GCM. Plaintext is never saved to Firestore.
 const encrypted=encrypt({apiKey});
 await firebaseAdmin().firestore().doc(SECRET_PATH).set({
  encrypted,updatedAt:new Date().toISOString(),savedBy:actorUid,kind:"huggingface_meplifeos_v1"
 },{merge:true});
}
export async function clearGatewaySecret(){
 await firebaseAdmin().firestore().doc(SECRET_PATH).delete();
}
export async function gatewayHealth(){
 let httpStatus=null,issue=null,raw={};
 try{
  const res=await fetch(MEPLIFEOS_ORIGIN+"/health",{cache:"no-store",signal:AbortSignal.timeout(12000)});
  httpStatus=res.status;
  if(!res.ok)issue="space_http_"+res.status;
  else raw=await res.json();
 }catch(e){issue=e.name==="TimeoutError"?"space_waking_or_timeout":"space_unreachable"}
 const credentials=await gatewayCredentials();
 const online=httpStatus===200;
 const loaded=healthModels(raw);
 const ready=online&&(raw.ready===true||raw.status==="ready"||raw.state==="ready"||loaded.length>0);
 return {
  online,ready,models:loaded,queue:raw.queued??raw.queue_size??raw.queue?.waiting??0,
  maxQueue:raw.max_queue_size??raw.queue_limit??8,active:raw.active_model??null,
  defaultModel:raw.default_model??null,completed:raw.completed_requests??null,
  httpStatus,issue,configured:Boolean(credentials.key),source:credentials.source,
  configWarning:credentials.storeError||null,savedAt:credentials.savedAt,
  light:!online||!credentials.key?"red":!ready?"orange":"green"
 };
}
export async function gatewayChat({model="0.5b",businessName="Business",message,context="",task="website_support",
 maxTokens=150,timeoutMs=105000}={}){
 const auth=await gatewayCredentials();
 if(!auth.key)throw Object.assign(Error("MEPLIFEOS has no server connection. Add the Space secret under GGUF AI Settings."),{status:503,reason:"missing_secret"});
 const controller=new AbortController(),t=setTimeout(()=>controller.abort(),Math.min(116000,Math.max(8000,timeoutMs)));
 try{
  const res=await fetch(MEPLIFEOS_ORIGIN+"/v1/chat",{
   method:"POST",cache:"no-store",signal:controller.signal,
   headers:{"Content-Type":"application/json","X-API-Key":auth.key},
   body:JSON.stringify({
    model:cleanModel(model),business_name:String(businessName||"Business").slice(0,110),
    message:String(message||"").slice(0,1400),
    context:String(context||"").slice(0,3800),
    task:String(task||"website_support").slice(0,40),
    temperature:.06,max_tokens:Math.max(12,Math.min(210,maxTokens))
   })
  });
  if(!res.ok){
   const reason=res.status===401||res.status===403?"invalid_secret":res.status===429?"queue_full":res.status===504?"queue_timeout":"inference_unavailable";
   throw Object.assign(Error(reason==="invalid_secret"?"Your Space secret is not accepted. Update it once in GGUF AI Settings.":reason==="queue_full"?"GGUF queue is busy; try again.":"The AI gateway could not complete the request."),{status:res.status,reason});
  }
  const data=await res.json();
  const answer=String(data?.answer||data?.reply||data?.response||"").trim().replace(/^[ "'\n]+|[ "'\n]+$/g,"");
  if(!answer)throw Object.assign(Error("GGUF returned an empty response."),{status:502,reason:"empty_answer"});
  return {answer,model:cleanModel(data?.model||model),queueMs:data.queue_ms??null,
   inferenceMs:data.inference_ms??null,secretSource:auth.source};
 }catch(e){
  if(e.name==="AbortError")throw Object.assign(Error("The shared GGUF queue timed out; preset facts remain available."),{status:504,reason:"timeout"});
  throw e;
 }finally{clearTimeout(t)}
}
