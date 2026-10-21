"use client";
import {useState} from "react";
import {auth} from "../lib/firebase";
const quick=[
 "Make the buttons purple",
 "Give it a black and white theme",
 "Use a bold industrial design",
 "Show the gallery and FAQ",
 "Make the site more spacious",
 "Use a premium editorial look"
];
export default function FounderSiteEditChat({prospect,site,onApplied}){
 const [input,setInput]=useState(""),[busy,setBusy]=useState(""),[messages,setMessages]=useState([
  {kind:"agent",text:"Tell me how you want this business's website to look. I can edit its existing FUGTH colors, layout, sections and headings. I'll show you exactly what I plan to change before anything is saved."}
 ]),[proposal,setProposal]=useState(null),[model,setModel]=useState("1.5b");
 async function call(data){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in to your founder account again.");
  const r=await fetch("/api/dev/prospect-site-agent",{method:"POST",cache:"no-store",
   headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({...data,prospectId:prospect.id})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(j.error||"The website editing agent couldn't complete that step.");
  return j;
 }
 async function ask(request=input){
  const phrase=String(request||"").trim();if(!phrase||busy)return;
  setInput("");setProposal(null);setBusy("plan");
  setMessages(old=>[...old,{kind:"me",text:phrase},{kind:"agent",text:"Reviewing this site's design controls and preparing safe edits…",pending:true}]);
  try{
   const j=await call({action:"plan",request:phrase,model});
   setProposal(j);
   setMessages(old=>[...old.filter(m=>!m.pending),{kind:"agent",text:"I found "+j.actions.length+" existing Site Maker controls to change. Review the proposed actions below; nothing has been applied yet."}]);
  }catch(e){
   setMessages(old=>[...old.filter(m=>!m.pending),{kind:"agent",text:e.message}]);
  }finally{setBusy("")}
 }
 async function apply(){
  if(!proposal||busy)return;
  setBusy("apply");
  try{
   const j=await call({action:"apply",planId:proposal.planId});
   setMessages(old=>[...old,{kind:"agent",text:j.message||"Your saved preview has been updated."}]);
   setProposal(null);onApplied?.(j.site,j.revision);
  }catch(e){setMessages(old=>[...old,{kind:"agent",text:e.message}]);setProposal(null)}
  finally{setBusy("")}
 }
 return <section className="overflow-hidden rounded-[25px] border border-[#c9e1ef] bg-white text-[#1e455d]">
  <header className="bg-[#112f43] px-5 py-6 text-white sm:px-7">
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9ccfe8]">FUGTH SITE MAKER / AGENT TOOLS</p>
   <h3 className="mt-2 text-2xl font-black">Tell your website what to change.</h3>
   <p className="mt-2 text-xs leading-6 text-[#b7d4e5]">Editing {site?.name||prospect.businessName}. The agent calls existing Site Maker controls only. No new code, no automatically published site, no fabricated business claims.</p>
  </header>
  <div className="space-y-3 bg-[#f3f9fd] p-4 sm:p-6" role="log" aria-live="polite">
   {messages.map((m,i)=><div key={i} className={"max-w-[94%] rounded-2xl p-4 text-sm leading-6 "+(m.kind==="me"?"ml-auto bg-[#214d68] text-white":"bg-white text-[#244c65] shadow-sm")}>
    {m.text} {m.pending&&<span className="animate-pulse text-[#4192c0]">•••</span>}
   </div>)}
   {proposal&&<div className="rounded-2xl border border-[#a8d4ea] bg-white p-5">
    <p className="text-[10px] font-black uppercase text-[#5693b1]">Proposed changes · {proposal.provider==="site_tools"?"Fast FUGTH tools":proposal.provider==="openai"?"GPT assisted":"GGUF assisted"}</p>
    <div className="mt-3 space-y-2">{proposal.actions.map(a=><div key={a.field} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1edf5] py-2 text-xs">
     <strong>{a.label}</strong><span className="max-w-[70%] break-all font-mono text-[#44738c]">{String(a.value)}</span></div>)}</div>
    <p className="mt-3 text-[11px] text-[#7895a6]">Changes will be applied to this business's saved Firestore preview, not to its live website. The business owner can request further adjustments after claiming the site.</p>
    <div className="mt-4 flex flex-wrap gap-2">
     <button disabled={!!busy} onClick={apply} className="rounded-xl bg-[#197956] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy==="apply"?"Saving…":"✓ Apply these Site Maker changes"}</button>
     <button disabled={!!busy} onClick={()=>{setProposal(null);setMessages(old=>[...old,{kind:"agent",text:"Proposal discarded. Nothing changed."}])}} className="rounded-xl border px-5 py-3 text-xs font-bold">Discard</button>
    </div>
   </div>}
  </div>
  <form onSubmit={e=>{e.preventDefault();ask()}} className="border-t border-[#d6e8f1] p-4 sm:p-6">
   <label className="block text-xs font-black">Your design instruction
    <textarea value={input} maxLength={800} rows={3} onChange={e=>setInput(e.target.value)}
     className="mt-2 w-full rounded-xl border border-[#c2dce9] p-4 text-sm outline-none" placeholder="Make the header black, buttons purple, use a modern look, show the gallery…"/></label>
   <div className="mt-3 flex flex-wrap items-center gap-3">
    <label className="text-xs font-bold">GGUF reasoning size
     <select disabled={!!busy} value={model} onChange={e=>setModel(e.target.value)} className="ml-2 rounded-lg border p-2 text-xs"><option value="1.5b">1.5B</option><option value="0.5b">0.5B</option></select></label>
    <button type="submit" disabled={!input.trim()||!!busy} className="rounded-xl bg-[#164c68] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy==="plan"?"Planning…":"Propose website changes ↗"}</button>
   </div>
   <div className="mt-4 flex flex-wrap gap-2">
    {quick.map(q=><button type="button" key={q} disabled={!!busy} onClick={()=>ask(q)} className="rounded-full border border-[#c5deea] bg-[#edf8fe] px-3 py-2 text-[11px] font-bold text-[#285d7d] disabled:opacity-40">{q}</button>)}
   </div>
   <p className="mt-3 text-[11px] leading-5 text-[#7797a9]">Ordinary color and layout requests run as local FUGTH tool plans without using inference tokens. More complex design instructions may use the configured MEPLIFEOS GGUF (or optional OpenAI API if enabled). Unsupported content becomes a suggested clarification, not a made-up change.</p>
  </form>
 </section>;
}
