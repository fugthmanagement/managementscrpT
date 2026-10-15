import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// The previous route accepted arbitrary user IDs and email addresses to
// apply historical plan flags. It is intentionally disabled. FUGTH billing
// entitlements now come only from signed Stripe events and a verified
// Checkout-session reconciliation bound to the authenticated Firebase uid.
export async function POST(){
 return NextResponse.json({error:"This older billing update is no longer available. Use your FUGTH checkout confirmation or contact support."},
  {status:410,headers:{"Cache-Control":"no-store"}});
}
