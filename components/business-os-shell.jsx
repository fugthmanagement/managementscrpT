"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const stripeLinks = {
  starter: "https://buy.stripe.com/dRmeVdaGld685fo4984ko00",
  growth: "https://buy.stripe.com/3cI14n5m1d68cHQ6hg4ko01",
  elite: "https://buy.stripe.com/5kQ7sL4hXaY037gbBA4ko02",
};

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
  planTier: "",
  planStatus: "",
  billingActive: false,
  notificationEmail: "",
  dailyDigest: true,
  mobileAlerts: true,
  compactView: false,
};

const pricingPlans = [
  {
    key: "starter",
    name: "Starter",
    price: "$49",
    badge: "Launch",
    description: "One line, one operator, clean entry into the OS.",
  },
  {
    key: "growth",
    name: "Growth",
    price: "$149",
    badge: "Popular",
    description: "Better follow-up, more throughput, stronger business memory.",
  },
  {
    key: "elite",
    name: "Elite",
    price: "$499",
    badge: "Scale",
    description: "Premium deployment for businesses running AI like infrastructure.",
  },
];

const metricLabels = [
  "Calls Today",
  "Leads Captured",
  "Appointments Booked",
  "Revenue Captured",
  "Missed Calls Saved",
  "AI Response Rate",
];

const profileFields = [
  ["businessName", "Business Name"],
  ["industry", "Industry"],
  ["services", "Services"],
  ["serviceArea", "Service Area"],
  ["pricing", "Pricing"],
  ["faqs", "FAQs"],
  ["teamMembers", "Team Members"],
  ["phoneNumbers", "Phone Numbers"],
  ["emergencyContacts", "Emergency Contacts"],
  ["hours", "Operating Hours"],
  ["averageJobValue", "Average Job Value"],
];

const tabThemes = {
  command: {
    badge: "border-zinc-700 bg-zinc-900 text-white",
    panel: "from-white/5 via-transparent to-transparent",
    glow: "shadow-[0_0_50px_rgba(255,255,255,0.05)]",
    label: "Revenue Ops",
  },
  brain: {
    badge: "border-zinc-700 bg-zinc-900 text-white",
    panel: "from-white/5 via-transparent to-transparent",
    glow: "shadow-[0_0_50px_rgba(255,255,255,0.05)]",
    label: "AI Training Core",
  },
  ai: {
    badge: "border-zinc-700 bg-zinc-900 text-white",
    panel: "from-white/5 via-transparent to-transparent",
    glow: "shadow-[0_0_50px_rgba(255,255,255,0.05)]",
    label: "Strategic Intelligence",
  },
};

const sidebarItems = [
  { key: "command", section: "overview", label: "Overview", icon: "home" },
  { key: "command", section: "calls", label: "Calls", icon: "phone" },
  { key: "command", section: "leads", label: "Leads", icon: "users" },
  { key: "command", section: "operations", label: "Operations", icon: "briefcase" },
  { key: "ai", section: "advisor", label: "AI Advisor", icon: "spark" },
  { key: "brain", section: "knowledge", label: "Knowledge", icon: "book" },
  { key: "brain", section: "files", label: "Files", icon: "folder" },
  { key: "brain", section: "settings", label: "Settings", icon: "gear" },
];

function SidebarIcon({ name, active = false }) {
  const stroke = active ? "currentColor" : "#98A2B3";

  const common = {
    fill: "none",
    stroke,
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      {name === "home" ? (
        <>
          <path {...common} d="M3.5 10.5L12 3.5l8.5 7" />
          <path {...common} d="M6.5 9.5v10h11v-10" />
        </>
      ) : null}
      {name === "phone" ? <path {...common} d="M8.3 4.8l2 3.7-1.5 1.8c1.1 2.2 2.8 3.9 5 5l1.8-1.5 3.7 2c-.4 1.4-1.6 2.4-3 2.4-6 0-10.8-4.8-10.8-10.8 0-1.4 1-2.6 2.8-2.6Z" /> : null}
      {name === "users" ? (
        <>
          <path {...common} d="M9 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
          <path {...common} d="M15.5 10.8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path {...common} d="M3.8 19.2c1.2-2.5 3-3.7 5.2-3.7 2.2 0 4 1.2 5.2 3.7" />
          <path {...common} d="M14.5 18.8c.9-1.7 2.2-2.6 3.9-2.6 1 0 1.8.2 2.8 1.1" />
        </>
      ) : null}
      {name === "briefcase" ? (
        <>
          <rect {...common} x="3.5" y="6.8" width="17" height="11.8" rx="2.2" />
          <path {...common} d="M9 6.8V5.7c0-.8.6-1.4 1.4-1.4h3.2c.8 0 1.4.6 1.4 1.4v1.1" />
          <path {...common} d="M3.8 11.4h16.4" />
        </>
      ) : null}
      {name === "spark" ? (
        <>
          <path {...common} d="M12 3.8l1.7 4.4L18 10l-4.3 1.8L12 16.2l-1.7-4.4L6 10l4.3-1.8L12 3.8Z" />
          <path {...common} d="M18.5 4.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
        </>
      ) : null}
      {name === "book" ? (
        <>
          <path {...common} d="M5.5 5.5h9a3 3 0 0 1 3 3v10h-9a3 3 0 0 0-3 3v-16Z" />
          <path {...common} d="M8.5 8.2h6" />
          <path {...common} d="M8.5 11.5h6" />
        </>
      ) : null}
      {name === "folder" ? (
        <>
          <path {...common} d="M3.5 7.5h5l1.8 2H20.5v8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" />
        </>
      ) : null}
      {name === "gear" ? (
        <>
          <circle {...common} cx="12" cy="12" r="3.2" />
          <path {...common} d="M12 3.8v2.1m0 12.2v2.1m8.2-8.2h-2.1M5.9 12H3.8m14.1-5.9-1.5 1.5M7.6 16.4l-1.5 1.5m0-11.8 1.5 1.5m8.8 8.8 1.5 1.5" />
        </>
      ) : null}
    </svg>
  );
}

function RingMeter({ value = 0, label }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#ffffff"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">{safeValue}%</div>
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
    </div>
  );
}

function LineChart({ values }) {
  const safeValues = values.length ? values : [12, 20, 28, 22, 36, 42, 55];
  const width = 260;
  const height = 92;
  const max = Math.max(...safeValues, 1);
  const step = width / Math.max(safeValues.length - 1, 1);
  const points = safeValues.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-6 h-24 w-full overflow-visible">
      <defs>
        <linearGradient id="line-fill-mono" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#line-fill-mono)" />
      <polyline points={points} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {safeValues.map((value, index) => {
        const x = index * step;
        const y = height - (value / max) * (height - 10) - 5;
        return <circle key={`mono-dot-${index}`} cx={x} cy={y} r="2.5" fill="#ffffff" />;
      })}
    </svg>
  );
}

function Waveform() {
  const bars = [42, 75, 58, 90, 34, 68, 52, 81, 37, 61, 46, 73, 55, 88, 49, 66, 41, 70, 53, 79];

  return (
    <div className="flex h-16 items-end gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-2 rounded-full bg-gradient-to-t from-zinc-700 to-white/80"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function EmptyPanel({ title, body, action }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-zinc-800 bg-gradient-to-br from-black/60 to-zinc-900/40 p-6 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-zinc-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ThemeSwitch({ themeMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-3 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300 transition hover:border-zinc-500"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${themeMode === "light" ? "bg-black" : "bg-white"}`} />
      {themeMode === "light" ? "Light" : "Dark"}
    </button>
  );
}

function PricingCards({ currentPlan = "", compact = false, onCheckout, guestMode = false, busyPlan = "" }) {
  return (
    <div className={`grid gap-4 ${compact ? "lg:grid-cols-3" : "md:grid-cols-3"}`}>
      {pricingPlans.map((plan) => {
        const featured = plan.key === "growth";
        const current = currentPlan === plan.key;
        const currentIndex = pricingPlans.findIndex((item) => item.key === currentPlan);
        const planIndex = pricingPlans.findIndex((item) => item.key === plan.key);
        const actionLabel = current
          ? "Current Plan"
          : currentIndex === -1
            ? "Get On This Plan"
            : planIndex > currentIndex
              ? `Upgrade to ${plan.name}`
              : `Switch to ${plan.name}`;

        return (
          <div key={plan.key} className={`rounded-[2rem] border p-5 transition ${featured ? "border-zinc-500 bg-white text-black shadow-[0_18px_50px_rgba(255,255,255,0.08)]" : "border-zinc-800 bg-black/40 text-white"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs uppercase tracking-[0.3em] ${featured ? "text-black/55" : "text-zinc-500"}`}>{plan.badge}</p>
                <h3 className="mt-2 text-2xl font-bold">{plan.name}</h3>
              </div>
              {current ? <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.26em] ${featured ? "bg-black text-white" : "border border-zinc-700 text-zinc-300"}`}>Current</span> : null}
            </div>
            <p className="mt-4 text-4xl font-black tracking-tight">{plan.price}</p>
            <p className={`mt-3 text-sm leading-7 ${featured ? "text-black/70" : "text-zinc-400"}`}>{plan.description}</p>
            <button
              type="button"
              onClick={() => !current && onCheckout?.(plan.key)}
              disabled={current || busyPlan === plan.key}
              className={`mt-6 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition ${current ? "pointer-events-none opacity-60" : ""} ${featured ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"}`}
            >
              {busyPlan === plan.key ? "Opening checkout..." : guestMode && !current ? "Create Account To Continue" : actionLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="rounded-full border border-zinc-800 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
      <span className="text-zinc-600">{label}</span> {value}
    </div>
  );
}

function formatTimestamp(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "No timestamp";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatFileSize(size) {
  if (!size) return "Unknown size";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function parseJsonResponse(response) {
  const raw = await response.text();

  try {
    return {
      ok: response.ok,
      status: response.status,
      payload: raw ? JSON.parse(raw) : {},
      raw,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      payload: null,
      raw,
      parseError: true,
    };
  }
}

function normalizeCall(id, data) {
  return {
    id,
    caller: data.caller || data.customerName || data.name || "Unknown caller",
    phone: data.phone || data.number || data.callerNumber || "No number",
    date: formatTimestamp(data.timestamp || data.createdAt),
    outcome: data.outcome || "Inquiry",
    sentiment: data.sentiment || "Neutral",
    summary: data.summary || "No summary saved yet.",
    rating: Number(data.rating || 0),
    duration: data.duration || "0:00",
    transcript: data.transcript || "",
    recording: data.recording || data.recordingUrl || "",
    revenue: Number(data.revenue || 0),
    aiHandled: data.aiHandled !== false,
    timestamp: data.timestamp || data.createdAt || null,
  };
}

function normalizeKnowledgeFile(id, data) {
  return {
    id,
    name: data.name || "Untitled file",
    type: data.type || "File",
    size: data.size || 0,
    tag: data.tag || "general",
    status: data.status || "Uploaded",
    usageCount: Number(data.usageCount || 0),
    url: data.url || "",
  };
}

function normalizeWorkspaceState(input) {
  return {
    ...defaultWorkspace,
    ...input,
    automations: Array.isArray(input?.automations) ? input.automations.join("\n") : input?.automations || "",
    averageJobValue: String(input?.averageJobValue ?? defaultWorkspace.averageJobValue),
  };
}

function buildWorkspacePayload(input) {
  const normalized = normalizeWorkspaceState(input);

  return {
    ...normalized,
    averageJobValue: Number(normalized.averageJobValue || 0),
    automations: normalized.automations
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function workspaceStatesMatch(left, right) {
  return JSON.stringify(normalizeWorkspaceState(left)) === JSON.stringify(normalizeWorkspaceState(right));
}

export function BusinessOSShell({ locked = false, authReady = true }) {
  const [activeTab, setActiveTab] = useState("command");
  const [activeSidebarSection, setActiveSidebarSection] = useState("overview");
  const [brainSubTab, setBrainSubTab] = useState("profile");
  const [themeMode, setThemeMode] = useState("dark");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingPlanLoading, setPricingPlanLoading] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(defaultWorkspace);
  const [workspaceDraft, setWorkspaceDraft] = useState(defaultWorkspace);
  const [calls, setCalls] = useState([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isConfiguringVoice, setIsConfiguringVoice] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  // Dev Tab States (Admin Only)
  const [devPhoneNumber, setDevPhoneNumber] = useState("");
  const [devBusinessName, setDevBusinessName] = useState("Mike's Roofing Pro");
  const [devCustomPrompt, setDevCustomPrompt] = useState(
    "You are an elite, high-converting AI receptionist for Mike's Roofing Pro. Your goal is to capture the caller's leak details, address, and book an immediate estimate on the calendar. Be friendly, direct, and professional."
  );
  const [devVoiceId, setDevVoiceId] = useState("sara");
  const [devDialing, setDevDialing] = useState(false);
  const [devStatusLog, setDevStatusLog] = useState("");

  const isDevAdmin = user && (
    user.email?.toLowerCase() === "fugthmanagement@gmail.com" || 
    user.email?.toLowerCase() === "mepenginestudio@gmail.com"
  );

  const fileInputRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!auth) return undefined;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      if (!currentUser) {
        setWorkspace(defaultWorkspace);
        setWorkspaceDraft(defaultWorkspace);
        setCalls([]);
        setKnowledgeFiles([]);
        setNotifications([]);
        setDataReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return undefined;

    setDataReady(false);

    const unsubscribeWorkspace = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data() || {};
      const nextWorkspace = {
        ...defaultWorkspace,
        businessName: data.businessName || "",
        services: data.services || "",
        serviceArea: data.serviceArea || "",
        pricing: data.pricing || "",
        faqs: data.faqs || "",
        teamMembers: data.teamMembers || "",
        phoneNumbers: data.phoneNumbers || "",
        emergencyContacts: data.emergencyContacts || "",
        hours: data.hours || "",
        tone: data.tone || defaultWorkspace.tone,
        emergencyRule: data.emergencyRule || "",
        automations: Array.isArray(data.automations) ? data.automations.join("\n") : data.automations || "",
        averageJobValue: String(data.averageJobValue || defaultWorkspace.averageJobValue),
        industry: data.industry || "",
        assistantId: data.assistantId || "",
        phoneNumber: data.phoneNumber || "",
        voiceConfigured: Boolean(data.voiceConfigured),
        planTier: data.planTier || defaultWorkspace.planTier,
        planStatus: data.planStatus || defaultWorkspace.planStatus,
        billingActive: Boolean(data.billingActive),
        notificationEmail: data.notificationEmail || currentUser?.email || "",
        dailyDigest: data.dailyDigest !== false,
        mobileAlerts: data.mobileAlerts !== false,
        compactView: Boolean(data.compactView),
      };
      setWorkspace(nextWorkspace);
      setWorkspaceDraft(nextWorkspace);
      setDataReady(true);
    });

    const unsubscribeCalls = onSnapshot(query(collection(db, "users", user.uid, "calls")), (snapshot) => {
      setCalls(snapshot.docs.map((item) => normalizeCall(item.id, item.data())));
      setDataReady(true);
    });

    const unsubscribeFiles = onSnapshot(query(collection(db, "users", user.uid, "knowledgeFiles")), (snapshot) => {
      setKnowledgeFiles(snapshot.docs.map((item) => normalizeKnowledgeFile(item.id, item.data())));
      setDataReady(true);
    });

    const unsubscribeNotifications = onSnapshot(query(collection(db, "users", user.uid, "notifications")), (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        text: item.data().text || "",
        createdAt: formatTimestamp(item.data().createdAt),
      }));
      setNotifications(items);
      setDataReady(true);
    });

    return () => {
      unsubscribeWorkspace();
      unsubscribeCalls();
      unsubscribeFiles();
      unsubscribeNotifications();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !user?.email) return;

    fetch("/api/billing/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, email: user.email }),
    }).catch(() => undefined);
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (activeSidebarSection === "advisor") {
      setActiveTab("ai");
      return;
    }

    if (["knowledge", "files"].includes(activeSidebarSection)) {
      setActiveTab("brain");
      setBrainSubTab("profile");
      return;
    }

    if (activeSidebarSection === "settings") {
      setActiveTab("brain");
      setBrainSubTab("settings");
      return;
    }

    setActiveTab("command");
  }, [activeSidebarSection]);

  useEffect(() => {
    if (!locked && authReady && user && dataReady && !workspace.businessName) {
      setShowOnboarding(true);
      return;
    }

    setShowOnboarding(false);
  }, [authReady, dataReady, locked, user, workspace.businessName]);

  const businessSummary = useMemo(() => {
    return [
      `Business Name: ${workspace.businessName || "Not configured"}`,
      `Services: ${workspace.services || "Not configured"}`,
      `Service Area: ${workspace.serviceArea || "Not configured"}`,
      `Pricing: ${workspace.pricing || "Not configured"}`,
      `Tone: ${workspace.tone || defaultWorkspace.tone}.`,
      `Emergency Protocol: ${workspace.emergencyRule || "Not configured"}`,
      `Recent Call Summaries: ${calls.map((call) => `${call.caller} - ${call.summary}`).join(" | ")}`,
      `Lead Buckets: ${calls.map((call) => call.outcome).join(", ")}`,
      `Knowledge Files: ${knowledgeFiles.map((file) => file.name).join(", ")}`,
    ].join("\n");
  }, [calls, knowledgeFiles, workspace]);

  const followUps = useMemo(() => {
    return calls
      .filter((call) => /follow|quote|inquiry|callback|complaint/i.test(call.outcome) || /follow|quote|pricing|callback/i.test(call.summary))
      .slice(0, 4)
      .map((call) => ({
        customer: call.caller,
        reason: call.summary,
      }));
  }, [calls]);

  const leadGroups = useMemo(() => {
    const booked = calls.filter((call) => /booked/i.test(call.outcome)).length;
    const complaints = calls.filter((call) => /complaint/i.test(call.outcome) || /negative/i.test(call.sentiment)).length;
    const follow = calls.filter((call) => /follow|quote|inquiry/i.test(call.outcome)).length;
    const emergency = calls.filter((call) => /emergency/i.test(call.outcome)).length;

    return [
      { name: "Booked", count: booked, description: "Calls converted into real appointments." },
      { name: "Follow-Up Needed", count: follow, description: "Needs outbound action, estimate, or text-back." },
      { name: "Complaints", count: complaints, description: "Calls that need recovery or owner review." },
      { name: "Emergency", count: emergency, description: "Urgent conversations flagged for escalation." },
    ];
  }, [calls]);

  const feedItems = useMemo(() => {
    if (notifications.length) return notifications;
    return calls.slice(0, 4).map((call) => ({
      id: call.id,
      text: `${call.caller}: ${call.outcome}`,
      createdAt: call.date,
    }));
  }, [notifications, calls]);

  const aiSuggestions = useMemo(() => {
    const items = [];
    if (followUps.length) items.push(`${followUps.length} calls need follow-up.`);
    if (leadGroups.find((item) => item.name === "Complaints")?.count) items.push("Review complaint calls and generate recovery outreach.");
    if (!knowledgeFiles.length) items.push("Upload your pricing sheet or FAQ file to unlock grounded answers.");
    if (!workspace.businessName) items.push("Complete your Business Brain profile before launching voice workflows.");
    if (!items.length) items.push("Ask Executive AI for a weekly revenue review or outbound campaign draft.");
    return items.slice(0, 4);
  }, [followUps, knowledgeFiles.length, leadGroups, workspace.businessName]);

  const aiFacts = useMemo(() => {
    return [
      `Business: ${workspace.businessName || "Not configured"}`,
      `Services: ${workspace.services || "Not configured"}`,
      `Tone: ${workspace.tone || defaultWorkspace.tone}`,
      `Files indexed: ${knowledgeFiles.length}`,
    ];
  }, [knowledgeFiles.length, workspace]);

  const scoreCards = useMemo(() => {
    const now = new Date();
    const callsToday = calls.filter((call) => {
      const date = call.timestamp?.toDate ? call.timestamp.toDate() : call.timestamp ? new Date(call.timestamp) : null;
      return date && date.toDateString() === now.toDateString();
    }).length;
    const leadsCaptured = calls.length;
    const appointmentsBooked = calls.filter((call) => /booked/i.test(call.outcome)).length;
    const averageJobValue = Number(workspace.averageJobValue || 0);
    const explicitRevenue = calls.reduce((total, call) => total + Number(call.revenue || 0), 0);
    const revenueCaptured = explicitRevenue || appointmentsBooked * averageJobValue;
    const missedCallsSaved = calls.filter((call) => /follow|voicemail|callback|missed/i.test(call.outcome)).length;
    const responseRate = calls.length ? Math.round((calls.filter((call) => call.aiHandled).length / calls.length) * 100) : 0;

    const values = [
      callsToday,
      leadsCaptured,
      appointmentsBooked,
      revenueCaptured ? `$${revenueCaptured.toLocaleString()}` : "$0",
      missedCallsSaved,
      `${responseRate}%`,
    ];

    const hints = [
      callsToday ? `${callsToday} handled today` : "No calls today",
      leadsCaptured ? `${leadsCaptured} total conversations in motion` : "No leads captured yet",
      appointmentsBooked ? `${appointmentsBooked} booked from live data` : "No booked calls yet",
      revenueCaptured ? "Calculated from booked calls and revenue fields" : "Set Average Job Value or revenue fields",
      missedCallsSaved ? "Recovered from follow-up and callback outcomes" : "No recovered missed calls yet",
      calls.length ? "Measured from AI-handled call records" : "Response rate appears after first call",
    ];

    return metricLabels.map((label, index) => ({ label, value: values[index], hint: hints[index] }));
  }, [calls, workspace.averageJobValue]);

  const currentTheme = tabThemes[activeTab];
  const isLightMode = themeMode === "light";
  const userName = useMemo(() => {
    if (workspace.businessName) return workspace.businessName;
    if (user?.email) return user.email.split("@")[0];
    return "Owner";
  }, [user?.email, workspace.businessName]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const currentPlanMeta = useMemo(() => pricingPlans.find((plan) => plan.key === workspace.planTier) || null, [workspace.planTier]);
  const hasPaidPlan = Boolean(user && workspace.billingActive && workspace.planTier);
  const guestLabel = user ? null : "Guest";
  
  const shellClasses = isLightMode ? "bg-white text-black" : "bg-black text-white";
  const asideClasses = isLightMode ? "border-zinc-300 bg-zinc-100" : "border-zinc-900 bg-zinc-950";
  const mainClasses = isLightMode ? "bg-zinc-50" : "bg-black";
  const cardClasses = isLightMode ? "border-zinc-300 bg-white text-black shadow-sm" : "border-zinc-800 bg-[#0f0f11] text-white";
  const softText = isLightMode ? "text-zinc-500" : "text-zinc-500";
  
  const rangeLabel = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} - ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  }, []);
  const timeLabel = useMemo(() => currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), [currentTime]);
  const revenueTotal = useMemo(() => calls.reduce((total, call) => total + Number(call.revenue || 0), 0), [calls]);
  const recentCalls = useMemo(() => [...calls].sort((left, right) => {
    const leftTime = left.timestamp?.toDate ? left.timestamp.toDate().getTime() : left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp?.toDate ? right.timestamp.toDate().getTime() : right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return rightTime - leftTime;
  }).slice(0, 5), [calls]);
  
  const actionQueue = useMemo(() => {
    const items = [];
    if (followUps.length) items.push({ title: `${followUps.length} calls need follow-up`, subtitle: "Text back, estimate, or callback." });
    const complaintCount = leadGroups.find((group) => group.name === "Complaints")?.count || 0;
    if (complaintCount) items.push({ title: `${complaintCount} unhappy callers`, subtitle: "Review summaries and recover the account." });
    if (!workspace.voiceConfigured) items.push({ title: "Voice network not configured", subtitle: "Finish business profile and provision a line." });
    if (!knowledgeFiles.length) items.push({ title: "Knowledge base empty", subtitle: "Upload pricing sheets, FAQs, or service docs." });
    return items.slice(0, 4);
  }, [followUps.length, knowledgeFiles.length, leadGroups, workspace.voiceConfigured]);
  
  const insightCards = useMemo(() => {
    const items = [];
    if (revenueTotal) items.push({ title: `Revenue tracked: $${revenueTotal.toLocaleString()}`, subtitle: "Pulled from real call records." });
    if (recentCalls.length) items.push({ title: `${recentCalls.length} recent calls loaded`, subtitle: "Dashboard is syncing completed call data." });
    if (knowledgeFiles.length) items.push({ title: `${knowledgeFiles.length} files indexed`, subtitle: "Executive AI can answer from uploaded business docs." });
    if (workspace.phoneNumber) items.push({ title: workspace.phoneNumber, subtitle: "Active Fugth Voice line linked to this workspace." });
    if (!items.length) items.push({ title: "No business activity yet", subtitle: "Connect the workflow and your first real numbers will replace this empty state." });
    return items.slice(0, 4);
  }, [knowledgeFiles.length, recentCalls.length, revenueTotal, workspace.phoneNumber]);
  
  const chartValues = useMemo(() => {
    const byDay = new Array(7).fill(0);
    const now = new Date();
    calls.forEach((call) => {
      const date = call.timestamp?.toDate ? call.timestamp.toDate() : call.timestamp ? new Date(call.timestamp) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      const index = 6 - diff;
      if (index >= 0 && index < 7) {
        byDay[index] += Number(call.revenue || 0) || 1;
      }
    });
    const max = Math.max(...byDay, 1);
    return byDay.map((value) => Math.round((value / max) * 100));
  }, [calls]);
  
  const metricVisuals = useMemo(() => ({
    revenue: chartValues,
    calls: chartValues.map((value, index) => Math.max(18, value - (index % 2 ? 16 : 6))),
    booked: chartValues.map((value, index) => Math.max(14, value - 12 + index * 2)),
    rate: chartValues.map((value, index) => Math.max(20, value - 8 + (index % 3) * 4)),
  }), [chartValues]);

  async function sendToGemini(input = chatInput) {
    if (!input.trim()) return;
    if (!user) {
      setChatLog([{ role: "ai", text: "Guest preview is open. Create an account to unlock live Executive AI responses." }]);
      return;
    }
    if (!hasPaidPlan) {
      setChatLog([{ role: "ai", text: "A paid Fugth plan is required before Executive AI goes live on this workspace." }]);
      setShowPricingModal(true);
      return;
    }

    const userMessage = { role: "user", text: input };
    const nextChat = [...chatLog, userMessage];
    setChatLog(nextChat);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${businessSummary}\n\nOwner request: ${input}`,
        }),
      });
      const data = await res.json();
      setChatLog([...nextChat, { role: "ai", text: data.reply }]);
    } catch (error) {
      setChatLog([...nextChat, { role: "ai", text: "Error connecting to AI network." }]);
    }

    setIsTyping(false);
  }

  async function handlePlanCheckout(planKey) {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setPricingPlanLoading(planKey);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          userId: user.uid,
          email: user.email || "",
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout could not be started.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setSaveMessage(error.message || "Checkout could not be started.");
      setPricingPlanLoading("");
    }
  }

  async function handleSupportSubmit(event) {
    event.preventDefault();
    setSupportStatus("");

    if (!supportSubject.trim() || !supportMessage.trim()) {
      setSupportStatus("Add both a subject and message.");
      return;
    }

    setIsSendingSupport(true);
    try {
      const response = await fetch("/api/support-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest",
          email: user?.email || workspaceDraft.notificationEmail || "",
          name: userName,
          subject: supportSubject,
          message: supportMessage,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Support request failed.");
      }
      setSupportStatus(`Ticket sent to ${payload.recipient}.`);
      setSupportSubject("");
      setSupportMessage("");
    } catch (error) {
      console.error("Support ticket error:", error);
      setSupportStatus(error.message || "Support request failed.");
    } finally {
      setIsSendingSupport(false);
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth).catch(() => undefined);
    window.location.href = "/";
  }

  async function saveWorkspace() {
    if (!user || !db) {
      setSaveMessage("Log in to save workspace settings.");
      return false;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...buildWorkspacePayload(workspaceDraft),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveMessage("Business Brain saved.");
      return true;
    } catch (error) {
      console.error("Save workspace error:", error);
      setSaveMessage(error.message || "Could not save workspace settings.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  const handleDevOutboundCall = async (e) => {
    e.preventDefault();
    if (!devPhoneNumber) return alert("Please specify a target phone number.");
    
    setDevDialing(true);
    setDevStatusLog("Initiating payload network line... Dispatching Vapi signal.");
    
    try {
      const res = await fetch('/api/dev/outbound-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: devPhoneNumber,
          customPrompt: devCustomPrompt,
          businessName: devBusinessName,
          voiceId: devVoiceId
        })
      });
      
      const result = await res.json();
      if (result.success) {
        setDevStatusLog(`Call successfully launched! Live Tracking ID: ${result.callId}`);
      } else {
        setDevStatusLog(`Outbound failed: ${result.error}`);
      }
    } catch (err) {
      setDevStatusLog(`System route fault: ${err.message}`);
    } finally {
      setDevDialing(false);
    }
  };

  useEffect(() => {
    if (locked || !authReady || !user || !db || !dataReady || showOnboarding) {
      return undefined;
    }

    if (workspaceStatesMatch(workspaceDraft, workspace)) {
      return undefined;
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            ...buildWorkspacePayload(workspaceDraft),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setSaveMessage("Changes synced to your workspace.");
      } catch (error) {
        console.error("Autosave error:", error);
        setSaveMessage("Autosave failed. Use Save Workspace to retry.");
      }
    }, 900);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [authReady, dataReady, db, locked, showOnboarding, user, workspace, workspaceDraft]);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !user || !db || !storage) return;

    setIsUploading(true);
    setSaveMessage("");

    try {
      const uploadRef = ref(storage, `users/${user.uid}/knowledge/${Date.now()}-${file.name}`);
      await uploadBytes(uploadRef, file);
      const url = await getDownloadURL(uploadRef);
      await addDoc(collection(db, "users", user.uid, "knowledgeFiles"), {
        name: file.name,
        type: file.type || "File",
        size: file.size,
        tag: file.type.includes("pdf") ? "pdf" : "upload",
        status: "Uploaded",
        usageCount: 0,
        url,
        uploadedAt: serverTimestamp(),
      });
      setSaveMessage("Knowledge file uploaded.");
    } catch (error) {
      console.error("File upload error:", error);
      setSaveMessage(error.message || "Upload failed. Try again in a moment.");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  }

  async function handleAutoConfig() {
    if (!user) {
      setSaveMessage("Log in before configuring the Voice Network.");
      return false;
    }

    const businessName = workspaceDraft.businessName.trim() || workspace.businessName.trim();
    const industry = workspaceDraft.industry.trim() || workspace.industry.trim();

    if (!businessName || !industry) {
      setSaveMessage("Add business name and industry first.");
      setBrainSubTab("profile");
      return false;
    }

    setIsConfiguringVoice(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/setup-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          businessName,
          industry,
        }),
      });
      const result = await parseJsonResponse(response);

      if (result.parseError) {
        throw new Error("/api/setup-voice returned HTML instead of JSON.");
      }

      const payload = result.payload || {};

      if (!result.ok) {
        throw new Error(payload.error || "Voice provisioning failed.");
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          businessName,
          industry,
          assistantId: payload.assistantId || "",
          phoneNumber: payload.phoneNumber || "",
          voiceConfigured: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaveMessage(payload.phoneNumber ? `Voice Network connected: ${payload.phoneNumber}` : "Voice Network configured.");
      setBrainSubTab("voice");
      return true;
    } catch (error) {
      console.error("Voice config error:", error);
      setSaveMessage(error.message || "Voice provisioning failed. Check your environment keys.");
      return false;
    } finally {
      setIsConfiguringVoice(false);
    }
  }

  async function handleOnboardingSubmit() {
    if (!workspaceDraft.businessName.trim() || !workspaceDraft.industry.trim()) {
      setSaveMessage("Business name and industry are required.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          businessName: workspaceDraft.businessName.trim(),
          industry: workspaceDraft.industry.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveMessage("Business info saved. Voice setup is optional.");
      setShowOnboarding(false);
    } catch (error) {
      console.error("Onboarding save failed:", error);
      setSaveMessage(error.message || "Could not save business info. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  }

  const sentimentStyles = {
    Positive: "border-zinc-500 bg-zinc-800 text-white",
    Neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
    Negative: "border-zinc-800 bg-black text-zinc-500",
  };

  const overlay = null;

  return (
    <div className={`relative min-h-screen overflow-hidden ${shellClasses}`}>
      <PricingModal currentPlan={workspace.planTier} open={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handlePlanCheckout} busyPlan={pricingPlanLoading} guestMode={!user} />
      {showOnboarding ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-4 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 shadow-[0_20px_100px_rgba(0,0,0,0.45)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Initialize Your OS</p>
            <h2 className="mt-4 text-3xl font-bold text-white">Connect your business infrastructure.</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">Answer two questions so Fugth Management can prepare your workspace and Voice Network.</p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Business Name</label>
                <input
                  value={workspaceDraft.businessName}
                  onChange={(event) => setWorkspaceDraft((current) => ({ ...current, businessName: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-white outline-none transition focus:border-zinc-600"
                  placeholder="Apex Dental"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Industry</label>
                <select
                  value={workspaceDraft.industry}
                  onChange={(event) => setWorkspaceDraft((current) => ({ ...current, industry: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-white outline-none transition focus:border-zinc-600"
                >
                  <option value="">Select industry</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Dentistry">Dentistry</option>
                  <option value="HVAC / Plumbing">HVAC / Plumbing</option>
                  <option value="Law Firm">Law Firm</option>
                  <option value="Auto Repair">Auto Repair</option>
                  <option value="Medical Spa">Medical Spa</option>
                </select>
              </div>
              <button
                onClick={handleOnboardingSubmit}
                disabled={isSaving}
                className="w-full rounded-2xl bg-white py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isSaving ? "Saving business info..." : "Continue to Dashboard"}
              </button>
              {saveMessage ? <p className="text-sm text-zinc-400">{saveMessage}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
      {overlay}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${currentTheme.panel}`} />
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>
      <div className={`flex min-h-screen flex-col lg:flex-row ${locked ? "select-none" : ""}`}>
        <aside className={`w-full border-b lg:min-h-screen lg:w-[220px] lg:border-b-0 lg:border-r ${isLightMode ? asideClasses : "border-white/10 bg-black"}`}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-black shadow-[0_10px_35px_rgba(255,255,255,0.15)]">F</div>
              <div>
                <p className={`text-xl font-semibold ${isLightMode ? "text-black" : "text-white"}`}>Fugth</p>
                <p className={`text-sm ${softText}`}>Management OS</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2 px-4 pb-6">
            {sidebarItems.map((item, index) => (
              <button
                key={`${item.key}-${item.section}`}
                onClick={() => {
                  setActiveTab(item.key);
                  setActiveSidebarSection(item.section);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${activeSidebarSection === item.section ? `${isLightMode ? "border-zinc-400 bg-zinc-200 text-black" : "border-white/30 bg-white/10 text-white"}` : `${isLightMode ? "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-black" : "border-transparent bg-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white"}`}`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${activeSidebarSection === item.section ? "bg-white/10" : "bg-white/[0.04]"}`}>
                  <SidebarIcon name={item.icon} active={activeSidebarSection === item.section} />
                </div>
                <p className="text-sm font-medium">{item.label}</p>
              </button>
            ))}

            {isDevAdmin && (
              <button
                onClick={() => {
                  setActiveTab("dev");
                  setActiveSidebarSection("dev_ops");
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left font-bold tracking-wide uppercase transition-all ${
                  activeSidebarSection === "dev_ops" 
                    ? "border-white/30 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    : "border-transparent bg-transparent text-zinc-500 hover:border-white/20 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${activeSidebarSection === "dev_ops" ? "bg-white/20" : "bg-white/[0.04]"}`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                </div>
                <p className="text-sm font-bold">Dev Ops</p>
              </button>
            )}
          </nav>

          <div className="mt-auto px-4 pb-4">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isLightMode ? "border-zinc-300 bg-white" : "border-white/10 bg-zinc-900/50"}`}>
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className={`text-xs font-medium ${softText}`}>System Operational</span>
            </div>
            <button onClick={() => setThemeMode((current) => current === "dark" ? "light" : "dark")} className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm ${isLightMode ? "border-zinc-300 bg-white text-black" : "border-white/10 bg-zinc-900/50 text-white"}`}>
              <span>{themeMode === "dark" ? "Dark" : "Light"}</span>
              <span className={softText}>Theme</span>
            </button>
            {!locked ? (
              <div className={`mt-6 rounded-2xl border p-4 ${isLightMode ? "border-zinc-300 bg-white" : "border-white/10 bg-zinc-900/50"}`}>
                <p className={`text-sm font-semibold ${isLightMode ? "text-black" : "text-white"}`}>{userName}</p>
                <p className={`mt-1 truncate text-xs ${softText}`}>{user?.email || "No account email"}</p>
              </div>
            ) : (
              <div className={`mt-6 rounded-2xl border p-4 ${isLightMode ? "border-zinc-300 bg-white" : "border-white/10 bg-zinc-900/50"}`}>
                <p className={`text-sm font-semibold ${isLightMode ? "text-black" : "text-white"}`}>{guestLabel}</p>
                <p className={`mt-1 text-xs ${softText}`}>Browse the product before you create an account.</p>
              </div>
            )}
          </div>
        </aside>

        <main className={`relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${isLightMode ? mainClasses : "bg-black"}`}>
          <div className={`mb-6 rounded-[2rem] border p-5 backdrop-blur sm:p-6 ${isLightMode ? "border-zinc-300 bg-white/80" : "border-white/10 bg-zinc-900/70"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className={`text-3xl font-semibold tracking-tight ${isLightMode ? "text-black" : "text-white"}`}>{greeting}, {userName}</h1>
                <p className={`mt-2 text-sm ${softText}`}>Here is what is happening with your business today.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!user ? <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-white">Guest</div> : null}
                <div className={`rounded-2xl border px-4 py-3 text-sm ${isLightMode ? "border-zinc-300 bg-white text-black" : "border-white/10 bg-zinc-900/50 text-white"}`}>
                  {timeLabel}
                </div>
                {!locked ? (
                  <button onClick={() => setShowPricingModal(true)} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(255,255,255,0.15)] transition hover:opacity-95">
                    {currentPlanMeta ? "Upgrade" : "Choose Plan"}
                  </button>
                ) : <Link href="/login" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(255,255,255,0.15)] transition hover:opacity-95">Create Account</Link>}
                <div className={`rounded-2xl border px-4 py-3 text-sm ${isLightMode ? "border-zinc-300 bg-white text-black" : "border-white/10 bg-zinc-900/50 text-white"}`}>
                  {rangeLabel}
                </div>
              </div>
            </div>
          </div>

          {activeTab === "command" && (
            <div className="mx-auto max-w-7xl space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SectionCard>
                  <p className="text-sm text-zinc-400">Revenue This Week</p>
                  <p className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">{scoreCards[3].value}</p>
                  <p className="mt-3 text-sm text-zinc-400">{scoreCards[3].hint}</p>
                  <LineChart values={metricVisuals.revenue} />
                </SectionCard>
                <SectionCard>
                  <p className="text-sm text-zinc-400">Calls Today</p>
                  <p className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">{scoreCards[0].value}</p>
                  <p className="mt-3 text-sm text-zinc-400">{scoreCards[0].hint}</p>
                  <LineChart values={metricVisuals.calls} />
                </SectionCard>
                <SectionCard>
                  <p className="text-sm text-zinc-400">Appointments Booked</p>
                  <p className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">{scoreCards[2].value}</p>
                  <p className="mt-3 text-sm text-zinc-400">{scoreCards[2].hint}</p>
                  <LineChart values={metricVisuals.booked} />
                </SectionCard>
                <SectionCard>
                  <p className="text-sm text-zinc-400">AI Response Rate</p>
                  <p className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">{scoreCards[5].value}</p>
                  <p className="mt-3 text-sm text-zinc-400">{scoreCards[5].hint}</p>
                  <LineChart values={metricVisuals.rate} />
                </SectionCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.85fr_0.85fr]">
                <SectionCard>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
                    <span className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-300">{feedItems.length} events</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {feedItems.length ? feedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{item.text}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{item.createdAt}</p>
                        </div>
                        <span className="text-zinc-500">&gt;</span>
                      </div>
                    )) : <EmptyPanel title="No activity yet" body="Real activity will appear here as calls, uploads, and customer updates flow into Fugth." />}
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-white">Action Queue</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">{actionQueue.length}</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {actionQueue.length ? actionQueue.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
                      </div>
                    )) : <EmptyPanel title="Queue is clear" body="No outstanding actions are currently derived from your real data." />}
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-white">Live Calls</h3>
                    <span className="text-sm text-zinc-500">0 live</span>
                  </div>
                  <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                    <RingMeter value={calls.length ? Math.min(100, Math.round((calls.filter((call) => call.aiHandled).length / calls.length) * 100)) : 0} label="active coverage" />
                    <p className="mt-6 text-2xl font-semibold text-white">No live calls right now</p>
                    <p className="mt-3 max-w-xs text-sm leading-7 text-zinc-500">Completed calls will appear here automatically and can be played back from the dashboard.</p>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
                <SectionCard>
                  <h3 className="text-xl font-semibold text-white">Call Library</h3>
                  <div className="mt-5 space-y-4">
                    {recentCalls.length ? recentCalls.map((call) => (
                      <div key={call.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-lg font-semibold text-white">{call.caller}</p>
                              <span className={`rounded-full border px-3 py-1 text-xs ${sentimentStyles[call.sentiment]}`}>{call.sentiment}</span>
                              <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-400">{call.outcome}</span>
                            </div>
                            <p className="mt-2 text-sm text-zinc-500">{call.phone} · {call.date} · {call.duration}</p>
                            <p className="mt-4 text-sm leading-7 text-zinc-300">{call.summary}</p>
                            {call.recording ? (
                              <div className="mt-4 rounded-2xl border border-white/10 bg-black/50 p-4">
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Recording</p>
                                  <a href={call.recording} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
                                    Open File
                                  </a>
                                </div>
                                <audio controls className="mt-4 w-full opacity-80 grayscale">
                                  <source src={call.recording} />
                                </audio>
                              </div>
                            ) : null}
                          </div>
                          <div className="w-full max-w-[220px] rounded-2xl border border-white/10 bg-black/50 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Transcript</p>
                            <p className="mt-3 text-sm leading-7 text-zinc-400">{call.transcript || "Transcript will appear here once the call summary is ready."}</p>
                          </div>
                        </div>
                      </div>
                    )) : <EmptyPanel title="No recorded calls yet" body="The dashboard will populate this library automatically as real calls arrive." />}
                  </div>
                </SectionCard>

                <div className="space-y-4">
                  <SectionCard>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl font-semibold text-white">Revenue Overview</h3>
                      <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-300">{scoreCards[3].value}</span>
                    </div>
                    <LineChart values={metricVisuals.revenue} />
                    <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-500">
                      <span>Last 7 Days</span>
                      <span>{calls.length} calls tracked</span>
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <h3 className="text-xl font-semibold text-white">AI Insights</h3>
                    <div className="mt-5 space-y-3">
                      {insightCards.map((item) => (
                        <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              </div>
            </div>
          )}

          {activeTab === "brain" && (
            <div className="mx-auto max-w-7xl space-y-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Business Brain</p>
                <h2 className="mt-3 text-3xl font-bold text-white">Train Your AI Employee</h2>
              </div>

              <div className="flex flex-wrap gap-6 border-b border-zinc-900 pb-4">
                {[
                  ["profile", "Business Profile"],
                  ["voice", "Voice & Number"],
                  ["settings", "Settings & Support"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setBrainSubTab(key)}
                    className={`pb-3 text-sm font-semibold transition ${brainSubTab === key ? "border-b-2 border-white text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {brainSubTab === "profile" && (
                <>
              <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-white">Business Profile</h3>
                  <button onClick={saveWorkspace} disabled={isSaving || locked} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-300">
                    {isSaving ? "Saving..." : "Save Workspace"}
                  </button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {profileFields.map(([field, label]) => (
                    <label key={field} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <span className="text-xs uppercase tracking-[0.28em] text-zinc-600">{label}</span>
                      <input
                        value={workspaceDraft[field]}
                        onChange={(event) => setWorkspaceDraft((current) => ({ ...current, [field]: event.target.value }))}
                        disabled={!user}
                        className="mt-3 w-full border-0 bg-transparent p-0 text-sm leading-7 text-zinc-300 outline-none placeholder:text-zinc-700"
                        placeholder={`Add ${label.toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>
                {saveMessage ? <p className="mt-4 text-sm text-zinc-400">{saveMessage}</p> : null}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-[2rem] border border-dashed border-zinc-700 bg-[#0f0f11] p-8">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Knowledge Base</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Upload real business documents</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">Upload your real company documents so Fugth can answer and route with better context.</p>
                  <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-8 text-center">
                    <p className="text-base font-medium text-white">Choose PDFs, docs, or images</p>
                    <p className="mt-2 text-sm text-zinc-500">Pricing sheets, FAQs, policies, and promo assets.</p>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => user ? fileInputRef.current?.click() : setShowPricingModal(true)} disabled={isUploading} className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-300">
                      {isUploading ? "Uploading..." : user ? "Upload file" : "Create Account To Upload"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">AI Instructions</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Train the voice and rules</h3>
                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-zinc-300">Tone Selection</label>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {["Professional", "Friendly", "Aggressive Sales"].map((option) => (
                          <button
                            key={option}
                            onClick={() => user && setWorkspaceDraft((current) => ({ ...current, tone: option }))}
                            className={`rounded-full border px-4 py-2 text-sm transition ${workspaceDraft.tone === option ? "border-zinc-500 bg-white text-black" : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-600 hover:text-white"}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">Emergency Protocol</label>
                      <textarea
                        value={workspaceDraft.emergencyRule}
                        onChange={(event) => user && setWorkspaceDraft((current) => ({ ...current, emergencyRule: event.target.value }))}
                        className="mt-3 min-h-32 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">Automation Rules</label>
                      <textarea
                        value={workspaceDraft.automations}
                        onChange={(event) => user && setWorkspaceDraft((current) => ({ ...current, automations: event.target.value }))}
                        className="mt-3 min-h-32 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                        placeholder="One automation per line"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Calendar Sync</p>
                        <p className="mt-2 text-sm text-zinc-500">Keep your schedule aligned so Fugth can route requests with the right availability and rules.</p>
                        <button className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white hover:border-zinc-500 hover:bg-zinc-900 transition">Calendar setup</button>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Booking Rules</p>
                        <p className="mt-2 text-sm text-zinc-500">Use Operating Hours, pricing, and emergency protocol fields to shape how bookings behave.</p>
                        <button onClick={saveWorkspace} className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white hover:border-zinc-500 hover:bg-zinc-900 transition">Save rules</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6">
                  <h3 className="text-xl font-bold text-white">Operating Hours</h3>
                  {workspace.hours ? (
                    <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-8 text-zinc-300 whitespace-pre-wrap">{workspace.hours}</div>
                  ) : (
                    <EmptyPanel title="No hours configured" body="Add business hours in the profile form above and save them to your workspace." />
                  )}
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6">
                  <h3 className="text-xl font-bold text-white">Knowledge Files</h3>
                  <p className="mt-2 text-sm text-zinc-500">Searchable uploads tied to the logged-in workspace.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {knowledgeFiles.length ? knowledgeFiles.map((file) => (
                      <div key={file.name} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="mt-2 text-sm text-zinc-500">{file.type} · {formatFileSize(file.size)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-400">#{file.tag}</span>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white">{file.status}</span>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-600">Used in {file.usageCount} AI responses</p>
                        <div className="mt-4 flex gap-2">
                          {file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800 transition">Open</a> : null}
                        </div>
                      </div>
                    )) : <EmptyPanel title="No files uploaded" body="Upload your real documents above to ground the chatbot and voice assistant in company data." />}
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6">
                <h3 className="text-xl font-bold text-white">Automations</h3>
                <p className="mt-2 text-sm text-zinc-500">Automation rules saved in the Business Brain document.</p>
                {workspace.automations ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {workspace.automations.split("\n").filter(Boolean).map((item) => (
                      <div key={item} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">{item}</div>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel title="No automations saved" body="Add automation rules in the textarea above and save the workspace." />
                )}
              </div>

              <div className={`rounded-[2rem] border p-6 ${cardClasses}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Plans & Billing</h3>
                    <p className={`mt-2 text-sm ${softText}`}>Pricing is visible inside the app, and lower plans keep an upgrade path in the top-right corner.</p>
                  </div>
                  <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${isLightMode ? "border-zinc-300 bg-zinc-100 text-black" : "border-zinc-700 bg-zinc-950 text-white"}`}>
                    Current Plan: {workspace.planTier}
                  </div>
                </div>
                <div className="mt-6">
                  <PricingCards currentPlan={workspace.planTier} onCheckout={handlePlanCheckout} busyPlan={pricingPlanLoading} guestMode={!user} />
                </div>
              </div>
                </>
              )}

              {brainSubTab === "voice" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Voice Infrastructure</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">Dedicated line and assistant provisioning</h3>

                    <div className="mt-6 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-zinc-600">Business</p>
                      <p className="mt-2 text-lg font-semibold text-white">{workspace.businessName || "Complete Business Profile first"}</p>
                      <p className="mt-2 text-sm text-zinc-500">Industry: {workspace.industry || "Not set"}</p>
                    </div>

                    {workspace.phoneNumber ? (
                      <div className="mt-4 rounded-[1.75rem] border border-zinc-700 bg-zinc-900/50 p-5">
                        <p className="text-xs uppercase tracking-[0.28em] text-white">Active Line</p>
                        <p className="mt-2 text-3xl font-mono text-white">{workspace.phoneNumber}</p>
                        <p className="mt-2 text-sm text-zinc-400">Assistant ID: {workspace.assistantId || "Stored"}</p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.75rem] border border-zinc-800 bg-zinc-900/50 p-5">
                        <p className="text-sm font-semibold text-zinc-400">System disconnected</p>
                        <p className="mt-2 text-sm leading-7 text-zinc-500">No active line is assigned to this account yet.</p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (!user || !hasPaidPlan) {
                          setShowPricingModal(true);
                          return;
                        }
                        handleAutoConfig();
                      }}
                      disabled={isConfiguringVoice}
                      className="mt-6 w-full rounded-2xl bg-white py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    >
                      {isConfiguringVoice ? "Configuring Voice Network..." : !user ? "Create Account To Connect Voice" : !hasPaidPlan ? "Choose Plan To Connect Voice" : "Auto-Configure Voice Network"}
                    </button>
                    {saveMessage ? <p className="mt-4 text-sm text-zinc-400">{saveMessage}</p> : null}
                  </div>

                  <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Infrastructure Sync</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">Routing and capture tools</h3>
                    <div className="mt-6 space-y-4">
                      {[
                        ["Record Conversations", true],
                        ["Sentiment Analysis", true],
                        ["Owner Metadata Routing", Boolean(workspace.assistantId)],
                        ["Fugth Sync Ready", true],
                      ].map(([label, enabled]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 p-4">
                          <span className="text-sm text-white">{label}</span>
                          <div className={`relative h-6 w-12 rounded-full ${enabled ? "bg-white" : "bg-zinc-800"}`}>
                            <div className={`absolute top-1 h-4 w-4 rounded-full ${enabled ? "bg-black" : "bg-zinc-500"} transition ${enabled ? "right-1" : "left-1"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-5 text-sm leading-7 text-zinc-400">
                      Fugth Voice runs as a private business line. Once connected, the number, assistant identity, and routing status stay attached to this workspace.
                    </div>
                  </div>
                </div>
              )}

              {brainSubTab === "settings" && (
                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Workspace Settings</p>
                        <h3 className="mt-3 text-2xl font-bold text-white">Account, alerts, and session controls</h3>
                      </div>
                      {user ? (
                        <button onClick={handleLogout} className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900">
                          Log Out
                        </button>
                      ) : (
                        <Link href="/login" className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900">
                          Sign In
                        </Link>
                      )}
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <label className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <span className="text-xs uppercase tracking-[0.28em] text-zinc-600">Notification Email</span>
                        <input
                          value={workspaceDraft.notificationEmail}
                          onChange={(event) => setWorkspaceDraft((current) => ({ ...current, notificationEmail: event.target.value }))}
                          className="mt-3 w-full border-0 bg-transparent p-0 text-sm leading-7 text-zinc-300 outline-none"
                          placeholder="owner@company.com"
                        />
                      </label>
                      {[
                        ["dailyDigest", "Daily Summary Email"],
                        ["mobileAlerts", "Mobile Alerts"],
                        ["compactView", "Compact Mobile Layout"],
                      ].map(([field, label]) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() => user && setWorkspaceDraft((current) => ({ ...current, [field]: !current[field] }))}
                          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 p-4 text-left"
                        >
                          <span className="text-sm font-medium text-white">{label}</span>
                          <span className={`relative h-6 w-12 rounded-full ${workspaceDraft[field] ? "bg-white" : "bg-zinc-800"}`}>
                            <span className={`absolute top-1 h-4 w-4 rounded-full ${workspaceDraft[field] ? "bg-black" : "bg-zinc-500"} transition ${workspaceDraft[field] ? "right-1" : "left-1"}`} />
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm leading-7 text-zinc-400">
                      {user
                        ? `Current session: ${user.email || "signed in"}. Plan status: ${workspace.planStatus || "no plan yet"}.`
                        : "Guest browsing is enabled. Create an account when you want plan activation, live AI, and workspace sync."}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Support</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">Open a ticket with Fugth</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">Questions, onboarding help, or account issues can be sent directly into the Fugth support queue.</p>
                    <form onSubmit={handleSupportSubmit} className="mt-8 space-y-4">
                      <input
                        value={supportSubject}
                        onChange={(event) => setSupportSubject(event.target.value)}
                        placeholder="Subject"
                        className="w-full rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-white outline-none transition focus:border-zinc-600"
                      />
                      <textarea
                        value={supportMessage}
                        onChange={(event) => setSupportMessage(event.target.value)}
                        placeholder="Tell Fugth what you need help with"
                        className="min-h-40 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                      />
                      <button type="submit" disabled={isSendingSupport} className="w-full rounded-2xl bg-white py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300">
                        {isSendingSupport ? "Sending Ticket..." : "Send Support Ticket"}
                      </button>
                    </form>
                    {supportStatus ? <p className="mt-4 text-sm text-zinc-400">{supportStatus}</p> : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="mx-auto flex h-full max-w-7xl flex-col animate-[fadeIn_0.2s_ease]">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white">Executive AI</h2>
                </div>
                <button className="rounded-2xl border border-zinc-800 bg-[#0f0f11] px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 transition">🎙️ Voice Mode</button>
              </div>

              <div className="flex flex-1 gap-6 min-h-[500px] flex-col xl:flex-row">
                <div className={`flex-1 overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#0f0f11] ${locked ? "opacity-70" : "opacity-100"}`}>
                  <div className="border-b border-zinc-900 p-6">
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendToGemini(suggestion)}
                          className="rounded-full border border-zinc-800 bg-black px-4 py-2 text-left text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6 overflow-y-auto p-6">
                    {chatLog.length ? chatLog.map((msg, idx) => (
                      <div key={idx} className={`flex items-start gap-4 ${msg.role === "user" ? "ml-auto max-w-[85%] flex-row-reverse" : "max-w-[85%]"}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${msg.role === "user" ? "bg-zinc-800 text-white" : "bg-white text-black"}`}>
                          {msg.role === "user" ? "ME" : "AI"}
                        </div>
                        <div className={`rounded-2xl p-4 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm bg-white text-black shadow-lg" : "rounded-tl-sm border border-zinc-800 bg-zinc-900 text-zinc-200"}`}>
                          {msg.text}
                        </div>
                      </div>
                    )) : <EmptyPanel title="No conversation yet" body="Ask the Executive AI about revenue, complaints, follow-ups, pricing, or uploaded files." />}
                    {isTyping && <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400 animate-pulse">Reviewing calls, files, and settings...</div>}
                  </div>
                  <div className="border-t border-zinc-900 bg-black p-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && sendToGemini()}
                        placeholder="Ask about bookings, complaints, revenue, schedules, or create a campaign..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 pr-24 text-sm text-white transition-colors focus:border-zinc-600 focus:outline-none"
                      />
                      <button onClick={() => sendToGemini()} className="absolute bottom-2 right-2 top-2 rounded-lg bg-white px-4 text-sm font-bold text-black hover:bg-zinc-200">
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-4 xl:w-80">
                  <div className={`rounded-3xl border border-zinc-800/50 bg-[#0f0f11] p-6 ${locked ? "opacity-70" : "opacity-100"}`}>
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Suggested Actions</h3>
                    <div className="space-y-2">
                      {aiSuggestions.map((item) => (
                        <button key={item} className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-left text-sm text-zinc-300 transition-colors hover:border-zinc-600">
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`rounded-3xl border border-zinc-800/50 bg-[#0f0f11] p-6 ${locked ? "opacity-70" : "opacity-100"}`}>
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">System Context</h3>
                    <div className="flex flex-wrap gap-2">
                      {aiFacts.map((fact) => (
                        <span key={fact} className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">{fact}</span>
                      ))}
                    </div>
                    {!dataReady ? <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-600">Loading workspace...</p> : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSidebarSection === "dev_ops" && isDevAdmin && (
            <div className="space-y-8 animate-fadeIn p-2">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-white/20 bg-zinc-900 p-8 rounded-[2rem] backdrop-blur-xl">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-[10px] font-black tracking-widest uppercase bg-white text-black rounded-md">Admin Root</span>
                    <h2 className="text-3xl font-black tracking-tight text-white">System Command & Cold-Call Simulator</h2>
                  </div>
                  <p className="text-zinc-400 mt-2 text-sm max-w-xl">
                    Live workspace overriding panel. Spin up instant automated trial phone lines to demonstrate interactive performance capabilities live to target owners during prospecting.
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-zinc-500 bg-black/40 px-4 py-3 rounded-xl border border-white/10">
                  Target Auth ID: <span className="text-white font-bold">{user?.uid}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6 rounded-[2rem] border border-white/10 bg-zinc-900/30 p-6 backdrop-blur-md">
                  <h3 className="text-lg font-bold text-white tracking-wide">1. Fine-Tune Temporary Agent Context</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Simulated Business Name</label>
                      <input 
                        type="text" 
                        value={devBusinessName}
                        onChange={(e) => setDevBusinessName(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Vapi Engine Accent / Voice Profile</label>
                      <select
                        value={devVoiceId}
                        onChange={(e) => setDevVoiceId(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40"
                      >
                        <option value="sara">Sara (Polite, Inbound Conversationalist)</option>
                        <option value="rachel">Rachel (Professional Intake / Legal)</option>
                        <option value="jack">Jack (Direct, Automotive & Construction Dispatch)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">System Instructions Prompt (Dynamic Fine-Tuning)</label>
                    <textarea
                      rows={5}
                      value={devCustomPrompt}
                      onChange={(e) => setDevCustomPrompt(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-white/40 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="space-y-6 flex flex-col justify-between rounded-[2rem] border border-white/20 bg-zinc-900 p-6 shadow-2xl">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">2. Outbound Targeting Gun</h3>
                    <p className="text-xs text-zinc-500 mt-1">Enter any business cell or prospect line to command our network to initiate a direct live phone call simulation.</p>
                    
                    <form onSubmit={handleDevOutboundCall} className="mt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Target Mobile Number</label>
                        <input 
                          type="tel" 
                          placeholder="+15551234567 or 5551234567"
                          value={devPhoneNumber}
                          onChange={(e) => setDevPhoneNumber(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-lg font-mono font-bold tracking-widest text-center text-white focus:outline-none focus:border-white/40 shadow-inner"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={devDialing}
                        className={`w-full py-4 rounded-xl font-bold tracking-wide uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                          devDialing 
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                            : "bg-white text-black hover:bg-zinc-200"
                        }`}
                      >
                        {devDialing ? (
                          <span>Firing System Payload...</span>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            Trigger Demo Outbound Call
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="rounded-xl bg-black border border-white/10 p-4 font-mono text-[11px] space-y-2">
                    <p className="text-zinc-500 uppercase tracking-widest font-bold text-[9px]">Server Diagnostics Stream</p>
                    <p className={devStatusLog.includes("failed") || devStatusLog.includes("fault") ? "text-zinc-500 animate-pulse" : "text-white"}>
                      {devStatusLog || "Ready to deploy sandbox outbound streams. System listening."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6 space-y-4">
                <h3 className="text-lg font-bold text-white tracking-wide">3. High-Conversion Scripting Anchors (Pierre's Quick Reference)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <p className="text-xs font-black tracking-wider text-white uppercase">The Local Competitor Pressure Play</p>
                    <p className="text-zinc-400 text-sm italic leading-relaxed">
                      "Look, I just ran an infrastructure audit on the businesses in your market zone. Three of your local competitors down the street went live on our system to secure their overflow calls. You guys are currently dropping missed leads straight into an empty voicemail bank—which means you are actively feeding them clients every single evening. Let's plug that leak right now."
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <p className="text-xs font-black tracking-wider text-white uppercase">The Revenue Leak Quantification</p>
                    <p className="text-zinc-400 text-sm italic leading-relaxed">
                      "Every single missed phone call in your business represents a high-ticket project handed directly to a competitor on a silver platter. Our 24/7 AI Voice Assistant recovers that lost capital by picking up instantly and booking jobs on your calendar. If it secures just one project a month, it has already cleared its entire annual cost."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MiniBars({ values }) {
  const safeValues = values.length ? values : [2, 4, 3, 6, 5, 7, 4];

  return (
    <div className="mt-6 flex h-16 items-end gap-2">
      {safeValues.map((value, index) => (
        <div
          key={`mono-${index}`}
          className="flex-1 rounded-full bg-gradient-to-t from-white/20 to-white"
          style={{ height: `${Math.max(14, Math.min(100, value))}%` }}
        />
      ))}
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return <div className={`rounded-[1.8rem] border border-white/10 bg-[rgba(14,17,25,0.88)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.5)] ${className}`}>{children}</div>;
}

function PricingModal({ currentPlan, open, onClose, onCheckout, busyPlan = "", guestMode = false }) {
  if (!open) return null;

  const currentPlanMeta = pricingPlans.find((plan) => plan.key === currentPlan) || null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-xl">
      <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[#090c14] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Plans & Billing</p>
            <h3 className="mt-3 text-3xl font-bold text-white">Choose your operating plan.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              {currentPlanMeta
                ? `Current plan: ${currentPlanMeta.name}. Upgrade or switch below and billing will sync back into your workspace.`
                : "No active plan is stored on this account yet. Start on any plan below."}
            </p>
          </div>
          <button onClick={onClose} type="button" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Close
          </button>
        </div>
        <div className="mt-8">
          <PricingCards currentPlan={currentPlan} onCheckout={onCheckout} busyPlan={busyPlan} guestMode={guestMode} />
        </div>
      </div>
    </div>
  );
}
