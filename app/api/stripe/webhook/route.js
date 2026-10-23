import Stripe from "stripe";
import { NextResponse } from "next/server";
import { firebaseAdmin } from "../../../../lib/server/auth";
import {priceDetails} from "../../../../lib/server/fugth-price-catalog";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supported = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);
function planForSubscription(subscription){
 // New checkout sessions create their prices dynamically. Validate their
 // trusted Stripe-created subscription metadata against the actual base line.
 const meta=subscription.metadata||{},plan=BILLING_PLANS[meta.planKey];
 if(meta.planKey==="textback"&&meta.planTier==="textback"&&meta.kind==="subscription"&&
    meta.billingCycle!=="yearly"){
  const priceId=process.env.STRIPE_MISSED_CALL_TEXTBACK_PRICE_ID||"price_1UTPooHGcNIhcRMjPDGqXQXf";
  if((subscription.items?.data||[]).some(line=>line.price?.id===priceId&&
    line.price?.active!==false&&line.price?.currency==="usd"&&
    line.price?.unit_amount===4999&&line.price?.recurring?.interval==="month"))
   return {tier:"textback",cycle:"monthly",offer:"textback"};
 }

 const amount=Number(meta.baseAmountCents);
 const cycle=meta.billingCycle==="yearly"?"yearly":"monthly";
 if(plan&&plan.kind!=="one_time"&&meta.kind==="subscription"&&
    meta.planTier===plan.tier&&Number.isSafeInteger(amount)&&amount>0){
  const interval=cycle==="yearly"?"year":"month";
  const matched=(subscription.items?.data||[]).some(line=>{
   const product=line.price?.product,productMeta=typeof product==="object"?product.metadata||{}:{};
   return line.price?.active!==false&&line.price?.currency==="usd"&&line.price?.unit_amount===amount&&
     line.price?.recurring?.interval===interval&&productMeta.brand==="fugth_management"&&productMeta.planKey===meta.planKey;
  });
  if(matched)return {tier:plan.tier,cycle,offer:meta.planKey};
 }
 // Preserve all existing subscribers on their original Stripe price IDs.
 for(const line of subscription.items?.data||[]){
  const legacy=priceDetails(line.price?.id||"");
  if(legacy)return legacy;
 }
 return null;
}
function iso(seconds) {
  return Number.isFinite(Number(seconds)) && Number(seconds) > 0
    ? new Date(Number(seconds) * 1000).toISOString()
    : null;
}
function subscriptionPeriod(subscription) {
  const line=subscription.items?.data?.[0];
  return {
    start: iso(line?.current_period_start || subscription.current_period_start),
    end: iso(line?.current_period_end || subscription.current_period_end),
  };
}
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "FUGTH payment confirmation unavailable." }, { status: 503 });
  }
  if (!(process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY))) {
    return NextResponse.json({ error: "FUGTH account activation unavailable." }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {apiVersion:"2024-06-20"});
  let event;
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({error:"Missing payment verification signature."},{status:400});
    event = stripe.webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid payment verification signature." }, { status: 400 });
  }
  if (!supported.has(event.type)) return NextResponse.json({ received:true, skipped:true });
  try {
    let subscriptionId="";
    const obj=event.data.object;
    if (event.type==="checkout.session.completed") subscriptionId=typeof obj.subscription==="string"?obj.subscription:obj.subscription?.id||"";
    else if (event.type.startsWith("customer.subscription.")) subscriptionId=obj.id;
    else if (event.type.startsWith("invoice.")) {
      subscriptionId=(typeof obj.subscription==="string"?obj.subscription:obj.subscription?.id)
        || obj.parent?.subscription_details?.subscription || "";
    }
    if ((event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded")&&obj.mode==="payment"){
      if(obj.payment_status!=="paid")return NextResponse.json({received:true,pending:true});
      const meta=obj.metadata||{},uid=meta.userId||obj.client_reference_id||"";
      if(meta.planKey!=="website_one_time"||meta.kind!=="one_time"||!/^[a-zA-Z0-9_-]{8,128}$/.test(uid))
       throw new Error("Unknown one-time payment order.");
      const db=firebaseAdmin().firestore(),eventRef=db.doc("processedStripeEvents/"+event.id),userRef=db.doc("users/"+uid);
      await db.runTransaction(async tx=>{
       const seen=await tx.get(eventRef);if(seen.exists)return;
       const profile=await tx.get(userRef);
       if(!profile.exists)throw Error("One-time website buyer account was not found.");
       tx.set(userRef,{websitePurchased:true,websitePurchasedAt:new Date().toISOString(),
        websiteOrderStatus:"awaiting_materials",websitePurchaseSessionId:obj.id},{merge:true});
       tx.create(eventRef,{type:event.type,uid,checkoutSessionId:obj.id,recordedAt:new Date().toISOString()});
      });
      return NextResponse.json({received:true,sitePurchase:true});
    }
    if (!subscriptionId) return NextResponse.json({ received:true, skipped:true, reason:"No subscription reference." });
    // Fresh Stripe subscription state avoids stale or out-of-order webhooks extending access.
    const subscription=await stripe.subscriptions.retrieve(subscriptionId,{expand:["items.data.price.product"]});
    const uid=subscription.metadata?.userId || (event.type==="checkout.session.completed"?obj.client_reference_id:"");
    if (!uid || !/^[a-zA-Z0-9_-]{8,128}$/.test(uid)) throw new Error("Stripe subscription is not associated with a verified Firebase account.");
    const matched=planForSubscription(subscription);
    if (!matched) throw new Error("Stripe price does not match configured subscription tiers.");
    const {start,end}=subscriptionPeriod(subscription);
    const status=subscription.status;
    const isActive=status==="active"||status==="trialing";
    const cancelAtPeriodEnd=Boolean(subscription.cancel_at_period_end);
    const expiresAt=iso(subscription.cancel_at || subscription.ended_at) || end;
    const data={
      planTier:matched.tier,
      billingOfferKey:matched.offer||subscription.metadata?.planKey||null,
      billingCycle:matched.cycle,
      billingAddons:String(subscription.metadata?.addons||"").split(",").filter(x=>["website","booking","email","analytics","automation","priority","integration","voice","location","staff","sms","textback"].includes(x)),
      planStatus:status,
      billingActive:isActive,
      billingCurrentPeriodStart:start,
      billingCurrentPeriodEnd:end,
      billingRenewsAt:isActive&&!cancelAtPeriodEnd?end:null,
      billingExpiresAt:expiresAt,
      billingCancelAtPeriodEnd:cancelAtPeriodEnd,
      billingTrialEndsAt:iso(subscription.trial_end),
      billingUpdatedAt:new Date().toISOString(),
      stripeCustomerId:typeof subscription.customer==="string"?subscription.customer:subscription.customer?.id||"",
      stripeSubscriptionId:subscription.id,
      billingEmail:subscription.metadata?.email||"",
      billingBasePriceCents:subscription.metadata?.baseAmountCents?Number(subscription.metadata.baseAmountCents):null,
    };
    const db=firebaseAdmin().firestore();
    const eventRef=db.doc("processedStripeEvents/"+event.id);
    const userRef=db.doc("users/"+uid);
    await db.runTransaction(async tx=>{
      const seen=await tx.get(eventRef);
      if(seen.exists)return;
      tx.set(userRef,{...data,email:subscription.metadata?.email||""},{merge:true});
      tx.create(eventRef,{type:event.type,subscriptionId:subscription.id,uid,recordedAt:new Date().toISOString()});
    });
    return NextResponse.json({received:true});
  } catch(e) {
    console.error("Stripe subscription sync failed", {eventId:event.id,type:event.type,error:e?.message});
    return NextResponse.json({error:"Subscription sync temporarily unavailable."},{status:500});
  }
}
