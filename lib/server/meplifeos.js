/**
 * Private MEPLIFEOS client. Credentials never reach browser components.
 * App-level Firestore/auth checks must happen BEFORE calling gatewayChat.
 * A slow or sleeping free Space is always considered optional, not critical.
 */
import {firebaseAdmin} from "./auth";

const ORIGIN="https://fugthchat-meplifeos.hf.space";
const validModels=new Set(["0.5b","1.5b"]);
export const AI_POLICY_DEFAULTS=Object.freeze({
 enabled:true,websiteEnabled:true,coldCallEnabled:true,emailEnabled:true,
 websiteModel:"0.5b",forceWebsiteModel:false,coldCallModel:"1.5b",emailModel:"1.5b"
});
function model(name,fallback="0.5b"){return validModels.has(name)?name:fallback;}
function url(path){
 const raw=String(process.env.FUGTH_LOCAL_AGENT_URL||ORIGIN).trim();
 const u=new URL(raw);
 if(u.protocol!=="https:"||u.username||u.password||u.hash||u.search
   ||!u.hostname.endsWith(".hf.space")||u.pathname!=="/"&&u.pathname!=="")
   throw Error("AI gateway URL must be the HTTPS origin of the trusted Hugging Face Space");
 u.pathname=path;
 return u.toString();
}
export function gatewayReadiness(){
 const configured=Boolean(String(process.env.FUGTH_LOCAL_AGENT_API_KEY||"").trim());
 return {configured,origin:ORIGIN,missing:configured?[]:["FUGTH_LOCAL_AGENT_API_KEY"],models:["0.5b","1.5b"]};
}
export async function gatewayHealth(timeout=7000){
 const start=Date.now();
 try{
  const response=await fetch(url("/health"),{cache:"no-store",signal:AbortSignal.timeout(Math.min(12000,Math.max(1000,timeout)))});
  if(!response.ok)return {online:false,ready:false,httpStatus:response.status,latencyMs:Date.now()-start};
  const body=await response.json();
  return {online:true,ready:body.ready===true,loadedModels:Array.isArray(body.loaded_models)?body.loaded_models:[],
   modelErrors:body.load_errors||{},defaultModel:body.default_model||null,
   queue:Number(body.queued)||0,queueLimit:Number(body.max_queue_size)||0,
   activeModel:body.active_model||null,completed:Number(body.completed_requests)||0,
   latencyMs:Date.now()-start};
 }catch(e){return {online:false,ready:false,error:e.name==="TimeoutError"?"timeout":"unreachable",latencyMs:Date.now()-start};}
}
export async function loadAiPolicy(){
 try{
  const snap=await firebaseAdmin().firestore().doc("systemSettings/fugthAi").get();
  const value=snap.data()||{};
  return {...AI_POLICY_DEFAULTS,...Object.fromEntries(Object.entries(value).filter(([k])=>Object.hasOwn(AI_POLICY_DEFAULTS,k))),
   websiteModel:model(value.websiteModel,"0.5b"),coldCallModel:model(value.coldCallModel,"1.5b"),emailModel:model(value.emailModel,"1.5b")};
 }catch{return {...AI_POLICY_DEFAULTS};}
}
export async function gatewayChat({task="support",businessName="FUGTH Management",message,context="",modelName="0.5b",maxTokens=128,temperature=0.1,timeoutMs=35000}){
 const key=String(process.env.FUGTH_LOCAL_AGENT_API_KEY||"").trim();
 if(!key)throw Object.assign(Error("AI gateway secret is not configured in Vercel"),{code:"NOT_CONFIGURED"});
 const payload={
  task:["support","cold_call","email","site_plan","site_copy"].includes(task)?task:"support",
  business_name:String(businessName||"").slice(0,120),
  message:String(message||"").slice(0,1200),
  context:String(context||"").slice(0,4000),
  model:model(modelName,task==="support"?"0.5b":"1.5b"),
  max_tokens:Math.min(256,Math.max(16,Number(maxTokens)||128)),
  temperature:Math.min(0.7,Math.max(0,Number(temperature)||0))
 };
 if(!payload.message.trim())throw Error("AI prompt is empty");
 let response;
 try{
  response=await fetch(url("/v1/chat"),{
   method:"POST",cache:"no-store",
   headers:{"Content-Type":"application/json","X-API-Key":key},
   body:JSON.stringify(payload),
   signal:AbortSignal.timeout(Math.min(90000,Math.max(3000,timeoutMs)))
  });
 }catch(e){throw Object.assign(Error("MEPLIFEOS is offline, sleeping, or responding too slowly."),{code:"UNAVAILABLE"});}
 if(!response.ok)throw Object.assign(Error(response.status===429?"AI queue is busy; try again shortly.":
  response.status===503?"The requested AI model is not loaded.":"AI inference unavailable (HTTP "+response.status+")."),{code:response.status===429?"BUSY":"UPSTREAM",status:response.status});
 const data=await response.json().catch(()=>({}));
 const answer=String(data.answer||"").trim();
 if(!answer)throw Object.assign(Error("AI returned an empty response"),{code:"EMPTY"});
 return {answer,model:data.model||payload.model,task:data.task||payload.task,queueMs:Number(data.queue_ms)||0,inferenceMs:Number(data.inference_ms)||0,requestId:String(data.request_id||"")};
}
