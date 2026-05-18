import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
    } else {
      admin.initializeApp();
    }
  } catch (err) {
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
    try { verified = await admin.auth().verifyIdToken(idToken); } catch (err) { return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 }); }

    const adminEmail = (verified.email || '').toLowerCase();
    if (!ADMIN_EMAILS.includes(adminEmail)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const { uid, planTier, planStatus, fugthNumber, stripeCustomerId, email, password } = body;
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

    // Update auth user if email/password provided
    try {
      const updatePayload = {};
      if (email) updatePayload.email = email;
      if (password) updatePayload.password = password;
      if (Object.keys(updatePayload).length) {
        await admin.auth().updateUser(uid, updatePayload);
      }
    } catch (err) {
      return NextResponse.json({ error: err.message || 'Failed to update auth user' }, { status: 500 });
    }

    const db = admin.firestore();
    const userRef = db.doc(`users/${uid}`);
    const payload = {};
    if (planTier) payload.planTier = planTier;
    if (planStatus) payload.planStatus = planStatus;
    if (typeof fugthNumber !== 'undefined') {
      payload.vapiNumber = fugthNumber || '';
      payload.vapiLinked = !!fugthNumber;
      payload.needsVapiLink = !fugthNumber;
    }
    if (typeof stripeCustomerId !== 'undefined') payload.stripeCustomerId = stripeCustomerId || null;

    if (Object.keys(payload).length) {
      await userRef.set({ ...payload }, { merge: true });
    }

    // Update any devAccounts documents for this uid
    const q = await db.collection('devAccounts').where('uid', '==', uid).get();
    const batch = db.batch();
    q.forEach((doc) => {
      const ref = db.collection('devAccounts').doc(doc.id);
      const upd = {};
      if (planTier) upd.planTier = planTier;
      if (planStatus) upd.planStatus = planStatus;
      if (typeof fugthNumber !== 'undefined') upd.fugthNumber = fugthNumber || '';
      if (typeof stripeCustomerId !== 'undefined') upd.stripeCustomerId = stripeCustomerId || null;
      batch.update(ref, upd);
    });
    if (!q.empty) await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update-account error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
