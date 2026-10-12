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
