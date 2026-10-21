"use client";
import {useCallback,useEffect,useState} from "react";
const validPreview=value=>{
 try{
  const url=new URL(String(value||""));
  const match=url.pathname.match(/^\/demo\/site\/([a-f0-9]{24})\/?$/i);
  if(url.protocol!=="https:"||!["www.fugthmanagement.space","fugthmanagement.space"].includes(url.hostname)||!match)return null;
  return match[1];
 }catch{return null}
};
export default function ProspectPreviewHealth({url,compact=false}){
 const [status,setStatus]=useState("idle"),[error,setError]=useState("");
 const id=validPreview(url);
 const check=useCallback(async()=>{
  if(!id){setStatus("not_demo");setError("This isn't a FUGTH saved-demo link; open the link manually to verify.");return}
  setStatus("checking");setError("");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch("/api/demo/"+id,{cache:"no-store",signal:controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.site?.name)throw Error(data.error||"Public demo API didn't return a website.");
   setStatus("ready");
  }catch(e){setStatus("error");setError(e.message||"Could not check the recipient's website.")}
  finally{clearTimeout(timer)}
 },[id]);
 useEffect(()=>{if(id)check();else{setStatus("not_demo");setError("")}},[id,check]);
 if(!url)return <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No preview assigned yet. Open this prospect in Site Maker to build one.</p>;
 return <div className={"mt-3 rounded-xl border p-3 text-xs "+(status==="ready"?"border-emerald-200 bg-emerald-50 text-emerald-900":status==="error"?"border-rose-200 bg-rose-50 text-rose-900":"border-[#d2e5ef] bg-[#f3faff] text-[#37647d]")}>
  <div className="flex flex-wrap items-center justify-between gap-2">
   <strong>{status==="ready"?"✓ Customer preview API is live":
    status==="error"?"Preview link needs repair before outreach":
    status==="checking"?"Checking customer-visible preview…":"Website link not verified"}</strong>
   <button type="button" className="rounded-lg border bg-white px-3 py-2 font-bold" disabled={status==="checking"} onClick={check}>Check link</button>
  </div>
  {status==="error"&&<p className="mt-2 leading-5">{error} — do not promote this link until it opens correctly.</p>}
  {!compact&&<p className="mt-2 break-all font-mono text-[11px]">{url}</p>}
 </div>;
}
