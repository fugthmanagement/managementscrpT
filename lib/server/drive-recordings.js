import {randomBytes} from "node:crypto";
import {firebaseAdmin,isAdminEmail} from "./auth";
import {accessGoogleCalendar} from "./google-calendar";

// Files are NEVER shared via Google Drive links. Owner identity, file pointers,
// OAuth credentials and playback remain server-side and separated by Firebase UID.
const ROOT_NAME="FUGTH Private Call Recordings";
const FOLDER_MIME="application/vnd.google-apps.folder";
const MAX_BYTES=20*1024*1024;
const callIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const driveIdPattern=/^[A-Za-z0-9_-]{8,256}$/;
const scope="drive.file";
const now=()=>new Date().toISOString();
const folderKey=uid=>uid.replace(/[^A-Za-z0-9_-]/g,"").slice(0,128);
const archiveDoc=(uid,callId)=>firebaseAdmin().firestore().doc("users/"+uid+"/recordingArchives/"+callId);
const recordingExtension=type=>type==="audio/mpeg"?"mp3":type==="audio/ogg"?"ogg":
 type==="audio/webm"?"webm":type==="audio/mp4"?"m4a":"wav";
const audioType=value=>["audio/wav","audio/mpeg","audio/ogg","audio/webm","audio/mp4"].includes(value)?value:"audio/mpeg";

async function driveOwnerUid(businessUid){
 // A business's own authorized Drive takes priority over any optional
 // founder-operated fallback. Existing archive entries retain the original
 // owner UID so historical recordings stay playable.
 const own=await firebaseAdmin().firestore().doc("users/"+businessUid+"/integrations/google_calendar").get();
 if(own.exists&&String(own.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/drive.file"))return businessUid;
 const requestedEmail=String(process.env.FUGTH_RECORDING_DRIVE_OWNER_EMAIL||"").trim().toLowerCase();
 if(!requestedEmail)return businessUid; // By default, the business connects its own Google Drive.
 if(!isAdminEmail(requestedEmail))throw Error("The archive owner must be a verified FUGTH founder email.");
 const user=await firebaseAdmin().auth().getUserByEmail(requestedEmail);
 return user.uid;
}
async function driveSession(businessUid){
 const uid=await driveOwnerUid(businessUid);
 // This uses the app's encrypted OAuth integration token, not ChatGPT's Drive connector.
 const token=await accessGoogleCalendar(uid,scope);
 return {uid,token};
}
async function api(url,token,{method="GET",body,headers={},timeout=12000}={}){
 const response=await fetch(url,{
  method,body,headers:{Authorization:"Bearer "+token,...headers},
  cache:"no-store",signal:AbortSignal.timeout(timeout)
 });
 if(!response.ok){
  const detail=await response.json().catch(()=>({}));
  const code=detail?.error?.code||response.status;
  const problem=code===403?"Drive access denied. Reconnect Google and verify Drive API permissions.":
   code===401?"Google authorization expired. Reconnect Google.":"Google Drive request failed ("+code+").";
  throw Object.assign(new Error(problem),{status:response.status});
 }
 return response;
}
async function findFolder(token,name,parent){
 const safe=name.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
 const parentClause=parent?" and '"+parent+"' in parents":"";
 const q="name = '"+safe+"' and mimeType = '"+FOLDER_MIME+"' and trashed = false"+parentClause;
 const url=new URL("https://www.googleapis.com/drive/v3/files");
 url.searchParams.set("q",q);
 url.searchParams.set("pageSize","30");
 url.searchParams.set("fields","files(id,name,mimeType,parents),nextPageToken");
 const response=await api(url.toString(),token);
 const files=(await response.json()).files||[];
 return files.find(f=>driveIdPattern.test(f.id)&&(parent?f.parents?.includes(parent):true))?.id||null;
}
async function newFolder(token,name,parent){
 const metadata={name,mimeType:FOLDER_MIME,...(parent?{parents:[parent]}:{})};
 const response=await api("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType",token,{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify(metadata)
 });
 const result=await response.json();
 if(!driveIdPattern.test(result.id))throw Error("Google Drive returned an invalid folder ID.");
 return result.id;
}
async function ensureFolder(token,ref,name,parent){
 const old=await ref.get();
 if(old.exists&&driveIdPattern.test(old.data()?.folderId||""))return old.data().folderId;
 const found=await findFolder(token,name,parent);
 const id=found||await newFolder(token,name,parent);
 await ref.set({folderId:id,createdAt:old.data()?.createdAt||now(),updatedAt:now()},{merge:true});
 return id;
}
async function businessFolder(driveUid,businessUid,token){
 const db=firebaseAdmin().firestore();
 const base="users/"+driveUid+"/integrations/fugth_recording_archive";
 const root=await ensureFolder(token,db.doc(base),ROOT_NAME,null);
 // The owner may inspect the hierarchy, but no recordings are shared with customers.
 const child=await ensureFolder(token,
  db.doc("users/"+driveUid+"/recordingArchiveFolders/"+folderKey(businessUid)),
  "Business-"+folderKey(businessUid),root);
 return child;
}
async function uploadAudio(token,metadata,audio){
 const boundary="fugth_"+randomBytes(12).toString("hex");
 const media=Buffer.from(audio.data);
 if(media.byteLength<1||media.byteLength>MAX_BYTES)throw Error("Recording size exceeds the 20 MB archive limit.");
 if(media.byteLength>5*1024*1024){
  // Google recommends resumable sessions for files over 5 MB.
  const init=await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size",token,{
   method:"POST",
   headers:{"Content-Type":"application/json; charset=UTF-8",
    "X-Upload-Content-Type":audio.contentType,
    "X-Upload-Content-Length":String(media.byteLength)},
   body:JSON.stringify(metadata),timeout:12500
  });
  const location=init.headers.get("location");
  if(!location||new URL(location).protocol!=="https:"||
   !new URL(location).hostname.endsWith(".googleapis.com"))
   throw Error("Google Drive did not return a trusted upload location.");
  const complete=await api(location,token,{
   method:"PUT",body:media,timeout:35000,
   headers:{"Content-Type":audio.contentType,
    "Content-Length":String(media.byteLength),
    "Content-Range":"bytes 0-"+(media.byteLength-1)+"/"+media.byteLength}
  });
  return complete.json();
 }
 const prefix=Buffer.from(
  "--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+
  JSON.stringify(metadata)+"\r\n--"+boundary+"\r\nContent-Type: "+audio.contentType+"\r\n\r\n"
 );
 const body=Buffer.concat([prefix,media,Buffer.from("\r\n--"+boundary+"--\r\n")]);
 const result=await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size",token,{
  method:"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body,timeout:30000
 });
 return result.json();
}
export async function driveArchiveStatus(uid,callId){
 if(!callIdPattern.test(callId))return null;
 const ref=archiveDoc(uid,callId);
 const snap=await ref.get();
 const entry=snap.data()||{};
 return entry.status==="ready"&&driveIdPattern.test(entry.fileId||"")&&entry.ownerUid===uid?
  {archived:true,fileId:entry.fileId,driveOwnerUid:entry.driveOwnerUid,
   contentType:audioType(entry.contentType),size:Number(entry.size)||0}:null;
}
export async function saveDriveRecording(uid,callId,audio){
 if(!callIdPattern.test(callId))throw Error("Invalid Vapi call ID for recording archive.");
 const previous=await driveArchiveStatus(uid,callId);
 if(previous)return previous;
 const session=await driveSession(uid);
 const ref=archiveDoc(uid,callId);
 let reserved=false;
 // Skip duplicate webhook deliveries. An abandoned upload lease expires after 90s.
 await firebaseAdmin().firestore().runTransaction(async transaction=>{
  const current=await transaction.get(ref);
  const entry=current.data()||{};
  if(entry.status==="ready"&&driveIdPattern.test(entry.fileId||""))return;
  if(entry.status==="uploading"&&Number(entry.leaseUntil)>Date.now())return;
  transaction.set(ref,{status:"uploading",ownerUid:uid,driveOwnerUid:session.uid,
   leaseUntil:Date.now()+90000,updatedAt:now()},{merge:true});
  reserved=true;
 });
 if(!reserved)return await driveArchiveStatus(uid,callId)||{archived:false,pending:true};
 try{
  const parent=await businessFolder(session.uid,uid,session.token);
  const extension=recordingExtension(audioType(audio.contentType));
  const file=await uploadAudio(session.token,{
   name:"call-"+callId+"."+extension,parents:[parent],
   mimeType:audioType(audio.contentType),
   appProperties:{fugthCallId:callId,fugthOwnerUid:uid}
  },audio);
  if(!driveIdPattern.test(file.id||""))throw Error("Google Drive did not confirm recording upload.");
  const result={
   status:"ready",ownerUid:uid,driveOwnerUid:session.uid,fileId:file.id,
   contentType:audioType(file.mimeType||audio.contentType),size:Number(file.size)||audio.data.byteLength,
   completedAt:now(),updatedAt:now(),leaseUntil:0
  };
  await ref.set(result,{merge:true});
  return {archived:true,fileId:file.id,driveOwnerUid:session.uid,contentType:result.contentType,size:result.size};
 }catch(error){
  await ref.set({status:"failed",lastError:String(error.message||"archive failed").slice(0,150),
   leaseUntil:0,updatedAt:now()},{merge:true}).catch(()=>{});
  throw error;
 }
}
export async function readDriveRecording(uid,callId){
 const entry=await driveArchiveStatus(uid,callId);
 if(!entry)return null;
 const token=await accessGoogleCalendar(entry.driveOwnerUid,scope);
 const url="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(entry.fileId)+"?alt=media";
 const result=await api(url,token,{timeout:25000});
 const declared=Number(result.headers.get("content-length"));
 if(declared>MAX_BYTES)throw Error("Recording exceeds the playback limit.");
 const data=new Uint8Array(await result.arrayBuffer());
 if(!data.byteLength||data.byteLength>MAX_BYTES)throw Error("The archived recording is empty or too large.");
 return {archived:true,data,contentType:entry.contentType,backend:"google_drive",fileId:entry.fileId};
}
export async function archiveConnection(uid){
 try{
  const owner=await driveOwnerUid(uid);
  const doc=await firebaseAdmin().firestore().doc("users/"+owner+"/integrations/google_calendar").get();
  return {backend:"google_drive",connected:Boolean(doc.exists&&
   String(doc.data()?.scopes||"").split(" ").includes("https://www.googleapis.com/auth/drive.file")),
   sharedArchive:owner!==uid};
 }catch{return {backend:"google_drive",connected:false,sharedArchive:false};}
}
