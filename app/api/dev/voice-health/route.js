import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {archiveConnection} from "../../../../lib/server/drive-recordings";
import {DEMO_DURATION} from "../../../../lib/server/voice-preview";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=25;
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return NextResponse.json({error:"Verified FUGTH administrator required."},{status:403});
 const voiceKey=process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY||"";
 const numberId=process.env.VAPI_PHONE_NUMBER_ID||process.env.VAPI_PHONE_NUMBER||"";
 const details={
  testLengthSeconds:DEMO_DURATION,
  voiceKeyPresent:Boolean(voiceKey),outgoingNumberPresent:Boolean(numberId),
  outgoingNumberVerified:false,
  serverAccountReady:false,recordingArchiveAuthorized:false,
  ready:false,issues:[]
 };
 try{
  const db=firebaseAdmin().firestore();
  await db.doc("users/"+user.uid).get();
  details.serverAccountReady=true;
 }catch{details.issues.push("FUGTH customer storage needs attention.");}
 if(!voiceKey)details.issues.push("FUGTH voice service credentials are missing.");
 else if(!numberId)details.issues.push("No FUGTH outgoing demo number has been assigned.");
 else{
  try{
   const check=await fetch("https://api.vapi.ai/phone-number/"+encodeURIComponent(numberId),{
    headers:{Authorization:"Bearer "+voiceKey.trim()},cache:"no-store",signal:AbortSignal.timeout(9500)
   });
   details.outgoingNumberVerified=check.ok;
   if(!check.ok)details.issues.push(check.status===401||check.status===403?
    "Voice access credentials were declined. Reconnect the FUGTH calling account.":
    "The configured FUGTH outbound number couldn't be verified.");
  }catch{details.issues.push("The FUGTH calling connection could not be reached.");}
 }
 try{
  const status=await archiveConnection(user.uid);
  details.recordingArchiveAuthorized=status.connected===true;
  if(!details.recordingArchiveAuthorized)
   details.issues.push("The central FUGTH recording account still needs to approve secure storage access.");
 }catch{details.issues.push("The FUGTH recording archive needs attention.");}
 details.ready=details.voiceKeyPresent&&details.outgoingNumberVerified&&details.serverAccountReady;
 return NextResponse.json(details,{headers:{"Cache-Control":"private, no-store"}});
}
