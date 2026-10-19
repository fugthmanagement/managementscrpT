import {SITE_INDUSTRIES,detectIndustry,getIndustry,cleanText} from "./site-presets";

/**
 * Use owner-supplied facts to personalize the starter website. We deliberately
 * do not invent certifications, testimonials, prices or services.
 * Full description stays in users/{uid} and is NOT copied into the public site.
 */
export const BUSINESS_DESCRIPTION_MAX=4000;
export const INDUSTRY_IDS=new Set(SITE_INDUSTRIES.map(x=>x.id));
export const cleanBusinessDescription=value=>String(value||"")
  .replace(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/g," ")
  .replace(/\r\n?/g,"\n").trim().slice(0,BUSINESS_DESCRIPTION_MAX);
export function businessIndustry(profile={}){
 const chosen=String(profile.businessType||"").trim().toLowerCase();
 if(chosen&&chosen!=="other"&&chosen!=="general"&&INDUSTRY_IDS.has(chosen))return chosen;
 return detectIndustry([profile.businessTypeOther,profile.businessDescription,profile.businessName].filter(Boolean).join(" "))||"general";
}
function serviceLines(description){
 const lines=String(description||"").split(/[\n;]+/)
  .map(x=>x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,"").trim())
  .filter(x=>x.length>=4&&x.length<=85&&!/^(about|we are|our company|mission|hours|location|serving)\b/i.test(x));
 const labelled=lines.filter(x=>/^(?:services?|we (?:do|offer)|specialt(?:y|ies))\s*:/i.test(x));
 let raw=labelled.length?labelled.map(x=>x.replace(/^[^:]+:/,"").trim()):lines.filter(x=>/^(?:installation|repair|maintenance|inspection|consultation|service|cleaning|landscap|roof|plumb|electrical|hvac|remodel|painting|detailing|grooming|hair|tire|brake|diagnostic)\b/i.test(x));
 let result=raw.flatMap(x=>x.split(/\s*,\s*/)).map(x=>cleanText(x,75)).filter(x=>x.length>=4&&x.length<=75);
 return [...new Set(result)].slice(0,6);
}
export function siteFactsFromProfile(profile={}){
 const industry=businessIndustry(profile);
 const description=cleanBusinessDescription(profile.businessDescription);
 const customLabel=cleanText(profile.businessTypeOther,90);
 const summary=description.split(/\n+/).map(x=>x.trim()).filter(Boolean).join(" ");
 const safeSummary=cleanText(summary,380);
 const services=serviceLines(description);
 return {industry,customLabel,description,
  lead:safeSummary&&safeSummary.length>=25?safeSummary:"",
  about:safeSummary?cleanText(summary,700):"",
  services:services.length?services:getIndustry(industry).services};
}
