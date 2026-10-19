"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

export const COOKIE_KEY="fugth_cookie_preferences";
const DEFAULT={essential:true,analytics:false,updatedAt:null,version:1};
function readCookie(){
 if(typeof document==="undefined")return null;
 const record=document.cookie.split("; ").find(item=>item.startsWith(COOKIE_KEY+"="));
 if(!record)return null;
 try{const raw=JSON.parse(decodeURIComponent(record.slice(COOKIE_KEY.length+1)));if(raw.version===1&&typeof raw.analytics==="boolean")return {...DEFAULT,...raw,essential:true};}catch{}
 return null;
}
function saveConsent(analytics){
 const value={...DEFAULT,analytics:!!analytics,updatedAt:new Date().toISOString()};
 document.cookie=COOKIE_KEY+"="+encodeURIComponent(JSON.stringify(value))+"; Path=/; Max-Age=15552000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
 window.dispatchEvent(new CustomEvent("fugth:cookie-updated",{detail:value}));
 return value;
}
export default function CookieConsent(){
 const [prefs,setPrefs]=useState(null),[ready,setReady]=useState(false),[open,setOpen]=useState(false),[custom,setCustom]=useState(false),[analytics,setAnalytics]=useState(false);
 useEffect(()=>{
  const existing=readCookie();setPrefs(existing);setAnalytics(!!existing?.analytics);setOpen(!existing);setReady(true);
  const reopen=()=>{const current=readCookie();setPrefs(current);setAnalytics(!!current?.analytics);setOpen(true);setCustom(true)};
  window.addEventListener("fugth:open-cookie-settings",reopen);
  return()=>window.removeEventListener("fugth:open-cookie-settings",reopen);
 },[]);
 useEffect(()=>{
  if(!ready||!prefs?.analytics)return;
  // Never load optional Microsoft Clarity before an explicit analytics opt-in.
  if(document.querySelector('script[data-fugth-analytics="clarity"]'))return;
  const tag=document.createElement("script");tag.async=true;tag.dataset.fugthAnalytics="clarity";
  tag.src="https://www.clarity.ms/tag/wrplhq4o8q";
  document.head.appendChild(tag);
 },[ready,prefs?.analytics]);
 function apply(value){const next=saveConsent(value);setPrefs(next);setAnalytics(next.analytics);setCustom(false);setOpen(false);
  // Clarity may already be running: reload to reliably enforce newly disabled analytics.
  if(!value&&document.querySelector('script[data-fugth-analytics="clarity"]'))window.location.reload();
 }
 if(!ready||!open)return null;
 return <div className="fixed inset-x-3 bottom-3 z-[300] mx-auto max-w-[710px] rounded-[24px] border border-[#90c8e8] bg-white p-5 text-[#172d3b] shadow-[0_20px_70px_rgba(16,35,56,.23)] sm:bottom-5 sm:p-6" role="dialog" aria-modal="false" aria-labelledby="fugth-cookie-title">
  <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#2377a1]">Your privacy, your choice</p><h2 id="fugth-cookie-title" className="mt-1 text-xl font-black tracking-tight">Cookies at FUGTH</h2></div>{prefs&&<button onClick={()=>setOpen(false)} aria-label="Close cookie settings" className="rounded-full border border-[#d0e3ef] px-3 py-1 text-xl">×</button>}</div>
  <p className="mt-3 text-sm leading-6 text-[#526c7c]">We use essential browser storage for sign-in and site functionality. With your permission, Microsoft Clarity helps us understand visits and improve pages. Optional analytics are off until you agree.</p>
  {custom&&<div className="mt-4 grid gap-3 rounded-xl border border-[#e0edf6] bg-[#f4faff] p-4 text-sm">
    <div className="flex items-center justify-between gap-4"><div><strong>Essential</strong><p className="text-xs text-[#6b8594]">Login, security and remembering your selection.</p></div><span className="rounded-full bg-[#dde8ef] px-3 py-1 text-[11px] font-bold">Always on</span></div>
    <label className="flex items-center justify-between gap-4 border-t border-[#d7e6ef] pt-3"><div><strong>Optional analytics</strong><p className="text-xs text-[#6b8594]">Loads Clarity; may set third-party cookies and collect usage data.</p></div><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)} className="h-5 w-5 accent-[#3588b5]"/></label>
  </div>}
  <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={()=>apply(true)} className="rounded-xl bg-[#182c3c] px-4 py-3 text-xs font-extrabold text-white">Accept all</button><button type="button" onClick={()=>apply(false)} className="rounded-xl border border-[#9ccfe8] bg-[#e7f6ff] px-4 py-3 text-xs font-extrabold text-[#1d5d80]">Reject optional</button>{custom?<button type="button" onClick={()=>apply(analytics)} className="rounded-xl border border-[#c4d7e3] px-4 py-3 text-xs font-extrabold">Save preferences</button>:<button type="button" onClick={()=>setCustom(true)} className="rounded-xl border border-[#c4d7e3] px-4 py-3 text-xs font-extrabold">Customize</button>}</div>
  <p className="mt-4 text-xs text-[#657f8e]"><Link href="/privacy" className="font-bold underline">Privacy policy</Link> · <Link href="/cookies" className="font-bold underline">Cookie policy</Link> · <Link href="/terms" className="font-bold underline">Terms</Link></p>
 </div>;
}
export function CookieSettingsButton({className="",children}){return <button type="button" className={className} onClick={()=>window.dispatchEvent(new Event("fugth:open-cookie-settings"))}>{children||"Cookie settings"}</button>}
