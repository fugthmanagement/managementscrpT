"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auth} from "../lib/firebase";
import {buildStarterSite,getIndustry} from "../lib/site-presets";
import SiteRenderer from "./site-renderer";

// This is deliberately a Website Center, not a free-form page designer. The
// preset keeps every client site professional and lets FUGTH improve templates
// for all businesses without customers accidentally making their site look bad.
export default function SiteStudio({user,workspace={},targetUid=null}){
 const uid=targetUid||user?.uid;
 const [site,setSite]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[published,setPublished]=useState(false);
 const isFounderEditing=Boolean(targetUid&&targetUid!==user?.uid);
 async function request(method="GET",data){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Log in to manage this website.");const res=await fetch("/api/sites/"+encodeURIComponent(uid),{method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined});const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||"Website service is unavailable.");return json;}
 async function load(){if(!uid)return;setLoading(true);setError("");try{const data=await request();setSite(data.site||buildStarterSite(uid,workspace.businessName||"Your business",workspace.businessType,workspace));setPublished(data.liveStatus==="published"||data.site?.visibility==="published");}catch(e){setError(e.message);setSite(buildStarterSite(uid,workspace.businessName||"Your business",workspace.businessType,workspace));}finally{setLoading(false);}}
 useEffect(()=>{load()},[uid]);
 async function action(kind){setBusy(kind);setError("");setMessage("");try{const data=await request("PUT",{action:kind});setSite(data.site||site);setPublished(data.status==="published");setMessage(kind==="regenerate"?"The preset was rebuilt from this business profile.":kind==="publish"?"This website is now live.":"This website is hidden from public visitors.");}catch(e){setError(e.message);}finally{setBusy("");}}
 if(loading)return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Preparing your website…</div>;
 const industry=getIndustry(site?.industry);
 return <div className="space-y-5">
  {(error||message)&&<p role="status" className={`rounded-xl border px-4 py-3 text-sm ${error?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error||message}</p>}
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="grid gap-5 bg-slate-950 p-6 text-white lg:grid-cols-[1fr_auto] lg:items-end sm:p-8"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/60">FUGTH PRESET WEBSITE</p><h3 className="mt-3 text-3xl font-black tracking-[-.06em]">Your {industry.label.toLowerCase()} site is ready.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">FUGTH automatically applies a polished multi-section layout to every business type. Your logo-style name, phone, service area and hours come from Business settings.</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase ${published?"bg-emerald-300 text-emerald-950":"bg-white/10 text-white"}`}>{published?"Live":"Private preview"}</span><Link href={`/sites/${encodeURIComponent(uid)}`} target="_blank" className="rounded-lg bg-white px-4 py-3 text-xs font-black text-slate-950">Open website ↗</Link></div></div>
   <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center sm:p-8"><div><h4 className="text-lg font-black text-slate-950">Keep your business details accurate</h4><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">To change the phone number, business name, industry, service area or hours shown on this site, use <strong>Settings → Business details</strong>. The visual layout stays protected so it always looks polished on phones and desktop.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={()=>action("regenerate")} className="rounded-lg border border-slate-300 px-4 py-3 text-xs font-black text-slate-800 disabled:opacity-50">{busy==="regenerate"?"Refreshing…":"Refresh from settings"}</button>{published?<button type="button" disabled={Boolean(busy)} onClick={()=>action("unpublish")} className="rounded-lg border border-red-200 px-4 py-3 text-xs font-black text-red-700 disabled:opacity-50">Hide site</button>:<button type="button" disabled={Boolean(busy)} onClick={()=>action("publish")} className="rounded-lg px-4 py-3 text-xs font-black text-white disabled:opacity-50" style={{backgroundColor:site.accentColor}}>{busy==="publish"?"Publishing…":"Publish website"}</button>}</div></div>
  </section>
  {isFounderEditing&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">Founder view: this page uses the customer’s saved business profile. Refreshing only rebuilds their website preset; it does not access their password, billing or Google connection.</div>}
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4 sm:px-7"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">LIVE PREVIEW</p><p className="mt-1 text-sm font-bold text-slate-900">The full website your customers will see</p></div><div className="max-h-[760px] overflow-y-auto"><SiteRenderer data={site} preview/></div></section>
 </div>;
}
