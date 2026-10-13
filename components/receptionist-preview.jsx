"use client";
import {useEffect,useRef,useState} from "react";
import {RecaptchaVerifier,linkWithPhoneNumber} from "firebase/auth";
import {auth} from "../lib/firebase";

function normalize(raw){
 const digits=String(raw||"").replace(/\D/g,"");
 return digits.length===10?"+1"+digits:digits.length===11&&digits[0]==="1"?"+"+digits:"";
}
export default function ReceptionistPreview({user,workspace,onGoPhoneSetup}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true);
 const [phone,setPhone]=useState(""),[verified,setVerified]=useState(""),[code,setCode]=useState("");
 const [confirmation,setConfirmation]=useState(null),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [consent,setConsent]=useState(false),[call,setCall]=useState(null);
 const verifierRef=useRef(null);
 async function header(){
  const token=await auth.currentUser?.getIdToken(true);
  if(!token)throw Error("Please sign in to try your receptionist.");
  return {Authorization:"Bearer "+token};
 }
 useEffect(()=>{
  let mounted=true;
  (async()=>{try{
   const res=await fetch("/api/receptionist-preview",{headers:await header(),cache:"no-store"});
   const json=await res.json().catch(()=>({}));
   if(!mounted)return;
   setData(json);
   const linked=normalize(json.verifiedPhone||auth.currentUser?.phoneNumber);
   if(linked){setVerified(linked);setPhone(linked);}
   else if(workspace?.phoneSetup?.businessPhone){setPhone(workspace.phoneSetup.businessPhone);}
  }catch(e){if(mounted)setError("The receptionist preview couldn't be loaded. Check your connection.");}
  finally{if(mounted)setLoading(false);}
  })();
  return()=>{mounted=false;try{verifierRef.current?.clear();}catch{}};
 },[user?.uid]);
 useEffect(()=>{
  if(!call?.callId || ["ended","failed"].includes(call.status))return;
  let stopped=false;
  const id=setInterval(async()=>{
   try{
    const res=await fetch("/api/receptionist-preview?callId="+encodeURIComponent(call.callId),{headers:await header(),cache:"no-store"});
    const json=await res.json();if(!stopped&&res.ok)setCall(previous=>({...previous,status:json.status,summary:json.summary,endedReason:json.endedReason}));
   }catch{}
  },5500);
  return()=>{stopped=true;clearInterval(id);};
 },[call?.callId,call?.status]);
 async function startVerification(){
  setBusy("sms");setError("");setMessage("");
  const target=normalize(phone);
  if(!target){setError("Enter a valid US mobile number.");setBusy("");return;}
  if(!consent){setError("Please agree to receive the verification text and one-time call.");setBusy("");return;}
  try{
   if(!auth.currentUser)throw Error("Sign in first.");
   if(verified&&verified!==target)throw Error("Your account is already linked to a different number. Contact support to change it.");
   if(auth.currentUser.phoneNumber===target){setVerified(target);setMessage("Your number is already verified.");return;}
   if(!verifierRef.current){
    verifierRef.current=new RecaptchaVerifier(auth,"fugth-preview-recaptcha",{size:"invisible"});
   }
   const verify=await linkWithPhoneNumber(auth.currentUser,target,verifierRef.current);
   setConfirmation(verify);
   setMessage("We sent a verification code to your phone. Enter it below.");
  }catch(e){
   const code=String(e.code||"");
   setError(code.includes("operation-not-allowed")?"Phone verification needs to be enabled for this FUGTH account.":code.includes("credential-already-in-use")?"This number is already linked to another account.":code.includes("too-many-requests")?"Too many verification attempts. Please try later.":"We couldn't send the verification text. Confirm your number and try again.");
   try{verifierRef.current?.clear();}catch{}verifierRef.current=null;
  }finally{setBusy("");}
 }
 async function confirmCode(){
  if(!confirmation)return;
  setBusy("verify");setError("");
  try{
   const credential=await confirmation.confirm(code.trim());
   const linked=normalize(credential.user.phoneNumber);
   if(linked!==normalize(phone))throw Error("Number mismatch.");
   await credential.user.getIdToken(true);
   setVerified(linked);setMessage("Number verified. You can now receive your test call.");setConfirmation(null);setCode("");
  }catch{setError("The code didn't verify. Check the six digits and try again.");}
  finally{setBusy("");}
 }
 async function startCall(){
  setBusy("call");setError("");setMessage("");setCall(null);
  const target=normalize(phone);
  if(!consent){setError("Please agree to the one-time call first.");setBusy("");return;}
  if(!target||target!==verified){setError("Verify the number you want FUGTH to call.");setBusy("");return;}
  try{
   const res=await fetch("/api/receptionist-preview",{method:"POST",
    headers:{...await header(),"Content-Type":"application/json"},
    body:JSON.stringify({phone:target,consent:true}),cache:"no-store"});
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||"We couldn't start the test call.");
   setCall({callId:json.callId,status:json.status,businessName:json.businessName});
   setMessage("Your call has been requested. Keep your phone nearby and answer if it rings.");
  }catch(e){setError(e.message);}finally{setBusy("");}
 }
 const business=data?.business?.name||workspace?.businessName||"your business";
 const industry=data?.business?.industryName||workspace?.businessType||"local business";
 const available=data?.available!==false;
 return <section className="overflow-hidden rounded-[26px] border border-[#303f35] bg-[#1b2b24] text-white shadow-[0_28px_80px_rgba(24,42,31,.14)]">
   <div className="relative overflow-hidden px-6 pb-8 pt-8 sm:px-9 sm:pb-10 sm:pt-10">
    <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[62px] border-[#e0b999]/10"/>
    <div className="relative grid items-start gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#b9cbb9]"><span className="h-2 w-2 rounded-full bg-[#dcba93]"/> TRY YOUR RECEPTIONIST</p>
      <h3 className="mt-5 max-w-xl text-[clamp(2.1rem,5.3vw,4rem)] font-semibold leading-[1.05] tracking-[-.075em]">Hear how your business <span className="font-serif font-normal italic text-[#e1c5a8]">answers.</span></h3>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#c1cdc2]">Get a short call from your FUGTH receptionist, tailored to your business. You'll hear how it greets and helps a customer.</p>
      <div className="mt-6 inline-flex max-w-full flex-wrap gap-2"><span className="rounded-full border border-white/20 px-3 py-2 text-[11px] text-[#d6e0d5]">{business}</span><span className="rounded-full border border-white/20 px-3 py-2 text-[11px] text-[#d6e0d5]">{industry}</span></div></div>
      <div className="rounded-[20px] border border-white/15 bg-white/[.07] p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b8cbb4]">HOW TO TEST</p>
       <div className="mt-5 space-y-5">{[
        ["01","Enter your own phone number","Verify it with a text message."],
        ["02","Answer your incoming call","Pretend you're a customer calling your business."],
        ["03","Ask to book an appointment","Tell the receptionist what you need, and request a day and time."]
       ].map(([n,title,detail])=><div key={n} className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-semibold text-[#e4ceba]">{n}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[#b1c1b3]">{detail}</p></div></div>)}</div>
       <p className="mt-5 rounded-xl bg-[#e8c49e]/10 px-4 py-3 text-xs leading-6 text-[#f0d5b5]">This is a short demonstration. Appointment requests are not actually booked or confirmed.</p>
      </div>
    </div>
   </div>
   <div className="bg-[#fdfdf9] px-6 py-7 text-[#26352b] sm:px-9 sm:py-9">
     {loading?<p className="text-sm text-[#78887b]">Checking your receptionist preview…</p>:!available?<div className="rounded-xl border border-[#e6e4dc] bg-[#f8f7f2] p-5"><p className="font-semibold">Your receptionist preview is being prepared.</p><p className="mt-2 text-sm text-[#869184]">You'll be able to try a call as soon as the calling connection is ready.</p></div>:<>
       <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block text-xs font-semibold text-[#536958]">Your mobile number<input type="tel" autoComplete="tel" placeholder="(305) 555-0140" value={phone} disabled={!!verified&&normalize(phone)===verified} onChange={e=>{setPhone(e.target.value);setError("");}} className="mt-2 block w-full rounded-xl border border-[#d8e0d3] bg-white px-4 py-4 text-base text-[#253528] outline-none focus:border-[#69835e] disabled:bg-[#f4f6f0]"/></label>
        <span className="mb-1 rounded-full bg-[#edf4e8] px-4 py-3 text-[11px] font-bold text-[#5b7554]">{verified&&verified===normalize(phone)?"✓ Number verified":"Verification required"}</span>
       </div>
       <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-6 text-[#6e806e]"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#305237]"/><span>I own or control this number and agree to receive a one-time verification text and FUGTH demonstration call. Standard carrier charges may apply.</span></label>
       <div id="fugth-preview-recaptcha" className="mt-2"/>
       {confirmation&&<div className="mt-5 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-[#5d705d]">Text message verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} placeholder="6-digit code" className="mt-2 block rounded-xl border border-[#d5dfd1] px-4 py-3.5 text-base tracking-[.16em]"/></label><button type="button" onClick={confirmCode} disabled={busy!==""||code.trim().length!==6} className="rounded-xl bg-[#243e2b] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">Verify code</button></div>}
       <div className="mt-6 flex flex-wrap gap-3">
        {(!verified || normalize(phone)!==verified)&&!confirmation&&<button type="button" disabled={busy!==""||!consent} onClick={startVerification} className="rounded-xl border border-[#cedbc9] bg-[#edf4e8] px-6 py-4 text-sm font-semibold text-[#305237] disabled:opacity-50">{busy==="sms"?"Sending text…":"Verify my phone →"}</button>}
        <button type="button" disabled={busy!==""||!consent||verified!==normalize(phone)||!!call?.callId} onClick={startCall} className="rounded-xl bg-[#253c2d] px-7 py-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(30,60,33,.12)] disabled:opacity-40">{busy==="call"?"Connecting…":"Call me for a live demo ↗"}</button>
        <button type="button" onClick={onGoPhoneSetup} className="rounded-xl border border-[#e1e8db] px-5 py-4 text-sm font-semibold text-[#687d65]">Set up my business phone</button>
       </div>
       {message&&<p role="status" className="mt-5 rounded-xl border border-[#d8e5d4] bg-[#f1f7ee] p-4 text-sm text-[#4e6d4b]">{message}</p>}
       {error&&<p role="alert" className="mt-5 rounded-xl border border-[#ecd8ca] bg-[#fff5ec] p-4 text-sm text-[#966441]">{error}</p>}
       {call?.callId&&<div className="mt-5 rounded-xl border border-[#dee8d7] bg-[#f3f8ef] p-5"><p className="text-sm font-semibold">Your call has been requested</p><p className="mt-2 text-xs text-[#6e866b]">Status: {call.status||"Connecting"}</p>{call.summary&&<p className="mt-3 text-sm leading-6 text-[#465a49]">{call.summary}</p>}<p className="mt-3 text-xs text-[#869485]">If the line doesn't ring, check your carrier's unknown-caller blocking or contact support.</p></div>}
       <p className="mt-6 text-[11px] leading-6 text-[#909b90]">Short, timed demo · Up to two call requests per day · Your verified number only · No appointment booking or calendar changes</p>
     </>}
   </div>
 </section>;
}
