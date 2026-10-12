import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { firebaseAdmin } from "../../../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function digest(value){return createHash("sha256").update(value).digest("hex");}
const short=(v,max)=>String(v||"").slice(0,max);
export async function POST(req,{params}){
  const uid=params?.uid;
  const token=req.headers.get("x-fugth-integration-key")||"";
  if(!uid||!token||token.length>128||Number(req.headers.get("content-length")||0)>12000)return NextResponse.json({error:"Invalid request."},{status:400});
  try{
    const db=firebaseAdmin().firestore();
    const cred=await db.doc(`users/${uid}/integrations/inbound_webhook`).get();
    if(!cred.exists||!cred.data().enabled)return NextResponse.json({error:"Unknown connector."},{status:404});
    const expected=Buffer.from(cred.data().digest||"","hex");
    const provided=Buffer.from(digest(token),"hex");
    if(expected.length!==32||!timingSafeEqual(expected,provided))return NextResponse.json({error:"Invalid webhook credentials."},{status:401});
    const body=await req.json();
    const type=String(body.event_type||"lead.created");
    if(!["lead.created","appointment.requested"].includes(type))return NextResponse.json({error:"Unsupported event type."},{status:400});
    const businessName=short(body.business_name,120),contactName=short(body.contact_name,120),phone=short(body.phone,40),email=short(body.email,180),service=short(body.service,160),notes=short(body.notes,1000);
    if(!contactName&&!phone&&!email)return NextResponse.json({error:"Provide a name, phone number, or email."},{status:400});
    const record={
      businessName,contactName,phone,email,service,
      source:short(body.source||"External integration",80),
      priority:"warm",status:"new",value:0,
      notes:type==="appointment.requested"?("Appointment requested — confirmation required. "+notes):notes,
      integrationType:type,
      createdAt:firebaseAdmin().firestore.FieldValue.serverTimestamp(),
      updatedAt:firebaseAdmin().firestore.FieldValue.serverTimestamp(),
    };
    const collection=db.collection(`users/${uid}/leads`);
    const eventId=short(body.event_id,180);
    let ref;
    if(eventId){
      ref=collection.doc("ext_"+digest(eventId));
      try{await ref.create(record);}catch(err){if(err.code===6||err.code==="already-exists")return NextResponse.json({accepted:true,duplicate:true});throw err;}
    }else{ref=await collection.add(record);}
    return NextResponse.json({accepted:true,leadId:ref.id},{status:202});
  }catch{return NextResponse.json({error:"The connector could not process this event."},{status:500});}
}
