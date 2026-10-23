import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
import {resolveFirebaseAdminCredentials} from "../../../../../lib/server/firebase-admin-credentials";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const EXPECTED_ACCOUNT="acct_1QYiGDHGcNIhcRMj";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return reply({ready:false,error:"Sign in to check checkout availability."},401);
 const issues=[];
 const secret=process.env.STRIPE_SECRET_KEY,webhook=process.env.STRIPE_WEBHOOK_SECRET;
 const credentialCheck=resolveFirebaseAdminCredentials(process.env);
 const firebaseReady=credentialCheck.ok;
 if(!secret)issues.push({code:"STRIPE_KEY_MISSING",message:"Secure checkout is not connected to a Stripe merchant account."});
 if(!webhook)issues.push({code:"WEBHOOK_MISSING",message:"Subscription payment verification is not configured. A charge will not be attempted."});
 if(!firebaseReady)issues.push({code:credentialCheck.report.code,message:"Secure account activation needs attention ("+credentialCheck.report.code+"). No charge will start."});
 let merchantChecked=false,merchantMatches=false;
 if(secret)try{
  const stripe=new Stripe(secret,{apiVersion:"2024-06-20"});
  const account=await stripe.accounts.retrieve();
  merchantChecked=true;merchantMatches=account.id===EXPECTED_ACCOUNT;
  if(!merchantMatches)issues.push({code:"MERCHANT_MISMATCH",message:"The merchant credentials point to a different Stripe account than the configured FUGTH Management merchant."});
 }catch{issues.push({code:"STRIPE_CONNECTION_ERROR",message:"The Stripe connection could not be verified. Check the merchant API credentials."});}
 let profilePending=false;
 if(firebaseReady)try{
  const admin=firebaseAdmin();
  const doc=await admin.firestore().doc("users/"+user.uid).get();
  // The POST route securely creates a minimal unpaid record for this verified UID.
  // Absence alone is not a payment blocker when Firestore is operational.
  profilePending=!doc.exists;
 }catch(error){console.warn("FUGTH_CHECKOUT_FIRESTORE_READ",{code:error?.code||"unknown"});
  issues.push({code:"ACCOUNT_STORE_UNAVAILABLE",message:"FUGTH cannot verify account storage right now. No charge will start."});}
 return reply({ready:issues.length===0,issues,merchantChecked,merchantMatches,profilePending,firebaseCode:credentialCheck.report.code,checkoutMode:secret?.startsWith("sk_test_")?"test":secret?.startsWith("sk_live_")?"live":"configured",message:issues.length?"Checkout needs attention before a payment can start.":"Merchant, webhook and account prerequisites passed. Final payment still depends on Stripe approval and signed verification."});
}
