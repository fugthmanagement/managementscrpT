"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, collection, query, orderBy } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

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

  // Admin detection
  const isAdmin = user && (
    user.email?.toLowerCase() === "fugthmanagement@gmail.com" ||
    user.email?.toLowerCase() === "mepenginestudio@gmail.com"
  );

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

  const handleInitialSetup = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsInitializing(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        businessName: initBusinessName,
        industry: initIndustry === "Other" ? "Other" : initIndustry,
        customIndustry: initIndustry === "Other" ? initCustomIndustry : "",
        createdAt: new Date().toISOString(),
        planTier: "starter",
        planStatus: "trial",
      }, { merge: true });

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
      await setDoc(doc(db, "users", user.uid), workspace, { merge: true });
      alert("Workspace saved successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Could not save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

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
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Starter", price: "$49", features: ["1 phone line", "Basic AI", "Email support"], link: stripeLinks.starter },
              { name: "Growth", price: "$149", features: ["3 phone lines", "Advanced AI", "Priority support"], link: stripeLinks.growth, popular: true },
              { name: "Elite", price: "$499", features: ["Unlimited lines", "Custom AI", "Dedicated support"], link: stripeLinks.elite }
            ].map((plan) => (
              <div key={plan.name} className={`border rounded-xl p-6 transition ${plan.popular ? "bg-white/10 border-white/30 scale-105" : "bg-white/5 border-zinc-700"}`}>
                {plan.popular && <div className="text-xs font-bold text-emerald-400 mb-2">MOST POPULAR</div>}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-black mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-zinc-300">✓ {f}</li>
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
              >
                {darkMode ? "☀️" : "🌙"}
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

      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-64 border-r ${darkMode ? "bg-black/50 border-zinc-900" : "bg-white/50 border-zinc-200"} p-6 space-y-8 hidden lg:flex flex-col`}>
          {/* Navigation */}
          <nav className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Navigation</p>
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "calls", label: "Call Intelligence", icon: "📞" },
              { id: "leads", label: "Leads Manager", icon: "👥" },
              { id: "operations", label: "Operations", icon: "⚙️" },
              { id: "advisor", label: "AI Advisor", icon: "🤖" },
              { id: "knowledge", label: "Knowledge Base", icon: "📚" },
              { id: "settings", label: "Settings", icon: "⚙️" },
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
                <span className="mr-3">{item.icon}</span> {item.label}
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
                🔴 Dev Ops
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
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
                  {[
                    { label: "Calls Today", value: calls.filter(c => {
                      const callDate = new Date(c.timestamp?.seconds * 1000);
                      const today = new Date();
                      return callDate.toDateString() === today.toDateString();
                    }).length, icon: "📞", color: "from-blue-500" },
                    { label: "This Week", value: calls.length, icon: "📈", color: "from-emerald-500" },
                    { label: "Booked", value: calls.filter(c => c.outcome === "Booked").length, icon: "✓", color: "from-emerald-400" },
                    { label: "Current Plan", value: workspace.planTier || "Starter", icon: "⭐", color: "from-yellow-500" },
                  ].map((metric, idx) => (
                    <div key={idx} className={`bg-gradient-to-br ${metric.color} to-transparent opacity-10 rounded-xl p-6 border ${darkMode ? "border-zinc-800" : "border-zinc-300"} group hover:opacity-20 transition`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>{metric.label}</p>
                          <p className="text-3xl font-black mt-2">{metric.value}</p>
                        </div>
                        <span className="text-4xl opacity-30 group-hover:opacity-50 transition">{metric.icon}</span>
                      </div>
                    </div>
                  ))}
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
                              {new Date(call.timestamp?.seconds * 1000).toLocaleTimeString()}
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

                {calls.length > 0 ? (
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
                                  <p className={`text-sm ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>{new Date(call.timestamp?.seconds * 1000).toLocaleString()}</p>
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
                              <div className="text-xs text-zinc-500">🎙️ Voice: {call.voiceId || "Default"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`border-2 border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-300"} rounded-xl p-12 text-center`}>
                    <span className="text-5xl mb-3 block">📞</span>
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
                  <span className="text-5xl mb-3 block">👥</span>
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
                  {[
                    { label: "Total Calls", value: calls.length, change: "+12%" },
                    { label: "Booked Appointments", value: calls.filter(c => c.outcome === "Booked").length, change: "+8%" },
                    { label: "Response Rate", value: "94%", change: "+3%" },
                    { label: "Avg Duration", value: "2m 34s", change: "-5%" },
                  ].map((stat, idx) => (
                    <div key={idx} className={`border ${darkMode ? "bg-black/30 border-zinc-800" : "bg-white/30 border-zinc-300"} rounded-xl p-6`}>
                      <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>{stat.label}</p>
                      <div className="flex items-baseline gap-2 mt-3">
                        <p className="text-3xl font-black">{stat.value}</p>
                        <p className="text-xs text-emerald-400">{stat.change}</p>
                      </div>
                    </div>
                  ))}
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
                      Hello! I'm your Fugth Management AI Advisor. I can analyze your business performance, suggest optimizations, and answer questions about your operations. Ask me anything about your calls, leads, or business strategy.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask me anything about your business..."
                      className={`flex-1 p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-white`}
                    />
                    <button className="px-4 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200">Send</button>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Tab */}
            {activeTab === "knowledge" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black">Knowledge Base</h2>
                <div className={`border-2 border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-300"} rounded-xl p-12 text-center cursor-pointer hover:opacity-80 transition`}>
                  <span className="text-5xl mb-3 block">📚</span>
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
                <div className="flex items-center gap-3 mb-8">
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-black rounded-full border border-red-500/30">ADMIN</span>
                  <h2 className="text-3xl font-black">Developer Operations</h2>
                </div>

                <div className="bg-gradient-to-r from-red-950/30 to-transparent border border-red-500/20 rounded-2xl p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span>🔴</span> Test Outbound Calling
                  </h3>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const phoneNumber = String(formData.get('phone') || "").trim();
                    if (!phoneNumber) {
                      alert('Please enter a phone number');
                      return;
                    }

                    try {
                      const res = await fetch('/api/dev/outbound-call', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          phoneNumber,
                          businessName: workspace.businessName,
                          customPrompt: `You are a professional AI receptionist for ${workspace.businessName}, a ${workspace.industry} business.`
                        })
                      });
                      const data = await res.json();
                      alert(`✅ Call initiated: ${data.callId || 'ok'}`);
                    } catch (err) {
                      console.error('Dev call failed', err);
                      alert('❌ Error initiating call');
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Target Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+1 (555) 123-4567"
                        className={`w-full p-3 rounded-lg border ${darkMode ? "bg-black/50 border-zinc-700" : "bg-white/50 border-zinc-300"} focus:outline-none focus:border-red-500`}
                        required
                      />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition">
                      🔴 Trigger Test Call
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
