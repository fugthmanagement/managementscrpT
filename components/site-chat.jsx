"use client";
import {useState} from "react";
const questions=["What services do you offer?","What are your hours?","How can I contact you?","Where do you work?"];
function reply(q,site){
 const text=String(q||"").toLowerCase();
 if(/appoint|book|schedule|reserv|availability/.test(text))
   return site.contactEmail||site.phone?"I'd be happy to help you contact the team about an appointment. Please use the contact options on this page.":"Please contact the business to confirm availability. Appointments aren't booked in this preview.";
 if(/hour|time|open|close|weekend/.test(text))return site.businessHours? "Our listed business hours are "+site.businessHours+".":"Business hours haven't been added to this site yet. The team can confirm them.";
 if(/location|address|area|where|near/.test(text))return site.serviceArea?"We serve "+site.serviceArea+".":"Our service area hasn't been listed here yet.";
 if(/service|offer|do you|provide/.test(text))return site.services?.length?"We can help with "+site.services.join(", ")+".":"Our services will be listed here soon.";
 if(/call|phone|email|contact|reach/.test(text))return site.phone?"You can call us at "+site.phone+".":site.contactEmail?"You can email us at "+site.contactEmail+".":"Contact details aren't available on this website yet.";
 if(/price|cost|quote|estimate|insurance/.test(text))return "Our team can help you with pricing or estimates. Please contact the business directly for an accurate answer.";
 if(/name|who are you|business/.test(text))return "Welcome to "+site.name+". I'm here to help you find the details listed on this site.";
 return "I can help with services, hours, contact details, and appointment inquiries. Which would you like to know about?";
}
export default function SiteChat({site}){
 const [open,setOpen]=useState(false);
 const [text,setText]=useState("");
 const [messages,setMessages]=useState([]);
 if(site.showChatbot===false)return null;
 function ask(value){
  const query=String(value||"").trim().slice(0,220);if(!query)return;
  setMessages(old=>[...old.slice(-8),{from:"visitor",text:query},{from:"bot",text:reply(query,site)}]);
  setText("");
 }
 return <div className="fixed bottom-4 right-4 z-[60] w-[min(380px,calc(100vw-2rem))] sm:bottom-6 sm:right-6" data-fugth-chat="business-assistant">
  {open&&<section aria-label="Business website chat" className="mb-3 flex max-h-[min(580px,75vh)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_16px_70px_rgba(0,0,0,.18)]">
   <header className="flex items-center justify-between bg-zinc-950 px-5 py-4 text-white"><div><p className="text-sm font-semibold">Ask {site.name}</p><p className="mt-1 text-[11px] text-zinc-300">FUGTH website assistant</p></div><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border border-white/20 px-3 py-2 text-sm" aria-label="Close chat">×</button></header>
   <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-[#fafaf8] p-4" role="log" aria-live="polite">
    <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white p-3 text-sm leading-6 text-zinc-800">{site.chatbotGreeting||"Hi! Welcome. How can I help you today?"}</p>
    {messages.map((m,i)=><p key={i} className={`max-w-[92%] rounded-2xl p-3 text-sm leading-6 ${m.from==="visitor"?"ml-auto rounded-br-sm bg-zinc-900 text-white":"rounded-bl-sm bg-white text-zinc-800"}`}>{m.text}</p>)}
   </div>
   {messages.length<2&&<div className="flex gap-2 overflow-x-auto bg-[#fafaf8] px-4 pb-3">{questions.map(q=><button key={q} type="button" onClick={()=>ask(q)} className="shrink-0 rounded-full border border-zinc-300 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-800">{q}</button>)}</div>}
   <form onSubmit={e=>{e.preventDefault();ask(text);}} className="flex gap-2 border-t border-zinc-200 bg-white p-3"><label className="sr-only" htmlFor="fugth-site-chat-input">Your question</label><input id="fugth-site-chat-input" maxLength={220} autoComplete="off" placeholder="Ask a quick question..." value={text} onChange={e=>setText(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900"/><button className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">Send</button></form>
   <p className="px-4 pb-3 text-[10px] leading-5 text-zinc-500">Answers use published business details. No live calendar booking or human operator is connected to this website chat.</p>
  </section>}
  <div className="flex justify-end"><button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex items-center gap-3 rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white shadow-xl"><span aria-hidden="true">✳</span>{open?"Close chat":"Chat with us"}</button></div>
 </div>;
}
