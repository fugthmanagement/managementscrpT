"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const lengths=[15,30,45,60,90];
const cls="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950";
export default function FounderDemoControls({uid=null}){
 const [global,setGlobal]=useState(30),[seconds,setSeconds]=useState(30);
 const [info,setInfo]=useState(null),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 async function req(method="GET",data){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("FUGTH founder sign-in required.");
  const url="/api/dev/demo-settings"+(uid&&method==="GET"?"?uid="+encodeURIComponent(uid):"");
  const r=await fetch(url,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:data?JSON.stringify(data):undefined,cache:"no-store"});
  const v=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(v.error||"Couldn't load demo settings.");
  return v;
 }
 async function reload(){
  setBusy("loading");setNotice("");
  try{const d=await req();setInfo(d);setGlobal(d.global?.seconds||30);
   setSeconds(d.override?.seconds||d.global?.seconds||30);
   if(d.error)setNotice(d.error);
  }catch(e){setNotice(e.message||"FUGTH demo settings are unavailable.");}
  finally{setBusy("");}
 }
 useEffect(()=>{reload()},[uid]);
 async function save(action){
  setBusy(action);setNotice("");
  try{
   const res=await req("POST",action==="global"?{action,seconds:global}:
    action==="account"?{action,uid,seconds}:{action:"reset",uid});
   setNotice(action==="reset"?"Customer's next demo is unlocked.":
    action==="global"?"Saved for every new FUGTH demo.":"Customer's dedicated test duration saved.");
   await reload();return res;
  }catch(e){setNotice(e.message||"Could not save this change.");}
  finally{setBusy("");}
 }
 return <section className="rounded-2xl border border-zinc-200 bg-[#fafafa] p-5 sm:p-6">
  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">{uid?"SELECTED CUSTOMER":"GLOBAL FUGTH DEMO SETTINGS"}</p>
  <h4 className="mt-2 text-lg font-bold text-zinc-950">{uid?"Customer test access":"Live demo duration"}</h4>
  <p className="mt-2 text-xs leading-6 text-zinc-600">{uid?"Change just this customer's maximum call time, or reset their three-hour cooldown.":"Choose one duration for new FUGTH website and account demos. This updates the actual assistant call limit, not only the label."}</p>
  <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-40 text-xs font-bold text-zinc-600">Time limit<select value={uid?seconds:global} onChange={e=>uid?setSeconds(Number(e.target.value)):setGlobal(Number(e.target.value))} className={"mt-2 block "+cls}>{lengths.map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
   <button type="button" disabled={Boolean(busy)} onClick={()=>save(uid?"account":"global")} className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":"Save duration"}</button>
   {uid&&<button type="button" disabled={Boolean(busy)} onClick={()=>save("reset")} className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">Reset cooldown</button>}
  </div>
  {uid&&<p className="mt-4 text-xs text-zinc-500">Next eligible call: {info?.cooldown?.cooldownUntil?new Date(info.cooldown.cooldownUntil).toLocaleString():"Available or not used"} · Current override: {info?.override?.seconds||"global"} seconds</p>}
  {notice&&<p role="status" className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700">{notice}</p>}
 </section>;
}
