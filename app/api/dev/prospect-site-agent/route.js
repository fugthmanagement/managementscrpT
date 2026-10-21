import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {gatewayChat} from "../../../../lib/server/meplifeos-gateway";
import {deterministicSitePlan,validateSiteActions,applySiteActions,toolCatalog} from "../../../../lib/site-edit-toolkit";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=180;
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const good=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const demoId=x=>/^[a-f0-9]{24}$/.test(String(x||""));
const limiter=new Map();
async function authorized(req){const u=await authenticatedUser(req);return u?.uid&&isFounder(u)?u:null}
function throttle(uid){
 const now=Date.now(),v=limiter.get(uid);
 if(limiter.size>1000)for(const [k,x] of limiter)if(x.until<now)limiter.delete(k);
 if(v&&v.until>now&&v.count>=8)return false;
 limiter.set(uid,{until:now+600000,count:v&&v.until>now?v.count+1:1});return true;
}
async function modelPlanner({request,site,model}){
 const fields=toolCatalog().map(t=>t.field+" ("+t.type+")").join(", ");
 const system="You are FUGTH's WEBSITE DESIGN TOOL PLANNER, not a coder. Your ONLY output is one JSON object with an actions array: {\"actions\":[{\"field\":\"headerColor\",\"value\":\"#7c3aed\"}]}. Maximum six actions. Allowed fields: "+fields+
  ". Existing template names: service-pro,care-pro,studio-pro,field-pro,signature,local-bold,project-showcase,appointment,storefront,modern-classic."+
  " Match user design instructions. Colors must be 6-digit hex. Booleans for show fields. Do NOT write code, JSX, HTML, CSS, URLs, prices, reviews, credentials, policies, appointments, extra business services, or facts."+
  " Never claim design changes were applied. Respond with only JSON and no explanation.";
 const context="Business: "+String(site.name||"Business").slice(0,80)+
  "\nIndustry: "+site.industry+"\nCurrent template: "+site.template+
  "\nCurrent colors: "+JSON.stringify({headerColor:site.headerColor,mainColor:site.mainColor,
   sectionColor:site.sectionColor,accentColor:site.accentColor})+"\nPLANNING RULES: "+system;
 if(process.env.FUGTH_SITE_AGENT_PROVIDER==="openai"&&process.env.OPENAI_API_KEY){
  const r=await fetch("https://api.openai.com/v1/chat/completions",{
   method:"POST",cache:"no-store",signal:AbortSignal.timeout(28000),
   headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({model:process.env.FUGTH_SITE_AGENT_OPENAI_MODEL||"gpt-4.1-mini",
    temperature:0,max_tokens:360,response_format:{type:"json_object"},
    messages:[{role:"system",content:system},{role:"user",content:context+"\nUSER REQUEST: "+request}]})
  });
  if(!r.ok)throw Error("The optional OpenAI planner is unavailable.");
  const j=await r.json();
  return {text:j.choices?.[0]?.message?.content||"",provider:"openai"};
 }
 const response=await gatewayChat({businessName:"FUGTH Site Maker",task:"site_copy",
  model:model==="0.5b"?"0.5b":"1.5b",maxTokens:180,timeoutMs:95000,
  context:context.slice(0,3200),
  message:"Convert this request into only the allowed JSON website design tool actions: "+request});
 return {text:response.answer,provider:"gguf"};
}
function parsePlan(value){
 try{
  const source=String(value||"").replace(/^\s*\x60{3}(?:json)?|\x60{3}\s*$/g,"").trim();
  const fragment=source.slice(source.indexOf("{"),source.lastIndexOf("}")+1);
  const json=JSON.parse(fragment);
  return Array.isArray(json.actions)?json.actions:[];
 }catch{return []}
}
export async function POST(req){
 const founder=await authorized(req);if(!founder)return out({error:"Founder authentication required."},403);
 let body;
 try{const raw=await req.text();if(raw.length>2300)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid Site Maker agent instruction."},400)}
 const action=body.action,prospectId=String(body.prospectId||"");
 if(!good(prospectId)||!["plan","apply"].includes(action))return out({error:"Select one of your saved business prospects."},400);
 if(!throttle(founder.uid))return out({error:"Site assistant request limit reached. Try again later."},429);
 const db=firebaseAdmin().firestore(),prospectRef=db.doc("users/"+founder.uid+"/campaigns/"+prospectId);
 const p=await prospectRef.get().catch(()=>null);
 if(!p?.exists||p.data()?.type!=="cold_call_prospect")return out({error:"This business isn't assigned to your calling list."},404);
 const id=String(p.data().assignedPreviewId||"");
 if(!demoId(id))return out({error:"Open this business in Site Maker to create its saved preview first."},409);
 const ref=db.doc("prospectDemos/"+id),doc=await ref.get().catch(()=>null);
 if(!doc?.exists||doc.data()?.founderId!==founder.uid||doc.data()?.prospectId!==prospectId)
  return out({error:"Prospect and saved preview do not match."},403);
 const site=doc.data().site||{},revision=Number(doc.data().revision||1);
 const plans=db.collection("users/"+founder.uid+"/siteAgentPlans");
 if(action==="plan"){
  const instruction=String(body.request||"").trim().slice(0,800);
  if(instruction.length<5)return out({error:"Describe what to change in the website."},400);
  let actions=deterministicSitePlan(instruction,site),provider="site_tools";
  if(!actions.length){
   try{
    const proposal=await modelPlanner({request:instruction,site,model:body.model});
    provider=proposal.provider;
    // Small model suggestions must never invent the business's substantive copy.
    // Founder can explicitly provide exact headline/button wording through deterministic tools.
    actions=validateSiteActions(parsePlan(proposal.text),site)
     .filter(a=>!["headline","description","eyebrow","ctaLabel"].includes(a.field));
   }catch{return out({error:"GGUF couldn't form a safe plan right now. Try 'make the buttons purple' or 'use a bold layout'.",reason:"planner_unavailable"},503)}
  }
  if(!actions.length)return out({error:"No safe Site Maker changes were identified. Try a specific design instruction. I won't invent facts or write code."},422);
  const planRef=plans.doc(),expiresAt=new Date(Date.now()+20*60000).toISOString();
  await planRef.create({founderUid:founder.uid,prospectId,demoId:id,request:instruction,
   actions,provider,baseRevision:revision,status:"proposed",createdAt:new Date().toISOString(),expiresAt});
  return out({proposed:true,planId:planRef.id,actions,provider,expiresAt,baseRevision:revision,
   message:"Review these Site Maker control changes, then choose Apply. No code was generated or site published."});
 }
 const planId=String(body.planId||"");
 if(!good(planId))return out({error:"Choose a valid plan to approve."},400);
 try{
  const planRef=plans.doc(planId);let nextSite=null,nextRevision=null;
  await db.runTransaction(async tx=>{
   const [planSnap,siteSnap,latestProspect]=await Promise.all([tx.get(planRef),tx.get(ref),tx.get(prospectRef)]);
   const plan=planSnap.data(),entry=siteSnap.data();
   if(!planSnap.exists||plan.founderUid!==founder.uid||plan.prospectId!==prospectId||plan.demoId!==id||
      plan.status!=="proposed"||Date.parse(plan.expiresAt)<Date.now())throw Error("Plan has expired or was already used.");
   if(!siteSnap.exists||entry.founderId!==founder.uid||
      latestProspect.data()?.assignedPreviewId!==id)throw Error("Preview assignment has changed.");
   if(Number(plan.baseRevision)!==Number(entry.revision||1))throw Error("Website was edited since this plan. Generate a new proposal.");
   const verified=validateSiteActions(plan.actions,entry.site);
   if(!verified.length)throw Error("No valid changes remain.");
   nextSite={...applySiteActions(entry.site,verified),ownerId:founder.uid,previewMode:true,name:entry.site.name};
   nextRevision=Number(entry.revision||1)+1;const now=new Date().toISOString();
   tx.set(ref,{site:nextSite,revision:nextRevision,updatedAt:now},{merge:true});
   tx.set(planRef,{status:"applied",appliedAt:now,appliedRevision:nextRevision},{merge:true});
   tx.create(db.collection("siteChanges").doc(),{ownerId:founder.uid,actorUid:founder.uid,
    prospectId,demoId:id,action:"site_agent_tools_applied",at:now,fields:verified.map(x=>x.field),revision:nextRevision});
  });
  return out({applied:true,site:nextSite,revision:nextRevision,
   message:"Applied reviewed edits using Site Maker controls. Saved to this prospect's same preview link; nothing was published."});
 }catch(e){return out({error:e.message||"Could not apply approved website edits."},409)}
}
