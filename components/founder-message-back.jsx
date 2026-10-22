"use client";
import {useEffect,useState} from "react";
import {doc,getDoc,setDoc,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {TEXTBACK_DEFAULT_TEMPLATE,renderTextbackMessage,normalizeUsPhone} from "../lib/missed-call-textback";
const style="mt-2 w-full rounded-xl border border-[#d1e1eb] bg-white p-3 text-xs text-[#22465d]";
export default function FounderMessageBack(){
 const [settings,setSettings]=useState({businessName:"",template:TEXTBACK_DEFAULT_TEMPLATE,
  fromNumber:"",phoneNumberId:"",enabled:false,autoSend:false,
  a2pRegistered:false,optOutHandlingVerified:false,consentRecorded:false,
  bookingUrl:"",blockedNumbers:[]});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [health,setHealth]=useState(null);
 async function refresh(){
  const uid=auth.currentUser?.uid;
  if(!uid||!db)return;
  try{
   const p=await getDoc(doc(db,"users",uid,"knowledge","missed-call-settings"));
   if(p.exists())setSettings(v=>({...v,...p.data(),enabled:p.data().enabled===true,
    autoSend:p.data().autoSend===true}));
  }catch(e){setMessage("Could not read settings: "+e.message)}
 }
 useEffect(()=>{refresh();fetch("/api/dev/textback-health",{headers:auth.currentUser?{Authorization:"Bearer "+(auth.currentUser.accessToken||"")}:{},cache:"no-store"}).then(r=>r.json()).then(setHealth).catch(()=>{});},[]);
 const set=(field,val)=>setSettings(v=>({...v,[field]:val}));
 async function save(){
  setBusy(true);setMessage("");
  try{
   const uid=auth.currentUser?.uid;
   if(!uid||!db)throw Error("Sign in with the verified FUGTH founder account.");
   const from=settings.fromNumber?normalizeUsPhone(settings.fromNumber):"";
   if(settings.fromNumber&&!from)throw Error("Enter a valid U.S. SMS business number.");
   if(settings.autoSend)throw Error("Automatic sending isn't enabled in this release. Finish provider registration, consent handling and a real test before switching it on.");
   await setDoc(doc(db,"users",uid,"knowledge","missed-call-settings"),{
    businessName:String(settings.businessName||"").trim().slice(0,90),
    template:String(settings.template||"").trim().slice(0,500),
    fromNumber:from||"",phoneNumberId:String(settings.phoneNumberId||"").trim().slice(0,128),
    bookingUrl:String(settings.bookingUrl||"").trim().slice(0,250),
    enabled:settings.enabled===true,autoSend:false,
    a2pRegistered:false,optOutHandlingVerified:false,consentRecorded:false,
    blockedNumbers:[],updatedAt:serverTimestamp()
   },{merge:true});
   setMessage("✓ Text-back settings saved directly to your founder's Firestore account. Live sending stays disabled until the verified phone/SMS provider and STOP compliance are connected.");
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 const preview=renderTextbackMessage(settings.template,{business:settings.businessName||"your business",callerName:"there",bookingUrl:settings.bookingUrl});
 return <section className="rounded-[24px] border border-[#c7dfeb] bg-white p-5 text-[#254359] sm:p-7">
  <p className="text-[10px] font-black uppercase tracking-widest text-[#5a99bb]">FUGTH / AUTOMATION PRODUCT</p>
  <h3 className="mt-2 text-xl font-black">Missed-Call Text-Back · $49.99/month</h3>
  <p className="mt-2 text-xs leading-6 text-[#6e8997]">Standalone recurring subscription now exists in your connected Stripe merchant. Customize business messages here. A real SMS number/provider and registered messaging campaign are still required before automatic delivery can be enabled.</p>
  <div className="mt-5 grid gap-4 sm:grid-cols-2">
   <label className="text-xs font-bold">Business display name<input className={style} value={settings.businessName||""} onChange={e=>set("businessName",e.target.value)} placeholder="Champs Electric"/></label>
   <label className="text-xs font-bold">Business SMS number<input className={style} value={settings.fromNumber||""} onChange={e=>set("fromNumber",e.target.value)} placeholder="+13055550123"/></label>
   <label className="text-xs font-bold">Assigned voice number ID (optional)<input className={style} value={settings.phoneNumberId||""} onChange={e=>set("phoneNumberId",e.target.value)} placeholder="Provider phone number ID"/></label>
   <label className="text-xs font-bold">Booking URL (optional)<input className={style} value={settings.bookingUrl||""} onChange={e=>set("bookingUrl",e.target.value)} placeholder="https://..."/></label>
  </div>
  <label className="mt-4 block text-xs font-bold">Personalized text template
   <textarea rows={4} maxLength={500} className={style} value={settings.template||""} onChange={e=>set("template",e.target.value)}/>
  </label>
  <p className="mt-2 text-[11px] text-[#708da0]">Available variables: { "{business}" }, { "{caller}" }, { "{booking}" }. Required STOP instructions are appended when missing.</p>
  <div className="mt-4 rounded-xl border border-[#dce9f2] bg-[#f5fbff] p-4">
   <strong className="text-xs">Preview · No message sent</strong>
   <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{preview}</p>
  </div>
  <label className="mt-4 flex items-center gap-3 text-xs font-semibold">
   <input type="checkbox" checked={settings.enabled===true} onChange={e=>set("enabled",e.target.checked)}/>
   Offer this feature when phone service is connected
  </label>
  <p className="mt-2 text-xs leading-6 text-amber-800">Automatic sending is locked off for now. No user can trigger a provider SMS or carrier fee from this panel until verified transport, A2P registration, STOP support and consent handling are ready.</p>
  <button disabled={busy} onClick={save} className="mt-4 rounded-xl bg-[#1a5976] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">{busy?"Saving…":"Save message-back settings"}</button>
  {message&&<p className="mt-3 rounded-xl bg-[#f1f8fc] p-4 text-xs leading-6">{message}</p>}
  <p className="mt-4 text-[11px] leading-6 text-[#8397a5]">This founder configuration is a staged operational template, not a customer subscription grant. Paying users need tenant-scoped settings and verified service provisioning before live rollout.</p>
 </section>;
}
