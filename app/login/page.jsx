"use client";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!auth) {
       setError("System loading. Try again in a moment.");
       return;
    }
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err.message || "Authentication failed.").replace("Firebase: ", ""));
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="border-b border-zinc-900 p-8 sm:p-10 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Fugth Management</p>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Access the AI Business Operating System.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-zinc-400">
            Sign in to unlock the live Command Center, Business Brain, and Executive AI. If you are testing the system, create an account here and go straight into the product.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              ["Command Center", "Revenue, recordings, follow-ups, and live call outcomes."],
              ["Business Brain", "Train the AI with pricing, files, rules, and schedules."],
              ["Executive AI", "Ask questions, run campaigns, and analyze trends."],
              ["Preview Locked", "Public visitors can see the system before logging in."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-7 text-zinc-500">{copy}</p>
              </div>
            ))}
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

            <form onSubmit={handleAuth} className="mt-8 space-y-4">
              <input
                type="email"
                placeholder="Email Address"
                className="w-full rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-white focus:border-zinc-600 focus:outline-none"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                className="w-full rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-white focus:border-zinc-600 focus:outline-none"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="w-full rounded-2xl bg-white p-4 text-sm font-bold text-black transition hover:bg-zinc-200">
                {isLogin ? "Secure Login" : "Create Account"}
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
        </form>
    </div>
    </div>
  );
}
