"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {collection,doc,limit,onSnapshot,orderBy,query,serverTimestamp,updateDoc} from "firebase/firestore";
import {auth,db} from "../lib/firebase";

const ROOT="https://www.fugthmanagement.space";
const VOICE="https://voice.google.com/u/0/messages";
const field="mt-2 w-full rounded-xl border border-[#c9dfeb] bg-white px-3 py-3 text-sm text-[#20455c] outline-none focus:border-[#448eaf]";
const btn="rounded-xl border border-[#c4dbe7] bg-white px-4 py-3 text-xs font-black text-[#215874] disabled:opacity-40";
const PRESETS=[
 {id:"preview",label:"Website preview (after requested)",needsLink:true,text:"Hi {{contact}}, this is Pierre with FUGTH Management. As requested, here is the website preview for {{business}}: {{link}}. Let me know what you think or if you'd like a quick walkthrough."},
 {id:"followup",label:"Follow-up after conversation",text:"Hi {{contact}}, this is Pierre from FUGTH Management. Following up on our conversation about {{business}}. Let me know if you'd like to discuss the website or call-handling tools. {{link}}"},
 {id:"invite",label:"Ask about a demo",text:"Hi {{contact}}, Pierre here with FUGTH Management. Would you still be interested in a short walkthrough of the website and AI receptionist options for {{business}}? {{link}}"},
 {id:"checkin",label:"Friendly check-in",text:"Hi {{contact}}, this is Pierre with FUGTH Management. Just checking in about {{business}}. Is there anything you'd like me to clarify?"},
 {id:"custom",label:"Custom message",text:"Hi {{contact}}, "}
];
const trimmed=x=>String(x??"").trim();
const numbers=x=>trimmed(x).replace(/\D/g,"");
const e164=x=>{const d=numbers(x);return d.length===10?"+1"+d:d.length===11&&d.startsWith("1")?"+"+d:null;};
const lower=x=>trimmed(x).toLocaleLowerCase();
function validLink(input){
 try{
  const u=new URL(trimmed(input));
  return u.protocol==="https:"&&!u.username&&!u.password&&!["localhost","127.0.0.1"].includes(u.hostname)?u.toString():"";
 }catch{return "";}
}
const nowValid=d=>!d.revoked&&(!d.expiresAt||Date.parse(d.expiresAt)>Date.now());
const demoLink=d=>validLink(ROOT+"/demo/site/"+encodeURIComponent(d.id));
function expand(template,p,link){
 const replacements={contact:trimmed(p.ownerName)||"there",business:trimmed(p.businessName)||"your business",link:link||"",sender:"Pierre"};
 return String(template).replace(/\{\{(contact|business|link|sender)\}\}/g,(_,k)=>replacements[k])
  .replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").replace(/[ \t]{2,}/g," ").trim().slice(0,1300);
}
async function clipboard(text){
 if(!navigator.clipboard?.writeText)throw Error("Clipboard permission unavailable. Select the text and copy it manually.");
 await navigator.clipboard.writeText(text);
}

export default function FounderTextDesk({user,initialProspectId=""}){
 const [all,setAll]=useState([]),[demos,setDemos]=useState([]),[demosError,setDemosError]=useState("");
 const [publishedSites,setPublishedSites]=useState([]),[siteSearch,setSiteSearch]=useState(""),[siteError,setSiteError]=useState("");
 const [prospectId,setProspectId]=useState(initialProspectId),[filter,setFilter]=useState("");
 const [chosenDemo,setChosenDemo]=useState(""),[preset,setPreset]=useState("preview"),[editor,setEditor]=useState(PRESETS[0].text);
 const [consentSource,setConsentSource]=useState(""),[approved,setApproved]=useState(false);
 const [saving,setSaving]=useState(false),[info,setInfo]=useState(""),[showLinkPicker,setShowLinkPicker]=useState(false);
 useEffect(()=>{if(initialProspectId)setProspectId(initialProspectId)},[initialProspectId]);
 useEffect(()=>{if(!db||!user?.uid)return;
  return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1200)),
   snapshot=>setAll(snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.type==="cold_call_prospect")),
   err=>setInfo("Could not read prospects: "+(err.message||"Firestore error")));
 },[user?.uid]);
 const refreshDemos=useCallback(async()=>{
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Please sign in again.");
   const res=await fetch("/api/dev/prospect-demos",{cache:"no-store",headers:{"Authorization":"Bearer "+token}});
   const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"Could not load site previews.");
   setDemos((data.demos||[]).filter(nowValid));setDemosError("");
  }catch(e){setDemosError(e.message||"Saved demo lookup unavailable. Existing assigned links still work.");}
 },[]);
 useEffect(()=>{refreshDemos()},[refreshDemos]);
 const refreshPublished=useCallback(async()=>{
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
   let after="",pages=0,items=[];
   do{
    const res=await fetch("/api/dev/outreach-sites"+(after?"?after="+encodeURIComponent(after):""),{
     cache:"no-store",headers:{"Authorization":"Bearer "+token}});
    const j=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(j.error||"Could not load published websites.");
    items.push(...(j.sites||[]));after=j.nextCursor||"";pages++;
   }while(after&&pages<4);
   setPublishedSites(items);setSiteError("");
  }catch(e){setSiteError(e.message||"Published site directory unavailable.");}
 },[]);
 useEffect(()=>{refreshPublished()},[refreshPublished]);

 const prospect=all.find(p=>p.id===prospectId)||null;
 const matching=useMemo(()=>all.filter(p=>[p.businessName,p.ownerName,p.phone,p.industry].join(" ").toLowerCase().includes(filter.toLowerCase())).slice(0,400),[all,filter]);
 const assignedLink=prospect?validLink(prospect.websitePreviewUrl||prospect.assignedSiteUrl||""):"";
 const assignedId=trimmed(prospect?.assignedPreviewId||prospect?.sitePreviewId);
 const assignedDemo=demos.find(d=>d.id===assignedId);
 const matchedDemo=demos.filter(d=>d.prospectId===prospect?.id|| (d.assignedUid&&prospect?.customerUid&&d.assignedUid===prospect.customerUid));
 const phoneMatches=demos.filter(d=>e164(d.phone)&&e164(d.phone)===e164(prospect?.phone));
 // Phone match is a suggestion only; never auto-assign links by business name.
 const chosenSite=chosenDemo.startsWith("site:")?publishedSites.find(d=>d.id===chosenDemo.slice(5)):null;
 const chosenDemoObject=chosenDemo.startsWith("demo:")?demos.find(d=>d.id===chosenDemo.slice(5)):null;
 const resolved=chosenDemo?(chosenSite?validLink(chosenSite.url):chosenDemoObject?demoLink(chosenDemoObject):""):assignedLink;
 const expired=Boolean(prospect?.assignedPreviewExpiresAt)&&Date.parse(prospect.assignedPreviewExpiresAt)<=Date.now();
 const revokedDemo=assignedId&&demos.length>0&&!assignedDemo;
 const link=(expired||revokedDemo)&&!chosenDemo?"":resolved;
 const composed=prospect?expand(editor,prospect,link):"";
 const optedIn=Boolean(prospect?.phoneMarketingOptIn===true&&trimmed(prospect?.consentSource).length>=5);
 const optedSource=trimmed(prospect?.consentSource);
 const suppressed=Boolean(prospect?.doNotCall===true||prospect?.status==="do_not_call"||prospect?.unsubscribed===true||prospect?.smsOptOut===true);
 const validPhone=e164(prospect?.phone);
 const needsLink=Boolean(PRESETS.find(x=>x.id===preset)?.needsLink);
 const canPrepare=Boolean(prospect&&!suppressed&&validPhone&&optedIn&&composed.length>=10&&(!needsLink||link));
 useEffect(()=>{setChosenDemo("");setConsentSource(trimmed(prospect?.consentSource));setApproved(false);setInfo("");},[prospectId]);
 function changePreset(value){setPreset(value);setEditor(PRESETS.find(x=>x.id===value)?.text||"");setInfo("");}
 function chooseDemo(value){
  setChosenDemo(value);setInfo("");
 }
 async function saveAssignment(){
  if(!prospect||!chosenDemo||!user?.uid)return;
  const chosen=chosenSite||chosenDemoObject;
  if(!chosen)return setInfo("Choose an active demo or published website to assign.");
  setSaving(true);
  try{
   await updateDoc(doc(db,"users",user.uid,"campaigns",prospect.id),{
    websitePreviewUrl:chosenSite?validLink(chosenSite.url):demoLink(chosen),
    assignedPreviewId:chosenSite?"":chosen.id,assignedSiteOwnerUid:chosenSite?chosen.id:"",
    assignedPreviewExpiresAt:chosenSite?"":chosen.expiresAt||"",
    assignedPreviewName:chosen.name||"",updatedAt:serverTimestamp()
   });
   setInfo("Assigned this preview to the selected prospect. It will fill automatically next time.");
  }catch(e){setInfo("Could not assign preview: "+(e.message||"check Firestore access"))}
  finally{setSaving(false);}
 }
 async function saveConsent(){
  if(!prospect||suppressed)return;
  if(!approved||trimmed(consentSource).length<8)return setInfo("Confirm actual SMS permission and describe when/how it was obtained (at least 8 characters).");
  setSaving(true);
  try{
   await updateDoc(doc(db,"users",user.uid,"campaigns",prospect.id),{
    phoneMarketingOptIn:true,consentSource:trimmed(consentSource).slice(0,300),
    smsConsentRecordedAt:serverTimestamp(),updatedAt:serverTimestamp()
   });
   setInfo("Consent information saved to this prospect. Verify the source is accurate before texting.");
  }catch(e){setInfo("Couldn't save consent: "+(e.message||"Firestore error"))}
  finally{setSaving(false);}
 }
 async function copyPhone(){
  if(!validPhone||suppressed)return;
  try{await clipboard(validPhone);setInfo("Recipient number copied. Paste it into Google Voice.");}
  catch(e){setInfo(e.message);}
 }
 async function copyText(){
  if(!canPrepare)return;
  try{await clipboard(composed);setInfo("Message copied. Paste it into your chosen messaging app. No SMS has been sent.");}
  catch(e){setInfo(e.message);}
 }
 async function openVoice(){
  if(!canPrepare)return;
  // Open before asynchronous clipboard access, preventing pop-up blockers on phones.
  const opened=window.open(VOICE,"_blank","noopener,noreferrer");
  try{await clipboard(composed);setInfo("Text copied. In Google Voice, create a message, enter "+validPhone+", and paste the text. Nothing was automatically sent."+(opened?"":" If a new tab didn't open, use Open Google Voice below."));}
  catch(e){setInfo("Google Voice opened, but clipboard failed: "+e.message+". Copy the text manually.");}
 }
 function openNativeSms(){
  if(!canPrepare)return;
  window.location.href="sms:"+validPhone+"?body="+encodeURIComponent(composed);
  setInfo("Your phone's SMS app may open with the message. Review the destination and message before tapping Send.");
 }
 return <section className="space-y-5 text-[#234458]">
  <div className="rounded-[26px] bg-[#123147] p-6 text-white sm:p-8">
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a1dafa]">FUGTH / MANUAL MESSAGE WORKBENCH</p>
   <h3 className="mt-3 text-3xl font-black tracking-[-.05em]">Text a prospect with their website preview.</h3>
   <p className="mt-3 max-w-3xl text-xs leading-6 text-[#c6dfed]">Select one prospect, choose a saved preview and a preset, edit the message, then copy it into Google Voice. You control the final send. No bulk messages or automated Google Voice interactions.</p>
  </div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
   <section className="rounded-2xl border border-[#d5e7f1] bg-white p-5">
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#729bb1]">1 / RECIPIENT</p>
    <label className="mt-4 block text-xs font-black">Search your saved prospects
     <input className={field} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Name, owner or phone"/>
    </label>
    <label className="mt-4 block text-xs font-black">Prospect
     <select className={field} value={prospectId} onChange={e=>setProspectId(e.target.value)}>
      <option value="">Select a saved prospect</option>
      {matching.map(p=><option value={p.id} key={p.id}>{p.businessName} · {p.phone||"No number"}</option>)}
      {prospect&&!matching.some(p=>p.id===prospectId)&&<option value={prospect.id}>{prospect.businessName} · {prospect.phone}</option>}
     </select>
    </label>
    {prospect?<div className="mt-4 rounded-xl bg-[#f1f9fc] p-4">
     <p className="text-base font-black">{prospect.businessName}</p>
     <p className="mt-1 text-xs text-[#65889c]">{prospect.industry||"Business"} · {prospect.ownerName||"Contact unknown"}</p>
     <p className="mt-3 font-mono text-sm">{prospect.phone||"No number saved"}</p>
     <button className={"mt-3 "+btn} disabled={!validPhone||suppressed} onClick={copyPhone}>Copy number</button>
     {suppressed&&<p className="mt-2 rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-800">Do not contact / opted out — texting is disabled for this prospect.</p>}
    </div>:<p className="mt-4 text-xs text-[#7b97a5]">Choose an existing prospect or add one in Prospects & Calls.</p>}
    <div className="mt-5 border-t border-[#e4edf2] pt-4">
     <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black">Assigned website preview</p><button className="text-xs font-bold text-[#2681ac]" onClick={()=>setShowLinkPicker(v=>!v)}>{showLinkPicker?"Hide site list":"Choose another saved site"}</button></div>
     <p className="mt-2 break-all text-xs text-[#557b91]">{link||"No valid assigned link yet"}</p>
     {(expired||revokedDemo)&&<p className="mt-2 text-xs text-amber-800">The previously assigned preview may have expired or been revoked. Choose a current preview.</p>}
     {matchedDemo.length>0&&<p className="mt-2 text-[11px] text-[#537e92]">Linked to this prospect: {matchedDemo.map(d=>d.name).join(", ")}. Select it below to use it.</p>}
     {!matchedDemo.length&&phoneMatches.length>0&&<p className="mt-2 text-[11px] text-[#537e92]">Some saved previews have this phone number. Verify the business before assigning one.</p>}
     {(showLinkPicker||!link)&&<div className="mt-3">
      <label className="block text-xs font-bold">Search saved sites
       <input className={field} value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} placeholder="Search business name / industry"/>
      </label>
      <label className="mt-3 block text-xs font-bold">Saved demos and published FUGTH sites
       <select className={field} value={chosenDemo} onChange={e=>chooseDemo(e.target.value)}>
        <option value="">Use prospect's assigned link</option>
        {demos.filter(d=>[d.name,d.kind].join(" ").toLowerCase().includes(siteSearch.toLowerCase())).map(d=><option key={"demo:"+d.id} value={"demo:"+d.id}>{d.name} · Demo preview {d.prospectId===prospectId?"(linked)":""}</option>)}
        {publishedSites.filter(d=>[d.name,d.industry].join(" ").toLowerCase().includes(siteSearch.toLowerCase())).map(d=><option key={"site:"+d.id} value={"site:"+d.id}>{d.name} · Published FUGTH website</option>)}
       </select>
      </label>
      <button className={"mt-3 "+btn} onClick={()=>{refreshDemos();refreshPublished();}}>Refresh saved sites</button>
      <button className={"mt-3 ml-2 "+btn} disabled={!prospect||!chosenDemo||saving} onClick={saveAssignment}>Save site to prospect</button>
      {demosError&&<p className="mt-2 text-[11px] text-amber-800">{demosError}</p>}
      {siteError&&<p className="mt-2 text-[11px] text-amber-800">{siteError}</p>}
     </div>}
     {link&&<a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block break-all text-xs font-bold text-[#287fa7] underline">Preview selected website ↗</a>}
    </div>
   </section>
   <section className="rounded-2xl border border-[#d5e7f1] bg-white p-5">
    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#729bb1]">2 / MESSAGE</p>
    <label className="mt-4 block text-xs font-black">Text presets
     <select className={field} value={preset} onChange={e=>changePreset(e.target.value)}>{PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>
    </label>
    <label className="mt-4 block text-xs font-black">Edit the message (personalization uses the selected prospect and site)
     <textarea rows={6} maxLength={1300} className={field+" min-h-[170px]"} value={editor} onChange={e=>setEditor(e.target.value)}/>
    </label>
    <p className="mt-2 text-[11px] text-[#7a94a5]">Available tokens: {"{{contact}}"}, {"{{business}}"}, {"{{link}}"}, {"{{sender}}"}.</p>
    <div className="mt-4 rounded-xl bg-[#edf7fc] p-4"><p className="text-[10px] font-black uppercase text-[#648fa7]">Live personalized preview</p>
     <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{composed||"Choose a prospect to preview their customized text."}</p></div>
    {needsLink&&!link&&<p className="mt-3 text-xs font-bold text-amber-800">This preset needs a real, active website preview. Select a site before preparing the text.</p>}
    <div className="mt-4 rounded-xl border border-[#e5ead9] bg-[#fcfcf5] p-4">
     <strong className="text-xs">SMS permission</strong>
     {optedIn?<p className="mt-2 text-xs text-emerald-800">Consent recorded: {optedSource}</p>:<p className="mt-2 text-xs text-amber-800">No documented SMS opt-in recorded. Drafting is available, but preparing the outgoing message is disabled until permission is recorded.</p>}
     {!optedIn&&!suppressed&&prospect&&<>
      <label className="mt-3 block text-xs">How did this contact give permission to receive business texts?
       <textarea rows={2} className={field} maxLength={300} placeholder="Example: Customer asked for the website link during our call on [date]." value={consentSource} onChange={e=>setConsentSource(e.target.value)}/>
      </label>
      <label className="mt-3 flex gap-2 text-xs"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> I confirm this consent was actually given; I am not guessing or purchasing a list.</label>
      <button className={"mt-3 "+btn} disabled={saving||!approved||consentSource.trim().length<8} onClick={saveConsent}>Record verified permission</button>
     </>}
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
     <button type="button" disabled={!canPrepare} onClick={openVoice} className="rounded-xl bg-[#194961] px-4 py-3 text-xs font-black text-white disabled:opacity-40">Copy text + open Google Voice ↗</button>
     <button type="button" disabled={!canPrepare} onClick={copyText} className={btn}>Copy message</button>
     <button type="button" disabled={!canPrepare} onClick={openNativeSms} className={btn}>Open Samsung SMS app ↗</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3"><a href={VOICE} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#2b80a6] underline">Open Google Voice Messages ↗</a><span className="text-[11px] text-[#8da4b2]">No message is sent by FUGTH.</span></div>
    {info&&<p role="status" className="mt-3 rounded-lg bg-[#edf7fc] p-3 text-xs leading-6">{info}</p>}
   </section>
  </div>
  <p className="rounded-xl bg-[#f3f8fb] p-4 text-[11px] leading-6 text-[#6c8c9d]">Samsung tip: copy the number first and the text second, then open Google Voice and use your keyboard's Clipboard history if available. Only one item is guaranteed to be on the system clipboard at a time. Google Voice does not support reliable third-party auto-filled texts. Do not send repeated unwanted marketing messages or text contacts who opted out.</p>
 </section>;
}
