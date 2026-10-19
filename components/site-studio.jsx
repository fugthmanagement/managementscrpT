"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auth,db} from "../lib/firebase";
import {doc,getDoc,setDoc,serverTimestamp} from "firebase/firestore";
import SiteImageLibrary from "./site-image-library";
import {buildStarterSite,getIndustry,getIndustryThemes,SITE_THEMES,siteFields} from "../lib/site-presets";
import SiteStudioBuilder from "./site-studio-builder";
import {themeNarrative} from "../lib/site-layout-copy";
import {getIndustryPhotos} from "../lib/site-images";
import {siteFactsFromProfile} from "../lib/business-profile";
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
 const localDraftKey=`${LOCAL_SITE_DRAFT}:${uid||"unknown"}`;
 const [site,setSite]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[published,setPublished]=useState(false);
 const [agentHealth,setAgentHealth]=useState(null);
 const isFounderEditing=Boolean(targetUid&&targetUid!==user?.uid);
 async function request(method="GET",data){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Log in to manage this website.");const res=await fetch("/api/sites/"+encodeURIComponent(uid),{method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined});const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||"Website service is unavailable.");return json;}
 async function load(){
  if(!uid)return;
  setLoading(true);setError("");setMessage("");
  const starter=()=>{
   const facts=siteFactsFromProfile(workspace);
   const base=buildStarterSite(uid,workspace.businessName||"Your business",facts.industry,workspace);
   return {...base,...(facts.lead?{description:facts.lead}:{}),
    ...(facts.about?{aboutDetail:facts.about}:{}),services:facts.services};
  };
  try{
   // Free customers can always see their own private preview without
   // needing privileged publishing credentials or a public site.
   if(locked&&!targetUid){
    const [published,profile]=await Promise.all([
     getDoc(doc(db,"publicSites",uid)).catch(()=>null),
     getDoc(doc(db,"users",uid)).catch(()=>null)
    ]);
    const details=profile?.data()||{};
    const facts=siteFactsFromProfile({...workspace,...details});
    const base=buildStarterSite(uid,details.businessName||workspace.businessName||"Your business",facts.industry,details);
    const fromProfile={...base,...(facts.lead?{description:facts.lead}:{}),
      ...(facts.about?{aboutDetail:facts.about}:{}),services:facts.services};
    // A free account sees its latest business details, not a stale paid site.
    let next=fromProfile;
    if(published?.exists() && (details.billingActive===true||details.websitePurchased===true))
     next=published.data();
    const chosen=details.sitePreviewImages||{};
    if(chosen.heroImageId||chosen.galleryImageIds)next={...next,
      ...(chosen.heroImageId?{heroImageId:chosen.heroImageId}:{}),
      ...(chosen.galleryImageIds?{galleryImageIds:chosen.galleryImageIds}:{})};
    try{const local=JSON.parse(localStorage.getItem(localDraftKey)||"null");if(local)next={...next,...siteFields({...next,...local})};}catch{}
    setSite(next);setPublished(next.visibility==="published");return;
   }
   const data=await request();
   let next=data.site||starter();
   setPublished(data.liveStatus==="published"||data.site?.visibility==="published");
   // Restore local design drafts without silently writing anything to Firestore.
   if(!targetUid){
    try{
     const local=JSON.parse(localStorage.getItem(localDraftKey)||"null");
     if(local)next={...next,...siteFields({...next,...local})};
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
   try{const local=JSON.parse(localStorage.getItem(localDraftKey)||"null");if(local)next={...next,...siteFields({...next,...local})};}catch{}
   setSite(next);setPublished(next.visibility==="published");
   setMessage("Showing the FUGTH website preview from your business details. Secure editing or publishing may require the management connection to be restored.");
  }finally{setLoading(false);}
 }
 useEffect(()=>{load()},[uid]);
 useEffect(()=>{
  if(!uid||!user?.uid||uid!==user.uid||!auth)return;
  let mounted=true;
  (async()=>{
   try{
    const token=await auth.currentUser?.getIdToken();
    if(!token)return;
    const response=await fetch("/api/sites/"+encodeURIComponent(uid)+"/assistant",{
     headers:{Authorization:"Bearer "+token},cache:"no-store"
    });
    const info=await response.json();
    if(mounted)setAgentHealth(response.ok?info:{configured:false,models:{"0.5b":false,"1.5b":false},missing:["GGUF server check unavailable"]});
   }catch{if(mounted)setAgentHealth({configured:false,models:{"0.5b":false,"1.5b":false},missing:["GGUF server check unavailable"]});}
  })();
  return()=>{mounted=false};
 },[uid,user?.uid]);

 function change(patch){
  setSite(current=>{
   const next={...current,...patch};
   if(!targetUid){
    try{localStorage.setItem(localDraftKey,JSON.stringify(siteFields(next)));}catch{}
   }
   return next;
  });
  setMessage(locked?"Preview only — these changes are stored in this browser and are not published.":"Unsaved changes. Review your site, then choose Save design.");
 }
 function chooseTemplate(theme){
  const industry=getIndustry(site.industry);
  const nextCopy=themeNarrative(industry.id,theme.id,{...industry,services:site.services});
  const previousCopies=getIndustryThemes(industry.id).map(t=>themeNarrative(industry.id,t.id,{...industry,services:site.services}));
  const copy={};
  for(const key of ["headline","eyebrow","description"]){
   const original=key==="description"?industry.lead:industry[key];
   if(!site[key]||site[key]===original||previousCopies.some(v=>v[key]===site[key]))copy[key]=nextCopy[key];
  }
  const photos=getIndustryPhotos(industry.id),presetPhoto=photos.some(p=>p.id===site.heroImageId);
  const templateIndex=getIndustryThemes(industry.id).findIndex(t=>t.id===theme.id);
  const photoPatch=presetPhoto&&photos.length>1?{
   heroImageId:photos[((templateIndex+photos.length)%photos.length)].id,
   galleryImageIds:photos.filter(p=>p.id!==photos[((templateIndex+photos.length)%photos.length)].id).slice(0,2).map(p=>p.id)
  }:{};
  change({template:theme.id,theme:theme.id,...theme.palette,...photoPatch,...copy});
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

 async function action(kind){if(locked)return;setBusy(kind);setError("");setMessage("");try{const data=await request("PUT",{action:kind,...(["save","publish"].includes(kind)?{site}: {})});setSite(data.site||site);setPublished(data.status==="published");try{localStorage.removeItem(localDraftKey);}catch{}if(kind==="save")setMessage("Design saved to your FUGTH account.");else if(kind==="regenerate")setMessage("Business details refreshed without changing your chosen design.");else if(kind==="publish")setMessage("This website is now live.");else setMessage("This website is hidden from public visitors.");}catch(e){setError(e.message);}finally{setBusy("");}}
 if(loading)return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Preparing your website…</div>;
 const industry=getIndustry(site?.industry);
 
 return <div className="space-y-5">
  {locked&&<div className="rounded-2xl border border-[#d0d0d0] bg-[#f4f4f4] p-5 text-[#333333] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><strong className="text-base">Your full website preview is unlocked</strong><p className="mt-2 max-w-2xl text-xs leading-6">Explore the entire site and try the included business chatbot now, even on Zero or Low. You can switch all three layout previews for free. Saving colors, publishing and personalized site modifications require a qualifying website package. FUGTH prepares your tailored website within 24 hours of receiving your onboarding details.</p></div><Link href="/plans" className="fugth-blue-fill rounded-xl px-5 py-3 text-xs font-bold">Unlock site customization ↗</Link></div></div>}
  {(error||message)&&<p role="status" className={`rounded-xl border px-4 py-3 text-sm ${error?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error||message}</p>}
  <div className="rounded-2xl border border-[#dddddd] bg-[#f5f5f5] p-5 text-[#333333] sm:p-6"><p className="text-xs font-bold uppercase tracking-wider">Preview design · Personalized launch service</p><p className="mt-2 text-sm leading-7">These designs are previews, not your finished custom website. Choose a FUGTH package that includes professional website customization and our team will personalize your site and prepare it for launch within 24 hours after purchase and receipt of your business details. Domain approval or content delays may affect the public launch time.</p><p className="mt-2 text-xs">Your preview helps us understand your style; the final design can be substantially improved.</p></div>
  <SiteStudioBuilder site={site} uid={uid} locked={locked} published={published} busy={busy} onChange={change} onTemplate={chooseTemplate} onSave={action} onPublish={()=>action("publish")} onUnpublish={()=>action("unpublish")}/>
  <section className="overflow-hidden rounded-[24px] border border-[#b9dceb] bg-white shadow-[0_10px_36px_rgba(31,81,110,.06)]">
   <div className="bg-[#143246] p-5 text-white sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.19em] text-[#a9dff7]">FUGTH WEBSITE STUDIO / ASSISTANT</p><h3 className="mt-3 text-2xl font-black tracking-[-.04em]">Your site's own business agent.</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-[#c3d8e5]">Each published website answers only from its published business facts. A relevance filter rejects unrelated questions before any local model runs. Assign your GGUF size here; the model weights and keys never go in the page.</p></div>
   <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
    <label className="text-xs font-bold text-[#47758e]">Visitor assistant mode
     <select value={site.aiAgentMode||"facts-only"} onChange={e=>change({aiAgentMode:e.target.value})} className="mt-2 w-full rounded-xl border border-[#c8deea] bg-white px-4 py-3 text-sm font-bold text-[#214b61]">
      <option value="facts-only">Verified facts only · no model</option>
      <option value="local">Local GGUF · natural answers with RAG</option>
      <option value="off">Disable site assistant</option>
     </select>
    </label>
    <label className="text-xs font-bold text-[#47758e]">Assigned language model
     <select value={site.aiAgentModel||"1.5b"} onChange={e=>change({aiAgentModel:e.target.value})} disabled={site.aiAgentMode!=="local"} className="mt-2 w-full rounded-xl border border-[#c8deea] bg-white px-4 py-3 text-sm font-bold text-[#214b61] disabled:bg-[#f1f6f9] disabled:opacity-60">
      <option value="0.5b">0.5B · quick and lightweight</option>
      <option value="1.5b">1.5B · better conversation</option>
     </select>
    </label>
    <div className="rounded-xl bg-[#edf8ff] p-4 text-xs leading-6 text-[#4a7b97] sm:col-span-2">
     <strong className="text-[#1a5473]">Local runtime:</strong>{" "}{agentHealth?agentHealth.configured?"A private inference endpoint is configured. Each answer still has to pass business-only retrieval and grounding checks.":"No reachable GGUF configuration has been confirmed for this workspace. A published website will answer using verified site facts until the server is connected.":"Checking your site's inference settings…"}
     {agentHealth?.missing?.length>0&&<p className="mt-2 text-[11px] font-semibold">Server settings to check: {agentHealth.missing.join(", ")}</p>}
     {locked&&<p className="mt-2 font-bold">Free preview: model choices are local only; publishing requires a qualifying website plan.</p>}
    </div>
    <p className="text-[11px] leading-6 text-[#6d8ea2] sm:col-span-2">A business assistant cannot provide unrelated history, general knowledge, guessed prices or unverified claims. Booking requests still require confirmation; this model cannot book appointments by itself. A GGUF uploaded to Hugging Face must also run in a reachable inference server for real-time chat.</p>
   </div>
  </section>
  <details className="rounded-2xl border border-[#d1e6f3] bg-[#f8fcff] p-5"><summary className="cursor-pointer text-sm font-black text-[#164760]">Your photo library · Choose hero and gallery images</summary><div className="mt-5"><SiteImageLibrary uid={uid} onPick={choosePhoto}/></div></details>
  <div className="rounded-2xl border border-[#d1e6f3] bg-[#eff9ff] p-5 text-sm text-[#275571]"><strong>Client access preview:</strong> Supported sites can show a browser-only profile and Continue as guest. This does not create a real client login in your Firebase project.</div>
  {isFounderEditing&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">Founder view: changes save to this customer’s website, without accessing their password, billing or Google connection.</div>}
  <div className="rounded-xl border border-[#dddddd] bg-white p-4 text-xs leading-6 text-[#666666]"><strong>Chatbot included with the voice receptionist:</strong> It can be added to a business’s existing website or included with a new FUGTH site. No claim of a confirmed booking is made until calendar integration is connected.</div>
  <section className="rounded-2xl border border-[#dddddd] bg-[#fafafa] p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#61815f]">FREE WITH YOUR VOICE RECEPTIONIST</p>
   <h3 className="mt-3 text-xl font-black tracking-tight text-[#27442d]">Add your chatbot to your existing website.</h3>
   <p className="mt-3 text-xs leading-6 text-[#617764]">Already have a website somewhere else? Install the FUGTH business-aware assistant without migrating the whole site. It uses your saved business details and collects appointment requests by email when a contact email is set.</p>
   <div className="mt-4 flex flex-wrap items-stretch gap-3"><textarea readOnly rows={2} aria-label="Copy the chatbot embed script" value={'<script async src="https://www.fugthmanagement.space/api/embed/widget/'+encodeURIComponent(uid)+'"></script>'} className="min-w-[200px] flex-1 rounded-xl border border-[#cddfc9] bg-white p-3 font-mono text-xs text-[#344a36]"/><button type="button" onClick={()=>navigator.clipboard?.writeText('<script async src="https://www.fugthmanagement.space/api/embed/widget/'+encodeURIComponent(uid)+'"></script>')} className="rounded-xl bg-[#2d4936] px-5 py-3 text-xs font-bold text-white">Copy embed code</button></div>
   <p className="mt-2 text-[11px] leading-5 text-[#829780]">Paste before the closing body tag of your existing site. The chat uses the business website profile and requires a published or preview site profile to load. It does not confirm appointments without a real booking integration.</p>
  </section>
  {!locked&&["wedding","realestate"].includes(site?.industry)&&<ClientPresentationStudio uid={uid} industry={site.industry}/>}
 </div>;
}
