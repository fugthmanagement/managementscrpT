"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {onAuthStateChanged,signOut,sendEmailVerification,reload} from "firebase/auth";
import {addDoc,collection,doc,onSnapshot,query,orderBy,limit,serverTimestamp,setDoc} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import SiteStudio from "./site-studio";
import PhoneSetup from "./phone-setup";
import IntegrationsHub from "./integrations-hub";
import BookingAvailabilitySettings from "./booking-availability-settings";
import FounderSites from "./founder-sites";
import ReceptionistPreview from "./receptionist-preview";
import CallInbox from "./call-inbox";
import FounderColdCall from "./founder-cold-call";
import FounderProspectImport from "./founder-prospect-import";
import FounderRevenuePlanner from "./founder-revenue-planner";
import FounderBillingHealth from "./founder-billing-health";
import FounderVoiceHealth from "./founder-voice-health";
import FounderDemoControls from "./founder-demo-controls";
import FounderAccountDirectory from "./founder-account-directory";
import MarketingHub from "./marketing-hub";
import FeatureGate from "./feature-gate";
import {hasPlan,normalizePlan,planInfo} from "../lib/plan-access";
import {accountAccessPlan} from "../lib/plan-access";

const MENU=[
 {id:"home",label:"Home",icon:"home"},
 {id:"calls",label:"Calls",icon:"phone"},
 {id:"customers",label:"Customers",icon:"users"},
 {id:"marketing",label:"Marketing",icon:"link"},
 {id:"website",label:"Website",icon:"layout"},
 {id:"settings",label:"Settings",icon:"settings"}
];
const input="w-full rounded-xl border border-[#deded9] bg-white px-4 py-3.5 text-sm text-[#252721] outline-none transition focus:border-[#4b5345] focus:ring-2 focus:ring-[#e3e6dd] placeholder:text-[#93958e]";
const panel="rounded-[22px] border border-[#e8e8e3] bg-white";
function Symbol({name,size=19}){
 const attrs={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true};
 let paths={
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></>,
 phone:<><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.4 10a16 16 0 0 0 6.6 6.6l1.5-1.6a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/></>,
 users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m2 10v-2a6 6 0 0 0-2.5-4.9"/></>,
 layout:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .3 2-2.1 2.1-2-.3a9 9 0 0 1-2.2.9l-1.2 1.7h-3l-1.2-1.7a9 9 0 0 1-2.2-.9l-2 .3-2.1-2.1.3-2a9 9 0 0 1-.9-2.2L1 11.6v-3l1.7-1.2a9 9 0 0 1 .9-2.2l-.3-2 2.1-2.1 2 .3a9 9 0 0 1 2.2-.9L10.8 0h3l1.2 1.7a9 9 0 0 1 2.2.9l2-.3 2.1 2.1-.3 2a9 9 0 0 1 .9 2.2l1.7 1.2v3l-1.7 1.2A9 9 0 0 1 19.4 15Z" transform="translate(1.4 1.4) scale(.88)"/></>,
 admin:<><path d="M12 2 4 6v6c0 5 3.3 8.6 8 10 4.7-1.4 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></>,
 logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/></>,
 menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
 close:<><path d="M5 5 19 19M19 5 5 19"/></>,
 arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
 plus:<><path d="M12 5v14M5 12h14"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
 link:<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></>
 };
 return <svg {...attrs}>{paths[name]||paths.home}</svg>;
}
function SectionHeading({eyebrow,title,description,action}){
 return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#63d5c4]">{eyebrow}</p><h2 className="mt-2 text-[32px] font-semibold tracking-[-.06em] text-[#e9f7f7] sm:text-[40px]">{title}</h2>{description&&<p className="mt-2 max-w-2xl text-sm leading-7 text-[#a7bfc0]">{description}</p>}</div>{action}</div>;
}
function Empty({title,description,action}){return <div className="rounded-[18px] border border-dashed border-[#dbded5] bg-[#fafbf8] px-6 py-10 text-center"><p className="text-base font-semibold text-[#3c4138]">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#888b82]">{description}</p>{action&&<div className="mt-5">{action}</div>}</div>;}
function ListRecord({title,detail,meta}){return <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#ecece8] py-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#353832]">{title}</p><p className="mt-1 break-words text-xs text-[#8a8d84]">{detail}</p></div><span className="rounded-full bg-[#f1f3ed] px-3 py-1.5 text-[11px] font-medium text-[#59604f]">{meta||"New"}</span></div>}
const freshDate=v=>{if(!v)return "Recent";try{const d=v?.toDate?.()||new Date(v?.seconds?v.seconds*1000:v);return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});}catch{return "Recent"}};
export default function FugthWorkspace(){
 const [user,setUser]=useState(null),[ready,setReady]=useState(false);
 const [page,setPage]=useState("home"),[menuOpen,setMenuOpen]=useState(false);
 const [founder,setFounder]=useState(false),[capabilitiesReady,setCapabilitiesReady]=useState(false),[founderVerificationNeeded,setFounderVerificationNeeded]=useState(false),[verifiedGrant,setVerifiedGrant]=useState(null);
 const [workspace,setWorkspace]=useState({}),[calls,setCalls]=useState([]),[leads,setLeads]=useState([]),[appointments,setAppointments]=useState([]),[notifications,setNotifications]=useState([]);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState("");
 const [customerView,setCustomerView]=useState("leads");
 const [showLeadForm,setShowLeadForm]=useState(false),[showAppointmentForm,setShowAppointmentForm]=useState(false);
 const [lead,setLead]=useState({businessName:"",contactName:"",phone:"",service:"",notes:""});
 const [appointment,setAppointment]=useState({customerName:"",phone:"",service:"",date:"",time:""});
 const [profile,setProfile]=useState({businessName:"",businessType:"",serviceArea:"",hours:"",phone:"",notificationEmail:"",notificationPhone:"",callSmsAlertsEnabled:false});
 const [settingsSection,setSettingsSection]=useState("business");
 const [clientForm,setClientForm]=useState({email:"",businessName:"",businessType:"general",phone:"",serviceArea:"",hours:""});
 const [clientResult,setClientResult]=useState(null);
 const [confirmEmail,setConfirmEmail]=useState("");
 const [previewPlan,setPreviewPlan]=useState(null); // Local founder-only visual mode, never touches billing.

 useEffect(()=>{
   if(!auth){setReady(true);return;}
   return onAuthStateChanged(auth,async current=>{
     setUser(current||null);setReady(true);
     if(!current){window.location.replace("/login");return;}
     try{
       const token=await current.getIdToken();
       const res=await fetch("/api/me/access",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
       const data=await res.json().catch(()=>({}));
       setFounder(Boolean(res.ok&&data.isFounder));setFounderVerificationNeeded(Boolean(res.ok&&data.needsFounderVerification));setVerifiedGrant(res.ok?data.founderGrant||null:null);setCapabilitiesReady(true);
     }catch{setFounder(false);setCapabilitiesReady(true);}
   });
 },[]);
 useEffect(()=>{
   if(!user?.uid||!db)return;
   const uid=user.uid;
   const errors=e=>setError("Some business information could not be loaded. Please check your connection.");
   const unsub1=onSnapshot(doc(db,"users",uid),snap=>{
     const data=snap.data()||{};setWorkspace(data);
     setProfile({businessName:data.businessName||"",businessType:data.businessType||"",serviceArea:data.serviceArea||"",hours:data.hours||"",phone:data.phone||"",notificationEmail:data.notificationEmail||"",notificationPhone:data.notificationPhone||"",callSmsAlertsEnabled:data.callSmsAlertsEnabled===true});
   },errors);
   const watch=(name,setter)=>onSnapshot(query(collection(db,"users",uid,name),orderBy("createdAt","desc"),limit(60)),snap=>setter(snap.docs.map(d=>({id:d.id,...d.data()}))),errors);
   const off2=watch("calls",records=>setCalls(records.filter(c=>c.source!=="preview_quota"))),off3=watch("leads",setLeads),off4=watch("appointments",setAppointments),off5=watch("notifications",setNotifications);
   return()=>{unsub1();off2();off3();off4();off5();};
 },[user?.uid]);
 useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.has("integration")){setPage("settings");setSettingsSection("connections");}},[]);
 const tabs=founder?[...MENU,{id:"accounts",label:"Accounts",icon:"users"},{id:"admin",label:"Administration",icon:"admin"}]:MENU;
 const isSimulating=founder&&previewPlan!==null;
 const changePage=id=>{setPage(id);setMenuOpen(false);setNotice("");setError("");};
 async function logOut(){try{await signOut(auth);window.location.replace("/login");}catch{setError("Could not log out. Please retry.");}}
 async function verifyFounder(){
   setBusy("verifyFounder");setError("");setNotice("");
   try{
     if(!auth.currentUser)throw Error("Please sign in again.");
     await reload(auth.currentUser);
     if(!auth.currentUser.emailVerified){
       await sendEmailVerification(auth.currentUser);
       setNotice("Verification email sent. Open the link in your inbox, then come back and refresh the page to unlock Administration.");
     }else{
       await auth.currentUser.getIdToken(true);
       window.location.reload();
     }
   }catch(e){setError("We couldn't send or check your verification email. Please retry.");}
   finally{setBusy("");}
 }

 async function saveLead(e){e.preventDefault();setBusy("lead");setError("");
   try{if(!lead.phone.trim()&&!lead.contactName.trim())throw Error("Enter a customer name or phone number.");
     await addDoc(collection(db,"users",user.uid,"leads"),{...lead,status:"new",source:"manual",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
     setLead({businessName:"",contactName:"",phone:"",service:"",notes:""});setShowLeadForm(false);setNotice("Customer saved.");
   }catch(e){setError(e.message||"Could not add customer.");}finally{setBusy("");}
 }
 async function saveAppointment(e){e.preventDefault();setBusy("appointment");setError("");
   try{if(!appointment.customerName||!appointment.date||!appointment.time)throw Error("Add the name, date and time.");
     await addDoc(collection(db,"users",user.uid,"appointments"),{...appointment,status:"scheduled",source:"manual",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
     setAppointment({customerName:"",phone:"",service:"",date:"",time:""});setShowAppointmentForm(false);setNotice("Appointment saved.");
   }catch(e){setError(e.message||"Could not save appointment.");}finally{setBusy("");}
 }
 async function saveBusiness(e){e.preventDefault();setBusy("profile");setError("");
   try{await setDoc(doc(db,"users",user.uid),{...profile,updatedAt:serverTimestamp()},{merge:true});
     const token=await auth.currentUser?.getIdToken();
     const response=await fetch("/api/sites/"+encodeURIComponent(user.uid),{method:"PUT",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action:"regenerate"})});
     if(!response.ok)throw Error("Business details saved, but the website could not refresh. Open Website and retry Refresh from settings.");
     setNotice("Business details and your website preset are updated.");
   }
   catch(e){setError(e.message||"Unable to update business details.");}finally{setBusy("");}
 }
 async function createClient(e){e.preventDefault();setBusy("client");setError("");setClientResult(null);
  try{
    const token=await auth.currentUser.getIdToken();
    const res=await fetch("/api/dev/create-account",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({...clientForm,planTier:"none",planStatus:"inactive"})});
    const result=await res.json();
    if(!res.ok)throw Error(result.error||"Customer account could not be created.");
    setClientResult(result);setNotice("Customer account created.");
  }catch(e){setError(e.message);}finally{setBusy("");}
 }
 if(!ready||!user)return <main className="grid min-h-screen place-items-center bg-[#f8f9f6] text-sm text-[#7b7f74]">Opening your FUGTH workspace…</main>;
 const business=workspace.businessName&&workspace.businessName!=="Fugth Management OS"?workspace.businessName:"My business";
 const actualPlanKey=founder?"elite":accountAccessPlan(workspace,verifiedGrant);
 const effectivePlanKey=isSimulating?previewPlan:actualPlanKey;
 const currentPlan=planInfo(effectivePlanKey);
 const plan=founder?"Founder · Admin":workspace.billingActive?String(workspace.planTier||workspace.plan||"").toUpperCase():verifiedGrant?"Founder access · "+String(verifiedGrant.tier).toUpperCase():"No active plan";
 const displayPlan=isSimulating?`ADMIN VIEW · ${currentPlan.name.toUpperCase()}`:plan;
 const navigate=id=>changePage(id);
 return <main className="min-h-screen bg-[#f6f6f6] font-sans text-[#24352d]">
  {menuOpen&&<button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#f6f6f6]/70 backdrop-blur-sm lg:hidden" onClick={()=>setMenuOpen(false)}/>}
  <div className="mx-auto flex min-h-screen max-w-[1900px]">
   <aside className={`fixed inset-y-0 left-0 z-50 flex w-[258px] shrink-0 flex-col border-r border-[#333333] bg-[#121212] px-4 pb-5 pt-6 text-[#f5f5f5] shadow-[10px_0_45px_rgba(0,0,0,.17)] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen?"translate-x-0":"-translate-x-full"}`}>
    <div className="flex items-center justify-between gap-3 px-2"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-gradient-to-br from-[#ffffff] to-[#bdbdbd] text-lg font-black text-[#111111] shadow-[0_8px_22px_rgba(64,229,210,.25)]">F</span><span className="text-xl font-semibold tracking-[-.07em] text-white">fugth<span className="text-[#d5d5d5]">.</span></span></Link><button type="button" onClick={()=>setMenuOpen(false)} className="p-2 lg:hidden" aria-label="Close menu"><Symbol name="close"/></button></div>
    <div className="mt-9 rounded-2xl border border-[#3e3e3e] bg-gradient-to-br from-[#222222] to-[#191919] px-4 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#bbbbbb]">Your business</p><p className="mt-2 truncate text-sm font-semibold text-[#ffffff]">{business}</p><p className="mt-1 text-[11px] text-[#aaa]">{workspace.accountNumber?"Account #"+workspace.accountNumber:"FUGTH workspace"}</p></div>
    <nav aria-label="Workspace" className="mt-8 flex-1 space-y-1">{tabs.map(item=><button key={item.id} type="button" onClick={()=>navigate(item.id)} aria-current={page===item.id?"page":undefined} className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[13px] font-medium transition ${page===item.id?"bg-[#efefef] text-[#111111] shadow-[0_10px_25px_rgba(27,185,179,.17)]":"text-[#a8c0bd] hover:bg-[#333333] hover:text-white"}`}><Symbol name={item.icon}/>{item.label}</button>)}</nav>
    <div className="border-t border-[#444444] pt-4"><Link href="/plans" className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs text-[#cecece] hover:bg-[#203343]">Subscription <span className="font-semibold text-[#fafafa]">{workspace.billingActive?"Active":"Manage →"}</span></Link><button type="button" onClick={logOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-medium text-[#dedede] hover:bg-[#203343]"><Symbol name="logout"/>Log out</button></div>
   </aside>
   <div className="flex min-w-0 flex-1 flex-col">
    <header className="sticky top-0 z-30 flex min-h-[79px] items-center justify-between gap-2 border-b border-[#333333] bg-[#141414]/95 text-[#ffffff] px-4 backdrop-blur-lg sm:px-8 lg:px-10">
     <div className="flex min-w-0 items-center gap-3"><button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-[#494949] bg-[#222222] text-white lg:hidden" aria-label="Open menu" onClick={()=>setMenuOpen(true)}><Symbol name="menu"/></button><p className="truncate text-[15px] font-semibold tracking-[-.03em]">{tabs.find(t=>t.id===page)?.label||"Home"}</p></div>
     <div className="flex shrink-0 items-center gap-2">{founder&&<label className="flex items-center gap-1 rounded-xl border border-[#888888] bg-[#2b2b2b] px-2 py-2 text-[10px] font-bold text-[#f5f5f5] sm:gap-2 sm:px-3 sm:text-[11px]"><span className="hidden sm:inline">Customer view</span><select aria-label="Preview customer plan" value={previewPlan??"real"} onChange={event=>setPreviewPlan(event.target.value==="real"?null:event.target.value)} className="max-w-[88px] bg-transparent text-[10px] font-bold outline-none sm:max-w-none sm:text-[11px]"><option value="real">Admin</option><option value="none">Zero · $0</option><option value="starter">Low · $49</option><option value="growth">Mid · $149</option><option value="elite">High · $499</option></select></label>}{founder&&<button type="button" onClick={()=>navigate("accounts")} className="hidden rounded-xl border border-[#888888] bg-[#2b2b2b] px-3.5 py-2.5 text-[12px] font-bold text-[#f5f5f5] hover:bg-[#dae9d6] sm:block">Accounts</button>}<button type="button" onClick={()=>navigate("website")} className="hidden rounded-xl border border-[#494949] bg-[#2a2a2a] px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#f0f3ec] md:block">My website <span aria-hidden="true">↗</span></button><button type="button" onClick={logOut} className="rounded-xl bg-[#262626] px-3 py-2.5 text-[11px] font-semibold text-[#f5f5f5] hover:bg-[#435345] sm:px-3.5 sm:text-[12px]">Log out</button></div>
    </header>
    <div className="mx-auto w-full max-w-[1500px] flex-1 bg-[radial-gradient(ellipse_at_85%_0%,rgba(0,0,0,.045),transparent_40%)] px-4 pb-16 pt-8 sm:px-8 sm:pt-10 lg:px-10">
     {founderVerificationNeeded&&<div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e6d5a8] bg-[#fffaf0] p-5"><div><p className="text-sm font-bold text-[#6e5430]">Finish verifying your FUGTH team account</p><p className="mt-1 text-xs leading-6 text-[#927c56]">Administration is private to approved team emails. Verify your email to unlock it; normal customer accounts won't see these tools.</p></div><button type="button" disabled={busy==="verifyFounder"} onClick={verifyFounder} className="rounded-xl bg-[#574a34] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy==="verifyFounder"?"Checking…":"Verify my email"}</button></div>}
     {(notice||error)&&<div role="status" className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${error?"border-[#ead5cc] bg-[#fff7f1] text-[#824e34]":"border-[#d9e4d5] bg-[#f0f6ed] text-[#38573c]"}`}>{error||notice}</div>}
     {isSimulating&&<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8cfaa] bg-[#fff9ec] px-5 py-3 text-xs text-[#715d3f]"><p><strong>Admin customer view: {currentPlan.name}</strong> — this is the real workspace with the same locks a customer sees. Billing and customer data are unchanged.</p><button type="button" onClick={()=>setPreviewPlan(null)} className="rounded-lg bg-[#5e523d] px-3 py-2 font-semibold text-white">Return to my account</button></div>}
     {page==="home"&&<div className="space-y-8">
       <section className="rounded-[26px] border border-[#e2e6dd] bg-[#eaf0e7] px-6 py-9 sm:px-10 sm:py-12"><div className="flex flex-wrap items-start justify-between gap-7"><div><p className="text-[11px] font-semibold uppercase tracking-[.21em] text-[#7a8a76]">YOUR SPACE TO GROW</p><h1 className="mt-4 max-w-[700px] text-[clamp(2.4rem,5.4vw,4.8rem)] font-semibold leading-[1.02] tracking-[-.08em] text-[#283429]">Good to see you<span className="font-serif font-normal italic"> again.</span></h1><p className="mt-5 max-w-lg text-sm leading-7 text-[#657561]">Your calls, customers and business website, in one simple place.</p></div><span className="rounded-full border border-[#c9d5c5] bg-[#f8faf7] px-4 py-2 text-[11px] font-semibold text-[#566b53]">{displayPlan}</span></div><div className="mt-9 flex flex-wrap gap-3"><button type="button" onClick={()=>navigate("calls")} className="inline-flex items-center gap-2 rounded-xl bg-[#27382b] px-5 py-3.5 text-sm font-semibold text-white">See your calls <Symbol name="arrow" size={15}/></button><button type="button" onClick={()=>navigate("website")} className="rounded-xl border border-[#bfcbbb] bg-white px-5 py-3.5 text-sm font-semibold text-[#293c2b]">Edit your website</button></div></section>
       <div className="grid gap-4 md:grid-cols-3">{[{title:"Calls",value:calls.length,sub:"Recent calls in your inbox",target:"calls"},{title:"Customers",value:leads.length,sub:"Saved customer leads",target:"customers"},{title:"Appointments",value:appointments.length,sub:"Recent saved appointments",target:"customers"}].map(item=><button key={item.title} type="button" onClick={()=>navigate(item.target)} className={`${panel} p-6 text-left transition hover:border-[#becbb5] hover:shadow-[0_10px_35px_rgba(41,53,36,.04)]`}><p className="text-sm text-[#868b80]">{item.title}</p><p className="mt-5 text-4xl font-semibold tracking-[-.07em] text-[#293429]">{item.value}</p><p className="mt-2 text-xs text-[#a0a59a]">{item.sub}</p></button>)}</div>
       {notifications.length>0&&<section className="rounded-[22px] border border-[#cee1c9] bg-[#edf5e9] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#788e75]">AUTOMATIC CALL ALERTS</p><h3 className="mt-2 text-lg font-semibold text-[#2a4a31]">Your receptionist captured {notifications.length} recent updates</h3></div><button type="button" onClick={()=>navigate("customers")} className="rounded-xl bg-[#2e5139] px-4 py-3 text-xs font-semibold text-white">Review leads ↗</button></div><div className="mt-4 space-y-2">{notifications.slice(0,3).map(n=><div key={n.id} className="rounded-xl border border-[#d8e6d4] bg-white p-3 text-xs leading-6 text-[#607960]">{n.text||"New call activity"} <span className="ml-2 text-[10px] text-[#90a08b]">{freshDate(n.createdAt)}</span></div>)}</div></section>}
       <section className={`${panel} p-6 sm:p-8`}><div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-lg font-semibold">What happened recently</h3><button type="button" onClick={()=>navigate("calls")} className="text-xs font-semibold text-[#53684e]">View all calls →</button></div>{calls.length?calls.slice(0,4).map(c=><ListRecord key={c.id} title={c.callerName||c.customerName||c.from||c.phoneNumber||"Customer call"} detail={[c.summary||c.transcriptSummary||"Call recorded",freshDate(c.createdAt)].join(" · ")} meta={c.status||c.intent||"Call"}/>):<Empty title="Your calls will appear here" description="Once your phone line is connected, you'll see your recent call records and follow-up information."/>}</section>
      </div>}
     {page==="calls"&&<div><SectionHeading eyebrow="RECEPTIONIST & CALLS" title="Test, hear and review every conversation." description="Try your receptionist with your own number. Real answered calls appear below with playback, transcript, outcome, favorites and your own quality rating." action={<button type="button" onClick={()=>{setPage("settings");setSettingsSection("phone");}} className="rounded-xl border border-[#d8ddd3] bg-white px-4 py-3 text-xs font-semibold">Phone setup ↗</button>}/><ReceptionistPreview adminMode={founder && previewPlan === null} user={user} workspace={workspace} onGoPhoneSetup={()=>{setPage("settings");setSettingsSection("phone");}}/><div className="mt-6"><FeatureGate locked={false} title="Call history" description="Your free 30-second receptionist demo works without upgrading. The full call inbox, recordings and transcripts unlock with your plan."><CallInbox calls={calls} leads={leads} user={user} locked={false} onViewCustomer={()=>{setPage("customers");setCustomerView("leads");}} onPhoneSetup={()=>{setPage("settings");setSettingsSection("phone");}}/></FeatureGate></div></div>}
     {page==="customers"&&<div><SectionHeading eyebrow="PEOPLE & BOOKINGS" title="Keep every connection." description="One place for customer details and appointments—without a complicated CRM."/>
       <div className="mb-6 inline-flex gap-1 rounded-xl border border-[#e0e5db] bg-white p-1"><button type="button" onClick={()=>setCustomerView("leads")} className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${customerView==="leads"?"bg-[#29372d] text-white":"text-[#7d8779]"}`}>Customers</button><button type="button" onClick={()=>setCustomerView("appointments")} className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${customerView==="appointments"?"bg-[#29372d] text-white":"text-[#7d8779]"}`}>Appointments</button></div>
       <FeatureGate locked={customerView==="appointments"&&!hasPlan(effectivePlanKey,"growth")} title={customerView==="appointments"?"Appointments unlock on Mid":"Customers unlock on Low"} description="This is the same feature customers see; it stays in place and grays out until their plan includes it.">{customerView==="leads"?<section className={`${panel} p-5 sm:p-7`}><div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-lg font-semibold">Customer list</h3><button type="button" onClick={()=>setShowLeadForm(!showLeadForm)} className="inline-flex items-center gap-2 rounded-xl bg-[#27382b] px-4 py-3 text-xs font-semibold text-white"><Symbol name="plus" size={15}/> Add customer</button></div>
       {showLeadForm&&<form onSubmit={saveLead} className="mb-6 grid gap-3 rounded-xl bg-[#f7f9f5] p-4 sm:grid-cols-2">{[["Customer name","contactName"],["Business","businessName"],["Phone","phone"],["Service needed","service"]].map(([title,key])=><label key={key} className="block text-xs font-semibold text-[#697467]">{title}<input value={lead[key]} onChange={e=>setLead({...lead,[key]:e.target.value})} className={`mt-2 ${input}`}/></label>)}<label className="block text-xs font-semibold text-[#697467] sm:col-span-2">Notes<textarea value={lead.notes} onChange={e=>setLead({...lead,notes:e.target.value})} className={`mt-2 min-h-20 ${input}`}/></label><button disabled={busy==="lead"} className="rounded-xl bg-[#293a2d] px-5 py-3 text-sm font-semibold text-white">Save customer</button></form>}
       {leads.length?leads.map(c=><ListRecord key={c.id} title={c.contactName||c.businessName||c.phone||"New customer"} detail={[c.phone,c.email,c.service,c.summary||c.requestedDate].filter(Boolean).join(" · ")} meta={c.bookingStatus==="requested"?"Appointment request":c.type==="call_lead"?"Call lead":c.status||"New"}/>):<Empty title="Your customer list is clear" description="Add your first customer or let your receptionist capture incoming inquiries."/>}</section>:<section className={`${panel} p-5 sm:p-7`}><div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-lg font-semibold">Appointments</h3><button type="button" onClick={()=>setShowAppointmentForm(!showAppointmentForm)} className="inline-flex items-center gap-2 rounded-xl bg-[#27382b] px-4 py-3 text-xs font-semibold text-white"><Symbol name="plus" size={15}/> Add appointment</button></div>{showAppointmentForm&&<form onSubmit={saveAppointment} className="mb-6 grid gap-3 rounded-xl bg-[#f7f9f5] p-4 sm:grid-cols-2">{[["Customer name","customerName","text"],["Phone","phone","tel"],["Date","date","date"],["Time","time","time"],["Service","service","text"]].map(([title,key,type])=><label key={key} className="block text-xs font-semibold text-[#697467]">{title}<input required={["customerName","date","time"].includes(key)} type={type} value={appointment[key]} onChange={e=>setAppointment({...appointment,[key]:e.target.value})} className={`mt-2 ${input}`}/></label>)}<button disabled={busy==="appointment"} className="rounded-xl bg-[#293a2d] px-5 py-3 text-sm font-semibold text-white">Save appointment</button></form>}{appointments.length?appointments.map(a=><ListRecord key={a.id} title={a.customerName||a.title||a.service||"Appointment"} detail={[a.service,a.date,a.time].filter(Boolean).join(" · ")||freshDate(a.createdAt)} meta={a.status||"Scheduled"}/>):<Empty title="No appointments yet" description="New bookings and appointments you add will appear here."/>}</section>}</FeatureGate>
      </div>}
     {page==="marketing"&&<div><SectionHeading eyebrow="GROWTH TOOLS" title="Lead generation that stays useful." description="Email, text-back and follow-up tools appear for every account, with access controlled by the customer's plan."/><MarketingHub user={user} workspace={workspace} planKey={effectivePlanKey} founderAdmin={founder&&previewPlan===null} simulating={founder&&previewPlan!==null}/></div>}
     {page==="website"&&<div><SectionHeading eyebrow="FUGTH WEBSITE MAKER" title="See your entire website before you upgrade." description="Explore the full personalized website and live chatbot on every plan. Styling changes, publishing, and professional customization are part of the website packages."/><SiteStudio user={user} workspace={workspace} locked={!(founder&&previewPlan===null)&&!hasPlan(effectivePlanKey,"starter")&&effectivePlanKey!=="website"&&workspace.websitePurchased!==true}/></div>}
     {page==="settings"&&<div><SectionHeading eyebrow="YOUR BUSINESS" title="Simple settings." description="Manage the details people see, your phone line, and the services you connect."/><div className="mb-6 flex flex-wrap gap-2">{[{id:"business",title:"Business details"},{id:"phone",title:"Phone"},{id:"connections",title:"Connections"}].map(item=><button key={item.id} onClick={()=>setSettingsSection(item.id)} className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${settingsSection===item.id?"border-[#27382b] bg-[#27382b] text-white":"border-[#dfe4da] bg-white text-[#697467]"}`}>{item.title}</button>)}</div>
       {settingsSection==="business"&&<section className={`${panel} max-w-[860px] p-6 sm:p-8`}><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-xl font-semibold">About your business</h3><p className="mt-2 text-sm text-[#8a8d83]">Keep your contact details accurate.</p></div><span className="rounded-full bg-[#f2f4ee] px-4 py-2 text-xs font-semibold text-[#687865]">Account {workspace.accountNumber||"pending"}</span></div><form onSubmit={saveBusiness} className="mt-7 grid gap-5 sm:grid-cols-2">{[["Business name","businessName"],["Business type","businessType"],["Business phone","phone"],["Service area","serviceArea"],["Business hours","hours"],["Call notification email","notificationEmail"],["Owner mobile for optional text alerts","notificationPhone"]].map(([title,key])=><label key={key} className="text-xs font-semibold text-[#677063]">{title}<input value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})} className={`mt-2 ${input}`}/></label>)}<label className="flex items-start gap-3 text-xs leading-6 text-[#647561] sm:col-span-2"><input type="checkbox" className="mt-1" checked={profile.callSmsAlertsEnabled} onChange={e=>setProfile({...profile,callSmsAlertsEnabled:e.target.checked})}/><span>I agree to receive SMS call summaries at my owner mobile number when the SMS connection is enabled. Carrier messaging rates may apply. Connected Gmail or in-app alerts are the fallback.</span></label><div className="sm:col-span-2"><button disabled={busy==="profile"} className="rounded-xl bg-[#29372b] px-6 py-3.5 text-sm font-semibold text-white">Save changes</button></div></form><div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#edece8] pt-6"><div><p className="text-sm font-semibold">Your FUGTH subscription</p><p className="mt-1 text-xs text-[#94988d]">{plan}</p></div><Link href="/plans" className="rounded-xl border border-[#dce1d7] px-4 py-3 text-xs font-semibold">Manage plan ↗</Link></div></section>}
       {settingsSection==="phone"&&<PhoneSetup user={user} workspace={workspace}/>}
       {settingsSection==="connections"&&<><BookingAvailabilitySettings user={user}/><div className="mt-6"><IntegrationsHub/></div></>}
      </div>}
     {page==="accounts"&&founder&&<div><SectionHeading eyebrow="FUGTH OPERATIONS" title="Accounts & access." description="Review FUGTH members, account tiers, last sign-ins and founder-authorized access."/><FounderAccountDirectory/></div>}
     {page==="accounts"&&!founder&&<Empty title="This area is private" description="Accounts can only be managed by verified FUGTH administrators."/>}
     {page==="admin"&&founder&&<div><SectionHeading eyebrow="FUGTH INTERNAL" title="Operations center." description="Your accounts, founding customers, live payments and sales operations in one private workspace."/><div className="space-y-6">
       <div className="rounded-[24px] border border-[#e2dbce] bg-[#faf5ea] p-4 text-sm text-[#6d5b45]"><strong>Customer accounts & website assignment</strong><p className="mt-1 text-xs leading-6">Every registered Firebase account appears below, including free prospects. Choose a customer to grant temporary demo access or open their private website in Website Studio. Paid subscriptions are only activated by verified Stripe payments.</p></div><FounderAccountDirectory/>
       <FounderRevenuePlanner/>
       <FounderVoiceHealth/>
       <FounderDemoControls/>
       <FounderBillingHealth/>
       <FounderProspectImport user={user}/>
       <FounderColdCall user={user}/>
       <section className={`${panel} p-6 sm:p-8`}><h3 className="text-xl font-semibold">Create a customer account</h3><p className="mt-2 text-sm leading-6 text-[#848b80]">Create an account for a business you spoke with. Share the private activation link directly with its owner.</p>
       <form onSubmit={createClient} className="mt-6 grid gap-4 md:grid-cols-3"><label className="text-xs font-semibold text-[#687467]">Business name<input required maxLength={80} value={clientForm.businessName} onChange={e=>setClientForm({...clientForm,businessName:e.target.value})} className={`mt-2 ${input}`}/></label><label className="text-xs font-semibold text-[#687467]">Customer email<input required type="email" value={clientForm.email} onChange={e=>setClientForm({...clientForm,email:e.target.value})} className={`mt-2 ${input}`}/></label><label className="text-xs font-semibold text-[#687467]">Industry<select value={clientForm.businessType} onChange={e=>setClientForm({...clientForm,businessType:e.target.value})} className={`mt-2 ${input}`}>{[["general","Local business"],["roofing","Roofing"],["cleaning","Cleaning"],["petgrooming","Pet grooming"],["dental","Dental"],["clinic","Medical"],["salon","Beauty"],["legal","Legal"],["hvac","Heating and cooling"],["automotive","Automotive"],["realestate","Real estate"],["restaurant","Restaurant"],["landscaping","Landscaping"],["contractor","Contractor"]].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="text-xs font-semibold text-[#687467]">Business phone<input maxLength={32} value={clientForm.phone} onChange={e=>setClientForm({...clientForm,phone:e.target.value})} className={`mt-2 ${input}`}/></label><label className="text-xs font-semibold text-[#687467]">Service area<input maxLength={100} placeholder="Miami-Dade County" value={clientForm.serviceArea} onChange={e=>setClientForm({...clientForm,serviceArea:e.target.value})} className={`mt-2 ${input}`}/></label><label className="text-xs font-semibold text-[#687467]">Business hours<input maxLength={100} placeholder="Mon–Fri, 8 AM–6 PM" value={clientForm.hours} onChange={e=>setClientForm({...clientForm,hours:e.target.value})} className={`mt-2 ${input}`}/></label><div className="md:col-span-3"><button disabled={busy==="client"} className="rounded-xl bg-[#29372b] px-5 py-3 text-sm font-semibold text-white">{busy==="client"?"Creating…":"Create account + website"}</button></div></form>
       {clientResult&&<div className="mt-5 rounded-xl border border-[#dae4d3] bg-[#f3f8f0] p-5 text-sm"><p className="font-semibold">New account {clientResult.accountNumber&&"#"+clientResult.accountNumber}</p><div className="mt-3 flex flex-wrap gap-4">{clientResult.siteUrl&&<Link href={clientResult.siteUrl} target="_blank" className="font-semibold underline">Open customer website ↗</Link>}{clientResult.activationLink&&<button type="button" onClick={()=>navigator.clipboard?.writeText(clientResult.activationLink)} className="font-semibold underline">Copy private activation link</button>}</div>{clientResult.activationNeeded&&<p className="mt-3 text-xs text-[#687666]">Activation has not been emailed automatically. Share the link privately with this business owner.</p>}</div>}
       </section>
       <FounderSites user={user}/>
      </div></div>}
     {page==="admin"&&!founder&&<Empty title="This area is private" description="Administration is available only to authorized FUGTH team accounts."/>}
    </div>
    <footer className="border-t border-[#333333] bg-[#141414] px-4 py-6 text-center text-[11px] text-[#cccccc] sm:px-8">FUGTH Management · A calmer way to run your business</footer>
   </div>
  </div>
 </main>;
}
