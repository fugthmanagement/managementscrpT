import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {authenticatedUser,firebaseAdmin,isAdminEmail} from "../../../../lib/server/auth";
import {accessGoogleCalendar} from "../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const reply=(value,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
const allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const MAX_BYTES=5*1024*1024;
function validMagic(buffer,type){
 return type==="image/jpeg"?buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff:
 type==="image/png"?buffer.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
 type==="image/webp"?buffer.toString("ascii",0,4)==="RIFF"&&buffer.toString("ascii",8,12)==="WEBP":false;
}
async function driveOwner(businessUid){
 const own=await firebaseAdmin().firestore().doc("users/"+businessUid+"/integrations/google_calendar").get();
 if(own.exists&&String(own.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/drive.file"))
  return {uid:businessUid,token:await accessGoogleCalendar(businessUid,"drive.file")};
 const email=String(process.env.FUGTH_RECORDING_DRIVE_OWNER_EMAIL||"").trim().toLowerCase();
 if(!email||!isAdminEmail(email))throw Error("The private FUGTH image archive isn't authorized.");
 const owner=await firebaseAdmin().auth().getUserByEmail(email);
 return {uid:owner.uid,token:await accessGoogleCalendar(owner.uid,"drive.file")};
}
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return reply({error:"Sign in to view business photos."},401);
 try{
  const db=firebaseAdmin().firestore(),snap=await db.collection("users").doc(user.uid)
   .collection("siteImages").orderBy("createdAt","desc").limit(40).get();
  return reply({images:snap.docs.map(x=>({id:x.id,...{
    name:x.data().name,contentType:x.data().contentType,size:x.data().size,
    createdAt:x.data().createdAt
   }}))});
 }catch{return reply({error:"Your FUGTH photo library is unavailable. Check the private archive connection."},503);}
}
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return reply({error:"Sign in to upload your business photos."},401);
 if(Number(req.headers.get("content-length")||0)>MAX_BYTES+65536)return reply({error:"Use a photo under 5 MB."},413);
 try{
  const form=await req.formData(),file=form.get("file");
  if(!file||typeof file.arrayBuffer!=="function")return reply({error:"Select an image."},400);
  const type=String(file.type||"").toLowerCase();
  if(!allowed[type]||file.size>MAX_BYTES||file.size<32)return reply({error:"Choose a JPG, PNG or WebP photo under 5 MB."},400);
  const bytes=Buffer.from(await file.arrayBuffer());
  if(!validMagic(bytes,type))return reply({error:"This file isn't a supported image."},400);
  const drive=await driveOwner(user.uid);
  const id="fugth-upload-"+randomUUID().replace(/-/g,"");
  const name="fugth-business-"+user.uid+"-"+id+"."+allowed[type];
  // Drive files never receive public or shared ACLs. Public website images
  // are served only through the FUGTH image proxy after publication.
  const boundary="fugth_"+randomUUID().replace(/-/g,"");
  const metadata={name,mimeType:type,appProperties:{fugthImageId:id,fugthOwnerUid:user.uid}};
  const multipart=Buffer.concat([
   Buffer.from("--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+
    JSON.stringify(metadata)+"\r\n--"+boundary+"\r\nContent-Type: "+type+"\r\n\r\n"),
   bytes,Buffer.from("\r\n--"+boundary+"--\r\n")
  ]);
  const res=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size",{
   method:"POST",headers:{Authorization:"Bearer "+drive.token,"Content-Type":"multipart/related; boundary="+boundary},
   body:multipart,cache:"no-store",signal:AbortSignal.timeout(30000)
  });
  if(!res.ok)return reply({error:"The private FUGTH photo archive couldn't store this image."},502);
  const result=await res.json(),fileId=String(result.id||"");
  if(!/^[A-Za-z0-9_-]{8,256}$/.test(fileId))return reply({error:"The archive did not confirm the upload."},502);
  const now=new Date().toISOString();
  await firebaseAdmin().firestore().doc("users/"+user.uid+"/siteImages/"+id).create({
   ownerUid:user.uid,id,fileId,driveOwnerUid:drive.uid,
   name:String(file.name||"Business photo").replace(/[<>]/g,"").slice(0,110),
   contentType:type,size:bytes.length,createdAt:now,updatedAt:now
  });
  return reply({saved:true,image:{id,name:file.name,contentType:type,size:bytes.length,createdAt:now}});
 }catch(error){
  console.warn("FUGTH private image upload failed",{code:error?.code||"archive"});
  return reply({error:"The FUGTH photo upload isn't ready. Confirm the management Drive and storage permissions."},503);
 }
}
