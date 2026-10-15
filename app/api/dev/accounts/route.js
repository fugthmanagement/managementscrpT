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
  const service=firebaseAdmin(),store=service.firestore();
  let users=[],nextCursor=null,partial=false,issue=null;
  try{
   const result=await service.auth().listUsers(60,cursor);
   users=result.users.map(u=>({
    uid:u.uid,email:u.email||"",displayName:u.displayName||"",emailVerified:u.emailVerified===true,
    disabled:u.disabled===true,createdAt:date(u.metadata.creationTime),lastSignInAt:date(u.metadata.lastSignInTime)
   }));
   nextCursor=result.pageToken||null;
  }catch(error){
   // Some service accounts can read Firestore but lack Authentication user
   // listing permission. Show the actual customer profiles in that case.
   issue=String(error.code||error.message||"auth").slice(0,90);
   if(cursor)return respond({error:"Directory paging requires FUGTH authentication-list permission.",issueCode:"AUTH_LIST_PERMISSION"},503);
   const docs=await store.collection("users").limit(60).get();
   users=docs.docs.map(doc=>({
    uid:doc.id,email:doc.data().email||"",displayName:doc.data().displayName||"",
    emailVerified:false,disabled:false,
    createdAt:date(doc.data().createdAt?.toDate?.()||doc.data().createdAt),
    lastSignInAt:null
   }));
   partial=true;
  }
  let profiles=[],grants=[];
  try{
   const refs=users.map(u=>store.doc("users/"+u.uid));
   profiles=refs.length?await store.getAll(...refs):[];
  }catch(error){issue=String(error.code||error.message||"profile").slice(0,90);partial=true;}
  try{
   const grantRefs=users.map(u=>store.doc("founderAccountGrants/"+u.uid));
   grants=grantRefs.length?await store.getAll(...grantRefs):[];
  }catch{partial=true;}
  const accounts=users.map((u,i)=>{
   const profile=profiles[i]?.data()||{};
   const verifiedGrant=grants[i]?.data()||null,grant=manualAccess({founderAccess:verifiedGrant});
   return {uid:u.uid,email:u.email||profile.email||"",displayName:u.displayName||profile.displayName||"",
    emailVerified:u.emailVerified,disabled:u.disabled,createdAt:u.createdAt,lastSignInAt:u.lastSignInAt,
    businessName:String(profile.businessName||"").slice(0,100),
    tier:accessTier({...profile,founderAccess:verifiedGrant}),
    paidTier:profile.billingActive===true?profile.planTier||"none":"none",
    billingActive:profile.billingActive===true,planStatus:profile.planStatus||"none",
    nextChargeAt:profile.billingRenewsAt||profile.billingCurrentPeriodEnd||null,
    grant:grant?{tier:grant.tier,term:grant.term,startsAt:grant.startsAt,expiresAt:grant.expiresAt}:null};
  });
  return respond({accounts,nextCursor,partial,issueCode:partial?"PARTIAL_DIRECTORY":null});
 }catch(error){
  console.error("FUGTH account listing failure",{code:error?.code||"admin"});
   const code=String(error?.code||"unknown");
  const kind=/permission|denied|403/i.test(code)?"PERMISSION_DENIED":/credential|invalid-argument|unauthenticated|401/i.test(code)?"SERVICE_CREDENTIALS":"DIRECTORY_UNAVAILABLE";
  return respond({error:"FUGTH cannot load customer records until its server account permissions are repaired.",issueCode:kind},503);
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
  const db=firebase.firestore(),ref=db.doc("founderAccountGrants/"+uid),audit=db.collection("founderAccountAudit").doc();
  const issuedAt=new Date(),endsAt=new Date(issuedAt);
  if(term==="monthly")endsAt.setUTCMonth(endsAt.getUTCMonth()+1);
  else endsAt.setUTCFullYear(endsAt.getUTCFullYear()+1);
  const grant=tier==="none"?null:{source:"founder",tier,term,startsAt:issuedAt.toISOString(),
   expiresAt:endsAt.toISOString(),updatedAt:issuedAt.toISOString(),updatedBy:admin.uid,reason};
  await db.runTransaction(async tx=>{
   const original=await tx.get(ref);
   if(grant)tx.set(ref,grant);else tx.delete(ref);
   tx.create(audit,{actorUid:admin.uid,targetUid:uid,previous:original.data()||null,
    updated:grant,reason,createdAt:issuedAt.toISOString(),action:grant?"grant":"revoke"});
  });
  return respond({success:true,grant,charged:false,
   message:"Account access updated. No charge occurred and existing subscription renewal dates are unchanged."});
 }catch(error){
  console.error("FUGTH manual-access update",{code:error?.code||"admin"});
  return respond({error:"Could not save this access change."},503);
 }
}
