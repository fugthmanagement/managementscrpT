"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const btn="rounded-xl border border-[#b5d5e6] bg-white px-4 py-3 text-xs font-black text-[#174a66] disabled:opacity-50";
export default function FounderGgufConnection({onChanged}){
 const [key,setKey]=useState(""),[show,setShow]=useState(false),[status,setStatus]=useState(null);
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 async function request(action,payload={}){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in to your founder account again.");
  const res=await fetch("/api/dev/gguf-connection",{method:action==="load"?"GET":"POST",cache:"no-store",
   headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:action==="load"?undefined:JSON.stringify({action,...payload})});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(j.error||"Connection action failed.");
  return j;
 }
 async function refresh(){
  try{const j=await request("load");setStatus(j.health);return j}
  catch(e){setNotice(e.message)}
 }
 useEffect(()=>{refresh()},[]);
 async function perform(action){
  setBusy(action);setNotice("");
  try{
   const j=await request(action,action==="save"?{apiKey:key}:{});
   if(action==="save"){setKey("");setShow(false);setNotice(j.note||"Encrypted connection saved.");}
   else if(action==="test")setNotice("Authenticated model replied: "+String(j.testAnswer||"").slice(0,270));
   else if(action==="remove")setNotice(j.note||"Encrypted override removed.");
   await refresh();onChanged?.();
  }catch(e){setNotice(e.message)}finally{setBusy("")}
 }
 return <section className="rounded-2xl border border-[#8ebcd5] bg-[#f1faff] p-5 text-[#22445b]">
  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#5697b5]">FOUNDER ONLY / SECURE MODEL CONNECTION</p>
  <h4 className="mt-2 text-lg font-black">Connect MEPLIFEOS once</h4>
  <p className="mt-2 text-xs leading-6 text-[#65869a]">Your website should never ask visitors for the Hugging Face API key. FUGTH reads the Vercel secret automatically, or an encrypted Firestore override if you save one here. Nothing is stored in your browser.</p>
  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
   <span className="rounded-lg bg-white p-3">Space: <strong>{status?.online?"Reachable":"Not responding"}</strong></span>
   <span className="rounded-lg bg-white p-3">Secret source: <strong>{status?.source==="encrypted_firestore"?"Encrypted Firestore":status?.source==="vercel_environment"?"Vercel Environment":"Not configured"}</strong></span>
  </div>
  {status?.configWarning&&<p className="mt-3 text-xs text-amber-800">Note: Firestore encryption settings aren't readable. Server-side environment key fallback will still work if configured.</p>}
  <label className="mt-5 block text-xs font-black" htmlFor="fugth-gguf-secret">Space FUGTH_API_KEY — only to repair or rotate the connection</label>
  <div className="mt-2 flex gap-2">
   <input id="fugth-gguf-secret" type={show?"text":"password"} autoComplete="off" spellCheck={false}
    placeholder="Paste the Space secret once" value={key} onChange={e=>setKey(e.target.value)}
    className="min-w-0 flex-1 rounded-xl border border-[#b7d6e6] bg-white px-4 py-3 text-sm outline-none"/>
   <button className={btn} type="button" onClick={()=>setShow(x=>!x)}>{show?"Hide":"Show"}</button>
  </div>
  <div className="mt-3 flex flex-wrap gap-2">
   <button className="rounded-xl bg-[#1a5877] px-4 py-3 text-xs font-black text-white disabled:opacity-40"
    disabled={busy!==""||key.trim().length<12} onClick={()=>perform("save")}>{busy==="save"?"Encrypting…":"Save encrypted key"}</button>
   <button className={btn} disabled={busy!==""} onClick={()=>perform("test")}>{busy==="test"?"Testing model…":"Test authenticated inference"}</button>
   <button className={btn} disabled={busy!==""} onClick={()=>perform("ping")}>Refresh connection</button>
   {status?.source==="encrypted_firestore"&&<button className={btn} disabled={busy!==""} onClick={()=>{if(confirm("Remove saved key override and use the Vercel environment secret instead?"))perform("remove")}}>Use Vercel secret instead</button>}
  </div>
  {notice&&<p className="mt-4 rounded-xl bg-white p-3 text-xs leading-6" role="status">{notice}</p>}
  <p className="mt-3 text-[11px] leading-5 text-[#7a96a6]">The Hugging Face developer console itself may still ask for a test key. Your production chatbot, preview chats and GGUF tools do not use that browser console. Only the FUGTH server sends X-API-Key to Hugging Face.</p>
 </section>;
}
