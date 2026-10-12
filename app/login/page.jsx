"use client";

import Link from "next/link";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const tiers = [
  {key:"starter",name:"Starter",price:"$49",summary:"For solo operators"},
  {key:"growth",name:"Growth",price:"$149",summary:"For teams on the move"},
  {key:"elite",name:"Elite",price:"$499",summary:"For advanced operations"},
];

export default function Login(){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
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
      else await createUserWithEmailAndPassword(auth,e,password);
      window.location.assign("/dashboard");
    }catch(err){setError(String(err?.message||"Could not sign in").replace("Firebase: ",""));}
    finally{setBusy("");}
  }
  async function reset(){
    setError("");setNotice("");
    if(!email.trim()){setError("Enter your email first to receive a reset link.");return;}
    try{await sendPasswordResetEmail(auth,email.trim());setNotice("If that email is registered, check your inbox for password reset instructions.");}
    catch(err){setError(err.message||"Could not send reset email.");}
  }
  async function checkout(planKey){
    setBusy(planKey);setError("");
    try{
      const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({planKey,email:email.trim()})});
      const data=await response.json();
      if(!response.ok||!data.url)throw new Error(data.error||"Checkout is unavailable.");
      window.location.assign(data.url);
    }catch(err){setError(err.message||"Checkout failed.");setBusy("");}
  }
  return <main className="min-h-screen bg-[#f8f7f2] text-[#142434]">
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-6 sm:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#4059ed] text-3xl font-black text-white">F</span><span><strong className="block text-xl font-black tracking-tight">Fugth<span className="text-[#4059ed]">.</span></strong><small className="block text-[9px] font-black tracking-[.2em] text-slate-500">MANAGEMENT OS</small></span></Link>
      <Link href="/" className="rounded-xl border border-[#dbe0e6] bg-white px-4 py-2.5 text-xs font-extrabold text-[#142434] sm:text-sm">← Back to website</Link>
    </header>
    <div className="mx-auto grid max-w-7xl items-stretch gap-7 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative flex min-h-[580px] flex-col overflow-hidden rounded-[2rem] bg-[#4059ed] p-8 text-white sm:p-12 lg:min-h-[710px]">
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full border-[58px] border-white/10"/>
        <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#d1f391]/90 blur-[80px]"/>
        <div className="relative z-10"><div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em]">✳ Your Fugth Workspace</div><h1 className="mt-10 text-5xl font-black leading-[1.02] tracking-[-.065em] sm:text-6xl">Your best<br/>business day<br/><span className="text-[#daf39c]">starts here.</span></h1><p className="mt-8 max-w-md text-base leading-8 text-indigo-100">Calls, leads, appointments and your AI receptionist—all managed in one place. Less juggling. More room to grow.</p></div>
        <div className="relative z-10 mt-auto pt-14"><div className="grid gap-3 sm:grid-cols-3">{[["01","Voice AI"],["02","Leads & CRM"],["03","Appointments"]].map(x=><div key={x[0]} className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur"><span className="text-xs font-extrabold text-[#d2f38b]">{x[0]}</span><p className="mb-0 mt-4 text-sm font-black">{x[1]}</p></div>)}</div></div>
      </section>
      <section className="flex flex-col justify-center rounded-[2rem] border border-[#e1e4e6] bg-white p-7 shadow-sm sm:p-11">
        <div className="mb-8"><div className="flex w-fit rounded-full bg-[#edf0f5] p-1"><button onClick={()=>{setMode("login");setError("");}} className={`rounded-full px-5 py-2.5 text-xs font-black transition ${mode==="login"?"bg-[#142434] text-white shadow-sm":"text-[#566574]"}`}>Sign in</button><button onClick={()=>{setMode("signup");setError("");}} className={`rounded-full px-5 py-2.5 text-xs font-black transition ${mode==="signup"?"bg-[#142434] text-white shadow-sm":"text-[#566574]"}`}>Create account</button></div><h2 className="mt-8 text-3xl font-black tracking-[-.055em] sm:text-4xl">{mode==="login"?"Welcome back.":"Welcome to Fugth."}</h2><p className="mt-3 text-sm leading-7 text-[#6d7b87]">{mode==="login"?"Sign in to your business command center.":"Create your business account to start setting up your workspace."}</p></div>
        {error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice&&<p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <form onSubmit={submit} className="space-y-4"><label className="block text-xs font-black uppercase tracking-[.12em] text-[#596778]">Email address<input required type="email" autoComplete="email" placeholder="you@business.com" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full rounded-xl border border-[#dce2e8] bg-[#f8f9fb] px-4 py-4 text-sm normal-case tracking-normal text-[#182638] outline-none focus:border-[#4059ed]"/></label><label className="block text-xs font-black uppercase tracking-[.12em] text-[#596778]">Password<input required type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="signup"?6:undefined} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-xl border border-[#dce2e8] bg-[#f8f9fb] px-4 py-4 text-sm normal-case tracking-normal text-[#182638] outline-none focus:border-[#4059ed]"/></label>{mode==="login"&&<div className="text-right"><button type="button" onClick={reset} className="text-xs font-extrabold text-[#4059ed] hover:underline">Forgot password?</button></div>}<button disabled={busy!==""} className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl bg-[#4059ed] px-5 py-4 text-sm font-black text-white transition hover:bg-[#2b40c6] disabled:opacity-60">{busy==="auth"?"Please wait...":mode==="login"?"Open dashboard →":"Create account →"}</button></form>
        <div className="mt-9 border-t border-[#e7e9ed] pt-8"><p className="text-xs font-black uppercase tracking-[.14em] text-[#5a6978]">Looking for a plan?</p><p className="mt-2 text-xs leading-6 text-[#80909a]">Choose a subscription through Stripe. Calling usage and onboarding terms depend on the plan you select.</p><div className="mt-5 space-y-2">{tiers.map(t=><div key={t.key} className="flex items-center justify-between gap-4 rounded-xl border border-[#e3e8ed] p-3.5"><div><p className="mb-0 text-sm font-black">{t.name} <span className="ml-1 font-bold text-[#4059ed]">{t.price}/mo</span></p><p className="mb-0 mt-1 text-xs text-[#82909b]">{t.summary}</p></div><button disabled={busy!==""} type="button" onClick={()=>checkout(t.key)} className="rounded-lg bg-[#edf0ff] px-3 py-2 text-xs font-black text-[#4059ed] disabled:opacity-50">Choose ↗</button></div>)}</div></div>
      </section>
    </div><footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 pb-10 text-xs text-[#87919a] sm:flex-row sm:px-8"><span>© {new Date().getFullYear()} Fugth Chat LLC</span><a href="mailto:fugthmanagement@gmail.com" className="font-bold text-[#4059ed]">Need help? Contact support →</a></footer>
  </main>;
}
