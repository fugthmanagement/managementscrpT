import {createHmac,timingSafeEqual} from "node:crypto";
export const EMAIL_BATCH_SIZE=10;
export const EMAIL_DAILY_LIMIT=50;
const secret=()=>{
 const s=process.env.MARKETING_UNSUBSCRIBE_SECRET||process.env.INTEGRATION_ENCRYPTION_KEY;
 if(!s||s.length<32)throw Error("Marketing unsubscribe secret not configured.");
 return s;
};
export function unsubscribeToken(uid,contactId){
 return createHmac("sha256",secret()).update(uid+":"+contactId).digest("hex");
}
export function validUnsubscribeToken(uid,contactId,token){
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid)||!/^.{8,128}$/.test(contactId)||!/^[a-f0-9]{64}$/.test(token||""))return false;
 const expected=Buffer.from(unsubscribeToken(uid,contactId),"hex"),supplied=Buffer.from(token,"hex");
 return timingSafeEqual(expected,supplied);
}
export function optoutUrl(uid,contactId){
 const base=process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space";
 return new URL("/api/marketing/unsubscribe?uid="+encodeURIComponent(uid)+"&contact="+encodeURIComponent(contactId)+"&token="+unsubscribeToken(uid,contactId),base).toString();
}
export function mimeMessage({to,from,business,subject,text,unsubscribe}){
 const safety=v=>String(v||"").replace(/[\r\n]/g," ").slice(0,180);
 const safeFrom=safety(from).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)?.[0];
 const safeTo=safety(to).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)?.[0];
 if(!safeFrom||!safeTo)throw Error("Invalid email header.");
 const encode=v=>"=?UTF-8?B?"+Buffer.from(safety(v)).toString("base64")+"?=";
 const body=String(text||"").slice(0,9000)+
  "\n\n— "+safety(business)+
  "\nTo stop receiving promotional emails, unsubscribe: "+unsubscribe;
 const headers=[
  "From: "+encode(business)+" <"+safeFrom+">",
  "To: "+safeTo,
  "Subject: "+encode(subject),
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: base64",
  "List-Unsubscribe: <"+unsubscribe+">",
  "List-Unsubscribe-Post: List-Unsubscribe=One-Click"
 ];
 const base64Body=Buffer.from(body,"utf8").toString("base64").replace(/.{1,76}/g,"$&\r\n");
 return Buffer.from(headers.join("\r\n")+"\r\n\r\n"+base64Body,"utf8").toString("base64url");
}
