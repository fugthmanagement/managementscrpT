"use client";

import {SITE_THEMES} from "../lib/site-presets";

const familyLabel={service:"Service",care:"Care",studio:"Studio"};
function Thumbnail({theme}){
 const n=SITE_THEMES.findIndex(item=>item.id===theme.id);
 const flipped=[1,6,8].includes(n),stacked=[2,5].includes(n),compact=[3,9].includes(n);
 return <div aria-hidden="true" className="relative mb-4 h-28 overflow-hidden rounded-xl border border-black/10 bg-[#fafafa] p-2 shadow-inner">
  <div className="flex h-2 items-center gap-1 border-b border-black/10 pb-2"><span className="h-1.5 w-1.5 rounded-full bg-black"/><span className="ml-auto h-1 w-5 rounded-full bg-black/25"/><span className="h-1 w-3 rounded-full bg-black/25"/></div>
  <div className={`mt-2 flex gap-2 ${stacked?"h-[68px] flex-col":flipped?"flex-row-reverse":""}`}>
   <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5"><span className={`${compact?"w-3/4":"w-full"} h-2 rounded-sm bg-black`}/><span className="h-2 w-4/5 rounded-sm bg-black"/><span className="h-1 w-3/5 rounded-sm bg-black/25"/><span className="h-2 w-8 rounded-sm bg-black/70"/></div>
   <div className={`${stacked?"h-8 w-full":compact?"w-1/3":"w-[45%]"} bg-gradient-to-br from-black/70 via-black/30 to-black/5 ${theme.family==="care"?"rounded-t-[40px]":theme.family==="studio"?"rounded-t-[24px]":"rounded-sm"}`}/>
  </div>
  {theme.family==="studio"&&<span className="absolute bottom-1 left-2 font-serif text-[8px] italic">the story</span>}
 </div>;
}

export default function SiteLayoutPicker({selected,onSelect,disabled=false}){
 return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{SITE_THEMES.map((theme,index)=><button key={theme.id} type="button" disabled={disabled} aria-pressed={selected===theme.id} onClick={()=>onSelect(theme)} className={`rounded-2xl border p-3 text-left transition duration-300 hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-55 ${selected===theme.id?"border-black bg-black text-white shadow-xl":"border-zinc-200 bg-white text-zinc-900"}`}><Thumbnail theme={theme}/><span className={`text-[10px] font-black uppercase tracking-widest ${selected===theme.id?"text-zinc-400":"text-zinc-500"}`}>{String(index+1).padStart(2,"0")} � {familyLabel[theme.family]}</span><strong className="mt-1 block text-sm">{theme.name}</strong><span className={`mt-1 block text-[11px] leading-5 ${selected===theme.id?"text-zinc-300":"text-zinc-500"}`}>{theme.subtitle}</span></button>)}</div>
}

