import Stripe from "stripe";
import { NextResponse } from "next/server";
import { authenticatedUser, firebaseAdmin } from "../../../../lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const priceMap = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  growth: process.env.STRIPE_GROWTH_PRICE_ID,
  elite: process.env.STRIPE_ELITE_PRICE_ID,
};
const siteUrl = "https://www.fugthmanagement.space";
export async function POST(req) {
  const user = await authenticatedUser(req);
  if (!user?.uid || !user.email) return NextResponse.json({ error: "Please sign in before selecting a plan." }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({error:"Subscription payment provider is not configured."},{status:503});
  // Do not accept payment if webhooks cannot securely activate the Firebase subscription.
  if (!process.env.STRIPE_WEBHOOK_SECRET || !(process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY))) {
    return NextResponse.json({ error: "Subscriptions are being configured. Contact support before making a payment." }, { status: 503 });
  }
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey?.startsWith("pk_")) return NextResponse.json({ error: "Secure on-site checkout is not configured yet." }, { status: 503 });
  try {
    const { planKey } = await req.json();
    const priceId = priceMap[planKey];
    if (!priceId) return NextResponse.json({ error: "Select an available subscription plan." }, { status: 400 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {apiVersion:"2024-06-20"});
    const existing = await firebaseAdmin().firestore().doc("users/"+user.uid).get();
    if (existing.data()?.billingActive) return NextResponse.json({
      error: "This account already has an active subscription. Contact support before changing plans."
    }, { status: 409 });
    const price = await stripe.prices.retrieve(priceId);
    const expectedAmounts = { starter:4900, growth:14900, elite:49900 };
    if (!price.active || price.currency !== "usd" || price.unit_amount !== expectedAmounts[planKey] ||
        price.recurring?.interval !== "month" || price.recurring?.interval_count !== 1) {
      return NextResponse.json({ error: "Subscription pricing is being verified. Please contact support." }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.uid,
      return_url: siteUrl + "/billing/return?session_id={CHECKOUT_SESSION_ID}",
      allow_promotion_codes: true,
      metadata: { userId: user.uid, planKey, email: user.email },
      subscription_data: { metadata: { userId: user.uid, planKey, email: user.email } },
    });
    return NextResponse.json({ clientSecret: session.client_secret, publishableKey });
  } catch (e) {
    console.error("Stripe checkout session error", { code: e.code || "", type: e.type || "" });
    return NextResponse.json({ error: "We could not prepare secure checkout. Please try again." }, { status: 500 });
  }
}