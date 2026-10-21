/**
 * The FUGTH frontend already ships with this Firebase project fallback.
 * Server-side Admin APIs must resolve to the SAME project even if the
 * NEXT_PUBLIC variable is absent from a Vercel environment.
 * Never infer a project from untrusted request headers or user input.
 */
export const FUGTH_FIREBASE_PROJECT="fugthmanagement-89c84";
export function resolveFirebaseProjectId(env={}){
 const explicit=String(env.FIREBASE_PROJECT_ID||env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||
  env.GOOGLE_CLOUD_PROJECT||env.GCLOUD_PROJECT||"").trim();
 return explicit||FUGTH_FIREBASE_PROJECT;
}
export function serviceAccountProjectFromEmail(email){
 const match=String(email||"").toLowerCase()
  .match(/^[a-z0-9-]+@([a-z][a-z0-9-]{4,})\.iam\.gserviceaccount\.com$/);
 return match?.[1]||null;
}
