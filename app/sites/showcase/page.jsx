"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import SiteRenderer from "../../../components/site-renderer";
import {SITE_INDUSTRIES,SITE_THEMES,buildStarterSite} from "../../../lib/site-presets";

export default function WebsiteGallery(){
 const [industry,setIndustry]=useState("roofing"),[theme,setTheme]=useState("bold");
 const sample=useMemo(()=>({...buildStarterSite("sample-layout","Your Business",industry),theme,visibility:"preview",contactEmail:"",phone:"",showChatbot:true}),[theme,industry]);
 return <main className="min-h-screen bg-[#f9faf7] text-[#293b2e]">
   <header className="border-b border-[#e4eae0] bg-white"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2d4330] text-lg font-bold text-white">F</span><b className="text-[21px] font-semibold tracking-[-.07em]">fugth.</b></Link><Link href="/login?signup=1" className="rounded-xl bg-[#2a3f2e] px-4 py-3 text-xs font-semibold text-white">Create my site ↗</Link></div></header>
   <section className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 sm:pt-16"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#96a593]">FUGTH WEBSITE MAKER</p><h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-.08em] sm:text-6xl">A site that feels <span className="font-serif font-normal italic text-[#7d9b79]">like yours.</span></h1><p className="mt-5 max-w-2xl text-sm leading-8 text-[#7c8a79]">Try different designs and business types. These are illustrations of what you can build. Every customer uses the same easy editor and saves their own look.</p>
    <div className="mt-9 flex flex-wrap gap-3"><label className="block w-full max-w-[340px] text-xs font-semibold text-[#63765e]">Your type of business<select className="mt-2 w-full rounded-xl border border-[#dbe5d8] bg-white px-4 py-3.5 text-sm text-[#41583e]" value={industry} onChange={e=>setIndustry(e.target.value)}>{SITE_INDUSTRIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{SITE_THEMES.map(t=><button key={t.id} type="button" onClick={()=>setTheme(t.id)} aria-pressed={theme===t.id} className={`rounded-xl border px-4 py-4 text-left transition ${theme===t.id?"border-[#293e2c] bg-[#293e2c] text-white":"border-[#dfe8db] bg-white text-[#647661]"}`}><p className="text-sm font-semibold">{t.name}</p><p className={`mt-1 text-[11px] leading-5 ${theme===t.id?"text-[#bad0b6]":"text-[#99a997]"}`}>{t.subtitle}</p></button>)}</div>
   </section>
   <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8"><div className="overflow-hidden rounded-[23px] border border-[#d8e2d4] bg-white shadow-[0_22px_70px_rgba(34,55,33,.06)]"><div className="flex items-center justify-between gap-3 border-b border-[#e5ece1] px-5 py-3 text-[11px] text-[#81947c]"><span>● &nbsp; ● &nbsp; ●</span><span>Example design · Not a real business</span></div><SiteRenderer data={sample} preview/></div><div className="mt-7 flex flex-wrap items-center justify-between gap-5"><p className="max-w-md text-xs leading-6 text-[#97a593]">Images are illustrative. You can edit your own business details, photos, services and chat settings once signed in.</p><Link href="/login?signup=1" className="rounded-xl bg-[#2d412f] px-6 py-4 text-sm font-semibold text-white">Start building my website ↗</Link></div></div>
 </main>;
}
