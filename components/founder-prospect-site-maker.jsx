"use client";
import {useCallback,useEffect,useState} from "react";
import {auth,db} from "../lib/firebase";
import {doc,getDoc} from "firebase/firestore";
import {SITE_THEMES,getIndustry,buildStarterSite,detectIndustry,siteFields} from "../lib/site-presets";
import SiteStudioBuilder from "./site-studio-builder";
import SiteImageLibrary from "./site-image-library";
import FounderSiteEditChat from "./founder-site-edit-chat";
import SiteSocialProofStudio from "./site-social-proof-studio";
const tabs=[["design","Design editor"],["ai","AI site editor"],["media","Photo folders & labels"]];
const button="rounded-xl border border-[#bfd8e8] bg-white px-4 py-3 text-xs font-black text-[#215874] disabled:opacity-40";
export default function FounderProspectSiteMaker({user,prospectId,onBack}){
 const [site,setSite]=useState(null),[prospect,setProspect]=useState(null),
  [revision,setRevision]=useState(null),[previewId,setPreviewId]=useState(""),[previewUrl,setPreviewUrl]=useState(""),
  [busy,setBusy]=useState("open"),[notice,setNotice]=useState(""),[tab,setTab]=useState("design");
 const [previewStatus,setPreviewStatus]=useState("checking"),[previewError,setPreviewError]=useState("");
 const [localOnly,setLocalOnly]=useState(false);
 const draftKey="fugth-prospect-local-draft:"+String(user?.uid||"")+":"+prospectId;
 const readDraft=()=>{try{return JSON.parse(localStorage.getItem(draftKey)||"null")}catch{return null}};
 const storeDraft=next=>{try{localStorage.setItem(draftKey,JSON.stringify(siteFields(next)))}catch{}};

 const request=useCallback(async(body)=>{
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in as founder before editing this saved business.");
  const r=await fetch("/api/dev/prospect-site",{method:"POST",cache:"no-store",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({...body,prospectId})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){
   const issue=[j.code?("Error "+j.code):"",j.error||"Could not load this business's saved website.",j.hint||""]
    .filter(Boolean).join(" — ");
   throw Error(issue);
  }
  return j;
 },[prospectId]);
 const verifyPreview=useCallback(async id=>{
  if(!/^[a-f0-9]{24}$/.test(String(id||"")))return false;
  setPreviewStatus("checking");setPreviewError("");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const res=await fetch("/api/demo/"+id,{cache:"no-store",signal:controller.signal});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.site||!data.site.name)throw Error(data.error||"Saved preview did not load");
   setPreviewStatus("ready");return true;
  }catch(e){setPreviewStatus("failed");setPreviewError(e.message||"Preview is temporarily unavailable");return false;
  }finally{clearTimeout(timer)}
 },[]);
 const load=useCallback(async()=>{
  setBusy("open");setNotice("");
  try{
   const result=await request({action:"ensure"});
   const previous=readDraft();
   setSite({...result.site,...(previous||{}),demoId:result.id});
   setLocalOnly(false);
   setProspect({id:prospectId,businessName:result.site.name,industry:result.site.industry});
   setRevision(result.revision);setPreviewId(result.id);setPreviewUrl(result.url);
   await verifyPreview(result.id);
  }catch(e){
   // A signed-in founder can still read their own prospect records using
   // browser Firebase Auth even if the server's service-account email is bad.
   // This is a LOCAL DRAFT ONLY and never produces a fake public preview URL.
   try{
    const snap=await getDoc(doc(db,"users",user.uid,"campaigns",prospectId));
    const prospectData=snap.data()||{};
    if(!snap.exists()||prospectData.type!=="cold_call_prospect")throw Error("Prospect is missing.");
    const type=detectIndustry([prospectData.industry,prospectData.businessType,prospectData.businessName].filter(Boolean).join(" "));
    const starter=buildStarterSite(user.uid,prospectData.businessName||"Business preview",type,{
     phone:prospectData.phone,email:prospectData.email,serviceArea:prospectData.city
    });
    setProspect({id:prospectId,businessName:prospectData.businessName||"Business preview",industry:type});
    setSite({...siteFields(starter),...(readDraft()||{}),ownerId:user.uid,previewMode:true});
    setLocalOnly(true);setPreviewId("");setPreviewUrl("");setRevision(null);
    setPreviewStatus("failed");
    setNotice("Firebase Admin is offline, so this business opens as a private editable LOCAL DRAFT. Save locally and retry syncing when the backend is repaired. This is NOT a public shareable link. "+e.message);
   }catch(readError){setNotice("Could not load this prospect's private draft from browser Firebase. "+String(readError.message||"Check login")+". "+e.message);}
  }finally{setBusy("")}
 },[prospectId,request,verifyPreview]);
 useEffect(()=>{if(prospectId)load()},[prospectId,load]);
 const patch=v=>{setSite(current=>({...current,...v}));setNotice("Unsaved preview edits. Click Save to update this prospect's existing link.");};
 function changeTemplate(theme){
  patch({template:theme.id,theme:theme.id,...theme.palette});
 }
 async function save(){
  if(!site||busy)return;
  setBusy("save");setNotice("");
  try{
   if(localOnly){
    storeDraft(site);
    setNotice("✓ Private design saved in this browser only. Firebase Admin is still unavailable; no public preview URL was created.");
    return;
   }
   const j=await request({action:"save",site,revision});
   setSite({...j.site,demoId:j.id});setRevision(j.revision);
   try{localStorage.removeItem(draftKey)}catch{}
   await verifyPreview(j.id);
   setNotice("✓ Saved. "+j.site.name+" keeps its same preview link; you do not need to create another site.");
  }catch(e){storeDraft(site);setNotice("Saved locally for recovery; the public preview could NOT be updated. "+e.message)}
  finally{setBusy("")}
 }
 function choosePhoto(slot,id){
  if(!/^fugth-upload-[a-f0-9]{32}$/.test(id))return;
  if(slot==="hero")patch({heroImageId:id,sourceHeroPhotoUrl:"",sourceHeroPhotoApproved:false});
  else{
   const gallery=[...(site.galleryImageIds||[])];
   gallery[slot==="gallery1"?0:1]=id;
   patch({galleryImageIds:gallery});
  }
  setTab("design");
 }
 async function copyLink(){
  try{await navigator.clipboard.writeText(previewUrl);setNotice("Preview link copied. The customer sees an independent, editable design concept.")}
  catch{setNotice("Copy the saved preview URL from the box below.")}
 }
 if(!prospectId)return <div className="rounded-2xl border bg-white p-6 text-sm">Choose a prospect from SMS Outreach, Email Outreach, or Prospects & Calls.</div>;
 return <section className="space-y-5 text-[#254761]">
  <header className="rounded-[26px] bg-[#142d41] p-5 text-white sm:p-8">
   <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a2d8ef]">FUGTH / WEBSITE MAKER / PRIVATE PROSPECT DESIGN</p>
   <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-3xl font-black">{prospect?.businessName||"Loading prospect website…"}</h2>
     <p className="mt-2 text-xs leading-6 text-[#bed7e6]">One saved preview per prospect. Design and media changes are saved on their existing Firestore preview. The business can claim it and request further improvements after discussing their needs.</p></div>
    <button onClick={onBack} className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-bold">← Back to outreach</button>
   </div>
   {previewUrl&&<div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4">
    <p className="text-[10px] font-bold uppercase text-[#a6dcf6]">Saved personal preview link · {site?.industry||"business"} · revision {revision}</p>
    <p className="mt-2 break-all font-mono text-xs">{previewUrl}</p>
    <p role="status" className={"mt-3 text-xs font-bold "+(previewStatus==="ready"?"text-emerald-200":previewStatus==="failed"?"text-amber-200":"text-[#bbd7e7]")}>
     {previewStatus==="ready"?"✓ Saved business link verified from public preview API":
      previewStatus==="checking"?"Checking the visitor-facing website…":
      "Preview has NOT passed its public-link check: "+previewError}
    </p>
    <p className="mt-2 text-xs text-[#c5dce8]">This is a sample design that the business can review and request changes to before claiming or publishing it.</p>
    <div className="mt-3 flex flex-wrap gap-2">
     <button type="button" disabled={previewStatus!=="ready"} onClick={copyLink} className="rounded-lg bg-white px-4 py-2.5 text-xs font-black text-[#163b53] disabled:opacity-50">Copy verified link</button>
     <button type="button" onClick={()=>verifyPreview(previewId)} className="rounded-lg border border-white/40 px-4 py-2.5 text-xs font-black">Recheck link</button>
     <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/35 px-4 py-2.5 text-xs font-black">Open client preview ↗</a>
    </div>
   </div>}
  </header>
  {notice&&<div role="status" className="rounded-xl border border-[#c5dfec] bg-[#f1faff] p-4 text-xs leading-6">
   <p>{notice}</p>
   {!site&&<p className="mt-3">The prospect's website has not been confirmed saved. Fix the Firebase connection first; don't send a potentially broken preview link.</p>}
   {!site&&<a href="/dashboard?open=sales&tab=demos" className="mt-3 inline-block rounded-xl border border-[#a3d2e7] bg-white px-4 py-3 text-xs font-black text-[#175471]">Open Firebase connection test in Demo Builder ↗</a>}
   <button type="button" onClick={load} className="mt-3 ml-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold">Retry Firebase sync and public link</button>
  </div>}
  {busy==="open"&&<div className="rounded-2xl bg-white p-8 text-sm">Loading or creating this prospect's saved website…</div>}
  {site&&<div className="space-y-5">
   <nav role="tablist" aria-label="Prospect Site Maker tools" className="flex flex-wrap gap-2 rounded-2xl bg-white p-3">
    {tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}
     className={"rounded-xl px-4 py-3 text-xs font-black "+(tab===id?"bg-[#15516f] text-white":"border border-[#d4e6ef] bg-[#f1faff] text-[#205c7c]")}>{label}</button>)}
   </nav>
   {tab==="design"&&<div role="tabpanel" className="space-y-5">
    <SiteStudioBuilder site={site} uid={user.uid} locked={false} busy={busy}
     onChange={patch} onTemplate={changeTemplate} onSave={save}
     previewOnly={true} previewUrlOverride={previewUrl||"/sites/preview-canvas"}/>
    <SiteSocialProofStudio site={site} onChange={patch} locked={false}/>
    <div className="rounded-2xl border border-[#cfdfeb] bg-white p-5">
     <p className="text-sm font-black">Keep editing this same preview</p>
     <p className="mt-2 text-xs leading-6 text-[#7b8fa0]">Your template selection, color slots, sections, services, reviews, photos, and approved content persist after you save. The prospect's assigned SMS/email link remains unchanged.</p>
     <button className={"mt-3 "+button} disabled={!!busy} onClick={save}>Save current preview design</button>
    </div>
   </div>}
   {tab==="ai"&&!localOnly&&<div role="tabpanel"><FounderSiteEditChat key={previewId} site={site}
    prospect={prospect} onApplied={(updated,newRevision)=>{setSite({...updated,demoId:previewId});setRevision(newRevision);setNotice("✓ AI tool actions saved to the existing preview. Switch to Design editor to see the result.");}}/></div>}
   {tab==="ai"&&localOnly&&<p className="rounded-xl bg-white p-5 text-sm">The server AI editor requires verified Firebase storage. You can edit the design, services, and legal text manually while working offline.</p>}
   {tab==="media"&&<div role="tabpanel" className="space-y-4">
    <div className="rounded-2xl border border-[#cfe4ef] bg-[#edf7fc] p-5 text-xs leading-6">
     <strong className="text-sm">Use photos you have the rights to display</strong>
     <p className="mt-2">Upload JPG/PNG/WebP photos from your phone or computer, label them by business and subject, and group them into folders. Your original bytes go to the connected private Drive archive; Firestore stores a searchable file index, tags and folder. Choosing Hero/Gallery attaches a photo to this prospect's saved design. Click Save when finished.</p>
     <p className="mt-2">Existing photos from a business's social media can be used only with its permission or a suitable license. A public post alone is not permission to republish.</p>
    </div>
    <SiteImageLibrary uid={user.uid} onPick={choosePhoto} industry={site.industry} folderHint={site.name}/>
   </div>}
  </div>}
 </section>;
}
