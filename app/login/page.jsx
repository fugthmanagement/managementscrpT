"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createUserWithEmailAndPassword,sendPasswordResetEmail,signInWithEmailAndPassword} from "firebase/auth";
import {doc,setDoc,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../../lib/firebase";
import {detectIndustry} from "../../lib/site-presets";
const field="mt-2 w-full rounded-xl border border-[#dfe4db] bg-white px-4 py-3.5 text-[15px] text-[#283629] outline-none focus:border-[#70866b] focus:ring-2 focus:ring-[#e6ede0]";

export default function Login(){
 const [mode,setMode]=useState("login"),[businessName,setBusinessName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(new URLSearchParams(window.location.search).has("signup"))setMode("signup");},[]);
 async function submit(e){e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   if(!auth)throw Error("Sign in is temporarily unavailable.");
   const address=email.trim();
   if(password.length<6)throw Error("Enter a password of at least six characters.");
   if(mode==="login"){
      await signInWithEmailAndPassword(auth,address,password);
      window.location.replace("/dashboard");return;
   }
   const created=await createUserWithEmailAndPassword(auth,address,password);
   try{
     if(db)await setDoc(doc(db,"users",created.user.uid),{businessName:businessName.trim(),businessType:detectIndustry(businessName),email:address,createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
   }catch{ /* Account was created; dashboard can finish workspace setup. */ }
   try{
      const token=await created.user.getIdToken();
      await Promise.allSettled([
        fetch("/api/sites/"+encodeURIComponent(created.user.uid),{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({action:"initialize"})}),
        fetch("/api/account-number",{method:"POST",headers:{Authorization:"Bearer "+token}})
      ]);
   }catch{ /* Provisioning retries from workspace when configured. */ }
   window.location.replace("/plans");
  }catch(err){
   const text=String(err?.code||err?.message||"Could not sign in");
   setError(text.includes("auth/email-already-in-use")?"An account already exists with this email. Please log in.":text.includes("auth/invalid-credential")?"The email or password is incorrect.":text.includes("auth/weak-password")?"Choose a stronger password.":text.includes("auth/too-many-requests")?"Too many attempts. Try again later.":text.replace(/^Firebase:\s*/,""));
  }finally{setBusy(false);}
 }
 async function reset(){
  setError("");setNotice("");
  if(!auth||!email.trim()){setError("Enter your email address first.");return;}
  try{await sendPasswordResetEmail(auth,email.trim());setNotice("If an account exists with this email, password-reset instructions are on the way.");}
  catch{setNotice("If an account exists with this email, you'll receive reset instructions.");}
 }
 return <main className="min-h-screen bg-[#f8faf7] text-[#27372b]">
  <header className="mx-auto flex h-[82px] max-w-6xl items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2b3c2c] text-xl font-black text-white">F</span><b className="text-[22px] font-semibold tracking-[-.08em]">fugth.</b></Link><Link href="/" className="text-xs font-semibold text-[#778674]">← Return to website</Link></header>
  <div className="mx-auto grid max-w-6xl items-stretch gap-8 px-5 pb-14 pt-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:pb-20 lg:pt-12">
   <aside className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-[28px] bg-[#293e2f] px-12 py-14 text-white lg:flex"><div className="absolute -right-24 top-10 h-[440px] w-[440px] rounded-full border-[80px] border-white/5"/><div className="relative"><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#afc6ae]">A BETTER WAY TO RUN YOUR DAY</p><h1 className="mt-12 max-w-md text-[64px] font-semibold leading-[1.04] tracking-[-.08em]">Your business.<br/><span className="font-serif font-normal italic text-[#b5cbb1]">In good hands.</span></h1><p className="mt-9 max-w-sm text-[15px] leading-8 text-[#cfddcd]">Calls, customers, your website—together in a simpler workspace that feels like yours.</p></div><div className="relative grid grid-cols-3 gap-3">{["Stay connected","Stay organized","Look your best"].map((x,i)=><div key={x} className="rounded-xl border border-white/15 bg-white/5 p-4"><p className="text-[10px] text-[#91ab8d]">0{i+1}</p><p className="mt-6 text-xs font-semibold leading-5">{x}</p></div>)}</div></aside>
   <section className="flex min-h-[570px] flex-col justify-center rounded-[28px] border border-[#e3e9e0] bg-white p-6 sm:p-10 lg:p-12"><div className="mb-9 inline-flex w-fit gap-1 rounded-xl bg-[#f1f4ee] p-1"><button type="button" onClick={()=>{setMode("login");setError("");}} className={`rounded-lg px-5 py-2.5 text-xs font-semibold ${mode==="login"?"bg-[#293c2d] text-white":"text-[#788974]"}`}>Log in</button><button type="button" onClick={()=>{setMode("signup");setError("");}} className={`rounded-lg px-5 py-2.5 text-xs font-semibold ${mode==="signup"?"bg-[#293c2d] text-white":"text-[#788974]"}`}>Create account</button></div>
    <h2 className="text-[36px] font-semibold tracking-[-.07em] sm:text-[46px]">{mode==="login"?"Welcome back.":"Start something good."}</h2><p className="mt-3 text-sm leading-7 text-[#89998a]">{mode==="login"?"Pick up right where your business left off.":"A workspace of your own, built in just a few steps."}</p>
    <form onSubmit={submit} className="mt-8 space-y-5">{mode==="signup"&&<label className="block text-xs font-semibold text-[#566857]">Business name<input required maxLength={80} autoComplete="organization" value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Your business name" className={field}/></label>}<label className="block text-xs font-semibold text-[#566857]">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" className={field}/></label><label className="block text-xs font-semibold text-[#566857]">Password<input type="password" required minLength={6} autoComplete={mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" className={field}/></label>
     {error&&<p role="alert" className="rounded-xl border border-[#f0d8c8] bg-[#fff6ef] p-4 text-sm text-[#965c3b]">{error}</p>}
     {notice&&<p role="status" className="rounded-xl border border-[#d9e7d4] bg-[#f3f8ef] p-4 text-sm text-[#54724e]">{notice}</p>}
     <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#293b2b] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#405740] disabled:opacity-50">{busy?"One moment…":mode==="login"?"Log in to FUGTH →":"Create my account →"}</button>
    </form>
    {mode==="login"&&<button type="button" onClick={reset} className="mt-5 self-start text-xs font-semibold text-[#688069] underline underline-offset-4">Forgot your password?</button>}
    <p className="mt-10 border-t border-[#eef0e9] pt-6 text-xs leading-6 text-[#a1aaa0]">Your workspace belongs to you. Keep your account information private.</p>
   </section>
  </div>
 </main>;
}
