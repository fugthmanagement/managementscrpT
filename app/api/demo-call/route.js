import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authenticatedUser } from "../../../../lib/server/auth";
import {
  prepareDemo,demoAssistant,demoDb,demoReady,phoneHash,
  DEMO_COOLDOWN_MS,DEMO_DAILY_ACCOUNT_LIMIT,DEMO_DAILY_PHONE_LIMIT,DEMO_GLOBAL_DAILY_LIMIT,
} from "../../../../lib/server/demo";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req) {
  const user=await authenticatedUser(req);
  if(!user)return NextResponse.json({error:"Please sign in."},{status:401});
  if(!demoReady())return NextResponse.json({available:false,reason:"Live voice previews are temporarily unavailable."});
  try{
    const uid=user.uid;
    const snapshot=await demoDb().doc(`demoLimits/accounts_${uid}`).get();
    const data=snapshot.data()||{};
    return NextResponse.json({
      available:Boolean(user.email_verified),
      needsEmailVerification:!user.email_verified,
      cooldownUntil:data.cooldownUntil||null,
      dailyUsed:data.date===new Date().toISOString().slice(0,10)?data.dayCount||0:0,
      dailyLimit:DEMO_DAILY_ACCOUNT_LIMIT
    });
  }catch{return NextResponse.json({available:false,reason:"Live voice previews are temporarily unavailable."});}
}

export async function POST(req) {
  const user=await authenticatedUser(req);
  if(!user)return NextResponse.json({error:"Please sign in to start a FUGTH preview."},{status:401});
  if(!user.email_verified)return NextResponse.json({error:"Please verify your account email before requesting a voice demo."},{status:403});
  if(!demoReady())return NextResponse.json({error:"FUGTH live demos are not yet enabled on this workspace."},{status:503});
  let content;
  try{
    if(Number(req.headers.get("content-length")||0)>3000)return NextResponse.json({error:"Invalid request size."},{status:413});
    content=prepareDemo(await req.json());
  }catch{return NextResponse.json({error:"Invalid demo request."},{status:400});}
  if(content.error)return NextResponse.json({error:content.error},{status:400});
  const now=Date.now(),day=new Date().toISOString().slice(0,10),uid=user.uid;
  const id=randomUUID();
  const db=demoDb(),userRef=db.doc(`demoLimits/accounts_${uid}`),phoneRef=db.doc(`demoLimits/phones_${phoneHash(content.to)}`);
  const globalRef=db.doc(`demoLimits/global_${day}`),record=db.doc(`users/${uid}/demoCalls/${id}`);
  try{
    await db.runTransaction(async tx=>{
      const [acct,phone,global]=await Promise.all([tx.get(userRef),tx.get(phoneRef),tx.get(globalRef)]);
      const a=acct.data()||{},p=phone.data()||{},g=global.data()||{};
      if((a.cooldownUntil||0)>now)throw Object.assign(new Error("Demo cooldown is still active."),{status:429,nextAvailableAt:a.cooldownUntil});
      if((p.cooldownUntil||0)>now)throw Object.assign(new Error("This phone number recently received a demo. Try again shortly."),{status:429,nextAvailableAt:p.cooldownUntil});
      if(a.date===day && (a.dayCount||0)>=DEMO_DAILY_ACCOUNT_LIMIT)throw Object.assign(new Error("This account has used today's demo allowance."),{status:429});
      if(p.date===day && (p.dayCount||0)>=DEMO_DAILY_PHONE_LIMIT)throw Object.assign(new Error("This number has reached today's demo allowance."),{status:429});
      if((g.dayCount||0)>=DEMO_GLOBAL_DAILY_LIMIT)throw Object.assign(new Error("The FUGTH demo service has reached its daily allowance."),{status:429});
      tx.set(userRef,{date:day,dayCount:a.date===day?(a.dayCount||0)+1:1,cooldownUntil:now+DEMO_COOLDOWN_MS,lastRequestedAt:now});
      tx.set(phoneRef,{date:day,dayCount:p.date===day?(p.dayCount||0)+1:1,cooldownUntil:now+DEMO_COOLDOWN_MS,lastRequestedAt:now});
      tx.set(globalRef,{dayCount:(g.dayCount||0)+1,updatedAt:now},{merge:true});
      tx.create(record,{
        id,uid,providerCallId:null,status:"initiating",role:content.role,industry:content.industry,
        scenario:content.scenario,businessName:content.business,phoneLast4:content.to.slice(-4),
        durationLimitSeconds:15,startedAt:new Date(now).toISOString(),createdAt:now,
        summary:"Call requested; no conversation summary yet.",intent:"Pending",completed:false
      });
    });
  }catch(e){return NextResponse.json({error:e.message||"Demo capacity unavailable.",nextAvailableAt:e.nextAvailableAt||null},{status:e.status||503});}
  const token=process.env.VAPI_PRIVATE_KEY || process.env.VOICE_PRIVATE_KEY;
  const assistant=demoAssistant(content);
  const payload={phoneNumberId:process.env.VAPI_PHONE_NUMBER_ID,customer:{number:content.to},assistant,name:"FUGTH 15-second preview"};
  try{
    const response=await fetch("https://api.vapi.ai/call",{
      method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(payload),cache:"no-store"
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.id){
      console.warn("FUGTH demo provider rejected call",response.status);
      await record.set({status:"failed",completed:true,summary:"The call could not be started.",endedAt:new Date().toISOString()},{merge:true});
      return NextResponse.json({error:"FUGTH couldn't place the demo call. No call was started. Try again after the cooldown or contact support.",nextAvailableAt:now+DEMO_COOLDOWN_MS},{status:502});
    }
    await record.set({providerCallId:result.id,status:result.status||"queued"},{merge:true});
    return NextResponse.json({started:true,callId:id,status:result.status||"queued",maxDurationSeconds:15,nextAvailableAt:now+DEMO_COOLDOWN_MS});
  }catch(e){
    console.error("FUGTH demo start error",e.message);
    await record.set({status:"unknown",summary:"The provider's response was not confirmed; check status before requesting another call."},{merge:true}).catch(()=>{});
    return NextResponse.json({error:"The demo request could not be confirmed. Wait for the cooldown before trying again.",nextAvailableAt:now+DEMO_COOLDOWN_MS},{status:502});
  }
}
