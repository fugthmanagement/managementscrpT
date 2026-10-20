import {randomUUID} from "crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../../lib/server/auth";
import {buildStarterSite,siteFields,detectIndustry,getTheme,SITE_THEMES,cleanText} from "../../../../../lib/site-presets";
import {siteFactsFromProfile} from "../../../../../lib/business-profile";
import {gatewayChat,loadAiPolicy} from "../../../../../lib/server/meplifeos";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=45;

const tasks=["plan","headline","description","validate"];
const permittedTemplates=new Set(SITE_THEMES.map(t=>t.id));
const json=(v,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
const validUid=uid=>/^[A-Za-z0-9_-]{8,128}$/.test(uid||"");
const bounded=(x,n)=>cleanText(x,n);
const creds=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
async function access(req,uid){
 const user=await authenticatedUser(req);
 if(!user?.uid)return {error:json({error:"Sign in before using AI Site Builder."},401)};
 if(!validUid(uid))return {error:json({error:"Invalid account."},400)};
 if(user.uid!==uid&&!isFounder(user))return {error:json({error:"This website belongs to another account."},403)};
 if(!creds())return {error:json({error:"Firebase server credentials are required."},503)};
 const db=firebaseAdmin().firestore();
 const [p,d,l]=await Promise.all([db.doc("users/"+uid).get(),db.doc("siteDrafts/"+uid).get(),db.doc("publicSites/"+uid).get()]);
 if(!p.exists&&!isFounder(user))return {error:json({error:"Business profile not found."},404)};
 const profile=p.data()||{};
 const hosted=profile.billingActive===true&&["website","starter","growth","elite"].includes(profile.planTier);
 if(!isFounder(user)&&!(hosted||profile.websitePurchased===true))
  return {error:json({error:"You can preview Site Maker, but saving an AI-built draft requires a website package."},403)};
 return {user,db,profile,current:d.exists?d.data():l.exists?l.data():null};
}
function factsFrom(profile,base){
 const f=siteFactsFromProfile(profile);
 return {
  name:bounded(profile.businessName||base.name,80),
  industry:detectIndustry(profile.businessType||f.industry||base.industry),
  services:Array.isArray(f.services)&&f.services.length?f.services.slice(0,6).map(x=>bounded(x,80)):Array.isArray(base.services)?base.services.slice(0,6):[],
  about:bounded(f.about||profile.businessDescription||base.aboutDetail,700),
  phone:bounded(profile.phone||base.phone,32),
  email:bounded(profile.contactEmail||profile.notificationEmail||base.contactEmail,120),
  area:bounded(profile.serviceArea||base.serviceArea,100),
  hours:bounded(base.businessHours||profile.businessHours||"",100)
 };
}
function reference(info,goal){
 return ["Verified business name: "+info.name,"Industry: "+info.industry,
  "Known services: "+info.services.join("; "),"Verified description: "+info.about,
  "Service area: "+info.area,"Operating hours: "+info.hours,
  "Requested visual direction: "+goal,
  "Only use known information. No invented ratings, awards, years, prices, guarantees or phone numbers."].join("\n").slice(0,2500);
}
function deterministicTemplate(goal,info,site){
 const g=goal.toLowerCase();
 if(/wedding|bridal|photography|editorial|portfolio/.test(g))return "project-showcase";
 if(/luxury|premium|elegant|signature|minimalist/.test(g))return "signature";
 if(/bold|bright|energetic|high contrast/.test(g))return "local-bold";
 if(/appointment|booking|clinic|patient/.test(g))return "appointment";
 if(/restaurant|food|menu|cafe/.test(g))return "storefront";
 if(/contractor|trade|technical|roof|electric/.test(g))return "field-pro";
 return permittedTemplates.has(site.template)?site.template:buildStarterSite("preview_job",info.name,info.industry).template;
}
function avoidHallucination(text,info,type){
 const value=bounded(text.replace(/^\s*(?:headline|description|copy)\s*:\s*/i,""),type==="headline"?125:340);
 if(!value||value.length<(type==="headline"?8:22)||/[{}<>[\]#]/.test(value)||/\b(?:award.win|five.star|5.star|certified|licensed|guaranteed|100%|best in|number one|#1|leading|years of experience|24\/7|free estimates|same.day|no.1)\b/i.test(value))
  return null;
 if(/\d/.test(value)&&!/\d/.test(info.about||"")&&!/\d/.test(info.services.join(" ")))return null;
 if(/https?:|\.com\b|@/.test(value))return null;
 return value;
}
function draftFromExisting(uid,profile,current){
 const base=current||buildStarterSite(uid,profile.businessName||"Your business",profile.businessType||"general",profile);
 // IMPORTANT: an AI build never starts from an auto-publish action.
 const safe=siteFields(base);
 return {...safe,ownerId:uid,visibility:"preview",aiAgentMode:"facts-only",aiAgentModel:"0.5b"};
}
async function runStep(job){
 const step=tasks[job.stepIndex];
 const info=job.facts,ctx=reference(info,job.goal);
 let output={source:"validated_default",summary:"Fallback used to avoid unverified business claims."};
 let draft={...job.draft};
 const policy=await loadAiPolicy();
 if(step==="plan"){
  let template=deterministicTemplate(job.goal,info,draft),suggestion="";
  if(policy.enabled&&policy.websiteEnabled){
   try{
    const model=await gatewayChat({task:"site_plan",businessName:info.name,
     message:"Choose ONE whitelisted site template for the user's visual goal. Output JSON with only template. Goal: "+job.goal,
     context:ctx,modelName:job.model||policy.websiteModel,maxTokens:75,temperature:0,timeoutMs:15000});
    suggestion=model.answer;const jsonMatch=suggestion.match(/\{[\s\S]*?\}/);
    const candidate=jsonMatch?JSON.parse(jsonMatch[0]):null;
    if(candidate&&permittedTemplates.has(candidate.template)){
     template=candidate.template;output.source="gguf";output.summary="Model suggested an allowed FUGTH layout.";
    }
   }catch{/* bounded, deterministic fallback */}
  }
  const theme=getTheme(template);
  draft={...draft,template:theme.id,theme:theme.id,...theme.palette};
  output.template=theme.id;
 }else if(step==="headline"||step==="description"){
  const instruction=step==="headline"
   ?"Write a polished 6 to 12 word website hero headline, with no awards, statistics, promotions or unverified promises."
   :"Write one or two short website hero sentences, friendly and professional, using only confirmed business services and details.";
  if(policy.enabled&&policy.websiteEnabled){
   try{
    const model=await gatewayChat({task:"site_copy",businessName:info.name,
     message:instruction+" Visual goal: "+job.goal,
     context:ctx,modelName:job.model||policy.websiteModel,maxTokens:step==="headline"?65:120,
     temperature:0.08,timeoutMs:16500});
    const valid=avoidHallucination(model.answer,info,step);
    if(valid){draft[step]=valid;output={source:"gguf",summary:"AI wording accepted after safety checks.",field:step,value:valid};}
   }catch{/* fall back to existing safe copy */}
  }
  if(output.source!=="gguf"){
   const starter=siteFields(buildStarterSite(job.uid,info.name,info.industry));
   draft[step]=step==="headline"?starter.headline:(info.about||starter.description);
   output={source:"verified_fallback",summary:"Used deterministic FUGTH template copy, not an unverified AI claim.",field:step,value:draft[step]};
  }
 }else if(step==="validate"){
  // Validation is deterministic and always last. Never ask a model to certify itself.
  const validated=siteFields({...draft,name:info.name,industry:info.industry,
   services:info.services.length?info.services:draft.services,
   phone:info.phone,contactEmail:info.email,serviceArea:info.area,businessHours:info.hours,
   showChatbot:true,aiAgentMode:"facts-only",aiAgentModel:"0.5b"});
  draft={...validated,ownerId:job.uid,visibility:"preview"};
  output={source:"fugth_validator",summary:"Approved template, field lengths and verified contacts checked. Draft ready for human review."};
 }
 return {draft,output,step};
}
export async function GET(req,{params}){
 const a=await access(req,params.uid);if(a.error)return a.error;
 const snap=await a.db.doc("siteBuildJobs/"+params.uid).get();
 return json({job:snap.exists?snap.data():null,siteDraftAvailable:Boolean(a.current)});
}
export async function POST(req,{params}){
 const uid=params.uid,a=await access(req,uid);if(a.error)return a.error;
 let body;try{body=await req.json();}catch{return json({error:"Invalid request."},400);}
 const action=String(body?.action||"");
 const ref=a.db.doc("siteBuildJobs/"+uid);
 if(action==="start"){
  const goal=bounded(body?.goal,450);
  if(goal.length<10)return json({error:"Describe the website you want in at least ten characters."},400);
  const current=draftFromExisting(uid,a.profile,a.current);
  const facts=factsFrom(a.profile,current);
  const model=["0.5b","1.5b"].includes(body.model)?body.model:"0.5b";
  const now=new Date().toISOString();
  const job={id:randomUUID(),uid,goal,facts,model,stepIndex:0,status:"planning",
   steps:tasks,draft:current,events:[],leaseUntil:0,createdAt:now,updatedAt:now,saved:false};
  await ref.set(job);
  return json({job});
 }
 if(action==="step"){
  let claimed=null;
  try{
   claimed=await a.db.runTransaction(async tx=>{
    const snap=await tx.get(ref),j=snap.data();
    if(!j)return {error:"Start a website-building goal first.",status:404};
    if(j.saved)return {error:"This draft has been saved. Start a new goal to revise it.",status:409};
    if(j.stepIndex>=tasks.length)return {error:"All steps are complete. Review and save the draft.",status:409};
    if(j.leaseUntil>Date.now())return {error:"A previous step is still running. Refresh to check progress.",status:409};
    tx.set(ref,{leaseUntil:Date.now()+42000,status:"running",updatedAt:new Date().toISOString()},{merge:true});
    return j;
   });
   if(claimed.error)return json({error:claimed.error},claimed.status);
   const {draft,output,step}=await runStep(claimed);
   // Confirm the same job and step still owns the work. Another goal may have replaced it.
   const updated=await a.db.runTransaction(async tx=>{
    const snap=await tx.get(ref),j=snap.data();
    if(j?.id!==claimed.id||j.stepIndex!==claimed.stepIndex)return null;
    const next={...j,draft,stepIndex:j.stepIndex+1,events:[...(j.events||[]),{step,summary:output.summary,source:output.source,at:new Date().toISOString()}],
     leaseUntil:0,status:j.stepIndex+1>=tasks.length?"ready":"planning",updatedAt:new Date().toISOString()};
    tx.set(ref,next);return next;
   });
   if(!updated)return json({error:"Another website-building goal replaced this step."},409);
   return json({job:updated,step:output});
  }catch(e){
   // Avoid wedging progress after a temporary Firestore/model failure.
   await ref.set({leaseUntil:0,status:"planning",updatedAt:new Date().toISOString()},{merge:true}).catch(()=>{});
   return json({error:"Could not complete this step. Retry it; the previous draft is intact."},503);
  }
 }
 if(action==="save"){
  const snap=await ref.get(),job=snap.data();
  if(!job||job.uid!==uid||job.status!=="ready"||job.stepIndex!==tasks.length)
   return json({error:"Complete and review all planning steps before saving."},409);
  const draftRef=a.db.doc("siteDrafts/"+uid);
  const old=await draftRef.get(),rev=(Number(old.data()?.revision)||0)+1;
  const value={...siteFields(job.draft),ownerId:uid,visibility:"preview",version:3,
   createdAt:old.data()?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),
   revision:rev,savedBy:a.user.uid,aiBuildJobId:job.id};
  const batch=a.db.batch();
  batch.set(draftRef,value);
  batch.set(ref,{saved:true,status:"saved",savedAt:new Date().toISOString()},{merge:true});
  batch.create(a.db.collection("siteChanges").doc(),{ownerId:uid,actorUid:a.user.uid,actorRole:isFounder(a.user)?"founder":"owner",
   action:"ai_build_save_draft",at:new Date().toISOString(),revision:rev,jobId:job.id});
  await batch.commit();
  return json({saved:true,draft:value,message:"Private website draft saved. Nothing was published."});
 }
 return json({error:"Use start, step or save."},400);
}
