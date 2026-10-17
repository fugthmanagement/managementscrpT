import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {BILLING_PLANS} from "../../../../lib/billing-catalog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const send=(d,status=200)=>NextResponse.json(d,{status,headers:{"Cache-Control":"private, no-store"}});
const validUid=x=>/^[A-Za-z0-9_-]{8,128}$/.test(x||"");
export async function GET(req){
 const founder=await authenticatedUser(req);if(!isFounder(founder))return send({error:"Verified founder access required."},403);
 const uid=new URL(req.url).searchParams.get("uid");
 if(!validUid(uid))return send({error:"Select a customer."},400);
 try{const doc=await firebaseAdmin().firestore().doc("founderOffers/"+uid).get();
  return send({offer:doc.exists?doc.data():null});
 }catch{return send({error:"Could not retrieve this customer's offers."},503);}
}
export async function POST(req){
 const founder=await authenticatedUser(req);if(!isFounder(founder))return send({error:"Verified founder access required."},403);
 let body;try{const raw=await req.text();if(raw.length>1500)throw Error();body=JSON.parse(raw);}catch{return send({error:"Invalid offer request."},400);}
 const uid=String(body.uid||""),planKey=String(body.planKey||""),plan=BILLING_PLANS[planKey];
 const monthlyCents=Math.round(Number(body.priceCents)),setupCents=Math.round(Number(body.setupCents));
 const requestedBillingAt=String(body.requestedBillingAt||"");
 if(!validUid(uid)||!plan||!Number.isSafeInteger(monthlyCents)||monthlyCents<1000||monthlyCents>2000000||
  !Number.isSafeInteger(setupCents)||setupCents<0||setupCents>2000000||
  (requestedBillingAt&&(!Number.isFinite(Date.parse(requestedBillingAt))||Date.parse(requestedBillingAt)<=Date.now()+300000||Date.parse(requestedBillingAt)>Date.now()+28*86400000)))
  return send({error:"Choose a real customer, package, valid prices, and a future date if requested."},400);
 try{
  const admin=firebaseAdmin(),customer=await admin.auth().getUser(uid);
  const offer={uid,planKey,monthlyCents,setupCents,status:"pending",
   createdBy:founder.uid,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*86400000).toISOString(),
   requestedBillingAt:requestedBillingAt||null,customerEmail:customer.email||""};
  const db=admin.firestore(),ref=db.doc("founderOffers/"+uid);
  await db.runTransaction(async tx=>{
   tx.set(ref,offer);
   tx.create(db.collection("founderOfferAudit").doc(),{...offer,action:"created"});
  });
  return send({saved:true,offer,checkoutUrl:"https://www.fugthmanagement.space/plans?offer=1&plan="+encodeURIComponent(planKey)});
 }catch(e){console.error("Founder quote creation failed",{code:e?.code||"server"});return send({error:"Could not save the personalized offer. Check Firebase administrator permissions."},503);}
}
