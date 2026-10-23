import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
import {resolveFirebaseAdminCredentials} from "../../../../lib/server/firebase-admin-credentials";
import {TEXTBACK_PRICE_ID} from "../../../../lib/textback-flow";
export const runtime="nodejs";export const dynamic="force-dynamic";
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export const DEFAULT_STRIPE_FEATURES={subscriptionsEnabled:true,textbackCheckoutEnabled:true,promotionCodesEnabled:true};
async function owner(req){const a=await authenticatedUser(req);return a&&isFounder(a)?a:null}
function features(data){return Object.fromEntries(Object.entries(DEFAULT_STRIPE_FEATURES).map(([k,v])=>[k,typeof data?.[k]==="boolean"?data[k]:v]))}
async function merchant(){
 if(!process.env.STRIPE_SECRET_KEY)return {connected:false,code:"stripe_secret_missing",textbackPriceVerified:false};
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  const acc=await stripe.accounts.retrieve();
  const merchantMatches=acc.id==="acct_1QYiGDHGcNIhcRMj";
  let textbackPriceVerified=false;
  try{
   const price=await stripe.prices.retrieve(process.env.STRIPE_MISSED_CALL_TEXTBACK_PRICE_ID||TEXTBACK_PRICE_ID);
   textbackPriceVerified=price.active&&price.currency==="usd"&&price.unit_amount===4999&&price.recurring?.interval==="month";
  }catch{}
  return {connected:true,merchantMatches,chargesEnabled:acc.charges_enabled,
   payoutsEnabled:acc.payouts_enabled,merchantId:acc.id,
   textbackPriceVerified,textbackPriceId:TEXTBACK_PRICE_ID};
 }catch{return {connected:false,code:"stripe_api_unavailable",textbackPriceVerified:false}}
}
export async function GET(req){
 const user=await owner(req);if(!user)return reply({error:"Founder access required."},403);
 const preflight=resolveFirebaseAdminCredentials(process.env);
 const account=await merchant();
 let config=DEFAULT_STRIPE_FEATURES,saveAvailable=false,firestoreCode=preflight.report.code;
 if(preflight.ok)try{
  const snap=await firebaseAdmin().firestore().doc("adminSettings/stripeFeatures").get();
  config=features(snap.data());saveAvailable=true;firestoreCode="connected";
 }catch(e){firestoreCode=firestoreDemoFailure(e).code}
 return reply({config,merchant:account,saveAvailable,firestoreCode,
  note:"Feature switches control FUGTH website checkout only. They never change products, live subscriptions, or card billing in Stripe."});
}
export async function POST(req){
 const user=await owner(req);if(!user)return reply({error:"Founder access required."},403);
 let body;try{const raw=await req.text();if(raw.length>1200)throw Error();body=JSON.parse(raw)}
 catch{return reply({error:"Invalid Stripe configuration."},400)}
 const fields=body?.config,reason=String(body?.reason||"").trim().slice(0,180);
 if(!fields||typeof fields!=="object"||Array.isArray(fields)||!reason||
   Object.keys(fields).some(k=>!(k in DEFAULT_STRIPE_FEATURES)||typeof fields[k]!=="boolean"))
  return reply({error:"Choose valid checkout feature switches and an audit reason."},400);
 const proposed=features(fields);
 try{
  const db=firebaseAdmin().firestore(),ref=db.doc("adminSettings/stripeFeatures");
  const audit=db.collection("founderAccountAudit").doc(),at=new Date().toISOString();
  await db.runTransaction(async tx=>{
   const prev=await tx.get(ref);
   tx.set(ref,{...proposed,updatedBy:user.uid,updatedAt:at,reason});
   tx.create(audit,{action:"stripe_checkout_features",actorUid:user.uid,
    previous:prev.data()||null,updated:proposed,reason,createdAt:at});
  });
  return reply({saved:true,config:proposed,message:"FUGTH checkout switches saved. No Stripe subscription or payment was changed."});
 }catch(e){const issue=firestoreDemoFailure(e);return reply({error:"Stripe settings cannot be saved until Firebase Admin is restored.",code:issue.code},503)}
}
