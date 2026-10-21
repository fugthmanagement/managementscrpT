import test from "node:test";
import assert from "node:assert/strict";
import {listFounderDemos,firestoreDemoFailure} from "../lib/server/prospect-demos-directory.js";

const founderId="founder_test";
const document=(id,owner,createdAt="2026-10-21T12:00:00.000Z")=>({
 id,
 data:()=>({founderId:owner,name:id,createdAt})
});
function primaryStore(docs=[]){
 const state={limit:0,where:null};
 const collection={
  where(field,operator,value){state.where=[field,operator,value];return this},
  limit(n){state.limit=n;return this},
  async get(){return {docs,size:docs.length}}
 };
 return {state,db:{collection:()=>collection}};
}

test("returns only verified owner's previews even from an indexed query",async()=>{
 const a=primaryStore([document("ours",founderId),document("private","another-founder")]);
 const result=await listFounderDemos(a.db,founderId);
 assert.deepEqual(result.demos.map(x=>x.id),["ours"]);
 assert.deepEqual(a.state.where,["founderId","==",founderId]);
 assert.equal(result.source,"founder_index");
});
test("no demos after successful Firestore query is a true empty directory",async()=>{
 const a=primaryStore([]);
 const result=await listFounderDemos(a.db,founderId);
 assert.equal(result.demos.length,0);
 assert.equal(result.partial,false);
});
test("missing founderId index falls back to bounded private owner-filtered scan",async()=>{
 let called=0;
 const docs=[document("private-one","other-founder"),document("mine",founderId)];
 const db={collection:()=>({
  where(){return {limit(){return {get:async()=>{throw Object.assign(Error("The query requires an index"),{code:9})}}}}},
  orderBy(key){assert.equal(key,"__name__");called++;return {
   limit(){return {get:async()=>({docs,size:docs.length})}}
  }}
 })};
 const result=await listFounderDemos(db,founderId);
 assert.equal(called,1);
 assert.deepEqual(result.demos.map(x=>x.id),["mine"]);
 assert.equal(result.source,"bounded_owner_scan");
 assert.match(result.warning,/private owner-filtered/i);
});
test("permission denied never triggers a cross-tenant recovery scan",async()=>{
 let scanned=false;
 const db={collection:()=>({
  where(){return {limit(){return {get:async()=>{throw Object.assign(Error("Permission denied"),{code:7})}}}}},
  orderBy(){scanned=true;throw Error("must not scan")}
 })};
 await assert.rejects(()=>listFounderDemos(db,founderId),{code:7});
 assert.equal(scanned,false);
 const issue=firestoreDemoFailure({code:7,message:"Permission denied"});
 assert.equal(issue.code,"firestore_permission_denied");
});
test("error descriptions never return private error messages",()=>{
 const raw="PRIVATE_TOKEN_SHOULD_NEVER_LEAK";
 const failure=firestoreDemoFailure({code:13,message:raw});
 assert.equal(failure.code,"firestore_demo_read_failed");
 assert.doesNotMatch(JSON.stringify(failure),new RegExp(raw));
});
