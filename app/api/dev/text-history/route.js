import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const output=(o,status=200)=>NextResponse.json(o,{status,headers:{"Cache-Control":"private, no-store"}});
const id=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const sourceSet=new Set(["textnow","google_voice","native_sms","whatsapp","other_web"]);
const text=v=>String(v??"").replace(/[\u0000-\u001f]/g," ").trim();
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return output({error:"Verified founder access required."},403);
 try{
  const snaps=await firebaseAdmin().firestore().collection("users/"+user.uid+"/outreachTextLog")
   .orderBy("createdAt","desc").limit(500).get();
  const items=snaps.docs.map(d=>({id:d.id,...d.data()}));
  const counts=items.reduce((m,x)=>{if(x.status==="sent_manual"){m.sent++;m.byProvider[x.provider]=(m.byProvider[x.provider]||0)+1}else if(x.status==="prepared")m.prepared++;return m;},{sent:0,prepared:0,byProvider:{}});
  return output({items,counts,partial:snaps.size===500,source:"manual_reporting"});
 }catch{return output({error:"Could not read text outreach history."},503)}
}
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return output({error:"Verified founder access required."},403);
 let body;try{const raw=await req.text();if(raw.length>3000)throw Error();body=JSON.parse(raw)}
 catch{return output({error:"Invalid text tracking request."},400)}
 const action=body?.action;
 const token=String(body?.draftId||"");
 if(!/^[a-f0-9-]{12,50}$/i.test(token))return output({error:"Invalid draft reference."},400);
 const path="users/"+user.uid+"/outreachTextLog/"+token,db=firebaseAdmin().firestore();
 const ref=db.doc(path);
 if(action==="correct"){
  if(!["prepared","sent_manual","not_sent"].includes(body.status))return output({error:"Invalid status."},400);
  try{
   await db.runTransaction(async tx=>{const old=await tx.get(ref);if(!old.exists||old.data()?.founderUid!==user.uid)throw Error("Not found");
    tx.set(ref,{status:body.status,updatedAt:new Date().toISOString()}, {merge:true});});
   return output({saved:true,status:body.status});
  }catch{return output({error:"This history entry is missing."},404)}
 }
 if(action!=="log")return output({error:"Unknown action."},400);
 const prospectId=String(body.prospectId||""),provider=String(body.provider||"");
 const message=text(body.message).slice(0,1300),preview=text(body.previewUrl).slice(0,650);
 const status=String(body.status||"");
 if(!id(prospectId)||!sourceSet.has(provider)||!["prepared","sent_manual"].includes(status)||message.length<10)
  return output({error:"Choose a saved prospect, provider, and valid text."},400);
 try{
  const p=await db.doc("users/"+user.uid+"/campaigns/"+prospectId).get();
  if(!p.exists||p.data()?.type!=="cold_call_prospect")return output({error:"Prospect not found."},404);
  const lead=p.data();
  if(lead.doNotCall===true||lead.status==="do_not_call"||lead.smsOptOut===true)
   return output({error:"This recipient has opted out or is suppressed."},403);
  if(lead.phoneMarketingOptIn!==true||String(lead.consentSource||"").trim().length<5)
   return output({error:"Document the recipient's marketing-text consent before tracking an outreach attempt."},403);
  let already=false;
  await db.runTransaction(async tx=>{
   const old=await tx.get(ref);
   if(old.exists){already=true;return;}
   tx.create(ref,{
    founderUid:user.uid,prospectId,businessName:text(lead.businessName).slice(0,150),
    phone:text(lead.phone).slice(0,35),provider,template:text(body.template).slice(0,55),
    previewUrl:preview,message,status,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    reportedBy:user.uid,verifiedDelivery:false
   });
  });
  return output({saved:true,id:token,alreadyRecorded:already,status,
   note:"Manually recorded; FUGTH has not received delivery confirmation from the messaging provider."});
 }catch(e){return output({error:"Could not record this message in your private history."},503)}
}
