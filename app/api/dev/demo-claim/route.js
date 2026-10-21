import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {siteFields} from "../../../../lib/site-presets";
export const runtime="nodejs";export const dynamic="force-dynamic";
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const demoId=x=>/^[a-f0-9]{24}$/.test(String(x||""));
const validUid=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return out({error:"Verified founder access required."},403);
 try{
  const snap=await firebaseAdmin().firestore().collection("demoClaimRequests").orderBy("createdAt","desc").limit(150).get();
  return out({claims:snap.docs.map(d=>({id:d.id,...d.data()}))});
 }catch{return out({error:"Could not read demo ownership requests."},503)}
}
export async function POST(req){
 const user=await authenticatedUser(req);if(!user?.uid)return out({error:"Sign in to request ownership of a demo."},401);
 let body;try{body=await req.json()}catch{return out({error:"Invalid request."},400)}
 const action=String(body.action||""),id=String(body.demoId||"");
 if(!demoId(id))return out({error:"Invalid demo link."},400);
 const db=firebaseAdmin().firestore(),demo=db.doc("prospectDemos/"+id);
 if(action==="request"){
  const profile=await db.doc("users/"+user.uid).get();
  if(!profile.exists)return out({error:"Finish creating your FUGTH account before requesting this preview."},409);
  const claimRef=db.doc("demoClaimRequests/"+id+"_"+user.uid);
  try{
   const result=await db.runTransaction(async tx=>{
    const [d,old]=await Promise.all([tx.get(demo),tx.get(claimRef)]);
    const data=d.data();
    if(!d.exists||data.revoked||(data.expiresAt&&Date.parse(data.expiresAt)<Date.now()))
     throw Error("The preview is expired or unavailable.");
    if(data.assignedUid&&data.assignedUid!==user.uid)
     throw Error("This preview is already assigned to another verified business account.");
    if(old.exists)return "existing";
    tx.create(claimRef,{demoId:id,uid:user.uid,requesterEmail:user.email||"",
     businessName:String(data.name||"").slice(0,110),status:"pending",createdAt:new Date().toISOString(),
     updatedAt:new Date().toISOString(),note:"Ownership must be verified manually by the FUGTH founder."});
    return "created";
   });
   return out({requested:true,status:"pending",alreadyExists:result==="existing",
    message:"Your claim request is saved. FUGTH must verify that you represent this business before assigning the website draft."},201);
  }catch(e){return out({error:String(e.message||"Could not save ownership request.").slice(0,150)},409)}
 }
 if(!isFounder(user))return out({error:"Only FUGTH administrators may review or approve claims."},403);
 if(!["approve","reject"].includes(action)||!validUid(body.uid))return out({error:"Choose a claim to review."},400);
 const claimRef=db.doc("demoClaimRequests/"+id+"_"+body.uid);
 if(action==="reject"){
  try{await db.runTransaction(async tx=>{
   const snap=await tx.get(claimRef);
   if(!snap.exists||snap.data()?.status!=="pending")throw Error("Not pending");
   tx.set(claimRef,{status:"rejected",reviewedAt:new Date().toISOString(),reviewedBy:user.uid},{merge:true});
  });return out({saved:true,status:"rejected"})}
  catch{return out({error:"This request is no longer pending."},409)}
 }
 if(body.verifiedBusinessOwner!==true)return out({error:"Confirm that you verified the requester's authority to represent the business outside this form."},400);
 try{
  const claimant=await firebaseAdmin().auth().getUser(body.uid);
  if(claimant.disabled||!claimant.emailVerified)return out({error:"The requester must verify their email and have an active account."},409);
  const target=db.doc("siteDrafts/"+body.uid);
  const result=await db.runTransaction(async tx=>{
   const [claimSnap,demoSnap,accountSnap,draftSnap]=await Promise.all([
    tx.get(claimRef),tx.get(demo),tx.get(db.doc("users/"+body.uid)),tx.get(target)
   ]);
   const claim=claimSnap.data(),preview=demoSnap.data();
   if(!claimSnap.exists||claim?.status!=="pending"||claim.uid!==body.uid||claim.demoId!==id)
    throw Error("Claim changed or is not pending.");
   if(!demoSnap.exists||preview.revoked||preview.assignedUid&&preview.assignedUid!==body.uid)
    throw Error("Preview is no longer available for this account.");
   if(!accountSnap.exists)throw Error("Account is missing.");
   if(draftSnap.exists&&!body.replaceExistingDraft)throw Error("The customer already has a website draft. Review it before replacing.");
   const design=siteFields({...preview.site,announcement:"Independent FUGTH website draft — owner approval required",showChatbot:false,
    visibility:"preview",ownerId:body.uid});
   const now=new Date().toISOString();
   tx.set(target,{...design,ownerId:body.uid,visibility:"preview",version:3,
    claimedFromDemo:id,updatedAt:now,createdAt:draftSnap.data()?.createdAt||now});
   tx.set(demo,{assignedUid:body.uid,updatedAt:now},{merge:true});
   tx.set(claimRef,{status:"approved",reviewedBy:user.uid,verifiedBusinessOwner:true,reviewedAt:now},{merge:true});
   return true;
  });
  return out({saved:result,status:"approved",siteEditor:"/sites/"+body.uid+"?edit=1",
   message:"Website saved as a private draft. Nothing has been published or charged."});
 }catch(e){return out({error:String(e.message||"Could not approve this ownership request.").slice(0,180)},409)}
}
