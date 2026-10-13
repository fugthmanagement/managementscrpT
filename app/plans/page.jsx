"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

const PLANS = [
  {key:"starter",name:"Starter",price:"$49",description:"Your FUGTH front desk for missed calls, questions and new inquiries.",features:["FUGTH voice receptionist","Calls, summaries and lead management","Editable business instructions"]},
  {key:"growth",name:"Growth",price:"$149",description:"A connected FUGTH workspace for customer conversations, follow-ups and scheduling.",features:["Everything in Starter","Expanded voice capacity","Appointments and campaign planning"],popular:true},
  {key:"elite",name:"Elite",price:"$499",description:"Advanced FUGTH setup for operations with more staff, calls and workflows.",features:["Everything in Growth","Higher agent capacity","Priority implementation support"]},
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
  return <main className="min-h-screen bg-[#f8faf7] text-[#29382d]">
    <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={()=>setScriptReady(true)}/>
    <header className="border-b border-[#e7ece3] bg-[#f8faf7]"><div className="mx-auto flex h-[80px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"><Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2b3e2f] text-lg font-bold text-white">F</span><b className="text-[21px] font-semibold tracking-[-.08em]">fugth.</b></Link><Link href={currentUser?"/dashboard":"/login"} className="rounded-xl border border-[#dce4d8] bg-white px-4 py-3 text-xs font-semibold text-[#657763]">Back to {currentUser?"workspace":"login"} →</Link></div></header>
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20"><div className="max-w-2xl"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#91a08c]">YOUR FUGTH SUBSCRIPTION</p><h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.075em] sm:text-6xl">Find the right <span className="font-serif font-normal italic text-[#7f9d7b]">fit.</span></h1><p className="mt-5 text-sm leading-8 text-[#859481] sm:text-base">Choose one of our original monthly plans. Select the one that suits your business, then review the secure payment form below.</p></div>
    {authReady&&!currentUser&&<div className="mt-8 max-w-2xl rounded-xl border border-[#dfe6db] bg-white p-5 text-sm text-[#687a65]">Log in or create your account before subscribing. <Link href="/login" className="font-semibold underline">Open login →</Link></div>}
    <div className="mt-12 grid gap-4 lg:grid-cols-3">{PLANS.map(plan=><article key={plan.key} className={`flex min-h-[355px] flex-col rounded-[24px] border p-7 ${selected===plan.key?"border-[#293c2d] bg-[#293c2d] text-white":"border-[#e0e7db] bg-white text-[#29392d]"}`}><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{plan.name}</h2>{plan.popular&&<span className="rounded-full border border-current/20 px-3 py-1.5 text-[10px] font-semibold">Popular</span>}</div><p className={`mt-4 min-h-[70px] text-sm leading-7 ${selected===plan.key?"text-[#c4d2c1]":"text-[#8a9884]"}`}>{plan.description}</p><p className="mt-5"><span className="text-[49px] font-semibold tracking-[-.08em]">{plan.price}</span><span className="ml-2 text-xs opacity-70">/ month</span></p><ul className="my-7 flex-1 space-y-3 border-t border-current/15 pt-5 text-[13px] leading-6">{plan.features.map(feature=><li key={feature} className="flex gap-2"><span>✓</span>{feature}</li>)}</ul><button type="button" onClick={()=>changePlan(plan.key)} disabled={!currentUser} className={`rounded-xl px-5 py-3.5 text-sm font-semibold disabled:opacity-40 ${selected===plan.key?"bg-white text-[#293c2d]":"bg-[#eef3eb] text-[#3b5238]"}`}>{selected===plan.key?"Your selection ✓":"Choose "+plan.name+" →"}</button></article>)}</div>
    {selected&&currentUser&&<section className="mt-10 grid gap-7 rounded-[24px] border border-[#dfe6da] bg-white p-6 sm:p-9 lg:grid-cols-[.75fr_1.25fr]"><div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#98a695]">FINAL STEP</p><h2 className="mt-4 text-2xl font-semibold tracking-tight">Complete your subscription.</h2><p className="mt-4 text-sm leading-7 text-[#879581]">Your payment details are processed securely. You’ll see your plan and renewal information in your business workspace.</p><p className="mt-5 text-xs leading-6 text-[#9ca99a]">Plans renew monthly until canceled. Nothing is charged until you complete and confirm payment.</p><button type="button" onClick={()=>changePlan("")} className="mt-5 text-xs font-semibold underline underline-offset-4">Change plan</button></div><div className="min-h-[180px]"><div ref={mountRef} aria-label="FUGTH secure payment form"/>{processing&&<p className="py-6 text-sm text-[#849481]">Preparing your secure form…</p>}{error&&<p role="alert" className="rounded-xl border border-[#eadacb] bg-[#fff6ed] p-4 text-sm text-[#815937]">{error}</p>}{!error&&!processing&&!embedActive&&<p className="py-6 text-sm text-[#899684]">Loading payment options…</p>}</div></section>}
    <p className="mt-7 text-xs leading-6 text-[#9ca89a]">Plan features and availability depend on configuration and activation.</p>
    </div>
  </main>;
}
}
