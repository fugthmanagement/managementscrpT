import {createHmac} from "node:crypto";
import {firebaseAdmin} from "./auth";
import {DEMO_COOLDOWN_MS,DEMO_GLOBAL_DAILY_LIMIT} from "./voice-preview";

// Private server-only Firestore documents. Never trust browser timers for billing protections.
const db=()=>firebaseAdmin().firestore();
const phoneKey=(phone)=>{
 const secret=process.env.DEMO_COOLDOWN_SECRET||process.env.VAPI_PRIVATE_KEY||process.env.VOICE_PRIVATE_KEY;
 if(!secret)throw Error("Demo quota protection is unavailable.");
 return createHmac("sha256",secret).update(phone).digest("hex");
};
const safeUid=(uid)=>/^[A-Za-z0-9_-]{8,128}$/.test(uid||"");
const today=()=>new Date().toISOString().slice(0,10).replaceAll("-","");
const refFor=(uid)=>db().collection("demoPreviewAccounts").doc(uid);
const blockFor=(phone)=>db().collection("demoPreviewPhones").doc(phoneKey(phone));
export function remainingSeconds(date){
 const value=Date.parse(date||"");
 return Number.isFinite(value)?Math.max(0,Math.ceil((value-Date.now())/1000)):0;
}
export async function getDemoCooldown(uid){
 if(!safeUid(uid))throw Error("Invalid demo account.");
 const doc=await refFor(uid).get(),data=doc.data()||{};
 const cooldownUntil=data.cooldownUntil||null;
 return {cooldownUntil,remainingSeconds:remainingSeconds(cooldownUntil),
  lastPhone: data.lastPhone||null,lastFocus:data.focus||null,lastCallId:data.callId||null};
}
export async function reserveDemo(uid,phone,focus){
 if(!safeUid(uid))throw Error("Invalid demo account.");
 const accountRef=refFor(uid),phoneRef=blockFor(phone);
 const dailyRef=db().collection("demoPreviewDaily").doc(today());
 const eventRef=db().collection("demoPreviewAttempts").doc();
 const now=Date.now(),until=new Date(now+DEMO_COOLDOWN_MS).toISOString(),at=new Date(now).toISOString();
 return db().runTransaction(async tx=>{
  const [accountDoc,phoneDoc,dailyDoc]=await Promise.all([tx.get(accountRef),tx.get(phoneRef),tx.get(dailyRef)]);
  const account=accountDoc.data()||{},phoneLock=phoneDoc.data()||{},daily=dailyDoc.data()||{};
  const locked=Math.max(remainingSeconds(account.cooldownUntil),remainingSeconds(phoneLock.cooldownUntil));
  if(locked>0){
   const error=new Error("This number or account recently requested a demo. Try again when the three-hour cooldown ends.");
   error.status=429;error.cooldownUntil=new Date(now+locked*1000).toISOString();throw error;
  }
  if((Number(daily.count)||0)>=DEMO_GLOBAL_DAILY_LIMIT){
   const error=new Error("Today's demo capacity has been reached. Please try tomorrow.");
   error.status=429;throw error;
  }
  // Immutable account/phone locks are committed before starting any billable call.
  tx.set(accountRef,{uid,cooldownUntil:until,lastPhone:"•••"+phone.slice(-4),phoneHash:phoneKey(phone),focus,updatedAt:at,callId:null});
  tx.set(phoneRef,{uid,cooldownUntil:until,updatedAt:at,lastPhone:"•••"+phone.slice(-4)});
  tx.set(dailyRef,{count:(Number(daily.count)||0)+1,updatedAt:at},{merge:true});
  tx.create(eventRef,{uid,phoneLast4:phone.slice(-4),focus,createdAt:at,result:"reserved"});
  return {cooldownUntil:until,attemptId:eventRef.id};
 });
}
export async function recordDemoCall(uid,attemptId,callId,result="started"){
 if(!safeUid(uid))return;
 const store=db(),account=store.collection("demoPreviewAccounts").doc(uid);
 await Promise.all([
  account.set({callId,callStatus:result,updatedAt:new Date().toISOString()},{merge:true}),
  store.collection("demoPreviewAttempts").doc(attemptId).set({callId,result,updatedAt:new Date().toISOString()},{merge:true})
 ]);
}
export async function resetDemoCooldown(uid,actorUid){
 if(!safeUid(uid))throw Error("Choose a valid customer account.");
 const store=db(),accountRef=store.collection("demoPreviewAccounts").doc(uid);
 const now=new Date().toISOString();
 return store.runTransaction(async tx=>{
  const snapshot=await tx.get(accountRef);
  if(!snapshot.exists)return {reset:false,reason:"This account has no demo cooldown yet."};
  const info=snapshot.data()||{};
  const phoneRef=info.phoneHash?store.collection("demoPreviewPhones").doc(info.phoneHash):null;
  const phoneSnapshot=phoneRef?await tx.get(phoneRef):null;
  tx.update(accountRef,{cooldownUntil:null,resetBy:actorUid,resetAt:now});
  // If a different account has since called this number, don't clear its lock.
  if(phoneRef&&phoneSnapshot.exists&&phoneSnapshot.data()?.uid===uid)
   tx.update(phoneRef,{cooldownUntil:null,resetBy:actorUid,resetAt:now});
  tx.create(store.collection("demoPreviewResets").doc(),{
   uid,actorUid,previousCooldownUntil:info.cooldownUntil||null,
   lastPhone:info.lastPhone||null,at:now
  });
  return {reset:true};
 });
}
