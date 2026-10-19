import {businessEntitlement} from "../../../../lib/server/feature-entitlement";
import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../lib/server/auth";
import {validCallId,fetchOwnedVapiCall,fetchVapiAudio} from "../../../../lib/server/vapi-recordings";
import {readDriveRecording,saveDriveRecording} from "../../../../lib/server/drive-recordings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const failure=(error,status)=>NextResponse.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
const audioReply=(audio,backend)=>new Response(audio.data,{
 headers:{"Content-Type":audio.contentType,
 "Content-Length":String(audio.data.byteLength),
 "Cache-Control":"private, no-store",
 "X-Fugth-Archived":backend==="google_drive"?"drive":"no",
 "Content-Disposition":'inline; filename="fugth-call-recording"'
 }});
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return failure("Sign in to listen to your recordings.",401);
 const permit=await businessEntitlement(user,"voice");if(!permit.allowed)return failure(permit.reason,403);
 const callId=new URL(req.url).searchParams.get("callId")||"";
 if(!validCallId(callId))return failure("Invalid call recording reference.",400);
 let driveError=null;
 try{
  // The Firebase-authenticated uid selects a server-owned Firestore archive
  // record; no public Drive link or customer-provided Drive file ID is accepted.
  const archive=await readDriveRecording(user.uid,callId);
  if(archive)return audioReply(archive,"google_drive");
 }catch(error){
  driveError=error;
  console.warn("Google Drive playback unavailable",{code:error?.status||"oauth"});
 }
 try{
  // A new or pending archive is still playable from Vapi before retention ends.
  await fetchOwnedVapiCall(callId,user.uid);
  const audio=await fetchVapiAudio(callId);
  let archived=false;
  try{
   const outcome=await saveDriveRecording(user.uid,callId,audio);
   archived=outcome.archived===true;
  }catch(error){
   console.warn("Archive deferred until Google Drive is authorized",{code:error?.status||"oauth"});
  }
  return audioReply(audio,archived?"google_drive":"vapi");
 }catch(error){
  const explanation=driveError?
   "Google Drive recording could not be opened, and the temporary Vapi recording is unavailable. Reconnect your Google account under Settings → Connections.":
   error.message||"This recording isn't available yet.";
  return failure(explanation,error.status===404?404:error.status===403?403:503);
 }
}
