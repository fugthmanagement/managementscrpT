"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { detectIndustry } from "../../lib/site-presets";
import {getIndustryPhotos} from "../../lib/site-images";
const safeNext=(fallback)=>{if(typeof window==="undefined")return fallback;const next=new URLSearchParams(window.location.search).get("next");return next==="/plans"?"/plans":fallback;};
const field =
  "mt-2 w-full rounded-xl border border-[#d2e4ef] bg-white px-4 py-3.5 text-[15px] text-[#183b52] outline-none focus:border-[#66b8e5] focus:ring-2 focus:ring-[#e2f5ff]";

export default function Login() {
  const [mode, setMode] = useState("login"),
    [businessName, setBusinessName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("signup"))
      setMode("signup");
    if (!auth) return;
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await completeGoogleLogin(result.user);
          window.location.replace(safeNext("/dashboard"));
        }
      })
      .catch((error) => setError(googleMessage(error)));
  }, []);
  function googleMessage(error) {
    const code = String(error?.code || "");
    if (code === "auth/unauthorized-domain")
      return "Google sign-in is blocked for this website domain. Add fugthmanagement.space and www.fugthmanagement.space under Firebase Authentication → Settings → Authorized domains.";
    if (code === "auth/operation-not-allowed")
      return "Google sign-in is not enabled in Firebase Authentication → Sign-in method for this project.";
    if (
      code === "auth/invalid-api-key" ||
      code === "auth/configuration-not-found"
    )
      return "FUGTH's production Google login configuration does not match the Firebase project.";
    if (code === "auth/account-exists-with-different-credential")
      return "This email already has a different sign-in method. Log in using your original method to preserve your business account.";
    if (code === "auth/popup-closed-by-user")
      return "Google sign-in was cancelled before completion.";
    if (code === "auth/popup-blocked")
      return "Your browser blocked the Google sign-in window. Allow popups for FUGTH and retry.";
    if (code === "auth/network-request-failed")
      return "Google sign-in couldn't connect. Check your network and try again.";
    if (code === "auth/cancelled-popup-request")
      return "Another Google sign-in request interrupted this one. Try once more.";
    return (
      "Google sign-in failed (" +
      (code || "connection") +
      "). Check your Firebase authorized domain and try again."
    );
  }
  async function completeGoogleLogin(current) {
    if (!db || !current?.uid) return;
    const ref = doc(db, "users", current.uid);
    try {
      const existing = await getDoc(ref);
      if (!existing.exists())
        await setDoc(
          ref,
          {
            businessName:
              businessName.trim() ||
              (current.displayName
                ? current.displayName.slice(0, 60) + " Business"
                : "My business"),
            businessType: detectIndustry(businessName || "local business"),
            email: current.email || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            signInMethod: "google",
          },
          { merge: true },
        );
      else if (!existing.data()?.email && current.email) {
        await setDoc(
          ref,
          { email: current.email, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }
    } catch {
      /* The dashboard will still load and can finish account setup. */
    }
  }
  async function googleLogin() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!auth) throw Error("FUGTH sign-in isn't available.");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        const result = await signInWithPopup(auth, provider);
        await completeGoogleLogin(result.user);
        window.location.replace(safeNext("/dashboard"));
      } catch (error) {
        if (
          [
            "auth/popup-blocked",
            "auth/operation-not-supported-in-this-environment",
          ].includes(error.code)
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw error;
      }
    } catch (error) {
      setError(googleMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!auth) throw Error("Sign in is temporarily unavailable.");
      const address = email.trim();
      if (password.length < 6)
        throw Error("Enter a password of at least six characters.");
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, address, password);
        window.location.replace(safeNext("/dashboard"));
        return;
      }
      const created = await createUserWithEmailAndPassword(
        auth,
        address,
        password,
      );
      try {
        if (db)
          await setDoc(
            doc(db, "users", created.user.uid),
            {
              businessName: businessName.trim(),
              businessType: detectIndustry(businessName),
              email: address,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
      } catch {
        /* Account was created; dashboard can finish workspace setup. */
      }
      try {
        const token = await created.user.getIdToken();
        await Promise.allSettled([
          fetch("/api/sites/" + encodeURIComponent(created.user.uid), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ action: "initialize" }),
          }),
          fetch("/api/account-number", {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
          }),
        ]);
      } catch {
        /* Provisioning retries from workspace when configured. */
      }
      window.location.replace(safeNext("/plans"));
    } catch (err) {
      const text = String(err?.code || err?.message || "Could not sign in");
      setError(
        text.includes("auth/email-already-in-use")
          ? "An account already exists with this email. Please log in."
          : text.includes("auth/invalid-credential")
            ? "The email or password is incorrect."
            : text.includes("auth/weak-password")
              ? "Choose a stronger password."
              : text.includes("auth/too-many-requests")
                ? "Too many attempts. Try again later."
                : "FUGTH sign-in could not be completed. Check your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setError("");
    setNotice("");
    if (!auth || !email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(
        "If an account exists with this email, password-reset instructions are on the way.",
      );
    } catch {
      setNotice(
        "If an account exists with this email, you'll receive reset instructions.",
      );
    }
  }
  return (
    <main className="fugth-login min-h-screen bg-[#f2f9fd] text-[#193348]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#101923]/95 text-white backdrop-blur-xl">
       <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#b9e5fb] text-xl font-black text-[#17435b]">F</span><span className="text-sm font-black tracking-tight">FUGTH <span className="font-medium text-[#a8c8d9]">Management</span></span></Link>
        <nav className="hidden items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1.5 md:flex" aria-label="FUGTH navigation"><Link href="/#platform" className="rounded-full px-4 py-2.5 text-xs font-bold text-[#d8e8f3] hover:bg-white/15">Platform</Link><Link href="/#studio" className="rounded-full px-4 py-2.5 text-xs font-bold text-[#d8e8f3] hover:bg-white/15">Website Maker</Link><Link href="/plans" className="rounded-full px-4 py-2.5 text-xs font-bold text-[#d8e8f3] hover:bg-white/15">Plans</Link></nav>
        <Link href="/" className="rounded-full border border-white/25 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10">← Home</Link>
       </div>
      </header>
      <div className="mx-auto grid max-w-6xl items-stretch gap-8 px-5 pb-14 pt-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:pb-20 lg:pt-12">
        <aside className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-[28px] border border-[#1f445b] bg-[#142636] px-12 py-14 text-white shadow-[0_24px_60px_rgba(30,75,115,.12)] lg:flex">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.25em]">
              FUGTH / YOUR BUSINESS DESK
            </p>
            <h1 className="mt-12 max-w-md text-[64px] font-semibold leading-[1.02] tracking-[-.08em]">
              Run the business.
              <br />
              Make every call count.
            </h1>
            <p className="mt-9 max-w-sm text-[15px] leading-8 text-[#bdcfdb]">
              Calls, customers, appointments, outreach, and your website—kept
              together without the clutter.
            </p>
          </div>
          <div className="relative z-10 my-6 h-[185px] overflow-hidden rounded-2xl border border-white/15 bg-[#2b576d]"><img src={(getIndustryPhotos("contractor")[1]||getIndustryPhotos("roofing")[0])?.src} alt="Professional trade work showing FUGTH's service-business focus" className="h-full w-full object-cover" loading="lazy"/><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f2534]/95 via-[#0f2534]/50 to-transparent p-4 pt-14"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b9e5fb]">Your day keeps moving</p><p className="mt-1 text-sm font-bold">Make room for every next customer.</p></div></div>
          <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
            {["Stay connected", "Stay organized", "Look your best"].map(
              (x, i) => (
                <div
                  key={x}
                  className="min-h-32 rounded-xl border border-[#3d5c71] bg-[#203c50]/80 p-4"
                >
                  <p className="text-[10px]">0{i + 1}</p>
                  <p className="mt-6 text-xs font-semibold leading-5">{x}</p>
                </div>
              ),
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 -z-0 h-56 bg-gradient-to-t from-[#32637d]/60 via-[#32637d]/10 to-transparent"/><span aria-hidden="true" className="absolute -right-20 top-10 h-64 w-64 rounded-full border-[40px] border-[#9bdcfb]/10"/></aside>
        <section className="flex min-h-[570px] flex-col justify-center rounded-[28px] border border-[#cde3f1] bg-white shadow-[0_22px_55px_rgba(26,73,111,.08)] p-6 sm:p-10 lg:p-12">
          <div className="relative mb-7 overflow-hidden rounded-2xl bg-[#173449] px-5 py-6 text-white lg:hidden">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full border-[30px] border-[#b9e5fb]/10"/>
            <p className="relative text-[10px] font-black uppercase tracking-[.18em] text-[#b9e5fb]">Your business deserves a better desk</p>
            <h2 className="relative mt-2 max-w-sm text-2xl font-black leading-tight tracking-tight">Calls. Leads. Your website.<br/><span className="text-[#b9e5fb]">All connected.</span></h2>
          </div>
          <div className="mb-9 inline-flex w-fit gap-1 rounded-xl bg-[#edf8ff] p-1">
            <button
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-lg px-5 py-2.5 text-xs font-semibold ${mode === "login" ? "bg-[#17384d] text-white" : "text-[#60829a]"}`}
            >
              Log in
            </button>
            <button
              type="button"
              aria-pressed={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`rounded-lg px-5 py-2.5 text-xs font-semibold ${mode === "signup" ? "bg-[#17384d] text-white" : "text-[#60829a]"}`}
            >
              Create account
            </button>
          </div>
          <h2 className="text-[36px] font-semibold tracking-[-.07em] sm:text-[46px]">
            {mode === "login" ? "Welcome back." : "Start something good."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#638398]">
            {mode === "login"
              ? "Pick up right where your business left off."
              : "A workspace of your own, built in just a few steps."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <label className="block text-xs font-semibold text-[#385b71]">
                Business name
                <input
                  required
                  maxLength={80}
                  autoComplete="organization"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className={field}
                />
              </label>
            )}
            <label className="block text-xs font-semibold text-[#566857]">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className={field}
              />
            </label>
            <label className="block text-xs font-semibold text-[#566857]">
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={field}
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[#f0d8c8] bg-[#fff6ef] p-4 text-sm text-[#965c3b]"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-xl border border-[#d9e7d4] bg-[#f3f8ef] p-4 text-sm text-[#54724e]"
              >
                {notice}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#17384d] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#2e627f] disabled:opacity-50"
            >
              {busy
                ? "One moment…"
                : mode === "login"
                  ? "Log in to FUGTH →"
                  : "Create my account →"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e6e9e1]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8da5b4]">
              or continue with
            </span>
            <div className="h-px flex-1 bg-[#e6e9e1]" />
          </div>
          <button
            type="button"
            onClick={googleLogin}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#d6e2d2] bg-[#f4faff] px-6 py-4 text-sm font-bold text-[#245d7d] transition hover:border-[#9bb798] hover:bg-[#e6f5ff] disabled:opacity-50"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-white text-base font-black text-[#4673c2]">
              G
            </span>
            Continue with Google
          </button>
          <p className="mt-3 text-xs leading-6 text-[#738e9f]">
            After sign-in, connect your FUGTH business calendar in Settings to
            approve appointment syncing. Your login alone never grants access to
            private calendar events.
          </p>
          {mode === "login" && (
            <button
              type="button"
              onClick={reset}
              className="mt-5 self-start text-xs font-semibold text-[#417e9e] underline underline-offset-4"
            >
              Forgot your password?
            </button>
          )}
          <p className="mt-10 border-t border-[#e1edf5] pt-6 text-xs leading-6 text-[#7e94a3]">
            Your workspace belongs to you. Please review our <Link href="/terms" className="font-bold underline">Terms</Link> and <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
