"use client";
import {useEffect,useRef,useState} from "react";
import {auth} from "../lib/firebase";
const button="rounded-xl border border-[#c9deeb] bg-white px-4 py-2.5 text-xs font-black text-[#24516e] disabled:opacity-40";
const stepNames={plan:"Choose approved layout",headline:"Create verified headline",description:"Create verified description",validate:"Check facts & assemble preview"};
const sampleGoals=["Build an elegant, spacious and modern site that focuses on our services and makes contacting us easy.","Make a bold, high-contrast contractor website emphasizing project inquiries and clear next steps.","Create a calm appointment-focused design with clear business hours, services, and a contact section."];
export default function AiSiteBuilder({uid,locked=false,onSaved}){
 const [goal,setGoal]=useState(sampleGoals[0]),[model,setModel]=useState("0.5b"),[job,setJob]=useState(null),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const cancel=useRef(false);
 const endpoint="/api/sites/"+encodeURIComponent(uid)+"/ai-build";
 async function api(action,body={}){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in to use AI Site Builder.");
  const response=await fetch(endpoint,{method:action==="get"?"GET":"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:action==="get"?undefined:JSON.stringify({action,...body}),cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Website builder unavailable.");
  if(data.job)setJob(data.job);
  return data;
 }
 useEffect(()=>{if(!uid||locked)return;api("get").catch(e=>setNotice(e.message));return()=>{cancel.current=true;};},[uid,locked]);
 async function start(){
  setBusy("start");setError("");setNotice("");cancel.current=false;
  try{await api("start",{goal,model});setNotice("Plan created. You can run its steps independently or build the full draft below.");}
  catch(e){setError(e.message)}finally{setBusy("");}
 }
 async function step(auto=false){
  if(!auto){setBusy("step");setError("");}
  try{
   const result=await api("step");
   if(result.step?.source!=="gguf"&&result.step?.source!=="fugth_validator")setNotice("GGUF was unavailable or uncertain; FUGTH used a verified fallback for "+result.step?.step+".");
   return result;
  }catch(e){setError(e.message);throw e;}
  finally{if(!auto)setBusy("");}
 }
 async function all(){
  cancel.current=false;setError("");setBusy("all");
  try{
   const remaining=4-(job?.stepIndex||0);
   for(let i=0;i<remaining&&!cancel.current;i++){
    const result=await step(true);
    if(result.job?.status==="ready")break;
   }
   setNotice(cancel.current?"Stopped after the current step. You can resume safely.":"Draft plan complete. Review the copy and layout before saving.");
  }catch{}
  finally{setBusy("");}
 }
 async function save(){
  setBusy("save");setError("");
  try{
   const result=await api("save");
   setNotice(result.message||"Saved as a private draft. Nothing was published.");
   if(onSaved)await onSaved();
  }catch(e){setError(e.message)}finally{setBusy("");}
 }
 return <section className="overflow-hidden rounded-[25px] border border-[#bcdbea] bg-white text-[#23475b]">
  <header className="bg-[#123349] p-6 text-white sm:p-7">
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a2d7f4]">FUGTH SITE MAKER / GOAL-BASED AI</p>
   <h3 className="mt-2 text-2xl font-black">Build a site with AI, not guesses</h3>
   <p className="mt-2 text-xs leading-6 text-[#c0d6e3]">Your goal becomes a small, resumable plan. Each model call handles one task. FUGTH's trusted theme and fact validators control what gets saved. Public publishing requires your separate approval.</p>
  </header>
  <div className="space-y-4 p-5 sm:p-7">
   {locked&&<p className="rounded-xl bg-[#fff4db] p-4 text-xs">Preview only. Activate a website plan to generate and save custom AI drafts.</p>}
   <label className="block text-xs font-black">Describe your website goal
    <textarea disabled={locked||!!busy} value={goal} maxLength={450} rows={3} onChange={e=>setGoal(e.target.value)} className="mt-2 w-full rounded-xl border border-[#c6e0ec] p-3 text-sm leading-6" placeholder="Describe colors, layout, audience and conversion goal. Business facts come from your saved profile."/>
   </label>
   <div className="flex flex-wrap gap-2">{sampleGoals.map((v,i)=><button type="button" key={i} disabled={locked||!!busy} className={button} onClick={()=>setGoal(v)}>Goal example {i+1}</button>)}</div>
   <div className="flex flex-wrap items-end gap-3">
    <label className="text-xs font-black">Planning model<select disabled={locked||!!busy} value={model} onChange={e=>setModel(e.target.value)} className="mt-2 block rounded-xl border border-[#c9e0ea] bg-white px-3 py-3 text-xs"><option value="0.5b">0.5B faster</option><option value="1.5b">1.5B richer</option></select></label>
    <button type="button" disabled={locked||!!busy||goal.trim().length<10} className="rounded-xl bg-[#1c516d] px-5 py-3 text-xs font-black text-white disabled:opacity-40" onClick={start}>{busy==="start"?"Creating goal…":"Start / replace goal"}</button>
   </div>
   {job&&<div className="space-y-4 rounded-2xl border border-[#d3e5ee] bg-[#f4fafe] p-4 sm:p-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h4 className="text-base font-black">Website-building plan</h4><p className="mt-1 text-[11px] text-[#678a9f]">{job.goal}</p></div><span className="rounded-full bg-white px-3 py-2 text-xs font-bold">{job.status} · {job.stepIndex||0}/4</span></div>
    <div className="grid gap-2 sm:grid-cols-2">{(job.steps||["plan","headline","description","validate"]).map((k,i)=><div key={k} className={"rounded-xl border p-3 text-xs "+(i<(job.stepIndex||0)?"border-emerald-200 bg-emerald-50":i===job.stepIndex?"border-sky-300 bg-sky-50":"border-[#dfeaf1] bg-white")}><p className="font-black">{i+1}. {stepNames[k]||k}</p><p className="mt-1 text-[10px]">{i<(job.stepIndex||0)?"Completed":i===job.stepIndex?"Next tool":"Pending"}</p></div>)}</div>
    {(job.events||[]).length>0&&<div className="rounded-xl bg-white p-3"><strong className="text-xs">Audit trail</strong><div className="mt-2 space-y-1">{job.events.map((e,i)=><p key={i} className="text-[11px] text-[#63849a]">{e.step} — {e.summary} ({e.source})</p>)}</div></div>}
    {job.draft&&<div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-black uppercase text-[#7a9cae]">Approved theme</p><p className="mt-2 font-bold">{job.draft.template||"Service Pro"}</p></div><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-black uppercase text-[#7a9cae]">Headline</p><p className="mt-2 text-sm font-bold">{job.draft.headline||"—"}</p></div><div className="rounded-xl bg-white p-4 sm:col-span-2"><p className="text-[10px] font-black uppercase text-[#7a9cae]">Description</p><p className="mt-2 text-sm leading-6">{job.draft.description||"—"}</p></div></div>}
    <div className="flex flex-wrap gap-2">
     {job.status!=="ready"&&job.status!=="saved"&&<><button disabled={locked||!!busy} className={button} onClick={()=>step().catch(()=>{})}>{busy==="step"?"Running step…":"Run next step"}</button><button disabled={locked||!!busy} className={button} onClick={all}>{busy==="all"?"Building draft…":"Run remaining steps"}</button>{busy==="all"&&<button className={button} onClick={()=>{cancel.current=true;setNotice("Stopping after the current task.");}}>Stop after current step</button>}</>}
     {job.status==="ready"&&<button disabled={locked||!!busy} className="rounded-xl bg-[#195c50] px-5 py-3 text-xs font-black text-white disabled:opacity-40" onClick={save}>{busy==="save"?"Saving…":"Save to Site Maker draft"}</button>}
     {job.status==="saved"&&<span className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">Saved privately — open the editor to review / publish separately</span>}
    </div>
   </div>}
   {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
   {notice&&<p role="status" className="rounded-xl bg-[#eaf7ff] p-3 text-xs text-[#28627f]">{notice}</p>}
   <p className="text-[11px] leading-5 text-[#7997a7]">No HTML, arbitrary scripts, database writes or public publishing are delegated to the model. Only fixed FUGTH website tools execute. A sleeping GGUF may make individual steps use an existing verified template instead.</p>
  </div>
 </section>;
}
