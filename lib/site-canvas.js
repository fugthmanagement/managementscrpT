/** Data-only, code-free website canvas. All public content is bounded on save. */
export const CANVAS_BLOCK_TYPES=["hero","benefits","services","gallery","process","about","faq","reviews","contact","callout"];
export const CANVAS_STYLES=["split","immersive","editorial"];
const text=(v,n=150)=>String(v??"").replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const b=(id,type,title,body="",items=[],style="split")=>({id,type,title,body,items,style,enabled:true});
const recipes={
 electrician:{id:"electrician",badge:"ELECTRICAL CONTRACTING",hero:"Power the next project.",sub:"Wiring, panels and electrical projects—talk to a local team about the next step.",accent:"#ecad43",
  services:["Electrical panel upgrades","EV charger installation","Residential rewiring","Lighting & circuits","Electrical troubleshooting","Generator connections"],
  process:["Describe the electrical project","Discuss the scope and safety needs","Arrange a site visit","Confirm the next step"],
  benefits:["Residential & commercial inquiries","Project-focused planning","Clear service communication"],style:"split"},
 plumber:{id:"plumber",badge:"PLUMBING & SERVICE",hero:"Plumbing help starts here.",sub:"Leaks, water heaters, pipes and fixtures. Tell the team what needs attention.",accent:"#65a9d5",
  services:["Leak diagnosis","Drain & sewer service","Water heater service","Pipe repairs","Fixture installation","Commercial plumbing"],
  process:["Tell us what needs attention","Share property details","Plan the service visit","Review the next step"],
  benefits:["Repair & installation inquiries","Clear request details","Straightforward follow-up"],style:"immersive"},
 roofing:{badge:"ROOFING & EXTERIOR",hero:"Every roof tells a story.",sub:"From repairs to replacement, start your project with a clear conversation.",accent:"#d58b55",style:"immersive"},
 hvac:{badge:"HEATING & COOLING",hero:"Comfort starts with a plan.",sub:"Repair, maintenance and installation inquiries in one easy place.",accent:"#71b2c9",style:"split"},
 automotive:{badge:"AUTO REPAIR & DIAGNOSTICS",hero:"Get back to what moves you.",sub:"Diagnosis, maintenance and repair planning for your next mile.",accent:"#f09c5d",style:"split"},
 cleaning:{badge:"CLEANING SERVICES",hero:"A fresh space is closer than you think.",sub:"Residential and business cleaning options, with a simple next step.",accent:"#78bfc3",style:"editorial"},
 landscaping:{badge:"OUTDOOR SPACES",hero:"Make more of the outdoors.",sub:"Lawn care, outdoor work and property projects worth planning.",accent:"#7caf7b",style:"immersive"},
 dental:{badge:"DENTAL PRACTICE",hero:"A better visit begins with clarity.",sub:"Meet the practice and find a comfortable next step.",accent:"#8ec5d8",style:"editorial"},
 clinic:{badge:"HEALTHCARE PRACTICE",hero:"Care begins with listening.",sub:"Understand the services and find the right first conversation.",accent:"#8ac4af",style:"editorial"},
 legal:{badge:"LEGAL SERVICES",hero:"A clear starting point for important decisions.",sub:"Learn about the practice and request a consultation.",accent:"#c0a98a",style:"editorial"},
 salon:{badge:"BEAUTY & WELLNESS",hero:"Make time for something beautiful.",sub:"A fresh look at the services, the people and the space.",accent:"#d49eb3",style:"editorial"},
 restaurant:{badge:"FOOD & HOSPITALITY",hero:"Come for the food. Stay for the moment.",sub:"Discover the menu, the location and how to plan your visit.",accent:"#d6a368",style:"immersive"},
 realestate:{badge:"REAL ESTATE",hero:"Your next place starts with a conversation.",sub:"Explore buyer, seller and property guidance.",accent:"#b5a183",style:"immersive"},
 wedding:{badge:"BRIDAL & BOUTIQUE",hero:"A moment worth celebrating.",sub:"Explore the collection, fittings and private appointments.",accent:"#c1a899",style:"editorial"},
 petgrooming:{badge:"PET GROOMING",hero:"A fresh experience for your best friend.",sub:"Explore grooming services and arrange a visit.",accent:"#9dbb95",style:"editorial"}
};
export function canvasIndustryRecipe(industry){
 return recipes[industry]||{badge:"LOCAL BUSINESS",hero:"Your next step starts here.",sub:"Learn what the team offers and get in touch.",accent:"#92cae8",style:"split"};
}
export function newCanvasBlock(type,id,industry="general"){
 const r=canvasIndustryRecipe(industry),kind=CANVAS_BLOCK_TYPES.includes(type)?type:"benefits";
 const defaults={
  hero:["hero",r.hero,r.sub,[],r.style],
  benefits:["benefits","What makes the approach work","Useful information about the team and how to get started.",r.benefits||["Clear next steps","Services tailored to the request","Easy ways to get in touch"],"editorial"],
  services:["services","What we can help you with","Choose a service and ask for more information.",r.services||["Project estimates","Service requests","Customer consultations"],"split"],
  gallery:["gallery","A closer look at the work","Photos are illustrative until the business supplies licensed or approved images.",[],"immersive"],
  process:["process","From first conversation to next steps","A clear process makes it easier to begin.",r.process||["Get in touch","Describe your request","Discuss the options","Arrange the next step"],"split"],
  about:["about","Get to know the team","Tell customers about the business, its approach and its people.",[],"editorial"],
  faq:["faq","Good questions, clear answers","Contact the business for specifics about availability and pricing.",[],"editorial"],
  contact:["contact","Ready to talk?","Contact the business to discuss your project or appointment.",[],"split"],
  reviews:["reviews","What customers are saying","Only approved testimonials or a verified external reviews link are displayed.",[],"editorial"],
  callout:["callout","Let's make the next step simple.","Questions about a service? Start with a conversation.",[],"immersive"]
 };
 const [k,title,body,items,style]=defaults[kind];
 return b(id||kind,k,title,body,items,style);
}
export function industryCanvasBlocks(industry){
 const kinds=industry==="restaurant"?["hero","benefits","gallery","services","about","contact"]:
  ["salon","wedding","realestate"].includes(industry)?["hero","gallery","services","about","benefits","contact"]:
  ["electrician","plumber","roofing","hvac","automotive"].includes(industry)?["hero","benefits","services","process","gallery","faq","contact"]:
  ["hero","services","benefits","about","process","contact"];
 return kinds.map((kind,i)=>newCanvasBlock(kind,kind+"-"+(i+1),industry));
}
export function sanitizeCanvasBlocks(raw,industry="general"){
 if(!Array.isArray(raw))return industryCanvasBlocks(industry);
 const seen=new Set(),out=[];
 for(const obj of raw.slice(0,12)){
  if(!obj||!CANVAS_BLOCK_TYPES.includes(obj.type))continue;
  const id=text(obj.id,48);
  if(!/^[a-z][a-z0-9-]{1,47}$/.test(id)||seen.has(id))continue;
  seen.add(id);
  out.push({id,type:obj.type,title:text(obj.title,110),body:text(obj.body,500),
   style:CANVAS_STYLES.includes(obj.style)?obj.style:"split",
   variant:typeof obj.variant==="string"&&/^[a-z][a-z0-9-]{1,50}$/.test(obj.variant)&&obj.variant.startsWith(obj.type+"-")?obj.variant:"",
   items:(Array.isArray(obj.items)?obj.items:[]).slice(0,6).map(x=>text(x,90)).filter(Boolean),
   enabled:obj.enabled!==false});
 }
 return out.length?out:industryCanvasBlocks(industry);
}
export function newCanvasSite(site,industry=site.industry,{blank=false}={}){
 const r=canvasIndustryRecipe(industry);
 return {...site,industry,template:"custom-canvas",theme:"custom-canvas",
  eyebrow:r.badge,headline:r.hero,description:r.sub,
  accentColor:r.accent,canvasBlocks:blank?[
    newCanvasBlock("hero","hero-1",industry),newCanvasBlock("contact","contact-1",industry)
  ]:industryCanvasBlocks(industry)};
}
