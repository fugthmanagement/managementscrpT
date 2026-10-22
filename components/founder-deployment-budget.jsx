"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const fmt=t=>t?new Date(t).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}):"Unknown";
export default function FounderDeploymentBudget(){
 const [data,setData]=useState(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id)},[]);
 async function check(){
  setBusy(true);setError("");
  try{const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder sign-in required.");
   const r=await fetch("/api/dev/vercel-budget",{cache:"no-store",headers:{Authorization:"Bearer "+token}});
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(result.error||"Could not check Vercel usage.");
   setData(result);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{check()},[]);
 const next=data?.nextRollingReleaseAt||(
  data?.observedOldestAt?new Date(Date.parse(data.observedOldestAt)+86400000).toISOString():null);
 const sec=next?Math.max(0,Math.ceil((Date.parse(next)-now)/1000)):null;
 const countdown=sec==null?"Unknown":sec===0?"At least one previously observed deployment aged out":
  [Math.floor(sec/3600),Math.floor((sec%3600)/60),sec%60].map(n=>String(n).padStart(2,"0")).join(":");
 return <section className="rounded-[24px] border border-[#d5e5ee] bg-white p-5 text-[#1c3d51] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div>
   <p className="text-[10px] font-black uppercase tracking-widest text-[#5487a4]">FOUNDER / DEPLOYMENT CONTROL</p>
   <h3 className="mt-2 text-xl font-black">Vercel usage & rolling 24-hour countdown</h3>
   <p className="mt-2 text-xs leading-6 text-[#678799]">Hobby limit: 100 deployments per rolling 24 hours for the team. A build on a preview branch can consume quota. All release buttons remain manual.</p>
  </div><button type="button" disabled={busy} onClick={check} className="rounded-xl border bg-[#eaf6fc] px-4 py-3 text-xs font-bold disabled:opacity-40">{busy?"Checking…":"Refresh quota"}</button></div>
  <div className="mt-4 grid gap-3 sm:grid-cols-3">
   <div className="rounded-xl bg-[#f2f8fc] p-4"><p className="text-xs">Project deployments observed</p><p className="mt-1 text-2xl font-black">{data?.used??data?.observedProjectDeploymentsLast24h??"—"}</p><p className="text-[10px] text-[#668799]">{data?.live?"Project-only live count":"Past observation, not current quota"}</p></div>
   <div className="rounded-xl bg-[#f2f8fc] p-4"><p className="text-xs">Team-wide remaining</p><p className="mt-1 text-2xl font-black">Unknown</p><p className="text-[10px] text-[#668799]">Cannot safely infer from one project</p></div>
   <div className="rounded-xl bg-[#f2f8fc] p-4"><p className="text-xs">Next observed slot ages out</p><p className="mt-1 text-lg font-black tabular-nums">{countdown}</p><p className="text-[10px] text-[#668799]">Estimate · {fmt(next)} ET</p></div>
  </div>
  {data&&<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">{data.note}</p>}
  {error&&<p className="mt-3 text-xs text-red-700">{error}</p>}
  <div className="mt-4 flex flex-wrap gap-2"><a className="rounded-xl bg-[#153e54] px-4 py-3 text-xs font-bold text-white" target="_blank" rel="noopener noreferrer" href="https://vercel.com/fugth-olorh-s-projects/managementscrp-t/deployments">Open live Vercel deployments ↗</a>
   <span className="self-center text-[11px] text-[#6b899a]">Release policy: one tested batch, no speculative preview deployments.</span>
  </div>
 </section>;
}
