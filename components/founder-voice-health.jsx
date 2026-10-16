"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderVoiceHealth(){
 const [status,setStatus]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 async function check(){
  setLoading(true);setError("");
  try{
   const token=await auth?.currentUser?.getIdToken();
   if(!token)throw Error("Log in with your FUGTH management account.");
   const response=await fetch("/api/dev/voice-health",{
    headers:{Authorization:"Bearer "+token},cache:"no-store"
   });
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(body.error||"Couldn't test the connection.");
   setStatus(body);
  }catch(e){setError(e.message||"Connection check failed.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{check();},[]);
 const checks=status?[["FUGTH calling account",status.voiceKeyPresent],
  ["Outbound phone number",status.outgoingNumberVerified],
  ["Customer record storage",status.serverAccountReady],
  ["Account listing access",status.authDirectoryReady],
  ["Private recording archive",status.recordingArchiveAuthorized]]:[];
 return <section className="rounded-[25px] border border-[#d1e4dd] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4"><div>
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#4a9790]">FOUNDER ONLY · LIVE TEST READINESS</p>
   <h3 className="mt-3 text-xl font-bold text-[#23463f]">Voice + recording connections</h3>
   <p className="mt-2 text-xs leading-6 text-[#6e8984]">This runs a server-side connection test. It never exposes private API credentials or places a billable call.</p>
  </div><button type="button" disabled={loading} onClick={check} className="rounded-xl bg-[#184c51] px-4 py-3 text-xs font-bold text-white disabled:opacity-40">{loading?"Checking…":"Test connections ↗"}</button></div>
  {status&&<><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{checks.map(([label,ok])=><div key={label} className={"rounded-xl border p-4 "+(ok?"border-[#cce6d3] bg-[#eef9f1]":"border-[#eedbc5] bg-[#fff8ee]")}><span className={"text-xs font-bold "+(ok?"text-[#31774a]":"text-[#946b40]")}>{ok?"✓ Connected":"Needs attention"}</span><p className="mt-2 text-xs font-semibold text-[#405e53]">{label}</p></div>)}</div>
   <p className="mt-4 text-xs font-bold text-[#466a62]">Live demo duration: {status.testLengthSeconds||30} seconds · {status.ready?"Core calling connection ready for a real test":"Calling setup still needs attention"}</p>
   {status.issues?.length>0&&<div className="mt-3 space-y-1 rounded-xl bg-[#f8f6f0] p-4">{status.issues.map(item=><p key={item} className="text-xs leading-6 text-[#8d6947]">{item}</p>)}</div>}
  </>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-[#fff5ef] p-4 text-xs text-[#915f44]">{error}</p>}
 </section>;
}
