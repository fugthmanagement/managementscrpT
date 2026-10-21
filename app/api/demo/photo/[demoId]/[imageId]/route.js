import {firebaseAdmin} from "../../../../../../lib/server/auth";
import {accessGoogleCalendar} from "../../../../../../lib/server/google-calendar";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=40;
const fail=(message,status)=>Response.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req,{params}){
 const id=String(params.demoId||""),imageId=String(params.imageId||"");
 if(!/^[a-f0-9]{24}$/.test(id)||!/^fugth-upload-[a-f0-9]{32}$/.test(imageId))return fail("Invalid business photo.",400);
 try{
  const db=firebaseAdmin().firestore(),demo=await db.doc("prospectDemos/"+id).get();
  const record=demo.data();
  if(!demo.exists||record.revoked||record.expiresAt&&Date.parse(record.expiresAt)<=Date.now())
   return fail("This independent preview is no longer available.",404);
  const uid=String(record.founderId||"");
  if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid))return fail("Image library owner is invalid.",404);
  const site=record.site||{};
  const selected=[site.heroImageId,...(Array.isArray(site.galleryImageIds)?site.galleryImageIds:[])];
  if(!selected.includes(imageId))return fail("This image was not approved for this particular preview.",403);
  const snap=await db.doc("users/"+uid+"/siteImages/"+imageId).get(),photo=snap.data();
  if(!snap.exists||photo?.ownerUid!==uid||photo?.id!==imageId||photo.rightsConfirmed!==true)
   return fail("The founder did not authorize this image for this demo.",404);
  if(!["image/jpeg","image/png","image/webp"].includes(photo.contentType))return fail("Unsupported photo.",415);
  const token=await accessGoogleCalendar(photo.driveOwnerUid,"drive.file");
  const result=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(photo.fileId)+"?alt=media",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(16000)});
  if(!result.ok)return fail("The private photo archive is temporarily unavailable.",503);
  const bytes=await result.arrayBuffer();
  if(bytes.byteLength>5*1024*1024)return fail("The business image is too large.",413);
  return new Response(bytes,{headers:{
   "Content-Type":photo.contentType,"Content-Length":String(bytes.byteLength),
   "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
   "Content-Disposition":"inline; filename=fugth-authorized-business-photo"
  }});
 }catch(e){return fail("The business preview photo could not be retrieved.",503)}
}
