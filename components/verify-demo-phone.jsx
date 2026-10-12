"use client";
import { useEffect, useRef, useState } from "react";
import { RecaptchaVerifier, linkWithPhoneNumber, updatePhoneNumber, PhoneAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";

function e164(value) {
  const digits=String(value||"").replace(/\D/g,"");
  if(digits.length===10)return "+1"+digits;
  if(digits.length===11&&digits.startsWith("1"))return "+"+digits;
  return null;
}
export default function VerifyDemoPhone({user,number,onVerified}) {
  const [stage,setStage]=useState("start");
  const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const verifyRef=useRef(null);
  const captchaRef=useRef(null);
  useEffect(()=>()=>{verifyRef.current?.clear().catch(()=>{});verifyRef.current=null;},[]);
  const currentNumber=e164(number);
  const isLinked=Boolean(currentNumber&&currentNumber===user?.phoneNumber);
  async function sendCode(){
    setBusy(true);setError("");
    try{
      if(!auth?.currentUser||!currentNumber)throw Error("Enter a valid US mobile number first.");
      if(auth.currentUser.phoneNumber===currentNumber){onVerified?.();return;}
      if(auth.currentUser.phoneNumber&&auth.currentUser.phoneNumber!==currentNumber)throw Error("Another phone number is linked to this account. Change it through your account security settings before starting a demo.");
      if(!verifyRef.current){
        verifyRef.current=new RecaptchaVerifier(auth,"fugth-demo-recaptcha",{size:"normal",callback:()=>setError("")});
      }
      const confirmation=await linkWithPhoneNumber(auth.currentUser,currentNumber,verifyRef.current);
      captchaRef.current=confirmation;
      setStage("code");
    }catch(e){setError(e?.code==="auth/operation-not-allowed"?"FUGTH phone verification is not yet enabled. Please contact support.":e.message||"Could not send verification code.");}
    finally{setBusy(false);}
  }
  async function confirmCode(event){
    event.preventDefault();setBusy(true);setError("");
    try{
      if(!/^\d{6}$/.test(code))throw Error("Enter the six-digit text message code.");
      if(!captchaRef.current)throw Error("Request a new code.");
      await captchaRef.current.confirm(code);
      await auth.currentUser.getIdToken(true);
      setStage("done");
      onVerified?.();
    }catch(e){setError(e.message||"Invalid verification code.");}
    finally{setBusy(false);}
  }
  if(isLinked||stage==="done")return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950">✓ This number is verified for your FUGTH account.</div>;
  return <div className="rounded-xl border border-zinc-200 bg-white p-4">
    <p className="text-xs font-black uppercase tracking-wider text-zinc-600">One-time phone ownership verification</p>
    <p className="mt-2 text-xs leading-6 text-zinc-600">To prevent unwanted automated calls, FUGTH sends an SMS code and only calls the number you verify on your account. Standard carrier messages or verification charges may apply.</p>
    {stage==="start" ? <>
      <div id="fugth-demo-recaptcha" className="mt-3 min-h-16 max-w-full overflow-x-auto"/>
      <button type="button" disabled={busy||!currentNumber} onClick={sendCode} className="mt-3 rounded-lg border border-zinc-950 bg-white px-4 py-2.5 text-xs font-black text-zinc-900 disabled:opacity-40">{busy?"Sending...":"Verify number by text →"}</button>
    </>:
      <form onSubmit={confirmCode} className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={code} required inputMode="numeric" autoComplete="one-time-code" maxLength={6} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="6-digit code" className="min-w-0 flex-1 rounded-lg border border-zinc-300 p-3 text-base text-zinc-950"/><button disabled={busy} className="rounded-lg bg-zinc-950 px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Verifying...":"Confirm code"}</button></form>}
    {error&&<p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  </div>;
}