"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {auth} from "../lib/firebase";
import Link from "next/link";
const field="mt-2 w-full rounded-xl border border-[#d5e7f0] bg-white px-3 py-3 text-sm text-[#204d67]";
const btn="rounded-xl border border-[#c4d8e3] bg-white px-3 py-2.5 text-xs font-bold text-[#28566d] disabled:opacity-40";
const LIMIT=5*1024*1024;
function Thumbnail({uid,id,label}){
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true,objectUrl="";(async()=>{try{
  const token=await auth.currentUser?.getIdToken();
  const r=await fetch("/api/sites/images/"+encodeURIComponent(uid)+"/"+encodeURIComponent(id),{
   headers:token?{Authorization:"Bearer "+token}:{},cache:"no-store"});
  if(!r.ok)throw Error("Photo unavailable");
  objectUrl=URL.createObjectURL(await r.blob());
  if(active)setUrl(objectUrl);else URL.revokeObjectURL(objectUrl);
 }catch{if(active)setUrl("")}
 })();return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[uid,id]);
 return url?<img src={url} alt={label||"Business photo"} className="aspect-[4/3] w-full rounded-lg object-cover"/>:
  <div className="grid aspect-[4/3] place-items-center rounded-lg bg-zinc-100 text-xs text-zinc-500">Private Drive photo</div>;
}
export default function SiteImageLibrary({uid,onPick,industry="",folderHint=""}){
 const [photos,setPhotos]=useState([]),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
 const [label,setLabel]=useState(""),[tags,setTags]=useState(industry||""),
  [folder,setFolder]=useState(folderHint||"General photos"),[rightsSource,setRightsSource]=useState("Business owner / licensed material"),
  [allowed,setAllowed]=useState(false),[drag,setDrag]=useState(false);
 const [search,setSearch]=useState(""),[folderFilter,setFolderFilter]=useState("all"),[editId,setEditId]=useState(""),[edit,setEdit]=useState({});
 const inputRef=useRef(null);
 useEffect(()=>{if(folderHint)setFolder(folderHint);if(industry)setTags(industry)},[folderHint,industry]);
 async function headers(){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to manage your business media.");return {Authorization:"Bearer "+token};}
 async function load(){try{
  const r=await fetch("/api/sites/images",{headers:await headers(),cache:"no-store"});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||"Photo library unavailable.");
  setPhotos(d.images||[]);
 }catch(e){setMessage(e.message||"Private photo archive unavailable.");}}
 useEffect(()=>{if(uid)load()},[uid]);
 async function uploadFiles(files){
  const chosen=Array.from(files||[]).slice(0,8);
  if(!chosen.length)return;
  if(!allowed){setMessage("Confirm that you own or are licensed to use these images before uploading.");return;}
  if(chosen.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>LIMIT||f.size<32)){
   setMessage("Choose JPG, PNG or WebP under 5 MB each.");return;
  }
  setBusy("upload");setMessage("");
  let ok=0,failed=0,lastError="";
  for(const file of chosen){
   try{
    const form=new FormData();
    form.append("file",file);
    form.append("label",label.trim()||(file.name||"Business project photo").replace(/\.[^.]+$/,"").replace(/[-_]+/g," "));
    form.append("folder",folder.trim()||"General photos");
    form.append("tags",tags);form.append("industry",industry);
    form.append("rightsSource",rightsSource);form.append("rightsConfirmed","true");
    const r=await fetch("/api/sites/images",{method:"POST",headers:await headers(),body:form});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||"Upload failed");
    setPhotos(old=>[data.image,...old]);ok++;
   }catch(e){failed++;lastError=e.message||"Upload failed"}
  }
  setMessage(ok+" photo"+(ok===1?"":"s")+" uploaded to private Drive and indexed by folder/tags in Firestore."+
   (failed?" "+failed+" failed: "+lastError:""));
  setBusy("");
  if(inputRef.current)inputRef.current.value="";
 }
 function editPhoto(item){setEditId(item.id);setEdit({label:item.label||item.name,folder:item.folder||"General photos",tags:(item.tags||[]).join(", "),industry:item.industry||industry})}
 async function saveLabels(){
  setBusy("labels");
  try{
   const r=await fetch("/api/sites/images",{method:"PATCH",
    headers:{...(await headers()),"Content-Type":"application/json"},
    body:JSON.stringify({id:editId,...edit})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Could not update photo metadata.");
   setPhotos(old=>old.map(p=>p.id===editId?{...p,...data.image}:p));
   setEditId("");setMessage("Photo label, folder, and search tags updated.");
  }catch(e){setMessage(e.message)}finally{setBusy("")}
 }
 const folders=useMemo(()=>[...new Set(photos.map(p=>p.folder||"General photos"))].sort(),[photos]);
 const filtered=useMemo(()=>{
  const needle=search.toLowerCase().trim(),industryToken=industry.toLowerCase();
  return photos.filter(p=>(folderFilter==="all"||p.folder===folderFilter)&&
   (!needle||[p.label,p.name,p.folder,p.industry,...(p.tags||[])].join(" ").toLowerCase().includes(needle)))
   .sort((a,b)=>{
    const score=p=>[p.industry||"",...(p.tags||[]),p.folder||""].join(" ").toLowerCase().includes(industryToken)&&industryToken?1:0;
    return score(b)-score(a);
   });
 },[photos,folderFilter,search,industry]);
 return <section className="rounded-2xl border border-[#d5e5ed] bg-white p-5 text-[#28495c] sm:p-6">
  <p className="text-[10px] font-black uppercase tracking-widest text-[#658ea7]">FUGTH / PRIVATE DRIVE ASSETS</p>
  <h3 className="mt-3 text-xl font-black">Drag, upload, tag, and reuse business images.</h3>
  <p className="mt-2 text-xs leading-6 text-[#728b99]">Your image files go to your connected Google Drive or the authorized FUGTH private archive. FUGTH creates an app-owned Drive folder when permitted and keeps folder names, labels, and tags in Firestore. You can reuse a photo in multiple sites without uploading it again.</p>
  <div className="mt-5 grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-bold">Drive folder / business collection<input value={folder} onChange={e=>setFolder(e.target.value)} maxLength={48} className={field} placeholder="Business name or Licensed photos"/></label>
   <label className="text-xs font-bold">Image title (optional)<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={105} className={field} placeholder="Completed panel upgrade"/></label>
   <label className="text-xs font-bold">Photo tags (comma-separated)<input value={tags} onChange={e=>setTags(e.target.value)} className={field} maxLength={230} placeholder="electrician, tools, jobsite, exterior"/></label>
   <label className="text-xs font-bold">Photo rights / original source<input value={rightsSource} onChange={e=>setRightsSource(e.target.value)} className={field} maxLength={95} placeholder="Owner supplied, license or written permission"/></label>
  </div>
  <label className="mt-4 flex items-start gap-2 text-xs leading-6"><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)} className="mt-1"/> I confirm these pictures were supplied by their owner or I have the rights to use them in FUGTH preview websites. Social-media availability alone is not permission.</label>
  <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={e=>{e.preventDefault();setDrag(false)}}
   onDrop={e=>{e.preventDefault();setDrag(false);uploadFiles(e.dataTransfer?.files)}}
   className={"mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition "+(drag?"border-[#4293ba] bg-[#e3f5ff]":"border-[#c8dfe9] bg-[#f6fbfe]")}>
   <p className="text-sm font-bold">Drop image files here or choose pictures on your device.</p>
   <p className="mt-2 text-xs text-[#7a97a7]">JPG · PNG · WebP · up to 5 MB each · up to 8 at once</p>
   <button type="button" disabled={!!busy||!allowed} onClick={()=>inputRef.current?.click()}
    className="mt-4 rounded-xl bg-[#184e6c] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy==="upload"?"Saving photos to Drive…":"Choose images / upload folder ↗"}</button>
   <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={e=>uploadFiles(e.target.files)}/>
  </div>
  <div className="mt-4 flex flex-wrap items-center gap-3">
   <button className={btn} type="button" onClick={load}>Refresh images</button>
   <Link className="text-xs font-bold underline" href="/dashboard?integration=google">Connect your Google Drive →</Link>
  </div>
  {message&&<p role="status" className="mt-4 rounded-xl bg-[#eaf7ff] p-3 text-xs leading-6">{message}</p>}
  <div className="mt-7 grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-bold">Search labels or industry tags<input className={field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="solar, electrician, storefront"/></label>
   <label className="text-xs font-bold">Photo folder<select className={field} value={folderFilter} onChange={e=>setFolderFilter(e.target.value)}><option value="all">All my image folders ({photos.length})</option>{folders.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
  </div>
  {!filtered.length&&<p className="mt-5 rounded-xl bg-[#f7fbfe] p-6 text-center text-xs">No matching images yet. Upload your first tagged photo to this private folder.</p>}
  {filtered.length>0&&<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(photo=>{
   const relevant=Boolean(industry)&&[photo.industry,...(photo.tags||[])].join(" ").toLowerCase().includes(industry.toLowerCase());
   return <article key={photo.id} className="overflow-hidden rounded-xl border border-[#dce8ef] bg-[#fbfdff] p-3">
    <Thumbnail uid={uid} id={photo.id} label={photo.label||photo.name}/>
    <div className="mt-2 flex flex-wrap justify-between gap-2">
     <p className="min-w-0 flex-1 truncate text-xs font-black">{photo.label||photo.name||"Business photo"}</p>
     {relevant&&<span className="text-[10px] font-bold text-emerald-700">Matched industry</span>}
    </div>
    <p className="mt-2 text-[11px] text-[#758f9d]">{photo.folder||"General photos"} · {(photo.tags||[]).join(", ")||"No tags"}</p>
    <div className="mt-3 flex flex-wrap gap-1">{[["hero","Hero"],["gallery1","Gallery 1"],["gallery2","Gallery 2"]].map(([slot,label])=>
     <button key={slot} type="button" onClick={()=>{
      const safeFolder=(photo.folder||"General photos").toLowerCase();
      const sameBusiness=!folderHint||safeFolder===folderHint.toLowerCase();
      const shared=["general photos","shared licensed images","licensed stock","shared media"].includes(safeFolder);
      if(!sameBusiness&&!shared&&!window.confirm("This photo is filed under a different business folder: "+photo.folder+". Confirm you are licensed to reuse it in this business's website."))return;
      onPick?.(slot,photo.id);
     }} className={btn}>{label}</button>)}
     <button type="button" className={btn} onClick={()=>editPhoto(photo)}>Edit labels</button></div>
    {editId===photo.id&&<div className="mt-3 space-y-2 rounded-xl bg-[#eaf6fc] p-3">
     {["label","folder","tags","industry"].map(key=><label key={key} className="block text-[11px] font-bold">{key}<input value={edit[key]||""} onChange={e=>setEdit(old=>({...old,[key]:e.target.value}))} className={field}/></label>)}
     <button disabled={!!busy} type="button" className={btn} onClick={saveLabels}>Save labels</button>
     <button type="button" className={btn} onClick={()=>setEditId("")}>Cancel</button>
    </div>}
   </article>;
  })}</div>}
 </section>;
}
