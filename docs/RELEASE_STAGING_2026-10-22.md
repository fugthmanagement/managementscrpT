# FUGTH batched release — October 22, 2026

## Release budget
Vercel Hobby has a 100 deployment rolling 24-hour team quota; project-only usage is not the total. The Admin gauge shows the status with clear confidence labels. Do not deploy every edit. Wait for passing CI, then release one tested batch.

## Existing Firebase Admin fault
Diagnostic: firebase_service_account_email_invalid. The current Vercel production FIREBASE_CLIENT_EMAIL must exactly match client_email in the matching service-account JSON of Firebase project fugthmanagement-89c84. Pair it with its matching FIREBASE_PRIVATE_KEY. The browser founder can access their own Firestore campaigns, but server Admin cannot authenticate for preview creation, customer payments or signed webhook activation. Do NOT invent a new Firebase database or bypass the secure payment gate. Never share secrets in chat, source code, or Firestore.

## Public website previews
Normal server-backed links /demo/site/{id} remain stable, short, and server-verified. If Admin is down, the signed-in founder can make a compressed independent public concept snapshot under /demo/portable#p=..., saving the new URL to the selected prospect's Firestore campaign record. SMS Outreach automatically reads it. Portable links are immutable and impossible to remotely revoke or expire. Editing requires generating and sharing a NEW link. Portable links can be much longer than ordinary SMS links and may cost multiple message segments. Prefer short server links after repair for large distribution. No customer-specific/private data is embedded.

## Standalone text-back billing
Stripe merchant: acct_1QYiGDHGcNIhcRMj, verified live recurring price price_1UTPooHGcNIhcRMjPDGqXQXf ($49.99/month), product prod_VUOcbQxMIulAvX. Carrier registration, number rental and outbound provider SMS messages are separate charges; this product is not unlimited texting. Stripe product editor allows safe allowlisted name and description editing only. It does not modify existing prices, subscriptions or charge clients. Stripe Checkout still fails closed if production Firebase Admin is unavailable.

## Missed-call text-back workflow
The owner can edit a branded reply and assigned number in Administration or Cold Calling > Message Back. These settings save in the existing Firestore owner knowledge collection; no new database is required. Inbound signed webhooks are ignored without a strong shared secret. Only explicit missed inbound calls qualify. Customer consent, A2P carrier registration, verified STOP opt-outs, configured SMS provider, number validation, paid subscription, and deduplication/cooldowns are mandatory. SMS automatic sending is hard-disabled in the founder UI until the service is verified; no real texts or carrier charges should occur during simulation.

## Admin operations
The Operations dashboard includes deployment gauge, Text-Back editor, existing voice health, Vapi number-to-assistant mapping, Stripe health with Firebase error code, and connected Stripe product wording editor.

## QA and launch
Run GitHub Actions tests and Next.js build once on the consolidated feature branch. Before selling live subscriptions, repair existing Vercel Firebase Admin environment values and confirm an actual signed Stripe webhook and Firestore entitlement update in a controlled payment. Then verify normal short preview links and SMS assignment. No bulk messaging from unconsented prospects.