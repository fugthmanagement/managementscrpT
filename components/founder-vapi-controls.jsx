"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderVapiControls(){
 const [info,setInfo]=useState(null),[phone,setPhone]=useState(""),[assistant,setAssistant]=useState(""),
  [busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function headers(){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Founder login required.");
  return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
 }
 async function load(){
  setBusy("load");setError("");
  try{
   const res=await fetch("/api/dev/vapi",{cache:"no-store",headers:await headers()});
   const d=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(d.error||"Vapi provider couldn't be reached.");
   setInfo(d);
   setPhone(v=>v||d.numbers?.items?.[0]?.id||"");
   setAssistant(v=>v||d.assistants?.items?.[0]?.id||"");
  }catch(e){setError(e.message)}
  finally{setBusy("")}
 }
 useEffect(()=>{load()},[]);
 async function save(){
  if(!phone||!assistant)return;
  if(!window.confirm("Assign the selected assistant to the selected Vapi number? This can change how inbound customers are answered. No test call will be placed."))return;
  setBusy("save");setError("");setNotice("");
  try{
   const r=await fetch("/api/dev/vapi",{method:"POST",cache:"no-store",
    headers:await headers(),body:JSON.stringify({action:"assign_assistant",phoneNumberId:phone,assistantId:assistant})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Vapi couldn't update this number.");
   setNotice(j.message);await load();
  }catch(e){setError(e.message)}finally{setBusy("")}
 }
 return <section className="rounded-[24px] border border-[#d3e5f0] bg-white p-5 text-[#254861] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#5c94b0]">FOUNDER / VOICE PROVIDER SETTINGS</p>
    <h3 className="mt-2 text-xl font-black">Vapi numbers & assistants</h3>
    <p className="mt-2 text-xs leading-6 text-[#708d9d]">Review and assign an existing Vapi assistant to an existing FUGTH phone number. No secrets are displayed; saving won't call or text anyone.</p>
   </div><button className="rounded-xl border bg-[#ecf8ff] px-4 py-3 text-xs font-bold" onClick={load} disabled={!!busy}>{busy==="load"?"Checking…":"Refresh Vapi"}</button>
  </div>
  <div className="mt-4 grid gap-3 sm:grid-cols-3">{[
   ["Assistants",info?.assistants?.items?.length??"—"],["Phone numbers",info?.numbers?.items?.length??"—"],["Recent calls",info?.calls?.items?.length??"—"]
  ].map(([k,v])=><div key={k} className="rounded-xl bg-[#f1f9fc] p-4"><p className="text-xs">{k}</p><p className="mt-2 text-2xl font-black">{v}</p></div>)}</div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-bold">Existing FUGTH number<select value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3">
    <option value="">Select number</option>{(info?.numbers?.items||[]).map(n=><option key={n.id} value={n.id}>{n.number||n.name||n.id}</option>)}
   </select></label>
   <label className="text-xs font-bold">Assigned voice assistant<select value={assistant} onChange={e=>setAssistant(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3">
    <option value="">Select assistant</option>{(info?.assistants?.items||[]).map(a=><option key={a.id} value={a.id}>{a.name||a.id}</option>)}
   </select></label>
  </div>
  <button disabled={!phone||!assistant||!!busy} onClick={save} className="mt-4 rounded-xl bg-[#1e5c79] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">
   {busy==="save"?"Updating…":"Save Vapi assignment"}
  </button>
  {["assistants","numbers","calls"].map(k=>info?.[k]?.error?<p key={k} className="mt-2 text-xs text-amber-800">{k}: {info[k].error}</p>:null)}
  {error&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  {notice&&<p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
 </section>;
}
