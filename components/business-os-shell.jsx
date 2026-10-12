"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
async function authHeaders() { const token = await auth.currentUser?.getIdToken(); if (!token) throw new Error("Sign in required"); return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }; }

const ADMIN_EMAILS = [
  "fugthmanagement@gmail.com",
  "mepenginestudio@gmail.com",
  "fugthchat@gmail.com",
];

const DEFAULT_SCRIPT = `You are the AI receptionist for this business.
Greet the caller professionally.
Find out their name, phone number, service needed, city, urgency, and best appointment time.
If they are ready, book the appointment.
If they are not ready, save them as a lead and ask permission for a follow-up.
Keep the call short, helpful, and confident.`;

const DEFAULT_WORKSPACE = {
  businessName: "Fugth Management OS",
  ownerName: "",
  businessType: "Service Business",
  phone: "",
  website: "",
  serviceArea: "",
  hours: "Mon-Fri 9 AM - 5 PM",
  bookingLink: "",
  plan: "Starter",
  status: "active",
  vapiNumber: "",
  vapiAssistantId: "",
  vapiLinked: false,
  needsVapiLink: true,
  aiScript: DEFAULT_SCRIPT,
  primaryGoal: "Book more jobs from missed calls and cold leads.",
};

const NAV_ITEMS = [
  { id: "overview", label: "Command Center", icon: "overview" },
  { id: "calls", label: "Calls", icon: "calls" },
  { id: "leads", label: "Leads CRM", icon: "leads" },
  { id: "campaigns", label: "Cold Calling", icon: "bolt" },
  { id: "appointments", label: "Appointments", icon: "calendar" },
  { id: "advisor", label: "AI Advisor", icon: "advisor" },
  { id: "knowledge", label: "Trainer", icon: "book" },
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "dev_ops", label: "Dev Ops", icon: "shield" },
];

const LEAD_STAGES = [
  "new",
  "called",
  "follow_up",
  "hot",
  "booked",
  "won",
  "lost",
];

const PLAN_LIMITS = {
  Starter: { calls: 100, sms: 50, agents: 1 },
  Growth: { calls: 500, sms: 250, agents: 3 },
  Elite: { calls: 2000, sms: 1000, agents: 10 },
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-white/[0.07]";

const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400";

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "overview") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="4" rx="1" />
        <rect x="14" y="10" width="7" height="11" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (name === "calls") {
    return (
      <svg {...common}>
        <path d="M22 16.92V21a1 1 0 0 1-1.11 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2 3.11 1 1 0 0 1 3 2h4.09a1 1 0 0 1 1 .75c.12.86.37 1.7.72 2.5a1 1 0 0 1-.24 1L8.7 8.7a16 16 0 0 0 6 6l1.44-1.44a1 1 0 0 1 1-.24c.8.35 1.64.6 2.5.72a1 1 0 0 1 .75 1z" />
      </svg>
    );
  }

  if (name === "leads") {
    return (
      <svg {...common}>
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if (name === "bolt") {
    return (
      <svg {...common}>
        <path d="M13 2 3 14h8l-1 8 11-14h-8V2z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
        <path d="M8 14h3M14 14h2M8 18h2" />
      </svg>
    );
  }

  if (name === "advisor") {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-7" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.4.7.6 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-.6 1z" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function sanitizeForFirestore(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (value instanceof Date) return value;

  if (isPlainObject(value)) {
    const cleaned = {};
    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) cleaned[key] = sanitizeForFirestore(val);
    });
    return cleaned;
  }

  return value;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function initials(name = "FC") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalize(value = "") {
  return String(value).toLowerCase().trim();
}

function statusClass(status = "") {
  const s = normalize(status);

  if (["won", "booked", "completed", "answered", "active", "hot"].includes(s)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (["follow_up", "called", "pending", "warm", "scheduled"].includes(s)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  if (["lost", "missed", "cancelled", "inactive"].includes(s)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function Pill({ children, tone }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", tone)}>
      {children}
    </span>
  );
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={cx("rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl", className)}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function StatCard({ label, value, note, icon, tone = "emerald" }) {
  const toneClass =
    tone === "rose"
      ? "from-rose-400/20 to-orange-500/10 text-rose-200"
      : tone === "amber"
        ? "from-amber-400/20 to-yellow-500/10 text-amber-200"
        : "from-emerald-400/20 to-cyan-500/10 text-emerald-200";

  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
          {note && <p className="mt-2 text-sm text-slate-400">{note}</p>}
        </div>
        <div className={cx("rounded-2xl bg-gradient-to-br p-3", toneClass)}>
          <Icon name={icon || "overview"} />
        </div>
      </div>
    </div>
  );
}

function GhostButton({ children, onClick, type = "button", disabled = false, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, type = "button", disabled = false, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const [workspace, setWorkspace] = useState(DEFAULT_WORKSPACE);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_WORKSPACE);

  const [calls, setCalls] = useState([]);
  const [leads, setLeads] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [knowledge, setKnowledge] = useState([]);

  const [leadSearch, setLeadSearch] = useState("");
  const [leadForm, setLeadForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    service: "",
    source: "Google Maps",
    status: "new",
    priority: "warm",
    value: "",
    notes: "",
  });

  const [appointmentForm, setAppointmentForm] = useState({
    customerName: "",
    phone: "",
    service: "",
    date: "",
    time: "",
    status: "scheduled",
    notes: "",
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    market: "",
    offer: "",
    goal: "Book appointments",
    status: "draft",
    script: DEFAULT_SCRIPT,
  });

  const [knowledgeForm, setKnowledgeForm] = useState({
    title: "",
    type: "FAQ",
    content: "",
  });

  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorMessages, setAdvisorMessages] = useState([
    {
      role: "assistant",
      content:
        "I am your Fugth Business Brain. Ask me what to fix next, which leads to call, or how to improve your AI receptionist.",
    },
  ]);

  const [devForm, setDevForm] = useState({
    email: "",
    businessName: "",
    phone: "",
    plan: "Starter",
    role: "client",
    uid: "",
    status: "active",
  });

  const isAdmin = ADMIN_EMAILS.includes(normalize(user?.email));
  const visibleNav = useMemo(
    () => NAV_ITEMS.filter((item) => isAdmin || item.id !== "dev_ops"),
    [isAdmin]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab === "dev_ops") setActiveTab("overview");
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);

    const unsubWorkspace = onSnapshot(
      userRef,
      async (snap) => {
        if (!snap.exists()) {
          const starterWorkspace = {
            ...DEFAULT_WORKSPACE,
            plan: undefined,
            status: undefined,
            email: user.email || "",
            ownerName: user.displayName || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          setWorkspace({
            ...DEFAULT_WORKSPACE,
            email: user.email || "",
            ownerName: user.displayName || "",
          });

          setSettingsForm({
            ...DEFAULT_WORKSPACE,
            email: user.email || "",
            ownerName: user.displayName || "",
          });

          await setDoc(userRef, sanitizeForFirestore(starterWorkspace), { merge: true });
          return;
        }

        const data = { ...DEFAULT_WORKSPACE, ...snap.data(), id: snap.id };
        setWorkspace(data);
        setSettingsForm(data);
      },
      (error) => setNotice(error.message)
    );

    const listen = (collectionName, setter) => {
      const ref = collection(db, "users", user.uid, collectionName);
      const q = query(ref, orderBy("createdAt", "desc"), limit(100));

      return onSnapshot(
        q,
        (snapshot) => {
          setter(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
        (error) => setNotice(error.message)
      );
    };

    const unsubCalls = listen("calls", setCalls);
    const unsubLeads = listen("leads", setLeads);
    const unsubAppointments = listen("appointments", setAppointments);
    const unsubCampaigns = listen("campaigns", setCampaigns);
    const unsubKnowledge = listen("knowledge", setKnowledge);

    return () => {
      unsubWorkspace();
      unsubCalls();
      unsubLeads();
      unsubAppointments();
      unsubCampaigns();
      unsubKnowledge();
    };
  }, [user?.uid, user?.email, user?.displayName]);

  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const hotLeads = leads.filter((lead) => ["hot", "follow_up"].includes(normalize(lead.status))).length;
    const bookedLeads = leads.filter((lead) => ["booked", "won"].includes(normalize(lead.status))).length;
    const pipelineValue = leads.reduce((sum, lead) => sum + Number(lead.value || lead.estimatedValue || 0), 0);

    const totalCalls = calls.length;
    const missedCalls = calls.filter((call) =>
      ["missed", "no_answer", "failed"].includes(normalize(call.status || call.outcome))
    ).length;

    const bookedAppointments = appointments.filter(
      (appt) => !["cancelled", "lost"].includes(normalize(appt.status))
    ).length;

    const today = new Date();
    const appointmentsToday = appointments.filter((appt) => {
      const date = toDate(appt.startTime || appt.date || appt.createdAt);
      return (
        date &&
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;

    const conversionRate = totalLeads ? Math.round((bookedLeads / totalLeads) * 100) : 0;
    const callAnswerRate = totalCalls ? Math.round(((totalCalls - missedCalls) / totalCalls) * 100) : 0;

    return {
      totalLeads,
      hotLeads,
      bookedLeads,
      pipelineValue,
      totalCalls,
      missedCalls,
      bookedAppointments,
      appointmentsToday,
      conversionRate,
      callAnswerRate,
      knowledgeCount: knowledge.length,
    };
  }, [calls, leads, appointments, knowledge]);

  const advisorCards = useMemo(() => {
    const cards = [];

    if (!workspace.vapiLinked && !workspace.vapiNumber) {
      cards.push({
        title: "Connect the Fugth voice number",
        body: "Your assistant can look finished in the UI, but the client will not trust it until the phone number is linked and visible.",
        tone: "amber",
      });
    }

    if (metrics.missedCalls > 0) {
      cards.push({
        title: "Missed calls need a callback flow",
        body: `${metrics.missedCalls} calls look missed or failed. Build a follow-up list and call them before they go cold.`,
        tone: "rose",
      });
    }

    if (metrics.hotLeads > 0) {
      cards.push({
        title: "Hot leads are waiting",
        body: `${metrics.hotLeads} leads are marked hot or follow-up. These should be the next outbound calls.`,
        tone: "emerald",
      });
    }

    if (metrics.knowledgeCount < 3) {
      cards.push({
        title: "Train the receptionist more",
        body: "Add FAQs, prices, service areas, and objections in the Trainer tab so the AI sounds like the real business.",
        tone: "amber",
      });
    }

    if (!cards.length) {
      cards.push({
        title: "System is clean",
        body: "The workspace has calls, leads, appointments, and training data. Next move is selling and onboarding more businesses.",
        tone: "emerald",
      });
    }

    return cards;
  }, [workspace, metrics]);

  const filteredLeads = useMemo(() => {
    const term = normalize(leadSearch);

    if (!term) return leads;

    return leads.filter((lead) => {
      const haystack = [
        lead.businessName,
        lead.contactName,
        lead.phone,
        lead.email,
        lead.service,
        lead.status,
        lead.source,
        lead.notes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [leads, leadSearch]);

  async function saveWorkspace(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setBusy("settings");
    setNotice("");

    try {
      await setDoc(
        doc(db, "users", user.uid),
        sanitizeForFirestore({
          ...settingsForm,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );

      setNotice("Workspace saved.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function linkVapiNumber() {
    if (!user?.uid) return;

    setBusy("vapi");
    setNotice("");

    try {
      await setDoc(
        doc(db, "users", user.uid),
        sanitizeForFirestore({
          vapiNumber: settingsForm.vapiNumber || workspace.vapiNumber || "",
          vapiAssistantId: settingsForm.vapiAssistantId || workspace.vapiAssistantId || "",
          vapiLinked: Boolean(settingsForm.vapiNumber || workspace.vapiNumber),
          needsVapiLink: false,
          vapiLinkedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );

      setNotice("Vapi number linked to this workspace.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function addLead(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setBusy("lead");
    setNotice("");

    try {
      await addDoc(
        collection(db, "users", user.uid, "leads"),
        sanitizeForFirestore({
          ...leadForm,
          value: Number(leadForm.value || 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      setLeadForm({
        businessName: "",
        contactName: "",
        phone: "",
        email: "",
        service: "",
        source: "Google Maps",
        status: "new",
        priority: "warm",
        value: "",
        notes: "",
      });

      setNotice("Lead saved.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function updateLead(leadId, updates) {
    if (!user?.uid || !leadId) return;

    try {
      await updateDoc(
        doc(db, "users", user.uid, "leads", leadId),
        sanitizeForFirestore({
          ...updates,
          updatedAt: serverTimestamp(),
        })
      );
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function removeLead(leadId) {
    if (!user?.uid || !leadId) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "leads", leadId));
      setNotice("Lead deleted.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function createAppointment(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setBusy("appointment");
    setNotice("");

    const startTime =
      appointmentForm.date && appointmentForm.time
        ? new Date(`${appointmentForm.date}T${appointmentForm.time}`)
        : null;

    try {
      await addDoc(
        collection(db, "users", user.uid, "appointments"),
        sanitizeForFirestore({
          ...appointmentForm,
          startTime,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      setAppointmentForm({
        customerName: "",
        phone: "",
        service: "",
        date: "",
        time: "",
        status: "scheduled",
        notes: "",
      });

      setNotice("Appointment created.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function createCampaign(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setBusy("campaign");
    setNotice("");

    try {
      await addDoc(
        collection(db, "users", user.uid, "campaigns"),
        sanitizeForFirestore({
          ...campaignForm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      setCampaignForm({
        name: "",
        market: "",
        offer: "",
        goal: "Book appointments",
        status: "draft",
        script: DEFAULT_SCRIPT,
      });

      setNotice("Campaign saved.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function addKnowledge(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setBusy("knowledge");
    setNotice("");

    try {
      await addDoc(
        collection(db, "users", user.uid, "knowledge"),
        sanitizeForFirestore({
          ...knowledgeForm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      setKnowledgeForm({
        title: "",
        type: "FAQ",
        content: "",
      });

      setNotice("Training item added.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function createTestCall() {
    if (!user?.uid) return;

    setBusy("testCall");
    setNotice("");

    try {
      await addDoc(
        collection(db, "users", user.uid, "calls"),
        sanitizeForFirestore({
          callerName: "Demo Caller",
          phone: "+1 555 0100",
          status: "answered",
          outcome: "booked",
          summary: "Demo call created from the dashboard to test the call feed.",
          duration: 142,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      setNotice("Demo call added.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function askAdvisor(event) {
    event.preventDefault();

    const question = advisorInput.trim();
    if (!question) return;

    const userMessage = { role: "user", content: question };
    setAdvisorMessages((prev) => [...prev, userMessage]);
    setAdvisorInput("");
    setBusy("advisor");

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          question,
          workspace,
          metrics,
          recentLeads: leads.slice(0, 8),
          recentCalls: calls.slice(0, 8),
        }),
      });

      if (!response.ok) throw new Error("Advisor API not ready yet.");

      const data = await response.json();

      setAdvisorMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.message || "I checked the workspace, but the advisor did not return a full answer.",
        },
      ]);
    } catch {
      const fallback = `Based on your current dashboard: you have ${metrics.totalLeads} leads, ${metrics.hotLeads} hot/follow-up leads, ${metrics.totalCalls} calls, and ${metrics.bookedAppointments} appointments. Best next move: call the hot/follow-up leads first, then add more business training in the Trainer tab so the receptionist can answer pricing, hours, service area, and booking questions.`;

      setAdvisorMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setBusy("");
    }
  }

  async function devCreateAccount(event) {
    event.preventDefault();

    if (!isAdmin) return;

    setBusy("devCreate");
    setNotice("");

    try {
      const response = await fetch("/api/dev/create-account", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(devForm),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Create account API failed.");

      setNotice("Developer account action completed.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function devUpdateAccount() {
    if (!isAdmin) return;

    setBusy("devUpdate");
    setNotice("");

    try {
      const response = await fetch("/api/dev/update-account", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(devForm),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Update account API failed.");

      setNotice("Account updated.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  function exportLeads() {
    const rows = [
      ["Business", "Contact", "Phone", "Email", "Service", "Status", "Priority", "Value", "Source", "Notes"],
      ...leads.map((lead) => [
        lead.businessName || "",
        lead.contactName || "",
        lead.phone || "",
        lead.email || "",
        lead.service || "",
        lead.status || "",
        lead.priority || "",
        lead.value || "",
        lead.source || "",
        String(lead.notes || "").replace(/\n/g, " "),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "fugth-leads.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/20" />
          <p className="font-bold">Loading Fugth Command Center...</p>
          <p className="mt-2 text-sm text-slate-400">Checking your secure workspace.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-2xl font-black text-slate-950">
            F
          </div>
          <h1 className="text-2xl font-black">Fugth Management OS</h1>
          <p className="mt-3 text-sm text-slate-400">
            Sign in to manage calls, leads, appointments, campaigns, AI training, and developer operations.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[30%] h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 font-black text-slate-950">
              FG
            </div>
            <div>
              <p className="text-sm font-black text-white">Fugth Management</p>
              <p className="text-xs text-slate-500">Voice Ops Platform</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition",
                  activeTab === item.id
                    ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            <p className="mt-2 font-black text-white">{workspace.businessName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone={statusClass(workspace.status)}>{workspace.status || "active"}</Pill>
              <Pill tone="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{workspace.plan || "Starter"}</Pill>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/[0.06]"
            >
              <Icon name="logout" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] font-black text-emerald-200">
                    {initials(workspace.businessName || user.email)}
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white sm:text-2xl">
                      {workspace.businessName || "Fugth Command Center"}
                    </h1>
                    <p className="text-sm text-slate-400">
                      {user.email} {isAdmin ? "· Developer Admin" : "· Client Workspace"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={workspace.vapiLinked || workspace.vapiNumber ? statusClass("active") : statusClass("pending")}>
                  {workspace.vapiLinked || workspace.vapiNumber ? "Voice number linked" : "Needs Vapi link"}
                </Pill>
                <GhostButton onClick={createTestCall} disabled={busy === "testCall"}>
                  Add demo call
                </GhostButton>
                <PrimaryButton onClick={() => setActiveTab("leads")}>Add lead</PrimaryButton>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto overscroll-x-contain pb-2 lg:hidden">
              {visibleNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cx(
                    "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold",
                    activeTab === item.id
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-white/10 bg-white/[0.04] text-slate-300"
                  )}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>

            {notice && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            )}
          </header>

          <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {activeTab === "overview" && (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Total Leads" value={metrics.totalLeads} note={`${metrics.hotLeads} hot/follow-up`} icon="leads" />
                  <StatCard label="Calls" value={metrics.totalCalls} note={`${metrics.callAnswerRate}% answer rate`} icon="calls" tone={metrics.missedCalls ? "amber" : "emerald"} />
                  <StatCard label="Appointments" value={metrics.bookedAppointments} note={`${metrics.appointmentsToday} today`} icon="calendar" />
                  <StatCard label="Pipeline" value={money(metrics.pipelineValue)} note={`${metrics.conversionRate}% lead conversion`} icon="advisor" />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <Panel
                    title="Voice Ops Command Center"
                    subtitle="Live business health, Vapi readiness, CRM pipeline, and next actions."
                    action={<PrimaryButton onClick={() => setActiveTab("campaigns")}>Start calling</PrimaryButton>}
                  >
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Number</p>
                        <p className="mt-2 text-lg font-black text-white">{workspace.vapiNumber || "Not linked"}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {workspace.vapiLinked ? "Ready for inbound calls." : "Add your Vapi number in Settings."}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Plan Usage</p>
                        <p className="mt-2 text-lg font-black text-white">{workspace.plan || "Starter"}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {metrics.totalCalls}/{PLAN_LIMITS[workspace.plan]?.calls || 100} calls tracked.
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Trainer Data</p>
                        <p className="mt-2 text-lg font-black text-white">{metrics.knowledgeCount} items</p>
                        <p className="mt-2 text-sm text-slate-400">FAQs, service rules, objections, and offers.</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-emerald-400/10 to-cyan-400/5 p-5">
                      <p className="text-sm font-black text-emerald-100">Current AI Receptionist Script</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {workspace.aiScript || DEFAULT_SCRIPT}
                      </p>
                    </div>
                  </Panel>

                  <Panel title="Business Brain" subtitle="What the platform thinks you should do next.">
                    <div className="space-y-3">
                      {advisorCards.map((card) => (
                        <div key={card.title} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cx(
                                "mt-1 h-3 w-3 rounded-full",
                                card.tone === "rose"
                                  ? "bg-rose-400"
                                  : card.tone === "amber"
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                              )}
                            />
                            <div>
                              <p className="font-black text-white">{card.title}</p>
                              <p className="mt-1 text-sm text-slate-400">{card.body}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <RecentCalls calls={calls} />
                  <RecentAppointments appointments={appointments} />
                </section>
              </>
            )}

            {activeTab === "calls" && (
              <Panel
                title="Call Intelligence"
                subtitle="Inbound, outbound, missed calls, recordings, summaries, and call outcomes."
                action={<GhostButton onClick={createTestCall}>Create demo call</GhostButton>}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Total Calls" value={metrics.totalCalls} icon="calls" />
                  <StatCard label="Missed" value={metrics.missedCalls} icon="calls" tone={metrics.missedCalls ? "rose" : "emerald"} />
                  <StatCard label="Answer Rate" value={`${metrics.callAnswerRate}%`} icon="advisor" />
                </div>

                <div className="mt-6 space-y-4">
                  {calls.length === 0 ? (
                    <EmptyState title="No calls yet" body="When Vapi starts sending call logs, they will show up here." />
                  ) : (
                    calls.map((call) => (
                      <div key={call.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-white">
                                {call.callerName || call.name || call.phone || "Unknown Caller"}
                              </h3>
                              <Pill tone={statusClass(call.status || call.outcome)}>
                                {call.status || call.outcome || "new"}
                              </Pill>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">
                              {call.phone || "No phone"} · {formatDateTime(call.createdAt || call.startedAt)}
                            </p>
                          </div>
                          <p className="text-sm text-slate-500">
                            {call.duration ? `${call.duration}s` : "Duration not tracked"}
                          </p>
                        </div>

                        {(call.summary || call.transcript) && (
                          <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
                            {call.summary || call.transcript}
                          </p>
                        )}

                        {(call.recordingUrl || call.recording_url || call.recording) && (
                          <div className="mt-4">
                            <audio
                              controls
                              className="w-full"
                              src={call.recordingUrl || call.recording_url || call.recording}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            )}

            {activeTab === "leads" && (
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Add Lead" subtitle="Save cold leads, inbound leads, Google Maps leads, and follow-up notes.">
                  <form onSubmit={addLead} className="space-y-4">
                    <Field label="Business Name">
                      <input className={inputClass} value={leadForm.businessName} onChange={(e) => setLeadForm({ ...leadForm, businessName: e.target.value })} placeholder="Example: Pierre Roofing LLC" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Contact">
                        <input className={inputClass} value={leadForm.contactName} onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })} placeholder="Owner or manager" />
                      </Field>
                      <Field label="Phone">
                        <input className={inputClass} value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} placeholder="+1..." />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Email">
                        <input className={inputClass} value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="owner@email.com" />
                      </Field>
                      <Field label="Service">
                        <input className={inputClass} value={leadForm.service} onChange={(e) => setLeadForm({ ...leadForm, service: e.target.value })} placeholder="AI receptionist, website, booking" />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Source">
                        <select className={inputClass} value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}>
                          <option>Google Maps</option>
                          <option>Inbound Call</option>
                          <option>Referral</option>
                          <option>Facebook</option>
                          <option>Website</option>
                          <option>Manual</option>
                        </select>
                      </Field>

                      <Field label="Status">
                        <select className={inputClass} value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}>
                          {LEAD_STAGES.map((stage) => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Value">
                        <input className={inputClass} type="number" value={leadForm.value} onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })} placeholder="500" />
                      </Field>
                    </div>

                    <Field label="Notes">
                      <textarea className={cx(inputClass, "min-h-28")} value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} placeholder="Pain points, price, objections, next call..." />
                    </Field>

                    <PrimaryButton type="submit" disabled={busy === "lead"} className="w-full">
                      Save Lead
                    </PrimaryButton>
                  </form>
                </Panel>

                <Panel
                  title="Lead Pipeline"
                  subtitle="Resume work anywhere. Every lead stays saved inside the client workspace."
                  action={<GhostButton onClick={exportLeads}>Export CSV</GhostButton>}
                >
                  <input
                    className={inputClass}
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search business, phone, status, notes..."
                  />

                  <div className="mt-5 space-y-4">
                    {filteredLeads.length === 0 ? (
                      <EmptyState title="No leads found" body="Add your first lead or clear the search." />
                    ) : (
                      filteredLeads.map((lead) => (
                        <div key={lead.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-black text-white">
                                  {lead.businessName || lead.contactName || "Unnamed Lead"}
                                </h3>
                                <Pill tone={statusClass(lead.status)}>{lead.status || "new"}</Pill>
                              </div>
                              <p className="mt-1 text-sm text-slate-400">
                                {lead.contactName || "No contact"} · {lead.phone || "No phone"} · {lead.source || "Manual"}
                              </p>
                              <p className="mt-2 text-sm text-slate-300">
                                {lead.service || "No service listed"} {lead.value ? `· ${money(lead.value)}` : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <select
                                className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                value={lead.status || "new"}
                                onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                              >
                                {LEAD_STAGES.map((stage) => (
                                  <option key={stage} value={stage}>{stage}</option>
                                ))}
                              </select>
                              <GhostButton onClick={() => updateLead(lead.id, { status: "called", lastCalledAt: serverTimestamp() })}>
                                Mark called
                              </GhostButton>
                              <GhostButton onClick={() => removeLead(lead.id)} className="text-rose-200 hover:border-rose-400/40 hover:bg-rose-400/10">
                                Delete
                              </GhostButton>
                            </div>
                          </div>

                          {lead.notes && (
                            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
                              {lead.notes}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>Created: {formatDate(lead.createdAt)}</span>
                            {lead.lastCalledAt && <span>· Last called: {formatDateTime(lead.lastCalledAt)}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === "campaigns" && (
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Create Cold Calling Campaign" subtitle="For Google Maps leads, contractors, local services, and outbound sales.">
                  <form onSubmit={createCampaign} className="space-y-4">
                    <Field label="Campaign Name">
                      <input className={inputClass} value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Roofers in Fall River" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Market">
                        <input className={inputClass} value={campaignForm.market} onChange={(e) => setCampaignForm({ ...campaignForm, market: e.target.value })} placeholder="Plumbers, roofers, barbers..." />
                      </Field>
                      <Field label="Offer">
                        <input className={inputClass} value={campaignForm.offer} onChange={(e) => setCampaignForm({ ...campaignForm, offer: e.target.value })} placeholder="AI receptionist + booking setup" />
                      </Field>
                    </div>

                    <Field label="Goal">
                      <select className={inputClass} value={campaignForm.goal} onChange={(e) => setCampaignForm({ ...campaignForm, goal: e.target.value })}>
                        <option>Book appointments</option>
                        <option>Sell starter plan</option>
                        <option>Offer free demo</option>
                        <option>Collect interested leads</option>
                      </select>
                    </Field>

                    <Field label="Call Script">
                      <textarea className={cx(inputClass, "min-h-56")} value={campaignForm.script} onChange={(e) => setCampaignForm({ ...campaignForm, script: e.target.value })} />
                    </Field>

                    <PrimaryButton type="submit" disabled={busy === "campaign"} className="w-full">
                      Save Campaign
                    </PrimaryButton>
                  </form>
                </Panel>

                <Panel title="Outbound Desktop" subtitle="Your saved lead queue for calling, notes, and follow-up.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LEAD_STAGES.map((stage) => {
                      const count = leads.filter((lead) => normalize(lead.status) === stage).length;
                      return (
                        <div key={stage} className="rounded-[1.3rem] border border-white/10 bg-slate-950/60 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{stage}</p>
                          <p className="mt-2 text-2xl font-black text-white">{count}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 space-y-4">
                    {leads.filter((lead) => ["new", "follow_up", "hot"].includes(normalize(lead.status))).slice(0, 8).map((lead) => (
                      <div key={lead.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black text-white">{lead.businessName || lead.contactName || "Lead"}</p>
                            <p className="text-sm text-slate-400">{lead.phone || "No phone"} · {lead.service || "No service"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <GhostButton onClick={() => updateLead(lead.id, { status: "called", lastCalledAt: serverTimestamp() })}>
                              Called
                            </GhostButton>
                            <GhostButton onClick={() => updateLead(lead.id, { status: "booked" })}>
                              Booked
                            </GhostButton>
                            <GhostButton onClick={() => updateLead(lead.id, { status: "lost" })}>
                              Lost
                            </GhostButton>
                          </div>
                        </div>
                      </div>
                    ))}

                    {leads.filter((lead) => ["new", "follow_up", "hot"].includes(normalize(lead.status))).length === 0 && (
                      <EmptyState title="No active calling queue" body="Add leads or move existing leads to new, hot, or follow_up." />
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-3 font-black text-white">Saved Campaigns</h3>
                    <div className="space-y-3">
                      {campaigns.length === 0 ? (
                        <EmptyState title="No campaigns yet" body="Create your first outbound campaign." />
                      ) : (
                        campaigns.map((campaign) => (
                          <div key={campaign.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-black text-white">{campaign.name || "Untitled Campaign"}</p>
                                <p className="text-sm text-slate-400">{campaign.market || "No market"} · {campaign.goal || "No goal"}</p>
                              </div>
                              <Pill tone={statusClass(campaign.status)}>{campaign.status || "draft"}</Pill>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === "appointments" && (
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Quick Appointment" subtitle="Manual booking form for calls, demos, and client jobs.">
                  <form onSubmit={createAppointment} className="space-y-4">
                    <Field label="Customer Name">
                      <input className={inputClass} value={appointmentForm.customerName} onChange={(e) => setAppointmentForm({ ...appointmentForm, customerName: e.target.value })} placeholder="Customer name" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Phone">
                        <input className={inputClass} value={appointmentForm.phone} onChange={(e) => setAppointmentForm({ ...appointmentForm, phone: e.target.value })} placeholder="+1..." />
                      </Field>
                      <Field label="Service">
                        <input className={inputClass} value={appointmentForm.service} onChange={(e) => setAppointmentForm({ ...appointmentForm, service: e.target.value })} placeholder="Service or demo" />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Date">
                        <input className={inputClass} type="date" value={appointmentForm.date} onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })} />
                      </Field>
                      <Field label="Time">
                        <input className={inputClass} type="time" value={appointmentForm.time} onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })} />
                      </Field>
                    </div>

                    <Field label="Notes">
                      <textarea className={cx(inputClass, "min-h-28")} value={appointmentForm.notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} placeholder="Address, job details, quote notes..." />
                    </Field>

                    <PrimaryButton type="submit" disabled={busy === "appointment"} className="w-full">
                      Create Appointment
                    </PrimaryButton>
                  </form>
                </Panel>

                <RecentAppointments appointments={appointments} large />
              </section>
            )}

            {activeTab === "advisor" && (
              <Panel title="Executive AI Advisor" subtitle="Ask for business fixes, sales strategy, CRM cleanup, or next moves.">
                <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
                    <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
                      {advisorMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={cx(
                            "rounded-[1.4rem] p-4 text-sm leading-6",
                            message.role === "user"
                              ? "ml-auto max-w-[85%] bg-emerald-400 text-slate-950"
                              : "mr-auto max-w-[90%] bg-white/[0.06] text-slate-200"
                          )}
                        >
                          {message.content}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={askAdvisor} className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        className={inputClass}
                        value={advisorInput}
                        onChange={(e) => setAdvisorInput(e.target.value)}
                        placeholder="Ask: what should I fix next?"
                      />
                      <PrimaryButton type="submit" disabled={busy === "advisor"}>
                        Ask
                      </PrimaryButton>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {advisorCards.map((card) => (
                      <div key={card.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                        <p className="font-black text-white">{card.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{card.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            {activeTab === "knowledge" && (
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel title="AI Receptionist Trainer" subtitle="Add business rules so the agent does not hallucinate.">
                  <form onSubmit={addKnowledge} className="space-y-4">
                    <Field label="Title">
                      <input className={inputClass} value={knowledgeForm.title} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })} placeholder="Pricing, Hours, Emergency Policy..." />
                    </Field>

                    <Field label="Type">
                      <select className={inputClass} value={knowledgeForm.type} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, type: e.target.value })}>
                        <option>FAQ</option>
                        <option>Service</option>
                        <option>Pricing</option>
                        <option>Objection</option>
                        <option>Policy</option>
                        <option>Script</option>
                      </select>
                    </Field>

                    <Field label="Training Content">
                      <textarea className={cx(inputClass, "min-h-56")} value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} placeholder="Example: We service Fall River, New Bedford, Brockton, and nearby areas. Emergency calls are same day if available." />
                    </Field>

                    <PrimaryButton type="submit" disabled={busy === "knowledge"} className="w-full">
                      Add Training
                    </PrimaryButton>
                  </form>
                </Panel>

                <Panel title="Knowledge Base" subtitle="Saved training data for this workspace.">
                  <div className="space-y-4">
                    {knowledge.length === 0 ? (
                      <EmptyState title="No training yet" body="Add FAQs, prices, service areas, and call rules." />
                    ) : (
                      knowledge.map((item) => (
                        <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-black text-white">{item.title || "Untitled"}</p>
                              <p className="text-sm text-slate-500">{item.type || "Training"} · {formatDate(item.createdAt)}</p>
                            </div>
                            <Pill tone="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{item.type || "FAQ"}</Pill>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === "settings" && (
              <Panel title="Workspace Settings" subtitle="Client setup, Vapi number, business info, AI script, and plan controls.">
                <form onSubmit={saveWorkspace} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business Name">
                      <input className={inputClass} value={settingsForm.businessName || ""} onChange={(e) => setSettingsForm({ ...settingsForm, businessName: e.target.value })} />
                    </Field>
                    <Field label="Owner Name">
                      <input className={inputClass} value={settingsForm.ownerName || ""} onChange={(e) => setSettingsForm({ ...settingsForm, ownerName: e.target.value })} />
                    </Field>
                    <Field label="Business Type">
                      <input className={inputClass} value={settingsForm.businessType || ""} onChange={(e) => setSettingsForm({ ...settingsForm, businessType: e.target.value })} />
                    </Field>
                    <Field label="Phone">
                      <input className={inputClass} value={settingsForm.phone || ""} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })} />
                    </Field>
                    <Field label="Website">
                      <input className={inputClass} value={settingsForm.website || ""} onChange={(e) => setSettingsForm({ ...settingsForm, website: e.target.value })} />
                    </Field>
                    <Field label="Service Area">
                      <input className={inputClass} value={settingsForm.serviceArea || ""} onChange={(e) => setSettingsForm({ ...settingsForm, serviceArea: e.target.value })} />
                    </Field>
                    <Field label="Hours">
                      <input className={inputClass} value={settingsForm.hours || ""} onChange={(e) => setSettingsForm({ ...settingsForm, hours: e.target.value })} />
                    </Field>
                    <Field label="Booking Link">
                      <input className={inputClass} value={settingsForm.bookingLink || ""} onChange={(e) => setSettingsForm({ ...settingsForm, bookingLink: e.target.value })} />
                    </Field>
                    <Field label="Vapi Number">
                      <input className={inputClass} value={settingsForm.vapiNumber || ""} onChange={(e) => setSettingsForm({ ...settingsForm, vapiNumber: e.target.value })} placeholder="+1..." />
                    </Field>
                    <Field label="Vapi Assistant ID">
                      <input className={inputClass} value={settingsForm.vapiAssistantId || ""} onChange={(e) => setSettingsForm({ ...settingsForm, vapiAssistantId: e.target.value })} placeholder="assistant id" />
                    </Field>
                    <Field label="Plan">
                      <select className={inputClass} value={settingsForm.plan || "Starter"} onChange={(e) => setSettingsForm({ ...settingsForm, plan: e.target.value })}>
                        <option>Starter</option>
                        <option>Growth</option>
                        <option>Elite</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <select className={inputClass} value={settingsForm.status || "active"} onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}>
                        <option>active</option>
                        <option>trial</option>
                        <option>past_due</option>
                        <option>inactive</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Primary Goal">
                    <input className={inputClass} value={settingsForm.primaryGoal || ""} onChange={(e) => setSettingsForm({ ...settingsForm, primaryGoal: e.target.value })} />
                  </Field>

                  <Field label="AI Receptionist Script">
                    <textarea className={cx(inputClass, "min-h-64")} value={settingsForm.aiScript || ""} onChange={(e) => setSettingsForm({ ...settingsForm, aiScript: e.target.value })} />
                  </Field>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <PrimaryButton type="submit" disabled={busy === "settings"}>
                      Save Workspace
                    </PrimaryButton>
                    <GhostButton onClick={linkVapiNumber} disabled={busy === "vapi"}>
                      Link Vapi Number
                    </GhostButton>
                    <Link href="/pricing" className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-slate-200 hover:bg-white/[0.06]">
                      View Pricing
                    </Link>
                  </div>
                </form>
              </Panel>
            )}

            {activeTab === "dev_ops" && isAdmin && (
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Developer Operations" subtitle="Admin-only tools for client creation, account updates, demos, and support.">
                  <form onSubmit={devCreateAccount} className="space-y-4">
                    <Field label="Client Email">
                      <input className={inputClass} value={devForm.email} onChange={(e) => setDevForm({ ...devForm, email: e.target.value })} placeholder="client@email.com" />
                    </Field>

                    <Field label="Business Name">
                      <input className={inputClass} value={devForm.businessName} onChange={(e) => setDevForm({ ...devForm, businessName: e.target.value })} placeholder="Client Business LLC" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Phone">
                        <input className={inputClass} value={devForm.phone} onChange={(e) => setDevForm({ ...devForm, phone: e.target.value })} />
                      </Field>
                      <Field label="UID For Update">
                        <input className={inputClass} value={devForm.uid} onChange={(e) => setDevForm({ ...devForm, uid: e.target.value })} placeholder="Firebase uid" />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Plan">
                        <select className={inputClass} value={devForm.plan} onChange={(e) => setDevForm({ ...devForm, plan: e.target.value })}>
                          <option>Starter</option>
                          <option>Growth</option>
                          <option>Elite</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select className={inputClass} value={devForm.status} onChange={(e) => setDevForm({ ...devForm, status: e.target.value })}>
                          <option>active</option>
                          <option>trial</option>
                          <option>past_due</option>
                          <option>inactive</option>
                        </select>
                      </Field>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <PrimaryButton type="submit" disabled={busy === "devCreate"}>
                        Create Account
                      </PrimaryButton>
                      <GhostButton onClick={devUpdateAccount} disabled={busy === "devUpdate"}>
                        Update Account
                      </GhostButton>
                    </div>
                  </form>
                </Panel>

                <Panel title="Admin Snapshot" subtitle="Fast control center for founder testing.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard label="Workspace Leads" value={metrics.totalLeads} icon="leads" />
                    <StatCard label="Workspace Calls" value={metrics.totalCalls} icon="calls" />
                    <StatCard label="Training Items" value={metrics.knowledgeCount} icon="book" />
                    <StatCard label="Pipeline Value" value={money(metrics.pipelineValue)} icon="advisor" />
                  </div>

                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                    <p className="font-black text-white">Founder Checklist</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <ChecklistItem done={Boolean(workspace.vapiNumber)}>Vapi number linked</ChecklistItem>
                      <ChecklistItem done={metrics.knowledgeCount >= 3}>Trainer has at least 3 knowledge items</ChecklistItem>
                      <ChecklistItem done={metrics.totalLeads > 0}>CRM has saved leads</ChecklistItem>
                      <ChecklistItem done={metrics.bookedAppointments > 0}>Appointments are being tracked</ChecklistItem>
                      <ChecklistItem done={Boolean(workspace.aiScript)}>AI script saved</ChecklistItem>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
                    <p className="font-black text-emerald-100">Dev API Paths Expected</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                      This dashboard will reuse your existing Vercel backend if these routes exist:
                      <br />
                      <span className="font-mono">/api/dev/create-account</span>
                      <br />
                      <span className="font-mono">/api/dev/update-account</span>
                      <br />
                      <span className="font-mono">/api/advisor</span>
                      <br />
                      <span className="font-mono">/api/vapi/book-appointment</span>
                    </p>
                  </div>
                </Panel>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
      <p className="font-black text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  );
}

function ChecklistItem({ done, children }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cx(
          "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black",
          done
            ? "border-emerald-400 bg-emerald-400 text-slate-950"
            : "border-white/10 bg-white/[0.04] text-slate-500"
        )}
      >
        {done ? "✓" : "·"}
      </span>
      <span className={done ? "text-slate-200" : "text-slate-500"}>{children}</span>
    </div>
  );
}

function RecentCalls({ calls }) {
  return (
    <Panel title="Recent Calls" subtitle="Latest Vapi or manual call activity.">
      <div className="space-y-3">
        {calls.length === 0 ? (
          <EmptyState title="No recent calls" body="Call records will appear here." />
        ) : (
          calls.slice(0, 6).map((call) => (
            <div key={call.id} className="rounded-[1.3rem] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">{call.callerName || call.name || call.phone || "Unknown Caller"}</p>
                  <p className="text-sm text-slate-400">{call.phone || "No phone"} · {formatDateTime(call.createdAt || call.startedAt)}</p>
                </div>
                <Pill tone={statusClass(call.status || call.outcome)}>{call.status || call.outcome || "new"}</Pill>
              </div>
              {call.summary && <p className="mt-3 text-sm leading-6 text-slate-400">{call.summary}</p>}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function RecentAppointments({ appointments, large = false }) {
  return (
    <Panel title="Appointments" subtitle="Booked jobs, demos, and follow-ups.">
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <EmptyState title="No appointments yet" body="Booked appointments will appear here." />
        ) : (
          appointments.slice(0, large ? 20 : 6).map((appt) => (
            <div key={appt.id} className="rounded-[1.3rem] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">{appt.customerName || appt.name || "Appointment"}</p>
                  <p className="text-sm text-slate-400">
                    {appt.service || "No service"} · {formatDateTime(appt.startTime || appt.date || appt.createdAt)}
                  </p>
                  {appt.phone && <p className="mt-1 text-sm text-slate-500">{appt.phone}</p>}
                </div>
                <Pill tone={statusClass(appt.status)}>{appt.status || "scheduled"}</Pill>
              </div>
              {appt.notes && <p className="mt-3 text-sm leading-6 text-slate-400">{appt.notes}</p>}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}