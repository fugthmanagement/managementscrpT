import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {gatewayChat,loadAiPolicy} from "../../../../lib/server/meplifeos";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=45;
const output=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const safe=s=>String(s||"").replace(/[\u0000-\u001f]/g," ").slice(0,800);
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user?.uid||!isFounder(user))return output({error:"Verified founder account required."},403);
 let data;try{data=await request.json();}catch{return output({error:"Invalid request."},400);}
 const prospectId=String(data.prospectId||"");
 const objective=String(data.objective||"").trim().slice(0,450);
 if(!/^[A-Za-z0-9_-]{8,150}$/.test(prospectId)||!objective)return output({error:"Choose a saved prospect and a sales question."},400);
 try{
  const policy=await loadAiPolicy();
  if(!policy.enabled||!policy.coldCallEnabled)return output({error:"AI sales coaching is currently disabled."},503);
  const db=firebaseAdmin().firestore();
  const prospectSnap=await db.doc("users/"+user.uid+"/campaigns/"+prospectId).get();
  if(!prospectSnap.exists||prospectSnap.data()?.type!=="cold_call_prospect")return output({error:"This prospect is not in your private list."},404);
  const p=prospectSnap.data();
  if(p.doNotCall===true||p.status==="do_not_call")return output({error:"Do-not-call flag: do not prepare a sales call for this contact."},403);
  const today=new Date().toISOString().slice(0,10);
  let allowed=false;
  const quota=db.doc("aiTaskUsage/"+user.uid+"_"+today+"_sales");
  await db.runTransaction(async tx=>{const snap=await tx.get(quota);const n=Number(snap.data()?.count)||0;if(n>=25)return;tx.set(quota,{uid:user.uid,day:today,count:n+1,updatedAt:new Date().toISOString()},{merge:true});allowed=true;});
  if(!allowed)return output({error:"You've reached 25 sales coaching generations for today."},429);
  const context=[
   "TARGET BUSINESS: "+safe(p.businessName),
   "INDUSTRY: "+safe(p.industry),
   "CITY: "+safe(p.city),
   "WEBSITE LISTED: "+(p.website?"yes":"not listed"),
   "LAST CALL OUTCOME: "+safe(p.lastOutcome||"No verified conversation"),
   "KNOWN NOTES (not proof): "+safe(p.notes).slice(0,350),
   "ACTUAL OFFER: Optional free 15-minute FUGTH AI-front-desk audit.",
   "No existing relationship, referral, agreed appointment, or web preview can be claimed without verified evidence.",
   "If the prospect says no, respect that and finish politely."
  ].join("\n");
  const result=await gatewayChat({task:"cold_call",businessName:"FUGTH Management",modelName:policy.coldCallModel,
   context,message:"Write a concise ethical, permission-based response for this situation. "+objective,
   maxTokens:180,timeoutMs:32000,temperature:0.18});
  return output({draft:result.answer,model:result.model,queueMs:result.queueMs,inferenceMs:result.inferenceMs,saved:false});
 }catch(e){return output({error:e.code==="BUSY"?"The shared GGUF queue is full. Try again shortly.":"The GGUF sales coach is unavailable; you can still use Pierre’s fixed call guide."},503);}
}
