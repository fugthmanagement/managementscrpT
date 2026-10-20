/**
 * FUGTH published-site assistant -> private MEPLIFEOS /v1/chat adapter.
 * The browser never receives the Hugging Face secret or raw private profile.
 * Strict RAG filters and output verification remain in the public route.
 */
import {gatewayChat,gatewayReadiness,loadAiPolicy} from "./meplifeos";
export function localAgentReadiness(){
 const available=gatewayReadiness();
 return {configured:available.configured,models:{"0.5b":available.configured,"1.5b":available.configured},missing:available.missing};
}
export async function resolveWeakBusinessGate(question,site){
 // Default-deny weak intent matches if the classifier fails or is busy.
 try{
  const config=await loadAiPolicy();
  if(!config.enabled||!config.websiteEnabled)return false;
  const answer=await gatewayChat({
   task:"support",businessName:site.name,
   message:"Classify this visitor message as BUSINESS or OTHER. Answer with exactly one of those words: "+String(question).slice(0,250),
   context:"Business: "+String(site.name||"").slice(0,90)+"; verified services: "+(site.services||[]).join(", ").slice(0,220),
   modelName:"0.5b",maxTokens:16,temperature:0,timeoutMs:9000
  });
  return /^BUSINESS[.! ]*$/i.test(answer.answer.trim());
 }catch{return false;}
}
export async function groundedBusinessCompletion({question,site,facts,mode}){
 try{
  const config=await loadAiPolicy();
  if(!config.enabled||!config.websiteEnabled)return {ok:false,reason:"disabled"};
  const model=config.forceWebsiteModel?config.websiteModel:((mode==="0.5b"||mode==="1.5b")?mode:config.websiteModel);
  const evidence=facts.map((x,i)=>"["+String(i+1)+"] "+x.text).join("\n").slice(0,2400);
  const result=await gatewayChat({
   task:"support",businessName:String(site.name||"Business").slice(0,80),
   message:String(question||"").slice(0,350),
   context:evidence,modelName:model,maxTokens:110,temperature:0.05,timeoutMs:21000
  });
  return {ok:true,text:result.answer,model:result.model,queueMs:result.queueMs,inferenceMs:result.inferenceMs};
 }catch(error){
  console.warn("FUGTH business assistant falling back to published facts",{code:error?.code||"inference"});
  return {ok:false,reason:"unavailable"};
 }
}
