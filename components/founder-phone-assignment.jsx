"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
export default function FounderPhoneAssignment({uid,onAssigned}){
 const [numbers,setNumbers]=useState([]),[numberId,setNumberId]=useState(""),
  [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const [areaCode,setAreaCode]=useState("305"),[confirmPhrase,setConfirmPhrase]=useState("");
 const [billingAcknowledged,setBillingAcknowledged]=useState(false),[newNumberResult,setNewNumberResult]=useState(null);
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
 async function provision(){
  if(!/^[2-9][0-9]{2}$/.test(areaCode)||!billingAcknowledged||confirmPhrase!=="PROVISION")return;
  const ok=window.confirm("Create a NEW Vapi phone number in area code "+areaCode+" and assign it to this customer? Additional numbers and calls may cost money under your Vapi plan. This is a real provider provisioning request.");
  if(!ok)return;
  setSaving(true);setMessage("");setNewNumberResult(null);
  try{
   const res=await fetch("/api/dev/assign-phone",{method:"POST",headers:await headers(),
    body:JSON.stringify({action:"provision",uid,areaCode,billingAcknowledged:true,confirmation:"PROVISION"})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"The new-number request needs review in Vapi.");
   setNewNumberResult(data);
   setConfirmPhrase("");setBillingAcknowledged(false);
   await load();setMessage("Created and assigned "+data.number+". Check Vapi activation and place a real test call before advertising this number.");onAssigned?.();
  }catch(error){setMessage(error.message||"Provisioning failed. Review provider inventory before retrying.");}
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

  <div className="mt-6 rounded-2xl border border-[#cee6f1] bg-[#f3fbff] p-4 sm:p-5">
   <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#5b98b4]">FOUNDER / NEW PHONE NUMBER</p>
   <h4 className="mt-2 text-base font-black text-[#173b51]">Create a new Vapi line and assign it automatically</h4>
   <p className="mt-2 text-xs leading-6 text-[#5e8092]">This button creates a real Vapi-managed US phone number, a dedicated business AI assistant, routes inbound calls to it and saves the account assignment in Firestore. Free Vapi numbers are inbound-only. Additional number charges, usage charges or a payment method may be required. There is no automatic SMS capability.</p>
   <label className="mt-4 block text-xs font-bold text-[#244e63]">Preferred US area code
    <input value={areaCode} maxLength={3} inputMode="numeric" onChange={e=>setAreaCode(e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="305" className="mt-2 w-full rounded-xl border border-[#b8d9e8] bg-white px-4 py-3 sm:max-w-[190px]"/>
   </label>
   <label className="mt-4 flex items-start gap-2 text-xs text-[#385b70]">
    <input type="checkbox" className="mt-1" checked={billingAcknowledged} onChange={e=>setBillingAcknowledged(e.target.checked)}/>
    I understand that creating this line can incur provider charges now or later, and I authorize provisioning only when I click the button below.
   </label>
   <label className="mt-4 block text-xs font-bold text-[#244e63]">Type PROVISION to confirm
    <input className="mt-2 w-full rounded-xl border border-[#b8d9e8] bg-white px-4 py-3 sm:max-w-[210px]" value={confirmPhrase} autoComplete="off" onChange={e=>setConfirmPhrase(e.target.value)} placeholder="PROVISION"/>
   </label>
   <button type="button" disabled={loading||saving||!billingAcknowledged||confirmPhrase!=="PROVISION"||!/^[2-9][0-9]{2}$/.test(areaCode)} onClick={provision}
    className="mt-4 rounded-xl bg-[#174c66] px-5 py-3 text-xs font-black text-white disabled:opacity-40">{saving?"Working with Vapi…":"Create & assign new number"}</button>
   <p className="mt-3 text-[11px] leading-5 text-[#728c99]">If a request fails after Vapi creates an assistant or number, FUGTH blocks automatic repeat purchases for that account until the provisioning record is reviewed.</p>
   {newNumberResult&&<div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
    <strong className="text-sm text-[#245447]">Provisioned: {newNumberResult.number}</strong>
    <p className="mt-1 text-xs text-[#5c7e74]">Provider status: {newNumberResult.providerStatus||"Unknown"} · ID: {newNumberResult.numberId}</p>
    <h5 className="mt-4 text-xs font-black text-[#245447]">Complete these setup steps</h5>
    <ol className="mt-2 list-inside list-decimal space-y-2 text-xs leading-6 text-[#426356]">{(newNumberResult.nextSteps||[]).map((item,i)=><li key={i}>{item}</li>)}</ol>
   </div>}
  </div>

  {message&&<p role="status" className="mt-3 rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs leading-6 text-zinc-700">{message}</p>}
 </section>;
}
