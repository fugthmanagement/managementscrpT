import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req){
 const user=await authenticatedUser(req);if(!user?.uid)return NextResponse.json({error:"Sign in required."},{status:401});
 try{
  const doc=await firebaseAdmin().firestore().doc("founderOffers/"+user.uid).get();
  const offer=doc.exists?doc.data():null;
  if(!offer||offer.status!=="pending"||Date.parse(offer.expiresAt||"")<Date.now())return NextResponse.json({offer:null},{headers:{"Cache-Control":"private, no-store"}});
  return NextResponse.json({offer:{planKey:offer.planKey,priceCents:offer.monthlyCents,setupCents:offer.setupCents,expiresAt:offer.expiresAt,requestedBillingAt:offer.requestedBillingAt}},
   {headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Your personalized price is temporarily unavailable."},{status:503});}
}
