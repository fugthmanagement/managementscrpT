import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {BILLING_PLANS,BILLING_ADDONS,addonAmount,validAddons} from "../../../../lib/billing-catalog";

export const runtime="nodejs";
export const dynamic="force-dynamic";
// New catalog belongs to the newly authorized FUGTH Management Stripe connection.
// Verify STRIPE_SECRET_KEY belongs to acct_1QYiGDHGcNIhcRMj before accepting payments.
const priceMap=()=>({
 starter:"price_1UQOt9HGcNIhcRMjZJVSgXII",
 growth:"price_1UQOtBHGcNIhcRMj2uKPsRjD",
 elite:"price_1UQOtDHGcNIhcRMjvH0HGgfV"
});
const siteUrl="https://www.fugthmanagement.space";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!user.email)return reply({error:"Please sign in to select a subscription."},401);
 if(!process.env.STRIPE_SECRET_KEY)return reply({error:"Stripe's server connection is not configured."},503);
 // Prevent charging people if a signed payment webhook cannot activate their plan.
 if(!process.env.STRIPE_WEBHOOK_SECRET)return reply({error:"Payment activation is awaiting its Stripe webhook connection. Contact FUGTH support."},503);
 if(!process.env.FIREBASE_SERVICE_ACCOUNT&&!(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY))
  return reply({error:"Payment activation requires Firebase server credentials in Vercel. Contact FUGTH support."},503);
 let body;
 try{body=await req.json();}catch{return reply({error:"Invalid plan selection."},400);}
 const planKey=body?.planKey,plan=BILLING_PLANS[planKey];
 if(!plan)return reply({error:"Choose a valid plan."},400);
 const addons=validAddons(planKey,body.addons||[]);
 if(!addons)return reply({error:"Invalid add-on selection."},400);
 const priceId=priceMap()[planKey];
 if(!priceId)return reply({error:"The monthly price for this plan is not connected to Stripe yet."},503);
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const accountIdentity=await stripe.accounts.retrieve();
  if(accountIdentity.id!=="acct_1QYiGDHGcNIhcRMj")
   return reply({error:"Checkout is awaiting the new FUGTH Management Stripe API key. No payment has been started."},503);
  const account=await firebaseAdmin().firestore().doc("users/"+user.uid).get();
  if(account.data()?.billingActive)return reply({error:"A subscription is already active. Contact support before changing plans."},409);
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.currency!=="usd"||price.unit_amount!==plan.monthly||
    price.recurring?.interval!=="month"||price.recurring?.interval_count!==1)
   return reply({error:"This Stripe price does not match the FUGTH plan. Contact support to update the linked price."},503);
  const line_items=[{price:priceId,quantity:1},{
   price_data:{currency:"usd",unit_amount:plan.setup,product_data:{name:"FUGTH "+plan.name+" one-time implementation",
    description:"Personal business onboarding and implementation for the "+plan.name+" plan."}},
   quantity:1
  }];
  addons.forEach(key=>line_items.push({
   price_data:{currency:"usd",unit_amount:addonAmount(planKey,key),
    recurring:{interval:"month"},product_data:{name:"FUGTH add-on — "+BILLING_ADDONS[key].name}},
   quantity:1
  }));
  const session=await stripe.checkout.sessions.create({
   ui_mode:"hosted",mode:"subscription",line_items,
   customer_email:user.email,client_reference_id:user.uid,
   success_url:siteUrl+"/billing/return?session_id={CHECKOUT_SESSION_ID}",
   cancel_url:siteUrl+"/plans?plan="+encodeURIComponent(planKey),
   allow_promotion_codes:true,
   metadata:{userId:user.uid,planKey,email:user.email,addons:addons.join(","),setupFeeCents:String(plan.setup)},
   subscription_data:{metadata:{userId:user.uid,planKey,email:user.email,addons:addons.join(",")}}
  });
  if(!session.url)return reply({error:"Stripe did not return a secure checkout link."},502);
  return reply({url:session.url,setupFeeCents:plan.setup,monthlyCents:plan.monthly+addons.reduce((n,k)=>n+addonAmount(planKey,k),0)});
 }catch(e){
  console.error("FUGTH Stripe checkout error",{type:e.type||"",code:e.code||""});
  return reply({error:"Unable to create Stripe checkout. Please verify billing configuration with FUGTH support."},503);
 }
}
