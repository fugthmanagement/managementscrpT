"use client";
import {doc,runTransaction,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../firebase";
/**
 * Survives a Firestore Admin outage for manual founder contact records ONLY.
 * Uses Firebase's own signed-in client session and existing owner-scoped
 * Firestore rules. Cannot send messages, create public demo links or bypass
 * permission/opt-out checks. Limits retained fallback history to 20 event IDs.
 */
const allowedStages=new Set(["new","contacted","replied","interested","needs_info","follow_up","appointment","not_interested","won","lost"]);
const limited=x=>String(x||"").replace(/[\x00-\x1f<>]/g," ").trim().slice(0,120);
export async function saveProspectClientFallback({prospectId,eventId,kind,channel="email",
 stage="",followUpAt=null,subject=""}){
 const user=auth?.currentUser;
 if(!user?.uid||!db)throw Error("Sign in to your Firebase workspace to use direct save.");
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(String(prospectId||""))||
    !/^[A-Za-z0-9-]{12,80}$/.test(String(eventId||"")))
  throw Error("Invalid prospect or contact history ID.");
 const ref=doc(db,"users",user.uid,"campaigns",prospectId);
 const event={
  id:eventId,kind:limited(kind),channel:limited(channel),
  at:new Date().toISOString(),subject:limited(subject)
 };
 return runTransaction(db,async tx=>{
  const record=await tx.get(ref);
  if(!record.exists()||record.data()?.type!=="cold_call_prospect")
   throw Error("Prospect does not belong to the current workspace.");
  const lead=record.data(),previous=Array.isArray(lead.outreachFallbackEvents)?lead.outreachFallbackEvents:[];
  if(previous.some(e=>e?.id===eventId))return {saved:true,alreadyRecorded:true};
  const patch={
   outreachFallbackEvents:[...previous.slice(-19),event],
   updatedAt:serverTimestamp()
  };
  if(kind==="record_email"){
   if(lead.emailOptOut||lead.unsubscribed||lead.doNotCall)throw Error("Email has been opted out.");
   patch.emailSentCount=Math.max(0,Number(lead.emailSentCount||0))+1;
   patch.emailLastSentAt=serverTimestamp();patch.emailLastProvider="manual_client_fallback";
   patch.emailLastSentSubject=limited(subject);
   patch.lastOutreachAt=serverTimestamp();patch.outreachStage="contacted";
  }else if(kind==="record_sms"){
   // Past text tracking does not grant marketing SMS permission.
   patch.smsSentCount=Math.max(0,Number(lead.smsSentCount||0))+1;
   patch.smsLastSentAt=serverTimestamp();patch.smsLastProvider=channel;
   patch.lastOutreachAt=serverTimestamp();patch.outreachStage="contacted";
  }else if(kind==="set_stage"||kind==="record_reply"){
   if(!allowedStages.has(stage))throw Error("Invalid sales stage.");
   patch.outreachStage=stage;
   if(kind==="record_reply")patch.lastReplyAt=serverTimestamp();
  }else if(kind==="schedule_followup"){
   const future=new Date(followUpAt);
   if(!Number.isFinite(future.getTime())||future.getTime()<Date.now()-86400000||
      future.getTime()>Date.now()+366*86400000)throw Error("Select a valid follow-up date.");
   patch.outreachStage="follow_up";patch.nextFollowUpAt=future.toISOString();
  }else if(kind==="suppress"){
   if(channel!=="sms"&&channel!=="email")throw Error("Invalid suppression channel.");
   patch[channel==="sms"?"smsOptOut":"emailOptOut"]=true;
   patch.outreachStage="not_interested";patch.nextFollowUpAt=null;
  }else throw Error("Unsupported manual contact operation.");
  tx.update(ref,patch);
  return {saved:true,alreadyRecorded:false,source:"signed_in_firebase_client",
   note:"Saved directly to your own Firestore prospect while the server API was unavailable. Message delivery was NOT verified."};
 });
}
