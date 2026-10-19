"use client";

import {useEffect,useMemo,useState} from "react";

const clean=(value,max=120)=>String(value||"").replace(/[<>]/g,"").trim().slice(0,max);
const keyFor=site=>`fugth:customer-portal:v1:${site.ownerId||site.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
function read(key){try{return JSON.parse(localStorage.getItem(key)||"null")||{version:1,profile:null};}catch{return {version:1,profile:null};}}

export default function SiteCustomerAccess({site}){
 const enabled=site.previewMode===true&&site.customerPortal&&site.customerPortal!=="off";
 const storageKey=useMemo(()=>keyFor(site),[site]);
 const [open,setOpen]=useState(false),[screen,setScreen]=useState("welcome"),[profile,setProfile]=useState(null),[notice,setNotice]=useState(""),[form,setForm]=useState({name:"",email:"",address:""});
 useEffect(()=>{if(enabled)setProfile(read(storageKey).profile||null);},[enabled,storageKey]);
 if(!enabled)return null;
 function saveProfile(event){
  event.preventDefault();setNotice("");
  const next={name:clean(form.name,70),email:clean(form.email,120).toLowerCase(),address:clean(form.address,160),createdAt:new Date().toISOString()};
  if(!next.name||!next.email)return;
  if(screen==="signin"){
   const existing=read(storageKey).profile;
   if(!existing||existing.name.toLowerCase()!==next.name.toLowerCase()||existing.email!==next.email){
    setNotice("No matching local profile on this device. Use Create local account instead.");return;
   }
   setProfile(existing);setScreen("account");return;
  }
  try{localStorage.setItem(storageKey,JSON.stringify({version:1,profile:next}));}catch{setNotice("This browser has local storage disabled. Profile cannot be saved.");return;}
  setProfile(next);setScreen("account");
 }
 function continueGuest(){setProfile(null);setScreen("guest");}
 function reset(){localStorage.removeItem(storageKey);setProfile(null);setScreen("welcome");}
 const title=site.customerPortal==="appointments"?"Client appointments":"Client projects";
 return <div className="relative shrink-0">
  <button type="button" onClick={()=>{setOpen(true);setNotice("");setScreen(profile?"account":"welcome");}} className="rounded-full border border-current px-4 py-2 text-[11px] font-black uppercase tracking-[.12em]">{profile?"My account":"Client login"}</button>
  {open&&<div role="dialog" aria-modal="true" aria-label={`${site.name} client access`} className="fixed inset-0 z-[200] grid place-items-center bg-black/55 p-4" onMouseDown={()=>setOpen(false)}><section className="w-full max-w-lg border-2 border-black bg-white p-6 text-zinc-950 shadow-[10px_10px_0_#b9e5fb] sm:p-8" onMouseDown={event=>event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-800">{title}</p><h2 className="mt-2 text-2xl font-black tracking-tight">{profile?`Welcome back, ${profile.name}.`:"A simple client space."}</h2></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close client access" className="text-xl font-black">×</button></div>
   {notice&&<p role="status" className="mt-4 rounded-xl border border-[#a6d6ed] bg-[#edf8ff] p-3 text-sm text-[#21516a]">{notice}</p>}
   {screen==="welcome"&&<><p className="mt-4 text-sm leading-6 text-zinc-600">Create a basic account on this device to preview how a client area could feel. This website preview does not send account details to the business or FUGTH. Do not enter passwords, payment cards, or sensitive information.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setScreen("create")} className="bg-[#b9e5fb] px-4 py-4 text-sm font-black shadow-[4px_4px_0_#101216]">Create local account</button><button type="button" onClick={continueGuest} className="border border-black px-4 py-4 text-sm font-black">Continue as guest</button></div><button type="button" onClick={()=>setScreen("signin")} className="mt-5 text-xs font-bold underline underline-offset-4">Already used this browser? Reopen saved profile</button></>}
   {screen==="guest"&&<><div className="mt-6 border border-sky-200 bg-sky-50 p-4 text-sm leading-6"><strong>Guest mode is active.</strong><br/>You can browse, contact the business or request a service. Private client details stay hidden.</div><button type="button" onClick={()=>setOpen(false)} className="mt-6 w-full border border-black px-4 py-3 text-sm font-black">Back to website</button></>}
   {(screen==="create"||screen==="signin")&&<form className="mt-6 space-y-4" onSubmit={saveProfile}><p className="text-sm leading-6 text-zinc-600">{screen==="create"?"This creates a local preview profile only in this browser.":"Enter the same name and email used on this device. This only reopens a matching profile already saved in this browser. It is not secure authentication."}</p><label className="block text-xs font-black uppercase tracking-wide">Name<input required value={form.name} onChange={event=>setForm({...form,name:event.target.value})} className="mt-2 w-full border border-black p-3 text-sm"/></label><label className="block text-xs font-black uppercase tracking-wide">Email<input required type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} className="mt-2 w-full border border-black p-3 text-sm"/></label>{screen==="create"&&<label className="block text-xs font-black uppercase tracking-wide">Address (optional)<input value={form.address} onChange={event=>setForm({...form,address:event.target.value})} className="mt-2 w-full border border-black p-3 text-sm"/></label>}<button className="w-full bg-[#b9e5fb] px-4 py-3 text-sm font-black shadow-[4px_4px_0_#101216]">{screen==="create"?"Create on this device" :"Open saved profile"}</button></form>}
   {screen==="account"&&profile&&<><div className="mt-6 grid gap-3 sm:grid-cols-2"><article className="border border-black p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Your profile</p><p className="mt-3 font-black">{profile.name}</p><p className="mt-1 text-sm text-zinc-600">{profile.email}</p>{profile.address&&<p className="mt-1 text-sm text-zinc-600">{profile.address}</p>}</article><article className="border border-black bg-[#effaff] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">{site.customerPortal==="appointments"?"Appointments":"Work history"}</p><p className="mt-3 font-black">Nothing saved yet</p><p className="mt-1 text-sm text-zinc-600">Real records will require the business to enable its secure portal later.</p></article></div><p className="mt-4 text-[11px] leading-5 text-zinc-500">Local preview only. This data lives on this device and is not shared with the business.</p><div className="mt-6 flex gap-3"><button type="button" onClick={()=>setOpen(false)} className="flex-1 border border-black px-4 py-3 text-sm font-black">Continue browsing</button><button type="button" onClick={reset} className="px-4 py-3 text-xs font-black underline">Reset device data</button></div></>}
  </section></div>}
 </div>;
}
