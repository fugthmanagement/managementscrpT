"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {auth} from "../lib/firebase";
const clean=x=>String(x||"");
function ReviewCards({site,result}){
 const style=site.googleReviewsStyle||"cards";
 const theme=style==="spotlight"?"bg-[#172e42] text-white":style==="compact"?"bg-[#f0f7fb] text-[#21465e]":"bg-white text-[#1e4157]";
 const cards=style==="compact"?result.reviews.slice(0,1):style==="spotlight"?result.reviews.slice(0,2):result.reviews.slice(0,3);
 return <section aria-label="Reviews sourced from Google Maps" className={"border-y border-[#dae6ec] px-5 py-14 sm:px-8 sm:py-20 "+theme} data-site-review-dock={site.googleReviewsDock||"after_services"}>
  <div className="mx-auto max-w-7xl">
   <div className="flex flex-wrap items-end justify-between gap-5">
    <div><p className="text-xs font-black uppercase tracking-[.18em] opacity-70">CUSTOMER FEEDBACK · GOOGLE MAPS</p>
     <h2 className="mt-3 text-3xl font-black sm:text-4xl">What customers are saying</h2>
     <p className="mt-3 text-sm opacity-80">
      <strong>★ {result.rating||"—"}</strong> · {result.reviewCount||0} Google Maps ratings for {result.businessName||site.name}
     </p></div>
    {result.mapsUrl&&<a href={result.mapsUrl} target="_blank" rel="noopener noreferrer"
     className={"rounded-full border px-5 py-3 text-xs font-bold "+(style==="spotlight"?"border-white/30 text-white":"border-[#b3cedb]")}>Read reviews on Google Maps ↗</a>}
   </div>
   {cards.length>0&&<div className={"mt-8 grid gap-4 "+(style==="cards"?"md:grid-cols-3":style==="spotlight"?"md:grid-cols-2":"max-w-2xl")}>
    {cards.map((v,i)=><article key={i} className={"rounded-2xl border p-5 "+(style==="spotlight"?"border-white/20 bg-white/10":"border-[#d7e6ee] bg-[#f8fbfd]")}>
     <p className="text-base text-[#edab3e]" aria-label={v.rating+" out of 5 stars"}>{"★".repeat(Math.min(5,v.rating))}</p>
     <p className="mt-3 text-sm leading-7">{v.text}</p>
     <div className="mt-5 flex items-center gap-3">
      {v.photoUrl&&<img src={v.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer"/>}
      <div className="min-w-0 flex-1">
       {v.authorUrl?<a href={v.authorUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline">{v.name}</a>:
        <p className="text-xs font-bold">{v.name}</p>}
       <p className="mt-1 text-[11px] opacity-65">{v.date||"Google Maps review"}</p>
      </div>
      {v.url&&<a href={v.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold underline">Source ↗</a>}
     </div>
    </article>)}
   </div>}
   <p className="mt-6 text-[11px] leading-5 opacity-75">
    <a href={result.mapsUrl||"https://www.google.com/maps"} target="_blank" rel="noopener noreferrer" className="font-black underline">Google Maps</a>
    {" · Reviews shown by Google Places relevance. Google checks for fake reviews but does not verify each review. This FUGTH preview does not imply that the business approved this website."}
   </p>
  </div>
 </section>;
}
export default function SiteReviewsDock({site,rootRef,preview=false,demoId=""}){
 const [container,setContainer]=useState(null),[result,setResult]=useState(null);
 useEffect(()=>{
  if(!site.showGoogleReviews||!site.googlePlaceId||!rootRef?.current){setContainer(null);return}
  const root=rootRef.current;
  const portal=document.createElement("div");
  portal.dataset.fugthGoogleReviews="true";
  const dock=site.googleReviewsDock||"after_services";
  const hero=root.querySelector("main > section");
  const services=root.querySelector("#services");
  const contact=root.querySelector("#contact");
  const footer=root.querySelector("footer");
  const before=dock==="before_contact"?contact:dock==="footer"?footer:null;
  const after=dock==="hero"?hero:dock==="after_services"?services:null;
  if(before?.parentNode)before.parentNode.insertBefore(portal,before);
  else if(after?.parentNode)after.parentNode.insertBefore(portal,after.nextSibling);
  else root.appendChild(portal);
  setContainer(portal);
  return()=>{portal.remove();setContainer(null)};
 },[rootRef,site.template,site.googleReviewsDock,site.showGoogleReviews,site.googlePlaceId]);
 useEffect(()=>{
  if(!site.showGoogleReviews||!site.googlePlaceId)return;
  const id=/^[a-f0-9]{24}$/.test(demoId)?demoId:String(site.ownerId||"");
  const type=demoId?"demo":preview?"draft":"published";
  if(!id)return;
  let cancelled=false;
  (async()=>{
   try{
    let token=null;
    if(type==="draft")token=await auth.currentUser?.getIdToken();
    const res=await fetch("/api/site-reviews?type="+type+"&id="+encodeURIComponent(id),{
     cache:"no-store",headers:token?{Authorization:"Bearer "+token}:{}});
    if(!res.ok)throw Error("Live review service not available.");
    const data=await res.json();
    if(!cancelled)setResult(data.enabled?data:null);
   }catch{if(!cancelled)setResult(null)}
  })();
  return()=>{cancelled=true};
 },[site.ownerId,site.googlePlaceId,site.showGoogleReviews,preview,demoId]);
 if(!container||!result?.enabled)return null;
 return createPortal(<ReviewCards site={site} result={result}/>,container);
}
