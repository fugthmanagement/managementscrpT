# FUGTH Site Studio — quick business websites

Site Studio is **not** a paid-website plan, hosting purchase, domain registration, or extra subscription tier. Existing Starter **$49**, Growth **$149**, and Elite **$499** monthly prices are **unchanged**.

## Business owner workflow

1. Client signs up from `/login` with a business name. The client app attempts to seed a private-customer-owned site document into `publicSites/{uid}` immediately, separately from their billing record.
2. Open Dashboard → **More tools** → **Site Studio**. The same panel can create the site if automatic creation was blocked by missing Firestore rules.
3. Choose industry and one of **Editorial / Industrial / Studio / Professional** layouts. Different design compositions, not one template recolored.
4. Edit business name, headline, intro, three service highlights and optional public contact details.
5. Click **Save preview** and **Open website preview**. The shareable preview is clearly labeled and does not expose any private contacts, billing data or call records.
6. Click **Publish website** only after providing a real business contact email/phone and checking the content. The published URL is `https://www.fugthmanagement.space/sites/{uid}`. Use Unpublish to revert to a labeled preview.

The account-generated site defaults to `visibility=preview`. **Preview links are accessible to anyone who knows the URL**; customers should not enter private information. The UI doesn't automatically claim that a generated draft is a genuine, fully configured business site.

## Founder/developer workflow

Dashboard → Business settings → Administration → Account management.

- Set business name and industry; **Create account** provisions the Firebase user and its starter website automatically and returns an **Open created client site** link. On an existing user, an existing site is left unchanged.
- **Generate prospect site** makes a limited, shareable FUGTH preview **without creating any account or charge**. It also returns a direct URL and has a 40-per-day admin safety limit.

## Gallery

Visit `/sites/showcase` to review interactive site design alternatives without a Firebase account. This gallery doesn't represent real customer businesses.

## Firebase configuration required

The checked-in `firestore.rules` now contains `publicSites/{uid}` rules. **You must publish these to the actual Firebase project**. A GitHub commit alone does not deploy Firebase rules. Use Firebase Console → Firestore Database → Rules, or a properly authenticated Firebase CLI with the reviewed rules file.

- Owners can create/update their own strictly limited site fields.
- Public read is allowed for `preview` or `published`; private customer profiles remain owner-only.
- `visibility=hidden` is restricted to the owner; all public collection listings are denied.
- Founder creation uses server-side Firebase Admin SDK and requires its Vercel environment credentials `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

Do not upload credentials, passwords, or private customer details into a public site document.

## Release validation

1. Preview build READY and test on phone and desktop.
2. Publish Firestore rules on the real project.
3. Create a new test client account, verify site doc is generated and link opens.
4. Founder creates a prospect sample and separate client account, both produce working URLs.
5. Change layouts and publish; ensure live contact links work, and verify tenant isolation.
6. Check that subscription prices **and billing records remain unchanged**.
7. Merge and deploy only after validation. 

## FUGTH image library and media tagging
- `lib/site-images.js` contains 22 curated photo records covering 12 industries. Photos are served from the Pexels CDN (no uploaded image assets or third-party API credentials needed).
- Each image has a stable `fg-<industry>-<photo>` image ID, original photo ID, descriptive alt text, searchable tags, photo credit, and source URL.
- `publicSites/{uid}` records only safe allowlisted references: `heroImageId`, `galleryImageIds` and `showGallery`. It never stores a free-form third-party HTML or script URL.
- Photos are **illustrative stock samples**, not representations of the customer's own premises, staff or completed projects. Published and draft site images carry a small illustrative label.
- The editor allows selecting among matching industry images and toggling the supplementary gallery. When the industry changes, the associated image choices change too.
- If a photo cannot load, `SitePhoto` attempts another photo from the same industry, then shows a neutral fallback.
- Pexels license: https://www.pexels.com/license/ . Public image credit metadata is preserved, and Pexels imagery must not be used to imply endorsement by the people depicted. Photos are externally hosted and may not load offline; future customer-owned uploads should use storage, validation and explicit upload quotas.

## Permanent FUGTH account references
Every real Firebase customer account receives a server-issued `537000`–`537999` reference when Firebase Admin credentials are configured.
- `lib/server/account-number.js`: chooses a randomized free candidate and atomically creates `fugthAccountNumbers/{number}` with `users/{uid}.accountNumber` in one Firestore transaction. It is permanent and never recycled.
- `app/api/account-number`: accepts only a verified Firebase bearer token for the requesting user, never client-chosen numbers.
- Signup attempts to allocate immediately. The dashboard retries once on a future signed-in session when the record is missing; existing allocations are preserved.
- Founder-created client accounts receive the number in account-creation responses and the developer workspace.
- **Capacity**: The requested six-digit scheme only contains 1,000 unique numbers. Plan a longer account-number format before exhausting them; no automatic reuse or silent longer numbers.
- `accountNumber` and `accountNumberIssuedAt` are server-owned and blocked from user edits by `firestore.rules`. Do not use the public account number as a login, password, authorization token or secret.
- Generated *prospect* websites without a customer account do **not** consume account numbers.

### Test checklist
1. Verify images and alternative text for roofing, medical clinic, dental, salon, legal, automotive, restaurant, etc. across all four design layouts and preview widths.
2. Confirm changing an industry's photos cannot access external or off-industry image URLs.
3. Confirm signup allocates `537xxx`, and repeated calls or two concurrent calls for the same user do not change that value.
4. Confirm parallel customer creation never allocates the same number to distinct users. Verify reservations in `fugthAccountNumbers`.
5. Confirm users cannot overwrite their account number directly through browser Firestore writes and cannot read another customer's account document.
6. Confirm preexisting users get numbers without modifying billing, call settings or client website content.
7. Verify no real phone calls or subscription changes are triggered by these website/ID changes.
