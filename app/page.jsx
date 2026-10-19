"use client";

import Link from "next/link";
import { useState } from "react";
import {getIndustryPhotos} from "../lib/site-images";

const productAreas = [
  [
    "01",
    "Calls",
    "Test the receptionist, review recordings, read transcripts, and move every useful conversation forward.",
  ],
  [
    "02",
    "Customers",
    "Keep caller details, leads, notes, follow-ups, and appointments in one working list.",
  ],
  [
    "03",
    "Marketing",
    "Prepare outreach, organize prospects, and keep the next action visible without a separate maze of tools.",
  ],
  [
    "04",
    "Website",
    "Build, preview, save, and publish a business website from the same account that manages the business.",
  ],
];

const workflow = [
  [
    "A call comes in",
    "Your FUGTH number answers with the business details you approved.",
  ],
  [
    "The request becomes a record",
    "The caller, reason, transcript, summary, and booking details stay together.",
  ],
  [
    "You decide what happens next",
    "Follow up, save the customer, review the appointment, or update the website.",
  ],
];

const plans = [
  ["Low", "$49", "A focused starting point for one business."],
  ["Mid", "$149", "The complete operating workspace for a growing team."],
  ["High", "$499", "More automation, access, and hands-on support."],
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardPhoto=getIndustryPhotos("contractor")[1]||getIndustryPhotos("roofing")[0];

  return (
    <main className="fugth-app min-h-screen bg-white text-black">
      <header className="fugth-topbar sticky top-0 z-40 border-b border-black bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:h-20 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="FUGTH Management home"
          >
            <span className="grid h-9 w-9 place-items-center border border-black text-sm font-black">
              F
            </span>
            <span className="text-sm font-black uppercase tracking-[.18em]">
              FUGTH Management
            </span>
          </Link>
          <p className="hidden text-[10px] font-black uppercase tracking-[.24em] text-zinc-500 lg:block">Business operations system</p>
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="px-4 py-3 text-xs font-bold uppercase tracking-[.12em]"
            >
              Log in
            </Link>
            <Link
              href="/login?signup=1"
              className="fugth-topbar-cta border border-black px-4 py-3 text-xs font-bold uppercase tracking-[.12em]"
            >
              Create account
            </Link>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center border border-black sm:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            {menuOpen ? "×" : "≡"}
          </button>
        </div>
        {menuOpen ? (
          <nav className="grid border-t border-black px-4 py-4 text-sm font-bold sm:hidden">
            {[
              ["Platform", "#platform"],
              ["Workflow", "#workflow"],
              ["Website Studio", "#studio"],
              ["Plans", "#plans"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-black py-4"
              >
                {label}
              </a>
            ))}
            <Link href="/login" className="py-4">
              Log in
            </Link>
          </nav>
        ) : null}
      </header>

      <section className="fugth-home-hero border-b border-black">
        <nav className="fugth-center-tabs" aria-label="FUGTH sections">
          <a className="is-active" href="#platform">Overview</a>
          <a href="#workflow">Calls & leads</a>
          <a href="#studio">Website maker</a>
          <a href="#plans">Plans</a>
          <a href="#workflow">How it works</a>
        </nav>
        <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[1440px] lg:grid-cols-[1.1fr_.9fr]">
          <div className="flex flex-col justify-between border-black px-4 py-12 sm:px-8 sm:py-16 lg:border-r lg:px-12 lg:py-20">
            <p className="text-xs font-bold uppercase tracking-[.2em]">
              Business management, without the clutter.
            </p>
            <div className="my-16 max-w-5xl lg:my-24">
              <h1 className="text-[clamp(3.8rem,9vw,8.6rem)] font-black leading-[.82] tracking-[-.085em]">
                One place.
                <br />
                Every next step.
              </h1>
              <p className="mt-10 max-w-2xl text-base leading-8 sm:text-lg">
                FUGTH brings calls, customers, appointments, outreach, and your
                business website into one direct workspace.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?signup=1"
                className="flex min-h-14 items-center justify-between border border-black px-5 text-sm font-bold sm:min-w-64"
              >
                Start your workspace <Arrow />
              </Link>
              <a
                href="#platform"
                className="flex min-h-14 items-center justify-between border border-black px-5 text-sm font-bold sm:min-w-56"
              >
                See the platform <Arrow />
              </a>
            </div>
          </div>
          <div className="fugth-preview-shell border-t border-black lg:border-t-0">
            <div className="flex items-center justify-between border-b border-black px-5 py-4 text-xs font-bold uppercase tracking-[.14em] sm:px-8"><span>FUGTH / Live desk</span><span className="fugth-status-dot">Today</span></div>
            <div className="p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3"><article className="fugth-metric"><span>Missed calls</span><strong>03</strong><small>Need a callback</small></article><article className="fugth-metric fugth-metric-blue"><span>New leads</span><strong>12</strong><small>+4 this week</small></article><article className="fugth-metric"><span>Booked</span><strong>06</strong><small>Next 7 days</small></article></div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[.92fr_1.08fr]">
                <section className="fugth-call-card"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.16em]">Needs attention</p><span className="fugth-status-dot">Live</span></div><h2>Missed call from<br/><span>(305) 555-0194</span></h2><p>“Need an estimate for a roof repair this week.”</p><div className="mt-5 flex gap-2"><button type="button">Call back</button><button type="button" className="fugth-quiet-button">View lead</button></div></section>
                <section className="fugth-photo-card"><img src={dashboardPhoto?.src} alt={dashboardPhoto?.alt||"A local contractor at work"}/><div><p>Website activity</p><strong>7 visitors asked about estimates</strong><span>Today · Your website works with your calls</span></div></section>
              </div>
              <section className="fugth-lead-list mt-4"><div className="flex items-center justify-between"><p>Recent lead activity</p><button type="button">Open all</button></div><div><span className="fugth-avatar">JM</span><p><strong>Jordan Mitchell</strong><small>Requested a repair estimate</small></p><em>New</em></div><div><span className="fugth-avatar fugth-avatar-blue">SC</span><p><strong>Sarah Collins</strong><small>Asked to reschedule an appointment</small></p><em>2m</em></div></section>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-b border-black">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
            <p className="text-xs font-bold uppercase tracking-[.2em]">
              The full platform
            </p>
            <div>
              <h2 className="max-w-5xl text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl lg:text-8xl">
                Built around the work you actually do.
              </h2>
              <p className="mt-8 max-w-2xl text-base leading-8">
                No decorative dashboard. No disconnected feature pile. Each part
                of the workspace leads to a concrete business action.
              </p>
            </div>
          </div>
          <div className="mt-16 grid border-l border-t border-black sm:grid-cols-2 lg:grid-cols-4">
            {productAreas.map(([number, title, copy]) => (
              <article
                key={title}
                className="min-h-72 border-b border-r border-black p-6 sm:p-8"
              >
                <p className="text-xs font-bold">{number}</p>
                <h3 className="mt-16 text-3xl font-black tracking-[-.05em]">
                  {title}
                </h3>
                <p className="mt-5 text-sm leading-7">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-black">
        <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[.72fr_1.28fr]">
          <div className="border-black px-4 py-20 sm:px-8 lg:border-r lg:px-12 lg:py-28">
            <p className="text-xs font-bold uppercase tracking-[.2em]">
              How it works
            </p>
            <h2 className="mt-8 text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl">
              From hello to handled.
            </h2>
          </div>
          <div className="border-t border-black lg:border-t-0">
            {workflow.map(([title, copy], index) => (
              <article
                key={title}
                className="grid gap-6 border-b border-black px-4 py-10 last:border-b-0 sm:grid-cols-[70px_1fr] sm:px-8 lg:px-12"
              >
                <p className="text-xs font-bold">0{index + 1}</p>
                <div>
                  <h3 className="text-2xl font-black tracking-[-.04em]">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="studio" className="border-b border-black">
        <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-2">
          <div className="border-black px-4 py-20 sm:px-8 lg:border-r lg:px-12 lg:py-28">
            <p className="text-xs font-bold uppercase tracking-[.2em]">
              Website Studio
            </p>
            <h2 className="mt-8 text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl">
              Your public site and private tools, connected.
            </h2>
            <p className="mt-8 max-w-xl text-base leading-8">
              Choose a real layout, edit the content, manage the images, preview
              every breakpoint, and publish when the business is ready.
            </p>
            <Link
              href="/login"
              className="mt-10 inline-flex min-h-14 items-center gap-16 border border-black px-5 text-sm font-bold"
            >
              Open Website Studio <Arrow />
            </Link>
          </div>
          <div className="border-t border-black p-4 sm:p-8 lg:border-t-0 lg:p-12">
            <div className="border border-black">
              <div className="flex items-center justify-between border-b border-black px-4 py-3 text-[10px] font-bold uppercase tracking-[.16em]">
                <span>Desktop preview</span>
                <span>Draft saved</span>
              </div>
              <div className="grid sm:grid-cols-[160px_1fr]">
                <div className="border-b border-black p-4 sm:border-b-0 sm:border-r">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em]">
                    Layout
                  </p>
                  {["Service Pro", "Care Pro", "Studio Pro"].map(
                    (name, index) => (
                      <div
                        key={name}
                        className={`mt-4 border border-black p-3 text-xs font-bold ${index === 0 ? "underline underline-offset-4" : ""}`}
                      >
                        {name}
                      </div>
                    ),
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between border-b border-black p-4">
                    <b>North Star Electric</b>
                    <span className="text-xs">Menu</span>
                  </div>
                  <div className="p-6 sm:p-10">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em]">
                      Electrical work, clearly done
                    </p>
                    <p className="mt-6 text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl">
                      Powering the places that matter.
                    </p>
                    <div className="mt-8 inline-block border border-black px-4 py-3 text-xs font-bold">
                      Request an estimate
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-t border-black">
                    <div className="h-20 border-r border-black" />
                    <div className="h-20 border-r border-black" />
                    <div className="h-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="border-b border-black">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em]">
                Plans
              </p>
              <h2 className="mt-6 text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl">
                Start where you are.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7">
              Choose the level that fits now. The workspace stays familiar as
              the business grows.
            </p>
          </div>
          <div className="mt-14 grid border-l border-t border-black lg:grid-cols-3">
            {plans.map(([name, price, copy]) => (
              <article
                key={name}
                className="flex min-h-96 flex-col border-b border-r border-black p-6 sm:p-8"
              >
                <p className="text-xs font-bold uppercase tracking-[.16em]">
                  {name}
                </p>
                <p className="mt-10 text-6xl font-black tracking-[-.08em]">
                  {price}
                </p>
                <p className="mt-2 text-xs">per month</p>
                <p className="mt-8 max-w-sm text-sm leading-7">{copy}</p>
                <Link
                  href="/plans"
                  className="mt-auto flex items-center justify-between border-t border-black pt-5 text-sm font-bold"
                >
                  View {name} <Arrow />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-black">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:flex-row lg:items-end lg:px-12">
          <h2 className="max-w-5xl text-5xl font-black leading-[.88] tracking-[-.07em] sm:text-7xl lg:text-8xl">
            Run the business.
            <br />
            Keep the work clear.
          </h2>
          <Link
            href="/login?signup=1"
            className="flex min-h-16 shrink-0 items-center gap-16 border border-black px-6 text-sm font-bold"
          >
            Create your account <Arrow />
          </Link>
        </div>
      </section>
      <footer className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-6 px-4 py-8 text-xs font-bold uppercase tracking-[.12em] sm:flex-row sm:px-8 lg:px-12">
        <span>FUGTH Management</span>
        <div className="flex flex-wrap gap-5">
          <Link href="/login">Log in</Link>
          <Link href="/plans">Plans</Link>
          <a href="#studio">Website Studio</a>
        </div>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
