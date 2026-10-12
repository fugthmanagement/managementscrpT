"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
const catalog = [
  { name:"Google Calendar", tag:"Calendar", categories:["All industries"], type:"google", icon:"31", description:"Secure Google sign-in, check availability and create appointments in your primary calendar.", state:"connectable" },
  { name:"Microsoft 365 / Outlook", tag:"Calendar", categories:["All industries"], icon:"O", description:"Outlook calendars and Microsoft Bookings.", state:"planned" },
  { name:"Calendly", tag:"Scheduling", categories:["All industries"], icon:"C", description:"Scheduling links, round-robin booking and event notifications.", state:"planned" },
  { name:"Cal.com", tag:"Scheduling", categories:["All industries"], icon:"Cal", description:"Bookable schedules and custom event types.", state:"planned" },
  { name:"Square Appointments", tag:"Scheduling / Payments", categories:["Beauty & Wellness","Retail & Services"], icon:"□", description:"Services, staff availability and appointments.", state:"planned" },
  { name:"Acuity Scheduling", tag:"Scheduling", categories:["Beauty & Wellness","All industries"], icon:"A", description:"Appointment types, calendars and intake workflows.", state:"planned" },
  { name:"Vagaro", tag:"Salon Management", categories:["Beauty & Wellness"], icon:"V", description:"Beauty and wellness bookings and service catalogs.", state:"planned" },
  { name:"Mindbody", tag:"Wellness", categories:["Beauty & Wellness"], icon:"M", description:"Classes, appointments and wellness scheduling.", state:"planned" },
  { name:"Open Dental", tag:"Dental Practice", categories:["Dental & Medical"], icon:"OD", description:"Dental appointment and patient-system integration; requires a compliant setup.", state:"planned", sensitive:true },
  { name:"Dentrix / Eaglesoft", tag:"Dental Practice", categories:["Dental & Medical"], icon:"D", description:"Dental practice management; vendor access and privacy agreements required.", state:"planned", sensitive:true },
  { name:"Weave", tag:"Patient Communications", categories:["Dental & Medical"], icon:"W", description:"Practice phone and appointment workflows; requires approved integration.", state:"planned", sensitive:true },
  { name:"Jane App", tag:"Clinic Scheduling", categories:["Dental & Medical"], icon:"J", description:"Provider calendars and clinic workflow; requires compliant setup.", state:"planned", sensitive:true },
  { name:"Clio", tag:"Legal CRM", categories:["Legal"], icon:"Cl", description:"Legal client intake and matters, with client confidentiality safeguards.", state:"planned" },
  { name:"MyCase", tag:"Legal Practice", categories:["Legal"], icon:"MC", description:"Law firm contacts, intake and appointments.", state:"planned" },
  { name:"Jobber", tag:"Field Service", categories:["Home Services","Automotive"], icon:"J", description:"Customer requests, quotes, schedules, and field jobs.", state:"planned" },
  { name:"ServiceTitan", tag:"Field Service", categories:["Home Services"], icon:"ST", description:"Service bookings and contractor dispatch operations.", state:"planned" },
  { name:"Housecall Pro", tag:"Field Service", categories:["Home Services"], icon:"HP", description:"Home service calls, quotes, scheduling and job workflows.", state:"planned" },
  { name:"HubSpot", tag:"CRM", categories:["Sales & Marketing","All industries"], icon:"H", description:"Contacts, pipelines and follow-up campaigns.", state:"planned" },
  { name:"Salesforce", tag:"CRM", categories:["Sales & Marketing","All industries"], icon:"SF", description:"Enterprise CRM contacts and activity sync.", state:"planned" },
  { name:"Zapier / Make", tag:"Automation", categories:["All industries"], icon:"↗", description:"Bridge additional tools through automation workflows.", state:"planned" },
];
const industries=["All industries","Dental & Medical","Legal","Home Services","Beauty & Wellness","Automotive","Sales & Marketing","Retail & Services"];
async function headers(){const token=await auth.currentUser?.getIdToken();if(!token)throw new Error("Sign in again to manage integrations.");return { Authorization:`Bearer ${token}`,"Content-Type":"application/json" };}
export default function IntegrationsHub(){
  const [filter,setFilter]=useState("All industries");
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState({connected:false,configured:false});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [meeting,setMeeting]=useState({title:"New customer consultation",startTime:"",endTime:""});
  async function refresh(){
    try{const r=await fetch("/api/integrations/google",{headers:await headers(),cache:"no-store"});const data=await r.json();if(!r.ok)throw Error(data.error||"Could not read integrations.");setStatus(data);}
    catch(e){setMessage(e.message);}
    finally{setLoading(false);}
  }
  useEffect(()=>{refresh();const status=new URLSearchParams(window.location.search).get("integration");if(status){setMessage(status==="google-connected"?"Google Calendar successfully connected.":status==="authorization-cancelled"?"Connection cancelled.":"Calendar connection did not complete. Try again.");}},[]);
  async function connect(){
    setBusy("connect");setMessage("");
    try{
      const r=await fetch("/api/integrations/google",{method:"POST",headers:await headers()});const data=await r.json();if(!r.ok||!data.url)throw Error(data.error||"Could not start Google sign-in.");
      window.location.assign(data.url);
    }catch(e){setMessage(e.message);setBusy("");}
  }
  async function disconnect(){
    if(!window.confirm("Disconnect your Google Calendar from Fugth Management?"))return;
    setBusy("disconnect");setMessage("");
    try{const r=await fetch("/api/integrations/google",{method:"DELETE",headers:await headers()});const data=await r.json();if(!r.ok)throw Error(data.error||"Could not disconnect.");await refresh();setMessage("Google Calendar disconnected.");}
    catch(e){setMessage(e.message);}finally{setBusy("");}
  }
  async function book(event){
    event.preventDefault();setBusy("book");setMessage("");
    try{
      const r=await fetch("/api/integrations/google/book",{method:"POST",headers:await headers(),body:JSON.stringify({...meeting,startTime:new Date(meeting.startTime).toISOString(),endTime:new Date(meeting.endTime).toISOString()})});
      const data=await r.json();if(!r.ok)throw Error(data.error||"Could not create appointment.");
      setMessage("Appointment added to Google Calendar."+ (data.eventUrl?" You can view it in your connected calendar.":""));
    }catch(e){setMessage(e.message||"Could not create event.");}finally{setBusy("");}
  }
  const filtered=catalog.filter(x=>(filter==="All industries"||x.categories.includes(filter)||x.categories.includes("All industries"))&&(x.name+" "+x.tag+" "+x.description).toLowerCase().includes(query.toLowerCase()));
  return <section className="space-y-6">
    <div className="overflow-hidden rounded-[2rem] border border-sky-200/15 bg-gradient-to-br from-[#243ea5] via-[#3154e8] to-[#77a1ed] p-7 text-white shadow-2xl sm:p-9">
      <span className="text-xs font-black uppercase tracking-[.18em] text-indigo-100">Fugth Connect · Integration Marketplace</span>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div><h2 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl">Make Fugth part of the tools you already use.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-indigo-100">Calendars, scheduling tools, CRMs and industry software. Connect your existing workflow rather than starting over.</p></div><div className="rounded-2xl bg-white/15 px-5 py-4 text-center"><div className="text-3xl font-black">{catalog.length}</div><div className="text-xs font-bold text-indigo-100">catalog entries</div></div></div>
    </div>
    {message&&<div role="status" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm text-white">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-[1.6rem] border border-emerald-300/25 bg-[#12352f] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl font-black text-emerald-600">31</span><div><h3 className="text-xl font-black">Google Calendar</h3><p className="text-xs text-emerald-100/80">First native scheduling connector</p></div></div><span className="rounded-full bg-emerald-100/15 px-3 py-1.5 text-xs font-bold">{loading?"Checking":status.connected?"Connected":status.configured?"Ready to connect":"Setup required"}</span></div>
        <p className="mt-5 text-sm leading-7 text-emerald-50/90">Securely authorize your own calendar. Fugth can check whether a time is free and add an appointment on request, without putting Google credentials in the browser.</p>
        <div className="mt-5 flex flex-wrap gap-3">
        {!status.connected?<button disabled={busy!==""||!status.configured} onClick={connect} className="rounded-xl bg-[#daf4a1] px-5 py-3 text-sm font-extrabold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">{busy==="connect"?"Connecting...":status.configured?"Connect Google Calendar":"Requires administrator setup"}</button>:<button disabled={busy!==""} onClick={disconnect} className="rounded-xl border border-white/35 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Disconnect calendar</button>}
        </div>
        {!status.configured&&<p className="mt-4 text-xs text-emerald-100/80">The site administrator must configure Google OAuth, Firebase Admin, and encryption credentials first.</p>}
      </div>
      <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/90 p-6 text-white">
        <h3 className="text-xl font-black">Try an appointment</h3><p className="mt-2 text-xs leading-6 text-slate-400">Available after Google Calendar is connected. Creates an event only when you submit this form and the time is free.</p>
        <form className="mt-5 space-y-3" onSubmit={book}>
          <label className="block text-xs font-semibold text-slate-300">Appointment title<input required maxLength={120} value={meeting.title} onChange={e=>setMeeting({...meeting,title:e.target.value})} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white outline-none focus:border-blue-300"/></label>
          <label className="block text-xs font-semibold text-slate-300">Start time<input type="datetime-local" required value={meeting.startTime} onChange={e=>setMeeting({...meeting,startTime:e.target.value})} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white [color-scheme:dark]"/></label>
          <label className="block text-xs font-semibold text-slate-300">End time<input type="datetime-local" required value={meeting.endTime} onChange={e=>setMeeting({...meeting,endTime:e.target.value})} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white [color-scheme:dark]"/></label>
          <button disabled={!status.connected||busy!==""} className="w-full rounded-xl bg-blue-400 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{busy==="book"?"Checking availability...":"Check and add appointment"}</button>
        </form>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">Avoid patient health details, legal case information or other sensitive personal information in this basic integration.</p>
      </div>
    </div>
    <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/90 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h3 className="text-xl font-black">Explore upcoming integrations</h3><p className="mt-2 text-sm text-slate-400">Choose an industry to find the apps your customers may already use. Only Google Calendar is currently connectable.</p></div><input aria-label="Search integrations" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search apps or workflows..." className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-400 md:w-64"/></div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-3">{industries.map(x=><button key={x} onClick={()=>setFilter(x)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${filter===x?"border-blue-300 bg-blue-400 text-slate-950":"border-white/10 text-slate-300 hover:border-white/30"}`}>{x}</button>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(x=><article key={x.name} className="rounded-2xl border border-white/10 bg-[#131f30] p-5"><div className="flex items-start justify-between gap-2"><span className="grid h-11 min-w-11 place-items-center rounded-xl bg-blue-400/15 px-2 text-lg font-black text-blue-200">{x.icon}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${x.state==="connectable"?"bg-emerald-400/10 text-emerald-300":"bg-white/10 text-slate-400"}`}>{x.state==="connectable"?"Connectable after setup":"Planned"}</span></div><h4 className="mt-4 text-base font-black">{x.name}</h4><p className="mt-1 text-[11px] font-bold uppercase tracking-[.08em] text-blue-200">{x.tag}</p><p className="mt-3 text-xs leading-6 text-slate-400">{x.description}</p>{x.sensitive&&<p className="mt-2 text-[11px] text-amber-200">Healthcare privacy review required</p>}</article>)}</div>
      {filtered.length===0&&<p className="p-8 text-center text-slate-400">No matching apps. Try another industry or search term.</p>}
    </div>
  </section>;
}
