"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";

function normalize(raw){
 const digits=String(raw||"").replace(/\D/g,"");
 return digits.length===10?"+1"+digits:digits.length===11&&digits.startsWith("1")?"+"+digits:"";
}
const input="mt-2 block w-full rounded-xl border border-[#d8e0d3] bg-white px-4 py-3.5 text-sm text-[#253528] outline-none focus:border-[#69835e]";
const FALLBACK_FOCUS=[
 {id:"balanced",label:"Balanced — questions, prices & booking"},
 {id:"booking",label:"Booking — appointment requests"},
 {id:"pricing",label:"Pricing — estimates & costs"},
 {id:"information",label:"Information — services & FAQs"}
];
const FALLBACK_SCENARIOS=[
 {id:"auto",label:"Automatic — match my industry"},
 {id:"new-customer",label:"New customer asking questions"},
 {id:"quote",label:"Customer requesting a quote"},
 {id:"schedule",label:"Customer requesting an appointment"}
];
function formatUnlockDate(until){const date=new Date(until||"");return Number.isFinite(date.getTime())?date.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"Not available";}
function formatRemaining(seconds){
 const minutes=Math.ceil(Math.max(0,seconds)/60);
 return minutes>=60?Math.floor(minutes/60)+"h "+(minutes%60)+"m":minutes+"m";
}
export default function ReceptionistPreview({user,workspace,onGoPhoneSetup,adminMode=false}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true);
 const [phone,setPhone]=useState("");
 const [focus,setFocus]=useState("balanced"),[scenario,setScenario]=useState("auto");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [consent,setConsent]=useState(false),[call,setCall]=useState(null);
 const [pollCount,setPollCount]=useState(0);
 const [cooldownUntil,setCooldownUntil]=useState(null),[remaining,setRemaining]=useState(0);
 async function headers(){
  const active=auth?.currentUser||user;
  if(!active)throw Error("Your FUGTH session is still opening. Retry in a moment.");
  const token=await active.getIdToken();
  if(!token)throw Error("Please refresh your FUGTH session.");
  return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
 }
 async function load(){
  setLoading(true);setError("");
  try{
   const res=await fetch("/api/receptionist-preview?view="+(adminMode?"admin":"customer"),{headers:await headers(),cache:"no-store"});
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||"Preview service unavailable.");
   setData(json);
   setCooldownUntil(adminMode?null:(json.cooldownUntil||null));
   setPhone(value=>value||workspace?.phoneSetup?.businessPhone||workspace?.phone||"");
  }catch(e){setError(e.message||"Could not load demo settings.");setData({available:false});}
  finally{setLoading(false);}
 }
 useEffect(()=>{load()},[user?.uid,adminMode]);
 useEffect(()=>{
  const update=()=>setRemaining(cooldownUntil?Math.max(0,Math.ceil((new Date(cooldownUntil).getTime()-Date.now())/1000)):0);
  update();const timer=setInterval(update,15000);return()=>clearInterval(timer);
 },[cooldownUntil]);
 useEffect(()=>{
  if(!call?.callId||(["ended","failed"].includes(call.status)&&call.recordingSaved&&call.saved&&call.leadSaved&&call.summary)||pollCount>=30)return;
  let stopped=false;
  const timer=setInterval(async()=>{
   try{
    const res=await fetch("/api/receptionist-preview?callId="+encodeURIComponent(call.callId),{headers:await headers(),cache:"no-store"});
    const data=await res.json();
    if(!stopped&&res.ok){setCall(prev=>({...prev,status:data.status,summary:data.summary,endedReason:data.endedReason,saved:data.saved===true,leadSaved:data.leadSaved===true,leadId:data.leadId||null,recordingSaved:data.recordingSaved===true,recordingAvailable:data.recordingAvailable===true}));setPollCount(n=>n+1);}
   }catch{}
  },5000);
  return()=>{stopped=true;clearInterval(timer)};
 },[call?.callId,call?.status,call?.recordingSaved,pollCount]);
 async function startCall(){
  setBusy(true);setError("");setMessage("");setCall(null);setPollCount(0);
  const target=normalize(phone);
  if(!consent){setError("Please confirm you own or have permission to use this number.");setBusy(false);return;}
  if(!target){setError("Enter a valid US phone number.");setBusy(false);return;}
  if(!adminMode&&remaining>0){setError("Your next demo is available in "+formatRemaining(remaining)+".");setBusy(false);return;}
  try{
   const res=await fetch("/api/receptionist-preview",{
    method:"POST",headers:await headers(),cache:"no-store",
    body:JSON.stringify({phone:target,focus,scenario,consent:true,view:adminMode?"admin":"customer",businessName:workspace?.businessName,businessType:workspace?.businessType})
   });
   const json=await res.json().catch(()=>({}));
   if(!adminMode&&json.cooldownUntil)setCooldownUntil(json.cooldownUntil);
   if(!res.ok)throw Error(json.error||"Could not start the live demo.");
   setCall({callId:json.callId,status:json.status,businessName:json.businessName});
   setMessage("Call requested! Answer your phone and pretend you're calling "+(json.businessName||"your business")+".");
  }catch(e){setError(e.message||"The call could not be connected.");}
  finally{setBusy(false);}
 }
 const business=data?.business?.name||workspace?.businessName||"your business";
 const industry=data?.business?.industryName||workspace?.businessType||"local business";
 const available=data?.available===true;
 return <section className="overflow-hidden rounded-[26px] border border-[#303f35] bg-[#1b2b24] text-white shadow-[0_28px_80px_rgba(24,42,31,.14)]">
  <div className="grid gap-7 p-6 sm:p-9 lg:grid-cols-[1.2fr_.8fr]">
   <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#b9cbb9]">LIVE RECEPTIONIST DEMO</p>
    <h3 className="mt-4 max-w-xl text-[clamp(2rem,5vw,3.7rem)] font-semibold leading-[1.07] tracking-[-.07em]">Hear your business <span className="font-serif italic text-[#e1c5a8]">answer.</span></h3>
    <p className="mt-4 max-w-lg text-sm leading-7 text-[#c1cdc2]">Your FUGTH receptionist answers using your business name and details. Try booking, pricing, or customer questions.</p>
    <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-white/20 px-3 py-2 text-xs text-[#d6e0d5]">{business}</span><span className="rounded-full border border-white/20 px-3 py-2 text-xs text-[#d6e0d5]">{industry}</span></div>
   </div>
   <div className="rounded-[20px] border border-white/15 bg-white/[.07] p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-[#e1c5a8]">How it works</p>
    <p className="mt-3 text-sm leading-7 text-[#e8efe5]"><strong>Answer the call and act like you called your business.</strong> The AI will greet you as its receptionist.</p>
    <p className="mt-4 rounded-xl bg-white/10 p-3 text-xs leading-6 text-[#cbd8c7]">{adminMode?"Admin test mode · No cooldown · No SMS verification · 30-second calls":"30-second live demo · One test every 3 hours per account and phone number · No SMS verification."}</p>
    <p className="mt-3 text-xs leading-6 text-[#b8c9bc]">Appointments and prices are examples only. Nothing is booked or charged on the demo.</p>
   </div>
  </div>
  <div className="bg-[#fdfdf9] px-6 py-7 text-[#26352b] sm:px-9 sm:py-9">
   {loading?<p className="text-sm text-[#78887b]">Loading your live demo…</p>:!available?
    <div className="rounded-xl border border-[#e6e4dc] bg-[#f8f7f2] p-5"><p className="font-semibold">Demo service unavailable</p><p className="mt-2 text-sm text-[#869184]">{error||data?.reason||"The calling connection needs to be configured."}</p></div>:
    <>
     <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-[#536958]">What should the AI focus on?
       <select value={focus} onChange={e=>setFocus(e.target.value)} className={input}>
        {(data.focusOptions||FALLBACK_FOCUS).map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
       </select>
      </label>
      <label className="text-xs font-semibold text-[#536958]">What kind of call?
       <select value={scenario} onChange={e=>setScenario(e.target.value)} className={input}>
        {(data.scenarioOptions||FALLBACK_SCENARIOS).map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
       </select>
      </label>
     </div>
     {data?.warning&&<p role="alert" className="mb-4 rounded-xl border border-[#f0d9c2] bg-[#fff8f1] p-4 text-xs text-[#936b42]">{data.warning}</p>}
     <label className="mt-5 block text-xs font-semibold text-[#536958]">Number to call
      <input type="tel" autoComplete="tel" inputMode="tel" placeholder="(305) 555-0140" value={phone} onChange={e=>setPhone(e.target.value)} className={input+" text-base"}/>
     </label>
     <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-6 text-[#6e806e]">
      <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#305237]"/>
      <span>I own this number or have explicit permission to receive a one-time FUGTH demo call.</span>
     </label>
     {!adminMode&&remaining>0&&<div className="mt-5 rounded-xl border border-[#e7dfca] bg-[#fdf9ed] p-4 text-sm text-[#806f40]">Your next demo unlocks on <strong>{formatUnlockDate(cooldownUntil)}</strong> (in {formatRemaining(remaining)}). Your administrator may reset the limit.</div>}
     <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={startCall} disabled={busy||!consent||(!adminMode&&remaining>0)||!normalize(phone)||Boolean(call?.callId&&!["ended","failed"].includes(call.status))} className="rounded-xl bg-[#253c2d] px-7 py-4 text-sm font-semibold text-white disabled:opacity-40">{busy?"Connecting…":adminMode&&["ended","failed"].includes(call?.status)?"Run another admin test ↗":"Call me for a live demo ↗"}</button>
      <button type="button" onClick={onGoPhoneSetup} className="rounded-xl border border-[#e1e8db] px-5 py-4 text-sm font-semibold text-[#687d65]">Business phone settings</button>
     </div>
     {message&&<p role="status" className="mt-5 rounded-xl border border-[#d8e5d4] bg-[#f1f7ee] p-4 text-sm text-[#4e6d4b]">{message}</p>}
     {error&&<p role="alert" className="mt-5 rounded-xl border border-[#ecd8ca] bg-[#fff5ec] p-4 text-sm text-[#966441]">{error}</p>}
     {call?.callId&&<div className="mt-5 rounded-xl border border-[#dee8d7] bg-[#f3f8ef] p-5"><p className="text-sm font-semibold">Live demo call requested</p><p className="mt-2 text-xs text-[#6e866b]">Status: {call.status||"Connecting"}</p>{call.summary&&<p className="mt-3 text-sm leading-6 text-[#465a49]">{call.summary}</p>}{["ended","failed"].includes(call.status)&&<p className="mt-2 text-xs text-[#617563]">{call.recordingSaved&&call.leadSaved?"Audio and customer lead saved. Open Call Library to listen and review the lead.":call.saved?"Call saved. Open Call Library to retrieve audio and follow-up details while analysis finishes.":"Saving the call summary and customer lead…"}</p>}</div>}
     <div className="mt-5 rounded-xl border border-[#dbe5d7] bg-[#f6faf3] p-4 text-xs leading-6 text-[#657663]"><strong>Need more than 30 seconds?</strong> <a href="mailto:fugthmanagement@gmail.com?subject=FUGTH%20extended%20AI%20receptionist%20demo" className="font-bold underline underline-offset-2">Request a longer guided demonstration</a> with the FUGTH management team. Email is the quickest way to reach us. Or book an appointment with the management team through the website.</div>
     <p className="mt-6 text-xs leading-6 text-[#909b90]">{adminMode?"Founder tests have no customer-demo cooldown, but calls still consume voice credits.":"Live calls use paid calling resources; limits keep demo access fair for everyone."} No SMS verification required.</p>
    </>}
  </div>
 </section>;
}
