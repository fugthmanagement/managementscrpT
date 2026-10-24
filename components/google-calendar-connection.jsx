"use client";
import {useCallback,useEffect,useState} from "react";
import {GoogleAuthProvider,linkWithPopup} from "firebase/auth";
import {auth} from "../lib/firebase";
const btn="min-h-[48px] rounded-xl border border-[#bbd9e8] bg-white px-4 py-3 text-xs font-black text-[#225874] disabled:opacity-40";
const primary="min-h-[48px] rounded-xl bg-[#174760] px-5 py-3 text-xs font-black text-white disabled:opacity-40";
/**
 * Customer Settings → Connections: Calendar only.
 * Never requests a Drive, Sheets or Gmail scope for business onboarding.
 * Owner's Google connection is separate from Firebase Google sign-in.
 */
export default function GoogleCalendarConnection(){
 const [google,setGoogle]=useState(null),[health,setHealth]=useState(null),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
 const googleLoginLinked=auth?.currentUser?.providerData?.some(p=>p.providerId==="google.com");
 const request=useCallback(async(method="GET",path="/api/integrations/google",body)=>{
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in before connecting your calendar.");
  const r=await fetch(path,{method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    ...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"Google Calendar is temporarily unavailable.");
  return data;
 },[]);
 const refresh=useCallback(async()=>{
  try{const data=await request();setGoogle(data);if(!data.configured)setMessage(data.error||"Google Calendar setup is incomplete.")}
  catch(e){setMessage(e.message)}
 },[request]);
 useEffect(()=>{refresh()},[refresh]);
 useEffect(()=>{
  const q=new URLSearchParams(window.location.search).get("integration");
  if(!q)return;
  const msg={
   "google-connected":"Google Calendar authorization saved. Verify the calendar and your booking alerts below.",
   "authorization-cancelled":"Google Calendar authorization was cancelled or denied. If your Google app is in Testing, add your email as an authorized test user in Google Cloud → Audience.",
   "google-refresh-missing":"Google did not provide offline access. Reconnect and approve Calendar permission.",
   "google-invalid-client":"Google OAuth client configuration needs to be corrected by FUGTH.",
   "google-authorization-expired":"Google authorization expired. Please reconnect.",
   "authorization-error":"Google Calendar authorization could not finish. Check tester access, enabled Calendar API and callback URL."
  }[q]||"Google Calendar connection needs attention.";
  setMessage(msg);
 },[]);
 async function execute(name,fn){
  setBusy(name);setMessage("");
  try{await fn()}catch(e){setMessage(e.message||"Google Calendar operation failed.")}finally{setBusy("")}
 }
 const start=()=>execute("connect",async()=>{
  const data=await request("POST","/api/integrations/google",{feature:"core"});
  if(!data.url)throw Error("Could not start Calendar authorization.");
  window.location.assign(data.url);
 });
 const prepare=()=>execute("prepare",async()=>{
  const data=await request("POST","/api/integrations/google/prepare");
  setMessage(data.notice||"Your business calendar is set up.");
  await refresh();
 });
 const test=()=>execute("test",async()=>{
  const data=await request("GET","/api/integrations/google/health");
  setHealth(data);
  setMessage(data.ready?"Google Calendar is connected and the business calendar exists.":"Calendar access is incomplete. Check the details below.");
  await refresh();
 });
 const sync=()=>execute("sync",async()=>{
  const data=await request("POST","/api/integrations/google/sync");
  setMessage(data.message||"Calendar synchronized.");
 });
 const unlink=()=>execute("disconnect",async()=>{
  if(!window.confirm("Disconnect your Google Calendar? New appointments may stop syncing until you reconnect."))return;
  await request("DELETE","/api/integrations/google");
  await refresh();setHealth(null);setMessage("Google Calendar disconnected.");
 });
 const linkLogin=()=>execute("link",async()=>{
  if(!auth?.currentUser)throw Error("Sign in with your email account first.");
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"});
  try{
   await linkWithPopup(auth.currentUser,provider);
   setMessage("Google sign-in linked to this FUGTH account. Connect Google Calendar below to approve booking access separately.");
  }catch(e){
   if(["auth/credential-already-in-use","auth/email-already-in-use"].includes(e.code))
    throw Error("That Google login already belongs to another account. Sign into the original account first; FUGTH will not merge customer accounts automatically.");
   if(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment")
    throw Error("Your browser blocked the Google linking popup. Calendar syncing still works using the Connect Calendar button; linking login is optional.");
   throw Error("Could not link Google sign-in. Your FUGTH email login remains unchanged.");
  }
 });
 const ready=google?.calendarAuthorized&&google?.calendarProvisioned&&google?.calendarOwnerConnected;
 return <div className="space-y-4">
  <section className="rounded-[24px] border border-[#c7e0ed] bg-white p-5 text-[#1a4258] sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div><p className="text-[10px] font-black uppercase tracking-widest text-[#5a91ac]">Bookings / Google Calendar</p>
     <h3 className="mt-2 text-2xl font-black">Your business calendar, on your phone.</h3>
     <p className="mt-2 max-w-2xl text-xs leading-6 text-[#65869a]">Connect Google Calendar once. FUGTH creates a private calendar for your business and puts confirmed bookings on it. You do not need to give FUGTH access to Google Drive.</p>
    </div>
    <span className={"rounded-xl px-3 py-2 text-[11px] font-black "+(ready?"bg-[#ddf7e7] text-[#176449]":"bg-[#eaf4fc] text-[#377191]")}>{ready?"Calendar connected":"Connection needed"}</span>
   </div>
   <div className="mt-4 rounded-2xl border border-[#d5e7ef] bg-[#f4faff] p-4 text-xs leading-6">
    <p><strong>Account:</strong> {google?.connectedEmail||"Not connected yet"}</p>
    <p><strong>FUGTH calendar:</strong> {google?.calendarProvisioned?google.calendarName||"Created":"Pending setup"}</p>
    <p><strong>New-booking email alerts:</strong> {google?.calendarAlertsConfigured?"Configured":"Not yet confirmed"}</p>
    <p className="mt-2 text-[#6a8c9c]">Google Calendar and your phone control push notifications. Enable Google Calendar notifications on your iPhone to receive reminders. New-event email alerts can also notify you through Gmail.</p>
   </div>
   <div className="mt-4 flex flex-wrap gap-2">
    <button type="button" disabled={!!busy||!google?.configured} onClick={start} className={primary}>{busy==="connect"?"Connecting…":google?.calendarAuthorized?"Reconnect Calendar ↗":"Connect Google Calendar ↗"}</button>
    {google?.calendarAuthorized&&<button type="button" disabled={!!busy} onClick={prepare} className={btn}>{busy==="prepare"?"Preparing…":"Set up calendar & booking alerts ↻"}</button>}
    <button type="button" disabled={!!busy||!google?.calendarAuthorized} onClick={test} className={btn}>Check connection</button>
    <button type="button" disabled={!!busy||!ready} onClick={sync} className={btn}>Sync appointments</button>
    {google?.calendarAuthorized&&<button type="button" disabled={!!busy} onClick={unlink} className={btn}>Disconnect</button>}
   </div>
   {!google?.configured&&<p className="mt-3 text-xs text-amber-800">Google Calendar access is not fully configured on the FUGTH server. Contact the FUGTH administrator.</p>}
   {health&&<div className="mt-3 rounded-xl bg-[#eff8fc] p-3 text-xs leading-6"><p><strong>Google API:</strong> {health.calendar?.ok?"Available":"Needs attention"}</p><p><strong>Business calendar:</strong> {health.calendarProvisioned?"Ready":"Needs setup"}</p><p><strong>Alerts:</strong> {health.calendarAlertsConfigured?"Configured":"Not confirmed"}</p>{health.error&&<p>{health.error}</p>}</div>}
   {message&&<p role="status" className="mt-4 rounded-xl bg-[#edf8ff] p-3 text-xs leading-6">{message}</p>}
  </section>
  <section className="rounded-2xl border border-[#d4e7f0] bg-[#f0f9fe] p-5 text-[#27566e]">
   <strong className="text-sm">iPhone setup for notifications</strong>
   <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-6">
    <li>Install or open Google Calendar using the same Google account that you connected here.</li>
    <li>Make sure the calendar named FUGTH — your business is checked and visible in Google Calendar.</li>
    <li>In iPhone Settings → Notifications, allow notifications for Google Calendar. In Google Calendar Settings, enable notifications for your FUGTH calendar.</li>
    <li>For immediate booking-created alerts, also enable Gmail notifications for that Google account; these are email alerts, not guaranteed iPhone push.</li>
   </ol>
   <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-black underline">Open Google Calendar ↗</a>
  </section>
  {!googleLoginLinked&&<details className="rounded-2xl border border-[#d5e7f0] bg-white p-5 text-[#365d73]">
   <summary className="cursor-pointer text-sm font-black">Optional: also use Google to sign in to FUGTH</summary>
   <p className="mt-2 text-xs leading-6">If you created your FUGTH account with an email and password, you can link Google as another sign-in option. This does not replace your account and is separate from Calendar permission.</p>
   <button type="button" onClick={linkLogin} disabled={!!busy} className={"mt-3 "+btn}>{busy==="link"?"Linking…":"Link Google sign-in ↗"}</button>
  </details>}
 </div>;
}
