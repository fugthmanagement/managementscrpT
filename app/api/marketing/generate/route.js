import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {hasAccess} from "../../../../lib/server/account-entitlements";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return response({error:"Sign in to generate a campaign."},401);
 if(!process.env.GEMINI_API_KEY)return response({error:"Gemini AI drafting is not configured yet. Set GEMINI_API_KEY in Vercel."},503);
 if(!process.env.FIREBASE_SERVICE_ACCOUNT&&!(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY))
  return response({error:"AI usage protection requires Firebase server credentials."},503);
 let body;try{body=await req.json();}catch{return response({error:"Invalid brief."},400);}
 const goal=String(body?.goal||"").slice(0,700),audience=String(body?.audience||"").slice(0,90);
 if(!goal.trim())return response({error:"Describe what you want the email to accomplish."},400);
 try{
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
  const prompt="Write ONE concise professional opt-in marketing email as JSON object with only subject and body keys. Business: "+business+"; type: "+type+"; target audience: "+audience+"; goal: "+goal+
   ". Body should greet Hi {{first_name}}, use plain text, have one clear call to action, and not invent prices, offers, guarantees, appointments or customer facts. Avoid deceptive urgency. Keep body under 220 words. Do not include an unsubscribe footer; system adds one.";
  const result=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
   method:"POST",headers:{"x-goog-api-key":process.env.GEMINI_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:600,temperature:0.65}}),
   cache:"no-store",signal:AbortSignal.timeout(16000)
  });
  if(!result.ok)return response({error:"Gemini declined this drafting request. Check its API availability or quota."},502);
  const payload=await result.json();
  const raw=payload.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("")||"";
  const answer=JSON.parse(raw);
  return response({subject:String(answer.subject||"").slice(0,140),message:String(answer.body||"").slice(0,6000),model:"gemini-2.5-flash"});
 }catch(e){return response({error:"AI draft could not be generated: "+String(e.message||"service unavailable").slice(0,100)},503);}
}
