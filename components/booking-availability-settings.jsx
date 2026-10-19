"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
import {WEEK_DAYS,cleanAvailability,defaultAvailability} from "../lib/booking-availability";
const input="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900";
export default function BookingAvailabilitySettings({user}){
 const [value,setValue]=useState(defaultAvailability()),[busy,setBusy]=useState(false),
  [error,setError]=useState(""),[saved,setSaved]=useState(""),[date,setDate]=useState("");
 useEffect(()=>{
  if(!user?.uid||!auth)return;
  let mounted=true;
  (async()=>{
   try{
    const token=await auth.currentUser?.getIdToken();
    const r=await fetch("/api/booking/availability",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
    const result=await r.json();
    if(!r.ok)throw Error(result.error||"Booking hours unavailable");
    if(mounted)setValue(cleanAvailability(result.availability||{}));
   }catch(e){if(mounted)setError(e.message||"Could not load booking hours.");}
  })();
  return()=>{mounted=false};
 },[user?.uid]);
 async function save(){
  setBusy(true);setError("");setSaved("");
  try{
   if(!auth?.currentUser)throw Error("Sign in to save booking availability.");
   const settings=cleanAvailability({...value,updatedAt:new Date().toISOString()});
   const token=await auth.currentUser.getIdToken();
   const response=await fetch("/api/booking/availability",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({availability:settings})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Could not save booking hours.");
   setValue(cleanAvailability(result.availability));setSaved("Business hours and blocked dates saved. Google bookings will respect these rules.");
  }catch(e){setError(e.message||"Could not save calendar settings.");}
  finally{setBusy(false);}
 }
 function dayChange(day,patch){setValue(s=>({...s,week:{...s.week,[day]:{...s.week[day],...patch}}}));setSaved("");}
 function block(){if(!date||value.blockedDates.includes(date))return;setValue(s=>({...s,blockedDates:[...s.blockedDates,date].sort().slice(0,90)}));setDate("");setSaved("");}
 return <section className="rounded-[22px] border border-zinc-200 bg-white p-5 sm:p-7">
  <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">FUGTH BOOKING RULES</p>
  <h3 className="mt-3 text-xl font-bold text-zinc-950">Your open hours and days off.</h3>
  <p className="mt-2 text-sm leading-6 text-zinc-600">Choose when customers can be booked. Closed days, blocked dates, and existing calendar events are never advertised as available. Keep this disabled until your hours are accurate.</p>
  <label className="mt-5 flex items-center gap-3 rounded-xl bg-zinc-100 p-4 text-sm font-semibold"><input type="checkbox" checked={value.enabled} onChange={e=>setValue(s=>({...s,enabled:e.target.checked}))}/>Enforce my opening hours for bookings</label>
  <label className="mt-5 block text-xs font-bold text-zinc-600">Business timezone<input value={value.timeZone} onChange={e=>setValue(s=>({...s,timeZone:e.target.value}))} className={"mt-2 block w-full max-w-xs "+input} placeholder="America/New_York"/></label>
  <div className="mt-5 space-y-2">{WEEK_DAYS.map(([day,label])=><div key={day} className="grid grid-cols-[1fr_1fr] items-center gap-3 rounded-xl border border-zinc-200 bg-[#fafafa] p-3 sm:grid-cols-[1.1fr_1fr_1fr]"><label className="flex items-center gap-2 text-xs font-bold text-zinc-800"><input type="checkbox" checked={value.week[day]?.open===true} onChange={e=>dayChange(day,{open:e.target.checked})}/>{label}</label><label className="text-[10px] text-zinc-500">Open<input type="time" value={value.week[day]?.start||"09:00"} disabled={!value.week[day]?.open} onChange={e=>dayChange(day,{start:e.target.value})} className={"mt-1 w-full "+input}/></label><label className="col-start-2 text-[10px] text-zinc-500 sm:col-auto">Close<input type="time" value={value.week[day]?.end||"17:00"} disabled={!value.week[day]?.open} onChange={e=>dayChange(day,{end:e.target.value})} className={"mt-1 w-full "+input}/></label></div>)}</div>
  <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-sm font-bold">Blocked dates</p><p className="mt-1 text-xs text-zinc-600">Vacations, fully booked days, and days you don't want any new appointments.</p>
   <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Date to block" type="date" value={date} onChange={e=>setDate(e.target.value)} className={input}/><button type="button" onClick={block} className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white">Block date</button></div>
   <div className="mt-3 flex flex-wrap gap-2">{value.blockedDates.map(d=><button type="button" key={d} onClick={()=>setValue(s=>({...s,blockedDates:s.blockedDates.filter(x=>x!==d)}))} className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700">{d} ×</button>)}</div>
  </div>
  {(error||saved)&&<p role="status" className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">{error||saved}</p>}
  <button type="button" disabled={busy} onClick={save} className="mt-5 rounded-xl bg-black px-6 py-3.5 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":"Save business hours"}</button>
 </section>;
}
