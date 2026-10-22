"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const field="mt-2 w-full rounded-xl border border-[#c7dbe7] bg-white px-4 py-3 text-xs";
export default function FounderVapiSettings(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(""),[note,setNote]=useState("");
 const [numberId,setNumberId]=useState(""),[assistantId,setAssistantId]=useState("");
 const [renameId,setRenameId]=useState(""),[newName,setNewName]=useState("");
 const request=async(method,body)=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to FUGTH");
  const res=await fetch("/api/dev/vapi",{method,cache:"no-store",
   headers:{Authorization:"Bearer "+token,...(method==="POST"?{"Content-Type":"application/json"}:{})},
   body:body?JSON.stringify(body):undefined});
  const value=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(value.error||"Vapi update could not be completed");
  return value;
 };
 async function refresh(){setBusy("refresh");setNote("");
  try{const v=await request("GET");setData(v);
    const first=v.numbers?.items?.[0],a=v.assistants?.items?.[0];
    if(first&&!numberId)setNumberId(first.id);if(a&&!assistantId)setAssistantId(a.id);
  }catch(e){setNote(e.message)}finally{setBusy("")}
 }
 useEffect(()=>{refresh()},[]);
 async function save(body){
  setBusy(body.action);setNote("");
  try{
   if(!window.confirm("Apply this change to the connected live Vapi account?"))return;
   const result=await request("POST",body);setNote(result.message||"Saved");
   const v=await request("GET");setData(v);
  }catch(e){setNote(e.message)}
  finally{setBusy("")}
 }
 const numbers=data?.numbers?.items||[],assistants=data?.assistants?.items||[];
 return <section className="rounded-[25px] border border-[#cfe2ed] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#5a9aba]">FOUNDER / VAPI CONTROL</p>
    <h3 className="mt-2 text-xl font-black">Calling provider management</h3>
    <p className="mt-2 text-xs leading-6 text-[#708b9b]">Link an existing Vapi assistant to your existing business number or rename an assistant. No paid calls are initiated.</p></div>
   <button type="button" onClick={refresh} disabled={Boolean(busy)} className="rounded-xl border px-4 py-3 text-xs font-bold">Refresh Vapi</button>
  </div>
  <div className="mt-5 grid gap-5 lg:grid-cols-2">
   <div className="rounded-2xl bg-[#f3faff] p-5">
    <h4 className="text-sm font-black">Assign the AI receptionist to a number</h4>
    <label className="mt-4 block text-xs font-bold">Business phone number
     <select className={field} value={numberId} onChange={e=>setNumberId(e.target.value)}><option value="">Select number</option>
      {numbers.map(p=><option key={p.id} value={p.id}>{p.name||p.number||p.id} · {p.number||p.id}</option>)}</select>
    </label>
    <label className="mt-4 block text-xs font-bold">Existing assistant
     <select className={field} value={assistantId} onChange={e=>setAssistantId(e.target.value)}><option value="">Select assistant</option>
      {assistants.map(a=><option key={a.id} value={a.id}>{a.name||a.id}</option>)}</select>
    </label>
    <button type="button" disabled={!numberId||!assistantId||Boolean(busy)} className="mt-4 rounded-xl bg-[#173f58] px-5 py-3 text-xs font-bold text-white disabled:opacity-40"
     onClick={()=>save({action:"assign_assistant",phoneNumberId:numberId,assistantId})}>Update number routing</button>
   </div>
   <div className="rounded-2xl bg-[#f3faff] p-5">
    <h4 className="text-sm font-black">Edit existing assistant name</h4>
    <label className="mt-4 block text-xs font-bold">Assistant
     <select className={field} value={renameId} onChange={e=>setRenameId(e.target.value)}><option value="">Select assistant</option>
      {assistants.map(a=><option key={a.id} value={a.id}>{a.name||a.id}</option>)}</select>
    </label>
    <label className="mt-4 block text-xs font-bold">New name
     <input className={field} maxLength={70} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Business receptionist"/>
    </label>
    <button type="button" disabled={!renameId||newName.trim().length<2||Boolean(busy)} className="mt-4 rounded-xl border border-[#9bc7df] bg-white px-5 py-3 text-xs font-bold disabled:opacity-40"
     onClick={()=>save({action:"rename_assistant",assistantId:renameId,name:newName})}>Save assistant name</button>
    <p className="mt-4 text-[11px] leading-5 text-[#7192a6]">Voice model, prompt, and phone-number purchases remain separate actions in Vapi to avoid accidentally replacing live call settings or incurring provider charges.</p>
   </div>
  </div>
  {note&&<p role="status" className="mt-4 rounded-xl bg-[#fff4e5] p-4 text-xs leading-6 text-[#7b5e3d]">{note}</p>}
 </section>;
}
