"use client";

import Link from "next/link";
import { useState } from "react";
import { auth, db } from "../../lib/firebase";
import { doc,setDoc,serverTimestamp } from "firebase/firestore";
import { detectIndustry } from "../../lib/site-presets";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const tiers = [
  {key:"starter",name:"Starter",price:"$49",summary:"For solo operators"},
  {key:"growth",name:"Growth",price:"$149",summary:"For teams on the move"},
  {key:"elite",name:"Elite",price:"$499",summary:"For advanced operations"},
];

export default function Login(){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [businessName,setBusinessName]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState("");
  async function submit(event){
    event.preventDefault();setBusy("auth");setError("");setNotice("");
    if(!auth){setError("Authentication is unavailable. Please try again shortly.");setBusy("");return;}
    try{
      const e=email.trim();
      if(!e||!password)throw new Error("Enter an email and password.");
      if(mode==="signup"&&password.length<6)throw new Error("Password must be at least six characters.");
      if(mode==="login")await signInWithEmailAndPassword(auth,e,password);
      else {
        const created=await createUserWithEmailAndPassword(auth,e,password);
        // Keep the site preview separate from private customer profile data.
        // If publication rules are not yet deployed, Site Studio allows a retry.
        if (db) {
          try {
            await setDoc(doc(db,"users",created.user.uid),{
              businessName:businessName.trim(),
              businessType:detectIndustry(businessName),
              email:e,
              createdAt:serverTimestamp(),
              updatedAt:serverTimestamp()
            },{merge:true});
          } catch { console.warn("Customer workspace will initialize when the dashboard is opened."); }
          try {
            const token=await created.user.getIdToken();
            const createdSite=await fetch("/api/sites/"+encodeURIComponent(created.user.uid),{
              method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
              body:JSON.stringify({action:"initialize"}),cache:"no-store"
            });
            if(!createdSite.ok)console.warn("FUGTH website preview will be initialized when Site Studio opens.");
          }catch{console.warn("Website preview initialization will be retried later.");}
        }
        try{
          const token=await created.user.getIdToken();
          const response=await fetch("/api/account-number",{
            method:"POST",headers:{Authorization:`Bearer ${token}`},cache:"no-store"
          });
          if(!response.ok)console.warn("FUGTH 537 account number pending secure setup.");
        }catch{console.warn("FUGTH 537 account number will be assigned after sign-in.");}
      }
      const wantsDemo = new URLSearchParams(window.location.search).get("demo") === "1";
      window.location.assign(wantsDemo ? "/dashboard" : mode === "signup" ? "/plans" : "/dashboard");
    }catch(err){setError(String(err?.message||"Could not sign in").replace("Firebase: ",""));}
    finally{setBusy("");}
  }
  async function reset(){
    setError("");setNotice("");
    if(!email.trim()){setError("Enter your email first to receive a reset link.");return;}
    try{await sendPasswordResetEmail(auth,email.trim());setNotice("If that email is registered, check your inbox for password reset instructions.");}
    catch(err){setError(err.message||"Could not send reset email.");}
  }
  function checkout(planKey){
    window.location.assign("/plans?plan="+encodeURIComponent(planKey));
  }
  return <main className="min-h-screen bg-[#fafaf8] text-[#171717]">
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-6 sm:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#181818] text-3xl font-black text-white">F</span><span><strong className="block text-xl font-black tracking-tight">Fugth<span className="text-[#181818]">.</span></strong><small className="block text-[9px] font-black tracking-[.2em] text-slate-500">MANAGEMENT OS</small></span></Link>
      <Link href="/" className="rounded-xl border border-[#d6d6d3] bg-white px-4 py-2.5 text-xs font-extrabold text-[#171717] sm:text-sm">← Back to website</Link>
    </header>
    <div className="mx-auto grid max-w-7xl items-stretch gap-7 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative flex min-h-[580px] flex-col overflow-hidden rounded-[2rem] bg-[#161616] p-8 text-white sm:p-12 lg:min-h-[710px]">
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full border-[58px] border-white/10"/>
        <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#f4f4f1]/90 blur-[80px]"/>
        <div className="relative z-10"><div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em]">✳ Your Fugth Workspace</div><h1 className="mt-10 text-5xl font-black leading-[1.02] tracking-[-.065em] sm:text-6xl">Your best<br/>business day<br/><span className="text-zinc-100">starts here.</span></h1><p className="mt-8 max-w-md text-base leading-8 text-zinc-300">Calls, leads, appointments and your AI receptionist—all managed in one place. Less juggling. More room to grow.</p></div>
        <div className="relative z-10 mt-auto pt-14"><div className="grid gap-3 sm:grid-cols-3">{[["01","Voice AI"],["02","Leads & CRM"],["03","Appointments"]].map(x=><div key={x[0]} className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur"><span className="text-xs font-extrabold text-[#d2f38b]">{x[0]}</span><p className="mb-0 mt-4 text-sm font-black">{x[1]}</p></div>)}</div></div>
      </section>
      <section className="flex flex-col justify-center rounded-[2rem] border border-[#ddddda] bg-white p-7 shadow-sm sm:p-11">
        <div className="mb-8"><div className="flex w-fit rounded-full bg-[#edf0f5] p-1"><button onClick={()=>{setMode("login");setError("");}} className={`rounded-full px-5 py-2.5 text-xs font-black transition ${mode==="login"?"bg-[#171717] text-white shadow-sm":"text-[#566574]"}`}>Sign in</button><button onClick={()=>{setMode("signup");setError("");}} className={`rounded-full px-5 py-2.5 text-xs font-black transition ${mode==="signup"?"bg-[#171717] text-white shadow-sm":"text-[#566574]"}`}>Create account</button></div><h2 className="mt-8 text-3xl font-black tracking-[-.055em] sm:text-4xl">{mode==="login"?"Welcome back.":"Welcome to Fugth."}</h2><p className="mt-3 text-sm leading-7 text-[#616161]">{mode==="login"?"Sign in to your business command center.":"Create your business account and get a FUGTH website preview automatically."}</p></div>
        {error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice&&<p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <form onSubmit={submit} className="space-y-4">{mode==="signup"&&<label className="block text-xs font-black uppercase tracking-[.12em] text-[#596778]">Your business name<input type="text" required maxLength={80} autoComplete="organization" placeholder="e.g. North Coast Roofing" value={businessName} onChange={e=>setBusinessName(e.target.value)} className="mt-2 block w-full rounded-xl border border-[#d6d6d3] bg-[#f8f8f6] px-4 py-4 text-sm normal-case tracking-normal text-[#182638] outline-none focus:border-[#181818]"/></label>}<label className="block text-xs font-black uppercase tracking-[.12em] text-[#596778]">Email address<input required type="email" autoComplete="email" placeholder="you@business.com" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full rounded-xl border border-[#d6d6d3] bg-[#f8f8f6] px-4 py-4 text-sm normal-case tracking-normal text-[#182638] outline-none focus:border-[#181818]"/></label><label className="block text-xs font-black uppercase tracking-[.12em] text-[#596778]">Password<input required type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="signup"?6:undefined} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-xl border border-[#d6d6d3] bg-[#f8f8f6] px-4 py-4 text-sm normal-case tracking-normal text-[#182638] outline-none focus:border-[#181818]"/></label>{mode==="login"&&<div className="text-right"><button type="button" onClick={reset} className="text-xs font-extrabold text-[#181818] hover:underline">Forgot password?</button></div>}<button disabled={busy!==""} className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl bg-[#181818] px-5 py-4 text-sm font-black text-white transition hover:bg-[#333333] disabled:opacity-60">{busy==="auth"?"Please wait...":mode==="login"?"Open dashboard →":"Create account →"}</button></form>
        <div className="mt-9 border-t border-[#e7e7e5] pt-8"><p className="text-xs font-black uppercase tracking-[.14em] text-[#555555]">Looking for a plan?</p><p className="mt-2 text-xs leading-6 text-[#656565]">Pick a plan after creating your Fugth account. Secure card payments are completed within the Fugth website when checkout is configured.</p><div className="mt-5 space-y-2">{tiers.map(t=><div key={t.key} className="flex items-center justify-between gap-4 rounded-xl border border-[#dededb] p-3.5"><div><p className="mb-0 text-sm font-black">{t.name} <span className="ml-1 font-bold text-[#181818]">{t.price}/mo</span></p><p className="mb-0 mt-1 text-xs text-[#666666]">{t.summary}</p></div><button disabled={busy!==""} type="button" onClick={()=>checkout(t.key)} className="rounded-lg bg-[#eeeeea] px-3 py-2 text-xs font-black text-[#171717] disabled:opacity-50">Choose ↗</button></div>)}</div></div>
      </section>
    </div><footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 pb-10 text-xs text-[#767676] sm:flex-row sm:px-8"><span>© {new Date().getFullYear()} Fugth Chat LLC</span><a href="mailto:fugthmanagement@gmail.com" className="font-bold text-[#181818]">Need help? Contact support →</a></footer>
  </main>;
}
