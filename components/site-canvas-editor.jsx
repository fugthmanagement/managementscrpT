"use client";
import {useMemo,useState} from "react";
import {SITE_INDUSTRIES} from "../lib/site-presets";
import {CANVAS_BLOCK_TYPES,industryCanvasBlocks,newCanvasSite,newCanvasBlock,sanitizeCanvasBlocks} from "../lib/site-canvas";
const btn="rounded-xl border border-[#cfe4ef] bg-white px-3 py-2.5 text-xs font-black text-[#245572] disabled:opacity-40";
const input="mt-2 w-full rounded-xl border border-[#cfe3ed] bg-white px-3 py-3 text-sm text-[#15384a] outline-none focus:border-[#56a3cb]";
const names={hero:"Hero / first impression",benefits:"Reasons to choose",services:"Service catalog",gallery:"Project photo gallery",process:"How the work flows",about:"About the business",faq:"Frequently asked",contact:"Contact / inquiry",callout:"Promotional callout"};
export default function SiteCanvasEditor({site,onChange,locked=false,onSave,busy=""}){
 const [choice,setChoice]=useState(site.industry||"general");
 const [focus,setFocus]=useState("");
 const [notice,setNotice]=useState("");
 const custom=site.template==="custom-canvas";
 const blocks=useMemo(()=>sanitizeCanvasBlocks(site.canvasBlocks,site.industry),[site.canvasBlocks,site.industry]);
 const selected=blocks.find(b=>b.id===focus)||blocks[0];
 function changeBlocks(next){onChange({template:"custom-canvas",theme:"custom-canvas",canvasBlocks:next});setNotice("Unsaved block changes. Use Save design to update the same website.");}
 function changeBlock(patch){changeBlocks(blocks.map(block=>block.id===selected?.id?{...block,...patch}:block));}
 function start(blank=false){
  if((custom||site.canvasBlocks)&&typeof window!=="undefined"&&!window.confirm("Replace this draft canvas with a new "+(blank?"blank":"industry")+" layout? Your saved published website will not change until you explicitly save and publish."))return;
  const next=newCanvasSite(site,choice,{blank});
  onChange(next);
  setFocus(next.canvasBlocks[0]?.id||"");
  setNotice("Canvas ready. Edit and save when the design is complete.");
 }
 function add(type){
  if(blocks.length>=12){setNotice("This website supports up to twelve sections. Remove one before adding another.");return;}
  const id=type+"-"+Math.random().toString(36).slice(2,10);
  changeBlocks([...blocks,newCanvasBlock(type,id,site.industry)]);
  setFocus(id);
 }
 function move(id,offset){
  const from=blocks.findIndex(x=>x.id===id),to=from+offset;
  if(to<0||to>=blocks.length)return;
  const next=[...blocks];[next[from],next[to]]=[next[to],next[from]];
  changeBlocks(next);
 }
 function remove(id){
  const next=blocks.filter(x=>x.id!==id);
  if(next.length===0)return setNotice("Keep at least one section on the canvas.");
  changeBlocks(next);
  if(focus===id)setFocus(next[0].id);
 }
 function patchItem(i,value){
  const items=[...(selected?.items||[])];items[i]=value;changeBlock({items});
 }
 return <section className="space-y-5 rounded-[24px] border border-[#c7deec] bg-white p-4 text-[#193e54] sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#4685a7]">FUGTH Canvas / Drag-free visual editor</p>
    <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Create a site from a blank page, or start with your trade.</h3>
    <p className="mt-2 max-w-2xl text-xs leading-6 text-[#6c8494]">Edit real blocks, not placeholder colors. Move each section, add service cards and decide the visitor's path. Only preview text and images you have permission to use.</p></div>
   <span className="rounded-full bg-[#e9f6fc] px-3 py-2 text-[11px] font-bold">{custom?"Custom canvas active":"Preset layout active"}</span>
  </div>
  <div className="grid gap-3 rounded-[20px] border border-[#d6e8f1] bg-[#f1f9fd] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
   <label className="text-xs font-black">Industry blueprint
    <select value={choice} onChange={e=>setChoice(e.target.value)} className={input}>
     {SITE_INDUSTRIES.map(ind=><option value={ind.id} key={ind.id}>{ind.label}</option>)}
    </select>
   </label>
   <button disabled={locked} onClick={()=>start(false)} type="button" className={btn+" bg-[#e2f4ff]"}>Generate trade layout ↗</button>
   <button disabled={locked} onClick={()=>start(true)} type="button" className={btn}>Start blank canvas +</button>
  </div>
  {!custom?<p className="rounded-xl border border-[#dce7ef] bg-[#fbfdff] p-4 text-xs leading-6 text-[#718a9a]">This site is using a finished template. Choose one of the two options above to switch this <strong>draft</strong> to Custom Canvas. Existing live websites are not silently changed.</p>:<>
   <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
    <div className="rounded-2xl border border-[#dceaf2] bg-[#f7fbfe] p-3">
     <div className="flex items-center justify-between px-2 py-2"><strong className="text-xs">Page sections ({blocks.length}/12)</strong><span className="text-[10px] text-[#7697a9]">Select to edit</span></div>
     <div className="mt-2 space-y-2">{blocks.map((block,i)=><div key={block.id} className={"rounded-xl border p-2.5 "+(selected?.id===block.id?"border-[#76b8da] bg-[#e1f2fc]":"border-[#d8e9f2] bg-white")}>
      <button type="button" onClick={()=>setFocus(block.id)} className="w-full text-left"><span className="text-[10px] font-bold text-[#648899]">{String(i+1).padStart(2,"0")} · {block.type.toUpperCase()}</span><strong className="mt-1 block truncate text-xs">{block.title||names[block.type]}</strong></button>
      <div className="mt-3 flex flex-wrap gap-1.5">
       <button type="button" disabled={i===0||locked} onClick={()=>move(block.id,-1)} aria-label={"Move "+block.type+" up"} className={btn}>↑</button>
       <button type="button" disabled={i===blocks.length-1||locked} onClick={()=>move(block.id,1)} aria-label={"Move "+block.type+" down"} className={btn}>↓</button>
       <button type="button" disabled={locked} onClick={()=>changeBlocks(blocks.map(x=>x.id===block.id?{...x,enabled:!x.enabled}:x))} className={btn}>{block.enabled?"Hide":"Show"}</button>
       <button type="button" disabled={locked||blocks.length===1} onClick={()=>remove(block.id)} className={btn+" text-[#a35252]"}>Delete</button>
      </div>
     </div>)}</div>
    </div>
    <div className="rounded-2xl border border-[#dceaf2] bg-white p-4">
     <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#5688a5]">Block settings</p>
     {selected?<div className="mt-4 space-y-4">
      <div><p className="text-sm font-black">{names[selected.type]}</p><p className="mt-1 text-xs text-[#70899a]">Changes update the live preview before saving.</p></div>
      <label className="block text-xs font-black">Heading<input disabled={locked} maxLength={110} value={selected.title} onChange={e=>changeBlock({title:e.target.value})} className={input}/></label>
      <label className="block text-xs font-black">Description<textarea disabled={locked} maxLength={500} rows={4} value={selected.body} onChange={e=>changeBlock({body:e.target.value})} className={input}/></label>
      <label className="block text-xs font-black">Visual composition
       <select disabled={locked} className={input} value={selected.style} onChange={e=>changeBlock({style:e.target.value})}>
        <option value="split">Split / structured</option><option value="immersive">Immersive / dramatic</option><option value="editorial">Editorial / clean</option>
       </select>
      </label>
      {["services","benefits","process"].includes(selected.type)&&<div className="space-y-2"><p className="text-xs font-black">Cards / items ({selected.items.length}/6)</p>
       {selected.items.map((item,i)=><div key={i} className="flex gap-2"><input disabled={locked} maxLength={90} className={input+" flex-1"} value={item} onChange={e=>patchItem(i,e.target.value)}/><button className={btn} disabled={locked} onClick={()=>changeBlock({items:selected.items.filter((_,j)=>j!==i)})}>×</button></div>)}
       <button type="button" className={btn} disabled={locked||selected.items.length>=6} onClick={()=>changeBlock({items:[...selected.items,"New item"]})}>+ Add card</button>
      </div>}
      {selected.type==="gallery"&&<p className="rounded-xl bg-[#edf8ff] p-3 text-xs leading-6">Change gallery photos through <strong>Photo folders & labels</strong> in Website Maker. This editor reuses your licensed uploads and saved hero/gallery image selections.</p>}
      {selected.type==="faq"&&<p className="rounded-xl bg-[#edf8ff] p-3 text-xs leading-6">Edit actual FAQ questions and answers in the Content step of your existing editor.</p>}
     </div>:<p className="mt-4 text-sm">Choose a block to begin.</p>}
    </div>
   </div>
   <div className="rounded-2xl border border-[#dceaf2] bg-[#f7fbfe] p-4"><p className="mb-3 text-sm font-black">Add a block</p><div className="flex flex-wrap gap-2">{CANVAS_BLOCK_TYPES.map(type=><button key={type} disabled={locked||blocks.length>=12} type="button" className={btn} onClick={()=>add(type)}>+ {names[type]}</button>)}</div></div>
  </>}
  {notice&&<p role="status" className="rounded-xl bg-[#e9f7ff] p-3 text-xs leading-6 text-[#39718b]">{notice}</p>}
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[11px] leading-5 text-[#8297a3]">A preview does not publish the site. Save first; only customers with appropriate hosting or founders can publish a live website.</p><button type="button" disabled={locked||!!busy||!custom||!onSave} onClick={onSave} className="rounded-xl bg-[#1b4258] px-6 py-3.5 text-xs font-black text-white disabled:opacity-40">{busy?"Saving…":"Save custom design →"}</button></div>
 </section>;
}
