"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
const focusOptions=[["balanced","All-around receptionist"],["pricing","Pricing and quotes"],["booking","Booking and appointments"],["information","Service questions"]];
const formatTime=until=>{
 const date=new Date(until||"");
 return Number.isFinite(date.getTime())?date.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"Unavailable";
};
export default function PublicVoiceDemo(){
 const [config,setConfig]=useState({available:false,reason:"Checking guest demo availability…"});
 const [form,setForm]=useState({businessName:"",businessType:"roofing",phone:"",focus:"balanced"});
 const [consent,setConsent]=useState(false),[token,setToken]=useState(""),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(""),[cooldownUntil,setCooldownUntil]=useState(null);
 const captcha=useRef(null),widget=useRef(null);
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||"";
 useEffect(()=>{
  fetch("/api/public-demo",{cache:"no-store"}).then(r=>r.json()).then(setConfig).catch(()=>setConfig({available:false,reason:"Guest calling is unavailable right now."}));
 },[]);
 useEffect(()=>{
  if(!config.available||!siteKey||!captcha.current)return;
  let canceled=false;
  const mount=()=>{
   if(canceled||!captcha.current||!window.turnstile||widget.current!==null)return;
   widget.current=window.turnstile.render(captcha.current,{
    sitekey:siteKey,theme:"light",
    callback:value=>setToken(value),
    "expired-callback":()=>setToken(""),
    "error-callback":()=>setToken("")
   });
  };
  if(window.turnstile){mount();return()=>{canceled=true;};}
  const script=document.createElement("script");
  script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async=true;script.onload=mount;document.head.appendChild(script);
  return()=>{canceled=true;};
 },[config.available,siteKey]);
 async function send(event){
  event.preventDefault();setBusy(true);setNotice("");
  try{
   if(!consent)throw Error("Please confirm you can receive this one-time call.");
   if(!token)throw Error("Complete the human verification first.");
   const res=await fetch("/api/public-demo",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...form,consent:true,turnstileToken:token,scenario:"auto"})});
   const data=await res.json().catch(()=>({}));
   if(data.cooldownUntil)setCooldownUntil(data.cooldownUntil);
   if(!res.ok)throw Error(data.error||"Guest demo could not start.");
   setNotice("Calling your phone now. Answer and pretend you're calling "+data.businessName+".");
  }catch(e){setNotice(e.message||"Unable to connect your demo.");}
  finally{setBusy(false);setToken("");try{if(widget.current!==null)window.turnstile?.reset(widget.current);}catch{}}
 }
 const cooling=cooldownUntil&&new Date(cooldownUntil)>new Date();
 return <section id="demo" className="relative scroll-mt-24 overflow-hidden border-y border-[#344735] bg-[#17281f] py-16 text-white sm:py-24">
  <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-[#486947] opacity-30 blur-[90px]"/>
  <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
   <div><p className="text-[11px] font-bold uppercase tracking-[.21em] text-[#b9d19e]">15-SECOND AI PHONE EXPERIENCE</p>
    <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.06] tracking-[-.07em] sm:text-6xl">Hear your own <span className="font-serif italic text-[#d4b996]">front desk.</span></h2>
    <p className="mt-6 max-w-xl text-sm leading-8 text-[#c2d1c1] sm:text-base">Give us your business name and choose what your AI should handle. When your phone rings, answer and pretend you called your own business.</p>
    <div className="mt-7 grid grid-cols-3 gap-2">{[["01","Pick your business"],["02","Answer your phone"],["03","Hear your receptionist"]].map(([n,t])=><div key={n} className="rounded-2xl border border-white/15 bg-white/5 p-4"><span className="text-xs font-bold text-[#c8ddba]">{n}</span><p className="mt-3 text-xs leading-5 text-[#dbe5d5]">{t}</p></div>)}</div>
    <p className="mt-5 text-xs leading-6 text-[#c5d4c2]">Need longer than 15 seconds? <a href="mailto:fugthmanagement@gmail.com?subject=Request%20a%20longer%20FUGTH%20demo" className="font-semibold text-white underline underline-offset-4">Request an extended demonstration</a> with our team.</p>
   </div>
   <form onSubmit={send} className="rounded-[26px] border border-white/20 bg-[#fdfdf9] p-6 text-[#29402e] shadow-[0_25px_90px_rgba(0,0,0,.14)] sm:p-8">
    <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold tracking-tight">Try the receptionist</h3><span className="rounded-full bg-[#eaf3e4] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#456849]">No paid plan</span></div>
    <p className="mt-2 text-xs leading-6 text-[#738572]">One call per number and network every three hours. US phone numbers only.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-semibold">Business name<input value={form.businessName} required maxLength={75} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Example: Acme Roofing" className="mt-2 w-full rounded-xl border border-[#dbe6d7] p-3 text-sm"/></label>
     <label className="text-xs font-semibold">Type of business<select value={form.businessType} onChange={e=>setForm({...form,businessType:e.target.value})} className="mt-2 w-full rounded-xl border border-[#dbe6d7] p-3 text-sm">{["roofing","dental","salon","restaurant","hvac","automotive","legal","landscaping","contractor","real estate","general"].map(v=><option key={v} value={v}>{v.replace(/^./,c=>c.toUpperCase())}</option>)}</select></label>
     <label className="text-xs font-semibold sm:col-span-2">What should your AI focus on?<select value={form.focus} onChange={e=>setForm({...form,focus:e.target.value})} className="mt-2 w-full rounded-xl border border-[#dbe6d7] p-3 text-sm">{focusOptions.map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label>
     <label className="text-xs font-semibold sm:col-span-2">Your phone number<input type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(305) 555-0123" required className="mt-2 w-full rounded-xl border border-[#dbe6d7] p-3 text-base"/></label>
    </div>
    <label className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#617963]"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#32583b]"/>I own this number or have permission for a recorded FUGTH demo call. My call details may be saved in the FUGTH demo account for follow-up; this does not opt me into marketing.</label>
    {config.available&&<div ref={captcha} className="mt-4 min-h-[66px]"/>}
    {cooling&&<p className="mt-3 rounded-xl bg-[#fff5e7] p-3 text-xs text-[#785e38]">Next guest demo unlocks: <strong>{formatTime(cooldownUntil)}</strong></p>}
    <button type="submit" disabled={!config.available||!token||!consent||busy||cooling} className="mt-5 w-full rounded-xl bg-[#2b4b35] px-5 py-4 text-sm font-bold text-white disabled:opacity-45">{busy?"Requesting your call…":"Call me for a free 15-second demo ↗"}</button>
    {!config.available&&<div className="mt-4 rounded-xl border border-[#e0e7da] bg-[#f5f8f2] p-4 text-xs leading-6 text-[#688069]">{config.reason} <Link href="/login?signup=1" className="font-bold underline underline-offset-2">Try from a free account ↗</Link></div>}
    {notice&&<p role="status" className="mt-4 rounded-xl bg-[#edf4e9] p-4 text-xs leading-6">{notice}</p>}
    <p className="mt-4 text-[10px] text-[#8a9986]">This brief voice demo makes an outbound call but acts like an incoming business call. No SMS verification or subscription is required when guest demo service is active.</p>
   </form>
  </div>
 </section>;
}
