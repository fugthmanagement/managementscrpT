import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {siteFields} from "../../../../lib/site-presets";
export const runtime="nodejs";export const dynamic="force-dynamic";
const out=(v,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
const id=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const clean=(x,n)=>String(x??"").replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,n);
const allowed=["businessName","ownerName","industry","phone","email","city","website","googleMapsUrl","notes"];
const limits={businessName:80,ownerName:80,industry:85,phone:32,email:130,city:130,website:650,googleMapsUrl:650,notes:900};
function https(value){
 if(!value)return true;
 try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&u.hostname.includes(".")&&u.hostname.length<180}catch{return false}
}
async function access(req){
 const actor=await authenticatedUser(req);
 return actor?.uid&&isFounder(actor)?actor:null;
}
export async function GET(req){
 const actor=await access(req);if(!actor)return out({error:"Founder account required."},403);
 const prospectId=new URL(req.url).searchParams.get("prospectId")||"";
 if(!id(prospectId))return out({error:"Choose a valid prospect."},400);
 try{
  const db=firebaseAdmin().firestore(),ref=db.doc("users/"+actor.uid+"/campaigns/"+prospectId);
  const [snap,events]=await Promise.all([ref.get(),ref.collection("events").orderBy("at","desc").limit(30).get()]);
  if(!snap.exists||snap.data().type!=="cold_call_prospect")return out({error:"Prospect not found."},404);
  const p=snap.data(),profile=Object.fromEntries(allowed.map(k=>[k,String(p[k]||"")]));
  return out({prospect:{id:prospectId,...profile},activity:events.docs.map(d=>({id:d.id,...d.data()}))});
 }catch(e){console.warn("FUGTH_PROSPECT_PROFILE_GET",{code:e.code||"unknown"});return out({error:"Could not load the prospect's data hub."},503)}
}
export async function POST(req){
 const actor=await access(req);if(!actor)return out({error:"Founder account required."},403);
 let body;try{const raw=await req.text();if(raw.length>8000)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid prospect update."},400)}
 const prospectId=String(body.prospectId||"");
 if(!id(prospectId))return out({error:"Select a saved prospect."},400);
 const action=String(body.action||"save");
 if(!["save","note"].includes(action))return out({error:"Unknown profile action."},400);
 let changes={};
 if(action==="save"){
  for(const k of allowed)if(body.profile&&Object.hasOwn(body.profile,k))changes[k]=clean(body.profile[k],limits[k]);
  if(!changes.businessName)return out({error:"Business name is required."},400);
  if(changes.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email))return out({error:"Invalid email."},400);
  if(!https(changes.website)||!https(changes.googleMapsUrl))return out({error:"Website and Google Maps links must be valid HTTPS URLs."},400);
 }
 if(action==="note"&&!clean(body.note,700))return out({error:"Enter a note first."},400);
 try{
  const db=firebaseAdmin().firestore(),ref=db.doc("users/"+actor.uid+"/campaigns/"+prospectId);
  return await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists||snap.data().type!=="cold_call_prospect")return out({error:"Prospect not found."},404);
   const original=snap.data(),now=new Date().toISOString();
   if(action==="note"){
    const event=ref.collection("events").doc();
    tx.create(event,{type:"manual_note",text:clean(body.note,700),at:now,actorUid:actor.uid});
    return out({saved:true,activityId:event.id});
   }
   const changed=Object.keys(changes).filter(k=>String(original[k]??"")!==changes[k]);
   if(!changed.length)return out({saved:true,unchanged:true,prospect:{id:prospectId,...changes}});
   let demoRef=null,demoSnap=null,site=null,revision=null;
   if(/^[a-f0-9]{24}$/.test(String(original.assignedPreviewId||""))){
    demoRef=db.doc("prospectDemos/"+original.assignedPreviewId);
    demoSnap=await tx.get(demoRef);
    if(demoSnap.exists&&demoSnap.data()?.founderId===actor.uid&&demoSnap.data()?.prospectId===prospectId){
     const old=demoSnap.data();
     site=siteFields({...old.site,name:changes.businessName,
      phone:changes.phone,contactEmail:changes.email,
      serviceArea:changes.city,googleMapsUrl:changes.googleMapsUrl});
     revision=Number(old.revision||1)+1;
    }
   }
   tx.update(ref,{...changes,updatedAt:now});
   if(site)tx.update(demoRef,{site:{...site,name:changes.businessName,ownerId:demoSnap.data()?.site?.ownerId||actor.uid},
    name:changes.businessName,phone:changes.phone,contactEmail:changes.email,revision,updatedAt:now});
   const event=ref.collection("events").doc();
   tx.create(event,{type:"business_data_updated",changedFields:changed,at:now,actorUid:actor.uid,
    previewSynced:Boolean(site)});
   return out({saved:true,changedFields:changed,previewSynced:Boolean(site),revision,
    site,prospect:{id:prospectId,...changes}});
  });
 }catch(e){console.error("FUGTH_PROSPECT_PROFILE_UPDATE",{code:e.code||"unknown"});return out({error:"Could not save or synchronize prospect data."},503)}
}
