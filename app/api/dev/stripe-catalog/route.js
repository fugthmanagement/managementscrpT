import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const EXPECTED="acct_1QYiGDHGcNIhcRMj";
const SAFE_PRODUCTS={
 prod_VRHSIDxPjmR5q7:"Low monthly",prod_VRHSxrdAuLvNR5:"Mid monthly",
 prod_VRHS7WK57MDuzj:"High monthly",
 prod_VRdWU5GJWz8b58:"Low annual",prod_VRdWu8GaeLZz2H:"Mid annual",
 prod_VRdWcXIHpXIL9D:"High annual",
 prod_VUOcbQxMIulAvX:"Missed-Call Text-Back"
};
const send=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
async function verifiedStripe(){
 if(!process.env.STRIPE_SECRET_KEY)throw Object.assign(Error("Stripe secret isn't available on FUGTH's server."),{status:503});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
 const account=await stripe.accounts.retrieve();
 if(account.id!==EXPECTED)throw Object.assign(Error("Connected Stripe API key points to the wrong merchant; no changes made."),{status:409});
 return stripe;
}
export async function GET(req){
 const user=await authenticatedUser(req);if(!user?.uid||!isFounder(user))return send({error:"Founder account required."},403);
 try{
  const stripe=await verifiedStripe();
  const products=await Promise.all(Object.keys(SAFE_PRODUCTS).map(async id=>{
   try{
    const [p,prices]=await Promise.all([stripe.products.retrieve(id),stripe.prices.list({product:id,limit:10})]);
    return {id,title:SAFE_PRODUCTS[id],name:p.name,description:p.description||"",active:p.active,
     prices:prices.data.map(x=>({id:x.id,currency:x.currency,cents:x.unit_amount,
      active:x.active,recurring:x.recurring?.interval||null}))};
   }catch(e){return {id,title:SAFE_PRODUCTS[id],error:"Product is not available to the configured FUGTH Stripe key."}}
  }));
  return send({merchant:EXPECTED,products,editable:["name","description"],notice:"Prices are immutable Stripe objects; editing their names does not change existing subscriptions or customer payments."});
 }catch(e){return send({error:e.message||"Stripe products unavailable."},e.status||503)}
}
export async function POST(req){
 const user=await authenticatedUser(req);if(!user?.uid||!isFounder(user))return send({error:"Founder access required."},403);
 let body;try{const raw=await req.text();if(raw.length>1800)throw Error();body=JSON.parse(raw)}
 catch{return send({error:"Invalid product details."},400)}
 const id=String(body?.productId||""),name=String(body?.name||"").trim(),
  description=String(body?.description||"").trim();
 if(!Object.prototype.hasOwnProperty.call(SAFE_PRODUCTS,id)||name.length<5||name.length>105||
    description.length>800||/[\u0000-\u001f]/.test(name+description))
  return send({error:"Choose an approved FUGTH product and valid display details."},400);
 try{
  const stripe=await verifiedStripe();
  const current=await stripe.products.retrieve(id);
  if(!current.active)return send({error:"The selected product is inactive. Review it directly in Stripe."},409);
  await stripe.products.update(id,{name,description});
  return send({saved:true,id,name,description,message:"Stripe product wording updated. Prices and customer subscriptions did not change."});
 }catch(e){console.warn("FUGTH_STRIPE_ADMIN_UPDATE",{code:e.code||"unavailable"});
  return send({error:e.status?e.message:"Stripe could not update product wording. Check your live merchant account and permissions."},e.status||503)}
}
