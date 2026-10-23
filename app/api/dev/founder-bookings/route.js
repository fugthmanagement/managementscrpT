import {NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {founderSlotDetails,FOUNDER_TIMEZONE} from "../../../../lib/server/founder-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const dateIso=()=>new Date().toISOString();
async function checkOwner(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return null;
 const email=String(process.env.FUGTH_BOOKING_OWNER_EMAIL||process.env.FUGTH_CALENDAR_OWNER_EMAIL||"fugthmanagement@gmail.com").trim().toLowerCase();
 if(!["fugthmanagement@gmail.com","fugthchat@gmail.com","mepenginestudio@gmail.com","novaeriahengine@gmail.com"].includes(email))return null;
 const owner=await firebaseAdmin().auth().getUserByEmail(email);
 return owner.uid===user.uid?user:null;
}
export async function GET(req){
 try{
  const user=await checkOwner(req);if(!user)return out({error:"This calendar belongs only to the configured FUGTH booking-owner account. Sign in to that verified account."},403);
  const db=firebaseAdmin().firestore();
  const [bookings,slots,notifications]=await Promise.all([
   db.collection("guestBookingRequests").orderBy("createdAt","desc").limit(250).get(),
   db.collection("founderCalendarSlots").where("startTime",">=",dateIso()).orderBy("startTime").limit(700).get(),
   db.collection("users/"+user.uid+"/notifications").orderBy("createdAt","desc").limit(75).get()
  ]);
  return out({calendar:"firestore",timezone:FOUNDER_TIMEZONE,
   bookings:bookings.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.ownerUid===user.uid),
   reservedSlots:slots.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.ownerUid===user.uid),
   notifications:notifications.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.type==="guest_booking"),
   limit:250,partial:bookings.size===250,ownerEmail:user.email});
 }catch(e){console.warn("Founder calendar read problem",{code:e?.code||"calendar"});return out({error:"Could not load your private FUGTH calendar."},503)}
}
export async function POST(req){
 let user;
 try{user=await checkOwner(req)}catch{return out({error:"Founder calendar authentication unavailable."},503)}
 if(!user)return out({error:"Only the verified FUGTH booking owner can edit this calendar."},403);
 let body;
 try{const raw=await req.text();if(raw.length>1500)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid calendar action."},400)}
 const action=String(body.action||""),db=firebaseAdmin().firestore();
 const now=dateIso();
 if(action==="health"){
  // Founder-only diagnostic. Never create an appointment or block a guest slot.
  const probe=db.doc("bookingHealthChecks/"+randomBytes(12).toString("hex"));
  let created=false;
  try{
   await probe.create({ownerUid:user.uid,type:"founder_booking_health",createdAt:now});
   created=true;
   const saved=await probe.get();
   if(!saved.exists||saved.data()?.ownerUid!==user.uid)
    throw Error("Firestore read-after-write did not match the booking owner.");
   await probe.delete();created=false;
   return out({healthy:true,ownerVerified:true,firestoreWriteReady:true,
    message:"Booking owner verified. Firestore create, read and cleanup all succeeded. A guest appointment still requires its own confirmation."});
  }catch(error){
   console.warn("FUGTH_FOUNDER_BOOKING_HEALTH",{code:error?.code||"read_write_failed"});
   if(created)try{await probe.delete()}catch{}
   return out({healthy:false,ownerVerified:true,firestoreWriteReady:false,
    error:"The appointment database could not complete a safe write/read test. Booking confirmations may fail."},503);
  }
 }
 if(action==="mark_read"){
  const noteId=String(body.id||"");
  if(!/^booking_[a-f0-9]{28}$/.test(noteId))return out({error:"Invalid notification."},400);
  try{
   const ref=db.doc("users/"+user.uid+"/notifications/"+noteId);
   await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists||snap.data()?.type!=="guest_booking")throw Error("Not found");
    tx.set(ref,{read:true,readAt:now},{merge:true});
   });
   return out({updated:true});
  }catch{return out({error:"Notification was not found."},404)}
 }
 if(action==="block"){
  const slot=founderSlotDetails(body.startTime);
  if(!slot)return out({error:"Choose an available appointment slot at least 30 minutes ahead, any day or night."},400);
  const ref=db.doc("founderCalendarSlots/"+slot.id);
  try{
   await db.runTransaction(async tx=>{
    const prior=await tx.get(ref);if(prior.exists)throw Object.assign(Error("This time is already booked or blocked."),{status:409});
    tx.create(ref,{ownerUid:user.uid,status:"blocked",startTime:slot.startTime,endTime:slot.endTime,
     day:slot.day,reason:"Founder unavailable",createdAt:now,createdBy:user.uid});
   });
   return out({blocked:true,slotId:slot.id});
  }catch(e){return out({error:e?.status===409?e.message:"Could not block this time."},e?.status===409?409:503)}
 }
 if(action==="unblock"){
  const id=String(body.slotId||"");
  if(!/^\d{8}_\d{4}b?$/.test(id))return out({error:"Invalid slot."},400);
  const ref=db.doc("founderCalendarSlots/"+id);
  try{
   await db.runTransaction(async tx=>{
    const slot=await tx.get(ref);
    if(!slot.exists||slot.data()?.ownerUid!==user.uid||slot.data()?.status!=="blocked")
     throw Error("Slot is not manually blocked.");
    tx.delete(ref);
   });
   return out({unblocked:true});
  }catch{return out({error:"Only a manually blocked slot can be reopened."},409)}
 }
 if(action==="cancel"){
  const bookingId=String(body.id||"");
  if(!/^[a-f0-9]{28}$/.test(bookingId))return out({error:"Invalid booking."},400);
  const ref=db.doc("guestBookingRequests/"+bookingId);
  try{
   await db.runTransaction(async tx=>{
    const record=await tx.get(ref),data=record.data();
    if(!record.exists||data.ownerUid!==user.uid||data.status!=="confirmed")
     throw Object.assign(Error("This appointment is not currently confirmed."),{status:409});
    const slotRef=db.doc("founderCalendarSlots/"+data.slotId),reserved=await tx.get(slotRef);
    if(!reserved.exists||reserved.data()?.bookingId!==bookingId)
     throw Object.assign(Error("Booking slot needs manual investigation before cancellation."),{status:409});
    tx.delete(slotRef);
    tx.set(ref,{status:"cancelled",cancelledBy:user.uid,cancelledAt:now,updatedAt:now},{merge:true});
    tx.set(db.doc("users/"+user.uid+"/appointments/guest_"+bookingId),{
     status:"cancelled",updatedAt:now,calendarSyncStatus:"firestore"
    },{merge:true});
    tx.set(db.doc("users/"+user.uid+"/notifications/booking_"+bookingId),{
     text:"Guest appointment cancelled: "+data.name+" · "+data.startTime,read:true,cancelledAt:now
    },{merge:true});
   });
   return out({cancelled:true,message:"Cancelled and reopened the slot. Contact the guest personally; no automatic cancellation email was sent."});
  }catch(e){return out({error:e?.status===409?e.message:"Couldn't cancel that reservation."},e?.status===409?409:503)}
 }
 return out({error:"Unknown calendar action."},400);
}
