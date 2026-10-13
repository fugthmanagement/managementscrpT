"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auth} from "../lib/firebase";
import {buildStarterSite,siteFields,SITE_THEMES,SITE_INDUSTRIES,getIndustry} from "../lib/site-presets";
import {getIndustryPhotos} from "../lib/site-images";
import SiteRenderer from "./site-renderer";

const control="mt-2 block w-full rounded-xl border border-[#dce3d8] bg-white px-4 py-3.5 text-[14px] text-[#2e402f] outline-none focus:border-[#829e7b]";
const card="rounded-[22px] border border-[#e3e9df] bg-white p-5 sm:p-7";
const styles={editorial:["Editorial","bg-[#f7f5eb] text-[#343b2e]","font-serif italic","Beautifully simple."],bold:["Bold","bg-[#b87a58] text-white","font-black uppercase","MADE TO LAST."],warm:["Studio","bg-[#e6cfc4] text-[#7d5d53]","font-serif italic","Feel welcome."],professional:["Professional","bg-[#dfeae5] text-[#426257]","font-semibold","Here to help."]};

export default function SiteStudio({user,workspace,targetUid=null}){
 const uid=targetUid||user?.uid,link=uid?"/sites/"+encodeURIComponent(uid):"";
 const [site,setSite]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [canSave,setCanSave]=useState(true),[hasPublic,setHasPublic]=useState(false),[published,setPublished]=useState(false),[dirty,setDirty]=useState(false);
 const [device,setDevice]=useState("desktop"),[phase,setPhase]=useState("design");
 const changed=(patch)=>{setSite(s=>({...s,...patch}));setDirty(true);};
 async function request(method="GET",data){
   const token=await auth.currentUser?.getIdToken();
   if(!token)throw Error("Log in to edit your website.");
   const res=await fetch("/api/sites/"+encodeURIComponent(uid),{
    method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined
   });
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||"Could not connect to your website.");
   return json;
 }
 useEffect(()=>{
  let active=true;setLoading(true);setError("");setMessage("");setPhase("design");
  if(!uid){setLoading(false);return;}
  (async()=>{
    try{
     const data=await request();
     if(!active)return;
     setSite(data.site||buildStarterSite(uid,workspace?.businessName||"Your business",workspace?.businessType));
     setHasPublic(Boolean(data.hasPublicSite));setPublished(data.liveStatus==="published");setCanSave(true);setDirty(false);
    }catch{
     if(!active)return;
     setSite(buildStarterSite(uid,workspace?.businessName&&workspace.businessName!=="Fugth Management OS"?workspace.businessName:"Your business",workspace?.businessType));
     setCanSave(false);setHasPublic(false);setPublished(false);setError("Your design preview is available, but saving and publishing are temporarily unavailable until your business connection is activated.");
    }finally{if(active)setLoading(false);}
  })();
  return()=>{active=false};
 },[uid]);
 async function submit(action){
  if(!canSave){setError("Saving is not connected yet. This preview won't change the live website.");return;}
  if(action==="publish" && targetUid && targetUid!==user?.uid && !window.confirm("Publish your edits to this customer's website?"))return;
  setBusy(true);setError("");setMessage("");
  try{
    const design=siteFields(site);
    if(action==="publish"&&!design.contactEmail&&!design.phone)throw Error("Add a business email or phone before publishing.");
    const response=await request("PUT",{action,site:design});
    setSite(response.site||site);setHasPublic(true);setDirty(false);setPublished(response.status==="published");
    setMessage(action==="save"?"Draft saved. Your live site hasn't changed.":action==="publish"?"Your website is now published.":"Your website is hidden from visitors until you publish again.");
  }catch(e){setError(e.message||"Your changes could not be saved.");}finally{setBusy(false);}
 }
 async function activate(){
  setBusy(true);setError("");
  try{const response=await request("PUT",{action:"initialize"});setSite(response.site);setHasPublic(true);setMessage("Your website preview is ready.");}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 function chooseIndustry(id){
  const preset=getIndustry(id),photos=getIndustryPhotos(id);
  changed({industry:id,theme:preset.theme,eyebrow:preset.eyebrow,headline:preset.headline,description:preset.lead,services:preset.services,heroImageId:photos[0]?.id||"",galleryImageIds:photos.slice(1,3).map(x=>x.id)});
 }
 if(loading)return <section className={card}>Loading your website design…</section>;
 if(!site)return <section className={card}>Log in to open your Website Maker.</section>;
 const photos=getIndustryPhotos(site.industry);
 const label=(title,field,extra={})=><label className="block text-xs font-semibold text-[#70816e]">{title}<input className={control} value={site[field]||""} onChange={e=>changed({[field]:e.target.value})} {...extra}/></label>;
 return <div className="space-y-5">
  <section className={card}>
   <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.19em] text-[#99a794]">YOUR WEBSITE</p><h3 className="mt-2 text-[26px] font-semibold tracking-[-.06em] text-[#354935] sm:text-[30px]">Make it your own.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#899787]">One easy builder, your own saved design. Change it here and decide when visitors see it.</p></div><span className={`rounded-full px-4 py-2 text-xs font-semibold ${published?"bg-[#eaf5e8] text-[#50774e]":"bg-[#f3f4f0] text-[#8c9388]"}`}>{published?"Live website":"Draft preview"}</span></div>
   <div className="mt-6 flex flex-wrap gap-3">
     {hasPublic?<Link href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-xl border border-[#d4ded0] bg-[#f7f9f5] px-4 py-3 text-xs font-semibold text-[#4a6047]">Open my website ↗</Link>:<button disabled={!canSave||busy} onClick={activate} className="rounded-xl border border-[#cddac8] bg-[#f3f7f0] px-4 py-3 text-xs font-semibold disabled:opacity-40">Activate preview</button>}
     {hasPublic&&<button type="button" onClick={()=>navigator.clipboard?.writeText(window.location.origin+link)} className="rounded-xl border border-[#e1e6dd] px-4 py-3 text-xs font-semibold text-[#6c8167]">Copy website link</button>}
   </div>
   {dirty&&<p className="mt-4 text-xs font-semibold text-[#8a6d42]">You have unsaved design changes.</p>}
  </section>
  {(error||message)&&<p role="status" className={`rounded-xl border px-5 py-4 text-sm leading-6 ${error?"border-[#f0d9ca] bg-[#fff7f0] text-[#975d3e]":"border-[#d5e8d1] bg-[#f2f8ef] text-[#50774d]"}`}>{error||message}</p>}
  {!canSave&&<p className="rounded-xl bg-[#fff3e8] px-5 py-4 text-xs leading-6 text-[#956d4c]">Preview mode only. Design edits here are not saved until the secure website service is connected.</p>}
  <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-[#e1e6df] bg-white p-1">{[["design","1 · Design"],["details","2 · Content"],["publish","3 · Publish"]].map(([id,title])=><button key={id} type="button" onClick={()=>setPhase(id)} aria-pressed={phase===id} className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${phase===id?"bg-[#304431] text-white":"text-[#778a74]"}`}>{title}</button>)}</div>
  <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]">
   <div className="min-w-0 space-y-5">
    {phase==="design"&&<section className={card}><h4 className="text-lg font-semibold text-[#394a38]">Choose your style</h4><p className="mt-2 text-xs leading-6 text-[#879486]">Every layout is built for businesses like yours. Pick the look you prefer.</p><div className="mt-5 grid grid-cols-2 gap-3">{SITE_THEMES.map(t=>{const [name,bg,font,text]=styles[t.id]||styles.editorial;return <button type="button" key={t.id} onClick={()=>changed({theme:t.id})} aria-pressed={site.theme===t.id} className={`overflow-hidden rounded-2xl border p-2 text-left ${site.theme===t.id?"border-[#354a34] ring-2 ring-[#6c8a65]":"border-[#e5e8df]"}`}><div className={`flex h-32 flex-col justify-between rounded-xl p-4 ${bg}`}><span className="text-[9px] font-bold tracking-[.16em]">{name.toUpperCase()}</span><span className={`text-xl leading-5 tracking-[-.05em] ${font}`}>{text}</span></div><p className="px-2 py-3 text-xs font-semibold text-[#587354]">{name}</p></button>})}</div><label className="mt-6 block text-xs font-semibold text-[#70816e]">What kind of business?<select className={control} value={site.industry||"general"} onChange={e=>chooseIndustry(e.target.value)}>{SITE_INDUSTRIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <div className="mt-6"><h4 className="text-sm font-semibold text-[#4f654d]">Choose a cover photo</h4><div className="mt-3 grid grid-cols-2 gap-2">{photos.map(photo=><button type="button" key={photo.id} onClick={()=>changed({heroImageId:photo.id,galleryImageIds:photos.filter(p=>p.id!==photo.id).slice(0,2).map(x=>x.id)})} className={`overflow-hidden rounded-xl border-2 ${site.heroImageId===photo.id?"border-[#536f4c]":"border-transparent"}`} aria-label={"Choose "+photo.alt} aria-pressed={site.heroImageId===photo.id}><img src={photo.src} alt={photo.alt} className="aspect-[5/3] w-full object-cover"/><span className="block truncate p-2 font-mono text-[9px] text-[#788876]">{photo.id}</span></button>)}</div></div>
    </section>}
    {phase==="details"&&<section className={card}><h4 className="text-lg font-semibold text-[#394a38]">Tell your story</h4><p className="mt-2 text-xs leading-6 text-[#879486]">Write as if you're introducing your business to a customer.</p><div className="mt-6 space-y-4">{label("Business name","name",{maxLength:80,required:true})}{label("Main headline","headline",{maxLength:150})}<label className="block text-xs font-semibold text-[#70816e]">Short introduction<textarea className={control+" min-h-[120px]"} maxLength={380} value={site.description||""} onChange={e=>changed({description:e.target.value})}/></label>
       <div><p className="mb-3 text-xs font-semibold text-[#70816e]">Services you offer</p>{(site.services||[]).map((service,i)=><div key={i} className="mb-2 flex gap-2"><input value={service} maxLength={80} onChange={e=>changed({services:site.services.map((x,j)=>j===i?e.target.value:x)})} className={control.replace("mt-2 ","")+" flex-1"}/><button type="button" onClick={()=>changed({services:site.services.filter((_,j)=>j!==i)})} aria-label={"Remove service "+(i+1)} className="rounded-xl border border-[#e5e6df] px-3 text-xs font-semibold text-[#896d65]">×</button></div>)}{(site.services||[]).length<3&&<button type="button" onClick={()=>changed({services:[...(site.services||[]),"New service"]})} className="mt-2 text-xs font-semibold text-[#577450]">+ Add service</button>}</div>
       <details className="rounded-xl border border-[#e7ebe2] p-4"><summary className="cursor-pointer text-xs font-semibold text-[#586d55]">Contact details & opening hours</summary><div className="mt-4 space-y-3">{label("Public email","contactEmail",{type:"email",maxLength:120})}{label("Business phone","phone",{maxLength:32})}{label("Service area","serviceArea",{maxLength:100})}{label("Opening hours","businessHours",{maxLength:100})}{label("Contact button text","ctaLabel",{maxLength:48})}</div></details>
      </div></section>}
    {phase==="publish"&&<section className={card}><h4 className="text-lg font-semibold text-[#394a38]">Finish and share</h4><p className="mt-2 text-sm leading-7 text-[#839480]">Save as a private draft until it looks right. Publish when you're ready for people to see your updates.</p><div className="mt-6 space-y-3"><button type="button" disabled={!canSave||busy} onClick={()=>submit("save")} className="w-full rounded-xl border border-[#ccd9c7] bg-[#f4f8f1] px-5 py-3.5 text-sm font-semibold text-[#40573a] disabled:opacity-40">Save draft</button><button type="button" disabled={!canSave||busy} onClick={()=>submit("publish")} className="w-full rounded-xl bg-[#304530] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-40">{published?"Publish my updates":"Publish website"} ↗</button>{published&&<button type="button" disabled={busy} onClick={()=>submit("unpublish")} className="w-full rounded-xl border border-[#ebdfd8] px-5 py-3 text-xs font-semibold text-[#916c60]">Unpublish website</button>}</div>
      <details className="mt-7 rounded-xl border border-[#e7ebe2] p-4"><summary className="cursor-pointer text-xs font-semibold text-[#5e7558]">Choose what your website shows</summary><div className="mt-4 grid gap-3">{[["showHero","Main introduction"],["showAbout","Business description"],["showServices","Services"],["showGallery","Photo gallery"],["showContact","Contact button"],["showChatbot","Website chat"]].map(([field,title])=><label key={field} className="flex items-center gap-3 text-xs font-semibold text-[#63765f]"><input type="checkbox" checked={site[field]!==false} onChange={e=>changed({[field]:e.target.checked})} className="h-4 w-4 accent-[#415c3b]"/>{title}</label>)}</div>{site.showChatbot!==false&&<div className="mt-4">{label("Chat greeting","chatbotGreeting",{maxLength:160})}</div>}</details>
      <p className="mt-5 text-xs leading-6 text-[#93a08f]">Your website is part of FUGTH. You don't need another account or a separate hosting setup to edit it.</p></section>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e3e9df] bg-white px-5 py-4"><button type="button" onClick={()=>setPhase(phase==="design"?"details":phase==="details"?"publish":"design")} className="rounded-xl bg-[#314631] px-5 py-3 text-xs font-semibold text-white">{phase==="publish"?"Back to designs":"Continue →"}</button><button type="button" onClick={()=>submit("save")} disabled={!canSave||busy} className="text-xs font-semibold text-[#6d8469] disabled:opacity-40">Save draft</button></div>
   </div>
   <aside className="min-w-0 space-y-3 2xl:sticky 2xl:top-24"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8df] bg-white px-4 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99a797]">LIVE PREVIEW</p><p className="mt-1 text-xs text-[#8a9687]">See changes as you edit</p></div><div className="flex rounded-xl bg-[#f3f6f0] p-1"><button type="button" onClick={()=>setDevice("desktop")} aria-pressed={device==="desktop"} className={`rounded-lg px-3 py-2 text-xs font-semibold ${device==="desktop"?"bg-[#314631] text-white":"text-[#8c9989]"}`}>Desktop</button><button type="button" onClick={()=>setDevice("phone")} aria-pressed={device==="phone"} className={`rounded-lg px-3 py-2 text-xs font-semibold ${device==="phone"?"bg-[#314631] text-white":"text-[#8c9989]"}`}>Phone</button></div></div>
      <div className="max-h-[780px] overflow-auto rounded-[22px] border border-[#e0e7dd] bg-[#e5eae3] p-2 sm:p-3"><div className={`mx-auto overflow-hidden rounded-xl bg-white shadow-lg ${device==="phone"?"max-w-[390px]":"w-full"}`}><div className="flex justify-between border-b border-[#eff1ed] bg-white px-3 py-2 text-[10px] text-[#a3afa1]"><span>● ● ●</span><span className="max-w-[75%] truncate">fugthmanagement.space{link}</span></div><div className={device==="phone"?"fugth-phone-preview":""}><SiteRenderer data={{...site,visibility:"preview"}} preview/></div></div></div><p className="text-xs leading-6 text-[#92a08e]">This preview uses your saved business layout. Publishing updates the version customers see.</p>
   </aside>
  </div>
 </div>;
}
