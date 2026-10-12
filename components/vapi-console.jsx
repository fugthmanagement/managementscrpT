"use client";
import { useState } from "react";
import { auth } from "../lib/firebase";
function Group({title,description,data,children}){return <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><div className="flex items-center justify-between gap-3"><div><h4 className="font-black text-zinc-950">{title}</h4><p className="mt-1 text-xs text-zinc-600">{description}</p></div><span className="rounded-full bg-zinc-200 px-3 py-1.5 text-xs font-extrabold text-zinc-700">{data?.items?.length||0}</span></div><div className="mt-4 space-y-2">{data?.error?<p className="text-sm text-amber-800">{data.error}</p>:(data?.items||[]).length?data.items.map(children):<p className="text-sm text-zinc-500">No records returned.</p>}</div></section>}
export default function VapiConsole(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState(null);
  async function load(){
    setBusy(true);setError("");
    try{
      const token=await auth.currentUser?.getIdToken();
      if(!token)throw Error("Sign in as an authorized founder.");
      const res=await fetch("/api/dev/vapi",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const data=await res.json();if(!res.ok)throw Error(data.error||"Failed to read Vapi.");
      setResult(data);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-950 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-zinc-700">Founder · Voice infrastructure</p><h3 className="mt-3 text-2xl font-black">Vapi Operations</h3><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">View assistants, phone numbers and recent call statuses from the Vapi account already configured in Vercel. Only authorized founder accounts can access this endpoint.</p></div><button onClick={load} disabled={busy} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy?"Loading Vapi...":result?"Refresh Vapi":"Load Vapi account"}</button></div>
    {error&&<div role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {result&&<div className="mt-6 grid gap-4 lg:grid-cols-3">
      <Group title="Voice Assistants" description="Saved Vapi agents" data={result.assistants}>{a=><div key={a.id} className="rounded-xl bg-white p-3"><p className="text-sm font-extrabold">{a.name}</p><p className="mt-1 text-xs text-zinc-600">{a.model} · {a.voice}</p><p className="mt-1 break-all text-[10px] text-zinc-500">{a.id}</p></div>}</Group>
      <Group title="Phone Numbers" description="Connected calling lines" data={result.numbers}>{n=><div key={n.id} className="rounded-xl bg-white p-3"><p className="text-sm font-extrabold">{n.number||n.name||"Number"}</p><p className="mt-1 text-xs text-zinc-600">{n.name}</p><p className="mt-1 break-all text-[10px] text-zinc-500">{n.id}</p></div>}</Group>
      <Group title="Recent Calls" description="Latest status reports" data={result.calls}>{c=><div key={c.id} className="rounded-xl bg-white p-3"><p className="text-sm font-extrabold">{c.status||"Call"} · {c.type||"voice"}</p><p className="mt-1 text-xs text-zinc-600">{c.startedAt?new Date(c.startedAt).toLocaleString():"No start time"}</p><p className="mt-1 break-all text-[10px] text-zinc-500">{c.id}</p></div>}</Group>
    </div>}
    <p className="mt-5 text-xs text-zinc-500">This panel is read-only. It doesn't create calls, spend voice credits, or modify assistants.</p>
  </section>;
}
