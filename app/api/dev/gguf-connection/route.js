import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
import {gatewayHealth,gatewayChat,setGatewaySecret,clearGatewaySecret} from "../../../../lib/server/meplifeos-gateway";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=120;
const send=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function requireFounder(req){
 const u=await authenticatedUser(req);
 return u?.uid&&isFounder(u)?u:null;
}
export async function GET(req){
 const user=await requireFounder(req);
 if(!user)return send({error:"Sign in with a verified founder account."},403);
 const health=await gatewayHealth();
 return send({health,
  // No key, encrypted bytes, or raw provider error is exposed here.
  setup:"A correctly configured Vercel key works automatically; an encrypted Firestore override can replace it without redeploying.",
  secureStorage:"AES-256-GCM with INTEGRATION_ENCRYPTION_KEY"});
}
export async function POST(req){
 const user=await requireFounder(req);
 if(!user)return send({error:"Founder account required."},403);
 let body;
 try{const raw=await req.text();if(raw.length>1400)throw Error();body=JSON.parse(raw)}
 catch{return send({error:"Invalid settings request."},400)}
 if(body.action==="save"){
  const secret=String(body.apiKey||"").trim();
  if(!secret||secret.includes("\n"))return send({error:"Paste the full Hugging Face Space FUGTH_API_KEY once."},400);
  try{
   await setGatewaySecret(secret,user.uid);
   return send({saved:true,keyStored:true,
    note:"Encrypted key saved to founder-only server settings. Browser does not retain or receive it. New AI requests will use this key automatically. Run Test inference to confirm it matches Hugging Face."});
  }catch(e){return send({error:/INTEGRATION_ENCRYPTION_KEY/.test(e?.message||"")?
   "The Vercel INTEGRATION_ENCRYPTION_KEY must be set to 64 hex characters before encrypted Firestore storage works.":
   e?.status===400?e.message:"Failed to save the encrypted API key. Check server Firestore credentials.",
   status:"not_saved"},e.status===400?400:503)}
 }
 if(body.action==="remove"){
  try{await clearGatewaySecret();return send({removedOverride:true,note:"The encrypted Firestore override was cleared. The server will use its Vercel environment secret if available."})}
  catch{return send({error:"Could not clear the saved override."},503)}
 }
 if(body.action==="ping"){
  const h=await gatewayHealth();return send({health:h});
 }
 if(body.action==="test"){
  try{
   const response=await gatewayChat({task:"site_copy",model:"0.5b",
    businessName:"FUGTH test",context:"Business name: FUGTH test. Listed services: AI receptionist.",
    message:"In one short sentence identify the service listed in the facts.",maxTokens:36,timeoutMs:92000});
   return send({connected:true,testAnswer:response.answer.slice(0,270),model:response.model,
    source:response.secretSource,queueMs:response.queueMs,inferenceMs:response.inferenceMs});
  }catch(e){return send({connected:false,code:e.reason||"inference_unavailable",
    error:e.message||"Model response could not be verified."},e.status===401?401:e.status===429?429:e.status===504?504:503)}
 }
 return send({error:"Unknown connection setting."},400);
}
