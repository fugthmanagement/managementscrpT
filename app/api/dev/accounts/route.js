import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {TIERS,manualAccess,accessTier} from "../../../../lib/server/account-entitlements";
import {fromFirestoreValue} from "../../../../lib/server/firestore-admin";
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
const projectId=()=>process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"fugthmanagement-89c84";
function account(uid,p,auth=null,verifiedGrant=null){
 const grant=manualAccess({founderAccess:verifiedGrant});
 const rawDate=p.createdAt?.toDate?.()||p.createdAt||auth?.metadata?.creationTime||null;
 return {uid,email:String(auth?.email||p.email||"").slice(0,180),
  displayName:String(auth?.displayName||p.displayName||"").slice(0,110),
  emailVerified:auth?.emailVerified===true,disabled:auth?.disabled===true,
  createdAt:date(rawDate),lastSignInAt:date(auth?.metadata?.lastSignInTime),
  businessName:String(p.businessName||"").slice(0,100),
  tier:accessTier({...p,founderAccess:verifiedGrant}),
  paidTier:p.billingActive===true?p.planTier||"none":"none",
  billingActive:p.billingActive===true,planStatus:p.planStatus||"none",
  nextChargeAt:p.billingRenewsAt||p.billingCurrentPeriodEnd||null,
  grant:grant?{tier:grant.tier,term:grant.term,startsAt:grant.startsAt,expiresAt:grant.expiresAt}:null};
}
async function founderTokenDirectory(request,cursor){
 const token=String(request.headers.get("authorization")||"").replace(/^Bearer\s+/,"");
 const url=new URL("https://firestore.googleapis.com/v1/projects/"+
  encodeURIComponent(projectId())+"/databases/(default)/documents/users");
 url.searchParams.set("pageSize","60");
 if(cursor)url.searchParams.set("pageToken",cursor);
 const fields=["businessName","businessType","email","displayName","planTier","planStatus","billingActive","billingRenewsAt","billingCurrentPeriodEnd","createdAt"];
 for(const field of fields)url.searchParams.append("mask.fieldPaths",field);
 const res=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(9000)});
 if(!res.ok){
  const issueCode=res.status===403?"FOUNDER_FIRESTORE_RULES":res.status===401?"AUTH_EXPIRED":
   res.status===404?"FIRESTORE_PROJECT":"FIRESTORE_BACKEND";
  throw Object.assign(new Error("Verified founder read was denied."),{issueCode});
 }
 const data=await res.json();
 const accounts=(data.documents||[]).map(d=>{
  const uid=String(d.name||"").split("/").pop();
  const p=Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,fromFirestoreValue(v)]));
  return account(uid,p);
 }).filter(u=>/^[\w-]{8,128}$/.test(u.uid));
 return {accounts,nextCursor:data.nextPageToken||null,partial:true,
  issueCode:"AUTH_DIRECTORY_UNAVAILABLE",source:"verified_founder_firestore"};
}
export async function GET(request){
 const admin=await founder(request);
 if(!admin)return respond({error:"Verified FUGTH management access required."},403);
 const cursor=new URL(request.url).searchParams.get("cursor")||undefined;
 if(cursor&&!/^[\w+/=-]{1,3000}$/.test(cursor))return respond({error:"Invalid page reference."},400);
 try{
  const service=firebaseAdmin(),db=service.firestore();
  const result=await service.auth().listUsers(60,cursor);
  const refs=result.users.map(u=>db.doc("users/"+u.uid));
  const grants=result.users.map(u=>db.doc("founderAccountGrants/"+u.uid));
  const [profiles,grantDocs]=await Promise.all([
   refs.length?db.getAll(...refs):[],grants.length?db.getAll(...grants):[]
  ]);
  return respond({accounts:result.users.map((u,i)=>account(u.uid,profiles[i]?.data()||{},u,grantDocs[i]?.data()||null)),
   nextCursor:result.pageToken||null,partial:false,issueCode:null,source:"secure_directory"});
 }catch(error){
  console.error("FUGTH privileged directory unavailable",{code:error?.code||"server"});
  try{return respond(await founderTokenDirectory(request,cursor));}
  catch(fallback){
   const issueCode=fallback?.issueCode||(/permission|denied/i.test(String(error?.code))?"SERVICE_PERMISSIONS":
     /credential|invalid/i.test(String(error?.code))?"SERVICE_CREDENTIALS":"DIRECTORY_BACKEND");
   console.error("FUGTH alternate directory unavailable",{issueCode});
   return respond({error:issueCode==="FOUNDER_FIRESTORE_RULES"?
    "FUGTH needs the updated founder-only Firestore read rule before it can show customer accounts.":
    "FUGTH cannot load customer accounts. Please check its server account permissions and active database.",
    issueCode,accounts:null},503);
  }
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
