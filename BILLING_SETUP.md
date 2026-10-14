# Fugth Management — production billing prerequisites

## Customer experience
Sign up at `/login` → `/plans` → select Starter ($49), Growth ($149), or Elite ($499) → secure Stripe Embedded Checkout remains in `/plans` → payment return at `/billing/return` → workspace displays verified plan, status and next renewal.

Stripe handles card data. The application never takes or stores raw card numbers.

## Vercel: Environment Variables
Already configured in the Vercel project: `STRIPE_SECRET_KEY`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_GROWTH_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_API_KEY`.

Missing on the last verified Vercel environment audit; add directly in Vercel **without pasting secrets into ChatGPT**:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — the matching `pk_live_...` or `pk_test_...` publishable key for the same Stripe account/mode as the existing secret key.
- `STRIPE_WEBHOOK_SECRET` — the `whsec_...` signing secret from your actual Stripe webhook destination.
- Firebase Admin credentials: `FIREBASE_SERVICE_ACCOUNT` (full service-account JSON) or `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, for the existing Firebase project `fugthmanagement-89c84`.

Select matching Vercel Preview/Production environments. Preview/test credentials must not be mixed with Production/live prices and keys.

**The server returns 503 and will not accept payment until the webhook signing secret, Firebase server credentials and Stripe publishable key are configured.** This protects buyers from charges that cannot reliably activate their account.

## Stripe
In Stripe Dashboard → Developers → Webhooks (or Workbench → Webhooks), create a HTTPS webhook endpoint:
`https://www.fugthmanagement.space/api/stripe/webhook`.

Subscribe to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the endpoint's **signing secret** into Vercel as `STRIPE_WEBHOOK_SECRET`. It is not the Stripe API secret key.

## Firebase
Use Firebase Console → Project settings → Service accounts for the existing project, securely configure the service account in Vercel, and deploy `firestore.rules` separately to Firebase via Firebase CLI or Firebase Console.

Verified Stripe events update `users/{uid}`:
- `planTier` — starter, growth, elite based on actual Stripe price ID
- `planStatus` — active, trialing, past_due, canceled, etc
- `billingActive` — true for active or trialing
- `billingCurrentPeriodStart`, `billingCurrentPeriodEnd` — ISO timestamps from Stripe subscription billing period, **not estimated 30-day dates**
- `billingRenewsAt` — end of billing period unless cancellation is scheduled
- `billingExpiresAt`, `billingCancelAtPeriodEnd`, `billingTrialEndsAt`
- `stripeCustomerId`, `stripeSubscriptionId`, `billingEmail`, `billingUpdatedAt`

Server-only transaction records event IDs under `processedStripeEvents/{eventId}` to avoid duplicate delivery. Firestore security rules prevent normal customers writing billing fields.

## Check before inviting paid customers
1. Vercel production deployment READY; environment keys configured in production and redeploy completed.
2. Firebase rules published; login and new users create their own workspace.
3. Test-mode session completes **inside Fugth**; Stripe webhook delivers a 2xx and securely creates billing data for the same signed-in user.
4. Test Stripe renewals, failed payments, cancel-at-period-end and canceled subscriptions; verify actual end and next renewal dates in Firestore and UI.
5. Switch to matched production Stripe price IDs, API key, publishable key and webhook endpoint. Perform a controlled live purchase only after tests.
6. Verify active plan enforcement separately in phone provisioning/usage endpoints before enabling billable AI calls for new customers.

Do not treat a success URL, client-side event, selected plan or local Firestore write as proof of payment.


## FUGTH Management Stripe migration — October 14, 2026
The explicitly selected Stripe connector is "Fugth Management", account `acct_1QYiGDHGcNIhcRMj` (live mode). Three **new** monthly products were created there:
- Low $49/month: `price_1UQOt9HGcNIhcRMjZJVSgXII` / `prod_VRHSIDxPjmR5q7`.
- Mid $149/month: `price_1UQOtBHGcNIhcRMj2uKPsRjD` / `prod_VRHSxrdAuLvNR5`.
- High $499/month: `price_1UQOtDHGcNIhcRMjvH0HGgfV` / `prod_VRHS7WK57MDuzj`.

Checkout and signed webhook entitlement mapping now refer exclusively to these new price IDs. Setup implementation charges are one-time Stripe Checkout line items ($1,500/$2,500/$3,500); recurring optional add-ons are priced within each checkout. The site must use the **matching Stripe live secret key** and **this account's webhook signing secret** for production; previous credentials belonging to other accounts will not work. Never commit keys.

Stripe Dashboard for this selected account: enable a signed webhook endpoint `https://www.fugthmanagement.space/api/stripe/webhook` and configure the events listed above. Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Firebase Admin credentials in Vercel Production, then redeploy and complete an authorized checkout test. The latest checkout returns a specific explanation when the Vercel secret cannot retrieve one of the new account's price IDs.

**Existing subscriptions, customers, historical payouts and payment records in any older Stripe account were not moved.** Stripe account boundaries do not support naively replacing customer IDs or moving stored card details. Handle any intentional old-customer migration separately with explicit customer authorization and proper reconciliation. Don't enable standalone Payment Links as a substitute for the signed Firebase subscription provisioning flow.
