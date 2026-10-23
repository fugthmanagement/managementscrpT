"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const labels={voiceReceptionist:"Vapi AI receptionist",missedCallTextback:"Missed-call Text-Back",outreachMessenger:"Outreach Messenger",siteMaker:"Website Studio",priorityOnboarding:"VIP onboarding & support"};
const keys=Object.keys(labels);
const field="mt-2 w-full rounded-lg border border-[#cce2eb] bg-white px-4 py-3 text-xs";
export default function FounderFeatureOverrides({uid}){
 const [flags,setFlags]=useState(Object.fromEntries(keys.map(k=>[k,false]))),[reason,setReason]=useState("Founding customer onboarding"),
  [message,setMessage]=useState(""),[busy,setBusy]=useState("");
 async function call(method="GET"){
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder session needed.");
  const res=await fetch("/api/dev/feature-overrides"+(method==="GET"?"?uid="+encodeURIComponent(uid):""),{
   method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:method==="POST"?JSON.stringify({uid,features:flags,reason}):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error((data.error||"Feature controls unavailable.")+(data.code?" ["+data.code+"]":""));
  return data;
 }
 async function load(){setBusy("load");setMessage("");try{const d=await call();setFlags(d.features);setMessage(d.note)}
  catch(e){setMessage(e.message)}finally{setBusy("")}}
 useEffect(()=>{if(uid)load()},[uid]);
 async function save(){
  if(!window.confirm("Save VIP feature flags for this customer? This does NOT change their Stripe subscription or provision a Vapi number."))return;
  setBusy("save");setMessage("");
  try{const r=await call("POST");setMessage(r.message)}
  catch(e){setMessage(e.message)}
  finally{setBusy("")}
 }
 return <section className="mt-5 rounded-2xl border border-[#c9e2f1] bg-white p-5">
  <p className="text-[10px] font-black uppercase tracking-widest text-[#658ba0]">FOUNDER VIP / VAPI CONTROLS</p>
  <h3 className="mt-2 text-lg font-bold">Customer feature overrides</h3>
  <p className="mt-2 text-xs leading-6 text-[#68869a]">Turn on dedicated access preferences per account without modifying their real paid tier. A Vapi number, SMS provider, and actual feature entitlements still need their own authorized setup.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">{keys.map(k=><label className="flex items-center gap-3 rounded-xl border bg-[#f7fbff] p-3 text-xs font-bold" key={k}>
   <input type="checkbox" checked={flags[k]===true} onChange={e=>setFlags(x=>({...x,[k]:e.target.checked}))}/>{labels[k]}</label>)}</div>
  <label className="mt-4 block text-xs font-bold">Audit reason<input className={field} maxLength={180} value={reason} onChange={e=>setReason(e.target.value)}/></label>
  <div className="mt-4 flex gap-2"><button type="button" disabled={!!busy||!reason.trim()} onClick={save} className="rounded-xl bg-[#175472] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">Save VIP features</button>
   <button type="button" disabled={!!busy} onClick={load} className="rounded-xl border px-5 py-3 text-xs font-bold">Refresh</button></div>
  {message&&<p role="status" className="mt-3 text-xs leading-6 text-[#456b86]">{message}</p>}
 </section>;
}
