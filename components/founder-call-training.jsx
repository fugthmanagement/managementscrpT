"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {TRAINING_LEVELS,TRAINING_PERSONAS,createPractice,practiceTurn,practiceReport} from "../lib/call-training-engine";
import {pitchOptions,trainingPitch} from "./founder-pitch-switcher";

const HISTORY_KEY="fugth-founder-call-training-history-v1";
const pane="rounded-[24px] border border-[#cfdfeb] bg-white shadow-[0_10px_38px_rgba(22,63,92,.055)]";
const field="mt-2 block w-full rounded-xl border border-[#cbdde9] bg-white px-3.5 py-3 text-sm text-[#23465c] outline-none transition focus:border-[#54aee0] focus:ring-2 focus:ring-[#dff2fe]";
const levelColor={warmup:"#9bdacf",normal:"#8fcfea",hard:"#d3aad4",expert:"#f4af88"};
const labelOf=(items,id)=>items.find(x=>x.id===id)?.label||id;
const clock=s=>{const n=Math.max(0,Math.floor(s));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0");};
function scriptLine(phase,script,objection){
 if(!script)return "";
 if(phase==="opening"||phase==="gatekeeper")return script.opener;
 if(phase==="discovery"||phase==="value")return script.bridge;
 if(phase==="objection")return objection==="busy"?script.busy:script.no;
 if(phase==="email")return script.yes;
 if(phase==="schedule"||phase==="closing")return script.close;
 return "Finish politely, confirm next steps, and respect their answer.";
}
const phases={opening:"OPENING",gatekeeper:"THE GATEKEEPER",discovery:"DISCOVERY",value:"EXPLAIN THE VALUE",objection:"OBJECTION",email:"CONTACT DETAILS",schedule:"SET A TIME",closing:"CONFIRM & CLOSE",refusal:"FIRM NO",done:"CALL COMPLETE"};
function downloadTranscript(session,messages,summary){
 const lines=["FUGTH / PRACTICE CALL","Training only — No real call was placed","Business: "+session.business,
  "Difficulty: "+session.difficulty,"Prospect type: "+session.persona,"Result: "+summary.outcome,
  "Score: "+summary.score+"/100","",...messages.map(m=>(m.role==="prospect"?"PROSPECT: ":"YOU: ")+m.text)];
 const blob=new Blob([lines.join("\n\n")],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="fugth-call-practice.txt";a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function FounderCallTraining(){
 const [settings,setSettings]=useState({business:"Coastal Home Services",difficulty:"normal",persona:"random",pitch:"referral"});
 const [session,setSession]=useState(null),[messages,setMessages]=useState([]),[summary,setSummary]=useState(null);
 const [history,setHistory]=useState([]),[draft,setDraft]=useState(""),[notice,setNotice]=useState("");
 const [showMap,setShowMap]=useState(false),[mapReady,setMapReady]=useState(false),[mapStep,setMapStep]=useState("start");
 const [autoFollow,setAutoFollow]=useState(true),[showCoach,setShowCoach]=useState(true);
 const [canHear,setCanHear]=useState(false),[canTalk,setCanTalk]=useState(false);
 const [voices,setVoices]=useState([]),[selectedVoice,setSelectedVoice]=useState("");
 const [speechEnabled,setSpeechEnabled]=useState(true),[autoListen,setAutoListen]=useState(true),[speed,setSpeed]=useState(1);
 const [speaking,setSpeaking]=useState(false),[listening,setListening]=useState(false),[interim,setInterim]=useState("");
 const [seconds,setSeconds]=useState(0);
 const liveRef=useRef(null),recognitionRef=useRef(null),generationRef=useRef(0),speakingRef=useRef(false);
 const speechRef=useRef(true),autoRef=useRef(true),voiceRef=useRef(""),rateRef=useRef(1);
 const transcriptRef=useRef(null),mapRef=useRef(null),expectedMapRef=useRef("start"),manualGuideRef=useRef(false);
 const turnHandlerRef=useRef(null);
 const started=Boolean(session),active=started&&!session.done;
 const chosenPersona=labelOf(TRAINING_PERSONAS,session?.persona||settings.persona);
 const pitch=useMemo(()=>trainingPitch(session?.pitch||settings.pitch,{business:session?.business||settings.business}),[session?.pitch,settings.pitch,session?.business,settings.business]);
 const cue=scriptLine(session?.phase||"opening",pitch,session?.objection);
 const grade=summary||session?.done&&practiceReport(session);
 const lastMessage=messages[messages.length-1];
 useEffect(()=>{speechRef.current=speechEnabled;},[speechEnabled]);
 useEffect(()=>{autoRef.current=autoListen;},[autoListen]);
 useEffect(()=>{voiceRef.current=selectedVoice;},[selectedVoice]);
 useEffect(()=>{rateRef.current=speed;},[speed]);
 useEffect(()=>{
  try{
   const saved=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
   if(Array.isArray(saved))setHistory(saved.slice(0,12));
  }catch{}
  const detect=()=>{
   setCanHear(Boolean(window.speechSynthesis&&window.SpeechSynthesisUtterance));
   setCanTalk(Boolean(window.SpeechRecognition||window.webkitSpeechRecognition));
   const available=window.speechSynthesis?.getVoices?.()||[];
   setVoices(available.filter(v=>/^en([-_]|$)/i.test(v.lang)).slice(0,40));
  };
  detect();
  if(window.speechSynthesis){
   window.speechSynthesis.addEventListener?.("voiceschanged",detect);
   return ()=>{window.speechSynthesis.removeEventListener?.("voiceschanged",detect);};
  }
 },[]);
 useEffect(()=>{
  if(!session?.createdAt||session.done)return;
  const tick=()=>setSeconds(Math.floor((Date.now()-session.createdAt)/1000));
  tick();const id=window.setInterval(tick,1000);
  return()=>window.clearInterval(id);
 },[session?.createdAt,session?.done]);
 useEffect(()=>{
  if(transcriptRef.current)transcriptRef.current.scrollTop=transcriptRef.current.scrollHeight;
 },[messages,interim]);
 useEffect(()=>{
  const message=event=>{
   if(!showMap||event.origin!==window.location.origin||event.source!==mapRef.current?.contentWindow||event.data?.source!=="fugth-pierre-guide")return;
   if(event.data.type!=="change")return;
   const node=String(event.data.node||"start");
   setMapStep(node);
   if(manualGuideRef.current&&node!==expectedMapRef.current){
    setAutoFollow(false);
   }
  };
  window.addEventListener("message",message);
  return()=>window.removeEventListener("message",message);
 },[showMap]);
 useEffect(()=>{
  if(!showMap||!mapReady||!session||!autoFollow)return;
  expectedMapRef.current=session.scriptNode||"start";
  manualGuideRef.current=false;
  const frame=mapRef.current?.contentWindow;
  if(!frame)return;
  frame.postMessage({source:"fugth-sales-parent",type:"load",step:expectedMapRef.current,path:[],
   lead:{business:session.business,contact:"",phone:"",email:"",type:"Practice / simulated",stage:"New prospect",notes:"Simulation only; no real lead"}},window.location.origin);
  setMapStep(expectedMapRef.current);
  window.setTimeout(()=>{manualGuideRef.current=true;},200);
 },[session?.scriptNode,session?.createdAt,showMap,mapReady,autoFollow]);
 useEffect(()=>()=>{ 
  generationRef.current++;
  try{recognitionRef.current?.abort();}catch{}
  try{window.speechSynthesis?.cancel();}catch{}
 },[]);

 function ceaseSound(){
  generationRef.current++;
  speakingRef.current=false;setSpeaking(false);
  try{recognitionRef.current?.abort();}catch{}
  recognitionRef.current=null;
  setListening(false);setInterim("");
  try{window.speechSynthesis?.cancel();}catch{}
 }
 function beginListening(){
  if(!liveRef.current||liveRef.current.done)return;
  if(speakingRef.current){setNotice("The prospect is talking. The microphone will open when they finish.");return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){setNotice("Speech recognition isn't available in this browser. Type your answer below, or try desktop Chrome or Edge.");return;}
  if(recognitionRef.current)return;
  setNotice("");setInterim("");
  const recognition=new Recognition();
  recognition.lang="en-US";
  recognition.interimResults=true;
  recognition.continuous=false;
  recognition.maxAlternatives=1;
  let handled=false,heard=false;
  recognitionRef.current=recognition;
  recognition.onstart=()=>{setListening(true);setNotice("Listening to your side of the call. Speak naturally, then pause.");};
  recognition.onresult=event=>{
   let partial="",final="";
   for(let i=event.resultIndex;i<event.results.length;i++){
    const value=event.results[i][0]?.transcript||"";
    if(event.results[i].isFinal)final+=value+" ";
    else partial+=value+" ";
   }
   if(partial.trim())setInterim(partial.trim());
   if(final.trim()&&!handled){
    handled=true;heard=true;setInterim("");
    try{recognition.stop();}catch{}
    turnHandlerRef.current?.(final.trim());
   }
  };
  recognition.onerror=event=>{
   if(event.error==="not-allowed"||event.error==="service-not-allowed")
    setNotice("Microphone or speech recognition permission was blocked. Allow it in your browser, or type a response.");
   else if(event.error==="no-speech")setNotice("I didn't catch anything. Tap Speak and try again.");
   else if(event.error!=="aborted")setNotice("Speech recognition issue: "+String(event.error||"try again")+". You can still type.");
  };
  recognition.onend=()=>{
   if(recognitionRef.current===recognition)recognitionRef.current=null;
   setListening(false);
   if(!handled&&!heard)setInterim("");
  };
  try{recognition.start();}
  catch(e){recognitionRef.current=null;setListening(false);setNotice("Microphone couldn't start. Try again or type your answer.");}
 }
 function speakProspect(text){
  if(!text)return;
  if(!speechRef.current||!window.speechSynthesis||!window.SpeechSynthesisUtterance){
   speakingRef.current=false;setSpeaking(false);
   if(autoRef.current&&liveRef.current&&!liveRef.current.done)beginListening();
   return;
  }
  try{window.speechSynthesis.cancel();}catch{}
  const ticket=++generationRef.current,utterance=new SpeechSynthesisUtterance(text);
  const voice=window.speechSynthesis.getVoices().find(v=>v.voiceURI===voiceRef.current);
  if(voice)utterance.voice=voice;
  utterance.lang=voice?.lang||"en-US";
  utterance.rate=rateRef.current;
  utterance.pitch=0.96;
  utterance.volume=1;
  speakingRef.current=true;setSpeaking(true);
  const finished=()=>{
   if(ticket!==generationRef.current)return;
   speakingRef.current=false;setSpeaking(false);
   if(autoRef.current&&liveRef.current&&!liveRef.current.done)beginListening();
  };
  utterance.onend=finished;
  utterance.onerror=finished;
  try{window.speechSynthesis.speak(utterance);}
  catch{finished();setNotice("Voice output is unavailable; the transcript still works.");}
 }
 function savePractice(next){
  const summary=practiceReport(next);
  setSummary(summary);
  const item={id:Date.now(),at:new Date().toISOString(),business:next.business,
   difficulty:next.difficulty,persona:next.persona,score:summary.score,outcome:summary.outcome,turns:next.turns};
  setHistory(old=>{
   const latest=[item,...old].slice(0,12);
   try{localStorage.setItem(HISTORY_KEY,JSON.stringify(latest));}catch{}
   return latest;
  });
  return summary;
 }
 function submitTurn(raw){
  const text=String(raw||"").trim();
  const current=liveRef.current;
  if(!text||!current||current.done)return;
  setDraft("");setInterim("");
  if(recognitionRef.current){
   const old=recognitionRef.current;recognitionRef.current=null;
   old.onresult=null;old.onend=null;old.onerror=null;
   try{old.abort();}catch{}
  }
  setListening(false);
  const next=practiceTurn(current,text);
  liveRef.current=next;setSession(next);
  setMessages(old=>[...old,{role:"trainee",text,at:Date.now()},
   {role:"prospect",text:next.lastProspect,at:Date.now()}]);
  if(next.done)savePractice(next);
  speakProspect(next.lastProspect);
 }
 turnHandlerRef.current=submitTurn;
 function startCall(){
  ceaseSound();
  const fresh=createPractice(settings);
  liveRef.current=fresh;setSession(fresh);setSummary(null);setSeconds(0);
  setMessages([{role:"prospect",text:fresh.lastProspect,at:Date.now()}]);setDraft("");
  setNotice("Practice call started. No real number was dialed and no customer records will be created.");
  setAutoFollow(true);setMapReady(false);setMapStep("start");
  speakProspect(fresh.lastProspect);
 }
 function endCall(){
  if(!liveRef.current||liveRef.current.done)return;
  ceaseSound();
  const next={...liveRef.current,phase:"done",done:true,result:"ended_early",
   lastProspect:"All right. Thanks for your time. Goodbye.",scriptNode:"finish"};
  liveRef.current=next;setSession(next);
  setMessages(old=>[...old,{role:"prospect",text:next.lastProspect,at:Date.now()}]);
  savePractice(next);
  speakProspect(next.lastProspect);
 }
 function toggleVoice(){
  if(speechEnabled){ceaseSound();setSpeechEnabled(false);}
  else{setSpeechEnabled(true);setNotice("Spoken responses are enabled. Select Replay prospect to hear the last line.");}
 }
 function syncGuide(){
  if(!session||!mapRef.current?.contentWindow)return;
  expectedMapRef.current=session.scriptNode||"start";setAutoFollow(true);
  mapRef.current.contentWindow.postMessage({source:"fugth-sales-parent",type:"load",
   step:expectedMapRef.current,path:[],
   lead:{business:session.business,stage:"New prospect",type:"Practice / simulated"}},
   window.location.origin);
 }
 function clearHistory(){
  if(!window.confirm("Clear training results stored on this browser?"))return;
  try{localStorage.removeItem(HISTORY_KEY);}catch{}
  setHistory([]);
 }
 return <div className="space-y-5">
  <section className="overflow-hidden rounded-[28px] border border-[#2d5871] bg-[#10283a] text-white">
   <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
    <div className="pointer-events-none absolute -right-24 -top-36 h-72 w-72 rounded-full border-[52px] border-[#a1d9f3]/[.07]"/>
    <div className="relative"><p className="text-[10px] font-black uppercase tracking-[.21em] text-[#94d3f3]">FUGTH / SALES LAB / 01</p>
     <h2 className="mt-3 text-4xl font-black leading-[.99] tracking-[-.07em] sm:text-5xl">Practice the call.<br/><span className="font-serif font-normal italic text-[#b9e5fb]">Handle the hesitation.</span></h2>
     <p className="mt-4 max-w-xl text-sm leading-7 text-[#bbd0db]">A simulated prospect that talks back. Train openings, objections, emails and appointment closes before speaking to a real business owner.</p>
    </div>
    <div className="relative flex flex-col gap-3 sm:flex-row lg:flex-col">
     <button type="button" onClick={startCall} className="rounded-full bg-[#b9e5fb] px-7 py-4 text-sm font-black text-[#1b4157] transition hover:bg-white">{active?"↻ Restart practice":"☎ Start practice call"}</button>
     {active&&<button type="button" onClick={endCall} className="rounded-full border border-white/25 px-6 py-3 text-xs font-bold text-white hover:bg-white/10">End practice & see score</button>}
    </div>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#172f42] px-6 py-3 text-[10px] font-bold tracking-[.04em] text-[#9ac4d9] sm:px-8">
    <span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#74d7b8]"/>NO LIVE DIALING · NO TELEPHONY COSTS</span>
    <span>SIMULATED CUSTOMER / BROWSER PRACTICE</span>
   </div>
  </section>
  <div className="grid items-start gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
   <aside className="space-y-4">
    <section className={pane+" p-5"}><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#5586a0]">01 / Scenario setup</p>
     <label className="mt-4 block text-xs font-bold text-[#436a82]">Practice business name<input value={settings.business} maxLength={80} disabled={active} onChange={e=>setSettings({...settings,business:e.target.value})} className={field+" disabled:opacity-55"}/></label>
     <label className="mt-4 block text-xs font-bold text-[#436a82]">Difficulty<select value={settings.difficulty} disabled={active} onChange={e=>setSettings({...settings,difficulty:e.target.value})} className={field+" disabled:opacity-55"}>
      {TRAINING_LEVELS.map(level=><option key={level.id} value={level.id}>{level.label}</option>)}</select></label>
     <p className="mt-2 text-[11px] leading-5 text-[#688c9c]">{TRAINING_LEVELS.find(x=>x.id===settings.difficulty)?.detail}</p>
     <div className="mt-4 grid grid-cols-4 gap-1.5">{TRAINING_LEVELS.map(level=><button key={level.id} title={level.detail} disabled={active} onClick={()=>setSettings({...settings,difficulty:level.id})} className={"h-1.5 rounded-full disabled:cursor-default "+(level.id===settings.difficulty?"opacity-100":"opacity-25")} style={{backgroundColor:levelColor[level.id]}} aria-label={"Select "+level.label} type="button"/>)}</div>
     <label className="mt-5 block text-xs font-bold text-[#436a82]">Who answers the call?<select value={settings.persona} disabled={active} onChange={e=>setSettings({...settings,persona:e.target.value})} className={field+" disabled:opacity-55"}><option value="random">Surprise me (random)</option>{TRAINING_PERSONAS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
     <label className="mt-4 block text-xs font-bold text-[#436a82]">Your Pierre sales approach<select value={settings.pitch} disabled={active} onChange={e=>setSettings({...settings,pitch:e.target.value})} className={field+" disabled:opacity-55"}>{pitchOptions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     {active&&<p className="mt-3 text-[11px] font-bold text-[#367c9e]">Restart practice to apply changes to the scenario.</p>}
    </section>
    <section className={pane+" p-5"}><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#5586a0]">02 / Audio settings</p>
     <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={toggleVoice} className={"rounded-xl px-3 py-2.5 text-xs font-bold "+(speechEnabled?"bg-[#daf2ff] text-[#215e7c]":"bg-[#f0f2f4] text-[#6c8390]")}>{speechEnabled?"🔊 Spoken replies on":"🔇 Spoken replies off"}</button>
      <label className="flex items-center gap-2 text-xs font-semibold text-[#527489]"><input type="checkbox" checked={autoListen} onChange={e=>setAutoListen(e.target.checked)} className="accent-[#2e85ae]"/>Auto-open mic</label></div>
     <label className="mt-4 block text-xs font-bold text-[#436a82]">Simulated prospect voice<select value={selectedVoice} onChange={e=>setSelectedVoice(e.target.value)} disabled={!canHear} className={field+" disabled:opacity-55"}><option value="">Browser default voice</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name+" ("+v.lang+")"}</option>)}</select></label>
     <label className="mt-4 block text-xs font-bold text-[#436a82]">Speaking pace · {speed.toFixed(2)}×<input type="range" min="0.8" max="1.2" step="0.05" value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="mt-3 w-full accent-[#3b96c0]"/></label>
     <p className="mt-3 text-[11px] leading-5 text-[#7391a3]">{!canHear?"Spoken replies are unavailable in this browser.":!canTalk?"Microphone transcription isn't available here. Typed training works.":"For best results, use desktop Chrome or Edge, allow the microphone, and use headphones to reduce echo."}</p>
    </section>
   </aside>
   <div className="min-w-0 space-y-5">
    <section className={pane+" overflow-hidden"}>
     <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0ebf2] bg-[#f5fbfe] p-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><span className={"grid h-11 w-11 place-items-center rounded-[15px] "+(active?"bg-[#d3effa] text-[#185778]":"bg-[#e7eef2] text-[#7896a6]")} aria-hidden="true">☎</span><div>
       <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#5488a5]">Your simulated call</p>
       <h3 className="mt-1 truncate text-base font-black tracking-tight text-[#224a63]">{session?.business||"Waiting for a practice call"}</h3></div></div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-black"><span className="rounded-full bg-white px-3 py-2 text-[#537e98]">{clock(seconds)}</span>{session&&<span className="rounded-full border border-[#c7e1ee] bg-white px-3 py-2 text-[#396f8c]">{session.turns+" / "+session.maxTurns+" turns"}</span>}<span className={"rounded-full px-3 py-2 "+(session?.done?"bg-[#def1ea] text-[#367b64]":listening?"bg-[#c4edf9] text-[#12658b]":speaking?"bg-[#f2e6d8] text-[#a56d40]":"bg-[#edf3f7] text-[#6b8799]")}>{session?.done?"Complete":listening?"● You're speaking":speaking?"● Prospect speaking":active?"Your turn":"Not started"}</span></div>
     </div>
     {session&&<div className="px-6 pt-4"><div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[.12em] text-[#5989a3]"><span>{phases[session.phase]||session.phase}</span><span>{chosenPersona+" · "+labelOf(TRAINING_LEVELS,session.difficulty)}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e4eef5]"><div className="h-full rounded-full bg-[#70bde2] transition-all" style={{width:Math.min(100,Math.round(session.turns/session.maxTurns*100))+"%"}}/></div></div>}
     <div ref={transcriptRef} aria-live="polite" aria-label="Call transcript" className="h-[330px] space-y-5 overflow-y-auto p-5 sm:h-[430px] sm:p-7">
      {!session&&<div className="flex h-full flex-col items-center justify-center text-center"><span className="mb-4 text-5xl text-[#7eb7d2]" aria-hidden="true">◉</span><p className="text-xl font-black text-[#20445a]">A real conversation starts with practice.</p><p className="mt-3 max-w-sm text-sm leading-7 text-[#6f91a3]">Choose a difficulty and prospect. Start the call, listen to their response, speak back, and work your way toward a booked practice meeting.</p></div>}
      {messages.map((msg,index)=><article key={index} className={"flex "+(msg.role==="trainee"?"justify-end":"justify-start")}><div className={"max-w-[92%] rounded-[19px] p-4 sm:max-w-[85%] sm:p-5 "+(msg.role==="trainee"?"rounded-br-sm bg-[#183e56] text-white":"rounded-bl-sm border border-[#cee4f0] bg-[#ebf7fd] text-[#26526b]")}><p className={"text-[10px] font-black uppercase tracking-[.12em] "+(msg.role==="trainee"?"text-[#aedaf0]":"text-[#4f91b2]")}>{msg.role==="trainee"?"YOU / SALES REP":"SIMULATED PROSPECT"}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{msg.text}</p></div></article>)}
      {interim&&<div className="flex justify-end"><p className="max-w-[85%] rounded-xl border border-dashed border-[#84c0da] bg-[#f2faff] p-4 text-sm italic text-[#467994]">{interim} …</p></div>}
     </div>
     <div className="border-t border-[#e1ecf3] bg-[#f9fcfe] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
       <button type="button" onClick={listening?()=>{try{recognitionRef.current?.stop();}catch{}}:beginListening} disabled={!active||!canTalk||speaking} className={"rounded-full px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 "+(listening?"bg-[#b35b4d]":"bg-[#1b789f]")}>{listening?"■ Stop microphone":"🎙 Speak my answer"}</button>
       <button type="button" onClick={()=>session&&speakProspect(session.lastProspect)} disabled={!session||!canHear||!speechEnabled} className="rounded-full border border-[#c6dfea] bg-white px-4 py-3 text-xs font-bold text-[#4f7e97] disabled:opacity-40">↻ Replay prospect</button>
       <button type="button" onClick={ceaseSound} disabled={!speaking&&!listening} className="rounded-full border border-[#dbe6ec] bg-white px-4 py-3 text-xs font-bold text-[#7390a1] disabled:opacity-35">Pause audio</button>
      </div>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();submitTurn(draft)}}>
       <label htmlFor="training-text-entry" className="sr-only">Type a sales-call answer</label>
       <textarea id="training-text-entry" rows={2} value={draft} disabled={!active} onChange={e=>setDraft(e.target.value)}
        placeholder={active?"Say your line aloud, or type here if your mic isn't available…":"Start a practice call to respond…"}
        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitTurn(draft)}}}
        className={"min-h-14 flex-1 resize-y "+field+" mt-0 disabled:bg-[#f1f5f7] disabled:opacity-55"}/>
       <button disabled={!active||!draft.trim()} className="self-end rounded-xl bg-[#163e56] px-6 py-4 text-xs font-black text-white transition hover:bg-[#246685] disabled:opacity-40">Reply →</button>
      </form>
      {notice&&<p role="status" className="mt-3 text-xs leading-5 text-[#587f97]">{notice}</p>}
     </div>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
     <section className={pane+" p-5"}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#538aaa]">03 / Live coach</p><label className="flex items-center gap-2 text-[11px] text-[#668ba0]"><input type="checkbox" checked={showCoach} onChange={e=>setShowCoach(e.target.checked)} className="accent-[#408cae]"/>Show hints</label></div>
      {showCoach?<><h4 className="mt-3 text-lg font-black tracking-tight text-[#244b62]">Your next move</h4><p className="mt-3 min-h-[65px] text-sm leading-7 text-[#5b8098]">{session?.coachTip||"Keep the introduction short, ask permission and find a need before pitching."}</p></>:<p className="mt-4 rounded-xl bg-[#f4f8fa] p-5 text-xs text-[#7193a6]">Coaching hidden. Test your instincts; your score still tracks the call.</p>}
      <p className="mt-4 text-[11px] font-semibold text-[#6d94a8]">THE GOAL</p><p className="mt-1 text-xs leading-6 text-[#587b90]">A genuine yes → email → a mutually agreed time, or a respectful no. No real contact details are collected.</p></section>
     <section className={pane+" p-5"}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#538aaa]">04 / Pierre's script</p><span className="rounded-full bg-[#e6f5fd] px-3 py-2 text-[10px] font-black text-[#377da0]">{pitch.type}</span></div>
      <h4 className="mt-3 text-lg font-black tracking-tight text-[#244b62]">Suggested line</h4><p className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl border border-[#c7deeb] bg-[#f1f9fe] p-4 text-xs leading-6 text-[#355e77]">{cue}</p>
      <button type="button" onClick={()=>{setShowMap(x=>!x);setMapReady(false);}} className="mt-4 text-xs font-black text-[#227da9] underline underline-offset-4">{showMap?"Hide Pierre's full conversion map ↑":"Open Pierre's clickable conversation map ↓"}</button></section>
    </div>
    {session?.done&&grade&&<section className="rounded-[24px] border border-[#bcdcec] bg-[#f0f9ff] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#4c83a2]">Practice complete / performance review</p><h3 className="mt-2 text-2xl font-black tracking-tight text-[#214a62]">{grade.outcome}</h3><p className="mt-2 text-xs text-[#60869d]">{grade.tip}</p></div><div className="grid h-24 w-24 place-items-center rounded-full border-[7px] border-[#9ad3ed] bg-white"><strong className="text-3xl font-black text-[#256d91]">{grade.score}</strong><small className="-mt-7 text-[10px] text-[#6087a0]">/ 100</small></div></div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">{grade.earned.map(item=><div key={item.key} className={"flex items-center justify-between gap-3 rounded-xl p-3 text-xs font-bold "+(item.met?"bg-[#e0f4eb] text-[#38795b]":"bg-white text-[#7e95a3]")}><span>{item.met?"✓":"○"} {item.label}</span><span>{item.met?"+":""}{item.met?item.points:0}/{item.points}</span></div>)}</div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={()=>downloadTranscript(session,messages,grade)} className="rounded-full bg-[#204b65] px-5 py-3 text-xs font-black text-white">Export practice transcript ↓</button><button type="button" onClick={startCall} className="rounded-full border border-[#b4d9ea] bg-white px-5 py-3 text-xs font-black text-[#387fa2]">Try again ↻</button></div>
     </section>}
   </div>
  </div>
  {showMap&&<section className={pane+" overflow-hidden"}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d6e6ee] bg-[#f0f9ff] p-5"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#4e82a1]">Pierre's original interactive conversion map</p><h3 className="mt-2 text-xl font-black text-[#254a62]">Follow the script while you speak.</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-[#5b819a]">Click Yes / No branches yourself, or let training suggest the closest script step. This is your original interactive map; it stays separate from real lead records.</p></div><div className="flex flex-wrap gap-2"><span className="self-center text-xs font-bold text-[#6d91a8]">Map: {mapStep}</span><label className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-[#567e94]"><input type="checkbox" checked={autoFollow} onChange={e=>setAutoFollow(e.target.checked)} className="accent-[#2886ad]"/>Auto-follow call</label><button type="button" onClick={syncGuide} disabled={!session||!mapReady} className="rounded-full bg-[#204c66] px-4 py-2.5 text-xs font-black text-white disabled:opacity-45">Sync to my current step</button></div></div>
    <iframe key={session?.createdAt||"idle"} ref={mapRef} title="Pierre's original branching call map (practice mode)" src="/pierre-cold-call-guide.html" onLoad={()=>setMapReady(true)} className="h-[680px] w-full border-none bg-[#faf7f1] sm:h-[750px]" allow="clipboard-write"/>
   </section>}
  <section className={pane+" p-5 sm:p-6"}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#54839c]">Recent practice / this device only</p><p className="mt-2 text-xs text-[#7795a5]">This browser stores only scores and session summaries. Practice audio and transcripts are not saved to FUGTH or Firestore.</p></div>{history.length>0&&<button type="button" onClick={clearHistory} className="text-xs font-bold text-[#a26060] underline">Clear history</button>}</div>
   {history.length?<div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{history.slice(0,6).map(item=><div key={item.id} className="rounded-xl border border-[#d9e7ee] bg-[#f7fbfd] p-4"><div className="flex items-center justify-between text-[11px] font-black text-[#3b7291]"><span>{labelOf(TRAINING_LEVELS,item.difficulty)}</span><span>{item.score}/100</span></div><p className="mt-2 truncate text-sm font-bold text-[#234b63]">{item.business}</p><p className="mt-1 text-[11px] text-[#7390a1]">{item.outcome} · {new Date(item.at).toLocaleDateString()}</p></div>)}</div>:<p className="mt-4 text-xs italic text-[#7f9aa7]">No completed practice calls on this device yet.</p>}
  </section>
  <p className="px-2 text-[11px] leading-6 text-[#77909e]">Privacy: browser speech recognition may use a cloud service operated by your browser provider. FUGTH does not upload this practice audio or transcript to its servers. For a fully local speech engine, a future optional computer-hosted mode would need its own setup. Simulated emails and meeting times are examples only.</p>
 </div>;
}