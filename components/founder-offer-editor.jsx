"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
import {BILLING_PLANS,dollars} from "../lib/billing-catalog";
const field="w-full rounded-xl border border-[#e2d5c2] bg-white px-3 py-3 text-sm text-[#514333]";
const plans=Object.values(BILLING_PLANS).filter(p=>p.key!=="textback"); // Fixed live $49.99 price cannot be custom-quoted.
export default function FounderOfferEditor({account}){
 const [planKey,setPlanKey]=useState("starter"),[price,setPrice]=useState("149"),[setup,setSetup]=useState("1000"),
  [requestedBillingAt,setRequestedBillingAt]=useState(""),[existing,setExisting]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[url,setUrl]=useState("");
 async function headers(){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder sign-in required.");return {Authorization:"Bearer "+token,"Content-Type":"application/json"};}
 useEffect(()=>{let ignore=false;setNotice("");setUrl("");setExisting(null);
  (async()=>{try{const r=await fetch("/api/dev/offers?uid="+encodeURIComponent(account.uid),{headers:await headers(),cache:"no-store"});const d=await r.json();if(!ignore&&r.ok&&d.offer){setExisting(d.offer);setPlanKey(d.offer.planKey);setPrice(String(d.offer.monthlyCents/100));setSetup(String(d.offer.setupCents/100));}}catch{}})();return()=>{ignore=true};},[account.uid]);
 function choose(key){const p=BILLING_PLANS[key];setPlanKey(key);setPrice(String(p.monthly/100));setSetup(String(p.setup/100));}
 async function save(){
  setBusy(true);setNotice("");setUrl("");
  try{
   if(!window.confirm("Prepare this Stripe price offer for "+(account.email||account.businessName)+"? The customer must independently approve it and complete checkout."))return;
   const r=await fetch("/api/dev/offers",{method:"POST",headers:await headers(),body:JSON.stringify({uid:account.uid,planKey,priceCents:Math.round(Number(price)*100),setupCents:Math.round(Number(setup)*100),requestedBillingAt:requestedBillingAt?new Date(requestedBillingAt).toISOString():null})});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Quote could not be created.");
   setExisting(d.offer);setUrl(d.checkoutUrl);setNotice("Offer saved for this customer. Copy the checkout page link and have them sign in with their own account to review and pay.");
  }catch(e){setNotice(e.message||"Could not create offer.");}finally{setBusy(false);}
 }
 return <section className="mt-5 rounded-2xl border border-[#ded0bd] bg-[#fff9ee] p-5 text-[#493d30]">
  <h4 className="text-lg font-semibold">Personalized Stripe offer</h4>
  <p className="mt-2 text-xs leading-6 text-[#7d6a51]">Choose a package and a price for this account. The owner pays through Stripe Checkout; this does not mark unpaid accounts as paid or change existing subscriptions.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-3">
   <label className="text-xs font-semibold">Package<select className={"mt-2 "+field} value={planKey} onChange={e=>choose(e.target.value)}>{plans.map(p=><option key={p.key} value={p.key}>{p.name} · {dollars(p.monthly)}{p.kind==="one_time"?" once":"/mo"}</option>)}</select></label>
   <label className="text-xs font-semibold">{BILLING_PLANS[planKey]?.kind==="one_time"?"Website price ($)":"Base monthly price ($)"}<input type="number" min="10" max="20000" step="0.01" className={"mt-2 "+field} value={price} onChange={e=>setPrice(e.target.value)}/></label>
   <label className="text-xs font-semibold">One-time setup ($)<input type="number" min="0" max="20000" step="0.01" className={"mt-2 "+field} value={setup} onChange={e=>setSetup(e.target.value)}/></label>
  </div>
  <label className="mt-4 block text-xs font-semibold">Stripe renewal date/time (next 28 days)<input type="datetime-local" className={"mt-2 "+field} value={requestedBillingAt} onChange={e=>setRequestedBillingAt(e.target.value)}/></label>
  <p className="mt-2 text-[11px] leading-5 text-[#8b745b]">If you set a valid date within the next 28 days, Stripe Checkout aligns future full subscription renewals to it. The customer still pays any setup fee and the prorated initial subscription amount at checkout. The customer must approve the exact total in Stripe.</p>
  <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={save} className="rounded-xl bg-[#4b4032] px-4 py-3 text-xs font-bold text-white">{busy?"Saving…":"Save customer offer"}</button>
   {url&&<button type="button" onClick={()=>navigator.clipboard?.writeText(url)} className="rounded-xl border border-[#c8b79f] px-4 py-3 text-xs font-semibold">Copy plan link</button>}
  </div>
  {existing&&<p className="mt-3 text-xs text-[#82705d]">Most recent quote: {BILLING_PLANS[existing.planKey]?.name||existing.planKey}, {dollars(existing.monthlyCents)} and {dollars(existing.setupCents)} setup · expires {new Date(existing.expiresAt).toLocaleString()}.</p>}
  {notice&&<p role="status" className="mt-3 rounded-xl bg-[#f3eadb] p-3 text-xs">{notice}</p>}
 </section>;
}
