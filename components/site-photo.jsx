"use client";
import {useEffect,useState} from "react";
import {getSiteImage,getIndustryPhotos} from "../lib/site-images";
import {auth} from "../lib/firebase";
export default function SitePhoto({imageId,ownerUid,industry="general",slot="hero",className="",style,priority=false,sourcePhotoUrl="",sourcePhotoCredit=""}){
 const custom=/^fugth-upload-[a-f0-9]{32}$/.test(String(imageId||""))&&/^[A-Za-z0-9_-]{8,128}$/.test(String(ownerUid||""));
 const preferred=getSiteImage(custom?null:imageId,industry);
 const fallback=[preferred,...getIndustryPhotos(industry).filter(x=>x.id!==preferred.id)];
 const [step,setStep]=useState(0),[privatePhoto,setPrivatePhoto]=useState("");
 const [sourceFailed,setSourceFailed]=useState(false);
 useEffect(()=>setSourceFailed(false),[sourcePhotoUrl]);
 useEffect(()=>setStep(0),[imageId,industry]);
 useEffect(()=>{
  if(!custom){setPrivatePhoto("");return;}
  let active=true,objectUrl="";
  (async()=>{
   try{
    const token=await auth?.currentUser?.getIdToken().catch(()=>null);
    const response=await fetch("/api/sites/images/"+encodeURIComponent(ownerUid)+"/"+encodeURIComponent(imageId),{
     headers:token?{Authorization:"Bearer "+token}:{},cache:"no-store"
    });
    if(!response.ok)throw Error("Photo unavailable");
    objectUrl=URL.createObjectURL(await response.blob());
    if(active)setPrivatePhoto(objectUrl);else URL.revokeObjectURL(objectUrl);
   }catch{if(active)setPrivatePhoto("");}
  })();
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[custom,imageId,ownerUid]);
 const photo=fallback[step]||null,showCustom=custom&&Boolean(privatePhoto);
 const showSource=Boolean(sourcePhotoUrl)&&/^https:\/\//i.test(sourcePhotoUrl)&&!sourceFailed&&!showCustom;
 return <figure className={`relative overflow-hidden bg-zinc-200 ${className}`} style={style} data-fugth-media-slot={slot}>
  {showSource?<img src={sourcePhotoUrl} alt="Photo from the business website, used with permission" referrerPolicy="no-referrer" onError={()=>setSourceFailed(true)} className="h-full w-full object-cover" loading={priority?"eager":"lazy"}/>:
   showCustom?<img src={privatePhoto} alt="Business uploaded photo" className="h-full w-full object-cover" loading={priority?"eager":"lazy"} decoding="async"/>:
   photo?<img id={`fugth-photo-${slot}-${photo.id}`} src={photo.src} alt={photo.alt} data-photo-id={photo.id}
    data-photo-tags={photo.tags.join(",")} className="h-full w-full object-cover"
    loading={priority?"eager":"lazy"} decoding="async" fetchPriority={priority?"high":"auto"}
    onError={()=>setStep(next=>next+1)}/>:
    <div className="flex h-full min-h-[180px] w-full items-center justify-center bg-zinc-200 p-4 text-sm text-zinc-600">Image temporarily unavailable</div>}
  <figcaption className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-sm">{showSource?"Business photo · "+(sourcePhotoCredit||"original source"):showCustom?"Business photo":"Illustrative photo"}</figcaption>
 </figure>;
}
