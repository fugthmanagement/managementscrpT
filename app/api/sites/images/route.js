import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {authenticatedUser,firebaseAdmin,isAdminEmail} from "../../../../lib/server/auth";
import {accessGoogleCalendar} from "../../../../lib/server/google-calendar";
import {businessEntitlement} from "../../../../lib/server/feature-entitlement";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const reply=(value,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
const allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const MAX_BYTES=5*1024*1024;
const clean=(s,n=120)=>String(s??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const folderName=s=>clean(s,48).replace(/[/\\]/g,"-")||"General photos";
const cleanTags=s=>String(s||"").split(",").map(x=>clean(x.toLowerCase(),30)).filter(Boolean).slice(0,8);
async function ensureDriveFolder(uid,folder,token){
 // These are real, app-created Google Drive folders, not public image hosting.
 const db=firebaseAdmin().firestore(),slug=folder.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,65)||"general";
 const ref=db.doc("users/"+uid+"/siteMediaFolders/"+slug),existing=await ref.get();
 if(existing.exists&&/^[A-Za-z0-9_-]{8,200}$/.test(existing.data()?.driveFolderId||""))return existing.data().driveFolderId;
 try{
  const res=await fetch("https://www.googleapis.com/drive/v3/files?fields=id",{
   method:"POST",cache:"no-store",signal:AbortSignal.timeout(10000),
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({name:"FUGTH - "+uid.slice(0,10)+" - "+folder,
    mimeType:"application/vnd.google-apps.folder",appProperties:{fugthOwnerUid:uid,fugthSiteFolder:slug}})
  });
  if(!res.ok)return "";
  const data=await res.json(),id=String(data.id||"");
  if(!/^[A-Za-z0-9_-]{8,200}$/.test(id))return "";
  await ref.set({name:folder,slug,driveFolderId:id,updatedAt:new Date().toISOString()},{merge:true});
  return id;
 }catch{return ""}
}
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
   .collection("siteImages").orderBy("createdAt","desc").limit(120).get();
  return reply({images:snap.docs.map(x=>({id:x.id,...{
    name:x.data().name,contentType:x.data().contentType,size:x.data().size,
    label:x.data().label||x.data().name,folder:x.data().folder||"General photos",
    tags:x.data().tags||[],industry:x.data().industry||"",rightsSource:x.data().rightsSource||"",
    createdAt:x.data().createdAt
   }}))});
 }catch{return reply({error:"Your FUGTH photo library is unavailable. Check the private archive connection."},503);}
}
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return reply({error:"Sign in to upload your business photos."},401);
 const entitlement=await businessEntitlement(user,"website");
 if(!entitlement.allowed)return reply({error:"Save and upload your own business photos with an active website package. Free plans can preview the templates."},403);
 if(Number(req.headers.get("content-length")||0)>MAX_BYTES+65536)return reply({error:"Use a photo under 5 MB."},413);
 try{
  const form=await req.formData(),file=form.get("file");
  const rightsConfirmed=String(form.get("rightsConfirmed")||"")==="true";
  if(!rightsConfirmed)return reply({error:"Confirm you own the photo or have permission to use it on customer previews."},400);
  const label=clean(form.get("label")||file?.name||"Business photo",105);
  const folder=folderName(form.get("folder"));
  const tags=cleanTags(form.get("tags"));
  const industry=clean(form.get("industry"),35);
  const rightsSource=clean(form.get("rightsSource")||"Owner-provided / licensed",95);
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
  const parent=await ensureDriveFolder(user.uid,folder,drive.token);
  const metadata={name,mimeType:type,
   ...(parent?{parents:[parent]}:{}),
   appProperties:{fugthImageId:id,fugthOwnerUid:user.uid,folder:folder.slice(0,90)}};
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
   label,folder,tags,industry,rightsSource,rightsConfirmed:true,
   inDriveFolder:Boolean(parent),contentType:type,size:bytes.length,createdAt:now,updatedAt:now
  });
  return reply({saved:true,image:{id,name:file.name,label,folder,tags,industry,rightsSource,contentType:type,size:bytes.length,createdAt:now},driveFolderCreated:Boolean(parent)});
 }catch(error){
  console.warn("FUGTH private image upload failed",{code:error?.code||"archive"});
  return reply({error:"The FUGTH photo upload isn't ready. Confirm the management Drive and storage permissions."},503);
 }
}

export async function PATCH(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return reply({error:"Sign in to edit image labels."},401);
 let body;
 try{const raw=await req.text();if(raw.length>1700)throw Error();body=JSON.parse(raw)}
 catch{return reply({error:"Invalid photo labels."},400)}
 const photoId=String(body.id||"");
 if(!/^fugth-upload-[a-f0-9]{32}$/.test(photoId))return reply({error:"Invalid photo."},400);
 const updates={
  label:clean(body.label,105),
  folder:folderName(body.folder),
  tags:Array.isArray(body.tags)?body.tags.slice(0,8).map(x=>clean(x,30).toLowerCase()).filter(Boolean):cleanTags(body.tags),
  industry:clean(body.industry,35),
  updatedAt:new Date().toISOString()
 };
 if(!updates.label)return reply({error:"Give this photo a readable label."},400);
 const ref=firebaseAdmin().firestore().doc("users/"+user.uid+"/siteImages/"+photoId);
 try{
  const snap=await ref.get();
  if(!snap.exists||snap.data()?.ownerUid!==user.uid)return reply({error:"Photo not found in your library."},404);
  await ref.update(updates);
  return reply({saved:true,image:{id:photoId,...updates},note:"Labels and virtual folder index saved in Firestore. File remains in its original Drive folder."});
 }catch{return reply({error:"Could not update this photo's labels."},503)}
}
