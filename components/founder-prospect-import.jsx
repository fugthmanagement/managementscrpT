"use client";
import {useEffect,useMemo,useState} from "react";
import {collection,doc,onSnapshot,orderBy,query,limit,getDocs,startAfter,serverTimestamp,writeBatch} from "firebase/firestore";
import {db} from "../lib/firebase";
import {COLUMNS,parseCsv,fromMatrix,cleanProspect,matchDetails,markDuplicates,friendlyRawHeader} from "../lib/prospect-scraper";

const input="w-full rounded-xl border border-[#d8e5ee] bg-white px-3 py-2.5 text-xs text-[#203c52] outline-none focus:border-[#4d96bd]";
const badge="rounded-full px-2.5 py-1 text-[10px] font-bold";
const showValue=(value)=>value==null||value===""?"—":typeof value==="boolean"?(value?"Yes":"No"):typeof value==="object"?JSON.stringify(value):String(value);
function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function csvCell(value){const text=showValue(value)==="—"?"":showValue(value);return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;}
async function idFor(record){const txt=[record.sourceFile,record.sourceRow,record.businessName,record.phone,record.googleMapsUrl].join("|");const buffer=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(txt));return "scrape_"+Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,32);}
async function readFullExisting(uid){
 const found=[];let after=null;
 for(let batch=0;batch<30;batch++){
  const parts=[orderBy("createdAt","desc"),limit(500)];
  if(after)parts.push(startAfter(after));
  const snap=await getDocs(query(collection(db,"users",uid,"campaigns"),...parts));
  for(const d of snap.docs){const v=d.data();if(v.type==="cold_call_prospect")found.push({id:d.id,...v});}
  if(snap.size<500)break;after=snap.docs[snap.docs.length-1];
 }
 return found;
}
export default function FounderProspectImport({user}){
 const [rows,setRows]=useState([]),[term,setTerm]=useState(""),[industry,setIndustry]=useState("all"),[site,setSite]=useState("all");
 const [dupes,setDupes]=useState("all"),[sort,setSort]=useState("newest"),[selected,setSelected]=useState(null);
 const [columns,setColumns]=useState(["businessName","phone","industry","address","rating","reviewCount","website","hours","googleMapsUrl","duplicateFlag","duplicateScore","sourceFile"]);
 const [showColumns,setShowColumns]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[importStats,setImportStats]=useState(null);
 useEffect(()=>{if(!db||!user?.uid)return;
  const q=query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(1500));
  return onSnapshot(q,s=>setRows(s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.type==="cold_call_prospect")),e=>setMessage(e?.message||"Could not load Firestore records."));
 },[user?.uid]);
 const categories=useMemo(()=>[...new Set(rows.map(x=>x.industry||"Local service"))].sort(),[rows]);
 const flagged=rows.filter(x=>x.duplicateFlag).length;
 const shown=useMemo(()=>{
  const t=term.toLowerCase();
  let list=rows.filter(x=>{
   if(industry!=="all"&&(x.industry||"Local service")!==industry)return false;
   if(site==="yes"&&!x.website||site==="no"&&x.website)return false;
   if(dupes==="yes"&&!x.duplicateFlag||dupes==="no"&&x.duplicateFlag)return false;
   return !t||[x.businessName,x.phone,x.address,x.city,x.industry,x.website,x.sourceFile].join(" ").toLowerCase().includes(t);
  });
  if(sort==="name")list=[...list].sort((a,b)=>String(a.businessName).localeCompare(String(b.businessName)));
  if(sort==="rating")list=[...list].sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0));
  if(sort==="duplicates")list=[...list].sort((a,b)=>(Number(b.duplicateScore)||0)-(Number(a.duplicateScore)||0));
  return list;
 },[rows,term,industry,site,dupes,sort]);
 async function importFiles(event){
  const files=Array.from(event.target.files||[]);event.target.value="";if(!files.length)return;
  if(!db||!user?.uid){setMessage("Sign in to save your list.");return;}
  setSaving(true);setMessage("");setImportStats(null);
  let saved=0,skipped=0,changed=0,flaggedIncoming=0;
  try{
   const incoming=[];
   for(const file of files){
    if(file.size>12_000_000)throw Error(file.name+" is larger than the 12 MB per-file limit.");
    let prepared=[];
    if(/\.xlsx$/i.test(file.name)){
     const {readSheet}=await import("read-excel-file/browser");
     prepared=fromMatrix(await readSheet(file),file.name);
    }else if(/\.(csv|tsv)$/i.test(file.name)){
     prepared=fromMatrix(parseCsv(await file.text(),/\.tsv$/i.test(file.name)?"\t":","),file.name);
    }else if(/\.json$/i.test(file.name)){
     const payload=JSON.parse(await file.text());
     const objects=Array.isArray(payload)?payload:payload.prospects||payload.rows||[];
     if(!Array.isArray(objects))throw Error(file.name+" does not contain a list of prospects.");
     prepared=objects.map((item,i)=>({item,sourceFile:item.sourceFile||file.name,sourceRow:item.sourceRow||i+2}));
    }else throw Error("Use .xlsx, .csv, .tsv, or .json files.");
    for(const entry of prepared){
     const normalized=cleanProspect(entry.item,entry);
     if(normalized)incoming.push(normalized);else skipped++;
    }
   }
   if(!incoming.length)throw Error("No valid business records found in these files.");
   if(incoming.length>2000)throw Error("Import up to 2,000 records at once.");
   setMessage("Cleaning "+incoming.length+" records and comparing against saved Firestore leads…");
   const existing=await readFullExisting(user.uid);
   const foundIds=new Set(existing.map(x=>x.id));
   const unique=[];
   for(const r of incoming){r.id=await idFor(r);if(foundIds.has(r.id)){skipped++;continue;}foundIds.add(r.id);unique.push(r);}
   const combined=markDuplicates([...existing,...unique]);
   const currentById=new Map(existing.map(x=>[x.id,x]));
   const updates=[];
   for(const item of combined){
    if(!currentById.has(item.id))continue;
    const prev=currentById.get(item.id);
    if(item.duplicateFlag&&(!prev.duplicateFlag||item.duplicateScore>(prev.duplicateScore||0))){
     updates.push({ref:doc(db,"users",user.uid,"campaigns",item.id),data:{duplicateFlag:true,duplicateScore:item.duplicateScore,duplicateGroup:item.duplicateGroup||"",duplicateMatches:item.duplicateMatches,updatedAt:serverTimestamp()}});
    }
   }
   // An import is an explicit save operation: persist immediately after successful parsing.
   // Existing prospect documents are never overwritten (call history/status stay intact).
   const newRows=combined.slice(existing.length);
   for(let offset=0;offset<newRows.length;offset+=200){
    const batch=writeBatch(db);
    for(const item of newRows.slice(offset,offset+200)){
     const {id,...data}=item;batch.set(doc(db,"users",user.uid,"campaigns",id),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }
    await batch.commit();saved+=Math.min(200,newRows.length-offset);
   }
   for(let offset=0;offset<updates.length;offset+=200){
    const batch=writeBatch(db);
    for(const u of updates.slice(offset,offset+200))batch.set(u.ref,u.data,{merge:true});
    await batch.commit();changed+=Math.min(200,updates.length-offset);
   }
   flaggedIncoming=newRows.filter(x=>x.duplicateFlag).length;
   setImportStats({saved,skipped,flaggedIncoming,changed});
   setMessage("Auto-saved "+saved+" prospects to Firestore; "+flaggedIncoming+" new rows flagged for duplicate review. "+skipped+" rows skipped (invalid or already imported). No duplicate was silently deleted.");
  }catch(e){setMessage("Import error: "+(e.message||"Could not parse or save your files.")+(saved?" "+saved+" records were already committed.":""));}
  finally{setSaving(false);}
 }
 const getColumn=v=>COLUMNS.find(([k])=>k===v)?.[1]||v;
 function toggle(k){setColumns(old=>old.includes(k)?old.filter(x=>x!==k):[...old,k]);}
 function exportVisible(kind){
  if(kind==="json"){download("fugth-prospects-export.json",JSON.stringify({format:"fugth-prospect-import-v1",version:1,columns:COLUMNS.map(([k])=>k),prospects:shown},null,2),"application/json");return;}
  const headers=columns.map(getColumn).join(",");
  const body=shown.map(r=>columns.map(k=>csvCell(r[k])).join(",")).join("\r\n");
  download("fugth-prospects-export.csv",headers+"\r\n"+body,"text/csv");
 }
 return <section className="overflow-hidden rounded-[26px] border border-[#d9eaf5] bg-white p-4 text-[#223c4f] shadow-[0_12px_36px_rgba(48,92,120,.05)] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#4787a7]">FUGTH / SCRAPER INTELLIGENCE</p>
    <h3 className="mt-2 text-2xl font-black tracking-tight">Prospect import & data cleanup</h3>
    <p className="mt-2 max-w-3xl text-xs leading-6 text-[#68849a]">Drop in Google Maps scraper CSV, XLSX, TSV, or JSON. FUGTH recognizes scrambled CSS-selector columns, cleans them into business fields, automatically saves to your private Firestore prospect queue, and flags likely duplicates for review. Original scraped columns stay available.</p></div>
   <label className={"cursor-pointer rounded-xl bg-[#17384e] px-5 py-3 text-xs font-black text-white "+(saving?"opacity-50":"")}>{saving?"Saving to Firestore…":"Import files — auto-save"}
    <input className="sr-only" type="file" accept=".csv,.tsv,.xlsx,.json" multiple disabled={saving} onChange={importFiles}/></label>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-3">
   <div className="rounded-2xl bg-[#f1f9fd] p-4"><p className="text-[10px] font-black uppercase text-[#6992a8]">Saved prospects visible</p><p className="mt-1 text-2xl font-black">{rows.length}</p></div>
   <div className="rounded-2xl bg-[#fff8ed] p-4"><p className="text-[10px] font-black uppercase text-[#ab813f]">Flagged duplicates</p><p className="mt-1 text-2xl font-black">{flagged}</p></div>
   <div className="rounded-2xl bg-[#eef9f4] p-4"><p className="text-[10px] font-black uppercase text-[#568973]">Columns preserved</p><p className="mt-1 text-2xl font-black">{COLUMNS.length}+ raw</p></div>
  </div>
  {message&&<p role="status" className="mt-4 rounded-xl border border-[#dae8ee] bg-[#f2f8fc] p-3 text-xs leading-6">{message}</p>}
  {importStats&&<p className="mt-2 text-xs text-[#537b90]">Import summary: {importStats.saved} saved, {importStats.skipped} skipped, {importStats.flaggedIncoming} flagged, {importStats.changed} existing records updated.</p>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
   <label className="text-xs font-bold">Search<input value={term} onChange={e=>setTerm(e.target.value)} className={"mt-1 "+input} placeholder="Name, phone, street, ZIP…"/></label>
   <label className="text-xs font-bold">Category<select value={industry} onChange={e=>setIndustry(e.target.value)} className={"mt-1 "+input}><option value="all">All categories</option>{categories.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
   <label className="text-xs font-bold">Website<select value={site} onChange={e=>setSite(e.target.value)} className={"mt-1 "+input}><option value="all">Any</option><option value="yes">Has website</option><option value="no">No website listed</option></select></label>
   <label className="text-xs font-bold">Duplicates<select value={dupes} onChange={e=>setDupes(e.target.value)} className={"mt-1 "+input}><option value="all">All records</option><option value="yes">Flagged only</option><option value="no">Not flagged</option></select></label>
   <label className="text-xs font-bold">Sort<select value={sort} onChange={e=>setSort(e.target.value)} className={"mt-1 "+input}><option value="newest">Most recently imported</option><option value="name">Business name</option><option value="rating">Highest rating</option><option value="duplicates">Most matching fields</option></select></label>
  </div>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
   <p className="text-xs text-[#648397]">{shown.length} matching / {rows.length} loaded (live view: 1,500 newest records)</p>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>setShowColumns(x=>!x)} className="rounded-lg border border-[#c6dce8] px-3 py-2 text-xs font-bold">Choose columns ({columns.length})</button>
    <button type="button" onClick={()=>exportVisible("csv")} className="rounded-lg border border-[#c6dce8] px-3 py-2 text-xs font-bold">Export CSV</button>
    <button type="button" onClick={()=>exportVisible("json")} className="rounded-lg border border-[#c6dce8] px-3 py-2 text-xs font-bold">Export JSON</button>
   </div>
  </div>
  {showColumns&&<div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#f2f8fc] p-4 sm:grid-cols-3 lg:grid-cols-5">{COLUMNS.filter(([k])=>k!=="rawColumns").map(([k,v])=><label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={columns.includes(k)} onChange={()=>toggle(k)}/>{v}</label>)}</div>}
  <div className="mt-4 max-h-[550px] overflow-auto rounded-xl border border-[#e0eaf1]" role="region" aria-label="All imported prospect columns" tabIndex={0}>
   <table className="min-w-max border-collapse text-left text-xs">
    <thead className="sticky top-0 z-10 bg-[#eaf6fc] text-[#315f78]"><tr>{columns.map(k=><th key={k} className="whitespace-nowrap border-b border-[#d4e5ef] px-3 py-3 font-black">{getColumn(k)}</th>)}<th className="sticky right-0 border-b border-[#d4e5ef] bg-[#eaf6fc] px-3 py-3">Details</th></tr></thead>
    <tbody>{shown.map(row=><tr key={row.id} className={"border-b border-[#edf2f5] hover:bg-[#f6fbff] "+(row.duplicateFlag?"bg-[#fffaf1]":"")}>
     {columns.map(k=><td key={k} className="max-w-[260px] truncate whitespace-nowrap px-3 py-2.5" title={showValue(row[k])}>
      {k==="duplicateFlag"?<span className={badge+" "+(row.duplicateFlag?"bg-[#ffebc9] text-[#95631f]":"bg-[#e5f7ef] text-[#28694c]")}>{row.duplicateFlag?"Flagged":"Clear"}</span>:
      k==="website"&&row.website?<a className="text-[#2079a7] underline" href={row.website} target="_blank" rel="noreferrer noopener">Website ↗</a>:
      k==="googleMapsUrl"&&row.googleMapsUrl?<a className="text-[#2079a7] underline" href={row.googleMapsUrl} target="_blank" rel="noreferrer noopener">Maps ↗</a>:
      showValue(row[k])}</td>)}
     <td className="sticky right-0 bg-white px-3 py-2"><button type="button" onClick={()=>setSelected(row)} className="rounded-lg bg-[#17384e] px-3 py-2 text-white">View all</button></td>
    </tr>)}</tbody>
   </table>
   {!shown.length&&<p className="p-8 text-center text-sm text-[#7390a1]">No records match these filters. Import a scraper file to populate your queue.</p>}
  </div>
  {selected&&<div className="mt-5 rounded-2xl border border-[#c8dfeb] bg-[#f7fbfe] p-5">
   <div className="flex items-start justify-between gap-4"><div><h4 className="text-lg font-black">{selected.businessName}</h4><p className="mt-1 text-xs text-[#648397]">All mapped values plus every original scraper column</p></div><button type="button" onClick={()=>setSelected(null)} className="rounded-lg border px-3 py-2 text-xs">Close</button></div>
   {selected.duplicateFlag&&<p className="mt-3 rounded-xl bg-[#fff0d4] p-3 text-xs font-semibold text-[#90612b]">Possible duplicate: {selected.duplicateScore||0} matching non-name fields · {Array.isArray(selected.duplicateMatches)?selected.duplicateMatches.join(", "):""}. Same business names alone do not trigger a flag. No records were deleted.</p>}
   <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{COLUMNS.filter(([k])=>k!=="rawColumns").map(([k,v])=><div key={k} className="min-w-0 rounded-lg bg-white p-3"><div className="text-[10px] font-black uppercase text-[#7192a6]">{v}</div><p className="mt-1 break-all text-xs">{showValue(selected[k])}</p></div>)}</div>
   <h5 className="mt-5 text-sm font-black">Original scraped columns — nothing lost</h5>
   <div className="mt-2 max-h-64 overflow-auto rounded-xl border bg-white">{Object.entries(selected.rawColumns||{}).map(([k,v])=><div key={k} className="grid grid-cols-[minmax(130px,220px)_1fr] gap-2 border-b px-3 py-2 text-xs"><span className="font-bold" title={k}>{friendlyRawHeader(k)} <span className="text-[9px] font-normal text-[#8aa0b0]">({k})</span></span><span className="break-all">{showValue(v)}</span></div>)}</div>
  </div>}
  <p className="mt-4 text-[11px] leading-5 text-[#7993a3]">Flags are review signals, not automatic merges. Maintain do-not-call preferences, validate phone numbers before campaigns, and avoid unsolicited bulk messaging where consent is required.</p>
 </section>;
}
