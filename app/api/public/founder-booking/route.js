import {createHash,randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const zone="America/New_York";
const safe=(value,max=150)=>String(value??"").replace(/[<>\\u0000-\\u001f]/g," ").trim().slice(0,max);
const reply=(value,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
const mail=s=>/^[^@\s]{1,65}@[^@\s]{2,130}\.[^@\s]{2,20}$/.test(s);
const validNumber=s=>String(s).replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"").length===10;
function localParts(d){
 const obj=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:zone,
  year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"})
 .formatToParts(d).map(p=>[p.type,p.value]));
 return {weekday:obj.weekday,hour:Number(obj.hour),minute:Number(obj.minute)};
}
function validStart(start){
 const delta=start.getTime()-Date.now();
 if(!Number.isFinite(start.getTime())||delta<24*3600000||delta>45*86400000)return false;
 const t=localParts(start);
 return !["Sat","Sun"].includes(t.weekday)&&t.hour>=9&&t.hour<17&&t.minute%30===0;
}
export async function POST(req){
 const length=Number(req.headers.get("content-length")||0);
 if(length>2600)return reply({error:"Request too large."},413);
 let raw;
 try{const text=await req.text();if(text.length>2600)throw Error();raw=JSON.parse(text)}
 catch{return reply({error:"Invalid appointment request."},400)}
 if(raw?.companyWebsite)return reply({requested:true,note:"Thank you for your request."});
 const name=safe(raw?.name,90),business=safe(raw?.business,90),email=safe(raw?.email,170).toLowerCase();
 const phone=safe(raw?.phone,32),notes=safe(raw?.notes,400),siteId=safe(raw?.siteId,70);
 const start=new Date(raw?.startTime||"");
 if(name.length<2||!mail(email)||!validNumber(phone)||!validStart(start)||raw?.consent!==true)
  return reply({error:"Enter your name, valid contact details and a weekday time between 9 AM and 5 PM Eastern, at least 24 hours ahead. Accept the contact notice."},400);
 if(notes.includes("http://")||notes.includes("https://"))return reply({error:"Please describe your request without external links."},400);
 const db=firebaseAdmin().firestore();
 const day=new Date().toISOString().slice(0,10);
 const ip=String(req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].slice(0,90);
 const prefix=createHash("sha256").update(ip+"|"+day).digest("hex").slice(0,24);
 const contact=createHash("sha256").update(email+"|"+phone+"|"+day).digest("hex").slice(0,24);
 const fingerprint=createHash("sha256").update(email+"|"+phone+"|"+start.toISOString()).digest("hex").slice(0,24);
 const ipRef=db.doc("guestBookingLimits/ip_"+prefix);
 const contactRef=db.doc("guestBookingLimits/contact_"+contact);
 const dupeRef=db.doc("guestBookingLimits/slot_"+fingerprint);
 const reqId=randomBytes(14).toString("hex");
 const record=db.doc("guestBookingRequests/"+reqId);
 try{
  let validDemo=null;
  if(siteId){
   if(!/^[a-f0-9]{24}$/.test(siteId))return reply({error:"Invalid website preview reference."},400);
   const snap=await db.doc("prospectDemos/"+siteId).get();
   const d=snap.data();
   if(!snap.exists||d?.revoked||(d?.expiresAt&&Date.parse(d.expiresAt)<=Date.now()))
    return reply({error:"That demo has expired. You can still book using the general appointment form."},409);
   validDemo={siteId,businessName:safe(d.name,90)};
  }
  const time=new Date().toISOString();
  let limited=false;
  await db.runTransaction(async tx=>{
   const [ipDoc,contactDoc,same]=await Promise.all([tx.get(ipRef),tx.get(contactRef),tx.get(dupeRef)]);
   const ipCount=Number(ipDoc.data()?.count||0),contactCount=Number(contactDoc.data()?.count||0);
   if(ipCount>=5||contactCount>=2||same.exists){limited=true;return;}
   tx.create(record,{name,business,email,phone,notes,startTime:start.toISOString(),
    endTime:new Date(start.getTime()+30*60000).toISOString(),status:"pending",
    source:siteId?"demo_preview":"public_booking",siteId:validDemo?.siteId||null,
    siteBusinessName:validDemo?.businessName||null,createdAt:time,updatedAt:time,
    consentToContact:true,guestTimezone:zone});
   tx.set(ipRef,{count:ipCount+1,day,updatedAt:time},{merge:true});
   tx.set(contactRef,{count:contactCount+1,day,updatedAt:time},{merge:true});
   tx.create(dupeRef,{requestedAt:time});
  });
  if(limited)return reply({error:"A request for this time may already be pending, or today's request limit was reached. Contact FUGTH directly for help."},429);
  return reply({requested:true,status:"pending",message:"Your appointment request was received. A FUGTH representative must approve it before the time is confirmed. If approved, an invitation will be sent through Google Calendar."},201);
 }catch(e){
  console.warn("FUGTH guest booking request issue",{code:e?.code||"server"});
  return reply({error:"Couldn't save the request right now. Please try again."},503);
 }
}
