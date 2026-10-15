"use client";
import {useEffect,useRef,useState} from "react";
import {auth} from "../lib/firebase";
const validId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||""));
export default function CallAudioPlayer({call}){
 const [source,setSource]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [archive,setArchive]=useState("");
 const objectUrl=useRef("");
 const id=call.providerCallId||call.id;
 useEffect(()=>()=>{if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);},[]);
 async function load(){
  if(!validId(id)){setError("This older call does not have a valid Vapi reference.");return;}
  setBusy(true);setError("");
  try{
   const token=await auth.currentUser?.getIdToken();
   if(!token)throw Error("Sign in to access this private recording.");
   const response=await fetch("/api/calls/recording?callId="+encodeURIComponent(id),{
    headers:{Authorization:"Bearer "+token},cache:"no-store"
   });
   if(!response.ok){
    const json=await response.json().catch(()=>({}));
    throw Error(json.error||"Recording could not be loaded. Retry shortly.");
   }
   const blob=await response.blob();
   if(!blob.size||!blob.type.startsWith("audio/"))
    throw Error("The recording service returned no playable audio.");
   if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);
   objectUrl.current=URL.createObjectURL(blob);
   setArchive(response.headers.get("x-fugth-archived")==="drive"?"drive":"temporary");
   setSource(objectUrl.current);
  }catch(error){setError(error.message||"Recording unavailable.");}
  finally{setBusy(false);}
 }
 return <div className="mt-3 rounded-2xl border border-[#dce7d8] bg-white p-4">
  {source?<div className="space-y-3">
   <audio aria-label="Private call recording" className="w-full" controls preload="metadata" src={source}>Recording playback is unavailable in this browser.</audio>
   <div className="flex flex-wrap gap-3 text-[11px]">
    <span className={archive==="drive"?"font-semibold text-[#356844]":"text-amber-800"}>{archive==="drive"?"✓ Archived privately in Google Drive":"Playing from Vapi · Drive archive pending"}</span>
    <a href={source} download={"fugth-call-"+id} className="font-semibold text-[#446f4b] underline">Download recording</a>
    <button type="button" onClick={load} disabled={busy} className="font-semibold text-[#446f4b] underline">Refresh</button>
   </div>
  </div>:<div className="space-y-3">
   <p className="text-xs leading-6 text-[#758576]">Your call stays private. Audio loads only when you press Play, and FUGTH archives it to your connected private Google Drive.</p>
   <button type="button" onClick={load} disabled={busy} className="rounded-xl bg-[#294834] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy?"Loading recording…":"▶ Play recording"}</button>
  </div>}
  {error&&<p role="alert" className="mt-3 text-xs leading-6 text-[#9a3d37]">{error} <button type="button" onClick={load} className="ml-2 font-bold underline">Retry</button></p>}
 </div>;
}
