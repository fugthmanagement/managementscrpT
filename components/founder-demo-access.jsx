"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderDemoAccess({uid}){
 const [status,setStatus]=useState(null),[hours,setHours]=useState(24),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function request(method="GET",payload){
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
  const res=await fetch("/api/dev/demo-access"+(method==="GET"?"?uid="+encodeURIComponent(uid):""),{
   method,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   ...(payload?{body:JSON.stringify(payload)}:{})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||"Could not check demo permission.");return data;
 }
 async function load(){setBusy(true);try{setStatus(await request());}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load()},[uid]);
 async function update(enabled){
  if(!window.confirm((enabled?"Allow temporary AI test calls for this customer?":"Disable customer AI test calls?")+" The normal 3-hour call cooldown still applies."))return;
  setBusy(true);setMessage("");
  try{const data=await request("POST",{uid,hours,enabled});setStatus(data);setMessage(enabled?"Temporary AI call permission enabled.":"AI demo permission disabled.");}
  catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 return <section className="mt-4 rounded-xl border border-[#ddcdbb] bg-[#fffbf5] p-4">
  <p className="text-xs font-bold uppercase tracking-widest text-[#7d6952]">AI receptionist demo access</p>
  <p className="mt-2 text-xs leading-5">Free accounts are blocked from starting chargeable AI calls until you approve them. This override expires automatically, and the server still enforces the call-length and cooldown restrictions.</p>
  <p className="mt-3 text-xs font-semibold">Status: {status?.enabled?"Enabled until "+new Date(status.expiresAt).toLocaleString():"Not enabled"}</p>
  <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">Demo window<select value={hours} onChange={e=>setHours(Number(e.target.value))} className="ml-2 rounded-lg border border-[#d6c5ad] bg-white px-3 py-2"><option value="1">1 hour</option><option value="4">4 hours</option><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label>
   <button type="button" disabled={busy} onClick={()=>update(true)} className="rounded-lg bg-[#4b3e30] px-3 py-2 text-xs font-bold text-white">Enable test calls</button>
   <button type="button" disabled={busy} onClick={()=>update(false)} className="rounded-lg border border-[#ccae92] px-3 py-2 text-xs font-bold">Disable</button>
   <button type="button" disabled={busy} onClick={load} className="rounded-lg border border-[#ccae92] px-3 py-2 text-xs font-bold">Refresh</button></div>
  {message&&<p role="status" className="mt-3 text-xs">{message}</p>}
 </section>;
}
