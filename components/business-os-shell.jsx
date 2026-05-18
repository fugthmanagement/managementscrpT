"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, collection, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

function Icon({ name, className = "h-5 w-5" }) {
  if (name === "overview") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="4" rx="1" />
        <rect x="14" y="10" width="7" height="11" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === "calls") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M22 16.92V21a1 1 0 0 1-1.11 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2 3.11 1 1 0 0 1 3 2h4.09a1 1 0 0 1 1 .75c.12.86.37 1.7.72 2.5a1 1 0 0 1-.24 1L8.7 8.7a16 16 0 0 0 6 6l1.44-1.44a1 1 0 0 1 1-.24c.8.35 1.64.6 2.5.72a1 1 0 0 1 .75 1z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "leads") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zM4 20a8 8 0 0 1 16 0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 3v18h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 13v6M12 9v10M17 5v14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "book" || name === "knowledge") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V7z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 7v11" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M20 6L9 17l-5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "star") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 20.201 4.665 24 6 15.595 0 9.748l8.332-1.73z" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "dev") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#ef4444" opacity="0.18" />
        <circle cx="12" cy="12" r="4" fill="#ef4444" />
      </svg>
    );
  }
  if (name === "mic") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 1v11" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 11a7 7 0 01-14 0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 21v-2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="4" strokeWidth="1.2" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "moon") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 12.79A9 9 0 0111.21 3 7 7 0 0021 12.79z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 1-1 0 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 1 0-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.02a1.65 1.65 0 0 1 1 0h.02a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 22 6.17l-.06.06a1.65 1.65 0 0 0-.33 1.82v.02a1.65 1.65 0 0 1 0 1z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 6L6 18M6 6l12 12" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // default simple dot
  return <svg className={className} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>;
}

// Business types with "Other" option
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

const stripeLinks = {
  starter: "https://buy.stripe.com/dRmeVdaGld685fo4984ko00",
  growth: "https://buy.stripe.com/3cI14n5m1d68cHQ6hg4ko01",
  elite: "https://buy.stripe.com/5kQ7sL4hXaY037gbBA4ko02",
};

export function BusinessOSShell({ locked = false, authReady = false }) {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [darkMode, setDarkMode] = useState(true);
  const [workspace, setWorkspace] = useState({
    businessName: "",
    industry: "",
    customIndustry: "",
    services: "",
    serviceArea: "",
    averageJobValue: "200",
    tone: "Professional",
    aiCharacter: "",
    ragSections: [],
    tools: [],
    planTier: "starter",
    planStatus: "trial",
  });
  const [calls, setCalls] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initBusinessName, setInitBusinessName] = useState("");
  const [initIndustry, setInitIndustry] = useState("");
  const [initCustomIndustry, setInitCustomIndustry] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState([]);

  // Dev panel state (admin-only)
  const [devPhoneNumber, setDevPhoneNumber] = useState("");
  const [devBusinessName, setDevBusinessName] = useState("");
  const [devIndustry, setDevIndustry] = useState("");
  const [devCustomIndustry, setDevCustomIndustry] = useState("");
  const [devServices, setDevServices] = useState("");
  const [devAssistantName, setDevAssistantName] = useState("Receptionist");
  const [devVoiceId, setDevVoiceId] = useState("sara");
  const [devCustomPrompt, setDevCustomPrompt] = useState("You are a professional AI receptionist. Greet the caller, capture name, address, service required, and ask to book an estimate.");
  const [devDialing, setDevDialing] = useState(false);
  const [devStatusLog, setDevStatusLog] = useState("");
  const [apptName, setApptName] = useState("");
  const [apptPhone, setApptPhone] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");

  // Dev account management
  const [devNewEmail, setDevNewEmail] = useState("");
  const [devNewPassword, setDevNewPassword] = useState("");
  const [devNewPlan, setDevNewPlan] = useState("starter");
  const [devNewFugthNumber, setDevNewFugthNumber] = useState("");
  const [devAccounts, setDevAccounts] = useState([]);
  const [devCreatingAccount, setDevCreatingAccount] = useState(false);
  const [devAccountsLoading, setDevAccountsLoading] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  // Vapi linking UI state
  const [showLinkVapiModal, setShowLinkVapiModal] = useState(false);
  const [vapiInput, setVapiInput] = useState("");
  const [isLinkingVapi, setIsLinkingVapi] = useState(false);
  const [editingVapi, setEditingVapi] = useState(false);
  
  // Advisor chat state
  const [advisorMessages, setAdvisorMessages] = useState([]);
  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Helper to sanitize objects before writing to Firestore (remove undefined values)
  const sanitizeForFirestore = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map((v) => sanitizeForFirestore(v));
    if (obj instanceof Date) return obj;
    if (typeof obj === "object") {
      const out = {};
      Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined) return; // skip undefined
        // preserve Firestore serverTimestamp sentinel and other special objects
        if (v && typeof v === 'object' && ('_delegate' in v || 'seconds' in v || 'nanoseconds' in v)) {
          out[k] = v;
          return;
        }
        out[k] = sanitizeForFirestore(v);
      });
      return out;
    }
    return obj;
  };

  // Admin detection
  const isAdmin = user && (
    user.email?.toLowerCase() === "fugthmanagement@gmail.com" ||
    user.email?.toLowerCase() === "mepenginestudio@gmail.com"
  );

  // Mobile navigation items (include Dev Ops for admin users)
  const mobileNavItems = isAdmin
    ? [{ id: 'overview', icon: 'overview' }, { id: 'calls', icon: 'calls' }, { id: 'leads', icon: 'leads' }, { id: 'dev_ops', icon: 'dev' }, { id: 'advisor', icon: 'chart' }, { id: 'settings', icon: 'settings' }]
    : [{ id: 'overview', icon: 'overview' }, { id: 'calls', icon: 'calls' }, { id: 'leads', icon: 'leads' }, { id: 'advisor', icon: 'chart' }, { id: 'settings', icon: 'settings' }];

  // Auth listener
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load workspace
  useEffect(() => {
    if (!user || !db) return;

    const workspaceRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(workspaceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWorkspace(data);
        if (data.businessName && data.industry) {
          setShowOnboarding(false);
        }
      } else {
        setShowOnboarding(true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Load leads
  useEffect(() => {
    if (!user || !db) return;

    const leadsRef = collection(db, "users", user.uid, "leads");
    const q = query(leadsRef, orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLeads(list);
    });

    return () => unsubscribe();
  }, [user]);

  // Load calls
  useEffect(() => {
    if (!user || !db) return;

    const callsRef = collection(db, "users", user.uid, "calls");
    const q = query(callsRef, orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const callsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCalls(callsList);
    });
    return () => unsubscribe();
  }, [user]);

  // Load appointments
  useEffect(() => {
    if (!user || !db) return;

    const appointmentsRef = collection(db, "users", user.uid, "appointments");
    const q = query(appointmentsRef, orderBy("scheduledTime", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppointments(appointmentsList);
    });
    return () => unsubscribe();
  }, [user]);

  // Load dev-created accounts for admin view
  useEffect(() => {
    if (!user || !db || !isAdmin) return;
    setDevAccountsLoading(true);
    const ref = collection(db, "devAccounts");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDevAccounts(list);
      setDevAccountsLoading(false);
    }, (err) => {
      console.error('Dev accounts snapshot error', err);
      setDevAccountsLoading(false);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleInitialSetup = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsInitializing(true);
    try {
      const payload = sanitizeForFirestore({
        businessName: initBusinessName,
        industry: initIndustry === "Other" ? "Other" : initIndustry,
        customIndustry: initIndustry === "Other" ? initCustomIndustry : "",
        createdAt: new Date().toISOString(),
        planTier: "starter",
        planStatus: "trial",
      });
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });

      setShowOnboarding(false);
    } catch (err) {
      console.error("Setup failed:", err);
      alert("Could not complete setup: " + err.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveWorkspace = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const payload = sanitizeForFirestore(workspace);
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
      alert("Workspace saved successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Could not save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Dev: Trigger outbound call via server route and save call metadata to Firestore
  const handleDevOutboundCall = async (e) => {
    e.preventDefault();
    if (!devPhoneNumber || !user) {
      setDevStatusLog("Please enter target number and ensure you're logged in.");
      return;
    }

    setDevDialing(true);
    setDevStatusLog("Dispatching outbound call...");

    try {
      const payload = {
        phoneNumber: devPhoneNumber,
        customPrompt: devCustomPrompt,
        businessName: devBusinessName || workspace.businessName || "",
        voiceId: devVoiceId,
        assistantName: devAssistantName,
      };

      const res = await fetch("/api/dev/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Outbound API error");
      }

      // Save call metadata so recordings and logs appear in UI
      try {
        await addDoc(collection(db, "users", user.uid, "calls"), {
          caller: devAssistantName || "DevAgent",
          phone: devPhoneNumber,
          voiceId: devVoiceId,
          businessInfo: {
            businessName: devBusinessName || workspace.businessName,
            industry: devIndustry || workspace.industry,
            customIndustry: devCustomIndustry || workspace.customIndustry,
            services: devServices || workspace.services,
          },
          status: result.status || "initiated",
          callId: result.callId || result.id || null,
          recordingUrl: result.recordingUrl || result.audioUrl || null,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to save call metadata:", err);
      }

      setDevStatusLog(`Call launched — ID: ${result.callId || result.id || "n/a"}`);
    } catch (err) {
      console.error("Dev call error:", err);
      setDevStatusLog(`Call failed: ${err.message}`);
    } finally {
      setDevDialing(false);
    }
  };

  // Create a new account via server-side admin API
  const createDevAccount = async () => {
    if (!user) return setDevStatusLog('Must be logged in as admin.');
    setDevCreatingAccount(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch('/api/dev/create-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: devNewEmail, password: devNewPassword, displayName: devBusinessName || '', planTier: devNewPlan, planStatus: 'active', fugthNumber: devNewFugthNumber })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Create failed');
      setDevStatusLog(`Created account ${data.email}`);
      setDevNewEmail(''); setDevNewPassword(''); setDevNewFugthNumber('');
    } catch (err) {
      console.error('Create account failed', err);
      setDevStatusLog('Create failed: ' + (err.message || err));
    } finally {
      setDevCreatingAccount(false);
    }
  };

  const updateDevAccount = async ({ uid, planTier, planStatus, fugthNumber, email, password }) => {
    if (!user) return setDevStatusLog('Must be logged in as admin.');
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch('/api/dev/update-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid, planTier, planStatus, fugthNumber, stripeCustomerId: null, email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Update failed');
      setDevStatusLog('Account updated');
      return true;
    } catch (err) {
      console.error('Update account failed', err);
      setDevStatusLog('Update failed: ' + (err.message || err));
      return false;
    }
  };

  // Dev: create quick appointment under appointments collection
  const createDevAppointment = async ({ name, phone, scheduledTime, notes }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "appointments"), {
        name,
        phone,
        notes: notes || "",
        scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        createdAt: serverTimestamp(),
        source: "dev_ops",
      });
      setDevStatusLog("Appointment created");
    } catch (err) {
      console.error("Create appointment failed:", err);
      setDevStatusLog("Appointment create failed: " + err.message);
    }
  };

  // Link or change Vapi number for the workspace
  const handleLinkVapiNumber = async (number) => {
    if (!user) return;
    setIsLinkingVapi(true);
    try {
      const payload = sanitizeForFirestore({
        vapiNumber: number || vapiInput,
        vapiLinked: true,
        vapiLinkedAt: serverTimestamp(),
        needsVapiLink: false,
      });
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
      setVapiInput("");
      setShowLinkVapiModal(false);
      setEditingVapi(false);
    } catch (err) {
      console.error("Fugth link failed:", err);
      alert("Failed to link number: " + (err.message || err));
    } finally {
      setIsLinkingVapi(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Build a context-rich prompt for the advisor using workspace and recent activity
  const buildAdvisorPrompt = (question) => {
    let ctx = "";
    if (workspace.businessName) ctx += `Business: ${workspace.businessName}. `;
    if (workspace.industry) ctx += `Industry: ${workspace.industry}. `;
    if (workspace.services) ctx += `Services: ${workspace.services}. `;
    if (workspace.aiCharacter) ctx += `Persona: ${workspace.aiCharacter}. `;
    if (workspace.ragSections && workspace.ragSections.length) ctx += `Knowledge: ${workspace.ragSections.map(s => s.title).join(', ')}. `;
    if (calls && calls.length) ctx += `Recent calls: ${calls.slice(0,3).map(c => c.summary || c.outcome || c.caller).join('; ')}. `;
    return `${ctx}\nUser question: ${question}`;
  };

  const sendAdvisorMessage = async () => {
    if (!advisorInput || !advisorInput.trim()) return;
    const text = advisorInput.trim();
    setAdvisorMessages((p) => [...p, { role: 'user', text }]);
    setAdvisorInput("");
    setAdvisorLoading(true);
    try {
      const prompt = buildAdvisorPrompt(text);
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const reply = data?.reply || 'I could not generate a response.';
      setAdvisorMessages((p) => [...p, { role: 'assistant', text: reply }]);
    } catch (err) {
      console.error('Advisor error:', err);
      setAdvisorMessages((p) => [...p, { role: 'assistant', text: 'Error: ' + (err.message || err) }]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Helpers for safe timestamps and simple sparkline
  const safeCallDate = (call) => {
    const ts = call?.timestamp;
    if (!ts) return null;
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === 'string') {
      const d = new Date(ts);
      return isNaN(d) ? null : d;
    }
    if (typeof ts.toDate === 'function') return ts.toDate();
    return null;
  };

  const countCallsToday = (callsList) => {
    const today = new Date().toDateString();
    return (callsList || []).reduce((acc, c) => {
      const d = safeCallDate(c);
      if (!d) return acc;
      return acc + (d.toDateString() === today ? 1 : 0);
    }, 0);
  };

  const weeklyCounts = (callsList, days = 7) => {
    const counts = Array(days).fill(0);
    const now = new Date();
    for (const c of callsList || []) {
      const d = safeCallDate(c);
      if (!d) continue;
      const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / (1000*60*60*24));
      if (diffDays >= 0 && diffDays < days) {
        counts[days - 1 - diffDays]++;
      }
    }
    return counts;
  };

  function Sparkline({ counts = [] }) {
    const w = 120; const h = 28; const pad = 2;
    if (!counts || counts.length === 0) return <svg width={w} height={h} />;
    const max = Math.max(...counts, 1);
    const step = (w - pad*2) / (counts.length - 1 || 1);
    const points = counts.map((v, i) => `${pad + i*step},${h - pad - (v / max) * (h - pad*2)}`).join(' ');
    return (
      <svg width={w} height={h} className="inline-block">
        <polyline fill="none" stroke="#10B981" strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </svg>
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-zinc-400 text-lg">Initializing Fugth OS...</p>
        </div>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 rounded-2xl p-8 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-4xl font-black tracking-tight mb-2">Setup Your OS</h1>
              <p className="text-zinc-400 text-sm">Configure your business AI infrastructure</p>
            </div>

            <form onSubmit={handleInitialSetup} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Business Name</label>
                <input
                  type="text"
                  value={initBusinessName}
                  onChange={(e) => setInitBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:border-white focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Industry</label>
                <select
                  value={initIndustry}
                  onChange={(e) => setInitIndustry(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-white focus:outline-none transition"
                  required
                >
                  <option value="">Select your industry...</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {initIndustry === "Other" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Business Type</label>
                  <input
                    type="text"
                    value={initCustomIndustry}
                    onChange={(e) => setInitCustomIndustry(e.target.value)}
                    placeholder="e.g., Software Development"
                    className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:border-white focus:outline-none transition"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isInitializing || !initBusinessName || !initIndustry || (initIndustry === "Other" && !initCustomIndustry)}
                className="w-full bg-gradient-to-r from-white to-zinc-200 text-black font-bold py-3 rounded-lg hover:from-zinc-100 hover:to-white disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {isInitializing ? "Setting up..." : "Continue to Dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Please log in to access your dashboard.</p>
          <Link href="/login" className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-zinc-200">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Pricing Modal
  if (showPricingModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 max-w-3xl w-full max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Choose Your Plan</h2>
            <button
              onClick={() => setShowPricingModal(false)}
              className="text-zinc-400 hover:text-white text-2xl"
              aria-label="Close pricing modal"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Starter", price: "$49", features: ["1 Fugth number included", "Basic AI", "Email support", "Lead capture: Standard", "Credits per number: 100/mo"], link: stripeLinks.starter },
              { name: "Growth", price: "$149", features: ["3 Fugth numbers included", "Advanced AI", "Priority support", "Enhanced lead capture", "Credits per number: 500/mo"], link: stripeLinks.growth, popular: true },
              { name: "Elite", price: "$499", features: ["Unlimited Fugth numbers", "Custom AI", "Dedicated support", "Priority lead capture", "Credits per number: 5,000/mo"], link: stripeLinks.elite }
            ].map((plan) => (
              <div key={plan.name} className={`border rounded-xl p-6 transition ${plan.popular ? "bg-white/10 border-white/30 scale-105" : "bg-white/5 border-zinc-700"}`}>
                {plan.popular && <div className="text-xs font-bold text-emerald-400 mb-2">MOST POPULAR</div>}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-black mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-zinc-300"><span className="inline-block mr-2"><Icon name="check" className="h-4 w-4" /></span>{f}</li>
                  ))}
                </ul>
                <a href={plan.link} target="_blank" rel="noopener noreferrer" className="w-full block text-center bg-white text-black font-bold py-2 rounded-lg hover:bg-zinc-200">
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-gradient-to-br from-black via-zinc-950 to-black text-white" : "bg-gradient-to-br from-white via-zinc-50 to-white text-black"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${darkMode ? "bg-black/40 border-zinc-900 backdrop-blur-xl" : "bg-white/40 border-zinc-200 backdrop-blur-xl"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-white to-zinc-400 rounded-full animate-pulse"></div>
                <h1 className="text-2xl font-black tracking-tighter">FUGTH</h1>
              </div>
              <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-zinc-600"}`}>Business OS</p>
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-xs items-center gap-2">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search calls, leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent text-sm outline-none placeholder:${darkMode ? "text-zinc-600" : "text-zinc-400"}`}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition ${darkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
                aria-label="Toggle theme"
              >
                <Icon name={darkMode ? "sun" : "moon"} className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowPricingModal(true)}
                className="hidden md:block px-4 py-2 text-sm font-bold bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                Upgrade
              </button>
              <div className={`flex items-center gap-3 pl-3 border-l ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-xs font-bold`}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className={`text-xs font-semibold ${darkMode ? "hover:text-zinc-300" : "hover:text-zinc-700"}`}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

          {/* Mobile bottom nav (small screens) */}
          <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${darkMode ? "bg-black/70 border border-zinc-800" : "bg-white/80 border border-zinc-200"}`}>
              {mobileNavItems.map((it) => (
                <button key={it.id} onClick={() => setActiveTab(it.id)} className={`p-2 rounded-full ${activeTab === it.id ? (darkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black') : 'text-zinc-400 hover:text-white'}`} aria-label={it.id}>
                  <Icon name={it.icon} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-64 border-r ${darkMode ? "bg-black/50 border-zinc-900" : "bg-white/50 border-zinc-200"} p-6 space-y-8 hidden lg:flex flex-col`}>
          {/* Navigation */}
          <nav className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Navigation</p>
            {[
              { id: "overview", label: "Overview" },
              { id: "calls", label: "Call Intelligence" },
              { id: "leads", label: "Leads Manager" },
              { id: "operations", label: "Operations" },
              { id: "advisor", label: "AI Advisor" },
              { id: "knowledge", label: "Knowledge Base" },
              { id: "settings", label: "Settings" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === item.id
                    ? darkMode
                      ? "bg-white/10 text-white"
                      : "bg-black/10 text-black"
                    : darkMode
                    ? "text-zinc-400 hover:text-white hover:bg-white/5"
                    : "text-zinc-600 hover:text-black hover:bg-black/5"
                }`}
              >
                <span className="mr-3"><Icon name={item.id} className="h-5 w-5" /></span> {item.label}
              </button>
            ))}
          </nav>

          {isAdmin && (
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Admin</p>
              <button
                onClick={() => setActiveTab("dev_ops")}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all text-sm border-2 ${
                  activeTab === "dev_ops"
                    ? "bg-red-500/10 border-red-500/50 text-red-400"
                    : "border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
                }`}
              >
                <span className="mr-2"><Icon name="dev" className="h-4 w-4" /></span> Dev Ops
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
            {/* Fugth number status and quick link action */}
            <div className={`rounded-lg p-3 border ${darkMode ? "border-zinc-800 bg-black/30" : "border-zinc-200 bg-white/5"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${workspace.vapiLinked ? "bg-emerald-400" : "bg-red-500"}`} />
                  <div>
                    <div className="text-sm font-semibold">{workspace.vapiNumber || "No Fugth number assigned"}</div>
                    <div className="text-xs text-zinc-400">{workspace.vapiLinked ? "Fugth number linked" : (workspace.needsVapiLink ? "Please link your Fugth number to finish setup" : "Not linked")}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {workspace.vapiLinked ? (
                    <button onClick={() => { setEditingVapi(true); setVapiInput(workspace.vapiNumber || ""); setShowLinkVapiModal(true); }} className="px-3 py-1 rounded bg-white/5">Change Fugth Number</button>
                  ) : (
                    <button onClick={() => setShowLinkVapiModal(true)} className="px-3 py-1 rounded bg-emerald-600 text-white">Link Fugth Number</button>
                  )}
                </div>
              </div>
            </div>

            {showLinkVapiModal && (
              <div className={`rounded-lg p-4 border mt-3 ${darkMode ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-white/5"}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold block mb-1">Enter Fugth number</label>
                      <input value={vapiInput} onChange={(e) => setVapiInput(e.target.value)} placeholder="+15551234567" className="w-full p-3 rounded-lg border bg-transparent" />
                      <p className="text-xs text-zinc-400 mt-2">Paste your Fugth number. Example: +15551234567</p>
                    </div>
                    <div className="flex gap-2 md:flex-col">
                      <button onClick={() => handleLinkVapiNumber(vapiInput)} disabled={isLinkingVapi} className={`py-3 px-4 rounded-lg ${isLinkingVapi ? "bg-zinc-700 text-zinc-400" : "bg-emerald-600 text-white"}`}>
                        {isLinkingVapi ? "Linking..." : "Link Fugth Number"}
                      </button>
                      <button onClick={() => { setShowLinkVapiModal(false); setEditingVapi(false); setVapiInput(""); }} className="py-3 px-4 rounded-lg bg-white/5">Cancel</button>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 mt-3">Quick guide: After purchase, paste your Fugth number into the field and click Link Fugth Number. This will associate the number with your account so calls, recordings and bookings appear in the dashboard.</div>
              </div>
            )}
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl font-black mb-2">Good morning, {workspace.businessName || "there"}</h1>
                  <p className={`text-sm ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const callsToday = countCallsToday(calls);
                    const weekly = weeklyCounts(calls, 7);
                    const bookedCount = (calls || []).filter(c => c.outcome === 'Booked').length;
                    const metrics = [
                      { label: 'Calls Today', value: callsToday, icon: 'calls', color: 'from-blue-500', usesCalls: true },
                      { label: 'This Week', value: weekly.reduce((a,b)=>a+b,0), icon: 'chart', color: 'from-emerald-500', usesCalls: true, sparkline: weekly },
                      { label: 'Booked', value: bookedCount, icon: 'check', color: 'from-emerald-400', usesCalls: true },
                      { label: 'Current Plan', value: workspace.planTier || 'Starter', icon: 'star', color: 'from-yellow-500' },
                    ];

                    return metrics.map((metric, idx) => (
                      <div key={idx} className={`bg-gradient-to-br ${metric.color} to-transparent opacity-10 rounded-xl p-6 border ${darkMode ? 'border-zinc-800' : 'border-zinc-300'} group hover:opacity-20 transition`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{metric.label}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-3xl font-black">{metric.usesCalls && !workspace.vapiLinked ? '—' : metric.value}</p>
                              {metric.sparkline && workspace.vapiLinked && <Sparkline counts={metric.sparkline} />}
                            </div>
                          </div>
                          <span className="text-4xl opacity-30 group-hover:opacity-50 transition"><Icon name={metric.icon} className="h-9 w-9" /></span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Recent Activity */}
                <div className={`border ${darkMode ? "bg-black/30 border-zinc-800" : "bg-white/30 border-zinc-300"} rounded-xl p-6`}>
                  <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                  {calls.slice(0, 5).length > 0 ? (
                    <div className="space-y-3">
                      {calls.slice(0, 5).map((call) => (
                        <div key={call.id} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? "bg-white/5" : "bg-black/5"}`}>
                          <div>
                            <p className="font-semibold text-sm">{call.caller || "Unknown"}</p>
                            <p className={`text-xs ${darkMode ? "text-zinc-500" : "text-zinc-600"}`}>
                              {safeCallDate(call)?.toLocaleTimeString() || ''}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${call.outcome === "Booked" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {call.outcome || "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${darkMode ? "text-zinc-500" : "text-zinc-600"}`}>No recent activity</p>
                  )}
                </div>
              </div>
            )}

            {/* Calls Tab */}
            {activeTab === "calls" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black">Call Intelligence</h2>
                  <div className={`px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
                    {calls.length} Calls
                  </div>
                </div>
                {!workspace.vapiLinked && (
                  <div className={`border-2 border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-300"} rounded-xl p-12 text-center`}>
                    <div className="mb-3">
                      <Icon name="calls" className="h-12 w-12 mx-auto text-zinc-400" />
                    </div>
                    <p className={darkMode ? "text-zinc-400" : "text-zinc-600"}>No Fugth number linked. Link your Fugth number to receive calls and view recordings here.</p>
                    <div className="mt-4"><button onClick={() => setShowLinkVapiModal(true)} className="px-4 py-2 rounded bg-emerald-600 text-white">Link Fugth Number</button></div>
                  </div>
                )}

                {workspace.vapiLinked && calls.length > 0 && (
                  <div className="grid grid-cols-1 gap-4">
                    {calls.map((call) => (
                      <div key={call.id} className={`border ${darkMode ? "bg-black/30 border-zinc-800 hover:border-zinc-700" : "bg-white/30 border-zinc-300 hover:border-zinc-400"} rounded-xl p-6 transition`}>
                        <div className="flex gap-4">
                          <div className="w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-sm font-bold">
                                  {call.caller ? String(call.caller).charAt(0).toUpperCase() : "?"}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold">{call.caller || "Unknown Caller"}</h3>
                                  <p className={`text-sm ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>{safeCallDate(call)?.toLocaleString() || ''}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                call.outcome === "Booked" ? "bg-green-500/20 text-green-400" : 
                                call.outcome === "Interested" ? "bg-blue-500/20 text-blue-400" :
                                "bg-gray-500/20 text-gray-400"
                              }`}>{call.outcome || "Pending"}</span>
                            </div>

                            {call.summary && (<p className={`text-sm mb-4 leading-relaxed ${darkMode ? "text-zinc-300" : "text-zinc-700"}`}>{call.summary}</p>)}

                            <div className="flex items-center gap-4">
                              {call.recordingUrl && (
                                <div className={`p-3 rounded-lg ${darkMode ? "bg-white/5" : "bg-black/5"} flex items-center gap-3 w-full`}>
                                  <audio controls className="w-full h-8 rounded">
                                    <source src={call.recordingUrl} type="audio/mpeg" />
                                  </audio>
                                  <div className="text-xs text-zinc-400">⏱️ {call.duration || "N/A"}</div>
                                </div>
                              )}
                              <div className="text-xs text-zinc-500"><Icon name="mic" className="inline-block h-4 w-4 mr-1" /> Voice: {call.voiceId || "Default"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {workspace.vapiLinked && calls.length === 0 && (
                  <div className={`border-2 border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-300"} rounded-xl p-12 text-center`}>
                    <div className="mb-3">
                      <Icon name="calls" className="h-12 w-12 mx-auto text-zinc-400" />
                    </div>
                    <p className={darkMode ? "text-zinc-400" : "text-zinc-600"}>No calls yet. Your AI is ready to take incoming calls.</p>
                  </div>
                )}
              </div>
            )}

            {/* Leads Tab */}
            {activeTab === "leads" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black">Leads Manager</h2>
                <div className={`border-2 border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-300"} rounded-xl p-12 text-center`}>
                  <div className="mb-3">
                    <Icon name="leads" className="h-12 w-12 mx-auto text-zinc-400" />
                  </div>
                  <p className={darkMode ? "text-zinc-400" : "text-zinc-600"}>Leads captured from calls will appear here</p>
                  <p className={`text-sm mt-2 ${darkMode ? "text-zinc-500" : "text-zinc-600"}`}>Enable AI lead capture in settings</p>
                </div>
              </div>
            )}

            {/* Operations Tab */}
            {activeTab === "operations" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black">Operations Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const stats = [
                      { label: 'Total Calls', value: workspace.vapiLinked ? calls.length : '—', change: '+12%' },
                      { label: 'Booked Appointments', value: workspace.vapiLinked ? (calls || []).filter(c => c.outcome === 'Booked').length : '—', change: '+8%' },
                      { label: 'Response Rate', value: workspace.vapiLinked ? '94%' : '—', change: '+3%' },
                      { label: 'Avg Duration', value: workspace.vapiLinked ? '2m 34s' : '—', change: '-5%' },
                    ];
                    return stats.map((stat, idx) => (
                      <div key={idx} className={`border ${darkMode ? 'bg-black/30 border-zinc-800' : 'bg-white/30 border-zinc-300'} rounded-xl p-6`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{stat.label}</p>
                        <div className="flex items-baseline gap-2 mt-3">
                          <p className="text-3xl font-black">{stat.value}</p>
                          <p className="text-xs text-emerald-400">{stat.change}</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* AI Advisor Tab */}
            {activeTab === "advisor" && (
              <div className="space-y-6 max-w-3xl">
                <h2 className="text-3xl font-black">AI Advisor</h2>
                <div className={`border ${darkMode ? "bg-black/30 border-zinc-800" : "bg-white/30 border-zinc-300"} rounded-xl p-6`}>
                  <div className={`mb-6 p-4 rounded-lg ${darkMode ? "bg-white/5" : "bg-black/5"}`}>
                    <p className={`text-sm leading-relaxed ${darkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                      Hello! I'm your AI Advisor. I can analyze recent calls, summarize trends, and suggest improvements. Ask about calls, leads, bookings, or strategy.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className={`max-h-64 overflow-y-auto p-3 rounded ${darkMode ? 'bg-black/50' : 'bg-white/50'}`}>
                      {advisorMessages.length === 0 && (
                        <div className={`text-sm text-zinc-400`}>No messages yet — ask a question to get started.</div>
                      )}
                      {advisorMessages.map((m, i) => (
                        <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : ''}`}>
                          <div className={`inline-block max-w-full break-words px-3 py-2 rounded-lg ${m.role === 'user' ? (darkMode ? 'bg-white/10' : 'bg-black/10') : (darkMode ? 'bg-white/5' : 'bg-black/5')}`}>{m.text}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={advisorInput}
                        onChange={(e) => setAdvisorInput(e.target.value)}
                        onKeyDown={async (e) => { if (e.key === 'Enter') { e.preventDefault(); await sendAdvisorMessage(); } }}
                        placeholder="Ask me anything about your business..."
                        className={`flex-1 p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                      />
                      <button onClick={sendAdvisorMessage} disabled={advisorLoading} className="px-4 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200">
                        {advisorLoading ? 'Thinking...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Tab */}
            {activeTab === "knowledge" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black">Knowledge Base</h2>
                <div className={`border-2 border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-300"} rounded-xl p-12 text-center cursor-pointer hover:opacity-80 transition`}>
                  <div className="mb-3">
                    <Icon name="book" className="h-12 w-12 mx-auto text-zinc-400" />
                  </div>
                  <p className={`font-semibold ${darkMode ? "text-zinc-300" : "text-zinc-700"}`}>Upload Documents</p>
                  <p className={`text-sm mt-2 ${darkMode ? "text-zinc-500" : "text-zinc-600"}`}>Drag and drop your files to train your AI assistant</p>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-8 max-w-2xl">
                <div>
                  <h2 className="text-3xl font-black mb-2">Settings & Profile</h2>
                  <p className={`text-sm ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>Manage your business configuration and preferences</p>
                </div>

                <div className={`border ${darkMode ? "bg-black/30 border-zinc-800" : "bg-white/30 border-zinc-300"} rounded-xl p-6 space-y-6`}>
                  <div>
                    <label className="block text-sm font-bold mb-2">Business Name</label>
                    <input
                      type="text"
                      value={workspace.businessName || ""}
                      onChange={(e) => setWorkspace({ ...workspace, businessName: e.target.value })}
                      className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Industry</label>
                    <select
                      value={workspace.industry || ""}
                      onChange={(e) => setWorkspace({ ...workspace, industry: e.target.value })}
                      className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                    >
                      <option value="">Select industry...</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {workspace.industry === "Other" && (
                    <div>
                      <label className="block text-sm font-bold mb-2">Custom Business Type</label>
                      <input
                        type="text"
                        value={workspace.customIndustry || ""}
                        onChange={(e) => setWorkspace({ ...workspace, customIndustry: e.target.value })}
                        className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold mb-2">Services</label>
                    <textarea
                      value={workspace.services || ""}
                      onChange={(e) => setWorkspace({ ...workspace, services: e.target.value })}
                      className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Average Job Value</label>
                      <input
                        type="text"
                        value={workspace.averageJobValue || ""}
                        onChange={(e) => setWorkspace({ ...workspace, averageJobValue: e.target.value })}
                        className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">AI Tone</label>
                      <select
                        value={workspace.tone || "Professional"}
                        onChange={(e) => setWorkspace({ ...workspace, tone: e.target.value })}
                        className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                      >
                        <option>Professional</option>
                        <option>Friendly</option>
                        <option>Aggressive Sales</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Brain / RAG Sections */}
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-bold mb-2">AI Brain — RAG Sections & Toolbox</h4>
                    <div className="mb-3">
                      <label className="block text-sm font-semibold">AI Character / Persona</label>
                      <input value={workspace.aiCharacter || ""} onChange={(e) => setWorkspace({ ...workspace, aiCharacter: e.target.value })} className="w-full p-3 rounded-lg border bg-transparent" placeholder="e.g., Energetic receptionist" />
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-semibold mb-2">Feature Toolbox</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'leadCapture', label: 'Lead Capture' },
                          { key: 'booking', label: 'Booking' },
                          { key: 'payments', label: 'Payments' },
                          { key: 'sms', label: 'SMS Follow-up' },
                          { key: 'recordSummaries', label: 'Call Summaries' },
                        ].map((tool) => {
                          const enabled = (workspace.tools || []).includes(tool.key);
                          return (
                            <label key={tool.key} className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border bg-transparent">
                              <input type="checkbox" checked={enabled} onChange={(e) => {
                                const tools = new Set(workspace.tools || []);
                                if (e.target.checked) tools.add(tool.key); else tools.delete(tool.key);
                                setWorkspace({ ...workspace, tools: Array.from(tools) });
                              }} />
                              <span className="text-sm">{tool.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">RAG Sections</label>
                      {(workspace.ragSections || []).map((section, idx) => (
                        <div key={idx} className="mb-3 p-3 rounded-lg border bg-transparent">
                          <input value={section.title || ''} onChange={(e) => {
                            const arr = workspace.ragSections ? [...workspace.ragSections] : [];
                            arr[idx] = { ...arr[idx], title: e.target.value };
                            setWorkspace({ ...workspace, ragSections: arr });
                          }} placeholder="Section title (e.g., Services)" className="w-full p-2 mb-2 rounded border" />
                          <textarea value={section.content || ''} onChange={(e) => {
                            const arr = workspace.ragSections ? [...workspace.ragSections] : [];
                            arr[idx] = { ...arr[idx], content: e.target.value };
                            setWorkspace({ ...workspace, ragSections: arr });
                          }} rows={4} className="w-full p-2 rounded border" placeholder="Paste documents or short guidance for this section" />
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-zinc-400">Select tools for this section</div>
                            <div className="flex gap-2">
                              <button onClick={() => {
                                const arr = workspace.ragSections ? [...workspace.ragSections] : [];
                                arr.splice(idx, 1);
                                setWorkspace({ ...workspace, ragSections: arr });
                              }} className="px-2 py-1 rounded bg-white/5 text-sm">Remove</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div>
                        <button onClick={() => {
                          const arr = workspace.ragSections ? [...workspace.ragSections] : [];
                          arr.push({ title: 'New Section', content: '', tools: [] });
                          setWorkspace({ ...workspace, ragSections: arr });
                        }} className="px-3 py-2 rounded bg-white/5">Add Section</button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveWorkspace}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-white to-zinc-200 text-black font-bold py-3 rounded-lg hover:from-zinc-100 hover:to-white disabled:opacity-50 transition"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Dev Ops Tab */}
            {activeTab === "dev_ops" && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-black rounded-full border border-red-500/30">ADMIN</span>
                  <h2 className="text-3xl font-black">Developer Operations</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Business Info & Assistant Tuning */}
                  <div className="lg:col-span-2 rounded-2xl border border-white/6 p-6 bg-zinc-900/30">
                    <h3 className="text-lg font-bold mb-4">1. Business Info & Assistant</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Business Name</label>
                        <input value={devBusinessName} onChange={(e) => setDevBusinessName(e.target.value)} className="w-full p-3 rounded-lg border bg-black/40" placeholder="Company name (leave blank to use workspace)" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Industry</label>
                        <select value={devIndustry} onChange={(e) => setDevIndustry(e.target.value)} className="w-full p-3 rounded-lg border bg-black/40">
                          <option value="">Select industry (or leave blank)</option>
                          {BUSINESS_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </div>
                    </div>

                    {devIndustry === "Other" && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold mb-2">Custom Industry</label>
                        <input value={devCustomIndustry} onChange={(e) => setDevCustomIndustry(e.target.value)} className="w-full p-3 rounded-lg border bg-black/40" placeholder="e.g., Influencer, SaaS" />
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-2">Services / About</label>
                      <textarea value={devServices} onChange={(e) => setDevServices(e.target.value)} rows={4} className="w-full p-3 rounded-lg border bg-black/40" placeholder="Short blurb about the business for RAG prompts" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Assistant Persona</label>
                        <select value={devAssistantName} onChange={(e) => setDevAssistantName(e.target.value)} className="w-full p-3 rounded-lg border bg-black/40">
                          <option>Receptionist</option>
                          <option>Concierge</option>
                          <option>Sales Closer</option>
                          <option>Scripted Closer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Voice Profile</label>
                        <select value={devVoiceId} onChange={(e) => setDevVoiceId(e.target.value)} className="w-full p-3 rounded-lg border bg-black/40">
                          <option value="sara">Sara</option>
                          <option value="rachel">Rachel</option>
                          <option value="jack">Jack</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-2">Custom System Prompt</label>
                      <textarea value={devCustomPrompt} onChange={(e) => setDevCustomPrompt(e.target.value)} rows={5} className="w-full p-3 rounded-lg border bg-black/40 font-mono" />
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button type="button" onClick={() => {
                        setDevBusinessName(workspace.businessName || "");
                        setDevIndustry(workspace.industry || "");
                        setDevCustomIndustry(workspace.customIndustry || "");
                        setDevServices(workspace.services || "");
                        setDevCustomPrompt(`You are a professional AI receptionist for ${workspace.businessName || "this business"}. Use the services and industry to book appointments and capture lead info.`);
                        setDevStatusLog("Loaded workspace info into Dev panel.");
                      }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10">Load from Workspace</button>

                      <button type="button" onClick={async () => {
                        if (!user) return;
                        try {
                          const payload = sanitizeForFirestore({
                            businessName: devBusinessName || workspace.businessName,
                            industry: devIndustry || workspace.industry,
                            customIndustry: devCustomIndustry || workspace.customIndustry,
                            services: devServices || workspace.services,
                          });
                          await setDoc(doc(db, "users", user.uid), payload, { merge: true });
                          setDevStatusLog("Applied Dev info to workspace.");
                        } catch (err) {
                          console.error("Apply workspace failed:", err);
                          setDevStatusLog("Apply failed: " + err.message);
                        }
                      }} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:opacity-95">Apply to Workspace</button>
                    </div>
                  </div>

                  {/* Dialer + Recordings */}
                  <div className="rounded-2xl border border-white/6 p-6 bg-zinc-900/20">
                    <h3 className="text-lg font-bold mb-4">2. Outbound Dialer</h3>
                    <form onSubmit={handleDevOutboundCall} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Target Mobile Number</label>
                        <input type="tel" value={devPhoneNumber} onChange={(e) => setDevPhoneNumber(e.target.value)} placeholder="+15551234567 or 5551234567" className="w-full p-3 rounded-lg border bg-black/40" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Voice / Model</label>
                        <select value={devVoiceId} onChange={(e) => setDevVoiceId(e.target.value)} className="w-full p-3 rounded-lg border bg-black/40">
                          <option value="sara">Sara</option>
                          <option value="rachel">Rachel</option>
                          <option value="jack">Jack</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Prompt Preview</label>
                        <textarea value={devCustomPrompt} onChange={(e) => setDevCustomPrompt(e.target.value)} rows={4} className="w-full p-3 rounded-lg border bg-black/40 font-mono" />
                      </div>

                      <button type="submit" disabled={devDialing} className={`w-full py-3 rounded-lg font-bold ${devDialing ? "bg-zinc-800 text-zinc-500" : "bg-red-600 text-white"}`}>
                        {devDialing ? "Firing..." : "Trigger Test Call"}
                      </button>
                    </form>

                    <div className="mt-4 rounded-lg p-3 bg-black/40 font-mono text-xs">
                      {devStatusLog || "Ready to deploy sandbox outbound streams."}
                    </div>

                    <div className="mt-6">
                      <h4 className="font-bold mb-2">Recent Recordings</h4>
                      {calls.filter(c => c.recordingUrl).length ? (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {calls.filter(c => c.recordingUrl).map((call) => (
                            <div key={call.id} className="rounded-lg p-3 bg-black/30 border border-white/6">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold">{call.caller || call.phone}</div>
                                <div className="text-xs text-zinc-400">ID: {call.callId || call.id}</div>
                              </div>
                              <audio controls className="w-full">
                                <source src={call.recordingUrl} type="audio/mpeg" />
                              </audio>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">No recordings yet. Live calls will appear here with playable audio.</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <h4 className="font-bold mb-2">Quick Appointment (Dev)</h4>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        await createDevAppointment({ name: apptName, phone: apptPhone, scheduledTime: apptTime, notes: apptNotes });
                        setApptName(""); setApptPhone(""); setApptTime(""); setApptNotes("");
                      }} className="space-y-3">
                        <input value={apptName} onChange={(e) => setApptName(e.target.value)} placeholder="Client name" className="w-full p-2 rounded-lg bg-black/30" />
                        <input value={apptPhone} onChange={(e) => setApptPhone(e.target.value)} placeholder="Phone" className="w-full p-2 rounded-lg bg-black/30" />
                        <input value={apptTime} onChange={(e) => setApptTime(e.target.value)} type="datetime-local" className="w-full p-2 rounded-lg bg-black/30" />
                        <textarea value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} placeholder="Notes" className="w-full p-2 rounded-lg bg-black/30" rows={2} />
                        <div className="flex gap-2">
                          <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white">Create Appointment</button>
                          <button type="button" onClick={() => { setApptName(""); setApptPhone(""); setApptTime(""); setApptNotes(""); }} className="px-4 py-2 rounded-lg bg-white/5">Clear</button>
                        </div>
                      </form>
                    </div>
                    <div className="mt-6 border-t pt-4">
                      <h4 className="font-bold mb-2">Create Test Account (Admin)</h4>
                      <div className="space-y-3">
                        <input value={devNewEmail} onChange={(e) => setDevNewEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded-lg bg-black/30" />
                        <input value={devNewPassword} onChange={(e) => setDevNewPassword(e.target.value)} placeholder="Temp password (min 6)" className="w-full p-2 rounded-lg bg-black/30" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={devNewPlan} onChange={(e) => setDevNewPlan(e.target.value)} className="p-2 rounded-lg bg-black/30">
                            <option value="starter">Starter — 1 Fugth number</option>
                            <option value="growth">Growth — 3 Fugth numbers</option>
                            <option value="elite">Elite — Unlimited Fugth numbers</option>
                          </select>
                          <input value={devNewFugthNumber} onChange={(e) => setDevNewFugthNumber(e.target.value)} placeholder="Fugth number (optional)" className="p-2 rounded-lg bg-black/30" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={createDevAccount} disabled={devCreatingAccount} className={`px-4 py-2 rounded-lg ${devCreatingAccount ? 'bg-zinc-700 text-zinc-400' : 'bg-emerald-600 text-white'}`}>{devCreatingAccount ? 'Creating...' : 'Create Account'}</button>
                          <button onClick={() => { setDevNewEmail(''); setDevNewPassword(''); setDevNewFugthNumber(''); }} className="px-4 py-2 rounded-lg bg-white/5">Clear</button>
                        </div>
                        <div className="text-xs text-zinc-500">Creates a Firebase Auth account and a Firestore user document. Users should reset their password on first login.</div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-bold mb-2">Dev Accounts</h4>
                        {devAccountsLoading ? <div className="text-sm text-zinc-400">Loading...</div> : (
                          devAccounts.length ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {devAccounts.map((a) => (
                                <div key={a.id} className="p-2 rounded border bg-black/20 flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold text-sm">{a.email}</div>
                                    <div className="text-xs text-zinc-400">{a.planTier} • {a.planStatus} • {a.fugthNumber || 'no Fugth number'}</div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => { setLookupEmail(a.email); setLookupResult(a); }} className="px-2 py-1 bg-white/5 rounded">Select</button>
                                    <button onClick={async () => { await updateDevAccount({ uid: a.uid, planTier: 'starter' }); }} className="px-2 py-1 bg-white/5 rounded">Make Starter</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-zinc-500">No dev accounts yet.</div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
