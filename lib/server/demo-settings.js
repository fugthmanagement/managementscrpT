import {firebaseAdmin} from "./auth";
export const DEMO_LENGTHS=[15,30,45,60,90];
export const DEFAULT_SECONDS=30;
const db=()=>firebaseAdmin().firestore();
const validUid=u=>/^[A-Za-z0-9_-]{8,128}$/.test(String(u||""));
const length=n=>DEMO_LENGTHS.includes(Number(n))?Number(n):DEFAULT_SECONDS;
export async function getGlobalDemoSettings(){
 try{const result=await db().doc("fugthPlatform/demoSettings").get();
  return {seconds:length(result.data()?.seconds),updatedAt:result.data()?.updatedAt||null};}
 catch{return {seconds:DEFAULT_SECONDS,updatedAt:null,storageUnavailable:true};}
}
export async function getAccountDemoSettings(uid){
 if(!validUid(uid))return null;
 const s=await db().doc("fugthDemoAccountSettings/"+uid).get();
 return s.exists?s.data():null;
}
export async function durationForDemo(uid,founder=false){
 const global=await getGlobalDemoSettings();
 if(founder)return global.seconds;
 try{const own=await getAccountDemoSettings(uid);
  return own?.seconds&&DEMO_LENGTHS.includes(Number(own.seconds))?Number(own.seconds):global.seconds;}
 catch{return global.seconds;}
}
export async function updateGlobalDemoSettings(seconds,actorUid){
 if(!DEMO_LENGTHS.includes(Number(seconds)))throw Error("Choose 15, 30, 45, 60 or 90 seconds.");
 const now=new Date().toISOString();
 await db().runTransaction(async tx=>{
  const ref=db().doc("fugthPlatform/demoSettings");
  tx.set(ref,{seconds:Number(seconds),updatedAt:now,updatedBy:actorUid},{merge:true});
  tx.create(db().collection("fugthDemoAudit").doc(),{actorUid,operation:"global_duration",seconds:Number(seconds),at:now});
 });
 return {seconds:Number(seconds),updatedAt:now};
}
export async function updateAccountDemoSettings(uid,seconds,actorUid){
 if(!validUid(uid)||!DEMO_LENGTHS.includes(Number(seconds)))throw Error("Select a valid account and duration.");
 const now=new Date().toISOString();
 await db().runTransaction(async tx=>{
  const ref=db().doc("fugthDemoAccountSettings/"+uid);
  tx.set(ref,{uid,seconds:Number(seconds),updatedAt:now,updatedBy:actorUid},{merge:true});
  tx.create(db().collection("fugthDemoAudit").doc(),{actorUid,targetUid:uid,operation:"account_duration",seconds:Number(seconds),at:now});
 });
 return {seconds:Number(seconds),updatedAt:now};
}
