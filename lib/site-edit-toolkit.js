/** FUGTH Site Maker controls only: no code, scripts, arbitrary CSS or Firestore paths. */
import {SITE_THEMES,siteFields} from "./site-presets.js";
export const SITE_TOOL_FIELDS={
 headerColor:"Header color",mainColor:"Page background",sectionColor:"Feature sections",accentColor:"Button accent",
 template:"Website layout",showServices:"Services",showAbout:"About",
 showGallery:"Gallery",showFaq:"FAQ",showProcess:"Process",
 showChatbot:"Business chatbot",headline:"Main headline",eyebrow:"Tagline",description:"Intro",
 ctaLabel:"Button label",layoutDensity:"Page spacing"
};
const HEX=/^#[a-f0-9]{6}$/i;
const named={black:"#171717",white:"#ffffff",purple:"#7c3aed",violet:"#7c3aed",blue:"#2563eb",
 "baby blue":"#b9e5fb",navy:"#142c3e",green:"#059669",emerald:"#059669",gold:"#d4a017",
 red:"#dc2626",pink:"#db2777",orange:"#ea580c",gray:"#64748b",grey:"#64748b",cream:"#fff7e8",
 beige:"#ebe0d0",teal:"#0f766e",brown:"#92400e"};
const safeText=(v,n)=>String(v??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
export function validateSiteActions(raw,site){
 const source=Array.isArray(raw)?raw:[],actions=[],seen=new Set();
 const allowedThemes=new Set(SITE_THEMES.map(x=>x.id));
 for(const candidate of source.slice(0,14)){
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))continue;
  const field=String(candidate.field||"");
  if(!Object.hasOwn(SITE_TOOL_FIELDS,field)||seen.has(field))continue;
  let value=candidate.value;
  if(["headerColor","mainColor","sectionColor","accentColor"].includes(field)){
   value=String(value||"").toLowerCase();if(!HEX.test(value))continue;
  }else if(field==="template"){
   if(!allowedThemes.has(value))continue;
  }else if(field==="layoutDensity"){
   if(!["compact","balanced","spacious"].includes(value))continue;
  }else if(field.startsWith("show")){
   if(typeof value!=="boolean")continue;
  }else if(["headline","eyebrow","description","ctaLabel"].includes(field)){
   if(typeof value!=="string"||/[\x60<>]|\b(guaranteed|fully licensed|certified|insured)\b/i.test(value))continue;
   value=safeText(value,field==="headline"?150:field==="description"?380:field==="eyebrow"?70:48);
   if(!value)continue;
  }else continue;
  if(site?.[field]===value)continue;
  seen.add(field);actions.push({field,value,label:SITE_TOOL_FIELDS[field]});
 }
 return actions.slice(0,10);
}
function colorOf(command){
 const hex=String(command).match(/#[a-f0-9]{6}\b/i)?.[0];
 if(hex)return hex.toLowerCase();
 return Object.entries(named).find(([key])=>new RegExp("\\b"+key.replace(/ /g,"\\s+")+"\\b","i").test(command))?.[1]||null;
}
export function deterministicSitePlan(request,site={}){
 const raw=String(request||"").slice(0,800).trim(),text=raw.toLowerCase(),actions=[];
 if(!raw)return [];
 const targets=[
  [/header|navigation|navbar|nav bar|top bar/i,"headerColor"],
  [/background|page|main(?: area)?/i,"mainColor"],
  [/feature|section|highlight/i,"sectionColor"],
  [/button|accent|call.to.action|cta/i,"accentColor"]
 ];
 const phrases=raw.split(/[,;\n]|\band then\b|\balso\b/i).filter(Boolean);
 for(const phrase of phrases){
  const c=colorOf(phrase);
  if(!c)continue;
  const hits=targets.filter(([rx])=>rx.test(phrase)).map(([,key])=>key);
  if(!hits.length&&/make (?:the )?site|colors?|theme|palette|use /i.test(phrase))hits.push("accentColor");
  for(const field of hits)actions.push({field,value:c});
 }
 if(/\bblack and white\b/i.test(text))actions.push({field:"headerColor",value:"#171717"},{field:"mainColor",value:"#ffffff"});
 if(/layout|template|style|look|design|theme/i.test(text)){
  const aliases=[
   [/(?:editorial|artistic|magazine)/,"studio-pro"],
   [/(?:premium|elegant|luxur|signature)/,"signature"],
   [/(?:modern classic|classic)/,"modern-classic"],
   [/(?:appointment|booking focused)/,"appointment"],
   [/(?:storefront|shop style|restaurant)/,"storefront"],
   [/(?:project showcase|portfolio)/,"project-showcase"],
   [/(?:bold|strong|industrial)/,"field-pro"],
   [/(?:calm|soft|healthcare)/,"care-pro"],
   [/(?:minimal|simple)/,"service-pro"]
  ];
  const chosen=aliases.find(([rx])=>rx.test(text))?.[1];
  if(chosen&&SITE_THEMES.some(t=>t.id===chosen))actions.push({field:"template",value:chosen});
 }
 for(const [word,key] of [
  ["faq","showFaq"],["services","showServices"],["gallery","showGallery"],
  ["photos","showGallery"],["about","showAbout"],["process","showProcess"],["chatbot","showChatbot"]
 ]){
  const rx=new RegExp("(?:hide|remove|turn off|disable|show|enable|add)\\s+(?:the\\s+|my\\s+)?"+word,"i");
  if(rx.test(text))actions.push({field:key,value:!/hide|remove|turn off|disable/i.test(text.match(rx)?.[0]||"")});
 }
 const heading=raw.match(/(?:headline|main heading|title)\s+(?:to|should (?:be|say)|says?|:)\s*["“']([^"”']{3,150})["”']/i);
 if(heading)actions.push({field:"headline",value:heading[1]});
 const cta=raw.match(/(?:button (?:text|label)|cta)\s+(?:to|should say|:)\s*["“']([^"”']{3,48})["”']/i);
 if(cta)actions.push({field:"ctaLabel",value:cta[1]});
 const spacing=/(?:more space|spacious|roomy|airy)/.test(text)?"spacious":/(?:compact|tighter|less space)/.test(text)?"compact":null;
 if(spacing)actions.push({field:"layoutDensity",value:spacing});
 return validateSiteActions(actions,site);
}
export function applySiteActions(site,actions){
 const safe=validateSiteActions(actions,site);
 const changes=Object.fromEntries(safe.map(a=>[a.field,a.value]));
 if(changes.template){
  const theme=SITE_THEMES.find(x=>x.id===changes.template);
  if(theme)Object.assign(changes,{...theme.palette,...changes});
 }
 return {...siteFields({...site,...changes}),ownerId:site.ownerId,previewMode:true};
}
export function toolCatalog(){
 return Object.entries(SITE_TOOL_FIELDS).map(([field,label])=>({field,label,
  type:field.endsWith("Color")?"hex":field.startsWith("show")?"boolean":
   field==="template"?"existing_template":field==="layoutDensity"?"enum":"text"}));
}
