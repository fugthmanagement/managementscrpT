import { NextResponse } from "next/server";
import { authenticatedUser, isFounder } from "../../../../lib/server/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED = {
  assistants: "https://api.vapi.ai/assistant",
  numbers: "https://api.vapi.ai/phone-number",
  calls: "https://api.vapi.ai/call?limit=20",
};
export async function GET(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isFounder(user)) return NextResponse.json({ error: "Founder access required." }, { status: 403 });
  const privateKey = process.env.VAPI_PRIVATE_KEY || process.env.VOICE_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: "Vapi API key has not been configured in Vercel." }, { status: 503 });
  try {
    const data = await Promise.all(Object.entries(ALLOWED).map(async ([name, url]) => {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${privateKey}` }, cache: "no-store" });
      if (!response.ok) return [name, { items: [], error: `Provider returned HTTP ${response.status}` }];
      const body = await response.json();
      const rows = Array.isArray(body) ? body : body.results || body.data || [];
      // Return only operational metadata, not transcripts, call content, or credentials.
      const mapped = rows.slice(0, 40).map(row => {
        if (name === "assistants") return { id: row.id, name: row.name || "Unnamed assistant", model: row.model?.model || "", voice: row.voice?.provider || "", createdAt: row.createdAt || "" };
        if (name === "numbers") return { id: row.id, number: row.number || "", name: row.name || "", assistantId: row.assistantId || "" };
        return { id: row.id, status: row.status || "", type: row.type || "", startedAt: row.startedAt || row.createdAt || "", assistantId: row.assistantId || "" };
      });
      return [name, { items: mapped }];
    }));
    return NextResponse.json(Object.fromEntries(data));
  } catch { return NextResponse.json({ error: "Vapi could not be reached. Confirm the account key and try again." }, { status: 502 }); }
}
