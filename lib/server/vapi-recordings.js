import {firebaseAdmin} from "./auth";

// Private recordings may no longer be played from call.artifact.recording URLs.
// Always retrieve the audio with the server's Vapi key, through the documented
// /call/{id}/mono-recording endpoint, and authenticate the owning Firebase user.
export const validCallId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||""));
export const voiceKey=()=>process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY||"";
export const hasAdminStorage=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||
 (process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
export const storageBucket=()=>process.env.FIREBASE_STORAGE_BUCKET||
 process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET||
 (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"fugthmanagement-89c84")+".firebasestorage.app";
export const recordingPath=(uid,id)=>"users/"+uid+"/call-recordings/"+id;
const MAX_AUDIO_BYTES=20*1024*1024;
const audioType=value=>{
 const type=String(value||"").split(";")[0].toLowerCase();
 if(["audio/wav","audio/x-wav","audio/wave","audio/vnd.wave"].includes(type))return "audio/wav";
 if(["audio/mpeg","audio/mp3"].includes(type))return "audio/mpeg";
 if(type==="audio/ogg")return "audio/ogg";
 if(type==="audio/webm")return "audio/webm";
 if(type==="audio/mp4"||type==="audio/x-m4a")return "audio/mp4";
 return "audio/wav";
};
// Real inbound business calls may have an assigned phoneNumberId instead of
// per-call owner metadata. Resolve only through server-protected assignments.
export async function callOwnerId(call){
 const uid=String(call?.metadata?.ownerId||call?.assistant?.metadata?.ownerId||"");
 if(/^[A-Za-z0-9_-]{8,128}$/.test(uid))return uid;
 if(!hasAdminStorage())return null;
 const numberId=String(call?.phoneNumberId||call?.phoneNumber?.id||"");
 if(!numberId)return null;
 try{
  const users=firebaseAdmin().firestore().collection("users");
  for(const key of ["assignedNumberId","vapiPhoneNumberId"]){
   const found=await users.where(key,"==",numberId).limit(2).get();
   if(found.size===1)return found.docs[0].id;
  }
 }catch(error){console.warn("Call owner mapping unavailable",{code:error?.code||"firestore"});}
 return null;
}
export async function fetchProviderCall(id){
 if(!validCallId(id))throw Object.assign(new Error("Invalid call ID."),{status:400});
 if(!voiceKey())throw Object.assign(new Error("Vapi voice connection is unavailable."),{status:503});
 const response=await fetch("https://api.vapi.ai/call/"+encodeURIComponent(id),{
  headers:{Authorization:"Bearer "+voiceKey().trim()},cache:"no-store",signal:AbortSignal.timeout(9500)
 });
 if(!response.ok)throw Object.assign(new Error("The provider could not return this call."),{status:response.status===404?404:502});
 const call=await response.json();
 if(call.id!==id)throw Object.assign(new Error("Call ID mismatch."),{status:403});
 return call;
}
export async function fetchOwnedVapiCall(id,uid){
 const call=await fetchProviderCall(id);
 if((await callOwnerId(call))!==uid)
  throw Object.assign(new Error("This recording does not belong to your account."),{status:403});
 return call;
}
export async function fetchVapiAudio(id){
 const response=await fetch("https://api.vapi.ai/call/"+encodeURIComponent(id)+"/mono-recording",{
  headers:{Authorization:"Bearer "+voiceKey().trim()},cache:"no-store",signal:AbortSignal.timeout(16500),
  redirect:"follow"
 });
 if(!response.ok)throw Object.assign(new Error(response.status===404?
  "Vapi has not finished processing this recording, or recording was disabled for this call.":
  "Vapi couldn't deliver the recording. Retry in a minute."),{status:response.status===404?404:502});
 const declared=Number(response.headers.get("content-length"));
 if(declared>MAX_AUDIO_BYTES)throw Object.assign(new Error("Recording exceeds the 20 MB playback limit."),{status:413});
 const data=new Uint8Array(await response.arrayBuffer());
 if(!data.byteLength||data.byteLength>MAX_AUDIO_BYTES)
  throw Object.assign(new Error("The recording was empty or too large."),{status:502});
 return {data,contentType:audioType(response.headers.get("content-type"))};
}
export async function fromFirebaseArchive(uid,id){
 if(!hasAdminStorage())return null;
 try{
  const file=firebaseAdmin().storage().bucket(storageBucket()).file(recordingPath(uid,id));
  const [exists]=await file.exists();
  if(!exists)return null;
  const [metadata]=await file.getMetadata();
  if(Number(metadata.size)>MAX_AUDIO_BYTES)return null;
  const [buffer]=await file.download();
  if(!buffer.length||buffer.length>MAX_AUDIO_BYTES)return null;
  return {data:new Uint8Array(buffer),contentType:audioType(metadata.contentType),archived:true};
 }catch(error){
  console.warn("FUGTH recording archive read unavailable",{code:error?.code||"storage"});
  return null;
 }
}
export async function archiveWithAdmin(uid,id,audio){
 if(!hasAdminStorage())return {archived:false,reason:"storage-admin-not-configured"};
 try{
  const file=firebaseAdmin().storage().bucket(storageBucket()).file(recordingPath(uid,id));
  await file.save(Buffer.from(audio.data),{
   resumable:false,validation:"crc32c",
   metadata:{contentType:audio.contentType,cacheControl:"private, no-store",
    metadata:{provider:"vapi",ownerId:uid,callId:id}}
  });
  return {archived:true,storagePath:recordingPath(uid,id)};
 }catch(error){
  console.warn("FUGTH recording archive write unavailable",{code:error?.code||"storage"});
  return {archived:false,reason:"storage-write-unavailable"};
 }
}
export const hasVapiRecording=call=>Boolean(
 call?.artifact?.recording||call?.artifact?.recordingUrl||
 call?.artifact?.recording?.mono?.combinedUrl||
 call?.artifact?.recording?.stereoUrl||call?.recordingUrl
);
