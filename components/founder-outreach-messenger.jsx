"use client";
import {useEffect,useState} from "react";
import {doc,onSnapshot,setDoc,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {DEFAULT_TEXTBACK,cleanTextbackSettings,composeTextback} from "../lib/missed-call-textback";

const field="mt-2 w-full rounded-xl border border-[#cbdeeb] bg-white px-3 py-3 text-sm text-[#21465b]";
export default function FounderOutreachMessenger({user,workspace={},founderOnly=false}){
 const [config,setConfig]=useState(DEFAULT_TEXTBACK),[loading,setLoading]=useState(true),
  [busy,setBusy]=useState(false),[note,setNote]=useState(""),[provider,setProvider]=useState(null),
  [simulate,setSimulate]=useState("(305) 555-0149");
 useEffect(()=>{
  if(!user?.uid||!db)return;
  return onSnapshot(doc(db,"users",user.uid,"knowledge","missedCallTextback"),
   snap=>{setConfig({...DEFAULT_TEXTBACK,...cleanTextbackSettings(snap.data()||{})});setLoading(false)},
   ()=>{setLoading(false);setNote("Saved messaging settings could not be read. Verify Firebase account permissions.")});
 },[user?.uid]);
 async function checkProvider(){
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in first.");
   const r=await fetch("/api/dev/outreach-messenger-status",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Unavailable");
   setProvider(j);
  }catch(e){setNote(e.message)}
 }
 useEffect(()=>{if(user?.uid&&founderOnly)checkProvider()},[user?.uid,founderOnly]);
 async function save(){
  if(!user?.uid||!db)return;
  setBusy(true);setNote("");
  try{
   const next=cleanTextbackSettings(config);
   await setDoc(doc(db,"users",user.uid,"knowledge","missedCallTextback"),
    {...next,type:"missed_call_textback",updatedAt:serverTimestamp()},{merge:true});
   setNote("Saved to your existing Firebase business settings. Nothing was texted.");
  }catch(e){setNote("Could not save: "+String(e?.message||"Firebase permission denied"))}
  finally{setBusy(false)}
 }
 const preview=composeTextback(config,workspace||{},simulate)||"Enter a US phone number.";
 return <section className="rounded-[26px] border border-[#cae3f1] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.19em] text-[#387aa0]">FUGTH · OUTREACH MESSENGER</p>
    <h3 className="mt-2 text-xl font-black text-[#173e54]">Missed-call text-back automation</h3>
    <p className="mt-2 text-xs leading-6 text-[#5f8195]">Control automatic replies with your existing Firebase account. Enable only after connecting an SMS-capable number and confirming messaging compliance. FUGTH does not send or charge for a test here.</p>
   </div>
   {founderOnly&&<button type="button" onClick={checkProvider} className="rounded-xl border border-[#b6d5e6] px-4 py-3 text-xs font-bold">Check connections</button>}
  </div>
  {founderOnly&&<div className="mt-5 grid gap-3 sm:grid-cols-3">
   {[["Vapi call events",provider?.vapiConfigured],["SMS sender configured",provider?.smsConfigured],["Firebase site account",Boolean(user?.uid)]].map(([label,ok])=>
    <div className={"rounded-xl border p-4 text-xs "+(ok?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50")} key={label}>
     <strong>{ok?"✓ Ready":"Not ready"}</strong><p className="mt-1 text-[#496374]">{label}</p>
    </div>)}
  </div>}
  <div className="mt-6 grid gap-5 md:grid-cols-2">
   <div className="space-y-4">
    <label className="flex items-start gap-3 rounded-xl border p-4 text-xs font-bold">
     <input type="checkbox" className="mt-1" checked={config.enabled===true} onChange={e=>setConfig(s=>({...s,enabled:e.target.checked}))}/>
     Enable automatic missed-call text-back for this business
    </label>
    <label className="block text-xs font-bold">Preset response with business name
     <textarea className={field} rows={5} maxLength={320} value={config.message||""}
      onChange={e=>setConfig(s=>({...s,message:e.target.value}))}/>
    </label>
    <p className="text-[11px] leading-5 text-[#678498]">Supported tokens: {"{{business}}"} and {"{{phone}}"}. Every outgoing message includes STOP instructions.</p>
    <label className="block text-xs font-bold">Minimum time before texting the same caller again
     <select className={field} value={config.minimumRepeatHours||24} onChange={e=>setConfig(s=>({...s,minimumRepeatHours:Number(e.target.value)}))}>
      <option value={1}>1 hour</option><option value={6}>6 hours</option><option value={24}>24 hours</option><option value={72}>3 days</option><option value={168}>7 days</option>
     </select>
    </label>
    <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
     <input type="checkbox" className="mt-1" checked={config.complianceAttested===true}
      onChange={e=>setConfig(s=>({...s,complianceAttested:e.target.checked}))}/>
     I will only enable transactional missed-call replies on my authorized business number, respect opt-outs and carrier policies, and complete any required messaging registration.
    </label>
    <button disabled={loading||busy||!user?.uid} onClick={save} className="rounded-xl bg-[#153d57] px-6 py-4 text-sm font-bold text-white disabled:opacity-50">
     {busy?"Saving…":"Save automation settings"}
    </button>
    {note&&<p role="status" className="rounded-xl bg-[#eff8fc] p-3 text-xs leading-6">{note}</p>}
   </div>
   <aside className="space-y-4 rounded-2xl bg-[#f1f8fe] p-5">
    <h4 className="text-sm font-black">Live flow preview · no SMS sent</h4>
    <label className="block text-xs font-semibold">Example caller number
     <input className={field} value={simulate} onChange={e=>setSimulate(e.target.value)}/>
    </label>
    <div className="rounded-xl border border-[#c8e1ec] bg-white p-4 text-sm leading-7 text-[#2e566b]">
     {preview}
    </div>
    <p className="text-xs leading-6 text-[#6f8898]">Call missed → Vapi confirms the call record → FUGTH checks your enabled settings, caller cooldown and opt-outs → connected SMS carrier sends → message and caller are recorded. Without a connected sender, delivery is disabled.</p>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">SMS carrier charges and registration requirements are separate from FUGTH pricing. Selling a $49.99 package does not make carrier texts free.</p>
   </aside>
  </div>
 </section>;
}
