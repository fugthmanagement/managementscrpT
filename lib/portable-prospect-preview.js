"use client";
/**
 * Standalone public site concept. The URL fragment contains the public
 * marketing fields only. No customer records or Firestore credentials.
 *
 * Immutable, public, unrevokeable snapshot: new edits require a NEW link.
 * Compress against industry defaults to avoid paying for unnecessarily
 * long multi-segment SMS messages. Server-backed short URLs are preferable.
 */
import {siteFields,buildStarterSite} from "./site-presets";
const ORIGIN="https://www.fugthmanagement.space";
const SAFE_PROPS=[
 "name","industry","template","theme","headerColor","mainColor","sectionColor",
 "accentColor","layoutDensity","announcement","aboutTitle","aboutDetail","galleryTitle",
 "servicesTitle","processTitle","faqTitle","contactTitle","eyebrow","headline",
 "description","services","trustPoints","process","faqItems","phone","contactEmail",
 "serviceArea","businessHours","ctaLabel","showHero","showAbout","showContact",
 "showChatbot","aiAgentMode","aiAgentModel","showServices","showProcess","showFaq",
 "sectionOrder","showGallery","heroImageId","galleryImageIds","chatbotGreeting",
 "legalPrivacyCustom","legalTermsCustom","legalDataCustom","legalContactEmail"
];
function sanitize(site){
 const normalized=siteFields(site||{}),out={};
 for(const key of SAFE_PROPS)if(normalized[key]!==undefined)out[key]=normalized[key];
 out.legalApproved=false;
 out.customerPortal="off";
 if(/^fugth-upload-/.test(out.heroImageId||""))out.heroImageId="";
 out.galleryImageIds=(out.galleryImageIds||[]).filter(x=>!/^fugth-upload-/.test(x));
 return out;
}
const bytesToBase64=bytes=>{
 let t="";for(let i=0;i<bytes.length;i+=8192)t+=String.fromCharCode(...bytes.slice(i,i+8192));
 return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const base64ToBytes=str=>{
 const b64=String(str||"").replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(b64+"=".repeat((4-b64.length%4)%4));
 return Uint8Array.from(raw,x=>x.charCodeAt(0));
};
function fromCompact(data){
 if(data?.version===1&&data.site?.name)return sanitize(data.site);
 if(data?.version!==2||typeof data?.n!=="string"||typeof data?.i!=="string"||
   typeof data?.d!=="object"||!data.d||Array.isArray(data.d))
  throw Error("Invalid website preview snapshot.");
 const p=data.p||{};
 const name=data.n,industry=data.i;
 const base=siteFields(buildStarterSite("portable",name,industry,{
  phone:p.phone||"",contactEmail:p.contactEmail||"",
  serviceArea:p.serviceArea||"",businessHours:p.businessHours||""
 }));
 const result=sanitize({...base,...data.d,name,industry,
  phone:p.phone||"",contactEmail:p.contactEmail||"",
  serviceArea:p.serviceArea||"",businessHours:p.businessHours||""});
 if(!result.name)throw Error("Website snapshot is missing its business name.");
 return result;
}
export async function createPortablePreviewUrl(site){
 const current=sanitize(site);
 const p={phone:current.phone||"",contactEmail:current.contactEmail||"",
  serviceArea:current.serviceArea||"",businessHours:current.businessHours||""};
 const base=sanitize(buildStarterSite("portable",current.name,current.industry,p));
 const d={};
 for(const key of SAFE_PROPS){
  if(["name","industry","phone","contactEmail","serviceArea","businessHours"].includes(key))continue;
  if(JSON.stringify(current[key])!==JSON.stringify(base[key]))d[key]=current[key];
 }
 const payload=JSON.stringify({version:2,n:current.name,i:current.industry,p,d});
 if(payload.length>16000)throw Error("Website preview content is too long for a shareable link.");
 let bytes=new TextEncoder().encode(payload),mode="j";
 if(typeof CompressionStream!=="undefined"){
  const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const packed=new Uint8Array(await new Response(stream).arrayBuffer());
  if(packed.length<bytes.length){bytes=packed;mode="g";}
 }
 const url=ORIGIN+"/demo/portable#p="+mode+"."+bytesToBase64(bytes);
 if(url.length>6600)throw Error("Preview URL is too long to share. Shorten the site description or use the normal server-backed demo after Firebase is repaired.");
 return url;
}
export async function readPortablePreview(hash){
 const match=/^#?p=([gj])\.([A-Za-z0-9_-]+)$/.exec(String(hash||""));
 if(!match||match[2].length>9000)throw Error("Invalid public website link.");
 let bytes=base64ToBytes(match[2]);
 if(match[1]==="g"){
  if(typeof DecompressionStream==="undefined")throw Error("Please open this link in a newer web browser.");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 }
 if(bytes.length>22000)throw Error("Website snapshot is too large.");
 return fromCompact(JSON.parse(new TextDecoder().decode(bytes)));
}
export function isPortablePreviewUrl(url){
 try{const u=new URL(String(url||""));
  return u.origin===ORIGIN&&u.pathname==="/demo/portable"&&
   /^#p=[gj]\.[A-Za-z0-9_-]+$/.test(u.hash);
 }catch{return false}
}
