"use client";
import {useEffect,useMemo,useState} from "react";
import {addDoc,collection,doc,limit,onSnapshot,orderBy,query,serverTimestamp,updateDoc,writeBatch} from "firebase/firestore";
import {db} from "../lib/firebase";
const field="mt-2 w-full rounded-xl border border-[#cadfea] bg-white px-3 py-3 text-sm text-[#1a4057] outline-none focus:border-[#5eb9e7] focus:ring-2 focus:ring-[#e2f4fe]";
const clean=(v,n=200)=>String(v??"").replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,n);
const digits=v=>String(v||"").replace(/\D/g,"").slice(-10);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||""));
const escapeCell=v=>'"'+String(v??"").replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"';
// Correctly handle ordinary spreadsheet CSV (quoted commas and embedded newlines).
function parseCSV(raw){
 const rows=[];let row=[],cell="",inside=false;
 raw=raw.replace(/^\uFEFF/,"");
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==='"'){
   if(inside&&raw[i+1]==='"'){cell+='"';i++;}
   else inside=!inside;
  }else if(ch===","&&!inside){row.push(cell);cell="";}
  else if((ch==="\n"||ch==="\r")&&!inside){
   if(ch==="\r"&&raw[i+1]==="\n")i++;
   row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
   row=[];cell="";
  }else cell+=ch;
 }
 if(inside)throw Error("This CSV has an unclosed quoted field.");
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function normalize(columns,arr){
 const src=Object.fromEntries(columns.map((c,i)=>[c.toLowerCase().replace(/[^a-z0-9]/g,""),arr[i]||""]));
 const get=(...keys)=>{for(const k of keys)if(src[k])return src[k];return "";};
 const phone=clean(get("phone","phonenumber","telephone","mobile","cell"),32);
 const email=clean(get("email","emailaddress"),160).toLowerCase();
 if(!digits(phone)&&!validEmail(email))return null;
 return {type:"cold_call_prospect",businessName:clean(get("business","businessname","company","organization"),110)||"Business",
  ownerName:clean(get("contact","contactname","ownername","name","fullname"),90),phone,
  email:validEmail(email)?email:"",industry:clean(get("industry","category","type"),80),
  city:clean(get("city","area","zip","zipcode"),90),website:clean(get("website","site","url"),250),
  websitePreviewUrl:clean(get("previewurl","personalurl","personallink","websitedemourl"),300),
  notes:clean(get("notes","details","comment"),2000),source:"spreadsheet_import",
  status:"new",doNotCall:false,marketingOptIn:false,phoneMarketingOptIn:false,
  callCount:0,favorite:false};
}
const canned=[
 {id:"preview",label:"Private website preview",subject:"A website concept for {{business}}",body:"Hi {{contact}},\n\nI'm Pierre with FUGTH Management. I put together a sample website idea that may fit {{business}}. {{link}}\n\nWould you like a quick 15-minute walkthrough to tell me what you think?\n\nPierre | FUGTH Management"},
 {id:"call",label:"Missed-call audit",subject:"A quick idea for {{business}}",body:"Hi {{contact}},\n\nI'm reaching out from FUGTH Management. We help local businesses organize calls, missed inquiries, and customer appointments. If this is relevant for {{business}}, would you be interested in a short introduction?\n\n{{link}}\n\nPierre | FUGTH Management"},
 {id:"followup",label:"Meeting follow-up",subject:"Following up on our conversation",body:"Hi {{contact}},\n\nThanks for discussing {{business}} with me. Here's the business-site preview we talked about: {{link}}\n\nLet me know a good time to review it together.\n\nPierre | FUGTH Management"}
];
function render(text,p){
 const replacements={business:p.businessName||"your business",contact:p.ownerName||"there",
 link:p.websitePreviewUrl||"(Preview link not assigned yet)",service:p.industry||"your services"};
 return text.replace(/\{\{(business|contact|link|service)\}\}/g,(_,key)=>replacements[key]);
}
export default function FounderOutreachDesk({user}){
 const [all,setAll]=useState([]),[selected,setSelected]=useState([]),[busy,setBusy]=useState(false),
 [message,setMessage]=useState(""),[tab,setTab]=useState("email"),[queryText,setQueryText]=useState(""),
 [draft,setDraft]=useState(canned[0]),[queueIndex,setQueueIndex]=useState(0),
 [editor,setEditor]=useState(null);
 useEffect(()=>{
  if(!db||!user?.uid)return;
  return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1000)),
   snap=>setAll(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.type==="cold_call_prospect")),
   ()=>setMessage("The private prospect list could not be loaded."));
 },[user?.uid]);
 const rows=useMemo(()=>all.filter(x=>[x.businessName,x.ownerName,x.phone,x.email,x.notes].join(" ").toLowerCase().includes(queryText.toLowerCase())),[all,queryText]);
 const chosen=useMemo(()=>selected.map(id=>all.find(p=>p.id===id)).filter(Boolean),[selected,all]);
 const reachable=chosen.filter(p=>!p.doNotCall&&p.status!=="do_not_call");
 const current=reachable[Math.min(queueIndex,Math.max(0,reachable.length-1))]||null;
 function toggle(id){setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);setQueueIndex(0);}
 function chooseAll(){const ids=rows.filter(x=>!x.doNotCall).map(x=>x.id);setSelected(x=>x.length===ids.length&&ids.every(id=>x.includes(id))?[]:ids);setQueueIndex(0);}
 async function upload(event){
  const file=event.target.files?.[0];event.target.value="";
  if(!file)return;setBusy(true);setMessage("");
  try{
   if(file.size>2*1024*1024)throw Error("Select a CSV file smaller than 2 MB.");
   const raw=await file.text(),table=parseCSV(raw);
   if(table.length<2)throw Error("Your spreadsheet needs a header row and at least one contact.");
   if(table.length>1001)throw Error("Import at most 1,000 contacts per file.");
   const columns=table[0].map(x=>x.trim()),known=new Set(all.map(x=>digits(x.phone)||x.email));
   const entries=table.slice(1).map(x=>normalize(columns,x)).filter(Boolean);
   const safe=[];for(const item of entries){
    const id=digits(item.phone)||item.email;
    if(!id||known.has(id))continue;known.add(id);safe.push(item);
   }
   let written=0;
   for(let i=0;i<safe.length;i+=150){
    const batch=writeBatch(db);
    for(const record of safe.slice(i,i+150)){
     const ref=doc(collection(db,"users",user.uid,"campaigns"));
     batch.set(ref,{...record,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
     written++;
    }
    await batch.commit();
   }
   setMessage(written+" prospects imported. "+(table.length-1-written)+" duplicates or invalid entries skipped. Marketing consent is not assumed.");
  }catch(e){setMessage(e.message||"Import failed. Export your spreadsheet as CSV and try again.");}
  finally{setBusy(false)}
 }
 async function updateProspect(id,patch){
  if(!db||!user?.uid)return;
  setBusy(true);setMessage("");
  try{
   const record=all.find(p=>p.id===id);
   if(!record)throw Error("Contact not found.");
   const safe={};
   for(const key of ["businessName","ownerName","email","phone","industry","city","website","websitePreviewUrl","notes","status","consentSource"]){
    if(Object.prototype.hasOwnProperty.call(patch,key))safe[key]=clean(patch[key],key==="notes"?2000:key==="websitePreviewUrl"?300:160);
   }
   for(const key of ["doNotCall","marketingOptIn","phoneMarketingOptIn"])if(Object.prototype.hasOwnProperty.call(patch,key))safe[key]=patch[key]===true;
   if(safe.marketingOptIn===true&&!safe.consentSource&&!record.consentSource)
    throw Error("Record where the prospect opted into marketing before enabling email marketing.");
   if(safe.doNotCall===true){safe.status="do_not_call";safe.marketingOptIn=false;safe.phoneMarketingOptIn=false;}
   if(record.doNotCall===true&&safe.doNotCall===false)
    throw Error("Do-not-contact restrictions need a separately verified permission process before removal.");
   await updateDoc(doc(db,"users",user.uid,"campaigns",id),{...safe,updatedAt:serverTimestamp()});
   setMessage("Prospect details updated.");setEditor(null);
  }catch(e){setMessage(e.message||"Could not update prospect.");}
  finally{setBusy(false);}
 }
 function copyText(value){navigator.clipboard?.writeText(value).then(()=>setMessage("Copied to clipboard.")).catch(()=>setMessage("Select and copy the text manually."));}
 function emailDraft(row){
  if(!validEmail(row.email)){setMessage("This prospect doesn't have a valid email.");return;}
  if(row.doNotCall||row.status==="do_not_call"){setMessage("This prospect is marked do-not-contact.");return;}
  const body=render(draft.body,row),subject=render(draft.subject,row);
  // Opens draft only. No automatic or unsolicited mail is sent by FUGTH.
  window.location.href="mailto:"+encodeURIComponent(row.email)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  setMessage("An email draft opened. Check permission, accuracy and the unsubscribe request before sending.");
 }
 function dial(row){
  if(row.doNotCall||row.status==="do_not_call"){setMessage("Do-not-call entry cannot be dialed.");return;}
  if(!digits(row.phone)){setMessage("This prospect does not have a valid number.");return;}
  copyText(row.phone);window.open("https://voice.google.com/u/0/calls","_blank","noopener,noreferrer");
 }
 function download(){
  const cols=["businessName","ownerName","phone","email","industry","city","website","websitePreviewUrl","status","doNotCall","marketingOptIn","consentSource","notes"];
  const content=[cols.join(","),...all.map(p=>cols.map(k=>escapeCell(p[k])).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="fugth-founder-outreach.csv";a.click();URL.revokeObjectURL(url);
 }
 return <section className="space-y-5">
  <div className="overflow-hidden rounded-[28px] border border-[#b9d9e9] bg-[#102636] p-6 text-white sm:p-8">
   <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#99d4f3]">FUGTH OPERATIONS / OUTREACH</p>
   <h3 className="mt-3 text-3xl font-black leading-[1.06] tracking-[-.055em] sm:text-5xl">Every prospect has a story.<br/><span className="text-[#b9e5fb]">Keep the details.</span></h3>
   <p className="mt-4 max-w-2xl text-sm leading-7 text-[#afc5d3]">Import a spreadsheet, personalize your website links, keep notes, and prepare individual email or call drafts. Automated cold blasts are intentionally not enabled.</p>
   <div className="mt-6 flex flex-wrap gap-2"><label className="cursor-pointer rounded-full bg-[#b9e5fb] px-5 py-3 text-xs font-black text-[#194a65]">Import CSV spreadsheet<input type="file" accept=".csv,text/csv" className="sr-only" onChange={upload} disabled={busy}/></label><button onClick={download} type="button" className="rounded-full border border-white/30 px-5 py-3 text-xs font-bold text-white">Export contacts ↗</button><span className="self-center text-[11px] text-[#a6c4d5]">{all.length} saved prospects</span></div>
  </div>
  {message&&<p role="status" className="rounded-xl border border-[#c4dfeb] bg-[#eef8fe] p-4 text-xs font-bold text-[#2a6686]">{message}</p>}
  <div className="flex flex-wrap items-center justify-between gap-3"><div role="tablist" className="inline-flex gap-1 rounded-xl border border-[#d4e5ef] bg-white p-1"><button role="tab" aria-selected={tab==="email"} onClick={()=>setTab("email")} className={"rounded-lg px-4 py-3 text-xs font-bold "+(tab==="email"?"bg-[#173c55] text-white":"text-[#68869a]")}>Email marketing</button><button role="tab" aria-selected={tab==="phone"} onClick={()=>setTab("phone")} className={"rounded-lg px-4 py-3 text-xs font-bold "+(tab==="phone"?"bg-[#173c55] text-white":"text-[#68869a]")}>Phone outreach</button></div><input value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="Search prospects…" aria-label="Search prospects" className={"max-w-xs "+field}/></div>
  <div className="overflow-x-auto rounded-[22px] border border-[#dce9f2] bg-white shadow-[0_10px_30px_rgba(29,75,104,.04)]">
   <table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#eef8fe] text-[#497b96]"><tr><th className="p-4"><input type="checkbox" aria-label="Select all visible eligible prospects" checked={rows.length>0&&rows.every(x=>selected.includes(x.id)||x.doNotCall)} onChange={chooseAll}/></th>{["Business","Contact","Phone / Email","Website preview","Stage","Actions"].map(x=><th className="p-4 font-black" key={x}>{x}</th>)}</tr></thead>
    <tbody className="divide-y divide-[#e9f0f5]">{rows.slice(0,500).map(item=><tr key={item.id} className={item.doNotCall?"bg-[#fcf3f2] text-[#a18b8b]":"text-[#28475c]"}><td className="p-4"><input type="checkbox" aria-label={"Select "+item.businessName} checked={selected.includes(item.id)} disabled={item.doNotCall} onChange={()=>toggle(item.id)}/></td><td className="p-4"><strong className="block">{item.businessName}</strong><span className="text-[10px] text-[#829baa]">{item.industry||"General"} · {item.city||"Location unknown"}</span></td><td className="p-4">{item.ownerName||"—"}</td><td className="p-4"><span className="block">{item.phone||"—"}</span><span className="block text-[10px] text-[#7993a3]">{item.email||"—"}</span></td><td className="max-w-[180px] break-all p-4 text-[11px] text-[#2679a0]">{item.websitePreviewUrl?<a href={item.websitePreviewUrl.startsWith("https://")?item.websitePreviewUrl:"#"} target="_blank" rel="noopener noreferrer" className="underline">Open private preview ↗</a>:"Add personalized link"}</td><td className="p-4">{item.doNotCall?"Do not contact":item.status||"New"}</td><td className="p-4"><button onClick={()=>setEditor({...item})} className="rounded-lg border border-[#c6dfec] bg-white px-3 py-2 font-bold">Edit details</button></td></tr>)}</tbody>
   </table>{!rows.length&&<p className="p-8 text-center text-sm text-[#6e8b9c]">No prospects found. Import a CSV with columns like Business Name, Phone, Email, Owner Name and Preview URL.</p>}
  </div>
  {editor&&<form onSubmit={e=>{e.preventDefault();updateProspect(editor.id,editor)}} className="rounded-2xl border border-[#b9dcec] bg-[#f4fbff] p-5"><div className="flex items-center justify-between"><h4 className="text-lg font-black text-[#244a60]">Edit {editor.businessName}</h4><button type="button" onClick={()=>setEditor(null)} className="text-sm">Close ×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["Business name","businessName"],["Owner/contact","ownerName"],["Phone","phone"],["Email","email"],["Industry","industry"],["City","city"],["Existing website","website"],["Personalized preview link","websitePreviewUrl"],["Consent source","consentSource"]].map(([label,key])=><label key={key} className="text-xs font-bold">{label}<input value={editor[key]||""} onChange={e=>setEditor({...editor,[key]:e.target.value})} className={field}/></label>)}<label className="text-xs font-bold sm:col-span-2">Notes<textarea rows={4} value={editor.notes||""} onChange={e=>setEditor({...editor,notes:e.target.value})} className={field}/></label><label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={editor.marketingOptIn===true} onChange={e=>setEditor({...editor,marketingOptIn:e.target.checked})}/> Documented permission to send marketing email (record source above)</label><label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={editor.doNotCall===true} onChange={e=>setEditor({...editor,doNotCall:e.target.checked})}/> Mark do not contact / suppress all outreach</label></div><button disabled={busy} className="mt-5 rounded-xl bg-[#173d53] px-5 py-3 text-xs font-bold text-white">Save prospect changes</button></form>}
  <div className="grid items-start gap-5 lg:grid-cols-[.95fr_1.05fr]">
   <div className="rounded-[24px] border border-[#d4e7f2] bg-white p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#498caf]">{tab==="email"?"EMAIL OUTREACH":"PHONE OUTREACH"}</p><h4 className="mt-3 text-2xl font-black tracking-tight text-[#1a4258]">{tab==="email"?"Personalized emails, not a blast.":"Dial one contact at a time."}</h4><p className="mt-3 text-xs leading-6 text-[#6c889a]">{tab==="email"?"You can draft emails individually. Bulk Gmail campaigns live in the separate Marketing tools and require verified opt-in.":"The phone provider is not connected for batch dialing yet. This queue copies the number and opens Google Voice for manual calling only. Respect do-not-call lists and calling hours."}</p><label className="mt-4 block text-xs font-bold">Message approach<select className={field} value={draft.id} onChange={e=>setDraft(canned.find(x=>x.id===e.target.value)||canned[0])}>{canned.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
    {tab==="email"&&<><label className="mt-4 block text-xs font-bold">Email subject<input value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})} className={field}/></label><label className="mt-4 block text-xs font-bold">Email body<textarea rows={8} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} className={field}/></label></>}
   </div>
   <div className="rounded-[24px] border border-[#d4e7f2] bg-[#eff9ff] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#498caf]">SELECTED PROSPECT QUEUE · {reachable.length}</p><span className="text-xs text-[#64849a]">{reachable.length?Math.min(queueIndex+1,reachable.length)+"/"+reachable.length:"Nothing selected"}</span></div>
    {current?<><h4 className="mt-4 text-xl font-black text-[#173e54]">{current.businessName}</h4><p className="mt-1 text-xs text-[#6889a0]">{current.ownerName||"Contact unknown"} · {current.phone||current.email}</p><pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[#c9e3f0] bg-white p-4 font-sans text-xs leading-6 text-[#345c74]">{render(draft.body,current)}</pre><div className="mt-4 flex flex-wrap gap-2">{tab==="email"?<button disabled={!validEmail(current.email)} onClick={()=>emailDraft(current)} className="rounded-xl bg-[#153a53] px-4 py-3 text-xs font-black text-white disabled:opacity-40">Open individual email draft ↗</button>:<button disabled={!digits(current.phone)} onClick={()=>dial(current)} className="rounded-xl bg-[#153a53] px-4 py-3 text-xs font-black text-white disabled:opacity-40">Copy number + open Voice ↗</button>}<button onClick={()=>copyText(render(draft.body,current))} className="rounded-xl border border-[#b9d7e7] bg-white px-4 py-3 text-xs font-bold">Copy message</button><button onClick={()=>setQueueIndex(i=>(i+1)%reachable.length)} className="rounded-xl border border-[#b9d7e7] bg-white px-4 py-3 text-xs font-bold">Next contact →</button></div><p className="mt-4 text-[11px] leading-5 text-[#65899d]">No messages or AI calls are sent by this screen. Check permission, opt-outs and personalization before sending anything manually.</p></>:<p className="mt-6 rounded-xl bg-white p-6 text-center text-xs leading-6 text-[#6b8a9c]">Select prospects using the checkboxes above to prepare individual messages and calls.</p>}
   </div>
  </div>
 </section>;
}
