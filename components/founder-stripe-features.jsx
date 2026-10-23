"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const defaults={subscriptionsEnabled:true,textbackCheckoutEnabled:true,promotionCodesEnabled:true};
const labels={subscriptionsEnabled:"Allow new FUGTH subscriptions",textbackCheckoutEnabled:"Enable $49.99 Missed-Call Text-Back checkout",promotionCodesEnabled:"Allow Stripe promotion codes"};
export default function FounderStripeFeatures(){
 const [settings,setSettings]=useState(defaults),[health,setHealth]=useState(null),[reason,setReason]=useState("Release readiness"),
  [busy,setBusy]=useState(""),[message,setMessage]=useState("");
 async function call(method="GET"){
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder account required.");
  const response=await fetch("/api/dev/stripe-features",{method,cache:"no-store",
   headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:method==="POST"?JSON.stringify({config:settings,reason}):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Could not read payment controls.");
  return data;
 }
 async function load(){setBusy("loading");setMessage("");try{const r=await call();setHealth(r);setSettings(r.config);setMessage(r.note)}catch(e){setMessage(e.message)}finally{setBusy("")}}
 useEffect(()=>{load()},[]);
 async function save(){if(!window.confirm("Change FUGTH checkout switches? This affects NEW checkouts; it does not modify existing subscriptions or Stripe prices."))return;
  setBusy("saving");setMessage("");try{const r=await call("POST");setSettings(r.config);setMessage(r.message);await load();}
  catch(e){setMessage(e.message)}finally{setBusy("")}}
 return <section className="rounded-[24px] border border-[#d9e9f2] bg-white p-5 sm:p-7">
  <p className="text-[10px] font-black uppercase tracking-widest text-[#7295a6]">FUGTH ADMIN / STRIPE FEATURES</p>
  <h3 className="mt-2 text-xl font-bold">Subscription & checkout controls</h3>
  <p className="mt-2 text-xs leading-6 text-[#6e8b9a]">These are FUGTH website checkout switches—not direct edits to Stripe account credentials, paid subscriptions, or card charges. Existing subscriptions remain Stripe-controlled.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-3">{[
   ["Stripe merchant",health?.merchant?.connected&&health?.merchant?.merchantMatches],
   ["Payments enabled",health?.merchant?.chargesEnabled],
   ["Text-back price",health?.merchant?.textbackPriceVerified]
  ].map(([title,ok])=><div className="rounded-xl bg-[#eff8fd] p-4" key={title}><p className="text-xs font-bold">{title}</p><strong className={"mt-2 block text-sm "+(ok?"text-emerald-700":"text-amber-800")}>{ok?"✓ Verified":"Needs attention / not checked"}</strong></div>)}</div>
  {health?.firestoreCode!=="connected"&&<p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">Firebase Admin: {health?.firestoreCode||"unknown"}. Existing settings cannot be verified or saved yet. The Stripe merchant can still be healthy separately.</p>}
  <div className="mt-5 space-y-3">{Object.entries(labels).map(([key,label])=><label className="flex items-center gap-3 rounded-xl border border-[#d9e7ef] p-4 text-xs font-bold" key={key}>
   <input type="checkbox" disabled={!health?.saveAvailable} checked={settings[key]===true} onChange={e=>setSettings(x=>({...x,[key]:e.target.checked}))}/>{label}</label>)}</div>
  <label className="mt-5 block text-xs font-bold">Reason for change<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={180} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label>
  <div className="mt-4 flex flex-wrap gap-2">
   <button type="button" disabled={!health?.saveAvailable||!!busy||!reason.trim()} onClick={save} className="rounded-xl bg-[#174c67] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">Save Stripe feature controls</button>
   <button type="button" disabled={!!busy} onClick={load} className="rounded-xl border bg-white px-5 py-3 text-xs font-bold">Refresh</button>
   <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="rounded-xl border px-5 py-3 text-xs font-bold">Manage Stripe products ↗</a>
  </div>
  {message&&<p role="status" className="mt-4 text-xs leading-6 text-[#527286]">{message}</p>}
 </section>;
}
