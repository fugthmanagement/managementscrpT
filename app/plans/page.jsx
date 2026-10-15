"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "../../lib/firebase";
import {BILLING_PLANS,BILLING_ADDONS,addonAmount,dollars,customSetupLabel} from "../../lib/billing-catalog";
const plans=Object.values(BILLING_PLANS);
export default function Plans(){
 const [currentUser,setCurrentUser]=useState(null),[authReady,setAuthReady]=useState(false);
 const [selected,setSelected]=useState("growth"),[addons,setAddons]=useState([]),[cycle,setCycle]=useState("monthly");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const unsub=onAuthStateChanged(auth,u=>{setCurrentUser(u);setAuthReady(true);});
  const requested=new URLSearchParams(window.location.search).get("plan");
  if(BILLING_PLANS[requested])setSelected(requested);
  if(new URLSearchParams(window.location.search).get("cycle")==="yearly")setCycle("yearly");
  return()=>unsub();
 },[]);
 const plan=BILLING_PLANS[selected];
 const billable=useMemo(()=>addons.filter(a=>addonAmount(selected,a)>0),[selected,addons]);
 const addonMonthly=billable.reduce((n,a)=>n+addonAmount(selected,a),0);
 const multiplier=cycle==="yearly"?12:1;
 const total=(plan.monthly+addonMonthly)*multiplier;
 function switchPlan(key){setSelected(key);setAddons(v=>v.filter(a=>addonAmount(key,a)>0));setError("");}
 function toggle(key){setAddons(prev=>prev.includes(key)?prev.filter(x=>x!==key):[...prev,key]);}
 async function checkout(){
  setBusy(true);setError("");
  try{
   if(!currentUser)throw Error("Sign in before subscribing.");
   const token=await currentUser.getIdToken();
   const response=await fetch("/api/stripe/checkout",{method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({planKey:selected,addons:billable,billingCycle:cycle})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Could not start payment.");
   if(!result.url||!result.url.startsWith("https://checkout.stripe.com/"))throw Error("FUGTH checkout is temporarily unavailable. Please try again.");
   window.location.assign(result.url);
  }catch(e){setError(e.message||"FUGTH checkout unavailable.");setBusy(false);}
 }
 return <main className="min-h-screen bg-[#f8faf7] text-[#29382d]">
  <header className="border-b border-[#e7ece3] bg-[#f8faf7]"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5"><Link href="/" className="text-2xl font-bold tracking-tight">fugth.</Link><Link href={currentUser?"/dashboard":"/login"} className="rounded-xl border bg-white px-5 py-3 text-xs font-semibold">Back to workspace ↗</Link></div></header>
  <div className="mx-auto max-w-6xl px-5 pb-24 pt-14">
   <p className="text-xs font-bold uppercase tracking-[.18em] text-[#799077]">PLANS + PROFESSIONAL SETUP</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.07em] sm:text-6xl">Build your business command center.</h1>
   <p className="mt-4 max-w-3xl text-sm leading-7 text-[#738672]">Your FUGTH subscription powers the software. A separate one-time setup fee pays for your business-specific onboarding, receptionist configuration, integrations and implementation.</p>
   <div className="mt-7 flex w-fit rounded-xl border border-[#dce7d9] bg-white p-1"><button type="button" onClick={()=>setCycle("monthly")} className={"rounded-lg px-5 py-3 text-xs font-bold "+(cycle==="monthly"?"bg-[#2c4934] text-white":"text-[#758b73]")}>Monthly billing</button><button type="button" onClick={()=>setCycle("yearly")} className={"rounded-lg px-5 py-3 text-xs font-bold "+(cycle==="yearly"?"bg-[#2c4934] text-white":"text-[#758b73]")}>Yearly billing</button></div>
   <p className="mt-2 text-xs text-[#819581]">Yearly billing combines twelve monthly payments into one yearly charge, without an additional discount.</p>
   <div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map(p=><article key={p.key} className={"flex flex-col rounded-[24px] border p-6 sm:p-7 "+(selected===p.key?"border-[#2a4633] bg-[#263f2e] text-white shadow-xl":"border-[#e2e8df] bg-white text-[#29392d]")}>
    <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{p.name}</h2>{p.key==="growth"&&<span className="rounded-full border border-current/30 px-3 py-1.5 text-[10px] font-bold">Popular</span>}</div>
    <p className="mt-3 min-h-[72px] text-sm leading-6 opacity-80">{p.description}</p>
    <p className="mt-4"><strong className="text-5xl tracking-tight">{dollars(p.monthly*multiplier)}</strong><span className="ml-2 text-xs opacity-70">/ {cycle==="yearly"?"year":"month"}</span></p>
    <p className="mt-3 rounded-xl border border-current/20 p-3 text-sm"><strong>{dollars(p.setup)}</strong> one-time setup</p>
    <ul className="my-6 flex-1 space-y-2 border-t border-current/20 pt-5 text-xs leading-6">{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul>
    <button type="button" onClick={()=>switchPlan(p.key)} className={"rounded-xl px-5 py-4 text-sm font-semibold "+(selected===p.key?"bg-white text-[#263f2e]":"bg-[#eef4e9] text-[#33513a]")}>{selected===p.key?"Selected ✓":"Choose "+p.name+" ↗"}</button>
   </article>)}</div>
   <section className="mt-10 rounded-[24px] border border-[#e0e6de] bg-white p-6 sm:p-8">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-[#859985]">FLEXIBLE ADD-ONS</p><h2 className="mt-2 text-2xl font-semibold">Customize your {plan.name} plan.</h2>
    <p className="mt-2 max-w-3xl text-xs leading-6 text-[#819080]">Mid and High include more features by default. Buying several Low-plan upgrades can cost more than moving up to Mid or High. Voice minutes, text messages and other third-party usage have separate fair-use limits.</p>
    <div className="mt-6 grid gap-3 md:grid-cols-2">{Object.entries(BILLING_ADDONS).map(([key,item])=>{
     const price=addonAmount(selected,key),included=price===0,checked=included||addons.includes(key);
     return <label key={key} className={"flex items-start justify-between gap-3 rounded-xl border p-4 "+(included?"border-[#deebd7] bg-[#f3f8ef]":"border-[#e1e8df]")}>
      <div className="flex items-start gap-3"><input type="checkbox" checked={checked} disabled={included} onChange={()=>toggle(key)} className="mt-1 h-4 w-4 accent-[#34563b]"/><span><strong className="block text-sm">{item.name}</strong><span className="mt-1 block text-xs leading-5 text-[#889487]">{item.description}</span></span></div>
      <span className="shrink-0 text-xs font-bold text-[#36563d]">{included?"Included":"+"+dollars(price*multiplier)+"/"+(cycle==="yearly"?"yr":"mo")}</span>
     </label>;
    })}</div>
    <p className="mt-5 text-xs leading-6 text-[#8b9987]">{customSetupLabel} Extra implementation or usage beyond your chosen package requires a separate quote.</p>
   </section>
   <section className="mt-8 grid gap-6 rounded-[24px] border border-[#d8e3d5] bg-[#eef5e9] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
    <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#71876e]">YOUR CHECKOUT SUMMARY</p><h2 className="mt-3 text-2xl font-semibold">{plan.name} + {billable.length} paid add-on(s)</h2>
     <p className="mt-3 text-sm">Subscription: <strong>{dollars(total)} / {cycle==="yearly"?"year":"month"}</strong></p>
     <p className="mt-1 text-sm">One-time professional setup: <strong>{dollars(plan.setup)}</strong></p>
     <p className="mt-2 text-lg font-bold">First checkout: {dollars(plan.setup+total)} before tax or discounts.</p>
     <p className="mt-3 max-w-xl text-xs leading-6 text-[#809180]">Subscriptions renew {cycle==="yearly"?"yearly":"monthly"} until canceled. Setup is billed once; eligible site packages include personalized website preparation within 24 hours after you provide required materials. No call overages or paid upgrade will be charged without authorization.</p>
    </div>
    <div className="w-full lg:w-[250px]"><button type="button" disabled={!currentUser||busy} onClick={checkout} className="w-full rounded-xl bg-[#2a4833] px-6 py-4 text-sm font-bold text-white disabled:opacity-45">{busy?"Opening payment…":"Continue to secure checkout ↗"}</button>
     {!currentUser&&authReady&&<Link href="/login" className="mt-3 block text-center text-xs font-semibold underline">Log in to subscribe</Link>}
    </div>
   </section>
   {error&&<p role="alert" className="mt-5 rounded-xl border border-[#e9cfc7] bg-[#fff5ef] p-4 text-sm text-[#97543e]">{error}</p>}
   <p className="mt-6 text-xs text-[#9aab96]">24-hour limited-credit trials are planned separately and will pause when the time or credit allowance ends, whichever comes first. Trial access does not auto-charge customers.</p>
  </div>
 </main>;
}
