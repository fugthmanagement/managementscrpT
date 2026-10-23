"use client";
import Link from "next/link";
import {CookieSettingsButton} from "../../components/cookie-consent";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  BILLING_PLANS,
  BILLING_ADDONS,
  addonAmount,
  dollars,
  customSetupLabel,
} from "../../lib/billing-catalog";
const plans = Object.values(BILLING_PLANS);
const CART_KEY="fugth_checkout_selection_v2";
export default function Plans() {
  const [currentUser, setCurrentUser] = useState(null),
    [authReady, setAuthReady] = useState(false);
  const [selected, setSelected] = useState("growth"),
    [addons, setAddons] = useState([]),
    [cycle, setCycle] = useState("monthly");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [offer, setOffer] = useState(null),
    [readiness,setReadiness]=useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthReady(true);
    });
    const requested = new URLSearchParams(window.location.search).get("plan");
    try{
      const saved=JSON.parse(localStorage.getItem(CART_KEY)||"null");
      if(saved){
        if(BILLING_PLANS[saved.planKey])setSelected(saved.planKey);
        if(saved.cycle==="yearly")setCycle("yearly");
        if(Array.isArray(saved.addons))setAddons(saved.addons.filter(x=>x in BILLING_ADDONS));
      }
    }catch{}
    if (BILLING_PLANS[requested]) { setSelected(requested); if(BILLING_PLANS[requested].kind==="one_time")setCycle("monthly"); }
    if (new URLSearchParams(window.location.search).get("cycle") === "yearly")
      setCycle("yearly");
    return () => unsub();
  }, []);
  useEffect(() => {
    if (
      !currentUser ||
      typeof window === "undefined" ||
      new URLSearchParams(window.location.search).get("offer") !== "1"
    )
      return;
    let ignore = false;
    (async () => {
      try {
        const token = await currentUser.getIdToken();
        const r = await fetch("/api/billing/offer", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const data = await r.json();
        if (!ignore && r.ok && data.offer) {
          setOffer(data.offer);
          setSelected(data.offer.planKey);
          setCycle("monthly");
        }
      } catch {}
    })();
    return () => {
      ignore = true;
    };
  }, [currentUser]);
  useEffect(()=>{
    try{localStorage.setItem(CART_KEY,JSON.stringify({planKey:selected,cycle,addons}));}catch{}
  },[selected,cycle,addons]);
  useEffect(()=>{
    if(!currentUser){setReadiness(null);return;}
    let ignore=false;
    (async()=>{
      try{
        const token=await currentUser.getIdToken();
        const response=await fetch("/api/stripe/checkout/status",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
        const result=await response.json();
        if(!ignore)setReadiness(response.ok?result:{ready:false,issues:[{message:result.error||"Billing diagnostics unavailable."}]});
      }catch{if(!ignore)setReadiness({ready:false,issues:[{message:"Could not reach payment readiness service."}]})}
    })();
    return()=>{ignore=true;};
  },[currentUser]);
  const plan = BILLING_PLANS[selected];
  const offerApplied = Boolean(
    offer &&
      offer.planKey === selected &&
      new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      ).get("offer") === "1",
  );
  const planMonthly = offerApplied ? offer.priceCents : plan.monthly;
  const setupFee = offerApplied ? offer.setupCents : plan.setup;
  const billable = useMemo(
    () => addons.filter((a) => addonAmount(selected, a) > 0),
    [selected, addons],
  );
  const addonMonthly = billable.reduce(
    (n, a) => n + addonAmount(selected, a),
    0,
  );
  const multiplier = plan.kind === "one_time" ? 1 : cycle === "yearly" ? 12 : 1;
  const total = (planMonthly + addonMonthly) * multiplier;
  function switchPlan(key) {
    setSelected(key);
    if (BILLING_PLANS[key].kind === "one_time") setCycle("monthly");
    setAddons((v) => v.filter((a) => addonAmount(key, a) > 0));
    setError("");
  }
  function toggle(key) {
    setAddons((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      if (!currentUser){
        window.location.assign("/login?next=%2Fplans");
        return;
      }
      // Readiness is advisory and can become stale during credential rotation.
      // The authenticated POST is always authoritative and fails closed before charging.
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          planKey: selected,
          addons: billable,
          billingCycle: cycle,
          useFounderOffer: offerApplied,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(result.error || "Could not start payment.");
      if (!result.url || !result.url.startsWith("https://checkout.stripe.com/"))
        throw Error(
          "FUGTH checkout is temporarily unavailable. Please try again.",
        );
      window.location.assign(result.url);
    } catch (e) {
      setError(e.message || "FUGTH checkout unavailable.");
      setBusy(false);
    }
  }
  return (
    <main className="fugth-checkout-page min-h-screen bg-[#f4faff] text-[#152f42]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#101923]/95 text-white backdrop-blur-xl">
       <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-3 px-5">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#b9e5fb] text-xl font-black text-[#19465b]">F</span><span className="text-sm font-black">FUGTH <span className="font-medium text-[#b6d4e4]">Management</span></span></Link>
        <nav className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1.5 sm:flex"><Link href="/#platform" className="rounded-full px-4 py-2 text-xs font-bold">Platform</Link><Link href="/#studio" className="rounded-full px-4 py-2 text-xs font-bold">Website Maker</Link><a href="#packages" className="rounded-full bg-[#b9e5fb] px-4 py-2 text-xs font-black text-[#19475c]">Plans</a></nav>
        <Link href={currentUser?"/dashboard":"/login?next=%2Fplans"} className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-bold text-white">{currentUser?"My workspace ↗":"Log in ↗"}</Link>
       </div>
      </header>
      <div id="packages" className="mx-auto max-w-6xl scroll-mt-28 px-5 pb-24 pt-14">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#3c86aa]">
          PLANS + PROFESSIONAL SETUP
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.07em] sm:text-6xl">
          Build your business command center.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5d7c90]">
          Your FUGTH subscription powers the software. A separate one-time setup
          fee pays for your business-specific onboarding, receptionist
          configuration, integrations and implementation.
        </p>
        <div className="mt-7 flex w-fit rounded-xl border border-[#d3e6f1] bg-white p-1">
          <button
            type="button"
            aria-pressed={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
            className={
              "rounded-lg px-5 py-3 text-xs font-bold " +
              (cycle === "monthly"
                ? "bg-[#234d67] text-white"
                : "text-[#657f91]")
            }
          >
            Monthly billing
          </button>
          <button
            type="button"
            aria-pressed={cycle === "yearly"}
            disabled={plan.kind === "one_time"}
            onClick={() => setCycle("yearly")}
            className={
              "rounded-lg px-5 py-3 text-xs font-bold " +
              (cycle === "yearly"
                ? "bg-[#234d67] text-white"
                : "text-[#657f91]")
            }
          >
            Yearly billing
          </button>
        </div>
        <p className="mt-2 text-xs text-[#7d98a8]">
          Annual billing is twelve monthly payments in one yearly charge;
          one-time website purchases never renew.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.key}
              data-selected={selected === p.key}
              className={
                "flex flex-col rounded-[24px] border p-6 sm:p-7 " +
                (selected === p.key
                  ? "border-[#498fb7] bg-[#173344] text-white shadow-xl"
                  : "border-[#dce9f2] bg-white text-[#1a3446]")
              }
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {p.key === "growth" && (
                  <span className="rounded-full border border-current/30 px-3 py-1.5 text-[10px] font-bold">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-3 min-h-[72px] text-sm leading-6 opacity-80">
                {p.description}
              </p>
              <p className="mt-4">
                <strong className="text-5xl tracking-tight">
                  {dollars(
                    (offerApplied && p.key === selected
                      ? planMonthly
                      : p.monthly) * (p.kind === "one_time" ? 1 : multiplier),
                  )}
                </strong>
                <span className="ml-2 text-xs opacity-70">
                  {p.kind === "one_time"
                    ? "one-time"
                    : "/ " + (cycle === "yearly" ? "year" : "month")}
                </span>
                {p.regularMonthly && (
                  <p className="mt-2 text-xs opacity-80">
                    Founding rate · standard {dollars(p.regularMonthly)}/month
                  </p>
                )}
              </p>
              <p className="mt-3 rounded-xl border border-current/20 p-3 text-sm">
                <strong>
                  {dollars(
                    offerApplied && p.key === selected ? setupFee : p.setup,
                  )}
                </strong>{" "}
                {p.setup === 0 ? "included setup" : "one-time setup"}
              </p>
              <ul className="my-6 flex-1 space-y-2 border-t border-current/20 pt-5 text-xs leading-6">
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => switchPlan(p.key)}
                className={
                  "rounded-xl px-5 py-4 text-sm font-semibold " +
                  (selected === p.key
                    ? "bg-white text-[#173344]"
                    : "bg-[#e5f5ff] text-[#1d6489]")
                }
              >
                {selected === p.key ? "Selected ✓" : "Choose " + p.name + " ↗"}
              </button>
            </article>
          ))}
        </div>
        {plan.kind !== "one_time" && plan.key !== "website" && (
          <section className="mt-10 rounded-[24px] border border-[#d9e8f1] bg-white p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#5b8dab]">
              FLEXIBLE ADD-ONS
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Customize your {plan.name} plan.
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-[#71899b]">
              Mid and High include more features by default. Buying several
              Low-plan upgrades can cost more than moving up to Mid or High.
              Voice minutes, text messages and other third-party usage have
              separate fair-use limits.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {Object.entries(BILLING_ADDONS).map(([key, item]) => {
                const price = addonAmount(selected, key),
                  included = price === 0,
                  checked = included || addons.includes(key);
                return (
                  <label
                    key={key}
                    className={
                      "flex items-start justify-between gap-3 rounded-xl border p-4 " +
                      (included
                        ? "border-[#cfe7f5] bg-[#edf9ff]"
                        : "border-[#dceaf3]")
                    }
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={included}
                        onChange={() => toggle(key)}
                        className="mt-1 h-4 w-4 accent-[#245c7a]"
                      />
                      <span>
                        <strong className="block text-sm">{item.name}</strong>
                        <span className="mt-1 block text-xs leading-5 text-[#7c95a5]">
                          {item.description}
                        </span>
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#235d7a]">
                      {included
                        ? "Included"
                        : "+" +
                          dollars(price * multiplier) +
                          "/" +
                          (cycle === "yearly" ? "yr" : "mo")}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-5 text-xs leading-6 text-[#849bac]">
              {customSetupLabel} Extra implementation or usage beyond your
              chosen package requires a separate quote.
            </p>
          </section>
        )}
        <section className="mt-8 grid gap-6 rounded-[24px] border border-[#cee3f0] bg-[#e8f6ff] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#3c83a9]">
              YOUR CHECKOUT SUMMARY
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {plan.name} + {billable.length} paid add-on(s)
            </h2>
            <p className="mt-3 text-sm">
              {plan.kind === "one_time" ? "One-time purchase" : "Subscription"}:{" "}
              <strong>
                {dollars(total)}{" "}
                {plan.kind === "one_time"
                  ? "once"
                  : "/ " + (cycle === "yearly" ? "year" : "month")}
              </strong>
            </p>
            <p className="mt-1 text-sm">
              One-time professional setup: <strong>{dollars(setupFee)}</strong>
            </p>
            <p className="mt-2 text-lg font-bold">
              {offerApplied &&
              offer?.requestedBillingAt &&
              plan.kind !== "one_time"
                ? "Initial charge: Stripe will show prorated subscription charges plus " +
                  dollars(setupFee) +
                  " setup before you approve."
                : "First checkout: " +
                  dollars(setupFee + total) +
                  " before tax or discounts."}
            </p>
            <p className="mt-3 max-w-xl text-xs leading-6 text-[#5d7f92]">
              {plan.kind === "one_time"
                ? "Website purchase does not renew. Hosting and ongoing updates are separate. Delivery begins after the required business materials are provided."
                : "Subscriptions renew " +
                  (cycle === "yearly" ? "yearly" : "monthly") +
                  " until canceled. Setup is billed once. Voice/SMS usage has plan limits; no surprise overage charges without authorization."}{" "}
              A personalized founder price is only applied when explicitly
              displayed in this checkout summary.
            </p>
          </div>
          <div className="w-full lg:w-[250px]">
            <button
              type="button"
              disabled={!authReady || busy}
              onClick={checkout}
              className="w-full rounded-xl bg-[#16384c] px-6 py-4 text-sm font-bold text-white disabled:opacity-45"
            >
              {busy ? "Opening payment…" : !currentUser ? "Sign in to complete checkout ↗" : "Continue to secure checkout ↗"}
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#6d8999]">By proceeding you agree to the <Link className="font-bold underline" href="/terms">Terms</Link> and acknowledge the <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>.</p>
            {error&&<p role="alert" className="mt-3 rounded-xl border border-[#e7bdb9] bg-[#fff5f2] p-3 text-xs font-bold leading-5 text-[#9a4b37]">{error}</p>}
            {!currentUser && authReady && (
              <Link
                href="/login?next=%2Fplans"
                className="mt-3 block text-center text-xs font-semibold underline"
              >
                Log in to subscribe
              </Link>
            )}
          </div>
        </section>
        {readiness?.ready===false&&<div role="alert" className="mt-5 rounded-2xl border border-[#e6c9a0] bg-[#fff7e9] p-5 text-sm text-[#7b511d]"><p className="font-black">Secure checkout needs attention</p><p className="mt-2 text-xs leading-6">Your selected package is saved in this browser. No charge will start until these requirements are resolved:</p><ul className="mt-3 space-y-1">{readiness.issues?.map((issue,i)=><li key={issue.code||i} className="text-xs leading-6">• {issue.message}</li>)}</ul><p className="mt-3 text-xs">Contact <a href="mailto:fugthmanagement@gmail.com" className="font-bold underline">FUGTH support</a> or, if you're the founder, open Administration → Billing health for configuration diagnostics.</p></div>}
        {readiness?.ready===true&&<p role="status" className="mt-5 rounded-xl border border-[#bbdec3] bg-[#f1fbf4] p-4 text-xs font-bold text-[#366444]">Merchant and account setup checks passed. Stripe will confirm any payment before FUGTH activates the plan.</p>}
        {offerApplied && (
          <p className="mt-4 rounded-xl border border-[#d4c6ad] bg-[#fff5e5] p-4 text-sm">
            <strong>Personalized offer for your account.</strong> Price{" "}
            {dollars(planMonthly)}{" "}
            {plan.kind === "one_time" ? "once" : "/month"} plus{" "}
            {dollars(setupFee)} setup. Your offer expires{" "}
            {new Date(offer.expiresAt).toLocaleDateString()}.{" "}
            {offer.requestedBillingAt && plan.kind !== "one_time"
              ? "Full subscription renewals start " +
                new Date(offer.requestedBillingAt).toLocaleString() +
                ". Stripe will display the prorated first invoice and setup fee before payment."
              : ""}
          </p>
        )}
        <p className="mt-6 text-xs text-[#8298a7]">
          24-hour limited-credit trials are planned separately and will pause
          when the time or credit allowance ends, whichever comes first. Trial
          access does not auto-charge customers.
        </p>
      </div>
      <footer className="border-t border-[#d9e8f2] bg-white px-5 py-8"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 text-xs text-[#6a8394]"><span>FUGTH Chat LLC · Florida operations, United States</span><nav className="flex flex-wrap gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link><CookieSettingsButton className="underline"/><a href="mailto:fugthmanagement@gmail.com">Billing support</a></nav></div></footer>
    </main>
  );
}
