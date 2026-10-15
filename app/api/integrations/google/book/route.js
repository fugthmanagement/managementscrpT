import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
import {accessGoogleCalendar,businessCalendarSession} from "../../../../../lib/server/google-calendar";
import {checkBusinessHours} from "../../../../../lib/booking-availability";
import {fromFirestoreValue} from "../../../../../lib/server/firestore-admin";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function checkFree(token,ids,begin,finish){
 const result=await fetch("https://www.googleapis.com/calendar/v3/freeBusy",{
  method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({timeMin:begin.toISOString(),timeMax:finish.toISOString(),items:ids.map(id=>({id}))}),
  cache:"no-store",signal:AbortSignal.timeout(12000)
 });
 if(!result.ok)throw new Error("Could not confirm the requested time is free.");
 const json=await result.json();
 for(const id of ids){
  const item=json.calendars?.[id];
  if(!item||item.errors?.length)throw new Error("Calendar availability is temporarily unavailable.");
  if(item.busy?.length)return false;
 }
 return true;
}
async function readAvailability(uid,request){
 try{const profile=await firebaseAdmin().firestore().doc("users/"+uid).get();
  if(profile.exists)return profile.data()?.bookingAvailability||null;}catch{}
 // Signed-in owners can read their own booking preferences directly even
 // when a separate FUGTH service credential is being repaired.
 try{
  const token=(request.headers.get("authorization")||"").replace(/^Bearer\\s+/,"");
  const project=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const r=await fetch("https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(project)+
   "/databases/(default)/documents/users/"+encodeURIComponent(uid),{
   headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(7000),cache:"no-store"
  });
  if(r.ok){
   const profile=await r.json(),field=profile.fields?.bookingAvailability;
   return field?fromFirestoreValue(field):null;
  }
 }catch{}
 return null;
}
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return reply({error:"Sign in to book a FUGTH appointment."},401);
 let body;
 try{const raw=await req.text();if(raw.length>4000)throw Error();body=JSON.parse(raw);}
 catch{return reply({error:"Invalid appointment details."},400);}
 const title=String(body.title||"").replace(/[\r\n<>]/g," ").trim().slice(0,120);
 const name=String(body.customerName||"").replace(/[\r\n<>]/g," ").trim().slice(0,100);
 const phone=String(body.phone||"").replace(/[^+0-9(). -]/g,"").trim().slice(0,32);
 const begin=new Date(body.startTime),finish=new Date(body.endTime);
 const duration=finish.getTime()-begin.getTime();
 if(!title||!Number.isFinite(begin.getTime())||!Number.isFinite(finish.getTime())||
  begin.getTime()<Date.now()||begin.getTime()>Date.now()+180*86400000||
  duration<15*60000||duration>4*3600000)
  return reply({error:"Choose a future time between 15 minutes and 4 hours."},400);
 try{
  const availability=await readAvailability(user.uid,req);
  const hours=checkBusinessHours(availability,begin,finish);
  if(!hours.allowed)return reply({error:hours.reason},409);
  const session=await businessCalendarSession(user.uid);
  const free=await checkFree(session.token,[session.calendarId],begin,finish);
  if(!free)return reply({error:"Your business calendar already has an appointment at that time."},409);
  // Connected personal calendars are checked separately. Never check the
  // founder's primary calendar while scheduling a different customer's work.
  if(session.central){
   try{
    const ownToken=await accessGoogleCalendar(user.uid);
    if(!(await checkFree(ownToken,["primary"],begin,finish)))
     return reply({error:"The time conflicts with your connected personal calendar."},409);
   }catch(error){
    if(!String(error.message||"").includes("not connected")&&
       !String(error.message||"").includes("Reconnect"))
     return reply({error:"Your personal availability could not be checked. Reconnect your calendar before booking."},502);
   }
  }else if(!(await checkFree(session.token,["primary"],begin,finish))){
   return reply({error:"The time conflicts with your connected personal calendar."},409);
  }
  // A business owner receives an event invitation through their verified
  // contact email; Google will apply their own notification preferences.
  const attendees=session.central&&user.email_verified&&user.email?
   [{email:user.email}]:[];
  const url="https://www.googleapis.com/calendar/v3/calendars/"+
    encodeURIComponent(session.calendarId)+"/events?sendUpdates=all";
  const created=await fetch(url,{
   method:"POST",headers:{Authorization:"Bearer "+session.token,"Content-Type":"application/json"},
   body:JSON.stringify({summary:title,
    description:["FUGTH confirmed business appointment",name&&"Customer: "+name,
     phone&&"Contact number: "+phone].filter(Boolean).join("\n"),
    start:{dateTime:begin.toISOString()},end:{dateTime:finish.toISOString()},
    ...(attendees.length?{attendees}:{}),
    extendedProperties:{private:{fugthOwnerId:user.uid}}
   }),
   cache:"no-store",signal:AbortSignal.timeout(13000)
  });
  if(!created.ok)return reply({error:"This appointment couldn't be added to your business calendar."},502);
  const event=await created.json();
  let workspaceSynced=false;
  try{
   const safe=String(event.id||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,120);
   if(safe){
    await firebaseAdmin().firestore().doc("users/"+user.uid+"/appointments/calendar_"+safe).set({
     customerName:name||"Calendar appointment",phone,service:title,
     startTime:begin.toISOString(),endTime:finish.toISOString(),status:"scheduled",
     source:"fugth_calendar",calendarSyncStatus:"synced",
     externalCalendarId:session.calendarId,externalEventId:event.id,
     createdAt:new Date().toISOString()
    },{merge:true});
    workspaceSynced=true;
   }
  }catch(error){console.warn("FUGTH appointment mirror pending",{code:error?.code||"db"});}
  return reply({created:true,workspaceSynced,eventId:event.id,eventUrl:event.htmlLink||null,
   notification:"Owner notifications follow their connected calendar settings."});
 }catch(error){
  console.warn("FUGTH booking request failed",{code:error?.code||"calendar"});
  return reply({error:error.message&&error.message.length<100?error.message:
   "Your business calendar couldn't complete the booking. Please check the connection."},503);
 }
}
