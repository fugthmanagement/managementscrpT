import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {siteFields} from "../../../../lib/site-presets";
import {assignedBusinessModel,runFugthBusinessAgent} from "../../../../lib/server/fugth-business-agent";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=180;
const reply=(data,s=200)=>NextResponse.json(data,{status:s,headers:{"Cache-Control":"no-store"}});
const validUid=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const validDemo=x=>/^[a-f0-9]{24}$/.test(String(x||""));
const rate=new Map();
function allowedRequest(req,source){
 const ip=String(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"anonymous").split(",")[0].slice(0,75);
 const bucket=createHash("sha256").update(source+":"+ip+":"+String(process.env.INTEGRATION_ENCRYPTION_KEY||"fugth")).digest("hex").slice(0,28);
 const now=Date.now(),old=rate.get(bucket);
 if(rate.size>3500)for(const [k,v] of rate)if(v.until<now)rate.delete(k);
 if(old&&old.until>now&&old.count>=14)return false;
 rate.set(bucket,{count:old&&old.until>now?old.count+1:1,until:now+10*60000});
 return true;
}
async function loadSource(req,source){
 const id=String(source.id||""),type=String(source.type||"");
 const db=firebaseAdmin().firestore();
 if(type==="demo"){
  if(!validDemo(id))return null;
  const doc=await db.doc("prospectDemos/"+id).get(),entry=doc.data();
  if(!doc.exists||entry.revoked||entry.expiresAt&&Date.parse(entry.expiresAt)<=Date.now())return null;
  const site=siteFields(entry.site||{});
  return {...site,name:entry.name||site.name,previewMode:true,
   aiAgentModel:entry.site?.aiAgentModel||"auto",ownerId:entry.assignedUid||null};
 }
 if(type==="published"){
  if(!validUid(id))return null;
  const doc=await db.doc("publicSites/"+id).get(),entry=doc.data();
  if(!doc.exists||entry.visibility!=="published")return null;
  return {...siteFields(entry),ownerId:id,previewMode:false};
 }
 if(type==="draft"){
  if(!validUid(id))return null;
  const user=await authenticatedUser(req);
  if(!user||user.uid!==id)return null; // No private drafts exposed to anonymous users.
  const [draft,pub]=await Promise.all([db.doc("siteDrafts/"+id).get(),db.doc("publicSites/"+id).get()]);
  const entry=draft.exists?draft.data():pub.exists?pub.data():null;
  return entry?{...siteFields(entry),ownerId:id,previewMode:true}:null;
 }
 return null;
}
export async function POST(req){
 if(Number(req.headers.get("content-length")||0)>2200)return reply({error:"Question too long."},413);
 let body;
 try{const raw=await req.text();if(raw.length>2200)throw Error();body=JSON.parse(raw)}
 catch{return reply({error:"Invalid chat request."},400)}
 const question=String(body.question||"").trim(),source=body.source||{},mode=body.mode==="live"?"live":"facts";
 if(!question||question.length>350)return reply({error:"Ask a business question of up to 350 characters."},400);
 if(!["demo","published","draft"].includes(source.type))return reply({error:"Unsupported source."},400);
 if(!allowedRequest(req,source.type+":"+source.id))return reply({error:"This chat is busy. Please try again shortly.",mode:"rate_limited"},429);
 let site;
 try{site=await loadSource(req,source)}
 catch(e){return reply({error:"Business information is temporarily unavailable."},503)}
 if(!site||site.showChatbot===false||site.aiAgentMode==="off")
  return reply({error:"This business chat is unavailable. Try the contact information on the site."},404);
 const streaming=body.stream===true;
 if(!streaming){
  const result=await runFugthBusinessAgent({question,site,mode});
  return reply({...result,modelSelection:assignedBusinessModel(site)});
 }
 const encoder=new TextEncoder();
 let closed=false,timer=null;
 const stream=new ReadableStream({
  async start(controller){
   const send=(event,data)=>{
    if(closed)return;
    try{controller.enqueue(encoder.encode("event: "+event+"\ndata: "+JSON.stringify(data)+"\n\n"))}
    catch{closed=true}
   };
   let elapsed=0;
   timer=setInterval(()=>{
    elapsed+=5;
    if(elapsed===15)send("progress",{phase:"waiting",message:"I'm still checking the business information. Thanks for your patience."});
    if(elapsed===40)send("progress",{phase:"waiting",message:"This is taking a little longer than usual. I'm continuing to check the details."});
    if(elapsed===80)send("progress",{phase:"waiting",message:"The AI is still working through its queue. I'll use verified business facts if it can't finish."});
    send("ping",{elapsed});
   },5000);
   try{
    const result=await runFugthBusinessAgent({question,site,mode,
     onProgress:progress=>send("progress",progress)});
    send("result",result);
   }catch(e){
    send("result",{reply:"I'm unable to check the AI right now. Please contact the business to verify the details.",
     mode:"unavailable",error:"agent_unavailable"});
   }finally{
    if(timer)clearInterval(timer);
    if(!closed){try{controller.close()}catch{}}
    closed=true;
   }
  },
  cancel(){closed=true;if(timer)clearInterval(timer)}
 });
 return new Response(stream,{headers:{
  "Content-Type":"text/event-stream; charset=utf-8",
  "Cache-Control":"no-cache, no-transform",
  "Connection":"keep-alive",
  "X-Content-Type-Options":"nosniff"
 }});
}
