"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc,onSnapshot } from "firebase/firestore";
import {auth,db} from "../../../lib/firebase";
const date=s=>{if(!s)return "Waiting for Stripe confirmation";const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString():"Waiting for Stripe confirmation";};
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
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f6] px-5 py-14 text-zinc-950"><section className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-7 shadow-lg sm:p-10"><Link href="/" className="text-sm font-black">FUGTH MANAGEMENT</Link><p className="mt-10 text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">SUBSCRIPTION STATUS</p><h1 className="mt-4 text-3xl font-black tracking-tight">{active?"Your subscription is active.":"We're confirming your payment."}</h1><p className="mt-4 text-sm leading-7 text-zinc-600">{active?"Your Stripe subscription has been verified and recorded in your Fugth account.":"Your payment is not yet confirmed in your Fugth account. Stripe sends secure server notifications; your plan activates only after the subscription status is verified."}</p>{loading&&<p className="mt-6 text-sm text-zinc-500">Checking account status...</p>}{signedOut&&<p className="mt-6 text-sm text-zinc-500">Sign in with the account you used at checkout to see your plan.</p>}{error&&<p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">{error}</p>}{active&&<div className="mt-7 rounded-2xl bg-zinc-100 p-5"><p className="text-sm font-black">{String(profile.planTier||"").toUpperCase()}</p><p className="mt-2 text-sm text-zinc-600">Next renewal: {date(profile.billingRenewsAt||profile.billingCurrentPeriodEnd)}</p></div>}<div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Open workspace →</Link><Link href="/plans" className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-700">Subscription plans</Link></div><p className="mt-6 text-xs leading-6 text-zinc-500">The success screen does not by itself activate service. You can return to this account view after webhook verification.</p></section></main>;
}