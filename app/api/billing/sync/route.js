import { NextResponse } from "next/server";
import { getDocument, getFirestoreAccessToken, normalizeEmailKey, patchDocument } from "../../../../lib/server/firestore-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId, email } = await req.json();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId || !userId || !email) {
      return NextResponse.json({ synced: false, reason: "userId, email, and project id are required." }, { status: 400 });
    }

    const accessToken = await getFirestoreAccessToken();
    const record = await getDocument({
      accessToken,
      projectId,
      path: `billingCustomers/${normalizeEmailKey(email)}`,
    });

    if (!record) {
      return NextResponse.json({ synced: false, reason: "No billing record found for email." });
    }

    const payload = {
      planTier: record.planTier || "",
      planStatus: record.planStatus || "",
      billingActive: Boolean(record.billingActive),
      stripeCustomerId: record.stripeCustomerId || "",
      stripeSubscriptionId: record.stripeSubscriptionId || "",
      billingEmail: email,
      updatedAt: new Date().toISOString(),
    };

    await patchDocument({
      accessToken,
      projectId,
      path: `users/${userId}`,
      data: payload,
      updateMask: Object.keys(payload),
    });

    return NextResponse.json({ synced: true, planTier: payload.planTier, billingActive: payload.billingActive });
  } catch (error) {
    return NextResponse.json({ synced: false, error: error.message || "Billing sync failed." }, { status: 500 });
  }
}