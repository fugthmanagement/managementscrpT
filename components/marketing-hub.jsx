"use client";
import {useEffect,useState} from "react";
import {addDoc,collection,limit,onSnapshot,orderBy,query,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import FeatureGate from "./feature-gate";
import LeadDirectory from "./lead-directory";
import {hasPlan} from "../lib/plan-access";

const field="w-full rounded-xl border border-[#dfe3da] bg-white px-4 py-3 text-sm outline-none focus:border-[#52654e]";
const formatDate=value=>{try{return (value?.toDate?.()||new Date(value)).toLocaleDateString(undefined,{month:"short",day:"numeric"});}catch{return "Draft";}};

export default function MarketingHub({user,workspace,planKey,founderAdmin=false,simulating=false}){
 const [campaigns,setCampaigns]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [contacts,setContacts]=useState([]);
 const [aiGoal,setAiGoal]=useState("");
 const [delivery,setDelivery]=useState({configured:false,connected:false,reason:"Checking sender connection…"});
 const [deliveryBusy,setDeliveryBusy]=useState("");
 const [draft,setDraft]=useState({name:"Spring follow-up",audience:"Past customers",channel:"email",subject:"A quick update from our team",message:""});
 const mid=founderAdmin||hasPlan(planKey,"growth")||(!simulating&&workspace?.billingAddons?.includes("email"));
 const high=founderAdmin||hasPlan(planKey,"elite");
 useEffect(()=>{if(!db||!user?.uid)return;return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(100)),snapshot=>setCampaigns(snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.type==="marketing_campaign")));},[user?.uid]);
 useEffect(()=>{if(!db||!user?.uid)return;return onSnapshot(query(collection(db,"users",user.uid,"leads"),orderBy("createdAt","desc"),limit(500)),snapshot=>setContacts(snapshot.docs.map(item=>item.data())));},[user?.uid]);
 async function headers(){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Please sign in first.");
  return {Authorization:"Bearer "+token,"Content-Type":"application/json"};
 }
 async function checkDelivery(){
  try{
   const res=await fetch("/api/marketing/send",{headers:await headers(),cache:"no-store"});
   const data=await res.json();setDelivery(data);
  }catch{setDelivery({configured:false,connected:false,reason:"Could not check Gmail connection."});}
 }
 useEffect(()=>{checkDelivery();},[user?.uid]);
 async function connectEmail(){
  setDeliveryBusy("connect");setMessage("");
  try{
   const res=await fetch("/api/integrations/google",{method:"POST",headers:await headers()});
   const data=await res.json();if(!res.ok||!data.url)throw Error(data.error||"Google authorization unavailable.");
   window.location.assign(data.url);
  }catch(e){setMessage(e.message||"Could not connect email.");setDeliveryBusy("");}
 }
 async function sendBatch(item){
  if(!window.confirm("Send up to 10 real marketing emails from your connected Google account to opted-in contacts? Review the message and recipient consent first."))return;
  setDeliveryBusy(item.id);setMessage("");
  try{
   const res=await fetch("/api/marketing/send",{method:"POST",headers:await headers(),body:JSON.stringify({campaignId:item.id})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||"Email sending failed.");
   setMessage(data.sent+" email(s) accepted by Gmail. "+(data.failed?data.failed+" failed. ":"")+(data.notice||""));
  }catch(e){setMessage(e.message||"Could not send campaign.");}
  finally{setDeliveryBusy("");}
 }
 async function generateAI(){
  setDeliveryBusy("ai");setMessage("");
  try{
   const res=await fetch("/api/marketing/generate",{method:"POST",headers:await headers(),
    body:JSON.stringify({goal:aiGoal||draft.message||"A friendly outreach about business services",audience:draft.audience})});
   const data=await res.json().catch(()=>({});
   if(!res.ok)throw Error(data.error||"Gemini drafting failed.");
   setDraft(prev=>({...prev,subject:data.subject,message:data.message}));
   setMessage("Gemini AI draft created. Please check accuracy and consent before saving.");
  }catch(e){setMessage(e.message||"AI drafting is unavailable. Try the manual template instead.");}
  finally{setDeliveryBusy("");}
 }
 function generate(){
  const business=workspace.businessName||"our team",service=workspace.businessType||"local service";
  setDraft(current=>({...current,subject:`A helpful update from ${business}`,message:`Hi {{first_name}},\n\n${business} is checking in to see whether you need help with your next ${service} project or appointment. Reply to this message and our team will help with the next step.\n\n— ${business}`}));
  setMessage("AI-style draft created. Review every detail before using it.");
 }
 async function save(event){event.preventDefault();if(!mid)return;setBusy(true);setMessage("");try{if(!draft.name.trim()||!draft.message.trim())throw Error("Add a campaign name and message.");await addDoc(collection(db,"users",user.uid,"campaigns"),{...draft,type:"marketing_campaign",status:"draft",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});setMessage("Campaign saved as a private draft. Nothing was sent.");}catch(error){setMessage(error.message||"Could not save the draft.");}finally{setBusy(false);}}
 const optedIn=contacts.filter(c=>c.marketingOptIn===true&&c.unsubscribed!==true&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email||"")).length;
 return <div className="space-y-6">
  <LeadDirectory user={user}/>
  <section className="overflow-hidden rounded-[26px] bg-[#17251e] text-white"><div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a7c0ab]">LEAD GENERATOR + MARKETING</p><h3 className="mt-4 text-3xl font-semibold tracking-[-.06em] sm:text-5xl">Stay in front of the people who already know you.</h3><p className="mt-4 max-w-2xl text-sm leading-7 text-[#bdcbbf]">Build email and text follow-ups, keep drafts organized and turn missed opportunities into the next conversation.</p></div><div className="grid grid-cols-2 gap-3 self-end">{[["AI email",mid],["Text-back",mid],["Campaign drafts",mid],["Advanced automation",high]].map(([label,on])=><div key={label} className={`rounded-2xl border p-4 ${on?"border-[#65816b] bg-white/10":"border-white/10 bg-black/10 opacity-45"}`}><p className="text-xs font-bold">{on?"✓":"🔒"} {label}</p><p className="mt-2 text-[10px] text-white/55">{on?"Included":"Upgrade required"}</p></div>)}</div></div></section>
  {message&&<p role="status" className="rounded-xl border border-[#dbe4d7] bg-[#f1f7ef] px-4 py-3 text-sm text-[#405d42]">{message}</p>}
  <div className="rounded-[22px] border border-[#dfebdb] bg-[#eff6eb] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#72896f]">CONNECTED EMAIL DELIVERY</p><p className="mt-2 text-sm font-semibold">{delivery.connected?"Google Gmail is authorized for email sending":delivery.reason||"Connect Google for email delivery."}</p><p className="mt-2 text-xs text-[#81937e]">Campaigns send only to opted-in contacts. Maximum 10 messages per batch and 50 per day; recipients receive an unsubscribe link.</p></div>
   <button type="button" disabled={!delivery.configured||deliveryBusy!==""} onClick={connectEmail} className="rounded-xl bg-[#2d4935] px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">{delivery.connected?"Reconnect Google ↗":"Connect Google ↗"}</button>
  </div></div>
  <FeatureGate locked={!mid} title="Marketing unlocks on the Mid plan" description="AI email drafts, follow-up campaigns and text-back are visible here so customers know exactly what the upgrade adds.">
   <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><form onSubmit={save} className="rounded-[22px] border border-[#e4e7e0] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#899488]">CAMPAIGN BUILDER</p><h4 className="mt-2 text-2xl font-semibold">Create a follow-up</h4></div><div className="flex flex-wrap gap-2"><button type="button" onClick={generate} className="rounded-xl border border-[#ccd8c8] bg-[#f1f6ee] px-4 py-3 text-xs font-bold text-[#405844]">Quick template</button><button type="button" disabled={deliveryBusy!==""} onClick={generateAI} className="rounded-xl bg-[#304d37] px-4 py-3 text-xs font-bold text-white disabled:opacity-40">{deliveryBusy==="ai"?"Generating…":"Write with Gemini AI"}</button></div></div><label className="mt-5 block text-xs font-semibold">What should this email accomplish?<input placeholder="Invite customers to book a roofing estimate" value={aiGoal} onChange={e=>setAiGoal(e.target.value)} className={"mt-2 "+field}/></label><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Campaign name<input value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})} className={`mt-2 ${field}`}/></label><label className="text-xs font-semibold">Audience<select value={draft.audience} onChange={event=>setDraft({...draft,audience:event.target.value})} className={`mt-2 ${field}`}><option>Past customers</option><option>New leads</option><option>Missed calls</option><option>Estimate follow-ups</option></select></label><label className="text-xs font-semibold">Channel<select value={draft.channel} onChange={event=>setDraft({...draft,channel:event.target.value})} className={`mt-2 ${field}`}><option value="email">Email</option><option value="text">Text message</option></select></label><label className="text-xs font-semibold">Subject<input value={draft.subject} onChange={event=>setDraft({...draft,subject:event.target.value})} className={`mt-2 ${field}`}/></label><label className="text-xs font-semibold sm:col-span-2">Message<textarea value={draft.message} onChange={event=>setDraft({...draft,message:event.target.value})} className={`mt-2 min-h-44 ${field}`} placeholder="Write a useful update or generate a starting draft."/></label></div><div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={busy} className="rounded-xl bg-[#27372c] px-5 py-3 text-sm font-bold text-white">{busy?"Saving…":"Save draft"}</button><span className="text-xs text-[#8a9187]">Saving does not send. {optedIn} opted-in email contact(s) in your FUGTH CRM.</span></div></form>
    <section className="rounded-[22px] border border-[#e4e7e0] bg-white p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#899488]">SAVED WORK</p><h4 className="mt-2 text-2xl font-semibold">Campaign drafts</h4><div className="mt-5 divide-y divide-[#ebeee8]">{campaigns.length?campaigns.map(item=><article key={item.id} className="py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-[#7d857a]">{item.channel} · {item.audience}</p></div><div className="flex flex-col items-end gap-2"><span className="rounded-full bg-[#eef2eb] px-3 py-1 text-[10px] font-bold">{item.status||"draft"}</span>{item.channel==="email"&&<button type="button" disabled={!delivery.connected||deliveryBusy!==""} onClick={()=>sendBatch(item)} className="rounded-lg bg-[#2d4935] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40">{deliveryBusy===item.id?"Sending…":"Send next 10 ↗"}</button>}</div></div><p className="mt-3 line-clamp-2 text-xs leading-6 text-[#8a9187]">{item.message}</p><p className="mt-2 text-[10px] text-[#a0a69d]">{formatDate(item.createdAt)}</p></article>):<p className="py-10 text-center text-sm text-[#92998f]">No drafts yet.</p>}</div></section></div>
  </FeatureGate>
  <FeatureGate locked={!high} title="Advanced automation unlocks on High" description="High-plan businesses can add multi-step campaign logic and higher-volume workflows."><section className="rounded-[22px] border border-[#e0e6dc] bg-[#eef4eb] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#657764]">ADVANCED AUTOMATION</p><h4 className="mt-3 text-2xl font-semibold">Follow up without losing the personal touch.</h4><div className="mt-5 grid gap-3 sm:grid-cols-3">{["New lead sequence","Missed-call recovery","Estimate reminder"].map(item=><div key={item} className="rounded-xl bg-white p-4 text-sm font-semibold">{item}<p className="mt-2 text-xs font-normal text-[#80897e]">Ready for delivery-provider setup.</p></div>)}</div></section></FeatureGate>
 </div>;
}
