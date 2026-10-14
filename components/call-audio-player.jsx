"use client";
import {useEffect,useRef,useState} from "react";
import {getBytes,getMetadata,ref,uploadBytes} from "firebase/storage";
import {auth,storage} from "../lib/firebase";
const isCallId=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value||""));
export default function CallAudioPlayer({call,user}){
 const [source,setSource]=useState("");
 const [loading,setLoading]=useState(false),[error,setError]=useState("");
 const [archived,setArchived]=useState(false),[warning,setWarning]=useState("");
 const ownedUrl=useRef("");
 useEffect(()=>()=>{if(ownedUrl.current)URL.revokeObjectURL(ownedUrl.current);},[]);
 const callId=call.providerCallId||call.id;
 async function load(){
  if(!isCallId(callId)){setError("This older call has no verified Vapi recording ID.");return;}
  setLoading(true);setError("");setWarning("");
  const path="users/"+user.uid+"/call-recordings/"+callId;
  const file=storage?ref(storage,path):null;
  try{
   if(file){
    try{
     // Access through the authenticated Firebase SDK; do not publish a permanent
     // Firebase download-token URL that bypasses Storage security rules.
     const [meta,bytes]=await Promise.all([getMetadata(file),getBytes(file,20*1024*1024)]);
     const blob=new Blob([bytes],{type:meta.contentType||"audio/mpeg"});
     if(ownedUrl.current)URL.revokeObjectURL(ownedUrl.current);
     ownedUrl.current=URL.createObjectURL(blob);
     setSource(ownedUrl.current);setArchived(true);return;
    }catch{/* A missing archive is normal for calls made before this update. */}
   }
   const token=await auth.currentUser?.getIdToken();
   if(!token)throw Error("Sign in to retrieve this private recording.");
   const response=await fetch("/api/calls/recording?callId="+encodeURIComponent(callId),{
    headers:{Authorization:"Bearer "+token},cache:"no-store"
   });
   if(!response.ok){
    const detail=await response.json().catch(()=>({}));
    throw Error(detail.error||"Recording is unavailable. Try again shortly.");
   }
   const blob=await response.blob();
   if(!blob.size||!blob.type.startsWith("audio/"))
    throw Error("The provider didn't return playable audio.");
   let saved=response.headers.get("x-fugth-archived")==="yes";
   if(file&&!saved){
    try{
     await uploadBytes(file,blob,{contentType:blob.type,cacheControl:"private, no-store"});
     saved=true;
    }catch{
     setWarning("Playback works, but Firebase Storage could not archive this audio. Deploy storage.rules and verify your Storage bucket.");
    }
   }
   if(ownedUrl.current)URL.revokeObjectURL(ownedUrl.current);
   ownedUrl.current=URL.createObjectURL(blob);
   setSource(ownedUrl.current);setArchived(saved);
  }catch(e){setError(e.message||"Unable to retrieve audio.");}
  finally{setLoading(false);}
 }
 return <div className="mt-3 space-y-3 rounded-2xl border border-[#dce7d8] bg-white p-4">
  {source?<>
   <audio aria-label="Private call recording" className="w-full" controls preload="metadata" src={source}>Your browser cannot play this recording.</audio>
   <div className="flex flex-wrap items-center gap-3 text-xs">
    <span className={archived?"font-semibold text-[#366648]":"text-[#8b7949]"}>{archived?"✓ Saved in your Firebase Storage account":"Playing securely from Vapi"}</span>
    <button type="button" onClick={load} disabled={loading} className="font-semibold text-[#456849] underline">Refresh audio</button>
    <a href={source} download={"fugth-call-"+callId} className="font-semibold text-[#456849] underline">Download</a>
   </div>
  </>:<>
   <p className="text-xs leading-6 text-[#738575]">Play this call privately, and save a permanent recording to your Firebase account when available.</p>
   <button type="button" onClick={load} disabled={loading} className="rounded-xl bg-[#294834] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{loading?"Retrieving recording…":"▶ Play & save recording"}</button>
  </>}
  {warning&&<p className="text-xs leading-6 text-[#a27e40]">{warning}</p>}
  {error&&<div role="alert" className="text-xs leading-6 text-[#a54842]">{error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button></div>}
 </div>;
}
