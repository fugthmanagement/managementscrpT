import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
import {resolveFirebaseAdminCredentials} from "../../../../lib/server/firebase-admin-credentials";
import {textbackProviderReady} from "../../../../lib/missed-call-textback";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user||!isFounder(user))return NextResponse.json({error:"Verified founder login required."},{status:403});
 const pre=resolveFirebaseAdminCredentials(process.env);
 return NextResponse.json({
  vapiConfigured:Boolean(process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY),
  smsConfigured:textbackProviderReady(process.env),
  smsProvider:"twilio",senderNumberConfigured:Boolean(process.env.TWILIO_FROM_NUMBER),
  firebaseAdminReady:pre.ok,firebaseCode:pre.report.code,
  firebaseHint:pre.ok?"Server Firestore read/write still requires a live check.":pre.report.hint,
  webhookPath:"/api/vapi-webhook",
  smsDeliveryReady:pre.ok&&textbackProviderReady(process.env),
  liveSmsDisabledReason:!textbackProviderReady(process.env)?"No registered SMS carrier has been connected; no automatic message will be sent.":!pre.ok?"Firebase server credential check failed.":"Ready for a controlled opted-in test."
 },{headers:{"Cache-Control":"private, no-store"}});
}
