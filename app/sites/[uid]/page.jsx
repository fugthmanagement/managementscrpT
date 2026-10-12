"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { doc,getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import SiteRenderer from "../../../components/site-renderer";

export default function SitePage({params}){
 const [state,setState]=useState({loading:true,site:null,error:""});
 useEffect(()=>{let active=true;const load=async()=>{try{
   if(!db||!params.uid||!/^[-_a-zA-Z0-9]{8,128}$/.test(params.uid))throw Error("This site preview is unavailable.");
   const snap=await getDoc(doc(db,"publicSites",params.uid));
   if(!active)return;
   if(!snap.exists())throw Error("This FUGTH site has not been created yet.");
   setState({loading:false,site:snap.data(),error:""});
  }catch(e){if(active)setState({loading:false,site:null,error:"This site is not available."});}};
  load();return()=>{active=false};},[params.uid]);
 if(state.loading)return <main className="grid min-h-screen place-items-center bg-[#fafafa] text-sm text-zinc-500">Loading FUGTH site...</main>;
 if(!state.site)return <main className="grid min-h-screen place-items-center bg-[#fafafa] p-6 text-center"><div><p className="text-2xl font-black">Site unavailable</p><p className="mt-3 text-sm text-zinc-500">{state.error}</p><Link href="/" className="mt-7 inline-block text-sm font-bold underline">FUGTH Management</Link></div></main>;
 return <main className="min-h-screen">
  {state.site.visibility!=="published" && <div className="flex flex-wrap items-center justify-center gap-3 bg-zinc-950 px-4 py-3 text-center text-xs font-semibold text-white"><span className="rounded bg-white px-2 py-1 font-black text-zinc-950">FUGTH SITE PREVIEW</span>Draft website · Information and services must be confirmed by the business owner.</div>}
  <SiteRenderer data={state.site}/>
 </main>;
}