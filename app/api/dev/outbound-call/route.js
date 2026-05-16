import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { phoneNumber, customPrompt, businessName, voiceId } = await req.json();

    const apiKey = process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Configuration Error: Vapi Secret Key missing." }, { status: 500 });
    }

    // 1. Trigger an outbound call via Vapi's phone/call api
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxDurationSeconds: 300,
        assistant: {
          name: `Fugth Test: ${businessName || 'Sandbox'}`,
          firstMessage: `Hello! This is an automated trial line configured by Fugth Management for ${businessName || 'your business'}. How can I assist you today?`,
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [{ role: "system", content: customPrompt || "You are a helpful AI business receptionist assistant." }]
          },
          voice: { provider: "playht", voiceId: voiceId || "sara" }
        },
        phoneNumber: {
          customer: {
            number: phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Vapi Outbound Trigger Failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, callId: data.id, status: data.status });
  } catch (err) {
    return NextResponse.json({ error: "Outbound error: " + err.message }, { status: 500 });
  }
}
