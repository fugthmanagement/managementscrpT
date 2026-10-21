import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync} from "node:crypto";
import {normalizeFirebasePrivateKey,resolveFirebaseAdminCredentials} from "../lib/server/firebase-admin-credentials.js";
const uid="fugthmanagement-89c84";
const email="firebase-adminsdk-test@"+uid+".iam.gserviceaccount.com";
const {privateKey}=generateKeyPairSync("rsa",{modulusLength:2048,privateKeyEncoding:{type:"pkcs8",format:"pem"},publicKeyEncoding:{format:"pem",type:"spki"}});
const raw=privateKey.trim();
const defaults={NEXT_PUBLIC_FIREBASE_PROJECT_ID:uid,FIREBASE_CLIENT_EMAIL:email};
const verify=(key,extra={})=>resolveFirebaseAdminCredentials({...defaults,FIREBASE_PRIVATE_KEY:key,...extra});
test("raw RSA service-account private key works",()=>{
 const result=verify(raw);
 assert.equal(result.ok,true);
 assert.equal(result.report.code,"firebase_admin_credentials_valid");
 assert.equal(result.credential.privateKey,raw);
});
test("Vercel literal newline escapes and CRLF are normalized before Admin initialization",()=>{
 const literal=raw.replace(/\n/g,"\\n");
 assert.equal(verify(literal).ok,true);
 assert.equal(verify(raw.replace(/\n/g,"\r\n")).ok,true);
 assert.equal(verify(JSON.stringify(literal)).ok,true);
 assert.equal(verify("'"+literal+"'").ok,true);
 assert.equal(normalizeFirebasePrivateKey(literal),raw);
});
test("partial or wrong PEM keys show actionable secret-safe codes",()=>{
 const results=[
  ["this is a web Firebase API key","firebase_private_key_format"],
  ["-----BEGIN PRIVATE KEY-----\\ninvalid\\n-----END PRIVATE KEY-----","firebase_private_key_invalid"],
  ["","firebase_credentials_incomplete"]
 ];
 for(const [key,code] of results){
  const result=verify(key);
  assert.equal(result.ok,false,"case "+code);
  assert.equal(result.report.code,code);
  assert.doesNotMatch(JSON.stringify(result.report),/invalid\\n-----END PRIVATE KEY/);
 }
});
test("different Firebase service account project is rejected before Firestore access",()=>{
 const wrong=verify(raw,{FIREBASE_CLIENT_EMAIL:"firebase-adminsdk-test@wrong-project.iam.gserviceaccount.com"});
 assert.equal(wrong.ok,false);
 assert.equal(wrong.report.code,"firebase_project_mismatch");
});
test("personal Gmail address is not a service-account credential",()=>{
 const wrong=verify(raw,{FIREBASE_CLIENT_EMAIL:"owner@gmail.com"});
 assert.equal(wrong.ok,false);
 assert.equal(wrong.report.code,"firebase_service_account_email_invalid");
});
test("complete service account JSON works without separate env keys",()=>{
 const account={type:"service_account",project_id:uid,client_email:email,
  private_key:raw,token_uri:"https://oauth2.googleapis.com/token"};
 const result=resolveFirebaseAdminCredentials({NEXT_PUBLIC_FIREBASE_PROJECT_ID:uid,
  FIREBASE_SERVICE_ACCOUNT:JSON.stringify(account)});
 assert.equal(result.ok,true);
 assert.equal(result.credential.projectId,uid);
 assert.equal(result.report.format,"service_account_json");
 assert.equal(JSON.stringify(result.report).includes("PRIVATE KEY"),false);
});
test("invalid service account JSON fails cleanly without sending its source back to browser",()=>{
 const result=resolveFirebaseAdminCredentials({FIREBASE_SERVICE_ACCOUNT:'{"private_key":"SENSITIVE'});
 assert.equal(result.ok,false);
 assert.equal(result.report.code,"firebase_service_account_json_invalid");
 assert.doesNotMatch(JSON.stringify(result.report),/SENSITIVE/);
});
test("no credential returns missing rather than initializing a fake Firestore connection",()=>{
 const result=resolveFirebaseAdminCredentials({});
 assert.equal(result.ok,false);
 assert.equal(result.report.code,"firebase_credentials_missing");
});
