"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const btn="rounded-xl border border-[#c5dce7] bg-white px-3 py-2.5 text-xs font-black text-[#24576f] disabled:opacity-40";
export default function FounderSiteClaims(){
 const [claims,setClaims]=useState([]),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const [verified,setVerified]=useState({}),[replace,setReplace]=useState({});
 const request=async(data=null)=>{
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in to your founder account.");
  const r=await fetch("/api/dev/demo-claim",{method:data?"POST":"GET",cache:"no-store",
   headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Ownership claim action failed.");
  return j;
 };
 async function refresh(){try{const j=await request();setClaims(j.claims||[])}catch(e){setNotice(e.message)}}
 useEffect(()=>{refresh()},[]);
 async function action(c,choice){
  if(choice==="approve"&&!verified[c.id])return setNotice("Verify this person's authority to represent the business before approving.");
  if(!confirm(choice==="approve"?"Assign this preview as the verified customer's private website draft?":"Reject this request?"))return;
  setBusy(c.id);setNotice("");
  try{
   const j=await request({action:choice,demoId:c.demoId,uid:c.uid,verifiedBusinessOwner:verified[c.id]===true,
    replaceExistingDraft:replace[c.id]===true});
   setNotice(j.message||"Claim review recorded.");await refresh();
  }catch(e){setNotice(e.message)}finally{setBusy("")}
 }
 const pending=claims.filter(x=>x.status==="pending");
 return <section className="rounded-[24px] border border-[#d2e4ed] bg-white p-5 text-[#234b62] sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#6c9cba]">FUGTH / VERIFIED BUSINESS CLAIMS</p>
   <h3 className="mt-2 text-xl font-black">Website ownership requests · {pending.length} pending</h3>
   <p className="mt-2 text-xs leading-6 text-[#7692a4]">Only grant a saved demo to an account after independently confirming the requester owns or represents that business. Public preview links are not proof of ownership.</p></div>
   <button onClick={refresh} className={btn}>Refresh claims</button>
  </div>
  {notice&&<p className="mt-4 rounded-xl bg-[#eff9fd] p-3 text-xs">{notice}</p>}
  <div className="mt-4 max-h-[450px] space-y-3 overflow-y-auto">{pending.map(c=><div className="rounded-xl border border-[#dce8ef] p-4" key={c.id}>
   <div className="flex flex-wrap justify-between gap-2"><strong>{c.businessName}</strong><span className="text-xs text-amber-800">Pending verification</span></div>
   <p className="mt-2 break-all text-xs text-[#668798]">{c.requesterEmail} · Account {c.uid}</p>
   <div className="mt-3 flex flex-wrap gap-3"><a href={"/demo/site/"+c.demoId} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#2b7fa3] underline">View independent demo ↗</a></div>
   <label className="mt-3 flex items-start gap-2 text-xs"><input type="checkbox" checked={verified[c.id]===true} onChange={e=>setVerified(v=>({...v,[c.id]:e.target.checked}))}/>
    I verified this claimant's ownership or authority through an independent channel (not just access to the public preview link).</label>
   <label className="mt-2 flex items-start gap-2 text-xs text-amber-800"><input type="checkbox" checked={replace[c.id]===true} onChange={e=>setReplace(v=>({...v,[c.id]:e.target.checked}))}/>
    Replace their current site draft if one already exists (only after reviewing it).</label>
   <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>action(c,"approve")} disabled={busy===c.id||!verified[c.id]} className="rounded-xl bg-[#1b6657] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">Approve & assign private draft</button>
    <button onClick={()=>action(c,"reject")} disabled={busy===c.id} className={btn}>Reject</button></div>
  </div>)}
  {!pending.length&&<p className="rounded-xl bg-[#f3fafc] p-4 text-xs text-[#7892a2]">No new claims to review.</p>}
  </div>
  <p className="mt-4 text-[11px] text-[#849baa]">Approval creates a private customer draft. It does not charge the customer or publish the site. Publishing still uses the customer's existing subscription and Site Maker controls.</p>
 </section>;
}
