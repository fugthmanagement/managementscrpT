"use client";
import {useEffect,useState} from "react";
import SiteRenderer from "../../../components/site-renderer";
import {siteFields} from "../../../lib/site-presets";
// No server writes. Data exists only in the editor's browser tab memory.
export default function PreviewCanvas(){
 const [draft,setDraft]=useState(null);
 useEffect(()=>{
  const receive=event=>{
   if(event.origin!==window.location.origin||event.source!==window.parent)return;
   if(event.data?.type!=="fugth:website-preview"||!event.data?.site||typeof event.data.site!=="object")return;
   const raw=event.data.site;
   if(JSON.stringify(raw).length>16000)return;
   const fields=siteFields(raw);
   setDraft({site:{...fields,ownerId:/^[a-zA-Z0-9_-]{8,128}$/.test(raw.ownerId||"")?raw.ownerId:undefined},page:["home","services","about","contact"].includes(event.data.page)?event.data.page:"home"});
  };
  window.addEventListener("message",receive);
  window.parent?.postMessage({type:"fugth:preview-ready"},window.location.origin);
  return ()=>window.removeEventListener("message",receive);
 },[]);
 if(!draft)return <main className="grid min-h-screen place-items-center bg-[#f3faff] p-6 text-center text-sm text-[#59798b]"><div><div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-[#b9e5fb]"/><p>Your live website preview appears here.</p><p className="mt-2 text-xs">Open from FUGTH Website Maker to inspect an unsaved design.</p></div></main>;
 return <div data-builder-page={draft.page}><SiteRenderer data={draft.site} preview/></div>;
}
