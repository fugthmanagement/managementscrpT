import { NextResponse } from "next/server";

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
    hasVoicePrivateKey: Boolean(process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY),
    hasVoicePublicKey: Boolean(process.env.NEXT_PUBLIC_VOICE_PUBLIC_KEY),
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

    return NextResponse.json({
      success: true,
      assistantId,
      phoneNumber,
      assistant: assistantPayload,
      phoneNumberPayload: numberPayload,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Voice setup failed.", stage: "route" }, { status: 500 });
  }
}
