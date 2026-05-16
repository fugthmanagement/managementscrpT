import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { phoneNumber, customPrompt, businessName, voiceId } = await req.json();

    const apiKey = process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
    // CRITICAL: You need the ID of the phone number from your Vapi dashboard
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID; 

    if (!apiKey) {
      return NextResponse.json({ error: "Configuration Error: Vapi Secret Key missing." }, { status: 500 });
    }

    if (!vapiPhoneNumberId) {
      return NextResponse.json({ error: "Configuration Error: VAPI_PHONE_NUMBER_ID is missing in your .env file." }, { status: 500 });
    }

    // Strip non-digits and ensure E.164 format (+1...)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${cleanNumber}`;

    // 1. Trigger an outbound call via Vapi's phone/call api
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxDurationSeconds: 300,
        phoneNumberId: vapiPhoneNumberId, // The Vapi number dialing OUT
        customer: {
          number: formattedNumber // The prospect's number receiving the call
        },
        assistant: {
          name: `Fugth Test: ${businessName || 'Sandbox'}`,
          firstMessage: `Hello! This is an automated trial line configured by Fugth Management for ${businessName || 'your business'}. How can I assist you today?`,
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              { 
                role: "system", 
                content: customPrompt || "You are a helpful AI business receptionist assistant." 
              }
            ]
          },
          // Note: "11labs" is usually the provider for the high-end voices like Sara/Rachel. 
          // If you strictly use PlayHT, leave it as "playht".
          voice: { 
            provider: "11labs", 
            voiceId: voiceId || "sara" 
          }
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Vapi Outbound Error:", data);
      return NextResponse.json({ error: data.message || "Vapi Outbound Trigger Failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, callId: data.id, status: data.status });
  } catch (err) {
    console.error("System Route Fault:", err);
    return NextResponse.json({ error: "Outbound error: " + err.message }, { status: 500 });
  }
}
