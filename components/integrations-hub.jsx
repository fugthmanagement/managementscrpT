"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import WebhookIntegration from "./webhook-integration";

const categories = ["All", "Dental & medical", "Legal", "Home services", "Beauty", "Automotive", "CRM"];
const providers = [
  ["Microsoft Outlook","Calendar",["All","Legal","Dental & medical"],"Planned"],
  ["Calendly","Scheduling",["All","CRM"],"Planned"],
  ["Acuity","Scheduling",["All","Beauty"],"Planned"],
  ["Square Appointments","Appointments",["All","Beauty"],"Planned"],
  ["Open Dental","Dental practice",["Dental & medical"],"Privacy review"],
  ["Dentrix","Dental practice",["Dental & medical"],"Privacy review"],
  ["Jane","Clinic",["Dental & medical"],"Privacy review"],
  ["Clio","Legal management",["Legal"],"Planned"],
  ["MyCase","Legal management",["Legal"],"Planned"],
  ["Jobber","Field service",["Home services"],"Planned"],
  ["Housecall Pro","Field service",["Home services"],"Planned"],
  ["ServiceTitan","Field service",["Home services"],"Planned"],
  ["Vagaro","Appointments",["Beauty"],"Planned"],
  ["Mindbody","Wellness",["Beauty"],"Planned"],
  ["HubSpot","CRM",["CRM","All"],"Planned"],
  ["Salesforce","CRM",["CRM","All"],"Planned"],
  ["Zapier / Make","Automation",["All","CRM"],"Webhook bridge in development"]
];
async function secureHeaders() {
  const token = await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in to connect a provider.");
  return { Authorization: `Bearer ${token}`, "Content-Type":"application/json" };
}
export default function IntegrationsHub(){
  const [category,setCategory]=useState("All");
  const [search,setSearch]=useState("");
  const [google,setGoogle]=useState({configured:false,connected:false});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState("");
  const [event,setEvent]=useState({title:"Customer consultation",startTime:"",endTime:""});
  async function status(){
    try{const r=await fetch("/api/integrations/google",{headers:await secureHeaders(),cache:"no-store"});const data=await r.json();if(r.ok)setGoogle(data);}catch(e){setMessage(e.message);}
  }
  useEffect(()=>{status();const q=new URLSearchParams(window.location.search).get("integration");if(q)setMessage(q==="google-connected"?"Google Calendar connected.":q==="authorization-cancelled"?"Connection cancelled.":"Calendar authorization could not be completed.");},[]);
  async function connect(){
    setBusy("connect");setMessage("");
    try{const r=await fetch("/api/integrations/google",{method:"POST",headers:await secureHeaders()});const data=await r.json();if(!r.ok||!data.url)throw Error(data.error||"Could not begin calendar connection.");window.location.assign(data.url);}
    catch(e){setMessage(e.message);setBusy("");}
  }
  async function disconnect(){
    if(!window.confirm("Disconnect Google Calendar?"))return;
    setBusy("disconnect");setMessage("");
    try{const r=await fetch("/api/integrations/google",{method:"DELETE",headers:await secureHeaders()});if(!r.ok)throw Error("Could not disconnect.");await status();setMessage("Google Calendar disconnected.");}catch(e){setMessage(e.message);}finally{setBusy("");}
  }
  async function createAppointment(e){
    e.preventDefault();setBusy("booking");setMessage("");
    try{
      const payload={title:event.title,startTime:new Date(event.startTime).toISOString(),endTime:new Date(event.endTime).toISOString()};
      const r=await fetch("/api/integrations/google/book",{method:"POST",headers:await secureHeaders(),body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||"Calendar event could not be created.");setMessage("Appointment created in your connected calendar.");
    }catch(e){setMessage(e.message);}finally{setBusy("");}
  }
  const results=providers.filter(p=>(category==="All"||p[2].includes("All")||p[2].includes(category))&&p.join(" ").toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-5 text-zinc-950">
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">BUSINESS CONNECTIONS</p><h2 className="mt-4 text-3xl font-black tracking-tight">Keep the software you already use.</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">A simple place to authorize calendars, connect automation tools and see which integrations are ready. We don't mark providers as connected until authorization succeeds.</p></div>
    {message&&<div role="status" className="rounded-xl border border-zinc-300 bg-zinc-100 p-4 text-sm text-zinc-800">{message}</div>}
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black">Google Calendar</h3><span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-black">{google.connected?"Connected":google.configured?"Available to connect":"Configuration needed"}</span></div><p className="mt-3 text-sm leading-7 text-zinc-600">Authorize your business calendar to check busy times and create an event after you confirm the details.</p><div className="mt-6 flex flex-wrap gap-2">{!google.connected?<button type="button" disabled={!google.configured||busy!==""} onClick={connect} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{busy==="connect"?"Connecting...":"Connect Google Calendar"}</button>:<button type="button" disabled={busy!==""} onClick={disconnect} className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-black">Disconnect</button>}</div>{!google.configured&&<p className="mt-4 text-xs leading-6 text-amber-800">Your administrator needs to configure Google OAuth and Firebase server credentials before this connection can be activated.</p>}</div>
      <div className="rounded-3xl border border-zinc-200 bg-white p-6"><h3 className="text-lg font-black">Try a calendar appointment</h3><p className="mt-2 text-xs leading-6 text-zinc-500">This saves a real Google Calendar event only when you submit and the selected period is free.</p><form onSubmit={createAppointment} className="mt-5 space-y-3">{[["Appointment name","title","text"],["Start time","startTime","datetime-local"],["End time","endTime","datetime-local"]].map(([label,key,type])=><label key={key} className="block text-xs font-bold text-zinc-600">{label}<input required type={type} maxLength={type==="text"?120:undefined} value={event[key]} onChange={e=>setEvent({...event,[key]:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"/></label>)}<button disabled={!google.connected||busy!==""} className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{busy==="booking"?"Checking calendar...":"Check and save appointment"}</button></form></div>
    </div>
    <WebhookIntegration />
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">UPCOMING CONNECTORS</p><h3 className="mt-2 text-xl font-black">Available on our roadmap</h3><p className="mt-2 text-xs leading-6 text-zinc-500">These are not activated integrations. Some require provider approval and privacy review.</p></div><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search providers" placeholder="Search providers..." className="rounded-xl border border-zinc-300 p-3 text-sm text-zinc-950"/></div><div className="mt-5 flex gap-2 overflow-x-auto pb-3">{categories.map(c=><button type="button" key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${category===c?"border-zinc-900 bg-zinc-950 text-white":"border-zinc-200 bg-white text-zinc-600"}`}>{c}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{results.map(p=><article key={p[0]} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-sm font-black">{p[0]}</p><p className="mt-2 text-xs text-zinc-500">{p[1]}</p><p className="mt-4 inline-block rounded-full border border-zinc-300 px-2 py-1 text-[10px] font-bold text-zinc-600">{p[3]}</p></article>)}</div></div>
    <p className="text-xs leading-6 text-zinc-500">Do not send health records, patient symptoms, or confidential legal case details to unapproved integrations. Healthcare workflows require appropriate compliance and provider agreements.</p>
  </section>;
}
