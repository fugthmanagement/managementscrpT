"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {onAuthStateChanged} from "firebase/auth";
import {doc,getDoc} from "firebase/firestore";
import {auth,db} from "../../../lib/firebase";
import {buildStarterSite,siteFields,getIndustryThemes} from "../../../lib/site-presets";
import SiteStudio from "../../../components/site-studio";
import SiteRenderer from "../../../components/site-renderer";

export default function SitePage({params}){
 const uid=params.uid;
 const [page,setPage]=useState({loading:true,site:null,preview:false,owner:false,error:""});
 const [editorUser,setEditorUser]=useState(null),[editing,setEditing]=useState(false);
 useEffect(()=>{
  if(!uid||!/^[-_a-zA-Z0-9]{8,128}$/.test(uid)||!db){setPage({loading:false,site:null,preview:false,owner:false,error:"Invalid website link."});return;}
  let cancelled=false;
  const params=new URLSearchParams(window.location.search),editRequested=params.get("edit")==="1",preview=editRequested||params.get("preview")==="1",previewTemplate=params.get("template");
  // Do not show a 404 until authentication has settled: the owner is allowed
  // to view a private, unpublished design in a separate tab on this same URL.
  const unsubscribe=onAuthStateChanged(auth,async user=>{
   if(cancelled)return;
   if(editRequested)setEditing(true);
   const owner=Boolean(user?.uid===uid);
   setEditorUser(user||null);
   let site=null,canEdit=owner;
   try{
    if(preview&&user){
     const token=await user.getIdToken();
     const res=await fetch("/api/sites/"+encodeURIComponent(uid),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
     const result=await res.json().catch(()=>({}));
     if(res.ok&&result.site){site=result.site;canEdit=true;}
    }
    if(!site){
     const snap=await getDoc(doc(db,"publicSites",uid));
     if(snap.exists())site=snap.data();
    }
    if(!site&&owner&&preview){
     // A brand-new free workspace still deserves a full preview, even if
     // server Admin credentials or site publishing are not configured yet.
     const userSnap=await getDoc(doc(db,"users",uid)).catch(()=>null);
     const details=userSnap?.data()||{};
     site={...buildStarterSite(uid,details.businessName||user.displayName||"Your business",
       details.businessType||"general",details),visibility:"preview"};
    }
    if(site&&owner&&preview){
     const profile=await getDoc(doc(db,"users",uid)).catch(()=>null);
     const photos=profile?.data()?.sitePreviewImages||{};
     if(photos.heroImageId||photos.galleryImageIds)site={...site,
      ...(photos.heroImageId?{heroImageId:photos.heroImageId}:{}),
      ...(photos.galleryImageIds?{galleryImageIds:photos.galleryImageIds}:{}),ownerId:uid};
    }
    if(site&&owner&&preview){
      // Unsaved Website Maker drafts stay in this browser; this never publishes them.
      try{
        const local=JSON.parse(localStorage.getItem("fugth-site-draft-v1:"+uid)||"null");
        if(local)site={...site,...siteFields({...site,...local}),ownerId:uid,visibility:site.visibility};
      }catch{}
      const option=getIndustryThemes(site.industry).find(t=>t.id===previewTemplate);
      if(option)site={...site,template:option.id,theme:option.id};
    }
    if(!cancelled)setPage({loading:false,site,owner:canEdit,preview,error:site?"":"No saved design is available yet. Retry opening from Administration."});
   }catch{
    if(!cancelled)setPage({loading:false,site:null,owner:canEdit,preview,error:"Could not open this website. Return to your workspace and try again."});
   }
  });
  return()=>{cancelled=true;unsubscribe();};
 },[uid]);
 const ownerPreview=page.preview&&page.owner;
 if(page.loading)return <main className="grid min-h-screen place-items-center bg-white text-sm text-zinc-500">Opening your FUGTH website…</main>;
 if(!page.site||page.site.visibility!=="published"&&!ownerPreview)return <main className="grid min-h-screen place-items-center bg-white p-8 text-center text-zinc-950"><div><h1 className="text-2xl font-bold">Website not published</h1><p className="mt-3 text-sm text-zinc-500">{page.error||"The business hasn't published this website."}</p><Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-black px-4 py-3 text-sm font-bold text-white">FUGTH workspace</Link></div></main>;
 return <main className="min-h-screen bg-white">
  {ownerPreview&&<header className="sticky top-0 z-[80] flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8"><div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">FUGTH · PRIVATE PREVIEW</p><p className="text-xs text-zinc-600">This is a private customer design. Only the customer or an authorized FUGTH founder may view or edit it.</p></div><div className="flex items-center gap-2"><Link href="/dashboard?open=sales&tab=sms" className="rounded-lg border border-[#b6d8ec] bg-[#e7f7ff] px-4 py-2.5 text-xs font-bold text-[#205475]">Prospect SMS & sites ↗</Link>
    <Link href="/dashboard?open=sales&tab=demos" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-bold">Sales demos</Link>
    <Link href="/dashboard" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-bold">Dashboard</Link><button type="button" onClick={()=>setEditing(value=>!value)} className="rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white">{editing?"View full site":"Edit website"}</button></div></header>}
  {editing&&ownerPreview&&editorUser?<div className="mx-auto max-w-7xl px-4 py-8"><SiteStudio user={editorUser} workspace={{businessName:page.site.name}} targetUid={uid}/></div>:
   <SiteRenderer data={page.site} preview={ownerPreview}/>}
 </main>;
}
