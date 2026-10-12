# Fugth Management: provider integrations and security

Updated October 12, 2026.

## What is deployed
The **public marketing website** and branded sign-in page are deployed separately on `main`.
This branch contains the **unreleased customer integration hub and founder Vapi console**. Do not merge the whole branch until the following provider/server credentials and Firebase rules have been configured and tested.

## Current Vercel project
- Vercel project: `managementscrp-t`
- Repository: `fugthmanagement/managementscrpT`
- Domains: `www.fugthmanagement.space` and `fugthmanagement.space`
- Existing Vapi environment variable names: `VAPI_PRIVATE_KEY`, `VOICE_PRIVATE_KEY`, `VAPI_PHONE_NUMBER_ID`
- Vercel Connect project connectors: none currently linked. Vapi credentials are presently stored in environment variables, not in Vercel Connect or Vercel Blob.

## Firebase server configuration (prerequisite for user integrations)
The public Firebase web config alone cannot perform authenticated server-side Firestore reads and writes.
Select existing Firebase project `fugthmanagement-89c84`, then Firebase Console → Project settings → Service accounts, and store service-account credentials using **encrypted Vercel environment variables**. Supported options:
- `FIREBASE_SERVICE_ACCOUNT` as service-account JSON, OR
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

Keep public Firebase web variables configured and publish the checked-in `firestore.rules` and `storage.rules` separately to the Firebase project (GitHub commits alone do not change deployed rules).

**Do not expose private keys** to the browser, ChatGPT conversation, GitHub commits, screenshots, or support tickets.

## Google Calendar — native OAuth (implemented on development branch)
1. Visit Google Cloud Console for the **existing** Firebase/Google project.
2. Enable the Google Calendar API.
3. Configure OAuth consent and create a Web Application OAuth client.
4. Add authorized redirect URI:
   `https://www.fugthmanagement.space/api/integrations/google/callback`
   and, for a dedicated preview domain only, separately configure that domain if appropriate.
5. Configure Vercel server environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET` (encrypted)
   - `INTEGRATION_ENCRYPTION_KEY`: random 32-byte key represented by 64 hexadecimal characters (encrypted).
   - `NEXT_PUBLIC_APP_URL=https://www.fugthmanagement.space`
6. Sign in as a client → Dashboard → Integrations → Connect Google Calendar.
7. Verify OAuth, status, free/busy conflict blocking, appointment creation and disconnect/revoke before production rollout.

Each customer's OAuth tokens are AES-256-GCM encrypted before storing in `users/{uid}/integrations/google_calendar` (server-only Firestore Admin access). Users do not share tokens with other tenants. This first integration creates events only after a signed-in user submits a booking form; it does not give Vapi a direct auto-booking tool yet.

## Generic inbound integration webhooks (implemented on development branch)
Dashboard → Integrations → Secure Inbound Webhooks → Generate key.
Store the key in the upstream automation service as the `X-Fugth-Integration-Key` header. The URL will end with `/api/integrations/webhook/receive/{uid}`.
A sample JSON POST:
```json
{
  "event_type": "lead.created",
  "event_id": "unique-event-id",
  "contact_name": "Prospect",
  "phone": "+15555550100",
  "service": "New inquiry",
  "source": "Zapier",
  "notes": "Requested a demo"
}
```
The endpoint validates the per-tenant secret, accepts `lead.created` or `appointment.requested`, deduplicates `event_id`, and writes a reviewable CRM lead. It deliberately **does not** auto-confirm bookings, call anyone, or accept medical records.

## Vapi owner control and webhook authentication (development branch)
Existing Vercel server environment variable names contain Vapi private API credentials. The founder-only Dev Ops → Vapi Operations panel calls `GET /api/dev/vapi` and lists assistants, phone numbers, and recent **status-only** call records from the existing Vapi account. It does not reveal API credentials or transcripts.

To secure the Vapi-to-Fugth webhook:
1. Generate a strong random secret and save it **directly in Vercel** as `VAPI_WEBHOOK_SECRET` (encrypted).
2. In Vapi Dashboard → Integrations / Server Configuration → **Add Custom Credential**, choose Bearer Token, header `Authorization`, Bearer prefix enabled; store the **same** secret there.
3. Copy the Vapi credential ID (not the secret) into Vercel as `VAPI_WEBHOOK_CREDENTIAL_ID`.
4. For saved assistants/phone numbers, set webhook Server URL to
   `https://www.fugthmanagement.space/api/vapi-webhook`
   and select the saved Bearer credential. Check whether an assistant-level URL overrides a phone/account-level URL.
5. For newly provisioned assistants the server code uses Vapi `server: { url, credentialId }` and requires the credential ID.
6. Confirm a test **end-of-call-report** reaches Firebase and the correct tenant. Do not merge webhook authentication changes until credentials and call ingestion are verified.

Vapi API credentials and Vapi webhook credentials are **different**. Do not use the private Vapi API key as the webhook shared secret.

## Provider roadmap — represented in the catalog, not connected yet
- Broad calendars: Microsoft 365/Outlook, Calendly, Cal.com
- Dental/healthcare: Open Dental, Dentrix, Eaglesoft, Weave, Jane (requires vendor API access and HIPAA/privacy review where applicable)
- Beauty: Square Appointments, Acuity, Vagaro, Mindbody
- Home-service/field service: Jobber, ServiceTitan, Housecall Pro
- Law: Clio, MyCase (confidentiality and least privilege)
- Sales: HubSpot, Salesforce
- Connector bridge: Zapier/Make via the generic lead webhook

Do not advertise these as live synchronized integrations until each provider's OAuth/API connection, calendar-specific availability semantics, authorization, error handling and tests work.

## End-to-end release checks
- Vercel preview is READY and login and integrations tabs render on mobile and desktop.
- Firebase Admin config exists; correctly secured server-only integration documents; publish rules and test denial to other accounts.
- Vapi credentials are verified, signed webhook is accepted, unsigned webhook is denied, valid call generates one call record with ownerId.
- Google OAuth connects and disconnects, rejects state replay, checks busy windows and creates a real calendar event on explicit submission.
- Webhook bridge rejects unauthorized sends, rejects malformed events and duplicates event_id, creates scoped leads on valid inputs.
- Stripe webhook validation, billing state and account isolation are tested.
- Keep automated outbound sales on a supervised consent-compliant workflow. No unsolicited AI robocalls to scraped phone lists.
