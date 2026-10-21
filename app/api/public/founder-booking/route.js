import {createHash,randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {firebaseAdmin} from "../../../../lib/server/auth";
import {founderDaySlots,founderSlotDetails,founderNoSlotsReason,MIN_NOTICE_MINUTES,FOUNDER_TIMEZONE} from "../../../../lib/server/founder-calendar";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const json=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"no-store"}});
const clean=(v,n=150)=>String(v??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const mail=s=>/^[^@\s]{1,65}@[^@\s]{2,130}\.[^@\s]{2,20}$/.test(s);
const validPhone=s=>{const digits=String(s).replace(/\D/g,"");return digits.length===10||digits.length===11&&digits.startsWith("1")};
export function founderBookingOwnerEmail(){
 const email=String(process.env.FUGTH_BOOKING_OWNER_EMAIL||process.env.FUGTH_CALENDAR_OWNER_EMAIL||"fugthmanagement@gmail.com").trim().toLowerCase();
 const allowed=["fugthmanagement@gmail.com","fugthchat@gmail.com","mepenginestudio@gmail.com","novaeriahengine@gmail.com"];
 if(!allowed.includes(email))throw Error("Configure a verified founder booking account.");
 return email;
}
async function founderId(){
 const user=await firebaseAdmin().auth().getUserByEmail(founderBookingOwnerEmail());
 if(user.disabled||!user.emailVerified)throw Error("Founder booking account is not verified.");
 return user.uid;
}
const hash=s=>createHash("sha256").update(s).digest("hex").slice(0,26);
export async function GET(req){
 const day=new URL(req.url).searchParams.get("date")||"";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return json({error:"Choose a valid calendar date."},400);
 const slots=founderDaySlots(day);
 // Slot generation is deterministic and independent of Firebase. Firebase is
 // consulted only for booked/blocked overlays and for atomic confirmations.
 if(!slots.length)return json({date:day,timezone:FOUNDER_TIMEZONE,slots:[],
   minNoticeMinutes:MIN_NOTICE_MINUTES,slotMinutes:30,availability:"closed",...founderNoSlotsReason(day)});
 try{
  const db=firebaseAdmin().firestore();

  const refs=slots.map(s=>db.doc("founderCalendarSlots/"+s.id));
  const docs=await db.getAll(...refs);
  const visible=slots.map((s,i)=>({
   startTime:s.startTime,label:s.label,available:!docs[i].exists,
   reason:docs[i].exists?(docs[i].data()?.status==="blocked"?"blocked":"booked"):null
  }));
  return json({date:day,timezone:FOUNDER_TIMEZONE,slots:visible,
   minNoticeMinutes:MIN_NOTICE_MINUTES,slotMinutes:30,verified:true,availability:visible.some(x=>x.available)?"available":"full",
   message:visible.some(x=>x.available)?"Choose a time that works for you.":
    "This date is fully booked. Choose another date."});
 }catch(e){
  const issue=firestoreDemoFailure(e);
  console.warn("FUGTH_GUEST_AVAILABILITY_FAILURE",{code:issue.code});
  return json({
   date:day,timezone:FOUNDER_TIMEZONE,minNoticeMinutes:MIN_NOTICE_MINUTES,
   slotMinutes:30,availability:"unverified",verified:false,code:issue.code,
   // These are proposed times ONLY. No Firestore read means no claim of
   // availability and no guaranteed reservation.
   slots:slots.map(slot=>({startTime:slot.startTime,label:slot.label,
    available:true,verified:false,reason:"unverified"})),
   message:"Choose a preferred time. The calendar is temporarily unable to verify existing bookings, so this is a REQUEST only until FUGTH confirms it.",
   hint:"FUGTH owner: the server cannot access Firestore. "+issue.hint
  });
 }
}
export async function POST(req){
 if(Number(req.headers.get("content-length")||0)>2800)return json({error:"Request too large."},413);
 let body;
 try{const raw=await req.text();if(raw.length>2800)throw Error();body=JSON.parse(raw)}
 catch{return json({error:"Invalid booking details."},400)}
 // Honeypot: never write anything for automated spam.
 if(body?.companyWebsite)return json({booked:true,note:"Thanks for your request."});
 const name=clean(body.name,90),business=clean(body.business,90),email=clean(body.email,170).toLowerCase(),
  phone=clean(body.phone,32),notes=clean(body.notes,400),siteId=clean(body.siteId,70);
 const slot=founderSlotDetails(body.startTime);
 if(name.length<2||!mail(email)||!validPhone(phone)||!slot||body.consent!==true)
  return json({error:"Enter valid contact details and select an available 30-minute slot at least 30 minutes ahead."},400);
 if(/https?:\/\//i.test(notes))return json({error:"Please describe your request without external links."},400);
 try{
 const db=firebaseAdmin().firestore(),day=new Date().toISOString().slice(0,10);
 // Reverse proxy IP is only a coarse rate-limit hint. Do not store raw visitor IPs.
 const ip=String(req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].slice(0,95);
 const ipRef=db.doc("guestBookingLimits/ip_"+hash(ip+"|"+day));
 const contactRef=db.doc("guestBookingLimits/contact_"+hash(email+"|"+phone+"|"+day));
 const dupeRef=db.doc("guestBookingLimits/slot_"+hash(email+"|"+phone+"|"+slot.id));
 const slotRef=db.doc("founderCalendarSlots/"+slot.id);
 const bookingId=randomBytes(14).toString("hex"),booking=db.doc("guestBookingRequests/"+bookingId);
  const uid=await founderId();
  let demoName="";
  if(siteId){
   if(!/^[a-f0-9]{24}$/.test(siteId))return json({error:"Invalid preview link."},400);
   const snap=await db.doc("prospectDemos/"+siteId).get(),d=snap.data();
   if(!snap.exists||d?.revoked||d?.expiresAt&&Date.parse(d.expiresAt)<=Date.now())
    return json({error:"That preview is no longer available. Use the general booking page."},409);
   demoName=clean(d.name,90);
  }
  const createdAt=new Date().toISOString();
  let failure=null;
  await db.runTransaction(async tx=>{
   const [ipSnap,contactSnap,duplicate,existingSlot]=await Promise.all([
    tx.get(ipRef),tx.get(contactRef),tx.get(dupeRef),tx.get(slotRef)
   ]);
   if(existingSlot.exists){failure="SLOT_TAKEN";return}
   if(duplicate.exists){failure="DUPLICATE";return}
   const ipCount=Number(ipSnap.data()?.count||0),contactCount=Number(contactSnap.data()?.count||0);
   if(ipCount>=5||contactCount>=2){failure="LIMIT";return}
   const info={name,business,email,phone,notes,status:"confirmed",startTime:slot.startTime,
    endTime:slot.endTime,slotId:slot.id,slotDay:slot.day,source:siteId?"demo_preview":"public_booking",
    siteId:siteId||null,siteBusinessName:demoName||null,ownerUid:uid,createdAt,updatedAt:createdAt,
    consentToContact:true,timezone:FOUNDER_TIMEZONE};
   // Slot creation is atomic and unique. Two simultaneous callers cannot both book.
   tx.create(slotRef,{bookingId,ownerUid:uid,status:"booked",startTime:slot.startTime,
    endTime:slot.endTime,day:slot.day,createdAt});
   tx.create(booking,info);
   tx.set(db.doc("users/"+uid+"/appointments/guest_"+bookingId),{
    customerName:name,phone,customerEmail:email,service:"FUGTH consultation — "+(business||demoName||name),
    startTime:slot.startTime,endTime:slot.endTime,status:"scheduled",source:"guest_booking",
    bookingId,slotId:slot.id,calendarSyncStatus:"firestore",createdAt,updatedAt:createdAt
   });
   tx.create(db.doc("users/"+uid+"/notifications/booking_"+bookingId),{
    type:"guest_booking",category:"appointments",title:"New guest appointment",
    text:"New guest booking: "+name+" · "+(business||demoName||"FUGTH consultation")+" · "+slot.label+" on "+slot.day,
    bookingId,startTime:slot.startTime,read:false,createdAt
   });
   tx.set(ipRef,{count:ipCount+1,day,updatedAt:createdAt},{merge:true});
   tx.set(contactRef,{count:contactCount+1,day,updatedAt:createdAt},{merge:true});
   tx.create(dupeRef,{bookingId,createdAt});
  },{maxAttempts:5});
  if(failure==="SLOT_TAKEN")return json({error:"That time was just booked by someone else. Choose another available slot.",reason:"slot_taken"},409);
  if(failure==="DUPLICATE")return json({error:"You already booked this time. Check your previous confirmation."},409);
  if(failure==="LIMIT")return json({error:"Too many appointment bookings today. Contact FUGTH directly if you need help."},429);
  return json({booked:true,status:"confirmed",bookingId,timezone:FOUNDER_TIMEZONE,
   startTime:slot.startTime,endTime:slot.endTime,
   message:"Confirmed! Your appointment is reserved in the FUGTH calendar. Save the time shown below; a separate email invitation is not sent automatically."},201);
 }catch(e){
  const issue=firestoreDemoFailure(e);
  const ownerProblem=/^auth\/(user-not-found|invalid-email)/.test(String(e?.code||""))||
    String(e?.message||"").includes("Founder booking account is not verified");
  const code=ownerProblem?"booking_owner_not_configured":issue.code;
  console.warn("FUGTH_GUEST_BOOKING_FAILURE",{code});
  return json({
   error:ownerProblem?"FUGTH booking calendar is temporarily unavailable.":
    "The calendar could not save your appointment. No booking was confirmed.",
   code,bookingUnavailable:true,
   hint:ownerProblem?
    "FUGTH administrators: verify FUGTH_BOOKING_OWNER_EMAIL matches an existing verified Firebase Auth founder account.":
    issue.hint
  },503);
 }
}
