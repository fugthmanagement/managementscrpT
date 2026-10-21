"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "../../../lib/firebase";
export default function ClaimDemo({params}){
 const id=params.id;
 const [user,setUser]=useState(null),[demo,setDemo]=useState(null),[error,setError]=useState(""),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,setUser)},[]);
 useEffect(()=>{if(!/^[a-f0-9]{24}$/.test(id)){setError("Invalid demo link.");return;}
  fetch("/api/demo/"+id,{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Preview is unavailable.");setDemo(j)})
   .catch(e=>setError(e.message));
 },[id]);
 async function request(){
  setBusy(true);setError("");
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
   const r=await fetch("/api/dev/demo-claim",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({action:"request",demoId:id})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Could not submit request.");
   setDone(true);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="grid min-h-screen place-items-center bg-[#f2f9fd] px-4 py-12 text-[#193c52]">
  <section className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[#d2e7f1] bg-white shadow-xl">
   <div className="bg-[#123349] p-7 text-white sm:p-9">
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a2d8f7]">FUGTH / WEBSITE OWNERSHIP</p>
    <h1 className="mt-3 text-3xl font-black">Claim your website concept</h1>
    <p className="mt-3 text-sm leading-7 text-[#c9e1ed]">A sample site has been prepared by FUGTH. The design is not an official business website until the verified owner reviews and approves it.</p>
   </div>
   <div className="space-y-5 p-7 sm:p-9">
    {demo&&<div className="rounded-xl bg-[#eaf7fd] p-4"><strong>{demo.name||demo.site?.name}</strong>
     <a href={"/demo/site/"+id} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs font-bold text-[#297ca5] underline">View sample website ↗</a></div>}
    <p className="text-sm leading-7">Claiming requires a FUGTH account. You can sign up with Google or email. FUGTH must independently verify that you own or represent the business before giving you control of the website draft. Ownership is never transferred just because someone has the public preview link.</p>
    {done?<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Claim request received. We'll review business ownership before assigning your private Site Maker draft. This request did not publish a site or start a subscription.</p>:
     user?<div className="space-y-3"><p className="text-xs">Signed in as <strong>{user.email}</strong></p>
      <button disabled={!demo||busy} onClick={request} className="rounded-xl bg-[#174961] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Submitting…":"Request verified ownership & claim"}</button></div>:
     <div className="flex flex-wrap gap-3">
      <Link href={"/login?signup=1&next="+encodeURIComponent("/claim/"+id)} className="rounded-xl bg-[#174961] px-5 py-3 text-xs font-black text-white">Sign up with Google or email</Link>
      <Link href={"/login?next="+encodeURIComponent("/claim/"+id)} className="rounded-xl border border-[#bfd8e7] px-5 py-3 text-xs font-black">Already registered? Sign in</Link>
     </div>}
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-800">{error}</p>}
    <p className="text-xs text-[#6f8fa4]"><Link href={"/book?site="+id} className="font-bold underline">Book a consultation without signing in ↗</Link></p>
   </div>
  </section>
 </main>;
}
