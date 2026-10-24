import {stableProspectPreviewId} from "../../../../lib/server/prospect-preview-ids";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {buildStarterSite,detectIndustry,getIndustryThemes,siteFields} from "../../../../lib/site-presets";
import {demoTemplate} from "../../../../lib/demo-template";
import {matchProspectPhotos} from "../../../../lib/prospect-photo-matching";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const valid=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const demoId=x=>/^[a-f0-9]{24}$/.test(String(x||""));
const clean=(v,n=180)=>String(v??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const urlFor=id=>"https://www.fugthmanagement.space/demo/site/"+id;
const stable=stableProspectPreviewId;
async function founder(req){const u=await authenticatedUser(req);return u?.uid&&isFounder(u)?u:null}
function initialSite(p,u){
 const name=clean(p.businessName,80),type=clean([p.industry,p.businessType,p.primaryType,p.category].filter(Boolean).join(" "),160);
 const industry=detectIndustry(type||name);
 const trade=/electric/i.test(type)?"electrician":/plumb/i.test(type)?"plumber":
  /mechanic|auto repair/i.test(type)?"mechanic":null;
 const options={phone:clean(p.phone,32),contactEmail:clean(p.email,120),serviceArea:clean(p.city||p.serviceArea,90)};
 const source=trade?demoTemplate(trade,name,options):buildStarterSite(u,name,industry,options);
 const common=siteFields({...source,industry:trade?source.industry:industry,name,
  aiAgentModel:"auto",showChatbot:true,aiAgentMode:"facts-only",googleMapsUrl:p.googleMapsUrl||"",googlePlaceId:p.googlePlaceId||""});
 return {...common,ownerId:u,previewMode:true};
}
async function getProspect(db,u,id){
 if(!valid(id))throw Object.assign(Error("Select a valid prospect."),{status:400});
 const snap=await db.doc("users/"+u+"/campaigns/"+id).get();
 if(!snap.exists||snap.data()?.type!=="cold_call_prospect")throw Object.assign(Error("Prospect not found in your calling list."),{status:404});
 return snap.data();
}
export async function GET(req){
 const actor=await founder(req);if(!actor)return out({error:"Founder account required."},403);
 const id=new URL(req.url).searchParams.get("prospectId");
 try{
  const db=firebaseAdmin().firestore(),p=await getProspect(db,actor.uid,id);
  const assigned=demoId(p.assignedPreviewId)?p.assignedPreviewId:stable(actor.uid,id);
  let snap=await db.doc("prospectDemos/"+assigned).get();
  if(snap.exists&&(snap.data()?.founderId!==actor.uid||snap.data()?.prospectId!==id))snap=null;
  if(!snap?.exists)return out({saved:false,prospect:{id,businessName:p.businessName,industry:p.industry,website:p.website||"",phone:p.phone||"",email:p.email||""},
   suggestedSite:initialSite(p,actor.uid),previewId:stable(actor.uid,id),
   next:"ensure"});
  const demo=snap.data();
  return out({saved:true,id:assigned,site:demo.site,revision:demo.revision||1,
   url:urlFor(assigned),prospect:{id,businessName:p.businessName,industry:p.industry,website:p.website||"",phone:p.phone||"",email:p.email||""},
   expiresAt:demo.expiresAt||null});
 }catch(e){
  const issue=firestoreDemoFailure(e);
  console.error("FUGTH_PROSPECT_SITE_FIRESTORE",{code:issue.code});
  return out({error:e.status?e.message:issue.error,code:issue.code,hint:issue.hint},e.status||503);
 }
}
export async function POST(req){
 const actor=await founder(req);if(!actor)return out({error:"Founder account required."},403);
 let body;
 try{const raw=await req.text();if(raw.length>48000)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid website changes."},400)}
 const prospectId=String(body.prospectId||""),action=body.action;
 if(!valid(prospectId)||!["ensure","save"].includes(action))return out({error:"Choose a saved prospect and valid action."},400);
 if(action==="save"&&(typeof body.site!=="object"||!body.site||Array.isArray(body.site)))
  return out({error:"No valid website design supplied."},400);
 try{
  const db=firebaseAdmin().firestore();
  const prospectRef=db.doc("users/"+actor.uid+"/campaigns/"+prospectId);
  // Image discovery is optional. A blocked Drive tag lookup must NEVER prevent
  // a prospect from getting a basic website. Do it outside the transaction.
  let suggestedMedia=[];
  if(action==="ensure"){
   try{
    const lookup=await prospectRef.get(),p=lookup.data();
    if(lookup.exists&&p?.businessName){
     const photos=await db.collection("users/"+actor.uid+"/siteImages")
      .where("folder","==",String(p.businessName).trim().slice(0,48)).limit(24).get();
     suggestedMedia=photos.docs.map(doc=>({id:doc.id,...doc.data()}));
    }
   }catch(e){console.warn("FUGTH_OPTIONAL_MEDIA_LOOKUP",{code:String(e?.code||"unavailable")})}
  }
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(prospectRef);
   if(!snap.exists||snap.data()?.type!=="cold_call_prospect")throw Object.assign(Error("Prospect not found."),{status:404});
   const p=snap.data(),idCandidate=demoId(p.assignedPreviewId)?p.assignedPreviewId:stable(actor.uid,prospectId);
   let ref=db.doc("prospectDemos/"+idCandidate),prior=await tx.get(ref);
   if(prior.exists&&(prior.data()?.founderId!==actor.uid||prior.data()?.prospectId!==prospectId)){
    ref=db.doc("prospectDemos/"+stable(actor.uid,prospectId));prior=await tx.get(ref);
   }
   if(prior.exists&&(prior.data()?.founderId!==actor.uid||prior.data()?.prospectId!==prospectId))
    throw Object.assign(Error("This preview ID is owned by a different business."),{status:409});
   const id=ref.id,now=new Date().toISOString(),current=prior.data(),starter=initialSite(p,actor.uid);
   // If a founder organized licensed images in THIS prospect's Drive folder,
   // fill their preview media slots when creating the site once, never overwrite later edits.
   if(!prior.exists&&action==="ensure"){
    const matched=matchProspectPhotos(p,suggestedMedia);
    if(matched.heroImageId){
     starter.heroImageId=matched.heroImageId;
     starter.galleryImageIds=matched.galleryImageIds.length?matched.galleryImageIds:starter.galleryImageIds;
    }
   }
   if(action==="save"&&!prior.exists)throw Object.assign(Error("Open the site before saving changes."),{status:409});
   if(action==="save"&&Number(body.revision)!==Number(current?.revision||1))
    throw Object.assign(Error("Another edit was saved. Refresh this business preview before overwriting it."),{status:409});
   const next=action==="save"?siteFields({...current.site,...body.site}):current?.site||starter;
   // This stays an independent FUGTH sample until the business has claimed/approved it.
   const site={...next,name:clean(p.businessName,80),ownerId:actor.uid,
    previewMode:true,aiAgentModel:next.aiAgentModel||"auto"};
   const revision=action==="save"?Number(current?.revision||1)+1:Number(current?.revision||1);
   const record={
    founderId:actor.uid,prospectId,kind:current?.kind||"custom",name:site.name,
    assignedUid:current?.assignedUid||null,
    phone:clean(p.phone,32),contactEmail:clean(p.email,120),
    site,revision,updatedAt:now,
    ...(prior.exists?{}:{createdAt:now,expiresAt:null,revoked:false}),
   };
   if(action==="ensure"&&prior.exists&&(current?.revoked===true||
      current?.expiresAt&&Date.parse(current.expiresAt)<=Date.now())){
    // Founder reopening a previously expired/revoked link explicitly restores it.
    record.revoked=false;record.expiresAt=null;
   }
   tx.set(ref,record,{merge:true});
   tx.set(prospectRef,{websitePreviewUrl:urlFor(id),assignedPreviewId:id,
    assignedPreviewName:site.name,assignedPreviewExpiresAt:"",
    updatedAt:now},{merge:true});
   return {id,url:urlFor(id),site,revision,saved:true,action,reused:prior.exists,
     prospect:{id:prospectId,businessName:p.businessName,industry:p.industry,website:p.website||"",phone:p.phone||"",email:p.email||""}};
  });
  return out(result,action==="ensure"?200:200);
 }catch(e){
  const issue=firestoreDemoFailure(e);
  console.error("FUGTH_PROSPECT_SITE_FIRESTORE",{code:issue.code});
  return out({error:e.status?e.message:issue.error,code:issue.code,hint:issue.hint},e.status||503);
 }
}
