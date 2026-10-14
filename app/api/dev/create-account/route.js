import { randomBytes } from "crypto";
import { buildStarterSite } from "../../../../lib/site-presets";
import { allocateFugthAccountNumber } from "../../../../lib/server/account-number";
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

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'fugthmanagement@gmail.com,mepenginestudio@gmail.com,fugthchat@gmail.com,novaeriahengine@gmail.com').split(',').map(s => s.trim().toLowerCase());

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
    const displayName = String(body.displayName || body.businessName || '').trim().slice(0,80);
    if (!email || typeof email !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid customer email.' }, { status: 400 });

    // Allow creating an account with no plan (planTier === 'none')
    let planTier = 'none';
    let planStatus = 'inactive';
    const businessPhone = String(body.phone ?? '').trim().slice(0,32);
    const businessName = String(body.businessName || displayName || '').trim().slice(0,80);
    const businessType = String(body.businessType || body.industry || 'general').trim().slice(0,50);
    const serviceArea = String(body.serviceArea || '').trim().slice(0,100);
    const hours = String(body.hours || '').trim().slice(0,100);
    const fugthNumber = body.fugthNumber ?? '';
    const stripeCustomerId = body.stripeCustomerId ?? null;

    // Create or update user
    let userRecord;
    let newlyCreated = false;
    try {
      userRecord = await admin.auth().createUser({ email, password: password || randomBytes(24).toString('base64url'), displayName: displayName || '' });
      newlyCreated=true;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'This customer already has a FUGTH account. Open the customer in Administration instead.' }, { status: 409 });
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
      businessName,
      businessType,
      phone: businessPhone,
      serviceArea,
      hours,
      planTier,
      planStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      vapiNumber: fugthNumber || '',
      vapiLinked: !!fugthNumber,
      needsVapiLink: !fugthNumber,
      stripeCustomerId: stripeCustomerId || null
    }, { merge: true });

    // Server-issued permanent public reference; never derived from the Firebase UID.
    const assigned = await allocateFugthAccountNumber(db,uid);
    const accountNumber=assigned.number;

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
        buildStarterSite(uid,businessName||"Your business",businessType,{phone:businessPhone,email,serviceArea,hours})
      );
    } catch (siteError) {
      if (siteError.code!==6 && siteError.code!=="already-exists") {
        siteReady=false;
        console.error("Client site preview generation failed",siteError?.code||"unknown");
      }
    }
    // Account owners must establish their own password. We do not email people
    // automatically without a configured mail sender. Show the founder a
    // single-use activation link only when a NEW account was created.
    let activationLink=null;
    if(newlyCreated && !password){
      try { activationLink=await admin.auth().generatePasswordResetLink(email); }
      catch { console.warn("Client activation link unavailable; normal Forgot Password still works."); }
    }
    return NextResponse.json({
      success:true, uid, accountNumber, email, siteReady,siteUrl:`/sites/${uid}`,
      activationLink, activationNeeded: newlyCreated&&!password
    });
  } catch (err) {
    console.error('Create-account error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
