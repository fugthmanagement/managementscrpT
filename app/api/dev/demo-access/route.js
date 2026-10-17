import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const validUid=x=>/^[A-Za-z0-9_-]{8,128}$/.test(x||"");
const send=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(req){
 const user=await authenticatedUser(req);if(!isFounder(user))return send({error:"Founder access required."},403);
 const uid=new URL(req.url).searchParams.get("uid");if(!validUid(uid))return send({error:"Select customer."},400);
 try{const doc=await firebaseAdmin().firestore().doc("demoAccountPermissions/"+uid).get();
  const entry=doc.data()||{};return send({uid,enabled:entry.enabled===true&&Date.parse(entry.expiresAt||"")>Date.now(),
   expiresAt:entry.expiresAt||null,updatedAt:entry.updatedAt||null});}
 catch{return send({error:"Unable to load this customer’s demo authorization."},503);}
}
export async function POST(req){
 const user=await authenticatedUser(req);if(!isFounder(user))return send({error:"Founder access required."},403);
 let body;try{body=await req.json();}catch{return send({error:"Invalid demo permission."},400);}
 const uid=String(body?.uid||""),enabled=body?.enabled===true,hours=Number(body?.hours||24);
 if(!validUid(uid)||!Number.isSafeInteger(hours)||hours<1||hours>72)return send({error:"Select an account and 1–72 hours."},400);
 try{
  const admin=firebaseAdmin();await admin.auth().getUser(uid);
  const now=new Date(),expiresAt=enabled?new Date(now.getTime()+hours*3600000).toISOString():null;
  const db=admin.firestore(),record={enabled,expiresAt,updatedAt:now.toISOString(),updatedBy:user.uid};
  await db.doc("demoAccountPermissions/"+uid).set(record,{merge:true});
  await db.collection("demoPermissionAudit").add({uid,...record});
  return send({saved:true,uid,enabled,expiresAt});
 }catch{return send({error:"Could not change demo access; check Firebase service permissions."},503);}
}
