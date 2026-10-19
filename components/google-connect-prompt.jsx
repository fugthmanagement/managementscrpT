"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const STAMP="fugth_google_connect_dismiss_";
export default function GoogleConnectPrompt({user}){
 const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{
  const resume=()=>setBusy(false);
  window.addEventListener("pageshow",resume);
  return()=>window.removeEventListener("pageshow",resume);
 },[]);
 useEffect(()=>{
  if(!user?.uid||!auth)return;
  let active=true;
  (async()=>{
   try{
    const token=await auth.currentUser?.getIdToken();
    if(!token)return;
    const response=await fetch("/api/integrations/google",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
    const result=await response.json();
    const dismissed=Number(localStorage.getItem(STAMP+user.uid)||0)>Date.now();
    if(active)setStatus({...result,dismissed});
   }catch{if(active)setStatus({configured:false,connected:false,error:"Connection status unavailable"});}
  })();
  return()=>{active=false;};
 },[user?.uid]);
 if(!status||status.connected||status.dismissed)return null;
 const viaGoogle=user.providerData?.some(provider=>provider.providerId==="google.com");
 async function link(){
  if(!status.configured)return setNotice("FUGTH needs Google Cloud settings verified first. Open Settings → Connections to view the missing configuration.");
  setBusy(true);setNotice("");
  try{
   const token=await auth.currentUser.getIdToken();
   const response=await fetch("/api/integrations/google",{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({feature:"core"})
   });
   const result=await response.json();
   if(!response.ok||!result.url)throw Error(result.error||"Could not start Google authorization.");
   window.location.assign(result.url);
  }catch(e){setBusy(false);setNotice(e.message||"Connection unavailable.");}
 }
 return <section className="fugth-connect-prompt relative mb-7 overflow-hidden rounded-[24px] border border-[#a8d2e6] bg-[#e8f6fe] p-5 text-[#1a3f55] shadow-[0_12px_34px_rgba(29,94,135,.06)] sm:p-6">
  <span aria-hidden="true" className="absolute -right-12 -top-16 h-44 w-44 rounded-full border-[32px] border-white/50"/>
  <div className="relative flex flex-wrap items-center justify-between gap-5">
   <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#2d7ca5]">Connect your business tools</p>
    <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{viaGoogle?"You're signed in with Google. Now connect your workspace.":"Your FUGTH account can use Google Calendar and Drive."}</h3>
    <p className="mt-2 text-xs leading-6 text-[#547990]">Google sign-in doesn't grant Calendar or Drive access automatically. Approve the separate Google permissions to sync business bookings and privately archive call recordings to your own Google Drive. You can skip this and connect later.</p>
   </div>
   <div className="flex flex-wrap gap-2"><button onClick={link} disabled={busy} className="rounded-full bg-[#173a52] px-5 py-3 text-xs font-black text-white hover:bg-[#2b607b] disabled:opacity-50">{busy?"Connecting…":"Connect Calendar + Drive ↗"}</button><button onClick={()=>{try{localStorage.setItem(STAMP+user.uid,String(Date.now()+7*86400000))}catch{}setStatus(v=>({...v,dismissed:true}))}} className="rounded-full border border-[#a7cee3] bg-white px-5 py-3 text-xs font-bold">Not now</button></div>
  </div>
  {(notice||!status.configured)&&<p role="status" className="relative mt-3 text-xs font-bold text-[#976443]">{notice||"Google connection setup is pending. Check Settings → Connections for what's missing."}</p>}
  {status.oauth?.redirectUri&&<p className="relative mt-3 max-w-2xl break-all text-[11px] leading-5 text-[#60859a]">Google error 400? Add this exact callback in Google Cloud → Auth Platform → Clients: <code className="font-bold text-[#245c7c]">{status.oauth.redirectUri}</code></p>}
 </section>;
}
