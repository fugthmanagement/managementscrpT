"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderPhoneAssignment({uid,onAssigned}){
 const [numbers,setNumbers]=useState([]),[numberId,setNumberId]=useState(""),
  [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 async function headers(){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("FUGTH management sign-in required.");
  return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
 }
 async function load(){
  setLoading(true);setMessage("");
  try{
   const result=await fetch("/api/dev/assign-phone",{headers:await headers(),cache:"no-store"});
   const response=await result.json().catch(()=>({}));
   if(!result.ok)throw Error(response.error||"FUGTH phone inventory isn't available.");
   setNumbers(response.numbers||[]);
   setNumberId(current=>current||response.numbers?.find(item=>item.availability==="available")?.id||"");
  }catch(error){setMessage(error.message||"Cannot retrieve available voice numbers.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{if(uid)load()},[uid]);
 const available=numbers.filter(item=>item.availability==="available");
 async function assign(){
  const selected=available.find(item=>item.id===numberId);
  if(!selected)return;
  if(!window.confirm("Assign "+selected.number+" to this customer? This will change the incoming-call routing of that number. No phone numbers will be purchased."))return;
  setSaving(true);setMessage("");
  try{
   const res=await fetch("/api/dev/assign-phone",{method:"POST",headers:await headers(),
    body:JSON.stringify({uid,numberId})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"Could not complete the line assignment.");
   setMessage("FUGTH line "+data.number+" assigned. The customer can now configure call forwarding under Phone settings.");
   await load();onAssigned?.();
  }catch(error){setMessage(error.message||"Number assignment failed.");}
  finally{setSaving(false);}
 }
 return <section className="mt-5 rounded-2xl border border-zinc-300 bg-white p-4 sm:p-5">
  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">PRIVATE RECEPTIONIST LINE</p>
  <h4 className="mt-2 text-base font-bold text-black">Assign an existing FUGTH number.</h4>
  <p className="mt-2 text-xs leading-6 text-zinc-600">Choose an unused line from the FUGTH phone network. Each business receives a separate receptionist and protected account assignment. This does not buy a new number or forward the customer's existing phone automatically.</p>
  <div className="mt-4 flex flex-wrap gap-3">
   <select value={numberId} onChange={event=>setNumberId(event.target.value)} className="min-w-48 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-black">
    {!available.length&&<option value="">No unused numbers available</option>}
    {available.map(x=><option value={x.id} key={x.id}>{x.number||"FUGTH number"} · {x.provider||"Connected"}</option>)}
   </select>
   <button type="button" onClick={assign} disabled={loading||saving||!numberId||!available.length}
    className="rounded-xl bg-black px-5 py-3 text-xs font-bold text-white disabled:opacity-40">{saving?"Assigning…":"Assign line"}</button>
   <button type="button" onClick={load} disabled={loading||saving} className="rounded-xl border border-zinc-300 px-4 py-3 text-xs font-bold text-zinc-700">Refresh lines</button>
  </div>
  <p className="mt-3 text-xs text-zinc-500">{loading?"Checking available lines…":available.length+" unassigned voice line"+(available.length===1?"":"s")+" available. The shared demo line is reserved."}</p>
  {message&&<p role="status" className="mt-3 rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs leading-6 text-zinc-700">{message}</p>}
 </section>;
}
