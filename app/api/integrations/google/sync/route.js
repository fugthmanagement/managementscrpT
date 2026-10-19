import {businessEntitlement} from "../../../../../lib/server/feature-entitlement";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
import {businessCalendarSession,integrationDoc} from "../../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const json=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const safeId=value=>String(value||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,110);
const clean=value=>String(value||"").replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,140);
async function eventsForBusiness(session,uid){
 const url=new URL("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(session.calendarId)+"/events");
 url.searchParams.set("timeMin",new Date(Date.now()-14*86400000).toISOString());
 url.searchParams.set("timeMax",new Date(Date.now()+180*86400000).toISOString());
 url.searchParams.set("singleEvents","true");
 url.searchParams.set("orderBy","startTime");
 url.searchParams.set("maxResults","200");
 url.searchParams.set("fields","items(id,status,summary,description,updated,start,end,htmlLink,extendedProperties),nextPageToken");
 const response=await fetch(url,{headers:{Authorization:"Bearer "+session.token},cache:"no-store",signal:AbortSignal.timeout(13000)});
 if(!response.ok)throw Error(response.status===401?"Google permission expired. Reconnect this business.":"Google Calendar events could not be read. Check Calendar API permissions.");
 const data=await response.json();
 return {events:data.items||[],partial:Boolean(data.nextPageToken)};
}
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return json({error:"Sign in to sync your business calendar."},401);
 const permit=await businessEntitlement(user,"bookings");if(!permit.allowed)return json({error:permit.reason,tier:permit.tier},403);
 try{
  const integration=integrationDoc(user.uid);
  const connected=await integration.get();
  if(!connected.exists)return json({error:"Connect your own Google account in Settings → Connections first."},409);
  const last=Date.parse(connected.data()?.calendarLastSyncedAt||"");
  if(Number.isFinite(last)&&Date.now()-last<105000)return json({
   synced:true,updated:0,skipped:true,lastSyncedAt:connected.data().calendarLastSyncedAt,
   message:"Calendar is up to date. The automatic sync interval is about two minutes."
  });
  const session=await businessCalendarSession(user.uid);
  // Only read the business-specific calendar, not a personal primary calendar
  // or calendars from any other business in the workspace.
  const {events,partial}=await eventsForBusiness(session,user.uid);
  const db=firebaseAdmin().firestore(),root=db.collection("users").doc(user.uid).collection("appointments");
  const entries=events.map(event=>{
   const id=safeId(event.id);
   if(!id)return null;
   const ours=event.extendedProperties?.private?.fugthOwnerId===user.uid;
   const ref=root.doc((ours?"calendar_":"google_")+id);
   const starts=event.start?.dateTime||event.start?.date||"";
   const ends=event.end?.dateTime||event.end?.date||"";
   return {event,ref,ours,starts,ends};
  }).filter(Boolean);
  const old=entries.length?await db.getAll(...entries.map(x=>x.ref)):[];
  const batch=db.batch();let changed=0,imported=0;
  for(let i=0;i<entries.length;i++){
   const {event,ref,ours,starts,ends}=entries[i],prev=old[i];
   const data=prev.exists?prev.data():null;
   if(event.status==="cancelled"){
     if(data?.status!=="cancelled"){batch.set(ref,{
       status:"cancelled",googleUpdatedAt:event.updated||"",
       updatedAt:new Date().toISOString(),calendarSyncStatus:"synced"
     },{merge:true});changed++;}
     continue;
   }
   // All-day calendar markers still block free/busy but are not service visits.
   if(!event.start?.dateTime||!event.end?.dateTime)continue;

   if(data?.googleUpdatedAt===event.updated&&data?.status===(event.status==="cancelled"?"cancelled":"scheduled"))continue;
   // Preserve customer-entered notes/contact information in existing FUGTH records.
   const record={
    service:clean(event.summary)||"Calendar appointment",
    startTime:starts,endTime:ends,
    status:event.status==="cancelled"?"cancelled":"scheduled",
    calendarSyncStatus:"synced",
    externalCalendarId:session.calendarId,externalEventId:event.id,
    googleUpdatedAt:event.updated||"",googleEventUrl:event.htmlLink||"",
    updatedAt:new Date().toISOString(),
    ...(prev.exists?{}:{createdAt:new Date().toISOString(),customerName:"Google Calendar event",
      source:ours?"fugth_calendar":"google_business_calendar"})
   };
   batch.set(ref,record,{merge:true});changed++;
   if(!prev.exists&&!ours)imported++;
  }
  if(changed)await batch.commit();
  const now=new Date().toISOString();
  await integration.set({calendarLastSyncedAt:now},{merge:true});
  return json({synced:true,updated:changed,imported,lastSyncedAt:now,partial,
   message:partial?"Synced the first 200 events. Additional events may require a later sync.":
    changed?changed+" calendar changes are reflected in your FUGTH appointments.":"Google Calendar and FUGTH are in sync."});
 }catch(e){console.warn("Google business calendar sync failed",{code:e?.code||"calendar_sync"});
  return json({error:String(e.message||"Could not sync Google Calendar.").slice(0,190)},503);}
}
