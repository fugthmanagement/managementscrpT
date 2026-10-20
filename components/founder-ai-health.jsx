"use client";
import {useCallback,useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const button="rounded-xl border border-[#c7dce8] bg-white px-4 py-2.5 text-xs font-bold text-[#285776] disabled:opacity-50";
const modelOptions=[["0.5b","Qwen 0.5B · faster"],["1.5b","Qwen 1.5B · richer"]];
const policyControls=[["websiteEnabled","Public website representatives"],["coldCallEnabled","Cold-call sales coach"],["emailEnabled","Business email drafting"]];
export default function FounderAiHealth(){
 const [data,setData]=useState(null),[working,setWorking]=useState(""),[notice,setNotice]=useState("");
 const [settings,setSettings]=useState(null);
 const fetchState=useCallback(async()=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
  const res=await fetch("/api/dev/ai-health",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||"Gateway check failed");
  setData(json);setSettings(json.policy);return json;
 },[]);
 useEffect(()=>{let mounted=true;fetchState().catch(e=>{if(mounted)setNotice(e.message)});const timer=setInterval(()=>{if(document.visibilityState==="visible")fetchState().catch(()=>{});},60000);return()=>{mounted=false;clearInterval(timer);};},[fetchState]);
 async function change(action){
  setWorking(action);setNotice("");
  try{
   const token=await auth.currentUser?.getIdToken();
   const res=await fetch("/api/dev/ai-health",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(action==="configure"?{action,policy:settings}:{action}),cache:"no-store"});
   const json=await res.json();if(!res.ok)throw Error(json.error||"Action failed");
   await fetchState();
   setNotice(action==="wake"?(json.health?.online?"Wake check reached MEPLIFEOS.":"Wake requested; the Space is not responding yet. A manually paused Space must be resumed on Hugging Face."):"Settings saved. Public website safety checks remain enabled.");
  }catch(e){setNotice(e.message||"Could not contact AI gateway.");}
  finally{setWorking("");}
 }
 const light=data?.light||"red";
 const live=data?.health||{};
 const dot=light==="green"?"bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,.13)]":light==="orange"?"bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,.13)]":"bg-rose-500 shadow-[0_0_0_5px_rgba(244,63,94,.13)]";
 return <section className="overflow-hidden rounded-[25px] border border-[#cce2ed] bg-white text-[#254357] shadow-[0_12px_38px_rgba(19,58,82,.06)]">
  <div className="flex flex-wrap items-start justify-between gap-4 bg-[#132c3e] p-6 text-white sm:p-7">
   <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#91d2f4]">MEPLIFEOS / HOSTED GGUF</p>
    <h3 className="mt-2 text-2xl font-black">AI operations & service health</h3>
    <p className="mt-2 text-xs leading-6 text-[#b6d2e2]">Secure connection to your Hugging Face 0.5B and 1.5B models. Secrets are stored on the FUGTH server.</p></div>
   <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-3"><span aria-hidden="true" className={"h-3 w-3 rounded-full "+dot}/><strong className="text-xs uppercase tracking-widest">{!data?"Checking":light==="green"?"Healthy":light==="orange"?"Busy / loading":"Offline / not configured"}</strong></div>
  </div>
  <div className="space-y-5 p-5 sm:p-7">
   <div className="flex flex-wrap gap-2">
    <button className={button} onClick={()=>fetchState().then(()=>setNotice("Gateway status refreshed.")).catch(e=>setNotice(e.message))} disabled={!!working}>Check connection</button>
    <button className={button} onClick={()=>change("wake")} disabled={!!working}>{working==="wake"?"Contacting…":"Wake up / ping GGUF"}</button>
    <a className={button} href="https://huggingface.co/spaces/fugthchat/MEPLIFEOS" target="_blank" rel="noopener noreferrer">Open Hugging Face Space ↗</a>
   </div>
   {notice&&<p role="status" className="rounded-xl bg-[#eff7fc] px-4 py-3 text-xs leading-6">{notice}</p>}
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[["Connection",live.online?"Responding":"Unavailable"],["Models loaded",(live.loadedModels||[]).join(" + ")||"None / unknown"],["Queue",String(live.queue??"—")+" / "+String(live.queueLimit??"—")],["Health response",live.latencyMs!=null?live.latencyMs+" ms":"—"],["Active model",live.activeModel||"Idle"],["Completed requests",live.completed??"—"],["Server default",live.defaultModel||"—"],["API key",data?.connection?.configured?"Configured":"Missing in Vercel"]].map(([k,v])=><div key={k} className="rounded-2xl border border-[#dfebf2] bg-[#f5faff] p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#7c9daf]">{k}</p><p className="mt-2 break-words text-sm font-bold text-[#26475e]">{v}</p></div>)}
   </div>
   {Object.keys(live.modelErrors||{}).length>0&&<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Model startup errors: {JSON.stringify(live.modelErrors)}</p>}
   <div className="rounded-xl border border-[#dcebf2] bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-black">Global model assignment</h4><p className="text-xs text-[#7894a6]">New customer website mode still requires the owner's opt-in</p></div>
    {settings&&<>
     <label className="mt-4 flex items-center gap-3 text-xs font-bold"><input type="checkbox" checked={settings.enabled!==false} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/> Master AI switch</label>
     <label className="mt-3 flex items-center gap-3 text-xs font-bold"><input type="checkbox" checked={settings.forceWebsiteModel===true} onChange={e=>setSettings({...settings,forceWebsiteModel:e.target.checked})}/> Force selected website model for every business (overrides each website's individual model selector)</label>
     <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[["websiteModel","Website default"],["coldCallModel","Cold calling"],["emailModel","Email drafting"]].map(([key,label])=><label className="text-xs font-bold" key={key}>{label}<select className="mt-2 w-full rounded-xl border border-[#d4e6ef] bg-[#f9fcff] px-3 py-3" value={settings[key]||"0.5b"} onChange={e=>setSettings({...settings,[key]:e.target.value})}>{modelOptions.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>)}
     </div>
     <div className="mt-4 grid gap-3 sm:grid-cols-3">{policyControls.map(([key,label])=><label key={key} className="flex items-center gap-2 rounded-xl bg-[#f3f9fc] p-3 text-xs font-semibold"><input type="checkbox" checked={settings[key]!==false} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/>{label}</label>)}</div>
     <button className="mt-5 rounded-xl bg-[#173c53] px-5 py-3 text-xs font-black text-white disabled:opacity-50" onClick={()=>change("configure")} disabled={!!working}>{working==="configure"?"Saving…":"Save global model controls"}</button>
    </>}
   </div>
   <p className="text-[11px] leading-6 text-[#829aa9]">The wake button makes a health request that may trigger a sleeping Space to start. It cannot unpause a Space that was manually paused. A green light confirms API readiness, not a guaranteed response time under load. Free CPU Basic uses a shared inference queue.</p>
  </div>
 </section>;
}
