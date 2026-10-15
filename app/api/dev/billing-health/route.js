import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";
import {PRICES} from "../../../../lib/server/fugth-price-catalog";
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
  message:"The FUGTH payment connection has not been configured in FUGTH server."});
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const account=await stripe.accounts.retrieve().catch(()=>null);
  const ids=PRICES;
  const plans=await Promise.all(Object.entries(BILLING_PLANS).map(async ([key,info])=>{
   try{
    const [monthly,yearly]=await Promise.all([stripe.prices.retrieve(ids[key].monthly),stripe.prices.retrieve(ids[key].yearly)]);
    const m=monthly.active&&monthly.currency==="usd"&&monthly.unit_amount===info.monthly&&monthly.recurring?.interval==="month";
    const y=yearly.active&&yearly.currency==="usd"&&yearly.unit_amount===info.monthly*12&&yearly.recurring?.interval==="year";
    return {plan:key,ready:m&&y,reason:m&&y?"Monthly and yearly prices verified.":"One or more prices need attention."};
   }catch{return {plan:key,ready:false,reason:"The FUGTH payment account could not verify this plan."};}
  }));
  const ready=env.stripeWebhookConfigured&&env.firestoreServerConfigured&&plans.every(p=>p.ready);
  return reply({ready,merchant:{id:account?.id||"verified-by-prices",name:account?.business_profile?.name||account?.settings?.dashboard?.display_name||"FUGTH Management"},
   environment:env,plans,
   message:ready?"Hosted subscription checkout is configured. Run a controlled transaction test before opening live sales.":"Complete the missing connection details in FUGTH server before accepting payments."});
 }catch{return reply({ready:false,merchant:null,environment:env,plans:[],
  message:"Could not validate the connected FUGTH payment account. Check the FUGTH server Stripe key and Stripe mode."},503);}
}
