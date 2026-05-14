"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { BusinessOSShell } from "../components/business-os-shell";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return <BusinessOSShell locked={!isAuthenticated} authReady={authReady} />;
}import Link from "next/link";

const features = [
  {
    title: "AI Call Answering",
    description: "Answer every inbound call, capture intent, and move leads into booked appointments without voicemail dead ends.",
  },
  {
    title: "Marketing and Leads",
    description: "Track outreach volume, monitor new local leads, and see where demand is forming before competitors do.",
  },
  {
    title: "Executive AI Consultant",
    description: "Ask for pricing, operations, and growth guidance from a private AI layer connected to your business context.",
  },
];

const metrics = [
  { value: "24/7", label: "coverage" },
  { value: "94%", label: "satisfaction" },
  { value: "3 tabs", label: "operator views" },
];

const workflow = [
  "Capture every customer call with clean call intelligence.",
  "Push leads into a marketing pipeline built for follow-up.",
  "Ask the executive AI for next actions and business answers.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_26%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between rounded-full border border-zinc-800 bg-zinc-950/80 px-5 py-4 backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Fugth Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white sm:inline-flex">
                Login
              </Link>
              <Link href="/login" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
                Client Access
              </Link>
            </div>
          </header>

          <div className="grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
            <div>
              <span className="inline-flex rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-zinc-400">
                AI That Sounds Like a Human
              </span>
              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                A luxury operations layer for calls, leads, and executive decision making.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                Fugth Management turns your front desk, follow-up, and strategic guidance into one high-trust AI system designed for businesses that cannot afford missed conversations.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/login" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
                  Open Client Login
                </Link>
                <Link href="/dashboard" className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-950">
                  Preview Dashboard
                </Link>
              </div>
              <div className="mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5">
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-white">{metric.value}</p>
                    <p className="mt-2 text-sm text-zinc-500">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-6 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Live Operator View</p>
                  <h2 className="mt-2 text-2xl font-medium text-white">Command surface</h2>
                </div>
                <span className="rounded-full border border-emerald-900 bg-emerald-950 px-3 py-1 text-xs text-emerald-300">
                  Secure
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {features.map((feature, index) => (
                  <div key={feature.title} className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">0{index + 1}</p>
                    <h3 className="mt-3 text-xl font-medium text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Platform</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            Built for operators who want one system instead of five disconnected tools.
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-7">
              <h3 className="text-xl font-medium text-white">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Workflow</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">
              From incoming demand to executive action.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-400">
              The front page now matches the product story: handle conversations, grow pipeline, and surface strategic recommendations inside one premium interface.
            </p>
          </div>
          <div className="space-y-4">
            {workflow.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[1.75rem] border border-zinc-800 bg-black/40 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-white">
                  0{index + 1}
                </div>
                <p className="pt-1 text-sm leading-7 text-zinc-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2.25rem] border border-zinc-800 bg-zinc-950 px-6 py-12 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Launch Ready</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            Move from placeholder page to a real front door.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-zinc-400">
            Your homepage now presents the product, while login remains available for client access and dashboard preview flows.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/login" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Go to Login
            </Link>
            <Link href="/dashboard" className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-black">
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
