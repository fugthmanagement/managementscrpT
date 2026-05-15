import { NextResponse } from "next/server";
import { createDocument, getFirestoreAccessToken } from "../../../lib/server/firestore-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { userId, email, name, subject, message } = await req.json();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      return NextResponse.json({ error: "Project id is missing." }, { status: 500 });
    }

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
    }

    const accessToken = await getFirestoreAccessToken();
    await createDocument({
      accessToken,
      projectId,
      path: "supportTickets",
      data: {
        userId: userId || "guest",
        email: email || "",
        name: name || "Guest",
        subject,
        message,
        status: "open",
        recipient: "fugthmanagement@gmail.com",
        createdAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      recipient: "fugthmanagement@gmail.com",
      note: "Ticket stored successfully for the Fugth support queue.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Support ticket failed." }, { status: 500 });
  }
}