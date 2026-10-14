import {NextResponse} from "next/server";
import {firebaseAdmin} from "../../../../lib/server/auth";
import {validUnsubscribeToken} from "../../../../lib/server/email-marketing";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const validate=request=>{
 const p=new URL(request.url).searchParams;
 const uid=p.get("uid")||"",contact=p.get("contact")||"",token=p.get("token")||"";
 return validUnsubscribeToken(uid,contact,token)?{uid,contact}:null;
};
const page=(message,status=200,action="")=>new Response(
 '<!DOCTYPE html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>FUGTH email preferences</title><body style="font:16px system-ui;max-width:520px;margin:70px auto;padding:24px;color:#294532">'+
 '<h1>Email preferences</h1><p>'+message+'</p>'+
 (action?'<form method="post" action="'+action+'"><button type="submit" style="padding:12px 20px;background:#2c5338;color:white;border:0;border-radius:9px">Unsubscribe from marketing emails</button></form>':"")+
 '</body></html>',{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}}
);
export async function GET(request){
 const id=validate(request);
 if(!id)return page("This unsubscribe link is invalid or has expired.",400);
 const url=new URL(request.url);
 return page("You can stop promotional emails from this business. This will not affect essential appointment or account notices.",200,url.pathname+url.search);
}
export async function POST(request){
 const id=validate(request);
 if(!id)return page("This unsubscribe link is invalid.",400);
 try{
  const ref=firebaseAdmin().firestore().doc("users/"+id.uid+"/leads/"+id.contact);
  const existing=await ref.get();
  if(!existing.exists)return page("This contact no longer exists in the mailing list.");
  await ref.set({marketingOptIn:false,unsubscribed:true,unsubscribedAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{merge:true});
  return page("You have been unsubscribed from promotional email campaigns. No further action is needed.");
 }catch{return page("Unable to update your preferences right now. Please try again later.",503);}
}
