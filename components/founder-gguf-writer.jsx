"use client";
import {useCallback,useEffect,useState} from "react";
import {collection,limit,onSnapshot,orderBy,query} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import FounderGgufConnection from "./founder-gguf-connection";
const field="mt-2 w-full rounded-xl border border-[#c6dfed] bg-white px-3 py-3 text-sm text-[#204b65]";
const btn="rounded-xl border border-[#c9dfea] bg-white px-4 py-3 text-xs font-black text-[#245c77] disabled:opacity-40";
const sources=[["preview","Reveal a FUGTH website"],["upgrade","Improve existing website"],["follow_up","Follow-up"],["booking","Offer no-account booking"],["referral","Real verified referral"]];
export default function FounderGgufWriter({user,selectedProspectId="",onDraft,mode="sms"}){
 const [prospects,setProspects]=useState([]),[selected,setSelected]=useState(selectedProspectId),[model,setModel]=useState("0.5b");
 const [state,setState]=useState(null),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const [style,setStyle]=useState("preview"),[referrer,setReferrer]=useState(""),[verifiedReferral,setVerifiedReferral]=useState(false);
 const [audit,setAudit]=useState(null),[draft,setDraft]=useState(""),[draftSubject,setDraftSubject]=useState("");
 useEffect(()=>{if(selectedProspectId)setSelected(selectedProspectId)},[selectedProspectId]);
 useEffect(()=>{if(!db||!user?.uid)return;
  return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(900)),
  s=>setProspects(s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.type==="cold_call_prospect")));
 },[user?.uid]);
 const headers=async()=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in with your founder account.");
  return {"Authorization":"Bearer "+token,"Content-Type":"application/json"};
 };
 const refresh=useCallback(async()=>{
  const r=await fetch("/api/dev/gguf-tools",{headers:await headers(),cache:"no-store"});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"GGUF status unavailable.");
  setState(j);return j;
 },[]);
 useEffect(()=>{refresh().then(j=>setModel(j.defaultModel||"0.5b")).catch(e=>setNotice(e.message));
  const timer=setInterval(()=>{if(document.visibilityState==="visible")refresh().catch(()=>{});},45000);
  return()=>clearInterval(timer);
 },[refresh]);
 async function execute(action){
  setBusy(action);setNotice("");
  try{
   const r=await fetch("/api/dev/gguf-tools",{method:"POST",headers:await headers(),
    body:JSON.stringify({action,prospectId:selected,model,style,referrer,verifiedReferral})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"The GGUF didn't finish this step.");
   if(action==="audit"){setAudit(j.record);setNotice("Website inspected and evidence saved. Review the extracted observations before drafting.");}
   if(action==="draft"||action==="email"){setDraft(j.draft||"");setDraftSubject(j.subject||"");setNotice("GGUF "+(mode==="email"?"email":"SMS")+" draft prepared for your review. Nothing was sent.");}
   if(action==="wake"){await refresh();setNotice(j.health?.ready?"The GGUF server is responding.":"Wake probe sent; model may need more time or the Space may be paused.");}
   if(action==="config"){await refresh();setNotice("Founder default GGUF text model saved.");}
  }catch(e){setNotice(e.message||"GGUF is offline or busy. Built-in text presets remain available.")}
  finally{setBusy("");}
 }
 const lead=prospects.find(p=>p.id===selected);
 const dot=state?.light==="green"?"bg-emerald-400":state?.light==="orange"?"bg-amber-400":"bg-rose-500";
 return <section className="space-y-5 overflow-hidden rounded-[26px] border border-[#cbe2ef] bg-white text-[#22475f]">
  <header className="bg-[#102d41] p-6 text-white sm:p-8">
   <p className="text-[10px] font-black uppercase tracking-[.23em] text-[#a9e4ff]">MEPLIFEOS / PRIVATE GGUF OPERATIONS</p>
   <h3 className="mt-3 text-2xl font-black">AI {mode==="email"?"email":"SMS"} writing & website research</h3>
   <p className="mt-2 max-w-3xl text-xs leading-6 text-[#c0d8e6]">Two small models, one shared inference queue. Website review and message drafting are separate, resumable steps; the model cannot send texts, claim a customer site or publish code.</p>
  </header>
  <div className="space-y-4 p-5 sm:p-7">
   <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f0f8fd] p-4">
    <span className={"h-3 w-3 rounded-full "+dot}/>
    <strong className="text-xs uppercase">{state?.light==="green"?"Model service ready":state?.light==="orange"?"Starting / busy":"Gateway unreachable / secret not configured"}</strong>
    <span className="text-[11px] text-[#698ea4]">Models: {(state?.health?.models||[]).join(" + ")||"not loaded"} · Queue: {state?.health?.queue??"—"} / {state?.health?.maxQueue??"—"} · Active: {state?.health?.activeModel||"idle"}</span>
   </div>
   <div className="flex flex-wrap gap-2">
    <button className={btn} disabled={!!busy} onClick={()=>execute("wake")}>{busy==="wake"?"Pinging…":"Wake / ping GGUF"}</button>
    <button className={btn} disabled={!!busy} onClick={()=>refresh().catch(e=>setNotice(e.message))}>Refresh health</button>
    <a className={btn} target="_blank" rel="noopener noreferrer" href="https://huggingface.co/spaces/fugthchat/MEPLIFEOS">Space logs ↗</a>
   </div>
   <FounderGgufConnection onChanged={()=>refresh().catch(()=>{})}/>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-black">Choose a saved prospect
     <select className={field} value={selected} onChange={e=>{setSelected(e.target.value);setAudit(null);setDraft("");}}>
      <option value="">Select business</option>{prospects.map(x=><option key={x.id} value={x.id}>{x.businessName} · {x.industry||"Local business"}</option>)}
     </select>
    </label>
    <label className="text-xs font-black">GGUF model
     <select className={field} value={model} onChange={e=>setModel(e.target.value)}>
      <option value="0.5b">Qwen2.5 0.5B — lighter</option><option value="1.5b">Qwen2.5 1.5B — more detail</option>
     </select>
    </label>
   </div>
   <button className={btn} disabled={!!busy} onClick={()=>execute("config")}>Save my default model</button>
   {lead&&<div className="rounded-xl bg-[#f6fbff] p-4 text-xs">
    <strong>{lead.businessName}</strong><p className="mt-1 break-all text-[#6990a3]">Their existing website: {lead.website||"None recorded"}<br/>Our website preview: {lead.websitePreviewUrl||"No preview assigned"}</p>
   </div>}
   <div className="grid gap-3 sm:grid-cols-2">
    <div className="rounded-xl border border-[#d8e7f0] p-4">
     <strong className="text-sm">Step 1 — inspect public website</strong>
     <p className="mt-2 text-xs leading-6 text-[#6f90a1]">Reads the existing website URL saved on your prospect. Extracts the page title, headings and visible text through a restricted server tool; the AI only receives those observations.</p>
     <button className="mt-4 rounded-xl bg-[#215976] px-4 py-3 text-xs font-black text-white disabled:opacity-40" disabled={!selected||!lead?.website||!!busy} onClick={()=>execute("audit")}>{busy==="audit"?"Reviewing…":"Inspect & suggest improvements"}</button>
     {audit&&<div className="mt-4 rounded-xl bg-[#f2fafe] p-3 text-xs"><p className="font-black">{audit.title||audit.website}</p><p className="mt-2 whitespace-pre-wrap leading-6">{audit.summary}</p>
      <p className="mt-2 text-[#86a3b3]">Observations aren't guaranteed comprehensive. Don't claim a feature is missing simply because it wasn't seen.</p></div>}
    </div>
    <div className="rounded-xl border border-[#d8e7f0] p-4">
     <strong className="text-sm">Step 2 — write personalized {mode==="email"?"email":"text"}</strong>
     <label className="mt-3 block text-xs font-bold">Message direction
      <select className={field} value={style} onChange={e=>setStyle(e.target.value)}>{sources.map(([k,t])=><option key={k} value={k}>{t}</option>)}</select>
     </label>
     {style==="referral"&&<div className="mt-2 space-y-2">
      <input value={referrer} onChange={e=>setReferrer(e.target.value)} placeholder="Real referrer's name" className={field}/>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={verifiedReferral} onChange={e=>setVerifiedReferral(e.target.checked)}/> I confirm the referral is real and accurately represented.</label>
     </div>}
     <button className="mt-4 rounded-xl bg-[#215976] px-4 py-3 text-xs font-black text-white disabled:opacity-40" disabled={!selected||!!busy} onClick={()=>execute(mode==="email"?"email":"draft")}>{busy==="draft"||busy==="email"?"Drafting…":mode==="email"?"Write email with GGUF":"Write text with GGUF"}</button>
     {draft&&<div className="mt-4 rounded-xl bg-[#f2fafe] p-3 text-xs">
      {draftSubject&&<p className="mb-3 font-black">Subject: {draftSubject}</p>}<p className="whitespace-pre-wrap leading-6">{draft}</p>
      <div className="mt-3 flex flex-wrap gap-2">
       <button className={btn} onClick={()=>navigator.clipboard?.writeText((draftSubject?"Subject: "+draftSubject+"\n\n":"")+draft).then(()=>setNotice("Draft copied.")).catch(()=>setNotice("Copy manually."))}>Copy {mode==="email"?"email":"text"}</button>
       {onDraft&&<button className={btn} onClick={()=>onDraft({prospectId:selected,text:draft,subject:draftSubject})}>Use in {mode==="email"?"Email Outreach":"SMS Outreach"} →</button>}
      </div>
     </div>}
    </div>
   </div>
   {notice&&<p role="status" className="rounded-xl bg-[#e9f6fd] p-3 text-xs leading-6">{notice}</p>}
   <p className="text-[11px] leading-6 text-[#86a0af]">The free Hugging Face Space may sleep or be overloaded; wake checks cannot guarantee instant inference. Generated copy requires human review, recipient permission and truthful claims. This tool never sends SMS or email.</p>
  </div>
 </section>;
}
