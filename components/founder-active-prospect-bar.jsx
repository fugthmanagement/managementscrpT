"use client";
import {useEffect,useState} from "react";
import {doc,onSnapshot} from "firebase/firestore";
import {db} from "../lib/firebase";
import {useActiveProspect} from "../lib/client/active-prospect";
const cls="rounded-xl border border-[#c5dbe8] bg-white px-4 py-2.5 text-xs font-black text-[#1e5d7e]";
export default function FounderActiveProspectBar({user,onNavigate,onOpenSiteMaker}){
 const [id]=useActiveProspect(user?.uid),[record,setRecord]=useState(null),[error,setError]=useState("");
 useEffect(()=>{
  setRecord(null);setError("");
  if(!id||!user?.uid||!db)return;
  return onSnapshot(doc(db,"users",user.uid,"campaigns",id),snap=>{
   if(!snap.exists()||snap.data()?.type!=="cold_call_prospect"){setRecord(null);setError("Selected business no longer exists.");return;}
   setRecord({id,...snap.data()});
  },()=>setError("Unable to open the saved prospect. Review your Firestore permissions."));
 },[id,user?.uid]);
 return <aside className="rounded-2xl border border-[#a9d4e9] bg-[#ecf8ff] p-4 text-[#173f55]">
  <p className="text-[10px] font-black uppercase tracking-widest text-[#598ba8]">Working prospect · Shared across every tool</p>
  {record?<div className="mt-2 flex flex-wrap items-center justify-between gap-3">
   <div className="min-w-0"><p className="truncate text-base font-black">{record.businessName}</p><p className="mt-1 break-words text-xs text-[#65879a]">{record.phone||"No phone"} · {record.email||"No email"} · {record.industry||"Business"} · {record.status||"New"}</p>
    {record.websitePreviewUrl&&<a href={record.websitePreviewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold underline">Saved website preview ↗</a>}</div>
   <div className="flex flex-wrap gap-2">
    <button type="button" className={cls} onClick={()=>onNavigate("leads")}>Prospect & calls</button>
    <button type="button" className={cls} onClick={()=>onNavigate("sms")}>SMS</button>
    <button type="button" className={cls} onClick={()=>onNavigate("email")}>Email</button>
    <button type="button" className={cls} onClick={()=>onOpenSiteMaker?.({...record,originTab:"leads"})}>Website Maker ↗</button>
   </div>
  </div>:<p className="mt-2 text-xs leading-6">{error||"Select or create a prospect from Prospects & Calls. The same business will follow you into SMS, Email and Website Maker."}</p>}
 </aside>;
}
