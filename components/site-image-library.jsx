"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
function Thumbnail({uid,id}){
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true,objectUrl="";(async()=>{try{
  const token=await auth.currentUser?.getIdToken();
  const r=await fetch("/api/sites/images/"+encodeURIComponent(uid)+"/"+encodeURIComponent(id),{
   headers:token?{Authorization:"Bearer "+token}:{},cache:"no-store"});
  if(!r.ok)throw Error();
  objectUrl=URL.createObjectURL(await r.blob());
  if(active)setUrl(objectUrl);else URL.revokeObjectURL(objectUrl);
 }catch{if(active)setUrl("");}})();return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};},[uid,id]);
 return url?<img src={url} alt="My business photo" className="aspect-[4/3] w-full rounded-lg object-cover"/>:
 <div className="grid aspect-[4/3] place-items-center rounded-lg bg-zinc-100 text-xs text-zinc-500">Private photo</div>;
}
export default function SiteImageLibrary({uid,onPick}){
 const [photos,setPhotos]=useState([]),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
 async function headers(){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to manage photos.");return {Authorization:"Bearer "+token};}
 async function load(){try{
  const r=await fetch("/api/sites/images",{headers:await headers(),cache:"no-store"});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||"Photo library unavailable.");setPhotos(d.images||[]);
 }catch(e){setMessage(e.message||"Private photo archive unavailable.");}}
 useEffect(()=>{if(uid)load()},[uid]);
 async function upload(e){
  const file=e.target.files?.[0];if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
   setMessage("Choose a JPG, PNG or WebP photo under 5 MB.");return;}
  setBusy("upload");setMessage("");
  try{const form=new FormData();form.append("file",file);
   const r=await fetch("/api/sites/images",{method:"POST",headers:await headers(),body:form});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(d.error||"Upload failed.");
   setPhotos(prev=>[d.image,...prev]);setMessage("Saved privately to your FUGTH photo library.");
  }catch(err){setMessage(err.message||"Upload failed.");}
  finally{setBusy("");e.target.value="";}
 }
 return <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">PRIVATE PHOTO LIBRARY</p>
  <h3 className="mt-3 text-lg font-bold text-black">Use your own business photos.</h3>
  <p className="mt-2 text-xs leading-6 text-zinc-600">Upload to the FUGTH Management private archive. Files are kept separate for each customer account.</p>
  <label className="mt-4 inline-flex cursor-pointer rounded-xl bg-black px-5 py-3.5 text-xs font-bold text-white">
   {busy?"Uploading…":"Upload photos ↗"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} className="sr-only" onChange={upload}/>
  </label>
  {message&&<p className="mt-3 rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700">{message}</p>}
  {photos.length>0&&<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{photos.map(photo=><article key={photo.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
   <Thumbnail uid={uid} id={photo.id}/><p className="mt-2 truncate text-xs font-bold">{photo.name||"My photo"}</p>
   <div className="mt-3 flex flex-wrap gap-1">{[["hero","Hero"],["gallery1","Gallery 1"],["gallery2","Gallery 2"]].map(([slot,label])=>
    <button key={slot} type="button" onClick={()=>onPick?.(slot,photo.id)} className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-[10px] font-semibold">{label}</button>)}</div>
  </article>)}</div>}
 </section>;
}
