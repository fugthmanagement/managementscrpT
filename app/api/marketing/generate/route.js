import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {hasAccess} from "../../../../lib/server/account-entitlements";
import {gatewayChat,loadAiPolicy} from "../../../../lib/server/meplifeos";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return response({error:"Sign in to generate a campaign."},401);
 if(!process.env.FIREBASE_SERVICE_ACCOUNT&&!(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY))
  return response({error:"AI usage protection requires Firebase server credentials."},503);
 let body;try{body=await req.json();}catch{return response({error:"Invalid brief."},400);}
 const goal=String(body?.goal||"").slice(0,700),audience=String(body?.audience||"").slice(0,90);
 if(!goal.trim())return response({error:"Describe what you want the email to accomplish."},400);
 try{
  const policy=await loadAiPolicy();
  if(!policy.enabled||!policy.emailEnabled)return response({error:"AI email drafting is disabled by your FUGTH administrator."},503);
  const db=firebaseAdmin().firestore(),userDoc=await db.doc("users/"+user.uid).get(),profile=userDoc.data()||{};
  const manualDoc=await db.doc("founderAccountGrants/"+user.uid).get();
  const entitled=isFounder(user)||hasAccess({...profile,founderAccess:manualDoc.data()},"growth")||
   (profile.billingActive===true&&profile.billingAddons?.includes("email"));
  if(!entitled)return response({error:"AI campaign writing needs Mid, High or the Email add-on."},403);
  const date=new Date().toISOString().slice(0,10).replaceAll("-");
  const quotaRef=db.doc("marketingAiUsage/"+user.uid+"_"+date);
  let allowed=false;
  await db.runTransaction(async tx=>{
   const snap=await tx.get(quotaRef),count=Number(snap.data()?.count)||0;
   if(count>=10)return;
   tx.set(quotaRef,{count:count+1,uid:user.uid,day:date,updatedAt:new Date().toISOString()},{merge:true});
   allowed=true;
  });
  if(!allowed)return response({error:"You have used today's 10 AI drafting requests. Try tomorrow."},429);
  const business=String(profile.businessName||"the business").slice(0,80),type=String(profile.businessType||"local services").slice(0,90);
  const details=[
   "Business name: "+business,"Business industry: "+type,
   "Audience: "+audience,"Purpose: "+goal,
   "This is an optional marketing email draft, never automatically sent.",
   "Use Hi {{first_name}}, one respectful action, under 170 words.",
   "Do not invent verified offers, prices, customer history or appointments. Do not add fictional testimonials.",
   "When describing capabilities, speak only about the business details above."
  ].join("\n");
  const ai=await gatewayChat({task:"email",businessName:business,modelName:policy.emailModel,
   message:"Draft an email for human review with the requested goal and audience. Return Subject: ... on line one, then Body: ... on following lines.",
   context:details,maxTokens:220,temperature:0.2,timeoutMs:35000});
  const raw=String(ai.answer||"").trim();
  const match=raw.match(/(?:^|\n)\s*Subject:\s*([^\n]{3,140})[\r\n]+(?:\s*Body:\s*)?([\s\S]*)/i);
  const subject=match?.[1]?.trim().slice(0,140)||"A quick update from "+business;
  const message=(match?.[2]||raw.replace(/^Subject:[^\n]+\n?/i,"")).trim().slice(0,2500);
  if(!message||message.length<15)throw Error("The local AI produced an incomplete email draft. Please retry.");
  return response({subject,message,model:ai.model,queueMs:ai.queueMs,inferenceMs:ai.inferenceMs,
   reviewRequired:true,deliveryStatus:"draft_only"});
 }catch(e){return response({error:"AI draft could not be generated: "+String(e.message||"service unavailable").slice(0,100)},503);}
}
