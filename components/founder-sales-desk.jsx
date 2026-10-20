"use client";
import {useState} from "react";
import FounderColdCall from "./founder-cold-call";
import FounderProspectImport from "./founder-prospect-import";
import FounderPierreGuide from "./founder-pierre-guide";
import FounderProspectDemos from "./founder-prospect-demos";
import FounderOutreachDesk from "./founder-outreach-desk";
import FounderCallTraining from "./founder-call-training";
import FounderAiSalesCoach from "./founder-ai-sales-coach";
export default function FounderSalesDesk({user}){
 const [tab,setTab]=useState("guide");
 const tabs=[["guide","Pierre’s Call Map"],["training","Call Training"],["ai","AI Sales Coach"],["leads","Prospects & Calls"],["outreach","Email & Phone Outreach"],["demos","Website Demo Builder"]];
 return <section className="space-y-5">
  <div className="relative overflow-hidden rounded-[26px] border border-[#2e556e] bg-[#142c3e] p-5 text-white sm:p-7">
   <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9dcf5]">FOUNDER / SALES OPERATIONS</p>
   <h2 className="mt-2 text-2xl font-semibold text-white">Sales, with a point of view</h2>
   <p className="mt-2 text-xs leading-6 text-[#b2cedd]">Practice realistic conversations by voice, follow Pierre’s branching map, and work through prospecting, personalized website demos and outreach. Each prospect keeps their own notes and progress.</p>
   <div role="tablist" aria-label="Sales operations" className="mt-5 flex flex-wrap gap-2">{tabs.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={"rounded-full px-4 py-3 text-xs font-bold "+(tab===id?"bg-[#b9e5fb] text-[#153b50]":"border border-white/20 bg-white/10 text-[#d8e9f4] hover:bg-white/20")}>{label}</button>)}</div>
  </div>
  <div role="tabpanel">{tab==="guide"?<FounderPierreGuide user={user}/>:tab==="training"?<FounderCallTraining/>:tab==="ai"?<FounderAiSalesCoach user={user}/>:tab==="outreach"?<FounderOutreachDesk user={user}/>:tab==="demos"?<FounderProspectDemos/>:<div className="space-y-6"><FounderProspectImport user={user}/><FounderColdCall user={user}/></div>}</div>
 </section>;
}