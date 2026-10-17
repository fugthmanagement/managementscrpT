"use client";
import {useEffect,useMemo,useState} from "react";
import {collection,doc,onSnapshot,orderBy,query,limit,serverTimestamp,writeBatch} from "firebase/firestore";
import {db} from "../lib/firebase";

const field="w-full rounded-xl border border-[#e0d6c8] bg-white px-3 py-2.5 text-sm text-[#40372e] outline-none focus:border-[#977c5c]";
const normalizePhone=v=>String(v??"").replace(/[^0-9+]/g,"").slice(0,24);
const value=(item,names)=>{for(const name of names){const key=Object.keys(item).find(k=>k.toLowerCase().replace(/[^a-z0-9]/g,"")===name);if(key!=null&&item[key]!=null)return String(item[key]).trim();}return "";};
const clean=(v,max=200)=>String(v??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,max);
function parseDelimited(text,separator=","){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&c===separator){row.push(cell);cell="";}
  else if(!quoted&&(c==="\n"||c==="\r")){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 const head=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,"").trim());
 return rows.map(cells=>Object.fromEntries(head.map((name,i)=>[name,cells[i]||""])));
}
function normalize(item){
 const businessName=clean(value(item,["businessname","business","name","company"]),110);
 const phone=normalizePhone(value(item,["phone","phonenumber","telephone","contactnumber","number"]));
 if(!businessName||!phone)return null;
 const rawRating=value(item,["rating","googlerating","stars"]),rating=Number(rawRating);
 const rawReviews=value(item,["reviewcount","reviews","userratingcount"]),reviewCount=Number(rawReviews);
 const website=clean(value(item,["website","websiteurl","site","url"]),300);
 return {businessName,phone,ownerName:clean(value(item,["ownername","owner","contactname"]),110),
  industry:clean(value(item,["industry","category","businesstype","primarytype"]),75)||"Local service",
  city:clean(value(item,["city","location","area","address"]),160),
  website,hasWebsite:Boolean(website),rating:rawRating&&Number.isFinite(rating)?Math.min(5,Math.max(0,rating)):null,
  reviewCount:Number.isFinite(reviewCount)?Math.max(0,Math.floor(reviewCount)):0,
  googleMapsUrl:clean(value(item,["googlemapsurl","mapsurl"]),350),
  notes:clean(value(item,["notes","description"]),900),
  source:"Imported prospect list",type:"cold_call_prospect",status:"new",callCount:0,favorite:false};
}
export default function FounderProspectImport({user}){
 const [rows,setRows]=useState([]),[search,setSearch]=useState(""),[category,setCategory]=useState("all"),
  [website,setWebsite]=useState("all"),[minRating,setMinRating]=useState("0"),[status,setStatus]=useState("all"),
  [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{if(!db||!user?.uid)return;return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1000)),snap=>{
  setRows(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.type==="cold_call_prospect"));
 },e=>setMessage(e?.message||"Prospect database not available."));},[user?.uid]);
 const categories=useMemo(()=>[...new Set(rows.map(x=>x.industry||"Local service"))].sort(),[rows]);
 const shown=useMemo(()=>rows.filter(x=>{
  if(category!=="all"&&(x.industry||"Local service")!==category)return false;
  if(status!=="all"&&x.status!==status)return false;
  const hasSite=Boolean(x.website);
  if(website==="none"&&hasSite)return false;
  if(website==="yes"&&!hasSite)return false;
  if(Number(minRating)>0&&(Number(x.rating)||0)<Number(minRating))return false;
  return [x.businessName,x.phone,x.city,x.ownerName,x.industry].join(" ").toLowerCase().includes(search.toLowerCase());
 }),[rows,category,website,minRating,status,search]);
 async function importList(event){
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  if(file.size>3_000_000){setMessage("Select a CSV or JSON file smaller than 3 MB.");return;}
  setBusy(true);setMessage("");
  try{
   const text=await file.text();const isJson=/\.json$/i.test(file.name);
   const parsed=isJson?JSON.parse(text):parseDelimited(text,/\.tsv$/i.test(file.name)?"\t":",");
   const raw=Array.isArray(parsed)?parsed:Array.isArray(parsed?.prospects)?parsed.prospects:Array.isArray(parsed?.rows)?parsed.rows:[];
   if(!raw.length)throw Error("No prospect rows found. Include businessName (or Business) and Phone columns.");
   const existing=new Set(rows.map(x=>normalizePhone(x.phone)).filter(Boolean));
   const named=new Set(rows.map(x=>String(x.businessName||"").toLowerCase()+"|"+normalizePhone(x.phone)));
   const entries=[];
   for(const source of raw.slice(0,1500)){
    if(!source||typeof source!=="object"||Array.isArray(source))continue;
    const row=normalize(source);if(!row)continue;
    const k=row.businessName.toLowerCase()+"|"+row.phone;
    if(existing.has(row.phone)||named.has(k))continue;
    existing.add(row.phone);named.add(k);entries.push(row);
   }
   if(!entries.length)throw Error("No new valid prospects: rows may lack phone numbers or already exist.");
   if(entries.length>1000)throw Error("Import up to 1,000 new prospects at a time.");
   for(let i=0;i<entries.length;i+=350){
    const batch=writeBatch(db);
    for(const item of entries.slice(i,i+350)){const ref=doc(collection(db,"users",user.uid,"campaigns"));
      batch.set(ref,{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }
    await batch.commit();
   }
   setMessage("Imported "+entries.length+" new prospects to Firestore. Skipped invalid and duplicate rows. They are ready in your cold-call queue.");
  }catch(e){setMessage(e?.message||"Could not import the prospect file.");}
  finally{setBusy(false);}
 }
 async function googleVoice(number){
  try{await navigator.clipboard.writeText(number);setMessage("Number copied. Paste it into Google Voice's dialer.");}catch{setMessage("Open Google Voice and enter "+number+" manually.");}
  window.open("https://voice.google.com/u/0/calls","_blank","noopener,noreferrer");
 }
 return <section className="rounded-[26px] border border-[#e4d9c8] bg-[#fffdf8] p-5 text-[#443b30] shadow-[0_12px_36px_rgba(72,55,30,.05)] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#98836a]">FUGTH / PROSPECT INTELLIGENCE</p>
    <h3 className="mt-2 text-2xl font-semibold">Your searchable sales list</h3>
    <p className="mt-2 max-w-2xl text-xs leading-6 text-[#827563]">Import CSV, TSV, or JSON prospect lists. Google Sheets can be downloaded as CSV; FUGTH's existing Google Sheets sync also exports your queue. Everything here is saved in your Firestore cold-call collection.</p></div>
   <label className="cursor-pointer rounded-xl bg-[#514534] px-4 py-3 text-xs font-semibold text-white">{busy?"Importing…":"Import CSV / JSON"}
    <input type="file" disabled={busy} accept=".csv,.tsv,.json,text/csv,application/json" onChange={importList} className="sr-only"/></label>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-xs font-semibold">Search businesses<input className={"mt-2 "+field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, ZIP, phone…"/></label>
   <label className="text-xs font-semibold">Business category<select className={"mt-2 "+field} value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-xs font-semibold">Website status<select className={"mt-2 "+field} value={website} onChange={e=>setWebsite(e.target.value)}><option value="all">Any website</option><option value="none">No website listed</option><option value="yes">Website listed</option></select></label>
   <label className="text-xs font-semibold">Minimum Google rating<select className={"mt-2 "+field} value={minRating} onChange={e=>setMinRating(e.target.value)}><option value="0">All ratings</option><option value="3">3.0 stars and up</option><option value="4">4.0 stars and up</option><option value="4.5">4.5 stars and up</option><option value="4.8">4.8 stars and up</option></select></label>
  </div>
  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
   <label className="text-xs font-semibold">Call status <select className="ml-2 rounded-lg border border-[#e4d9c8] bg-white px-3 py-2" value={status} onChange={e=>setStatus(e.target.value)}>{["all","new","contacted","follow_up","booked","closed"].map(x=><option key={x} value={x}>{x==="all"?"All statuses":x.replace(/_/g," ")}</option>)}</select></label>
   <span className="text-xs text-[#837664]">{shown.length} matching / {rows.length} loaded</span>
  </div>
  {message&&<p role="status" className="mt-4 rounded-lg bg-[#f5eddf] px-4 py-3 text-xs">{message}</p>}
  <div className="mt-5 max-h-[460px] divide-y divide-[#eee7db] overflow-y-auto">
   {shown.map(p=><article key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.businessName}</p>
     <p className="mt-1 text-xs text-[#857967]">{p.industry||"Business"} · {p.city||"Area unavailable"} · {p.rating!=null?Number(p.rating).toFixed(1)+" ★ ("+(p.reviewCount||0)+" reviews)":"Unrated"} · {p.website?"Has website":"No website listed"}</p>
     <p className="mt-1 text-xs">{p.phone} · {p.status||"new"}</p></div>
    <div className="flex flex-wrap gap-2">
     <a className="rounded-lg bg-[#463c2e] px-3 py-2 text-xs font-semibold text-white" href={"tel:"+normalizePhone(p.phone)}>Call</a>
     <button type="button" onClick={()=>googleVoice(p.phone)} className="rounded-lg border border-[#d5c7b3] px-3 py-2 text-xs font-semibold">Google Voice</button>
     {p.website&&<a target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#d5c7b3] px-3 py-2 text-xs font-semibold" href={p.website}>Site ↗</a>}
    </div>
   </article>)}
   {!shown.length&&<p className="py-8 text-center text-xs text-[#8d826f]">No matching prospects. Import a list or save businesses from ZIP-code search.</p>}
  </div>
  <p className="mt-3 text-[11px] leading-5 text-[#908573]">Google Voice has no supported one-click third-party call initiation here. On mobile, the Call button opens your phone's calling app; Google Voice opens separately with the number copied. Respect do-not-call requests.</p>
 </section>;
}
