# FUGTH Founder Sales Launch Checklist

**Branch release: founder sales, Pierre call map, custom billing, new pricing.**

## Start calling today

1. Log into **FUGTH Management** with a Google/Firebase-verified management account.
2. Open **Administration → Cold Calling & Sales → Pierre's Call Map**. This preserves the uploaded Pierre Cold Call Guide's exact branching scripts, objection paths and prospect fields.
3. Select a saved prospect or start a new call. For a referral, name only someone who actually referred the business. Otherwise take **Use non-referral opening**.
4. Enter owner name, business, phone, email, call outcome, notes, and meeting date/time in the guide. Press **Save progress to FUGTH**; press **Log completed call** after an actual call.
5. **Book 15-minute Calendar demo** calls the protected Google booking endpoint. The optional customer invitation check must be selected to invite the prospect; email and SMS actions open drafts and do not send without your confirmation.
6. Any **Do not call** outcome is recorded and blocks calling from the sales UI. Honor opt-out requests and applicable outreach rules.
7. Switch to **Prospects, ZIP codes & Calls** for Google Places searches, imported lists, follow-ups and Google Sheets export.

## Turn on Google Places lead discovery

1. In the Google Cloud project associated with FUGTH, enable **Places API (New)** and ensure Google Maps Platform billing is configured.
2. Create a restricted server API key authorized for **Places API (New)**. Keep it secret: **do not** prefix it with NEXT_PUBLIC.
3. Vercel project `managementscrp-t` → Settings → Environment Variables → add `GOOGLE_MAPS_API_KEY` for **Production**, then redeploy.
4. In ZIP-code searches, enter a five-digit US ZIP, and select up to five industry categories (each category incurs a Places Text Search request). Choose **No website listed** and optional minimum star rating / review count.
5. Verify search results and click **Save to queue**. Businesses with no websiteUri listed by Google *might still have a website*. Verify manually before claiming they lack one; this is a lead signal, not proof.
6. Saved businesses are deduplicated by Google Place ID/phone/name in the UI; always review before contacting.
7. JSON, CSV and TSV imports save to Firestore. Google Sheets data can be downloaded to CSV and imported; the existing private Google Sheets sync exports prospect lists. PDF importing is not part of this release.

## Billing/account QA

1. **Administration → Customer accounts:** verify all registered customers appear. If a directory access error appears, inspect **Voice + recording connections** and Firebase service account access; a verified founder email alone is not enough to list Auth users if the service credentials lack permissions.
2. For a selected customer, open their site, adjust AI demo permission (1–72 hours), reset cooldown, and prepare a personalized Stripe quote. **Founder grants and quotes do not mark an unpaid user as paid.**
3. Offers: `website_one_time` $299 once, `website` $59/month plus $299 setup, `starter` $149 founding ($199 regular) plus $1,000 setup, `essential` $199 plus $1,000, `growth` $399 plus $2,000, `elite` $799 plus $3,500. These are proposed package prices; existing Stripe subscriptions keep their existing prices.
4. New checkout generates Stripe price_data server-side. The old three Stripe price ID variables in Vercel are no longer needed for **new** transactions, but legacy subscriptions still use the original price catalog for verification. **Do not delete Stripe webhook or secret variables.**
5. Test a customer sign-up, personalized quote, completed Checkout Session, Stripe `checkout.session.completed` webhook, plan activation and founder directory/website assignment before taking production payments.
6. If using a founder-chosen renewal date, choose a future date within 28 days. Stripe Checkout uses it as a billing anchor and calculates a prorated initial charge; always review the final checkout amount.
7. One-time website purchases create an order after payment verification. They do not include perpetual managed hosting. Do not promise 24-hour delivery before complete business materials are received.
8. Test the **Financial Command Center**: live Stripe run-rate vs separately stored expense records, and shadow slider estimates saved only in the current browser.

## Known limits

- Detailed Vercel deployment/runtime logs currently return a permission error to the connected tool. A successful Vercel build check does **not** prove logged-in flows or Stripe webhooks are working.
- Google Voice does not provide a supported FUGTH direct-call API here. The UI copies the number and opens Google Voice.
- Email and SMS follow-up buttons create drafts. Automated messaging/employee accounts and payroll are separate upcoming integrations.
- Live payments, customer email invites, Firebase account listing, call recording, and Google Places still require real end-to-end tests using authorized accounts and configured APIs.
