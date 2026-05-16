import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

const priceMap = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  growth: process.env.STRIPE_GROWTH_PRICE_ID,
  elite: process.env.STRIPE_ELITE_PRICE_ID,
};

export async function POST(req) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is missing." }, { status: 500 });
    }

    const { planKey, userId, email } = await req.json();
    const priceId = priceMap[planKey];

    if (!planKey || !priceId) {
      return NextResponse.json({ error: "Valid planKey and Stripe price id are required." }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${origin}/dashboard?checkout=success&plan=${encodeURIComponent(planKey)}`;
    const cancelUrl = `${origin}/dashboard?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: userId || email || planKey,
      customer_email: email || undefined,
      metadata: {
        planKey,
        userId: userId || "",
        email: email || "",
      },
      subscription_data: {
        metadata: {
          planKey,
          userId: userId || "",
          email: email || "",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Checkout session creation failed." }, { status: 500 });
  }
}