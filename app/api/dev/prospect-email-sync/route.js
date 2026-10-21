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
 let body;try{const raw=await req.text();if(raw.length>10500)throw Error();body=JSON.parse(raw)}
 catch{return respond({error:"Invalid prospect selection."},400)}
 const ids=Array.isArray(body?.prospectIds)?[...new Set(body.prospectIds.map(String))]:[];
 const creating=body?.action==="create_campaign";
 if(!["sync_opted_in","create_campaign"].includes(body?.action)||!ids.length||ids.length>50||ids.some(x=>!/^[A-Za-z0-9_-]{8,128}$/.test(x)))
  return respond({error:"Choose 1 to 50 valid saved prospects."},400);
 if(creating){
  if(!["concept","improvement","appointment","custom"].includes(body.preset))
   return respond({error:"Use a truthful general-purpose email preset for group campaigns."},400);
  if(body.preset==="custom"&&ids.length>1)
   return respond({error:"A GGUF or custom email written for one business cannot be sent unchanged to multiple different businesses."},400);
  const subject=clean(body.subject,140),message=String(body.message||"").trim().slice(0,5600);
  const address=clean(body.mailingAddress,240);
  if(subject.length<5||message.length<40||address.length<10||address.includes("{{"))
   return respond({error:"Add a real subject, body and your verified mailing address before preparing a Gmail campaign."},400);
  if(/\[preview link not assigned\]|\[genuine referrer\]/i.test(message))
   return respond({error:"Remove placeholder links or unverified referrals before saving a campaign."},400);
 }
 try{
  const db=firebaseAdmin().firestore(),uid=actor.uid;
  const src=ids.map(id=>db.doc("users/"+uid+"/campaigns/"+id));
  const dest=ids.map(id=>db.doc("users/"+uid+"/leads/outreach_"+id));
  const [prospects,existing]=await Promise.all([db.getAll(...src),db.getAll(...dest)]);
  const batch=db.batch(),report={synced:0,alreadyPresent:0,skipped:0,missingEmail:0,noOptIn:0,optedOut:0};
  const eligibleIds=[],seenEmails=new Set();
  for(let i=0;i<ids.length;i++){
   const p=prospects[i].data();
   if(!p||p.type!=="cold_call_prospect"){report.skipped++;continue}
   if(p.doNotCall===true||p.status==="do_not_call"||p.unsubscribed===true||p.emailOptOut===true||
      existing[i].data()?.unsubscribed===true||existing[i].data()?.doNotCall===true){report.optedOut++;continue}
   if(!isEmail(p.email)){report.missingEmail++;continue}
   if(p.marketingOptIn!==true||clean(p.consentSource,300).length<8){report.noOptIn++;continue}
   const email=clean(p.email,175).toLowerCase();
   if(seenEmails.has(email)){report.skipped++;continue}
   seenEmails.add(email);
   if(creating&&body.preset==="improvement"&&!/^https:\/\/[^ ]+/i.test(String(p.website||""))){report.skipped++;continue}
   const now=new Date().toISOString();
   eligibleIds.push(dest[i].id);
   batch.set(dest[i],{
    businessName:clean(p.businessName,110),contactName:clean(p.ownerName,95),
    email,phone:clean(p.phone,35),websitePreviewUrl:clean(p.websitePreviewUrl,500),
    assignedPreviewId:clean(p.assignedPreviewId,35),source:"verified_founder_prospect",
    sourceProspectId:ids[i],marketingOptIn:true,unsubscribed:false,
    consentSource:clean(p.consentSource,300),updatedAt:now,
    ...(!existing[i].exists?{createdAt:now}:{})
   },{merge:true});
   report.synced++;
   if(existing[i].exists)report.alreadyPresent++;
  }
  let campaignId=null;
  if(creating){
   if(!report.synced)return respond({...report,error:"None of your selected contacts have verified email opt-in or eligibility. Nothing was queued."},409);
   const raw=String(body.message||"").trim().slice(0,5600);
   const address=clean(body.mailingAddress,240);
   campaignId=db.collection("users/"+uid+"/campaigns").doc().id;
   batch.create(db.doc("users/"+uid+"/campaigns/"+campaignId),{
    name:"Founder selected: "+clean(body.subject,85),type:"marketing_campaign",channel:"email",
    audience:"Selected consented prospects",status:"draft",targetedProspects:true,
    recipientIds:eligibleIds,recipientCount:eligibleIds.length,
    subject:clean(body.subject,140),message:raw+"\\n\\nFUGTH Chat LLC\\n"+address,
    updatedAt:new Date().toISOString(),createdAt:new Date().toISOString(),
    source:"founder_email_outreach",createdBy:uid
   });
  }
  if(report.synced)await batch.commit();
  return respond({...report,sent:0,campaignId,
   note:creating?"Created a targeted DRAFT for "+eligibleIds.length+" consented addresses. It sends NOTHING until you explicitly approve it under Marketing with your connected Gmail account.":"Eligible contacts copied into Marketing CRM. Nothing was sent."});
 }catch(e){console.warn("Verified email prospect sync failure",{code:e?.code||"db"});return respond({error:"Could not safely sync selected contacts to Marketing."},503)}
}
