"use client";
import {useEffect,useState} from "react";
import {rememberActiveProspect} from "../lib/client/active-prospect";
import FounderColdCall from "./founder-cold-call";
import FounderProspectImport from "./founder-prospect-import";
import FounderPierreGuide from "./founder-pierre-guide";
import FounderProspectDemos from "./founder-prospect-demos";
import FounderOutreachDesk from "./founder-outreach-desk";
import FounderCallTraining from "./founder-call-training";
import FounderTextDesk from "./founder-text-desk";
import FounderEmailOutreach from "./founder-email-outreach";
import FounderActiveProspectBar from "./founder-active-prospect-bar";
export default function FounderSalesDesk({user,onOpenMarketing,onOpenSiteMaker,initialTab="guide",onTabChange}){
 const [tab,setTab]=useState(initialTab);
 const [textProspectId,setTextProspectId]=useState("");
 useEffect(()=>{setTab(initialTab)},[initialTab]);
 function selectTab(id){setTab(id);onTabChange?.(id);}
 function openText(prospect){
  const id=String(prospect?.id||"");
  if(id)rememberActiveProspect(user?.uid,id);
  setTextProspectId(id);selectTab("sms");
 }
 function openSite(prospect){onOpenSiteMaker?.({...prospect,originTab:tab})}
 const tabs=[["guide","Pierre’s Call Map"],["training","Call Training"],["leads","Prospects & Calls"],["sms","SMS Outreach"],["email","Email Outreach"],["outreach","CSV & Phone Tools"],["demos","Website Demo Builder"]];
 return <section className="space-y-5">
  <div className="relative overflow-hidden rounded-[26px] border border-[#2e556e] bg-[#142c3e] p-4 text-white sm:p-7">
   <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9dcf5]">FOUNDER / SALES OPERATIONS</p>
   <h2 className="mt-2 text-2xl font-semibold text-white">Sales, with a point of view</h2>
   <p className="mt-2 text-xs leading-6 text-[#b2cedd]">Practice realistic conversations by voice, follow Pierre’s branching map, and work through prospecting, personalized website demos and outreach. Each prospect keeps their own notes and progress.</p>
   <div role="tablist" aria-label="Sales operations" className="mt-5 hidden flex-wrap gap-2 sm:flex">{tabs.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>selectTab(id)} className={"rounded-full px-4 py-3 text-xs font-bold "+(tab===id?"bg-[#b9e5fb] text-[#153b50]":"border border-white/20 bg-white/10 text-[#d8e9f4] hover:bg-white/20")}>{label}</button>)}</div>
   <div className="mt-4 sm:hidden">
    <div role="tablist" aria-label="Quick mobile sales navigation" className="grid grid-cols-4 gap-1.5">
     {[["guide","Pierre"],["leads","Prospects"],["sms","SMS"],["email","Email"]].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>selectTab(id)}
      className={"min-h-[48px] rounded-xl px-1.5 py-2 text-[11px] font-black "+(tab===id?"bg-[#b9e5fb] text-[#153b50]":"border border-white/20 bg-white/10 text-[#d8e9f4]")}>{label}</button>)}
    </div>
    <details className="mt-2 rounded-xl border border-white/20 bg-white/10 p-2">
     <summary className="cursor-pointer px-2 py-2 text-xs font-black">More sales tools · Call training, CSV, website demos</summary>
     <div role="tablist" aria-label="Additional sales tools" className="mt-2 grid grid-cols-2 gap-2">
      {[["training","Call training"],["outreach","CSV & tools"],["demos","Website demos"]].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>selectTab(id)}
       className={"min-h-[44px] rounded-xl border px-2 py-2 text-xs font-bold "+(tab===id?"bg-[#b9e5fb] text-[#153b50]":"border-white/20 bg-white/10 text-white")}>{label}</button>)}
     </div>
    </details>
   </div>
  </div>
  <FounderActiveProspectBar user={user} onNavigate={selectTab} onOpenSiteMaker={openSite}/>
  <div role="tabpanel">{tab==="guide"?<FounderPierreGuide user={user} onText={openText}/>:tab==="training"?<FounderCallTraining/>:tab==="sms"?<FounderTextDesk user={user} initialProspectId={textProspectId} onOpenSiteMaker={openSite}/>:tab==="email"?<FounderEmailOutreach user={user} onOpenMarketing={onOpenMarketing} onOpenSiteMaker={openSite}/>:tab==="outreach"?<FounderOutreachDesk user={user}/>:tab==="demos"?<FounderProspectDemos user={user} onOpenSiteMaker={openSite}/>:<div className="space-y-6"><FounderProspectImport user={user} onText={openText} onOpenSiteMaker={openSite}/><FounderColdCall user={user} onOpenSiteMaker={openSite}/></div>}</div>
 </section>;
}