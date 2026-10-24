"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {composeFounderProspectSite,shuffleFounderDraft} from "../lib/site-founder-quick-build";
import {auth} from "../lib/firebase";
import {rememberActiveProspect} from "../lib/client/active-prospect";
import {SITE_THEMES,getIndustry} from "../lib/site-presets";
import SiteStudioBuilder from "./site-studio-builder";
import SiteImageLibrary from "./site-image-library";
import FounderSiteEditChat from "./founder-site-edit-chat";
import SiteSocialProofStudio from "./site-social-proof-studio";
import FounderSiteReferenceInspector from "./founder-site-reference-inspector";
import FounderProspectBusinessHub from "./founder-prospect-business-hub";
const tabs=[["design","Build & preview"],["data","Business details & reference"],["media","Photo library"],["ai","AI edits"]];
const button="rounded-xl border border-[#bfd8e8] bg-white px-4 py-3 text-xs font-black text-[#215874] disabled:opacity-40";
export default function FounderProspectSiteMaker({user,prospectId,onBack,onOpenSms}){
 const [site,setSite]=useState(null),[prospect,setProspect]=useState(null),
  [revision,setRevision]=useState(null),[previewId,setPreviewId]=useState(""),[previewUrl,setPreviewUrl]=useState(""),
  [busy,setBusy]=useState("open"),[notice,setNotice]=useState(""),[tab,setTab]=useState("design");
 const [dirty,setDirty]=useState(false),[quickPreview,setQuickPreview]=useState(false),[previewDevice,setPreviewDevice]=useState("mobile");
 const [undoSite,setUndoSite]=useState(null),quickFrame=useRef(null);
 const [previewStatus,setPreviewStatus]=useState("checking"),[previewError,setPreviewError]=useState("");
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue=""};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty]);
 useEffect(()=>{if(quickPreview&&quickFrame.current?.contentWindow&&site)quickFrame.current.contentWindow.postMessage({type:"fugth:website-preview",site,page:"home"},window.location.origin)},[quickPreview,previewDevice,site]);
  useEffect(()=>{if(prospectId)rememberActiveProspect(user?.uid,prospectId)},[user?.uid,prospectId]);
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
  // Never show a previous prospect's link while loading a different account.
  setSite(null);setProspect(null);setPreviewUrl("");setPreviewId("");
  setRevision(null);setPreviewStatus("checking");setPreviewError("");setDirty(false);setUndoSite(null);setQuickPreview(false);
  try{
   const result=await request({action:"ensure"});
   setSite({...result.site,demoId:result.id});
   setProspect({...result.prospect,id:prospectId,businessName:result.site.name,industry:result.site.industry});
   setRevision(result.revision);setPreviewId(result.id);setPreviewUrl(result.url);
   await verifyPreview(result.id);
   setTab("design");
  }catch(e){setNotice(e.message)}finally{setBusy("")}
 },[prospectId,request,verifyPreview]);
 useEffect(()=>{if(prospectId)load()},[prospectId,load]);
 const patch=v=>{setSite(current=>({...current,...v}));setDirty(true);setNotice("Unsaved design changes. Save this prospect's existing preview before sharing.");};
 function navigateAway(action){
  if(dirty&&!window.confirm("This prospect has unsaved website edits. Leave without saving?"))return;
  action?.();
 }
 function generateDraft(){
  if(!site||busy)return;
  if(dirty&&!window.confirm("Generate a new composition? Unsaved canvas edits will be replaced; business facts, approved reviews and photos stay intact."))return;
  setUndoSite(site);
  patch(composeFounderProspectSite(site,prospect||{id:prospectId}));
  setTab("design");setQuickPreview(true);
  setNotice("Professional industry layout generated from this prospect's data. Review your live draft and SAVE before sharing.");
 }
 function randomizeDraft(){
  if(!site||busy)return;
  const draft=site.template==="custom-canvas"?shuffleFounderDraft(site):composeFounderProspectSite(site,prospect||{id:prospectId});
  setUndoSite(site);patch(draft);setQuickPreview(true);
  setNotice("A new coordinated layout is ready. Your business information and approved photos were preserved.");
 }
 async function modernizeExisting(){
  if(!site||busy)return;
  const website=String(prospect?.website||"").trim();
  if(!website){setTab("data");setNotice("This prospect has no saved website URL. Add one in Business Data, then use the Reference Inspector.");return;}
  if(dirty&&!window.confirm("Inspect this business's existing site? Your unsaved draft remains editable until you apply the new layout."))return;
  setBusy("inspect");setNotice("");
  try{
   const token=await auth.currentUser?.getIdToken();
   if(!token)throw Error("Founder sign-in expired.");
   const response=await fetch("/api/dev/prospect-layout",{
    method:"POST",cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({prospectId,website})});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok||!payload.layout)throw Error(payload.error||"Public website layout could not be inspected.");
   setUndoSite(site);
   patch(composeFounderProspectSite(site,prospect,payload.layout));
   setQuickPreview(true);setTab("design");
   setNotice("Modernized from the existing website's STRUCTURE ONLY. No photos, content or reviews were copied. Review and Save before sharing.");
  }catch(e){setNotice(e.message||"Could not modernize this website. You can still generate a fresh layout.")}
  finally{setBusy("")}
 }
 function undoQuickBuild(){
  if(!undoSite)return;
  setSite(undoSite);setUndoSite(null);setDirty(true);
  setNotice("Reverted the previous layout composition. Save when ready.");
 }

 function changeTemplate(theme){
  patch({template:theme.id,theme:theme.id,...theme.palette});
 }
 async function save(){
  if(!site||busy)return;
  setBusy("save");setNotice("");
  try{
   const j=await request({action:"save",site,revision});
   setSite({...j.site,demoId:j.id});setRevision(j.revision);setDirty(false);setUndoSite(null);
   await verifyPreview(j.id);
   setNotice("✓ Saved. "+j.site.name+" keeps its same preview link; you do not need to create another site.");
  }catch(e){setNotice(e.message)}finally{setBusy("")}
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
  if(dirty){setNotice("Save this draft first so the copied preview includes your latest changes.");return;}
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
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>navigateAway(onBack)} className="min-h-[44px] rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-bold">← Back to outreach</button>
      {onOpenSms&&<button type="button" onClick={()=>navigateAway(onOpenSms)} className="min-h-[44px] rounded-xl bg-[#b9e5fb] px-4 py-3 text-xs font-black text-[#153b51]">SMS this prospect ↗</button>}
     </div>
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
     <button type="button" disabled={previewStatus!=="ready"||dirty} onClick={copyLink} className="rounded-lg bg-white px-4 py-2.5 text-xs font-black text-[#163b53] disabled:opacity-50">Copy verified link</button>
     <button type="button" onClick={()=>verifyPreview(previewId)} className="rounded-lg border border-white/40 px-4 py-2.5 text-xs font-black">Recheck link</button>
     <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/35 px-4 py-2.5 text-xs font-black">Open client preview ↗</a>
    </div>
   </div>}
  </header>
  {notice&&<div role="status" className="rounded-xl border border-[#c5dfec] bg-[#f1faff] p-4 text-xs leading-6">
   <p>{notice}</p>
   {!site&&<p className="mt-3">The prospect's website has not been confirmed saved. Fix the Firebase connection first; don't send a potentially broken preview link.</p>}
   {!site&&<a href="/dashboard?open=sales&tab=demos" className="mt-3 inline-block rounded-xl border border-[#a3d2e7] bg-white px-4 py-3 text-xs font-black text-[#175471]">Open Firebase connection test in Demo Builder ↗</a>}
   {!site&&<button type="button" onClick={load} className="mt-3 ml-2 rounded-xl border bg-white px-4 py-3 text-xs font-bold">Retry loading prospect website</button>}
  </div>}
  {busy==="open"&&<div className="rounded-2xl bg-white p-8 text-sm">Loading or creating this prospect's saved website…</div>}
  {site&&<div className="space-y-5">
   <section className="rounded-[24px] border border-[#b3d7e9] bg-gradient-to-br from-[#edf9ff] to-white p-4 shadow-[0_14px_38px_rgba(25,74,107,.08)] sm:p-6" aria-label="Prospect one-click website factory">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
     <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#4385a7]">Founder / Prospect Website Factory</p>
     <h3 className="mt-2 text-xl font-black text-[#193e54]">Build a polished site for {prospect?.businessName||"this business"}</h3>
     <p className="mt-2 text-xs leading-6 text-[#668596]">Use saved business facts, your authorized image library and curated procedural blocks. Click to redesign, preview without AI, then save to the SAME prospect link.</p>
    </div><span className={"rounded-full px-3 py-2 text-[11px] font-black "+(dirty?"bg-amber-100 text-amber-800":"bg-emerald-100 text-emerald-800")}>{dirty?"Unsaved design":"Saved revision "+revision}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
     <button type="button" disabled={!!busy} onClick={generateDraft} className="min-h-[50px] rounded-xl bg-[#194d69] px-3 py-3 text-xs font-black text-white disabled:opacity-40">✦ Generate fresh site</button>
     <button type="button" disabled={!!busy||!prospect?.website} onClick={modernizeExisting} className="min-h-[50px] rounded-xl border border-[#9dcbdf] bg-white px-3 py-3 text-xs font-black text-[#205d79] disabled:opacity-40">{busy==="inspect"?"Inspecting…":"↗ Modernize existing"}</button>
     <button type="button" disabled={!!busy} onClick={randomizeDraft} className="min-h-[50px] rounded-xl border border-[#b9dbe8] bg-white px-3 py-3 text-xs font-black text-[#245572] disabled:opacity-40">↻ Try another design</button>
     <button type="button" disabled={!!busy||!dirty} onClick={save} className="min-h-[50px] rounded-xl bg-[#cae8f9] px-3 py-3 text-xs font-black text-[#154b6b] disabled:opacity-40">{busy==="save"?"Saving…":"✓ Save this version"}</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
     <button type="button" className={button} disabled={!undoSite||!!busy} onClick={undoQuickBuild}>↶ Undo layout</button>
     <button type="button" className={button} onClick={()=>setQuickPreview(x=>!x)}>{quickPreview?"Hide live preview":"Show live preview ↗"}</button>
     <button type="button" className={button} onClick={()=>setTab("data")}>Edit business facts ↗</button>
     <button type="button" className={button} onClick={()=>setTab("media")}>Choose approved photos ↗</button>
    </div>
    {prospect?.website&&<p className="mt-3 break-all text-[11px] leading-5 text-[#6f8d9f]">Existing website: {prospect.website} · Inspiration analyzes visual structure only; no third-party assets are imported.</p>}
    {quickPreview&&<div className="mt-5 rounded-2xl border border-[#bedce9] bg-[#e6f2f8] p-3 sm:p-5">
     <div className="mb-3 flex items-center justify-between gap-2"><strong className="text-xs">Live unsaved design preview</strong>
      <div className="flex rounded-xl border border-[#b4d5e7] bg-white p-1">
       {[["mobile","iPhone"],["desktop","Desktop"]].map(([id,label])=><button key={id} type="button" aria-pressed={previewDevice===id} onClick={()=>setPreviewDevice(id)}
        className={"rounded-lg px-3 py-2 text-xs font-bold "+(previewDevice===id?"bg-[#c3eaff] text-[#1c5b7a]":"text-[#6c8c9e]")}>{label}</button>)}
      </div>
     </div>
     <div className={"mx-auto overflow-hidden rounded-xl border border-[#d5e5ed] bg-white shadow-lg "+(previewDevice==="mobile"?"max-w-[390px]":"w-full")}>
      <iframe ref={quickFrame} title={"Live draft preview for "+site.name} src="/sites/preview-canvas" onLoad={()=>quickFrame.current?.contentWindow?.postMessage({type:"fugth:website-preview",site,page:"home"},window.location.origin)}
        className="block h-[610px] w-full border-0" loading="lazy"/>
     </div>
     <p className="mt-3 text-xs leading-5 text-[#637d8c]">This iframe shows edits before saving. The public prospect link updates only when you click Save.</p>
    </div>}
   </section>
   <nav role="tablist" aria-label="Prospect Site Maker tools" className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 sm:flex sm:flex-wrap sm:p-3">
    {tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}
     className={"rounded-xl px-4 py-3 text-xs font-black "+(tab===id?"bg-[#15516f] text-white":"border border-[#d4e6ef] bg-[#f1faff] text-[#205c7c]")}>{label}</button>)}
   </nav>
   {tab==="data"&&<div role="tabpanel" className="space-y-5">
    <FounderProspectBusinessHub key={prospectId} prospectId={prospectId} onUpdated={data=>{
     if(data.site){setSite({...data.site,demoId:previewId});setRevision(data.revision);setDirty(false);setUndoSite(null);}
     if(data.prospect)setProspect(p=>({...p,...data.prospect}));
     setNotice("Prospect data saved. Linked SMS/Email and website preview will use the new details.");
    }}/>
    <FounderSiteReferenceInspector prospectId={prospectId} website={prospect?.website||""} site={site} onChange={patch}/>
    <SiteSocialProofStudio site={site} onChange={patch} locked={false}/>
   </div>}
   {tab==="design"&&<div role="tabpanel" className="space-y-5">
    <SiteStudioBuilder site={site} uid={user.uid} locked={false} busy={busy}
     onChange={patch} onTemplate={changeTemplate} onSave={save}
     previewOnly={true} previewUrlOverride={previewUrl}/>
    <div className="rounded-2xl border border-[#cfdfeb] bg-white p-5">
     <p className="text-sm font-black">Keep editing this same preview</p>
     <p className="mt-2 text-xs leading-6 text-[#7b8fa0]">Your template selection, color slots, sections, services, reviews, photos, and approved content persist after you save. The prospect's assigned SMS/email link remains unchanged.</p>
     <button className={"mt-3 "+button} disabled={!!busy} onClick={save}>Save current preview design</button>
    </div>
   </div>}
   {tab==="ai"&&<div role="tabpanel"><FounderSiteEditChat key={previewId} site={site}
    prospect={prospect} onApplied={(updated,newRevision)=>{setSite({...updated,demoId:previewId});setRevision(newRevision);setDirty(false);setUndoSite(null);setNotice("✓ AI tool actions saved to the existing preview. Switch to Design editor to see the result.");}}/></div>}
   {tab==="media"&&<div role="tabpanel" className="space-y-4">
    <div className="rounded-2xl border border-[#cfe4ef] bg-[#edf7fc] p-5 text-xs leading-6">
     <strong className="text-sm">Use photos you have the rights to display</strong>
     <p className="mt-2">Upload JPG/PNG/WebP photos from your phone or computer, label them by business and subject, and group them into folders. Approved assets are stored in the existing FUGTH media storage; Firestore stores a searchable file index, tags and folder. Choosing Hero/Gallery attaches a photo to this prospect's saved design. Click Save when finished.</p>
     <p className="mt-2">Existing photos from a business's social media can be used only with its permission or a suitable license. A public post alone is not permission to republish.</p>
    </div>
    <SiteImageLibrary uid={user.uid} onPick={choosePhoto} industry={site.industry} folderHint={site.name}/>
   </div>}
  </div>}
 </section>;
}
