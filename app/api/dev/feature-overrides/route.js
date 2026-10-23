import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const out=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const VIP_FEATURES=[
 "voiceReceptionist","missedCallTextback","outreachMessenger","siteMaker","priorityOnboarding"
];
async function founder(req){const user=await authenticatedUser(req);return user&&isFounder(user)?user:null;}
function uidFrom(req){return String(new URL(req.url).searchParams.get("uid")||"")}
const validUid=uid=>/^[a-zA-Z0-9_-]{8,128}$/.test(uid);
export async function GET(req){
 const actor=await founder(req);if(!actor)return out({error:"Verified founder required."},403);
 const uid=uidFrom(req);if(!validUid(uid))return out({error:"Select a customer UID."},400);
 try{
  const snap=await firebaseAdmin().firestore().doc("founderFeatureOverrides/"+uid).get();
  return out({uid,features:Object.fromEntries(VIP_FEATURES.map(key=>[key,snap.data()?.features?.[key]===true])),
   updatedAt:snap.data()?.updatedAt||null,reason:snap.data()?.reason||"",
   note:"These are audited founder feature preferences, not Stripe billing or provider provisioning."});
 }catch(error){const issue=firestoreDemoFailure(error);return out({error:"VIP feature settings cannot load.",code:issue.code,hint:issue.hint},503)}
}
export async function POST(req){
 const actor=await founder(req);if(!actor)return out({error:"Verified founder required."},403);
 let body;try{const raw=await req.text();if(raw.length>2300)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid update."},400)}
 const uid=String(body.uid||""),features=body.features,reason=String(body.reason||"").trim().slice(0,180);
 if(!validUid(uid)||!reason||!features||typeof features!=="object"||Array.isArray(features)||
  Object.keys(features).some(k=>!VIP_FEATURES.includes(k)||typeof features[k]!=="boolean"))
  return out({error:"Choose a customer, at least one supported feature flag, and an audit reason."},400);
 try{
  const db=firebaseAdmin().firestore();
  await firebaseAdmin().auth().getUser(uid);
  const doc=db.doc("founderFeatureOverrides/"+uid),audit=db.collection("founderAccountAudit").doc();
  const saved=Object.fromEntries(VIP_FEATURES.map(key=>[key,features[key]===true]));
  const now=new Date().toISOString();
  await db.runTransaction(async tx=>{
   const prior=await tx.get(doc);
   tx.set(doc,{features:saved,reason,updatedAt:now,updatedBy:actor.uid});
   tx.create(audit,{action:"vip_features",actorUid:actor.uid,targetUid:uid,
    previous:prior.data()?.features||null,updated:saved,reason,createdAt:now});
  });
  return out({saved:true,uid,features:saved,message:"Founder feature flags saved and audited. No subscription or provider setting was changed."});
 }catch(error){const issue=firestoreDemoFailure(error);return out({error:"VIP feature updates could not be saved.",code:issue.code},503)}
}
