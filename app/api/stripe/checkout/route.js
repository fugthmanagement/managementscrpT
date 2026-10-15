import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {BILLING_PLANS,BILLING_ADDONS,addonAmount,validAddons} from "../../../../lib/billing-catalog";
import {PRICES} from "../../../../lib/server/fugth-price-catalog";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const siteUrl="https://www.fugthmanagement.space";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!user.email)return reply({error:"Please sign in to select a subscription."},401);
 if(!process.env.STRIPE_SECRET_KEY)return reply({error:"FUGTH secure payments are not ready yet."},503);
 // Prevent charging people if a signed payment webhook cannot activate their plan.
 if(!process.env.STRIPE_WEBHOOK_SECRET)return reply({error:"FUGTH payment confirmation is unavailable. Please contact support."},503);
 if(!process.env.FIREBASE_SERVICE_ACCOUNT&&!(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY))
  return reply({error:"FUGTH account activation is unavailable. Please contact support."},503);
 let body;
 try{body=await req.json();}catch{return reply({error:"Invalid plan selection."},400);}
 const planKey=body?.planKey,plan=BILLING_PLANS[planKey];
 const cycle=body?.billingCycle==="yearly"?"yearly":"monthly",multiplier=cycle==="yearly"?12:1,interval=cycle==="yearly"?"year":"month";
 if(!plan)return reply({error:"Choose a valid plan."},400);
 const addons=validAddons(planKey,body.addons||[]);
 if(!addons)return reply({error:"Invalid add-on selection."},400);
 const priceId=PRICES[planKey]?.[cycle];
 if(!priceId)return reply({error:"The selected FUGTH subscription is unavailable. Please contact support."},503);
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const account=await firebaseAdmin().firestore().doc("users/"+user.uid).get();
  if(account.data()?.billingActive)return reply({error:"A subscription is already active. Contact support before changing plans."},409);
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.currency!=="usd"||price.unit_amount!==plan.monthly*multiplier||
    price.recurring?.interval!==interval||price.recurring?.interval_count!==1)
   return reply({error:"This FUGTH plan is being updated. Please contact support."},503);
  const line_items=[{price:priceId,quantity:1},{
   price_data:{currency:"usd",unit_amount:plan.setup,product_data:{name:"FUGTH "+plan.name+" one-time implementation",
    description:"Personal business onboarding and implementation for the "+plan.name+" plan."}},
   quantity:1
  }];
  addons.forEach(key=>line_items.push({
   price_data:{currency:"usd",unit_amount:addonAmount(planKey,key)*multiplier,
    recurring:{interval},product_data:{name:"FUGTH add-on — "+BILLING_ADDONS[key].name}},
   quantity:1
  }));
  const session=await stripe.checkout.sessions.create({
   ui_mode:"hosted",mode:"subscription",line_items,
   customer_email:user.email,client_reference_id:user.uid,
   success_url:siteUrl+"/billing/return?session_id={CHECKOUT_SESSION_ID}",
   cancel_url:siteUrl+"/plans?plan="+encodeURIComponent(planKey)+"&cycle="+cycle,
   allow_promotion_codes:true,
   metadata:{userId:user.uid,planKey,billingCycle:cycle,email:user.email,addons:addons.join(","),setupFeeCents:String(plan.setup)},
   subscription_data:{metadata:{userId:user.uid,planKey,billingCycle:cycle,email:user.email,addons:addons.join(",")}}
  });
  if(!session.url)return reply({error:"FUGTH could not open secure checkout."},502);
  return reply({url:session.url,setupFeeCents:plan.setup,billingCycle:cycle,recurringCents:(plan.monthly+addons.reduce((n,k)=>n+addonAmount(planKey,k),0))*multiplier});
 }catch(e){
  console.error("FUGTH Stripe checkout error",{type:e.type||"",code:e.code||""});
  if(e.code==="resource_missing")return reply({error:"The payment account does not recognize this FUGTH plan. No charge was made."},503);
  return reply({error:"Unable to start FUGTH secure checkout. Please contact support."},503);
 }
}
