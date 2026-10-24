"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
/**
 * A browser connectivity diagnostic, not a second authentication system.
 * Never writes raw Firebase tokens to cookies or localStorage.
 */
export default function BrowserSessionHealth({user}){
 const [online,setOnline]=useState(true),[checked,setChecked]=useState(null),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const update=()=>{setOnline(navigator.onLine!==false);setChecked(null)};
  const onPageShow=()=>update();
  update();
  window.addEventListener("online",update);window.addEventListener("offline",update);
  window.addEventListener("pageshow",onPageShow);
  return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);window.removeEventListener("pageshow",onPageShow)};
 },[user?.uid]);
 async function verify(){
  if(busy)return;
  setBusy(true);
  try{
   if(!auth?.currentUser||auth.currentUser.uid!==user?.uid)throw Error("Your browser hasn't restored a signed-in session. Open Login once to reconnect.");
   const token=await auth.currentUser.getIdToken();
   if(!token)throw Error("Your saved session needs a new sign-in.");
   const result=await fetch("/api/me/access",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   if(!result.ok)throw Error("Your account is signed in, but the FUGTH account service couldn't verify it. Retry when connected.");
   setChecked({ok:true,text:"Session verified. You can close FUGTH and reopen it without choosing Log out."});
  }catch(e){setChecked({ok:false,text:e.message||"Connection check failed."})}
  finally{setBusy(false)}
 }
 return <section className="rounded-[24px] border border-[#c9e2ec] bg-[#f2faff] p-5 text-[#224e65]" aria-label="Browser and login connection">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#588ca6]">Browser connection</p><h3 className="mt-2 text-lg font-black">Stay signed in on this device</h3>
    <p className="mt-2 text-xs leading-6">FUGTH securely restores your Firebase login from this browser's first-party storage. It never stores your password or a login token in a regular website cookie. Signing out is a separate action.</p>
   </div>
   <span className={"rounded-xl px-3 py-2 text-xs font-black "+(online?"bg-[#ddf4e9] text-[#246746]":"bg-[#fff1d5] text-[#815a21]")}>{online?"Browser online":"Offline"}</span>
  </div>
  <p className="mt-3 text-xs">Account: <strong>{user?.email||"Unknown"}</strong> · Domain: <strong>{typeof window==="undefined"?"FUGTH":window.location.hostname}</strong></p>
  <p className="mt-2 text-xs leading-6 text-[#6f8796]">Use normal Safari, not Private Browsing, for the most reliable saved login. Clearing website data, revoking account access, or changing device can still require signing in again.</p>
  <button type="button" disabled={busy||!online} onClick={verify} className="mt-4 min-h-[48px] rounded-xl bg-[#1b4f6a] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Checking…":"Check my browser connection ↻"}</button>
  {checked&&<p role="status" className={"mt-3 rounded-xl p-3 text-xs leading-6 "+(checked.ok?"bg-[#e2f7ee] text-[#246249]":"bg-[#fff3e7] text-[#805326]")}>{checked.text}</p>}
 </section>;
}
