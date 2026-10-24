import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import net from "node:net";
import {firebaseAdmin} from "./auth";
/**
 * Founder-only Namecheap connection. Secret encrypted with the EXISTING
 * Vercel INTEGRATION_ENCRYPTION_KEY; never sent to the browser on GET.
 */
function key(){
 const value=String(process.env.INTEGRATION_ENCRYPTION_KEY||"");
 if(!/^[a-f0-9]{64}$/i.test(value))throw Error("INTEGRATION_ENCRYPTION_KEY is required for encrypted domain settings.");
 return Buffer.from(value,"hex");
}
const path=uid=>"users/"+uid+"/secretConfigs/namecheap";
function encrypt(data){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),"utf8"),cipher.final()]);
 return {version:1,iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:encrypted.toString("base64")};
}
function decrypt(record){
 const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(record.iv,"base64"));
 decipher.setAuthTag(Buffer.from(record.tag,"base64"));
 return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data,"base64")),decipher.final()]).toString("utf8"));
}
const ipv4=x=>net.isIP(x)===4&&!/^(?:127\.|0\.|169\.254\.)/.test(x);
const userName=x=>/^[a-zA-Z0-9_.-]{2,60}$/.test(x);
export function domainName(value){
 const domain=String(value||"").trim().toLowerCase().replace(/\.$/,"");
 const labels=domain.split(".");
 return labels.length>=2&&domain.length<=253&&labels.every(x=>x.length>0&&x.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x))
   &&/^[a-z]{2,63}$/.test(labels.at(-1))?domain:"";
}
export async function getNamecheapConfig(uid,{includeSecret=false}={}){
 const snap=await firebaseAdmin().firestore().doc(path(uid)).get();
 if(!snap.exists)return {configured:false,sandbox:true,apiUser:"",clientIp:"",lastUpdated:null,secretSource:"not_configured"};
 const data=snap.data();
 const result={configured:Boolean(data.encrypted),sandbox:data.sandbox!==false,apiUser:data.apiUser||"",
  clientIp:data.clientIp||"",lastUpdated:data.updatedAt||null,secretSource:"encrypted_firestore"};
 if(includeSecret&&data.encrypted){const secret=decrypt(data.encrypted);return {...result,apiKey:secret.apiKey}}
 return result;
}
export async function setNamecheapConfig(uid,settings){
 const apiUser=String(settings.apiUser||"").trim(),clientIp=String(settings.clientIp||"").trim(),apiKey=String(settings.apiKey||"").trim();
 if(!userName(apiUser))throw Object.assign(Error("Enter your Namecheap API username (2–60 valid characters)."),{status:400});
 if(!ipv4(clientIp))throw Object.assign(Error("Enter a public IPv4 egress address that Namecheap has allowlisted."),{status:400});
 if(apiKey&&!/^[^\s]{10,256}$/.test(apiKey))throw Object.assign(Error("The API key format appears invalid."),{status:400});
 const ref=firebaseAdmin().firestore().doc(path(uid)),snap=await ref.get();
 if(!apiKey&&!snap.data()?.encrypted)throw Object.assign(Error("Enter the Namecheap API key to configure this connection."),{status:400});
 await ref.set({apiUser,clientIp,sandbox:settings.sandbox!==false,
  ...(apiKey?{encrypted:encrypt({apiKey})}:{}),
  updatedAt:new Date().toISOString(),configuredBy:uid,version:1},{merge:true});
 return getNamecheapConfig(uid);
}
export async function clearNamecheapConfig(uid){
 await firebaseAdmin().firestore().doc(path(uid)).delete();
}
function xmlAttr(fragment,name){return [...String(fragment||"").matchAll(/([A-Za-z]+)="([^"]*)"/g)].find(x=>x[1]===name)?.[2]||"";}
export async function checkNamecheapDomain(uid,domain){
 const d=domainName(domain);if(!d)throw Object.assign(Error("Invalid domain name."),{status:400});
 const settings=await getNamecheapConfig(uid,{includeSecret:true});
 if(!settings.configured||!settings.apiKey)throw Object.assign(Error("Connect your encrypted Namecheap API credentials first."),{status:503});
 const endpoint=settings.sandbox?"https://api.sandbox.namecheap.com/xml.response":"https://api.namecheap.com/xml.response";
 const params=new URLSearchParams({ApiUser:settings.apiUser,ApiKey:settings.apiKey,
  UserName:settings.apiUser,ClientIp:settings.clientIp,Command:"namecheap.domains.check",DomainList:d});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const res=await fetch(endpoint,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:params,signal:controller.signal});
  if(!res.ok)throw Error("Namecheap API connection returned HTTP "+res.status);
  const xml=(await res.text()).slice(0,20000);
  if(!/Status="OK"/i.test(xml)||/<Errors>\s*<Error/i.test(xml))
   throw Error("Namecheap rejected the request. Verify API access, credentials, allowlisted static IPv4 and account eligibility.");
  const row=xml.match(/<DomainCheckResult\b[^>]*\/?>/i)?.[0];
  if(!row)throw Error("Namecheap did not return a domain availability result.");
  const available=xmlAttr(row,"Available")==="true",premium=xmlAttr(row,"IsPremiumName")==="true";
  const premiumPrice=Number(xmlAttr(row,"PremiumRegistrationPrice")||0);
  return {domain:d,available,premium,sandbox:settings.sandbox,
   ...(premium&&Number.isFinite(premiumPrice)?{premiumRegistrationPrice:premiumPrice}:{}),
   note:settings.sandbox?"Sandbox availability is not real availability. No purchase has occurred.":"Availability check only. This is not a final registration price or a purchase."};
 }finally{clearTimeout(timer)}
}
