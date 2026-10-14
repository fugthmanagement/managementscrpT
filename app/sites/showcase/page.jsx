"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import SiteRenderer from "../../../components/site-renderer";
import {SITE_INDUSTRIES,buildStarterSite,getIndustry} from "../../../lib/site-presets";

export default function WebsiteGallery(){
 const [industry,setIndustry]=useState("roofing");
 const sample=useMemo(()=>({...buildStarterSite("sample-layout","Your Business",industry),visibility:"preview",contactEmail:"",phone:"",showChatbot:true}),[industry]);
 const active=getIndustry(industry);
 return <main className="min-h-screen bg-[#f9faf7] text-[#293b2e]">
   <header className="border-b border-[#e4eae0] bg-white"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2d4330] text-lg font-bold text-white">F</span><b className="text-[21px] font-semibold tracking-[-.07em]">fugth.</b></Link><Link href="/login?signup=1" className="rounded-xl bg-[#2a3f2e] px-4 py-3 text-xs font-semibold text-white">Create my site ↗</Link></div></header>
   <section className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 sm:pt-16"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#96a593]">FUGTH WEBSITE MAKER</p><h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-.08em] sm:text-6xl">A site that feels <span className="font-serif font-normal italic text-[#7d9b79]">like yours.</span></h1><p className="mt-5 max-w-2xl text-sm leading-8 text-[#7c8a79]">Pick a business type to see the FUGTH site system choose its finished website family. Service, care, and studio sites use different navigation, page structure, cards, and visual rhythm.</p>
    <div className="mt-9 flex flex-wrap items-end gap-4"><label className="block w-full max-w-[340px] text-xs font-semibold text-[#63765e]">Your type of business<select className="mt-2 w-full rounded-xl border border-[#dbe5d8] bg-white px-4 py-3.5 text-sm text-[#41583e]" value={industry} onChange={e=>setIndustry(e.target.value)}>{SITE_INDUSTRIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><div className="rounded-xl border border-[#dfe8db] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-[#8ca08a]">AUTOMATIC FUGTH LAYOUT</p><p className="mt-1 text-sm font-semibold text-[#3c4e3a]">{active.template==="service-pro"?"Service Pro · contractor-style":active.template==="care-pro"?"Care Pro · appointment-focused":"Studio Pro · editorial warm"}</p></div></div>
   </section>
   <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8"><div className="overflow-hidden rounded-[23px] border border-[#d8e2d4] bg-white shadow-[0_22px_70px_rgba(34,55,33,.06)]"><div className="flex items-center justify-between gap-3 border-b border-[#e5ece1] px-5 py-3 text-[11px] text-[#81947c]"><span>● &nbsp; ● &nbsp; ●</span><span>Example design · Not a real business</span></div><SiteRenderer data={sample} preview/></div><div className="mt-7 flex flex-wrap items-center justify-between gap-5"><p className="max-w-md text-xs leading-6 text-[#97a593]">Images are illustrative. Customers keep their name, number, service area, hours, and services current. FUGTH keeps the layout and photography polished.</p><Link href="/login?signup=1" className="rounded-xl bg-[#2d412f] px-6 py-4 text-sm font-semibold text-white">Start building my website ↗</Link></div></div>
 </main>;
}
