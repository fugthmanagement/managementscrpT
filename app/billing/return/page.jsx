"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc,onSnapshot } from "firebase/firestore";
import {auth,db} from "../../../lib/firebase";
const date=s=>{if(!s)return "Awaiting payment confirmation";const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString():"Waiting for Stripe confirmation";};
export default function BillingReturn(){
  const [profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[signedOut,setSignedOut]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    if(!auth||!db){setError("Customer authentication is unavailable.");setLoading(false);return;}
    let offDoc=()=>{};
    const offAuth=onAuthStateChanged(auth,user=>{
      offDoc();
      if(!user){setSignedOut(true);setLoading(false);return;}
      setSignedOut(false);
      offDoc=onSnapshot(doc(db,"users",user.uid),snap=>{setProfile(snap.data()||{});setLoading(false);},e=>{setError(e.message);setLoading(false);});
    });
    return()=>{offAuth();offDoc();};
  },[]);
  const active=profile?.billingActive===true;
  return <main className="flex min-h-screen items-center justify-center bg-[#f8faf7] px-5 py-14 text-[#293b2e]"><section className="w-full max-w-xl rounded-[24px] border border-[#e0e8dc] bg-white p-7 shadow-sm sm:p-10"><Link href="/" className="text-sm font-semibold">FUGTH MANAGEMENT</Link><p className="mt-10 text-[10px] font-black uppercase tracking-[.16em] text-[#899989]">SUBSCRIPTION STATUS</p><h1 className="mt-4 text-3xl font-black tracking-tight">{active?"Your subscription is active.":"We're confirming your payment."}</h1><p className="mt-4 text-sm leading-7 text-[#788777]">{active?"Your payment has been verified. Your FUGTH subscription is active.":"Your payment is being checked securely. Your plan will activate as soon as confirmation is complete."}</p>{loading&&<p className="mt-6 text-sm text-zinc-500">Checking account status...</p>}{signedOut&&<p className="mt-6 text-sm text-zinc-500">Sign in with the account you used at checkout to see your plan.</p>}{error&&<p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">{error}</p>}{active&&<div className="mt-7 rounded-2xl bg-[#f0f5ec] p-5"><p className="text-sm font-black">{String(profile.planTier||"").toUpperCase()}</p><p className="mt-2 text-sm text-zinc-600">Next renewal: {date(profile.billingRenewsAt||profile.billingCurrentPeriodEnd)}</p></div>}<div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard" className="rounded-xl bg-[#2d432f] px-5 py-3 text-sm font-black text-white">Open workspace →</Link><Link href="/plans" className="rounded-xl border border-[#e0e8dc] px-5 py-3 text-sm font-bold text-[#4e674b]">Subscription plans</Link></div><p className="mt-6 text-xs leading-6 text-zinc-500">The success screen does not by itself activate service. You can return to this account view after webhook verification.</p></section></main>;
}