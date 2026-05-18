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
    throw new Error("FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required for webhook ingestion.");
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
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
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

function toFirestoreDocument(data) {
  return {
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])),
  };
}

async function writeDocument({ accessToken, projectId, path, data, documentId }) {
  const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toFirestoreDocument(data)),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Firestore write failed for ${path}.`);
  }

  return payload;
}

function extractOwnerId(payload) {
  const message = payload.message || payload;
  return (
    message.metadata?.ownerId ||
    message.call?.metadata?.ownerId ||
    message.assistant?.metadata?.ownerId ||
    payload.metadata?.ownerId ||
    payload.ownerId ||
    null
  );
}

function extractCall(payload) {
  const message = payload.message || payload;
  return message.call || payload.call || message || {};
}

function normalizeTranscript(transcript) {
  if (!transcript) return "";
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) {
    return transcript
      .map((entry) => {
        if (typeof entry === "string") return entry;
        const speaker = entry.role || entry.speaker || entry.name || "Speaker";
        const text = entry.text || entry.message || entry.content || "";
        return `${speaker}: ${text}`.trim();
      })
      .filter(Boolean)
      .join("\n");
  }
  return JSON.stringify(transcript);
}

function formatDuration(duration) {
  if (!duration && duration !== 0) return "0:00";
  if (typeof duration === "string") return duration;
  const totalSeconds = Number(duration);
  if (Number.isNaN(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      return NextResponse.json({ error: "NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing." }, { status: 500 });
    }

    const ownerId = extractOwnerId(payload);
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId metadata is required to route the call into the correct user workspace." }, { status: 400 });
    }

    const call = extractCall(payload);
    const analysis = call.analysis || payload.analysis || {};
    const customer = call.customer || payload.customer || {};
    const callId = call.id || call.callId || payload.id || `${ownerId}-${Date.now()}`;
    const sentiment = analysis.sentiment || analysis.mood || "Neutral";
    const outcome = call.outcome || payload.outcome || (analysis.success ? "Booked" : analysis.summary ? "Follow-Up Needed" : "Inquiry");
    const summary = call.summary || analysis.summary || payload.summary || "Call received by Voice Network.";
    const transcript = normalizeTranscript(call.transcript || payload.transcript);
    const recording = call.recordingUrl || call.recording || payload.recordingUrl || "";
    const caller = customer.name || customer.number || call.phoneNumber || "Unknown caller";
    const phone = customer.number || call.phoneNumber || customer.phone || "No number";
    const revenue = Number(call.revenue || analysis.revenue || 0);
    const createdAt = new Date().toISOString();

    const accessToken = await getFirestoreAccessToken();

    await writeDocument({
      accessToken,
      projectId,
      path: `users/${ownerId}/calls`,
      documentId: String(callId),
      data: {
        caller,
        phone,
        summary,
        transcript,
        recording,
        sentiment,
        outcome,
        duration: formatDuration(call.duration),
        rating: Number(call.rating || analysis.rating || 0),
        revenue,
        aiHandled: true,
        source: "vapi",
        assistantId: call.assistantId || payload.assistantId || "",
        createdAt,
        timestamp: createdAt,
      },
    });

    await writeDocument({
      accessToken,
      projectId,
      path: `users/${ownerId}/notifications`,
      data: {
        text: `${caller}: ${outcome}`,
        createdAt,
        source: "vapi",
      },
    });

    return NextResponse.json({ success: true, ownerId, callId });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Webhook ingestion failed." }, { status: 500 });
  }
}