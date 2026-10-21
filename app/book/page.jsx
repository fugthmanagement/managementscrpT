"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
const input="mt-2 w-full rounded-xl border border-[#cedfea] bg-white px-4 py-3 text-sm text-[#173e55] outline-none focus:border-[#4f9bbb]";
const dayLabels=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const timeOptions=Array.from({length:16},(_,i)=>{const mins=9*60+i*30;const h=Math.floor(mins/60),m=mins%60;return {value:String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"),label:new Date(Date.UTC(2026,0,1,h,m)).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"UTC"})+" ET"};});
function easternTimeToUtc(date,time){
 const nums=(date+"-"+time.replace(":","-")).split("-").map(Number);
 const [y,m,d,h,minute]=nums;let ms=Date.UTC(y,m-1,d,h,minute);
 const f=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 for(let i=0;i<3;i++){
  const v=Object.fromEntries(f.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
  const localMs=Date.UTC(Number(v.year),Number(v.month)-1,Number(v.day),Number(v.hour),Number(v.minute));
  ms+=Date.UTC(y,m-1,d,h,minute)-localMs;
 }
 return new Date(ms).toISOString();
}
const previewId=()=>{if(typeof window==="undefined")return "";return new URLSearchParams(window.location.search).get("site")||"";};
export default function BookFounder(){
 const [fields,setFields]=useState({name:"",business:"",email:"",phone:"",date:"",time:"09:00",notes:"",consent:false,companyWebsite:""});
 const [sending,setSending]=useState(false),[status,setStatus]=useState(""),[complete,setComplete]=useState(false);
 const validDate=useMemo(()=>fields.date&&dayLabels[new Date(fields.date+"T12:00:00").getDay()]!== "Sat"&&dayLabels[new Date(fields.date+"T12:00:00").getDay()]!=="Sun",[fields.date]);
 const change=(k,v)=>{setFields(old=>({...old,[k]:v}));setStatus("");};
 async function request(e){
  e.preventDefault();setSending(true);setStatus("");
  try{
   if(!validDate)throw Error("Select a Monday–Friday date.");
   const startTime=easternTimeToUtc(fields.date,fields.time);
   const r=await fetch("/api/public/founder-booking",{method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:fields.name,business:fields.business,email:fields.email,
     phone:fields.phone,notes:fields.notes,startTime,consent:fields.consent,companyWebsite:fields.companyWebsite,siteId:previewId()})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(j.error||"Could not submit your appointment request.");
   setComplete(true);setStatus(j.message||"Appointment requested. Approval is required before the time is confirmed.");
  }catch(e){setStatus(e.message||"Could not submit request.");}
  finally{setSending(false)}
 }
 return <main className="min-h-screen bg-[#f1f8fd] px-4 py-10 text-[#18384e] sm:py-16">
  <div className="mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-[#d4e6f1] bg-white shadow-[0_20px_60px_rgba(24,69,102,.1)]">
   <header className="bg-[#102c40] p-7 text-white sm:p-10">
    <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#b1dff7]">FUGTH MANAGEMENT / GUEST APPOINTMENTS</p>
    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Book a website and AI reception conversation.</h1>
    <p className="mt-4 text-sm leading-7 text-[#c4dbe9]">No account required. Choose your preferred 30-minute time, and FUGTH will review the request. You will receive a Google Calendar invitation if the time is confirmed.</p>
   </header>
   {complete?<section className="p-8 sm:p-10"><h2 className="text-2xl font-black">Your request was received.</h2>
    <p role="status" className="mt-4 rounded-xl bg-[#e8f7f0] p-4 text-sm leading-7 text-[#24614b]">{status}</p>
    <p className="mt-4 text-sm leading-7">This is <strong>not yet a confirmed appointment</strong>. Please check your email for an invitation after review.</p>
    <Link href="/" className="mt-6 inline-block rounded-xl bg-[#163f58] px-5 py-3 text-xs font-bold text-white">Return to FUGTH</Link></section>:
   <form onSubmit={request} className="grid gap-5 p-6 sm:grid-cols-2 sm:p-10">
    <label className="text-xs font-bold">Your name<input required maxLength={90} className={input} value={fields.name} onChange={e=>change("name",e.target.value)} placeholder="First and last name"/></label>
    <label className="text-xs font-bold">Business name (optional)<input maxLength={90} className={input} value={fields.business} onChange={e=>change("business",e.target.value)} placeholder="Business or organization"/></label>
    <label className="text-xs font-bold">Email for invitation<input required type="email" maxLength={170} className={input} value={fields.email} onChange={e=>change("email",e.target.value)} placeholder="you@business.com"/></label>
    <label className="text-xs font-bold">Mobile number<input required type="tel" maxLength={32} className={input} value={fields.phone} onChange={e=>change("phone",e.target.value)} placeholder="(305) 555-0123"/></label>
    <label className="text-xs font-bold">Preferred date · Eastern Time<input required type="date" className={input} min={new Date(Date.now()+86400000).toISOString().slice(0,10)} max={new Date(Date.now()+45*86400000).toISOString().slice(0,10)} value={fields.date} onChange={e=>change("date",e.target.value)}/></label>
    <label className="text-xs font-bold">Preferred start time<select className={input} value={fields.time} onChange={e=>change("time",e.target.value)}>{timeOptions.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <label className="text-xs font-bold sm:col-span-2">Anything you'd like us to prepare? (optional)<textarea maxLength={400} rows={3} className={input} value={fields.notes} onChange={e=>change("notes",e.target.value)} placeholder="For example: I want to review the website preview you sent."/></label>
    <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[20000px]" value={fields.companyWebsite} onChange={e=>change("companyWebsite",e.target.value)}/>
    <label className="flex items-start gap-3 text-xs leading-6 text-[#46697c] sm:col-span-2"><input type="checkbox" required checked={fields.consent} onChange={e=>change("consent",e.target.checked)} className="mt-1"/>I authorize FUGTH Management to use the details I provided to respond to this appointment request. This does not enroll me in recurring marketing texts.</label>
    <p className="text-[11px] leading-5 text-[#718d9e] sm:col-span-2">Available requests: weekdays 9 AM–5 PM Eastern, at least 24 hours in advance. Selecting a time does not reserve it until FUGTH approves and confirms with Google Calendar.</p>
    <button disabled={sending||!validDate||!fields.consent} className="rounded-xl bg-[#174a66] px-6 py-4 text-sm font-black text-white disabled:opacity-40 sm:col-span-2">{sending?"Submitting…":"Request this appointment"}</button>
    {status&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800 sm:col-span-2">{status}</p>}
    <p className="text-xs text-[#7b99ab] sm:col-span-2"><Link href="/" className="font-bold underline">← Return to FUGTH website</Link></p>
   </form>}
  </div>
 </main>;
}
