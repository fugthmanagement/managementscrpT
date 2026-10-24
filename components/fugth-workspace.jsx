"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

import FounderProspectSiteMaker from "./founder-prospect-site-maker";
import {SITE_INDUSTRIES} from "../lib/site-presets";
import {cleanBusinessDescription} from "../lib/business-profile";
import WorkspaceNavigation from "./workspace-navigation";
import WorkspaceOverview from "./workspace-overview";
import ServiceMarketplace from "./service-marketplace";
import GoogleConnectPrompt from "./google-connect-prompt";
import BusinessOpeningHours from "./business-opening-hours";
import {cleanOpeningHours} from "../lib/business-hours";
import PhoneSetup from "./phone-setup";
import GoogleCalendarConnection from "./google-calendar-connection";
import BookingAvailabilitySettings from "./booking-availability-settings";
import FounderSites from "./founder-sites";
import ReceptionistPreview from "./receptionist-preview";
import CallInbox from "./call-inbox";
import FounderSalesDesk from "./founder-sales-desk";
import FounderRevenuePlanner from "./founder-revenue-planner";
import FounderBillingHealth from "./founder-billing-health";
import FounderDomainLaunch from "./founder-domain-launch";
import FounderVoiceHealth from "./founder-voice-health";
import FounderBookingCalendar from "./founder-booking-calendar";
import FounderSiteClaims from "./founder-site-claims";
import FounderGgufWriter from "./founder-gguf-writer";
import FounderDemoControls from "./founder-demo-controls";
import FounderAccountDirectory from "./founder-account-directory";
import MarketingHub from "./marketing-hub";
import FeatureGate from "./feature-gate";
import { hasPlan, normalizePlan, planInfo } from "../lib/plan-access";
import { accountAccessPlan } from "../lib/plan-access";

const MENU = [
  { id: "home", label: "Home", icon: "home" },
  { id: "calls", label: "Calls", icon: "phone" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "marketing", label: "Marketing", icon: "link" },
  { id: "services", label: "Services", icon: "cart" },
  { id: "settings", label: "Settings", icon: "settings" },
];
const input =
  "w-full rounded-xl border border-[#d3e5ef] bg-white px-4 py-3.5 text-sm text-[#1a3b51] outline-none transition focus:border-[#63b7e2] focus:ring-2 focus:ring-[#e8f7ff] placeholder:text-[#8aa3b0]";
const panel = "rounded-[24px] border border-[#d9e8f2] bg-white shadow-[0_9px_30px_rgba(22,75,107,.035)]";
function Symbol({ name, size = 19 }) {
  const attrs = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  let paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
        <path d="M9 21v-7h6v7" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.4 10a16 16 0 0 0 6.6 6.6l1.5-1.6a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m2 10v-2a6 6 0 0 0-2.5-4.9" />
      </>
    ),
    layout: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 9v12" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="m19.4 15 .3 2-2.1 2.1-2-.3a9 9 0 0 1-2.2.9l-1.2 1.7h-3l-1.2-1.7a9 9 0 0 1-2.2-.9l-2 .3-2.1-2.1.3-2a9 9 0 0 1-.9-2.2L1 11.6v-3l1.7-1.2a9 9 0 0 1 .9-2.2l-.3-2 2.1-2.1 2 .3a9 9 0 0 1 2.2-.9L10.8 0h3l1.2 1.7a9 9 0 0 1 2.2.9l2-.3 2.1 2.1-.3 2a9 9 0 0 1 .9 2.2l1.7 1.2v3l-1.7 1.2A9 9 0 0 1 19.4 15Z"
          transform="translate(1.4 1.4) scale(.88)"
        />
      </>
    ),
    admin: (
      <>
        <path d="M12 2 4 6v6c0 5 3.3 8.6 8 10 4.7-1.4 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="M5 5 19 19M19 5 5 19" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 10h18" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
      </>
    ),
  };
  return <svg {...attrs}>{paths[name] || paths.home}</svg>;
}
function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <header className="fugth-workspace-section-heading relative mb-7 flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-[26px] border border-[#dbeaf2] bg-white px-6 py-7 shadow-[0_9px_28px_rgba(27,76,106,.035)] sm:px-8 sm:py-9">
      <span aria-hidden="true" className="absolute left-0 top-0 h-full w-1 bg-[#a6ddf8]"/>
      <div className="relative max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#4282a3]">{eyebrow}</p>
        <h2 className="mt-3 text-[clamp(1.9rem,3.7vw,3.35rem)] font-black leading-[1.05] tracking-[-.065em] text-[#1a3a50]">{title}</h2>
        {description&&<p className="mt-4 max-w-2xl text-sm leading-7 text-[#648092]">{description}</p>}
      </div>
      {action}
    </header>
  );
}
function Empty({ title, description, action }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#bddcea] bg-[#f5fbff] px-6 py-10 text-center">
      <p className="text-base font-semibold text-[#1c3d51]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7793a3]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
function ListRecord({ title, detail, meta }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#e7f0f6] py-4 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#25465a]">{title}</p>
        <p className="mt-1 break-words text-xs text-[#758e9e]">{detail}</p>
      </div>
      <span className="rounded-full bg-[#e8f6ff] px-3 py-1.5 text-[11px] font-medium text-[#527c95]">
        {meta || "New"}
      </span>
    </div>
  );
}
const freshDate = (v) => {
  if (!v) return "Recent";
  try {
    const d = v?.toDate?.() || new Date(v?.seconds ? v.seconds * 1000 : v);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
};
export default function FugthWorkspace() {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false);
  const [prospectSiteMakerId,setProspectSiteMakerId]=useState("");
  const [lastSalesTab,setLastSalesTab]=useState("guide");
  const [adminSection,setAdminSection]=useState("customers");
  const [page, setPage] = useState("home"),
    [menuOpen, setMenuOpen] = useState(false);
  const [founder, setFounder] = useState(false),
    [capabilitiesReady, setCapabilitiesReady] = useState(false),
    [founderVerificationNeeded, setFounderVerificationNeeded] = useState(false),
    [verifiedGrant, setVerifiedGrant] = useState(null);
  const [workspace, setWorkspace] = useState({}),
    [calls, setCalls] = useState([]),
    [leads, setLeads] = useState([]),
    [appointments, setAppointments] = useState([]),
    [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  const [customerView, setCustomerView] = useState("leads");
  const [showLeadForm, setShowLeadForm] = useState(false),
    [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [lead, setLead] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    service: "",
    notes: "",
  });
  const [appointment, setAppointment] = useState({
    customerName: "",
    phone: "",
    service: "",
    date: "",
    time: "",
  });
  const [profile, setProfile] = useState({
    businessName: "",
    businessType: "general",
    businessTypeOther: "",
    businessDescription: "",
    openingHours: cleanOpeningHours(),
    serviceArea: "",
    phone: "",
    notificationEmail: "",
    notificationPhone: "",
    callSmsAlertsEnabled: false,
  });
  const [settingsSection, setSettingsSection] = useState("business");
  const [clientForm, setClientForm] = useState({
    email: "",
    businessName: "",
    businessType: "general",
    phone: "",
    serviceArea: "",
    hours: "",
  });
  const [clientResult, setClientResult] = useState(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [previewPlan, setPreviewPlan] = useState(null); // Local founder-only visual mode, never touches billing.

  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (current) => {
      setUser(current || null);
      setReady(true);
      if (!current) {
        setCapabilitiesReady(true);
        return;
      }
      try {
        const token = await current.getIdToken();
        const res = await fetch("/api/me/access", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        setFounder(Boolean(res.ok && data.isFounder));
        setFounderVerificationNeeded(
          Boolean(res.ok && data.needsFounderVerification),
        );
        setVerifiedGrant(res.ok ? data.founderGrant || null : null);
        setCapabilitiesReady(true);
      } catch {
        setFounder(false);
        setCapabilitiesReady(true);
      }
    });
  }, []);
  useEffect(() => {
    if (!user?.uid || !db) return;
    const uid = user.uid;
    const errors = (e) =>
      setError(
        "Some business information could not be loaded. Please check your connection.",
      );
    const unsub1 = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        const data = snap.data() || {};
        setWorkspace(data);
        setProfile({
          businessName: data.businessName || "",
          businessType: data.businessType || "general",
          businessTypeOther: data.businessTypeOther || "",
          businessDescription: data.businessDescription || "",
          openingHours: cleanOpeningHours(data.openingHours),
          serviceArea: data.serviceArea || "",
          phone: data.phone || "",
          notificationEmail: data.notificationEmail || "",
          notificationPhone: data.notificationPhone || "",
          callSmsAlertsEnabled: data.callSmsAlertsEnabled === true,
        });
      },
      errors,
    );
    const offNotifications=onSnapshot(
      query(collection(db,"users",uid,"notifications"),orderBy("createdAt","desc"),limit(60)),
      snap=>setNotifications(snap.docs.map(doc=>({id:doc.id,...doc.data()}))),
      ()=>{/* Notifications may not be configured on new accounts. */}
    );
    return ()=>{unsub1();offNotifications();};
  },[user?.uid]);
  useEffect(()=>{
    if(!user?.uid||!db)return;
    const uid=user.uid;
    const permitted=founder||hasPlan(accountAccessPlan(workspace,verifiedGrant),"starter");
    if(!permitted){setCalls([]);setLeads([]);setAppointments([]);return;}
    const watch=(name,setter)=>onSnapshot(
      query(collection(db,"users",uid,name),orderBy("createdAt","desc"),limit(60)),
      snap=>setter(snap.docs.map(d=>({id:d.id,...d.data()}))),
      ()=>setError("Could not load the "+name+" records. Check your plan and permissions.")
    );
    const offCalls=watch("calls",records=>setCalls(records.filter(c=>c.source!=="preview_quota")));
    const offLeads=watch("leads",setLeads);
    const offAppointments=watch("appointments",setAppointments);
    return ()=>{offCalls();offLeads();offAppointments();};
  },[user?.uid,founder,verifiedGrant,workspace.billingActive,workspace.planTier,workspace.plan]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("integration")) {
      setPage("settings");
      setSettingsSection("connections");
    }
    else if(q.get("open")==="sales"){
      setPage("sales");
      const wanted=q.get("tab");
      if(["sms","email","leads","demos","outreach","guide"].includes(wanted))
       setLastSalesTab(wanted);
    }
  }, []);
  // Pull edits from each business's own Google calendar while the workspace is
  // open. Bookings made inside FUGTH are pushed through the confirmed book API.
  useEffect(()=>{
    if(!user?.uid)return;
    let stopped=false,timer;
    const sync=async()=>{
      if(stopped||document.visibilityState!=="visible")return;
      try{
        const token=await auth.currentUser?.getIdToken();
        if(!token)return;
        await fetch("/api/integrations/google/sync",{
          method:"POST",headers:{Authorization:"Bearer "+token},
          cache:"no-store"
        });
      }catch{/* A disconnected account simply keeps its FUGTH records. */}
    };
    (async()=>{
      try{
        const token=await auth.currentUser?.getIdToken();
        const response=await fetch("/api/integrations/google",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
        const connection=await response.json();
        if(stopped||!response.ok||!connection.connected||!connection.calendarServiceReady)return;
        sync();timer=window.setInterval(sync,125000);
      }catch{}
    })();
    return()=>{stopped=true;if(timer)window.clearInterval(timer);};
  },[user?.uid]);
  const tabs = founder
    ? [
        ...MENU,
        { id: "sales", label: "Cold Calling", icon: "phone" },
        { id: "admin", label: "Administration", icon: "admin" },
      ]
    : MENU;
  const isSimulating = founder && previewPlan !== null;
  const changePage = (id) => {
    if(id==="website"){
      setProspectSiteMakerId("");
      if(founder){setPage("admin");setAdminSection("customers");}
      else{setPage("customers");setCustomerView("appointments");}
    }else setPage(id);
    setMenuOpen(false);
    setNotice(id==="website"?"FUGTH manages your website design. Use Customers for appointments or contact your FUGTH site manager about changes.":"");
    setError("");
    // Every top-level tab starts at the top, including on mobile.
    if(typeof window!=="undefined"&&window.scrollY>160)window.scrollTo({top:0,behavior:"instant"});
  };
  function openProspectSiteMaker(prospect){
    if(!prospect?.id)return;
    if(["guide","training","leads","sms","email","outreach","demos"].includes(prospect.originTab))setLastSalesTab(prospect.originTab);
    setPage("website");
    setProspectSiteMakerId(prospect.id);
    setMenuOpen(false);
    setNotice("");
  }
  async function logOut() {
    try {
      await signOut(auth);
      window.location.replace("/login");
    } catch {
      setError("Could not log out. Please retry.");
    }
  }
  async function verifyFounder() {
    setBusy("verifyFounder");
    setError("");
    setNotice("");
    try {
      if (!auth.currentUser) throw Error("Please sign in again.");
      await reload(auth.currentUser);
      if (!auth.currentUser.emailVerified) {
        await sendEmailVerification(auth.currentUser);
        setNotice(
          "Verification email sent. Open the link in your inbox, then come back and refresh the page to unlock Administration.",
        );
      } else {
        await auth.currentUser.getIdToken(true);
        window.location.reload();
      }
    } catch (e) {
      setError(
        "We couldn't send or check your verification email. Please retry.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveLead(e) {
    e.preventDefault();
    setBusy("lead");
    setError("");
    try {
      if (!lead.phone.trim() && !lead.contactName.trim())
        throw Error("Enter a customer name or phone number.");
      await addDoc(collection(db, "users", user.uid, "leads"), {
        ...lead,
        status: "new",
        source: "manual",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setLead({
        businessName: "",
        contactName: "",
        phone: "",
        service: "",
        notes: "",
      });
      setShowLeadForm(false);
      setNotice("Customer saved.");
    } catch (e) {
      setError(e.message || "Could not add customer.");
    } finally {
      setBusy("");
    }
  }
  async function saveAppointment(e){
    e.preventDefault();setBusy("appointment");setError("");setNotice("");
    try{
      if(!appointment.customerName||!appointment.date||!appointment.time)
        throw Error("Add the name, date and time.");
      const begin=new Date(appointment.date+"T"+appointment.time+":00");
      if(Number.isNaN(begin.getTime())||begin.getTime()<Date.now())
        throw Error("Choose a future appointment date and time.");
      const token=await auth.currentUser?.getIdToken();
      if(!token)throw Error("Sign in before scheduling.");
      const headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
      const conn=await fetch("/api/integrations/google",{headers,cache:"no-store"});
      const google=await conn.json().catch(()=>({}));
      let resultMessage="";
      if(conn.ok&&google.connected&&google.calendarServiceReady){
        const booked=await fetch("/api/integrations/google/book",{
          method:"POST",headers,body:JSON.stringify({
            title:appointment.service||"Customer appointment",
            customerName:appointment.customerName,
            phone:appointment.phone,
            startTime:begin.toISOString(),
            endTime:new Date(begin.getTime()+60*60000).toISOString()
          })
        });
        const bookedData=await booked.json().catch(()=>({}));
        if(!booked.ok)throw Error(bookedData.error||"Google Calendar could not confirm this appointment.");
        resultMessage=bookedData.workspaceSynced?
          "Appointment confirmed in your business Google Calendar and FUGTH.":
          "Appointment confirmed in Google Calendar, but FUGTH could not mirror it. Check the calendar before retrying.";
      }else{
        // Do not claim a Google booking if the business has not connected it.
        await addDoc(collection(db,"users",user.uid,"appointments"),{
          ...appointment,status:"scheduled",calendarSyncStatus:"not_connected",
          source:"manual",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
        });
        resultMessage="Appointment saved in FUGTH only. Connect Google Calendar for live conflict checks and calendar syncing.";
      }
      setAppointment({customerName:"",phone:"",service:"",date:"",time:""});
      setShowAppointmentForm(false);setNotice(resultMessage);
    }catch(e){setError(e.message||"Could not save appointment.");}
    finally{setBusy("");}
  }
  async function saveBusiness(e){
 e.preventDefault();setBusy("profile");setError("");setNotice("");
 try{
  if(!db||!user?.uid)throw Error("Sign in before saving business details.");
  const description=cleanBusinessDescription(profile.businessDescription);
  if(profile.businessType==="other"&&!profile.businessTypeOther?.trim())throw Error("Describe your business type under Other.");
  await setDoc(doc(db,"users",user.uid),{
   businessName:profile.businessName.trim().slice(0,80),
   businessType:profile.businessType,
   businessTypeOther:profile.businessType==="other"?profile.businessTypeOther.trim().slice(0,90):"",
   businessDescription:description,
   openingHours:cleanOpeningHours(profile.openingHours),
   serviceArea:profile.serviceArea.trim().slice(0,120),
   phone:profile.phone.trim().slice(0,32),
   notificationEmail:profile.notificationEmail.trim().slice(0,120),
   notificationPhone:profile.notificationPhone.trim().slice(0,32),
   callSmsAlertsEnabled:profile.callSmsAlertsEnabled===true,updatedAt:serverTimestamp()
  },{merge:true});
  setNotice("Business details and public opening hours saved. FUGTH uses these business details in customer operations and your managed website. Published website designs remain unchanged until your FUGTH site manager reviews them.");
 }catch(e){setError(e.message||"Unable to save business details.");}
 finally{setBusy("");}
}
  async function createClient(e) {
    e.preventDefault();
    setBusy("client");
    setError("");
    setClientResult(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/dev/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          ...clientForm,
          planTier: "none",
          planStatus: "inactive",
        }),
      });
      const result = await res.json();
      if (!res.ok)
        throw Error(result.error || "Customer account could not be created.");
      setClientResult(result);
      setNotice("Customer account created.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  if (!ready)
    return <main className="grid min-h-screen place-items-center bg-[#f0f9ff] text-sm text-[#234e6a]">Opening FUGTH…</main>;
  if (!user)
    return <main className="min-h-screen bg-[#f2f9fe] px-5 py-12 text-[#163c55] sm:py-20">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[#d5e7f0] bg-white shadow-[0_18px_50px_rgba(18,68,100,.1)]">
        <header className="bg-[#102e43] p-8 text-white sm:p-12">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#a0d5f1]">FUGTH MANAGEMENT / GUEST DASHBOARD</p>
          <h1 className="mt-4 text-4xl font-black">Welcome to FUGTH.</h1>
          <p className="mt-3 text-sm leading-7 text-[#c8e2f0]">Explore the business platform, book a founder consultation, or sign in to manage your website, calls and leads.</p>
        </header>
        <div className="grid gap-3 p-7 sm:grid-cols-2 sm:p-10">
          <Link href="/book" className="rounded-2xl bg-[#1e5877] px-5 py-6 text-center text-sm font-black text-white">Book a consultation without an account ↗</Link>
          <Link href="/login" className="rounded-2xl border border-[#b7d4e5] px-5 py-6 text-center text-sm font-black">Log in to my business</Link>
          <Link href="/login?signup=1" className="rounded-2xl border border-[#b7d4e5] px-5 py-6 text-center text-sm font-black sm:col-span-2">Create a FUGTH business account with Google or email →</Link>
          <p className="text-xs leading-5 text-[#668ca3] sm:col-span-2">Guest booking requests require FUGTH approval before they appear as confirmed Google Calendar events.</p>
        </div>
      </div>
    </main>;
  const business =
    workspace.businessName && workspace.businessName !== "Fugth Management OS"
      ? workspace.businessName
      : "My business";
  const actualPlanKey = founder
    ? "elite"
    : accountAccessPlan(workspace, verifiedGrant);
  const effectivePlanKey = isSimulating ? previewPlan : actualPlanKey;
  const currentPlan = planInfo(effectivePlanKey);
  const plan = founder
    ? "Founder · Admin"
    : workspace.billingActive
      ? String(workspace.planTier || workspace.plan || "").toUpperCase()
      : verifiedGrant
        ? "Founder access · " + String(verifiedGrant.tier).toUpperCase()
        : "No active plan";
  const canUseCRM=hasPlan(effectivePlanKey,"starter");
  const canUseVoice=hasPlan(effectivePlanKey,"starter");
  const canBook=hasPlan(effectivePlanKey,"starter");
  const displayPlan = isSimulating
    ? `ADMIN VIEW · ${currentPlan.name.toUpperCase()}`
    : plan;
  const navigate = (id) => changePage(id);
  return (
    <main className="fugth-workspace min-h-screen bg-[#f5faff] font-sans text-[#1b3b4d]">
      <WorkspaceNavigation tabs={tabs} page={page} business={business} accountNumber={workspace.accountNumber||""} displayPlan={displayPlan}
        founder={founder} previewPlan={previewPlan} onPreviewPlan={setPreviewPlan} onChangePage={navigate} onLogout={logOut}/>
      <div className="fugth-workspace-content mx-auto w-full max-w-[1600px] px-4 pb-14 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        {page==="home"&&<GoogleConnectPrompt user={user}/> }
        {founderVerificationNeeded && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e6d5a8] bg-[#fffaf0] p-5">
                <div>
                  <p className="text-sm font-bold text-[#6e5430]">
                    Finish verifying your FUGTH team account
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[#927c56]">
                    Administration is private to approved team emails. Verify
                    your email to unlock it; normal customer accounts won't see
                    these tools.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === "verifyFounder"}
                  onClick={verifyFounder}
                  className="rounded-xl bg-[#574a34] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy === "verifyFounder" ? "Checking…" : "Verify my email"}
                </button>
              </div>
            )}
            {(notice || error) && (
              <div
                role="status"
                className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${error ? "border-[#ead5cc] bg-[#fff7f1] text-[#824e34]" : "border-[#c8e4f2] bg-[#edf8ff] text-[#28688c]"}`}
              >
                {error || notice}
              </div>
            )}
            {isSimulating && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8cfaa] bg-[#fff9ec] px-5 py-3 text-xs text-[#715d3f]">
                <p>
                  <strong>Admin customer view: {currentPlan.name}</strong> —
                  this is the real workspace with the same locks a customer
                  sees. Billing and customer data are unchanged.
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewPlan(null)}
                  className="rounded-lg bg-[#5e523d] px-3 py-2 font-semibold text-white"
                >
                  Return to my account
                </button>
              </div>
            )}
            {page === "home" && (
              <WorkspaceOverview business={business} displayPlan={displayPlan} workspace={workspace}
                calls={calls} leads={leads} appointments={appointments} notifications={notifications} navigate={navigate}/>
            )}
            {page === "services" && <ServiceMarketplace embedded workspace={workspace}/>}
             {page === "calls" && (
              <div>
                <SectionHeading
                  eyebrow="RECEPTIONIST & CALLS"
                  title="Test, hear and review every conversation."
                  description="Try your receptionist with your own number. Real answered calls appear below with playback, transcript, outcome, favorites and your own quality rating."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        if(!canUseVoice)return;
                        setPage("settings");
                        setSettingsSection("phone");
                      }}
                      disabled={!canUseVoice}
                      title={!canUseVoice?"Essential plan required":undefined}
                      className="rounded-xl border border-[#d7e8f1] bg-white px-4 py-3 text-xs font-semibold"
                    >
                      Phone setup ↗
                    </button>
                  }
                />
                <ReceptionistPreview
                  adminMode={founder && previewPlan === null}
                  user={user}
                  workspace={workspace}
                  onGoPhoneSetup={() => {
                    setPage("settings");
                    setSettingsSection("phone");
                  }}
                />
                <div className="mt-6">
                  <FeatureGate
                    locked={!canUseVoice}
                    title="Call history"
                    description="Your free 30-second receptionist demo works without upgrading. The full call inbox, recordings and transcripts unlock with your plan."
                  >
                    <CallInbox
                      calls={canUseVoice?calls:[]}
                      leads={canUseVoice?leads:[]}
                      user={user}
                      locked={!canUseVoice}
                      onViewCustomer={() => {
                        setPage("customers");
                        setCustomerView("leads");
                      }}
                      onPhoneSetup={() => {
                        setPage("settings");
                        setSettingsSection("phone");
                      }}
                    />
                  </FeatureGate>
                </div>
              </div>
            )}
            {page === "customers" && (
              <div>
                <SectionHeading
                  eyebrow="PEOPLE & BOOKINGS"
                  title="Keep every connection."
                  description="One place for customer details and appointments—without a complicated CRM."
                />
                <div className="mb-6 inline-flex gap-1 rounded-xl border border-[#d5e8f1] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setCustomerView("leads")}
                    className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${customerView === "leads" ? "bg-[#173e55] text-white" : "text-[#67879b]"}`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerView("appointments")}
                    className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${customerView === "appointments" ? "bg-[#173e55] text-white" : "text-[#67879b]"}`}
                  >
                    Appointments
                  </button>
                </div>
                <FeatureGate
                  locked={!canUseCRM}
                  title={
                    customerView === "appointments"
                      ? "Appointments unlock on Essential"
                      : "Customers unlock on Essential"
                  }
                  description="This is the same feature customers see; it stays in place and grays out until their plan includes it."
                >
                  {customerView === "leads" ? (
                    <section className={`${panel} p-5 sm:p-7`}>
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold">Customer list</h3>
                        <button
                          type="button"
                          onClick={() => setShowLeadForm(!showLeadForm)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#173d53] px-4 py-3 text-xs font-semibold text-white"
                        >
                          <Symbol name="plus" size={15} /> Add customer
                        </button>
                      </div>
                      {showLeadForm && (
                        <form
                          onSubmit={saveLead}
                          className="mb-6 grid gap-3 rounded-xl bg-[#f2f9ff] p-4 sm:grid-cols-2"
                        >
                          {[
                            ["Customer name", "contactName"],
                            ["Business", "businessName"],
                            ["Phone", "phone"],
                            ["Service needed", "service"],
                          ].map(([title, key]) => (
                            <label
                              key={key}
                              className="block text-xs font-semibold text-[#6a8697]"
                            >
                              {title}
                              <input
                                value={lead[key]}
                                onChange={(e) =>
                                  setLead({ ...lead, [key]: e.target.value })
                                }
                                className={`mt-2 ${input}`}
                              />
                            </label>
                          ))}
                          <label className="block text-xs font-semibold text-[#6a8697] sm:col-span-2">
                            Notes
                            <textarea
                              value={lead.notes}
                              onChange={(e) =>
                                setLead({ ...lead, notes: e.target.value })
                              }
                              className={`mt-2 min-h-20 ${input}`}
                            />
                          </label>
                          <button
                            disabled={busy === "lead"}
                            className="rounded-xl bg-[#1e455b] px-5 py-3 text-sm font-semibold text-white"
                          >
                            Save customer
                          </button>
                        </form>
                      )}
                      {canUseCRM&&leads.length ? (
                        leads.map((c) => (
                          <ListRecord
                            key={c.id}
                            title={
                              c.contactName ||
                              c.businessName ||
                              c.phone ||
                              "New customer"
                            }
                            detail={[
                              c.phone,
                              c.email,
                              c.service,
                              c.summary || c.requestedDate,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                            meta={
                              c.bookingStatus === "requested"
                                ? "Appointment request"
                                : c.type === "call_lead"
                                  ? "Call lead"
                                  : c.status || "New"
                            }
                          />
                        ))
                      ) : (
                        <Empty
                          title="Your customer list is clear"
                          description="Add your first customer or let your receptionist capture incoming inquiries."
                        />
                      )}
                    </section>
                  ) : (
                    <section className={`${panel} p-5 sm:p-7`}>
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold">Appointments</h3>
                        <button
                          type="button"
                          onClick={() =>
                            setShowAppointmentForm(!showAppointmentForm)
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-[#173d53] px-4 py-3 text-xs font-semibold text-white"
                        >
                          <Symbol name="plus" size={15} /> Add appointment
                        </button>
                      </div>
                      {showAppointmentForm && (
                        <form
                          onSubmit={saveAppointment}
                          className="mb-6 grid gap-3 rounded-xl bg-[#f2f9ff] p-4 sm:grid-cols-2"
                        >
                          {[
                            ["Customer name", "customerName", "text"],
                            ["Phone", "phone", "tel"],
                            ["Date", "date", "date"],
                            ["Time", "time", "time"],
                            ["Service", "service", "text"],
                          ].map(([title, key, type]) => (
                            <label
                              key={key}
                              className="block text-xs font-semibold text-[#6a8697]"
                            >
                              {title}
                              <input
                                required={[
                                  "customerName",
                                  "date",
                                  "time",
                                ].includes(key)}
                                type={type}
                                value={appointment[key]}
                                onChange={(e) =>
                                  setAppointment({
                                    ...appointment,
                                    [key]: e.target.value,
                                  })
                                }
                                className={`mt-2 ${input}`}
                              />
                            </label>
                          ))}
                          <button
                            disabled={busy === "appointment"}
                            className="rounded-xl bg-[#1e455b] px-5 py-3 text-sm font-semibold text-white"
                          >
                            Save appointment
                          </button>
                        </form>
                      )}
                      {canBook&&appointments.length ? (
                        appointments.map((a) => (
                          <ListRecord
                            key={a.id}
                            title={
                              a.customerName ||
                              a.title ||
                              a.service ||
                              "Appointment"
                            }
                            detail={
                              [a.service, a.date, a.time]
                                .filter(Boolean)
                                .join(" · ") || freshDate(a.createdAt)
                            }
                            meta={a.status || "Scheduled"}
                          />
                        ))
                      ) : (
                        <Empty
                          title="No appointments yet"
                          description="New bookings and appointments you add will appear here."
                        />
                      )}
                    </section>
                  )}
                </FeatureGate>
              </div>
            )}
            {page === "marketing" && (
              <div>
                <SectionHeading
                  eyebrow="GROWTH TOOLS"
                  title="Lead generation that stays useful."
                  description="Email, text-back and follow-up tools appear for every account, with access controlled by the customer's plan."
                />
                <MarketingHub
                  user={user}
                  workspace={workspace}
                  planKey={effectivePlanKey}
                  founderAdmin={founder && previewPlan === null}
                  simulating={founder && previewPlan !== null}
                />
              </div>
            )}
            {page === "website" && founder && prospectSiteMakerId && (
              <FounderProspectSiteMaker user={user} prospectId={prospectSiteMakerId}
                onBack={()=>{setProspectSiteMakerId("");changePage("sales")}}
                onOpenSms={()=>{setProspectSiteMakerId("");setLastSalesTab("sms");changePage("sales")}}/>
            )}
            {page === "settings" && (
              <div>
                <SectionHeading
                  eyebrow="YOUR BUSINESS"
                  title="Simple settings."
                  description="Manage the details people see, your phone line, and the services you connect."
                />
                <div className="mb-6 flex flex-wrap gap-2">
                  {[
                    { id: "business", title: "Business details" },
                    { id: "phone", title: "Phone" },
                    { id: "connections", title: "Connections" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsSection(item.id)}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${settingsSection === item.id ? "border-[#173d53] bg-[#173d53] text-white" : "border-[#d8e7ef] bg-white text-[#6a8697]"}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
                {settingsSection === "business" && (
                  <section className={`${panel} max-w-[860px] p-6 sm:p-8`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">
                          About your business
                        </h3>
                        <p className="mt-2 text-sm text-[#7893a4]">
                          Keep your contact details accurate.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#edf8ff] px-4 py-2 text-xs font-semibold text-[#4f7790]">
                        Account {workspace.accountNumber || "pending"}
                      </span>
                    </div>
                    <form
                      onSubmit={saveBusiness}
                      className="mt-7 grid gap-5 sm:grid-cols-2"
                    >
                      <label className="text-xs font-semibold text-[#50738a]">
                        Business name
                        <input required maxLength={80} value={profile.businessName}
                          onChange={e=>setProfile({...profile,businessName:e.target.value})}
                          className={`mt-2 ${input}`}/>
                      </label>
                      <label className="text-xs font-semibold text-[#50738a]">
                        Business type
                        <select required value={SITE_INDUSTRIES.some(x=>x.id===profile.businessType)?profile.businessType:"other"}
                          onChange={e=>setProfile({...profile,businessType:e.target.value})}
                          className={`mt-2 ${input}`}>
                          {SITE_INDUSTRIES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
                          <option value="other">Other — describe my business</option>
                        </select>
                      </label>
                      {(profile.businessType==="other"||!SITE_INDUSTRIES.some(x=>x.id===profile.businessType))&&
                        <label className="text-xs font-semibold text-[#50738a] sm:col-span-2">
                          Other business type
                          <input maxLength={90} required value={profile.businessTypeOther}
                            onChange={e=>setProfile({...profile,businessTypeOther:e.target.value})}
                            placeholder="e.g. Mobile phone repair, event rental, appliance installation"
                            className={`mt-2 ${input}`}/>
                        </label>}
                      <label className="text-xs font-semibold text-[#50738a] sm:col-span-2">
                        Business description <span className="ml-1 font-normal text-[#7895a6]">· used to personalize your FUGTH-managed website</span>
                        <textarea rows={8} maxLength={4000} value={profile.businessDescription}
                          onChange={e=>setProfile({...profile,businessDescription:e.target.value})}
                          placeholder={"Tell FUGTH about your business in your own words.\n\nWhat services do you offer? Who are your customers? What areas do you cover? What makes your business different? Include specialties, types of jobs, products, and the tone your website should use.\n\nServices: Panel upgrades, EV chargers, generator installation"}
                          className={`mt-2 min-h-[190px] resize-y ${input}`}/>
                        <span className="mt-2 block text-[11px] font-normal leading-5 text-[#7a91a0]">
                          Add as much detail as possible. FUGTH checks your keywords to choose an industry and personalize your website. Avoid passwords, cards or sensitive customer information. {profile.businessDescription.length}/4000 characters.
                        </span>
                      </label>
                      {[
                        ["Business phone","phone"],
                        ["Service area","serviceArea"],
                        ["Call notification email","notificationEmail"],
                        ["Owner mobile for optional text alerts","notificationPhone"],
                      ].map(([title,key])=><label key={key} className="text-xs font-semibold text-[#50738a]">
                        {title}<input value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}
                          className={`mt-2 ${input}`}/>
                      </label>)}
                      <BusinessOpeningHours value={profile.openingHours} onChange={openingHours=>setProfile({...profile,openingHours})}/>
                      <div className="rounded-xl border border-[#cee7f4] bg-[#eff9ff] p-4 text-xs leading-6 text-[#557e96] sm:col-span-2">
                        <strong className="text-[#1d5576]">Need to control actual appointment availability?</strong> Choose <button type="button"
                          onClick={()=>{setSettingsSection("connections");window.scrollTo({top:0,behavior:"smooth"});}}
                          className="font-bold text-[#1f719b] underline">Connections → Booking hours</button> for a day-by-day schedule. Existing saved hours won't be erased.
                      </div>
                      <label className="flex items-start gap-3 text-xs leading-6 text-[#6b879a] sm:col-span-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={profile.callSmsAlertsEnabled}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              callSmsAlertsEnabled: e.target.checked,
                            })
                          }
                        />
                        <span>
                          I agree to receive SMS call summaries at my owner
                          mobile number when the SMS connection is enabled.
                          Carrier messaging rates may apply. Configured email or
                          in-app alerts are the fallback.
                        </span>
                      </label>
                      <div className="sm:col-span-2">
                        <button
                          disabled={busy === "profile"}
                          className="rounded-xl bg-[#173d53] px-6 py-3.5 text-sm font-semibold text-white"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#e5eef4] pt-6">
                      <div>
                        <p className="text-sm font-semibold">
                          Your FUGTH subscription
                        </p>
                        <p className="mt-1 text-xs text-[#8da3b1]">{plan}</p>
                      </div>
                      <Link
                        href="/plans"
                        className="rounded-xl border border-[#d7e7f0] px-4 py-3 text-xs font-semibold"
                      >
                        Manage plan ↗
                      </Link>
                    </div>
                  </section>
                )}
                {settingsSection === "phone" && (
                  <FeatureGate locked={!canUseVoice}
                    title="Phone setup is an AI receptionist feature"
                    description="Website-only and free accounts can preview phone setup, but an Essential plan or higher is required to request or configure a FUGTH voice line.">
                    <PhoneSetup user={canUseVoice?user:null} workspace={canUseVoice?workspace:{}} locked={!canUseVoice}/>
                  </FeatureGate>
                )}
                {settingsSection === "connections" && (
                  <>
                    <FeatureGate locked={!canBook}
                      title="Booking rules unlock with Essential"
                      description="Your Google connection can still be linked below. Configuring active bookings and appointment availability requires a call-and-CRM plan.">
                      <BookingAvailabilitySettings user={canBook?user:null}/>
                    </FeatureGate>
                    <div className="mt-6">
                      <GoogleCalendarConnection />
                    </div>
                  </>
                )}
              </div>
            )}
            {page === "accounts" && founder && (
              <div>
                <SectionHeading
                  eyebrow="FUGTH OPERATIONS"
                  title="Accounts & access."
                  description="Review FUGTH members, account tiers, last sign-ins and founder-authorized access."
                />
                <FounderAccountDirectory />
              </div>
            )}
            {page === "accounts" && !founder && (
              <Empty
                title="This area is private"
                description="Accounts can only be managed by verified FUGTH administrators."
              />
            )}
            {page === "sales" && founder && (
              <div>
                <FounderSalesDesk user={user} onOpenMarketing={()=>changePage("marketing")} onOpenSiteMaker={openProspectSiteMaker} initialTab={lastSalesTab} onTabChange={setLastSalesTab}/>
              </div>
            )}
            {page === "sales" && !founder && (
              <Empty
                title="Sales desk is private"
                description="Sign in with a verified FUGTH management account to access calling and prospecting."
              />
            )}
            {page === "gguf" && founder && (
              <div>
                <FounderGgufWriter user={user}/>
              </div>
            )}
            {page === "admin" && founder && (
 <div>
  <SectionHeading eyebrow="FUGTH INTERNAL" title="Founder Operations"
   description="One management center with three focused areas. Pierre's calling, SMS and email stay separate in Cold Calling."/>
  <nav role="tablist" aria-label="Founder operations" className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl border border-[#d4e7f0] bg-white p-2 sm:flex sm:flex-wrap sm:gap-2 sm:p-3">
   {[["customers","Accounts & websites","Accounts"],["salesAi","Sales & AI tools","Sales / AI"],["platform","Platform & billing","Billing"]].map(([id,label,short])=><button key={id} type="button" role="tab" aria-selected={adminSection===id}
    onClick={()=>setAdminSection(id)} className={"min-h-[48px] rounded-xl px-2 py-3 text-[11px] font-black sm:px-5 sm:text-xs "+(adminSection===id?"bg-[#193d53] text-white":"border border-[#cddfe9] bg-[#f5faff] text-[#2c5770]")}><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></button>)}
  </nav>
  <div className="mb-5 grid grid-cols-3 gap-2 sm:hidden" aria-label="Founder outreach shortcuts">
   {[["leads","Prospects"],["sms","SMS"],["email","Email"]].map(([id,label])=><button type="button" key={id}
    onClick={()=>{setLastSalesTab(id);changePage("sales")}}
    className="min-h-[48px] rounded-xl border border-[#b8d7e7] bg-[#eff8fd] px-2 py-2 text-xs font-black text-[#235778]">{label} ↗</button>)}
  </div>
  {adminSection==="customers"&&<div role="tabpanel" className="space-y-6">
   <div className="rounded-2xl border border-[#d4e7f0] bg-[#edf7fe] p-4 text-xs leading-6"><strong className="block text-sm">Accounts, bookings and client websites</strong> Manage website ownership, accounts and registered customers. Paid entitlements still come from verified Stripe payments.</div>
   <FounderBookingCalendar user={user}/>
   <FounderSiteClaims/>
   <FounderAccountDirectory/>
   <section className={`${panel} p-6 sm:p-8`}>
                    <h3 className="text-xl font-semibold">
                      Create a customer account
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#7493a6]">
                      Create an account for a business you spoke with. Share the
                      private activation link directly with its owner.
                    </p>
                    <form
                      onSubmit={createClient}
                      className="mt-6 grid gap-4 md:grid-cols-3"
                    >
                      <label className="text-xs font-semibold text-[#637f91]">
                        Business name
                        <input
                          required
                          maxLength={80}
                          value={clientForm.businessName}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              businessName: e.target.value,
                            })
                          }
                          className={`mt-2 ${input}`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-[#637f91]">
                        Customer email
                        <input
                          required
                          type="email"
                          value={clientForm.email}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              email: e.target.value,
                            })
                          }
                          className={`mt-2 ${input}`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-[#637f91]">
                        Industry
                        <select
                          value={clientForm.businessType}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              businessType: e.target.value,
                            })
                          }
                          className={`mt-2 ${input}`}
                        >
                          {[
                            ["general", "Local business"],
                            ["roofing", "Roofing"],
                            ["cleaning", "Cleaning"],
                            ["petgrooming", "Pet grooming"],
                            ["dental", "Dental"],
                            ["clinic", "Medical"],
                            ["salon", "Beauty"],
                            ["wedding", "Bridal & weddings"],
                            ["legal", "Legal"],
                            ["hvac", "Heating and cooling"],
                            ["automotive", "Automotive"],
                            ["realestate", "Real estate"],
                            ["restaurant", "Restaurant"],
                            ["landscaping", "Landscaping"],
                            ["contractor", "Contractor"],
                          ].map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-[#637f91]">
                        Business phone
                        <input
                          maxLength={32}
                          value={clientForm.phone}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              phone: e.target.value,
                            })
                          }
                          className={`mt-2 ${input}`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-[#637f91]">
                        Service area
                        <input
                          maxLength={100}
                          placeholder="Miami-Dade County"
                          value={clientForm.serviceArea}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              serviceArea: e.target.value,
                            })
                          }
                          className={`mt-2 ${input}`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-[#637f91]">
                        Business hours
                        <input
                          maxLength={100}
                          placeholder="Mon–Fri, 8 AM–6 PM"
                          value={clientForm.hours}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              hours: e.target.value,
                            })
                          }
                          className={`mt-2 ${input}`}
                        />
                      </label>
                      <div className="md:col-span-3">
                        <button
                          disabled={busy === "client"}
                          className="rounded-xl bg-[#173d53] px-5 py-3 text-sm font-semibold text-white"
                        >
                          {busy === "client"
                            ? "Creating…"
                            : "Create account + website"}
                        </button>
                      </div>
                    </form>
                    {clientResult && (
                      <div className="mt-5 rounded-xl border border-[#dcebf4] bg-[#f3faff] p-5 text-sm">
                        <p className="font-semibold">
                          New account{" "}
                          {clientResult.accountNumber &&
                            "#" + clientResult.accountNumber}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4">
                          {clientResult.siteUrl && (
                            <Link
                              href={clientResult.siteUrl}
                              target="_blank"
                              className="font-semibold underline"
                            >
                              Open customer website ↗
                            </Link>
                          )}
                          {clientResult.activationLink && (
                            <button
                              type="button"
                              onClick={() =>
                                navigator.clipboard?.writeText(
                                  clientResult.activationLink,
                                )
                              }
                              className="font-semibold underline"
                            >
                              Copy private activation link
                            </button>
                          )}
                        </div>
                        {clientResult.activationNeeded && (
                          <p className="mt-3 text-xs text-[#64849a]">
                            Activation has not been emailed automatically. Share
                            the link privately with this business owner.
                          </p>
                        )}
                      </div>
                    )}
                  </section>
   <FounderSites user={user}/>
  </div>}
  {adminSection==="salesAi"&&<div role="tabpanel" className="space-y-6">
   <div className="rounded-xl border border-[#d6e8f1] bg-[#eef8fc] p-4 text-xs leading-6"><strong className="block text-sm">Sales & AI tools</strong> Pierre's referral calling map, call training, SMS and email outreach stay in Cold Calling.
    <button type="button" className="ml-2 font-black underline" onClick={()=>changePage("sales")}>Open Cold Calling ↗</button>
   </div>
   <FounderGgufWriter user={user}/>
   <FounderDemoControls/>
  </div>}
  {adminSection==="platform"&&<div role="tabpanel" className="space-y-6">
   <FounderRevenuePlanner/>
   <FounderBillingHealth/>
   <FounderVoiceHealth/>
   <FounderDomainLaunch user={user}/>
  </div>}
 </div>
)}
{page === "admin" && !founder && (
              <Empty
                title="This area is private"
                description="Administration is available only to authorized FUGTH team accounts."
              />
            )}
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#d4e7f0] pt-6 text-[11px] text-[#708b9a]">
          <span>© 2026 FUGTH Chat LLC · One business. One connected workspace.</span>
          <div className="flex flex-wrap gap-4"><Link href="/privacy" className="hover:underline">Privacy</Link><Link href="/terms" className="hover:underline">Terms</Link><Link href="/cookies" className="hover:underline">Cookies</Link><Link href="/plans" className="font-bold hover:underline">Subscriptions ↗</Link></div>
        </footer>
      </div>
    </main>
  );
}
