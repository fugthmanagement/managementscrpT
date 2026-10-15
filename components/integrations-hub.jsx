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
  const [google,setGoogle]=useState({configured:false,connected:false,docsConnected:false,sheetsConnected:false,recordingDriveAuthorized:false,operationsSheetUrl:null});
  const [docs,setDocs]=useState([]);
  const [docsLoading,setDocsLoading]=useState(false);
  const [documentForm,setDocumentForm]=useState({title:"Business notes",content:""});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState("");
  const [event,setEvent]=useState({title:"Customer consultation",startTime:"",endTime:""});
  async function status(){
    try{const r=await fetch("/api/integrations/google",{headers:await secureHeaders(),cache:"no-store"});const data=await r.json();if(r.ok)setGoogle(data);}catch(e){setMessage(e.message);}
  }
  useEffect(()=>{status();const q=new URLSearchParams(window.location.search).get("integration");if(q)setMessage(q==="google-connected"?"Google connected successfully. Your approved tools are ready to use.":q==="authorization-cancelled"?"Connection cancelled.":"Calendar authorization could not be completed.");},[]);
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
  async function openOperationsSheet(){
    setBusy("sheet");setMessage("");
    try{
      if(google.operationsSheetUrl){window.open(google.operationsSheetUrl,"_blank","noopener,noreferrer");return;}
      const response=await fetch("/api/integrations/google/sheets",{method:"POST",headers:await secureHeaders()});
      const data=await response.json();if(!response.ok)throw Error(data.error||"Could not create the operations workbook.");
      setGoogle({...google,operationsSheetUrl:data.url,sheetsConnected:true});window.open(data.url,"_blank","noopener,noreferrer");setMessage("Your FUGTH operations workbook is ready in Google Sheets.");
    }catch(e){setMessage(e.message)}finally{setBusy("");}
  }
  async function createAppointment(e){
    e.preventDefault();setBusy("booking");setMessage("");
    try{
      const payload={title:event.title,startTime:new Date(event.startTime).toISOString(),endTime:new Date(event.endTime).toISOString()};
      const r=await fetch("/api/integrations/google/book",{method:"POST",headers:await secureHeaders(),body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||"Calendar event could not be created.");setMessage(data.workspaceSynced?"Appointment saved in both Google Calendar and your FUGTH appointments.":"Appointment saved in Google Calendar, but the FUGTH appointment list could not be updated. Check your calendar before retrying.");
    }catch(e){setMessage(e.message);}finally{setBusy("");}
  }
  async function loadDocuments(){
    setDocsLoading(true);setMessage("");
    try{
      const response=await fetch("/api/integrations/google/docs",{headers:await secureHeaders(),cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Unable to load Google documents.");
      setDocs(data.files||[]);
    }catch(e){setMessage(e.message)}finally{setDocsLoading(false)}
  }
  async function createDocument(event){
    event.preventDefault();setBusy("docs");setMessage("");
    try{
      const response=await fetch("/api/integrations/google/docs",{
        method:"POST",headers:await secureHeaders(),body:JSON.stringify(documentForm),cache:"no-store"
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Unable to create a Google document.");
      setMessage("Your Google document is ready. It opens in your connected account.");
      setDocumentForm({title:"Business notes",content:""});
      if(data.url)window.open(data.url,"_blank","noopener,noreferrer");
      await loadDocuments();
    }catch(e){setMessage(e.message)}finally{setBusy("");}
  }
  const results=providers.filter(p=>(category==="All"||p[2].includes("All")||p[2].includes(category))&&p.join(" ").toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-5 text-zinc-950">
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">YOUR BUSINESS CONNECTIONS</p><h2 className="mt-4 text-3xl font-black tracking-tight">Connect the tools you already know.</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">A simple place to authorize calendars, connect automation tools and see which integrations are ready. We don't mark providers as connected until authorization succeeds.</p></div>
    {message&&<div role="status" className="rounded-xl border border-zinc-300 bg-zinc-100 p-4 text-sm text-zinc-800">{message}</div>}
    <div className="rounded-3xl border border-[#d4e5cf] bg-[#f0f7ec] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
       <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#81947a]">PRIVATE CALL RECORDINGS</p>
        <h3 className="mt-2 text-xl font-bold text-[#2d4832]">Google Drive audio archive</h3>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-[#708170]">Vapi audio is copied to a restricted Google Drive folder for your business. Recordings are never shared through public Drive URLs. Customers play them privately in their FUGTH Call Library.</p>
       </div>
       <span className={"rounded-full px-3 py-2 text-[10px] font-bold "+(google.recordingDriveAuthorized?"bg-[#d2e8d1] text-[#356442]":"bg-white text-[#8a744b]")}>{google.recordingDriveAuthorized?"Drive permission connected":"Google authorization needed"}</span>
      </div>
      {!google.recordingDriveAuthorized&&<div className="mt-4 flex flex-wrap items-center gap-3">
       <button type="button" disabled={!google.configured||busy!==""} onClick={connect} className="rounded-xl bg-[#2f5237] px-5 py-3 text-xs font-bold text-white disabled:opacity-45">Connect Google Drive ↗</button>
       <p className="text-xs text-[#7c8c79]">Your existing Google connection may need reconnection to approve Drive access.</p>
      </div>}
      {google.recordingDriveAuthorized&&<p className="mt-3 text-xs text-[#527455]">Authorization is present. The recording folder is created automatically after the first completed call is archived.</p>}
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black">Google Calendar</h3><span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-black">{google.connected?"Connected":google.configured?"Available to connect":"Configuration needed"}</span></div><p className="mt-3 text-sm leading-7 text-zinc-600">Connect your Google account once. FUGTH creates a separate private business calendar, checks your personal calendar for conflicts, and mirrors each confirmed booking into your FUGTH workspace.</p><div className="mt-6 flex flex-wrap gap-2">{!google.connected?<button type="button" disabled={!google.configured||busy!==""} onClick={connect} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{busy==="connect"?"Connecting...":"Connect Google Calendar"}</button>:<button type="button" disabled={busy!==""} onClick={disconnect} className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-black">Disconnect</button>}</div>{!google.configured&&<p className="mt-4 text-xs leading-6 text-amber-800">Google connections are being prepared. Please contact FUGTH support if you need this connected today.</p>}</div>
      <div className="rounded-3xl border border-zinc-200 bg-white p-6"><h3 className="text-lg font-black">Try a calendar appointment</h3><p className="mt-2 text-xs leading-6 text-zinc-500">This saves a real Google Calendar event only when you submit and the selected period is free.</p><form onSubmit={createAppointment} className="mt-5 space-y-3">{[["Appointment name","title","text"],["Start time","startTime","datetime-local"],["End time","endTime","datetime-local"]].map(([label,key,type])=><label key={key} className="block text-xs font-bold text-zinc-600">{label}<input required type={type} maxLength={type==="text"?120:undefined} value={event[key]} onChange={e=>setEvent({...event,[key]:e.target.value})} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"/></label>)}<button disabled={!google.connected||busy!==""} className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{busy==="booking"?"Checking calendar...":"Check and save appointment"}</button></form></div>
    </div>
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">FUGTH OPERATIONS WORKBOOK</p><h3 className="mt-3 text-2xl font-black">Your Google Sheet, ready for the business.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">When a business connects its Google account, FUGTH creates one private Operations workbook in that account with Overview, Leads and Appointments tabs. FUGTH stores only the secure link reference — it does not create a Google account or see the rest of their Drive.</p></div>{google.operationsSheetUrl?<a href={google.operationsSheetUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Open operations sheet ↗</a>:<button type="button" disabled={!google.connected||busy!==""} onClick={openOperationsSheet} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-40">{busy==="sheet"?"Setting up…":"Set up Google Sheet"}</button>}</div>{!google.connected&&<p className="mt-4 text-xs leading-6 text-amber-800">Connect the customer’s Google account first. They remain the owner of the workbook.</p>}{google.connected&&!google.sheetsConnected&&<p className="mt-4 text-xs leading-6 text-amber-800">Reconnect Google once to approve the Google Sheets permission, then this workbook can be created automatically.</p>}</section>
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">GOOGLE DOCS & FILE LINKS</p><h3 className="mt-3 text-2xl font-black text-zinc-950">Keep your business notes in Google.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">Create simple business notes as Google Docs and open their Drive links from FUGTH. Your existing documents are not copied into the website or shown to customers.</p></div><span className="rounded-full border border-zinc-200 px-3 py-2 text-[11px] font-bold text-zinc-700">{google.docsConnected?"Connected":google.configured?"Connection available":"Setup needed"}</span></div>
      {!google.docsConnected?<div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-sm text-zinc-700">Connect your Google account to enable Docs and Drive links. You may need to approve a new permission even if Calendar was connected previously.</p><button type="button" disabled={!google.configured||busy!==""} onClick={connect} className="mt-3 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Connect Google services ↗</button></div>:<div className="mt-6 grid gap-7 xl:grid-cols-2"><form onSubmit={createDocument} className="space-y-4"><h4 className="text-sm font-bold text-zinc-950">Create a document</h4><label className="block text-xs font-semibold text-zinc-600">Document title<input required maxLength={100} value={documentForm.title} onChange={e=>setDocumentForm({...documentForm,title:e.target.value})} className="mt-2 block w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900"/></label><label className="block text-xs font-semibold text-zinc-600">Notes<textarea required maxLength={8000} value={documentForm.content} onChange={e=>setDocumentForm({...documentForm,content:e.target.value})} placeholder="Services, opening hours, a customer-safe checklist..." className="mt-2 block min-h-36 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900"/></label><button disabled={busy!==""} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy==="docs"?"Saving to Google...":"Create Google Doc ↗"}</button></form>
        <div><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-zinc-950">Documents available to FUGTH</h4><button type="button" disabled={docsLoading} onClick={loadDocuments} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">{docsLoading?"Loading...":"Refresh list"}</button></div><p className="mt-3 text-xs leading-6 text-zinc-500">Only documents this FUGTH connection is allowed to access appear here, not your whole Google Drive.</p><div className="mt-4 max-h-72 divide-y divide-zinc-200 overflow-auto">{docs.map(d=><a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="block py-3 text-sm font-semibold text-zinc-800 hover:underline">{d.name} ↗</a>)}{!docs.length&&<p className="py-4 text-sm text-zinc-500">No documents loaded. Choose Refresh list, or create your first document.</p>}</div></div>
      </div>}
      <p className="mt-5 text-xs leading-6 text-zinc-500">For business notes only. Do not upload private patient records, legal case files, or sensitive customer identifiers without appropriate agreements and controls.</p>
    </section>
    <details className="rounded-2xl border border-zinc-200 bg-white p-5"><summary className="cursor-pointer text-sm font-bold text-zinc-950">Advanced connections for technical teams</summary><div className="mt-5"><WebhookIntegration /></div></details>
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">UPCOMING CONNECTORS</p><h3 className="mt-2 text-xl font-black">Available on our roadmap</h3><p className="mt-2 text-xs leading-6 text-zinc-500">These are not activated integrations. Some require provider approval and privacy review.</p></div><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search providers" placeholder="Search providers..." className="rounded-xl border border-zinc-300 p-3 text-sm text-zinc-950"/></div><div className="mt-5 flex gap-2 overflow-x-auto pb-3">{categories.map(c=><button type="button" key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${category===c?"border-zinc-900 bg-zinc-950 text-white":"border-zinc-200 bg-white text-zinc-600"}`}>{c}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{results.map(p=><article key={p[0]} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-sm font-black">{p[0]}</p><p className="mt-2 text-xs text-zinc-500">{p[1]}</p><p className="mt-4 inline-block rounded-full border border-zinc-300 px-2 py-1 text-[10px] font-bold text-zinc-600">{p[3]}</p></article>)}</div></div>
    <p className="text-xs leading-6 text-zinc-500">Do not send health records, patient symptoms, or confidential legal case details to unapproved integrations. Healthcare workflows require appropriate compliance and provider agreements.</p>
  </section>;
}
