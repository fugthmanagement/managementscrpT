import {authenticatedUser,firebaseAdmin} from "../../../../../../lib/server/auth";
import {accessGoogleCalendar} from "../../../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=40;
const failure=(msg,status)=>Response.json({error:msg},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req,{params}){
 const uid=String(params.uid||""),id=String(params.imageId||"");
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid)||!/^fugth-upload-[a-f0-9]{32}$/.test(id))
  return failure("Invalid photo reference.",400);
 try{
  const db=firebaseAdmin().firestore();
  const user=await authenticatedUser(req);
  const owner=user?.uid===uid;
  if(!owner){
   // Only explicitly selected photos on a published website are public.
   const site=await db.doc("publicSites/"+uid).get();
   const info=site.data()||{};
   if(info.visibility!=="published"&&info.visibility!=="preview")
    return failure("This photo is private.",403);
   if(info.visibility!=="published")return failure("Photo preview requires the business owner.",403);
   const selected=[info.heroImageId,...(Array.isArray(info.galleryImageIds)?info.galleryImageIds:[])];
   if(!selected.includes(id))return failure("Photo hasn't been published on this website.",403);
  }
  const doc=await db.doc("users/"+uid+"/siteImages/"+id).get();
  const data=doc.data();
  if(!doc.exists||data?.ownerUid!==uid||data?.id!==id)return failure("Photo not found.",404);
  if(!["image/jpeg","image/png","image/webp"].includes(data.contentType))return failure("Unsupported image.",415);
  const token=await accessGoogleCalendar(data.driveOwnerUid,"drive.file");
  const result=await fetch("https://www.googleapis.com/drive/v3/files/"+
   encodeURIComponent(data.fileId)+"?alt=media",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(15000)
  });
  if(!result.ok)return failure("Private image archive is currently unavailable.",503);
  const body=await result.arrayBuffer();
  if(body.byteLength>5*1024*1024)return failure("Image exceeds allowed size.",413);
  return new Response(body,{headers:{"Content-Type":data.contentType,"Content-Length":String(body.byteLength),
   "Cache-Control":owner?"private, max-age=30":"public, max-age=120",
   "X-Content-Type-Options":"nosniff","Content-Disposition":"inline; filename=fugth-business-photo"}});
 }catch(error){
  console.warn("FUGTH site image read failed",{code:error?.code||"archive"});
  return failure("Image temporarily unavailable.",503);
 }
}
