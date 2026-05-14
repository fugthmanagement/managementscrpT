import { NextResponse } from "next/server";

function getErrorText(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || fallback;
}

export async function POST(req) {
  try {
    const { userId, businessName, industry } = await req.json();
    const privateKey = process.env.VOICE_PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({ error: "VOICE_PRIVATE_KEY is missing from environment variables." }, { status: 500 });
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

    const assistantPayload = await assistantRes.json();
    if (!assistantRes.ok) {
      return NextResponse.json({ error: getErrorText(assistantPayload, "Assistant provisioning failed.") }, { status: assistantRes.status });
    }

    const assistantId = assistantPayload.id;
    if (!assistantId) {
      return NextResponse.json({ error: "Voice Network did not return an assistant id." }, { status: 500 });
    }

    const numberRes = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        name: `${businessName} Main Line`,
      }),
    });

    const numberPayload = await numberRes.json();
    if (!numberRes.ok) {
      return NextResponse.json({ error: getErrorText(numberPayload, "Phone number provisioning failed."), assistantId }, { status: numberRes.status });
    }

    const phoneNumber = numberPayload.number || numberPayload.phoneNumber || numberPayload.tel || "";

    return NextResponse.json({
      success: true,
      assistantId,
      phoneNumber,
      assistant: assistantPayload,
      phoneNumberPayload: numberPayload,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Voice setup failed." }, { status: 500 });
  }
}
