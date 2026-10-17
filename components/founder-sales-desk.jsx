"use client";
import {useState} from "react";
import FounderColdCall from "./founder-cold-call";
import FounderProspectImport from "./founder-prospect-import";
import FounderPierreGuide from "./founder-pierre-guide";
export default function FounderSalesDesk({user}){
 const [tab,setTab]=useState("guide");
 const tabs=[["guide","Pierre's Call Map"],["leads","Prospects, ZIP codes & Calls"]];
 return <section className="space-y-5">
  <div className="rounded-[26px] border border-[#e1d2bd] bg-[#fff9ef] p-4 sm:p-6">
   <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a2825d]">FOUNDER / SALES OPERATIONS</p>
   <h2 className="mt-2 text-2xl font-semibold text-[#4e4030]">Cold Calling & Sales</h2>
   <p className="mt-2 text-xs leading-6 text-[#83715a]">Keep your original live script separate from ZIP code prospecting, the call queue and Google Sheets.</p>
   <div role="tablist" aria-label="Sales operations" className="mt-5 flex flex-wrap gap-2">{tabs.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={"rounded-xl px-5 py-3 text-sm font-semibold "+(tab===id?"bg-[#5c4b37] text-white":"border border-[#decdb8] bg-white text-[#5c4b37]")}>{label}</button>)}</div>
  </div>
  <div role="tabpanel">{tab==="guide"?<FounderPierreGuide user={user}/>:<div className="space-y-6"><FounderProspectImport user={user}/><FounderColdCall user={user}/></div>}</div>
 </section>;
}