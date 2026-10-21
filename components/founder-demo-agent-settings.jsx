"use client";
import {useState} from "react";
import {auth} from "../lib/firebase";
const field="mt-2 w-full rounded-xl border border-[#c9d9e3] bg-white px-3 py-2.5 text-xs text-[#23536d]";
const btn="rounded-xl border border-[#bdd8e5] bg-white px-3 py-2.5 text-xs font-black text-[#24556b] disabled:opacity-40";
export default function FounderDemoAgentSettings({demo,onSaved}){
 const base=demo.site||{};
 const [open,setOpen]=useState(false);
 const [model,setModel]=useState(base.aiAgentModel||"auto"),[aiEnabled,setAiEnabled]=useState(base.aiAgentMode!=="off");
 const [facts,setFacts]=useState((base.agentFacts||[]).join("\n"));
 const [images,setImages]=useState([]),[suggested,setSuggested]=useState("");
 const [rights,setRights]=useState(false),[useHero,setUseHero]=useState(Boolean(base.sourceHeroPhotoApproved));
 const [places,setPlaces]=useState([]),[placeId,setPlaceId]=useState(base.googlePlaceId||"");
 const [showReviews,setShowReviews]=useState(base.showGoogleReviews===true);
 const [dock,setDock]=useState(base.googleReviewsDock||"after_services"),[style,setStyle]=useState(base.googleReviewsStyle||"cards");
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const validUrl=base.sourceHeroPhotoUrl||"";
 async function call(action,payload={}){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Founder sign-in is required.");
  const response=await fetch("/api/dev/demo-agent",{method:"POST",cache:"no-store",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({action,demoId:demo.id,...payload})});
  const j=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(j.error||"Could not update demo agent.");
  return j;
 }
 async function perform(action){
  setBusy(action);setNotice("");
  try{
   if(action==="suggest_images"){
    const j=await call(action);setImages(j.candidates||[]);
    setNotice(j.candidates?.length?"Choose a candidate and confirm authorized use before displaying it.":"No same-domain photos were found; use your licensed photo library.");
   }else if(action==="find_places"){
    const j=await call(action);setPlaces(j.places||[]);
    setNotice(j.places?.length?"Verify the business name and address before selecting a Google place.":"No matching Google Places records found.");
   }else{
    const proposedImage=useHero?(suggested||validUrl):"";
    if(useHero&&!rights)throw Error("Confirm explicit permission to use the selected business photo.");
    const j=await call("update",{model,aiEnabled,facts:facts.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,10),
     googlePlaceId:placeId,showGoogleReviews:showReviews,googleReviewsDock:dock,googleReviewsStyle:style,
     useHero,heroUrl:proposedImage,imageRightsConfirmed:rights});
    setNotice(j.note||"Saved.");onSaved?.();
   }
  }catch(e){setNotice(e.message)}
  finally{setBusy("")}
 }
 return <div className="mt-4 rounded-xl border border-[#c9dfec] bg-[#f4fbfe] p-4">
  <button type="button" className="w-full text-left text-xs font-black text-[#245575]" onClick={()=>setOpen(v=>!v)}>
   {open?"▾":"▸"} GGUF agent, approved facts, original photos & Google reviews
  </button>
  {open&&<div className="mt-4 space-y-4">
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">Preview AI model<select className={field} value={model} onChange={e=>setModel(e.target.value)}>
     <option value="auto">Auto · business data weight</option><option value="0.5b">0.5B · lighter</option><option value="1.5b">1.5B · stronger</option></select></label>
    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={aiEnabled} onChange={e=>setAiEnabled(e.target.checked)}/> Enable AI live-support option</label>
   </div>
   <label className="block text-xs font-bold">Owner-approved reference facts (one fact per line, up to 10)
    <textarea className={field} rows={5} maxLength={2200} value={facts} onChange={e=>setFacts(e.target.value)} placeholder="Approved opening hours, actual service details, policies, etc."/></label>
   <div className="rounded-xl border bg-white p-4">
    <strong className="text-xs">Optional business-owned image references</strong>
    <p className="mt-2 text-[11px] leading-5 text-[#708a99]">Detect image links from the prospect's existing website. No photo bytes are copied to Firestore. Only embed a photo if you have permission or a suitable license; save the source credit with the preview.</p>
    <button disabled={!!busy} className={"mt-3 "+btn} onClick={()=>perform("suggest_images")}>Find original website photos</button>
    {images.length>0&&<label className="mt-3 block text-xs font-bold">Website photo references
     <select className={field} value={suggested} onChange={e=>{setSuggested(e.target.value);setUseHero(true);setRights(false)}}>
      <option value="">Keep existing / choose</option>{images.map((x,i)=><option key={i} value={x.url}>Candidate {i+1} · {new URL(x.url).pathname.slice(-55)}</option>)}
     </select></label>}
    {suggested&&<div className="mt-3 overflow-hidden rounded-xl border"><img src={suggested} alt="Candidate from business website — unapproved" className="max-h-44 w-full object-contain" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none"}}/></div>}
    <label className="mt-3 flex gap-2 text-xs"><input type="checkbox" checked={useHero} onChange={e=>setUseHero(e.target.checked)}/> Place authorized existing photo in this preview hero</label>
    {useHero&&<label className="mt-2 flex gap-2 text-xs font-bold"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to display this photo in a FUGTH design preview and will preserve source credit.</label>}
   </div>
   <div className="rounded-xl border bg-white p-4">
    <strong className="text-xs">Real Google Maps reviews</strong>
    <p className="mt-2 text-[11px] leading-5 text-[#708a99]">Search Google Places using the saved business name/address. Google Places (New) and billing must be enabled. Review content stays live with Google attribution; it is not copied into Firestore.</p>
    <button className={"mt-3 "+btn} disabled={!!busy} onClick={()=>perform("find_places")}>Find Google business profiles</button>
    {places.length>0&&<label className="mt-3 block text-xs font-bold">Choose the verified business
     <select className={field} value={placeId} onChange={e=>setPlaceId(e.target.value)}>
      <option value="">No Google profile selected</option>
      {places.map(p=><option key={p.id} value={p.id}>{p.name} · {p.address} · {p.reviewCount} reviews</option>)}
     </select>
    </label>}
    {placeId&&<p className="mt-2 break-all text-[11px]">Selected Place ID: {placeId}</p>}
    <label className="mt-3 flex gap-2 text-xs"><input type="checkbox" checked={showReviews} onChange={e=>setShowReviews(e.target.checked)} disabled={!placeId}/> Show real reviews on this demo</label>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
     <label className="text-xs font-bold">Review dock
      <select className={field} value={dock} onChange={e=>setDock(e.target.value)}>
       <option value="hero">After hero</option><option value="after_services">After services</option>
       <option value="before_contact">Before contact</option><option value="footer">Before footer</option>
      </select></label>
     <label className="text-xs font-bold">Style
      <select className={field} value={style} onChange={e=>setStyle(e.target.value)}>
       <option value="compact">Compact rating</option><option value="cards">Individual review cards</option>
       <option value="spotlight">Large spotlight</option></select></label>
    </div>
   </div>
   <button disabled={!!busy} onClick={()=>perform("update")} className="rounded-xl bg-[#225e78] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy==="update"?"Saving…":"Save this preview's AI & design"}</button>
   {notice&&<p role="status" className="rounded-lg bg-white p-3 text-xs leading-6">{notice}</p>}
  </div>}
 </div>;
}
