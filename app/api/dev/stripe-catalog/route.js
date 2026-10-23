import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const merchant="acct_1QYiGDHGcNIhcRMj";
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
const valid=x=>/^prod_[A-Za-z0-9]{8,80}$/.test(String(x||""));
const clean=(value,n)=>String(value||"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
async function client(){
 if(!process.env.STRIPE_SECRET_KEY)throw Object.assign(Error("Stripe merchant API key is unavailable."),{status:503});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
 const account=await stripe.accounts.retrieve();
 if(account.id!==merchant)throw Object.assign(Error("The saved Stripe secret points to a different merchant account. No product changed."),{status:503});
 return stripe;
}
async function owner(req){
 const u=await authenticatedUser(req);
 return isFounder(u)?u:null;
}
export async function GET(req){
 if(!await owner(req))return json({error:"Verified founder account required."},403);
 try{
  const stripe=await client();
  const [products,prices]=await Promise.all([
   stripe.products.list({active:true,limit:100}),
   stripe.prices.list({active:true,limit:100})
  ]);
  const selected=products.data.filter(p=>p.metadata?.brand==="fugth_management"||/^FUGTH(?: Management)? /i.test(p.name||"")).map(p=>({
   id:p.id,name:p.name,description:p.description||"",
   features:clean(p.metadata?.fugth_features||"",400).split("|").map(x=>x.trim()).filter(Boolean).slice(0,5),
   prices:prices.data.filter(x=>(typeof x.product==="string"?x.product:x.product?.id)===p.id)
    .map(x=>({id:x.id,currency:x.currency,unitAmount:x.unit_amount,interval:x.recurring?.interval||"one-time",active:x.active}))
  }));
  return json({merchant,live:process.env.STRIPE_SECRET_KEY.startsWith("sk_live_"),products:selected,
   note:"Changes to display copy/feature labels update the Stripe product only. Checkout prices and FUGTH paid entitlements remain unchanged."});
 }catch(e){return json({error:e.status?e.message:"Could not read live Stripe product details."},e.status||503)}
}
export async function POST(req){
 const u=await owner(req);
 if(!u)return json({error:"Verified founder required."},403);
 let body;
 try{const raw=await req.text();if(raw.length>1600)throw Error();body=JSON.parse(raw)}
 catch{return json({error:"Invalid product update request."},400)}
 if(body.action!=="update_copy"||!valid(body.productId))
  return json({error:"Unsupported product change."},400);
 const description=clean(body.description,350);
 if(description.length<10)return json({error:"Add a description of at least 10 characters."},400);
 if(!Array.isArray(body.features)||body.features.length>5)
  return json({error:"Add up to five short feature labels."},400);
 const features=body.features.map(x=>clean(x,65)).filter(Boolean);
 const full=features.join(" | ");
 if(full.length>380)return json({error:"Shorten the feature labels."},400);
 try{
  const stripe=await client();
  const old=await stripe.products.retrieve(body.productId);
  if(!(old.metadata?.brand==="fugth_management"||/^FUGTH(?: Management)? /i.test(old.name||"")))
   return json({error:"Only the dedicated FUGTH Management Stripe products can be edited from this console."},403);
  const updated=await stripe.products.update(body.productId,{
   description,metadata:{fugth_features:full}
  });
  return json({updated:true,id:updated.id,name:updated.name,description:updated.description,
   features,note:"Stripe product copy updated. Subscription prices and customer billing were not changed."});
 }catch(e){
  return json({error:e.status?e.message:"Stripe rejected this product update. No plan price was changed."},e.status||503)
 }
}
