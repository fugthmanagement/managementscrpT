"use client";
import {useEffect,useState} from "react";
import {auth} from "../lib/firebase";
const field="w-full rounded-xl border border-[#e4d9cb] bg-white p-2.5 text-sm text-[#473b2f]";
const dollars=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
const initial={max:100,website:10,starter:17,essential:0,growth:12,elite:13,minutes:0.15,webMinutes:0,starterMinutes:300,essentialMinutes:300,growthMinutes:800,eliteMinutes:2000,employees:0,salary:2500,monthlySales:12,commission:75,overhead:500};
const tiers=[["website","Managed website",59],["starter","Founding Essential",149],["essential","Essential",199],["growth","Growth",399],["elite","Elite",799]];
export default function FounderRevenuePlanner(){
 const [mode,setMode]=useState("shadow"),[settings,setSettings]=useState(initial),[loaded,setLoaded]=useState(false),[live,setLive]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7)),[expense,setExpense]=useState({title:"",category:"other",amount:""});
 useEffect(()=>{try{const x=JSON.parse(localStorage.getItem("fugth-founder-shadow-v2")||"null");if(x&&typeof x==="object")setSettings({...initial,...x});}catch{}setLoaded(true);},[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem("fugth-founder-shadow-v2",JSON.stringify(settings));}catch{}},[loaded,settings]);
 const set=(name,n)=>setSettings(o=>({...o,[name]:Math.max(0,Number(n)||0)}));
 const customers=tiers.reduce((a,[key])=>a+settings[key],0),revenue=tiers.reduce((a,[key,,cost])=>a+settings[key]*cost,0);
 const voiceCost=(settings.starter*settings.starterMinutes+settings.essential*settings.essentialMinutes+settings.growth*settings.growthMinutes+settings.elite*settings.eliteMinutes+settings.website*settings.webMinutes)*settings.minutes;
 const payroll=settings.employees*settings.salary,commissions=settings.monthlySales*settings.commission,projectedExpenses=voiceCost+payroll+commissions+settings.overhead;
 const actualExpenses=(live?.expenses||[]).reduce((a,x)=>a+x.amountCents,0)/100;
 async function request(method="GET",body,query=""){
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error("Founder login is required.");
  const res=await fetch("/api/dev/finance"+query,{method,cache:"no-store",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"Finance service is unavailable.");return data;
 }
 async function refresh(){setBusy(true);setError("");try{setLive(await request("GET",null,"?month="+encodeURIComponent(month)));}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(mode==="live")refresh();},[mode,month]);
 async function addExpense(e){e.preventDefault();setBusy(true);setError("");try{
  const amountCents=Math.round(Number(expense.amount)*100);if(!expense.title.trim()||!Number.isSafeInteger(amountCents)||amountCents<0)throw Error("Enter an expense and a valid dollar amount.");
  await request("POST",{...expense,month,amountCents});setExpense({title:"",category:"other",amount:""});setLive(await request("GET",null,"?month="+encodeURIComponent(month)));
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function removeExpense(id){if(!window.confirm("Delete this recorded expense?"))return;setBusy(true);try{await request("DELETE",null,"?id="+encodeURIComponent(id));setLive(await request("GET",null,"?month="+encodeURIComponent(month)));}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="rounded-[28px] border border-[#e8ddcd] bg-[#fffdf8] p-5 text-[#443a30] sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9a8465]">FUGTH FOUNDER / FINANCIAL COMMAND CENTER</p><h3 className="mt-2 text-2xl font-semibold">Revenue, costs & projections</h3><p className="mt-2 text-xs leading-6 text-[#847565]">Real Stripe subscriptions and a separate, editable forecast. Simulated numbers never change customer accounts.</p></div>
  <div className="flex rounded-xl border border-[#e3d6c4] bg-[#f4ece0] p-1"><button className={"rounded-lg px-4 py-2.5 text-xs font-bold "+(mode==="shadow"?"bg-[#4b4135] text-white":"text-[#716452]")} onClick={()=>setMode("shadow")}>Shadow estimate</button><button className={"rounded-lg px-4 py-2.5 text-xs font-bold "+(mode==="live"?"bg-[#4b4135] text-white":"text-[#716452]")} onClick={()=>setMode("live")}>Live business</button></div></div>
  {mode==="shadow"?<>
   <div className="mt-6 grid gap-3 sm:grid-cols-4">{[["Customers",customers],["Monthly recurring",dollars(revenue)],["Estimated costs",dollars(projectedExpenses)],["Estimated balance",dollars(revenue-projectedExpenses)]].map(([label,v])=><div key={label} className="rounded-2xl border border-[#e9dfd1] bg-[#f7f1e7] p-4"><p className="text-xs text-[#80715f]">{label}</p><p className="mt-3 break-words text-xl font-semibold">{v}</p></div>)}</div>
   <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">Customer mix</h4><label className="text-xs font-semibold">Maximum per slider <input type="number" min="1" max="100000" className={"ml-2 w-24 "+field} value={settings.max} onChange={e=>set("max",Math.min(100000,Number(e.target.value)||1))}/></label></div>
   <div className="mt-4 grid gap-4 md:grid-cols-2">{tiers.map(([key,label,price])=><div key={key} className="rounded-xl border border-[#e5dacc] bg-white p-4"><div className="flex justify-between text-sm"><span>{label} · {"$"+price+"/mo"}</span><strong>{settings[key]} accounts</strong></div><input aria-label={label+" customers"} type="range" min="0" max={Math.max(1,settings.max,settings[key])} value={settings[key]} onChange={e=>set(key,e.target.value)} className="mt-4 w-full accent-[#5e503f]"/></div>)}</div>
   <h4 className="mt-7 font-semibold">Operating expenses</h4>
   <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
    ["minutes","Voice cost per minute ($)"],["starterMinutes","Founding included minutes"],["essentialMinutes","Essential included minutes"],["growthMinutes","Growth included minutes"],["eliteMinutes","Elite included minutes"],
    ["employees","Salaried employees"],["salary","Monthly salary per employee ($)"],["monthlySales","Monthly new sales"],["commission","Commission per sale ($)"],["overhead","Software, rent, other costs ($)"]
   ].map(([key,label])=><label key={key} className="text-xs font-semibold">{label}<input type="number" min="0" step={key==="minutes"?"0.01":"1"} className={"mt-2 "+field} value={settings[key]} onChange={e=>set(key,e.target.value)}/></label>)}</div>
   <div className="mt-4 rounded-xl bg-[#f4ede3] p-4 text-sm"><p>Annualized recurring revenue: <strong>{dollars(revenue*12)}</strong></p><p className="mt-2">Estimated voice: {dollars(voiceCost)} · Payroll: {dollars(payroll)} · Commissions: {dollars(commissions)} · Other: {dollars(settings.overhead)}</p></div>
   <div className="mt-4 flex justify-end"><button className="rounded-xl border border-[#cbbca5] px-4 py-2 text-xs font-semibold" onClick={()=>{if(window.confirm("Reset only your simulated forecast?"))setSettings(initial);}}>Reset scenario</button></div>
   <p className="mt-2 text-[11px] text-[#91836f]">Saved locally on this browser. Voice rates and plan usage are estimates, not actual costs or net profit.</p>
  </>:<>
   <div className="mt-6 flex flex-wrap items-end justify-between gap-3"><label className="text-xs font-semibold">Expense month <input type="month" className={"mt-2 "+field} value={month} onChange={e=>setMonth(e.target.value)}/></label><button type="button" onClick={refresh} disabled={busy} className="rounded-xl bg-[#4b4135] px-4 py-3 text-xs font-bold text-white">{busy?"Checking…":"Refresh Stripe & expenses"}</button></div>
   {live&&<><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Active paid subscriptions",live.subscriptions.activeCount],["Stripe recurring run-rate",dollars(live.subscriptions.mrrCents/100)],["Recorded "+month+" expenses",dollars(actualExpenses)]].map(([l,v])=><div key={l} className="rounded-2xl bg-[#f4ede3] p-4"><p className="text-xs text-[#806f5a]">{l}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>)}</div>
   <p className="mt-4 text-xs text-[#8c7a63]">Stripe status: {live.stripeReady?"Connected":"Unavailable"} · Expense database: {live.storageReady?"Connected":"Unavailable"}{live.subscriptions.partial?" · Partial subscription list":""}. MRR is a current run-rate, not settled revenue. Manual expenses do not equal all costs.</p>
   {live.warnings?.map((w,i)=><p key={i} className="mt-1 text-xs text-[#965d37]">{w}</p>)}</>}
   <form onSubmit={addExpense} className="mt-5 grid gap-3 rounded-xl border border-[#e4d9cb] bg-white p-4 sm:grid-cols-[1fr_160px_120px_auto]"><label className="text-xs font-semibold">Expense description<input className={"mt-2 "+field} value={expense.title} maxLength="120" required onChange={e=>setExpense({...expense,title:e.target.value})} placeholder="Voice credits, wages…"/></label><label className="text-xs font-semibold">Type<select className={"mt-2 "+field} value={expense.category} onChange={e=>setExpense({...expense,category:e.target.value})}>{["other","voice","payroll","commission","software","rent","hardware","marketing"].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="text-xs font-semibold">Amount ($)<input type="number" step="0.01" min="0" required className={"mt-2 "+field} value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})}/></label><button disabled={busy} className="self-end rounded-xl bg-[#4b4135] px-4 py-3 text-xs font-bold text-white">Save expense</button></form>
   <div className="mt-4 max-h-64 divide-y divide-[#ece2d5] overflow-y-auto">{live?.expenses?.map(e=><div key={e.id} className="flex items-center justify-between gap-3 py-3 text-xs"><div><strong>{e.title}</strong><span className="ml-2 text-[#93836f]">{e.category}</span></div><div className="flex items-center gap-3"><strong>{dollars(e.amountCents/100)}</strong><button onClick={()=>removeExpense(e.id)} disabled={busy} className="text-[#a34438] underline">Remove</button></div></div>)}</div>
  </>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-[#fff0e3] p-3 text-xs text-[#995737]">{error}</p>}
 </section>;
}
