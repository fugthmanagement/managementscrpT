import { NextResponse } from "next/server";
import { authenticatedUser } from "../../../../../lib/server/auth";
import { accessGoogleCalendar } from "../../../../../lib/server/google-calendar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const begin = new Date(body.startTime);
    const finish = new Date(body.endTime);
    const duration = finish.getTime() - begin.getTime();
    if (!title || title.length > 120 || !Number.isFinite(begin.getTime()) || !Number.isFinite(finish.getTime()) ||
      begin.getTime() < Date.now() || begin.getTime() > Date.now() + 180 * 86400000 ||
      duration < 15 * 60000 || duration > 4 * 3600000) {
      return NextResponse.json({ error: "Choose a future appointment title, start, and end (15 minutes to 4 hours)." }, { status: 400 });
    }
    const token = await accessGoogleCalendar(user.uid);
    const freebusy = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: begin.toISOString(), timeMax: finish.toISOString(), items: [{ id: "primary" }] }), cache: "no-store",
    });
    if (!freebusy.ok) return NextResponse.json({ error: "Could not read calendar availability. Reconnect Google Calendar if needed." }, { status: 502 });
    const free = await freebusy.json();
    const primary = free.calendars?.primary;
    if (!primary || primary.errors?.length) return NextResponse.json({ error: "Calendar availability could not be confirmed." }, { status: 502 });
    if (primary.busy?.length) return NextResponse.json({ error: "That appointment time conflicts with an existing event." }, { status: 409 });
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: title,
        description: "Created from Fugth Management OS. Do not include confidential patient or case information.",
        start: { dateTime: begin.toISOString() },
        end: { dateTime: finish.toISOString() },
      }), cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Google Calendar did not accept the event." }, { status: 502 });
    const event = await response.json();
    return NextResponse.json({ created: true, eventId: event.id, eventUrl: event.htmlLink || null });
  } catch {
    return NextResponse.json({ error: "Could not create calendar appointment. Check the connection and try again." }, { status: 500 });
  }
}
