import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {fetchProviderCall,callOwnerId,validCallId,hasAdminStorage} from "../../../lib/server/vapi-recordings";
import {saveVerifiedCall,ended} from "../../../lib/server/voice-call-history";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const respond=(value,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
function verifySecret(req){
 const secret=process.env.VAPI_WEBHOOK_SECRET;
 if(!secret)return true; // Provider API verification is always mandatory below.
 const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 const sent=Buffer.from(bearer),expected=Buffer.from(secret);
 return sent.length===expected.length&&timingSafeEqual(sent,expected);
}
export async function POST(req){
 // Only post-call events create leads. Assistant/tool-call messages must not be
 // stored as completed calls, nor consume the owner's notification allowance.
 if(!verifySecret(req))return respond({error:"Webhook credential rejected."},401);
 if(!hasAdminStorage())return respond({error:"Secure server database credentials must be configured."},503);
 let payload;
 try{
  const raw=await req.text();
  if(raw.length>150000)return respond({error:"Webhook payload exceeds size limit."},413);
  payload=JSON.parse(raw);
 }catch{return respond({error:"Invalid event."},400);}
 const message=payload?.message||payload||{};
 if(!["end-of-call-report","status-update"].includes(message?.type))
  return respond({received:true,processed:false});
 if(message.type==="status-update"&&message.status!=="ended")
  return respond({received:true,processed:false});
 const id=message.call?.id||payload.call?.id||"";
 if(!validCallId(id))return respond({error:"Call ID is required."},400);
 try{
  // Even if a malicious client posts someone else's ownerId, we independently
  // request this call from Vapi and resolve ownership from the provider's
  // metadata or a protected assigned business phone number.
  const call=await fetchProviderCall(id);
  const uid=await callOwnerId(call);
  if(!uid)return respond({error:"This voice number has not been mapped to a FUGTH customer."},422);
  if(!ended(call))return respond({received:true,processed:false,reason:"Provider is still finalizing the call."});
  const ownedCall={...call,metadata:{...call.metadata,ownerId:uid}};
  const saved=await saveVerifiedCall(ownedCall,uid,null);
  if(!saved.saved)return respond({error:"Could not save the verified call and its customer lead."},503);
  return respond({success:true,processed:true,callId:id,leadSaved:saved.leadSaved===true,
   recordingArchived:saved.recordingSaved===true});
 }catch(error){
  console.warn("FUGTH verified Vapi call webhook",{status:error?.status||"server"});
  return respond({error:"Voice-call processing is temporarily unavailable."},error?.status===404?404:503);
 }
}
