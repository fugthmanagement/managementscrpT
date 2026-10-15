"use client";
import {useEffect,useMemo,useState} from "react";
import {auth} from "../lib/firebase";
const classes="w-full rounded-xl border border-[#dce6da] bg-white p-3 text-xs text-[#324436] outline-none";
const tiers=[["none","Zero"],["starter","Low"],["growth","Mid"],["elite","High"]];
const niceDate=value=>{
 const d=new Date(value||"");
 return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"—";
};
export default function FounderAccounts(){
 const [accounts,setAccounts]=useState([]),[cursor,setCursor]=useState(null),[selected,setSelected]=useState("");
 const [search,setSearch]=useState(""),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [edit,setEdit]=useState({tier:"starter",term:"monthly",reason:"Founding customer access"});
 const current=accounts.find(a=>a.uid===selected);
 const visible=useMemo(()=>accounts.filter(a=>(a.email+" "+a.businessName+" "+a.displayName+" "+a.uid).toLowerCase().includes(search.toLowerCase())),[accounts,search]);
 async function headers(){
  const token=await auth?.currentUser?.getIdToken();
  if(!token)throw Error("Sign in with a verified FUGTH management account.");
  return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
 }
 async function refresh(more=false){
  setBusy("load");setError("");
  try{
   const url="/api/dev/accounts"+(more&&cursor?"?cursor="+encodeURIComponent(cursor):"");
   const response=await fetch(url,{headers:await headers(),cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Unable to load accounts.");
   setAccounts(old=>more?[...old,...result.accounts.filter(a=>!old.some(o=>o.uid===a.uid))]:result.accounts);
   setCursor(result.nextCursor||null);
  }catch(e){setError(e.message||"Unable to load accounts.");}
  finally{setBusy("");}
 }
 useEffect(()=>{refresh();},[]);
 function choose(a){setSelected(a.uid);setEdit({
  tier:a.grant?.tier||a.tier||"none",term:a.grant?.term||"monthly",
  reason:"Founding customer access"
 });setNotice("");}
 async function save(){
  if(!current||!edit.reason.trim())return;
  if(!window.confirm("Adjust access for "+(current.email||current.uid)+"? This will not charge their card or alter their paid subscription."))return;
  setBusy("save");setError("");setNotice("");
  try{
   const response=await fetch("/api/dev/accounts",{
    method:"POST",headers:await headers(),
    body:JSON.stringify({uid:current.uid,...edit})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Unable to update access.");
   setNotice(result.message||"Account saved.");await refresh();
  }catch(e){setError(e.message||"Unable to update account.");}
  finally{setBusy("");}
 }
 return <section className="rounded-[24px] border border-[#dbe6d7] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#829781]">FUGTH ACCOUNTS</p>
    <h3 className="mt-2 text-xl font-semibold text-[#304733]">Registered businesses and members</h3>
    <p className="mt-2 max-w-2xl text-xs leading-6 text-[#798e78]">Review who signed up, when they last signed in, their paid tier, and your founder-issued access. The list includes accounts without a completed profile.</p>
   </div>
   <button type="button" onClick={()=>refresh()} disabled={busy!==""} className="rounded-xl border border-[#dce5d9] px-4 py-3 text-xs font-semibold disabled:opacity-50">{busy==="load"?"Loading…":"Refresh"}</button>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-3">
   {[
    ["Loaded accounts",accounts.length],
    ["Paid subscriptions",accounts.filter(a=>a.billingActive).length],
    ["Signed in this week",accounts.filter(a=>a.lastSignInAt&&Date.now()-Date.parse(a.lastSignInAt)<604800000).length]
   ].map(([label,count])=><div className="rounded-xl bg-[#eff5ea] p-4" key={label}><p className="text-2xl font-bold">{count}</p><p className="mt-1 text-[11px] text-[#778a77]">{label}</p></div>)}
  </div>
  <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search email, business, or account ID" className={"mt-5 "+classes}/>
  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
   {visible.map(a=><button type="button" onClick={()=>choose(a)} key={a.uid} className={"flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-left "+(a.uid===selected?"border-[#7ca47e] bg-[#f0f7ed]":"border-[#e7eee5] bg-white")}>
    <div className="min-w-0"><p className="truncate text-sm font-semibold">{a.businessName||a.displayName||"New FUGTH member"}</p>
     <p className="mt-1 break-all text-xs text-[#829080]">{a.email||"No email"}</p>
     <p className="mt-1 text-[10px] text-[#8e9d8b]">Last sign-in: {niceDate(a.lastSignInAt)} · Joined: {niceDate(a.createdAt)}</p>
    </div>
    <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
     <span className="rounded-full bg-[#edf2e9] px-3 py-2">{tiers.find(([id])=>id===a.tier)?.[1]||"Zero"}</span>
     <span className="rounded-full bg-[#edf2e9] px-3 py-2">{a.billingActive?"Paid":"Not subscribed"}</span>
     <span className="rounded-full bg-[#edf2e9] px-3 py-2">{a.emailVerified?"Verified":"Unverified"}</span>
    </div>
   </button>)}
   {!visible.length&&<p className="p-7 text-center text-xs text-[#81917e]">No matching accounts on loaded pages.</p>}
  </div>
  {cursor&&<button type="button" disabled={busy!==""} onClick={()=>refresh(true)} className="mt-3 rounded-xl border border-[#dce5d9] px-4 py-3 text-xs font-semibold">Load next 60 accounts</button>}
  {current&&<div className="mt-6 rounded-2xl border border-[#d2e4d1] bg-[#f7faf4] p-5">
   <h4 className="text-sm font-bold">Manage {current.businessName||current.email||"account"}</h4>
   <p className="mt-2 text-xs leading-6 text-[#698068]">Paid tier: {current.paidTier} · Account status: {current.planStatus} · Next paid renewal: {niceDate(current.nextChargeAt)}</p>
   {current.grant&&<p className="mt-1 text-xs text-[#466b4a]">Current founder grant: {current.grant.tier}, expires {niceDate(current.grant.expiresAt)}</p>}
   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-semibold">Access tier<select value={edit.tier} onChange={e=>setEdit({...edit,tier:e.target.value})} className={"mt-2 "+classes}>{tiers.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-xs font-semibold">Access period<select value={edit.term} onChange={e=>setEdit({...edit,term:e.target.value})} className={"mt-2 "+classes}><option value="monthly">Monthly access</option><option value="yearly">Yearly access</option></select></label>
    <label className="text-xs font-semibold sm:col-span-2">Reason<input required maxLength={180} value={edit.reason} onChange={e=>setEdit({...edit,reason:e.target.value})} className={"mt-2 "+classes}/></label>
   </div>
   <button type="button" onClick={save} disabled={busy!==""||!edit.reason.trim()} className="mt-4 rounded-xl bg-[#2c5035] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy==="save"?"Saving…":edit.tier==="none"?"Remove manual access":"Save founder access"}</button>
   <p className="mt-3 text-xs leading-6 text-[#81927d]">Takes effect now, expires after one calendar month or year, and records an audit entry. This does not authorize a payment or move the customer's Stripe billing cycle.</p>
  </div>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-[#eef8e8] p-4 text-xs text-[#3e653f]">{notice}</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-[#fff2ef] p-4 text-xs text-[#a34c44]">{error}</p>}
 </section>;
}