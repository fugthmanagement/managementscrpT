import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { authenticatedUser, firebaseAdmin } from "../../../../lib/server/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const root = () => process.env.NEXT_PUBLIC_APP_URL || "https://www.fugthmanagement.space";
function enabled() { return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)); }
function ref(uid){return firebaseAdmin().firestore().doc(`users/${uid}/integrations/inbound_webhook`);}
export async function GET(req){
  const user=await authenticatedUser(req);
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  if(!enabled())return NextResponse.json({configured:false,connected:false});
  try{const snap=await ref(user.uid).get();return NextResponse.json({configured:true,connected:snap.exists,url:new URL(`/api/integrations/webhook/receive/${user.uid}`,root()).toString(),createdAt:snap.data()?.createdAt||null});}
  catch{return NextResponse.json({configured:false,connected:false,error:"Server integration service unavailable."});}
}
export async function POST(req){
  const user=await authenticatedUser(req);
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  if(!enabled())return NextResponse.json({error:"Firebase Admin is not configured."},{status:503});
  const secret=randomBytes(32).toString("hex");
  const digest=createHash("sha256").update(secret).digest("hex");
  const url=new URL(`/api/integrations/webhook/receive/${user.uid}`,root()).toString();
  try{
    await ref(user.uid).set({digest,createdAt:new Date().toISOString(),enabled:true});
    return NextResponse.json({created:true,url,key:secret,notice:"Save this key now; Fugth will not show it again."});
  }catch{return NextResponse.json({error:"Could not create this webhook."},{status:500});}
}
export async function DELETE(req){
  const user=await authenticatedUser(req);
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  try{await ref(user.uid).delete();return NextResponse.json({connected:false});}
  catch{return NextResponse.json({error:"Could not disable this webhook."},{status:500});}
}
