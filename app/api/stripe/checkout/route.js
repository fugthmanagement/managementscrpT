import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {BILLING_PLANS,BILLING_ADDONS,addonAmount,validAddons} from "../../../../lib/billing-catalog";
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
 if(!process.env.FIREBASE_SERVICE_ACCOUNT&&!(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY))
  return reply({error:"Checkout is not ready: secure Firebase activation credentials are missing. No charge started. Contact FUGTH support."},503);
 let body;try{const txt=await req.text();if(txt.length>2500)throw Error();body=JSON.parse(txt);}catch{return reply({error:"Invalid plan selection."},400);}
 const planKey=String(body?.planKey||""),plan=BILLING_PLANS[planKey];
 if(!plan)return reply({error:"Choose a valid package."},400);
 const cycle=body?.billingCycle==="yearly"?"yearly":"monthly",multiplier=cycle==="yearly"?12:1,interval=cycle==="yearly"?"year":"month";
 const addons=validAddons(planKey,body?.addons||[]);
 if(!addons)return reply({error:"Invalid add-on selection."},400);
 if(plan.kind==="one_time"&&cycle==="yearly")return reply({error:"Website purchases are one-time payments."},400);
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  // Never collect funds in an unrelated Stripe workspace after a credential migration.
  const account=await stripe.accounts.retrieve();
  if(account.id!==EXPECTED_FUGTH_MERCHANT){
    return reply({error:"Checkout is connected to the wrong FUGTH merchant account. No payment started. Ask FUGTH support to reconnect the correct Stripe account."},503);
  }
  const db=firebaseAdmin().firestore(),userDoc=await db.doc("users/"+user.uid).get();
  if(!userDoc.exists)return reply({error:"We couldn't find your FUGTH account profile. Sign out and back in, then finish the account setup before checkout."},409);
  if(userDoc.data()?.billingActive&&plan.kind!=="one_time")
   return reply({error:"A subscription is already active. Contact support to change your plan safely."},409);
  if(plan.kind==="one_time"&&userDoc.data()?.websitePurchased===true)
   return reply({error:"This account already has a paid website purchase. Contact FUGTH support before placing a second order."},409);
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
  const recurringCents=(monthlyCents+addons.reduce((a,k)=>a+addonAmount(planKey,k),0))*multiplier;
  const line_items=[{
   price_data:{currency:"usd",unit_amount:monthlyCents*multiplier,
    ...(plan.kind==="one_time"?{}:{recurring:{interval,interval_count:1}}),
    product_data:{name:"FUGTH "+plan.name,metadata:{brand:"fugth_management",planKey,kind:plan.kind}}},
   quantity:1
  }];
  if(setupCents>0)line_items.push({price_data:{currency:"usd",unit_amount:setupCents,
   product_data:{name:"FUGTH "+plan.name+" one-time onboarding"}},quantity:1});
  addons.forEach(key=>line_items.push({price_data:{currency:"usd",unit_amount:addonAmount(planKey,key)*multiplier,
   recurring:{interval,interval_count:1},product_data:{name:"FUGTH add-on — "+BILLING_ADDONS[key].name}},quantity:1}));
  const metadata={userId:user.uid,planKey,planTier:plan.tier,billingCycle:cycle,
   baseAmountCents:String(monthlyCents*multiplier),setupFeeCents:String(setupCents),email:user.email,
   addons:addons.join(","),offerId,kind:plan.kind};
  const session=await stripe.checkout.sessions.create({
   ui_mode:"hosted",mode:plan.kind==="one_time"?"payment":"subscription",line_items,
   customer_email:user.email,client_reference_id:user.uid,
   success_url:siteUrl+"/billing/return?session_id={CHECKOUT_SESSION_ID}",
   cancel_url:siteUrl+"/plans?plan="+encodeURIComponent(planKey)+"&cycle="+cycle,
   allow_promotion_codes:true,metadata,
   ...(plan.kind==="one_time"?{payment_intent_data:{metadata}}:{subscription_data:{metadata,...(billingAnchor?{billing_cycle_anchor:billingAnchor,proration_behavior:"create_prorations"}:{})}})
  });
  if(!session.url)return reply({error:"Secure checkout could not be opened."},502);
  return reply({url:session.url,oneTime:plan.kind==="one_time",billingCycle:cycle,
   setupFeeCents:setupCents,recurringCents:plan.kind==="one_time"?0:recurringCents,billingAnchor});
 }catch(e){
  console.error("FUGTH checkout startup error",{type:e?.type||"backend",code:e?.code||"unknown"});
  return reply({error:e?.type==="StripeAuthenticationError"?"Stripe rejected FUGTH merchant credentials. No charge started. Contact support.":e?.code==="resource_missing"?"The FUGTH merchant account rejected this product. No charge was made.":
   "Unable to start FUGTH secure checkout. Open Administration → Billing health for account diagnostics."},503);
 }
}
