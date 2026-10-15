import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {accessGoogleCalendar,integrationConfigured,integrationDoc} from "../../../../lib/server/google-calendar";
import {EMAIL_BATCH_SIZE,EMAIL_DAILY_LIMIT,mimeMessage,optoutUrl} from "../../../../lib/server/email-marketing";
import {hasAccess} from "../../../../lib/server/account-entitlements";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(obj,status=200)=>NextResponse.json(obj,{status,headers:{"Cache-Control":"no-store"}});
const isAllowed=(user,profile,grant)=>isFounder(user)||hasAccess({...profile,founderAccess:grant},"growth")||
 (profile?.billingActive===true&&Array.isArray(profile.billingAddons)&&profile.billingAddons.includes("email"));
const validEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||""));
const today=()=>new Date().toISOString().slice(0,10).replaceAll("-","");
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return response({error:"Sign in to manage email delivery."},401);
 if(!integrationConfigured())return response({configured:false,connected:false,reason:"Google OAuth or Firebase server integration is not configured."});
 try{
  const db=firebaseAdmin().firestore();
  const [google,profile,grant]=await Promise.all([integrationDoc(user.uid).get(),db.doc("users/"+user.uid).get(),db.doc("founderAccountGrants/"+user.uid).get()]);
  const granted=google.exists&&String(google.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/gmail.send");
  return response({configured:true,connected:granted,allowed:isAllowed(user,profile.data(),grant.data()),batchLimit:EMAIL_BATCH_SIZE,dailyLimit:EMAIL_DAILY_LIMIT,
   reason:!granted?"Connect or reconnect your Google account to authorize Gmail sending.":null});
 }catch{return response({configured:false,connected:false,reason:"Could not read the Google delivery connection."},503);}
}
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return response({error:"Sign in to send your campaign."},401);
 if(!integrationConfigured())return response({error:"Google email delivery is not configured. Connect your Google account first."},503);
 let body;try{body=await req.json();}catch{return response({error:"Invalid request."},400);}
 if(!/^[a-zA-Z0-9]{10,40}$/.test(body?.campaignId||""))return response({error:"Select a saved campaign."},400);
 const db=firebaseAdmin().firestore(),uid=user.uid;
 const [profileDoc,campaignDoc,grantDoc]=await Promise.all([
  db.doc("users/"+uid).get(),db.doc("users/"+uid+"/campaigns/"+body.campaignId).get(),db.doc("founderAccountGrants/"+uid).get()
 ]);
 if(!isAllowed(user,profileDoc.data(),grantDoc.data()))return response({error:"Email campaigns need the Mid plan, High plan or paid Email add-on."},403);
 if(!campaignDoc.exists||campaignDoc.data()?.type!=="marketing_campaign"||campaignDoc.data()?.channel!=="email")
  return response({error:"Select an email campaign draft from your workspace."},400);
 const campaign=campaignDoc.data();
 if(!campaign.subject||!campaign.message)return response({error:"The campaign needs a subject and message."},400);
 if(!profileDoc.data()?.businessName)return response({error:"Add your business name in Settings before sending."},400);
 let googleToken,from;
 try{
  // This OAuth scope is granted explicitly through the user's Google consent screen.
  googleToken=await accessGoogleCalendar(uid,"gmail.send");
  const who=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{
   headers:{Authorization:"Bearer "+googleToken},cache:"no-store",signal:AbortSignal.timeout(6500)
  });
  if(!who.ok)throw Error("Gmail connection needs to be refreshed.");
  from=(await who.json()).email;
  if(!validEmail(from))throw Error("A verified Google email address was not returned. Please reconnect your account.");
 }catch(e){return response({error:e.message||"Reconnect your Google account to send campaigns."},503);}
 let leads;
 try{
  leads=(await db.collection("users").doc(uid).collection("leads").where("marketingOptIn","==",true).limit(250).get()).docs;
 }catch{return response({error:"Could not load your opted-in recipient list."},503);}
 const eligible=leads.filter(d=>!d.data().unsubscribed&&validEmail(d.data().email));
 if(!eligible.length)return response({error:"No opted-in email contacts. Add contacts with marketing permission first."},400);
 let sent=0,skipped=0,failed=0;
 for(const item of eligible){
  if(sent+failed>=EMAIL_BATCH_SIZE)break;
  const recipient=item.data();
  const sentRef=db.doc("users/"+uid+"/campaignSends/"+body.campaignId+"_"+item.id);
  const quotaRef=db.doc("marketingUsage/"+uid+"_"+today());
  let reserved=false,exhausted=false;
  try{
   await db.runTransaction(async tx=>{
    const [old,quota]=await Promise.all([tx.get(sentRef),tx.get(quotaRef)]);
    if(old.exists)return;
    const count=Number(quota.data()?.count)||0;
    if(count>=EMAIL_DAILY_LIMIT){exhausted=true;return;}
    tx.create(sentRef,{uid,campaignId:body.campaignId,recipientId:item.id,status:"reserved",createdAt:new Date().toISOString()});
    tx.set(quotaRef,{uid,count:count+1,day:today(),updatedAt:new Date().toISOString()},{merge:true});
    reserved=true;
   });
   if(exhausted)break;
   if(!reserved){skipped++;continue;}
   const name=String(recipient.contactName||"").trim().split(/\s+/)[0]||"there";
   const business=String(profileDoc.data().businessName).slice(0,90);
   const subject=String(campaign.subject).slice(0,140);
   const message=String(campaign.message).slice(0,6500)
    .replace(/\{\{first_name\}\}/gi,name).replace(/\{\{business\}\}/gi,business);
   const raw=mimeMessage({to:recipient.email,from,business,subject,text:message,unsubscribe:optoutUrl(uid,item.id)});
   const result=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
    method:"POST",headers:{Authorization:"Bearer "+googleToken,"Content-Type":"application/json"},
    body:JSON.stringify({raw}),cache:"no-store",signal:AbortSignal.timeout(12500)
   });
   const answer=await result.json().catch(()=>({}));
   if(!result.ok)throw Error("Gmail rejected this delivery, HTTP "+result.status+".");
   await sentRef.set({status:"sent",gmailId:answer.id||"",sentAt:new Date().toISOString()},{merge:true});
   sent++;
  }catch(e){
   failed++;
   try{await sentRef.set({status:"failed",lastError:String(e.message||"Delivery failed.").slice(0,160),updatedAt:new Date().toISOString()},{merge:true});}catch{}
   // Stop on provider failure so a bad OAuth token or quota doesn't cause a burst.
   break;
  }
 }
 if(sent){
  await campaignDoc.ref.set({status:"sending",lastSentAt:new Date().toISOString(),
   lastBatchCount:sent,updatedAt:new Date().toISOString()},{merge:true});
 }
 return response({sent,failed,skipped,eligible:eligible.length,batchLimit:EMAIL_BATCH_SIZE,
  notice:failed?"One delivery failed. Check Gmail connection before retrying.":"You can send the next approved batch after reviewing your campaign."});
}
