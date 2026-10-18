"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,getRedirectResult,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "firebase/auth";
import {auth} from "../../../../lib/firebase";
const input="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400";
const dollars=cents=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(cents||0)/100);
export default function CustomerPortal({params}){
 const uid=params.uid;
 const [user,setUser]=useState(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[mode,setMode]=useState("signin"),[message,setMessage]=useState(""),[record,setRecord]=useState(null),[loading,setLoading]=useState(false);
 const [email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [profile,setProfile]=useState({displayName:"",phone:"",address:""});
 async function load(current){
  if(!current){setRecord(null);setLoading(false);return;}
  setLoading(true);
  try{
   const token=await current.getIdToken();
   const response=await fetch("/api/sites/"+encodeURIComponent(uid)+"/portal",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Account unavailable");
   setRecord(data);setProfile({displayName:data.member?.displayName||current.displayName||"",phone:data.member?.phone||"",address:data.member?.address||""});
  }catch(e){setMessage(e.message);setRecord(null)}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  if(!auth){setMessage("Sign-in is not configured.");setReady(true);return;}
  getRedirectResult(auth).catch(e=>setMessage(e.message));
  const off=onAuthStateChanged(auth,u=>{setUser(u);setReady(true);setMessage("");load(u)});
  return ()=>off();
 },[uid]);
 async function google(){
  setBusy(true);setMessage("");
  try{
   const provider=new GoogleAuthProvider();
   provider.setCustomParameters({prompt:"select_account"});
   try{await signInWithPopup(auth,provider)}
   catch(e){if(["auth/popup-blocked","auth/operation-not-supported-in-this-environment"].includes(e.code)){await signInWithRedirect(auth,provider);return;}throw e}
  }catch(e){setMessage(e.message||"Google sign-in failed. Check Firebase authorized domains.")}
  finally{setBusy(false)}
 }
 async function emailLogin(e){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   if(!email.trim()||password.length<6)throw Error("Enter email and a password with at least 6 characters.");
   if(mode==="signup")await createUserWithEmailAndPassword(auth,email.trim(),password);
   else await signInWithEmailAndPassword(auth,email.trim(),password);
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 async function saveProfile(e){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const token=await user.getIdToken();
   const response=await fetch("/api/sites/"+encodeURIComponent(uid)+"/portal",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({action:"profile",...profile})});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Could not save");
   setMessage("Your customer profile was saved.");await load(user);
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 const siteUrl="/sites/"+encodeURIComponent(uid);
 return <main className="min-h-screen bg-[#f4faff] px-4 py-8 text-[#19384a] sm:py-16"><div className="mx-auto max-w-5xl">
  <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#3e83aa]">Customer access</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{record?.businessName||"Your customer portal"}</h1><p className="mt-2 text-sm text-slate-600">Private account, service history and recorded payments for this business only.</p></div><Link href={siteUrl} className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold">← Continue as guest</Link></header>
  {message&&<p role="status" className="mb-5 rounded-xl border border-sky-200 bg-white p-4 text-sm">{message}</p>}
  {!ready||loading?<p className="rounded-2xl bg-white p-8">Loading your account…</p>:!user?<div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
   <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/40 sm:p-9"><h2 className="text-2xl font-black">Sign in to your customer account</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use Google or email to see your address, jobs and payments saved by this business. Guests can browse the website without signing in.</p>
    <button disabled={busy} onClick={google} className="mt-7 w-full rounded-xl border border-[#7cbfe0] bg-[#e4f5ff] px-4 py-3 font-bold text-[#155b7d] disabled:opacity-50">Continue with Google</button>
    <p className="my-5 text-center text-xs text-slate-500">or use your email</p>
    <div className="mb-4 flex gap-2">{[["signin","Sign in"],["signup","Create customer account"]].map(([key,label])=><button key={key} onClick={()=>setMode(key)} className={"rounded-lg px-4 py-2 text-xs font-bold "+(mode===key?"bg-[#155b7d] text-white":"bg-[#eef5f9]")}>{label}</button>)}</div>
    <form onSubmit={emailLogin} className="space-y-3"><input className={input} type="email" required placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><input className={input} type="password" minLength={6} required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy} className="w-full rounded-xl bg-[#19384a] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?"Working…":mode==="signup"?"Create customer account":"Sign in"}</button></form>
   </section><aside className="rounded-3xl border border-sky-100 bg-[#e3f4fe] p-7 sm:p-9"><h2 className="text-xl font-black">What you'll find here</h2><div className="mt-6 space-y-5">{[["01","Your contact information and address"],["02","Work the business has scheduled or completed"],["03","Itemized totals and amounts the business has recorded as paid"]].map(([n,line])=><div key={n} className="flex gap-4"><span className="text-xl font-black text-[#438cb6]">{n}</span><p className="text-sm leading-6">{line}</p></div>)}</div><p className="mt-9 text-xs leading-6 text-slate-600">This portal does not process payments and does not import historical invoices automatically. Your business must add or verify each record.</p></aside>
   </div>:
   record?.role==="owner"?<section className="rounded-2xl bg-white p-8"><h2 className="text-xl font-bold">You're signed in as the business owner.</h2><Link href={siteUrl+"/customers"} className="mt-4 inline-block rounded-xl bg-[#155b7d] px-5 py-3 text-white">Open your business customer dashboard →</Link></section>:
   <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
    <section className="rounded-3xl border border-sky-100 bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Your profile</h2><button type="button" onClick={()=>signOut(auth)} className="text-xs font-bold text-[#2a759f] underline">Sign out</button></div><p className="mt-2 text-xs text-slate-500">{user.email}</p>
     <form onSubmit={saveProfile} className="mt-6 space-y-4">{[["displayName","Name"],["phone","Phone"],["address","Service / billing address"]].map(([key,label])=><label key={key} className="block text-sm font-semibold">{label}<input required={key==="displayName"} className={"mt-2 "+input} value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})} maxLength={key==="address"?240:90}/></label>)}<button disabled={busy} className="w-full rounded-xl bg-[#155b7d] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?"Saving…":"Save customer details"}</button></form>
     {!record?.member&&<p className="mt-4 text-xs leading-6 text-slate-500">Save your details to join this business's customer list. You can still browse the site as a guest.</p>}
    </section>
    <section className="rounded-3xl border border-sky-100 bg-white p-6 sm:p-8"><h2 className="text-xl font-black">Your work and payments</h2><p className="mt-2 text-sm text-slate-600">Only entries recorded by this business appear here.</p>{record?.records?.length?<div className="mt-6 space-y-4">{record.records.map(item=><article key={item.id} className="rounded-2xl border border-sky-100 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.title}</h3><span className="rounded-full bg-[#e4f5ff] px-3 py-1 text-xs font-bold text-[#155b7d]">{item.status?.replaceAll("_"," ")}</span></div><p className="mt-2 text-sm text-slate-600">{item.description}</p><p className="mt-2 text-xs text-slate-500">{item.serviceDate||"Date to be confirmed"}</p><div className="mt-4 flex gap-6 text-sm"><p>Total: <strong>{dollars(item.totalCents)}</strong></p><p>Recorded paid: <strong>{dollars(item.paidCents)}</strong></p></div></article>)}</div>:<p className="mt-7 rounded-xl bg-[#f4faff] p-5 text-sm text-slate-600">No work or payment entries have been added to your account yet.</p>}</section>
   </div>}
 </div></main>;
}
