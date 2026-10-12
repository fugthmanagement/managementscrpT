import { randomBytes } from "crypto";
import { buildStarterSite } from "../../../../lib/site-presets";
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize firebase-admin once
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
    } else {
      admin.initializeApp();
    }
  } catch (err) {
    // fallback to application default
    try { admin.initializeApp(); } catch (e) { console.error('Admin init failed', e); }
  }
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'fugthmanagement@gmail.com,mepenginestudio@gmail.com').split(',').map(s => s.trim().toLowerCase());

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!idToken) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });

    let verified;
    try {
      verified = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    const adminEmail = (verified.email || '').toLowerCase();
    if (!verified.email_verified || !ADMIN_EMAILS.includes(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password } = body;
    const displayName = body.displayName || body.businessName || '';
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    // Allow creating an account with no plan (planTier === 'none')
    let planTier = body.planTier ?? body.plan ?? 'none';
    let planStatus = body.planStatus ?? body.status ?? (planTier === 'none' ? 'inactive' : 'trial');
    const businessPhone = body.phone ?? '';
    const fugthNumber = body.fugthNumber ?? '';
    const stripeCustomerId = body.stripeCustomerId ?? null;

    // Create or update user
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({ email, password: password || randomBytes(24).toString('base64url'), displayName: displayName || '' });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        userRecord = await admin.auth().getUserByEmail(email);
        if (password) {
          try { await admin.auth().updateUser(userRecord.uid, { password }); } catch (e) { /* ignore */ }
        }
      } else {
        return NextResponse.json({ error: err.message || 'Could not create user' }, { status: 500 });
      }
    }

    const uid = userRecord.uid;
    const db = admin.firestore();

    // Persist user record in Firestore users collection
    const userDoc = db.doc(`users/${uid}`);
    await userDoc.set({
      email,
      displayName: displayName || '',
      planTier,
      planStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      vapiNumber: fugthNumber || '',
      vapiLinked: !!fugthNumber,
      needsVapiLink: !fugthNumber,
      stripeCustomerId: stripeCustomerId || null
    }, { merge: true });

    // Add an entry to devAccounts for admin tracking
    await db.collection('devAccounts').add({
      uid,
      email,
      displayName: displayName || '',
      planTier,
      planStatus,
      fugthNumber: '',
      stripeCustomerId: stripeCustomerId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: verified.uid
    });

    // Generate a separate, safe-to-share business preview. Existing custom sites are
    // deliberately left unchanged if an existing client account is reopened.
    let siteReady=true;
    try {
      await db.doc(`publicSites/${uid}`).create(
        buildStarterSite(uid,body.businessName || displayName || "Your business",body.businessType||body.industry||"general")
      );
    } catch (siteError) {
      if (siteError.code!==6 && siteError.code!=="already-exists") {
        siteReady=false;
        console.error("Client site preview generation failed",siteError?.code||"unknown");
      }
    }
    return NextResponse.json({ success: true, uid, email, siteReady, siteUrl:`/sites/${uid}` });
  } catch (err) {
    console.error('Create-account error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
