"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import {onAuthStateChanged} from "firebase/auth";
import {doc,getDoc} from "firebase/firestore";
import {auth,db} from "../../../lib/firebase";
import SiteStudio from "../../../components/site-studio";
import SiteRenderer from "../../../components/site-renderer";

export default function SitePage({params}) {
 const uid=params.uid;
 const [state,setState]=useState({loading:true,site:null,error:""});
 const [editorUser,setEditorUser]=useState(null);
 const [canEdit,setCanEdit]=useState(false);
 const [editing,setEditing]=useState(false);
 async function refreshSite(){
   try{
    if(!db||!uid||!/^[-_a-zA-Z0-9]{8,128}$/.test(uid))throw Error("Site not available");
    const snap=await getDoc(doc(db,"publicSites",uid));
    if(!snap.exists())throw Error("Site has not been published or previewed yet");
    setState({loading:false,site:snap.data(),error:""});
   }catch{setState({loading:false,site:null,error:"This FUGTH site is not available."});}
 }
 useEffect(()=>{refreshSite()},[uid]);
 useEffect(()=>{
  if(!auth)return;
  let active=true;
  const off=onAuthStateChanged(auth,async user=>{
   if(!active)return;
   setEditorUser(user||null);setCanEdit(false);
   if(!user)return;
   try{
    const token=await user.getIdToken();
    const result=await fetch("/api/sites/"+encodeURIComponent(uid),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
    if(active){setCanEdit(result.ok);if(result.ok && new URLSearchParams(window.location.search).get("edit")==="1")setEditing(true);}
   }catch{if(active)setCanEdit(false);}
  });
  return()=>{active=false;off();};
 },[uid]);
 const toggleEdit=()=>{setEditing(value=>!value);if(editing)refreshSite();};
 if(state.loading&&!canEdit)return <main className="grid min-h-screen place-items-center bg-[#fafafa] text-sm text-zinc-500">Opening business website...</main>;
 if(!state.site&&!canEdit)return <main className="grid min-h-screen place-items-center bg-[#fafafa] p-6 text-center"><div><p className="text-2xl font-black">Site unavailable</p><p className="mt-3 text-sm text-zinc-500">{state.error}</p><Link href="/" className="mt-7 inline-block text-sm font-bold underline">FUGTH Management</Link></div></main>;
 return <main className="min-h-screen bg-[#fafaf8]">
  {canEdit&&<div className="sticky top-0 z-[80] flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8"><div><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">FUGTH WEBSITE STUDIO</p><p className="mt-1 text-xs text-zinc-600">{editing?"Editing your saved design":"Your shared website preview"}</p></div><div className="flex gap-2"><Link href="/dashboard" className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-900">Workspace</Link><button type="button" onClick={toggleEdit} className="rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-black text-white">{editing?"Close editor":"Edit this page ✎"}</button></div></div>}
  {editing&&canEdit&&editorUser?<div className="mx-auto max-w-[1720px] px-4 py-8"><SiteStudio user={editorUser} workspace={{businessName:state.site?.name||"Business"}} targetUid={uid} compact/></div>:<>
    {state.site?.visibility!=="published"&&<div className="flex flex-wrap items-center justify-center gap-3 bg-zinc-950 px-4 py-3 text-center text-xs font-semibold text-white"><span className="rounded bg-white px-2 py-1 font-black text-zinc-950">FUGTH SITE PREVIEW</span>Review business details before publication.</div>}
    {state.site?<SiteRenderer data={state.site}/>:<div className="p-10 text-center text-sm text-zinc-600">This site is ready for its first saved design.</div>}
  </>}
 </main>;
}