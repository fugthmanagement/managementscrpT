import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const respond=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const isEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||"").trim());
const clean=(v,max=150)=>String(v??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,max);
/** Copy only independently verified opt-in prospects into the existing opt-in
 * CRM campaign sender. This never emails anyone; /api/marketing/send retains
 * its own Gmail OAuth, unsubscribe, 10/batch and 50/day protections.
 */
export async function POST(req){
 const actor=await authenticatedUser(req);
 if(!actor?.uid||!isFounder(actor))return respond({error:"Founder-only email outreach."},403);
 let body;try{const raw=await req.text();if(raw.length>5000)throw Error();body=JSON.parse(raw)}
 catch{return respond({error:"Invalid prospect selection."},400)}
 const ids=Array.isArray(body?.prospectIds)?[...new Set(body.prospectIds.map(String))]:[];
 if(body?.action!=="sync_opted_in"||!ids.length||ids.length>50||ids.some(x=>!/^[A-Za-z0-9_-]{8,128}$/.test(x)))
  return respond({error:"Choose 1 to 50 valid saved prospects."},400);
 try{
  const db=firebaseAdmin().firestore(),uid=actor.uid;
  const src=ids.map(id=>db.doc("users/"+uid+"/campaigns/"+id));
  const dest=ids.map(id=>db.doc("users/"+uid+"/leads/outreach_"+id));
  const [prospects,existing]=await Promise.all([db.getAll(...src),db.getAll(...dest)]);
  const batch=db.batch(),report={synced:0,alreadyPresent:0,skipped:0,missingEmail:0,noOptIn:0,optedOut:0};
  for(let i=0;i<ids.length;i++){
   const p=prospects[i].data();
   if(!p||p.type!=="cold_call_prospect"){report.skipped++;continue}
   if(p.doNotCall===true||p.status==="do_not_call"||p.unsubscribed===true||p.emailOptOut===true||
      existing[i].data()?.unsubscribed===true||existing[i].data()?.doNotCall===true){report.optedOut++;continue}
   if(!isEmail(p.email)){report.missingEmail++;continue}
   if(p.marketingOptIn!==true||clean(p.consentSource,300).length<8){report.noOptIn++;continue}
   const now=new Date().toISOString();
   batch.set(dest[i],{
    businessName:clean(p.businessName,110),contactName:clean(p.ownerName,95),
    email:clean(p.email,175).toLowerCase(),phone:clean(p.phone,35),source:"verified_founder_prospect",
    sourceProspectId:ids[i],marketingOptIn:true,unsubscribed:false,
    consentSource:clean(p.consentSource,300),updatedAt:now,
    ...(!existing[i].exists?{createdAt:now}:{})
   },{merge:true});
   report.synced++;
   if(existing[i].exists)report.alreadyPresent++;
  }
  if(report.synced)await batch.commit();
  return respond({...report,sent:0,
   note:"Eligible prospects were copied into your opted-in Marketing CRM. No email was sent. Send only through the existing reviewed Gmail campaign flow."});
 }catch(e){console.warn("Verified email prospect sync failure",{code:e?.code||"db"});return respond({error:"Could not safely sync selected contacts to Marketing."},503)}
}
