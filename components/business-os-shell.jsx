"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const scoreCards = [
  { label: "Calls Today", value: "27", hint: "↑ 18% this week" },
  { label: "Leads Captured", value: "14", hint: "↑ 11% from yesterday" },
  { label: "Appointments Booked", value: "12", hint: "↑ 22% this week" },
  { label: "Revenue Captured", value: "$2,400", hint: "↑ 18% this week" },
  { label: "Missed Calls Saved", value: "8", hint: "↓ 4% missed yesterday" },
  { label: "AI Response Rate", value: "98%", hint: "Stable in last 7 days" },
];

const calls = [
  {
    caller: "John Morales",
    phone: "(512) 555-0199",
    date: "Today, 2:30 PM",
    outcome: "Booked",
    sentiment: "Positive",
    summary: "Roof leak repair call converted into a Thursday 2 PM estimate.",
    rating: 5,
    duration: "06:12",
    transcript: "Caller reported a roof leak after heavy rain. AI confirmed location, urgency, and scheduled the next open estimate slot.",
  },
  {
    caller: "Maria Chen",
    phone: "(415) 555-0122",
    date: "Today, 11:15 AM",
    outcome: "Follow-Up Needed",
    sentiment: "Neutral",
    summary: "Asked about siding labor and requested a written quote before deciding.",
    rating: 4,
    duration: "04:03",
    transcript: "Customer requested pricing clarity, asked about materials, and wanted an email estimate before booking.",
  },
  {
    caller: "Eric Dalton",
    phone: "(818) 555-0145",
    date: "Yesterday, 5:42 PM",
    outcome: "Complaint",
    sentiment: "Negative",
    summary: "Weekend surcharge caused friction; AI calmed caller and escalated next-day callback.",
    rating: 4,
    duration: "07:01",
    transcript: "Caller was frustrated about a surcharge. AI explained policy, acknowledged frustration, and created a manager callback task.",
  },
];

const leadGroups = [
  { name: "Hot Leads", count: 12, description: "Ready for same-day follow-up or discount nudge." },
  { name: "General Questions", count: 18, description: "Need pricing, timing, or service-area clarification." },
  { name: "Existing Clients", count: 9, description: "Reminder flow, invoice questions, and repeat service upsells." },
  { name: "Spam Filtered", count: 21, description: "Blocked automatically so your team sees clean pipeline only." },
];

const followUps = [
  { customer: "Riley Homes", reason: "Asked for pricing and went quiet after call." },
  { customer: "Stonebridge HOA", reason: "Estimate PDF opened twice but no reply yet." },
  { customer: "Kim Family Dental", reason: "Requested weekend slot during inbound call." },
];

const liveNotifications = [
  "New voicemail received from Alicia Rivera.",
  "AI booked a Thursday 2 PM roof estimate.",
  "Customer upset on recent call about weekend surcharge.",
  "Lead marked HOT after quote request and pricing question.",
];

const knowledgeFiles = [
  { name: "2026 Pricing Guide.pdf", type: "Pricing", size: "2.4 MB", tag: "pricing", status: "Indexed successfully", usage: "Used in 12 AI responses" },
  { name: "Service Area Map.png", type: "Territory", size: "980 KB", tag: "territory", status: "Indexed successfully", usage: "Used in 4 AI responses" },
  { name: "Warranty Terms.docx", type: "Support", size: "1.1 MB", tag: "policy", status: "Indexed successfully", usage: "Used in 6 AI responses" },
  { name: "Spring Promo Sheet.pdf", type: "Campaign", size: "740 KB", tag: "promotion", status: "Indexed successfully", usage: "Used in 9 AI responses" },
];

const hours = [
  ["Mon", "7:00 AM - 7:00 PM"],
  ["Tue", "7:00 AM - 7:00 PM"],
  ["Wed", "7:00 AM - 7:00 PM"],
  ["Thu", "7:00 AM - 7:00 PM"],
  ["Fri", "7:00 AM - 6:00 PM"],
  ["Sat", "By callback only"],
  ["Sun", "Emergency transfer only"],
];

const businessProfile = [
  ["Business Name", "Fugth Management Demo Client"],
  ["Services", "Roof repair, siding, maintenance, emergency response"],
  ["Service Area", "Austin metro, Round Rock, Cedar Park"],
  ["Pricing", "Premium tier with surcharge rules for urgent work"],
  ["FAQs", "Weekend pricing, warranty coverage, estimate timing"],
  ["Team Members", "Owner, field manager, technician crew, dispatcher"],
  ["Phone Numbers", "Main line, emergency line, after-hours escalation"],
  ["Emergency Contacts", "Owner mobile and field manager transfer targets"],
];

const automations = [
  "Send review request after completed call",
  "Text customer 1 hour before appointment",
  "Notify owner if caller angry",
  "Create follow-up task when pricing objection appears",
];

const aiSuggestions = [
  "Draft a promo email for the spring cleaning special and target all Hot Leads.",
  "Tell me which callers mentioned pricing friction this week.",
  "Review the uploaded pricing guide and suggest a higher weekend surcharge.",
  "Summarize how the business performed this week from calls and follow-ups.",
];

const aiFacts = [
  "Business type: premium exterior services",
  "Tone: friendly but direct",
  "Emergency rule: burst pipe or active leak gets instant owner transfer",
  "Connected assets: pricing guide, service map, warranty file, spring promo",
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

export function BusinessOSShell({ locked = false, authReady = true }) {
  const [activeTab, setActiveTab] = useState("command");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    {
      role: "ai",
      text: "Hello. I am your Executive AI Consultant. I can use your call history, uploaded files, business rules, and campaign context to help you run the business.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [tone, setTone] = useState("Friendly");
  const [emergencyRule, setEmergencyRule] = useState("If a caller mentions a burst pipe or active leak, transfer immediately to my cell and mark as emergency priority.");

  const businessSummary = useMemo(() => {
    return [
      "Business Name: Fugth Management Demo Client",
      "Use uploaded files as knowledge base context.",
      `Tone: ${tone}.`,
      `Emergency Protocol: ${emergencyRule}`,
      `Recent Call Summaries: ${calls.map((call) => `${call.caller} - ${call.summary}`).join(" | ")}`,
      `Lead Buckets: ${leadGroups.map((group) => `${group.name} ${group.count}`).join(", ")}`,
      `Knowledge Files: ${knowledgeFiles.map((file) => file.name).join(", ")}`,
    ].join("\n");
  }, [tone, emergencyRule]);

  const currentTheme = tabThemes[activeTab];

  async function sendToGemini(input = chatInput) {
    if (!input.trim() || locked) return;

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

  const sentimentStyles = {
    Positive: "border-emerald-900 bg-emerald-950 text-emerald-300",
    Neutral: "border-amber-900 bg-amber-950 text-amber-300",
    Negative: "border-rose-900 bg-rose-950 text-rose-300",
  };

  const overlay = locked && !authReady ? null : locked ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xl rounded-[2rem] border border-zinc-800 bg-zinc-950/95 p-8 text-center shadow-[0_0_100px_rgba(255,255,255,0.05)] sm:p-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">AI Business OS</h2>
        <p className="mt-4 text-sm leading-8 text-zinc-400 sm:text-base">
          You are viewing a live preview of Fugth Management. Explore the Command Center, Business Brain, and Executive AI before unlocking the full interactive system.
        </p>
        <div className="mt-8 flex flex-col gap-4">
          <Link href="/login" className="w-full rounded-2xl bg-white px-6 py-4 text-lg font-bold text-black transition hover:bg-zinc-200">
            Create Account / Log In
          </Link>
          <p className="text-sm text-zinc-600">Some business intelligence is intentionally grayed out until authentication.</p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {overlay}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${currentTheme.panel}`} />
      <div className={`flex min-h-screen flex-col lg:flex-row ${locked ? "select-none" : ""}`}>
        <aside className="w-full border-b border-zinc-900 bg-[#0a0a0a] lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Fugth</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">MANAGEMENT</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-500">
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
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${activeTab === key ? `border-zinc-700 bg-zinc-900 text-white ${tabThemes[key].glow}` : "border-zinc-900 bg-zinc-950 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-white"}`}
              >
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-6 text-zinc-500">{subtitle}</p>
              </button>
            ))}
          </nav>

          <div className="px-6 pb-6 lg:mt-auto">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-900 bg-zinc-950/80 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-500">System Operational</span>
            </div>
          </div>
        </aside>

        <main className="relative flex-1 overflow-y-auto bg-[#050505]/95 p-5 sm:p-8 lg:p-10">
          <div className={`mb-8 rounded-[2rem] border border-zinc-800 bg-black/30 p-5 backdrop-blur sm:p-6 ${currentTheme.glow}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Fugth Management OS</p>
                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{currentTheme.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
                  {activeTab === "command" && "Run the front desk, watch revenue movement, review calls, and trigger next actions."}
                  {activeTab === "brain" && "Define how the AI speaks, books, answers, and reasons from your business documents."}
                  {activeTab === "ai" && "Use a focused executive workspace for analysis, drafting, and command-style business decisions."}
                </p>
              </div>
              <div className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] ${currentTheme.badge}`}>
                {locked ? "Preview Mode" : "Interactive"}
              </div>
            </div>
          </div>

          {activeTab === "command" && (
            <div className="mx-auto max-w-7xl space-y-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Command Center</p>
                  <h2 className="mt-3 text-3xl font-bold text-white">Money, Calls, and Daily Momentum</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                    The owner should open this first every day. It shows revenue, lead flow, calls, recordings, outcomes, and what needs action next.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">This Week</p>
                  <p className="mt-2 text-3xl font-semibold text-white">$2,400 saved</p>
                  <p className="mt-1 text-sm text-zinc-500">Revenue captured by AI bookings and follow-ups</p>
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
                      <p className="mt-2 text-sm text-zinc-500">Caller info, AI summary, transcript, recording player, sentiment, and action controls.</p>
                    </div>
                    <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400">47 calls archived</span>
                  </div>
                  <div className="mt-6 space-y-4">
                    {calls.map((call) => (
                      <div key={`${call.caller}-${call.date}`} className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="text-lg font-medium text-white">{call.caller}</h4>
                              <span className={`rounded-full border px-3 py-1 text-xs ${sentimentStyles[call.sentiment]}`}>{call.sentiment}</span>
                              <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">{call.outcome}</span>
                            </div>
                            <p className="mt-2 text-sm text-zinc-500">{call.phone} · {call.date} · {call.duration}</p>
                            <p className="mt-4 text-sm leading-7 text-zinc-300">{call.summary}</p>
                            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-sm leading-7 text-zinc-400">
                              <span className="block text-xs uppercase tracking-[0.28em] text-zinc-600">Transcript</span>
                              {call.transcript}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                            Listen & Rate {"⭐".repeat(call.rating)}
                          </div>
                        </div>
                        <div className="mt-5">
                          <Waveform />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {["Replay AI Conversation", "Generate Follow-Up", "Send SMS", "Send Promo", "Assign Employee"].map((action) => (
                            <button key={action} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white">
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <h3 className="text-xl font-bold text-white">Smart Follow-Ups</h3>
                    <p className="mt-2 text-sm text-zinc-500">The AI surfaces people who need a nudge, reminder, text, or promo.</p>
                    <div className="mt-5 space-y-3">
                      {followUps.map((item) => (
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
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                    <h3 className="text-xl font-bold text-white">Lead and Email Engine</h3>
                    <p className="mt-2 text-sm text-zinc-500">Collect emails, promo send, touchback reminders, and categorized customer buckets.</p>
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
                    <p className="mt-2 text-sm text-zinc-500">This makes the app feel active and shows the operator what just happened.</p>
                    <div className="mt-5 space-y-3">
                      {liveNotifications.map((item) => (
                        <div key={item} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                          {item}
                        </div>
                      ))}
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
                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                  This is where the AI learns the company. Business profile, instructions, knowledge files, schedules, and automation logic all live here.
                </p>
              </div>

              <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                <h3 className="text-xl font-bold text-white">Business Profile</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {businessProfile.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-zinc-600">{label}</p>
                      <p className="mt-3 text-sm leading-7 text-zinc-300">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className={`rounded-[2rem] border border-dashed border-zinc-700 bg-[#0f0f11] p-8 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Knowledge Base</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Drag, drop, and index business documents</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                    Upload PDFs, pricing sheets, menus, contracts, policies, warranties, and screenshots. The AI uses these to answer, sell, and book correctly.
                  </p>
                  <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-8 text-center">
                    <p className="text-base font-medium text-white">Drop PDFs, docs, or images here</p>
                    <p className="mt-2 text-sm text-zinc-500">Pricing sheets, service lists, FAQs, promos, contracts, and warranty files</p>
                    <button className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">Upload files</button>
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
                            onClick={() => !locked && setTone(option)}
                            className={`rounded-full border px-4 py-2 text-sm transition ${tone === option ? "border-zinc-600 bg-white text-black" : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:text-white"}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300">Emergency Protocol</label>
                      <textarea
                        value={emergencyRule}
                        onChange={(event) => !locked && setEmergencyRule(event.target.value)}
                        className="mt-3 min-h-32 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Calendar Sync</p>
                        <p className="mt-2 text-sm text-zinc-500">Connect Google, Outlook, or Calendly so the AI books real openings.</p>
                        <button className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white">Connect Calendar</button>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Booking Rules</p>
                        <p className="mt-2 text-sm text-zinc-500">Blackout dates, vacation mode, max jobs per day, and no Sunday scheduling.</p>
                        <button className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white">Edit Rules</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <h3 className="text-xl font-bold text-white">Operating Hours</h3>
                  <div className="mt-5 space-y-3">
                    {hours.map(([day, value]) => (
                      <div key={day} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3">
                        <span className="text-sm font-medium text-white">{day}</span>
                        <span className="text-sm text-zinc-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                  <h3 className="text-xl font-bold text-white">Knowledge Files</h3>
                  <p className="mt-2 text-sm text-zinc-500">Searchable, tagged, and indexed for AI memory and document-aware responses.</p>
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-400">
                    Search knowledge base: pricing, contracts, policy, promotions
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {knowledgeFiles.map((file) => (
                      <div key={file.name} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="mt-2 text-sm text-zinc-500">{file.type} · {file.size}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-400">#{file.tag}</span>
                          <span className="rounded-full border border-emerald-900 bg-emerald-950 px-2 py-1 text-xs text-emerald-300">{file.status}</span>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-600">{file.usage}</p>
                        <div className="mt-4 flex gap-2">
                          <button className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-white">View</button>
                          <button className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-white">Use in AI</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`rounded-[2rem] border border-zinc-800 bg-[#0f0f11] p-6 ${locked ? "opacity-65" : "opacity-100"}`}>
                <h3 className="text-xl font-bold text-white">Automations</h3>
                <p className="mt-2 text-sm text-zinc-500">This is where the platform becomes a real SaaS operating system instead of only a chatbot.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {automations.map((item) => (
                    <div key={item} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="mx-auto flex h-full max-w-7xl flex-col animate-[fadeIn_0.2s_ease]">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white">Executive AI</h2>
                  <p className="text-zinc-500">Your personalized business analyst, strategist, and operator assistant.</p>
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
                    {chatLog.map((msg, idx) => (
                      <div key={idx} className={`flex items-start gap-4 ${msg.role === "user" ? "ml-auto max-w-[85%] flex-row-reverse" : "max-w-[85%]"}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${msg.role === "user" ? "bg-zinc-800 text-white" : "bg-white text-black"}`}>
                          {msg.role === "user" ? "ME" : "AI"}
                        </div>
                        <div className={`rounded-2xl p-4 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm bg-blue-600 text-white shadow-lg" : "rounded-tl-sm border border-zinc-800 bg-zinc-900 text-zinc-200"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
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
                      {[
                        "3 missed leads need follow-up",
                        "Revenue dropped 12% on Saturday",
                        "Customers asking about roofing bundles",
                        "You should run a weekend promo",
                      ].map((item) => (
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
