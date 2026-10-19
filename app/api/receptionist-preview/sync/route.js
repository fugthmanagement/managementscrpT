import {businessEntitlement} from "../../../../lib/server/feature-entitlement";
import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../lib/server/auth";
import {saveVerifiedCall,ended} from "../../../../lib/server/voice-call-history";
import {firebaseAdmin} from "../../../../lib/server/auth";
import {hasAdminStorage} from "../../../../lib/server/vapi-recordings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return NextResponse.json({error:"Sign in to sync your calls."},{status:401});
 const permit=await businessEntitlement(user,"voice");if(!permit.allowed)return NextResponse.json({error:permit.reason,tier:permit.tier},{status:403});
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/,"").trim();
 const key=process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY;
 if(!key)return NextResponse.json({error:"Your voice connection is unavailable."},{status:503});
 try{
  const since=new Date(Date.now()-7*24*3600000).toISOString();
  const provider=await fetch("https://api.vapi.ai/call?limit=100&createdAtGt="+encodeURIComponent(since),{
   headers:{Authorization:"Bearer "+key.trim()},cache:"no-store",signal:AbortSignal.timeout(12500)
  });
  if(!provider.ok)return NextResponse.json({error:"Your FUGTH call history could not be refreshed right now."},{status:502});
  const calls=await provider.json();
  if(!Array.isArray(calls))return NextResponse.json({error:"Invalid voice-history response."},{status:502});
  // Backfill older calls on assigned inbound numbers, not only preview calls
  // with explicit ownerId. Number assignments are protected Firestore fields.
  const assigned=new Set();
  if(hasAdminStorage()){
   try{
    const account=await firebaseAdmin().firestore().doc("users/"+user.uid).get();
    for(const id of [account.data()?.assignedNumberId,account.data()?.vapiPhoneNumberId]){
     if(typeof id==="string"&&id)assigned.add(id);
    }
   }catch{/* Metadata-linked calls remain available without Admin mapping. */}
  }
  const owns=c=>c?.metadata?.ownerId===user.uid||assigned.has(c?.phoneNumberId)||assigned.has(c?.phoneNumber?.id);
  const mine=calls.filter(c=>owns(c)&&ended(c)).slice(0,30);
  let saved=0,failures=0,archived=0,leads=0;
  for(const item of mine){
   // List responses may omit final analysis and recording; retrieve each full record.
   const detail=await fetch("https://api.vapi.ai/call/"+encodeURIComponent(item.id),{
    headers:{Authorization:"Bearer "+key.trim()},cache:"no-store",signal:AbortSignal.timeout(8500)
   });
   if(!detail.ok){failures++;continue;}
   const call=await detail.json();
   if(!owns(call)){failures++;continue;}
   const verified={...call,metadata:{...call.metadata,ownerId:user.uid}};
   const result=await saveVerifiedCall(verified,user.uid,token).catch(()=>({saved:false}));
   if(result.saved){saved++;if(result.recordingSaved)archived++;if(result.leadSaved)leads++;}else failures++;
  }
  return NextResponse.json({saved,archived,leads,matched:mine.length,failures,window:"7 days"});
 }catch{return NextResponse.json({error:"Recent call sync failed. Try again later."},{status:503});}
}
