import {createHash} from "crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
import {siteFields} from "../../../../../lib/site-presets";
import {
 factChunks,classifyBusinessQuestion,retrieveBusinessFacts,
 safeBusinessAnswer,validateGroundedAnswer,
 BUSINESS_AGENT_OFF_TOPIC,BUSINESS_AGENT_UNVERIFIED,businessTokens
} from "../../../../../lib/business-agent-rag";
import {
 localAgentReadiness,resolveWeakBusinessGate,groundedBusinessCompletion
} from "../../../../../lib/server/business-agent-model";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=45;
const respond=(result,status=200)=>NextResponse.json(result,{
 status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
const limits=new Map();
function requestLimit(request,uid){
 const raw=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||
  request.headers.get("x-real-ip")||"unknown";
 const digest=createHash("sha256").update(uid+"|"+raw+"|"+String(process.env.INTEGRATION_ENCRYPTION_KEY||"business-chat")).digest("hex");
 const now=Date.now();
 if(limits.size>4000)for(const [key,item] of limits)if(item.until<now)limits.delete(key);
 const entry=limits.get(digest);
 if(!entry||entry.until<now){limits.set(digest,{hits:1,until:now+5*60*1000});return true;}
 if(entry.hits>=12)return false;
 entry.hits++;
 return true;
}
async function publishedSite(uid){
 const snapshot=await firebaseAdmin().firestore().doc("publicSites/"+uid).get();
 if(!snapshot.exists||snapshot.data()?.visibility!=="published")return null;
 const data=snapshot.data();
 if(data.showChatbot===false)return null;
 return siteFields(data);
}
export async function GET(request,{params}){
 const uid=params?.uid;
 if(!/^[-_a-zA-Z0-9]{8,128}$/.test(String(uid||"")))return respond({error:"Invalid site ID"},400);
 const user=await authenticatedUser(request);
 if(!user?.uid||user.uid!==uid)return respond({error:"Business owner sign-in required"},401);
 const ready=localAgentReadiness();
 // Never expose the inference endpoint or API key to the public browser.
 return respond({configured:ready.configured,models:ready.models,missing:ready.missing,
  about:"A business can choose the 0.5B or 1.5B model once its private GGUF serving endpoint is configured. Public visitors never receive its access token."});
}
export async function POST(request,{params}){
 const uid=params?.uid;
 if(!/^[-_a-zA-Z0-9]{8,128}$/.test(String(uid||"")))return respond({error:"Invalid website."},400);
 const length=Number(request.headers.get("content-length")||0);
 if(length>1700)return respond({error:"Question too long."},413);
 if(!requestLimit(request,uid))return respond({reply:"Please wait a few minutes before sending another question.",mode:"rate_limited"},429);
 let body;
 try{const raw=await request.text();if(raw.length>1700)return respond({error:"Question too long."},413);body=JSON.parse(raw);}
 catch{return respond({error:"Invalid request."},400);}
 const question=typeof body?.question==="string"?body.question.trim():"";
 if(!question||question.length>350)return respond({error:"Ask a question of up to 350 characters."},400);
 try{
  const site=await publishedSite(uid);
  if(!site)return respond({error:"Business chat is not available on this site."},404);
  const facts=factChunks(site);
  const gate=classifyBusinessQuestion(question,site,facts);
  if(!gate.allowed)return respond({reply:BUSINESS_AGENT_OFF_TOPIC,mode:"scope_filter"});
  const retrieved=retrieveBusinessFacts(question,site,facts,gate);
  const fallback=safeBusinessAnswer(question,site,gate,retrieved);
  if(!retrieved.length)return respond({reply:fallback||BUSINESS_AGENT_UNVERIFIED,mode:"unverified"});
  if(site.aiAgentMode!=="local"||gate.intent==="greeting")
   return respond({reply:fallback,mode:"verified_facts"});
  // A soft lexical match must get further approval from the optional small
  // classifier. Ordinary strong business questions bypass the extra cost.
  if(gate.reason==="domain_keyword"||gate.reason==="business_name"){
   const approved=await resolveWeakBusinessGate(question,site);
   if(!approved)return respond({reply:BUSINESS_AGENT_OFF_TOPIC,mode:"scope_filter"});
  }
  if(["booking","pricing","hours","contact","area"].includes(gate.intent))
   return respond({reply:fallback,mode:"verified_facts"});
  const response=await groundedBusinessCompletion({
   question,site,facts:retrieved,mode:site.aiAgentModel
  });
  if(!response.ok)return respond({reply:fallback,mode:"verified_facts",offline:true});
  const checked=validateGroundedAnswer(response.text,retrieved,site,fallback);
  if(!checked.valid)return respond({reply:fallback,mode:"verified_facts"});
  return respond({reply:response.text.slice(0,420),mode:"local_gguf",model:response.model});
 }catch(error){
  console.warn("FUGTH public assistant unavailable",{code:error?.code||"request"});
  return respond({reply:"The business assistant is temporarily unavailable. Please use the contact details on the website.",mode:"unavailable"},503);
 }
}
