import { NextResponse } from "next/server";
import { authenticatedUser } from "../../../../lib/server/auth";
import { demoDb,demoReady,intentFromText } from "../../../../lib/server/demo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req) {
  const user=await authenticatedUser(req);
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  const id=new URL(req.url).searchParams.get("id")||"";
  if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:"Invalid call reference."},{status:400});
  if(!demoReady())return NextResponse.json({error:"Voice preview status isn't configured."},{status:503});
  try{
    const ref=demoDb().doc(`users/${user.uid}/demoCalls/${id}`);
    const snap=await ref.get();
    if(!snap.exists)return NextResponse.json({error:"Demo not found."},{status:404});
    let rec=snap.data();
    if(rec.uid!==user.uid)return NextResponse.json({error:"Demo not found."},{status:404});
    if(!rec.completed && rec.providerCallId && (!rec.lastPolledAt||Date.now()-rec.lastPolledAt>=3500)){
      const key=process.env.VAPI_PRIVATE_KEY||process.env.VOICE_PRIVATE_KEY;
      const res=await fetch(`https://api.vapi.ai/call/${encodeURIComponent(rec.providerCallId)}`,{
        headers:{Authorization:`Bearer ${key}`},cache:"no-store"
      });
      if(res.ok){
        const data=await res.json();
        const ended=data.status==="ended"||data.status==="failed"||Boolean(data.endedAt);
        const summary=ended
          ? String(data.analysis?.summary||data.artifact?.transcript||data.transcript||"").slice(0,650)
          : rec.summary;
        const intent=ended?intentFromText(summary):rec.intent;
        const start=Date.parse(data.startedAt||rec.startedAt);
        const end=Date.parse(data.endedAt||"");
        const duration=Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,Math.round((end-start)/1000)):null;
        rec={...rec,status:data.status||rec.status,summary:summary||"The short demo ended without enough conversation to summarize.",intent,endedAt:data.endedAt||null,completed:ended,duration,lastPolledAt:Date.now()};
        await ref.set({
          status:rec.status,summary:rec.summary,intent:rec.intent,
          endedAt:rec.endedAt,completed:rec.completed,duration:rec.duration,lastPolledAt:rec.lastPolledAt
        },{merge:true});
      }
    }
    return NextResponse.json({
      id:rec.id,status:rec.status,completed:Boolean(rec.completed),
      industry:rec.industry,role:rec.role,scenario:rec.scenario,
      duration:rec.duration??null,durationLimitSeconds:15,
      summary:rec.summary||"Call is being prepared.",intent:rec.intent||"Pending",
      last4:rec.phoneLast4||"",startedAt:rec.startedAt||""
    });
  }catch(e){console.error("Voice preview status error",e.message);return NextResponse.json({error:"Couldn't refresh the demo status. Please try again shortly."},{status:502});}
}
