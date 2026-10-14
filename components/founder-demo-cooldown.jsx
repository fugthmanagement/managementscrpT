"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
async function headers(){
 const token=await auth.currentUser?.getIdToken();
 if(!token)throw Error("Sign in again to manage the demo.");
 return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
}
function remaining(until){
 const ms=Date.parse(until||"")-Date.now();
 if(!(ms>0))return "Ready for a call";
 const minutes=Math.ceil(ms/60000);
 return "On cooldown · "+Math.floor(minutes/60)+"h "+(minutes%60)+"m remaining";
}
export default function FounderDemoCooldown({account}){
 const [status,setStatus]=useState(null),[loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function refresh(){
  setLoading(true);setError("");
  try{
   const res=await fetch("/api/dev/demo-cooldown?uid="+encodeURIComponent(account.uid),{headers:await headers(),cache:"no-store"});
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||"Could not load call limits.");
   setStatus(json);
  }catch(e){setError(e.message||"Could not load cooldown.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{setStatus(null);setNotice("");refresh();},[account.uid]);
 async function reset(){
  if(!window.confirm("Allow "+account.businessName+" to request another live demo? This also unlocks the last called phone number."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/dev/demo-cooldown",{
    method:"POST",headers:await headers(),body:JSON.stringify({action:"reset",uid:account.uid})
   });
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||"Could not reset the cooldown.");
   setStatus(json);
   setNotice(json.reset?"Cooldown reset. The customer can request another demo.":json.reason||"No active cooldown.");
  }catch(e){setError(e.message||"Reset failed.");}
  finally{setBusy(false);}
 }
 return <div className="mb-6 rounded-2xl border border-[#dbe6d7] bg-[#f4f8f1] p-5 text-[#354b38] sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#748b76]">CUSTOMER DEMO CONTROLS</p>
    <h4 className="mt-2 text-lg font-semibold">Live demo cooldown</h4>
    <p className="mt-2 text-xs text-[#687c69]">{loading?"Checking account…":status?remaining(status.cooldownUntil):"Cooldown status unavailable."}</p>
    {status?.lastPhone&&<p className="mt-2 text-xs text-[#687c69]">Last demo number: {status.lastPhone}{status.lastFocus?" · Focus: "+status.lastFocus:""}</p>}
   </div>
   <div className="flex gap-2"><button type="button" disabled={busy||loading} onClick={refresh} className="rounded-xl border border-[#cbd9c5] px-4 py-3 text-xs font-semibold disabled:opacity-50">Refresh</button>
    <button type="button" disabled={busy||loading||!status?.lastPhone} onClick={reset} className="rounded-xl bg-[#314b38] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{busy?"Resetting…":"Reset 3-hour cooldown"}</button></div>
  </div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-white p-3 text-xs text-[#496249]">{notice}</p>}
 </div>;
}
