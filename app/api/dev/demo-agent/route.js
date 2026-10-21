import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {siteFields} from "../../../../lib/site-presets";
import {suggestPublicSiteImages} from "../../../../lib/server/gguf-site-audit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=45;
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const check=x=>/^[a-f0-9]{24}$/.test(String(x||""));
const name=x=>String(x||"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,180);
async function context(req,id){
 const actor=await authenticatedUser(req);
 if(!isFounder(actor))throw Object.assign(Error("Founder authorization required."),{status:403});
 if(!check(id))throw Object.assign(Error("Invalid preview."),{status:400});
 const db=firebaseAdmin().firestore(),ref=db.doc("prospectDemos/"+id),snap=await ref.get();
 const demo=snap.data();
 if(!snap.exists||demo.founderId!==actor.uid)throw Object.assign(Error("Preview does not belong to your founder account."),{status:404});
 let prospect=null;
 if(demo.prospectId){
  const p=await db.doc("users/"+actor.uid+"/campaigns/"+demo.prospectId).get();
  if(p.exists)prospect=p.data();
 }
 return {actor,db,ref,demo,prospect};
}
export async function POST(req){
 let body;try{const raw=await req.text();if(raw.length>3500)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid settings request."},400)}
 let ctx;try{ctx=await context(req,body.demoId)}
 catch(e){return out({error:e.message},e.status||503)}
 const {actor,db,ref,demo,prospect}=ctx;
 if(body.action==="suggest_images"){
  if(!prospect?.website)return out({error:"This prospect doesn't have a saved source website. Add one before importing its imagery."},409);
  try{return out(await suggestPublicSiteImages(prospect.website))}
  catch(e){return out({error:String(e.message||"Could not inspect the existing website.").slice(0,150)},422)}
 }
 if(body.action==="find_places"){
  if(!process.env.GOOGLE_MAPS_API_KEY)return out({error:"Configure GOOGLE_MAPS_API_KEY and Places API (New) billing to retrieve business-review suggestions."},503);
  if(!prospect)return out({error:"Link the demo to a saved business prospect before identifying its Google reviews."},409);
  try{
   const res=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",cache:"no-store",signal:AbortSignal.timeout(11000),
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":process.env.GOOGLE_MAPS_API_KEY,
     "X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount"},
    body:JSON.stringify({textQuery:(prospect.businessName||demo.name)+" "+(prospect.city||""),
     maxResultCount:5,languageCode:"en"})
   });
   if(!res.ok)throw Error("Places API returned "+res.status+". Enable Places API (New) and billing.");
   const j=await res.json();
   return out({places:(j.places||[]).slice(0,5).map(p=>({id:p.id,
    name:name(p.displayName?.text),address:name(p.formattedAddress),rating:p.rating||null,
    reviewCount:p.userRatingCount||0})),note:"Match the actual business name and address before assigning a Place ID. Data is retrieved live and not cached."});
  }catch(e){return out({error:String(e.message||"Places search failed.").slice(0,180)},503)}
 }
 if(body.action!=="update")return out({error:"Unknown preview agent action."},400);
 const model=String(body.model||"auto");
 if(!["auto","0.5b","1.5b"].includes(model))return out({error:"Unknown model selection."},400);
 const facts=Array.isArray(body.facts)?body.facts:[];
 if(facts.length>10||facts.some(x=>typeof x!=="string"||x.length>230))
  return out({error:"Keep reference facts to 10 rows of 220 characters or less."},400);
 const placeId=name(body.googlePlaceId);
 if(placeId&&!/^[A-Za-z0-9_-]{10,180}$/.test(placeId))return out({error:"Invalid Google Place ID."},400);
 const useHero=body.useHero===true,heroUrl=String(body.heroUrl||"");
 let parsedHero=null;
 if(useHero){
  if(!body.imageRightsConfirmed)return out({error:"Confirm the right to use this photo in the proposed website before applying it."},400);
  try{
   const src=new URL(String(prospect?.website||"")),url=new URL(heroUrl);
   const root=src.hostname.replace(/^www\./,"");
   if(url.protocol!=="https:"||url.username||url.password||url.port||url.href.length>450||
      !(url.hostname.replace(/^www\./,"")===root||url.hostname.endsWith("."+root)))throw Error();
   parsedHero=url.toString();
  }catch{return out({error:"Choose an image suggestion hosted on the linked business website."},400)}
 }
 try{
  const now=new Date().toISOString();
  await db.runTransaction(async tx=>{
   const old=await tx.get(ref),data=old.data();
   if(!old.exists||data.founderId!==actor.uid||data.revoked)throw Error("Preview is no longer editable.");
   const patch={
    aiAgentMode:body.aiEnabled===false?"facts-only":"local",aiAgentModel:model,
    agentFacts:facts.map(x=>name(x).slice(0,220)).filter(Boolean),
    googlePlaceId:placeId,showGoogleReviews:body.showGoogleReviews===true&&Boolean(placeId),
    googleReviewsDock:["hero","after_services","before_contact","footer"].includes(body.googleReviewsDock)?body.googleReviewsDock:"after_services",
    googleReviewsStyle:["compact","cards","spotlight"].includes(body.googleReviewsStyle)?body.googleReviewsStyle:"cards",
    sourceHeroPhotoApproved:useHero,sourceHeroPhotoUrl:parsedHero||"",
    sourceHeroSourceUrl:useHero?String(prospect?.website||"").slice(0,450):"",
    sourcePhotoCredit:useHero?name(prospect?.businessName||demo.name).slice(0,110):""
   };
   tx.set(ref,{site:{...siteFields({...data.site,...patch}),ownerId:data.site?.ownerId||null},
    updatedAt:now,agentConfiguredBy:actor.uid},{merge:true});
  });
  return out({saved:true,model,mode:body.aiEnabled===false?"facts-only":"local",
   note:"These settings were saved to the Firestore demo. They affect only this preview; the original business website was not modified."});
 }catch{return out({error:"Could not save this preview configuration."},503)}
}
