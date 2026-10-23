"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const KEY="fugth-release-hold-v1";
const stamp=date=>Number.isFinite(Date.parse(date||""))?new Date(date).toLocaleString():"Not set";
const minutes=n=>{if(n<=0)return "Window reached";const h=Math.floor(n/60),m=n%60;return (h?h+"h ":"")+m+"m";}
export default function FounderReleaseMonitor(){
 const [info,setInfo]=useState(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),
  [notBefore,setNotBefore]=useState(""),[now,setNow]=useState(Date.now());
 useEffect(()=>{
  try{setNotBefore(localStorage.getItem(KEY)||"")}catch{}
  const tick=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(tick);
 },[]);
 async function refresh(){
  setBusy(true);setNotice("");
  try{const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder login required.");
   const res=await fetch("/api/dev/vercel-usage",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const data=await res.json();if(!res.ok)throw Error(data.error||"Could not check deployment status.");
   setInfo(data);
  }catch(e){setNotice(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{refresh()},[]);
 function hold(value){
  setNotBefore(value);
  try{value?localStorage.setItem(KEY,value):localStorage.removeItem(KEY)}catch{}
 }
 const deadline=Date.parse(notBefore||"");
 const remaining=Number.isFinite(deadline)?Math.ceil((deadline-now)/60000):null;
 return <section className="rounded-[24px] border border-[#d7e5ee] bg-white p-5 text-[#1d3a4f] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#7395a6]">FOUNDER RELEASE GUARD / VERCEL</p>
    <h3 className="mt-2 text-xl font-bold">Deployment window & reserve</h3>
    <p className="mt-2 max-w-2xl text-xs leading-6 text-[#698395]">Batch features and testing on GitHub. Release a single production build only when it is needed. This tool never triggers a deployment.</p></div>
   <button type="button" disabled={busy} onClick={refresh} className="rounded-xl border bg-[#eff8fe] px-4 py-3 text-xs font-bold">Refresh</button>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-4">
   <div className="rounded-xl bg-[#edf7fe] p-4"><p className="text-[10px] font-bold text-[#66879b]">Actual deploys remaining</p><strong className="mt-2 block text-xl">{info?.remainingDeployments??"Unknown"}</strong><p className="mt-1 text-[11px]">Vercel does not expose a verified balance here</p></div>
   <div className="rounded-xl bg-[#edf7fe] p-4"><p className="text-[10px] font-bold text-[#66879b]">Observed project builds · 24h</p><strong className="mt-2 block text-xl">{info?.projectDeployments24h??"Unavailable"}</strong><p className="mt-1 text-[11px]">{info?.source||"Checking…"}</p></div>
   <div className="rounded-xl bg-[#edf7fe] p-4"><p className="text-[10px] font-bold text-[#66879b]">Next observed project event leaves 24h window</p>
    <strong className="mt-2 block text-xl">{Number.isFinite(Date.parse(info?.nextObservedProjectEventExpiryAt||""))?minutes(Math.ceil((Date.parse(info.nextObservedProjectEventExpiryAt)-now)/60000)):"Unknown"}</strong>
    <p className="mt-1 text-[11px]">Not the team-wide quota reset</p></div>
   <div className="rounded-xl bg-[#edf7fe] p-4"><p className="text-[10px] font-bold text-[#66879b]">Manual release hold</p><strong className="mt-2 block text-xl">{remaining==null?"Not set":minutes(remaining)}</strong><p className="mt-1 text-[11px]">{remaining>0?"Internal reminder, not a Vercel quota reset":"Only an internal planning hold"}</p></div>
  </div>
  <div className="mt-5 flex flex-wrap items-end gap-3">
   <label className="text-xs font-bold">Do not plan next release before<input type="datetime-local" value={notBefore} onChange={e=>hold(e.target.value)} className="mt-2 block rounded-xl border bg-white px-4 py-3 text-xs"/></label>
   <button type="button" className="rounded-xl border px-4 py-3 text-xs font-bold" onClick={()=>hold("")}>Clear local reminder</button>
   <a href="https://vercel.com/fugth-olorh-s-projects/managementscrp-t/deployments" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#1c526c] px-4 py-3 text-xs font-bold text-white">Open actual Vercel usage ↗</a>
  </div>
  {notice&&<p role="status" className="mt-3 text-xs text-amber-800">{notice}</p>}
  <p className="mt-4 text-[11px] leading-6 text-[#7b8997]">{info?.note||"Checking deployment history…"} A local hold is a reminder only: it does NOT disable Git-connected automatic Vercel builds. Current deployed build: <code>{info?.latestBuildCommit?.slice(0,10)||"not reported"}</code>. No API keys are shown.</p>
 </section>;
}
