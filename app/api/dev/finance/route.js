import Stripe from "stripe";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";
import {priceDetails} from "../../../../lib/server/fugth-price-catalog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(x,status=200)=>NextResponse.json(x,{status,headers:{"Cache-Control":"private, no-store"}});
const period=()=>new Date().toISOString().slice(0,7);
const validPeriod=v=>/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(v);
async function actor(req){const u=await authenticatedUser(req);return u?.uid&&isFounder(u)?u:null;}
export async function GET(req){
 const user=await actor(req);if(!user)return reply({error:"Verified founder access required."},403);
 const month=new URL(req.url).searchParams.get("month")||period();
 if(!validPeriod(month))return reply({error:"Invalid month."},400);
 const result={month,subscriptions:{count:0,mrrCents:0,activeCount:0,partial:false},expenses:[],stripeReady:false,storageReady:false,warnings:[]};
 try{
  const db=firebaseAdmin().firestore();
  const items=await db.collection("founderFinance").doc(user.uid).collection("expenses").where("month","==",month).limit(250).get();
  result.expenses=items.docs.map(d=>({id:d.id,...d.data()})).filter(e=>Number.isInteger(e.amountCents));
  result.storageReady=true;
 }catch(e){result.warnings.push("Expense records could not be read from Firebase.");}
 if(!process.env.STRIPE_SECRET_KEY)result.warnings.push("Stripe key missing.");
 else try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
  let cursor,seen=0,hasMore=false;
  do{
   const batch=await stripe.subscriptions.list({status:"all",limit:100,...(cursor?{starting_after:cursor}:{})});
   for(const sub of batch.data){
    seen++;
    if(sub.status!=="active")continue;
    const validFugth=(sub.metadata?.kind==="subscription"&&Boolean(BILLING_PLANS[sub.metadata?.planKey]))||
      (sub.items?.data||[]).some(item=>Boolean(priceDetails(item.price?.id||"")));
    if(!validFugth)continue;
    result.subscriptions.activeCount++;
    for(const item of sub.items?.data||[]){
     const price=item.price;
     if(!price?.recurring)continue;
     const amount=Number(price.unit_amount)||0,quantity=Number(item.quantity)||1;
     const cycle=price.recurring.interval,step=price.recurring.interval_count||1;
     const months=cycle==="year"?12*step:cycle==="month"?step:cycle==="week"?step*7/30.4375:cycle==="day"?step/30.4375:1;
     result.subscriptions.mrrCents+=Math.round((amount*quantity)/months);
    }
   }
   hasMore=batch.has_more===true;
   cursor=batch.data.at(-1)?.id;
  }while(hasMore&&cursor&&seen<500);
  result.subscriptions.count=seen;result.subscriptions.partial=hasMore;
  result.stripeReady=true;
  if(hasMore)result.warnings.push("More than 500 subscriptions exist. Revenue is partial; expand pagination for a complete report.");
 }catch(e){result.warnings.push("Live Stripe subscriptions could not be read; financial results are incomplete.");}
 return reply(result);
}
export async function POST(req){
 const user=await actor(req);if(!user)return reply({error:"Verified founder access required."},403);
 let data;try{data=await req.json();}catch{return reply({error:"Invalid expense."},400);}
 const category=String(data?.category||"other");
 const month=String(data?.month||period());
 const amountCents=Math.round(Number(data?.amountCents));
 const title=String(data?.title||"").replace(/[<>]/g,"").trim().slice(0,120);
 if(!validPeriod(month)||!["payroll","commission","voice","software","rent","hardware","marketing","other"].includes(category)||!title||!Number.isSafeInteger(amountCents)||amountCents<0||amountCents>100000000)
  return reply({error:"Enter a valid description, category, month and expense amount."},400);
 try{
  const db=firebaseAdmin().firestore();
  const record=await db.collection("founderFinance").doc(user.uid).collection("expenses").add({title,category,month,amountCents,recordedBy:user.uid,createdAt:new Date().toISOString()});
  return reply({saved:true,id:record.id});
 }catch{return reply({error:"Could not record expense. Check Firebase Admin service permissions."},503);}
}
export async function DELETE(req){
 const user=await actor(req);if(!user)return reply({error:"Verified founder access required."},403);
 const id=new URL(req.url).searchParams.get("id")||"";
 if(!/^[a-zA-Z0-9]{10,40}$/.test(id))return reply({error:"Invalid expense ID."},400);
 try{
  await firebaseAdmin().firestore().collection("founderFinance").doc(user.uid).collection("expenses").doc(id).delete();
  return reply({deleted:true});
 }catch{return reply({error:"Expense could not be deleted."},503);}
}
