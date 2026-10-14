import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {getDemoCooldown,resetDemoCooldown} from "../../../../lib/server/demo-cooldown";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function response(data,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});}
async function founder(req){
 const user=await authenticatedUser(req);
 if(!user)return {error:response({error:"Sign in required."},401)};
 if(!isFounder(user))return {error:response({error:"Founder access only."},403)};
 return {user};
}
function validUid(uid){return /^[A-Za-z0-9_-]{8,128}$/.test(uid||"");}
export async function GET(req){
 const auth=await founder(req);if(auth.error)return auth.error;
 const uid=new URL(req.url).searchParams.get("uid");
 if(!validUid(uid))return response({error:"Select a valid customer account."},400);
 try{
  const customer=await firebaseAdmin().firestore().collection("users").doc(uid).get();
  if(!customer.exists)return response({error:"Customer account not found."},404);
  return response({uid,businessName:customer.data()?.businessName||"Business",...await getDemoCooldown(uid)});
 }catch{return response({error:"Could not check the customer's demo limit."},503);}
}
export async function POST(req){
 const auth=await founder(req);if(auth.error)return auth.error;
 let body;try{body=await req.json();}catch{return response({error:"Invalid request."},400);}
 if(body?.action!=="reset"||!validUid(body?.uid))return response({error:"Choose an account and a reset action."},400);
 try{
  const customer=await firebaseAdmin().firestore().collection("users").doc(body.uid).get();
  if(!customer.exists)return response({error:"Customer account not found."},404);
  const result=await resetDemoCooldown(body.uid,auth.user.uid);
  return response({...result,uid:body.uid,...await getDemoCooldown(body.uid)});
 }catch{return response({error:"Could not reset this customer's demo cooldown."},503);}
}
