"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { doc,getDoc,runTransaction,setDoc } from "firebase/firestore";
import {db} from "../lib/firebase";
import {buildStarterSite,SITE_THEMES,SITE_INDUSTRIES,getIndustry,siteFields} from "../lib/site-presets";
import SiteRenderer from "./site-renderer";
import {getIndustryPhotos} from "../lib/site-images";

const classInput="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900";
export default function SiteStudio({user,workspace}){
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [saving,setSaving]=useState(false);
  const [site,setSite]=useState(null);
  const [note,setNote]=useState("");
  const [error,setError]=useState("");
  const [hadSite,setHadSite]=useState(false);
  const [device,setDevice]=useState("desktop");
  const [savedSignature,setSavedSignature]=useState("");
  const uid=user?.uid;
  const link=uid?`/sites/${encodeURIComponent(uid)}`:"";
  useEffect(()=>{let mounted=true;async function open(){
    if(!uid||!db){if(mounted){setLoading(false);setError("Connect your FUGTH account to create a site.");}return;}
    try{
      const snap=await getDoc(doc(db,"publicSites",uid));
      if(!mounted)return;
      if(snap.exists()){setSite(snap.data());setHadSite(true);setSavedSignature(JSON.stringify({...siteFields(snap.data()),visibility:snap.data().visibility}));}
      else{setSite(buildStarterSite(uid,workspace?.businessName&&workspace.businessName!=="Fugth Management OS"?workspace.businessName:user?.displayName||"Your business",workspace?.businessType));setHadSite(false);}
    }catch(e){if(mounted)setError("Site database access is unavailable. Check the FUGTH site rules and try again.");}
    finally{if(mounted)setLoading(false);}
  }open();return()=>{mounted=false};},[uid]);
  const update=(field,value)=>setSite(s=>({...s,[field]:value}));
  function changeIndustry(id){
    const data=getIndustry(id);
    setSite(prev=>({...prev,industry:data.id,theme:data.theme,eyebrow:data.eyebrow,headline:data.headline,description:data.lead,services:data.services,heroImageId:getIndustryPhotos(data.id)[0]?.id||"",galleryImageIds:getIndustryPhotos(data.id).slice(1,3).map(photo=>photo.id),showGallery:true}));
  }
  async function save(publish=false){
    setSaving(true);setError("");setNote("");
    try{
      if(!db||!uid||!site)throw Error("Please sign in again.");
      const fields=siteFields(site);
      if(publish&&!fields.phone&&!fields.contactEmail)throw Error("Add a business contact number or email before publishing.");
      if(fields.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contactEmail))throw Error("Enter a valid public business email.");
      if(fields.phone && !/^[+0-9() .-]{7,32}$/.test(fields.phone))throw Error("Enter a valid public business phone number.");
      const visibility=publish?"published":site.visibility==="published"?"published":site.visibility==="hidden"?"hidden":"preview";
      const record={...fields,ownerId:uid,version:1,visibility,createdAt:site.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      await setDoc(doc(db,"publicSites",uid),record);
      setSite(record);setHadSite(true);
      setSavedSignature(JSON.stringify({...siteFields(record),visibility:record.visibility}));
      setNote(visibility==="published"?"Your changes are published on your FUGTH site.":"Your site preview has been saved.");
    }catch(e){setError(e.message||"Could not save your site.");}
    finally{setSaving(false);}
  }
  async function create(){
    setCreating(true);setError("");setNote("");
    try{
      if(!db||!uid)throw Error("Please sign in to create a site.");
      const ref=doc(db,"publicSites",uid);
      const base=buildStarterSite(uid,site?.name||workspace?.businessName||"Your business",site?.industry||workspace?.businessType||"");
      await runTransaction(db,async tx=>{const existing=await tx.get(ref);if(!existing.exists())tx.set(ref,base);});
      const snap=await getDoc(ref);
      setSite(snap.data());setHadSite(true);
      setSavedSignature(JSON.stringify({...siteFields(snap.data()),visibility:snap.data().visibility}));
      setNote("Your site has been generated! Pick a design, add details, and share the preview.");
    }catch(e){setError("Could not generate your site. Your Firebase site permissions may need updating.");}
    finally{setCreating(false);}
  }
  if(loading)return <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Loading FUGTH Site Studio...</section>;
  if(!site)return <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">{error||"Unable to load site data."}</section>;
  const theme=SITE_THEMES.find(t=>t.id===site.theme)||SITE_THEMES[0];
  const unsaved=hadSite && JSON.stringify({...siteFields(site),visibility:site.visibility})!==savedSignature;
  return <div className="space-y-5">
    <section className="rounded-3xl border border-zinc-200 bg-zinc-950 px-6 py-8 text-white sm:px-9 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">FUGTH SITE STUDIO</p><h2 className="mt-5 text-3xl font-black tracking-[-.055em] sm:text-4xl">Your business.<br/><em className="font-serif font-normal">Your own look.</em></h2><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">Generate a polished mobile-friendly business site, choose an industry layout, update a few details, and share a preview in seconds.</p></div><span className="rounded-full border border-white/25 px-3 py-2 text-xs font-bold">{site.visibility==="published"?"Published":hadSite?"Preview available":"Ready to generate"}</span></div>
      <div className="mt-7 flex flex-wrap gap-3">
        {!hadSite?<button onClick={create} disabled={creating} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-50">{creating?"Creating...":"Generate my site →"}</button>:<Link href={link} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-zinc-950">Open website preview ↗</Link>}
        {hadSite&&<button type="button" onClick={()=>navigator.clipboard?.writeText(window.location.origin+link)} className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white">Copy link</button>}
        <button type="button" onClick={()=>document.getElementById("fugth-site-preview")?.scrollIntoView({behavior:"smooth",block:"start"})} className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white">See live preview ↓</button>
      </div>
      <p className="mt-5 break-all text-xs text-zinc-400">{hadSite?link:"The link will appear when you generate the site."}</p>
      {unsaved&&<p className="mt-2 text-xs font-semibold text-[#e9e2cf]">Unsaved changes — your preview below updates instantly. Save when you are ready.</p>}
    </section>
    {(error||note)&&<p role="status" className={`rounded-xl border px-5 py-4 text-sm ${error?"border-red-200 bg-red-50 text-red-800":"border-zinc-200 bg-white text-zinc-800"}`}>{error||note}</p>}
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"><div className="min-w-0 space-y-5">
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">01 / VISUAL DIRECTION</p><h3 className="mt-3 text-2xl font-black">Choose a layout</h3></div><span className="text-xs text-zinc-500">Each layout has a different design structure</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{SITE_THEMES.map(t=><button key={t.id} type="button" aria-pressed={site.theme===t.id} onClick={()=>update("theme",t.id)} className={`overflow-hidden rounded-2xl border p-2 text-left transition ${site.theme===t.id?"border-zinc-950 ring-2 ring-zinc-950":"border-zinc-200 hover:border-zinc-400"}`}>
        <div className={`flex h-32 flex-col justify-between overflow-hidden rounded-xl p-4 ${t.id==="editorial"?"bg-[#faf9f5]":t.id==="bold"?"bg-[#b45e39]":t.id==="warm"?"bg-[#e4c9b5]":"bg-[#eff5f6]"}`}>
          <span className={`text-[10px] font-black ${t.id==="bold"?"text-white":"text-zinc-700"}`}>{site.name||"YOUR BUSINESS"}</span>
          {t.id==="editorial"?<div className="text-2xl font-serif tracking-tighter text-zinc-900">Simply different.</div>:t.id==="bold"?<div className="text-2xl font-black uppercase leading-none text-white">BUILT<br/>BOLD.</div>:t.id==="warm"?<div className="font-serif text-2xl italic text-[#6c4e44]">Made for you.</div>:<div className="rounded-lg bg-white p-3 text-lg font-black text-[#355d72]">Designed to serve.</div>}
        </div>
        <div className="px-2 pb-2 pt-3"><strong className="block text-sm text-zinc-950">{t.name}</strong><span className="mt-1 block text-xs text-zinc-500">{t.subtitle}</span></div>
      </button>)}</div>
    </section>
    
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">02 / PHOTOGRAPHY LIBRARY</p>
      <h3 className="mt-3 text-2xl font-black tracking-tight text-zinc-900">Pictures that fit the business.</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-600">Choose from curated images for this industry. Every picture has a FUGTH image ID, descriptive alt text, searchable tags and original source credit. Sample images are illustrative—not actual photographs of this business.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{getIndustryPhotos(site.industry).map(photo=><button key={photo.id} type="button" aria-pressed={site.heroImageId===photo.id} onClick={()=>update("heroImageId",photo.id)} className={`overflow-hidden rounded-2xl border p-2 text-left ${site.heroImageId===photo.id?"border-zinc-950 ring-2 ring-zinc-950":"border-zinc-200 hover:border-zinc-400"}`}>
        <div className="aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100"><img src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full object-cover" data-image-id={photo.id} onError={e=>{e.currentTarget.style.visibility="hidden";}}/></div>
        <div className="px-2 py-3"><span className="block break-all font-mono text-[10px] font-bold text-zinc-700">{photo.id}</span><p className="mt-1 text-xs text-zinc-500">{photo.tags.join(" · ")}</p><p className="mt-2 text-[11px] text-zinc-500">Photo: {photo.credit}</p></div>
      </button>)}</div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-bold text-zinc-700"><input type="checkbox" checked={site.showGallery!==false} onChange={e=>update("showGallery",e.target.checked)} className="h-4 w-4 accent-zinc-950"/>Show related photo gallery</label>
      {site.showGallery!==false&&<p className="mt-3 text-xs leading-6 text-zinc-500">Secondary industry photos appear automatically when available. They are chosen by ID and cannot be replaced with unverified external links.</p>}
    </section>
<section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">03 / YOUR BUSINESS</p><h3 className="mt-3 text-2xl font-black">Quick details</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-zinc-700">Business name<input className={classInput} maxLength={80} value={site.name||""} onChange={e=>update("name",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Business type<select className={classInput} value={site.industry||"general"} onChange={e=>changeIndustry(e.target.value)}>{SITE_INDUSTRIES.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
        <label className="text-xs font-bold text-zinc-700">Small intro label<input className={classInput} maxLength={70} value={site.eyebrow||""} onChange={e=>update("eyebrow",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Main headline<input className={classInput} maxLength={150} value={site.headline||""} onChange={e=>update("headline",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700 sm:col-span-2">Description<textarea className={classInput+" min-h-[90px]"} maxLength={380} value={site.description||""} onChange={e=>update("description",e.target.value)}/></label>
        {(site.services||[]).map((x,i)=><label className="text-xs font-bold text-zinc-700" key={i}>Service {i+1}<input className={classInput} maxLength={80} value={x} onChange={e=>update("services",site.services.map((y,j)=>j===i?e.target.value:y))}/></label>)}
        <label className="text-xs font-bold text-zinc-700">Button label<input className={classInput} maxLength={48} value={site.ctaLabel||"Contact our team"} onChange={e=>update("ctaLabel",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Service area<input className={classInput} maxLength={100} placeholder="e.g. Miami-Dade County" value={site.serviceArea||""} onChange={e=>update("serviceArea",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Business hours<input className={classInput} maxLength={100} placeholder="e.g. Mon-Fri 9 AM-6 PM" value={site.businessHours||""} onChange={e=>update("businessHours",e.target.value)}/></label>
        <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs font-bold text-zinc-700"><input type="checkbox" checked={site.showServices!==false} onChange={e=>update("showServices",e.target.checked)} className="h-4 w-4 accent-zinc-950"/>Show service highlights</label>
        <label className="text-xs font-bold text-zinc-700">Public business email<input type="email" className={classInput} maxLength={120} placeholder="Optional until publication" value={site.contactEmail||""} onChange={e=>update("contactEmail",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Public business number<input type="tel" className={classInput} maxLength={32} placeholder="Optional until publication" value={site.phone||""} onChange={e=>update("phone",e.target.value)}/></label>
      </div>
      <div className="mt-7 flex flex-wrap gap-3"><button disabled={saving} onClick={()=>save(false)} className="rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{saving?"Saving...":site.visibility==="published"?"Save changes":"Save preview"}</button><button disabled={saving} onClick={()=>save(true)} className="rounded-xl border border-zinc-950 bg-white px-5 py-3.5 text-sm font-black text-zinc-950 disabled:opacity-50">Publish website ↗</button>{site.visibility==="published"&&<button disabled={saving} onClick={async()=>{setSaving(true);setError("");try{const updated={...site,visibility:"preview",updatedAt:new Date().toISOString()};await setDoc(doc(db,"publicSites",uid),updated);setSite(updated);setSavedSignature(JSON.stringify({...siteFields(updated),visibility:"preview"}));setNote("Your site is now a labeled preview.");}catch(e){setError(e.message||"Could not unpublish website.");}finally{setSaving(false);}}} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600">Unpublish</button>}</div>
      <p className="mt-5 text-xs leading-6 text-zinc-500">A preview link is shareable with anyone who has the link and clearly labeled as a draft. No private account details are copied. Publishing removes the preview badge and makes the business contact information visible; it does not create a custom domain.</p>
    </section>

    </div>
    <aside id="fugth-site-preview" className="min-w-0 scroll-mt-24 space-y-3 2xl:sticky 2xl:top-24">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 sm:px-5">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">LIVE PREVIEW</p><p className="mt-1 text-sm font-black text-zinc-950">Updates as you edit</p></div>
        <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1" role="group" aria-label="Website preview width">
          <button type="button" aria-pressed={device==="desktop"} onClick={()=>setDevice("desktop")} className={`rounded-lg px-3 py-2 text-xs font-bold ${device==="desktop"?"bg-zinc-950 text-white":"text-zinc-600"}`}>Desktop</button>
          <button type="button" aria-pressed={device==="phone"} onClick={()=>setDevice("phone")} className={`rounded-lg px-3 py-2 text-xs font-bold ${device==="phone"?"bg-zinc-950 text-white":"text-zinc-600"}`}>Phone</button>
        </div>
      </div>
      <div className="max-h-[740px] min-h-[340px] overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-200 bg-[#e5e6e1] p-2 sm:p-3">
        <div className={`mx-auto overflow-hidden rounded-xl bg-white shadow-xl ${device==="phone"?"w-full max-w-[390px]":"w-full"}`}>
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2 text-[10px] text-zinc-500"><span className="flex gap-1"><i className="h-2 w-2 rounded-full bg-zinc-300"/><i className="h-2 w-2 rounded-full bg-zinc-300"/><i className="h-2 w-2 rounded-full bg-zinc-300"/></span><span className="max-w-[75%] truncate">fugthmanagement.space{link}</span></div>
          <div className={device==="phone"?"fugth-phone-preview":""}>
            <SiteRenderer data={{...site,visibility:site.visibility==="published"?"published":"preview"}}/>
          </div>
        </div>
      </div>
      <p className="px-1 text-xs leading-6 text-zinc-500">This is your working design preview. Save your changes to update the shareable website link.</p>
    </aside>
  </div>
  </div>;
}
