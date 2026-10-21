"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {collection,limit,onSnapshot,orderBy,query} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
const btn="rounded-xl border border-[#cbdfea] bg-white px-3 py-2.5 text-xs font-black text-[#265777] disabled:opacity-40";
const pad=x=>String(x).padStart(2,"0");
const dayOf=s=>{const d=new Date(s);if(!Number.isFinite(d.getTime()))return "";
 const v=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",
  day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(d).map(p=>[p.type,p.value]));
 return [v.year,v.month,v.day].join("-");
};
const time=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?
 d.toLocaleString("en-US",{timeZone:"America/New_York",dateStyle:"medium",timeStyle:"short"})+" ET":"Time not set"};
const monthNow=()=>{const p=dayOf(new Date()).split("-").map(Number);return {y:p[0]||2026,m:(p[1]||1)-1}};
export default function FounderBookingCalendar({user,compact=false}){
 const [view,setView]=useState(null),[month,setMonth]=useState(monthNow),[day,setDay]=useState("");
 const [blockedDate,setBlockedDate]=useState(""),[slots,setSlots]=useState([]),[blockAt,setBlockAt]=useState("");
 const [busy,setBusy]=useState(""),[note,setNote]=useState("");
 const refresh=useCallback(async()=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Please sign in again.");
  const r=await fetch("/api/dev/founder-bookings",{cache:"no-store",headers:{Authorization:"Bearer "+token}});
  const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error||"Couldn't load your private calendar.");
  setView(v);return v;
 },[]);
 useEffect(()=>{refresh().catch(e=>setNote(e.message))},[refresh]);
 useEffect(()=>{
  if(!user?.uid||!db)return;
  return onSnapshot(query(collection(db,"users",user.uid,"notifications"),orderBy("createdAt","desc"),limit(10)),
   ()=>refresh().catch(()=>{}),()=>{});
 },[user?.uid,refresh]);
 useEffect(()=>{
  if(!blockedDate){setSlots([]);return}let alive=true;
  fetch("/api/public/founder-booking?date="+encodeURIComponent(blockedDate),{cache:"no-store"})
   .then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||"Cannot check slots");
    if(alive){setSlots(v.slots||[]);setBlockAt("")}
   }).catch(e=>{if(alive)setNote(e.message)});
  return()=>{alive=false};
 },[blockedDate]);
 const bookings=view?.bookings||[],reservations=bookings.filter(x=>x.status==="confirmed");
 const blocks=(view?.reservedSlots||[]).filter(x=>x.status==="blocked");
 const notifications=view?.notifications||[],unread=notifications.filter(x=>x.read!==true);
 const cells=useMemo(()=>{
  const first=new Date(Date.UTC(month.y,month.m,1)),start=first.getUTCDay();
  const count=new Date(Date.UTC(month.y,month.m+1,0)).getUTCDate();
  return [...Array(start).fill(null),...Array.from({length:count},(_,i)=>month.y+"-"+pad(month.m+1)+"-"+pad(i+1))];
 },[month]);
 const records=useMemo(()=>{
  const all=[
   ...reservations.map(x=>({...x,kind:"booked"})),
   ...blocks.map(x=>({...x,kind:"blocked"}))
  ].sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
  return day?all.filter(x=>dayOf(x.startTime)===day):all.filter(x=>new Date(x.startTime).getTime()>Date.now()-3600000).slice(0,60);
 },[reservations,blocks,day]);
 const groups=useMemo(()=>{
  const obj={};for(const b of [...reservations,...blocks]){const d=dayOf(b.startTime);obj[d]=(obj[d]||0)+1}return obj;
 },[reservations,blocks]);
 async function action(payload,question){
  if(question&&!window.confirm(question))return;
  setBusy(payload.action);setNote("");
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
   const r=await fetch("/api/dev/founder-bookings",{method:"POST",cache:"no-store",
    headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(result.error||"Calendar update failed.");
   setNote(result.message||"Calendar updated.");await refresh();
   if(payload.action==="block"||payload.action==="unblock")setBlockedDate("");
  }catch(e){setNote(e.message)}finally{setBusy("")}
 }
 const move=n=>{setMonth(p=>{const d=new Date(Date.UTC(p.y,p.m+n,1));return {y:d.getUTCFullYear(),m:d.getUTCMonth()}});setDay("")};
 return <section className="space-y-5 rounded-[24px] border border-[#d5e6ee] bg-white p-5 text-[#23485d] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#649ac0]">FUGTH / PRIVATE FOUNDER CALENDAR</p>
    <h3 className="mt-2 text-xl font-black sm:text-2xl">My bookings & notifications</h3>
    <p className="mt-2 text-xs leading-6 text-[#6c8d9e]">Appointments book instantly into Firestore. Guests see open times only. No Google Calendar approval or connection required.</p></div>
   <div className="flex flex-wrap gap-2"><a href="/book" target="_blank" rel="noopener noreferrer" className={btn}>Public booking page ↗</a><button className={btn} onClick={()=>refresh().catch(e=>setNote(e.message))}>Refresh</button></div>
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
   {[["Confirmed bookings",reservations.length],["Blocked times",blocks.length],["Unread alerts",unread.length]].map(([k,v])=>
    <div key={k} className="rounded-xl bg-[#eff8fc] p-4"><p className="text-[10px] font-black uppercase text-[#7698aa]">{k}</p><p className="mt-2 text-2xl font-black">{v}</p></div>)}
  </div>
  {unread.length>0&&<div className="rounded-xl border border-[#c6e1ee] bg-[#f2faff] p-4">
   <h4 className="text-sm font-black">New appointment notifications</h4>
   <div className="mt-3 space-y-2">{unread.slice(0,8).map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8e9f3] pb-2 text-xs">
    <span>{x.text||x.title}</span><button className={btn} disabled={!!busy} onClick={()=>action({action:"mark_read",id:x.id})}>Mark read</button>
   </div>)}</div>
  </div>}
  {note&&<p role="status" className="rounded-xl bg-[#eaf6fc] p-3 text-xs leading-6">{note}</p>}
  <div className={"grid gap-5 "+(compact?"":"lg:grid-cols-[.94fr_1.06fr]")}>
   <div className="rounded-2xl border border-[#d9e9f1] p-4">
    <div className="flex items-center justify-between gap-3"><button onClick={()=>move(-1)} className={btn}>←</button><strong>{new Date(Date.UTC(month.y,month.m,1)).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}</strong><button onClick={()=>move(1)} className={btn}>→</button></div>
    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#84a3b3]">{["Su","Mo","Tu","We","Th","Fr","Sa"].map(x=><span key={x}>{x}</span>)}</div>
    <div className="mt-2 grid grid-cols-7 gap-1">{cells.map((d,i)=>d?<button key={d} onClick={()=>setDay(d)} className={"min-h-12 rounded-lg border p-1.5 text-xs font-bold "+(day===d?"border-[#438caf] bg-[#d8efff]":"border-[#e2edf4] hover:bg-[#f4faff]")}>
     {Number(d.slice(-2))}{groups[d]>0&&<span className="block text-[10px] text-[#2788ae]">{groups[d]} ●</span>}
    </button>:<div key={"empty"+i}/>)}</div>
    <button className="mt-3 text-xs font-bold text-[#387fa3] underline" onClick={()=>setDay("")}>Show all upcoming appointments</button>
   </div>
   <div className="max-h-[540px] space-y-3 overflow-y-auto rounded-2xl border border-[#d9e9f1] p-4">
    <strong className="text-sm">{day?"Bookings on "+day:"Upcoming bookings"}</strong>
    {records.map(x=><article className="rounded-xl border border-[#e2eaf0] bg-[#f7fbfe] p-4" key={x.kind+"_"+x.id}>
     <div className="flex items-center justify-between gap-2"><strong className="text-xs">{x.kind==="blocked"?"Founder unavailable":x.business||x.siteBusinessName||x.name}</strong>
      <span className={"rounded-full px-2 py-1 text-[10px] font-bold "+(x.kind==="blocked"?"bg-slate-200":"bg-emerald-100 text-emerald-800")}>{x.kind==="blocked"?"Blocked":"Confirmed"}</span></div>
     <p className="mt-2 text-xs font-black">{time(x.startTime)}</p>
     {x.kind==="booked"&&<p className="mt-2 break-words text-xs">{x.name} · {x.email} · {x.phone}<br/>{x.notes||"No notes"}</p>}
     <button disabled={!!busy} className={"mt-3 "+btn} onClick={()=>action(x.kind==="booked"?{action:"cancel",id:x.id}:{action:"unblock",slotId:x.id},
      x.kind==="booked"?"Cancel this booking and reopen the slot? You must notify the guest separately.":"Reopen this blocked appointment slot?")}>
      {x.kind==="booked"?"Cancel & reopen slot":"Remove block"}
     </button>
    </article>)}
    {!records.length&&<p className="text-xs text-[#7995a6]">No bookings for this date.</p>}
   </div>
  </div>
  <div className="rounded-xl border border-[#c8e4ef] bg-[#f2faff] p-4">
   <h4 className="text-sm font-black">Block an appointment time</h4>
   <p className="mt-2 text-xs leading-6 text-[#708da0]">If you're unavailable, block the same slot visitors see. Their booking page will gray it out.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">Date<input type="date" className="mt-2 w-full rounded-xl border bg-white p-3" value={blockedDate} onChange={e=>setBlockedDate(e.target.value)}/></label>
    <label className="text-xs font-bold">Available time<select className="mt-2 w-full rounded-xl border bg-white p-3" value={blockAt} onChange={e=>setBlockAt(e.target.value)}>
     <option value="">Choose open time</option>{slots.filter(x=>x.available).map(x=><option key={x.startTime} value={x.startTime}>{x.label}</option>)}</select></label>
   </div>
   <button className="mt-3 rounded-xl bg-[#235876] px-4 py-3 text-xs font-black text-white disabled:opacity-40" disabled={!blockAt||!!busy} onClick={()=>action({action:"block",startTime:blockAt},"Block this time so guests cannot book it?")}>Block this time</button>
  </div>
  {view?.partial&&<p className="text-[11px] text-[#899aab]">Showing recent 250 bookings. Older appointments remain stored in Firestore.</p>}
 </section>;
}
