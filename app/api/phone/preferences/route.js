import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../lib/server/auth";
import {businessEntitlement} from "../../../../lib/server/feature-entitlement";
import {FieldValue} from "firebase-admin/firestore";
export const runtime="nodejs";
const carriers=new Set(["T-Mobile","AT&T","Verizon","Google Voice","RingCentral","Other mobile carrier","Other business phone system"]);
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
function phone(raw){const v=String(raw||"").replace(/\D/g,"");return v.length===10?"+1"+v:v.length===11&&v.startsWith("1")?"+"+v:"";}
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user?.uid)return respond({error:"Sign in to configure a FUGTH phone line."},401);
 const entitlement=await businessEntitlement(user,"phone");
 if(!entitlement.allowed)return respond({error:entitlement.reason},403);
 let body;try{const raw=await request.text();if(raw.length>2200)return respond({error:"Request too large."},413);body=JSON.parse(raw);}catch{return respond({error:"Invalid phone setup request."},400);}
 const businessPhone=phone(body.businessPhone),carrier=String(body.carrier||""),mode=String(body.mode||""),delay=Number(body.requestedDelay);
 if(!businessPhone||!carriers.has(carrier)||!["instant","no-answer"].includes(mode)||!Number.isInteger(delay)||delay<0||delay>30)
  return respond({error:"Choose a valid US phone number, carrier and routing settings."},400);
 try{
  const db=firebaseAdmin().firestore(),ref=db.doc("users/"+user.uid),snapshot=await ref.get();
  if(!snapshot.exists)return respond({error:"Complete your business profile first."},409);
  const assigned=Boolean(snapshot.data()?.vapiNumber);
  await ref.set({phone:businessPhone,phoneSetup:{
   businessPhone,carrier,mode,requestedDelay:mode==="no-answer"?delay:0,
   status:assigned?"verification_required":"assignment_requested",
   requestedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
  },updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return respond({saved:true,assigned,message:assigned?
   "Preferences saved. Verify carrier forwarding with a test call.":
   "Your request is saved. A dedicated FUGTH number must be assigned before forwarding can be activated."});
 }catch(e){console.warn("Phone setup save failed",{code:e?.code||"store"});return respond({error:"Could not save the phone setup securely."},503);}
}
