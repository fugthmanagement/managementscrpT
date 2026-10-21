"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const input="mt-2 w-full rounded-xl border border-[#cedfea] bg-white px-4 py-3 text-sm text-[#173e55] outline-none focus:border-[#4f9bbb]";
const publicSiteId=()=>typeof window!=="undefined"?new URLSearchParams(window.location.search).get("site")||"":"";
const displayTime=t=>new Date(t).toLocaleString("en-US",{timeZone:"America/New_York",weekday:"long",
 month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})+" ET";
const dateEastern=(value=new Date())=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{
  timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(value).map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join("-");
};
const nextWeekday=(date)=>{
 const d=new Date(String(date)+"T12:00:00Z");
 if(!Number.isFinite(d.getTime()))return date;
 for(let i=0;i<7;i++){
  d.setUTCDate(d.getUTCDate()+1);
  if(d.getUTCDay()>0&&d.getUTCDay()<6)return d.toISOString().slice(0,10);
 }
 return date;
};
export default function BookFounder(){
 const [form,setForm]=useState({name:"",business:"",email:"",phone:"",date:"",startTime:"",notes:"",
  consent:false,companyWebsite:""});
 const [slots,setSlots]=useState([]),[loading,setLoading]=useState(false),[sending,setSending]=useState(false),
  [message,setMessage]=useState(""),[confirmed,setConfirmed]=useState(null),
  [availabilityError,setAvailabilityError]=useState(""),
  [availabilityCode,setAvailabilityCode]=useState(""),
  [availabilityMessage,setAvailabilityMessage]=useState("");
 const change=(key,value)=>{setForm(x=>({...x,[key]:value}));setMessage("")};
 useEffect(()=>{setForm(x=>x.date?x:{...x,date:nextWeekday(dateEastern())})},[]);
 useEffect(()=>{
  if(!form.date){setSlots([]);return}
  let cancelled=false;
  setLoading(true);setSlots([]);
  setAvailabilityError("");setAvailabilityCode("");setAvailabilityMessage("");
  fetch("/api/public/founder-booking?date="+encodeURIComponent(form.date),{cache:"no-store"})
   .then(async r=>{
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const error=Error(data.error||"The booking calendar could not load.");
     error.code=data.code||"";throw error}
    if(!cancelled){
     const found=data.slots||[];
     setSlots(found);
     setAvailabilityMessage(data.message||"");
     setForm(x=>({...x,startTime:found.some(s=>s.available&&s.startTime===x.startTime)?x.startTime:""}));
    }
   }).catch(e=>{if(!cancelled){setAvailabilityError(e.message);setAvailabilityCode(e.code||"calendar_offline")}})
   .finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[form.date]);
 async function refresh(){
  if(!form.date)return;
  setLoading(true);setAvailabilityError("");setAvailabilityCode("");setAvailabilityMessage("");
  try{
   const r=await fetch("/api/public/founder-booking?date="+encodeURIComponent(form.date),{cache:"no-store"});
   const data=await r.json().catch(()=>({}));
   if(!r.ok){const e=Error(data.error||"Availability not ready.");e.code=data.code||"calendar_offline";throw e}
   const found=data.slots||[];
   setSlots(found);setAvailabilityMessage(data.message||"");
   setForm(x=>({...x,startTime:found.some(s=>s.available&&s.startTime===x.startTime)?x.startTime:""}));
  }catch(e){setSlots([]);setAvailabilityError(e.message);setAvailabilityCode(e.code||"calendar_offline")}
  finally{setLoading(false)}
 }
 async function submit(event){
  event.preventDefault();setSending(true);setMessage("");
  try{
   if(!slots.some(s=>s.startTime===form.startTime&&s.available))throw Error("Select an available time.");
   const r=await fetch("/api/public/founder-booking",{method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:form.name,business:form.business,email:form.email,
     phone:form.phone,notes:form.notes,startTime:form.startTime,consent:form.consent,
     companyWebsite:form.companyWebsite,siteId:publicSiteId()})});
   const result=await r.json().catch(()=>({}));
   if(!r.ok){if(r.status===409)await refresh();throw Error(result.error||"Could not reserve that time.")}
   setConfirmed({id:result.bookingId,startTime:result.startTime});
   setMessage(result.message||"Your FUGTH appointment is confirmed.");
  }catch(e){setMessage(e.message||"Couldn't book this appointment.")}
  finally{setSending(false)}
 }
 const min=dateEastern(),max=dateEastern(new Date(Date.now()+45*86400000));
 return <main className="min-h-screen bg-[#f1f8fd] px-4 py-10 text-[#18384e] sm:py-16">
  <div className="mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-[#d4e6f1] bg-white shadow-[0_20px_60px_rgba(24,69,102,.1)]">
   <header className="bg-[#102c40] p-7 text-white sm:p-10">
    <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#b1dff7]">FUGTH MANAGEMENT / APPOINTMENTS</p>
    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Book a conversation, no account needed.</h1>
    <p className="mt-4 text-sm leading-7 text-[#c4dbe9]">Choose an available time to discuss your website, AI receptionist or sales operations. Booked times are disabled automatically. Confirmed meetings are saved to the private FUGTH calendar.</p>
   </header>
   {confirmed?<div className="space-y-4 p-8 sm:p-10">
    <h2 className="text-2xl font-black text-[#226a50]">✓ Appointment confirmed</h2>
    <p className="rounded-xl bg-[#ecf8f3] p-4 text-sm leading-7 text-[#245c49]">{message}</p>
    <strong className="block text-lg">{displayTime(confirmed.startTime)}</strong>
    <p className="break-all text-xs text-[#7195a5]">Reference: {confirmed.id}</p>
    <p className="text-sm leading-6">Save this date and time. The appointment is confirmed in FUGTH; an email invitation or Google Calendar event is <strong>not</strong> created automatically.</p>
    <Link href="/" className="inline-block rounded-xl bg-[#174a66] px-5 py-3 text-xs font-black text-white">Back to FUGTH ↗</Link>
   </div>:<form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2 sm:p-10">
    <label className="text-xs font-bold">Your name<input required className={input} maxLength={90} value={form.name} onChange={e=>change("name",e.target.value)} placeholder="First and last name"/></label>
    <label className="text-xs font-bold">Business name (optional)<input className={input} maxLength={90} value={form.business} onChange={e=>change("business",e.target.value)} placeholder="Your business"/></label>
    <label className="text-xs font-bold">Email address<input required type="email" className={input} maxLength={170} value={form.email} onChange={e=>change("email",e.target.value)} placeholder="you@example.com"/></label>
    <label className="text-xs font-bold">Phone number<input required type="tel" className={input} maxLength={32} value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="(305) 555-0149"/></label>
    <label className="text-xs font-bold sm:col-span-2">Choose your date · Eastern Time
     <input required type="date" className={input} min={min} max={max} value={form.date} onChange={e=>{setForm(x=>({...x,date:e.target.value,startTime:""}));setMessage("");}}/>
    </label>
    {form.date&&<fieldset className="sm:col-span-2">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <legend className="text-xs font-black">Available times · America/New_York</legend>
      <div className="flex flex-wrap gap-3">
       <button type="button" onClick={refresh} disabled={loading} className="text-xs font-bold text-[#2b799b] underline">{loading?"Checking…":"Refresh times"}</button>
       <button type="button" className="text-xs font-bold text-[#2b799b] underline"
        onClick={()=>{setForm(x=>({...x,date:nextWeekday(x.date),startTime:""}));setMessage("")}}>Next weekday →</button>
      </div>
     </div>
     <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {slots.map(s=><button type="button" key={s.startTime} disabled={!s.available||loading}
        aria-pressed={form.startTime===s.startTime}
        onClick={()=>change("startTime",s.startTime)}
        className={"rounded-xl border p-3 text-xs font-black transition "+
        (!s.available?"cursor-not-allowed border-[#edf0f2] bg-[#f0f2f4] text-[#adb5bc] line-through":
         form.startTime===s.startTime?"border-[#1c698e] bg-[#d5f0ff] text-[#164767]":"border-[#c6deec] bg-white text-[#315d75] hover:bg-[#e8f7ff]")}>
        {s.label.replace(" ET","")}{!s.available&&<span className="block text-[10px]">{s.reason==="blocked"?"Unavailable":"Booked"}</span>}
       </button>)}
     </div>
     {loading&&<p className="mt-3 text-xs text-[#52768d]">Checking the FUGTH appointment calendar…</p>}
     {!loading&&availabilityError&&<div role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
      <strong>Appointment calendar temporarily unavailable.</strong>
      <p>{availabilityError}</p>
      {availabilityCode&&<p className="mt-2 font-mono text-[10px]">Reference: {availabilityCode}</p>}
      <p className="mt-2">Your appointment has NOT been booked. Please try Refresh times or contact FUGTH to arrange a time.</p>
     </div>}
     {!loading&&!availabilityError&&!slots.length&&<p className="mt-3 text-xs text-[#b47735]">{availabilityMessage||"No openings remain at this time. Try the next weekday."}</p>}
     {!loading&&!availabilityError&&slots.length>0&&slots.every(x=>!x.available)&&
      <p className="mt-3 text-xs text-[#b47735]">This date is fully booked or blocked. Try the next weekday.</p>}
    </fieldset>}
    <label className="text-xs font-bold sm:col-span-2">What would you like to discuss? (optional)
     <textarea className={input} maxLength={400} rows={3} value={form.notes} onChange={e=>change("notes",e.target.value)} placeholder="Your website, appointment system, AI receptionist…"/>
    </label>
    <input type="text" className="absolute -left-[20000px]" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.companyWebsite} onChange={e=>change("companyWebsite",e.target.value)}/>
    <label className="flex items-start gap-3 text-xs leading-6 text-[#46697c] sm:col-span-2">
     <input type="checkbox" className="mt-1" required checked={form.consent} onChange={e=>change("consent",e.target.checked)}/>
     I authorize FUGTH to contact me about my appointment. This does not subscribe me to marketing emails or texts.
    </label>
    <p className="text-[11px] leading-5 text-[#718d9e] sm:col-span-2">30-minute appointments · Monday–Friday, 9 AM–5 PM Eastern · At least 24 hours' notice. If someone else books your selected time first, you'll be asked to choose another.</p>
    <button disabled={sending||loading||Boolean(availabilityError)||!form.startTime||!form.consent} className="rounded-xl bg-[#174a66] px-6 py-4 text-sm font-black text-white disabled:opacity-40 sm:col-span-2">{sending?"Reserving…":"Confirm appointment in FUGTH"}</button>
    {message&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800 sm:col-span-2">{message}</p>}
    <p className="text-xs text-[#7b99ab] sm:col-span-2"><Link href="/" className="font-bold underline">← Return to FUGTH</Link></p>
   </form>}
  </div>
 </main>;
}
