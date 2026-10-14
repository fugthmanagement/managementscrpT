import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../lib/server/auth";
import {saveVerifiedCall,ended} from "../../../../lib/server/voice-call-history";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return NextResponse.json({error:"Sign in to sync your calls."},{status:401});
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/,"").trim();
 const key=process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY;
 if(!key)return NextResponse.json({error:"Your voice connection is unavailable."},{status:503});
 try{
  const since=new Date(Date.now()-7*24*3600000).toISOString();
  const provider=await fetch("https://api.vapi.ai/call?limit=100&createdAtGt="+encodeURIComponent(since),{
   headers:{Authorization:"Bearer "+key.trim()},cache:"no-store",signal:AbortSignal.timeout(12500)
  });
  if(!provider.ok)return NextResponse.json({error:"Vapi could not return recent call history."},{status:502});
  const calls=await provider.json();
  if(!Array.isArray(calls))return NextResponse.json({error:"Invalid voice-history response."},{status:502});
  const mine=calls.filter(c=>c?.metadata?.ownerId===user.uid&&c?.metadata?.fugthPreview===true&&ended(c)).slice(0,30);
  let saved=0,failures=0;
  for(const item of mine){
   // List responses may omit final analysis and recording; retrieve each full record.
   const detail=await fetch("https://api.vapi.ai/call/"+encodeURIComponent(item.id),{
    headers:{Authorization:"Bearer "+key.trim()},cache:"no-store",signal:AbortSignal.timeout(8500)
   });
   if(!detail.ok){failures++;continue;}
   const call=await detail.json();
   const result=await saveVerifiedCall(call,user.uid,token).catch(()=>({saved:false}));
   if(result.saved)saved++;else failures++;
  }
  return NextResponse.json({saved,matched:mine.length,failures,window:"7 days"});
 }catch{return NextResponse.json({error:"Recent call sync failed. Try again later."},{status:503});}
}
