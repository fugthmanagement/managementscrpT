"use client";
import {useState} from "react";
import FounderColdCall from "./founder-cold-call";
import FounderProspectImport from "./founder-prospect-import";
import FounderPierreGuide from "./founder-pierre-guide";
import FounderProspectDemos from "./founder-prospect-demos";
import FounderOutreachDesk from "./founder-outreach-desk";
import FounderCallTraining from "./founder-call-training";
import FounderTextDesk from "./founder-text-desk";
import FounderEmailOutreach from "./founder-email-outreach";
export default function FounderSalesDesk({user,onOpenMarketing,onOpenSiteMaker}){
 const [tab,setTab]=useState("guide");
 const [textProspectId,setTextProspectId]=useState("");
 function openText(prospect){setTextProspectId(String(prospect?.id||""));setTab("sms");}
 const tabs=[["guide","Pierre’s Call Map"],["training","Call Training"],["leads","Prospects & Calls"],["sms","SMS Outreach"],["email","Email Outreach"],["outreach","CSV & Phone Tools"],["demos","Website Demo Builder"]];
 return <section className="space-y-5">
  <div className="relative overflow-hidden rounded-[26px] border border-[#2e556e] bg-[#142c3e] p-5 text-white sm:p-7">
   <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9dcf5]">FOUNDER / SALES OPERATIONS</p>
   <h2 className="mt-2 text-2xl font-semibold text-white">Sales, with a point of view</h2>
   <p className="mt-2 text-xs leading-6 text-[#b2cedd]">Practice realistic conversations by voice, follow Pierre’s branching map, and work through prospecting, personalized website demos and outreach. Each prospect keeps their own notes and progress.</p>
   <div role="tablist" aria-label="Sales operations" className="mt-5 flex flex-wrap gap-2">{tabs.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={"rounded-full px-4 py-3 text-xs font-bold "+(tab===id?"bg-[#b9e5fb] text-[#153b50]":"border border-white/20 bg-white/10 text-[#d8e9f4] hover:bg-white/20")}>{label}</button>)}</div>
  </div>
  <div role="tabpanel">{tab==="guide"?<FounderPierreGuide user={user} onText={openText}/>:tab==="training"?<FounderCallTraining/>:tab==="sms"?<FounderTextDesk user={user} initialProspectId={textProspectId} onOpenSiteMaker={onOpenSiteMaker}/>:tab==="email"?<FounderEmailOutreach user={user} onOpenMarketing={onOpenMarketing} onOpenSiteMaker={onOpenSiteMaker}/>:tab==="outreach"?<FounderOutreachDesk user={user}/>:tab==="demos"?<FounderProspectDemos user={user} onOpenSiteMaker={onOpenSiteMaker}/>:<div className="space-y-6"><FounderProspectImport user={user} onText={openText} onOpenSiteMaker={onOpenSiteMaker}/><FounderColdCall user={user} onOpenSiteMaker={onOpenSiteMaker}/></div>}</div>
 </section>;
}