"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import {auth} from "../lib/firebase";
import {buildStarterSite,SITE_THEMES,SITE_INDUSTRIES,getIndustry,siteFields} from "../lib/site-presets";
import SiteRenderer from "./site-renderer";
import {getIndustryPhotos} from "../lib/site-images";

const classInput="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900";
export default function SiteStudio({user,workspace,targetUid=null,compact=false}){
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [saving,setSaving]=useState(false);
  const [site,setSite]=useState(null);
  const [note,setNote]=useState("");
  const [error,setError]=useState("");
  const [hadSite,setHadSite]=useState(false);
  const [device,setDevice]=useState("desktop");
  const [savedSignature,setSavedSignature]=useState("");
  const [backendReady,setBackendReady]=useState(true);
  const uid=targetUid||user?.uid;
  const [liveStatus,setLiveStatus]=useState("preview");
  async function siteRequest(method="GET",body){
    const token=await auth.currentUser?.getIdToken();
    if(!token)throw Error("Sign in to edit your FUGTH website.");
    const response=await fetch("/api/sites/"+encodeURIComponent(uid),{
      method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,cache:"no-store"
    });
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Could not connect to your saved website.");
    return data;
  }
  const link=uid?`/sites/${encodeURIComponent(uid)}`:"";
  useEffect(()=>{let mounted=true;setLoading(true);setError("");
    async function load(){
      try {
        const data=await siteRequest();
        if(!mounted)return;
        const design=data.site||buildStarterSite(uid,workspace?.businessName||"Your business",workspace?.businessType);
        setSite(design);setHadSite(Boolean(data.hasPublicSite));setLiveStatus(data.liveStatus||"preview");setBackendReady(true);
        setSavedSignature(JSON.stringify(siteFields(design)));
      } catch(e){if(mounted){setBackendReady(false);setSite(buildStarterSite(uid,workspace?.businessName||"Your business",workspace?.businessType));setSavedSignature("");setError("Design preview is available, but saving and publishing are unavailable until the secure FUGTH site connection is configured.");}}
      finally{if(mounted)setLoading(false);}
    }
    if(uid)load();else{setLoading(false);setError("Sign in to view a website.");}
    return()=>{mounted=false};
  },[uid]);
  const update=(field,value)=>setSite(s=>({...s,[field]:value}));
  function changeIndustry(id){
    const data=getIndustry(id);
    setSite(prev=>({...prev,industry:data.id,theme:data.theme,eyebrow:data.eyebrow,headline:data.headline,description:data.lead,services:data.services,heroImageId:getIndustryPhotos(data.id)[0]?.id||"",galleryImageIds:getIndustryPhotos(data.id).slice(1,3).map(photo=>photo.id),showGallery:true}));
  }
  async function save(action="save"){
    if(!backendReady){setError("This is a visual preview only. Secure saving is not connected yet.");return;}
    if(action==="publish" && targetUid && targetUid!==user?.uid && !window.confirm("Publish these design changes to this customer\u0027s live website?"))return;
    setSaving(true);setError("");setNote("");
    try {
      const fields=siteFields(site||{});
      if(action==="publish"&&!fields.phone&&!fields.contactEmail)throw Error("Provide a business email or number before publishing.");
      const result=await siteRequest("PUT",{action,site:fields});
      setSite(result.site||site);setHadSite(true);setLiveStatus(result.status||"preview");
      setSavedSignature(JSON.stringify(siteFields(result.site||site)));
      setNote(action==="publish"?"Your changes are now live.":action==="unpublish"?"This site is hidden from public visitors until you publish it again.":"Design saved privately. Publish when ready.");
    }catch(e){setError(e.message);}
    finally{setSaving(false);}
  }
  async function create(){if(!backendReady){setError("The preview is ready to explore. Site activation requires a connected FUGTH database.");return;}setCreating(true);setError("");
    try{const result=await siteRequest("PUT",{action:"initialize"});setSite(result.site);setHadSite(true);setLiveStatus(result.status||"preview");setSavedSignature(JSON.stringify(siteFields(result.site)));setNote("Your shared FUGTH website design is ready.");}
    catch(e){setError(e.message);}finally{setCreating(false);}
  }
  if(loading)return <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Loading FUGTH Site Studio...</section>;
  if(!site)return <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600">{error||"Unable to load site data."}</section>;
  const theme=SITE_THEMES.find(t=>t.id===site.theme)||SITE_THEMES[0];
  const unsaved=hadSite && JSON.stringify(siteFields(site))!==savedSignature;
  return <div className="space-y-5">
    <section className="rounded-3xl border border-zinc-200 bg-zinc-950 px-6 py-8 text-white sm:px-9 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">FUGTH SITE STUDIO</p><h2 className="mt-5 text-3xl font-black tracking-[-.055em] sm:text-4xl">One shared platform.<br/><em className="font-serif font-normal">Your own design.</em></h2><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">Each FUGTH account saves its own design on the same website system. Edit sections, photos, chat, and contact details, then publish when ready.</p></div><span className="rounded-full border border-white/25 px-3 py-2 text-xs font-bold">{liveStatus==="published"?"Published":hadSite?"Preview available":"Ready to generate"}</span></div>
      <div className="mt-7 flex flex-wrap gap-3">
        {!hadSite?<button onClick={create} disabled={creating||!backendReady} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-50">{creating?"Creating...":"Activate my site preview →"}</button>:<Link href={link} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-zinc-950">Open website preview ↗</Link>}
        {hadSite&&<button type="button" onClick={()=>navigator.clipboard?.writeText(window.location.origin+link)} className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white">Copy link</button>}
        <button type="button" onClick={()=>document.getElementById("fugth-site-preview")?.scrollIntoView({behavior:"smooth",block:"start"})} className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white">See live preview ↓</button>
      </div>
      <p className="mt-5 break-all text-xs text-zinc-400">{hadSite?link:"The link will appear when you generate the site."}</p>
      {unsaved&&<p className="mt-2 text-xs font-semibold text-[#e9e2cf]">Unsaved changes — your preview below updates instantly. Save when you are ready.</p>}
    </section>
    {!backendReady&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Design preview only.</strong> You can explore layouts and photos, but your edits are not being saved. Your account and billing are unchanged.</div>}
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
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">02 / PAGE SECTIONS</p>
      <h3 className="mt-3 text-xl font-black text-zinc-950">Choose what visitors see.</h3>
      <p className="mt-2 text-xs leading-6 text-zinc-500">Switch sections on or off. These changes appear immediately in the preview and are saved to this business account.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">{[
        ["showHero","Main introduction"],["showAbout","About your business"],["showServices","Services"],["showGallery","Photo gallery"],
        ["showContact","Contact details"],["showChatbot","Website chat"]
      ].map(([key,label])=><label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 text-xs font-bold text-zinc-900">
        <input type="checkbox" checked={site[key]!==false} onChange={e=>update(key,e.target.checked)} className="h-4 w-4 accent-zinc-950"/>{label}
      </label>)}</div>
      {site.showChatbot!==false&&<label className="mt-5 block text-xs font-bold text-zinc-700">Chat greeting
        <input className={classInput} maxLength={160} value={site.chatbotGreeting||""} onChange={e=>update("chatbotGreeting",e.target.value)} placeholder="Hi! How can we help you?"/>
      </label>}
      <p className="mt-3 text-xs text-zinc-500">The basic website assistant answers common business questions from this site's saved information. It does not book appointments or access customer records.</p>
    </section>
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">03 / PHOTOGRAPHY LIBRARY</p>
      <h3 className="mt-3 text-2xl font-black tracking-tight text-zinc-900">Pictures that fit the business.</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-600">Choose from curated images for this industry. Every picture has a FUGTH image ID, descriptive alt text, searchable tags and original source credit. Sample images are illustrative—not actual photographs of this business.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{getIndustryPhotos(site.industry).map(photo=><button key={photo.id} type="button" aria-pressed={site.heroImageId===photo.id} onClick={()=>setSite(old=>({...old,heroImageId:photo.id,galleryImageIds:getIndustryPhotos(old.industry).filter(item=>item.id!==photo.id).slice(0,2).map(item=>item.id)}))} className={`overflow-hidden rounded-2xl border p-2 text-left ${site.heroImageId===photo.id?"border-zinc-950 ring-2 ring-zinc-950":"border-zinc-200 hover:border-zinc-400"}`}>
        <div className="aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100"><img src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full object-cover" data-image-id={photo.id} onError={e=>{e.currentTarget.style.visibility="hidden";}}/></div>
        <div className="px-2 py-3"><span className="block break-all font-mono text-[10px] font-bold text-zinc-700">{photo.id}</span><p className="mt-1 text-xs text-zinc-500">{photo.tags.join(" · ")}</p><p className="mt-2 text-[11px] text-zinc-500">Photo: {photo.credit}</p><span className="mt-2 inline-block rounded-full border border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-500">{site.heroImageId===photo.id?"Selected hero":"Choose photo"}</span></div>
      </button>)}</div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-bold text-zinc-700"><input type="checkbox" checked={site.showGallery!==false} onChange={e=>update("showGallery",e.target.checked)} className="h-4 w-4 accent-zinc-950"/>Show related photo gallery</label>
      {site.showGallery!==false&&<p className="mt-3 text-xs leading-6 text-zinc-500">Secondary industry photos appear automatically when available. They are chosen by ID and cannot be replaced with unverified external links.</p>}
    </section>
<section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">04 / YOUR BUSINESS</p><h3 className="mt-3 text-2xl font-black">Quick details</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-zinc-700">Business name<input className={classInput} maxLength={80} value={site.name||""} onChange={e=>update("name",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Business type<select className={classInput} value={site.industry||"general"} onChange={e=>changeIndustry(e.target.value)}>{SITE_INDUSTRIES.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
        <label className="text-xs font-bold text-zinc-700">Small intro label<input className={classInput} maxLength={70} value={site.eyebrow||""} onChange={e=>update("eyebrow",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Main headline<input className={classInput} maxLength={150} value={site.headline||""} onChange={e=>update("headline",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700 sm:col-span-2">Description<textarea className={classInput+" min-h-[90px]"} maxLength={380} value={site.description||""} onChange={e=>update("description",e.target.value)}/></label>
        <div className="sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold text-zinc-700">Service highlights</p><button type="button" disabled={(site.services||[]).length>=3} onClick={()=>update("services",[...(site.services||[]),"New service"])} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold disabled:opacity-40">+ Add a service</button></div>
 <div className="grid gap-3">{(site.services||[]).map((x,i)=><label className="flex items-end gap-2 text-xs font-bold text-zinc-700" key={i}><span className="min-w-0 flex-1">Service {i+1}<input className={classInput} maxLength={80} value={x} onChange={e=>update("services",site.services.map((y,j)=>j===i?e.target.value:y))}/></span><button type="button" aria-label={`Remove service ${i+1}`} onClick={()=>update("services",site.services.filter((_,j)=>j!==i))} className="mb-1 rounded-xl border border-red-100 px-3 py-3 text-xs font-bold text-red-700">Remove</button></label>)}</div>
 </div>
        <label className="text-xs font-bold text-zinc-700">Button label<input className={classInput} maxLength={48} value={site.ctaLabel||"Contact our team"} onChange={e=>update("ctaLabel",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Service area<input className={classInput} maxLength={100} placeholder="e.g. Miami-Dade County" value={site.serviceArea||""} onChange={e=>update("serviceArea",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Business hours<input className={classInput} maxLength={100} placeholder="e.g. Mon-Fri 9 AM-6 PM" value={site.businessHours||""} onChange={e=>update("businessHours",e.target.value)}/></label>
        <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs font-bold text-zinc-700"><input type="checkbox" checked={site.showServices!==false} onChange={e=>update("showServices",e.target.checked)} className="h-4 w-4 accent-zinc-950"/>Show service highlights</label>
        <label className="text-xs font-bold text-zinc-700">Public business email<input type="email" className={classInput} maxLength={120} placeholder="Optional until publication" value={site.contactEmail||""} onChange={e=>update("contactEmail",e.target.value)}/></label>
        <label className="text-xs font-bold text-zinc-700">Public business number<input type="tel" className={classInput} maxLength={32} placeholder="Optional until publication" value={site.phone||""} onChange={e=>update("phone",e.target.value)}/></label>
      </div>
      <div className="mt-7 flex flex-wrap gap-3"><button disabled={saving||!backendReady} onClick={()=>save("save")} className="rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{saving?"Saving...":liveStatus==="published"?"Save draft":"Save draft"}</button><button disabled={saving||!backendReady} onClick={()=>save("publish")} className="rounded-xl border border-zinc-950 bg-white px-5 py-3.5 text-sm font-black text-zinc-950 disabled:opacity-50">{targetUid&&targetUid!==user?.uid?"Publish to customer site ↗":"Publish website ↗"}</button>{liveStatus==="published"&&<button disabled={saving||!backendReady} onClick={()=>save("unpublish")} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600">Unpublish</button>}</div>
      <p className="mt-5 text-xs leading-6 text-zinc-500">One shared FUGTH website system serves every business. Your design is saved under this account; only publishing updates the customer-facing version. No custom deployment or domain is created.</p>
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
            <SiteRenderer data={{...site,visibility:"preview"}} preview/>
          </div>
        </div>
      </div>
      <p className="px-1 text-xs leading-6 text-zinc-500">Your draft changes display here immediately. Saving does not change the public website until you choose Publish.</p>
    </aside>
  </div>
  </div>;
}
