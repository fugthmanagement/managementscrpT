import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { firebaseAdmin } from "./auth";

const GOOGLE_SCOPE = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function secret() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new Error("INTEGRATION_ENCRYPTION_KEY must be a 64-character hexadecimal secret.");
  return Buffer.from(raw, "hex");
}
function googleConfig() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error("Google Calendar OAuth is not configured.");
  const base = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.fugthmanagement.space");
  if (base.protocol !== "https:") throw new Error("A secure HTTPS app URL is required.");
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: new URL("/api/integrations/google/callback", base.origin).toString(),
  };
}
export function integrationConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_ENCRYPTION_KEY || "") &&
    (process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)));
}
export function buildGoogleUrl(uid) {
  const config = googleConfig();
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ uid, iat: Date.now(), nonce })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: payload + "." + signature,
    include_granted_scopes: "true",
  });
  return { url: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(), nonce };
}
export function readGoogleState(state) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) throw new Error("Invalid authorization state.");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Authorization state mismatch.");
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!value.uid || !value.iat || value.iat > Date.now() + 60000 || Date.now() - value.iat > 10 * 60 * 1000) throw new Error("Authorization state expired.");
  if (!/^[a-f0-9]{32}$/i.test(value.nonce || "")) throw new Error("Missing authorization nonce.");
  return { uid: value.uid, nonce: value.nonce };
}
export function encrypt(data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
export function decrypt(value) {
  const decipher = createDecipheriv("aes-256-gcm", secret(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}
export function integrationDoc(uid) {
  return firebaseAdmin().firestore().doc(`users/${uid}/integrations/google_calendar`);
}
export async function googleToken({ code, refreshToken }) {
  const config = googleConfig();
  const params = refreshToken
    ? { client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }
    : { client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri, grant_type: "authorization_code" };
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Could not authorize Google Calendar.");
  return result;
}
export async function accessGoogleCalendar(uid,requiredScope=null) {
  const ref = integrationDoc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Google Calendar is not connected.");
  const entry = snap.data();
  if(requiredScope && !String(entry.scopes||"").split(" ").includes("https://www.googleapis.com/auth/"+requiredScope))throw new Error("Reconnect your Google account to enable this service.");
  let stored = decrypt(entry.secret);
  if (!stored.refresh_token) throw new Error("Reconnect Google Calendar to enable refresh.");
  if (!stored.access_token || Date.now() >= Number(stored.expires_at || 0) - 90000) {
    const updated = await googleToken({ refreshToken: stored.refresh_token });
    stored = { ...stored, access_token: updated.access_token, expires_at: Date.now() + (updated.expires_in || 3600) * 1000 };
    await ref.set({ secret: encrypt(stored), updatedAt: new Date().toISOString() }, { merge: true });
  }
  return stored.access_token;
}
