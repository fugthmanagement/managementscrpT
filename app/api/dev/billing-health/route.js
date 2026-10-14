import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request){
 const user=await authenticatedUser(request);
 if(!user)return reply({error:"Please sign in."},401);
 if(!isFounder(user))return reply({error:"Founder only."},403);
 const env={
  stripeSecretConfigured:Boolean(process.env.STRIPE_SECRET_KEY),
  stripeWebhookConfigured:Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  firestoreServerConfigured:Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)),
  hostedCheckout:true
 };
 if(!env.stripeSecretConfigured)return reply({ready:false,merchant:null,environment:env,plans:[],
  message:"The Stripe secret key has not been configured in Vercel."});
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const account=await stripe.accounts.retrieve();
  const ids={starter:process.env.STRIPE_STARTER_PRICE_ID,
   growth:process.env.STRIPE_GROWTH_PRICE_ID,elite:process.env.STRIPE_ELITE_PRICE_ID};
  const plans=await Promise.all(Object.entries(BILLING_PLANS).map(async ([key,info])=>{
   const id=ids[key];
   if(!id)return {plan:key,ready:false,reason:"No Stripe price ID configured."};
   try{
    const price=await stripe.prices.retrieve(id);
    const valid=price.active&&price.currency==="usd"&&price.unit_amount===info.monthly&&price.recurring?.interval==="month";
    return {plan:key,ready:valid,reason:valid?"Verified against connected Stripe account.":"Price or currency does not match plan."};
   }catch{return {plan:key,ready:false,reason:"Price not found in the connected Stripe account."};}
  }));
  const ready=env.stripeWebhookConfigured&&env.firestoreServerConfigured&&plans.every(p=>p.ready);
  return reply({ready,merchant:{id:account.id,name:account.business_profile?.name||account.settings?.dashboard?.display_name||"Connected Stripe merchant"},
   environment:env,plans,
   message:ready?"Hosted subscription checkout is configured. Run a controlled transaction test before opening live sales.":"Complete the missing connection details in Vercel before accepting payments."});
 }catch{return reply({ready:false,merchant:null,environment:env,plans:[],
  message:"Could not validate the connected Stripe account. Check the Vercel Stripe key and Stripe mode."},503);}
}
