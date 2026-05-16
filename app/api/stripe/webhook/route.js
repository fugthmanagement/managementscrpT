import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createDocument, getDocument, getFirestoreAccessToken, normalizeEmailKey, patchDocument } from "../../../../lib/server/firestore-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

function getProjectId() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing.");
  return projectId;
}

async function upsertPlan({ planKey, status, userId, email, customerId, subscriptionId }) {
  const accessToken = await getFirestoreAccessToken();
  const projectId = getProjectId();
  const now = new Date().toISOString();
  const emailKey = email ? normalizeEmailKey(email) : null;
  const payload = {
    planTier: planKey || "",
    planStatus: status,
    billingActive: status === "active" || status === "trialing",
    stripeCustomerId: customerId || "",
    stripeSubscriptionId: subscriptionId || "",
    billingEmail: email || "",
    updatedAt: now,
  };

  if (userId) {
    await patchDocument({
      accessToken,
      projectId,
      path: `users/${userId}`,
      data: payload,
      updateMask: Object.keys(payload),
    });
  }

  if (emailKey) {
    const existing = await getDocument({ accessToken, projectId, path: `billingCustomers/${emailKey}` });
    const method = existing ? patchDocument : createDocument;
    await method({
      accessToken,
      projectId,
      path: existing ? `billingCustomers/${emailKey}` : "billingCustomers",
      documentId: existing ? undefined : emailKey,
      data: {
        ...payload,
        userId: userId || existing?.userId || "",
      },
      updateMask: existing ? [...Object.keys(payload), "userId"] : undefined,
    });
  }
}

export async function POST(req) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is missing." }, { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Stripe webhook secret is missing." }, { status: 500 });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await upsertPlan({
        planKey: session.metadata?.planKey || "",
        status: session.payment_status === "paid" ? "active" : session.payment_status || "pending",
        userId: session.metadata?.userId || "",
        email: session.customer_details?.email || session.metadata?.email || "",
        customerId: session.customer || "",
        subscriptionId: session.subscription || "",
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object;
      await upsertPlan({
        planKey: subscription.metadata?.planKey || "",
        status: subscription.status,
        userId: subscription.metadata?.userId || "",
        email: subscription.metadata?.email || "",
        customerId: subscription.customer || "",
        subscriptionId: subscription.id,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      await upsertPlan({
        planKey: "",
        status: "cancelled",
        userId: subscription.metadata?.userId || "",
        email: subscription.metadata?.email || "",
        customerId: subscription.customer || "",
        subscriptionId: subscription.id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Stripe webhook failed." }, { status: 500 });
  }
}