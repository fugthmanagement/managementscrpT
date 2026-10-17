"use client";
import {useEffect,useMemo,useState} from "react";
import {auth,db} from "../lib/firebase";
import {collection,doc,onSnapshot,orderBy,query,limit,updateDoc,serverTimestamp,increment,arrayUnion} from "firebase/firestore";

// Pierre's uploaded branching sales guide, adapted for live FUGTH prospect records.
// Referral and completed-website claims must be truthful, never assumed.
const N={
start:["Opening","Confirm the business","Hey, is this [Company Name]?",[["Yes, this is them","referral"],["Who is this?","who"],["Wrong number","wrong"],["They sound busy","busy"]]],
who:["Opening","They ask who is calling","Hey, this is Pierre. I was hoping to speak with whoever handles the business website. Is that you?",[["Yes / speaking","referral"],["Let me transfer you","referral"],["Not available","callback"],["Not interested","softno"]]],
referral:["Referral","The family-friend introduction","Hey man, this is Pierre. You guys did a job for a friend of my mom's, and she said you guys did some really high-quality work, but she also mentioned you guys don't have a website or anything like that. Is that right?",[["Yes, no website","reveal"],["We have a website","existing"],["Who was the friend?","refcheck"],["Not interested / skeptical","softno"],["Use non-referral opening","honest"]],"Only say this when there really was a referral. Otherwise click the non-referral opening."],
honest:["Alternative opening","No referral available","Hey man, this is Pierre. I came across your business and noticed I couldn't find a website for you guys. I work on websites for local businesses. Is that something you've thought about?",[["Yes / tell me more","reveal"],["Already have one","existing"],["Not interested","softno"],["Busy","busy"]]],
refcheck:["Referral","They ask for the referral name","Of course — it was [REAL REFERRAL NAME]. I can tell you a little more about the project she mentioned. I also wanted to ask you about your website.",[["Okay / go on","reveal"],["No actual referral","honest"],["Not interested","softno"]],"Never invent the referral name."],
reveal:["Website reveal","Reveal the website","Okay, yeah, this might sound a little crazy, but since I heard you guys do such good work, and I noticed you didn't have a website, I actually went ahead and built you guys a beautiful website preview, if I do say so myself. I was wondering if you'd be open to taking a quick look. And honestly, if you like it, you can keep it.",[["Yes, I want to see it","positive"],["What is this going to cost?","price"],["Just send a link","link"],["No, not interested","softno"],["I am busy","busy"]],"Use this only if a real preview exists. Explain hosting, setup, and subscription costs clearly."],
positive:["Interest","Move from yes to the next step","Perfect. I can show you how it looks on a quick screen share. I can also send you the preview and my information so you have everything in one place. What's the best email address for you?",[["They give their email","gotemail"],["They want to see it now","now"],["They hesitate about email","emailhes"],["They ask about features","features"]]],
gotemail:["Contact details","Confirm their email","Perfect, let me read that back: [EMAIL]. Did I get that right? And who should I address it to?",[["Email confirmed","schedule"],["They correct the email","gotemail"],["They only want information","sendonly"]],"Confirm spelling."],
emailhes:["Contact details","They hesitate to share email","No problem. I just wanted to make sure the preview and my contact details get to the right person. If you'd rather, we can pick a quick time first and you can give me the best address for the invitation then.",[["Okay, here is my email","gotemail"],["Book a time first","schedule"],["No thanks","softno"]]],
now:["Live demonstration","They can look right now","Awesome. Are you near a phone or computer where you can open a meeting link? I can walk you through the layout in two minutes, and afterward send over the details.",[["Ready for a meeting link","gotemail"],["Not right now","schedule"],["Send it instead","link"]]],
features:["Value","Explain added value briefly","Besides the website itself, I can show you options for handling missed calls, collecting customer details, and booking appointments. But first, I really just want you to see the website. Can I send you the preview?",[["Yes","positive"],["How much?","price"],["Not interested","softno"]]],
link:["Link request","They ask for a link","Absolutely, I can send you the preview if it's available online. If it's not published yet, I can show it on a quick screen share. What's the best email to send the information to?",[["They give email","gotemail"],["They want a meeting","schedule"],["They refuse","softno"]]],
price:["Objections","How much does it cost?","Fair question. The preview is just to show you what I had in mind. If you want it live or want extra features, I can explain the actual pricing before you decide on anything. Would you want to see it first?",[["Yes, show me","positive"],["Tell me pricing first","priceinfo"],["No budget","budget"],["Not interested","softno"]]],
priceinfo:["Objections","They insist on pricing","Absolutely. I don't want to surprise you with anything. The final price depends on whether you just want the website or also hosting, bookings, and call handling. I can send you the exact options along with the preview. What's the best email?",[["They give email","gotemail"],["Still hesitant","softno"],["No budget","budget"]]],
budget:["Objections","They have no budget","I completely understand. I'm not asking you to make a decision today. I just wanted to show you the preview and let you know what the options are. Would you be open to a five-minute look, or would you prefer I check back another time?",[["Five-minute look","schedule"],["Follow up later","callback"],["No thanks","softno"]]],
existing:["Objections","They already have a website","Oh, gotcha — I must have missed it. That's good to hear. Are you happy with how it brings in inquiries and handles appointment requests, or is there anything you'd want to improve?",[["Could be better","features"],["We have a tech person","tech"],["Everything is fine","softno"],["Busy","busy"]]],
tech:["Objections","They have a website person","That's great. I'm not trying to replace anybody. I just wanted to show you the idea I had, and if it's useful, you can decide whether to share it with your current person. Would a quick look be worth it?",[["Yes","positive"],["Maybe later","callback"],["No","softno"]]],
busy:["Objections","They are busy","Of course, I don't want to hold you up. Would later today or tomorrow be a better time for a quick five-minute look?",[["Later today","callback"],["Tomorrow","callback"],["Send information","positive"],["No, stop calling","stop"]]],
softno:["Objections","They say no","No worries at all. Before I let you go, is it just not something you're looking for, or is now a bad time?",[["Just bad timing","callback"],["Concerned about price","budget"],["Already covered","tech"],["No interest / firm no","endno"],["Do not call","stop"]],"Ask once, politely. Respect a firm no."],
callback:["Follow-up","Secure a specific callback","Gotcha. What's a better day and time for me to reach you? And is there an email I can send the website preview to beforehand, if you'd like?",[["They give email","gotemail"],["They give callback time","followup"],["No thanks","endno"]]],
followup:["Follow-up","Confirm follow-up","Perfect, I'll make a note of [DAY AND TIME]. Thanks for taking a minute — I'll reach out then. Have a good one!",[["Finish this call","finish"],["Try to collect email","positive"]],"Save the callback time before finishing."],
schedule:["Calendar lock","Offer two appointment windows","Perfect. I know you're busy running the business, so let's keep it quick. I have my calendar open. Would mornings or afternoons usually work better for a five-minute walkthrough?",[["Morning","morning"],["Afternoon","afternoon"],["They suggest a time","confirm"],["Just send information","sendonly"]]],
morning:["Calendar lock","Morning appointment","Great. How does [AVAILABLE MORNING TIME] work for you?",[["That works","confirm"],["Different time","schedule"],["No meeting","sendonly"]]],
afternoon:["Calendar lock","Afternoon appointment","Great. How does [AVAILABLE AFTERNOON TIME] work for you?",[["That works","confirm"],["Different time","schedule"],["No meeting","sendonly"]]],
confirm:["Calendar lock","Confirm all appointment details","Perfect, so we're looking at [DATE] at [TIME]. What's the best email to send the invitation to? And should I put the meeting under your name?",[["All details confirmed","booked"],["Need to correct something","confirm"],["They want info only","sendonly"]],"Check real calendar availability before confirming."],
booked:["Close","Meeting ready to send","Awesome. I'll send the invitation to [EMAIL] for [DATE] at [TIME]. Once it comes through, please accept it so the time is reserved. Looking forward to showing you!",[["Meeting booked / finish","finish"],["They need to reschedule","schedule"]],"An invitation is not sent until you actually book it."],
sendonly:["Close","Information only","Absolutely. I'll send over the preview and my contact information to [EMAIL]. If you have any questions after looking at it, just reply. Thanks for your time!",[["Finish call","finish"],["Offer meeting once more","schedule"]]],
wrong:["Call end","Wrong number","Oh, my mistake. Thanks for letting me know. Have a good day!",[["Finish call","finish"]]],
endno:["Call end","Respect their answer","Absolutely, no problem. Thanks for your time, and have a good day!",[["Finish call","finish"]]],
stop:["Call end","Do not call again","Understood. I'll mark your number do-not-call. Sorry for the interruption. Have a good day.",[["Finish and mark do not call","finish"]],"Mark do-not-call immediately and never contact again."],
finish:["Call complete","Call finished","Call complete. Save the lead and start the next business.",[["Start next call","start"]]]
};
const phases=["Opening","Referral","Alternative opening","Website reveal","Interest","Contact details","Live demonstration","Value","Link request","Objections","Follow-up","Calendar lock","Close","Call end","Call complete"];
const stageByNode={positive:"interested",gotemail:"interested",schedule:"follow_up",callback:"follow_up",followup:"follow_up",booked:"booked",stop:"do_not_call",endno:"closed",wrong:"closed"};
const field="w-full rounded-xl border border-[#e3d8c6] bg-white p-3 text-sm text-[#493b2d]";
export default function PierreCallGuide({user}){
 const [leads,setLeads]=useState([]),[leadId,setLeadId]=useState(""),[node,setNode]=useState("start"),[history,setHistory]=useState([]),[answers,setAnswers]=useState([]);
 const [form,setForm]=useState({businessName:"",ownerName:"",phone:"",email:"",industry:"",notes:"",followUpAt:"",appointmentAt:""});
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!db||!user?.uid)return;return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1000)),snap=>setLeads(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.type==="cold_call_prospect")),e=>setMessage(e.message||"Prospect records are temporarily unavailable."));},[user?.uid]);
 const lead=useMemo(()=>leads.find(x=>x.id===leadId),[leads,leadId]);
 useEffect(()=>{if(lead)setForm({businessName:lead.businessName||"",ownerName:lead.ownerName||"",phone:lead.phone||"",email:lead.email||"",industry:lead.industry||"",notes:lead.notes||"",followUpAt:lead.followUpAt||"",appointmentAt:lead.appointmentAt||""});},[leadId,lead?.updatedAt]);
 const text=v=>String(v||"");
 const script=text(N[node][2]).replaceAll("[Company Name]",form.businessName||"[Company Name]").replaceAll("[EMAIL]",form.email||"[EMAIL]").replaceAll("[DATE]",form.appointmentAt?new Date(form.appointmentAt).toLocaleDateString():"[DATE]").replaceAll("[TIME]",form.appointmentAt?new Date(form.appointmentAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):"[TIME]").replaceAll("[DAY AND TIME]",form.followUpAt||"[DAY AND TIME]");
 async function save(extra={},notify=true){
  if(!leadId)throw Error("Choose a prospect from your saved cold-call list first.");
  const status=extra.status||(lead?.status||"new");
  if((lead?.status==="do_not_call"||lead?.status==="closed"&&lead?.lastOutcome==="Do not call")&&status!=="do_not_call")throw Error("This prospect has requested no further calls.");
  await updateDoc(doc(db,"users",user.uid,"campaigns",leadId),{
   businessName:form.businessName.trim().slice(0,110),ownerName:form.ownerName.trim().slice(0,100),
   phone:form.phone.slice(0,30),email:form.email.trim().slice(0,180),industry:form.industry.slice(0,75),
   notes:form.notes.slice(0,2000),followUpAt:form.followUpAt,appointmentAt:form.appointmentAt,
   lastGuideNode:node,lastGuideAnswers:answers.slice(-35),updatedAt:serverTimestamp(),...extra});
  if(notify)setMessage("Saved to the FUGTH prospect list.");
 }
 async function step(to,answer){
  if(!leadId){setMessage("Select a prospect first to track this call.");return;}
  if(lead?.status==="do_not_call"){setMessage("This business is marked do-not-call. Do not proceed.");return;}
  const newAnswers=[...answers,{at:N[node][1],answer,time:new Date().toISOString()}];
  const nextStatus=stageByNode[to]||lead?.status||"contacted";
  setHistory(old=>[...old,node]);setAnswers(newAnswers);setNode(to);
  try{
   const data={status:nextStatus,lastGuideNode:to,lastGuideAnswers:newAnswers.slice(-35),updatedAt:serverTimestamp()};
   if(to==="stop"||node==="stop")data.doNotCall=true;
   if(to==="finish")data.callCount=increment(1);
   if(to==="booked")data.lastOutcome="Meeting discussed — invite pending";
   await updateDoc(doc(db,"users",user.uid,"campaigns",leadId),data);
   setMessage(to==="stop"?"Business marked DO NOT CALL.":to==="booked"?"Meeting discussed. Use Book Calendar to send the real invitation.":"Call stage saved.");
  }catch(e){setMessage("Could not save current call stage: "+e.message);}
 }
 async function book(){
  if(!form.appointmentAt||!form.email){setMessage("Enter and verify an email and meeting date first.");return;}
  setBusy(true);setMessage("");
  try{
   const token=await auth.currentUser?.getIdToken(),date=new Date(form.appointmentAt);
   if(!(date.getTime()>Date.now()))throw Error("Choose a future appointment.");
   const res=await fetch("/api/integrations/google/book",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({title:"FUGTH website preview — "+form.businessName,customerName:form.ownerName||form.businessName,email:form.email,phone:form.phone,startTime:date.toISOString(),endTime:new Date(date.getTime()+15*60000).toISOString()})});
   const response=await res.json().catch(()=>({}));if(!res.ok)throw Error(response.error||"Calendar could not book this time.");
   await save({status:"booked",calendarEventId:response.eventId||"",lastOutcome:"Free audit booked"},false);
   setMessage("Google Calendar meeting created. Verify attendee invitation delivery in Calendar.");
  }catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 const copy=async v=>{try{await navigator.clipboard.writeText(v);setMessage("Copied to clipboard.");}catch{setMessage("Copy is not available in this browser.");}};
 const progress=node==="finish"?100:node==="booked"?94:node==="confirm"?84:node==="schedule"||node==="callback"?72:node==="gotemail"?60:node==="positive"?43:node==="reveal"?26:Math.min(90,Math.round((phases.indexOf(N[node][0])+1)/phases.length*100));
 return <section className="rounded-[28px] border border-[#e1d5c6] bg-[#fffdf8] p-5 text-[#3d352c] sm:p-7">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9c8364]">PIERRE'S COLD CALL GUIDE · LIVE FUGTH VERSION</p><h3 className="mt-2 text-2xl font-semibold">Clickable sales conversion map</h3><p className="mt-2 text-xs text-[#8a7c6a]">Yes, no, objections, callbacks, emails and appointments—synced to the selected prospect.</p></div><div className="rounded-xl bg-[#f3eadc] px-4 py-2 text-xs font-bold">Call progress · {progress}%</div></header>
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8dfd1]"><div className="h-full rounded-full bg-[#77634b] transition-all" style={{width:progress+"%"}}/></div>
  <label className="mt-5 block text-xs font-bold">Select prospect from FUGTH call list<select className={"mt-2 "+field} value={leadId} onChange={e=>{setLeadId(e.target.value);setNode("start");setAnswers([]);setHistory([]);setMessage("");}}><option value="">Choose a business…</option>{leads.filter(x=>x.status!=="do_not_call").map(x=><option key={x.id} value={x.id}>{x.businessName} · {x.phone}</option>)}</select></label>
  {lead?.status==="do_not_call"&&<p className="mt-3 text-red-700">Do not call this prospect.</p>}
  <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
   <div className="min-w-0 rounded-2xl border border-[#e7ddcf] bg-white p-4 sm:p-6">
    <div className="flex gap-2 overflow-x-auto pb-3">{[...history,node].map((id,i)=><button key={i} onClick={()=>{if(i<history.length){setHistory(history.slice(0,i));setAnswers(answers.slice(0,i));setNode(id);}}} className={"shrink-0 rounded-lg border px-3 py-2 text-[11px] "+(i===history.length?"border-[#614f3a] bg-[#5a4b3b] text-white":"border-[#e6d7c5] bg-[#f8f2e8]")}>{N[id][1]}</button>)}</div>
    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#927a60]">{N[node][0]}</p><h4 className="mt-2 text-xl font-semibold">{N[node][1]}</h4>
    <div className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f5ede1] p-5 text-lg font-medium leading-8">{script}</div>
    {N[node][4]&&<p className="mt-3 text-xs leading-6 text-[#936d43]">{N[node][4]}</p>}
    <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#9a8164]">What did they say?</p>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">{N[node][3].map(([answer,to],i)=><button disabled={!leadId||busy} key={i} onClick={()=>step(to,answer)} className={"min-h-[56px] rounded-xl border p-3 text-left text-sm font-semibold disabled:opacity-40 "+(to==="stop"?"border-red-200 bg-red-50 text-red-900":i===0?"border-[#8e7354] bg-[#65523e] text-white":"border-[#e0d3c2] bg-[#fcfaf7]")}>{answer} ↗</button>)}</div>
    <div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>{if(history.length){setNode(history.at(-1));setHistory(history.slice(0,-1));setAnswers(answers.slice(0,-1));}}} disabled={!history.length} className="rounded-lg border border-[#d8c7b3] px-3 py-2 text-xs">← Previous</button><button onClick={()=>copy(script)} className="rounded-lg border border-[#d8c7b3] px-3 py-2 text-xs">Copy script</button><button onClick={()=>{setNode("start");setHistory([]);setAnswers([]);}} className="rounded-lg border border-[#d8c7b3] px-3 py-2 text-xs">Restart</button></div>
    <div className="mt-5 max-h-32 overflow-auto border-t border-[#eee4d8] pt-2">{answers.map((x,i)=><p key={i} className="py-1 text-[11px] text-[#877761]">{i+1}. {x.at} → {x.answer}</p>)}</div>
   </div>
   <aside className="rounded-2xl border border-[#e7ddcf] bg-[#faf5ed] p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-[#98816a]">Live lead card</p>
    {[["businessName","Business"],["ownerName","Contact"],["phone","Phone"],["email","Email"],["industry","Industry"]].map(([k,label])=><label key={k} className="mt-3 block text-xs font-semibold">{label}<input className={"mt-1 "+field} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
    <label className="mt-3 block text-xs font-semibold">Callback date and time<input type="datetime-local" className={"mt-1 "+field} value={form.followUpAt.slice(0,16)} onChange={e=>setForm({...form,followUpAt:e.target.value})}/></label>
    <label className="mt-3 block text-xs font-semibold">Meeting date and time<input type="datetime-local" className={"mt-1 "+field} value={form.appointmentAt.slice(0,16)} onChange={e=>setForm({...form,appointmentAt:e.target.value})}/></label>
    <label className="mt-3 block text-xs font-semibold">Notes / objections<textarea className={"mt-1 "+field} rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={!leadId||busy} onClick={async()=>{setBusy(true);try{await save();}catch(e){setMessage(e.message);}finally{setBusy(false);}}} className="rounded-xl bg-[#514230] p-3 text-xs font-semibold text-white">Save lead</button><button disabled={!leadId||busy} onClick={book} className="rounded-xl border border-[#d4c5b0] bg-white p-3 text-xs font-semibold">Book Calendar</button></div>
    <div className="mt-3 flex flex-wrap gap-2 text-xs"><a href={form.email?"mailto:"+encodeURIComponent(form.email):undefined} className="rounded-lg bg-white p-2">Email ↗</a><a href={form.phone?"sms:"+form.phone:undefined} className="rounded-lg bg-white p-2">Text ↗</a><a href={form.phone?"tel:"+form.phone:undefined} className="rounded-lg bg-white p-2">Call ↗</a><button onClick={()=>copy("Hi "+(form.ownerName||"there")+", thanks for speaking with me. Let's confirm "+form.appointmentAt+" for a FUGTH website preview. — FUGTH Management")} className="rounded-lg bg-white p-2">Copy follow-up</button></div>
   </aside>
  </div>
  {message&&<p role="status" className="mt-4 rounded-xl bg-[#f1e8d9] p-3 text-xs">{message}</p>}
 </section>;
}
