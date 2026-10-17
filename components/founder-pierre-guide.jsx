"use client";
import {useEffect,useRef,useState} from "react";
import {addDoc,arrayUnion,collection,doc,increment,limit,onSnapshot,orderBy,query,serverTimestamp,updateDoc} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
const field="w-full rounded-xl border border-[#dacbb8] bg-white px-3 py-3 text-sm text-[#463a2d] outline-none focus:border-[#997b51]";
const stages=["New prospect","Contacted","Interested","Email collected","Meeting booked","Follow up","Not interested","Do not call"];
const blank={business:"",contact:"",phone:"",email:"",type:"",date:"",time:"",stage:"New prospect",notes:""};
const statusOf=s=>s==="Do not call"?"do_not_call":s==="Not interested"?"closed":s==="Meeting booked"?"booked":s==="Follow up"?"follow_up":s==="Interested"||s==="Email collected"?"interested":s==="Contacted"?"contacted":"new";
const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x||"");
const validUSPhone=x=>String(x||"").replace(/\D/g,"").length>=10;
function formatForGuide(p){return {
 business:p.businessName||"",contact:p.ownerName||"",phone:p.phone||"",email:p.email||"",type:p.industry||"",
 date:p.guideDate||"",time:p.guideTime||"",stage:p.pierreStage||"New prospect",notes:p.notes||""};
}
export default function FounderPierreGuide({user}){
 const iframe=useRef(null),dncDone=useRef(""),[loaded,setLoaded]=useState(false);
 const [prospects,setProspects]=useState([]),[selectedId,setSelectedId]=useState("");
 const [lead,setLead]=useState(blank),[step,setStep]=useState("start"),[path,setPath]=useState([]),[answers,setAnswers]=useState([]);
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[inviteGuest,setInviteGuest]=useState(false);
 const [statusFilter,setStatusFilter]=useState("open");
 useEffect(()=>{if(!db||!user?.uid)return;
  return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1000)),snapshot=>
   setProspects(snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.type==="cold_call_prospect")),e=>setNotice(e.message||"Could not load your call list."));
 },[user?.uid]);
 function send(item){
  const p=item?formatForGuide(item):blank;
  setLead(p);setStep(item?.pierreGuide?.step||"start");setPath(item?.pierreGuide?.path||[]);setAnswers([]);
  iframe.current?.contentWindow?.postMessage({source:"fugth-sales-parent",type:"load",lead:p,step:item?.pierreGuide?.step||"start",path:item?.pierreGuide?.path||[]},window.location.origin);
 }
 useEffect(()=>{if(loaded){const found=prospects.find(p=>p.id===selectedId);send(found||null);setNotice(found?"Loaded "+found.businessName+". Previous call details are available.":"New unsaved lead.");}},[selectedId,loaded]);
 useEffect(()=>{
  function receive(event){
   if(event.origin!==window.location.origin||event.source!==iframe.current?.contentWindow||event.data?.source!=="fugth-pierre-guide")return;
   if(event.data.type==="new"){setSelectedId("");setNotice("New blank prospect. Save it before moving to the next call.");return;}
   if(event.data.type!=="change")return;
   const d=event.data;setLead(d.lead||blank);setStep(d.node||"start");setPath(d.nodeHistory||[]);setAnswers(d.history||[]);
   if((d.node==="stop"||d.lead?.stage==="Do not call")&&selectedId&&dncDone.current!==selectedId){
    dncDone.current=selectedId;
    updateDoc(doc(db,"users",user.uid,"campaigns",selectedId),{
      status:"do_not_call",pierreStage:"Do not call",doNotCall:true,doNotCallAt:serverTimestamp(),updatedAt:serverTimestamp()
    }).then(()=>setNotice("Do-not-call status saved. This prospect is blocked from your call queue."))
    .catch(()=>{dncDone.current="";setNotice("Do-not-call status could not be saved. Do not dial this person again until it is recorded.");});
   }
  }
  window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
 },[selectedId,user?.uid]);
 const chosen=prospects.find(p=>p.id===selectedId);
 const meeting=lead.date&&lead.time?new Date(lead.date+"T"+lead.time):null;
 const readyMeeting=meeting&&Number.isFinite(meeting.getTime())&&meeting.getTime()>Date.now();
 const pipeline={all:prospects.length,called:prospects.filter(p=>(p.callCount||0)>0).length,booked:prospects.filter(p=>p.status==="booked").length,
   callback:prospects.filter(p=>p.status==="follow_up").length,dnc:prospects.filter(p=>p.status==="do_not_call"||p.doNotCall).length};
 function payload(){
  return {type:"cold_call_prospect",businessName:lead.business.trim().slice(0,110),ownerName:lead.contact.trim().slice(0,110),
   phone:lead.phone.trim().slice(0,32),email:lead.email.trim().slice(0,180),industry:lead.type.trim().slice(0,80),
   notes:lead.notes.trim().slice(0,5000),pierreStage:lead.stage,guideDate:lead.date,guideTime:lead.time,
   pierreGuide:{step,path:path.slice(-50),answers:answers.slice(-50),updatedAt:new Date().toISOString()},
   status:statusOf(lead.stage),updatedAt:serverTimestamp()};
 }
 async function persist(markCall=false,forceStage=null){
  if(!lead.business.trim()||!validUSPhone(lead.phone))throw Error("Enter a business name and a valid phone number first.");
  if(selectedId&&chosen?.doNotCall&&forceStage!=="do_not_call"&&lead.stage!=="Do not call")
   throw Error("This number is marked do-not-call. Contact status cannot be cleared from the call guide.");
  const data=payload();
  if(forceStage)data.status=forceStage;
  if(markCall){
   data.callCount=increment(1);data.lastCalledAt=serverTimestamp();
   data.lastOutcome=lead.stage;
   data.history=arrayUnion({outcome:lead.stage,at:new Date().toISOString(),source:"pierre_conversation_map"});
  }
  if(lead.stage==="Do not call"){data.doNotCall=true;data.doNotCallAt=serverTimestamp();}
  if(lead.stage==="Follow up"&&readyMeeting)data.followUpAt=meeting.toISOString();
  if(lead.stage==="Meeting booked"&&readyMeeting)data.appointmentAt=meeting.toISOString();
  if(selectedId){await updateDoc(doc(db,"users",user.uid,"campaigns",selectedId),data);return selectedId;}
  const ref=await addDoc(collection(db,"users",user.uid,"campaigns"),{...data,callCount:markCall?1:0,
   source:"Pierre Call Guide",city:"",favorite:false,createdAt:serverTimestamp()});
  setSelectedId(ref.id);return ref.id;
 }
 async function save(markCall=false){
  setBusy(markCall?"outcome":"save");setNotice("");
  try{const id=await persist(markCall);setNotice(markCall?"Call outcome, progress and notes saved to Firestore.":"Lead and script progress saved to Firestore.");if(!selectedId)setSelectedId(id);}
  catch(e){setNotice(e.message||"Could not save lead.");}finally{setBusy("");}
 }
 async function book(){
  setBusy("calendar");setNotice("");
  try{
   if(!readyMeeting)throw Error("Choose a future meeting date and time in the guide first.");
   if(inviteGuest&&!validEmail(lead.email))throw Error("Enter a valid prospect email before inviting them.");
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder sign-in required.");
   const result=await fetch("/api/integrations/google/book",{method:"POST",cache:"no-store",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({title:"FUGTH website and business audit — "+lead.business,customerName:lead.contact||lead.business,
     phone:lead.phone,startTime:meeting.toISOString(),endTime:new Date(meeting.getTime()+15*60000).toISOString(),
     customerEmail:lead.email,inviteProspect:inviteGuest})});
   const data=await result.json().catch(()=>({}));if(!result.ok)throw Error(data.error||"Calendar booking failed.");
   const id=await persist(false,"booked");
   await updateDoc(doc(db,"users",user.uid,"campaigns",id),{status:"booked",pierreStage:"Meeting booked",appointmentAt:meeting.toISOString(),calendarEventId:data.eventId||"",updatedAt:serverTimestamp()});
   setNotice("Appointment booked in your connected Google Calendar."+(inviteGuest?" Google was asked to send a guest invitation.":" No customer invitation was sent."));
  }catch(e){setNotice(e.message||"Could not book the appointment.");}
  finally{setBusy("");}
 }
 function compose(channel){
  if(!validEmail(lead.email)&&channel==="email"){setNotice("Enter the customer's email before drafting.");return;}
  if(!validUSPhone(lead.phone)&&channel==="sms"){setNotice("Enter a valid number before drafting a text.");return;}
  if(lead.stage==="Do not call"||chosen?.doNotCall){setNotice("This number is marked do-not-call. Do not initiate another contact.");return;}
  const body="Hi "+(lead.contact||"there")+", this is Pierre with FUGTH Management. Thanks for speaking with me about "+(lead.business||"your business")+". "+(readyMeeting?"We discussed a 15-minute website preview on "+meeting.toLocaleString()+". Please reply to confirm.":"Here is a follow-up about the website preview. Let me know if you'd like to schedule a quick look.")+" — FUGTH Management";
  if(channel==="email")window.open("mailto:"+encodeURIComponent(lead.email)+"?subject="+encodeURIComponent("Your FUGTH website preview")+"&body="+encodeURIComponent(body),"_blank");
  else window.location.href="sms:"+lead.phone.replace(/[^\d+]/g,"")+"?body="+encodeURIComponent(body);
  setNotice("Draft opened. Verify consent and press Send in your email or texting app; nothing has been sent by FUGTH.");
 }
 async function googleVoice(){
  if(chosen?.doNotCall||lead.stage==="Do not call"){setNotice("This number is on the do-not-call list.");return;}
  if(!validUSPhone(lead.phone))return setNotice("Enter a valid phone number.");
  try{await navigator.clipboard.writeText(lead.phone);setNotice("Number copied; paste it into Google Voice to call.");}catch{setNotice("Open Google Voice and enter "+lead.phone+".");}
  window.open("https://voice.google.com/u/0/calls","_blank","noopener,noreferrer");
 }
 const contacts=prospects.filter(p=>statusFilter==="all"||statusFilter==="open"&&p.status!=="closed"&&p.status!=="do_not_call"||statusFilter==="callback"&&p.status==="follow_up"||statusFilter==="booked"&&p.status==="booked");
 return <section className="space-y-4">
  <div className="rounded-[26px] border border-[#e4d8c7] bg-[#fffaf1] p-5 text-[#473d32] sm:p-7">
   <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#9a8162]">Pierre's Cold Call Guide · Firestore CRM</p>
   <h3 className="mt-2 text-2xl font-semibold">Live conversion map & appointment desk</h3>
   <p className="mt-2 text-sm leading-6 text-[#7d6d5b]">Your original Yes / No branches, website reveal, referral checks, objection loops and contact card are preserved below. Select a saved prospect or prepare a new one. Save after each call so the next follow-up stays in your FUGTH queue.</p>
   <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">{[["Prospects",pipeline.all],["Already called",pipeline.called],["Follow-ups",pipeline.callback],["Booked",pipeline.booked],["Do not call",pipeline.dnc]].map(([label,n])=><div key={label} className="rounded-xl bg-[#f1e8dc] p-3"><p className="text-[11px] text-[#816d52]">{label}</p><p className="mt-1 text-xl font-semibold">{n}</p></div>)}</div>
   <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-xs font-semibold">Prospect
    <select className={"mt-2 "+field} value={selectedId} onChange={e=>{dncDone.current="";setSelectedId(e.target.value);}}><option value="">+ New lead / not yet saved</option>{contacts.map(p=><option key={p.id} value={p.id}>{p.businessName+" · "+p.phone+" · "+(p.status||"new")}</option>)}</select></label>
    <label className="text-xs font-semibold">Show<select className={"mt-2 "+field} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="open">Open prospects</option><option value="all">All, including do-not-call</option><option value="callback">Callbacks</option><option value="booked">Booked</option></select></label>
    <button type="button" onClick={()=>{setSelectedId("");send(null);setNotice("Started a new prospect.");}} className="rounded-xl border border-[#d7c5ae] px-4 py-3 text-xs font-semibold">New call</button>
   </div>
   {chosen?.doNotCall&&<p role="alert" className="mt-4 rounded-xl bg-[#fbe5e0] p-3 text-xs text-[#963a31]">Do not call: contact is suppressed from dialing and messaging.</p>}
   <div className="mt-4 grid gap-3 sm:grid-cols-3">
    <button disabled={Boolean(busy)} className="rounded-xl bg-[#493d30] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50" onClick={()=>save(false)}>Save progress to FUGTH</button>
    <button disabled={Boolean(busy)} className="rounded-xl bg-[#607c61] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50" onClick={()=>save(true)}>Log completed call</button>
    <button disabled={Boolean(busy)||chosen?.doNotCall} className="rounded-xl border border-[#cdb89d] px-4 py-3 text-xs font-semibold disabled:opacity-50" onClick={googleVoice}>Call with Google Voice</button>
   </div>
   <div className="mt-4 grid gap-3 sm:grid-cols-3">
    <button disabled={Boolean(busy)} className="rounded-xl border border-[#dbcab4] px-4 py-3 text-xs font-semibold disabled:opacity-50" onClick={()=>compose("email")}>Draft follow-up email</button>
    <button disabled={Boolean(busy)} className="rounded-xl border border-[#dbcab4] px-4 py-3 text-xs font-semibold disabled:opacity-50" onClick={()=>compose("sms")}>Draft text message</button>
    <button disabled={Boolean(busy)||!readyMeeting} className="rounded-xl bg-[#836747] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50" onClick={book}>Book 15-minute Calendar demo</button>
   </div>
   <label className="mt-4 flex items-center gap-2 text-xs text-[#806d54]"><input type="checkbox" checked={inviteGuest} onChange={e=>setInviteGuest(e.target.checked)} className="h-4 w-4"/>Invite the customer to the Google Calendar meeting (requires their verified email and consent).</label>
   {notice&&<p role="status" className="mt-4 rounded-xl bg-[#f0e4d1] p-3 text-xs text-[#675138]">{notice}</p>}
  </div>
  <iframe ref={iframe} title="Pierre Cold Call Conversion Map" src="/pierre-cold-call-guide.html" onLoad={()=>setLoaded(true)} className="h-[970px] w-full rounded-[23px] border border-[#e4d8c7] bg-[#faf7f0] md:h-[830px]" allow="clipboard-write"/>
  <p className="px-2 text-xs text-[#887966]">The map retains the original wording, including a referral version intended only when an actual referral exists. Choose “Use non-referral opening” otherwise. Email and SMS open drafts only; FUGTH does not send messages without your final confirmation.</p>
 </section>;
}