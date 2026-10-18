"use client";
import {useEffect,useState} from "react";
import FounderColdCall from "./founder-cold-call";
import FounderProspectImport from "./founder-prospect-import";
import FounderPierreGuide from "./founder-pierre-guide";
import FounderProspectDemos from "./founder-prospect-demos";
import SalesAudioReview from "./sales-audio-review";

const focus=[
 {name:"Explore",hint:"Ask what the business needs and listen for the real pain point."},
 {name:"Qualify",hint:"Confirm the right person, the business details and where the current process falls short."},
 {name:"Book",hint:"Ask for the email, propose a specific time and confirm the invitation."},
 {name:"Close",hint:"Summarize the value, address the final objection and ask for the decision."}
];
export default function FounderSalesDesk({user}){
 const [tab,setTab]=useState("guide"),[salesFocus,setSalesFocus]=useState(2);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get("sales");if(["guide","leads","demos","audio"].includes(value))setTab(value);},[]);
 const tabs=[["guide","Pierre's Call Map"],["leads","Prospects & Calls"],["demos","Website Demo Builder"],["audio","Audio Review"]];
 return <section className="space-y-5">
  <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-500">FOUNDER / SALES OPERATIONS</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-black tracking-[-.06em] text-zinc-950">Cold Calling & Sales</h2><p className="mt-2 text-xs leading-6 text-zinc-500">One focused tool at a time. Open any view in its own tab and drag it onto another monitor.</p></div><span className="rounded-full bg-black px-3 py-2 text-[10px] font-bold text-white">Founder workspace</span></div>
   <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tabs.map(([id,label])=><div key={id} className={`rounded-2xl border p-4 ${tab===id?"border-black bg-zinc-950 text-white":"border-zinc-200 bg-zinc-50 text-zinc-950"}`}><button type="button" onClick={()=>setTab(id)} aria-current={tab===id?"page":undefined} className="block w-full text-left text-sm font-bold">{label}</button><button type="button" onClick={()=>window.open(`/dashboard?view=sales&sales=${id}`,"_blank","noopener,noreferrer")} className={`mt-4 text-[10px] font-bold uppercase tracking-wide underline underline-offset-4 ${tab===id?"text-zinc-300":"text-zinc-500"}`}>Open in new tab ?</button></div>)}</div>
  </div>
  {tab==="guide"&&<div className="rounded-[24px] border border-zinc-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-500">Call objective</p><h3 className="mt-1 text-lg font-black">Focus on {focus[salesFocus].name.toLowerCase()}</h3></div><span className="text-xs font-bold text-zinc-500">{salesFocus+1} / 4</span></div><input type="range" min="0" max="3" step="1" value={salesFocus} onChange={e=>setSalesFocus(Number(e.target.value))} aria-label="Sales call focus" className="mt-5 w-full accent-black"/><div className="mt-2 grid grid-cols-4 text-center text-[10px] font-bold text-zinc-500">{focus.map((item,i)=><button key={item.name} type="button" onClick={()=>setSalesFocus(i)} className={salesFocus===i?"text-black underline underline-offset-4":""}>{item.name}</button>)}</div><p className="mt-5 rounded-xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">{focus[salesFocus].hint}</p><p className="mt-2 text-[11px] text-zinc-500">This is a visual coaching cue. It does not alter the live voice agent or the saved call script.</p></div>}
  <div role="tabpanel" className="fugth-panel-enter">{tab==="guide"?<FounderPierreGuide user={user}/>:tab==="demos"?<FounderProspectDemos/>:tab==="audio"?<SalesAudioReview/>:<div className="space-y-6"><FounderProspectImport user={user}/><FounderColdCall user={user}/></div>}</div>
 </section>;
}

