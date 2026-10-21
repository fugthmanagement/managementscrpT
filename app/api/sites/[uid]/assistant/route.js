import {createHash} from "crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
import {siteFields} from "../../../../../lib/site-presets";
import {gatewayHealth} from "../../../../../lib/server/meplifeos-gateway";
import {runFugthBusinessAgent,assignedBusinessModel} from "../../../../../lib/server/fugth-business-agent";
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
 if(data.showChatbot===false||data.aiAgentMode==="off")return null;
 return siteFields(data);
}
export async function GET(request,{params}){
 const uid=params?.uid;
 if(!/^[-_a-zA-Z0-9]{8,128}$/.test(String(uid||"")))return respond({error:"Invalid site ID"},400);
 const user=await authenticatedUser(request);
 if(!user?.uid||user.uid!==uid)return respond({error:"Business owner sign-in required"},401);
 const h=await gatewayHealth();
 return respond({configured:h.configured,ready:h.ready,models:{
  "0.5b":h.models.includes("0.5b"),"1.5b":h.models.includes("1.5b")
 },light:h.light,missing:!h.configured?["Ask FUGTH founder to connect MEPLIFEOS in GGUF AI settings."]:[],
  about:"Owner model selection and approved site facts are sent to FUGTH's server-side agent. No customer needs an API key."});
}
export async function POST(request,{params}){
 const uid=params?.uid;
 if(!/^[-_a-zA-Z0-9]{8,128}$/.test(String(uid||"")))return respond({error:"Invalid website."},400);
 const length=Number(request.headers.get("content-length")||0);
 if(length>1700)return respond({error:"Question too long."},413);
 if(!requestLimit(request,uid))return respond({reply:"Please wait a few minutes before sending another question.",mode:"rate_limited"},429);
 let body;
 try{const raw=await request.text();if(raw.length>1700)throw Error();body=JSON.parse(raw)}
 catch{return respond({error:"Invalid question."},400)}
 const question=typeof body?.question==="string"?body.question.trim():"";
 if(!question||question.length>350)return respond({error:"Ask a question of up to 350 characters."},400);
 try{
  const site=await publishedSite(uid);
  if(!site)return respond({error:"Business chat is not available on this site."},404);
  const result=await runFugthBusinessAgent({question,site,
   mode:body.mode==="live"||site.aiAgentMode==="local"?"live":"facts"});
  return respond({...result,modelSelection:assignedBusinessModel(site)});
 }catch(error){
  console.warn("FUGTH legacy published assistant unavailable",{code:error?.code||"agent"});
  return respond({reply:"The business assistant is temporarily unavailable. Please use the contact details on the website.",mode:"unavailable"},503);
 }
}
