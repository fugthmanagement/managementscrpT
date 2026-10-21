"use client";
import {useEffect,useMemo,useState} from "react";
import {auth} from "../lib/firebase";
const button="rounded-xl border border-[#c7dce7] bg-white px-4 py-3 text-xs font-black text-[#28556f] disabled:opacity-40";
const id=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(16)+"-"+Math.random().toString(16).slice(2);
const stages=[
 ["new","New"],["contacted","Contacted"],["replied","Replied"],["interested","Interested"],
 ["needs_info","Needs information"],["follow_up","Follow up"],["appointment","Appointment booked"],
 ["not_interested","Not interested"],["won","Customer"],["lost","Closed"]
];
export default function FounderProspectFollowUp({prospect,subject,validDraft=false,channel="email"}){
 const [confirmed,setConfirmed]=useState(false),[followUp,setFollowUp]=useState(""),
  [stage,setStage]=useState("contacted"),[note,setNote]=useState(""),
  [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[history,setHistory]=useState([]);
 useEffect(()=>{
  setConfirmed(false);setFollowUp("");setStage(prospect?.outreachStage||"contacted");setNotice("");
 },[prospect?.id]);
 const isEmail=channel==="email";
 const currentCount=Number((isEmail?prospect?.emailSentCount:prospect?.smsSentCount)||0);
 const due=useMemo(()=>prospect?.nextFollowUpAt&&Date.parse(prospect.nextFollowUpAt)<=Date.now(),[prospect?.nextFollowUpAt]);
 async function api(data){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in again to update your prospect list.");
  const response=await fetch("/api/dev/outreach-activity",{method:"POST",cache:"no-store",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({...data,eventId:id(),prospectId:prospect.id,channel})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||"Could not save outreach history.");
  return result;
 }
 async function perform(action,override={}){
  if(!prospect||busy)return;
  setBusy(true);setNotice("");
  try{
   const j=await api({action,subject:subject||"",email:prospect.email,
    provider:isEmail?"manual_email":"manual_sms",note,stage,followUpAt:followUp?new Date(followUp+"T17:00:00").toISOString():null,...override});
   setNotice(j.note||"Saved to Firestore.");
   setConfirmed(false);
   setHistory(h=>[{type:action,note:note||"",at:new Date().toISOString()},...h].slice(0,10));
  }catch(e){setNotice(e.message)}finally{setBusy(false)}
 }
 if(!prospect)return null;
 return <section className="mt-5 rounded-2xl border border-[#cde2ee] bg-[#f5fbff] p-5">
  <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#739eb4]">{isEmail?"EMAIL":"SMS"} OUTREACH / CONTACT TRACKING</p>
  <h4 className="mt-2 text-lg font-black">Keep {prospect.businessName} in your pipeline</h4>
  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
   <div className="rounded-xl bg-white p-3"><strong>{currentCount}</strong><p className="mt-1 text-[#7693a3]">{isEmail?"Emails":"Texts"} marked sent</p></div>
   <div className="rounded-xl bg-white p-3"><strong>{prospect.outreachStage||"New"}</strong><p className="mt-1 text-[#7693a3]">Current sales stage</p></div>
   <div className="rounded-xl bg-white p-3"><strong>{prospect.nextFollowUpAt?new Date(prospect.nextFollowUpAt).toLocaleDateString():"Not scheduled"}</strong><p className="mt-1 text-[#7693a3]">{due?"Follow-up due":"Next follow-up"}</p></div>
  </div>
  {currentCount>0&&<p className="mt-3 rounded-xl bg-[#e4f6eb] p-3 text-xs font-bold text-[#216948]">✓ Already contacted by {isEmail?"email":"text"}. Check whether a follow-up is wanted before contacting again.</p>}
  {isEmail&&<>
  <label className="mt-4 flex items-start gap-2 text-xs leading-6">
   <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>
   I personally sent an email to this recipient. I'm recording an actual past action, not claiming FUGTH sent or delivered it.
  </label>
  <button type="button" disabled={!confirmed||busy||!prospect.email}
   className="mt-3 rounded-xl bg-[#17634c] px-4 py-3 text-xs font-black text-white disabled:opacity-40"
   onClick={()=>perform("record_email")}>✓ Yes, I sent this email</button>
  </>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-bold">Pipeline stage<select value={stage} onChange={e=>setStage(e.target.value)}
    className="mt-2 w-full rounded-xl border border-[#cddfe9] bg-white p-3 text-xs">
    {stages.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label className="text-xs font-bold">Follow up on<input type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)}
    className="mt-2 w-full rounded-xl border border-[#cddfe9] bg-white p-3 text-xs"/></label>
  </div>
  <label className="mt-4 block text-xs font-bold">Notes / what they said
   <textarea rows={2} maxLength={500} value={note} onChange={e=>setNote(e.target.value)}
    className="mt-2 w-full rounded-xl border border-[#cddfe9] bg-white p-3 text-xs"
    placeholder="Interested next month, asked for business references, not ready yet…"/></label>
  <div className="mt-3 flex flex-wrap gap-2">
   <button className={button} disabled={busy} onClick={()=>perform("set_stage")}>Save sales stage</button>
   <button className={button} disabled={busy||!followUp} onClick={()=>perform("schedule_followup")}>Schedule follow-up</button>
   <button className={button} disabled={busy} onClick={()=>perform("record_reply",{stage:stage==="contacted"?"replied":stage})}>Record their reply</button>
   <button className={button} disabled={busy||(isEmail?prospect.emailOptOut:prospect.smsOptOut)} onClick={()=>{if(window.confirm("Mark this recipient as opted out of promotional "+(isEmail?"email":"SMS")+"?"))perform("suppress",{channel})}}>Mark {isEmail?"email":"SMS"} opt-out</button>
  </div>
  <p className="mt-3 text-[11px] leading-5 text-[#698ca0]">Prospect history is stored in your founder Firestore workspace. A follow-up reminder is a planning record, not automatic permission to send another message.</p>
  {notice&&<p role="status" className="mt-3 rounded-xl bg-white p-3 text-xs leading-6">{notice}</p>}
 </section>;
}
