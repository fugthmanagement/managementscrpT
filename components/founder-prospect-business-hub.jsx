"use client";
import {useCallback,useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const fields=[["businessName","Business name"],["ownerName","Owner / contact"],["industry","Trade or industry"],["phone","Phone"],["email","Email"],["city","City / service area"],["website","Current website (HTTPS)"],["googleMapsUrl","Google Maps listing (HTTPS)"]];
const fieldClass="mt-2 w-full rounded-xl border border-[#cfdfeb] bg-white px-3 py-3 text-base text-[#23495c] sm:text-sm";
export default function FounderProspectBusinessHub({prospectId,onUpdated}){
 const [profile,setProfile]=useState(null),[activity,setActivity]=useState([]),[note,setNote]=useState(""),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const request=useCallback(async(body)=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to your FUGTH account.");
  const save=Boolean(body);
  const res=await fetch("/api/dev/prospect-profile"+(save?"":"?prospectId="+encodeURIComponent(prospectId)),
   {method:save?"POST":"GET",cache:"no-store",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},...(save?{body:JSON.stringify({...body,prospectId})}:{})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||"Business Data Hub could not load.");
  return data;
 },[prospectId]);
 const load=useCallback(async(clearNotice=true)=>{
  try{const r=await request();setProfile(r.prospect);setActivity(r.activity||[]);if(clearNotice)setNotice("")}
  catch(e){setNotice(e.message)}
 },[request]);
 useEffect(()=>{setProfile(null);setActivity([]);if(prospectId)load()},[prospectId,load]);
 async function save(){
  if(!profile||busy)return;
  setBusy("save");try{
   const d=await request({action:"save",profile});
   if(d.revision&&d.site)onUpdated?.(d);
   setNotice(d.unchanged?"No changes to save.":d.previewSynced?
    "Saved to prospect CRM and existing website preview. Same link, new revision.":
    "Saved to the prospect record. No assigned website draft to update.");
   await load(false);
  }catch(e){setNotice(e.message)}finally{setBusy("")}
 }
 async function logNote(){
  if(!note.trim()||busy)return;setBusy("note");
  try{await request({action:"note",note:note.trim()});setNote("");await load();setNotice("Note added to the prospect's history.")}
  catch(e){setNotice(e.message)}finally{setBusy("")}
 }
 return <section className="rounded-[24px] border border-[#d0e4ef] bg-white p-5 text-[#1d455a] sm:p-7">
  <div className="flex flex-wrap justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#6b9bb4]">Single source of truth · FUGTH CRM</p><h3 className="mt-2 text-xl font-black">Business Data Hub</h3><p className="mt-2 text-xs leading-6 text-[#738fa0]">Edit once; SMS, Email, Call Desk and Website Maker read the same saved prospect record. Draft previews update automatically. Published customer sites require their own approval.</p></div><button type="button" onClick={load} className="rounded-xl border border-[#c9e0eb] bg-white px-4 py-2 text-xs font-black">Refresh ↻</button></div>
  {profile?<><div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([key,label])=><label key={key} className="text-xs font-bold">{label}<input className={fieldClass} maxLength={key==="website"||key==="googleMapsUrl"?650:130} type={key==="email"?"email":key==="website"||key==="googleMapsUrl"?"url":"text"} value={profile[key]||""} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}/></label>)}
    <label className="sm:col-span-2 text-xs font-bold">Internal prospect notes<textarea className={fieldClass} rows={3} maxLength={900} value={profile.notes||""} onChange={e=>setProfile(p=>({...p,notes:e.target.value}))}/></label>
   </div>
   <button type="button" disabled={!!busy} onClick={save} className="mt-4 rounded-xl bg-[#18506e] px-6 py-3 text-xs font-black text-white disabled:opacity-40">{busy==="save"?"Saving…":"Save & sync to preview"}</button>
   <div className="mt-6 rounded-xl bg-[#f3f9fd] p-4"><strong className="text-sm">Log a call, reply, or sales note</strong>
    <textarea className={fieldClass} maxLength={700} rows={2} placeholder="What happened with this prospect?" value={note} onChange={e=>setNote(e.target.value)}/>
    <button type="button" disabled={!!busy||!note.trim()} onClick={logNote} className="mt-3 rounded-xl border border-[#b5d6e8] bg-white px-4 py-2 text-xs font-black disabled:opacity-40">Add to history</button>
   </div>
   <div className="mt-5"><strong className="text-sm">Recent activity</strong>
    <div className="mt-2 max-h-56 space-y-2 overflow-auto">{activity.map(ev=><div key={ev.id} className="rounded-lg border border-[#deebf2] p-3 text-xs"><strong>{ev.type==="business_data_updated"?"Business details updated":ev.type==="manual_note"?"Founder note":ev.type==="sms_marked_sent"?"SMS marked sent manually":ev.type==="sms_history_corrected"?"SMS log corrected":ev.type==="website_design_saved"?"Website draft saved":ev.type==="domain_launch_staged"?"Domain launch prepared":ev.type}</strong><span className="ml-2 text-[#849ca9]">{ev.at?new Date(ev.at).toLocaleString():""}</span><p className="mt-1 text-[#628091]">{ev.text||ev.textPreview||(ev.newStatus?"Updated SMS status to "+ev.newStatus:"")||((ev.changedFields||[]).join(", "))}</p></div>)}
     {!activity.length&&<p className="text-xs text-[#8fa4b2]">No saved activity yet.</p>}</div>
   </div>
  </>:<p className="mt-4 text-xs text-[#7291a4]">Loading selected prospect information…</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-[#eff8fc] p-3 text-xs">{notice}</p>}
 </section>;
}
