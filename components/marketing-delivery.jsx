"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";

export default function MarketingDelivery({user,campaigns=[],enabled=false,onDraft}){
 const [status,setStatus]=useState({configured:false,connected:false,reason:"Checking email connection…"});
 const [goal,setGoal]=useState("");
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 async function headers(){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in to manage email.");
  return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
 }
 async function refresh(){
  try{
   const res=await fetch("/api/marketing/send",{headers:await headers(),cache:"no-store"});
   const data=await res.json().catch(()=>({}));
   setStatus({...data,configured:data.configured===true,connected:data.connected===true});
  }catch{setStatus({configured:false,connected:false,reason:"The Gmail connection could not be checked."});}
 }
 useEffect(()=>{refresh();},[user?.uid]);
 async function connect(){
  setBusy("connect");setNotice("");
  try{
   const res=await fetch("/api/integrations/google",{method:"POST",headers:await headers()});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.url)throw Error(data.error||"Google account connection is not ready.");
   window.location.assign(data.url);
  }catch(e){setNotice(e.message||"Google connection failed.");setBusy("");}
 }
 async function generate(){
  if(!enabled)return;
  setBusy("generate");setNotice("");
  try{
   const res=await fetch("/api/marketing/generate",{method:"POST",headers:await headers(),body:JSON.stringify({goal:goal||"Write a friendly update about our business",audience:"Customers and leads"})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"AI writing is unavailable.");
   onDraft({subject:data.subject,message:data.message});
   setNotice("Gemini drafted your email in the Campaign Builder below. Review it before saving.");
  }catch(e){setNotice(e.message||"Could not generate email.");}
  finally{setBusy("");}
 }
 async function send(campaign){
  if(!enabled||!status.connected)return;
  if(!window.confirm("Send up to 10 real emails to contacts with marketing consent from your connected Gmail account?"))return;
  setBusy(campaign.id);setNotice("");
  try{
   const res=await fetch("/api/marketing/send",{method:"POST",headers:await headers(),body:JSON.stringify({campaignId:campaign.id})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"Gmail did not send the campaign.");
   setNotice(data.sent+" email(s) accepted by Gmail. "+(data.failed?data.failed+" failed. ":"")+(data.notice||""));
  }catch(e){setNotice(e.message||"Email send failed.");}
  finally{setBusy("");}
 }
 return <section className="rounded-[22px] border border-[#dce6d9] bg-[#eff6ec] p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#728973]">GMAIL DELIVERY + AI WRITER</p>
    <h3 className="mt-2 text-xl font-semibold">Send approved customer campaigns</h3>
    <p className="mt-2 max-w-2xl text-xs leading-6 text-[#708371]">{status.connected?"Gmail sending authorized.":status.reason||"Connect or reconnect your Google account to authorize Gmail sending."} Send in batches of up to 10, with a 50-email daily account limit and one-click unsubscribe links.</p>
   </div>
   <button type="button" disabled={!status.configured||busy!==""} onClick={connect} className="rounded-xl bg-[#2d4835] px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">{status.connected?"Reconnect Gmail":"Connect Google ↗"}</button>
  </div>
  <div className="mt-5 grid gap-4 lg:grid-cols-2">
   <div className="rounded-xl bg-white p-4"><p className="text-xs font-bold">Write an email with Gemini AI</p>
    <textarea value={goal} onChange={e=>setGoal(e.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-[#dae6d8] p-3 text-sm" placeholder="Invite customers to a fall maintenance appointment"/>
    <button type="button" disabled={!enabled||busy!==""} onClick={generate} className="mt-3 rounded-lg bg-[#30513a] px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">{busy==="generate"?"Writing…":"Generate email draft ↗"}</button>
    <p className="mt-2 text-[10px] text-[#809082]">Uses the business profile and GEMINI_API_KEY if configured. Review accuracy before sending.</p>
   </div>
   <div className="rounded-xl bg-white p-4"><p className="text-xs font-bold">Saved email campaigns</p>
    <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">{campaigns.filter(x=>x.channel==="email").map(item=><div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#edf1eb] py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.name||item.subject}</p><p className="text-[10px] text-[#829082]">{item.status||"Draft"}</p></div><button type="button" onClick={()=>send(item)} disabled={!enabled||!status.connected||busy!==""} className="shrink-0 rounded-lg bg-[#2d4835] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40">{busy===item.id?"Sending…":"Send next 10"}</button></div>)}{!campaigns.some(x=>x.channel==="email")&&<p className="text-xs text-[#829082]">Save an email campaign below to start sending.</p>}</div>
   </div>
  </div>
  {notice&&<p role="status" className="mt-4 rounded-xl border border-[#d6e4d0] bg-white p-4 text-xs text-[#49664a]">{notice}</p>}
 </section>;
}
