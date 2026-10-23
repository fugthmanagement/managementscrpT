"use client";
import {useEffect,useRef} from "react";
import Link from "next/link";
import {useSmartNavigation} from "../lib/use-smart-navigation";

const icons={
 home:"⌂",calls:"☎",customers:"♧",marketing:"↗",website:"▣",services:"🛒",settings:"⚙",
 accounts:"♙",sales:"✧",admin:"◆"
};
export default function WorkspaceNavigation({
 tabs=[],page,business="",accountNumber="",displayPlan="",founder=false,
 previewPlan=null,onPreviewPlan,onChangePage,onLogout
}){
 const nav=useSmartNavigation({compactAt:130,idleMs:2000});
 const list=useRef(null);
 const focused=useRef(null);
 const active=tabs.find(x=>x.id===page);
 useEffect(()=>{
   const current=list.current?.querySelector('[aria-current="page"]');
   if(current&&list.current&&list.current.scrollWidth>list.current.clientWidth){
     current.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
   }
 },[page,tabs.length]);
 function go(id){nav.reveal();onChangePage(id);}
 return <>
  <header className="fugth-workspace-masthead relative isolate overflow-hidden border-b border-[#29485e] bg-[#111e2b] text-white">
   <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 h-[410px] w-[410px] rounded-full border-[62px] border-[#b5e6ff]/[.07]"/>
   <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-x-8 gap-y-6 px-4 py-7 sm:px-8 sm:py-8 lg:px-12 lg:py-9">
    <div className="flex min-w-0 items-center gap-4">
     <Link href="/" className="group grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#d7f0ff]/30 bg-[#b9e5fb] text-[22px] font-black text-[#183e54] shadow-[0_9px_23px_rgba(97,187,234,.13)]" aria-label="FUGTH public website">F</Link>
     <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[.17em] text-[#b2dbee]">FUGTH <span className="font-medium text-[#839fb0]">MANAGEMENT OS</span></p><h1 className="mt-1 truncate text-lg font-black tracking-tight sm:text-2xl">{business||"My business"} <span className="font-medium text-[#b1c9d7]">/ Workspace</span></h1><p className="mt-1 text-[11px] text-[#8eaabb]">{accountNumber?"Account #"+accountNumber:"Your business operations in one place"} · {displayPlan}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
     {founder&&<label className="flex items-center gap-2 rounded-full border border-[#5d879f] bg-white/[.07] px-3 py-2 text-[11px] font-bold text-[#d3eaf5]"><span className="hidden sm:inline">Preview access</span><select aria-label="Preview customer plan without changing billing" value={previewPlan??"real"} onChange={event=>onPreviewPlan(event.target.value==="real"?null:event.target.value)} className="max-w-[150px] rounded-lg bg-[#243f52] px-2 py-1.5 text-[11px] font-bold text-white outline-none"><option value="real">Founder / Admin</option><option value="none">Zero · Free</option><option value="website">Website</option><option value="starter">Essential</option><option value="growth">Growth</option><option value="elite">Elite</option></select></label>}
     <button type="button" onClick={()=>go("website")} className="rounded-full border border-white/25 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:border-[#b9e5fb] hover:bg-white/20">Website Maker ↗</button>
     <button type="button" onClick={onLogout} className="rounded-full bg-[#b9e5fb] px-4 py-3 text-xs font-black text-[#173e55] transition hover:bg-[#d7f1ff]">Log out</button>
    </div>
   </div>
  </header>
  <div data-smart-navigation data-hidden={!nav.visible&&nav.compact} data-compact={nav.compact}
    className="fugth-workspace-nav sticky top-0 z-[80] border-b border-[#d9e6ef] bg-[#f3faff]/[.96] px-2 py-2 text-[#28485b] shadow-[0_13px_38px_rgba(13,46,68,.07)] backdrop-blur-xl sm:px-5"
    onPointerEnter={nav.onEnter} onPointerLeave={nav.onLeave} onFocusCapture={nav.reveal}>
   <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-2 sm:gap-3">
    <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dff3ff] text-sm font-black text-[#1a688b] xl:grid">F</span>
    <nav ref={list} className="fugth-workspace-tab-list flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[#d4e6f1] bg-white px-1.5 py-1.5 shadow-[0_5px_17px_rgba(26,81,120,.07)]" aria-label="Workspace sections">
     {tabs.map(item=><button type="button" key={item.id} aria-current={page===item.id?"page":undefined} onClick={()=>go(item.id)}
      className={"flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-[11px] font-black transition sm:px-4 "+(page===item.id?"bg-[#203b4d] text-white shadow-[0_3px_8px_rgba(17,53,79,.13)]":"text-[#627f90] hover:bg-[#e6f5ff] hover:text-[#225d80]")}>
      <span aria-hidden="true" className={"text-[14px] font-normal "+(page===item.id?"text-[#b9e5fb]":"text-[#5a9cbf]")}>{icons[item.id]||"•"}</span>
      {item.label}</button>)}
    </nav>
    <button type="button" className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-[#cde3f0] bg-white text-sm text-[#3d7da0] xl:grid" aria-label="Scroll to more tabs" onClick={()=>list.current?.scrollBy({left:300,behavior:"smooth"})}>→</button>
   </div>
   <button type="button" className="fugth-nav-peek absolute bottom-[-14px] left-1/2 z-10 hidden -translate-x-1/2 rounded-b-xl border border-t-0 border-[#b9d9ed] bg-[#e4f6ff] px-5 py-0.5 text-[10px] font-black text-[#2a789f]" onClick={nav.reveal} aria-label="Show workspace tabs">⌄ Tabs</button>
  </div>
 </>;
}
