"use client";
import { useEffect, useMemo, useState } from "react";

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
    outcome: "Appointment Booked",
    sentiment: "Positive",
    summary: "Roof leak repair call converted into a Thursday 2 PM estimate.",
    rating: 5,
    duration: "06:12",
  },
  {
    caller: "Maria Chen",
    phone: "(415) 555-0122",
    date: "Today, 11:15 AM",
    outcome: "Quote Requested",
    sentiment: "Neutral",
    summary: "Asked about siding labor and requested a written quote before deciding.",
    rating: 4,
    duration: "04:03",
  },
  {
    caller: "Eric Dalton",
    phone: "(818) 555-0145",
    date: "Yesterday, 5:42 PM",
    outcome: "Complaint Resolved",
    sentiment: "Negative",
    summary: "Weekend surcharge caused friction; AI calmed caller and escalated next-day callback.",
    rating: 4,
    duration: "07:01",
  },
];

const leadGroups = [
  { name: "Hot Leads", count: 12, description: "Ready for same-day follow-up or discount nudge." },
  { name: "General Questions", count: 18, description: "Need pricing, timing, or service-area clarification." },
  { name: "Existing Clients", count: 9, description: "Reminder flow, invoice questions, and repeat service upsells." },
  { name: "Spam Filtered", count: 21, description: "Blocked automatically so your team sees clean pipeline only." },
];

const followUps = [
  { customer: "Riley Homes", action: "Send 10% discount text", reason: "Asked for pricing and went quiet after call." },
  { customer: "Stonebridge HOA", action: "Send reminder email", reason: "Estimate PDF opened twice but no reply yet." },
  { customer: "Kim Family Dental", action: "Send Saturday availability notice", reason: "Requested weekend slot during inbound call." },
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("command");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    {
      role: "ai",
      text: "Hello. I am your Executive AI Consultant. I can use your call history, uploaded files, business rules, and campaign context to help you run the business.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tone, setTone] = useState("Friendly");
  const [emergencyRule, setEmergencyRule] = useState("If a caller mentions a burst pipe or active leak, transfer immediately to my cell and mark as emergency priority.");

  useEffect(() => setMounted(true), []);

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

  if (!mounted) {
    return <div className="min-h-screen bg-black p-10 text-white">Loading Secure Dashboard...</div>;
  }

  async function sendToGemini(input = chatInput) {
    if (!input.trim()) return;

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-zinc-900 bg-zinc-950 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Fugth</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.18em] text-white">MANAGEMENT</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Consumer Business OS for calls, operations, uploads, reminders, and executive AI guidance.
            </p>
          </div>

          <nav className="space-y-2 px-4 pb-6 lg:px-6">
            {[
              ["command", "1. Command Center", "Calls, emails, recordings, follow-ups"],
              ["vault", "2. Business Brain", "Knowledge, settings, hours, files, calendar"],
              ["ai", "3. Executive AI", "ChatGPT-style consulting with your business context"],
            ].map(([key, title, subtitle]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${activeTab === key ? "border-zinc-700 bg-zinc-900 text-white" : "border-zinc-900 bg-zinc-950 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-white"}`}
              >
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-6 text-zinc-500">{subtitle}</p>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
          {activeTab === "command" && (
            <div className="space-y-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Command Center</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Operations and Revenue</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                    This dashboard is built to show the owner money, movement, and missed opportunities at a glance.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">This Week</p>
                  <p className="mt-2 text-3xl font-semibold text-white">$2,400 saved</p>
                  <p className="mt-1 text-sm text-zinc-500">Revenue captured by AI bookings and follow-ups</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {scoreCards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                    <p className="text-sm text-zinc-500">{card.label}</p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{card.value}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.25em] text-zinc-600">{card.hint}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Call Archive</h3>
                      <p className="mt-2 text-sm text-zinc-500">Recorded voices, waveform-style playback, AI summaries, transcripts, sentiment, and outcome actions.</p>
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
                              Customer asked for urgent repair pricing, AI explained service window, confirmed availability, and moved call into booked estimate workflow.
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
                          {[
                            "Replay AI Conversation",
                            "Generate Follow-Up",
                            "Send SMS",
                            "Send Promo",
                            "Assign Employee",
                          ].map((action) => (
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
                  <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                    <h3 className="text-xl font-semibold text-white">Pending Follow-ups</h3>
                    <p className="mt-2 text-sm text-zinc-500">The AI surfaces people who need a nudge, reminder, text, or promo.</p>
                    <div className="mt-5 space-y-3">
                      {followUps.map((item) => (
                        <div key={item.customer} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{item.customer}</p>
                            <button className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">{item.action}</button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                    <h3 className="text-xl font-semibold text-white">Lead and Email Engine</h3>
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

                  <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                    <h3 className="text-xl font-semibold text-white">Live Notifications</h3>
                    <p className="mt-2 text-sm text-zinc-500">This keeps the app feeling alive and makes urgent issues visible immediately.</p>
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

          {activeTab === "vault" && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Business Brain</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Train Your AI Employee</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                  This is the brain of the business. Files, rules, hours, calendar logic, and operator instructions all live here so the AI behaves like a trained staff member.
                </p>
              </div>

              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-xl font-semibold text-white">Business Profile</h3>
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
                <div className="rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-950 p-8">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Knowledge Uploads</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Drag, drop, and train the AI</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                    Upload pricing sheets, menus, service policies, warranty terms, screenshots, and anything the AI should know for calls and consulting.
                  </p>
                  <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-8 text-center">
                    <p className="text-base font-medium text-white">Drop PDFs, docs, or images here</p>
                    <p className="mt-2 text-sm text-zinc-500">Pricing sheets, service lists, FAQs, promos, and warranty files</p>
                    <button className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">Upload files</button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Instructions Panel</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Train the voice and rules</h3>
                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-zinc-300">Tone Selection</label>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {[
                          "Professional",
                          "Friendly",
                          "Aggressive Sales",
                        ].map((option) => (
                          <button
                            key={option}
                            onClick={() => setTone(option)}
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
                        onChange={(event) => setEmergencyRule(event.target.value)}
                        className="mt-3 min-h-32 w-full rounded-3xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-white outline-none transition focus:border-zinc-600"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Calendar Sync</p>
                        <p className="mt-2 text-sm text-zinc-500">Connect Google or Outlook so the AI books real openings.</p>
                        <button className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white">Connect Calendar</button>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-sm font-medium text-white">Answering Mode</p>
                        <p className="mt-2 text-sm text-zinc-500">Currently set for after-hours and overflow coverage.</p>
                        <button className="mt-4 rounded-full border border-zinc-700 px-4 py-2 text-sm text-white">Edit Mode</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-xl font-semibold text-white">Business Hours</h3>
                  <div className="mt-5 space-y-3">
                    {hours.map(([day, value]) => (
                      <div key={day} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3">
                        <span className="text-sm font-medium text-white">{day}</span>
                        <span className="text-sm text-zinc-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-xl font-semibold text-white">Uploaded Files</h3>
                  <p className="mt-2 text-sm text-zinc-500">These files are visible to the AI consultant and are the base for document-aware answers.</p>
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-400">Search knowledge base: pricing, contracts, policy, promotions</div>
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

              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-xl font-semibold text-white">Automations</h3>
                <p className="mt-2 text-sm text-zinc-500">High-value rules that make the platform operate like a real SaaS system, not just a chatbot.</p>
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
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Executive AI Consultant</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Context-aware business chat</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                      Clean chat interface, command-style prompts, business memory, file-aware reasoning, and proactive suggestions.
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-black px-4 py-2 text-xs text-zinc-400">Gemini Flash route</span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
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

                <div className="mt-6 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-4">
                  <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-2">
                    {chatLog.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${msg.role === "ai" ? "border border-zinc-800 bg-zinc-900 text-zinc-200" : "bg-white text-black"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-zinc-400 animate-pulse">
                          Reviewing calls, files, and settings...
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && sendToGemini()}
                      placeholder="Give an order or ask a question about calls, pricing, leads, files, or hours..."
                      className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-white outline-none transition focus:border-zinc-600"
                    />
                    <button onClick={() => sendToGemini()} className="rounded-2xl bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-zinc-200">
                      Send
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-xl font-semibold text-white">Key Facts the AI Knows</h3>
                  <div className="mt-5 space-y-3">
                    {aiFacts.map((fact) => (
                      <div key={fact} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                        {fact}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-xl font-semibold text-white">Proactive Suggestions</h3>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                      Three callers asked for Saturday availability. Consider opening a limited Saturday calendar block.
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                      Five callers mentioned pricing hesitation. Review the weekend surcharge against local competitors.
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300">
                      A promo email for your Hot Leads can be drafted from the Spring Promo Sheet in one click.
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-xl font-semibold text-white">Visible Files</h3>
                  <div className="mt-5 space-y-3">
                    {knowledgeFiles.slice(0, 3).map((file) => (
                      <div key={file.name} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="mt-1 text-sm text-zinc-500">Ready for document-aware answers</p>
                      </div>
                    ))}
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
