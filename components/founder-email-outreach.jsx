"use client";
import {useEffect,useMemo,useState} from "react";
import {collection,limit,onSnapshot,orderBy,query} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import FounderGgufWriter from "./founder-gguf-writer";
const cls="mt-2 w-full rounded-xl border border-[#c9dfeb] bg-white px-3 py-3 text-sm text-[#20455c]";
const btn="rounded-xl border border-[#c4dbe7] bg-white px-3 py-2.5 text-xs font-black text-[#215874] disabled:opacity-40";
const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x||"").trim());
const hasConsent=x=>x.marketingOptIn===true&&String(x.consentSource||"").trim().length>=8;
const suppressed=x=>x.doNotCall||x.status==="do_not_call"||x.unsubscribed||x.emailOptOut;
const siteUrl=x=>{try{const u=new URL(String(x||""));return u.protocol==="https:"?u.href:""}catch{return ""}};
const presetCatalog=[
 {id:"concept",name:"Independent website preview",needsLink:true,subject:"A website concept for {{business}}",
  body:"Hi {{contact}},\n\nI'm Pierre with FUGTH Management. I put together an independent sample website concept for {{business}} that might give you some ideas for your online presence.\n\nHere's the preview: {{site}}\n\nIt's an early concept, not a finished website. If the direction interests you, we can improve the design, photos and content based on your preferences. Would you be open to a short conversation?\n\nPierre\nFUGTH Management"},
 {id:"improvement",name:"Respectful website refresh",needsLink:true,subject:"An idea for {{business}}'s website",
  needsExisting:true,body:"Hi {{contact}},\n\nI'm Pierre with FUGTH Management. I came across {{business}}'s online presence and thought there might be an opportunity for a refreshed presentation. I'm not suggesting there is anything wrong with your current site.\n\nI have an independent design concept to share: {{site}}\n\nWould you like to take a look and tell me if it's useful?\n\nPierre\nFUGTH Management"},
 {id:"claim",name:"Preview & website claim",needsDemo:true,needsLink:true,subject:"Your independent {{business}} website preview",
  body:"Hi {{contact}},\n\nI'm Pierre with FUGTH Management. I prepared an independent sample website concept for {{business}}:\n{{site}}\n\nIf you'd like to work with this design, you can create an account with Google or email and request verified ownership here: {{claim}}. There's no obligation to publish it. We'll ask what you would like changed before finalizing anything.\n\nInterested in a walkthrough?\n\nPierre\nFUGTH Management"},
 {id:"appointment",name:"Book a no-account consultation",subject:"An easy time to talk about {{business}}",
  body:"Hi {{contact}},\n\nI'm Pierre from FUGTH Management. If you'd like to discuss a website concept or your business phone coverage, you can book an available 30-minute conversation without creating an account:\n{{booking}}\n\nIf you have questions first, feel free to reply.\n\nPierre\nFUGTH Management"},
 {id:"follow_up",name:"After a real conversation",needsConversation:true,needsLink:true,subject:"Following up on our {{business}} conversation",
  body:"Hi {{contact}},\n\nThanks for taking the time to speak with me. Here's the FUGTH website concept related to {{business}}:\n{{site}}\n\nYou can book a follow-up directly if helpful: {{booking}}\n\nPierre\nFUGTH Management"},
 {id:"referral",name:"Real referral introduction",needsReferral:true,needsLink:true,subject:"A quick introduction via {{referrer}}",
  body:"Hi {{contact}},\n\nI'm Pierre from FUGTH Management. {{referrer}} suggested I reach out about {{business}}. I put together an independent website preview you may be interested in:\n{{site}}\n\nWould you like to see a quick walkthrough?\n\nPierre\nFUGTH Management"},
 {id:"custom",name:"Your own email",subject:"A quick idea for {{business}}",body:"Hi {{contact}},\n\n"}
];
const expand=(source,p,values)=>String(source||"").replace(/\{\{(contact|business|site|booking|claim|referrer|address)\}\}/g,(_,key)=>({
 contact:p?.ownerName||"there",business:p?.businessName||"your business",
 site:values.site||"[preview link not assigned]",booking:"https://www.fugthmanagement.space/book",
 claim:values.claim||"[choose a claimable demo]",referrer:values.referrer||"[genuine referrer]",address:values.address
})[key]).slice(0,5500);
async function copy(s){if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable. Select and copy manually.");await navigator.clipboard.writeText(s)}
export default function FounderEmailOutreach({user,initialProspectId="",onOpenMarketing,onOpenSiteMaker}){
 const [all,setAll]=useState([]),[search,setSearch]=useState(""),[selected,setSelected]=useState([]),
  [activeId,setActiveId]=useState(initialProspectId),[preset,setPreset]=useState("concept"),
  [subject,setSubject]=useState(presetCatalog[0].subject),[body,setBody]=useState(presetCatalog[0].body),
  [mailingAddress,setMailingAddress]=useState(""),[referrer,setReferrer]=useState(""),
  [verifiedReferral,setVerifiedReferral]=useState(false),[verifiedConversation,setVerifiedConversation]=useState(false),
  [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[connection,setConnection]=useState(null),[showGguf,setShowGguf]=useState(false);
 useEffect(()=>{if(initialProspectId){setActiveId(initialProspectId);setSelected(x=>x.includes(initialProspectId)?x:[initialProspectId,...x])}},[initialProspectId]);
 useEffect(()=>{
  if(!db||!user?.uid)return;
  return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1200)),
   snap=>setAll(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.type==="cold_call_prospect")),
   ()=>setMessage("Could not load your saved prospect emails."));
 },[user?.uid]);
 useEffect(()=>{
  auth.currentUser?.getIdToken().then(token=>fetch("/api/marketing/send",{headers:{Authorization:"Bearer "+token}})
   .then(r=>r.json()).then(setConnection)).catch(()=>{});
 },[]);
 const rows=useMemo(()=>all.filter(x=>[x.businessName,x.ownerName,x.email,x.industry,x.city].join(" ").toLowerCase().includes(search.toLowerCase())).slice(0,700),[all,search]);
 const current=all.find(x=>x.id===activeId)||null;
 const currentIndex=selected.indexOf(activeId);
 const chosen=all.filter(x=>selected.includes(x.id));
 const consented=chosen.filter(x=>validEmail(x.email)&&hasConsent(x)&&!suppressed(x));
 const canCompose=Boolean(current&&validEmail(current.email)&&!suppressed(current)&&mailingAddress.trim().length>=10&&mailingAddress.trim().length<=230);
 const style=presetCatalog.find(x=>x.id===preset)||presetCatalog[0];
 const linkedSite=siteUrl(current?.websitePreviewUrl||current?.assignedSiteUrl);
 const demoId=String(current?.assignedPreviewId||"");
 const claimLink=/^[a-f0-9]{24}$/.test(demoId)?"https://www.fugthmanagement.space/claim/"+demoId:"";
 const existsWebsite=Boolean(siteUrl(current?.website));
 const styleAllowed=(!style.needsLink||Boolean(linkedSite))&&(!style.needsDemo||Boolean(claimLink))&&(!style.needsExisting||existsWebsite)&&
  (!style.needsReferral||(verifiedReferral&&referrer.trim().length>=2))&&(!style.needsConversation||verifiedConversation);
 const interpolatedSubject=expand(subject,current,{site:linkedSite,claim:claimLink,referrer,address:mailingAddress});
 const interpolatedBody=expand(body,current,{site:linkedSite,claim:claimLink,referrer,address:mailingAddress});
 const finalBody=interpolatedBody+"\n\n— FUGTH Chat LLC\n"+mailingAddress.trim()+"\nTo stop promotional emails, reply UNSUBSCRIBE.";
 const totalEmail=all.filter(x=>validEmail(x.email)).length;
 function choosePreset(id){const p=presetCatalog.find(x=>x.id===id)||presetCatalog[0];setPreset(id);setSubject(p.subject);setBody(p.body);setVerifiedConversation(false);setVerifiedReferral(false);}
 function toggle(id){setSelected(x=>x.includes(id)?x.filter(t=>t!==id):[...x,id].slice(0,100));setActiveId(id);setMessage("")}
 function selectVisible(){const ids=rows.filter(x=>validEmail(x.email)&&!suppressed(x)).slice(0,100).map(x=>x.id);
  setSelected(x=>ids.every(id=>x.includes(id))?[]:ids);if(ids.length&&!activeId)setActiveId(ids[0]);}
 function step(delta){if(!selected.length)return;const next=selected[(Math.max(0,currentIndex)+delta+selected.length)%selected.length];setActiveId(next)}
 async function copyPart(value,label){try{await copy(value);setMessage(label+" copied. You can return to copy the next part.")}catch(e){setMessage(e.message)}}
 function openMail(provider){
  if(!canCompose||!styleAllowed)return;
  if(provider==="gmail"){
   const url="https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(current.email)+
    "&su="+encodeURIComponent(interpolatedSubject)+"&body="+encodeURIComponent(finalBody);
   window.open(url,"_blank","noopener,noreferrer");
  }else{
   window.location.href="mailto:"+encodeURIComponent(current.email)+"?subject="+encodeURIComponent(interpolatedSubject)+"&body="+encodeURIComponent(finalBody);
  }
  setMessage("Opened an individual email draft. Review the recipient, wording and opt-out instructions before sending. No email has been sent by FUGTH.");
 }
 async function syncToMarketing(){
  if(!consented.length)return setMessage("Select at least one prospect with documented email marketing consent.");
  setBusy(true);setMessage("");
  try{
   const token=await auth.currentUser?.getIdToken();
   const r=await fetch("/api/dev/prospect-email-sync",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({action:"sync_opted_in",prospectIds:consented.slice(0,50).map(x=>x.id)})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Could not sync the marketing list.");
   setMessage(j.synced+" opted-in contacts copied into Marketing CRM. "+j.noOptIn+" unconsented, "+
    j.optedOut+" suppressed and "+j.missingEmail+" missing addresses skipped. Nothing was sent. Open Marketing to create a campaign.");
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 async function createTargetedCampaign(){
  if(!consented.length)return setMessage("Select consented prospects before preparing a campaign.");
  if(!["concept","improvement","appointment","custom"].includes(preset))
   return setMessage("Use the general website, improvement, appointment, or one-recipient custom preset for a targeted campaign. Referral/follow-up copy needs individual verification.");
  if(preset==="custom"&&consented.length>1)
   return setMessage("Custom or GGUF-written email is personalized to one business. Select only that business for a custom campaign.");
  if(mailingAddress.trim().length<10)return setMessage("Add your real mailing address before preparing a commercial email campaign.");
  if(!window.confirm("Create a DRAFT for the "+consented.length+" selected opted-in business emails? NO messages will be sent until you approve the campaign in Marketing."))return;
  setBusy(true);setMessage("");
  try{
   const token=await auth.currentUser?.getIdToken();
   const r=await fetch("/api/dev/prospect-email-sync",{method:"POST",
    headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({action:"create_campaign",prospectIds:consented.slice(0,50).map(p=>p.id),preset,
     subject,message:body,mailingAddress:mailingAddress.trim()})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Could not prepare selected campaign.");
   setMessage("Targeted email campaign saved: "+j.synced+" verified opted-in recipients. "+
    "Nothing sent yet. Open Marketing to review and explicitly send the next 10 through Gmail.");
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 return <section className="space-y-5 text-[#20455c]">
  <header className="rounded-[26px] bg-[#142e42] p-6 text-white sm:p-8">
   <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a4dcf8]">FUGTH / EMAIL OUTREACH</p>
   <h3 className="mt-3 text-3xl font-black">Business email outreach, ready to personalize.</h3>
   <p className="mt-3 text-xs leading-6 text-[#bbd9e7]">Use your saved prospect emails, select recipients, edit a professional message, copy or open Gmail. Approved contacts can be moved into your existing consent-based sending campaign.</p>
   <p className="mt-4 text-xs font-bold text-[#a4ddf7]">{totalEmail} prospects with email · {consented.length} selected with verified opt-in · Gmail API: {connection?.connected?"Connected":"Not connected"}</p>
  </header>
  {message&&<p role="status" className="rounded-xl border border-[#cbe2f0] bg-[#eef8fc] p-4 text-xs leading-6">{message}</p>}
  <div className="grid items-start gap-5 lg:grid-cols-[.95fr_1.05fr]">
   <div className="rounded-2xl border border-[#d8e7f0] bg-white p-5">
    <p className="text-[10px] font-black uppercase text-[#709cb5]">1 / SELECT RECIPIENTS FROM FIRESTORE</p>
    <input className={cls} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search business, contact or email"/>
    <div className="mt-3 flex flex-wrap justify-between gap-2"><button className={btn} onClick={selectVisible}>Select/deselect visible prospects</button><button className={btn} onClick={()=>setSelected([])}>Clear selection</button></div>
    <p className="mt-2 text-[11px] text-[#7390a0]">Showing {rows.length} prospects · {selected.length} selected. Addresses come from your imported or saved prospect records.</p>
    <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto">
     {rows.map(p=><label key={p.id} className={"flex cursor-pointer items-start gap-3 rounded-xl border p-3 "+(activeId===p.id?"border-[#4695bf] bg-[#f0faff]":"border-[#e1ebf1]")}>
      <input type="checkbox" className="mt-1" checked={selected.includes(p.id)} disabled={!validEmail(p.email)||suppressed(p)} onChange={()=>toggle(p.id)}/>
      <span className="min-w-0 flex-1"><strong className="block text-xs">{p.businessName}</strong><span className="mt-1 block truncate text-[11px] text-[#6c8ea1]">{p.email||"No email collected"}</span>
      <span className={"mt-1 block text-[10px] "+(suppressed(p)?"text-rose-800":hasConsent(p)?"text-emerald-700":"text-amber-700")}>{suppressed(p)?"Do not contact":hasConsent(p)?"Verified marketing opt-in":"Manual draft only · no bulk marketing opt-in"}</span></span>
      <button type="button" onClick={e=>{e.preventDefault();setActiveId(p.id)}} className="text-[11px] font-bold text-[#217fac]">Edit ↗</button>
     </label>)}
     {!rows.length&&<p className="py-6 text-center text-xs">No emails found. Import a CSV/JSON with an email column or add an email to an existing prospect.</p>}
    </div>
    <div className="mt-4 rounded-xl bg-[#eff8fe] p-4 text-xs">
     <strong>Selected queue: {selected.length}</strong>
     <div className="mt-3 flex gap-2"><button disabled={!selected.length} className={btn} onClick={()=>step(-1)}>← Previous</button><button disabled={!selected.length} className={btn} onClick={()=>step(1)}>Next →</button></div>
     <p className="mt-2 text-[#69899c]">Each business gets its own name, email and saved site link. Only the selected person opens in the mail app.</p>
    </div>
   </div>
   <div className="rounded-2xl border border-[#d8e7f0] bg-white p-5">
    <p className="text-[10px] font-black uppercase text-[#709cb5]">2 / MESSAGE BUILDER</p>
    {current?<div className="mt-3 rounded-xl bg-[#f0f8fe] p-3 text-xs">
     <strong>{current.businessName}</strong><p className="mt-1 break-all text-[#5b8198]">{current.email||"Missing email"} · Preview: {linkedSite||"not assigned"}</p>
     {onOpenSiteMaker&&<button type="button" className="mt-3 rounded-xl bg-[#1b5b80] px-4 py-3 text-xs font-black text-white" onClick={()=>onOpenSiteMaker(current)}>✦ Customize {current.businessName}'s saved website ↗</button>}
    </div>:<p className="mt-3 text-xs text-[#7394a4]">Select a prospect from the list to fill the recipient automatically.</p>}
    <label className="mt-4 block text-xs font-black">Preset email<select className={cls} value={preset} onChange={e=>choosePreset(e.target.value)}>
     {presetCatalog.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select></label>
    {style.needsReferral&&<div className="mt-3 rounded-xl bg-amber-50 p-3">
     <input className={cls} value={referrer} onChange={e=>setReferrer(e.target.value)} placeholder="True referrer's name"/>
     <label className="mt-2 flex gap-2 text-xs"><input type="checkbox" checked={verifiedReferral} onChange={e=>setVerifiedReferral(e.target.checked)}/> I personally verify this referral is real.</label>
    </div>}
    {style.needsConversation&&<label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={verifiedConversation} onChange={e=>setVerifiedConversation(e.target.checked)}/> I confirm a previous conversation took place.</label>}
    {style.needsLink&&!linkedSite&&<p className="mt-2 text-xs text-amber-800">Assign a real FUGTH website preview to this prospect before preparing a link-based email.</p>}
    {style.needsDemo&&!claimLink&&<p className="mt-2 text-xs text-amber-800">Assign a saved claimable demo to this prospect to use this preset.</p>}
    {style.needsExisting&&!existsWebsite&&<p className="mt-2 text-xs text-amber-800">This email refers to their existing website, but no website was saved on this prospect.</p>}
    <label className="mt-4 block text-xs font-black">To<input className={cls} value={current?.email||""} readOnly placeholder="Select prospect"/></label>
    <label className="mt-4 block text-xs font-black">Subject<input className={cls} value={subject} maxLength={140} onChange={e=>setSubject(e.target.value)}/></label>
    <label className="mt-4 block text-xs font-black">Message body<textarea rows={9} className={cls} value={body} maxLength={5000} onChange={e=>setBody(e.target.value)}/></label>
    <p className="mt-2 text-[11px] leading-5 text-[#8aa0ae]">Tokens: {"{{contact}}"}, {"{{business}}"}, {"{{site}}"}, {"{{claim}}"}, {"{{booking}}"}, {"{{referrer}}"}. Review claims manually.</p>
    <label className="mt-4 block text-xs font-black">Your real commercial mailing address (required)
     <textarea rows={2} className={cls} value={mailingAddress} maxLength={230} onChange={e=>setMailingAddress(e.target.value)} placeholder="Valid street/PO Box address, city, state and ZIP"/></label>
    <div className="mt-4 rounded-xl bg-[#f2f9fd] p-4 text-xs">
     <strong>Live personalized draft</strong><p className="mt-2 font-bold">Subject: {interpolatedSubject}</p>
     <p className="mt-2 whitespace-pre-wrap break-words leading-6">{finalBody}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
     <button disabled={!current?.email||suppressed(current)} className={btn} onClick={()=>copyPart(current.email,"Email address")}>Copy email</button>
     <button disabled={!canCompose||!styleAllowed} className={btn} onClick={()=>copyPart(interpolatedSubject,"Subject")}>Copy subject</button>
     <button disabled={!canCompose||!styleAllowed} className={btn} onClick={()=>copyPart(finalBody,"Body")}>Copy body</button>
     <button disabled={!canCompose||!styleAllowed} className={btn} onClick={()=>copyPart("To: "+current.email+"\nSubject: "+interpolatedSubject+"\n\n"+finalBody,"Full draft")}>Copy full draft</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
     <button disabled={!canCompose||!styleAllowed} className="rounded-xl bg-[#1e5977] px-4 py-3 text-xs font-black text-white disabled:opacity-40" onClick={()=>openMail("gmail")}>Open Gmail compose ↗</button>
     <button disabled={!canCompose||!styleAllowed} className={btn} onClick={()=>openMail("mailto")}>Open email app ↗</button>
    </div>
   </div>
  </div>
  <section className="rounded-[24px] border border-[#d0e3ef] bg-white p-5">
   <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#709cb5]">3 / EXISTING EMAIL API & MARKETING DELIVERY</p>
   <h4 className="mt-2 text-xl font-black">Send reviewed, opted-in email batches through Gmail</h4>
   <p className="mt-2 text-xs leading-6 text-[#6e8c9e]">Your existing FUGTH backend supports Gmail OAuth sending, capped at 10 per batch and 50 daily, with unsubscribe handling. Create a campaign draft limited to exactly the selected opted-in businesses, then explicitly approve sends under Marketing.</p>
   <div className="mt-4 flex flex-wrap gap-2">
    <button disabled={!consented.length||busy} className="rounded-xl bg-[#1c6252] px-4 py-3 text-xs font-black text-white disabled:opacity-40" onClick={createTargetedCampaign}>{busy?"Preparing…":"Create targeted Gmail campaign draft ("+consented.length+")"}</button>
    <button disabled={!consented.length||busy} className={btn} onClick={syncToMarketing}>Copy opted-in contacts to CRM</button>
    {onOpenMarketing&&<button className={btn} onClick={onOpenMarketing}>Review & send in Marketing ↗</button>}
   </div>
   <p className="mt-3 text-[11px] leading-6 text-[#859caa]">No Gmail connected? Open Marketing and authorize the separate Gmail sending scope. Imported addresses do not imply permission to bulk email. Only explicitly selected, documented opt-in contacts are eligible, and every campaign requires manual send confirmation and your real postal address.</p>
  </section>
  <section className="rounded-[24px] border border-[#d4e6ef] bg-white p-4">
   <button className="w-full rounded-xl bg-[#e8f6fc] px-4 py-3 text-left text-xs font-black text-[#1f617e]" onClick={()=>setShowGguf(x=>!x)}>{showGguf?"Hide":"Open"} GGUF AI email writer & website audit ↗</button>
   {showGguf&&<div className="mt-4"><FounderGgufWriter user={user} mode="email" selectedProspectId={activeId}
    onDraft={v=>{setActiveId(v.prospectId);setPreset("custom");setSubject(v.subject||"A quick idea for your website");setBody(v.text);setMessage("GGUF email loaded into the editable composer. Check the claims, recipient and commercial footer before sending.");}}/></div>}
  </section>
 </section>;
}
