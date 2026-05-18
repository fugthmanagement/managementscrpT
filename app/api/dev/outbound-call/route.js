import { NextResponse } from 'next/server';

function normalizeToE164(num) {
  if (!num) return null;
  let s = String(num).trim();
  // keep plus and digits only
  s = s.replace(/[^+0-9]/g, '');
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length > 10 && digits.length <= 15) return '+' + digits;
  return null;
}

const INDUSTRY_PROMPTS = {
  roofing: {
    system: "You are a professional roofing receptionist. Ask about the issue, urgency, address, and budget. If the caller asks to book, collect a date and time and confirm the booking back to them.",
    firstMessage: (b) => `Hi, this is ${b || 'your roofing team'}. Can you tell me where the issue is and when you'd like an estimate?`,
  },
  dentist: {
    system: "You are a calm dental receptionist. Screen for emergency vs routine care, ask insurance if needed, and offer earliest available appointment. If booking is requested, collect date/time and repeat back the appointment.",
    firstMessage: (b) => `Hello, this is ${b || 'the dental office'}. Are you calling for a cleaning or a dental emergency?`,
  },
  hvac: {
    system: "You are an HVAC intake assistant. Ask about system type, symptoms, and urgency. If booking is requested, collect date/time and confirm clearly.",
    firstMessage: (b) => `Hi, this is ${b || 'your HVAC team'}. What's the issue and how urgent is it?`,
  },
  auto_repair: {
    system: "You are an auto repair receptionist. Ask vehicle make/model, symptoms, and preferred drop-off. If booking, collect date/time and confirm back.",
    firstMessage: (b) => `Hello, this is ${b || 'the auto shop'}. What make/model are we servicing and what's the problem?`,
  },
  law: {
    system: "You are a confidential legal intake assistant. Be professional and discreet. Ask for basic case details and offer to transfer to an attorney for a consultation. If the caller requests a meeting, offer available slots and confirm the booking.",
    firstMessage: (b) => `Good day. This is ${b || 'our legal intake team'}. May I ask what legal matter you are calling about?`,
  },
  other: {
    system: "You are a professional business receptionist. Qualify the caller's needs, ask for contact details, and offer available appointment slots. If the caller requests booking, collect date/time and confirm.",
    firstMessage: (b) => `Hello, this is ${b || 'the team'}. How can we help you today?`,
  }
};

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      phoneNumber: rawPhone,
      customPrompt,
      businessName,
      voiceId,
      industry: rawIndustry,
      persona
    } = body || {};

    const to = normalizeToE164(rawPhone);
    if (!to) return NextResponse.json({ error: 'Invalid phone number. Use E.164 or 10-digit US number (e.g. +15551234567 or 5551234567).' }, { status: 400 });

    const apiKey = process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuration Error: voice API key missing.' }, { status: 500 });
    }

    // Twilio fallback: if TWILIO env exists, use Twilio-style fields
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
    const twilioFromRaw = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    const twilioFrom = normalizeToE164(twilioFromRaw);
    const useTwilio = Boolean(twilioAccountSid && twilioFrom);

    const industry = String(rawIndustry || 'other').toLowerCase();
    const tpl = INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.other;

    const systemPrompt = customPrompt || tpl.system;
    const firstMessage = customPrompt ? (customPrompt.slice(0, 200)) : (tpl.firstMessage ? tpl.firstMessage(businessName) : `Hello, this is ${businessName || 'Fugth'}. How can I assist?`);

    const payloadBase = {
      maxDurationSeconds: 600,
      assistant: {
        name: `Fugth Test: ${businessName || 'Sandbox'}`,
        firstMessage,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }]
        },
        voice: { provider: 'playht', voiceId: voiceId || persona || 'sara' }
      }
    };

    let payload;
    if (useTwilio) {
      payload = {
        ...payloadBase,
        phoneNumber: {
          twilioPhoneNumber: twilioFrom,
          twilioAccountSid: String(twilioAccountSid),
          to
        }
      };
    } else {
      // Fugth (Vapi) style: place customer number under customer.number
      payload = {
        ...payloadBase,
        phoneNumber: {
          customer: { number: to }
        }
      };
    }

    const endpoint = 'https://api.vapi.ai/call/phone';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((e) => {
      console.error('Upstream call error', e);
      return null;
    });

    if (!resp) return NextResponse.json({ error: 'Upstream request failed (network).' }, { status: 502 });

    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* keep text */ }

    if (!resp.ok) {
      return NextResponse.json({ error: 'Upstream provider error', status: resp.status, upstream: data || text }, { status: 502 });
    }

    return NextResponse.json({ success: true, callId: data?.id || data?.callId || null, upstream: data || text });
  } catch (err) {
    console.error('Outbound route error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
