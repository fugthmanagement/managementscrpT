"use client";
import {useState} from "react";
import BrandSignalArt from "./brand-signal-art";
const timeLabel=value=>{
 try{const d=value?.toDate?.()||new Date(value?.seconds?value.seconds*1000:value);return Number.isNaN(d.getTime())?"Recent":d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
 catch{return "Recent"}
};
const short=value=>String(value||"").slice(0,135);
const StatIcon=({type})=><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#e6f6ff] text-xl font-black text-[#28739c]">{({calls:"☎",customers:"↗",appointments:"▣"})[type]}</span>;
export default function WorkspaceOverview({business,displayPlan,workspace,calls=[],leads=[],appointments=[],notifications=[],navigate}){
 const [activity,setActivity]=useState("calls");
 const cards=[
  {type:"calls",title:"Recent calls",number:calls.length,sub:"In your call inbox",action:"calls",featured:false},
  {type:"customers",title:"Customer leads",number:leads.length,sub:"Contacts you've saved",action:"customers",featured:true},
  {type:"appointments",title:"Appointments",number:appointments.length,sub:"Scheduled in your workspace",action:"customers",featured:false}
 ];
 const records=activity==="calls"?calls:activity==="leads"?leads:appointments;
 return <div className="space-y-6 sm:space-y-8">
  <section className="fugth-workspace-hero relative isolate overflow-visible rounded-[6px_36px_6px_6px] border border-[#24455c] bg-[#122434] px-5 py-8 text-white shadow-[0_30px_70px_rgba(21,57,87,.14)] sm:px-9 sm:py-11 xl:px-12">
   <div aria-hidden="true" className="absolute -right-28 -top-32 h-[430px] w-[430px] rounded-full border-[76px] border-[#95d7f7]/[.07]"/>
   <div aria-hidden="true" className="absolute -bottom-48 left-1/3 h-[370px] w-[370px] rounded-full bg-[#4a9dce]/[.10] blur-[80px]"/>
   <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
    <div>
     <div className="inline-flex items-center gap-2 rounded-full border border-[#7ac2e9]/30 bg-[#2e556d]/40 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-[#b6e5fb]"><span className="h-2 w-2 rounded-full bg-[#9ed9f5]"/> Your workspace / Overview</div>
     <h1 className="mt-7 max-w-2xl text-[clamp(2.8rem,5.5vw,5.6rem)] font-black leading-[.99] tracking-[-.072em]">The desk is yours.<br/><span className="fugth-editorial-serif text-[#b9e5fb]">Keep things moving.</span></h1>
     <p className="mt-5 max-w-lg text-sm leading-7 text-[#bad0df] sm:text-base">Everything for <strong className="text-white">{business}</strong>—calls, customer inquiries, bookings and your website—right where you need it.</p>
     <div className="mt-7 flex flex-wrap items-center gap-3"><button type="button" onClick={()=>navigate("calls")} className="inline-flex min-h-12 items-center gap-6 rounded-full bg-[#b9e5fb] px-6 text-xs font-black text-[#173f56] transition hover:bg-[#d9f3ff]">Open call desk <span aria-hidden="true">↗</span></button><button type="button" onClick={()=>navigate("customers")} className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/30 bg-white/10 px-6 text-xs font-black text-white hover:bg-white/20">View bookings <span aria-hidden="true">→</span></button></div>
     <p className="mt-7 text-[11px] text-[#96b8cb]"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#a5ddf7]"/> Account access: {displayPlan}</p>
    </div>
    <div className="relative w-full"><BrandSignalArt compact/></div>
   </div>
  </section>
  <div className="grid gap-3 md:grid-cols-3 sm:gap-4">
   {cards.map(item=><button key={item.type} type="button" onClick={()=>navigate(item.action)} className={"group flex flex-col rounded-[24px] border p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(22,64,94,.09)] sm:p-6 "+(item.featured?"border-[#99d6f5] bg-[#e6f6ff]":"border-[#dbeaf2] bg-white")}><div className="flex w-full items-center justify-between"><StatIcon type={item.type}/><span className="text-lg text-[#6e9bb3] transition group-hover:translate-x-1">↗</span></div><p className="mt-6 text-xs font-bold text-[#577e94]">{item.title}</p><strong className="mt-2 text-4xl font-black tracking-[-.06em] text-[#16384e] sm:text-5xl">{item.number}</strong><span className="mt-1 text-xs text-[#7e99a9]">{item.sub}</span></button>)}
  </div>
  <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_.8fr]">
   <section className="overflow-hidden rounded-[26px] border border-[#d7e7f0] bg-white shadow-[0_14px_42px_rgba(37,84,112,.035)]">
    <div className="border-b border-[#e2edf4] px-5 py-5 sm:px-7"><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#4284a8]">Your activity</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[24px] font-black tracking-[-.045em] text-[#17374a]">What needs your attention</h2><span className="rounded-full bg-[#eff8fd] px-3 py-1.5 text-[10px] font-bold text-[#477996]">Live account records</span></div></div>
    <div className="flex gap-2 overflow-x-auto border-b border-[#e8f0f5] px-5 py-3 sm:px-7" role="tablist" aria-label="Activity view">{[["calls","Calls",calls.length],["leads","Leads",leads.length],["appointments","Bookings",appointments.length]].map(([id,label,count])=><button key={id} type="button" role="tab" aria-selected={activity===id} onClick={()=>setActivity(id)} className={"shrink-0 rounded-full px-4 py-2 text-xs font-black transition "+(activity===id?"bg-[#1c3d52] text-white":"bg-[#f0f7fb] text-[#5a8197] hover:bg-[#e2f2fc]")}>{label} <span className="ml-1 opacity-70">{count}</span></button>)}</div>
    {records.length?<div className="divide-y divide-[#e8f0f5] px-5 sm:px-7">{records.slice(0,5).map((record,i)=><div key={record.id||i} className="flex items-start gap-3 py-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dff3ff] text-xs font-black text-[#266e94]">{(activity==="calls"?"☎":activity==="leads"?"↗":"▣")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#1c3b4e]">{short(activity==="calls"?record.callerName||record.customerName||record.from||record.phoneNumber||"Customer call":activity==="leads"?record.contactName||record.businessName||record.phone||"New lead":record.customerName||record.title||record.service||"Appointment")}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6c8596]">{short(activity==="calls"?record.summary||record.transcriptSummary||"Call recorded":activity==="leads"?record.notes||record.service||"New customer inquiry":record.service||record.date||"Appointment")}</p></div><span className="shrink-0 text-[10px] text-[#8aa1ae]">{timeLabel(record.createdAt)}</span></div>)}</div>:<div className="px-5 py-11 text-center sm:px-7"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f6ff] text-2xl text-[#5a9bbf]">◌</span><h3 className="mt-4 text-base font-black text-[#1b3e52]">Nothing in this view yet</h3><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#7892a2]">Your real {activity==="calls"?"calls":activity==="leads"?"customer leads":"bookings"} will appear here as they're added to your account.</p></div>}
    <div className="border-t border-[#e8f0f5] bg-[#fbfdff] px-5 py-4 sm:px-7"><button type="button" onClick={()=>navigate(activity==="calls"?"calls":"customers")} className="text-xs font-black text-[#2a78a2] hover:underline">Open {activity==="calls"?"call inbox":"customer desk"} →</button></div>
   </section>
   <div className="space-y-5">
    <section className="rounded-[25px] border border-[#d4e8f4] bg-[#ecf8ff] p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#367c9e]">Your next steps</p><h2 className="mt-3 text-[23px] font-black tracking-[-.04em] text-[#1a425a]">Set up once. Use it every day.</h2><div className="mt-6 space-y-2">{[{n:"01",label:"Business details",tip:"Confirm services and contact information",dest:"settings"},{n:"02",label:"Try the receptionist",tip:"Hear your own business call demo",dest:"calls"},{n:"03",label:"Connect Google Calendar",tip:"Sync bookings to your calendar and iPhone",dest:"google-calendar"}].map(item=><button type="button" key={item.n} onClick={()=>navigate(item.dest)} className="flex w-full items-start gap-4 rounded-xl border border-[#cde4f2] bg-white/90 p-4 text-left transition hover:border-[#87c8ea] hover:shadow-sm"><span className="font-black text-[#62a8cc]">{item.n}</span><span className="flex-1"><strong className="block text-xs font-black text-[#274b60]">{item.label}</strong><span className="mt-1 block text-[11px] leading-5 text-[#7290a2]">{item.tip}</span></span><span className="text-sm text-[#377ea5]">↗</span></button>)}</div></section>
    {notifications.length>0&&<section className="rounded-[24px] border border-[#dbeaf3] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#478eb0]">Recent notifications</p><p className="mt-2 text-sm font-black text-[#193b50]">{notifications.length} recorded updates</p><div className="mt-3 space-y-2">{notifications.slice(0,3).map((n,i)=><div key={n.id||i} className="rounded-xl bg-[#f4faff] p-3 text-[11px] leading-5 text-[#658397]">{short(n.text||"New activity")} <span className="text-[#93a9b6]">{timeLabel(n.createdAt)}</span></div>)}</div></section>}
   </div>
  </div>
 </div>;
}
