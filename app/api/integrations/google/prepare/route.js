import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../../lib/server/auth";
import {accessGoogleCalendar,ensureFugthBusinessCalendar,ensureFugthCalendarNotifications,integrationDoc} from "../../../../../lib/server/google-calendar";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=40;
const send=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const hasCalendar=entry=>String(entry?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/calendar");
/** Authenticated, opt-in reconnection repair. Never touches customer's Drive or primary calendar. */
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return send({error:"Sign in to configure Google Calendar."},401);
 try{
  const entry=await integrationDoc(user.uid).get();
  if(!entry.exists||!hasCalendar(entry.data()))return send({error:"Connect Google Calendar and approve Calendar permission before setup."},409);
  const token=await accessGoogleCalendar(user.uid);
  const calendar=await ensureFugthBusinessCalendar(user.uid,token);
  let alert={configured:false,reason:"This calendar is managed in a founder-owned Google account."};
  if(calendar.ownerUid===user.uid){
   try{alert=await ensureFugthCalendarNotifications(user.uid,token,calendar)}
   catch(e){console.warn("Google calendar alerts pending",{code:e?.code||"alerts"});alert={configured:false,reason:"Calendar connected. Booking notification settings require attention in Google Calendar."}}
  }
  return send({connected:true,calendarProvisioned:true,calendarName:calendar.summary,
   calendarAlertsConfigured:alert.configured,
   notice:alert.configured?"Calendar ready. New booking emails and appointment popup reminders are configured. Turn on iPhone notifications in Google Calendar.":"Calendar is ready. Enable notifications in Google Calendar to receive phone alerts.",
   note:"FUGTH does not guarantee an immediate iPhone push notification; Google and device settings control delivery."});
 }catch(e){console.warn("FUGTH calendar setup failed",{code:e?.code||"calendar_setup"});return send({error:"Calendar setup could not finish. Verify Google Calendar API, consent-screen tester access and reconnect."},503)}
}
