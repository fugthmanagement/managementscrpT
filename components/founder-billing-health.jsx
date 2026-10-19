"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderBillingHealth(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function refresh(){
  setBusy(true);setError("");
  try{
   const token=await auth.currentUser?.getIdToken();
   if(!token)throw Error("Founder login is required.");
   const res=await fetch("/api/dev/billing-health",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||"Could not inspect billing.");
   setData(json);
  }catch(e){setError(e.message||"Billing connection check failed.");}
  finally{setBusy(false);}
 }
 useEffect(()=>{refresh();},[]);
 return <section className="rounded-[24px] border border-[#d9e9f2] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#748fa1]">LIVE PAYMENT OPERATIONS</p><h3 className="mt-3 text-xl font-semibold">FUGTH billing + checkout health</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-[#7996a4]">Verify the FUGTH merchant account, all monthly and yearly subscriptions, and secure checkout readiness.</p></div>
   <button type="button" disabled={busy} onClick={refresh} className="rounded-xl border border-[#d1e6f1] bg-[#f3fbff] px-4 py-3 text-xs font-bold disabled:opacity-50">{busy?"Checking…":"Refresh billing check"}</button></div>
  {data&&<div className="mt-5 rounded-xl bg-[#ebf7ff] p-4"><p className="text-xs font-bold text-[#23698c]">{data.ready?"✓ Checkout configuration ready":"⚠ Billing connection incomplete"}</p>
   <p className="mt-2 break-all text-xs text-[#66889a]">FUGTH merchant: <strong>{data.merchant?.name||"Not identified"}</strong> · {data.merchant?.id||"No account returned"}</p>
   <div className="mt-3 grid gap-2 sm:grid-cols-3">{(data.plans||[]).map(p=><div key={p.plan} className="rounded-lg bg-white p-3 text-xs"><strong>{p.plan.toUpperCase()}</strong><span className={p.ready?"ml-2 text-green-700":"ml-2 text-amber-800"}>{p.ready?"✓":"Needs setup"}</span><p className="mt-1 text-[11px] leading-5 text-[#819aaa]">{p.reason}</p></div>)}</div>
   <div className="mt-3 flex flex-wrap gap-2 text-[11px]">{Object.entries(data.environment||{}).filter(([key])=>key!=="hostedCheckout").map(([key,value])=><span key={key} className={"rounded-full px-3 py-2 "+(value?"bg-[#d8edf6] text-[#2d7192]":"bg-[#f8e9d4] text-[#805c33]")}>{value?"✓":"×"} {key.replace(/([A-Z])/g," $1")}</span>)}</div>
   <p className="mt-3 text-xs leading-6 text-[#657866]">{data.message}</p>
  </div>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-[#fff5eb] p-4 text-xs text-[#855c39]">{error}</p>}
  <p className="mt-4 text-xs leading-6 text-[#839181]">Subscription products and your payment account must match. Paid plan access is granted by a verified payment confirmation; existing customer subscriptions remain with their original merchant unless separately migrated.</p>
 </section>;
}
