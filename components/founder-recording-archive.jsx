"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
/** Admin-only private audio archive; never shown to customer connections. */
export default function FounderRecordingArchive({user}){
 const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function api(method="GET",body){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Founder sign-in required.");
  const r=await fetch("/api/integrations/google",{method,cache:"no-store",headers:{
   Authorization:"Bearer "+token,"Content-Type":"application/json"},
   ...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"Archive connection unavailable.");
  return data;
 }
 useEffect(()=>{let active=true;api().then(x=>{if(active)setStatus(x)}).catch(e=>{if(active)setNotice(e.message)});return()=>{active=false}},[user?.uid]);
 const archiveOwner=status?.archiveOwnerEmail||"";
 const mine=String(user?.email||"").trim().toLowerCase()===archiveOwner;
 async function connect(){
  setBusy(true);setNotice("");
  try{const d=await api("POST",{feature:"archive"});
   if(!d.url)throw Error("Google archive authorization could not start.");
   window.location.assign(d.url);
  }catch(e){setNotice(e.message)}finally{setBusy(false)}
 }
 return <details className="rounded-2xl border border-[#cadfea] bg-white p-5 text-[#244d62]">
  <summary className="cursor-pointer text-sm font-black">Founder-only private call recording archive</summary>
  <p className="mt-3 text-xs leading-6">Customer Google OAuth requests only Calendar permission. Existing call recordings and new audio continue to be privately managed in the configured founder account. Historical recordings retain their original storage pointers.</p>
  <p className="mt-2 text-xs"><strong>Archive owner:</strong> {archiveOwner||"Not configured in Vercel"}</p>
  <p className="mt-2 text-xs"><strong>Private Drive authorization:</strong> {status?.recordingDriveAuthorized?"Connected":"Not yet confirmed"} · This does not share recordings with customers.</p>
  {mine?<button type="button" disabled={busy} onClick={connect} className="mt-4 rounded-xl bg-[#193e55] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Connecting…":"Reconnect founder recording archive ↗"}</button>:
   <p className="mt-3 text-xs text-[#7a5e3e]">To authorize the archive, sign in to FUGTH with the configured recording archive owner account.</p>}
  {notice&&<p className="mt-3 text-xs" role="status">{notice}</p>}
 </details>;
}
