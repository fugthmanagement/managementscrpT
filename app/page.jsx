"use client";

import Link from "next/link";
import { useState } from "react";

const steps = [
  [
    "01",
    "A customer reaches out",
    "Your FUGTH number answers with your business details and a natural welcome.",
  ],
  [
    "02",
    "The right next step is captured",
    "It gathers the contact, reason for calling, and preferred time without making the customer repeat themselves.",
  ],
  [
    "03",
    "Your business stays in motion",
    "The call becomes an organized lead, appointment, and follow-up inside one calm workspace.",
  ],
];

const plans = [
  {
    name: "Low",
    price: "$49",
    copy: "A polished home for a business getting organized.",
    items: ["Business workspace", "Lead capture", "Website preview"],
  },
  {
    name: "Mid",
    price: "$149",
    copy: "The complete front door for growing local teams.",
    items: [
      "Everything in Low",
      "Calls and appointment flow",
      "Marketing workspace",
    ],
    featured: true,
  },
  {
    name: "High",
    price: "$499",
    copy: "For teams that want a bigger operating system.",
    items: [
      "Everything in Mid",
      "Advanced automations",
      "Founder-level support",
    ],
  },
];

function Arrow() {
  return (
    <span aria-hidden="true" className="text-xl leading-none">
      →
    </span>
  );
}

export default function Home() {
  const [active, setActive] = useState("Calls");
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = {
    Calls: ["Sophia Reynolds", "Wants an estimate", "Appointment request"],
    Leads: ["8 new opportunities", "3 follow-ups due", "2 ready to book"],
    Studio: [
      "Service Pro selected",
      "Homepage draft ready",
      "Preview link active",
    ],
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f4ef] font-sans text-[#12263a]">
      <div className="border-b border-[#dce1dc] bg-[#143a5c] px-5 py-3 text-center text-xs font-bold tracking-wide text-[#e5f5b5]">
        FUGTH MANAGEMENT · A BETTER FRONT DOOR FOR LOCAL BUSINESS
      </div>
      <header className="sticky top-0 z-30 border-b border-[#e2e0d9] bg-[#f6f4ef]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[78px] w-[min(100%-32px,1240px)] items-center justify-between gap-5">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Fugth Management home"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#315be6] text-2xl font-black tracking-[-.18em] text-white">
              F<span className="text-[#c9ed83]">✦</span>
            </span>
            <span className="leading-none">
              <b className="block text-xl font-black tracking-[-.06em]">
                FUGTH
              </b>
              <small className="mt-1 block text-[8px] font-black tracking-[.24em] text-[#63727a]">
                MANAGEMENT OS
              </small>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-[#425463] md:flex">
            <a href="#platform" className="hover:text-[#315be6]">
              Platform
            </a>
            <a href="#studio" className="hover:text-[#315be6]">
              Website Studio
            </a>
            <a href="#pricing" className="hover:text-[#315be6]">
              Plans
            </a>
          </nav>
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="/login"
              className="text-sm font-bold text-[#273d4e] hover:text-[#315be6]"
            >
              Log in
            </Link>
            <Link
              href="/plans"
              className="rounded-xl bg-[#12263a] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#315be6]"
            >
              Build my setup <Arrow />
            </Link>
          </div>
          <button
            aria-label="Open navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[#d9ddd9] text-lg sm:hidden"
          >
            ☰
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e2e0d9] bg-[#f6f4ef] px-5 py-5 sm:hidden">
            <div className="mx-auto grid w-[min(100%,1240px)] gap-4 text-sm font-bold">
              <a href="#platform" onClick={() => setMenuOpen(false)}>
                Platform
              </a>
              <a href="#studio" onClick={() => setMenuOpen(false)}>
                Website Studio
              </a>
              <a href="#pricing" onClick={() => setMenuOpen(false)}>
                Plans
              </a>
              <Link href="/login">Log in</Link>
              <Link
                href="/plans"
                className="rounded-lg bg-[#12263a] px-4 py-3 text-center text-white"
              >
                Build my setup
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative isolate border-b border-[#dedfd9] bg-[#f6f4ef]">
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-[47%] bg-[#e4ede2] lg:block" />
        <div className="mx-auto grid min-h-[680px] w-[min(100%-32px,1240px)] items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d7defe] bg-[#e9edff] px-4 py-2 text-[10px] font-black tracking-[.16em] text-[#315be6]">
              <span className="text-base">✦</span> BUILT FOR THE BUSINESS BEHIND
              THE BUSINESS
            </p>
            <h1 className="mt-7 max-w-[760px] text-[clamp(3.6rem,8vw,7.2rem)] font-black leading-[.86] tracking-[-.095em] text-[#12263a]">
              Make every <span className="text-[#315be6]">first hello</span>{" "}
              count.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#5c6c73] sm:text-lg">
              FUGTH turns the messy parts of running a local business into one
              clear place for calls, leads, scheduling, marketing, and a website
              that actually looks like you mean business.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/plans"
                className="flex min-h-14 items-center gap-10 rounded-xl bg-[#12263a] px-6 text-sm font-black text-white shadow-xl shadow-[#1d385b1d] transition hover:-translate-y-0.5 hover:bg-[#315be6]"
              >
                Start building <Arrow />
              </Link>
              <a
                href="#studio"
                className="flex min-h-14 items-center gap-4 rounded-xl border border-[#d9ddd7] bg-white px-6 text-sm font-black text-[#173042] hover:bg-[#eef1ed]"
              >
                See the studio <span>→</span>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3 text-xs font-bold text-[#6c7a80]">
              <span className="text-lg tracking-[-.2em] text-[#315be6]">
                ★★★★★
              </span>
              <span>One workspace. Your brand. Your pace.</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] py-4">
            <div className="absolute -left-7 top-14 h-48 w-48 rounded-full bg-[#cedcff] blur-2xl" />
            <div className="absolute -bottom-6 right-1 h-56 w-56 rounded-full bg-[#cce8b5] blur-2xl" />
            <div className="relative overflow-hidden rounded-[30px] border-[7px] border-[#142a3a] bg-[#fbfcf8] p-5 shadow-2xl shadow-[#143a5c33] sm:p-7">
              <div className="flex items-center justify-between border-b border-[#e5e7e3] pb-5">
                <div>
                  <p className="text-[10px] font-black tracking-[.16em] text-[#718088]">
                    TODAY AT FUGTH
                  </p>
                  <b className="mt-1 block text-lg">
                    Your business, in motion.
                  </b>
                </div>
                <span className="rounded-full bg-[#dff1df] px-3 py-1 text-[10px] font-black text-[#248254]">
                  ● LIVE
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {Object.keys(tabs).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActive(tab)}
                    className={`rounded-xl px-3 py-3 text-left text-xs font-black transition ${active === tab ? "bg-[#315be6] text-white shadow-lg shadow-[#315be655]" : "bg-[#eef1ef] text-[#50616c] hover:bg-[#e2e6e3]"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-[#eff5ed] p-5">
                <p className="text-[10px] font-black tracking-[.14em] text-[#5e7868]">
                  {active.toUpperCase()} SUMMARY
                </p>
                <p className="mt-3 text-xl font-black tracking-[-.04em]">
                  {tabs[active][0]}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#557065]">
                  {tabs[active][1]}
                </p>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#4b6270]">
                  <span>{tabs[active][2]}</span>
                  <span className="text-[#315be6]">Open →</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f8e7de] p-4">
                  <p className="text-[10px] font-black tracking-[.12em] text-[#925438]">
                    NEW LEADS
                  </p>
                  <b className="mt-2 block text-3xl tracking-[-.08em]">08</b>
                </div>
                <div className="rounded-2xl bg-[#e8e7fb] p-4">
                  <p className="text-[10px] font-black tracking-[.12em] text-[#5a59a0]">
                    BOOKED
                  </p>
                  <b className="mt-2 block text-3xl tracking-[-.08em]">03</b>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-4 rounded-2xl border border-[#dde2dd] bg-white px-4 py-3 shadow-xl">
              <p className="text-xs font-black">New website lead</p>
              <p className="mt-1 text-[10px] text-[#6c7b82]">
                Ready for follow-up · just now
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="bg-white py-24 sm:py-32">
        <div className="mx-auto w-[min(100%-32px,1240px)]">
          <p className="text-[11px] font-black tracking-[.2em] text-[#315be6]">
            NOT ANOTHER COLLECTION OF TOOLS
          </p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <h2 className="max-w-xl text-5xl font-black leading-[.93] tracking-[-.07em] sm:text-7xl">
              One calm place to run what matters.
            </h2>
            <p className="max-w-xl self-end text-base leading-8 text-[#5d6b73]">
              The experience starts with the people trying to reach your
              business. From there, FUGTH gives you the context and control to
              turn that moment into a real relationship.
            </p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[#dde3df] bg-[#dde3df] md:grid-cols-3">
            {[
              [
                "01",
                "Calls that know your business",
                "Give customers a clear, professional first response - even when you are busy.",
              ],
              [
                "02",
                "Leads that stay organized",
                "Turn conversations into useful notes, follow-ups, and opportunities your team can act on.",
              ],
              [
                "03",
                "A site that earns attention",
                "Build a focused public website alongside the exact tools you use to manage it.",
              ],
            ].map(([num, title, copy], i) => (
              <article
                key={num}
                className={`min-h-[320px] p-8 ${i === 1 ? "bg-[#173953] text-white" : "bg-[#f8f8f5]"}`}
              >
                <p
                  className={`text-5xl font-black tracking-[-.1em] ${i === 1 ? "text-[#c9ed83]" : "text-[#315be6]"}`}
                >
                  {num}
                </p>
                <h3 className="mt-20 text-2xl font-black tracking-[-.05em]">
                  {title}
                </h3>
                <p
                  className={`mt-4 max-w-sm text-sm leading-7 ${i === 1 ? "text-[#c9d8e4]" : "text-[#5e6f77]"}`}
                >
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="studio" className="bg-[#173953] py-24 text-white sm:py-32">
        <div className="mx-auto grid w-[min(100%-32px,1240px)] items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-[11px] font-black tracking-[.2em] text-[#c9ed83]">
              THE FUGTH WEBSITE STUDIO
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[.9] tracking-[-.075em] sm:text-7xl">
              A real website, not a placeholder.
            </h2>
            <p className="mt-7 max-w-md text-base leading-8 text-[#c4d3df]">
              Choose a direction, set the voice, shape the colors, and publish a
              site that feels ready to send to people. Your call, lead, and
              booking tools stay connected behind it.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-8 border-b border-[#c9ed83] pb-2 text-sm font-black text-[#d9f4a3]"
            >
              Open your studio <Arrow />
            </Link>
          </div>
          <div className="rounded-[28px] bg-[#f7f4ed] p-4 text-[#173042] shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[.16em] text-[#6b767b]">
                  WEBSITE STUDIO
                </p>
                <b className="mt-1 block text-lg">Your brand, ready to show.</b>
              </div>
              <span className="rounded-lg bg-[#e6edf9] px-3 py-2 text-[10px] font-black text-[#315be6]">
                DRAFT SAVED
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-[.72fr_1.28fr]">
              <div className="rounded-2xl bg-[#e9e5dc] p-4">
                <p className="text-[9px] font-black tracking-[.14em] text-[#6c716e]">
                  DIRECTION
                </p>
                <div className="mt-4 rounded-xl bg-[#15364f] p-3 text-white">
                  <b className="block text-sm">Service Pro</b>
                  <small className="mt-1 block text-[10px] text-[#bdcfdb]">
                    Bold & built to convert
                  </small>
                </div>
                <div className="mt-3 rounded-xl border border-[#d0d0ca] bg-[#f8f7f3] p-3 text-xs font-bold">
                  Care Pro
                </div>
                <div className="mt-3 rounded-xl border border-[#d0d0ca] bg-[#f8f7f3] p-3 text-xs font-bold">
                  Studio Pro
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-md">
                <div className="flex items-center justify-between border-b border-[#ebebe7] px-5 py-4">
                  <b className="text-sm">North Star Electric</b>
                  <span className="text-[10px] font-black text-[#315be6]">
                    PREVIEW ↗
                  </span>
                </div>
                <div className="bg-[#d8e7e7] p-6">
                  <p className="text-[9px] font-black tracking-[.15em] text-[#315be6]">
                    ELECTRICAL DONE RIGHT
                  </p>
                  <p className="mt-3 max-w-xs text-3xl font-black leading-[.9] tracking-[-.07em]">
                    Powering the places that matter.
                  </p>
                  <div className="mt-6 inline-block rounded-lg bg-[#173953] px-4 py-3 text-[10px] font-black text-white">
                    REQUEST AN ESTIMATE
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-[#e4e4df]">
                  <div className="h-16 bg-[#f3d8c8]" />
                  <div className="h-16 bg-[#dcebdc]" />
                  <div className="h-16 bg-[#dcdcf6]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef2ed] py-24 sm:py-32">
        <div className="mx-auto grid w-[min(100%-32px,1240px)] gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="text-[11px] font-black tracking-[.2em] text-[#315be6]">
              HOW IT FLOWS
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[.9] tracking-[-.075em] sm:text-7xl">
              Every response leads somewhere useful.
            </h2>
          </div>
          <div>
            {steps.map(([n, t, c]) => (
              <article
                key={n}
                className="grid grid-cols-[54px_1fr_22px] gap-5 border-b border-[#cbd6cf] py-7 first:pt-0"
              >
                <p className="text-xl font-black text-[#315be6]">{n}</p>
                <div>
                  <h3 className="text-xl font-black tracking-[-.04em]">{t}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#5e6f77]">
                    {c}
                  </p>
                </div>
                <span className="text-xl text-[#315be6]">→</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-24 sm:py-32">
        <div className="mx-auto w-[min(100%-32px,1240px)]">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-black tracking-[.2em] text-[#315be6]">
                SIMPLE STARTING POINTS
              </p>
              <h2 className="mt-5 text-5xl font-black leading-[.9] tracking-[-.075em] sm:text-7xl">
                Choose the room you need.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#627178]">
              Start with the plan that fits today. Keep your data, your
              workspace, and your path forward in one place.
            </p>
          </div>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`flex min-h-[410px] flex-col rounded-3xl border p-8 ${plan.featured ? "border-[#173953] bg-[#173953] text-white shadow-xl shadow-[#17395326]" : "border-[#dce2de] bg-[#fafaf7]"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-[-.05em]">
                    {plan.name}
                  </h3>
                  {plan.featured && (
                    <span className="rounded-full bg-[#c9ed83] px-3 py-1 text-[9px] font-black tracking-[.1em] text-[#173953]">
                      MOST COMPLETE
                    </span>
                  )}
                </div>
                <p
                  className={`mt-5 min-h-11 text-sm leading-6 ${plan.featured ? "text-[#c5d5e0]" : "text-[#64747b]"}`}
                >
                  {plan.copy}
                </p>
                <p className="mt-7 text-5xl font-black tracking-[-.08em]">
                  {plan.price}
                  <span
                    className={`text-sm tracking-normal ${plan.featured ? "text-[#b9cedd]" : "text-[#75838a]"}`}
                  >
                    {" "}
                    / month
                  </span>
                </p>
                <ul
                  className={`mt-7 space-y-4 border-t pt-6 text-sm font-bold ${plan.featured ? "border-white/20 text-[#e4edf3]" : "border-[#dfe4e1] text-[#43555f]"}`}
                >
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span
                        className={
                          plan.featured ? "text-[#c9ed83]" : "text-[#315be6]"
                        }
                      >
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/plans"
                  className={`mt-auto flex items-center justify-between rounded-xl px-5 py-4 text-sm font-black ${plan.featured ? "bg-[#c9ed83] text-[#173953]" : "bg-[#e7ece8] text-[#173953]"}`}
                >
                  Choose {plan.name} <Arrow />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#315be6] px-4 py-24 text-white sm:py-28">
        <div className="mx-auto flex w-[min(100%,1120px)] flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-black tracking-[.2em] text-[#dce8ff]">
              READY WHEN YOU ARE
            </p>
            <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[.9] tracking-[-.075em] sm:text-7xl">
              Build the business people feel good calling.
            </h2>
          </div>
          <Link
            href="/plans"
            className="flex min-h-14 shrink-0 items-center gap-8 rounded-xl bg-[#d8f29c] px-6 text-sm font-black text-[#173953] shadow-lg"
          >
            Get started <Arrow />
          </Link>
        </div>
      </section>

      <footer className="bg-[#f6f4ef] py-12">
        <div className="mx-auto flex w-[min(100%-32px,1240px)] flex-col justify-between gap-8 border-b border-[#dce0db] pb-9 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#315be6] text-lg font-black tracking-[-.18em] text-white">
              F<span className="text-[#c9ed83]">*</span>
            </span>
            <b className="text-lg font-black tracking-[-.06em]">
              FUGTH MANAGEMENT
            </b>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-[#52636c]">
            <Link href="/login">Log in</Link>
            <Link href="/plans">Plans</Link>
            <a href="#studio">Website Studio</a>
            <a href="#platform">Platform</a>
          </div>
        </div>
        <div className="mx-auto flex w-[min(100%-32px,1240px)] justify-between pt-6 text-[10px] font-bold text-[#879198]">
          <span>FUGTH MANAGEMENT</span>
          <span>Built for the work behind the work.</span>
        </div>
      </footer>
    </main>
  );
}
