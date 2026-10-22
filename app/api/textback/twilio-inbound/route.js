import {createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {firebaseAdmin} from "../../../../lib/server/auth";
import {phoneE164} from "../../../../lib/missed-call-textback";
import {phoneHash} from "../../../../lib/server/missed-call-textback";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const xml=(status=200)=>new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>",{
 status,headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"no-store"}
});
function verifyTwilio(req,body,authToken){
 const signed=req.headers.get("x-twilio-signature")||"";
 if(!signed)return false;
 const base=String(process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space").replace(/\/+$/,"");
 const url=base+"/api/textback/twilio-inbound";
 const form=new URLSearchParams(body);
 const params=[...new Set([...form.keys()])].sort();
 const payload=url+params.map(k=>k+form.get(k)).join("");
 const expected=createHmac("sha1",authToken).update(payload).digest("base64");
 const left=Buffer.from(expected),right=Buffer.from(signed);
 return left.length===right.length&&timingSafeEqual(left,right);
}
export async function POST(req){
 const token=process.env.TWILIO_AUTH_TOKEN,fromConfigured=phoneE164(process.env.TWILIO_FROM_NUMBER);
 const uid=process.env.FUGTH_MESSAGING_OWNER_UID||"";
 if(!token||!fromConfigured||!/^[A-Za-z0-9_-]{8,128}$/.test(uid))return xml(503);
 let body;
 try{body=await req.text();if(body.length>5000)return xml(413)}
 catch{return xml(400)}
 if(!verifyTwilio(req,body,token))return xml(403);
 const params=new URLSearchParams(body);
 const from=phoneE164(params.get("From")),to=phoneE164(params.get("To"));
 const msgId=String(params.get("MessageSid")||params.get("SmsSid")||"");
 if(!from||to!==fromConfigured||!/^SM[a-z0-9]{32}$/i.test(msgId))return xml(400);
 const text=String(params.get("Body")||"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,1200);
 const command=text.split(/\s+/)[0]?.toUpperCase();
 const h=phoneHash(from,process.env.INTEGRATION_ENCRYPTION_KEY||uid);
 try{
  const db=firebaseAdmin().firestore(),now=new Date().toISOString();
  const conversation=db.doc("users/"+uid+"/smsConversations/"+h+"/messages/"+msgId);
  const existing=await conversation.get();
  if(existing.exists)return xml();
  await conversation.create({direction:"inbound",source:"twilio",from,to,text,
   receivedAt:now,smsId:msgId});
  if(["STOP","STOPALL","UNSUBSCRIBE","CANCEL","END","QUIT"].includes(command))
   await db.doc("users/"+uid+"/smsOptOuts/"+h).set({suppressed:true,updatedAt:now,source:"carrier_stop"},{merge:true});
  if(["START","UNSTOP"].includes(command))
   await db.doc("users/"+uid+"/smsOptOuts/"+h).set({suppressed:false,updatedAt:now,source:"carrier_start"},{merge:true});
  return xml();
 }catch{return xml(503)}
}
