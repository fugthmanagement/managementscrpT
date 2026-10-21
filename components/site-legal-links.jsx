"use client";
import {useEffect,useState} from "react";
import {siteLegalPages,SITE_LEGAL_TYPES,SITE_LEGAL_TITLES} from "../lib/site-legal-defaults";

export default function SiteLegalLinks({site,preview=false,dark=false}){
 const [active,setActive]=useState("");
 const pages=siteLegalPages(site,preview);
 useEffect(()=>{
  if(!active)return;
  const onKey=e=>{if(e.key==="Escape")setActive("")};
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[active]);
 const chosen=pages[active];
 return <>
  <nav aria-label="Website legal information" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
   {SITE_LEGAL_TYPES.map(kind=><button type="button" key={kind}
    className={"text-xs font-semibold underline underline-offset-4 hover:opacity-90 "+(dark?"text-white/70":"text-zinc-600")}
    onClick={()=>setActive(kind)}>{SITE_LEGAL_TITLES[kind]}</button>)}
  </nav>
  {active&&chosen&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/75 p-3 sm:p-8"
    onClick={()=>setActive("")}>
    <section role="dialog" aria-modal="true" aria-label={chosen.title}
     className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-zinc-200 bg-white p-6 text-left text-zinc-900 shadow-2xl sm:p-9"
     onClick={e=>e.stopPropagation()}>
     <div className="flex items-start justify-between gap-4">
      <div>
       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Business website information</p>
       <h2 className="mt-2 text-2xl font-black">{chosen.title}</h2>
       <p className="mt-1 text-xs text-zinc-500">{site.name||"This business"}</p>
      </div>
      <button type="button" className="rounded-full border px-3 py-2 text-sm font-bold" aria-label="Close policy"
       onClick={()=>setActive("")}>Close ×</button>
     </div>
     {chosen.sample&&<p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-900">{chosen.intro}</p>}
     {!chosen.sample&&<p className="mt-5 text-sm leading-7">{chosen.intro}</p>}
     <div className="mt-6 space-y-6">{chosen.sections.map((item,i)=><article key={i}>
      <h3 className="text-base font-bold">{item.heading}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-600">{item.body}</p>
     </article>)}</div>
     <p className="mt-8 border-t pt-4 text-xs leading-6 text-zinc-500">
      {chosen.sample?"This is a customizable starting point, not legal advice. The owner must verify and adapt the final policy before publication. ":""}
      To discuss business information: {chosen.contact}.
     </p>
    </section>
   </div>}
 </>;
}
