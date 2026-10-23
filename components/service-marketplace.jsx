"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {onAuthStateChanged} from "firebase/auth";
import {doc,onSnapshot} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {BILLING_PLANS,BILLING_ADDONS,addonAmount,dollars,customSetupLabel} from "../lib/billing-catalog";
import {makeServiceCart} from "../lib/billing-cart";
import {CookieSettingsButton} from "./cookie-consent";

const CATALOG=Object.values(BILLING_PLANS);
const CART_KEY="fugth_services_cart_v3";
const safeCart=raw=>{
 if(!raw||typeof raw!=="object"||!(raw.planKey in BILLING_PLANS))return null;
 try{
  const cart=makeServiceCart(raw);
  return {planKey:cart.planKey,billingCycle:cart.cycle,addons:cart.addons,websiteOneTime:cart.websiteOneTime};
 }catch{return null;}
};
const defaultCart={planKey:null,billingCycle:"monthly",addons:[],websiteOneTime:false};
const chip="rounded-xl border border-[#cde3f0] px-4 py-2.5 text-xs font-bold transition";
const primary="rounded-xl bg-[#183c52] px-5 py-3.5 text-xs font-bold text-white shadow-[0_8px_22px_rgba(24,60,82,.18)] disabled:opacity-50";

export default function ServiceMarketplace({embedded=false,workspace=null}){
 const [selection,setSelection]=useState(defaultCart);
 const [cartLoaded,setCartLoaded]=useState(false);
 const [cartOpen,setCartOpen]=useState(false);
 const [user,setUser]=useState(null);
 const [authReady,setAuthReady]=useState(false);
 const [account,setAccount]=useState(null);
 const [offer,setOffer]=useState(null);
 const [readiness,setReadiness]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const attempt=useRef(null);
 useEffect(()=>{
  let saved=null;
  try{saved=safeCart(JSON.parse(localStorage.getItem(CART_KEY)||"null"));}catch{}
  const params=new URLSearchParams(window.location.search);
  const requested=params.get("plan");
  const fromUrl=BILLING_PLANS[requested]?requested:null;
  const starting=fromUrl?{
   planKey:fromUrl,
   billingCycle:params.get("cycle")==="yearly"?"yearly":"monthly",
   addons:[],websiteOneTime:false
  }:saved||defaultCart;
  setSelection(safeCart(starting)||defaultCart);
  setCartLoaded(true);
 },[]);
 useEffect(()=>{
  if(!cartLoaded)return;
  try{localStorage.setItem(CART_KEY,JSON.stringify(selection));}catch{}
  attempt.current=null;
 },[selection,cartLoaded]);
 useEffect(()=>{
  if(!auth){setAuthReady(true);return;}
  return onAuthStateChanged(auth,u=>{setUser(u);setAuthReady(true);});
 },[]);
 useEffect(()=>{
  if(!user?.uid||!db){setAccount(null);return;}
  return onSnapshot(doc(db,"users",user.uid),snap=>setAccount(snap.data()||{}),
   ()=>setAccount(null));
 },[user?.uid]);
 useEffect(()=>{
  if(!user){setReadiness(null);return;}
  let cancelled=false;
  (async()=>{
   try{
    const token=await user.getIdToken();
    const response=await fetch("/api/stripe/checkout/status",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
    const status=await response.json();
    if(!cancelled)setReadiness(response.ok?status:{ready:false,issues:[{message:status.error||"Billing preflight unavailable."}]});
   }catch{if(!cancelled)setReadiness(null);}
  })();
  return()=>{cancelled=true;};
 },[user?.uid]);
 useEffect(()=>{
  if(!user||typeof window==="undefined"||new URLSearchParams(location.search).get("offer")!=="1")return;
  let done=false;
  (async()=>{try{
   const token=await user.getIdToken();
   const result=await fetch("/api/billing/offer",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const data=await result.json();
   if(!done&&result.ok&&data.offer&&BILLING_PLANS[data.offer.planKey]){
    setOffer(data.offer);
    setSelection({planKey:data.offer.planKey,billingCycle:"monthly",addons:[],websiteOneTime:false});
   }
  }catch{}})();
  return()=>{done=true;};
 },[user?.uid]);
 const activeProfile=workspace||account;
 const hasPaidSubscription=activeProfile?.billingActive===true;
 const sitePurchased=activeProfile?.websitePurchased===true;
 const {planKey,billingCycle,addons,websiteOneTime}=selection;
 const plan=planKey?BILLING_PLANS[planKey]:null;
 const offerApplied=Boolean(offer&&planKey===offer.planKey);
 const quote=useMemo(()=>{
  if(!plan)return null;
  try{return makeServiceCart(selection,offerApplied?{baseCents:offer.priceCents,setupCents:offer.setupCents}:{});}
  catch{return null;}
 },[selection,offerApplied,offer,plan]);
 const count=quote?.count||0;
 const allowAnnual=Boolean(plan&&plan.kind!=="one_time"&&planKey!=="textback");
 const isExistingUpgrade=hasPaidSubscription&&plan?.kind!=="one_time";
 function choosePlan(key){
  setSelection(prev=>{
   if(prev.planKey===key)return defaultCart;
   const yearly=prev.billingCycle==="yearly"&&
    BILLING_PLANS[key].kind!=="one_time"&&key!=="textback";
   const compatible=prev.addons.filter(id=>addonAmount(key,id)>0);
   return {planKey:key,billingCycle:yearly?"yearly":"monthly",addons:compatible,
    websiteOneTime:key==="textback"?prev.websiteOneTime:false};
  });
  setError("");
 }
 function toggleAddon(id){
  setSelection(prev=>({...prev,addons:prev.addons.includes(id)?
   prev.addons.filter(x=>x!==id):[...prev.addons,id]}));
  setError("");
 }
 function clear(){setSelection(defaultCart);setError("");}
 async function authenticatedHeaders(){
  if(!user)throw Error("Sign in to continue.");
  return {Authorization:"Bearer "+await user.getIdToken(),"Content-Type":"application/json"};
 }
 async function checkout(){
  setBusy(true);setError("");
  try{
   if(!quote)throw Error("Add a service package before checkout.");
   if(!user){window.location.assign("/login?next=%2Fplans");return;}
   if(isExistingUpgrade)throw Error("You already have an active subscription. Manage changes through Stripe instead of buying another one.");
   if(sitePurchased&&(plan.kind==="one_time"||websiteOneTime))
    throw Error("Your one-time website purchase is already paid.");
   if(!attempt.current){
    const bytes=new Uint8Array(16);
    if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);
    else throw Error("Secure checkout requires an up-to-date browser.");
    attempt.current=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
   }
   const response=await fetch("/api/stripe/checkout",{
    method:"POST",cache:"no-store",headers:await authenticatedHeaders(),
    body:JSON.stringify({...selection,checkoutAttempt:attempt.current,useFounderOffer:offerApplied})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Stripe Checkout could not be opened.");
   if(!result.url?.startsWith("https://checkout.stripe.com/"))throw Error("Stripe did not provide a verified checkout link.");
   window.location.assign(result.url);
  }catch(e){setError(e.message||"Secure checkout temporarily unavailable.");setBusy(false);}
 }
 async function portal(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/stripe/portal",{method:"POST",cache:"no-store",
    headers:await authenticatedHeaders(),body:"{}"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Stripe subscription portal unavailable.");
   if(!result.url?.startsWith("https://billing.stripe.com/"))throw Error("Unexpected subscription portal link.");
   window.location.assign(result.url);
  }catch(e){setError(e.message||"Cannot open billing portal.");setBusy(false);}
 }
 return <div className={embedded?"w-full text-[#17374c]":"min-h-screen bg-[#f4faff] text-[#17374c]"}>
  {!embedded&&<header className="border-b border-white/15 bg-[#101e2a] text-white">
   <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
    <Link href="/" className="flex items-center gap-3 text-sm font-black"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b9e5fb] text-xl text-[#17435b]">F</span>FUGTH Management</Link>
    <div className="flex items-center gap-2"><Link href="/" className="rounded-full border border-white/25 px-4 py-2.5 text-xs font-semibold">Home</Link><Link href={user?"/dashboard":"/login?next=%2Fplans"} className="rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold">{user?"My workspace":"Log in"}</Link></div>
   </div>
  </header>}
  <section id="fugth-services" className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
   <div className="flex flex-wrap items-start justify-between gap-5">
    <div className="max-w-3xl">
     <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#367fa7]">FUGTH / SERVICES & UPGRADES</p>
     <h2 className="mt-3 text-3xl font-black tracking-[-.06em] sm:text-5xl">Build your services. <span className="text-[#438cb4]">One checkout.</span></h2>
     <p className="mt-4 text-sm leading-7 text-[#648295]">Choose one base package, add the compatible upgrades you need, and review every recurring and one-time item before paying through Stripe.</p>
    </div>
    <button type="button" onClick={()=>setCartOpen(x=>!x)} aria-expanded={cartOpen} aria-controls="fugth-services-cart" aria-label={"Service cart: "+count+" items"}
     className="inline-flex items-center gap-2 rounded-2xl border border-[#91c4df] bg-white px-4 py-3 font-black shadow-[0_10px_28px_rgba(16,67,97,.1)]">
      <span aria-hidden="true" className="text-xl">🛒</span><span>Cart</span>
      <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#163d53] px-2 text-xs text-white">{count}</span>
     </button>
   </div>
   {cartOpen&&<section id="fugth-services-cart" aria-label="Your service cart" className="mt-6 rounded-[24px] border border-[#bfdced] bg-white p-5 shadow-lg">
    <div className="flex items-center justify-between"><h3 className="text-lg font-black">Your service cart</h3><button type="button" onClick={clear} className="text-xs font-bold text-[#367e9e] underline" disabled={!quote}>Clear cart</button></div>
    {!quote?<p className="mt-3 text-sm text-[#718c9e]">No services selected yet. Choose a package below.</p>:<>
     <div className="mt-4 divide-y divide-[#e6eef4]">{quote.lines.map(item=><div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
      <span>{item.label}<span className="ml-2 text-[11px] text-[#7396a9]">{item.period}</span></span>
      <span className="flex shrink-0 items-center gap-3"><strong>{dollars(item.amountCents)}</strong>
       {item.id.startsWith("addon:")&&<button type="button" onClick={()=>toggleAddon(item.id.slice(6))} className="text-xs text-[#a34b45] underline">Remove</button>}
       {item.id==="website_once"&&<button type="button" onClick={()=>setSelection(v=>({...v,websiteOneTime:false}))} className="text-xs text-[#a34b45] underline">Remove</button>}
      </span>
     </div>)}</div>
     <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm font-black"><span>Estimated initial charge</span><span>{dollars(quote.firstChargeCents)}</span></div>
     <button type="button" onClick={()=>{setCartOpen(false);document.getElementById("fugth-cart-checkout")?.scrollIntoView({behavior:"smooth",block:"center"});}} className={primary+" mt-4"}>Review secure checkout ↓</button>
    </>}
   </section>}
   {hasPaidSubscription&&<div className="mt-6 rounded-2xl border border-[#b8d8e8] bg-[#eaf7fd] p-5">
    <h3 className="font-black">You already have an active FUGTH subscription.</h3>
    <p className="mt-2 text-xs leading-6 text-[#627f90]">Existing subscriptions are managed through your verified Stripe customer account so you are never charged for a duplicate plan. Available upgrade options depend on your Stripe billing portal configuration.</p>
    <button type="button" className={primary+" mt-3"} onClick={portal} disabled={busy}>Manage my subscription ↗</button>
   </div>}
   <div className="mt-7 flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-bold text-[#56788c]">Billing</span>
    {["monthly","yearly"].map(c=><button type="button" key={c} aria-pressed={billingCycle===c}
     disabled={c==="yearly"&&!allowAnnual&&!!plan}
     onClick={()=>setSelection(v=>({...v,billingCycle:c}))}
     className={chip+" "+(billingCycle===c?"border-[#204b64] bg-[#204b64] text-white":"bg-white text-[#537a90]")+" disabled:opacity-40"}>
      {c==="monthly"?"Monthly":"Yearly"}</button>)}
    <span className="text-[11px] text-[#829bac]">Annual recurring services are billed once per year.</span>
   </div>
   <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {CATALOG.map(p=><article key={p.key} className={"flex flex-col rounded-[24px] border p-5 shadow-[0_9px_35px_rgba(31,80,114,.06)] sm:p-6 "+(planKey===p.key?"border-[#4a91b8] bg-[#173749] text-white":"border-[#d6e6ef] bg-white")}>
     <div className="flex items-start justify-between gap-2"><h3 className="text-lg font-black">{p.name}</h3>{planKey===p.key&&<span className="rounded-full bg-[#b7e8ff] px-2.5 py-1 text-[10px] font-black text-[#173749]">In cart</span>}</div>
     <p className="mt-3 min-h-[76px] text-xs leading-6 opacity-75">{p.description}</p>
     <p className="mt-4 text-3xl font-black">{dollars(p.monthly*(p.kind==="one_time"?1:billingCycle==="yearly"&&p.key!=="textback"?12:1))}<span className="ml-1 text-xs font-medium opacity-75">/{p.kind==="one_time"?"once":billingCycle==="yearly"&&p.key!=="textback"?"year":"month"}</span></p>
     <p className="mt-2 text-xs opacity-80">{p.setup?dollars(p.setup)+" one-time setup":"No setup fee"}</p>
     <ul className="my-5 flex-1 space-y-1.5 border-t border-current/15 pt-4 text-[11px] leading-5">{p.features.slice(0,4).map(item=><li key={item}>✓ {item}</li>)}</ul>
     <button type="button" onClick={()=>choosePlan(p.key)} className={"rounded-xl px-4 py-3.5 text-xs font-black "+(planKey===p.key?"bg-white text-[#173749]":"bg-[#e3f4ff] text-[#235a7b]")}>{planKey===p.key?"Remove package":"Add package to cart +"}</button>
    </article>)}
   </div>
   {plan&&["starter","essential","growth","elite"].includes(planKey)&&<section className="mt-8 rounded-[24px] border border-[#d4e7f1] bg-white p-5 sm:p-7">
    <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#4586aa]">COMPATIBLE UPGRADES</p>
    <h3 className="mt-2 text-xl font-black">Add multiple upgrades to {plan.name}</h3>
    <p className="mt-2 text-xs leading-6 text-[#7994a3]">Items marked Included are already part of your package. The others are additional recurring charges that renew with your plan.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(BILLING_ADDONS).map(([id,item])=>{
     const amount=addonAmount(planKey,id),included=amount===0,added=addons.includes(id);
     return <div key={id} className={"flex items-center justify-between gap-3 rounded-2xl border p-4 "+(added?"border-[#69afd5] bg-[#edf8ff]":"border-[#e0e9ef]")}>
      <div><h4 className="text-xs font-black">{item.name}</h4><p className="mt-1 text-[11px] leading-5 text-[#7896a7]">{item.description}</p><p className="mt-2 text-xs font-black">{included?"Included":dollars(amount*(billingCycle==="yearly"?12:1))+"/"+(billingCycle==="yearly"?"year":"month")}</p></div>
      <button type="button" disabled={included} onClick={()=>toggleAddon(id)} aria-pressed={added} className={chip+" shrink-0 "+(added?"bg-[#1a4e68] text-white":"bg-[#eaf6fc] text-[#315f79]")+" disabled:opacity-50"}>{included?"Included":added?"Remove":"Add +"}</button>
     </div>;
    })}</div><p className="mt-4 text-[11px] text-[#8295a4]">{customSetupLabel}</p>
   </section>}
   {planKey==="textback"&&<section className="mt-8 rounded-[24px] border border-[#d4e7f1] bg-white p-6">
    <h3 className="text-lg font-black">Optional one-time website purchase</h3>
    <p className="mt-2 text-xs leading-6 text-[#7896a7]">Add a $299 website to the same Stripe checkout as your $49.99/month Text-Back subscription. The website charge happens once and does not renew.</p>
    <button type="button" disabled={sitePurchased} onClick={()=>setSelection(v=>({...v,websiteOneTime:!v.websiteOneTime}))} className={primary+" mt-4"}>{sitePurchased?"Already purchased":websiteOneTime?"Remove website":"Add website · $299 +"}</button>
   </section>}
   <section id="fugth-cart-checkout" className="mt-8 grid gap-6 rounded-[26px] border border-[#b9d9eb] bg-[#e9f7ff] p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
    <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#3e85a7]">YOUR SERVICE CART / CHECKOUT</p>
     <h3 className="mt-3 text-2xl font-black">{quote?count+" selected item"+(count===1?"":"s"):"Choose your first service"}</h3>
     {quote?<><div className="mt-4 space-y-2">{quote.lines.map(line=><div key={line.id} className="flex max-w-xl justify-between gap-4 text-xs"><span>{line.label} <span className="text-[#728f9f]">({line.period})</span></span><strong>{dollars(line.amountCents)}</strong></div>)}</div>
      <div className="mt-4 border-t border-[#bfdce8] pt-3 text-sm"><p>Recurring total: <strong>{dollars(quote.recurringCents)} / {quote.cycle==="yearly"?"year":"month"}</strong></p>
       <p className="mt-1 text-lg font-black">Estimated first charge: {dollars(quote.firstChargeCents)}</p></div>
      <p className="mt-2 max-w-xl text-[11px] leading-5 text-[#718da0]">Final tax, discounts and any scheduled billing-date proration appear in Stripe before you approve payment. One-time fees do not renew.</p>
     </>:<p className="mt-3 text-sm text-[#6b8ba0]">Your cart appears only in the Services section. Select a package and compatible upgrades above.</p>}
    </div>
    <div className="w-full lg:w-[240px]">
     <button type="button" disabled={busy||!authReady||!quote} onClick={isExistingUpgrade?portal:checkout} className={primary+" w-full"}>
      {busy?"Opening Stripe…":isExistingUpgrade?"Manage existing plan ↗":!user?"Sign in to pay ↗":"Secure Stripe Checkout ↗"}
     </button>
     <p className="mt-3 text-center text-[11px] leading-5 text-[#6c8899]">Payments are processed by Stripe. Paid features activate only after verified payment confirmation.</p>
     {error&&<p role="alert" className="mt-3 rounded-xl border border-[#e4b1a9] bg-white p-3 text-xs font-semibold text-[#9f463e]">{error}</p>}
    </div>
   </section>
   {readiness?.ready===false&&<div role="status" className="mt-5 rounded-2xl border border-[#e8cda2] bg-[#fff7e8] p-4 text-xs leading-6 text-[#7b5830]">
    <strong>Account connection warning</strong> — {readiness.issues?.map(x=>x.message).join(" ")} We recheck securely when you continue to checkout.
   </div>}
   {offerApplied&&<p className="mt-4 text-xs text-[#576f81]">A verified personalized offer for your account is applied to the selected package. Final amounts are confirmed in Stripe.</p>}
  </section>
  {!embedded&&<footer className="border-t border-[#d9e8f2] bg-white p-7 text-center text-xs text-[#7691a1]">
   FUGTH Chat LLC · <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/cookies" className="underline">Cookies</Link> · <CookieSettingsButton className="underline"/>
  </footer>}
 </div>;
}
