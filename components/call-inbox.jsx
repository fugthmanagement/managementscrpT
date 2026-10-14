"use client";
import {useMemo,useState} from "react";
import {addDoc,collection,deleteDoc,doc,serverTimestamp,updateDoc} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import CallAudioPlayer from "./call-audio-player";
const transcriptText=value=>Array.isArray(value)?value.map(x=>typeof x==="string"?x:(x?.role||x?.speaker||"Speaker")+": "+(x?.text||x?.content||"")).join("\n"):String(value||"");
const callerName=call=>call.callerName||call.customerName||call.caller||call.from||call.phoneNumber||"Customer call";
const timestamp=call=>{
 const v=call.startedAt||call.createdAt||call.timestamp||call.endedAt;
 if(!v)return null;
 const d=v?.toDate?v.toDate():typeof v?.seconds==="number"?new Date(v.seconds*1000):new Date(v);
 return Number.isNaN(d.getTime())?null:d;
};
const clock=call=>timestamp(call)?.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"})||"Date unavailable";
const sortable=call=>timestamp(call)?.getTime()||0;
export default function CallInbox({calls=[],leads=[],user,locked=false,onPhoneSetup,onViewCustomer}){
 const [filter,setFilter]=useState("all"),[open,setOpen]=useState(""),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const visible=useMemo(()=>[...calls].sort((a,b)=>sortable(b)-sortable(a)).filter(call=>filter==="favorites"?call.favorite:filter==="appointments"?/book|appointment|schedul/i.test([call.outcome,call.intent,call.summary].join(" ")):true),[calls,filter]);
 async function change(call,patch){if(locked||!db||!user?.uid)return;setBusy(call.id);try{await updateDoc(doc(db,"users",user.uid,"calls",call.id),{...patch,updatedAt:serverTimestamp()});}catch(e){setNotice("Could not update this call.");}finally{setBusy("");}}
 async function remove(call){if(locked||!db||!user?.uid||!window.confirm("Delete this call recording and transcript from the library?"))return;setBusy(call.id);try{await deleteDoc(doc(db,"users",user.uid,"calls",call.id));setNotice("Call removed.");}catch{setNotice("Could not delete the call.");}finally{setBusy("");}}
 async function syncRecent(){
  if(locked||!auth.currentUser)return;
  setBusy("sync");setNotice("");
  try{
   const token=await auth.currentUser.getIdToken();
   const res=await fetch("/api/receptionist-preview/sync",{method:"POST",headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"Could not sync recent demos.");
   setNotice(data.matched?data.saved+" calls synced; "+Number(data.leads||0)+" CRM leads and "+Number(data.archived||0)+" recording archives processed. "+(data.failures?data.failures+" failed.":""):"No recent completed calls found in Vapi.");
  }catch(e){setNotice(e.message||"Call sync failed.");}
  finally{setBusy("");}
 }
 async function followUp(call){
  if(locked||!user?.uid||!db)return;
  setBusy(call.id);setNotice("");
  try{
   await addDoc(collection(db,"users",user.uid,"leads"),{
    type:"call_follow_up",source:"call_library",sourceCallId:call.providerCallId||call.id,
    businessName:"",contactName:callerName(call),phone:call.phone||"",
    service:call.summary||"",notes:"Follow up on call from "+clock(call),
    status:"follow_up",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
   });
   setNotice("Follow-up added to Customers, linked to this call.");
  }catch(e){setNotice("Couldn't create follow-up. Check database permissions.");}
  finally{setBusy("");}
 }
 const examples=[{id:"example-1",caller:"New customer",summary:"Asked about an estimate and availability.",duration:"0:15",createdAt:new Date().toISOString(),outcome:"Demo example"}];
 const records=locked&&!visible.length?examples:visible;
 return <section className="relative overflow-hidden rounded-[24px] border border-[#e3e6df] bg-white">
  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eceee9] px-5 py-5 sm:px-7">
   <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#969d91]">CALL LIBRARY</p><h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">Recordings, transcripts and follow-up</h3>
    <p className="mt-1 text-xs text-[#8a9586]">All times are shown in your device's local timezone. Completed demo calls are saved in Firestore.</p></div>
   <div className="flex flex-wrap gap-2">
    {!locked&&<button type="button" disabled={busy==="sync"} onClick={syncRecent} className="rounded-xl border border-[#dae5d4] bg-[#eff6ec] px-4 py-2.5 text-xs font-semibold text-[#395d3f]">{busy==="sync"?"Syncing…":"Sync recent demos"}</button>}
    <div className="flex rounded-xl bg-[#f3f5f0] p-1">{[["all","All"],["favorites","Favorites"],["appointments","Appointments"]].map(([id,label])=><button key={id} type="button" disabled={locked} onClick={()=>setFilter(id)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${filter===id?"bg-white text-[#27352a] shadow-sm":"text-[#81877e]"}`}>{label}</button>)}</div>
   </div>
  </div>
  {notice&&<p role="status" className="m-5 rounded-xl bg-[#f0f6ed] p-4 text-xs text-[#446046]">{notice}</p>}
  <div className={locked?"pointer-events-none select-none opacity-35 grayscale":""}>
   {records.length?<div className="divide-y divide-[#eceee9]">{records.map(call=>{
    const leadId="call_"+(call.providerCallId||call.id);
    const linked=leads.find(l=>l.id===leadId||l.sourceCallId===(call.providerCallId||call.id));
    const transcript=transcriptText(call.transcript);
    const expanded=open===call.id;
    const summary=call.summary||call.transcriptSummary||"Summary is not available yet.";
    return <article key={call.id} className="px-5 py-5 sm:px-7">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <button type="button" onClick={()=>setOpen(expanded?"":call.id)} className="min-w-0 flex-1 text-left">
       <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#30372f]">{callerName(call)}</strong>{call.favorite&&<span className="text-amber-500">★</span>}
        <span className="rounded-full bg-[#eef2eb] px-2.5 py-1 text-[10px] font-semibold text-[#5f6b5d]">{call.source==="fugth_demo"?"Live demo":call.outcome||call.status||"Recorded"}</span>
       </div>
       <p className="mt-2 text-xs font-semibold text-[#4b654e]"> <span aria-hidden="true">◷</span> {clock(call)}</p>
       <p className="mt-2 max-w-3xl text-xs leading-6 text-[#7c8279]">{summary}</p>
       <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#a0a59c]">{call.duration||"0:00"} · {call.phone||"Caller number unavailable"}</p>
      </button>
      <div className="flex items-center gap-1"><button type="button" disabled={busy===call.id} onClick={()=>change(call,{favorite:!call.favorite})} className="rounded-lg border border-[#e1e5dd] px-3 py-2 text-xs" aria-label={call.favorite?"Remove favorite":"Favorite call"}>{call.favorite?"★":"☆"}</button>
       <button type="button" onClick={()=>setOpen(expanded?"":call.id)} className="rounded-lg border border-[#e1e5dd] px-3 py-2 text-xs">{expanded?"Close":"Review"}</button>
      </div>
     </div>
     {expanded&&<div className="mt-5 grid gap-4 rounded-2xl bg-[#f7f8f5] p-4 lg:grid-cols-[.8fr_1.2fr]">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#939a90]">Call details</p>
       <p className="mt-2 text-xs text-[#637262]">Started: {clock(call)}</p>
       {call.endedAt&&<p className="mt-1 text-xs text-[#637262]">Ended: {clock({...call,createdAt:call.endedAt,startedAt:call.endedAt})}</p>}
       <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-[#939a90]">Recording</p>
       <CallAudioPlayer key={call.id} call={call} user={user}/>
       <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-[#939a90]">Rate AI handling</p>
       <div className="mt-2 flex gap-1">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>change(call,{ownerRating:n})} className={`text-2xl ${n<=Number(call.ownerRating||0)?"text-amber-500":"text-[#ccd1c9]"}`}>★</button>)}</div>
       <button type="button" disabled={busy===call.id} onClick={()=>followUp(call)} className="mt-4 rounded-xl bg-[#2c4934] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">Create customer follow-up ↗</button>
      </div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#939a90]">AI call summary</p>
       <p className="mt-3 rounded-xl bg-white p-4 text-xs leading-6 text-[#536453]">{summary}</p>
       <div className="mt-4 rounded-xl border border-[#d8e6d4] bg-[#edf5eb] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#738974]">Linked customer lead</p>
        <p className="mt-2 text-xs text-[#546d56]">Caller: {linked?.contactName||call.caller||call.phone||"Name not provided"}</p>
        <p className="mt-1 text-xs text-[#546d56]">Phone: {linked?.phone||call.phone||"Not captured"}</p>
        {linked?.email&&<p className="mt-1 break-all text-xs text-[#546d56]">Email: {linked.email}</p>}
        <p className="mt-2 text-xs leading-6 text-[#546d56]">Reason: {linked?.service||summary}</p>
        {(linked?.requestedDate||linked?.requestedTime)&&<p className="mt-2 text-xs font-semibold text-[#7c6742]">Appointment request: {[linked.requestedDate,linked.requestedTime].filter(Boolean).join(" · ")} · Awaiting calendar confirmation</p>}
        <p className="mt-2 text-[11px] leading-5 text-[#617660]">Contact details are only populated when supplied by the caller.</p>
        <button type="button" onClick={()=>onViewCustomer?.()} className="mt-3 text-xs font-bold text-[#34593b] underline">Open in Customers ↗</button>
       </div>
       <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-[#939a90]">Conversation transcript</p>
       <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-xs leading-6 text-[#596158]">{transcript||"No transcript was attached to this call."}</div>
       <div className="mt-4 flex justify-between gap-3"><button type="button" onClick={()=>{navigator.clipboard?.writeText(transcript||summary);setNotice("Call notes copied.");}} className="text-xs font-semibold text-[#466648]">Copy notes</button><button type="button" onClick={()=>remove(call)} className="text-xs font-semibold text-red-700">Delete call</button></div>
      </div>
     </div>}
    </article>;
   })}</div>:<div className="px-6 py-12 text-center"><p className="font-semibold">No calls recorded yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#888f85]">Complete a live demo or use “Sync recent demos” to recover calls from the last seven days.</p><button type="button" onClick={onPhoneSetup} className="mt-5 rounded-xl bg-[#28362b] px-5 py-3 text-sm font-semibold text-white">Set up your phone</button></div>}
  </div>
  {locked&&<div className="absolute inset-0 grid place-items-center bg-white/45 p-5 backdrop-blur-[2px]"><div className="max-w-md rounded-2xl border border-[#dce2d8] bg-white p-6 text-center shadow-xl"><h4 className="text-lg font-semibold">Your call library is ready</h4><p className="mt-2 text-sm leading-6 text-[#7b8378]">Upgrade to view recordings, transcripts, timestamps and follow-ups.</p></div></div>}
 </section>;
}
