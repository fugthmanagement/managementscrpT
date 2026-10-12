# FUGTH Management — live payment catalog reconciliation

Read-only account audit: October 12, 2026.

## Accounts connected to ChatGPT
Three **live-mode** accounts, each displayed as `Fugth Chat LLC`:

1. `acct_1S2myFRxLJ1vzYMB`: **0 active products and 0 prices** found.
2. `acct_1QYiGDHGcNIhcRMj`: **14 active products and 15 active prices** found, mainly legacy website maintenance, design, tokens, AI services and the MEP Engine.
   - Essential Website Care: **$79/month**, product `prod_SYfSaaSGGqGetr`, price `price_1RdY7YHGcNIhcRMjyL13WS7f`.
   - Performance & Growth: **$149/month**, product `prod_SYfX7xrjGkfG7b`, price `price_1RdYC1HGcNIhcRMj5swbDeUz`.
   - AI & Automation Support: **$299/month**, product `prod_SYfXQJvtSkbnq4`, price `price_1RdYCcHGcNIhcRMjQsOQ3Ck6`.
   - These three are **not labeled as FUGTH Management OS subscriptions**.
3. `acct_1SbbJdBpXbvlbU7T`: **1 active product**, Hannah Pro, **$4.99/month**; not the business OS.

## Website vs payment catalog
The website currently displays:
- FUGTH Starter: **$49/month**
- FUGTH Growth: **$149/month**
- FUGTH Elite: **$499/month**

These three distinct FUGTH Management subscription products were **not found together in any of the three connected live accounts**. A $149 price exists for an unrelated older website service; it must not be reused to sell the FUGTH Growth plan.

The Vercel project has three price-ID environment-variable names (`STRIPE_STARTER_PRICE_ID`, `STRIPE_GROWTH_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`), but **their values are not exposed through the current account connection**, so we cannot reconcile them to Stripe product IDs. The API secret is likewise not read or disclosed here.

## Safe release path
- Do not automatically rename unrelated products, reassign customers or change live price amounts on an unmatched Stripe account.
- Select the exact intended FUGTH Management billing account based on its account identifier and existing price IDs.
- Create or update specifically named FUGTH Management products with accurate descriptions and subscription prices in that same account.
- Connect the corresponding monthly price IDs to the project's production variables; verify the checkout endpoint's allowed amounts.
- Configure the publishable key, signed webhook and Firebase Admin credentials and test subscription lifecycle before accepting money.

## Voice preview readiness
- FUGTH 15-second voice demo uses a temporary voice assistant with `maxDurationSeconds:15`.
- Maximum three calls/account/day, four/number/day, global maximum 80/day, five-minute cooldown/account and phone.
- Requires verified email, explicit self-owned phone number consent, a configured business voice number and Firebase Admin service account to atomically reserve usage.
- Fails closed if any critical credential is missing. Call analysis stores a short recap in the requesting customer's own Firestore namespace.
- Provider call setup time and connection speed are variable and cannot be guaranteed within five seconds.

No live Stripe catalog was modified during this audit.
