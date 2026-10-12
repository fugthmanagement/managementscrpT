"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
async function authHeaders(){const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Sign in first.");return {Authorization:`Bearer ${token}`};}
export default function WebhookIntegration(){
  const [status,setStatus]=useState({configured:false,connected:false}),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function refresh(){try{const r=await fetch("/api/integrations/webhook",{headers:await authHeaders()});if(r.ok)setStatus(await r.json());}catch(e){setError(e.message);}}
  useEffect(()=>{refresh();},[]);
  async function create(){
    setBusy(true);setError("");try{
      if(status.connected&&!window.confirm("Rotate the webhook key? Existing integrations will stop working until you update their credentials."))return;
      const r=await fetch("/api/integrations/webhook",{method:"POST",headers:await authHeaders()});const data=await r.json();
      if(!r.ok)throw Error(data.error||"Failed to generate connector.");
      setResult(data);await refresh();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function disable(){
    if(!window.confirm("Disable the webhook and reject incoming integrations?"))return;setBusy(true);
    try{const r=await fetch("/api/integrations/webhook",{method:"DELETE",headers:await authHeaders()});if(!r.ok)throw Error("Could not disable.");setResult(null);await refresh();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="rounded-[1.6rem] border border-white/10 bg-[#172438] p-6 text-white sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.17em] text-indigo-200">Universal bridge</p><h3 className="mt-3 text-xl font-black">Secure Inbound Webhooks</h3><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">Use Zapier, Make, a custom app, or an existing booking system to send new leads and appointment requests to your Fugth CRM through a private authenticated endpoint.</p></div><span className="rounded-full bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-200">{status.connected?"Enabled":status.configured?"Available":"Server setup needed"}</span></div>
    <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy||!status.configured} onClick={create} className="rounded-xl bg-blue-300 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{busy?"Updating...":status.connected?"Rotate integration key":"Generate integration key"}</button>{status.connected&&<button disabled={busy} onClick={disable} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white">Disable</button>}</div>
    {error&&<p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
    {result&&<div className="mt-5 rounded-2xl bg-white/10 p-4"><p className="text-sm font-extrabold text-amber-200">Save this key now. It will not be displayed again.</p><p className="mt-3 text-xs font-bold text-slate-300">Webhook URL</p><div className="mt-1 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-black/30 p-2 text-xs">{result.url}</code><button className="text-sm font-bold text-blue-200" onClick={()=>navigator.clipboard?.writeText(result.url)}>Copy</button></div><p className="mt-3 text-xs font-bold text-slate-300">Private key — use as X-Fugth-Integration-Key header</p><div className="mt-1 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-black/30 p-2 text-xs">{result.key}</code><button className="text-sm font-bold text-blue-200" onClick={()=>navigator.clipboard?.writeText(result.key)}>Copy</button></div></div>}
    {status.connected&&!result&&<p className="mt-4 break-all text-xs text-slate-400">Endpoint: {status.url}. The private key is not retrievable; rotate it to create a new one.</p>}
    <details className="mt-5 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-bold">Example JSON payload and setup instructions</summary><p className="mt-4 text-xs leading-6 text-slate-400">Configure your tool to POST JSON to the webhook URL. Add the private key as the <code>X-Fugth-Integration-Key</code> header. Requests must contain a contact name, email or phone. Events are captured as leads for human review; appointment requests are not automatically confirmed.</p><pre className="mt-3 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs text-blue-100">{JSON.stringify({event_type:"lead.created",event_id:"unique-event-123",contact_name:"Customer name",phone:"+15551234567",service:"Consultation",source:"Zapier",notes:"Asked about business hours"},null,2)}</pre></details>
    <p className="mt-4 text-[11px] leading-6 text-slate-500">No healthcare or highly sensitive client records should be transmitted until your service and provider arrangements support the required privacy obligations.</p>
  </section>;
}
