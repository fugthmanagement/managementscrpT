"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
import {generateProceduralSite} from "../lib/site-procedural-engine";
const input="mt-2 w-full rounded-xl border border-[#bfd9e7] bg-white px-4 py-3 text-sm text-[#17394b]";
export default function FounderSiteReferenceInspector({prospectId,website="",site,onChange,locked=false}){
 const [source,setSource]=useState(website),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[notice,setNotice]=useState("");
 useEffect(()=>{setSource(website||"");setResult(null);setNotice("")},[website,prospectId]);
 async function analyze(){
  if(!prospectId)return setNotice("Select a saved prospect first.");
  setBusy(true);setNotice("");setResult(null);
  try{
   const token=await auth.currentUser?.getIdToken();
   if(!token)throw Error("Sign in with your verified founder account.");
   const response=await fetch("/api/dev/prospect-layout",{method:"POST",cache:"no-store",
    headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({prospectId,website:source.trim()})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||"Could not analyze the public website.");
   setResult(data.layout);setNotice("Website structure analyzed. No source content, review data or images were saved.");
  }catch(e){setNotice(e.message||"Inspection failed.")}finally{setBusy(false)}
 }
 function apply(){
  if(!site||!result)return;
  const generated=generateProceduralSite(site,{id:prospectId});
  const blocks=generated.canvasBlocks.map(block=>{
   if(block.type==="hero"){
    const variant=result.layoutStyle==="immersive"?"hero-full-bleed":result.layoutStyle==="editorial"?"hero-centered":"hero-split-a";
    return {...block,style:result.layoutStyle,variant};
   }
   return block;
  });
  onChange({...generated,canvasBlocks:blocks,referenceLayout:{
   sourceUrl:result.sourceUrl,layoutStyle:result.layoutStyle,
   hasGallery:result.hasGallery,hasCards:result.hasCards,
   hasBooking:result.hasBooking,hasTestimonials:result.hasTestimonials,
   paletteHint:result.paletteHint,inspectedAt:result.inspectedAt}});
  setNotice("Modernized draft based on the source layout. You can edit and randomize it; click Save design to update the preview.");
 }
 const status=result?[["Layout direction",result.layoutStyle],["Visual gallery",result.hasGallery?"Found":"Not detected"],
  ["Cards / grids",result.hasCards?"Detected":"Not detected"],["Navigation",String(result.navCount)],
  ["Page sections",String(result.sectionCount)],["Forms / booking",result.hasBooking||result.hasForms?"Detected":"Not detected"]]:[];
 return <section className="rounded-[24px] border border-[#d3e7f1] bg-white p-5 text-[#193e54] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#6a9cb4]">FUGTH Business Data Hub / Design reference</p>
   <h3 className="mt-2 text-xl font-black">Modernize a prospect's existing website</h3>
   <p className="mt-2 max-w-2xl text-xs leading-6 text-[#6b8595]">The saved website is selected automatically when available. Inspect its layout only—no text, images, contact details or reviews are copied. Then generate your own modern composition using FUGTH's preset modules.</p></div>
   <span className="rounded-xl bg-[#e9f6fc] px-3 py-2 text-[11px] font-bold">Free · No AI API</span>
  </div>
  <label className="mt-5 block text-xs font-black">Current prospect website / another public URL
   <input type="url" maxLength={650} className={input} value={source} onChange={e=>{setSource(e.target.value);setResult(null)}} placeholder="https://example-business.com"/></label>
  <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy||!source.trim()||locked} onClick={analyze} className="rounded-xl bg-[#1b4d67] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Inspecting…":"Inspect existing website layout ↗"}</button>
   {website&&source!==website&&<button type="button" className="rounded-xl border px-4 py-3 text-xs font-bold" onClick={()=>{setSource(website);setResult(null)}}>Use prospect's saved website</button>}
  </div>
  {result&&<div className="mt-5 rounded-2xl border border-[#d4e7ef] bg-[#f2f9fc] p-4">
   <p className="text-xs font-black">Reference analysis · {result.sourceDomain}</p>
   <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{status.map(([label,value])=><div key={label} className="rounded-xl bg-white p-3"><p className="text-[10px] text-[#66869a]">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div>)}</div>
   {result.paletteHint&&<p className="mt-3 text-xs">Source color hint: <span className="inline-block h-4 w-4 align-middle" style={{backgroundColor:result.paletteHint}}/> {result.paletteHint} · FUGTH chooses a coordinated modern palette.</p>}
   <button type="button" disabled={locked} onClick={apply} className="mt-4 rounded-xl bg-[#164e72] px-5 py-3 text-xs font-black text-white">Use structure to generate a modern FUGTH draft ✦</button>
  </div>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-[#edf8fd] p-3 text-xs leading-6">{notice}</p>}
 </section>;
}
