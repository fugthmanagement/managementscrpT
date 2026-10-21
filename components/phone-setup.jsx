"use client";
import { useEffect, useState } from "react";
import {auth} from "../lib/firebase";

function normalizePhone(raw) { const s=String(raw||"").replace(/[^\d]/g,""); return s.length===10?"+1"+s:s.length===11&&s[0]==="1"?"+"+s:""; }
const routes=[{id:"instant",name:"AI answers right away",hint:"Send all incoming calls to your FUGTH line. Best for businesses without front-desk staff."},{id:"no-answer",name:"Your team answers first",hint:"Let your existing phone ring. If nobody answers, forward the call to the AI. The carrier controls the actual wait."}];
const carriers=["T-Mobile","AT&T","Verizon","Google Voice","RingCentral","Other mobile carrier","Other business phone system"];

export default function PhoneSetup({user,workspace,locked=false}) {
  const initial=workspace?.phoneSetup||{};
  const [businessPhone,setBusinessPhone]=useState(initial.businessPhone||workspace?.phone||"");
  const [carrier,setCarrier]=useState(initial.carrier||"");
  const [mode,setMode]=useState(initial.mode||"no-answer");
  const [delay,setDelay]=useState(Number(initial.requestedDelay||15));
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [requested,setRequested]=useState(Boolean(initial.requestedAt));
  useEffect(()=>{if(workspace?.phoneSetup){const p=workspace.phoneSetup;setBusinessPhone(p.businessPhone||workspace.phone||"");setCarrier(p.carrier||"");setMode(p.mode||"no-answer");setDelay(Number(p.requestedDelay||15));setRequested(Boolean(p.requestedAt));}},[workspace?.phoneSetup,workspace?.phone]);
  const assigned=normalizePhone(workspace?.vapiNumber);
  const normalized=normalizePhone(businessPhone);
  async function save(event) {
    event.preventDefault();setNotice("");
    if(locked){setNotice("Phone setup requires an active Essential plan or higher.");return;}
    if(!user?.uid||!auth){setNotice("Please sign in again.");return;}
    if(!normalized){setNotice("Enter a valid US business phone number before continuing.");return;}
    if(!carrier){setNotice("Select your phone provider.");return;}
    setBusy(true);
    try{
      const token=await auth.currentUser?.getIdToken();
      if(!token)throw Error("Please sign in again.");
      const response=await fetch("/api/phone/preferences",{
        method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
        body:JSON.stringify({businessPhone:normalized,carrier,mode,requestedDelay:mode==="no-answer"?delay:0}),
        cache:"no-store"
      });
      const saved=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(saved.error||"Could not save phone routing preferences.");
      setRequested(true);
      setNotice(assigned?"Your preferences are saved. Configure forwarding with your phone provider, then verify with a test call.":"Your setup request is saved. A dedicated FUGTH number still needs to be assigned before forwarding can be activated.");
    }catch(e){setNotice(e.message||"Could not save phone setup.");}finally{setBusy(false);}
  }
  const target=assigned||"FUGTH NUMBER PENDING";
  return <div className="space-y-6">
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-zinc-500">PHONE LINE · SETUP</p><h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">Keep the number your customers already know.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">Customers call your business as usual. Forward all calls—or only the ones your staff doesn't answer—to your assigned Fugth AI line.</p></div><span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700">{assigned?"FUGTH number recorded — verify routing":"FUGTH number not yet assigned"}</span></div>
      <div className="mt-7 grid gap-3 md:grid-cols-3">{[["1","Enter your business number"],["2","Choose answer rules"],["3","Configure & test forwarding"]].map(([n,v])=><div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={n}><span className="inline-grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-xs font-black text-white">{n}</span><p className="mb-0 mt-3 text-sm font-extrabold text-zinc-800">{v}</p></div>)}</div>
    </section>
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-6"><section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-7"><h3 className="text-xl font-black text-zinc-900">1. Your current business number</h3><p className="mt-2 text-sm text-zinc-500">We don't replace or port your business number just to set up call forwarding.</p><label className="mt-6 block text-xs font-bold uppercase tracking-wider text-zinc-600">Phone number<input type="tel" required placeholder="(305) 555-0140" value={businessPhone} onChange={e=>setBusinessPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-base text-zinc-950 outline-none focus:border-zinc-900"/></label><label className="mt-5 block text-xs font-bold uppercase tracking-wider text-zinc-600">Current phone provider<select value={carrier} required onChange={e=>setCarrier(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-sm text-zinc-950 outline-none focus:border-zinc-900"><option value="">Select your provider</option>{carriers.map(v=><option key={v} value={v}>{v}</option>)}</select></label></section>
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-7"><h3 className="text-xl font-black text-zinc-900">2. When should the AI answer?</h3><div className="mt-5 space-y-3">{routes.map(r=><label key={r.id} className={`flex cursor-pointer gap-4 rounded-2xl border p-5 ${mode===r.id?"border-zinc-900 bg-zinc-100":"border-zinc-200 bg-white"}`}><input type="radio" name="answerMode" checked={mode===r.id} onChange={()=>setMode(r.id)} className="mt-1 accent-zinc-900"/><span><strong className="block text-base text-zinc-950">{r.name}</strong><span className="mt-2 block text-sm leading-6 text-zinc-600">{r.hint}</span></span></label>)}</div>{mode==="no-answer"&&<label className="mt-5 block text-sm font-bold text-zinc-800">Preferred unanswered ringing time<select value={delay} onChange={e=>setDelay(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950"><option value={10}>10 seconds</option><option value={15}>15 seconds</option><option value={20}>20 seconds</option><option value={25}>25 seconds</option><option value={30}>30 seconds</option></select><small className="mt-2 block font-normal leading-5 text-zinc-500">This is your requested delay; it only takes effect if your carrier or PBX supports that setting. Fugth cannot change every carrier's timer automatically.</small></label>}</section>
      </div>
      <div className="space-y-6"><section className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white sm:p-7"><p className="text-xs font-black uppercase tracking-widest text-zinc-400">YOUR FUGTH NUMBER</p><p className="mt-5 break-words text-2xl font-black tracking-tight">{target}</p><p className="mt-3 text-sm leading-6 text-zinc-400">{assigned?"This phone number is stored on your workspace but has not been independently verified against the FUGTH phone network from this page. Confirm its assignment and call routing before sending customer calls.":"Your request can be prepared now; a real FUGTH number must be allocated by the service before your carrier can forward to it."}</p><div className="mt-5 border-t border-white/15 pt-5"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Requested route</p><p className="mt-2 text-sm font-bold">{mode==="instant"?"AI answers immediately":`Your team first · ${delay}-second target`}</p></div></section>
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-7"><h3 className="text-xl font-black text-zinc-900">3. Activate with your carrier</h3>{assigned?<div className="mt-4 space-y-3 text-sm leading-6 text-zinc-700"><p>In your {carrier||"carrier"} account, locate <b>Call Forwarding</b>. Choose {mode==="instant"?<b>Always forward</b>:<b>Forward when unanswered</b>} to <b>{assigned}</b>.</p>{carrier==="T-Mobile"&&mode==="no-answer"&&<><p>T-Mobile supports a ring-delay setting on eligible plans. Confirm the forwarding destination and requested delay in its official instructions before dialing.</p><a className="font-bold underline" href="https://www.t-mobile.com/support/plans-features/self-service-short-codes/" target="_blank" rel="noreferrer">T-Mobile forwarding instructions ↗</a></>}<p>Call your regular business number from a second phone and verify that the correct party answers after the expected ringing time.</p></div>:<p className="mt-4 text-sm leading-7 text-zinc-600">Save your preferences below. After a FUGTH line is assigned, this section will display the forwarding destination and setup instructions. A number is not assigned just because an account was created.</p>}</section>
        {assigned&&<section className="rounded-3xl border border-[#c9e0ed] bg-[#f2f9fe] p-6 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#4c829f]">NEW FUGTH NUMBER / REQUIRED TEST</p>
          <h3 className="mt-3 text-lg font-black text-[#183e55]">Test your assigned AI receptionist before forwarding customers.</h3>
          <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6 text-[#395e74]">
            <li>Confirm your business name, description, working hours and services in FUGTH Settings.</li>
            <li>Use a second phone to call your assigned number. You should hear your business-specific greeting.</li>
            <li>Tell the receptionist your name, ask a service question, and request an appointment. It should capture information accurately, but not claim a calendar booking without confirmation.</li>
            <li>End the call and check the Calls tab in this account for the correct caller and summary.</li>
            <li>Only after successful testing, configure carrier forwarding from your existing business line if you want the AI to answer those calls.</li>
          </ol>
          <a href={"tel:"+assigned} className="mt-5 inline-flex rounded-xl bg-[#194f6b] px-5 py-3 text-xs font-black text-white">Call FUGTH test line ↗</a>
          <p className="mt-3 text-xs leading-5 text-[#638496]">A Vapi-managed free number accepts inbound calls only. It is not a Google Voice or SMS sender. Outbound calls and business SMS need a capable telephony provider and additional setup.</p>
         </section>}
        {notice&&<div role="status" className="rounded-xl border border-zinc-300 bg-zinc-100 p-4 text-sm text-zinc-800">{notice}</div>}
        <button type="submit" disabled={busy||locked} className="w-full rounded-xl bg-zinc-900 px-5 py-4 text-sm font-black text-white hover:bg-zinc-800 disabled:opacity-50">{busy?"Saving setup...":requested?"Update phone preferences":"Save & request FUGTH number →"}</button>
        <p className="text-xs leading-6 text-zinc-500">Phone-number provisioning and carrier forwarding aren't automatic on this screen. Some dedicated numbers incur telephony charges and require active billing or account approval.</p>
      </div>
    </form>
  </div>;
}
