"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const field="mt-2 w-full rounded-xl border border-[#c5dbe8] bg-white px-3 py-3 text-xs text-[#234d66]";
export default function FounderStripeProductEditor(){
 const [view,setView]=useState(null),[selected,setSelected]=useState(""),[description,setDescription]=useState(""),
  [features,setFeatures]=useState([]),[busy,setBusy]=useState(""),[note,setNote]=useState("");
 async function req(method,body){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Founder sign-in required");
  const res=await fetch("/api/dev/stripe-catalog",{method,cache:"no-store",
   headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
   body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||"Stripe products unavailable");
  return data;
 }
 async function reload(){
  setBusy("load");setNote("");
  try{
   const v=await req("GET");
   setView(v);
   const first=v.products?.find(p=>p.id===selected)||v.products?.[0];
   if(first){setSelected(first.id);setDescription(first.description||"");setFeatures(first.features||[])}
  }catch(e){setNote(e.message)}
  finally{setBusy("")}
 }
 useEffect(()=>{reload()},[]);
 function choose(id){
  const product=view?.products?.find(p=>p.id===id);
  if(!product)return;
  setSelected(id);setDescription(product.description||"");setFeatures(product.features||[]);setNote("");
 }
 async function save(){
  if(!selected)return;
  if(!window.confirm("Update this LIVE Stripe product's description and feature labels? Prices and subscriptions will not be changed."))return;
  setBusy("save");setNote("");
  try{
   const result=await req("POST",{action:"update_copy",productId:selected,description,
    features:features.map(x=>x.trim()).filter(Boolean)});
   setNote(result.note||"Saved");const v=await req("GET");setView(v);
  }catch(e){setNote(e.message)}finally{setBusy("")}
 }
 const product=view?.products?.find(p=>p.id===selected);
 return <section className="rounded-[25px] border border-[#d5e5ed] bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-[.19em] text-[#558ba7]">LIVE STRIPE PRODUCT CONTROL</p>
    <h3 className="mt-2 text-xl font-black">Edit Stripe offer descriptions</h3>
    <p className="mt-2 text-xs leading-6 text-[#738d9f]">Read the live FUGTH Management products, edit descriptions and feature labels, and inspect registered prices. It never changes a price, charges a customer or grants a plan.</p>
   </div>
   <button className="rounded-xl border px-4 py-3 text-xs font-bold" disabled={Boolean(busy)} onClick={reload}>Refresh Stripe</button>
  </div>
  {view&&<div className="mt-5 space-y-4">
   <p className="text-[11px] text-[#57788d]">{view.live?"Connected live Stripe account":"Stripe key is not live"} · {view.merchant} · {view.products?.length||0} FUGTH products</p>
   <label className="block text-xs font-bold">Which Stripe product?
    <select className={field} value={selected} onChange={e=>choose(e.target.value)}>
     {(view.products||[]).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
    </select>
   </label>
   {product&&<>
    <label className="block text-xs font-bold">Product description
     <textarea className={field} rows={3} maxLength={350} value={description} onChange={e=>setDescription(e.target.value)}/>
    </label>
    <div className="grid gap-3 md:grid-cols-2">
     {Array.from({length:5},(_,i)=><label key={i} className="block text-xs font-bold">Feature {i+1}
      <input className={field} maxLength={65} value={features[i]||""}
       onChange={e=>setFeatures(cur=>Array.from({length:5},(_,j)=>j===i?e.target.value:(cur[j]||"")))}/>
     </label>)}
    </div>
    <div className="rounded-xl border border-[#d7e4ed] bg-[#f6fbfe] p-4">
     <p className="text-xs font-bold">Existing Stripe prices (read only)</p>
     <div className="mt-2 grid gap-1">{(product.prices||[]).map(p=><p key={p.id} className="text-xs">
      {new Intl.NumberFormat("en-US",{style:"currency",currency:p.currency||"USD"}).format(p.unitAmount/100)} / {p.interval} · {p.id}
     </p>)}</div>
     <p className="mt-3 text-[11px] leading-5 text-[#6c8290]">These Stripe descriptions do not automatically change the FUGTH checkout catalog, which must be kept consistent with verified product entitlements.</p>
    </div>
    <button type="button" disabled={Boolean(busy)||description.trim().length<10} onClick={save}
     className="rounded-xl bg-[#163e55] px-6 py-4 text-xs font-black text-white disabled:opacity-40">
      {busy==="save"?"Saving…":"Update live Stripe product copy"}
    </button>
   </>}
  </div>}
  {note&&<p role="status" className="mt-4 rounded-xl bg-[#fff4e8] p-3 text-xs leading-6 text-[#87613b]">{note}</p>}
 </section>;
}
