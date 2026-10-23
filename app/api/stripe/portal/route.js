import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {resolveFirebaseAdminCredentials} from "../../../../lib/server/firebase-admin-credentials";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return respond({error:"Sign in to manage your FUGTH subscription."},401);
 if(!process.env.STRIPE_SECRET_KEY||!resolveFirebaseAdminCredentials(process.env).ok)
  return respond({error:"Account billing connection is temporarily unavailable."},503);
 try{
  const db=firebaseAdmin().firestore();
  const profile=(await db.doc("users/"+user.uid).get()).data()||{};
  if(!profile.billingActive||!/^cus_[A-Za-z0-9]+$/.test(String(profile.stripeCustomerId||"")))
   return respond({error:"No active subscription is associated with this account."},409);
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const customer=await stripe.customers.retrieve(profile.stripeCustomerId);
  if(customer.deleted)return respond({error:"The Stripe customer account is inactive."},409);
  const session=await stripe.billingPortal.sessions.create({
   customer:profile.stripeCustomerId,
   return_url:"https://www.fugthmanagement.space/dashboard?tab=services"
  });
  if(!session.url||!session.url.startsWith("https://billing.stripe.com/"))
   throw Error("Missing verified Stripe billing portal URL.");
  return respond({url:session.url});
 }catch(error){
  console.error("FUGTH_STRIPE_PORTAL",{code:error?.code||error?.type||"unavailable"});
  return respond({error:"The subscription-management portal is not available yet. Contact FUGTH billing support to request a plan change without opening a duplicate subscription."},503);
 }
}
