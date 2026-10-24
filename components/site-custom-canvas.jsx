"use client";
import SitePhoto from "./site-photo";
import SiteLegalLinks from "./site-legal-links";
import {sanitizeCanvasBlocks} from "../lib/site-canvas";
const target=site=>site.phone?"tel:"+String(site.phone).replace(/[^+0-9]/g,""):site.contactEmail?"mailto:"+site.contactEmail:"#contact";
const photo=(site,slot="hero",id=null)=> <SitePhoto
 imageId={id||site.heroImageId} demoId={site.demoId} ownerUid={site.ownerId}
 industry={site.industry} slot={"canvas-"+slot} className="h-full w-full min-h-[280px]"/>
function Cta({site,label,dark=false}){return <a href={target(site)} className={"inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-6 py-3.5 text-sm font-black shadow-xl transition hover:-translate-y-0.5 "+(dark?"bg-white text-[#162f3b]":"text-[#101b22]")}
 style={dark?{}:{backgroundColor:site.accentColor}}>{label||site.ctaLabel||"Get in touch"} <span aria-hidden="true">↗</span></a>}
function BlockHero({site,block,index}){
 const immersive=block.style==="immersive",editorial=block.style==="editorial";
 const reversed=block.variant==="hero-split-b",technical=block.variant==="hero-technical";
 return <section id={"canvas-"+block.id} data-variant={block.variant||"hero-split-a"} className={"scroll-mt-20 "+(immersive?"relative min-h-[620px] bg-[#101a23] text-white":editorial?"bg-white text-[#172936]":"bg-[#10232e] text-white")}>
  {immersive&&<div className="absolute inset-0">{photo(site,"immersive")}</div>}
  {immersive&&<div className="absolute inset-0 bg-gradient-to-r from-[#071521]/95 via-[#101e28]/80 to-[#071521]/25"/>}
  {editorial?<div className="mx-auto max-w-7xl px-5 pb-16 pt-14 text-center sm:px-8 sm:pt-24">
    <p className="text-[11px] font-black uppercase tracking-[.35em]" style={{color:site.accentColor}}>{site.eyebrow||site.industry}</p>
    <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black leading-[.94] tracking-[-.075em] sm:text-7xl">{block.title||site.headline}</h1>
    <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600">{block.body||site.description}</p>
    <div className="mt-8"><Cta site={site}/></div>
    <div className="mt-12 h-[320px] overflow-hidden rounded-[30px] sm:h-[480px]">{photo(site,"editorial")}</div>
   </div>:<div className={"relative mx-auto max-w-7xl px-5 sm:px-8 "+(immersive?"flex min-h-[620px] items-center py-20":"grid items-center gap-8 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20")+(technical?" border-l-8":"")}>
    <div className={"relative z-10 max-w-3xl "+(reversed?"lg:order-2":"")}>
     <p className="text-[11px] font-black uppercase tracking-[.3em]" style={{color:site.accentColor}}>{site.eyebrow||site.industry}</p>
     <h1 className="mt-7 text-5xl font-black leading-[.92] tracking-[-.065em] sm:text-7xl">{block.title||site.headline}</h1>
     <p className="mt-7 max-w-2xl text-base leading-8 text-white/80">{block.body||site.description}</p>
     <div className="mt-9 flex flex-wrap items-center gap-4"><Cta site={site}/>{site.serviceArea&&<span className="text-xs font-semibold text-white/70">Serving {site.serviceArea}</span>}</div>
     <p className="mt-10 text-xs font-bold uppercase tracking-widest text-white/40">Designed for your next step · {String(index+1).padStart(2,"0")}</p>
    </div>
    {!immersive&&<div className={"relative z-10 h-[340px] overflow-hidden rounded-[30px] border border-white/15 "+(reversed?"lg:order-1":"")} shadow-[0_25px_80px_rgba(0,0,0,.35)] sm:h-[480px]">{photo(site,"hero-split")}</div>}
   </div>}
 </section>;
}
function CanvasBlock({site,block,index}){
 if(!block.enabled)return null;
 const id="canvas-"+block.id,eyebrow=site.eyebrow||"LOCAL BUSINESS";
 const dark=block.style==="immersive",muted=index%2===0;
 const base="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24";
 const shell=dark?"bg-[#10232e] text-white":muted?"text-[#122c3c]":"bg-white text-[#122c3c]";
 const bg=dark?{}:muted?{backgroundColor:site.sectionColor}:{backgroundColor:site.mainColor};
 const head=(tag="Explore")=><><p className={"text-[11px] font-black uppercase tracking-[.23em] "+(dark?"text-white/60":"text-[#597587]")}>{tag}</p><h2 className="mt-4 max-w-4xl text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">{block.title}</h2>{block.body&&<p className={"mt-5 max-w-2xl text-sm leading-7 "+(dark?"text-white/70":"text-[#526e80]")}>{block.body}</p>}</>;
 if(block.type==="hero")return <BlockHero site={site} block={block} index={index}/>;
 if(block.type==="services")return <section data-variant={block.variant||"services-grid"} id={id} className={base+" "+shell} style={bg}><div className="mx-auto max-w-7xl">{head("Services / "+site.industry)}
  <div className={"mt-10 grid gap-3 "+(block.variant==="services-compact"?"sm:grid-cols-2 lg:grid-cols-4":block.style==="editorial"||block.variant==="services-numbered"?"grid-cols-1":"sm:grid-cols-2 lg:grid-cols-3")}>
   {(block.items.length?block.items:site.services).map((item,i)=><article key={i} className={"group flex items-center gap-5 border-b py-6 "+(block.style==="editorial"?"border-current/15":"min-h-[180px] rounded-2xl border px-6 shadow-sm "+(dark?"border-white/15 bg-white/10":"border-[#d8e4ed] bg-white"))}>
    <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-black "+(dark?"bg-white/15 text-white":"bg-[#172f3d] text-white")}>{String(i+1).padStart(2,"0")}</span>
    <div className="flex-1"><h3 className="text-lg font-black">{item}</h3><p className={"mt-2 text-xs "+(dark?"text-white/65":"text-[#657d8d]")}>Ask us about your next step</p></div>
    <a href="#contact" className="text-xl" aria-label={"Ask about "+item}>↗</a>
   </article>)}</div></div></section>;
 if(block.type==="benefits")return <section id={id} className={base+" "+shell} style={bg}><div className="mx-auto max-w-7xl">{head("Why this approach")}
  <div className="mt-10 grid gap-4 md:grid-cols-3">{(block.items.length?block.items:site.trustPoints).map((item,i)=><article key={i} className={"min-h-[200px] border-t pt-6 "+(dark?"border-white/30":"border-[#a3c5d6]")}><span className="text-xs font-bold opacity-60">0{i+1}</span><h3 className="mt-8 text-2xl font-black tracking-tight">{item}</h3></article>)}</div></div></section>;
 if(block.type==="gallery")return <section data-variant={block.variant||"gallery-mosaic"} id={id} className={base+" "+shell} style={bg}><div className="mx-auto max-w-7xl">{head("Selected work / Visual inspiration")}
   <div className="mt-10 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
    <div className="h-[360px] overflow-hidden rounded-[24px] md:h-[540px]">{photo(site,"gallery-main",site.galleryImageIds?.[0])}</div>
    <div className="grid gap-4"><div className="h-[230px] overflow-hidden rounded-[24px] md:h-[330px]">{photo(site,"gallery-secondary",site.galleryImageIds?.[1]||site.heroImageId)}</div><div className={"flex min-h-28 items-center rounded-2xl p-6 "+(dark?"bg-white/10":"bg-white")}><p className="text-xs leading-6 opacity-75">Sample imagery unless the business has supplied and approved licensed photos.</p></div></div>
   </div></div></section>;
 if(block.type==="process")return <section data-variant={block.variant||"steps-cards"} id={id} className={base+" "+shell} style={bg}><div className="mx-auto max-w-7xl">{head("How it works")}
   <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(block.items.length?block.items:site.process).map((item,i)=><article key={i} className={"rounded-[20px] border p-6 "+(dark?"border-white/20 bg-white/10":"border-[#d3e4ef] bg-white")}><span className="text-sm font-black" style={{color:dark?"white":site.accentColor}}>STEP {String(i+1).padStart(2,"0")}</span><h3 className="mt-9 text-lg font-bold leading-6">{item}</h3></article>)}</div></div></section>;
 if(block.type==="about")return <section id={id} className={base+" "+shell} style={bg}><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div>{head("About "+site.name)}<p className={"mt-6 text-sm leading-8 "+(dark?"text-white/70":"text-[#526e80]")}>{site.aboutDetail}</p></div><div className="h-[360px] overflow-hidden rounded-[26px] sm:h-[470px]">{photo(site,"about",site.galleryImageIds?.[0]||site.heroImageId)}</div></div></section>;
 if(block.type==="faq")return <section id={id} className={base+" "+shell} style={bg}><div className="mx-auto max-w-7xl">{head("Answers")}
  <div className="mt-9 max-w-3xl divide-y divide-current/15">{site.faqItems.slice(0,5).map((it,i)=><details key={i} className="py-5"><summary className="cursor-pointer text-base font-black">{it.question}</summary><p className={"mt-3 text-sm leading-7 "+(dark?"text-white/70":"text-[#526e80]")}>{it.answer}</p></details>)}</div></div></section>;
 if(block.type==="reviews"){
  const approved=(site.testimonials||[]).filter(x=>x.approved&&x.text&&x.author).slice(0,5);
  if(!approved.length&&!site.googleMapsUrl)return null;
  return <section id={id} data-variant={block.variant||"reviews-cards"} className={base+" "+shell} style={bg}>
   <div className="mx-auto max-w-7xl">{head("Reputation / customer feedback")}
    {!!approved.length&&<div className={"mt-10 grid gap-4 "+(block.variant==="reviews-quote"?"md:grid-cols-1":"md:grid-cols-3")}>
     {approved.map((x,i)=><blockquote key={i} className={"rounded-[20px] border p-7 "+(dark?"border-white/20 bg-white/10":"border-[#d3e4ed] bg-white")}>
      <p className="text-base leading-8">“{x.text}”</p><cite className="mt-5 block text-xs font-bold not-italic">{x.author} · Submitted with permission</cite>
      {x.sourceUrl&&<a href={x.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs underline">Original source ↗</a>}
     </blockquote>)}</div>}
    {site.googleMapsUrl&&<a href={site.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={"mt-7 inline-block rounded-xl border px-5 py-3 text-xs font-bold "+(dark?"border-white/30 text-white":"border-[#bacfda] text-[#174f71]")}>Read public reviews on Google ↗</a>}
   </div></section>;
 }
 if(block.type==="contact")return <section id="contact" className={base+" bg-[#10232e] text-white"}><div id={id} className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-white/50">Get in touch</p><h2 className="mt-5 max-w-4xl text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">{block.title}</h2><p className="mt-5 text-sm leading-7 text-white/70">{block.body}</p><div className="mt-6 flex flex-wrap gap-5 text-sm font-bold">{site.phone&&<a href={target(site)}>{site.phone}</a>}{site.contactEmail&&<a href={"mailto:"+site.contactEmail}>{site.contactEmail}</a>}{site.serviceArea&&<span>{site.serviceArea}</span>}</div></div><Cta site={site} dark/></div></section>;
 return <section id={id} className={base+" "+shell} style={bg}><div className="mx-auto max-w-7xl">{head(eyebrow)}<div className="mt-7"><Cta site={site} dark={dark}/></div></div></section>;
}
export default function SiteCustomCanvas({site,preview=false}){
 const sections=sanitizeCanvasBlocks(site.canvasBlocks,site.industry).filter(x=>x.enabled);
 const nav=sections.filter(x=>x.type!=="hero").slice(0,5);
 return <div className="bg-[#f8fbfd] text-[#172f3d]">
  <header className="sticky top-0 z-40 border-b border-[#d9e7ee] bg-white/95 px-5 py-3 backdrop-blur-lg sm:px-8">
   <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
    <a href="#top" className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black" style={{backgroundColor:site.accentColor}}>{site.name.slice(0,1)}</span><span className="truncate text-sm font-black tracking-[-.02em] sm:text-base">{site.name}</span></a>
    <nav className="hidden gap-5 text-[11px] font-black uppercase tracking-widest text-[#516b7a] lg:flex">{nav.map(block=><a key={block.id} href={block.type==="contact"?"#contact":"#canvas-"+block.id}>{block.type}</a>)}</nav>
    <div className="flex items-center gap-3"><a href="#contact" className="rounded-xl px-4 py-3 text-xs font-black text-[#122d3b]" style={{backgroundColor:site.accentColor}}>Get in touch ↗</a><details className="relative lg:hidden"><summary className="cursor-pointer text-xs font-bold">Menu</summary><nav className="absolute right-0 top-8 grid min-w-40 gap-3 rounded-xl border border-[#d4e5ee] bg-white p-4 text-xs font-bold shadow-xl">{nav.map(block=><a key={block.id} href={block.type==="contact"?"#contact":"#canvas-"+block.id}>{block.type}</a>)}</nav></details></div>
   </div>
  </header>
  <main id="top">{sections.map((block,i)=><CanvasBlock key={block.id} site={site} block={block} index={i}/>)}</main>
  <footer className="border-t border-[#d7e6ee] bg-white px-5 py-10 text-center sm:px-8"><p className="text-sm font-black">{site.name}</p><p className="mt-2 text-xs text-slate-500">{site.serviceArea||"Get in touch to learn more"}</p><SiteLegalLinks site={site} preview={preview}/></footer>
 </div>;
}
