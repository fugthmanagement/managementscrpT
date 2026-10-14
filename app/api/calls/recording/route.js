import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../lib/server/auth";
import {validCallId,fetchOwnedVapiCall,fetchVapiAudio,fromFirebaseArchive,archiveWithAdmin} from "../../../../lib/server/vapi-recordings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=45;
function json(error,status){return NextResponse.json({error},{status,headers:{"Cache-Control":"private, no-store"}});}
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return json("Sign in to listen to recordings.",401);
 const id=new URL(req.url).searchParams.get("callId")||"";
 if(!validCallId(id))return json("Invalid recording reference.",400);
 try{
  // Firebase archives are segregated by verified owner UID.
  const cached=await fromFirebaseArchive(user.uid,id);
  if(cached)return new Response(cached.data,{headers:{
   "Content-Type":cached.contentType,"Content-Length":String(cached.data.byteLength),
   "Cache-Control":"private, no-store","X-Fugth-Archived":"yes",
   "Content-Disposition":'inline; filename="fugth-call-'+id+'"'
  }});
  // Only private server credentials contact Vapi: never send the provider's
  // short-lived signed URL, original artifact URL, or private API key to a browser.
  await fetchOwnedVapiCall(id,user.uid);
  const audio=await fetchVapiAudio(id);
  const archived=await archiveWithAdmin(user.uid,id,audio);
  return new Response(audio.data,{headers:{
   "Content-Type":audio.contentType,"Content-Length":String(audio.data.byteLength),
   "Cache-Control":"private, no-store","X-Fugth-Archived":archived.archived?"yes":"no",
   "Content-Disposition":'inline; filename="fugth-call-'+id+'"'
  }});
 }catch(error){
  console.warn("FUGTH private call playback",{status:error?.status||"unknown"});
  return json(error.message||"The recording could not be loaded.",error?.status||503);
 }
}
