"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
const date = (s) => {
  if (!s) return "Awaiting payment confirmation";
  const d = new Date(s);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString()
    : "Waiting for payment confirmation";
};
export default function BillingReturn() {
  const [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true),
    [signedOut, setSignedOut] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!auth || !db) {
      setError("Customer authentication is unavailable.");
      setLoading(false);
      return;
    }
    let offDoc = () => {};
    const offAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const sessionId = new URLSearchParams(window.location.search).get(
          "session_id",
        );
        if (sessionId) {
          try {
            const token = await user.getIdToken();
            const response = await fetch("/api/billing/reconcile", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId }),
              cache: "no-store",
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok)
              setError(result.error || "The purchase is still being verified.");
          } catch {
            setError(
              "FUGTH could not check this payment yet. You can refresh safely.",
            );
          }
        }
      }
      offDoc();
      if (!user) {
        setSignedOut(true);
        setLoading(false);
        return;
      }
      setSignedOut(false);
      offDoc = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          setProfile(snap.data() || {});
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      );
    });
    return () => {
      offAuth();
      offDoc();
    };
  }, []);
  const active = profile?.billingActive === true;
  const purchased = profile?.websitePurchased === true;
  return (
    <main className="fugth-app flex min-h-screen items-center justify-center bg-white px-5 py-14 text-black">
      <section className="w-full max-w-xl rounded-[24px] border border-[#e0e8dc] bg-white p-7 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold">
          FUGTH MANAGEMENT
        </Link>
        <p className="mt-10 text-[10px] font-black uppercase tracking-[.16em] text-[#899989]">
          PURCHASE & SUBSCRIPTION STATUS
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          {active
            ? "Your subscription is active."
            : purchased
              ? "Your website purchase is confirmed."
              : "We're confirming your payment."}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#788777]">
          {active
            ? "Your payment has been verified. Your FUGTH subscription is active."
            : purchased
              ? "Your one-time website order is paid. We’ll collect your business materials before starting the 24-hour delivery target. Ongoing hosting is optional."
              : "Your payment is being checked securely. Your plan will activate as soon as confirmation is complete."}
        </p>
        {loading && (
          <p className="mt-6 text-sm text-zinc-500">
            Checking account status...
          </p>
        )}
        {signedOut && (
          <p className="mt-6 text-sm text-zinc-500">
            Sign in with the account you used at checkout to see your plan.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
          >
            {error}
          </p>
        )}
        {active && (
          <div className="mt-7 rounded-2xl bg-[#f0f5ec] p-5">
            <p className="text-sm font-black">
              {String(profile.planTier || "").toUpperCase()}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Next renewal:{" "}
              {date(profile.billingRenewsAt || profile.billingCurrentPeriodEnd)}
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-[#2d432f] px-5 py-3 text-sm font-black text-white"
          >
            Open workspace →
          </Link>
          <Link
            href="/plans"
            className="rounded-xl border border-[#e0e8dc] px-5 py-3 text-sm font-bold text-[#4e674b]"
          >
            Subscription plans
          </Link>
        </div>
        <p className="mt-6 text-xs leading-6 text-zinc-500">
          The success screen does not by itself activate service. You can return
          to this account view after webhook verification.
        </p>
      </section>
    </main>
  );
}
