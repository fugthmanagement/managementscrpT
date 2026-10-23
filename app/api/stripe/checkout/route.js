import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {BILLING_PLANS,BILLING_ADDONS,addonAmount,validAddons} from "../../../../lib/billing-catalog";
import {ensureCheckoutAccount} from "../../../../lib/server/checkout-account";
import {makeServiceCart,ServiceCartError} from "../../../../lib/billing-cart";
import {stripeCartLines,TEXTBACK_LIVE_PRICE} from "../../../../lib/server/stripe-cart";
import {resolveFirebaseAdminCredentials} from "../../../../lib/server/firebase-admin-credentials";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const siteUrl="https://www.fugthmanagement.space";
const EXPECTED_FUGTH_MERCHANT="acct_1QYiGDHGcNIhcRMj";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const money=n=>Number.isInteger(n)&&n>=0&&n<=100000000;
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!user.email)return reply({error:"Please sign in to select a FUGTH offer."},401);
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return reply({error:"Checkout is not ready: the Stripe merchant key or signed payment-confirmation webhook is missing. No charge started. Contact FUGTH support."},503);
 const credentialCheck=resolveFirebaseAdminCredentials(process.env);
 if(!credentialCheck.ok)return reply({error:"Checkout is waiting for secure account activation ("+credentialCheck.report.code+"). No charge started."},503);
 let body;try{const txt=await req.text();if(txt.length>2500)throw Error();body=JSON.parse(txt);}catch{return reply({error:"Invalid plan selection."},400);}
 let cart;
 try{cart=makeServiceCart(body);}catch(error){return reply({error:error.message||"Invalid service cart."},400);}
 const {planKey,plan,cycle,addons}=cart;
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  // Never collect funds in an unrelated Stripe workspace after a credential migration.
  const account=await stripe.accounts.retrieve();
  if(account.id!==EXPECTED_FUGTH_MERCHANT){
    return reply({error:"Checkout is connected to the wrong FUGTH merchant account. No payment started. Ask FUGTH support to reconnect the correct Stripe account."},503);
  }
  const db=firebaseAdmin().firestore();
  // Verified Firebase UID is authoritative; create only a minimum unpaid profile.
  // A transient client signup write failure must not strand genuine customers.
  const profile=await ensureCheckoutAccount(db,user);
  if(profile?.billingActive&&plan.kind!=="one_time")
   return reply({error:"A subscription is already active. Contact support to change your plan safely."},409);
  if((plan.kind==="one_time"||cart.websiteOneTime)&&profile?.websitePurchased===true)
   return reply({error:"Your website purchase is already paid. Remove the one-time website item or contact FUGTH support."},409);
  let monthlyCents=plan.monthly,setupCents=plan.setup,offerId="",billingAnchor=null;
  if(body.useFounderOffer===true){
   const doc=await db.doc("founderOffers/"+user.uid).get();
   const offer=doc.data()||{};
   if(!doc.exists||offer.planKey!==planKey||offer.status!=="pending"||Date.parse(offer.expiresAt||"")<=Date.now()||
      !money(offer.monthlyCents)||!money(offer.setupCents)||!offer.createdBy)
    return reply({error:"This personalized FUGTH offer is expired or unavailable. Ask your representative to refresh it."},409);
   monthlyCents=offer.monthlyCents;setupCents=offer.setupCents;offerId=doc.id;
   if(offer.requestedBillingAt&&plan.kind!=="one_time"){
    const requested=Date.parse(offer.requestedBillingAt);
    if(!Number.isFinite(requested)||requested<Date.now()+300000||requested>Date.now()+28*86400000)
      return reply({error:"The selected renewal date must be at least five minutes away and within 28 days. Ask FUGTH to prepare a new offer."},409);
    billingAnchor=Math.floor(requested/1000);
   }
  }

  const purchaseCart=makeServiceCart(body,{baseCents:monthlyCents,setupCents});
  // One recurring plan + each validated paid add-on + optional one-time items.
  // All amounts are server-calculated from the canonical FUGTH catalog.
  let liveTextbackPrice=null;
  if(planKey==="textback"&&!offerId){
   liveTextbackPrice=process.env.STRIPE_MISSED_CALL_TEXTBACK_PRICE_ID||TEXTBACK_LIVE_PRICE;
   const price=await stripe.prices.retrieve(liveTextbackPrice);
   if(!price.active||price.currency!=="usd"||price.unit_amount!==4999||
      price.recurring?.interval!=="month"||price.type!=="recurring")
    return reply({error:"The live $49.99 Text-Back product is unavailable. No charge started."},503);
  }
  const line_items=stripeCartLines(purchaseCart,{textbackPrice:liveTextbackPrice});
  const recurringCents=purchaseCart.recurringCents;
  const metadata={userId:user.uid,planKey,planTier:plan.tier,billingCycle:cycle,
   baseAmountCents:String(monthlyCents*multiplier),setupFeeCents:String(setupCents),email:user.email,
   addons:addons.join(","),offerId,kind:plan.kind,websiteOneTime:cart.websiteOneTime?"1":"0"};
  const sessionOptions={
   ui_mode:"hosted",mode:plan.kind==="one_time"?"payment":"subscription",line_items,
   customer_email:user.email,client_reference_id:user.uid,
   success_url:siteUrl+"/billing/return?session_id={CHECKOUT_SESSION_ID}",
   cancel_url:siteUrl+"/plans?plan="+encodeURIComponent(planKey)+"&cycle="+cycle,
   allow_promotion_codes:true,metadata,
   ...(plan.kind==="one_time"?{payment_intent_data:{metadata}}:{subscription_data:{metadata,...(billingAnchor?{billing_cycle_anchor:billingAnchor,proration_behavior:"create_prorations"}:{})}})
  };
  const attempt=String(body?.checkoutAttempt||"");
  const idempotency= /^[A-Za-z0-9_-]{16,80}$/.test(attempt)?
    {idempotencyKey:"fugth_"+user.uid+"_"+attempt}:undefined;
  const session=await stripe.checkout.sessions.create(sessionOptions,idempotency);
  if(!session.url)return reply({error:"Secure checkout could not be opened."},502);
  return reply({url:session.url,oneTime:plan.kind==="one_time",billingCycle:cycle,
   setupFeeCents:setupCents,recurringCents,websiteOneTime:cart.websiteOneTime,
   firstChargeCents:purchaseCart.firstChargeCents,billingAnchor});
 }catch(e){
  console.error("FUGTH checkout startup error",{type:e?.type||"backend",code:e?.code||"unknown"});
  return reply({error:e?.type==="StripeAuthenticationError"?"Stripe rejected FUGTH merchant credentials. No charge started. Contact support.":e?.code==="resource_missing"?"The FUGTH merchant account rejected this product. No charge was made.":
   "Unable to start FUGTH secure checkout. Open Administration → Billing health for account diagnostics."},503);
 }
}
