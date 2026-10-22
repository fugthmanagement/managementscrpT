"use client";
import {useEffect,useState} from "react";
import SiteRenderer from "../../../components/site-renderer";
import {readPortablePreview} from "../../../lib/portable-prospect-preview";
export default function PortableProspectPreview(){
 const [state,setState]=useState({loading:true});
 useEffect(()=>{
  let alive=true;
  readPortablePreview(window.location.hash)
   .then(site=>{if(alive)setState({loading:false,site})})
   .catch(e=>{if(alive)setState({loading:false,error:e.message})});
  return()=>{alive=false};
 },[]);
 if(state.loading)return <main className="grid min-h-screen place-items-center p-8">Opening your sample website…</main>;
 if(state.error)return <main className="grid min-h-screen place-items-center p-8 text-center"><div>
  <h1 className="text-2xl font-black">Preview link unavailable</h1><p className="mt-4">{state.error}</p>
  <a className="mt-5 inline-block underline" href="/">Return to FUGTH</a></div></main>;
 return <div>
  <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-center text-xs leading-6 text-amber-950">
   <strong>Independent FUGTH concept — not approved by this business.</strong>
   {" "}This is a shareable snapshot, not a live published business website. Contact details, services and photographs may be illustrative.
   <span className="block">Website owners can request a review or <a className="font-bold underline" href="/book">book a FUGTH consultation</a> without creating an account.</span>
  </div>
  <SiteRenderer data={state.site} preview={true}/>
  <footer className="border-t bg-amber-50 px-5 py-5 text-center text-xs text-amber-900">
   Snapshot preview: edits produce a new link. This concept is not owner-verified and does not receive private customer information.
  </footer>
 </div>;
}
