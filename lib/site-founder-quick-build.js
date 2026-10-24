/**
 * Founder-only procedural quick build from a prospect plus optional visual
 * structure hints. Never copies source HTML/text, reviews or third-party photos.
 */
import {generateProceduralSite,randomizeProceduralSite,paletteFor,proceduralSeed} from "./site-procedural-engine.js";
const STYLES=["split","editorial","immersive"];
const safeStyle=v=>STYLES.includes(v)?v:"split";
const isHex=x=>/^#[0-9a-f]{6}$/i.test(String(x||""));
const distance=(a,b)=>[1,3,5].reduce((sum,i)=>sum+(parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16))**2,0);
export function matchingIndustryPalette(industry,color){
 if(!isHex(color))return null;
 const palettes=[];
 for(let i=0;i<12;i++){
  const p=paletteFor(industry,i);
  if(!palettes.some(x=>x.name===p.name))palettes.push(p);
 }
 return palettes.sort((a,b)=>distance(a.accent,color)-distance(b.accent,color))[0]||null;
}
export function composeFounderProspectSite(site,prospect={},reference=null){
 const id=String(prospect?.id||site.prospectId||site.ownerId||"");
 const draft=generateProceduralSite(site,{...prospect,id});
 if(!reference||!STYLES.includes(reference.layoutStyle)){
  return {...draft,prospectId:id,showChatbot:true};
 }
 const direction=safeStyle(reference.layoutStyle);
 const variant=direction==="immersive"?"hero-full-bleed":direction==="editorial"?"hero-centered":"hero-split-a";
 const blocks=draft.canvasBlocks.map(block=>block.type==="hero"?{...block,variant,style:direction}:block);
 const palette=matchingIndustryPalette(site.industry,reference.paletteHint)||draft.designTokens;
 return {...draft,prospectId:id,canvasBlocks:blocks,designTokens:palette,
  headerColor:palette.header,mainColor:palette.surface,sectionColor:palette.feature,accentColor:palette.accent,
  showChatbot:true,
  referenceLayout:{
   sourceUrl:String(reference.sourceUrl||prospect.website||"").slice(0,650),
   layoutStyle:direction,hasGallery:reference.hasGallery===true,
   hasCards:reference.hasCards===true,hasBooking:reference.hasBooking===true,
   hasTestimonials:reference.hasTestimonials===true,
   paletteHint:isHex(reference.paletteHint)?reference.paletteHint.toLowerCase():"",
   inspectedAt:String(reference.inspectedAt||"").slice(0,80)
  }
 };
}
export function shuffleFounderDraft(site,sectionId=null){
 if(site.template!=="custom-canvas")return site;
 return randomizeProceduralSite(site,sectionId);
}
