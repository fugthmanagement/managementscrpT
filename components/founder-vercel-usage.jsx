"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";

function duration(ms){
 if(!Number.isFinite(ms)||ms<=0)return "Window may have rolled over; refresh.";
 const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);
 return h+"h "+String(m).padStart(2,"0")+"m";
}
export default function FounderVercelUsage(){
 const [state,setState]=useState(null),[error,setError]=useState(""),
  [busy,setBusy]=useState(false),[clock,setClock]=useState(Date.now());
 async function refresh(){
  setBusy(true);setError("");
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder login required");
   const res=await fetch("/api/dev/vercel-usage",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"Cannot check Vercel");
   setState(data);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{refresh();const h=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(h)},[]);
 const hasCount=Number.isInteger(state?.observedCreated);
 const guess=state?.resetEstimateAt?Date.parse(state.resetEstimateAt)-clock:null;
 return <section className="rounded-[25px] border border-[#d0e5f0] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#4286a8]">FOUNDER / VERCEL RELEASE BUDGET</p>
    <h3 className="mt-2 text-xl font-black">Deployment counter and release countdown</h3>
    <p className="mt-2 text-xs leading-6 text-[#688698]">Vercel Hobby normally allows 100 deployments per 24 hours. A saved preview or a tiny Git commit can consume a deployment; consolidate changes before releasing.</p>
   </div><button type="button" disabled={busy} onClick={refresh} className="rounded-xl border px-4 py-3 text-xs font-bold disabled:opacity-50">
    {busy?"Checking…":"Refresh usage"}</button>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-3">
   <div className="rounded-xl bg-[#f0f7fb] p-4"><p className="text-[10px] font-bold uppercase text-[#7793a3]">24-hour Hobby limit</p><p className="mt-2 text-2xl font-black">100</p></div>
   <div className="rounded-xl bg-[#f0f7fb] p-4"><p className="text-[10px] font-bold uppercase text-[#7793a3]">Observed team deployments</p>
    <p className="mt-2 text-2xl font-black">{hasCount?state.observedCreated:"Unknown"}</p></div>
   <div className="rounded-xl bg-[#f0f7fb] p-4"><p className="text-[10px] font-bold uppercase text-[#7793a3]">Remaining / reset countdown</p>
    <p className="mt-2 text-lg font-black">{hasCount?state.remaining+" estimated":"Unknown"}</p>
    <p className="mt-1 text-xs">{guess!==null?duration(guess):"Not available without authorized team usage access"}</p></div>
  </div>
  {state?.message&&<p className="mt-4 text-xs leading-6 text-[#667f90]">{state.message}</p>}
  {error&&<p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
  <div className="mt-4 flex flex-wrap gap-3">
   <a target="_blank" rel="noopener noreferrer" href={state?.dashboardUrl||"https://vercel.com/fugth-olorh-s-projects/managementscrp-t"}
    className="rounded-xl bg-[#173e55] px-4 py-3 text-xs font-bold text-white">Open authoritative Vercel usage ↗</a>
   <span className="self-center text-xs text-[#7795a4]">Release policy: build features together, test once, deploy deliberately.</span>
  </div>
 </section>;
}
