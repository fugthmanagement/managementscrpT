"use client";
import {useMemo,useState} from "react";
const field="w-full rounded-xl border border-[#c6dce7] bg-white px-4 py-3 text-sm text-[#20435b] focus:border-[#55a6d0] focus:outline-none";
const scripts=[
 {id:"referral",name:"01 · Pierre's original",type:"Relationship-led",
  premise:"Use a referral only when the contact actually referred you. Never invent a mutual acquaintance.",
  opener:"Hey, is this {business}? I was talking with {referral} about local businesses and thought I should give you a quick call. Are you the owner?",
  bridge:"I'm Pierre from FUGTH. I've been putting together website previews for small businesses. I wanted to show you an idea for {business}—no obligation.",
  yes:"Great. What email should I send the concept to? It takes two minutes to look through.",
  no:"No pressure. Is the website already doing everything you want, or is improving it just not a priority right now?",
  busy:"Understood. Would you prefer a single email with the preview or a better time to reach you?",
  close:"Would Tuesday or Thursday be better for a quick 15-minute walkthrough after you receive the link?"
 },
 {id:"preview",name:"02 · Website already prepared",type:"Show, don't pitch",
  premise:"Only say a website concept is already prepared if you have genuinely made one.",
  opener:"Hi, is this {business}? I'm Pierre. I put together a sample design showing how {business} could look online. Can I tell you why I called?",
  bridge:"I noticed a few opportunities to make the business easier to contact. I made a concept—nothing has been published in your name.",
  yes:"I'd love to show you what I changed. What's a good business email for the private preview?",
  no:"Of course. Is a redesign simply not useful right now, or would a different approach be worth seeing later?",
  busy:"I can send it for whenever you've got a moment. What's the best business email?",
  close:"If the preview looks promising, can we schedule 15 minutes to see what you would change?"
 },
 {id:"missed-calls",name:"03 · Missed-call recovery",type:"Outcome-led",
  premise:"Never claim this specific business is missing calls without evidence.",
  opener:"Hey, are you the owner at {business}? Quick question: when you're busy on a job, what happens to calls you can't answer?",
  bridge:"FUGTH helps businesses capture caller details and appointment requests, even when the team can't pick up. We also have website tools that fit into that workflow.",
  yes:"Would you be open to a quick demo call based on {business}'s services? I can send the link and keep it under 15 minutes.",
  no:"Fair enough. Sounds like calls are handled well. How are leads from your website following up right now?",
  busy:"No problem. Would you rather get a 30-second overview by email and decide from there?",
  close:"Let's test it with a real example. Is Wednesday afternoon or Friday morning better for a demo?"
 },
 {id:"audit",name:"04 · Permission-based audit",type:"Low-pressure",
  premise:"Offer a genuine free audit; don't imply a completed audit already exists.",
  opener:"Hi, I'm Pierre with FUGTH. Could I ask one quick question about the way {business} gets online inquiries?",
  bridge:"I've been looking at how service businesses handle website requests and callbacks. I offer a free 15-minute review to show what might be improved.",
  yes:"Perfect. What's the best email to send a short outline and two time options?",
  no:"Absolutely. Before I go, is it mostly that you're already covered, or just not the right time?",
  busy:"I can make this easy: one email with an example and no follow-up unless you're interested.",
  close:"Could I put a 15-minute review on the calendar for early next week?"
 },
 {id:"local-services",name:"05 · Local growth",type:"Service-focused",
  premise:"Don't make claims about competitor performance or the prospect's website you haven't verified.",
  opener:"Hi, I work with local service businesses and wanted to ask: do most of {business}'s new inquiries come by phone, referrals, or the website?",
  bridge:"My platform connects a polished business site, lead tracking, and appointment requests so customer inquiries don't get separated.",
  yes:"I'd like to put together a short example based on what you do. Where should I send it?",
  no:"Understood. Which part of getting new inquiries is working best for you right now?",
  busy:"I can send a one-minute explanation and you can decide whether it's worth a conversation.",
  close:"If the example matches how you work, how about a 15-minute walkthrough next week?"
 }
];
export const pitchOptions=scripts.map(({id,name})=>({id,name}));
const replace=(text,lead,referral)=>text.replaceAll("{business}",lead?.business||lead?.businessName||"your business").replaceAll("{referral}",referral||"someone who knows the area");
function TextSnippet({label,text}){return <div className="rounded-xl border border-[#ddeaf2] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#397e9e]">{label}</p><p className="mt-2 text-sm leading-6 text-[#27475b]">{text}</p></div>}
export default function FounderPitchSwitcher({lead={},value="referral",onChange}){
 const [referral,setReferral]=useState("");
 const [branch,setBranch]=useState("yes");
 const script=useMemo(()=>scripts.find(s=>s.id===value)||scripts[0],[value]);
 const originalWithoutReferral=value==="referral"&&!referral.trim();
 const opener=originalWithoutReferral?
  "Hey, is this "+(lead.business||lead.businessName||"your business")+"? I'm Pierre from FUGTH Management. May I speak to the owner for a quick business question?":
  replace(script.opener,lead,referral);
 return <section className="rounded-[24px] border border-[#c7dfea] bg-[#f1f9fd] p-5 sm:p-6">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#438bad]">Call approach selector · 5 tested conversations to practice</p><h3 className="mt-2 text-xl font-black tracking-[-.035em] text-[#1d4055]">Match the pitch to the person.</h3></div><label className="min-w-[230px] flex-1 text-xs font-bold text-[#47728c] sm:max-w-[340px]">Approach<select className={"mt-2 "+field} value={script.id} onChange={e=>{onChange?.(e.target.value);setBranch("yes")}}>{scripts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-[#dceefa] px-3 py-1.5 font-bold text-[#2d7597]">{script.type}</span><p className="max-w-2xl leading-5 text-[#6e8797]">{script.premise}</p></div>
  {value==="referral"&&<label className="mt-4 block max-w-md text-xs font-bold text-[#4a7189]">Real referral name (optional)<input placeholder="Only enter a genuine referral" value={referral} onChange={e=>setReferral(e.target.value)} className={"mt-2 "+field}/></label>}
  <div className="mt-5 grid gap-3 md:grid-cols-2"><TextSnippet label="1 · First words" text={opener}/><TextSnippet label="2 · Transition" text={replace(script.bridge,lead,referral)}/></div>
  <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-2 text-[11px] font-black text-[#547e97]">They respond:</span>{[["yes","Interested"],["no","Not interested"],["busy","Busy"]].map(([id,label])=><button type="button" key={id} onClick={()=>setBranch(id)} className={"rounded-full px-4 py-2 text-xs font-bold "+(branch===id?"bg-[#1b3f54] text-white":"bg-white text-[#60839a]")}>{label}</button>)}</div>
  <div className="mt-3 rounded-xl border border-[#add9ee] bg-[#e3f4fe] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#397d9e]">3 · Your next response</p><p className="mt-2 text-sm font-semibold leading-6 text-[#244b62]">{replace(script[branch],lead,referral)}</p></div>
  <div className="mt-3 rounded-xl bg-[#183649] p-4 text-white"><p className="text-[10px] font-black uppercase tracking-wider text-[#a7d4ec]">4 · Close to an email and appointment</p><p className="mt-2 text-sm leading-6">{replace(script.close,lead,referral)}</p></div>
  <p className="mt-3 text-[11px] leading-5 text-[#708b9b]">Use the original branching conversion map below for responses, objections, and CRM notes. Save the chosen approach with your prospect; don't continue contacting anyone who asks you to stop.</p>
 </section>;
}
