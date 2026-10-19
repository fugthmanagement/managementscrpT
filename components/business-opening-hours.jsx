"use client";
import {PUBLIC_WEEK,cleanOpeningHours,formatOpeningHours} from "../lib/business-hours";
export default function BusinessOpeningHours({value,onChange}){
 const week=cleanOpeningHours(value);
 function patch(day,next){onChange({...week,[day]:{...week[day],...next}});}
 return <section className="sm:col-span-2 rounded-[20px] border border-[#d5e8f3] bg-[#f2f9fe] p-5">
  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#3c819e]">Your public opening hours</p>
  <h4 className="mt-2 text-lg font-black tracking-tight text-[#204457]">Tell visitors when you're open.</h4>
  <p className="mt-2 text-xs leading-6 text-[#698ba0]">These hours appear on your business website. Appointment availability is a separate paid booking feature in Connections.</p>
  <div className="mt-4 space-y-2">{PUBLIC_WEEK.map(([day,title])=><div key={day} className="grid grid-cols-[1fr_1fr] items-center gap-2 rounded-xl border border-[#dbe9f2] bg-white px-3 py-3 sm:grid-cols-[1.1fr_1fr_1fr]"><label className="flex items-center gap-2 text-xs font-bold text-[#3f6378]"><input type="checkbox" checked={week[day].open} onChange={e=>patch(day,{open:e.target.checked})} className="h-4 w-4 accent-[#338bb6]"/>{title}</label><label className="text-[10px] font-bold text-[#7793a3]">Opens<input type="time" disabled={!week[day].open} value={week[day].start} onChange={e=>patch(day,{start:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#cfe4ee] p-2 text-xs text-[#17435c] disabled:opacity-40"/></label><label className="col-start-2 text-[10px] font-bold text-[#7793a3] sm:col-auto">Closes<input type="time" disabled={!week[day].open} value={week[day].end} onChange={e=>patch(day,{end:e.target.value})} className="mt-1 block w-full rounded-lg border border-[#cfe4ee] p-2 text-xs text-[#17435c] disabled:opacity-40"/></label></div>)}</div>
  <p className="mt-4 rounded-lg bg-[#e3f3fc] p-3 text-xs font-semibold leading-6 text-[#426c81]">Website preview: {formatOpeningHours(week)||"Not set yet — choose the days and hours above."}</p>
 </section>;
}
