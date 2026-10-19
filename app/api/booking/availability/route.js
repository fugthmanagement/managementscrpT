import {NextResponse} from "next/server";
import {FieldValue} from "firebase-admin/firestore";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {businessEntitlement} from "../../../../lib/server/feature-entitlement";
import {cleanAvailability,defaultAvailability} from "../../../../lib/booking-availability";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
async function authorized(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return {error:respond({error:"Sign in to manage booking availability."},401)};
 const permit=await businessEntitlement(user,"bookings");
 if(!permit.allowed)return {error:respond({error:permit.reason,tier:permit.tier},403)};
 return {user};
}
export async function GET(request){
 const access=await authorized(request);if(access.error)return access.error;
 try{
  const d=await firebaseAdmin().firestore().doc("users/"+access.user.uid).get();
  if(!d.exists)return respond({error:"Create your business profile first."},404);
  return respond({availability:cleanAvailability(d.data()?.bookingAvailability||defaultAvailability())});
 }catch(e){console.warn("Read availability failed",{code:e?.code||"db"});return respond({error:"Could not load booking hours."},503);}
}
export async function POST(request){
 const access=await authorized(request);if(access.error)return access.error;
 let raw;
 try{const content=await request.text();if(content.length>6500)return respond({error:"Schedule too large."},413);raw=JSON.parse(content);}
 catch{return respond({error:"Invalid booking hours request."},400);}
 const value=cleanAvailability(raw?.availability||{});
 try{
  await firebaseAdmin().firestore().doc("users/"+access.user.uid).set({
   bookingAvailability:{...value,updatedAt:new Date().toISOString()},
   updatedAt:FieldValue.serverTimestamp()
  },{merge:true});
  return respond({saved:true,availability:value});
 }catch(e){console.warn("Save availability failed",{code:e?.code||"db"});return respond({error:"Could not save booking availability."},503);}
}
