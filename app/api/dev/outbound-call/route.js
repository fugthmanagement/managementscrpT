import { authenticatedUser, isFounder } from "../../../../lib/server/auth";
import { NextResponse } from 'next/server';

function normalizeToE164(num) {
  if (!num) return null;
  let s = String(num).trim();
  // Keep plus and digits only
  s = s.replace(/[^+0-9]/g, '');
  if (s.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length > 10 && digits.length <= 15) return '+' + digits;
  return null;
}

const INDUSTRY_PROMPTS = {
  roofing: {
    system: "You are a professional roofing receptionist. Ask about the issue, urgency, address, and budget. If the caller asks to book, collect a date and time and confirm the booking back to them.",
    firstMessage: (b) => `Hi, this is the roofing support team for ${b || 'our company'}. Can you tell me where the leak or damage is located?`,
  },
  dental: {
    system: "You are a calm dental receptionist. Screen for emergency vs routine care, ask insurance if needed, and offer earliest available appointment.",
    firstMessage: (b) => `Hello, thank you for calling ${b || 'the dental office'}. Are you looking to schedule a routine cleaning or is this an urgent dental emergency?`,
  },
  hvac: {
    system: "You are an HVAC intake assistant. Ask about system type, symptoms, and urgency. If booking is requested, collect date/time and confirm clearly.",
    firstMessage: (b) => `Hi, thanks for reaching out to ${b || 'our heating and cooling team'}. What symptoms is your system showing today?`,
  },
  auto_repair: {
    system: "You are an auto repair receptionist. Ask vehicle make/model, symptoms, and preferred drop-off. If booking, collect date/time and confirm back.",
    firstMessage: (b) => `Hello, this is ${b || 'our service center'}. What make and model vehicle are we booking an inspection for today?`,
  },
  law_firm: {
    system: "You are a confidential legal intake assistant. Be professional and discreet. Ask for basic case details and offer to schedule a consultation.",
    firstMessage: (b) => `Good day. Thank you for contacting ${b || 'our legal team'}. May I ask if you are calling regarding an active case or a new matter?`,
  },
  other: {
    system: "You are a professional business receptionist. Qualify the caller's needs, ask for contact details, and offer available appointment slots.",
    firstMessage: (b) => `Hello, thank you for calling ${b || 'our team'}. How can we assist you with your request today?`,
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
    if (!to) {
      return NextResponse.json({ error: 'Invalid phone number format. Please check input parameters.' }, { status: 400 });
    }

    const apiKey = process.env.VOICE_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server Configuration Error: Vapi API Key missing.' }, { status: 500 });
    }

    const vapiNumberId = process.env.VAPI_PHONE_NUMBER_ID || process.env.VAPI_PHONE_NUMBER;

    // Normalize industry selection
    const industryKey = String(rawIndustry || 'other').toLowerCase().replace(/[^a-z_]/g, '');
    const tpl = INDUSTRY_PROMPTS[industryKey] || INDUSTRY_PROMPTS.other;

    // Assemble robust prompt context based on chosen persona and system text
    let systemPrompt = customPrompt || tpl.system;
    if (persona) {
      systemPrompt += ` Additional styling layer: operate strictly as a ${persona}.`;
    }

    const firstMessage = customPrompt 
      ? (customPrompt.slice(0, 120) + "...") 
      : (tpl.firstMessage ? tpl.firstMessage(businessName) : `Hello, this is ${businessName || 'Fugth Voice Network'}. How can I assist?`);

    // Clean voice mapping
    let finalVoiceId = voiceId || "sara";
    if (finalVoiceId === "sara") finalVoiceId = "sara";
    if (finalVoiceId === "rachel") finalVoiceId = "rachel";
    if (finalVoiceId === "jack") finalVoiceId = "jack";

    // Build standard high-compatibility Vapi payload
    const vapiPayload = {
      maxDurationSeconds: 90,
      phoneNumberId: vapiNumberId ? vapiNumberId.trim() : undefined,
      customer: {
        number: to
      },
      assistant: {
        name: `Fugth Outbound: ${businessName || 'Sandbox Client'}`,
        firstMessage: firstMessage,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }]
        },
        voice: { 
          provider: '11labs', 
          voiceId: finalVoiceId 
        }
      }
    };

    const endpoint = 'https://api.vapi.ai/call/phone';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey.trim()}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(vapiPayload)
    });

    const bodyText = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(bodyText); } catch (e) {}

    if (!response.ok) {
      console.error('Vapi transmission rejected:', parsed || bodyText);
      return NextResponse.json({ 
        error: parsed?.message || 'Upstream carrier connection error.', 
        details: parsed 
      }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      callId: parsed?.id || null, 
      status: parsed?.status || 'initiated' 
    });

  } catch (err) {
    console.error('Outbound route crash exception:', err);
    return NextResponse.json({ error: 'Internal server route exception: ' + err.message }, { status: 500 });
  }
}
