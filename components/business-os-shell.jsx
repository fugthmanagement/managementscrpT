"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
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
  planTier: "starter",
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
    badge: "border-emerald-900/70 bg-emerald-950/70 text-emerald-300",
    panel: "from-emerald-500/10 via-transparent to-transparent",
    glow: "shadow-[0_0_50px_rgba(16,185,129,0.08)]",
    label: "Revenue Ops",
  },
  brain: {
    badge: "border-sky-900/70 bg-sky-950/70 text-sky-300",
    panel: "from-sky-500/10 via-transparent to-transparent",
    glow: "shadow-[0_0_50px_rgba(14,165,233,0.08)]",
    label: "AI Training Core",
  },
  ai: {
    badge: "border-amber-900/70 bg-amber-950/70 text-amber-300",
    panel: "from-amber-500/10 via-transparent to-transparent",
    glow: "shadow-[0_0_50px_rgba(245,158,11,0.08)]",
    label: "Strategic Intelligence",
  },
};

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

function PricingCards({ currentPlan = "starter", compact = false }) {
  return (
    <div className={`grid gap-4 ${compact ? "lg:grid-cols-3" : "md:grid-cols-3"}`}>
      {pricingPlans.map((plan) => {
        const featured = plan.key === "growth";
        const current = currentPlan === plan.key;

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
            <a
              href={stripeLinks[plan.key]}
              target="_blank"
              rel="noreferrer"
              className={`mt-6 flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition ${featured ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"}`}
            >
              {current ? "Manage Plan" : plan.key === "growth" ? "Start 7-Day Trial" : "Choose Plan"}
            </a>
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
  const [brainSubTab, setBrainSubTab] = useState("profile");
  const [themeMode, setThemeMode] = useState("dark");
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
  const fileInputRef = useRef(null);
  const autosaveTimerRef = useRef(null);

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
      leadsCaptured ? `${leadsCaptured} total calls in pipeline` : "No leads captured yet",
      appointmentsBooked ? `${appointmentsBooked} booked from live data` : "No booked calls yet",
      revenueCaptured ? "Calculated from booked calls and revenue fields" : "Set Average Job Value or revenue fields",
      missedCallsSaved ? "Recovered from follow-up and callback outcomes" : "No recovered missed calls yet",
      calls.length ? "Measured from AI-handled call records" : "Response rate appears after first call",
    ];

    return metricLabels.map((label, index) => ({ label, value: locked ? "--" : values[index], hint: hints[index] }));
  }, [calls, locked, workspace.averageJobValue]);

  const currentTheme = tabThemes[activeTab];
  const isLightMode = themeMode === "light";
  const commandChips = useMemo(() => {
    return [
      ["Calls", calls.length],
      ["Booked", leadGroups.find((group) => group.name === "Booked")?.count || 0],
      ["Files", knowledgeFiles.length],
      ["Line", workspace.phoneNumber || "offline"],
    ];
  }, [calls.length, knowledgeFiles.length, leadGroups, workspace.phoneNumber]);

  const brainChips = useMemo(() => {
    return [
      ["Business", workspace.businessName || "unset"],
      ["Industry", workspace.industry || "unset"],
      ["Voice", workspace.voiceConfigured ? "ready" : "pending"],
      ["Docs", knowledgeFiles.length],
    ];
  }, [knowledgeFiles.length, workspace.businessName, workspace.industry, workspace.voiceConfigured]);

  const aiChips = useMemo(() => {
    return [
      ["Context", dataReady ? "loaded" : "loading"],
      ["Complaints", leadGroups.find((group) => group.name === "Complaints")?.count || 0],
      ["Follow-Ups", followUps.length],
      ["Tone", workspace.tone || defaultWorkspace.tone],
    ];
  }, [dataReady, followUps.length, leadGroups, workspace.tone]);

  const shellClasses = isLightMode ? "bg-[#f4f3ef] text-black" : "bg-black text-white";
  const asideClasses = isLightMode ? "border-zinc-300 bg-[#eae9e3]" : "border-zinc-900 bg-[#0a0a0a]";
  const mainClasses = isLightMode ? "bg-[#f7f6f2]" : "bg-[#050505]/95";
  const cardClasses = isLightMode ? "border-zinc-300 bg-white text-black shadow-[0_18px_50px_rgba(0,0,0,0.06)]" : "border-zinc-800 bg-[#0f0f11] text-white";
  const mutedText = isLightMode ? "text-zinc-700" : "text-zinc-400";
  const softText = isLightMode ? "text-zinc-500" : "text-zinc-500";

  async function sendToGemini(input = chatInput) {
    if (!input.trim() || locked) return;
    if (!user) {
      setChatLog([{ role: "ai", text: "Log in to use Executive AI." }]);
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
      setIsSaving(false);
      return true;
    } catch (error) {
      setSaveMessage("Could not save workspace settings.");
      setIsSaving(false);
      return false;
    }
  }

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
        setSaveMessage("Changes synced to Firebase.");
      } catch {
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
      setSaveMessage("Upload failed. Check Firebase Storage rules.");
    }

    event.target.value = "";
    setIsUploading(false);
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
        throw new Error("/api/setup-voice returned HTML instead of JSON. Redeploy, then open /api/setup-voice in the browser and confirm it returns JSON.");
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
      setIsConfiguringVoice(false);
      return true;
    } catch (error) {
      setSaveMessage(error.message || "Voice provisioning failed.");
      setIsConfiguringVoice(false);
      return false;
    }
  }

  async function handleOnboardingSubmit() {
    if (!workspaceDraft.businessName.trim() || !workspaceDraft.industry.trim()) {
      setSaveMessage("Business name and industry are required.");
      return;
    }

    const saved = await saveWorkspace();
    const configured = await handleAutoConfig();

    if (saved && configured) {
      setShowOnboarding(false);
    }
  }

  const sentimentStyles = {
    Positive: "border-emerald-900 bg-emerald-950 text-emerald-300",
    Neutral: "border-amber-900 bg-amber-950 text-amber-300",
    Negative: "border-rose-900 bg-rose-950 text-rose-300",
  };

  const overlay = locked && !authReady ? null : locked ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-6xl rounded-[2.2rem] border border-zinc-700 bg-zinc-950/95 p-8 shadow-[0_0_100px_rgba(255,255,255,0.05)] sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">AI Business OS</h2>
            <p className="mt-4 text-sm leading-8 text-zinc-400 sm:text-base">
              Preview the full product, then unlock it with a plan. New accounts should see pricing first, not a plain wall of text.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              <Link href="/login" className="w-full rounded-2xl bg-white px-6 py-4 text-lg font-bold text-black transition hover:bg-zinc-200">
                Create Account / Log In
              </Link>
              <p className="text-sm text-zinc-600">Real workspace data loads after authentication. No demo data is being shown.</p>
            </div>
          </div>
          <PricingCards currentPlan={workspace.planTier} compact />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative min-h-screen overflow-hidden ${shellClasses}`}>
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
                disabled={isSaving || isConfiguringVoice}
                className="w-full rounded-2xl bg-white py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isSaving || isConfiguringVoice ? "Deploying system..." : "Deploy System"}
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
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>
      <div className={`flex min-h-screen flex-col lg:flex-row ${locked ? "select-none" : ""}`}>
        <aside className={`w-full border-b lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r ${asideClasses}`}>
          <div className="p-6 lg:p-8">
            <p className={`text-xs font-semibold uppercase tracking-[0.35em] ${softText}`}>Fugth</p>
            <h1 className={`mt-2 text-2xl font-black tracking-tight ${isLightMode ? "text-black" : "text-white"}`}>MANAGEMENT</h1>
            <p className={`mt-4 text-sm leading-7 ${softText}`}>
              Consumer Business OS for calls, operations, uploads, reminders, and executive AI guidance.
            </p>
          </div>

          <nav className="space-y-2 px-4 pb-6 lg:px-6">
            {[
              ["command", "⚡ Command Center", "Calls, emails, recordings, follow-ups"],
              ["brain", "🧠 Business Brain", "Knowledge, settings, hours, files, calendar"],
              ["ai", "🤖 Executive AI", "ChatGPT-style consulting with your business context"],
            ].map(([key, title, subtitle]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${activeTab === key ? `${isLightMode ? "border-zinc-400 bg-zinc-200 text-black" : `border-zinc-700 bg-zinc-900 text-white ${tabThemes[key].glow}`}` : `${isLightMode ? "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-black" : "border-zinc-900 bg-zinc-950 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-white"}`}`}
              >
                <p className="text-sm font-semibold">{title}</p>
                <p className={`mt-1 text-xs leading-6 ${softText}`}>{subtitle}</p>
              </button>
            ))}
          </nav>

          <div className="px-6 pb-6 lg:mt-auto">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isLightMode ? "border-zinc-300 bg-white" : "border-zinc-900 bg-zinc-950/80"}`}>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className={`text-xs font-medium ${softText}`}>System Operational</span>
            </div>
          </div>
        </aside>

        <main className={`relative flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10 ${mainClasses}`}>
          <div className={`mb-8 rounded-[2rem] border p-5 backdrop-blur sm:p-6 ${currentTheme.glow} ${isLightMode ? "border-zinc-300 bg-white/80" : "border-zinc-800 bg-black/30"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.35em] ${softText}`}>Fugth Management OS</p>
                <h2 className={`mt-2 text-2xl font-bold sm:text-3xl ${isLightMode ? "text-black" : "text-white"}`}>{currentTheme.label}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeTab === "command" && commandChips.map(([label, value]) => <InfoChip key={label} label={label} value={value} />)}
                  {activeTab === "brain" && brainChips.map(([label, value]) => <InfoChip key={label} label={label} value={value} />)}
                  {activeTab === "ai" && aiChips.map(([label, value]) => <InfoChip key={label} label={label} value={value} />)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ThemeSwitch themeMode={themeMode} onToggle={() => setThemeMode((current) => current === "dark" ? "light" : "dark")} />
                {!locked && workspace.planTier !== "elite" ? (
                  <a href={stripeLinks.growth} target="_blank" rel="noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-black transition hover:bg-zinc-200">
                    Upgrade
                  </a>
                ) : null}
                <div className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] ${currentTheme.badge}`}>
                  {locked ? "Preview Mode" : workspace.planTier}
                </div>
                {!locked ? (
                  <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${isLightMode ? "border-zinc-300 bg-white text-black" : "border-zinc-700 bg-zinc-950 text-white"}`}>
                    {workspace.businessName || user?.email || "Profile"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {activeTab === "command" && (
            <div className="mx-auto max-w-7xl space-y-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Command Center</p>
                  <h2 className="mt-3 text-3xl font-bold text-white">Money, Calls, and Daily Momentum</h2>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">This Week</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{locked ? "--" : scoreCards[3].value}</p>
                  <p className="mt-1 text-sm text-zinc-500">{scoreCards[3].hint}</p>
                </div>
              </div>

              <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${locked ? "opacity-60" : "opacity-100"}`}>
                {scoreCards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                    <p className="text-sm text-zinc-500">{card.label}</p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{card.value}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.25em] text-zinc-600">{card.hint}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">AI Call Center</h3>
                    </div>
                    <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400">{calls.length} live calls</span>
                  </div>
                  <div className="mt-6 space-y-4">
                    {calls.length ? calls.map((call) => (
                      <div key={`${call.caller}-${call.date}`} className={`rounded-3xl border p-5 ${isLightMode ? "border-zinc-300 bg-white" : "border-zinc-800 bg-black/40"}`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className={`text-lg font-medium ${isLightMode ? "text-black" : "text-white"}`}>{call.caller}</h4>
                              <span className={`rounded-full border px-3 py-1 text-xs ${sentimentStyles[call.sentiment]}`}>{call.sentiment}</span>
                              <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">{call.outcome}</span>
                            </div>
                            <p className={`mt-2 text-sm ${softText}`}>{call.phone} · {call.date} · {call.duration}</p>
                            <p className={`mt-4 text-sm leading-7 ${mutedText}`}>{call.summary}</p>
                            <div className={`mt-4 rounded-2xl border p-4 text-sm leading-7 ${isLightMode ? "border-zinc-300 bg-zinc-50 text-zinc-700" : "border-zinc-800 bg-zinc-950/80 text-zinc-400"}`}>
                              <span className={`block text-xs uppercase tracking-[0.28em] ${softText}`}>Transcript</span>
                              {call.transcript}
                            </div>
                            {call.recording ? (
                              <div className={`mt-4 rounded-[1.6rem] border p-4 ${isLightMode ? "border-zinc-300 bg-zinc-100" : "border-zinc-800 bg-zinc-950"}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${softText}`}>Media</span>
                                  <a href={call.recording} target="_blank" rel="noreferrer" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isLightMode ? "bg-black text-white" : "bg-white text-black"}`}>
                                    Open File
                                  </a>
                                </div>
                                <audio controls className="mt-4 w-full">
                                  <source src={call.recording} />
                                </audio>
                              </div>
                            ) : null}
                          </div>
                          <div className={`rounded-2xl border px-4 py-3 text-sm ${isLightMode ? "border-zinc-300 bg-zinc-100 text-zinc-700" : "border-zinc-800 bg-zinc-950 text-zinc-300"}`}>
                            {call.rating ? `Listen & Rate ${"⭐".repeat(call.rating)}` : "Recording metadata"}
                          </div>
                        </div>
                        <div className="mt-5">
                          <Waveform />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {call.recording ? <a href={call.recording} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white">Open Recording</a> : <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">No recording URL</span>}
                          <button className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white">Generate Follow-Up</button>
                        </div>
                      </div>
                    )) : (
                      <EmptyPanel title="No live call records yet" body="Connect your call pipeline or webhook so completed calls appear here automatically." />
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <h3 className="text-xl font-bold text-white">Smart Follow-Ups</h3>
                    <div className="mt-5 space-y-3">
                      {followUps.length ? followUps.map((item) => (
                        <div key={item.customer} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{item.customer}</p>
                            <div className="flex gap-2">
                              {[
                                "Send Text",
                                "Send Email",
                                "Auto Follow-Up",
                              ].map((label) => (
                                <button key={label} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300">
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.reason}</p>
                        </div>
                      )) : <EmptyPanel title="No follow-ups detected" body="Follow-up actions appear when calls arrive with inquiry, quote, or callback signals." />}
                    </div>
                  </div>

                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <h3 className="text-xl font-bold text-white">Lead and Email Engine</h3>
                    <div className="mt-5 space-y-3">
                      {leadGroups.map((group) => (
                        <div key={group.name} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-white">{group.name}</p>
                            <span className="text-sm text-zinc-400">{group.count}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-500">{group.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <h3 className="text-xl font-bold text-white">Live Notifications</h3>
                    <div className="mt-5 space-y-3">
                      {feedItems.length ? feedItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                          <p>{item.text}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-zinc-600">{item.createdAt}</p>
                        </div>
                      )) : <EmptyPanel title="No activity yet" body="Recent activity will appear once calls, uploads, or notifications start flowing." />}
                    </div>
                  </div>
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
              <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
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
                        disabled={locked}
                        className="mt-3 w-full border-0 bg-transparent p-0 text-sm leading-7 text-zinc-300 outline-none placeholder:text-zinc-700"
                        placeholder={`Add ${label.toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>
                {saveMessage ? <p className="mt-4 text-sm text-zinc-400">{saveMessage}</p> : null}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className={`rounded-[2rem] border border-dashed border-zinc-700 bg-[#0f0f11] p-8 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Knowledge Base</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Upload real business documents</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">Files upload to Firebase Storage and metadata lands in your user workspace.</p>
                  <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-8 text-center">
                    <p className="text-base font-medium text-white">Choose PDFs, docs, or images</p>
                    <p className="mt-2 text-sm text-zinc-500">Pricing sheets, FAQs, policies, and promo assets.</p>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || locked} className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-300">
                      {isUploading ? "Uploading..." : "Upload file"}
                    </button>
                  </div>
                </div>

                <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">AI Instructions</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Train the voice and rules</h3>
                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-zinc-300">Tone Selection</label>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {["Professional", "Friendly", "Aggressive Sales"].map((option) => (
                          <button
                            key={option}
                            onClick={() => !locked && setWorkspaceDraft((current) => ({ ...current, tone: option }))}
                            className={`rounded-full border px-4 py-2 text-sm transition ${workspaceDraft.tone === option ? "border-zinc-600 bg-white text-black" : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:text-white"}`}
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
                        onChange={(event) => !locked && setWorkspaceDraft((current) => ({ ...current, emergencyRule: event.target.value }))}
                        className="mt-3 min-h-32 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">Automation Rules</label>
                      <textarea
                        value={workspaceDraft.automations}
                        onChange={(event) => !locked && setWorkspaceDraft((current) => ({ ...current, automations: event.target.value }))}
                        className="mt-3 min-h-32 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                        placeholder="One automation per line"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Calendar Sync</p>
                        <p className="mt-2 text-sm text-zinc-500">Keep this connected through your scheduling provider. The Business Brain stores the rules and context.</p>
                        <button className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white">Calendar setup</button>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Booking Rules</p>
                        <p className="mt-2 text-sm text-zinc-500">Use Operating Hours, pricing, and emergency protocol fields to shape how bookings behave.</p>
                        <button onClick={saveWorkspace} className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white">Save rules</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <h3 className="text-xl font-bold text-white">Operating Hours</h3>
                  {workspace.hours ? (
                    <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-8 text-zinc-300 whitespace-pre-wrap">{workspace.hours}</div>
                  ) : (
                    <EmptyPanel title="No hours configured" body="Add business hours in the profile form above and save them to Firestore." />
                  )}
                </div>

                <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <h3 className="text-xl font-bold text-white">Knowledge Files</h3>
                  <p className="mt-2 text-sm text-zinc-500">Searchable uploads tied to the logged-in workspace.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {knowledgeFiles.length ? knowledgeFiles.map((file) => (
                      <div key={file.name} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="mt-2 text-sm text-zinc-500">{file.type} · {formatFileSize(file.size)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-400">#{file.tag}</span>
                          <span className="rounded-full border border-emerald-900 bg-emerald-950 px-2 py-1 text-xs text-emerald-300">{file.status}</span>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-600">Used in {file.usageCount} AI responses</p>
                        <div className="mt-4 flex gap-2">
                          {file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-white">Open</a> : null}
                        </div>
                      </div>
                    )) : <EmptyPanel title="No files uploaded" body="Upload your real documents above to ground the chatbot and voice assistant in company data." />}
                  </div>
                </div>
              </div>

              <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
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

              <div className={`rounded-[2rem] border p-6 ${locked ? "opacity-65" : "opacity-100"} ${cardClasses}`}>
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
                  <PricingCards currentPlan={workspace.planTier} />
                </div>
              </div>
                </>
              )}

              {brainSubTab === "voice" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-8 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Voice Infrastructure</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">Dedicated line and assistant provisioning</h3>

                    <div className="mt-6 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-zinc-600">Business</p>
                      <p className="mt-2 text-lg font-semibold text-white">{workspace.businessName || "Complete Business Profile first"}</p>
                      <p className="mt-2 text-sm text-zinc-500">Industry: {workspace.industry || "Not set"}</p>
                    </div>

                    {workspace.phoneNumber ? (
                      <div className="mt-4 rounded-[1.75rem] border border-emerald-900/60 bg-emerald-950/20 p-5">
                        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Active Line</p>
                        <p className="mt-2 text-3xl font-mono text-white">{workspace.phoneNumber}</p>
                        <p className="mt-2 text-sm text-zinc-400">Assistant ID: {workspace.assistantId || "Stored"}</p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.75rem] border border-rose-900/50 bg-rose-950/20 p-5">
                        <p className="text-sm font-semibold text-rose-300">System disconnected</p>
                        <p className="mt-2 text-sm leading-7 text-zinc-400">No active line is assigned to this account yet.</p>
                      </div>
                    )}

                    <button
                      onClick={handleAutoConfig}
                      disabled={isConfiguringVoice || locked}
                      className="mt-6 w-full rounded-2xl bg-white py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    >
                      {isConfiguringVoice ? "Configuring Voice Network..." : "Auto-Configure Voice Network"}
                    </button>
                    {saveMessage ? <p className="mt-4 text-sm text-zinc-400">{saveMessage}</p> : null}
                  </div>

                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-8 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Infrastructure Sync</p>
                    <h3 className="mt-3 text-2xl font-bold text-white">Routing and capture tools</h3>
                    <div className="mt-6 space-y-4">
                      {[
                        ["Record Conversations", true],
                        ["Sentiment Analysis", true],
                        ["Owner Metadata Routing", Boolean(workspace.assistantId)],
                        ["Webhook Ready", true],
                      ].map(([label, enabled]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 p-4">
                          <span className="text-sm text-white">{label}</span>
                          <div className={`relative h-6 w-12 rounded-full ${enabled ? "bg-green-500" : "bg-zinc-700"}`}>
                            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? "right-1" : "left-1"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-5 text-sm leading-7 text-zinc-400">
                      Keep `VOICE_PRIVATE_KEY` on the server only. `NEXT_PUBLIC_VOICE_PUBLIC_KEY` can stay public for future browser-side voice widgets, but this provisioning flow stays server-side.
                    </div>
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
                <button className="rounded-2xl border border-zinc-800 bg-[#0f0f11] px-4 py-2 text-sm text-zinc-300">🎙️ Voice Mode</button>
              </div>

              <div className="flex flex-1 gap-6 min-h-[500px] flex-col xl:flex-row">
                <div className={`flex-1 overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#0f0f11] ${locked ? "opacity-70" : "opacity-100"}`}>
                  <div className="border-b border-zinc-900 p-6">
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendToGemini(suggestion)}
                          className="rounded-full border border-zinc-800 bg-black px-4 py-2 text-left text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white"
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
                        <div className={`rounded-2xl p-4 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm bg-blue-600 text-white shadow-lg" : "rounded-tl-sm border border-zinc-800 bg-zinc-900 text-zinc-200"}`}>
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
        </main>
      </div>
    </div>
  );
}
