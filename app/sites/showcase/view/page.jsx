"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import SiteRenderer from "../../../../components/site-renderer";
import {buildStarterSite,siteFields} from "../../../../lib/site-presets";

const STORAGE_KEY="fugth-site-draft-v1";
export default function FullWebsitePreview(){
 const [site,setSite]=useState(null);
 useEffect(()=>{let saved={industry:"roofing",template:"service-pro"};try{saved={...saved,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")};}catch{}setSite(siteFields({...buildStarterSite("browser-preview","Your Business",saved.industry),...saved,visibility:"preview",showChatbot:true}));},[]);
 if(!site)return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Opening your website…</main>;
 return <main className="min-h-screen"><div className="fixed bottom-4 left-4 z-[90] flex gap-2"><Link href="/sites/showcase" className="rounded-full bg-white px-4 py-3 text-xs font-black text-slate-950 shadow-xl">← Back to editor</Link><Link href="/login?signup=1" className="rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-xl">Save to account</Link></div><SiteRenderer data={site} preview/></main>;
}
