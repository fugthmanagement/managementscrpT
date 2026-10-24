/**
 * FUGTH deterministic website composer. No LLM, network, content scraping or
 * external API. 100+ valid visual combinations from curated, compatible variants.
 * Business facts, uploads and approved reviews remain unchanged on randomize.
 */
import {industryCanvasBlocks,newCanvasBlock} from "./site-canvas.js";
export const PROCEDURAL_VERSION=1;
const FAMILY={
 hero:["hero-split-a","hero-split-b","hero-full-bleed","hero-centered","hero-technical","hero-editorial"],
 services:["services-grid","services-numbered","services-featured","services-stripes","services-compact"],
 benefits:["proof-tiles","proof-horizontal","proof-stats","proof-icon-grid"],
 gallery:["gallery-mosaic","gallery-filmstrip","gallery-asymmetric","gallery-collage"],
 process:["steps-cards","steps-timeline","steps-linear","steps-split"],
 about:["story-split","story-centered","story-feature"],
 contact:["contact-band","contact-card","contact-split"],
 faq:["faq-accordion","faq-columns","faq-list"],
 reviews:["reviews-cards","reviews-quote","reviews-compact","reviews-slider"],
 callout:["offer-banner","offer-card","offer-marquee"]
};
export const PROCEDURAL_VARIANTS=Object.freeze(FAMILY);
export const variantCount=Object.values(FAMILY).reduce((sum,a)=>sum+a.length,0);
export const layoutCombinationCount=FAMILY.hero.length*FAMILY.services.length*FAMILY.gallery.length*FAMILY.process.length*FAMILY.reviews.length;
const SAFE=/^[a-z][a-z0-9-]{1,50}$/;
const PALETTES={
 electrician:[["Midnight voltage","#0d2233","#e8ae45","#f2f7fa","#e6eff5"],["Copper & graphite","#1c2936","#c59265","#f7f5f1","#eae4dc"],["Electric cobalt","#132949","#70baff","#f4f8fb","#e7f0fa"]],
 plumber:[["Deep ocean","#0d3047","#74c5d9","#f5fbfd","#e7f3f7"],["Teal & stone","#124248","#9cc8ae","#f4f8f5","#e4efea"]],
 roofing:[["Charcoal & brick","#252a2d","#d88961","#f8f5f2","#eee8e3"]],
 automotive:[["Graphite & ember","#1d252d","#ee995c","#f7f8f8","#e7ecee"]],
 salon:[["Rose & ink","#32262c","#d7a6b9","#faf7f7","#f2e6eb"]],
 restaurant:[["Espresso & cream","#3d2b20","#d6a26a","#fcf9f4","#eee3d5"]],
 dental:[["Ocean & cloud","#1c4655","#98d5e6","#fafcfc","#e4f2f5"]],
 clinic:[["Sage & navy","#23464c","#a7cdbb","#f6fbf8","#e4f1eb"]],
 legal:[["Navy & brass","#1f3047","#bca17c","#faf8f5","#ebe7df"]],
 general:[["Ink & sky","#18364a","#8bd0ef","#f7fbfd","#e8f4fa"],["Slate & mint","#233d44","#9bcbbd","#f7fbfa","#e7f0ed"]]
};
export const paletteFor=(industry,seed=1)=>{
 const choices=PALETTES[industry]||PALETTES.general;
 const index=(Math.abs(Number(seed)||0)%choices.length);
 const [name,ink,accent,surface,feature]=choices[index];
 return {name,ink,accent,surface,feature,header:"#ffffff",text:"#183044"};
};
export function proceduralSeed(key){const s=String(key??"").slice(0,300);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0;}
const variantFor=(kind,seed)=>{const variants=FAMILY[kind]||FAMILY.benefits;return variants[(seed>>>0)%variants.length]};
const styleFor=id=>/full-bleed|filmstrip|marquee/.test(id)?"immersive":/centered|quote|timeline|linear|stripes/.test(id)?"editorial":"split";
const hasReviews=data=>Array.isArray(data?.testimonials)&&data.testimonials.some(x=>x?.approved===true&&x?.text)||Boolean(data?.googleMapsUrl);
function planSections(site,prospect={}){
 const industry=String(site?.industry||prospect?.industry||"general");
 const base=industryCanvasBlocks(industry);
 const info={...prospect,...site};
 const blocks=[...base];
 // Reputation appears only if there is authentic, approved source content.
 if(hasReviews(info)){
  const position=Math.max(1,blocks.findIndex(x=>x.type==="contact"));
  blocks.splice(position,0,newCanvasBlock("reviews","reviews-1",industry));
 }
 // Lead and booking intent: no client portal is required for contact.
 if(!blocks.some(b=>b.type==="contact"))blocks.push(newCanvasBlock("contact","contact-1",industry));
 return blocks.slice(0,12);
}
export function generateProceduralSite(site,prospect={},seedInput=null){
 const seed=Number.isInteger(seedInput)?seedInput>>>0:proceduralSeed([prospect.id||site.ownerId||"",site.industry,site.name].join(":"));
 const palette=paletteFor(site.industry,seed);
 const blocks=planSections(site,prospect).map((b,i)=>{
  const variant=variantFor(b.type,proceduralSeed(seed+":"+b.type+":"+i));
  return {...b,variant,style:styleFor(variant)};
 });
 return {...site,template:"custom-canvas",theme:"custom-canvas",
  canvasBlocks:blocks,proceduralSeed:seed,proceduralVersion:PROCEDURAL_VERSION,
  designTokens:palette,headerColor:palette.header,mainColor:palette.surface,
  sectionColor:palette.feature,accentColor:palette.accent,
  // No price, subscription, booking or customer identity is modified.
 };
}
export function randomizeProceduralSite(site,blockId=null){
 const current=Number(site.proceduralSeed)||proceduralSeed(site.name||"fugth");
 const seed=(current+0x9e3779b9)>>>0;
 const palette=paletteFor(site.industry,seed);
 const source=Array.isArray(site.canvasBlocks)?site.canvasBlocks:[];
 const blocks=source.map((b,i)=>{
  if(blockId&&b.id!==blockId)return b;
  const variants=FAMILY[b.type]||[];
  if(!variants.length)return b;
  const old=Math.max(0,variants.indexOf(b.variant));
  const variant=variants[(old+1+(seed%Math.max(1,variants.length-1)))%variants.length];
  return {...b,variant,style:styleFor(variant)};
 });
 // Regenerating one section never changes the user's brand palette.
 return {...site,canvasBlocks:blocks,proceduralSeed:seed,
  ...(blockId?{}:{designTokens:palette,headerColor:palette.header,mainColor:palette.surface,
   sectionColor:palette.feature,accentColor:palette.accent})};
}
export function validateVariant(type,variant){
 const all=FAMILY[type]||[];return typeof variant==="string"&&SAFE.test(variant)&&all.includes(variant)?variant:all[0]||"";
}
