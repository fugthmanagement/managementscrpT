import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../lib/server/auth";
import {buildStarterSite,cleanText} from "../../../../lib/site-presets";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// Founder-only, one-click public sample for a prospect. No account, payment,
// phone number, AI assistant, or third-party credentials are created.
export async function POST(request){
 const founder=await authenticatedUser(request);
 if(!isFounder(founder))return NextResponse.json({error:"Founder verification required."},{status:403});
 if(!(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)))
  return NextResponse.json({error:"FUGTH site generation needs Firebase server credentials."},{status:503});
 try{
  const raw=await request.json();
  const businessName=cleanText(raw?.businessName,80);
  const businessType=cleanText(raw?.businessType,80);
  if(businessName.length<2)return NextResponse.json({error:"Enter a business name to generate the sample."},{status:400});
  const id="preview_"+randomBytes(12).toString("hex");
  const site=buildStarterSite(id,businessName,businessType);
  const db=firebaseAdmin().firestore();
  const today=new Date().toISOString().slice(0,10);
  const quotaRef=db.doc(`siteDemoQuota/${founder.uid}_${today}`);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(quotaRef);
    const count=snap.data()?.count||0;
    if(count>=40)throw Object.assign(new Error("Daily preview limit reached."),{status:429});
    tx.set(quotaRef,{count:count+1,updatedAt:new Date().toISOString()},{merge:true});
    tx.create(db.doc(`publicSites/${id}`),site);
  });
  return NextResponse.json({success:true,siteUrl:`/sites/${id}`,siteId:id,industry:site.industry,theme:site.theme});
 }catch(error){
  if(error.status===429)return NextResponse.json({error:error.message},{status:429});
  console.error("Founder site preview generation failed",error?.code||"unknown");
  return NextResponse.json({error:"Could not generate this FUGTH site preview."},{status:503});
 }
}
