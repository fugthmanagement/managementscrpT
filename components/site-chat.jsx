"use client";
import {useEffect,useRef,useState} from "react";
import {factChunks,classifyBusinessQuestion,retrieveBusinessFacts,safeBusinessAnswer,previewConceptAnswer} from "../lib/business-agent-rag";
import {sitePresetQuestions} from "../lib/site-preset-questions";
function TypedMessage({text}){const [visible,setVisible]=useState("");useEffect(()=>{setVisible("");let i=0;const handle=setInterval(()=>{i=Math.min(String(text).length,i+2);setVisible(String(text).slice(0,i));if(i>=String(text).length)clearInterval(handle);},18);return()=>clearInterval(handle);},[text]);return <>{visible}<span aria-hidden="true" className="animate-pulse">▏</span></>;}

function previewAnswer(question,site,isPreview=false){
 if(isPreview)return previewConceptAnswer(question,site);
 const facts=factChunks(site),gate=classifyBusinessQuestion(question,site,facts);
 return safeBusinessAnswer(question,site,gate,retrieveBusinessFacts(question,site,facts,gate));
}
export default function SiteChat({site,preview=false,demoId=""}){
 const [open,setOpen]=useState(Boolean(preview));
 const [text,setText]=useState("");
 const [messages,setMessages]=useState([]);
 const [busy,setBusy]=useState(false),[voiceEnabled,setVoiceEnabled]=useState(false);
 const [chatMode,setChatMode]=useState("facts"),[progress,setProgress]=useState("");
 const [micAvailable,setMicAvailable]=useState(false),[listening,setListening]=useState(false);
 const sequence=useRef(0);
 const recognitionRef=useRef(null);
 const [bookingOpen,setBookingOpen]=useState(false);
 const [booking,setBooking]=useState({name:"",contact:"",service:"",date:"",time:""});
 const [bookingNotice,setBookingNotice]=useState("");
 const presetOnly=site.aiAgentMode!=="local";
 const choices=sitePresetQuestions(site,preview);
 function answerPreset(item){
  if(!item||busy)return;
  const id=++sequence.current;
  setMessages(old=>[...old.slice(-14),{from:"visitor",id:"question"+id,text:item.question},
   {from:"bot",id:"preset"+id,text:item.answer,pending:false,mode:"preset"}]);
  if(item.id==="appointment"&&site.contactEmail)setBookingOpen(true);
 }

 useEffect(()=>{try{if(window.parent!==window)window.parent.postMessage({type:"FUGTH_CHAT_RESIZE",open},"*");}catch{}},[open]);
 useEffect(()=>{
  setMicAvailable(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));
  return()=>{
   try{recognitionRef.current?.abort();window.speechSynthesis?.cancel();}catch{}
  };
 },[]);
 function dictate(){
  if(recognitionRef.current){
   try{recognitionRef.current.stop();}catch{}
   return;
  }
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition)return;
  const recognition=new Recognition();
  recognition.lang="en-US";recognition.interimResults=false;recognition.continuous=false;
  recognitionRef.current=recognition;
  recognition.onstart=()=>setListening(true);
  recognition.onresult=e=>{
   const spoken=Array.from(e.results||[]).map(x=>x[0]?.transcript||"").join(" ").trim();
   if(spoken)setText(spoken.slice(0,220));
  };
  recognition.onerror=e=>{
   if(e.error==="not-allowed")setText("Please allow microphone permission or type your question.");
  };
  recognition.onend=()=>{
   if(recognitionRef.current===recognition)recognitionRef.current=null;
   setListening(false);
  };
  try{recognition.start();}
  catch{recognitionRef.current=null;setListening(false);}
 }

 if(site.showChatbot===false||site.aiAgentMode==="off")return null;
 async function ask(value){
  const question=String(value||"").trim().slice(0,350);
  if(!question||busy)return;
  setText("");setProgress("");
  const id=++sequence.current,pendingId="answer"+id;
  if(/appoint|book|schedule|reserve|consultation/i.test(question))setBookingOpen(true);
  setMessages(old=>[...old.slice(-14),{from:"visitor",text:question,id:"ask"+id},
   {from:"bot",text:"I'm checking the published business information…",id:pendingId,pending:true}]);
  setBusy(true);
  let answer=previewAnswer(question,site,preview);
  let detail="";let mode="verified_facts";
  const source=/^[a-f0-9]{24}$/.test(String(demoId||""))?{type:"demo",id:demoId}:
   /^[-_a-zA-Z0-9]{8,128}$/.test(String(site.ownerId||""))?
    {type:preview?"draft":"published",id:site.ownerId}:null;
  if(source){
   try{
    let token=null;
    if(source.type==="draft"){
     const firebase=await import("../lib/firebase");
     token=await firebase.auth.currentUser?.getIdToken();
     if(!token)throw Error("Owner preview must be opened while signed in.");
    }
    const response=await fetch("/api/agent/chat",{method:"POST",cache:"no-store",
     headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},
     body:JSON.stringify({source,question,mode:chatMode,stream:true})});
    if(!response.ok)throw Error("FUGTH assistant is busy");
    if(!response.body)throw Error("Streaming not available");
    const reader=response.body.getReader(),decoder=new TextDecoder();
    let buffer="",completed=false;
    const consumeBlock=block=>{
     const lines=block.split(/\r?\n/);
     const evt=lines.find(line=>line.startsWith("event: "))?.slice(7)||"message";
     const raw=lines.filter(line=>line.startsWith("data: ")).map(line=>line.slice(6)).join("\n");
     if(!raw)return;
     let value;try{value=JSON.parse(raw)}catch{return}
     if(evt==="progress"){
      detail=String(value.message||"Checking the business facts…").slice(0,175);
      setProgress(detail);
      setMessages(old=>old.map(item=>item.id===pendingId?{...item,text:detail,pending:true}:item));
     }else if(evt==="result"){
      completed=true;
      answer=String(value.reply||answer).slice(0,440);
      mode=value.mode||"verified_facts";
     }
    };
    while(true){
     const part=await reader.read();
     if(part.done)break;
     buffer+=decoder.decode(part.value,{stream:true});
     while(buffer.includes("\n\n")){
      const pos=buffer.indexOf("\n\n");const block=buffer.slice(0,pos);buffer=buffer.slice(pos+2);
      consumeBlock(block);
     }
    }
    if(buffer.trim())consumeBlock(buffer);
    if(!completed&&mode==="verified_facts")detail="Could not finish the AI request. Showing the verified business details.";
   }catch{
    detail="The live model wasn't available. Showing approved business facts instead.";
   }
  }else if(chatMode==="live"){
   detail="Save this website preview before using the live model. Using available site facts for now.";
  }
  setMessages(old=>old.map(item=>item.id===pendingId?{...item,text:answer,pending:false,mode}:item));
  setProgress(detail);setBusy(false);
  if(voiceEnabled&&typeof window!=="undefined"&&window.speechSynthesis){
   try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(answer);
    u.lang="en-US";u.rate=.96;window.speechSynthesis.speak(u)}catch{}
  }
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
   <header className="flex items-center justify-between bg-zinc-950 px-5 py-4 text-white"><div><p className="text-sm font-semibold">Ask {site.name}</p><p className="mt-1 text-[11px] text-[#c0e1f2]">{preview?"Independent website concept · sample details pending owner approval":"Business-only assistance · no invented details"}</p></div>{!preview&&<button type="button" onClick={()=>setOpen(false)} className="rounded-lg border border-white/20 px-3 py-2 text-sm" aria-label="Close chat">×</button>}</header>
   {presetOnly?
    <div className="border-b border-zinc-200 bg-[#f2faff] px-4 py-3 text-xs font-semibold text-[#285774]">
     Quick answers only · Choose one of the prepared questions below. No AI model or free-text questions are used.
    </div>:
    <div className="flex flex-wrap gap-2 border-b border-zinc-200 bg-white px-4 py-3" role="tablist" aria-label="Chat answer mode">
     <button type="button" role="tab" aria-selected={chatMode==="facts"} disabled={busy}
      onClick={()=>{setChatMode("facts");setProgress("");}}
      className={"rounded-full px-4 py-2 text-xs font-bold "+(chatMode==="facts"?"bg-zinc-900 text-white":"bg-zinc-100 text-zinc-700")}>Prepared questions</button>
     <button type="button" role="tab" aria-selected={chatMode==="live"} disabled={busy}
      onClick={()=>{setChatMode("live");setProgress("");}}
      className={"rounded-full px-4 py-2 text-xs font-bold "+(chatMode==="live"?"bg-[#124d67] text-white":"bg-[#e7f3fa] text-[#245871]")}>✦ GGUF live support</button>
     {chatMode==="live"&&<span className="self-center text-[10px] text-[#668899]">Uses the assigned GGUF queue · may take longer</span>}
    </div>}
   {busy&&<div className="border-b border-[#dceaf1] bg-[#f3faff] px-4 py-3" role="status">
    <div className="mb-2 flex items-center justify-between text-[11px] text-[#42738d]"><span>{progress||"Retrieving business details…"}</span><span className="ml-2 animate-pulse">● ● ●</span></div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#d5eaf4]"><div className="h-full w-2/5 animate-pulse rounded-full bg-[#4699bc]"/></div>
   </div>}
   <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-[#fafaf8] p-4" role="log" aria-live="polite">
    <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white p-3 text-sm leading-6 text-zinc-800">{site.chatbotGreeting||"Hi! Welcome. How can I help you today?"}</p>
    {messages.map((m,i)=><p key={m.id||i} className={`max-w-[92%] rounded-2xl p-3 text-sm leading-6 ${m.from==="visitor"?"ml-auto rounded-br-sm bg-zinc-900 text-white":"rounded-bl-sm bg-white text-zinc-800"}`}>{m.from==="bot"?(m.pending?<span>{m.text} <span className="inline-flex animate-pulse tracking-widest text-[#3a8cb2]" aria-label="Assistant typing">•••</span></span>:<TypedMessage text={m.text}/>):m.text}</p>)}
   </div>
   {(presetOnly||chatMode==="facts")&&<div className="max-h-[235px] space-y-2 overflow-y-auto border-t border-zinc-100 bg-[#fafaf8] px-4 py-3">
    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Choose a question</p>
    <div className="flex flex-wrap gap-2">{choices.map(item=><button key={item.id} type="button"
     onClick={()=>answerPreset(item)}
     className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-left text-[11px] font-semibold text-zinc-800 hover:border-[#90bed4]">
     {item.question}</button>)}</div>
   </div>}
   {bookingOpen&&<form onSubmit={requestBooking} className="space-y-2 border-t border-zinc-200 bg-[#eef5e9] p-4"><div className="flex items-center justify-between"><strong className="text-sm">Request an appointment</strong><button type="button" onClick={()=>setBookingOpen(false)} className="text-xs font-semibold">Close</button></div>
    <select required value={booking.service} onChange={e=>setBooking(v=>({...v,service:e.target.value}))} className="w-full rounded-lg border border-[#cbdac5] bg-white p-2.5 text-xs"><option value="">Choose a service</option>{(site.services||[]).map(service=><option key={service} value={service}>{service}</option>)}<option value="General consultation">General consultation</option></select>
    <div className="grid grid-cols-2 gap-2"><input required type="date" value={booking.date} onChange={e=>setBooking(v=>({...v,date:e.target.value}))} className="w-full min-w-0 rounded-lg border border-[#cbdac5] p-2 text-xs"/><input type="time" value={booking.time} onChange={e=>setBooking(v=>({...v,time:e.target.value}))} className="w-full min-w-0 rounded-lg border border-[#cbdac5] p-2 text-xs"/></div>
    <input required maxLength={100} placeholder="Your name" value={booking.name} onChange={e=>setBooking(v=>({...v,name:e.target.value}))} className="w-full rounded-lg border border-[#cbdac5] p-2.5 text-xs"/>
    <input required maxLength={140} placeholder="Your email or phone" value={booking.contact} onChange={e=>setBooking(v=>({...v,contact:e.target.value}))} className="w-full rounded-lg border border-[#cbdac5] p-2.5 text-xs"/>
    <button type="submit" className="w-full rounded-lg bg-[#254c35] px-4 py-3 text-xs font-semibold text-white">Prepare booking request ↗</button>
    {bookingNotice&&<p role="status" className="text-[11px] leading-5 text-[#576b58]">{bookingNotice}</p>}
    {demoId&&<a className="block rounded-lg bg-[#1d576c] px-4 py-3 text-center text-xs font-black text-white" href={"/book?site="+encodeURIComponent(demoId)}>Book an available FUGTH demo consultation ↗</a>}
    <p className="text-[10px] leading-5 text-[#657566]">This requests an appointment; it does not reserve a calendar slot.</p>
   </form>}
   <div className="flex items-center justify-between gap-2 border-t border-[#e4edf3] bg-[#f6fbff] px-4 py-2 text-[10px] text-[#6287a0]"><span>Business questions only · No guesses</span><button type="button" onClick={()=>{setVoiceEnabled(v=>!v);window.speechSynthesis?.cancel();}} className="rounded-full border border-[#c9e3f1] bg-white px-3 py-1.5 font-bold text-[#377a9e]">{voiceEnabled?"🔊 Read answers: On":"🔈 Read answers: Off"}</button></div>
   {!presetOnly&&chatMode==="live"&&<form onSubmit={e=>{e.preventDefault();ask(text);}} className="flex gap-2 border-t border-zinc-200 bg-white p-3"><label className="sr-only" htmlFor="fugth-site-chat-input">Your question</label><input id="fugth-site-chat-input" maxLength={220} autoComplete="off" placeholder="Ask the GGUF AI a business question..." value={text} onChange={e=>setText(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-900"/>{micAvailable&&<button type="button" disabled={busy} onClick={dictate} className={"rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40 "+(listening?"border-[#b8cbe0] bg-[#ecf8ff] text-[#1e729a]":"border-[#d7e7ef] bg-white text-[#5083a0]")} aria-label={listening?"Stop recording question":"Speak a business question"}>{listening?"■":"🎤"}</button>}
    <button disabled={busy||!text.trim()} className="rounded-lg bg-[#193e54] px-4 py-2 text-sm font-semibold text-white disabled:opacity-45">{busy?"Checking…":"Send"}</button></form>}
   <p className="px-4 pb-3 text-[10px] leading-5 text-zinc-500">Answers are restricted to the business's published information. Off-topic questions are filtered before the AI. Appointment requests open email; the business must confirm. No live booking occurs in chat. Microphone input, if used, relies on browser speech-recognition services.</p>
  </section>}
  {!preview&&<div className="flex justify-end"><button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex items-center gap-3 rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white shadow-xl"><span aria-hidden="true">✳</span>{open?"Close chat":"Chat with us"}</button></div>}
 </div>;
}
