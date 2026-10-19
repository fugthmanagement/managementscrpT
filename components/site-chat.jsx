"use client";
import {useEffect,useRef,useState} from "react";
import {factChunks,classifyBusinessQuestion,retrieveBusinessFacts,safeBusinessAnswer} from "../lib/business-agent-rag";
function TypedMessage({text}){const [visible,setVisible]=useState("");useEffect(()=>{setVisible("");let i=0;const handle=setInterval(()=>{i=Math.min(String(text).length,i+2);setVisible(String(text).slice(0,i));if(i>=String(text).length)clearInterval(handle);},18);return()=>clearInterval(handle);},[text]);return <>{visible}<span aria-hidden="true" className="animate-pulse">▏</span></>;}
const questions=["What services do you offer?","Can I request an appointment?","What are your hours?","Can I get pricing?"];
function previewAnswer(question,site){
 const facts=factChunks(site);
 const gate=classifyBusinessQuestion(question,site,facts);
 return safeBusinessAnswer(question,site,gate,retrieveBusinessFacts(question,site,facts,gate));
}
export default function SiteChat({site,preview=false}){
 const [open,setOpen]=useState(Boolean(preview));
 const [text,setText]=useState("");
 const [messages,setMessages]=useState([]);
 const [busy,setBusy]=useState(false),[voiceEnabled,setVoiceEnabled]=useState(false);
 const sequence=useRef(0);
 const [bookingOpen,setBookingOpen]=useState(false);
 const [booking,setBooking]=useState({name:"",contact:"",service:"",date:"",time:""});
 const [bookingNotice,setBookingNotice]=useState("");
 useEffect(()=>{try{if(window.parent!==window)window.parent.postMessage({type:"FUGTH_CHAT_RESIZE",open},"*");}catch{}},[open]);
 if(site.showChatbot===false||site.aiAgentMode==="off")return null;
 async function ask(value){
  const question=String(value||"").trim().slice(0,350);
  if(!question||busy)return;
  setText("");
  const id=++sequence.current;
  if(/appoint|book|schedule|reserve|consultation/i.test(question)){
   setBookingOpen(true);
   setMessages(old=>[...old.slice(-10),{from:"visitor",text:question,id:"ask"+id},
    {from:"bot",text:"I can help you prepare a request to the business. Please choose a service and preferred time below; a real appointment is not booked until the team confirms.",id:"answer"+id}]);
   return;
  }
  const pendingId="answer"+id;
  setMessages(old=>[...old.slice(-10),{from:"visitor",text:question,id:"ask"+id},
   {from:"bot",text:"Checking the business details…",id:pendingId,pending:true}]);
  setBusy(true);
  let answer=previewAnswer(question,site);
  try{
   if(!preview&&site.ownerId&&/^[-_A-Za-z0-9]{8,128}$/.test(site.ownerId)){
    const response=await fetch("/api/sites/"+encodeURIComponent(site.ownerId)+"/assistant",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({question}),cache:"no-store"
    });
    const result=await response.json();
    if(!response.ok&&result.mode!=="rate_limited")throw Error(result.error||"Assistant not available");
    if(result.reply)answer=String(result.reply).slice(0,440);
   }
  }catch{
   // The browser fallback uses the same strict business relevance gate,
   // never a general-purpose chatbot or a fabricated confirmation.
  }
  setMessages(old=>old.map(item=>item.id===pendingId?{...item,text:answer,pending:false}:item));
  if(voiceEnabled&&typeof window!=="undefined"&&window.speechSynthesis){
   try{
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(answer);
    utterance.lang="en-US";utterance.rate=.96;
    window.speechSynthesis.speak(utterance);
   }catch{}
  }
  setBusy(false);
 }
 function requestBooking(event){
  event.preventDefault();
  const destination=String(site.contactEmail||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)){
   setBookingNotice("Please use the business phone or contact link. Online email intake isn't available for this site.");
   return;
  }
  const subject="New appointment request — "+String(site.name||"Business").slice(0,70);
  const body=["Hello "+site.name+",","I would like to REQUEST an appointment (not a confirmed booking).",
    "Service: "+(booking.service||"Please advise"),"Preferred date: "+(booking.date||"Flexible"),
    "Preferred time: "+(booking.time||"Flexible"),"Name: "+booking.name,
    "Contact: "+booking.contact,"Please contact me to confirm availability."].join("\n");
  window.location.href="mailto:"+encodeURIComponent(destination)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  setBookingNotice("Your email app will open with the booking request. The business must confirm the appointment.");
 }
 return <div className={preview?"relative mx-auto my-12 w-full max-w-[800px] border-y border-zinc-200 bg-white px-4 py-7 sm:rounded-[24px] sm:border sm:px-8":"fixed bottom-4 right-4 z-[60] w-[min(380px,calc(100vw-2rem))] sm:bottom-6 sm:right-6"} data-fugth-chat="business-assistant">
  {open&&<section aria-label="Business website chat" className={preview?"flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_32px_rgba(0,0,0,.06)]":"mb-3 flex max-h-[min(580px,75vh)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_16px_70px_rgba(0,0,0,.18)]"}>
   <header className="flex items-center justify-between bg-zinc-950 px-5 py-4 text-white"><div><p className="text-sm font-semibold">Ask {site.name}</p><p className="mt-1 text-[11px] text-[#c0e1f2]">{preview?"Website preview / sample facts":site.aiAgentMode==="local"?"Business-only AI / grounded answers":"Published business facts only"}</p></div>{!preview&&<button type="button" onClick={()=>setOpen(false)} className="rounded-lg border border-white/20 px-3 py-2 text-sm" aria-label="Close chat">×</button>}</header>
   <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-[#fafaf8] p-4" role="log" aria-live="polite">
    <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white p-3 text-sm leading-6 text-zinc-800">{site.chatbotGreeting||"Hi! Welcome. How can I help you today?"}</p>
    {messages.map((m,i)=><p key={m.id||i} className={`max-w-[92%] rounded-2xl p-3 text-sm leading-6 ${m.from==="visitor"?"ml-auto rounded-br-sm bg-zinc-900 text-white":"rounded-bl-sm bg-white text-zinc-800"}`}>{m.from==="bot"?<TypedMessage text={m.text}/>:m.text}</p>)}
   </div>
   {messages.length<2&&<div className="flex gap-2 overflow-x-auto bg-[#fafaf8] px-4 pb-3">{questions.map(q=><button key={q} type="button" onClick={()=>ask(q)} className="shrink-0 rounded-full border border-zinc-300 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-800">{q}</button>)}</div>}
   {bookingOpen&&<form onSubmit={requestBooking} className="space-y-2 border-t border-zinc-200 bg-[#eef5e9] p-4"><div className="flex items-center justify-between"><strong className="text-sm">Request an appointment</strong><button type="button" onClick={()=>setBookingOpen(false)} className="text-xs font-semibold">Close</button></div>
    <select required value={booking.service} onChange={e=>setBooking(v=>({...v,service:e.target.value}))} className="w-full rounded-lg border border-[#cbdac5] bg-white p-2.5 text-xs"><option value="">Choose a service</option>{(site.services||[]).map(service=><option key={service} value={service}>{service}</option>)}<option value="General consultation">General consultation</option></select>
    <div className="grid grid-cols-2 gap-2"><input required type="date" value={booking.date} onChange={e=>setBooking(v=>({...v,date:e.target.value}))} className="w-full min-w-0 rounded-lg border border-[#cbdac5] p-2 text-xs"/><input type="time" value={booking.time} onChange={e=>setBooking(v=>({...v,time:e.target.value}))} className="w-full min-w-0 rounded-lg border border-[#cbdac5] p-2 text-xs"/></div>
    <input required maxLength={100} placeholder="Your name" value={booking.name} onChange={e=>setBooking(v=>({...v,name:e.target.value}))} className="w-full rounded-lg border border-[#cbdac5] p-2.5 text-xs"/>
    <input required maxLength={140} placeholder="Your email or phone" value={booking.contact} onChange={e=>setBooking(v=>({...v,contact:e.target.value}))} className="w-full rounded-lg border border-[#cbdac5] p-2.5 text-xs"/>
    <button type="submit" className="w-full rounded-lg bg-[#254c35] px-4 py-3 text-xs font-semibold text-white">Prepare booking request ↗</button>
    {bookingNotice&&<p role="status" className="text-[11px] leading-5 text-[#576b58]">{bookingNotice}</p>}
    <p className="text-[10px] leading-5 text-[#657566]">This requests an appointment; it does not reserve a calendar slot.</p>
   </form>}
   <div className="flex items-center justify-between gap-2 border-t border-[#e4edf3] bg-[#f6fbff] px-4 py-2 text-[10px] text-[#6287a0]"><span>Business questions only · No guesses</span><button type="button" onClick={()=>{setVoiceEnabled(v=>!v);window.speechSynthesis?.cancel();}} className="rounded-full border border-[#c9e3f1] bg-white px-3 py-1.5 font-bold text-[#377a9e]">{voiceEnabled?"🔊 Read answers: On":"🔈 Read answers: Off"}</button></div>
   <form onSubmit={e=>{e.preventDefault();ask(text);}} className="flex gap-2 border-t border-zinc-200 bg-white p-3"><label className="sr-only" htmlFor="fugth-site-chat-input">Your question</label><input id="fugth-site-chat-input" maxLength={220} autoComplete="off" placeholder="Ask a quick question..." value={text} onChange={e=>setText(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900"/><button disabled={busy||!text.trim()} className="rounded-lg bg-[#193e54] px-4 py-2 text-sm font-semibold text-white disabled:opacity-45">{busy?"Checking…":"Send"}</button></form>
   <p className="px-4 pb-3 text-[10px] leading-5 text-zinc-500">Answers are restricted to the business's published information. Off-topic questions are filtered before the AI. Appointment requests open email; the business must confirm. No live booking occurs in chat.</p>
  </section>}
  {!preview&&<div className="flex justify-end"><button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex items-center gap-3 rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white shadow-xl"><span aria-hidden="true">✳</span>{open?"Close chat":"Chat with us"}</button></div>}
 </div>;
}
