# FUGTH shared client websites & Google connections

## Architecture: one site system, account-specific saved configuration

FUGTH does **not** create or deploy a separate Next.js application per customer.

- One shared route: `/sites/{uid}`, rendering a finished, industry-matched FUGTH template for every business.
- `publicSites/{uid}`: the business's current publicly viewable page configuration and publish state. No private profile, call, authentication, billing or integration token data.
- `siteDrafts/{uid}`: privately saved business design draft, available only through authenticated server APIs.
- `siteChanges/{randomId}`: audit record of editor (owner/founder), action, business and revision.
- `users/{uid}`: the user's private account profile, including the permanent `537xxx` number and subscription status. Never public.
- Authentication: business owner may update their own design; verified FUGTH founder may open and edit a selected customer's design from Settings → Administration → Saved client designs. Nobody signs in as the customer.

Business type chooses a deterministic FUGTH template (for example, roofing, HVAC and contractor accounts receive the Service Pro template). The account owner changes phone, business name, area and hours in Settings; FUGTH refreshes the public preset from those private business details. Customers cannot change the layout, colors, stock imagery or section order.

**Save draft** does not change the public website. **Publish** explicitly applies the current draft and records an audit event. Founder publishing prompts for confirmation. The site editor is accessible using **Edit this page** while authenticated on the business website.

Old client-side Firestore publishing is disabled in reviewed `firestore.rules`. Publish these rules in the real Firebase project before deployment of the new frontend. Server routes require Firebase Admin credentials, which are currently not present in Vercel.

## Chat

- Optional FUGTH-branded website chat, enabled/disabled per account through Site Studio.
- Uses only public business name, services, business hours, service area and contact fields.
- Works without external AI bills; provides simple, deterministic FAQ guidance.
- Does not look up customers, create appointments, read documents, or access sensitive records. UI says this clearly.
- A future paid LLM/chat integration needs separate rate limits, safety/privacy policy, secure endpoints, and customer approval.

## Founder design workflow

Settings → Administration → Saved client designs. Search loaded customers by name, email or `537xxx` account number. Load more to paginate the account directory. Select account to edit its private draft, inspect its public site, explicitly Publish to that customer's page, or export its saved design as JSON. This does not expose passwords, private Google access tokens or payment credentials.

Prospect-only sites created with the founder generator remain public design previews without login accounts. They do not consume `537xxx` customer account numbers.

## Google Calendar, Docs, and Drive links

This extends the existing Google Calendar OAuth connection rather than adding a separate provider for each feature.

- Scopes requested after reauthorization: `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.freebusy`, `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/spreadsheets`.
- Calendar: real free/busy check and event creation. On successful creation, saves a minimal event pointer to the same customer's FUGTH appointment list. A failure to mirror it is reported separately to avoid double booking.
- Google Docs: owner creates a plain-text business note as a document; it appears in their own Google account. FUGTH can list and open Drive links for documents within its `drive.file` authorization scope, **not enumerate all their private Drive content**.
- Google Sheets: after the owner connects Google, FUGTH provisions one **FUGTH Business Operations** workbook in that owner’s Google account with Overview, Leads and Appointments tabs. FUGTH stores the workbook link only; it does not create a Google account or access the rest of the owner’s Drive.
- Existing Calendar connections may need one-time reauthorization to approve Docs. Current scope status distinguishes Calendar connected versus Docs permitted.
- Neither FUGTH nor site visitors get automatic access to all customer documents, Calendar guest lists or confidential attachments. Third-party industry tools remain correctly labeled planned until supported and approved.

### Configuration in Google Cloud Console

1. Choose a Google Cloud project and configure the OAuth consent screen, with authorized domains and appropriate testing/production status.
2. Enable **Google Calendar API**, **Google Drive API**, **Google Docs API**, and **Google Sheets API**.
3. Create an **OAuth 2.0 Client ID** for a Web application.
4. Authorized redirect URI: `https://www.fugthmanagement.space/api/integrations/google/callback`. Any actual preview domain used for OAuth must also be explicitly registered and have a matching `NEXT_PUBLIC_APP_URL`.
5. Set in **Vercel → managementscrp-t → Settings → Environment Variables** (server-side only):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `INTEGRATION_ENCRYPTION_KEY` = 32 bytes of securely generated random data encoded as 64 hexadecimal characters (do not rotate this casually; existing encrypted tokens use it)
   - `NEXT_PUBLIC_APP_URL=https://www.fugthmanagement.space`
6. Configure Firebase Admin separately with `FIREBASE_SERVICE_ACCOUNT` JSON **or** `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Keep credentials only in Vercel.
7. Redeploy **after** adding credentials, connect a consenting business test account, then verify Calendar and Docs scopes, free/busy, booking and note creation.
8. Published customers may need Google OAuth app verification depending on Google scopes and consent-screen publishing; use the minimum scopes and complete required provider review before commercial rollout.

Do not paste API secrets in GitHub, customer settings or a chat message.

## Release gates

- [ ] Verify latest GitHub branch builds successfully; earlier preview commits do not validate newer code.
- [ ] Publish Firebase security rules to the project used by this app.
- [ ] Configure Firebase Admin credentials and Google OAuth settings in Vercel.
- [ ] Confirm a customer edits their draft while the public site remains unchanged.
- [ ] Confirm a customer can publish; an unrelated account must not view private drafts or edit another site.
- [ ] Confirm founder can list and edit each customer's design, with activity written to `siteChanges`.
- [ ] Enable and disable website chat; verify it uses only public site facts and never invents a booked appointment.
- [ ] Create Google Doc and check its Drive link; create Calendar appointment and verify linked FUGTH record.
- [ ] Verify responsive mobile website, four layouts, stock photo fallbacks, and account-specific sections.
- [ ] Confirm original subscription prices **Starter $49, Growth $149, Elite $499** are unchanged; no voice-calling changes.
