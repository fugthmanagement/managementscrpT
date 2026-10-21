import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {accessGoogleCalendar} from "../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=45;
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const REQ="guestBookingRequests";
const founder=async req=>{const u=await authenticatedUser(req);return u?.uid&&isFounder(u)?u:null;};
const ownerUid=async actor=>{
 const email=String(process.env.FUGTH_CALENDAR_OWNER_EMAIL||"").toLowerCase().trim();
 if(!email)return actor.uid;
 if(!["fugthmanagement@gmail.com","fugthchat@gmail.com","mepenginestudio@gmail.com","novaeriahengine@gmail.com"].includes(email))
  throw Error("FUGTH calendar owner email is not approved.");
 return (await firebaseAdmin().auth().getUserByEmail(email)).uid;
};
async function googleEvents(token){
 const u=new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
 u.searchParams.set("timeMin",new Date(Date.now()-7*86400000).toISOString());
 u.searchParams.set("timeMax",new Date(Date.now()+60*86400000).toISOString());
 u.searchParams.set("singleEvents","true");u.searchParams.set("orderBy","startTime");
 u.searchParams.set("maxResults","150");
 u.searchParams.set("fields","items(id,status,summary,start,end,htmlLink),nextPageToken");
 const res=await fetch(u,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error("Could not read your Google Calendar. Check Google authorization.");
 const body=await res.json();
 return {items:(body.items||[]).filter(x=>x.status!=="cancelled").map(x=>({
  id:x.id,summary:x.summary||"Calendar event",startTime:x.start?.dateTime||x.start?.date||"",
  endTime:x.end?.dateTime||x.end?.date||"",url:x.htmlLink||null
 })),partial:Boolean(body.nextPageToken)};
}
async function googleFree(token,start,end){
 const r=await fetch("https://www.googleapis.com/calendar/v3/freeBusy",{
  method:"POST",cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({timeMin:start,timeMax:end,items:[{id:"primary"}]}),
  signal:AbortSignal.timeout(11000)
 });
 if(!r.ok)throw Error("Calendar availability check failed.");
 const j=await r.json();
 if(j.calendars?.primary?.errors?.length||!j.calendars?.primary)throw Error("Your calendar couldn't confirm availability.");
 return (j.calendars.primary.busy||[]).length===0;
}
export async function GET(req){
 const actor=await founder(req);if(!actor)return out({error:"Verified founder account required."},403);
 try{
  const db=firebaseAdmin().firestore();
  const requests=await db.collection(REQ).orderBy("createdAt","desc").limit(150).get();
  let events=[],calendarError=null,partial=false,connected=false;
  try{const token=await accessGoogleCalendar(await ownerUid(actor),"calendar");
   const g=await googleEvents(token);events=g.items;partial=g.partial;connected=true;
  }catch(e){calendarError=String(e.message||"Google Calendar is not connected.").slice(0,180)}
  return out({requests:requests.docs.map(x=>({id:x.id,...x.data()})),events,calendarConnected:connected,calendarError,partial,
   ownerTimezone:"America/New_York",integrationHint:"Google Calendar must be connected by your configured FUGTH calendar owner."});
 }catch(e){return out({error:"Could not read your founder appointment requests."},503)}
}
export async function POST(req){
 const actor=await founder(req);if(!actor)return out({error:"Verified founder account required."},403);
 let body;try{body=await req.json()}catch{return out({error:"Invalid request."},400)}
 const id=String(body.id||""),action=String(body.action||"");
 if(!/^[a-f0-9]{28}$/.test(id)||!["approve","reject"].includes(action))return out({error:"Choose a valid booking request and action."},400);
 const db=firebaseAdmin().firestore(),ref=db.doc(REQ+"/"+id);
 if(action==="reject"){
  try{
   await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists||snap.data()?.status!=="pending")throw Error("Only pending requests may be declined.");
    tx.set(ref,{status:"rejected",handledBy:actor.uid,handledAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{merge:true});
   });
   return out({updated:true,status:"rejected"});
  }catch{return out({error:"This booking request was already handled or changed."},409)}
 }
 // Google must be reachable before a booking leaves Pending. Never claim confirmed until insertion succeeds.
 let token;try{token=await accessGoogleCalendar(await ownerUid(actor),"calendar")}
 catch{return out({error:"Connect the founder Google Calendar in Settings → Connections before approving a guest booking."},409)}
 let started=null;
 try{
  const snap=await ref.get();if(!snap.exists)return out({error:"Request not found."},404);
  const item=snap.data();
  if(item.status==="confirmed")return out({updated:true,status:"confirmed",eventUrl:item.googleEventUrl||null});
  if(item.status!=="pending"&&item.status!=="needs_review")return out({error:"This request is already being handled."},409);
  const start=new Date(item.startTime),end=new Date(item.endTime);
  if(start.getTime()<Date.now()||end.getTime()-start.getTime()!==30*60000)return out({error:"Requested time has passed or is invalid. Ask the guest for a new slot."},409);
  const eventId="fugth"+id; // Stable Google ID, permits safe retry after an uncertain outcome.
  // Check whether a previous provider request succeeded before re-attempting a write.
  const existing=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events/"+eventId,{
    headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(9000)});
  let event=null;
  if(existing.ok){event=await existing.json();}
  else if(existing.status!==404)throw Error("Could not confirm provider event state.");
  if(!event&&!(await googleFree(token,item.startTime,item.endTime)))
   return out({error:"This time conflicts with another Google Calendar event. Ask the guest to select a different time."},409);
  await db.runTransaction(async tx=>{
   const current=await tx.get(ref);
   if(!current.exists||!["pending","needs_review"].includes(current.data()?.status))throw Error("Booking request changed.");
   tx.set(ref,{status:"confirming",handledBy:actor.uid,updatedAt:new Date().toISOString()},{merge:true});
  });
  started=true;
  if(!event){
   const created=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",{
    method:"POST",cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    signal:AbortSignal.timeout(15000),
    body:JSON.stringify({
     id:eventId,summary:"FUGTH consultation — "+String(item.business||item.siteBusinessName||item.name).slice(0,70),
     description:["Guest-requested consultation, approved by FUGTH administrator",
      "Guest: "+item.name,"Business: "+(item.business||item.siteBusinessName||"not provided"),
      "Phone: "+item.phone,"Notes: "+String(item.notes||"").slice(0,300)].join("\n"),
     start:{dateTime:item.startTime,timeZone:"America/New_York"},
     end:{dateTime:item.endTime,timeZone:"America/New_York"},
     attendees:[{email:item.email}],
     extendedProperties:{private:{fugthGuestRequestId:id,source:"public_booking"}}
    })
   });
   if(!created.ok){
    // Google 409 may mean the deterministic event exists after a provider timeout.
    if(created.status===409){
     const again=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events/"+eventId,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
     if(again.ok)event=await again.json();
    }
    if(!event)throw Error("Google Calendar did not confirm event creation.");
   }else event=await created.json();
  }
  const now=new Date().toISOString();
  const batch=db.batch();
  batch.set(ref,{status:"confirmed",handledBy:actor.uid,confirmedAt:now,updatedAt:now,
   googleEventId:event.id,googleEventUrl:event.htmlLink||null},{merge:true});
  batch.set(db.doc("users/"+actor.uid+"/appointments/guest_"+id),{
   customerName:item.name,phone:item.phone,customerEmail:item.email,
   service:"FUGTH consultation",startTime:item.startTime,endTime:item.endTime,
   status:"scheduled",source:"guest_booking",externalCalendarId:"primary",externalEventId:event.id,
   googleEventUrl:event.htmlLink||null,guestBookingRequestId:id,createdAt:now,updatedAt:now
  },{merge:true});
  await batch.commit();
  return out({updated:true,status:"confirmed",eventUrl:event.htmlLink||null,
   note:"Google Calendar confirmed the appointment and was asked to send the guest invitation."});
 }catch(e){
  console.warn("FUGTH founder guest booking approval issue",{code:e?.code||"calendar"});
  if(started)await ref.set({status:"needs_review",updatedAt:new Date().toISOString()},{merge:true}).catch(()=>{});
  return out({error:"The booking was not fully confirmed. Inspect the Google event and booking status before retrying."},503);
 }
}
