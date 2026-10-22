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
 const preflight=resolveFirebaseAdminCredentials(process.env);
 const firebaseReady=preflight.ok;
 if(!secret)issues.push({code:"STRIPE_KEY_MISSING",message:"Secure checkout is not connected to a Stripe merchant account."});
 if(!webhook)issues.push({code:"WEBHOOK_MISSING",message:"Subscription payment verification is not configured. A charge will not be attempted."});
 if(!firebaseReady)issues.push({code:preflight.report.code,message:"Secure account activation cannot reach Firebase: "+preflight.report.message+" No payment will start."});
 let merchantChecked=false,merchantMatches=false;
 if(secret)try{
  const stripe=new Stripe(secret,{apiVersion:"2024-06-20"});
  const account=await stripe.accounts.retrieve();
  merchantChecked=true;merchantMatches=account.id===EXPECTED_ACCOUNT;
  if(!merchantMatches)issues.push({code:"MERCHANT_MISMATCH",message:"The merchant credentials point to a different Stripe account than the configured FUGTH Management merchant."});
 }catch{issues.push({code:"STRIPE_CONNECTION_ERROR",message:"The Stripe connection could not be verified. Check the merchant API credentials."});}
 if(firebaseReady)try{
  const admin=firebaseAdmin();
  const doc=await admin.firestore().doc("users/"+user.uid).get();
  if(!doc.exists)issues.push({code:"ACCOUNT_NOT_FOUND",message:"Your FUGTH account profile is not ready. Complete sign-up before checkout."});
 }catch{issues.push({code:"ACCOUNT_STORE_UNAVAILABLE",message:"FUGTH cannot safely access your account activation record."});}
 return reply({ready:issues.length===0,issues,merchantChecked,merchantMatches,checkoutMode:secret?.startsWith("sk_test_")?"test":secret?.startsWith("sk_live_")?"live":"configured",message:issues.length?"Checkout needs attention before a payment can start.":"Merchant, webhook and account prerequisites passed. Final payment still depends on Stripe approval and signed verification."});
}
