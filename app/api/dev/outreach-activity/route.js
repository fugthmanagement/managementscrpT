import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const output=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const safeId=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const safeEvent=x=>/^[a-zA-Z0-9-]{12,80}$/.test(String(x||""));
const clean=(s,n=500)=>String(s||"").replace(/[\x00-\x1f<>]/g," ").trim().slice(0,n);
const channels=new Set(["email","sms","call","other"]);
const stages=new Set(["new","contacted","replied","interested","needs_info","follow_up","appointment","not_interested","won","lost"]);
const actions=new Set(["record_email","set_stage","record_reply","schedule_followup","suppress"]);
const validDate=x=>{
 if(!x)return null;
 const d=new Date(String(x));
 return Number.isFinite(d.getTime())&&d.getTime()>Date.now()-86400000&&
  d.getTime()<Date.now()+366*86400000?d.toISOString():null;
};
async function actor(req){
 const user=await authenticatedUser(req);
 return user?.uid&&isFounder(user)?user:null;
}
export async function GET(req){
 const user=await actor(req);
 if(!user)return output({error:"Founder sign-in required"},403);
 const uid=user.uid,prospectId=new URL(req.url).searchParams.get("prospectId");
 if(prospectId&&!safeId(prospectId))return output({error:"Invalid prospect"},400);
 try{
  // Collection scoped under owner, read-only; never cross-tenant.
  const snap=await firebaseAdmin().firestore().collection("users/"+uid+"/outreachActivity")
   .orderBy("createdAt","desc").limit(450).get();
  const all=snap.docs.map(d=>({id:d.id,...d.data()}));
  const items=prospectId?all.filter(x=>x.prospectId===prospectId):all;
  return output({items,partial:snap.size===450,
   summary:items.reduce((m,x)=>{
    if(x.type==="email_manual_sent")m.manualEmails++;
    if(x.type==="email_provider_sent")m.apiEmails++;
    if(x.type==="reply")m.replies++;
    if(x.type==="followup_scheduled")m.followUps++;
    return m;
   },{manualEmails:0,apiEmails:0,replies:0,followUps:0})});
 }catch(e){return output({error:"Outreach activity could not be read.",code:String(e?.code||"database")},503)}
}
export async function POST(req){
 const user=await actor(req);if(!user)return output({error:"Founder sign-in required"},403);
 let body;
 try{const raw=await req.text();if(raw.length>2500)throw Error();body=JSON.parse(raw)}
 catch{return output({error:"Invalid outreach update"},400)}
 const action=String(body.action||""),pid=String(body.prospectId||"");
 if(!actions.has(action)||!safeId(pid))return output({error:"Choose a valid action and prospect"},400);
 const eventId=String(body.eventId||"");
 if(!safeEvent(eventId))return output({error:"A valid unique history ID is required"},400);
 const stage=String(body.stage||""),channel=String(body.channel||"email");
 if(!channels.has(channel))return output({error:"Choose a valid contact channel"},400);
 if(action==="set_stage"&&!stages.has(stage))return output({error:"Choose an outreach stage"},400);
 const at=body.followUpAt?validDate(body.followUpAt):null;
 if(body.followUpAt&&!at)return output({error:"Follow-up date must be valid and within the next year"},400);
 if(action==="schedule_followup"&&!at)return output({error:"Choose a follow-up date"},400);
 if(action==="record_email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email||""))){
  return output({error:"Choose a prospect with a valid email address"},400);
 }
 const uid=user.uid,db=firebaseAdmin().firestore();
 const ref=db.doc("users/"+uid+"/campaigns/"+pid),
  event=db.doc("users/"+uid+"/outreachActivity/"+eventId);
 try{
  let result=null;
  await db.runTransaction(async tx=>{
   const [snap,previous]=await Promise.all([tx.get(ref),tx.get(event)]);
   if(!snap.exists||snap.data()?.type!=="cold_call_prospect")
    throw Object.assign(Error("This business is not in your prospect list."),{status:404});
   const p=snap.data();
   if(previous.exists){result={saved:true,alreadyRecorded:true};return}
   if(action==="record_email"&&p.emailOptOut===true){
    throw Object.assign(Error("Recipient opted out of email; do not record a new promotional send."),{status:409});
   }
   const now=new Date().toISOString(),type=action==="record_email"?"email_manual_sent":
    action==="record_reply"?"reply":action==="schedule_followup"?"followup_scheduled":
    action==="set_stage"?"stage_change":"suppressed";
   const update={updatedAt:now};
   if(action==="record_email"){
    update.emailSentCount=Math.max(0,Number(p.emailSentCount||0))+1;
    update.emailLastSentAt=now;update.emailLastProvider=clean(body.provider||"manual",40);
    update.emailLastSentSubject=clean(body.subject,160);
    update.lastOutreachAt=now;update.outreachStage="contacted";
   }else if(action==="record_reply"){
    update.outreachStage=stages.has(stage)?stage:"replied";update.lastReplyAt=now;
   }else if(action==="schedule_followup"){
    update.outreachStage="follow_up";update.nextFollowUpAt=at;
   }else if(action==="set_stage"){
    update.outreachStage=stage;
    if(stage==="not_interested")update.nextFollowUpAt=null;
   }else if(action==="suppress"){
    update[channel==="sms"?"smsOptOut":"emailOptOut"]=true;
    update.outreachStage="not_interested";update.nextFollowUpAt=null;
   }
   if(at&&action!=="schedule_followup")update.nextFollowUpAt=at;
   tx.set(ref,update,{merge:true});
   tx.create(event,{
    founderUid:uid,prospectId:pid,businessName:clean(p.businessName,120),
    channel,type,status:"reported_manual",provider:clean(body.provider||"manual",35),
    subject:clean(body.subject,160),note:clean(body.note,500),
    followUpAt:at||null,stage:action==="set_stage"?stage:update.outreachStage||null,
    verifiedDelivery:false,createdAt:now
   });
   result={saved:true,alreadyRecorded:false,stage:update.outreachStage||p.outreachStage||"new",
    nextFollowUpAt:update.nextFollowUpAt??p.nextFollowUpAt??null,
    count:update.emailSentCount??p.emailSentCount??0};
  });
  return output({...result,note:action==="record_email"?
   "Marked as manually sent. FUGTH has not verified Gmail delivery. This does not authorize automated bulk email.":
   "Prospect history and next-step status saved."});
 }catch(e){return output({error:e.status?e.message:"Could not save prospect outreach history."},e.status||503)}
}
