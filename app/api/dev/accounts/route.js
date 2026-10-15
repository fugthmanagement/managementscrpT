import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {TIERS,manualAccess,accessTier} from "../../../../lib/server/account-entitlements";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const founder=async req=>{
 const user=await authenticatedUser(req);
 return user?.uid&&isFounder(user)?user:null;
};
const date=value=>{
 const d=new Date(value||"");
 return Number.isFinite(d.getTime())?d.toISOString():null;
};
export async function GET(request){
 const admin=await founder(request);
 if(!admin)return respond({error:"Verified FUGTH management access required."},403);
 const cursor=new URL(request.url).searchParams.get("cursor")||undefined;
 if(cursor&&!/^[\w+/=-]{1,3000}$/.test(cursor))return respond({error:"Invalid page reference."},400);
 try{
  const service=firebaseAdmin(),result=await service.auth().listUsers(60,cursor);
  const refs=result.users.map(u=>service.firestore().doc("users/"+u.uid));
  const docs=refs.length?await service.firestore().getAll(...refs):[];
  const accounts=result.users.map((u,i)=>{
   const profile=docs[i]?.data()||{},grant=manualAccess(profile);
   return {uid:u.uid,email:u.email||"",displayName:u.displayName||"",
    emailVerified:u.emailVerified===true,disabled:u.disabled===true,
    createdAt:date(u.metadata.creationTime),lastSignInAt:date(u.metadata.lastSignInTime),
    businessName:String(profile.businessName||"").slice(0,100),
    tier:accessTier(profile),paidTier:profile.billingActive===true?profile.planTier||"none":"none",
    billingActive:profile.billingActive===true,planStatus:profile.planStatus||"none",
    nextChargeAt:profile.billingRenewsAt||profile.billingCurrentPeriodEnd||null,
    grant:grant?{tier:grant.tier,term:grant.term,startsAt:grant.startsAt,expiresAt:grant.expiresAt}:null};
  });
  return respond({accounts,nextCursor:result.pageToken||null});
 }catch(error){
  console.error("FUGTH account listing failure",{code:error?.code||"admin"});
  return respond({error:"Could not load registered accounts. Check the FUGTH server connection."},503);
 }
}
export async function POST(request){
 const admin=await founder(request);
 if(!admin)return respond({error:"Verified FUGTH management access required."},403);
 let body;try{const raw=await request.text();if(raw.length>1500)throw Error();body=JSON.parse(raw);}
 catch{return respond({error:"Invalid update request."},400);}
 const uid=String(body.uid||""),tier=String(body.tier||""),term=String(body.term||"");
 const reason=String(body.reason||"").trim().slice(0,180);
 if(!/^[\w-]{8,128}$/.test(uid)||!TIERS.includes(tier)||!["monthly","yearly"].includes(term)||!reason)
  return respond({error:"Select a valid account, plan, access term, and reason."},400);
 try{
  const firebase=firebaseAdmin();
  await firebase.auth().getUser(uid);
  const db=firebase.firestore(),ref=db.doc("users/"+uid),audit=db.collection("founderAccountAudit").doc();
  const issuedAt=new Date(),endsAt=new Date(issuedAt);
  if(term==="monthly")endsAt.setUTCMonth(endsAt.getUTCMonth()+1);
  else endsAt.setUTCFullYear(endsAt.getUTCFullYear()+1);
  const grant=tier==="none"?null:{source:"founder",tier,term,startsAt:issuedAt.toISOString(),
   expiresAt:endsAt.toISOString(),updatedAt:issuedAt.toISOString(),updatedBy:admin.uid,reason};
  await db.runTransaction(async tx=>{
   const original=await tx.get(ref);
   tx.set(ref,{founderAccess:grant,founderAccessUpdatedAt:issuedAt.toISOString()},{merge:true});
   tx.create(audit,{actorUid:admin.uid,targetUid:uid,previous:original.data()?.founderAccess||null,
    updated:grant,reason,createdAt:issuedAt.toISOString(),action:grant?"grant":"revoke"});
  });
  return respond({success:true,grant,charged:false,
   message:"Account access updated. No charge occurred and existing subscription renewal dates are unchanged."});
 }catch(error){
  console.error("FUGTH manual-access update",{code:error?.code||"admin"});
  return respond({error:"Could not save this access change."},503);
 }
}
