import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {renderTextbackMessage,isEligibleMissedCall,defaultTextbackSettings} from "../../../../lib/textback-flow";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const out=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return out({error:"Sign in required."},401);
 try{
  const snap=await firebaseAdmin().firestore().collection("users/"+user.uid+"/textbackEvents")
   .orderBy("createdAt","desc").limit(40).get();
  return out({events:snap.docs.map(d=>({id:d.id,...d.data()})),simulationOnly:true});
 }catch(e){const issue=firestoreDemoFailure(e);return out({error:"Could not read text-back activity.",code:issue.code},503)}
}
export async function POST(req){
 const user=await authenticatedUser(req);if(!user?.uid)return out({error:"Sign in required."},401);
 let body;try{const raw=await req.text();if(raw.length>1100)throw Error();body=JSON.parse(raw)}
 catch{return out({error:"Invalid simulation."},400)}
 if(body.action!=="simulate")return out({error:"Only safe local simulations are available until provider verification."},400);
 const event={outcome:["missed","no_answer","busy","answered"].includes(body.outcome)?body.outcome:"missed",answered:body.outcome==="answered",smsOptOut:body.smsOptOut===true};
 try{
  const db=firebaseAdmin().firestore();
  const cfg=await db.doc("users/"+user.uid+"/textback/settings").get();
  const settings={...defaultTextbackSettings(),...(cfg.data()||{})};
  const eligible=isEligibleMissedCall(event);
  const createdAt=new Date().toISOString();
  const status=eligible?"preview_message_prepared":"skipped";
  const record={outcome:event.outcome,status,mode:"simulation",provider:"unconnected",eligible,
   sendAttempted:false,smsSent:false,createdAt,
   sampleMessage:eligible?renderTextbackMessage(settings):"",
   reason:!eligible?(event.smsOptOut?"sms_opt_out":"call_was_answered"):"provider_not_connected"};
  const ref=db.collection("users/"+user.uid+"/textbackEvents").doc();
  await ref.create(record);
  return out({simulation:true,eventId:ref.id,...record});
 }catch(e){const issue=firestoreDemoFailure(e);return out({error:"Simulation wasn't saved; no text was sent.",code:issue.code},503)}
}
