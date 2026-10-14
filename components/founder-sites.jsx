"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auth} from "../lib/firebase";
import SiteStudio from "./site-studio";
import FounderDemoCooldown from "./founder-demo-cooldown";
async function headers(){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again to view client websites.");return {Authorization:"Bearer "+token};}
export default function FounderSites({user}){
 const [accounts,setAccounts]=useState([]);
 const [cursor,setCursor]=useState("");
 const [selected,setSelected]=useState(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [page,setPage]=useState(0);
 async function load(next="",append=false){
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/dev/sites"+(next?"?after="+encodeURIComponent(next):""),{headers:await headers(),cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Account directory unavailable.");
   setAccounts(old=>append?[...old,...data.accounts]:data.accounts);
   setCursor(data.nextCursor||"");
   setPage(value=>append?value+1:0);
  }catch(e){setError(e.message)}finally{setLoading(false);}
 }
 useEffect(()=>{load()},[]);
 async function exportDesign(){
   if(!selected)return;
   setError("");
   try{
    const response=await fetch("/api/sites/"+encodeURIComponent(selected.uid),{headers:await headers(),cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Could not retrieve this design.");
    const file=new Blob([JSON.stringify({fugthAccountNumber:selected.accountNumber||null,uid:selected.uid,site:data.site},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(file),link=document.createElement("a");
    link.href=url;link.download="fugth-site-"+(selected.accountNumber||selected.uid)+".json";link.click();
    URL.revokeObjectURL(url);
   }catch(e){setError(e.message);}
 }
 const filtered=accounts.filter(a=>[a.businessName,a.accountNumber,a.email,a.industry].some(value=>String(value||"").toLowerCase().includes(search.toLowerCase())));
 return <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">FOUNDER / CUSTOMER WEBSITES</p><h3 className="mt-2 text-2xl font-black text-zinc-950">Saved client designs</h3><p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600">Every customer uses the same FUGTH site system. Open an account to view its own saved layout, make a private draft, or publish changes after reviewing them together.</p></div><button type="button" disabled={loading} onClick={()=>load()} className="rounded-xl border border-zinc-200 px-4 py-3 text-xs font-bold">Refresh accounts</button></div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
  <input type="search" aria-label="Filter loaded customer accounts" placeholder="Find a business, account number or email" value={search} onChange={e=>setSearch(e.target.value)} className="mt-5 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900"/>
  <p className="mt-2 text-xs text-zinc-500">Search filters the {accounts.length} loaded customers. Load more to see additional accounts.</p>
  <div className="mt-4 max-h-[370px] divide-y divide-zinc-200 overflow-y-auto rounded-xl border border-zinc-200">{filtered.map(a=><button key={a.uid} type="button" onClick={()=>setSelected(a)} aria-pressed={selected?.uid===a.uid} className={`flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-zinc-50 ${selected?.uid===a.uid?"bg-zinc-100":""}`}>
    <div className="min-w-0"><p className="truncate text-sm font-black text-zinc-950">{a.businessName}</p><p className="mt-1 break-all text-xs text-zinc-500">{a.email||"No email"} · {a.accountNumber||"Account number pending"}</p></div><span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-black uppercase text-zinc-600">{a.websiteStatus==="published"?"Live":a.hasDraft?"Draft saved":"Not published"}</span>
   </button>)}{!filtered.length&&!loading&&<p className="p-5 text-sm text-zinc-500">No matching accounts in the loaded pages.</p>}</div>
  {cursor&&<button type="button" disabled={loading} onClick={()=>load(cursor,true)} className="mt-3 rounded-xl bg-zinc-950 px-5 py-3 text-xs font-bold text-white">{loading?"Loading...":"Load more customer accounts"}</button>}
  {selected&&<div className="mt-7 border-t border-zinc-200 pt-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">EDIT SELECTED BUSINESS</p><p className="mt-2 text-xl font-black text-zinc-950">{selected.businessName} <span className="ml-2 font-mono text-sm font-bold text-zinc-500">{selected.accountNumber}</span></p></div><Link href={"/sites/"+encodeURIComponent(selected.uid)+"?edit=1"} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-zinc-950 px-5 py-3 text-xs font-black text-white">Open their website ↗</Link><button type="button" onClick={exportDesign} className="rounded-xl border border-zinc-200 px-4 py-3 text-xs font-black text-zinc-900">Export design JSON</button></div>
  <FounderDemoCooldown key={"cooldown-"+selected.uid} account={selected}/>
  <SiteStudio key={selected.uid} user={user} workspace={{businessName:selected.businessName,businessType:selected.industry}} targetUid={selected.uid}/>
  </div>}
 </section>;
}
