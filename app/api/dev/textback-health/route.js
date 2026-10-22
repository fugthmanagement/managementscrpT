import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return NextResponse.json({error:"Verified founder access required."},{status:403});
 return NextResponse.json({
  ready:false,
  webhookSecretConfigured:Boolean(process.env.FUGTH_TEXTBACK_WEBHOOK_SECRET),
  smsTransportConfigured:Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN),
  explanation:"The FUGTH message-back workflow and settings exist. Automatic texting requires a trusted missed-call event source, carrier-registered SMS number, compliance handling and a production test. Sending is disabled until those are verified."
 },{headers:{"Cache-Control":"private, no-store"}});
}
