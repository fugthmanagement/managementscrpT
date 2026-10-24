"use client";
import {useCallback,useEffect,useState} from "react";
import {auth} from "../lib/firebase";
import {useActiveProspect} from "../lib/client/active-prospect";
const field="mt-2 w-full rounded-xl border border-[#c6deeb] bg-white px-3 py-3 text-sm text-[#1c4055]";
const btn="rounded-xl border border-[#b9d8e7] bg-white px-4 py-3 text-xs font-black text-[#205a77] disabled:opacity-40";
export default function FounderDomainLaunch({user}){
 const [active]=useActiveProspect(user?.uid);
 const [config,setConfig]=useState({apiUser:"",clientIp:"",sandbox:true,configured:false}),[apiKey,setApiKey]=useState("");
 const [domain,setDomain]=useState(""),[ownership,setOwnership]=useState("client_owned"),[hosting,setHosting]=useState("isolated");
 const [launch,setLaunch]=useState(null),[check,setCheck]=useState(null),[readiness,setReadiness]=useState(null);
 const [busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 const req=useCallback(async body=>{
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error("Sign in as FUGTH founder.");
  const write=Boolean(body);
  const res=await fetch("/api/dev/domain-launch"+(!write&&active?"?prospectId="+encodeURIComponent(active):""),{
   method:write?"POST":"GET",cache:"no-store",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   ...(write?{body:JSON.stringify(body)}:{})});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(j.error||"Domain operation failed.");
  return j;
 },[active]);
 const refresh=useCallback(async()=>{
  try{const j=await req();setConfig(j.namecheap||{apiUser:"",clientIp:"",sandbox:true});setLaunch(j.launch||null);
   setReadiness(j.readiness||null);
   if(j.launch){setDomain(j.launch.domain||"");setOwnership(j.launch.ownership||"client_owned");setHosting(j.launch.hosting||"isolated");}
   setNotice("");
  }catch(e){setNotice(e.message)}
 },[req]);
 useEffect(()=>{refresh()},[refresh]);
 async function action(type,body){
  setBusy(type);setNotice("");
  try{const result=await req({action:type,...body});setNotice(result.note||result.next||"Domain action completed.");
   if(type==="configure"){setApiKey("");setConfig(result.namecheap);}
   if(type==="check")setCheck(result.result);
   if(type==="stage"){setLaunch(result.launch);setReadiness(result.readiness);}
  }catch(e){setNotice(e.message)}finally{setBusy("")}
 }
 return <section className="space-y-5 rounded-[24px] border border-[#cfe3ed] bg-white p-5 text-[#254b60] sm:p-7">
  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#6b9bb4]">Founder / domains / launch operations</p>
   <h3 className="mt-2 text-2xl font-black">Namecheap + Website Launch</h3>
   <p className="mt-2 text-xs leading-6 text-[#6b899a]">Prepare a client's domain and inspect Namecheap availability from Administration. Purchasing is never automatic: domain registration, DNS activation and isolated hosting need explicit approval before go-live.</p>
  </div>
  <div className="rounded-2xl border border-[#deebf1] bg-[#f2f9fd] p-4">
   <strong className="text-sm">1. Secure Namecheap API connection</strong>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">Namecheap username<input className={field} autoComplete="off" value={config.apiUser||""} onChange={e=>setConfig(x=>({...x,apiUser:e.target.value}))}/></label>
    <label className="text-xs font-bold">Whitelisted static outbound IPv4<input className={field} value={config.clientIp||""} onChange={e=>setConfig(x=>({...x,clientIp:e.target.value}))} placeholder="Static outbound IPv4 address"/></label>
    <label className="text-xs font-bold sm:col-span-2">API key (encrypted server-side; never redisplayed)<input className={field} type="password" autoComplete="new-password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={config.configured?"Leave empty to keep stored key":"Paste API key from Namecheap → Profile → Tools"}/></label>
    <label className="flex items-center gap-2 text-xs font-bold sm:col-span-2"><input type="checkbox" checked={config.sandbox!==false} onChange={e=>setConfig(x=>({...x,sandbox:e.target.checked}))}/> Use Namecheap Sandbox (recommended until production is approved)</label>
   </div>
   <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!!busy} className={btn} onClick={()=>action("configure",{apiUser:config.apiUser,clientIp:config.clientIp,sandbox:config.sandbox,apiKey})}>{config.configured?"Update secure connection":"Save secure connection"}</button>
    <a className={btn} target="_blank" rel="noopener noreferrer" href="https://www.namecheap.com/support/api/intro/">Namecheap setup guide ↗</a></div>
   <p className="mt-3 text-[11px] leading-5 text-[#648398]">Namecheap only accepts allowlisted IPv4 addresses. Standard Vercel functions use changing outbound IPs; use verified Static IPs or a dedicated egress service before expecting Namecheap requests to work reliably. No key is exposed in GET responses.</p>
  </div>
  <div className="rounded-2xl border border-[#deebf1] bg-white p-4">
   <strong className="text-sm">2. Stage the selected prospect's domain</strong>
   <p className="mt-2 text-xs">Active prospect ID: <strong className="font-mono">{active||"Select a prospect in Cold Calling first"}</strong></p>
   <label className="mt-3 block text-xs font-bold">Requested domain<input className={field} value={domain} onChange={e=>{setDomain(e.target.value);setCheck(null)}} placeholder="businessname.com"/></label>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">Who owns the domain?<select className={field} value={ownership} onChange={e=>setOwnership(e.target.value)}><option value="client_owned">Customer already owns it</option><option value="new_purchase">New Namecheap purchase planned</option></select></label>
    <label className="text-xs font-bold">Hosting boundary<select className={field} value={hosting} onChange={e=>setHosting(e.target.value)}><option value="isolated">Separate customer hosting (recommended)</option><option value="managed">Shared FUGTH hosting (higher shared risk)</option></select></label>
   </div>
   <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!!busy||!domain||!config.configured} className={btn} onClick={()=>action("check",{domain})}>Check Namecheap availability</button>
    <button type="button" disabled={!!busy||!active||!domain} className="rounded-xl bg-[#194a64] px-4 py-3 text-xs font-black text-white disabled:opacity-40" onClick={()=>action("stage",{prospectId:active,domain,ownership,hosting})}>Save domain launch plan</button></div>
   {check&&<p className="mt-3 rounded-xl bg-[#f0f8fc] p-3 text-xs">{check.domain}: <strong>{check.available?"Available":"Not available"}</strong> · {check.sandbox?"Sandbox result only":"Live availability"} · {check.premium?"Premium domain":"Standard pricing check required"}.</p>}
   {launch&&<div className="mt-4 rounded-xl bg-[#f3f9fd] p-4 text-xs leading-6"><strong>Saved domain launch plan: {launch.domain}</strong><p>Status: {launch.status} · No domain has been purchased, connected, or published by this action.</p><p>Next: inspect Vercel's exact domain records, configure DNS, verify SSL and test an independently hosted website before marking it live.</p></div>}
  </div>
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
   <strong>3. Publication gates — intentionally locked</strong>
   <p>API credentials: {config.configured?"Stored":"Not connected"} · Vercel domain API: {readiness?.vercelApiConfigured?"Configured":"Not yet configured"} · Domain hosting/router: Not yet verified · Automatic purchase: Disabled.</p>
   <p>Do not point a customer domain to the FUGTH management app until a dedicated public-site route or separate website deployment has been verified; otherwise visitors may see the FUGTH dashboard instead of their business.</p>
   <a href="https://vercel.com/docs/domains/set-up-custom-domain" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold underline">Vercel domain and SSL instructions ↗</a>
  </div>
  {notice&&<p role="status" className="rounded-xl border border-[#c9e2ee] bg-[#f2faff] p-4 text-xs leading-6">{notice}</p>}
 </section>;
}
