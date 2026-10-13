"use client";
import { useEffect,useState } from "react";
import { getSiteImage,getIndustryPhotos } from "../lib/site-images";
export default function SitePhoto({imageId,industry="general",slot="hero",className="",style,priority=false}) {
  const preferred=getSiteImage(imageId,industry);
  const fallbacks=[preferred,...getIndustryPhotos(industry).filter(photo=>photo.id!==preferred.id)];
  const [step,setStep]=useState(0);
  useEffect(()=>setStep(0),[preferred.id]);
  const photo=fallbacks[step]||null;
  return <figure className={`relative overflow-hidden bg-[#dedfd9] ${className}`} style={style} data-fugth-media-slot={slot}>
    {photo?<img
      id={`fugth-photo-${slot}-${photo.id}`}
      src={photo.src} alt={photo.alt} data-photo-id={photo.id}
      data-photo-tags={photo.tags.join(",")}
      className="h-full w-full object-cover"
      loading={priority?"eager":"lazy"}
      decoding="async"
      fetchPriority={priority?"high":"auto"}
      onError={()=>setStep(next=>next+1)}
    />:<div className="flex h-full min-h-[180px] w-full items-center justify-center bg-[#e7e6e0] px-4 text-center text-sm text-[#777a73]">Industry image temporarily unavailable</div>}
    <figcaption className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2.5 py-1.5 text-[10px] font-medium text-white backdrop-blur-sm">Illustrative photo</figcaption>
  </figure>;
}
