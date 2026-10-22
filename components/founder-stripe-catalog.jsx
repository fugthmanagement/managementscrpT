"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderStripeCatalog(){
 const [data,setData]=useState(null),[edits,setEdits]=useState({}),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function headers(){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder login required.");return {Authorization:"Bearer "+token,"Content-Type":"application/json"};}
 async function load(){
  setBusy("refresh");setError("");
  try{
   const r=await fetch("/api/dev/stripe-catalog",{headers:await headers(),cache:"no-store"});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(d.error||"Stripe catalog cannot load.");
   setData(d);setEdits(Object.fromEntries(d.products.map(p=>[p.id,{name:p.name||"",description:p.description||""}])));
  }catch(e){setError(e.message)}finally{setBusy("")}
 }
 useEffect(()=>{load()},[]);
 function edit(id,key,value){setEdits(v=>({...v,[id]:{...v[id],[key]:value}}))}
 async function save(id){
  if(!window.confirm("Update the selected Stripe product's NAME and DESCRIPTION? The price and existing subscriptions will NOT change."))return;
  setBusy(id);setError("");setMessage("");
  try{
   const r=await fetch("/api/dev/stripe-catalog",{method:"POST",headers:await headers(),
    body:JSON.stringify({productId:id,...edits[id]})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(d.error||"Stripe update failed.");
   setMessage(d.message);await load();
  }catch(e){setError(e.message)}finally{setBusy("")}
 }
 return <section className="rounded-[24px] border border-[#d6e5ee] bg-white p-5 text-[#2d4a5e] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#789eb4]">FOUNDER / PAYMENT PRODUCT EDITOR</p>
    <h3 className="mt-2 text-xl font-black">Stripe products & features</h3>
    <p className="mt-2 text-xs leading-6 text-[#668799]">Connected FUGTH merchant products and their existing live prices. Edit display names and descriptions without creating a charge or changing anyone's active subscription.</p>
   </div><button type="button" onClick={load} disabled={!!busy} className="rounded-xl border bg-[#effaff] px-4 py-3 text-xs font-bold">{busy==="refresh"?"Checking…":"Refresh Stripe"}</button>
  </div>
  {data?.merchant&&<p className="mt-3 text-xs font-semibold">Verified merchant: {data.merchant}</p>}
  <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto">
   {data?.products?.map(p=><article key={p.id} className="rounded-xl border border-[#d7e6ee] bg-[#fafcfe] p-4">
    <p className="text-xs font-black">{p.title} {p.error&&<span className="text-amber-800"> · {p.error}</span>}</p>
    <p className="mt-2 break-all font-mono text-[10px] text-[#7995a4]">{p.id}</p>
    {p.prices?.map(price=><p key={price.id} className="mt-1 text-[11px] text-[#6c899b]">
     {price.currency?.toUpperCase()} {(price.cents/100).toFixed(2)} / {price.recurring||"once"} · {price.active?"active":"inactive"} · {price.id}</p>)}
    {!p.error&&<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
     <div><label className="block text-xs font-bold">Name<input maxLength={105} className="mt-2 w-full rounded-lg border bg-white p-3 text-xs" value={edits[p.id]?.name||""} onChange={e=>edit(p.id,"name",e.target.value)}/></label>
     <label className="mt-3 block text-xs font-bold">Description<textarea rows={2} maxLength={800} className="mt-2 w-full rounded-lg border bg-white p-3 text-xs" value={edits[p.id]?.description||""} onChange={e=>edit(p.id,"description",e.target.value)}/></label></div>
     <button type="button" disabled={!!busy} className="self-end rounded-xl bg-[#1c5977] px-4 py-3 text-xs font-bold text-white disabled:opacity-40" onClick={()=>save(p.id)}>{busy===p.id?"Saving…":"Save wording"}</button></div>}
   </article>)}
  </div>
  {error&&<p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">{error}</p>}
  {message&&<p className="mt-4 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">{message}</p>}
  <p className="mt-4 text-[11px] leading-6 text-[#7893a0]">Price changes require new Stripe prices and an intentional catalog update. This editor cannot activate unpaid customers or bypass signed checkout webhooks.</p>
 </section>;
}
