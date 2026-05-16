import { createSign } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function getFirestoreAccessToken() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/datastore",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const tokenPayload = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || "Could not obtain Firestore access token.");
  }

  return tokenPayload.access_token;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)])),
      },
    };
  }
  return { stringValue: String(value) };
}

async function patchUserWorkspace({ userId, businessName, industry, assistantId, phoneNumber }) {
  const accessToken = await getFirestoreAccessToken();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!accessToken || !projectId) {
    return { persisted: false, reason: "Missing Firestore service account or project id." };
  }

  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=businessName&updateMask.fieldPaths=industry&updateMask.fieldPaths=assistantId&updateMask.fieldPaths=phoneNumber&updateMask.fieldPaths=voiceConfigured&updateMask.fieldPaths=updatedAt`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        businessName: toFirestoreValue(businessName),
        industry: toFirestoreValue(industry),
        assistantId: toFirestoreValue(assistantId),
        phoneNumber: toFirestoreValue(phoneNumber),
        voiceConfigured: toFirestoreValue(true),
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || "Could not persist voice setup to Firestore.");
  }

  return { persisted: true };
}

function getErrorText(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || fallback;
}

async function parseProviderResponse(response, stage) {
  const raw = await response.text();
  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload
      ? getErrorText(payload, `${stage} failed.`)
      : `${stage} failed with ${response.status}. Upstream returned non-JSON content.`;

    return {
      ok: false,
      status: response.status,
      error: detail,
      raw: raw?.slice(0, 300) || "",
      payload,
    };
  }

  if (!payload) {
    return {
      ok: false,
      status: 502,
      error: `${stage} succeeded with a non-JSON response.`,
      raw: raw?.slice(0, 300) || "",
      payload: null,
    };
  }

  return {
    ok: true,
    status: response.status,
    payload,
    raw,
  };
}

export async function GET() {
  return NextResponse.json({
    route: "setup-voice",
    ok: true,
    runtime,
    dynamic,
    hasVoicePrivateKey: Boolean(process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY),
    hasVoicePublicKey: Boolean(process.env.NEXT_PUBLIC_VOICE_PUBLIC_KEY),
    hasFirestoreServiceAccount: Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
  });
}

export async function POST(req) {
  try {
    const { userId, businessName, industry } = await req.json();
    const privateKey = process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({ error: "VOICE_PRIVATE_KEY or VAPI_PRIVATE_KEY is missing from environment variables." }, { status: 500 });
    }

    if (!userId || !businessName || !industry) {
      return NextResponse.json({ error: "userId, businessName, and industry are required." }, { status: 400 });
    }

    const systemPrompt = [
      `You are the Voice Network receptionist for ${businessName}.`,
      `Industry: ${industry}.`,
      "Sound calm, concise, and premium.",
      "Collect caller name, number, intent, and booking window when possible.",
      "If the caller describes an urgent issue, escalate according to the business emergency protocol.",
    ].join(" ");

    const assistantRes = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: `${businessName} Receptionist`,
        firstMessage: `Thanks for calling ${businessName}. How can I help you today?`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }],
        },
        voice: { provider: "playht", voiceId: "jennifer" },
        serverUrl: "https://fugthmanagement.space/api/vapi-webhook",
        metadata: { ownerId: userId, industry },
      }),
    });

    const assistantResult = await parseProviderResponse(assistantRes, "Assistant provisioning");
    if (!assistantResult.ok) {
      return NextResponse.json(
        {
          error: assistantResult.error,
          stage: "assistant",
          upstreamStatus: assistantResult.status,
          upstreamPreview: assistantResult.raw,
        },
        { status: assistantResult.status }
      );
    }

    const assistantPayload = assistantResult.payload;

    const assistantId = assistantPayload.id;
    if (!assistantId) {
      return NextResponse.json({ error: "Voice Network did not return an assistant id." }, { status: 500 });
    }

    const numberRes = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        assistantId,
        name: `${businessName} Main Line`,
      }),
    });

    const numberResult = await parseProviderResponse(numberRes, "Phone number provisioning");
    if (!numberResult.ok) {
      return NextResponse.json(
        {
          error: numberResult.error,
          stage: "phone-number",
          upstreamStatus: numberResult.status,
          upstreamPreview: numberResult.raw,
          assistantId,
        },
        { status: numberResult.status }
      );
    }

    const numberPayload = numberResult.payload;

    const phoneNumber = numberPayload.number || numberPayload.phoneNumber || numberPayload.tel || "";

    const firestoreSync = await patchUserWorkspace({
      userId,
      businessName,
      industry,
      assistantId,
      phoneNumber,
    }).catch((error) => ({ persisted: false, reason: error.message || "Firestore sync failed." }));

    return NextResponse.json({
      success: true,
      assistantId,
      phoneNumber,
      firestoreSync,
      assistant: assistantPayload,
      phoneNumberPayload: numberPayload,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Voice setup failed.", stage: "route" }, { status: 500 });
  }
}