import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {priceDetails} from "../../../../lib/server/fugth-price-catalog";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";
import {verifiedStripeCartSubscription,verifyWebsiteCartLines} from "../../../../lib/server/stripe-cart";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const allowedAddons=new Set(["website","booking","email","analytics","automation","priority","integration","voice","location","staff","sms"]);
const iso=s=>Number(s)>0?new Date(Number(s)*1000).toISOString():null;
const verifiedPlan=sub=>verifiedStripeCartSubscription(sub,priceDetails);
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return reply({error:"Sign in to verify your FUGTH payment."},401);
 if(!process.env.STRIPE_SECRET_KEY||!(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)))
  return reply({error:"Payment confirmation is not ready. Contact FUGTH support."},503);
 let sessionId;try{const t=await request.text();if(t.length>500)throw Error();sessionId=String(JSON.parse(t).sessionId||"");}
 catch{return reply({error:"Invalid payment reference."},400);}
 if(!/^cs_(live|test)_[A-Za-z0-9_]{10,250}$/.test(sessionId))return reply({error:"Invalid payment reference."},400);
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const session=await stripe.checkout.sessions.retrieve(sessionId);
  if(session.client_reference_id!==user.uid)return reply({error:"This payment belongs to another account."},403);
  if(session.status!=="complete")return reply({verified:false,reason:"Checkout has not completed."});
  const db=firebaseAdmin().firestore(),userRef=db.doc("users/"+user.uid),audit=db.doc("stripeReconciliations/"+sessionId);
  const now=new Date().toISOString();
  if(session.mode==="payment"){
   if(session.payment_status!=="paid")return reply({verified:false,reason:"Payment is awaiting confirmation."});
   if(session.metadata?.userId!==user.uid||session.metadata?.kind!=="one_time"||session.metadata?.planKey!=="website_one_time")
    return reply({error:"Unrecognized website purchase."},422);
   const paidLines=await stripe.checkout.sessions.listLineItems(sessionId,{limit:100,expand:["data.price.product"]});
   if(!verifyWebsiteCartLines(paidLines.data))return reply({error:"Unverified website payment item."},422);
   await db.runTransaction(async tx=>{
    if((await tx.get(audit)).exists)return;
    const profile=await tx.get(userRef);if(!profile.exists)throw Error("Account does not exist.");
    tx.set(userRef,{websitePurchased:true,websitePurchasedAt:now,websiteOrderStatus:"awaiting_materials",websitePurchaseSessionId:sessionId},{merge:true});
    tx.create(audit,{uid:user.uid,kind:"website_one_time",verifiedAt:now});
   });
   return reply({verified:true,websitePurchased:true});
  }
  const subId=typeof session.subscription==="string"?session.subscription:session.subscription?.id;
  if(!subId)return reply({verified:false,reason:"Subscription is still being created."});
  const subscription=await stripe.subscriptions.retrieve(subId,{expand:["items.data.price.product"]});
  if(subscription.metadata?.userId!==user.uid)return reply({error:"Subscription owner mismatch."},403);
  const matched=verifiedPlan(subscription);
  if(!matched)return reply({error:"The plan or upgrades could not be matched to a paid FUGTH cart."},422);
  let websitePaid=false;
  if(session.payment_status==="paid"&&session.metadata?.websiteOneTime==="1"&&
     subscription.metadata?.websiteOneTime==="1"){
   const paidLines=await stripe.checkout.sessions.listLineItems(sessionId,{limit:100,expand:["data.price.product"]});
   if(!verifyWebsiteCartLines(paidLines.data))return reply({error:"Website item could not be verified."},422);
   websitePaid=true;
  }
  const active=["active","trialing"].includes(subscription.status);
  const first=subscription.items.data[0],from=iso(first.current_period_start||subscription.current_period_start);
  const until=iso(first.current_period_end||subscription.current_period_end);
  const addons=matched.addons||[];
  const fields={planTier:matched.tier,billingOfferKey:matched.offer||subscription.metadata?.planKey||null,
   planStatus:subscription.status,billingActive:active,billingAddons:addons,billingCycle:matched.cycle,
   stripeCustomerId:typeof subscription.customer==="string"?subscription.customer:subscription.customer?.id||"",
   stripeSubscriptionId:subscription.id,billingCurrentPeriodStart:from,billingCurrentPeriodEnd:until,
   billingRenewsAt:active&&!subscription.cancel_at_period_end?until:null,
   billingExpiresAt:iso(subscription.cancel_at||subscription.ended_at)||until,
   billingCancelAtPeriodEnd:Boolean(subscription.cancel_at_period_end),billingTrialEndsAt:iso(subscription.trial_end),
   billingBasePriceCents:subscription.metadata?.baseAmountCents?Number(subscription.metadata.baseAmountCents):null,
   billingEmail:subscription.metadata?.email||user.email||"",billingUpdatedAt:now,
   ...(websitePaid?{websitePurchased:true,websitePurchasedAt:now,websiteOrderStatus:"awaiting_materials",
     websitePurchaseSessionId:sessionId}:{})};
  await db.runTransaction(async tx=>{
   if((await tx.get(audit)).exists)return;
   tx.set(userRef,fields,{merge:true});
   tx.create(audit,{uid:user.uid,subscriptionId:subscription.id,planTier:matched.tier,
    status:subscription.status,billingCycle:matched.cycle,verifiedAt:now});
  });
  return reply({verified:true,active,planTier:matched.tier,status:subscription.status});
 }catch(error){
  console.error("FUGTH checkout reconciliation failed",{code:error?.code||error?.type||"server"});
  return reply({error:"Payment verification is temporarily unavailable. Refresh or contact FUGTH support."},503);
 }
}
