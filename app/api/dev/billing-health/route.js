import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request){
 const user=await authenticatedUser(request);
 if(!user?.uid||!isFounder(user))return reply({error:"Verified founder access required."},403);
 const env={stripeSecretConfigured:Boolean(process.env.STRIPE_SECRET_KEY),
  stripeWebhookConfigured:Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  firestoreServerConfigured:Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)),
  hostedCheckout:true,dynamicPrices:true};
 if(!env.stripeSecretConfigured)return reply({ready:false,environment:env,merchant:null,plans:[],message:"Stripe secret key missing in Production."});
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const merchant=await stripe.accounts.retrieve();
  const list=Object.values(BILLING_PLANS).map(p=>({
   plan:p.name,ready:true,reason:p.kind==="one_time"?"Validated one-time website purchase; Stripe creates the price at checkout.":"Monthly and yearly prices validated and created dynamically during checkout. Setup is a separate one-time line.",
   amountCents:p.monthly,setupCents:p.setup,kind:p.kind||"subscription"
  }));
  const connected=Boolean(merchant?.id);
  const ready=connected&&env.stripeWebhookConfigured&&env.firestoreServerConfigured;
  return reply({ready,merchant:{id:merchant?.id||"unknown",
   name:merchant?.business_profile?.name||merchant?.settings?.dashboard?.display_name||"FUGTH Management"},
   environment:env,plans:list,message:ready?
   "Stripe authentication and necessary environment configuration are available. This is NOT a checkout or webhook fulfillment test; run controlled test-mode transactions before accepting live payments.":
   "Stripe connected. Webhook signing secret or Firebase server credentials are missing."});
 }catch(error){
  console.error("FUGTH billing account verification failed",{type:error?.type||"backend",code:error?.code||"unknown"});
  return reply({ready:false,merchant:null,environment:env,plans:[],message:"Stripe API could not authenticate this FUGTH Vercel key or retrieve its account. Check key, mode and account permissions."},503);
 }
}
