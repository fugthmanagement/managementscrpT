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

- Default OAuth scopes for **Connect Google Calendar + Drive**: `openid`, `email`, `https://www.googleapis.com/auth/calendar` (needed to create per-business calendars, read availability and manage events), and `https://www.googleapis.com/auth/drive.file` (limited access to app-created Drive files). The Google Sheets scope is requested separately when setting up the workbook. The restricted Gmail sending permission is no longer part of initial setup.
- Calendar: real free/busy check and event creation. On successful creation, saves a minimal event pointer to the same customer's FUGTH appointment list. A failure to mirror it is reported separately to avoid double booking.
- Google Docs: owner creates a plain-text business note as a document; it appears in their own Google account. FUGTH can list and open Drive links for documents within its `drive.file` authorization scope, **not enumerate all their private Drive content**.
- Google Sheets: after the owner connects Google, FUGTH provisions one **FUGTH Business Operations** workbook in that owner’s Google account with Overview, Leads and Appointments tabs. FUGTH stores the workbook link only; it does not create a Google account or access the rest of the owner’s Drive.
- Existing Calendar connections may need one-time reauthorization to approve Docs. Current scope status distinguishes Calendar connected versus Docs permitted.
- Neither FUGTH nor site visitors get automatic access to all customer documents, Calendar guest lists or confidential attachments. Third-party industry tools remain correctly labeled planned until supported and approved.

### Current connection and synchronization checks

- A business signs in at `https://www.fugthmanagement.space/dashboard`, opens **Settings → Connections**, chooses **Connect Google**, authorizes access, and returns to FUGTH.
- The connection uses the business's own Google account and token stored encrypted beneath `users/{uid}/integrations/google_calendar`. The app can create a dedicated FUGTH business calendar and app-managed Drive folder; it cannot read the rest of Drive with `drive.file`.
- FUGTH now shows any missing Vercel config names, the connected Google address, a **Check Google connection** button testing the real Calendar and Drive APIs, and **Sync appointments now**. The app also checks the calendar about every two minutes while a signed-in workspace is visible. When the dashboard is closed, Google events remain available for conflict checks at booking time; import into FUGTH resumes on next open. No claim of background synchronization without a scheduler.
- Manual confirmed appointments in the FUGTH Customers tab now use the Google booking endpoint when connected; a failed Google booking is not falsely saved as a confirmed FUGTH booking. Unconnected businesses retain local FUGTH appointment lists.
- A connected business calendar is preferred over an optional founder-owned shared calendar; customer Google tokens are never used to access other business calendars.
- Starting on the apex `fugthmanagement.space` and returning to `www.fugthmanagement.space` previously risked losing the OAuth nonce cookie. The short-lived OAuth cookie now shares the official apex/www domain.
- **Google Cloud Testing mode:** Add each authorized test account under Audience → Test users. Testing refresh tokens usually expire after seven days, requiring reauthorization. Production with sensitive Calendar scopes may require Google's app verification and verified domain, privacy policy, and consent screen.

### Configuration in Google Cloud Console

1. Choose a Google Cloud project and configure the OAuth consent screen, with authorized domains and appropriate testing/production status.
2. Enable **Google Calendar API**, **Google Drive API**, **Google Docs API**, and **Google Sheets API**.
3. Create an **OAuth 2.0 Client ID** for a **Web application**. Add both `https://fugthmanagement.space` and `https://www.fugthmanagement.space` as Authorized JavaScript origins if used in an OAuth client configuration, and make sure the consent-screen authorized domain is verified.
4. Authorized redirect URI (exactly): `https://www.fugthmanagement.space/api/integrations/google/callback`. The callback uses the canonical `NEXT_PUBLIC_APP_URL`, not whichever alias started the flow. Do not use an unregistered Vercel preview URL for connection tests.
5. Set in **Vercel → managementscrp-t → Settings → Environment Variables** (server-side only):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `INTEGRATION_ENCRYPTION_KEY` = 32 bytes of securely generated random data encoded as 64 hexadecimal characters (do not rotate this casually; existing encrypted tokens use it)
   - `NEXT_PUBLIC_APP_URL=https://www.fugthmanagement.space`
6. Configure Firebase Admin separately with `FIREBASE_SERVICE_ACCOUNT` JSON **or** `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Keep credentials only in Vercel.
7. Redeploy after adding or correcting credentials. Then check Settings → Connections for missing variable names. Connect a consenting business test account, select **Check Google connection**, create one trial booking, and verify it appears in the business's Google Calendar and its FUGTH Appointments list. Test Google Drive with a non-sensitive demo recording; no automatic archive is claimed until a completed call has actually been uploaded.
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
