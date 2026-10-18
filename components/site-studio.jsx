"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auth,db} from "../lib/firebase";
import {doc,getDoc,setDoc,serverTimestamp} from "firebase/firestore";
import SiteImageLibrary from "./site-image-library";
import {buildStarterSite,getIndustry,getIndustryThemes,SITE_THEMES,siteFields} from "../lib/site-presets";
import SiteRenderer from "./site-renderer";
import ClientPresentationStudio from "./client-presentation-studio";

export const LOCAL_SITE_DRAFT="fugth-site-draft-v1";
const paletteFields=[
 {key:"headerColor",label:"Header",hint:"Navigation and business name"},
 {key:"mainColor",label:"Main",hint:"Primary page background"},
 {key:"sectionColor",label:"Feature",hint:"Hero and highlighted sections"},
 {key:"accentColor",label:"Buttons",hint:"Calls to action and details"}
];

export default function SiteStudio({user,workspace={},targetUid=null,locked=false}){
 const uid=targetUid||user?.uid;
 const [site,setSite]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[published,setPublished]=useState(false);
 const isFounderEditing=Boolean(targetUid&&targetUid!==user?.uid);
 async function request(method="GET",data){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Log in to manage this website.");const res=await fetch("/api/sites/"+encodeURIComponent(uid),{method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined});const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||"Website service is unavailable.");return json;}
 async function load(){
  if(!uid)return;
  setLoading(true);setError("");setMessage("");
  const starter=()=>buildStarterSite(uid,workspace.businessName||"Your business",workspace.businessType,workspace);
  try{
   // Free customers can always see their own private preview without
   // needing privileged publishing credentials or a public site.
   if(locked&&!targetUid){
    const [published,profile]=await Promise.all([
     getDoc(doc(db,"publicSites",uid)).catch(()=>null),
     getDoc(doc(db,"users",uid)).catch(()=>null)
    ]);
    const details=profile?.data()||{};
    let next=published?.exists()?published.data():
     buildStarterSite(uid,details.businessName||workspace.businessName||"Your business",
      details.businessType||workspace.businessType||"general",details);
    const chosen=details.sitePreviewImages||{};
    if(chosen.heroImageId||chosen.galleryImageIds)next={...next,
      ...(chosen.heroImageId?{heroImageId:chosen.heroImageId}:{}),
      ...(chosen.galleryImageIds?{galleryImageIds:chosen.galleryImageIds}:{})};
    setSite(next);setPublished(next.visibility==="published");return;
   }
   const data=await request();
   let next=data.site||starter();
   setPublished(data.liveStatus==="published"||data.site?.visibility==="published");
   if(!targetUid&&!locked){
    try{
     const saved=JSON.parse(localStorage.getItem(LOCAL_SITE_DRAFT)||"null");
     if(saved){
      next=siteFields({...next,industry:saved.industry||next.industry,template:saved.template||next.template,
       headerColor:saved.headerColor,mainColor:saved.mainColor,sectionColor:saved.sectionColor,accentColor:saved.accentColor});
      const synced=await request("PUT",{action:"save",site:next});
      next=synced.site||next;localStorage.removeItem(LOCAL_SITE_DRAFT);
      setMessage("Your saved design preferences have been restored.");
     }
    }catch{}
   }
   setSite(next);
  }catch(error){
   // No false 404 for the owner's preview. Saving still requires a working
   // protected server connection and will explain failures explicitly.
   let next=starter();
   try{
    const snap=await getDoc(doc(db,"publicSites",uid));
    if(snap.exists())next=snap.data();
   }catch{}
   setSite(next);setPublished(next.visibility==="published");
   setMessage("Showing the FUGTH website preview from your business details. Secure editing or publishing may require the management connection to be restored.");
  }finally{setLoading(false);}
 }
 useEffect(()=>{load()},[uid]);
 function change(patch){if(locked)return;setSite(current=>{const next={...current,...patch};try{localStorage.setItem(LOCAL_SITE_DRAFT,JSON.stringify({industry:next.industry,template:next.template,headerColor:next.headerColor,mainColor:next.mainColor,sectionColor:next.sectionColor,accentColor:next.accentColor}));}catch{}return next;});setMessage("");}
 function chooseTemplate(theme){
  // Everyone can explore all three real renderers. Saving and publishing stay entitled.
  const patch={template:theme.id,theme:theme.id,...theme.palette};
  setSite(current=>({...current,...patch}));
  setMessage(locked?"Previewing "+theme.name+". Activate a website package to save this design.":"Showing the "+theme.name+" layout.");
}
 async function choosePhoto(slot,imageId){
  if(!/^fugth-upload-[a-f0-9]{32}$/.test(String(imageId||"")))return;
  const gallery=Array.isArray(site?.galleryImageIds)?[...site.galleryImageIds]:[];
  if(slot==="gallery1")gallery[0]=imageId;
  if(slot==="gallery2")gallery[1]=imageId;
  const next=slot==="hero"?{heroImageId:imageId}:{galleryImageIds:gallery};
  setSite(prev=>({...prev,...next}));
  setMessage("");setError("");
  if(!isFounderEditing){
   try{
    const saved={heroImageId:slot==="hero"?imageId:site?.heroImageId||"",
      galleryImageIds:slot==="hero"?gallery:gallery};
    await setDoc(doc(db,"users",uid),{sitePreviewImages:saved,updatedAt:serverTimestamp()},{merge:true});
    setMessage("Image saved for your private website preview. Publication remains separate.");
   }catch{setError("Your photo was selected locally but couldn't be synced to the FUGTH account.");}
  }
 }

 async function action(kind){if(locked)return;setBusy(kind);setError("");setMessage("");try{const data=await request("PUT",{action:kind,...(["save","publish"].includes(kind)?{site}: {})});setSite(data.site||site);setPublished(data.status==="published");if(kind==="save")setMessage("Design saved to your FUGTH account.");else if(kind==="regenerate")setMessage("Business details refreshed without changing your chosen design.");else if(kind==="publish")setMessage("This website is now live.");else setMessage("This website is hidden from public visitors.");}catch(e){setError(e.message);}finally{setBusy("");}}
 if(loading)return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Preparing your website…</div>;
 const industry=getIndustry(site?.industry);
 const industryThemes=getIndustryThemes(industry.id);
 return <div className="space-y-5">
  {locked&&<div className="rounded-2xl border border-[#d0d0d0] bg-[#f4f4f4] p-5 text-[#333333] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><strong className="text-base">Your full website preview is unlocked</strong><p className="mt-2 max-w-2xl text-xs leading-6">Explore the entire site and try the included business chatbot now, even on Zero or Low. You can switch all three layout previews for free. Saving colors, publishing and personalized site modifications require a qualifying website package. FUGTH prepares your tailored website within 24 hours of receiving your onboarding details.</p></div><Link href="/plans" className="rounded-xl bg-[#111111] px-5 py-3 text-xs font-bold text-white">Unlock site customization ↗</Link></div></div>}
  {(error||message)&&<p role="status" className={`rounded-xl border px-4 py-3 text-sm ${error?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error||message}</p>}
  <SiteImageLibrary uid={uid} onPick={choosePhoto}/>
  <div className="rounded-2xl border border-[#dddddd] bg-[#f5f5f5] p-5 text-[#333333] sm:p-6"><p className="text-xs font-bold uppercase tracking-wider">Preview design · Personalized launch service</p><p className="mt-2 text-sm leading-7">These designs are previews, not your finished custom website. Choose a FUGTH package that includes professional website customization and our team will personalize your site and prepare it for launch within 24 hours after purchase and receipt of your business details. Domain approval or content delays may affect the public launch time.</p><p className="mt-2 text-xs">Your preview helps us understand your style; the final design can be substantially improved.</p></div>
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="grid gap-5 bg-slate-950 p-6 text-white lg:grid-cols-[1fr_auto] lg:items-end sm:p-8"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/60">FUGTH WEBSITE STUDIO</p><h3 className="mt-3 text-3xl font-black tracking-[-.06em]">Three real layouts for your {industry.label.toLowerCase()} site.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Tap each design to see a different page structure, image height, hero composition and service layout below. Baby-blue accents keep the design bright without overpowering the brand.</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase ${published?"bg-emerald-300 text-emerald-950":"bg-white/10 text-white"}`}>{published?"Live":"Private preview"}</span><Link href={`/sites/${encodeURIComponent(uid)}?preview=1`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-4 py-3 text-xs font-black text-slate-950">View your website ↗</Link></div></div>
   <div className="p-6 sm:p-8"><div><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">1 · CHOOSE THE ACTUAL LAYOUT</p><p className="mt-2 text-xs text-slate-500">Three curated directions for {industry.label.toLowerCase()}, selected from 10 complete FUGTH presets.</p></div><span className="border border-slate-300 px-3 py-2 text-[10px] font-black uppercase">3 for this industry · 10 total</span></div><div className="mt-4 grid gap-3 md:grid-cols-3">{industryThemes.map(theme=><button key={theme.id} type="button" onClick={()=>chooseTemplate(theme)} className={`min-h-[150px] border p-5 text-left transition ${site.template===theme.id?"border-slate-950 bg-slate-950 text-white shadow-[5px_5px_0_#000]":"border-slate-400 bg-white text-slate-900 hover:-translate-y-1 hover:shadow-[5px_5px_0_#111]"}`}><span className="mb-4 block h-2 w-14" style={{backgroundColor:theme.color}}/><span aria-hidden="true" className="mb-4 block h-20 overflow-hidden border border-current/15 bg-[#eaf7ff] p-2 text-slate-900"><span className="mb-1 block h-1 w-14 bg-slate-400"/><span className={["service-pro","field-pro","local-bold"].includes(theme.id)?"flex gap-1":theme.id==="project-showcase"?"grid grid-cols-3 gap-1":"block"}><span className="block h-12 flex-1 bg-[#b9e4fb]"><span className="mt-2 ml-1 block h-1 w-10 bg-[#276a8a]"/><span className="mt-1 ml-1 block h-1 w-6 bg-white"/></span><span className={["signature","modern-classic","appointment"].includes(theme.id)?"mt-1 block h-4 bg-[#579abd]":"block h-12 flex-1 bg-[#579abd]"}/></span></span><strong className="block text-lg">{theme.name}</strong><span className={`mt-2 block text-xs leading-5 ${site.template===theme.id?"text-slate-300":"text-slate-500"}`}>{theme.subtitle}</span></button>)}</div></div>
    <div className="mt-8 border-t border-slate-200 pt-7"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">2 · SET YOUR COLOR SYSTEM</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{paletteFields.map(item=><label key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><input aria-label={`${item.label} color`} type="color" disabled={locked} value={site[item.key]} onChange={e=>change({[item.key]:e.target.value})} className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"/><span><strong className="block text-sm text-slate-950">{item.label}</strong><span className="mt-1 block text-[11px] leading-4 text-slate-500">{item.hint}</span><code className="mt-1 block text-[10px] uppercase text-slate-400">{site[item.key]}</code></span></label>)}</div></div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-7"><p className="max-w-xl text-xs leading-6 text-slate-500">Business name, profession, phone, area and hours come from Settings. Layout and colors are saved separately, so refreshing business details will not erase the design.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={locked||Boolean(busy)} onClick={()=>action("regenerate")} className="rounded-lg border border-slate-300 px-4 py-3 text-xs font-black text-slate-800 disabled:opacity-50">Refresh details</button><button type="button" disabled={locked||Boolean(busy)} onClick={()=>action("save")} className="rounded-lg border border-slate-950 bg-white px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50">{busy==="save"?"Saving…":"Save design"}</button>{published?<button type="button" disabled={locked||Boolean(busy)} onClick={()=>action("unpublish")} className="rounded-lg border border-red-200 px-4 py-3 text-xs font-black text-red-700 disabled:opacity-50">Hide site</button>:<button type="button" disabled={locked||Boolean(busy)} onClick={()=>action("publish")} className="rounded-lg px-4 py-3 text-xs font-black text-white disabled:opacity-50" style={{backgroundColor:site.accentColor}}>{busy==="publish"?"Publishing…":"Publish website"}</button>}</div></div>
   </div>
  </section>
  <div className="fugth-blue-panel flex flex-wrap items-center justify-between gap-3 border p-4"><div><strong className="text-sm">Customer accounts & work history</strong><p className="mt-1 text-xs">Manage who signed up through this business website, jobs completed and payment records.</p></div><Link href={`/sites/${encodeURIComponent(uid)}/customers`} className="px-4 py-2 text-xs font-bold" data-fugth-accent="blue">Open customer dashboard ↗</Link></div>
  {isFounderEditing&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">Founder view: changes save to this customer’s website, without accessing their password, billing or Google connection.</div>}
  <div className="rounded-xl border border-[#dddddd] bg-white p-4 text-xs leading-6 text-[#666666]"><strong>Chatbot included with the voice receptionist:</strong> It can be added to a business’s existing website or included with a new FUGTH site. No claim of a confirmed booking is made until calendar integration is connected.</div>
  <section className="rounded-2xl border border-[#dddddd] bg-[#fafafa] p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#61815f]">FREE WITH YOUR VOICE RECEPTIONIST</p>
   <h3 className="mt-3 text-xl font-black tracking-tight text-[#27442d]">Add your chatbot to your existing website.</h3>
   <p className="mt-3 text-xs leading-6 text-[#617764]">Already have a website somewhere else? Install the FUGTH business-aware assistant without migrating the whole site. It uses your saved business details and collects appointment requests by email when a contact email is set.</p>
   <div className="mt-4 flex flex-wrap items-stretch gap-3"><textarea readOnly rows={2} aria-label="Copy the chatbot embed script" value={'<script async src="https://www.fugthmanagement.space/api/embed/widget/'+encodeURIComponent(uid)+'"></script>'} className="min-w-[200px] flex-1 rounded-xl border border-[#cddfc9] bg-white p-3 font-mono text-xs text-[#344a36]"/><button type="button" onClick={()=>navigator.clipboard?.writeText('<script async src="https://www.fugthmanagement.space/api/embed/widget/'+encodeURIComponent(uid)+'"></script>')} className="rounded-xl bg-[#2d4936] px-5 py-3 text-xs font-bold text-white">Copy embed code</button></div>
   <p className="mt-2 text-[11px] leading-5 text-[#829780]">Paste before the closing body tag of your existing site. The chat uses the business website profile and requires a published or preview site profile to load. It does not confirm appointments without a real booking integration.</p>
  </section>
  {!locked&&["wedding","realestate"].includes(site?.industry)&&<ClientPresentationStudio uid={uid} industry={site.industry}/>}
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">LIVE PREVIEW</p><p className="mt-1 text-sm font-bold text-slate-900">{SITE_THEMES.find(x=>x.id===site.template)?.name} · {industry.label}</p></div><Link href={`/sites/${encodeURIComponent(uid)}?preview=1`} target="_blank" className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-black">Full-screen preview ↗</Link></div><div className="max-h-[800px] overflow-y-auto" key={site.template}><SiteRenderer data={site} preview/></div></section>
 </div>;
}
