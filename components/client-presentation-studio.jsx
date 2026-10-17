"use client";
import {useEffect,useMemo,useState} from "react";
import {auth} from "../lib/firebase";
const field="w-full rounded-xl border border-[#d8cbb7] bg-white px-3 py-2.5 text-sm text-[#514538]";
const id=()=>Math.random().toString(36).slice(2,11);
const empty={handle:"",industry:"wedding",items:[],sessions:[]};
export default function ClientPresentationStudio({uid,industry="wedding"}){
 const [data,setData]=useState(empty),[activeSession,setActiveSession]=useState(""),
  [tab,setTab]=useState("catalog"),[fullscreen,setFullscreen]=useState(false),[loading,setLoading]=useState(true),
  [saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function request(method="GET",body){
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to manage your presentations.");
  const res=await fetch("/api/sites/"+encodeURIComponent(uid)+"/presentation",{method,
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},cache:"no-store",
   ...(body?{body:JSON.stringify(body)}:{})});
  const result=await res.json().catch(()=>({}));if(!res.ok)throw Error(result.error||"Could not access presentations.");return result;
 }
 async function load(){setLoading(true);setError("");try{const r=await request();const next={...empty,...r.showcase};
  next.industry=["wedding","realestate"].includes(next.industry)?next.industry:industry;
  setData(next);setActiveSession(v=>v&&next.sessions.some(s=>s.id===v)?v:next.sessions[0]?.id||"");
 }catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{load()},[uid]);
 const customer=useMemo(()=>data.sessions.find(s=>s.id===activeSession)||null,[data.sessions,activeSession]);
 const favorites=new Set(customer?.favorites||[]);
 const selected=data.items.filter(i=>favorites.has(i.id));
 const patch=(part)=>setData(d=>({...d,...part}));
 const updateItem=(key,p)=>patch({items:data.items.map(i=>i.id===key?{...i,...p}:i)});
 const updateSession=(key,p)=>patch({sessions:data.sessions.map(i=>i.id===key?{...i,...p}:i)});
 function toggleFavorite(itemId){if(!customer)return;
  updateSession(customer.id,{favorites:favorites.has(itemId)?customer.favorites.filter(x=>x!==itemId):[...(customer.favorites||[]),itemId]});
 }
 async function save(){setSaving(true);setError("");setNotice("");
  try{const r=await request("PUT",data);setData(d=>({...d,...r.showcase}));setNotice("Presentation saved to the customer’s FUGTH account.");}
  catch(e){setError(e.message);}finally{setSaving(false);}
 }
 const label=data.industry==="realestate"?"Property":"Dress";
 const title=data.industry==="realestate"?"A place to call home.":"Your moment begins here.";
 function Media({item}){let hostname="";try{hostname=new URL(item.mediaUrl).hostname;}catch{}
  const video=/\.(mp4|webm|mov)(\?|$)/i.test(item.mediaUrl||"");
  return <div className="overflow-hidden rounded-xl border border-[#e9dcc9] bg-white">
   {item.mediaUrl?(video?<video className="aspect-[4/3] w-full bg-[#eadccb] object-cover" src={item.mediaUrl} controls playsInline preload="metadata"/>:
    <img src={item.mediaUrl} alt={item.title} className="aspect-[4/3] w-full bg-[#eadccb] object-cover"/>):
    <div className="grid aspect-[4/3] place-items-center bg-[#e9dfd1] text-center text-[#aa987c]">{label} media preview</div>}
   <div className="px-3 py-3"><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-[11px] text-[#927f65]">{item.brand||item.category||hostname}</p></div>
  </div>;
 }
 return <section className="rounded-[26px] border border-[#e4d5bd] bg-[#fcf8f0] p-5 text-[#493c2c] sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9c876b]">FUGTH / CLIENT PRESENTATION ENGINE</p>
   <h3 className="mt-2 text-2xl font-semibold">Personalized client showroom</h3>
   <p className="mt-2 text-xs leading-6 text-[#84745c]">Build a {data.industry==="realestate"?"real estate property":"bridal dress"} collection, save client favorites, and display a private full-screen welcome on your consultation TV. Clients do not need to log into your admin.</p></div>
   <button onClick={save} disabled={saving||loading} className="rounded-xl bg-[#51432f] px-4 py-3 text-xs font-bold text-white">{saving?"Saving…":"Save showroom"}</button>
  </div>
  {loading&&<p className="mt-4 text-sm">Loading showroom…</p>}{error&&<p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-[#9e6133]">{error}</p>}{notice&&<p role="status" className="mt-3 rounded-lg bg-white p-3 text-xs">{notice}</p>}
  {!loading&&<>
   <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Showroom type<select className={"mt-2 "+field} value={data.industry} onChange={e=>patch({industry:e.target.value})}><option value="wedding">Wedding / bridal</option><option value="realestate">Real estate</option></select></label>
    <label className="text-xs font-semibold">Business @handle (small display branding)<input className={"mt-2 "+field} value={data.handle||""} onChange={e=>patch({handle:e.target.value})} placeholder="@yourbusiness"/></label></div>
   <div className="mt-5 flex flex-wrap gap-2">{[["catalog","Catalog"],["sessions","Clients & appointments"],["screen","Presentation screen"]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={"rounded-xl px-4 py-2.5 text-xs font-semibold "+(tab===id?"bg-[#4d3f2e] text-white":"border border-[#dfd0ba] bg-white")}>{label}</button>)}</div>
   {tab==="catalog"&&<div className="mt-5"><div className="flex flex-wrap justify-between gap-3"><strong className="text-sm">{label} library · {data.items.length} items</strong><button disabled={data.items.length>=80} onClick={()=>patch({items:[...data.items,{id:id(),title:"New "+label.toLowerCase(),brand:"",category:"",mediaUrl:"",note:""}]})} className="rounded-lg bg-[#e8d8c3] px-4 py-2 text-xs font-semibold">+ Add {label.toLowerCase()}</button></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{data.items.map((item,i)=><div key={item.id} className="rounded-xl border border-[#e5d7c3] bg-white p-4">
     <label className="text-xs font-semibold">Title<input className={"mt-1 "+field} value={item.title} onChange={e=>updateItem(item.id,{title:e.target.value})}/></label>
     <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-semibold">Designer / agency<input className={"mt-1 "+field} value={item.brand} onChange={e=>updateItem(item.id,{brand:e.target.value})}/></label><label className="text-xs font-semibold">Category<input className={"mt-1 "+field} value={item.category} onChange={e=>updateItem(item.id,{category:e.target.value})}/></label></div>
     <label className="mt-3 block text-xs font-semibold">HTTPS photo or video URL<input type="url" className={"mt-1 "+field} value={item.mediaUrl} onChange={e=>updateItem(item.id,{mediaUrl:e.target.value})} placeholder="https://…/photo.jpg"/></label>
     <label className="mt-3 block text-xs font-semibold">Staff notes<input className={"mt-1 "+field} value={item.note} onChange={e=>updateItem(item.id,{note:e.target.value})}/></label>
     <div className="mt-3 flex justify-between gap-3"><span className="text-[11px] text-[#897966]">Item {i+1}</span><button className="text-xs font-semibold text-[#a4503c]" onClick={()=>patch({items:data.items.filter(x=>x.id!==item.id)})}>Remove</button></div>
    </div>)}</div></div>}
   {tab==="sessions"&&<div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-sm">Client appointments</strong><button disabled={data.sessions.length>=40} onClick={()=>{const newSession={id:id(),customerName:"",appointmentAt:"",favorites:[]};patch({sessions:[...data.sessions,newSession]});setActiveSession(newSession.id);}} className="rounded-lg bg-[#e8d8c3] px-4 py-2 text-xs font-semibold">+ Add consultation</button></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{data.sessions.map(session=><div key={session.id} className="rounded-xl border border-[#e4d5c2] bg-white p-4">
     <label className="text-xs font-semibold">Client name<input className={"mt-1 "+field} value={session.customerName} onChange={e=>updateSession(session.id,{customerName:e.target.value})} placeholder="Mary"/></label>
     <label className="mt-3 block text-xs font-semibold">Appointment<input type="datetime-local" className={"mt-1 "+field} value={session.appointmentAt||""} onChange={e=>updateSession(session.id,{appointmentAt:e.target.value})}/></label>
     <div className="mt-3 flex justify-between gap-2"><button onClick={()=>{setActiveSession(session.id);setTab("screen");}} className="rounded-lg bg-[#4c3d2d] px-3 py-2 text-xs font-bold text-white">Start appointment</button><button onClick={()=>patch({sessions:data.sessions.filter(x=>x.id!==session.id)})} className="text-xs text-[#a4503c]">Remove</button></div>
    </div>)}</div></div>}
   {tab==="screen"&&<div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><label className="text-xs font-semibold">Choose consultation<select className={"ml-2 rounded-lg "+field} value={activeSession} onChange={e=>setActiveSession(e.target.value)}><option value="">Select client</option>{data.sessions.map(s=><option key={s.id} value={s.id}>{s.customerName||"Unnamed appointment"}</option>)}</select></label>
     <button onClick={()=>setFullscreen(true)} disabled={!customer} className="rounded-xl bg-[#50412e] px-4 py-3 text-xs font-bold text-white">Open TV presentation ↗</button></div>
    <p className="mt-3 text-xs text-[#85725d]">Select favorites during consultation. Save before leaving so the next visit remembers the choices.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.items.map(item=><div key={item.id}><Media item={item}/><button disabled={!customer} onClick={()=>toggleFavorite(item.id)} className={"mt-2 w-full rounded-lg px-3 py-2 text-xs font-bold "+(favorites.has(item.id)?"bg-[#a17d63] text-white":"border border-[#d7c7b2] bg-white")}>{favorites.has(item.id)?"♥ Saved for "+customer.customerName:"♡ Add to favorites"}</button></div>)}</div></div>}
  </>}
  {fullscreen&&customer&&<div role="dialog" aria-modal="true" aria-label="Private client showroom" className="fixed inset-0 z-[200] overflow-y-auto bg-[#faf6ec] text-[#544435]">
   <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e8dac6] bg-[#faf6ec]/95 px-6 py-4 backdrop-blur"><span className="text-xs font-semibold uppercase tracking-widest">FUGTH SHOWROOM · PRIVATE APPOINTMENT</span><button onClick={()=>setFullscreen(false)} className="rounded-xl border border-[#cbbba5] px-4 py-2 text-sm font-semibold">Close display ✕</button></div>
   <div className="mx-auto max-w-7xl px-6 pb-20 pt-14 text-center"><p className="text-sm uppercase tracking-[.3em] text-[#b49b7a]">Welcome to your private appointment</p><h2 className="mt-8 font-serif text-5xl font-normal sm:text-7xl">Welcome, {customer.customerName}</h2><p className="mt-5 font-serif text-2xl italic text-[#9d8567]">{title}</p>
    <div className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">{(selected.length?selected:data.items).map(item=><div key={item.id}><Media item={item}/></div>)}</div>
    <p className="mt-12 text-sm tracking-widest text-[#aa9373]">{data.handle}</p>
   </div></div>}
 </section>;
}
