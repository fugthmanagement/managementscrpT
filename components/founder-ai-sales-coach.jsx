"use client";
import {useEffect,useState} from "react";
import {collection,limit,onSnapshot,orderBy,query} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
const starters=[
 "The owner asks: What does your AI receptionist actually do?",
 "The owner says: I'm too busy to talk right now.",
 "The gatekeeper says: The owner isn't available.",
 "The owner says: We already have someone answering phones.",
 "The owner says: No, I'm not interested.",
 "The owner is interested; ask for permission to email a preview and arrange a real appointment."
];
export default function FounderAiSalesCoach({user}){
 const [items,setItems]=useState([]),[prospectId,setProspectId]=useState(""),[situation,setSituation]=useState(starters[0]),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[meta,setMeta]=useState(null);
 useEffect(()=>{if(!user?.uid||!db)return;return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(500)),s=>{
  const x=s.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.type==="cold_call_prospect"&&!p.doNotCall&&p.status!=="do_not_call");
  setItems(x);setProspectId(v=>x.some(p=>p.id===v)?v:x[0]?.id||"");
 });},[user?.uid]);
 async function generate(){
  if(!prospectId||!situation.trim())return;
  setBusy(true);setError("");setDraft("");
  try{
   const token=await auth.currentUser?.getIdToken();
   const r=await fetch("/api/dev/ai-coach",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({prospectId,objective:situation})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"AI sales coach is unavailable");
   setDraft(j.draft||"");setMeta(j);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="rounded-[26px] border border-[#d8e8f2] bg-white p-5 text-[#244b62] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#679ebc]">FUGTH / LOCAL GGUF SALES COACH</p><h3 className="mt-2 text-2xl font-black">Practice the next response</h3><p className="mt-2 text-xs leading-6 text-[#6b8b9d]">Uses one selected saved prospect. Generates suggested words, not calls or calendar bookings. No false referral or relationship claims.</p></div><span className="rounded-full bg-[#e9f7ff] px-3 py-2 text-[10px] font-black">Qwen · selectable in Administration</span></div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-black">Prospect<select value={prospectId} onChange={e=>setProspectId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe2ec] bg-white px-3 py-3 text-xs"><option value="">Choose a saved prospect</option>{items.map(x=><option key={x.id} value={x.id}>{x.businessName} · {x.industry||"Business"}</option>)}</select></label>
   <label className="text-xs font-black">Scenario<select value={situation} onChange={e=>setSituation(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe2ec] bg-white px-3 py-3 text-xs">{starters.map(x=><option key={x}>{x}</option>)}</select></label>
  </div>
  <label className="mt-3 block text-xs font-black">What did the prospect say, and what do you want to do?<textarea maxLength={450} rows={3} value={situation} onChange={e=>setSituation(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe2ec] p-3 text-sm"/></label>
  <button onClick={generate} disabled={!prospectId||!situation.trim()||busy} className="mt-4 rounded-xl bg-[#173d54] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Consulting the GGUF…":"Generate suggested response"}</button>
  {error&&<p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  {draft&&<div className="mt-4 rounded-2xl bg-[#f1f9fe] p-5"><div className="flex justify-between gap-3"><strong className="text-sm">Suggested words — review before using</strong><button onClick={()=>navigator.clipboard?.writeText(draft)} className="text-xs font-black text-[#287aa7]">Copy</button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{draft}</p><p className="mt-3 text-[10px] text-[#7f9aaa]">Model: {meta?.model||"GGUF"} · Queue: {meta?.queueMs??"—"} ms · Inference: {meta?.inferenceMs??"—"} ms</p></div>}
 </section>;
}
