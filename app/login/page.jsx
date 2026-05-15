"use client";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const pricingPlans = [
  {
    key: "starter",
    name: "Starter",
    price: "$49",
    note: "For solo operators getting live quickly.",
  },
  {
    key: "growth",
    name: "Growth",
    price: "$149",
    note: "Best fit for teams handling real daily volume.",
  },
  {
    key: "elite",
    name: "Elite",
    price: "$499",
    note: "Full operating-system rollout and priority service.",
  },
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState("");

  const handlePlanCheckout = async (planKey) => {
    setError("");
    setCheckoutPlan(planKey);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          email: email.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout could not be started.");
      }

      window.location.href = payload.url;
    } catch (err) {
      setError(err.message || "Checkout could not be started.");
      setCheckoutPlan("");
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    if (!auth) {
       setError("System loading. Try again in a moment.");
       return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    if (!isLogin && password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err.message || "Authentication failed.").replace("Firebase: ", ""));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border-b border-zinc-900 p-8 sm:p-10 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Fugth Management</p>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Access the AI Business Operating System.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-zinc-400">
            Create an account, choose a plan, and move straight into the live Command Center, Business Brain, and Executive AI.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              ["Command Center", "Revenue, recordings, follow-ups, and live call outcomes."],
              ["Business Brain", "Train the AI with pricing, files, rules, and schedules."],
              ["Executive AI", "Ask questions, run campaigns, and analyze trends."],
              ["Recorded Call Media", "Owners can open and listen back to recordings from the dashboard."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-black to-zinc-900 p-4 transition hover:border-zinc-600">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-7 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Pricing</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Pick your plan before you enter.</h2>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs uppercase tracking-[0.24em] text-zinc-300">Stripe Linked</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {pricingPlans.map((plan) => {
                const featured = plan.name === "Growth";
                return (
                  <div key={plan.name} className={`rounded-[1.75rem] border p-5 ${featured ? "border-zinc-500 bg-white text-black" : "border-zinc-800 bg-black/40 text-white"}`}>
                    <p className={`text-xs uppercase tracking-[0.28em] ${featured ? "text-black/60" : "text-zinc-500"}`}>{plan.name}</p>
                    <p className="mt-3 text-4xl font-black tracking-tight">{plan.price}</p>
                    <p className={`mt-3 text-sm leading-7 ${featured ? "text-black/70" : "text-zinc-400"}`}>{plan.note}</p>
                    <button
                      type="button"
                      onClick={() => handlePlanCheckout(plan.key)}
                      disabled={checkoutPlan === plan.key}
                      className={`mt-6 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${featured ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"}`}
                    >
                      {checkoutPlan === plan.key ? "Opening checkout..." : featured ? "Start 7-Day Trial" : "Choose Plan"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex items-center p-8 sm:p-10">
          <div className="w-full max-w-md">
            <div className="inline-flex rounded-full border border-zinc-800 bg-black p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm transition ${isLogin ? "bg-white text-black" : "text-zinc-400"}`}
                onClick={() => setIsLogin(true)}
                type="button"
              >
                Login
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm transition ${!isLogin ? "bg-white text-black" : "text-zinc-400"}`}
                onClick={() => setIsLogin(false)}
                type="button"
              >
                Create Account
              </button>
            </div>

            <h2 className="mt-8 text-3xl font-bold tracking-tight text-white">
              {isLogin ? "Welcome back." : "Create your client account."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {isLogin
                ? "Enter your credentials to access your AI dashboard."
                : "Create a new account to test the live dashboard and AI workflows."}
            </p>

            {error && <p className="mt-5 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</p>}

            {!error && (
              <p className="mt-5 rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-sm text-zinc-400">
                {isLogin
                  ? "Secure client access for Command Center, Business Brain, and Executive AI."
                  : "Create a test account in Firebase Auth, then you will be redirected straight into the dashboard."}
              </p>
            )}

            <form onSubmit={handleAuth} className="mt-8 space-y-4">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                className="w-full rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-white focus:border-zinc-600 focus:outline-none"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                className="w-full rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-white focus:border-zinc-600 focus:outline-none"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button disabled={isSubmitting} type="submit" className="w-full rounded-2xl bg-white p-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300">
                {isSubmitting ? "Processing..." : isLogin ? "Secure Login" : "Create Account"}
              </button>
            </form>

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="mt-4 w-full text-sm text-zinc-400 underline transition hover:text-white"
            >
              {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}