import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { phoneNumber, customPrompt, businessName, voiceId } = await req.json();

    const apiKey = process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuration Error: voice API key missing.' }, { status: 500 });
    }

    // Provider now expects Twilio-style fields; ensure we have a configured Twilio "from" number and account SID.
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VAPI_TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
    const twilioFromRaw = process.env.TWILIO_FROM_NUMBER || process.env.VAPI_TWILIO_NUMBER || process.env.TWILIO_PHONE_NUMBER;

    const toE164 = (num) => {
      if (!num) return null;
      let s = String(num).trim();
      s = s.replace(/[^+0-9]/g, '');
      if (s.startsWith('+')) return s;
      const { phoneNumber, customPrompt, businessName, voiceId, industry, persona } = await req.json();
      if (digits.length === 10) return '+1' + digits;
      if (digits.length > 10 && digits.length <= 15) return '+' + digits;
      return null;
    };

    const toNumber = toE164(phoneNumber);
      // Optional Twilio-style config (provider may accept Twilio fields)
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VAPI_TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
      const twilioFromRaw = process.env.TWILIO_FROM_NUMBER || process.env.VAPI_TWILIO_NUMBER || process.env.TWILIO_PHONE_NUMBER;
      const useTwilio = Boolean(twilioAccountSid && twilioFromRaw);

    const fromNumber = toE164(twilioFromRaw);
    if (!fromNumber || !twilioAccountSid) {
      return NextResponse.json({ error: 'Server missing Twilio configuration. Set TWILIO_FROM_NUMBER and TWILIO_ACCOUNT_SID.' }, { status: 500 });
    }

    // Build the outbound payload using Twilio-style fields (provider requires twilioPhoneNumber & twilioAccountSid)
    const payload = {
      maxDurationSeconds: 300,
      assistant: {
        name: `Fugth Test: ${businessName || 'Sandbox'}`,
        firstMessage: customPrompt ? customPrompt : `Hello! This is ${businessName || 'Fugth'}. How can I assist you today?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [{ role: 'system', content: customPrompt || 'You are a helpful AI business receptionist assistant.' }]
        },
        voice: { provider: 'playht', voiceId: voiceId || 'sara' }
      },
      phoneNumber: {
        twilioPhoneNumber: fromNumber,
        twilioAccountSid: String(twilioAccountSid),
        to: toNumber
      }
    };

    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      let payload;
      if (useTwilio) {
        if (!fromNumber) return NextResponse.json({ error: 'Server missing Twilio configuration or TWILIO_FROM_NUMBER is invalid.' }, { status: 500 });
        payload = { ...payloadBase, phoneNumber: { twilioPhoneNumber: fromNumber, twilioAccountSid: String(twilioAccountSid), to: toNumber } };
      } else {
        // Fallback to the original simple customer number shape used previously
        payload = { ...payloadBase, phoneNumber: { customer: { number: toNumber } } };
      }
