"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

const PLANS = [
  {key:"starter",name:"Starter",price:"$49",description:"For independent owners who need a reliable first hello.",features:["AI receptionist workspace","Call history and lead inbox","Editable business instructions"]},
  {key:"growth",name:"Growth",price:"$149",description:"For busy service businesses handling more inquiries.",features:["Everything in Starter","Expanded voice capacity","Appointments and campaign planning"],popular:true},
  {key:"elite",name:"Elite",price:"$499",description:"For teams needing larger capacity and implementation support.",features:["Everything in Growth","Higher agent capacity","Priority implementation support"]},
];
export default function Plans() {
  const [currentUser,setCurrentUser] = useState(null);
  const [authReady,setAuthReady] = useState(false);
  const [selected,setSelected] = useState("");
  const [processing,setProcessing] = useState(false);
  const [error,setError] = useState("");
  const [scriptReady,setScriptReady] = useState(false);
  const [embedActive,setEmbedActive] = useState(false);
  const checkoutRef = useRef(null);
  const mountRef = useRef(null);
  const activeRef = useRef(false);
  useEffect(()=>{
    if(!auth){setAuthReady(true);return;}
    const unsub=onAuthStateChanged(auth,u=>{setCurrentUser(u);setAuthReady(true);});
    const requested = new URLSearchParams(window.location.search).get("plan");
    if(PLANS.some(p=>p.key===requested))setSelected(requested);
    return ()=>{unsub();};
  },[]);
  useEffect(()=>{
    if(!currentUser || !selected || !scriptReady || !mountRef.current || activeRef.current)return;
    let canceled=false;
    activeRef.current=true;
    setProcessing(true);setError("");
    const start = async()=>{
      try{
        const token=await currentUser.getIdToken();
        const res=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({planKey:selected}),cache:"no-store"});
        const data=await res.json();
        if(!res.ok)throw Error(data.error||"Unable to start checkout.");
        if(!window.Stripe||!data.publishableKey||!data.clientSecret)throw Error("Secure payment form could not be loaded.");
        const stripe=window.Stripe(data.publishableKey);
        const checkout=await stripe.initEmbeddedCheckout({clientSecret:data.clientSecret});
        if(canceled){checkout.destroy();return;}
        checkoutRef.current=checkout;
        checkout.mount(mountRef.current);
        setEmbedActive(true);
      }catch(e){if(!canceled)setError(e.message||"Payment setup failed.");}
      finally{if(!canceled)setProcessing(false);}
    };
    start();
    return()=>{canceled=true;checkoutRef.current?.destroy();checkoutRef.current=null;activeRef.current=false;};
  },[currentUser,selected,scriptReady]);
  const changePlan=(value)=>{checkoutRef.current?.destroy();checkoutRef.current=null;activeRef.current=false;setEmbedActive(false);setSelected(value);setError("");};
  return <main className="min-h-screen bg-[#f8f8f6] text-zinc-950">
    <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={()=>setScriptReady(true)} />
    <header className="border-b border-zinc-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8"><Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-lg font-black text-white">F</span><span className="text-sm font-black tracking-tight">FUGTH MANAGEMENT</span></Link><Link href="/dashboard" className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700">Back to workspace →</Link></div></header>
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16"><p className="text-xs font-black uppercase tracking-[.17em] text-zinc-500">ACCOUNT SETUP / SUBSCRIPTION</p><h1 className="mt-5 text-4xl font-black tracking-[-.065em] sm:text-6xl">Choose what works for your <em className="font-serif font-normal">business.</em></h1><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">Select a plan, then complete payment in a secure Stripe form right here on Fugth Management. Your workspace activates when the payment is confirmed.</p>
      {!authReady&&<p className="mt-8 text-sm text-zinc-500">Checking your account...</p>}
      {authReady&&!currentUser&&<div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6"><p className="text-sm font-bold">Create your Fugth account or sign in before buying a subscription.</p><Link href="/login" className="mt-4 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Sign in or create account →</Link></div>}
      <div className="mt-9 grid gap-4 lg:grid-cols-3">{PLANS.map(plan=><article key={plan.key} className={`flex flex-col rounded-2xl border p-6 transition ${selected===plan.key?"border-zinc-950 bg-zinc-950 text-white shadow-xl":"border-zinc-200 bg-white text-zinc-950"}`}><div className="flex justify-between gap-2"><h2 className="text-xl font-black">{plan.name}</h2>{plan.popular&&<span className="rounded-full border border-current/20 px-3 py-1 text-[10px] font-black">POPULAR</span>}</div><p className={`mt-3 min-h-14 text-sm leading-6 ${selected===plan.key?"text-zinc-300":"text-zinc-600"}`}>{plan.description}</p><p className="mt-5"><b className="text-4xl font-black">{plan.price}</b><span className="text-xs"> / month</span></p><ul className="my-7 flex-1 space-y-3 border-t border-current/20 pt-6 text-sm">{plan.features.map(f=><li key={f} className="flex gap-3"><span>✓</span>{f}</li>)}</ul><button type="button" disabled={!currentUser} onClick={()=>changePlan(plan.key)} className={`rounded-xl px-5 py-3 text-sm font-black disabled:opacity-45 ${selected===plan.key?"bg-white text-zinc-950":"bg-zinc-100 text-zinc-950"}`}>{selected===plan.key?"Selected ✓":"Select "+plan.name+" →"}</button></article>)}</div>
      {currentUser && selected&&<section className="mt-10 grid gap-8 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8 lg:grid-cols-[.72fr_1.28fr]"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">STEP 2 / SECURE CHECKOUT</p><h2 className="mt-3 text-2xl font-black">Complete your subscription.</h2><p className="mt-4 text-sm leading-7 text-zinc-600">Your payment details are entered directly into Stripe's secure embedded form. Fugth does not receive or store your card number.</p><p className="mt-6 text-xs leading-6 text-zinc-500">Monthly renewals continue until canceled. You'll see your subscription tier, next renewal date, and payment status in the dashboard once billing is configured and verified.</p><button onClick={()=>changePlan("")} className="mt-4 text-sm font-bold text-zinc-700 underline underline-offset-4">Change plan</button></div><div className="min-h-40"><div ref={mountRef} aria-label="Stripe secure embedded checkout"/>{processing&&<p className="py-10 text-center text-sm text-zinc-500">Preparing secure payment form...</p>}{error&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">{error}</div>}{!error&&!processing&&!embedActive&&<p className="py-6 text-sm text-zinc-500">Loading payment options...</p>}</div></section>}
      <p className="mt-7 text-xs leading-6 text-zinc-500">Plan capacity and integrations are subject to configuration. Subscriptions are created only after you explicitly complete the secure payment form.</p>
    </div>
  </main>;
}