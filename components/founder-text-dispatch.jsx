"use client";
import {useEffect,useMemo,useState} from "react";
import {auth} from "../lib/firebase";
import {saveProspectClientFallback} from "../lib/client/prospect-outreach-fallback";
const VOICE="https://voice.google.com/u/0/messages";
const TEXTNOW="https://www.textnow.com/";
const btn="rounded-xl border border-[#cbdfea] bg-white px-3 py-2.5 text-xs font-bold text-[#28516a] disabled:opacity-40";
const providers=[
 {id:"textnow",label:"TextNow (free, manual send)",web:TEXTNOW},
 {id:"google_voice",label:"Google Voice (manual)",web:VOICE},
 {id:"whatsapp",label:"WhatsApp (pre-filled if recipient uses WhatsApp)",web:"https://web.whatsapp.com/"},
 {id:"native_sms",label:"Samsung / phone's SMS app",web:null},
 {id:"other_web",label:"Other messaging website",web:null}
];
const validUrl=x=>{try{const u=new URL(x);return u.protocol==="https:"&&u.username===""&&u.password===""&&u.hostname.includes(".")?u.href:"";}catch{return ""}};
async function copy(value){if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable. Select and copy manually.");await navigator.clipboard.writeText(value)}
const freshId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(16).slice(2)+Date.now().toString(16);
export default function FounderTextDispatch({prospect,composed,canPrepare,phone,preset,link}){
 const [provider,setProvider]=useState("textnow"),[otherUrl,setOtherUrl]=useState(""),[notice,setNotice]=useState("");
 const [logs,setLogs]=useState([]),[stats,setStats]=useState(null),[draftId,setDraftId]=useState(freshId);
 const [sentConfirmed,setSentConfirmed]=useState(false),[saving,setSaving]=useState(false),[lastLogged,setLastLogged]=useState("");
 const fetchHistory=async()=>{
  const token=await auth.currentUser?.getIdToken();if(!token)return;
  const r=await fetch("/api/dev/text-history",{headers:{"Authorization":"Bearer "+token},cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(r.ok){setLogs(j.items||[]);setStats({...j.counts,partial:j.partial});}
 };
 useEffect(()=>{fetchHistory().catch(()=>{});},[]);
 useEffect(()=>{setDraftId(freshId());setLastLogged("");setSentConfirmed(false);setNotice("");},[prospect?.id,composed,provider]);
 const current=providers.find(x=>x.id===provider)||providers[0];
 const currentNumber=String(phone||"");
 const canLog=Boolean(prospect?.id&&currentNumber.replace(/\D/g,"").length>=10&&String(composed||"").trim().length>=10);
 const validPhone=currentNumber.replace(/\D/g,"");
 const linkToOpen=()=>{
  if(provider==="whatsapp")return "https://wa.me/"+validPhone+"?text="+encodeURIComponent(composed);
  if(provider==="native_sms")return "sms:"+currentNumber+"?body="+encodeURIComponent(composed);
  return provider==="other_web"?validUrl(otherUrl):current.web;
 };
 const related=useMemo(()=>logs.filter(x=>x.prospectId===prospect?.id),[logs,prospect?.id]);
 async function copyPart(value,label){
  try{await copy(value);setNotice(label+" copied to Samsung clipboard. You can return and copy the other field separately.")}
  catch(e){setNotice(e.message||"Clipboard isn't available; use manual select/copy.")}
 }
 function openWebsite(){
  if(!canPrepare)return;
  const url=linkToOpen();
  if(!url)return setNotice("Enter a valid HTTPS messaging website.");
  // Open synchronously from the click gesture so Android pop-up blockers don't swallow it.
  window.open(url,"_blank","noopener,noreferrer");
  copy(composed).then(()=>setNotice("Message copied and "+current.label+" opened. Paste the recipient number and text manually, then send."))
   .catch(()=>setNotice("Messaging service opened, but copying failed. Use the separate Copy Message button."));
 }
 function openApp(){
  if(!canPrepare)return;
  if(provider==="textnow"){
   // Android intent is best-effort. The TextNow package exists but there is no documented
   // stable TextNow compose-message URI. Chrome may open its web fallback instead.
   const fallback=encodeURIComponent(TEXTNOW);
   copy(composed).catch(()=>{});
   if(/Android/i.test(navigator.userAgent)){
    window.location.href="intent://www.textnow.com/#Intent;scheme=https;package=com.enflick.android.TextNow;S.browser_fallback_url="+fallback+";end";
    setNotice("Attempted to open the TextNow app. If Android doesn't launch it, use Open Website. No recipient/message was sent.");
   }else window.open(TEXTNOW,"_blank","noopener,noreferrer");
   return;
  }
  openWebsite();
 }
 async function share(){
  if(!canPrepare)return;
  if(!navigator.share){setNotice("Android sharing is unavailable in this browser. Use Copy Message.");return;}
  try{await navigator.share({text:composed,title:"FUGTH draft for "+prospect.businessName});setNotice("Message shared to another app for review. This does not confirm that a text was sent.");}
  catch(e){setNotice("Nothing was sent or marked sent.")}
 }
 async function markSent(){
  if(!canLog||!sentConfirmed||lastLogged===draftId)return;
  setSaving(true);setNotice("");
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in again.");
   const r=await fetch("/api/dev/text-history",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({action:"log",draftId,prospectId:prospect.id,provider,template:preset,
      previewUrl:link||"",message:composed,status:"sent_manual"}),cache:"no-store"});
   const j=await r.json().catch(()=>({}));
   if(!r.ok){
    if(r.status===503&&j.code==="server_firestore_unavailable"){
     const saved=await saveProspectClientFallback({prospectId:prospect.id,eventId:draftId,
      kind:"record_sms",channel:provider,subject:preset});
     setLastLogged(draftId);setSentConfirmed(false);
     setNotice(saved.note||"Recorded this past text directly in your signed-in Firestore prospect. Carrier delivery not verified.");
     return;
    }
    throw Error(j.error||"Could not record this text.");
   }
   setLastLogged(draftId);setSentConfirmed(false);
   setNotice(j.note||"Recorded as sent based on your confirmation (not carrier-verified).");
   await fetchHistory();
  }catch(e){setNotice(e.message)}finally{setSaving(false)}
 }
 async function correct(id,status){
  try{
   const token=await auth.currentUser?.getIdToken();
   const r=await fetch("/api/dev/text-history",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({action:"correct",draftId:id,status}),cache:"no-store"});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Could not correct history.");
   setNotice("Message history updated.");await fetchHistory();
  }catch(e){setNotice(e.message)}
 }
 return <section className="mt-5 space-y-4 rounded-2xl border border-[#d0e4ef] bg-[#f7fbfe] p-4 sm:p-5">
  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#699cb8]">3 / OPEN APP & TRACK MESSAGE</p>
   <h4 className="mt-2 text-lg font-black">Choose your messaging service</h4>
   <p className="mt-1 text-[11px] leading-5 text-[#6f90a4]">One recipient at a time. No app automatically sends a message, and no opened tab counts as a delivered text.</p></div>
  <label className="block text-xs font-black">Messaging destination
   <select className="mt-2 w-full rounded-xl border border-[#c7e1ee] bg-white p-3 text-sm" value={provider} onChange={e=>setProvider(e.target.value)}>
    {providers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
   </select>
  </label>
  {provider==="other_web"&&<label className="block text-xs font-bold">Service website (HTTPS only)
   <input className="mt-2 w-full rounded-xl border p-3 text-xs" value={otherUrl} onChange={e=>setOtherUrl(e.target.value)} placeholder="https://messages.example.com"/>
  </label>}
  <div className="flex flex-wrap gap-2">
   <button disabled={!currentNumber} className={btn} onClick={()=>copyPart(phone,"Number")}>Copy number</button>
   <button disabled={!prospect||!composed} className={btn} onClick={()=>copyPart(composed,"Message")}>Copy message</button>
   <button disabled={!canPrepare} className="rounded-xl bg-[#164b65] px-4 py-3 text-xs font-black text-white disabled:opacity-40" onClick={openWebsite}>Copy text & open {current.label.split(" (")[0]} ↗</button>
   {provider==="textnow"&&<button disabled={!canPrepare} className={btn} onClick={openApp}>Try TextNow app (Android)</button>}
   <button disabled={!canPrepare} className={btn} onClick={share}>Share with Android app…</button>
  </div>
  {provider==="textnow"&&<p className="text-[11px] leading-6 text-[#6f8da0]">TextNow app launch is best-effort. The browser version always remains available. TextNow has no supported FUGTH auto-compose or delivery-status API; copy the phone number and text using the two buttons if needed.</p>}
  {provider==="whatsapp"&&<p className="text-[11px] leading-6 text-[#6f8da0]">WhatsApp can pre-fill the message with its documented click-to-chat URL, but the recipient must use WhatsApp and you still press Send yourself.</p>}
  <div className="rounded-xl border border-[#d8e7ed] bg-white p-4">
   <div className="flex flex-wrap justify-between gap-3"><strong className="text-sm">Did you actually send it?</strong><span className="text-[11px] text-[#718c9a]">Manual tracking — no provider sync</span></div>
   <label className="mt-3 flex items-start gap-3 text-xs leading-6">
    <input type="checkbox" className="mt-1" checked={sentConfirmed} onChange={e=>setSentConfirmed(e.target.checked)}/>
    I already sent this message myself to the selected recipient using {current.label.split(" (")[0]}. I understand FUGTH cannot confirm carrier delivery.
   </label>
   <button disabled={!canLog||!sentConfirmed||saving||lastLogged===draftId} className="mt-3 rounded-xl bg-[#1d6653] px-4 py-3 text-xs font-black text-white disabled:opacity-40" onClick={markSent}>{lastLogged===draftId?"✓ Recorded as sent":"✓ Yes, I sent this text"}</button>
  </div>
  {!canPrepare&&canLog&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Messaging-app actions remain limited until the prospect has a valid preview and verified SMS permission. You can still log a text you already sent, without falsely recording consent or carrier delivery.</p>}
  <div className="grid grid-cols-3 gap-2">{[
   ["Manually marked sent",stats?.sent??0],["This prospect",related.filter(x=>x.status==="sent_manual").length],
   ["Entries loaded",logs.length]
  ].map(([name,n])=><div key={name} className="rounded-xl bg-white p-3"><p className="text-[10px] leading-4 text-[#7794a5]">{name}</p><p className="mt-1 text-xl font-black">{n}</p></div>)}</div>
  {stats?.partial&&<p className="text-[11px] text-[#8a8490]">History shows the latest 500 records; totals here only reflect those loaded records.</p>}
  {prospect?.smsSentCount>0&&<p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">✓ Previously contacted — {prospect.smsSentCount} manually marked text{prospect.smsSentCount===1?"":"s"} · last noted {prospect.smsLastSentAt?new Date(prospect.smsLastSentAt).toLocaleString():"in FUGTH"}.</p>}
  {related.length>0&&<div className="max-h-52 space-y-2 overflow-auto rounded-xl border bg-white p-3"><h5 className="text-xs font-black">Recent messages for this prospect</h5>
   {related.slice(0,12).map(x=><div className="flex items-center justify-between gap-3 border-t py-2 text-[11px]" key={x.id}>
    <div><p className="font-bold">{x.provider} · {x.status==="sent_manual"?"✓ Marked sent":x.status==="not_sent"?"Not sent":"Prepared"}</p>
     <p className="mt-1 text-[#8397a5]">{new Date(x.createdAt).toLocaleString()}</p></div>
    {x.status==="sent_manual"&&<button onClick={()=>correct(x.id,"not_sent")} className={btn}>Undo sent mark</button>}
   </div>)}</div>}
  {notice&&<p className="rounded-xl bg-[#e6f5fd] p-3 text-xs leading-6" role="status">{notice}</p>}
 </section>;
}
