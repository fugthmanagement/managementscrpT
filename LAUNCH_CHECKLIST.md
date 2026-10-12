# Fugth Management — launch checklist

## Source of truth
GitHub repository: `fugthmanagement/managementscrpT`; Vercel project: `managementscrp-t`; domain: `fugthmanagement.space`.

Do not replace working production credentials with demo keys. Deploy this branch to preview, test it, then merge when service credentials and webhook verification are configured.

## Deployment environment variables
Configure in Vercel → Project → Settings → Environment Variables, selecting **Production and Preview** as appropriate:

- `NEXT_PUBLIC_APP_URL`: https://www.fugthmanagement.space
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT` (JSON object containing Firebase Admin service account credentials) **or** `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
- `VOICE_PRIVATE_KEY` (Vapi API key, server-side only).
- `VAPI_PHONE_NUMBER_ID` (an existing Vapi phone number ID).
- `VAPI_WEBHOOK_SECRET` (long random string also configured as a Bearer Authorization header for Vapi server webhooks).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_GROWTH_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`.
- `GEMINI_API_KEY` for legacy Gemini-backed chat.
- `ADMIN_EMAILS` (comma-delimited, verified owner emails).

Never commit keys, use the client API key for Admin SDK, or expose Vapi/Stripe server secrets in browser code.

## Firebase
Use the *existing* Firebase project, not a newly created one. In Firebase console, open Project settings → Service accounts. Generate an Admin SDK private key **only if necessary**, keep it confidential, and upload it as encrypted project configuration in Vercel. Enable Email/Password authentication, authorize the live and preview domains, and deploy `firestore.rules` and `storage.rules` through Firebase CLI or console. Git commits alone do not publish security rules.

## Voice webhook
This branch rejects unauthorized Vapi webhook posts. Configure the Vapi assistant/server webhook to send `Authorization: Bearer <VAPI_WEBHOOK_SECRET>` using a credential or secure header mechanism. Confirm end-of-call event delivery and tenant attribution before production rollout. Do not paste the secret in a chat.

## Billing
Configure Stripe webhook endpoint `https://www.fugthmanagement.space/api/stripe/webhook`. Subscribe to checkout-session and subscription lifecycle events already handled in code. Verify actual product prices, trial offer, subscription metadata and cancellation before inviting paid customers.

## Checks before merging
1. Build preview successfully.
2. Mobile and desktop public landing page and authentication.
3. Admin and ordinary customer segregation.
4. Unauthorized calls, setup and billing requests return 401 or 403.
5. Firebase records only visible to the correct customer; no client-side billing upgrade.
6. Successful inbound demo, signed webhook, recording/transcript in dashboard.
7. Authorized outbound **test** call to your own/consenting number.
8. Stripe test checkout, signed webhook and cancellation.
9. Only after passing, merge main and confirm Vercel production deployment.

## Cold outreach
Use a supervised, consent-compliant sales process. Observe applicable federal/state telemarketing rules, DNC requirements, automated/artificial-voice call consent restrictions, calling-hour limits, and recording/privacy law. Do not deploy bulk automated sales calls to scraped personal numbers.
