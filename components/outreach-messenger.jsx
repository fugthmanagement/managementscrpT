"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {auth} from "../lib/firebase";
import {defaultTextbackSettings,renderTextbackMessage,isEligibleMissedCall} from "../lib/textback-flow";
const input="mt-2 w-full rounded-xl border border-[#cbdde9] bg-white px-4 py-3 text-sm text-[#17394e] focus:outline-none focus:ring-2 focus:ring-[#9ed7ef]";
const button="rounded-xl border border-[#b7d8e9] bg-white px-4 py-3 text-xs font-bold text-[#245a78] disabled:opacity-40";
export default function OutreachMessenger({user,businessName="",founder=false}){
 const [config,setConfig]=useState(()=>defaultTextbackSettings(businessName));
 const [info,setInfo]=useState(""),[backendError,setBackendError]=useState(""),[busy,setBusy]=useState(""),
  [events,setEvents]=useState([]),[outcome,setOutcome]=useState("missed"),[optOut,setOptOut]=useState(false),
  [simulation,setSimulation]=useState(null);
 async function token(){const t=await auth.currentUser?.getIdToken();if(!t)throw Error("Sign in to FUGTH first.");return t}
 async function request(path,method="GET",data){
  const res=await fetch("/api/textback/"+path,{method,cache:"no-store",
   headers:{Authorization:"Bearer "+await token(),"Content-Type":"application/json"},
   body:data?JSON.stringify(data):undefined});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error([body.error,body.code?"("+body.code+")":""].filter(Boolean).join(" "));
  return body;
 }
 async function load(){
  setBusy("load");setBackendError("");
  try{
   const value=await request("settings");setConfig(x=>({...x,...value.config}));
   const activity=await request("flow").catch(()=>({events:[]}));
   setEvents(activity.events||[]);
   setInfo("Saved FUGTH settings loaded. SMS delivery is disabled until your provider is connected.");
  }catch(e){setBackendError(e.message||"Couldn't reach private text-back settings.");
   setInfo("You can still preview the flow. Changes are not saved to Firestore while the backend is offline.")}
  finally{setBusy("")}
 }
 useEffect(()=>{if(user?.uid)load()},[user?.uid]);
 function patch(key,value){setConfig(x=>({...x,[key]:value}));setInfo("Unsaved settings — review and save when the backend is connected.")}
 async function save(){
  setBusy("save");
  try{
   const result=await request("settings","POST",config);
   setConfig(result.config);setInfo(result.message);setBackendError("");
  }catch(e){setBackendError(e.message);setInfo("Nothing was saved to Firestore. No messages were sent.")}
  finally{setBusy("")}
 }
 async function simulate(){
  const eligible=isEligibleMissedCall({outcome,answered:outcome==="answered",smsOptOut:optOut});
  const local={outcome,mode:"simulation",status:eligible?"preview_message_prepared":"skipped",
   sampleMessage:eligible?renderTextbackMessage(config):"",
   reason:optOut?"sms_opt_out":outcome==="answered"?"call_answered":"provider_not_connected",
   smsSent:false,createdAt:new Date().toISOString()};
  setSimulation(local);
  try{
   const event=await request("flow","POST",{action:"simulate",outcome,smsOptOut:optOut});
   setEvents(old=>[{...event,id:event.eventId},...old].slice(0,40));
   setInfo("Simulated flow saved privately. No real text was sent.");
  }catch{setInfo("Flow preview ran locally. Firestore is offline, so the simulation was not saved or sent.")}
 }
 return <section className="overflow-hidden rounded-[25px] border border-[#d4e6ee] bg-white text-[#1b3c51]">
  <header className="bg-[#123148] p-6 text-white sm:p-8">
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a5d8f1]">FUGTH / OUTREACH MESSENGER</p>
   <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Missed call → automatic text-back.</h2>
   <p className="mt-3 max-w-3xl text-xs leading-6 text-[#c2e1ee]">Configure your business message now, simulate the flow, and connect a supported phone/SMS provider later. FUGTH stores your preferences in your private workspace. It never claims a text was sent before a provider verifies delivery.</p>
   <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">Plan: $49.99/month</span><span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">Provider not connected · Sending OFF</span>{founder&&<span className="rounded-full bg-white/10 px-3 py-2 text-xs">Founder flow console</span>}</div>
  </header>
  <div className="space-y-6 p-5 sm:p-7">
   {backendError&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><strong>Private Firestore sync unavailable.</strong> {backendError}. The form remains editable locally, but do not assume changes were saved.</div>}
   <div className="grid gap-5 md:grid-cols-2">
    <label className="text-xs font-bold">Business display name<input className={input} maxLength={90} value={config.businessName||""} onChange={e=>patch("businessName",e.target.value)}/></label>
    <label className="text-xs font-bold">Business SMS number (later)<input className={input} placeholder="+13055550149" maxLength={25} value={config.phoneNumber||""} onChange={e=>patch("phoneNumber",e.target.value)}/></label>
    <label className="text-xs font-bold">Preferred provider<select className={input} value={config.preferredProvider||"not_selected"} onChange={e=>patch("preferredProvider",e.target.value)}>
     <option value="not_selected">Choose later</option><option value="twilio">Twilio</option><option value="telnyx">Telnyx</option><option value="vapi_number">Vapi-connected phone number (SMS integration separate)</option><option value="other">Other supported SMS provider</option></select></label>
    <label className="text-xs font-bold">Reply delay<select className={input} value={config.replyDelaySeconds||0} onChange={e=>patch("replyDelaySeconds",Number(e.target.value))}>{[0,30,60,120,300].map(seconds=><option key={seconds} value={seconds}>{seconds===0?"Immediately":seconds+" seconds"}</option>)}</select></label>
   </div>
   <label className="block text-xs font-bold">Preset missed-call reply<textarea rows={4} className={input} maxLength={500} value={config.messageTemplate||""} onChange={e=>patch("messageTemplate",e.target.value)}/></label>
   <p className="text-[11px] leading-6 text-[#668399]">Available personalized fields: <code>{"{{business}}"}</code> and <code>{"{{caller}}"}</code>. The customer must have a reachable, SMS-enabled provider number. Carrier and messaging registration costs are separate.</p>
   <div className="rounded-xl bg-[#f0f9ff] p-4"><strong className="text-xs">Message preview</strong><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{renderTextbackMessage(config,"customer")}</p></div>
   <div className="flex flex-wrap items-center gap-3">
    <button type="button" className="rounded-xl bg-[#1a5372] px-5 py-3 text-xs font-black text-white disabled:opacity-50" onClick={save} disabled={Boolean(busy)}>{busy==="save"?"Saving…":"Save message & flow"}</button>
    <button type="button" className={button} disabled={Boolean(busy)} onClick={load}>Refresh Firestore</button>
    <Link className="text-xs font-bold text-[#17688a] underline" href="/plans?plan=textback">View Text-Back plan ↗</Link>
   </div>
   <section className="rounded-2xl border border-[#d9e9f0] bg-[#fafcff] p-4 sm:p-6">
    <p className="text-[10px] font-black uppercase tracking-widest text-[#6e8a9b]">Live flow simulator · No SMS charges</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["1","Call ends","Missed/unanswered outcome"],["2","Check rules","Opt-out, duplicate, provider"],["3","Reply or skip","Text only when verified"]].map(([num,name,desc])=><div key={num} className="rounded-xl border bg-white p-4"><span className="text-[10px] font-black text-[#2383ad]">STEP {num}</span><p className="mt-2 text-sm font-bold">{name}</p><p className="mt-1 text-xs leading-5 text-[#7794a4]">{desc}</p></div>)}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-xs font-bold">Test call outcome<select className={input} value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="missed">Missed call</option><option value="no_answer">No answer</option><option value="busy">Busy</option><option value="answered">Answered (should NOT text)</option></select></label>
     <label className="flex items-center gap-2 self-end rounded-xl border p-3 text-xs font-bold"><input type="checkbox" checked={optOut} onChange={e=>setOptOut(e.target.checked)}/> Caller opted out</label></div>
    <button type="button" className="mt-4 rounded-xl bg-[#1f506e] px-5 py-3 text-xs font-bold text-white" onClick={simulate}>Run safe simulation</button>
    {simulation&&<div className="mt-4 rounded-xl border border-[#c6e4f1] bg-white p-4 text-xs"><strong>{simulation.status==="skipped"?"✓ Correctly skipped":"✓ Message prepared (not sent)"}</strong><p className="mt-2 whitespace-pre-wrap leading-6">{simulation.sampleMessage||simulation.reason}</p></div>}
    <div className="mt-4"><h3 className="text-xs font-black">Recent saved simulations</h3><div className="mt-2 max-h-44 space-y-2 overflow-auto">{events.slice(0,12).map(e=><p key={e.id} className="rounded-lg bg-white p-3 text-[11px]">{e.outcome} · {e.status} · {e.createdAt?new Date(e.createdAt).toLocaleString():""} · SMS sent: no</p>)}{!events.length&&<p className="text-xs text-[#8497a3]">No saved events yet.</p>}</div></div>
   </section>
   <p role="status" className="text-xs leading-6 text-[#65889a]">{info||"Configure your business preset message to get started. Sending is disabled until provider onboarding."}</p>
  </div>
 </section>;
}
