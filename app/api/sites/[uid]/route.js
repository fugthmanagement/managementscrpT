import { NextResponse } from "next/server";
import { authenticatedUser,firebaseAdmin,isFounder } from "../../../../lib/server/auth";
import {buildStarterSite,siteFields,cleanText} from "../../../../lib/site-presets";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const hasAdminCredentials=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
const validUid=value=>/^[A-Za-z0-9_-]{8,128}$/.test(value||"");
function sanitized(data,uid,old={},visibility="preview"){
 const now=new Date().toISOString();
 return {...siteFields(data),ownerId:uid,version:1,visibility,
   createdAt:old.createdAt||now,updatedAt:now};
}
async function viewer(request,uid) {
 const user=await authenticatedUser(request);
 if(!user)return {error:NextResponse.json({error:"Please sign in to edit this website."},{status:401})};
 if(!validUid(uid))return {error:NextResponse.json({error:"Invalid site reference."},{status:400})};
 if(user.uid!==uid&&!isFounder(user))return {error:NextResponse.json({error:"This website belongs to another account."},{status:403})};
 if(!hasAdminCredentials())return {error:NextResponse.json({error:"Website editing requires secure Firebase server configuration."},{status:503})};
 return {user,founder:user.uid!==uid};
}
export async function GET(request,{params}) {
 const uid=params.uid,auth=await viewer(request,uid);if(auth.error)return auth.error;
 try {
  const db=firebaseAdmin().firestore();
  const [published,draft,profile]=await Promise.all([db.doc("publicSites/"+uid).get(),db.doc("siteDrafts/"+uid).get(),db.doc("users/"+uid).get()]);
  if(!published.exists&&!draft.exists&&!profile.exists)return NextResponse.json({error:"Account or website was not found."},{status:404});
  const site=draft.exists?draft.data():published.exists?published.data():buildStarterSite(uid,profile.data()?.businessName||profile.data()?.displayName||"Your business",profile.data()?.businessType);
  return NextResponse.json({site,hasDraft:draft.exists,liveStatus:published.data()?.visibility||"not_created",publishedAt:published.data()?.publishedAt||null,accountNumber:profile.data()?.accountNumber||null,customerName:profile.data()?.businessName||site.name});
 }catch(e){console.error("FUGTH site read failed",e?.code||"unknown");return NextResponse.json({error:"Could not load this saved website."},{status:503});}
}
export async function PUT(request,{params}){
 const uid=params.uid,auth=await viewer(request,uid);if(auth.error)return auth.error;
 let body;
 try{body=await request.json();if(JSON.stringify(body).length>12000)throw Error("Design data is too large.");}
 catch{return NextResponse.json({error:"Invalid site update."},{status:400});}
 const action=body.action;
 if(!["save","publish","unpublish","initialize"].includes(action))return NextResponse.json({error:"Choose save, publish, or unpublish."},{status:400});
 const db=firebaseAdmin().firestore(),pubRef=db.doc("publicSites/"+uid),draftRef=db.doc("siteDrafts/"+uid),historyRef=db.collection("siteChanges").doc();
 try{
  const result=await db.runTransaction(async tx=>{
   const [pub,draft,userDoc]=await Promise.all([tx.get(pubRef),tx.get(draftRef),tx.get(db.doc("users/"+uid))]);
   if(!pub.exists&&!draft.exists&&!userDoc.exists&&!isFounder(auth.user))throw Object.assign(new Error("Business account does not exist."),{status:404});
   const existing=draft.exists?draft.data():pub.exists?pub.data():buildStarterSite(uid,userDoc.data()?.businessName||"Your business",userDoc.data()?.businessType);
   let next,live=null;
   if(action==="initialize"){
    if(!pub.exists)tx.create(pubRef,sanitized(existing,uid,existing,"preview"));
    return {site:existing,status:pub.data()?.visibility||"preview"};
   }
   if(action==="unpublish"){
    if(!pub.exists)throw Object.assign(new Error("No live website exists."),{status:404});
    live={...pub.data(),visibility:"preview",updatedAt:new Date().toISOString()};
    tx.set(pubRef,live);
    next=draft.exists?draft.data():live;
   } else {
    next=sanitized(body.site||{},uid,existing,"preview");
    if(!next.name||!next.headline)throw Object.assign(new Error("Business name and headline are required."),{status:400});
    const revision=(Number(draft.data()?.revision)||0)+1;
    next={...next,revision,savedBy:auth.user.uid};
    tx.set(draftRef,next);
    if(action==="publish"){
      if(!next.phone&&!next.contactEmail)throw Object.assign(new Error("Add a verified business contact before publishing."),{status:400});
      live={...siteFields(next),ownerId:uid,version:1,visibility:"published",createdAt:pub.data()?.createdAt||next.createdAt,updatedAt:next.updatedAt,publishedAt:new Date().toISOString()};
      tx.set(pubRef,live);
    }
   }
   tx.create(historyRef,{ownerId:uid,actorUid:auth.user.uid,actorRole:auth.founder?"founder":"owner",action,at:new Date().toISOString(),revision:next.revision||0});
   return {site:next,status:live?.visibility||pub.data()?.visibility||"preview",revision:next.revision||0};
  });
  return NextResponse.json({saved:true,...result,siteUrl:"/sites/"+uid});
 }catch(e){console.error("FUGTH site update failed",e?.status||"unknown");return NextResponse.json({error:e.status?e.message:"Could not save your website. Try again."},{status:e.status||503});}
}
