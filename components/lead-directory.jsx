"use client";
import {useEffect,useMemo,useState} from "react";
import {addDoc,collection,deleteDoc,doc,onSnapshot,orderBy,limit,query,serverTimestamp,writeBatch} from "firebase/firestore";
import {db} from "../lib/firebase";
const field="w-full rounded-xl border border-[#dceaf3] bg-white px-4 py-3 text-sm outline-none focus:border-[#477e99]";
const clean=(v,max=120)=>String(v??"").trim().slice(0,max);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function normalizeRow(x){
 if(typeof x!=="object"||!x||Array.isArray(x))return null;
 const email=clean(x.email||x.emailAddress||x.Email,150).toLowerCase();
 const phone=clean(x.phone||x.phoneNumber||x.mobile,32);
 if(!validEmail(email)&&!phone)return null;
 return {
  contactName:clean(x.name||x.fullName||x.contactName||[x.firstName,x.lastName].filter(Boolean).join(" "),100),
  businessName:clean(x.company||x.businessName,100),
  email:validEmail(email)?email:"",phone,status:"new",source:"marketing_import",
  marketingOptIn:x.marketingOptIn===true||x.optedIn===true||x.consent===true,
  consentSource:clean(x.consentSource||"",150),notes:clean(x.notes||"",350)
 };
}
export default function LeadDirectory({user}){
 const [leads,setLeads]=useState([]),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const [form,setForm]=useState({name:"",email:"",phone:"",business:"",consent:false});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{if(!db||!user?.uid)return;return onSnapshot(query(collection(db,"users",user.uid,"leads"),orderBy("createdAt","desc"),limit(500)),snap=>setLeads(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>setMessage("Unable to load contacts. Check Firestore rules."));},[user?.uid]);
 const recipients=useMemo(()=>leads.filter(l=>validEmail(l.email||"")&&l.marketingOptIn===true&&l.unsubscribed!==true),[leads]);
 const rows=useMemo(()=>leads.filter(l=>(filter==="all"||filter==="subscribed"&&l.marketingOptIn===true||filter==="needs-consent"&&l.marketingOptIn!==true)&&[l.contactName,l.email,l.phone,l.businessName].join(" ").toLowerCase().includes(search.toLowerCase())),[leads,search,filter]);
 async function add(event){
  event.preventDefault();setMessage("");setBusy(true);
  try{
   const entry=normalizeRow({name:form.name,email:form.email,phone:form.phone,company:form.business,consent:form.consent});
   if(!entry)throw Error("Enter a valid email or phone number.");
   await addDoc(collection(db,"users",user.uid,"leads"),{...entry,source:"manual_directory",consentSource:form.consent?"Confirmed by business owner when adding":"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   setForm({name:"",email:"",phone:"",business:"",consent:false});setMessage("Contact saved to your FUGTH list.");
  }catch(e){setMessage(e.message||"Could not save contact.");}finally{setBusy(false);}
 }
 async function upload(event){
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  setBusy(true);setMessage("");
  try{
   if(file.size>2*1024*1024)throw Error("Choose a JSON file under 2 MB.");
   const parsed=JSON.parse(await file.text());
   const incoming=Array.isArray(parsed)?parsed:Array.isArray(parsed.contacts)?parsed.contacts:Array.isArray(parsed.leads)?parsed.leads:null;
   if(!incoming)throw Error("JSON needs a contacts array, leads array, or top-level array.");
   if(incoming.length>1000)throw Error("Import at most 1,000 contacts per file.");
   const existing=new Set(leads.map(l=>String(l.email||"").toLowerCase()+"|"+String(l.phone||"")));
   const seen=new Set(),valid=[];
   for(const item of incoming){const row=normalizeRow(item);if(!row)continue;const identity=row.email+"|"+row.phone;if(seen.has(identity)||existing.has(identity))continue;seen.add(identity);valid.push(row);}
   let count=0;
   for(let i=0;i<valid.length;i+=200){
    const batch=writeBatch(db);
    valid.slice(i,i+200).forEach(item=>batch.set(doc(collection(db,"users",user.uid,"leads")),{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await batch.commit();count+=Math.min(200,valid.length-i);
   }
   setMessage(count+" contacts imported; "+(incoming.length-count)+" skipped. Marketing emails still require permission.");
  }catch(e){setMessage(e.message||"JSON import failed.");}
  finally{setBusy(false);}
 }
 async function remove(row){if(!window.confirm("Delete this contact?"))return;try{await deleteDoc(doc(db,"users",user.uid,"leads",row.id));setMessage("Contact removed.");}catch{setMessage("Could not remove contact.");}}
 function download(){
  const content=JSON.stringify(leads.map(l=>({name:l.contactName,company:l.businessName,email:l.email,phone:l.phone,marketingOptIn:l.marketingOptIn,consentSource:l.consentSource,notes:l.notes})),null,2);
  const url=URL.createObjectURL(new Blob([content],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="fugth-contacts.json";a.click();URL.revokeObjectURL(url);
 }
 return <section className="rounded-[22px] border border-[#d9e8f2] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7894a5]">FIRST-PARTY CRM</p><h3 className="mt-2 text-2xl font-semibold">Your contacts and lead list</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-[#738e9e]">Own your contact data inside FUGTH Firestore and use your opted-in contacts in email campaigns.</p></div>
   <div className="flex gap-2"><label className="cursor-pointer rounded-xl bg-[#1b4157] px-4 py-3 text-xs font-semibold text-white">{busy?"Importing…":"Import JSON"}<input type="file" accept=".json,application/json" onChange={upload} disabled={busy} className="sr-only"/></label><button type="button" onClick={download} className="rounded-xl border border-[#d5e7f1] px-4 py-3 text-xs font-semibold">Export JSON</button></div>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Saved leads",leads.length],["Email-ready (opt-in)",recipients.length],["Need email consent",leads.filter(l=>l.email&&!l.marketingOptIn).length]].map(([label,n])=><div key={label} className="rounded-xl bg-[#f3faff] p-4"><p className="text-xl font-bold">{n}</p><p className="mt-1 text-[11px] text-[#748e9e]">{label}</p></div>)}</div>
  <form onSubmit={add} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Name","name","text"],["Email","email","email"],["Phone","phone","tel"],["Business","business","text"]].map(([label,key,type])=><label key={key} className="text-xs font-semibold">{label}<input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className={"mt-2 "+field}/></label>)}
   <label className="flex items-center gap-2 text-xs text-[#638296] sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/>This contact has explicitly agreed to receive marketing emails from this business.</label>
   <button type="submit" disabled={busy} className="rounded-xl bg-[#21445b] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">Save contact</button>
  </form>
  {message&&<p role="status" className="mt-4 rounded-xl bg-[#eaf7ff] p-4 text-xs text-[#506b52]">{message}</p>}
  <div className="mt-6 flex flex-wrap gap-3"><input type="search" placeholder="Find email, phone or name" value={search} onChange={e=>setSearch(e.target.value)} className={field+" min-w-[180px] flex-1"}/><select value={filter} onChange={e=>setFilter(e.target.value)} className={field+" max-w-[190px]"}><option value="all">All contacts</option><option value="subscribed">Email consent</option><option value="needs-consent">Consent pending</option></select></div>
  <div className="mt-3 max-h-[390px] divide-y divide-[#eff1eb] overflow-y-auto">{rows.map(row=><article key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-xs"><div className="min-w-0"><p className="font-semibold">{row.contactName||row.businessName||"Unnamed contact"}</p><p className="mt-1 break-all text-[#738074]">{[row.email,row.phone].filter(Boolean).join(" · ")}</p><p className="mt-1 text-[10px] text-[#869285]">{row.marketingOptIn===true?"Email consent recorded":"Consent pending"} · {row.source||"manual"}</p></div><button type="button" onClick={()=>remove(row)} className="text-[11px] font-semibold text-red-700">Remove</button></article>)}{!rows.length&&<p className="py-8 text-center text-xs text-[#869185]">No matching contacts yet.</p>}</div>
 </section>;
}
