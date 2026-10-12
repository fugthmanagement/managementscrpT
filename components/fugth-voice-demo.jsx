"use client";
import { useEffect,useState } from "react";
import { auth } from "../lib/firebase";
import { sendEmailVerification } from "firebase/auth";

const INDUSTRIES = [
  {id:"roofing",label:"Roofing",icon:"⌂"},
  {id:"dental",label:"Dental",icon:"✳"},
  {id:"hvac",label:"Heating & cooling",icon:"❄"},
  {id:"automotive",label:"Auto repair",icon:"⚙"},
  {id:"legal",label:"Law office",icon:"⚖"},
  {id:"salon",label:"Salon",icon:"✿"},
  {id:"realestate",label:"Real estate",icon:"▦"},
  {id:"restaurant",label:"Restaurant",icon:"◈"},
  {id:"landscaping",label:"Landscaping",icon:"♧"},
  {id:"general",label:"Other business",icon:"◉"}
];
const ROLES=[
  {id:"receptionist",label:"Receptionist",example:"Greet and welcome callers"},
  {id:"sales",label:"Sales",example:"Friendly questions about services"},
  {id:"booking",label:"Appointments",example:"Help arrange a visit"},
  {id:"service",label:"Customer care",example:"Help with common requests"}
];
const MODES=[
  {id:"inbound",title:"I'm calling the business",sub:"The agent greets you as the front desk."},
  {id:"missed",title:"Return my missed call",sub:"Hear a natural missed-call follow-up."},
  {id:"website",title:"Follow up on my inquiry",sub:"Try a callback about a website request."},
  {id:"appointment",title:"Help with an appointment",sub:"Experience a scheduling conversation."}
];
async function authorization(){const token=await auth.currentUser?.getIdToken(true);if(!token)throw Error("Sign in before testing your FUGTH voice agent.");return {Authorization:`Bearer ${token}`,"Content-Type":"application/json"};}
const formatWait=t=>{const s=Math.max(0,Math.ceil((t-Date.now())/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;};
export default function FugthVoiceDemo({user,workspace,compact=false}){
  const [role,setRole]=useState("receptionist");
  const [industry,setIndustry]=useState("roofing");
  const [scenario,setScenario]=useState("inbound");
  const [phone,setPhone]=useState("");
  const [consent,setConsent]=useState(false);
  const [readiness,setReadiness]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [call,setCall]=useState(null);
  const [cooldown,setCooldown]=useState(0);
  const [now,setNow]=useState(Date.now());
  const [emailSent,setEmailSent]=useState(false);
  useEffect(()=>{let active=true;const check=async()=>{try{const r=await fetch("/api/demo-call",{headers:await authorization(),cache:"no-store"});const data=await r.json();if(active){setReadiness(data);setCooldown(data.cooldownUntil||0)}}catch{if(active)setReadiness({available:false,reason:"Voice demos are currently unavailable."});}};check();return()=>{active=false;};},[user?.uid]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!call?.callId||call?.completed)return;
    let running=true,attempt=0;
    const poll=async()=>{attempt++;try{const r=await fetch("/api/demo-call/status?id="+encodeURIComponent(call.callId),{headers:await authorization(),cache:"no-store"});const result=await r.json();if(r.ok&&running)setCall(old=>({...old,...result}));}catch{}};
    poll();const interval=setInterval(()=>{if(attempt<22)poll();else clearInterval(interval);},4000);
    return()=>{running=false;clearInterval(interval);};
  },[call?.callId,call?.completed]);
  async function begin(e){
    e.preventDefault();setError("");setBusy(true);
    try{
      const r=await fetch("/api/demo-call",{
        method:"POST",headers:await authorization(),
        body:JSON.stringify({phone,consent,role,industry,scenario,businessName:String(workspace?.businessName||"").slice(0,60)}),cache:"no-store"
      });
      const data=await r.json();
      if(data.nextAvailableAt)setCooldown(data.nextAvailableAt);
      if(!r.ok||!data.callId)throw Error(data.error||"The demo couldn't start.");
      setCall({...data,completed:false,summary:"Your FUGTH agent is preparing your call.",intent:"Pending"});
    }catch(e){setError(e.message||"Unable to place preview call.");}finally{setBusy(false);}
  }
  async function verifyEmail(){
    try{await sendEmailVerification(auth.currentUser);setEmailSent(true);}catch(e){setError(e.message||"Couldn't send verification email.");}
  }
  const waitTime=Math.max(0,cooldown-now);
  const isReady=readiness?.available && waitTime===0 && !busy;
  return <section className="overflow-hidden rounded-[1.65rem] border border-zinc-200 bg-white shadow-[0_14px_50px_#0000000c]">
    <div className="relative border-b border-zinc-200 bg-zinc-950 px-5 py-7 text-white sm:px-8 sm:py-9">
      <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full border-[38px] border-white/5"/>
      <div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.21em] text-zinc-400">01 / HEAR FUGTH FOR YOURSELF</p><span className="rounded-full border border-zinc-600 px-3 py-1.5 text-[11px] font-bold">15-second live voice preview</span></div>
      <h2 className="mt-5 text-3xl font-black tracking-[-.055em] sm:text-4xl">Don't imagine it.<br/><em className="font-serif font-normal">Hear the difference.</em></h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">Pick your industry, choose your FUGTH agent's personality, and listen to how your business could sound. A quick real phone call—no script to write.</p></div>
    </div>
    <form onSubmit={begin} className="space-y-6 p-5 sm:p-8">
      <div><div className="flex items-end justify-between gap-3"><label className="text-xs font-black uppercase tracking-[.14em] text-zinc-500">1. Choose your business</label><span className="text-[11px] text-zinc-500">Swipe to browse →</span></div>
        <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-3" role="group" aria-label="Industry">{INDUSTRIES.map(x=><button type="button" key={x.id} aria-pressed={industry===x.id} onClick={()=>setIndustry(x.id)} className={`flex w-[126px] shrink-0 snap-start flex-col items-start gap-5 rounded-xl border px-4 py-4 text-left ${industry===x.id?"border-zinc-950 bg-zinc-950 text-white":"border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-400"}`}><span className="text-2xl" aria-hidden="true">{x.icon}</span><span className="text-xs font-extrabold">{x.label}</span></button>)}</div>
      </div>
      <div><p className="text-xs font-black uppercase tracking-[.14em] text-zinc-500">2. How should your agent sound?</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{ROLES.map(x=><button type="button" key={x.id} onClick={()=>setRole(x.id)} aria-pressed={role===x.id} className={`rounded-xl border p-4 text-left ${role===x.id?"border-zinc-950 bg-zinc-950 text-white":"border-zinc-200 bg-zinc-50 text-zinc-900"}`}><strong className="block text-sm">{x.label}</strong><span className={`mt-2 block text-[11px] leading-5 ${role===x.id?"text-zinc-300":"text-zinc-500"}`}>{x.example}</span></button>)}</div><p className="mt-2 text-xs text-zinc-500">A warm, upbeat feminine voice. Natural and attentive, without repeating every sentence.</p></div>
      <div><p className="text-xs font-black uppercase tracking-[.14em] text-zinc-500">3. Pick the situation</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{MODES.map(x=><button type="button" key={x.id} onClick={()=>setScenario(x.id)} aria-pressed={scenario===x.id} className={`rounded-xl border p-4 text-left ${scenario===x.id?"border-zinc-950 bg-zinc-100":"border-zinc-200 bg-white"}`}><span className="flex items-center gap-2 text-sm font-black"><span aria-hidden="true">{scenario===x.id?"◉":"○"}</span>{x.title}</span><span className="mt-2 block pl-6 text-xs leading-5 text-zinc-500">{x.sub}</span></button>)}</div><p className="mt-2 text-xs text-zinc-500">All scenarios are simulations. A FUGTH agent calls your phone so you can experience the conversation.</p></div>
      <div className="grid gap-5 rounded-2xl border border-zinc-200 bg-[#f8f8f6] p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
        <div><label htmlFor="fugth-demo-number" className="text-xs font-black uppercase tracking-[.14em] text-zinc-600">4. Your phone number</label><input id="fugth-demo-number" type="tel" inputMode="tel" autoComplete="tel" placeholder="(305) 555-0123" required value={phone} onChange={e=>setPhone(e.target.value)} className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-base text-zinc-950 outline-none focus:border-zinc-950 sm:max-w-sm"/><label className="mt-4 flex max-w-xl cursor-pointer items-start gap-3 text-xs leading-6 text-zinc-600"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 accent-zinc-950"/><span>This is my own verified number. I consent to a single FUGTH automated demonstration call of up to 15 seconds, including call summary processing.</span></label></div>
        <button disabled={!isReady||!consent||!phone} className="min-w-[190px] rounded-xl bg-zinc-950 px-6 py-4 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">{busy?"Requesting call...":waitTime>0?`Try again in ${formatWait(cooldown)}`:"Call me now ↗"}</button>
      </div>
      {readiness && !readiness.available && <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
        {readiness.needsEmailVerification?<><strong>Verify your email to unlock a voice preview.</strong> {emailSent?"Verification email sent. Check your inbox, then refresh this page.":<button type="button" onClick={verifyEmail} className="font-black underline">Send verification email</button>}</>:(readiness.reason||"FUGTH live demos are being configured.")}
      </div>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}
      {call?.callId && <div role="status" className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-zinc-500">YOUR FUGTH PREVIEW</p><h3 className="mt-2 text-lg font-black">{call.completed?"Your call recap":"Your FUGTH agent is calling"}</h3></div><span className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-black">{call.status||"queued"}</span></div><p className="mt-4 text-sm leading-7 text-zinc-700">{call.completed?call.summary||"Preview completed.": "Your phone should ring shortly. Caller connection times depend on the phone network. The conversation ends automatically after 15 seconds."}</p><p className="mt-3 text-xs text-zinc-500">{call.completed?`Topic: ${call.intent||"General conversation"} · Duration: ${call.duration??"up to 15"} seconds`:"The agent will introduce itself once, listen, and respond naturally."}</p></div>}
      <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-200 pt-4 text-[11px] leading-5 text-zinc-500"><span>Phone ownership verification is required before calling. One test every five minutes, with daily limits.</span><span>No appointment is booked during this short preview.</span></div>
    </form>
  </section>;
}
