"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const stripeLinks = {
  starter: "https://buy.stripe.com/dRmeVdaGld685fo4984ko00",
  growth: "https://buy.stripe.com/3cI14n5m1d68cHQ6hg4ko01",
  elite: "https://buy.stripe.com/5kQ7sL4hXaY037gbBA4ko02",
};

const BUSINESS_TYPES = [
  "Dental",
  "Roofing",
  "HVAC/Plumbing",
  "Auto Repair",
  "Law Firm",
  "Medical Spa",
  "Barber/Salon",
  "Landscaper",
  "Pet Groomer",
  "Influencer",
  "Other"
];

const defaultWorkspace = {
  businessName: "",
  services: "",
  serviceArea: "",
  pricing: "",
  faqs: "",
  teamMembers: "",
  phoneNumbers: "",
  emergencyContacts: "",
  hours: "",
  tone: "Professional",
  emergencyRule: "",
  automations: "",
  averageJobValue: "200",
  industry: "",
  assistantId: "",
  phoneNumber: "",
  voiceConfigured: false,
  planTier: "starter",
  planStatus: "trial",
  billingActive: false,
};

const pricingPlans = [
  {
    key: "starter",
    name: "Starter",
    prices: { monthly: 49, quarterly: 139, semiAnnual: 269 },
    badge: "Launch Plan",
    description: "Essential voice line infrastructure built to handle missed calls and eliminate silent voicemail fields.",
    features: ["1 Dedicated Phone Line", "Basic Intake AI Support", "Email Sync Routing", "Standard Analytical Logs"]
  },
  {
    key: "growth",
    name: "Growth",
    prices: { monthly: 149, quarterly: 419, semiAnnual: 799 },
    badge: "Most Popular",
    description: "Advanced cognitive memory paths configured to automate live calendar scheduling and capture high volumes.",
    features: ["3 Connected Voice Lines", "Advanced Executive AI Node", "Live Integrated Booking Scheduler", "Priority Operations Support"]
  },
  {
    key: "elite",
    name: "Elite",
    prices: { monthly: 499, quarterly: 1429, semiAnnual: 2699 },
    badge: "Enterprise Scale",
    description: "Unrestricted corporate automation layers with custom voice synthesis clones and white-glove setup frameworks.",
    features: ["Unlimited Active Phone Lines", "Custom Voice Cloning Assets", "Deep Bi-directional CRM Syncing", "Dedicated Account Architect"]
  }
];

// Bulletproof Date Formatter to prevent Client-Side crashes from Firestore Timestamps
function formatSafeDate(ts) {
  if (!ts) return "Recent Session";
  if (ts.toDate) return ts.toDate().toLocaleString(); 
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "Recent Session";
  return d.toLocaleString();
}

function Icon({ name, className = "h-5 w-5" }) {
  if (name === "overview") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="4" rx="1" />
        <rect x="14" y="10" width="7" height="11" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === "calls") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92V21a1 1 0 01-1.11 1 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012 3.11 1 1 0 013 2h4.09a1 1 0 011 .75c.12.86.37 1.7.72 2.5a1 1 0 01-.24 1L8.7 8.7a16 16 0 006 6l1.44-1.44a1 1 0 011-.24c.8.35 1.64.6 2.5.72a1 1 0 01.75 1z" />
      </svg>
    );
  }
  if (name === "leads") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    );
  }
  if (name === "mic") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3M8 22h8" />
      </svg>
    );
  }
  if (name === "knowledge") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 0 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 000-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.02a1.65 1.65 0 001 0h.02a1.65 1.65 0 001.82-.33l.06-.06A2 2 0 0122 6.17l-.06.06a1.65 1.65 0 00-.33 1.82v.02a1.65 1.65 0 000 1z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function LineChart({ values }) {
  const safeValues = values && values.length ? values : [15, 22, 19, 32, 45, 40, 58];
  const width = 260;
  const height = 92;
  const max = Math.max(...safeValues, 1);
  const step = width / Math.max(safeValues.length - 1, 1);
  const points = safeValues.map((value, idx) => `${idx * step},${height - (value / max) * (height - 10) - 5}`).join(" ");
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-24 w-full overflow-visible">
      <defs>
        <linearGradient id="glow-panel-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#glow-panel-gradient)" />
      <polyline points={points} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PricingCards({ currentPlan = "", compact = false, onCheckout, guestMode = false, busyPlan = "" }) {
  const [cycle, setCycle] = useState("monthly");

  return (
    <div className="w-full">
      <div className="flex justify-center mb-6">
        <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-full">
          {[
            { id: "monthly", label: "Monthly" },
            { id: "quarterly", label: "Quarterly" },
            { id: "semiAnnual", label: "6 Months" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCycle(item.id)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all ${
                cycle === item.id ? "bg-white text-black" : "text-zinc-500 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"}`}>
        {pricingPlans.map((plan) => {
          const featured = plan.key === "growth";
          const isCurrent = currentPlan === plan.key;
          
          return (
            <div key={plan.key} className={`flex flex-col rounded-[1.8rem] border p-5 bg-zinc-950/60 backdrop-blur transition-all duration-300 ${featured ? "border-zinc-500 shadow-[0_0_35px_rgba(255,255,255,0.04)]" : "border-zinc-800"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{plan.badge}</span>
                  <h4 className="text-lg font-bold text-white mt-0.5">{plan.name}</h4>
                </div>
                {isCurrent && <span className="bg-white text-black text-[9px] font-black px-2 py-0.5 rounded">Active</span>}
              </div>

              <div className="mt-4 flex items-baseline gap-0.5">
                <span className="text-3xl font-black text-white">${plan.prices[cycle]}</span>
                <span className="text-xs text-zinc-500">/{cycle === "monthly" ? "mo" : cycle === "quarterly" ? "qtr" : "6mo"}</span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-zinc-400 min-h-[48px]">{plan.description}</p>
              <div className="h-px bg-zinc-800/50 my-4" />

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="h-1 w-1 bg-white rounded-full shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => !isCurrent && onCheckout?.(plan.key, cycle)}
                disabled={isCurrent || busyPlan === plan.key}
                className={`w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isCurrent ? "bg-zinc-900/40 text-zinc-600 cursor-not-allowed" : featured ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                {busyPlan === plan.key ? "Connecting Link..." : guestMode ? "Sign Up" : isCurrent ? "Active Tier" : "Select Tier"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BusinessOSShell({ locked = false, authReady = true }) {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [workspace, setWorkspace] = useState(defaultWorkspace);
  const [workspaceDraft, setWorkspaceDraft] = useState(defaultWorkspace);
  const [calls, setCalls] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [leads, setLeads] = useState([]);

  const [dataReady, setDataReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pricingPlanLoading, setPricingPlanLoading] = useState("");

  // Dev Sandbox Control Parameters
  const [devBusinessName, setDevBusinessName] = useState("");
  const [devIndustry, setDevIndustry] = useState("");
  const [devServices, setDevServices] = useState("");
  const [devPersona, setDevPersona] = useState("Receptionist");
  const [devVoiceId, setDevVoiceId] = useState("sara");
  const [devCustomPrompt, setDevCustomPrompt] = useState("");
  const [devPhoneNumber, setDevPhoneNumber] = useState("");
  const [devDialing, setDevDialing] = useState(false);
  const [devStatusLog, setDevStatusLog] = useState("");

  // Quick Appt Controls
  const [apptName, setApptName] = useState("");
  const [apptPhone, setApptPhone] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");

  // Strategic Advisory Logs
  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorLog, setAdvisorLog] = useState([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const isDevAdmin = user && (
    user.email?.toLowerCase() === "fugthmanagement@gmail.com" || 
    user.email?.toLowerCase() === "mepenginestudio@gmail.com"
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      if (!currentUser) {
        setWorkspace(defaultWorkspace);
        setWorkspaceDraft(defaultWorkspace);
        setCalls([]);
        setAppointments([]);
        setLeads([]);
        setDataReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!db || !user) return undefined;
    setDataReady(false);

    const unsubWS = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const combined = { ...defaultWorkspace, ...d };
        setWorkspace(combined);
        setWorkspaceDraft(combined);
        if (!d.businessName || !d.industry) {
          setShowOnboarding(true);
        }
      } else {
        setShowOnboarding(true);
      }
      setDataReady(true);
    });

    const unsubCalls = onSnapshot(query(collection(db, "users", user.uid, "calls"), orderBy("timestamp", "desc")), (snap) => {
      setCalls(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {});

    const unsubAppts = onSnapshot(query(collection(db, "users", user.uid, "appointments"), orderBy("scheduledTime", "desc")), (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {});

    const unsubLeads = onSnapshot(query(collection(db, "users", user.uid, "leads"), orderBy("timestamp", "desc")), (snap) => {
      setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {});

    return () => {
      unsubWS();
      unsubCalls();
      unsubAppts();
      unsubLeads();
    };
  }, [user]);

  const cleanObjectForFirestore = (obj) => {
    if (obj === null || obj === undefined) return "";
    if (Array.isArray(obj)) return obj.map(v => cleanObjectForFirestore(v));
    if (typeof obj === "object") {
      const output = {};
      Object.entries(obj).forEach(([k, v]) => {
        if (v !== undefined) output[k] = cleanObjectForFirestore(v);
      });
      return output;
    }
    return obj;
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceDraft.businessName?.trim() || !workspaceDraft.industry) {
      alert("Please configure trading name and industry layer.");
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        businessName: workspaceDraft.businessName.trim(),
        industry: workspaceDraft.industry,
        planTier: "starter",
        planStatus: "trial",
        createdAt: new Date().toISOString()
      }, { merge: true });
      setShowOnboarding(false);
    } catch (err) {
      alert("Failed to save onboarding configuration: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const commitWorkspaceSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage("");
    try {
      await setDoc(doc(db, "users", user.uid), cleanObjectForFirestore(workspaceDraft), { merge: true });
      setSaveMessage("Workspace attributes successfully loaded into core storage nodes.");
    } catch (err) {
      setSaveMessage("Error syncing settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const syncProfileToDevSandbox = () => {
    setDevBusinessName(workspace.businessName || "");
    setDevIndustry(workspace.industry || "");
    setDevServices(workspace.services || "");
    setDevCustomPrompt(`You are an interactive operational voice proxy receptionist for ${workspace.businessName || "our business"}. Active segment: ${workspace.industry || "General Commerce"}. Services context: ${workspace.services || "All standard operations"}. Operate with maximum professional courtesy, answer inbound tracks, qualified client criteria, and prompt them to secure an engineering review appointment slot.`);
    setDevStatusLog("Workspace specifications mirrored into operational script testing frame.");
  };

  const exportDevSandboxToWorkspace = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const modified = {
        ...workspaceDraft,
        businessName: devBusinessName,
        industry: devIndustry,
        services: devServices
      };
      await setDoc(doc(db, "users", user.uid), cleanObjectForFirestore(modified), { merge: true });
      setDevStatusLog("Sandbox settings compiled and committed back to live system config.");
    } catch (err) {
      setDevStatusLog("Export breakdown: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerSandboxCallSimulation = async (e) => {
    e.preventDefault();
    if (!devPhoneNumber) {
      alert("Provide a destination mobile telephone number.");
      return;
    }
    setDevDialing(true);
    setDevStatusLog("Assembling network packets... Triggering voice system dispatch carrier loop.");
    try {
      const res = await fetch("/api/dev/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: devPhoneNumber,
          customPrompt: devCustomPrompt || "Act as an efficient customer intake system.",
          businessName: devBusinessName || "Sandbox Terminal Node",
          voiceId: devVoiceId,
          industry: devIndustry,
          persona: devPersona
        })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server returned non-JSON response (likely API error): ${text.substring(0, 40)}...`);
      }

      if (res.ok && data.success) {
        setDevStatusLog(`Call launched — ID: ${data.callId || "active"}`);
        await addDoc(collection(db, "users", user.uid, "calls"), {
          caller: devPersona || "Dev Agent Proxy",
          phone: devPhoneNumber,
          timestamp: new Date().toISOString(),
          outcome: "Demo Dialed",
          sentiment: "Neutral",
          summary: `Demonstration track initiated to customer wire network. Tone: ${workspace.tone || 'Standard'}. Assistant Type: ${devPersona}.`,
          transcript: "Active link stream generated. Processing recording files on terminal hangup hook."
        });
      } else {
        setDevStatusLog(`Simulation carrier reject: ${data.error || "Route timeout"}`);
      }
    } catch (err) {
      setDevStatusLog(`Local interface crash exception: ${err.message}`);
    } finally {
      setDevDialing(false);
    }
  };

  const submitSandboxAppointment = async (e) => {
    e.preventDefault();
    if (!apptName || !apptPhone || !user) return;
    try {
      const targetTime = apptTime || new Date().toISOString();
      await addDoc(collection(db, "users", user.uid, "appointments"), {
        clientName: apptName,
        phone: apptPhone,
        scheduledTime: targetTime,
        notes: apptNotes || "Committed via local development core.",
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "users", user.uid, "leads"), {
        name: apptName,
        phone: apptPhone,
        status: "Booked",
        timestamp: new Date().toISOString()
      });
      setApptName(""); setApptPhone(""); setApptTime(""); setApptNotes("");
      alert("Sandbox test booking registered successfully.");
    } catch (err) {
      alert("Failed writing database entity: " + err.message);
    }
  };

  const processAdvisorMatrix = async (e) => {
    e.preventDefault();
    if (!advisorInput.trim()) return;
    const currentText = advisorInput;
    setAdvisorLog(prev => [...prev, { role: "user", text: currentText }]);
    setAdvisorInput("");
    setAdvisorLoading(true);

    try {
      const analyticsContext = `Active Trading identity: ${workspace.businessName || "Fugth Systems Setup"}, Alignment: ${workspace.industry || "General Operations"}. Logs profile state: ${calls.length} logs records found, ${leads.length} tracking lead metrics inside system pipeline framework. Owner message node: ${currentText}`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: analyticsContext })
      });
      const data = await res.json();
      setAdvisorLog(prev => [...prev, { role: "ai", text: data.reply || "Strategic review completed. All operational metrics appear nominal." }]);
    } catch {
      setAdvisorLog(prev => [...prev, { role: "ai", text: "Strategic advisor routing fault. Please re-run strategy inquiry matrix." }]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans antialiased shadow-[0_0_50px_rgba(255,255,255,0.01)] select-none">
      
      {/* Onboarding Dialog Frame */}
      {showOnboarding && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl px-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6 rounded-[2rem] shadow-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Fugth System Hub</span>
            <h3 className="text-xl font-bold mt-1 text-white tracking-tight">Initialize Workspace Coordinates</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">Map your business details into the system matrix. This anchors the voice recognition networks and dashboard metrics handlers.</p>
            
            <form onSubmit={handleOnboardingSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Company / Business Name</label>
                <input 
                  type="text" 
                  value={workspaceDraft.businessName || ""}
                  onChange={e => setWorkspaceDraft(p => ({ ...p, businessName: e.target.value }))}
                  placeholder="e.g. Mike's Professional Roofing"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Industrial Segment</label>
                <select 
                  value={workspaceDraft.industry || ""}
                  onChange={e => setWorkspaceDraft(p => ({ ...p, industry: e.target.value }))}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all"
                >
                  <option value="">Select segment coordinate</option>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all"
              >
                {isSaving ? "Syncing Grid..." : "Launch Platform Operating System"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Framework Dashboard Wrap */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-screen">
        
        {/* Navigation Sidebar Panel */}
        <aside className="w-full lg:w-[240px] bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-900 flex flex-col p-5 shrink-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-white text-black font-black text-base flex items-center justify-center rounded-xl">F</div>
              <div>
                <h2 className="text-xs font-black tracking-widest uppercase text-white">Fugth</h2>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Business OS</p>
              </div>
            </div>
            <span className="text-[8px] font-black tracking-widest border border-zinc-800 bg-black px-2 py-0.5 rounded-md text-zinc-400 uppercase">{workspace.planTier || "trial"}</span>
          </div>

          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3 px-2">Navigation Tunnels</div>
          <nav className="space-y-1.5 flex-1">
            {[
              { id: "overview", label: "Overview Hub", icon: "overview" },
              { id: "calls", label: "Call Intelligence", icon: "calls" },
              { id: "leads", label: "Leads Manager", icon: "leads" },
              { id: "operations", label: "Operations Core", icon: "chart" },
              { id: "advisor", label: "AI Strategic Advisor", icon: "mic" },
              { id: "knowledge", label: "Knowledge Base", icon: "knowledge" },
              { id: "settings", label: "System Settings", icon: "settings" }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all font-medium ${
                    isActive ? "bg-white text-black font-bold shadow-md" : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                  }`}
                >
                  <Icon name={tab.icon} className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {isDevAdmin && (
              <div className="pt-5 border-t border-zinc-900 mt-5">
                <span className="text-[9px] font-black tracking-widest text-zinc-600 uppercase block px-2 mb-2">Admin Panel</span>
                <button
                  onClick={() => setActiveTab("dev")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                    activeTab === "dev" ? "bg-zinc-900 border-zinc-700 text-white shadow" : "border-transparent text-zinc-500 hover:text-white"
                  }`}
                >
                  <span>🛠️</span>
                  <span>Dev Operations</span>
                </button>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-4 border-t border-zinc-900 flex flex-col gap-2">
            <button onClick={() => setShowPricingModal(true)} className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-center">
              Upgrade Account
            </button>
            <button onClick={handleLogout} className="w-full text-center text-[9px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-all py-1">
              Logout
            </button>
          </div>
        </aside>

        {/* Content Viewer Space */}
        <main className="flex-1 bg-black p-6 lg:p-8 overflow-y-auto max-w-full">
          
          {/* TAB 1: OVERVIEW HUB */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {metricLabels.map((label, idx) => {
                  let statValue = "0";
                  if (idx === 0) statValue = String(calls.length);
                  if (idx === 1) statValue = String(leads.length);
                  if (idx === 2) statValue = String(appointments.length);
                  if (idx === 3) statValue = `$${((appointments.length || 0) * Number(workspace.averageJobValue || 200)).toLocaleString()}`;
                  if (idx === 4) statValue = String(Math.max(0, calls.length - appointments.length));
                  if (idx === 5) statValue = calls.length ? "100%" : "0%";

                  return (
                    <div key={label} className="border border-zinc-900 bg-zinc-950/40 p-4 rounded-xl flex flex-col justify-between min-h-[96px]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">{label}</span>
                      <span className="text-xl font-black text-white tracking-tight mt-2">{statValue}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="border border-zinc-900 bg-zinc-950/20 p-5 rounded-[2rem] lg:col-span-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Performance Tracking Log</h4>
                  <LineChart values={calls.length ? [5, 12, 8, 20, calls.length * 2, calls.length * 4, calls.length * 6] : null} />
                </div>
                <div className="border border-zinc-900 bg-zinc-950/20 p-5 rounded-[2rem] flex flex-col items-center justify-center text-center">
                  <RingMeter value={calls.length ? 100 : 0} label="System Capacity" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CALL INTELLIGENCE */}
          {activeTab === "calls" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                <h3 className="text-md font-black uppercase tracking-wider text-white">Call Log Index</h3>
                <span className="text-xs font-mono text-zinc-500">{calls.length} entries registered</span>
              </div>
              <div className="space-y-4">
                {calls.map((c, i) => (
                  <div key={c.id || i} className="border border-zinc-900 bg-zinc-950/40 p-5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-sm text-white">{c.caller || "Inbound Audio Track"}</h4>
                      <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded font-mono uppercase">{c.outcome || "Processed"}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono mt-1">{c.phone || "Unknown Number"} · {formatSafeDate(c.timestamp)}</p>
                    <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">{c.summary || "No description compiled yet."}</p>
                  </div>
                ))}
                {calls.length === 0 && <p className="text-xs text-zinc-600 text-center py-8 border border-dashed border-zinc-900 rounded-xl">No active sessions indexed in database terminal.</p>}
              </div>
            </div>
          )}

          {/* TAB 3: LEADS MANAGER */}
          {activeTab === "leads" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Acquired Pipeline Leads</h3>
              </div>
              <div className="overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-widest bg-black/40">
                      <th className="p-3">Client Prospect Name</th>
                      <th className="p-3">Phone Line Signature</th>
                      <th className="p-3">Status Layer</th>
                      <th className="p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {leads.map((l, i) => (
                      <tr key={l.id || i} className="hover:bg-zinc-900/30">
                        <td className="p-3 font-bold text-white">{l.name || "Anonymous Client"}</td>
                        <td className="p-3 font-mono text-zinc-400">{l.phone || "--"}</td>
                        <td className="p-3">
                          <span className="bg-white text-black px-2 py-0.5 rounded text-[10px] font-bold uppercase">{l.status || "Captured"}</span>
                        </td>
                        <td className="p-3 font-mono text-zinc-500">{formatSafeDate(l.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: OPERATIONS CORE */}
          {activeTab === "operations" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Appointment Framework Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-zinc-900 bg-zinc-950/40 p-4 rounded-xl">
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Simulated Base Ticket Value ($)</label>
                  <input 
                    type="number"
                    value={workspaceDraft.averageJobValue || ""}
                    onChange={e => setWorkspaceDraft(p => ({ ...p, averageJobValue: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 text-xs text-white p-2.5 rounded-lg focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="border border-zinc-900 bg-zinc-950/40 p-4 rounded-xl">
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Operational Timing Hours</label>
                  <input 
                    type="text"
                    value={workspaceDraft.hours || ""}
                    onChange={p => setWorkspaceDraft(prev => ({ ...prev, hours: p.target.value }))}
                    placeholder="Mon-Fri: 9am-6pm EST"
                    className="w-full bg-black border border-zinc-800 text-xs text-white p-2.5 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-widest">Scheduled Bookings</h4>
                {appointments.map((appt, i) => (
                  <div key={appt.id || i} className="p-4 border border-zinc-900 bg-zinc-950/30 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{appt.clientName || "Unnamed Client Slot"}</p>
                      <p className="text-zinc-500 font-mono mt-0.5">{appt.phone || "No Line Coordinates"}</p>
                    </div>
                    <span className="font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-md text-[11px]">
                      {formatSafeDate(appt.scheduledTime)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AI STRATEGIC ADVISOR */}
          {activeTab === "advisor" && (
            <div className="space-y-4 flex flex-col min-h-[500px] animate-fadeIn">
              <div className="border-b border-zinc-900 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Executive Consultation Core</h3>
              </div>
              <div className="flex-1 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
                <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[340px]">
                  {advisorLog.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3.5 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                        m.role === "user" ? "bg-white text-black font-semibold rounded-tr-none" : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none"
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={processAdvisorMatrix} className="p-3 bg-black border-t border-zinc-900 flex gap-2">
                  <input 
                    type="text"
                    value={advisorInput}
                    onChange={e => setAdvisorInput(e.target.value)}
                    placeholder="Analyze recent call trajectories or formulate campaign strategy rules..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500"
                  />
                  <button type="submit" className="bg-white text-black px-4 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all">
                    Inquire
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: KNOWLEDGE BASE */}
          {activeTab === "knowledge" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Cognitive Information Matrix</h3>
                <button onClick={commitWorkspaceSettings} disabled={isSaving} className="px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                  Commit Matrix
                </button>
              </div>
              {saveMessage && <p className="text-xs font-mono text-zinc-400 p-2 border border-zinc-800 bg-zinc-950 rounded">{saveMessage}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileFields.map(([field, label]) => (
                  <div key={field} className="border border-zinc-900 bg-zinc-950/40 p-3 rounded-xl">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">{label}</span>
                    <input 
                      type="text" 
                      value={workspaceDraft[field] || ""}
                      onChange={e => setWorkspaceDraft(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={`Configure ${label.toLowerCase()} settings`}
                      className="w-full bg-transparent border-0 p-0 text-xs text-white focus:outline-none focus:ring-0 mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SYSTEM SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-zinc-900 pb-2">Infrastructure Allocations</h3>
              <div className="border border-zinc-900 p-6 bg-zinc-950/40 rounded-[2rem]">
                <PricingCards currentPlan={workspace.planTier} onCheckout={(tier) => {
                  setPricingPlanLoading(tier);
                  setTimeout(() => { window.location.href = stripeLinks[tier] || "#"; }, 450);
                }} busyPlan={pricingPlanLoading} />
              </div>
            </div>
          )}

          {/* TAB 8: DEVELOPER OPERATIONS (ADMIN ONLY) */}
          {activeTab === "dev" && isDevAdmin && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border border-zinc-800 bg-zinc-900/60 p-5 rounded-[2rem] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-black font-black text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded">Admin Control</span>
                    <h3 className="text-md font-black uppercase text-white tracking-wider">Developer Operations Panel</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Spin up instant sandbox demo lines and inject custom instructions dynamically into proxy channels.</p>
                </div>
                
                <span className="text-xs font-mono text-zinc-500 bg-black/40 px-3 py-2 rounded-xl border border-zinc-800">
                  {workspace.phoneNumber ? `Linked: ${workspace.phoneNumber}` : "No Vapi number assigned"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Section 1: Business Info Tuning */}
                <div className="lg:col-span-2 border border-zinc-900 bg-zinc-950/40 p-5 rounded-[1.8rem] space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">1. Business Info & Assistant</h4>
                    <div className="flex gap-2">
                      <button onClick={syncProfileToDevSandbox} className="px-2.5 py-1.5 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded-lg bg-black hover:border-zinc-600 transition-all">Load From Workspace</button>
                      <button onClick={exportDevSandboxToWorkspace} className="px-2.5 py-1.5 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-700 transition-all">Apply to Workspace</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Business Name</label>
                      <input 
                        type="text" 
                        value={devBusinessName}
                        onChange={e => setDevBusinessName(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Industry</label>
                      <select 
                        value={devIndustry}
                        onChange={e => setDevIndustry(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="">Select industry coordinate</option>
                        {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Services / About</label>
                      <input 
                        type="text" 
                        value={devServices}
                        onChange={e => setDevServices(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Persona</label>
                      <select value={devPersona} onChange={e => setDevPersona(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                        <option value="Receptionist">Receptionist</option>
                        <option value="Concierge">Concierge</option>
                        <option value="Sales Closer">Sales Closer</option>
                        <option value="Scripted Closer">Scripted Closer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Voice Profile / Accent</label>
                    <div className="flex gap-4">
                      {["sara", "rachel", "jack"].map(v => (
                        <label key={v} className="flex items-center gap-1.5 text-xs text-zinc-300">
                          <input type="radio" name="devVoice" value={v} checked={devVoiceId === v} onChange={e => setDevVoiceId(e.target.value)} className="accent-white" />
                          <span className="capitalize">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Custom System Prompt</label>
                    <textarea 
                      rows={3} 
                      value={devCustomPrompt}
                      onChange={e => setDevCustomPrompt(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Section 2: Outbound Trigger Engine */}
                <div className="border border-zinc-900 bg-zinc-950/40 p-5 rounded-[1.8rem] flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-zinc-900 pb-2">2. Outbound Dialer</h4>
                    <form onSubmit={triggerSandboxCallSimulation} className="mt-4 space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-1">Target Mobile Number</label>
                        <input 
                          type="tel"
                          placeholder="e.g. +19176729891"
                          value={devPhoneNumber}
                          onChange={e => setDevPhoneNumber(e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={devDialing}
                        className="w-full py-3 bg-white text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-zinc-200 transition-all"
                      >
                        {devDialing ? "Routing Terminal Signal..." : "Trigger Test Call"}
                      </button>
                    </form>
                  </div>

                  <div className="p-3 bg-black border border-zinc-800 rounded-xl font-mono text-[10px] space-y-1">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-600 block">Console Diagnostic Stream</span>
                    <p className="text-zinc-300">{devStatusLog || "Ready to deploy sandbox outbound streams."}</p>
                  </div>
                </div>
              </div>

              {/* Sub-Rows: Recent Recordings & Manual Creation Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="border border-zinc-900 bg-zinc-950/40 p-5 rounded-[1.8rem]">
                  <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-3">Recent Audio Transcripts</h4>
                  <div className="space-y-3">
                    {calls.filter(c => c.outcome === "Demo Dialed").slice(0, 3).map((c, i) => (
                      <div key={i} className="p-3 bg-black border border-zinc-900 rounded-xl text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{c.caller || "Demo Representative"}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{c.phone}</p>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-1 rounded">Stream Active</span>
                      </div>
                    ))}
                    {calls.filter(c => c.outcome === "Demo Dialed").length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-6 border border-dashed border-zinc-900 rounded-xl">No test recordings found in terminal database.</p>
                    )}
                  </div>
                </div>

                <div className="border border-zinc-900 bg-zinc-950/40 p-5 rounded-[1.8rem]">
                  <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-3">Quick Appointment (Dev)</h4>
                  <form onSubmit={submitSandboxAppointment} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={apptName} onChange={e => setApptName(e.target.value)} placeholder="Client Name" className="p-2.5 bg-black border border-zinc-800 rounded-lg text-white" />
                      <input type="tel" value={apptPhone} onChange={e => setApptPhone(e.target.value)} placeholder="Phone Line" className="p-2.5 bg-black border border-zinc-800 rounded-lg text-white" />
                    </div>
                    <input type="datetime-local" value={apptTime} onChange={e => setApptTime(e.target.value)} className="w-full p-2.5 bg-black border border-zinc-800 rounded-lg text-white font-mono" />
                    <input type="text" value={apptNotes} onChange={e => setApptNotes(e.target.value)} placeholder="Inquiry notes metadata details..." className="w-full p-2.5 bg-black border border-zinc-800 rounded-lg text-white" />
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-white text-black font-black uppercase tracking-wider text-[10px] rounded-lg">Create Appointment</button>
                      <button type="button" onClick={() => { setApptName(""); setApptPhone(""); setApptTime(""); setApptNotes(""); }} className="px-3 py-2 bg-zinc-900 text-zinc-400 text-[10px] uppercase font-bold rounded-lg border border-zinc-800">Clear</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PricingModal({ open, currentPlan, onClose, onCheckout, busyPlan = "" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
      <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 p-6 rounded-[2.5rem] relative max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Infrastructure Provisions</span>
            <h3 className="text-xl font-bold text-white mt-0.5">Choose System Operating Framework</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xs uppercase font-black border border-zinc-800 px-3 py-1 rounded-xl bg-black">Close</button>
        </div>
        <PricingCards currentPlan={currentPlan} onCheckout={onCheckout} busyPlan={busyPlan} />
      </div>
    </div>
  );
}
