"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {auth} from "../lib/firebase";
const pad=x=>String(x).padStart(2,"0");
const dayKey=d=>{const date=new Date(d);if(!Number.isFinite(date.getTime()))return "";const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date).map(p=>[p.type,p.value]));return [parts.year,parts.month,parts.day].join("-")};
const stamp=s=>{if(!s)return "Unknown time";const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString("en-US",{timeZone:"America/New_York",dateStyle:"medium",timeStyle:"short"})+" ET":s};
const thisMonth=()=>{const today=new Date();const p=dayKey(today).split("-").map(Number);return {year:p[0]||2026,month:(p[1]||1)-1}};
const button="rounded-xl border border-[#cbdfea] bg-white px-3 py-2 text-xs font-black text-[#285874] disabled:opacity-40";
export default function FounderBookingCalendar(){
 const [data,setData]=useState(null),[month,setMonth]=useState(thisMonth),[selected,setSelected]=useState(""),
  [busy,setBusy]=useState(""),[message,setMessage]=useState(""),[filter,setFilter]=useState("all");
 const refresh=useCallback(async()=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
  const r=await fetch("/api/dev/founder-bookings",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Could not read booking calendar.");
  setData(j);return j;
 },[]);
 useEffect(()=>{refresh().catch(e=>setMessage(e.message))},[refresh]);
 const requests=data?.requests||[],events=data?.events||[];
 const pending=requests.filter(x=>x.status==="pending"||x.status==="needs_review");
 const monthDays=useMemo(()=>{
  const {year,month:m}=month,first=new Date(Date.UTC(year,m,1));
  const offset=first.getUTCDay(),count=new Date(Date.UTC(year,m+1,0)).getUTCDate();
  return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>pad(year)+"-"+pad(m+1)+"-"+pad(i+1))];
 },[month]);
 const eventGroups=useMemo(()=>{const out={};for(const event of events){const day=dayKey(event.startTime);if(!day)continue;(out[day]||=[]).push({...event,kind:"google"});}
  for(const r of requests.filter(x=>x.status==="pending"||x.status==="needs_review")){const day=dayKey(r.startTime);if(!day)continue;(out[day]||=[]).push({...r,kind:"request"});}
  return out;
 },[events,requests]);
 const visible=useMemo(()=>{
  if(!selected)return [...events.map(x=>({...x,kind:"google"})),...pending.map(x=>({...x,kind:"request"}))].filter(x=>filter==="all"||x.kind===filter).sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime))).slice(0,80);
  return (eventGroups[selected]||[]).filter(x=>filter==="all"||x.kind===filter).sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
 },[selected,eventGroups,events,pending,filter]);
 async function action(id,operation){
  if(operation==="approve"&&!confirm("Approve this specific guest request and create an invitation in your connected Google Calendar?"))return;
  setBusy(id);setMessage("");
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to approve.");
   const r=await fetch("/api/dev/founder-bookings",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({id,action:operation}),cache:"no-store"});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Could not update request.");
   setMessage(operation==="approve"?"Confirmed in Google Calendar; Google was asked to invite the guest.":"Request declined.");
   await refresh();
  }catch(e){setMessage(e.message||"Could not update request.")}
  finally{setBusy("")}
 }
 function move(delta){setMonth(v=>{const d=new Date(Date.UTC(v.year,v.month+delta,1));return {year:d.getUTCFullYear(),month:d.getUTCMonth()}});setSelected("");}
 return <section className="space-y-5 rounded-[26px] border border-[#d4e7f1] bg-white p-5 text-[#22455c] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#6aa6c4]">FOUNDER / GOOGLE CALENDAR</p>
    <h3 className="mt-2 text-2xl font-black">My appointments & guest requests</h3>
    <p className="mt-2 max-w-2xl text-xs leading-6 text-[#7290a2]">This private calendar shows upcoming Google events and unconfirmed booking requests. Approval checks your live calendar before inserting an event.</p></div>
   <div className="flex flex-wrap gap-2">
    <button className={button} onClick={()=>refresh().then(()=>setMessage("Calendar refreshed.")).catch(e=>setMessage(e.message))}>Refresh</button>
    <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer" className={button}>Open Google Calendar ↗</a>
   </div>
  </div>
  <div className="grid gap-3 sm:grid-cols-3">{[
   ["Pending requests",pending.length],
   ["Google events loaded",events.length],
   ["Connection",data?.calendarConnected?"Google connected":"Action needed"]
  ].map(([key,value])=><div key={key} className="rounded-xl bg-[#f0f8fd] p-4"><p className="text-[10px] font-black uppercase text-[#6995ad]">{key}</p><p className="mt-2 text-lg font-black">{value}</p></div>)}</div>
  {data&&!data.calendarConnected&&<p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">Google Calendar isn't ready: {data.calendarError||"No connected owner."} Connect the founder account through Settings → Connections before approving requests. Pending requests remain saved.</p>}
  {message&&<p role="status" className="rounded-xl border border-[#c7e0ed] bg-[#eff9ff] p-3 text-xs leading-6">{message}</p>}
  <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
   <div className="rounded-xl border border-[#d7e7f0] p-4">
    <div className="flex items-center justify-between gap-3">
     <button className={button} onClick={()=>move(-1)}>←</button>
     <strong className="text-base">{new Date(Date.UTC(month.year,month.month,1)).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}</strong>
     <button className={button} onClick={()=>move(1)}>→</button>
    </div>
    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#88a4b4]">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=><span key={x}>{x}</span>)}</div>
    <div className="mt-2 grid grid-cols-7 gap-1">{monthDays.map((d,i)=>d?<button type="button" key={d} onClick={()=>setSelected(d)} className={"min-h-12 rounded-lg border px-1 py-2 text-xs font-bold "+(selected===d?"border-[#236a8f] bg-[#d9f2ff]":"border-[#e4edf4] hover:bg-[#f4fbff]")}>
     <span>{Number(d.slice(-2))}</span>
     {(eventGroups[d]||[]).length>0&&<span className="mt-1 block text-[10px] text-[#2989ab]">{eventGroups[d].length} •</span>}
    </button>:<div key={"empty-"+i}/>)}</div>
    <button className="mt-3 text-xs font-bold text-[#297ca2] underline" onClick={()=>setSelected("")}>Show all upcoming items</button>
    {data?.partial&&<p className="mt-2 text-[11px] text-amber-700">Showing only the first 150 Google events; open Google Calendar for the full list.</p>}
   </div>
   <div className="max-h-[570px] overflow-auto rounded-xl border border-[#d7e7f0] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-black">{selected?"Appointments · "+selected:"Upcoming & pending"}</h4>
     <select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border px-2 py-2 text-xs"><option value="all">All</option><option value="request">Requests</option><option value="google">Google events</option></select>
    </div>
    <div className="mt-4 space-y-3">{visible.map(x=><article key={x.kind+"-"+x.id} className="rounded-xl border border-[#deebf2] bg-[#f7fbfd] p-4">
     <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{x.kind==="request"?(x.business||x.siteBusinessName||x.name):x.summary}</strong>
      <span className={"rounded-full px-2 py-1 text-[10px] font-bold "+(x.kind==="request"?"bg-amber-100 text-amber-800":"bg-emerald-100 text-emerald-800")}>{x.kind==="request"?(x.status==="needs_review"?"Review needed":"Pending approval"):"Google event"}</span></div>
     <p className="mt-2 text-xs font-bold">{stamp(x.startTime)}</p>
     {x.kind==="request"?<><p className="mt-2 text-xs">{x.name} · {x.email} · {x.phone}</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#708b9e]">{x.notes||"No notes"}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={!!busy||!data?.calendarConnected} className="rounded-lg bg-[#225a49] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>action(x.id,"approve")}>Approve & add to Google</button>{x.status==="pending"&&<button disabled={!!busy} onClick={()=>action(x.id,"reject")} className={button}>Decline</button>}</div>
     </>:x.url&&<a href={x.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-[#317ca0] underline">Open in Google ↗</a>}
    </article>)}
    {!visible.length&&<p className="text-xs leading-6 text-[#859eaa]">No events or requests for this date and filter.</p>}
    </div>
   </div>
  </div>
  <p className="text-[11px] leading-5 text-[#86a0ae]">Times are displayed in America/New_York. Public submissions do not automatically block calendar slots. A confirmed appointment appears only after Google accepts the event and the founder approves it.</p>
 </section>;
}
