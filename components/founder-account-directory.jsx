"use client";
import {useEffect,useMemo,useState} from "react";
import {auth} from "../lib/firebase";
const planOptions=[["none","Zero"],["starter","Low · $49"],["growth","Mid · $149"],["elite","High · $499"]];
const input="w-full rounded-xl border border-[#d8e3d5] bg-white px-3 py-3 text-xs text-[#314836] outline-none focus:border-[#53735b]";
const date=v=>{const d=new Date(v||"");return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"Not set";};
const clean=v=>String(v||"").trim();
export default function FounderAccountDirectory(){
 const [accounts,setAccounts]=useState([]),[cursor,setCursor]=useState(null);
 const [search,setSearch]=useState(""),[filter,setFilter]=useState("all");
 const [selected,setSelected]=useState(null);
 const [tier,setTier]=useState("starter"),[term,setTerm]=useState("monthly");
 const [reason,setReason]=useState("Founding customer account access");
 const [busy,setBusy]=useState(""),[message,setMessage]=useState("");
 async function headers(){
  const user=auth?.currentUser;
  if(!user)throw Error("Please sign in with a verified FUGTH administrator account.");
  return {Authorization:"Bearer "+await user.getIdToken(),"Content-Type":"application/json"};
 }
 async function load(pageCursor=null,append=false){
  setBusy("load");setMessage("");
  try{
   const url="/api/dev/accounts"+(pageCursor?"?cursor="+encodeURIComponent(pageCursor):"");
   const res=await fetch(url,{headers:await headers(),cache:"no-store"});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"The customer directory couldn't load.");
   setAccounts(old=>append?[...old,...(data.accounts||[])]:data.accounts||[]);
   setCursor(data.nextCursor||null);
  }catch(error){setMessage(error.message||"Could not load FUGTH accounts.");}
  finally{setBusy("");}
 }
 useEffect(()=>{load();},[]);
 function selectAccount(account){
  setSelected(account);setTier(account.grant?.tier||account.tier||"starter");
  setTerm(account.grant?.term||"monthly");setReason("Founding customer account access");setMessage("");
 }
 async function save(isRevoke=false){
  if(!selected)return;
  const actualTier=isRevoke?"none":tier;
  if(!reason.trim()){setMessage("Add an audit reason before changing account access.");return;}
  if(!window.confirm((isRevoke?"Remove founder-issued access for ":"Give "+actualTier+" access to ")+(selected.email||selected.uid)+"? This changes feature access, not their paid subscription."))return;
  setBusy("save");setMessage("");
  try{
   const response=await fetch("/api/dev/accounts",{method:"POST",headers:await headers(),
    body:JSON.stringify({uid:selected.uid,tier:actualTier,term,reason:reason.trim()})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||"Could not update account access.");
   setMessage((data.message||"Access saved.")+" The customer's card was not charged.");
   setSelected(null);await load();
  }catch(error){setMessage(error.message||"Access update failed.");}
  finally{setBusy("");}
 }
 const filtered=useMemo(()=>accounts.filter(a=>{
  if(filter==="paying"&&!a.billingActive)return false;
  if(filter==="founding"&&!a.grant)return false;
  if(filter==="free"&&(a.billingActive||a.grant))return false;
  return [a.email,a.displayName,a.businessName,a.uid,a.tier].join(" ").toLowerCase().includes(search.toLowerCase());
 }),[accounts,filter,search]);
 const paying=accounts.filter(a=>a.billingActive).length,manual=accounts.filter(a=>a.grant).length;
 return <section className="rounded-[28px] border border-[#dce4d7] bg-white p-5 shadow-[0_18px_55px_rgba(27,54,35,.06)] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#7b947c]">FUGTH ADMINISTRATION · CUSTOMER DIRECTORY</p>
    <h3 className="mt-3 text-2xl font-semibold tracking-[-.05em] text-[#2a4130]">Every registered business.</h3>
    <p className="mt-2 max-w-3xl text-xs leading-6 text-[#768776]">Accounts come directly from FUGTH authentication, including those without a paid plan. Plan permissions and actual subscription charges are tracked separately.</p></div>
   <button type="button" onClick={()=>load()} disabled={busy!==""} className="rounded-xl border border-[#c9d9c6] bg-[#edf4eb] px-4 py-3 text-xs font-bold text-[#30533a] disabled:opacity-50">{busy==="load"?"Loading…":"Refresh accounts ↗"}</button>
  </div>
  <div className="mt-6 grid grid-cols-3 gap-3">{[["Accounts loaded",accounts.length],["Paid subscriptions",paying],["Founder access",manual]].map(([label,value])=><div key={label} className="rounded-2xl bg-[#f3f6ef] p-4"><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[10px] leading-4 text-[#7d8d7b]">{label}</p></div>)}</div>
  <div className="mt-5 flex flex-wrap gap-3"><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find account, customer email, business…" className={input+" min-w-48 flex-1"}/><select value={filter} onChange={event=>setFilter(event.target.value)} className={input+" max-w-[180px]"}><option value="all">All accounts</option><option value="paying">Paying</option><option value="founding">Founder access</option><option value="free">Free</option></select></div>
  {message&&<p role="status" className="mt-5 rounded-xl border border-[#d6e5d0] bg-[#f1f7ee] p-4 text-xs text-[#526b51]">{message}</p>}
  <div className="mt-4 max-h-[460px] divide-y divide-[#ecf0e9] overflow-y-auto">
   {filtered.map(a=><article key={a.uid} className="flex flex-wrap items-start justify-between gap-3 py-4">
    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#304733]">{a.businessName||a.displayName||"New FUGTH customer"}</p>
     <p className="mt-1 break-words text-xs text-[#69826b]">{a.email||"Email not provided"} · {a.emailVerified?"Verified":"Verification pending"}</p>
     <p className="mt-2 text-[11px] text-[#7c8a7c]">Effective: <strong>{a.tier||"none"}</strong> · {a.billingActive?"Paid subscription":"No active subscription"}{a.grant?" · Founder access until "+date(a.grant.expiresAt):""}</p>
     <p className="mt-1 text-[10px] text-[#8f9c8e]">Joined {date(a.createdAt)} · Last sign-in {date(a.lastSignInAt)}</p>
     {a.billingActive&&<p className="mt-1 text-[11px] font-semibold text-[#57745b]">Next paid renewal: {date(a.nextChargeAt)}</p>}
    </div>
    <button type="button" onClick={()=>selectAccount(a)} className="rounded-xl border border-[#cbdac7] bg-[#f7faf5] px-4 py-2.5 text-xs font-bold text-[#39593c]">Manage access ↗</button>
   </article>)}
   {!filtered.length&&<p className="py-9 text-center text-xs text-[#8b9989]">No matching accounts in this page of the directory.</p>}
  </div>
  {cursor&&<button type="button" disabled={busy!==""} onClick={()=>load(cursor,true)} className="mt-4 w-full rounded-xl border border-[#d4e0d0] px-4 py-3 text-xs font-bold text-[#416348] disabled:opacity-50">Load more registered accounts ↘</button>}
  {selected&&<div className="mt-6 rounded-2xl border border-[#bed7b9] bg-[#f1f7ee] p-5 sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#688366]">ACCOUNT ACCESS CONTROLS</p><h4 className="mt-2 text-lg font-bold">{selected.businessName||selected.email||"Customer"}</h4><p className="mt-1 break-all text-[11px] text-[#768876]">{selected.uid}</p></div><button type="button" onClick={()=>setSelected(null)} className="text-xs font-bold underline">Close</button></div>
   <div className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">Access tier<select value={tier} onChange={e=>setTier(e.target.value)} className={"mt-2 "+input}>{planOptions.filter(([value])=>value!=="none").map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-xs font-bold">Duration<select value={term} onChange={e=>setTerm(e.target.value)} className={"mt-2 "+input}><option value="monthly">One month from now</option><option value="yearly">One year from now</option></select></label>
    <label className="text-xs font-bold sm:col-span-2">Audit reason<input value={reason} maxLength={180} onChange={e=>setReason(e.target.value)} className={"mt-2 "+input}/></label>
   </div>
   <p className="mt-4 text-xs leading-6 text-[#6b8169]">This is a promotional or founder-authorized feature grant. It expires automatically after the selected term. <strong>It never charges a customer or changes Stripe's renewal date.</strong> Paid monthly/yearly billing must be handled through authorized customer checkout and subscriptions.</p>
   <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>save(false)} disabled={busy!==""} className="rounded-xl bg-[#305139] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy==="save"?"Saving…":"Grant access ↗"}</button>{selected.grant&&<button type="button" disabled={busy!==""} onClick={()=>save(true)} className="rounded-xl border border-[#d6c7bc] px-5 py-3 text-xs font-bold text-[#975d43]">Revoke founder access</button>}</div>
  </div>}
 </section>;
}
