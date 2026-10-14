"use client";
import {useState} from "react";
import Link from "next/link";
const items=[
 {id:"receptionist",short:"01 · Calls",name:"An AI receptionist that sounds like your business",tag:"VOICE FRONT DESK",
  detail:"Customers call your business and hear a helpful greeting shaped by your industry, services and business information. Try your own name in our 15-second live demo.",
  features:["Customized greeting","Price and estimate questions","Appointment-request intake","Call history and summaries"]},
 {id:"library",short:"02 · History",name:"Every conversation, easier to find and follow up",tag:"CALL INTELLIGENCE",
  detail:"Keep calls, call dates, transcripts, AI summaries and customer follow-ups together instead of searching across apps.",
  features:["Local date and time","Call summaries","Recordings and transcripts","Create follow-up leads"]},
 {id:"website",short:"03 · Website",name:"A real business presence, not just a template",tag:"WEBSITE + CHATBOT",
  detail:"Explore your entire website before subscribing. The chatbot can run on a FUGTH website or be embedded in the site you already own.",
  features:["Full preview on Zero","Custom implementation on Mid+","Business-aware website chatbot","Guided appointment requests"]},
 {id:"growth",short:"04 · Growth",name:"Bring your leads and marketing into one place",tag:"YOUR BUSINESS CRM",
  detail:"Store contact records in FUGTH Firestore, import your leads and build responsible opt-in campaigns using your connected tools.",
  features:["Your own lead directory","JSON contact imports","Google-connected campaigns","AI-assisted email drafting"]}
];
export default function HomeFeatureTabs(){
 const [chosen,setChosen]=useState("receptionist"),[expanded,setExpanded]=useState(false);
 const item=items.find(x=>x.id===chosen)||items[0];
 return <section id="platform" className="scroll-mt-24 bg-[#f1f3eb] py-20 sm:py-28">
  <div className="mx-auto max-w-7xl px-5 sm:px-8">
   <div className="flex flex-wrap items-end justify-between gap-8"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#617c5e]">THE FUGTH OPERATING SYSTEM</p><h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.075em] text-[#253c2c] sm:text-6xl">More than a phone agent.<br/><span className="font-serif italic font-normal text-[#688663]">Your whole front office.</span></h2></div><p className="max-w-sm text-sm leading-7 text-[#738672]">One connected business workspace instead of separate disconnected tools.</p></div>
   <div className="mt-12 grid gap-5 lg:grid-cols-[.34fr_.66fr]">
    <div role="tablist" aria-label="Explore business management features" className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 lg:flex-col lg:overflow-visible lg:bg-transparent lg:p-0">
     {items.map(v=><button key={v.id} type="button" role="tab" aria-selected={chosen===v.id} onClick={()=>{setChosen(v.id);setExpanded(false);}}
       className={"min-w-[128px] flex-1 rounded-2xl px-5 py-4 text-left text-xs font-bold transition lg:min-h-[90px] lg:px-6 lg:text-sm "+(chosen===v.id?"bg-[#263f2e] text-white shadow-[0_12px_35px_rgba(20,50,28,.18)]":"bg-[#e7ecdf] text-[#647a63] hover:bg-[#dae5d5]")}>
       <span className="block text-[10px] font-semibold uppercase tracking-widest opacity-70">{v.short}</span><span className="mt-2 block">{v.tag}</span>
      </button>)}
    </div>
    <div role="tabpanel" className="overflow-hidden rounded-[28px] border border-[#d1dfd0] bg-[#203a2b] text-white shadow-[0_25px_85px_rgba(28,48,32,.12)]">
     <div className="grid gap-7 p-6 sm:p-9 md:grid-cols-[1fr_.9fr]">
      <div><span className="inline-flex rounded-full border border-white/25 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#c6dfb8]">{item.tag}</span><h3 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-[-.06em] sm:text-4xl">{item.name}</h3><p className="mt-5 text-sm leading-7 text-[#c1d4c2]">{item.detail}</p><ul className="mt-6 grid gap-3">{item.features.map(x=><li key={x} className="flex items-center gap-3 text-xs font-semibold text-[#e5efdf]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#476a48] text-[10px]">✓</span>{x}</li>)}</ul>
       <div className="mt-7 flex flex-wrap gap-3"><Link href={chosen==="receptionist"?"/#demo":chosen==="website"?"/sites/showcase":"/login?signup=1"} className="rounded-xl bg-[#dbd9a2] px-5 py-3 text-xs font-bold text-[#263d2b]">{chosen==="receptionist"?"Try a live demo":chosen==="website"?"Preview website styles":"Open your free workspace"} ↗</Link><button type="button" onClick={()=>setExpanded(x=>!x)} className="rounded-xl border border-white/25 px-5 py-3 text-xs font-bold text-white">{expanded?"Hide details":"How it works"}</button></div>
      </div>
      <div className="self-center overflow-hidden rounded-[22px] border border-white/15 bg-[#f7f8f2] p-4 text-[#2a412e] shadow-xl">
       <div className="flex items-center gap-2 border-b border-[#e0e6dc] pb-3"><span className="h-2.5 w-2.5 rounded-full bg-[#d6a98a]"/><span className="h-2.5 w-2.5 rounded-full bg-[#e8c97d]"/><span className="h-2.5 w-2.5 rounded-full bg-[#93b494]"/><span className="ml-auto text-[10px] font-semibold tracking-wide text-[#809080]">FUGTH WORKSPACE</span></div>
       {chosen==="receptionist"?<div className="py-6"><p className="text-[10px] font-bold tracking-widest text-[#819681]">LIVE RECEPTIONIST</p><div className="mt-5 rounded-2xl bg-[#e7efdf] p-5"><p className="text-xs text-[#6d876a]">Your business AI</p><p className="mt-4 font-serif text-2xl italic leading-snug">“Thank you for calling your business. How can I help?”</p><div className="mt-5 flex items-center gap-1">{[12,24,36,18,40,27,16,34,25,13,29,17].map((h,i)=><span key={i} className="w-1.5 rounded-full bg-[#4d7853]" style={{height:h}}/>)}</div></div><p className="mt-4 text-[11px] text-[#859483]">15-second demo · Custom industry behavior</p></div>:chosen==="library"?<div className="py-6"><p className="text-[10px] font-bold tracking-widest text-[#819681]">CALL INTELLIGENCE</p>{[["9:41 AM","Roofing estimate inquiry","Estimate requested"],["Yesterday","Appointment questions","Follow-up needed"],["Monday","Service information","Resolved"]].map(([when,topic,status])=><div key={topic} className="mt-3 rounded-xl border border-[#dfe7dc] bg-white p-4"><div className="flex justify-between gap-3 text-[10px] text-[#809080]"><span>{when}</span><span>● Recorded</span></div><p className="mt-2 text-sm font-bold">{topic}</p><p className="mt-1 text-xs text-[#6e836d]">{status}</p></div>)}</div>:chosen==="website"?<div className="py-5"><p className="text-[10px] font-bold tracking-widest text-[#819681]">WEBSITE PREVIEW</p><div className="mt-4 overflow-hidden rounded-xl bg-[#e3e4c9] p-5"><p className="text-[10px] font-bold uppercase tracking-widest">YOUR COMPANY</p><h4 className="mt-8 font-serif text-4xl italic leading-none">Built for<br/>your business.</h4><p className="mt-4 text-xs">A professional local service website.</p><span className="mt-5 inline-flex rounded-full bg-[#2d4a32] px-4 py-2 text-xs font-bold text-white">Request an estimate ↗</span></div><div className="mt-3 flex justify-end"><span className="rounded-full bg-[#2d4a32] px-4 py-3 text-[11px] font-bold text-white">✳ Chat with us</span></div></div>:<div className="py-6"><p className="text-[10px] font-bold tracking-widest text-[#819681]">BUSINESS CRM</p>{[["New inquiry","Sarah · Dental cleaning"],["Qualified lead","Martin · Service quote"],["Follow up","Alex · Appointment"]].map(([status,label])=><div key={label} className="mt-3 rounded-xl bg-white p-4"><p className="text-[10px] text-[#7b967c]">{status}</p><p className="mt-1 text-sm font-bold">{label}</p></div>)}<p className="mt-4 text-[11px] text-[#859483]">Leads · Email campaigns · Follow-up workflows</p></div>}
      </div>
     </div>
     {expanded&&<div className="border-t border-white/15 bg-white/5 px-6 py-5 text-xs leading-6 text-[#e0ebe0] sm:px-9">Start in Zero to explore your previews. Choose the features you need, connect authorized services and complete onboarding to activate billable workflows. Customer data stays organized in your own FUGTH workspace. All sample business names and demo records shown above are illustrative.</div>}
    </div>
   </div>
  </div>
 </section>;
}
