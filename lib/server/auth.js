import admin from "firebase-admin";

const DEFAULT_ADMIN_EMAILS = [
  "fugthmanagement@gmail.com",
  "mepenginestudio@gmail.com",
  "fugthchat@gmail.com",
];

export function firebaseAdmin() {
  if (!admin.apps.length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT;
    const email = process.env.FIREBASE_CLIENT_EMAIL;
    const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (json) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    } else if (email && key) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: email, privateKey: key }) });
    } else {
      // Token signature verification needs the Firebase project ID. Database writes
      // still require a separate Admin service account on Vercel.
      admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
    }
  }
  return admin;
}

export async function authenticatedUser(req) {
  const value = req.headers.get("authorization") || "";
  if (!value.startsWith("Bearer ")) return null;
  try {
    return await firebaseAdmin().auth().verifyIdToken(value.slice(7));
  } catch {
    return null;
  }
}

export function isFounder(user) {
  if (!user?.email || user.email_verified === false) return false;
  const configured = process.env.ADMIN_EMAILS;
  const emails = configured ? configured.split(",") : DEFAULT_ADMIN_EMAILS;
  return emails.map((email) => email.trim().toLowerCase()).includes(user.email.toLowerCase());
}

export function errorResponse(status, message) {
  return Response.json({ error: message }, { status });
}
