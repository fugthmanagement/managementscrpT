import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {priceDetails} from "../../../../lib/server/fugth-price-catalog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const allowedAddons=new Set(["website","booking","email","analytics","automation","priority","integration","voice","location","staff","sms"]);
const iso=s=>Number(s)>0?new Date(Number(s)*1000).toISOString():null;
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return reply({error:"Sign in to verify your FUGTH subscription."},401);
 if(!process.env.STRIPE_SECRET_KEY||!(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY||process.env.FIREBASE_SERVICE_ACCOUNT))
  return reply({error:"Subscription verification is not ready. Contact FUGTH support."},503);
 let sessionId;
 try{const data=await request.json();sessionId=String(data.sessionId||"");}
 catch{return reply({error:"Invalid payment confirmation."},400);}
 if(!/^cs_(live|test)_[A-Za-z0-9_]{10,250}$/.test(sessionId))return reply({error:"Invalid payment reference."},400);
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const session=await stripe.checkout.sessions.retrieve(sessionId);
  // The session must be completed by this same authenticated Firebase account.
  if(session.client_reference_id!==user.uid)return reply({error:"This payment is not associated with your FUGTH account."},403);
  if(session.status!=="complete")return reply({verified:false,reason:"Payment is still in progress."});
  const subId=typeof session.subscription==="string"?session.subscription:session.subscription?.id;
  if(!subId)return reply({verified:false,reason:"No subscription associated with this checkout."});
  const subscription=await stripe.subscriptions.retrieve(subId,{expand:["items.data.price"]});
  if(subscription.metadata?.userId!==user.uid)return reply({error:"Subscription owner mismatch."},403);
  const matched=priceDetails(subscription.items?.data?.[0]?.price?.id||"");
  if(!matched)return reply({error:"FUGTH couldn't match this subscription to an authorized plan."},422);
  const {tier,cycle}=matched;
  const active=["active","trialing"].includes(subscription.status);
  const item=subscription.items.data[0];
  const from=iso(item.current_period_start||subscription.current_period_start);
  const until=iso(item.current_period_end||subscription.current_period_end);
  const addons=String(subscription.metadata?.addons||"").split(",").filter(a=>allowedAddons.has(a));
  const db=firebaseAdmin().firestore();
  const userRef=db.doc("users/"+user.uid),audit=db.doc("stripeReconciliations/"+sessionId);
  const now=new Date().toISOString();
  // This writes only freshly verified Stripe facts. The client cannot choose
  // their tier, price, renewal date, or activate an unpaid subscription.
  const fields={
   planTier:tier,planStatus:subscription.status,billingActive:active,
   billingAddons:addons,billingCycle:cycle,
   stripeCustomerId:typeof subscription.customer==="string"?subscription.customer:subscription.customer?.id||"",
   stripeSubscriptionId:subscription.id,
   billingCurrentPeriodStart:from,billingCurrentPeriodEnd:until,
   billingRenewsAt:active&&!subscription.cancel_at_period_end?until:null,
   billingExpiresAt:iso(subscription.cancel_at||subscription.ended_at)||until,
   billingCancelAtPeriodEnd:Boolean(subscription.cancel_at_period_end),
   billingTrialEndsAt:iso(subscription.trial_end),
   billingEmail:subscription.metadata?.email||user.email||"",
   billingUpdatedAt:now
  };
  await db.runTransaction(async tx=>{
   const prior=await tx.get(audit);
   if(prior.exists)return;
   tx.set(userRef,fields,{merge:true});
   tx.create(audit,{uid:user.uid,subscriptionId:subscription.id,planTier:tier,
    status:subscription.status,billingCycle:cycle,verifiedAt:now});
  });
  return reply({verified:true,active,planTier:tier,status:subscription.status});
 }catch(error){
  console.error("FUGTH checkout verification",{code:error?.code||error?.type||"server"});
  return reply({error:"FUGTH couldn't verify your purchase yet. Please refresh your subscription status."},503);
 }
}
