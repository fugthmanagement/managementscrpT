import test from "node:test";
import assert from "node:assert/strict";
import {isPreviewId,isProspectId,stableProspectPreviewId,previewSiteUrl,previewOwnedBy}
 from "../lib/server/prospect-preview-ids.js";

const owner="FirebaseOwnerExample1234",lead="businessProspect12345";
test("Both prospect Site Maker and linked demo builder share the same stable ID",()=>{
 const id=stableProspectPreviewId(owner,lead);
 assert.match(id,/^[a-f0-9]{24}$/);
 assert.equal(stableProspectPreviewId(owner,lead),id);
 assert.equal(previewSiteUrl(id),"https://www.fugthmanagement.space/demo/site/"+id);
});
test("Different prospects and founders cannot receive the same stable link",()=>{
 const id=stableProspectPreviewId(owner,lead);
 assert.notEqual(id,stableProspectPreviewId(owner,"otherProspect12345"));
 assert.notEqual(id,stableProspectPreviewId("DifferentFounder1234",lead));
});
test("A preview is reusable only for its exact founder and prospect",()=>{
 const record={founderId:owner,prospectId:lead};
 assert.equal(previewOwnedBy(record,owner,lead),true);
 assert.equal(previewOwnedBy(record,owner,"otherProspect12345"),false);
 assert.equal(previewOwnedBy(record,"DifferentFounder1234",lead),false);
});
test("Invalid preview identifiers never produce public links",()=>{
 assert.equal(isPreviewId("hello"),false);
 assert.equal(previewSiteUrl("not-a-doc-path"),"");
 assert.equal(isProspectId("../../others"),false);
 assert.throws(()=>stableProspectPreviewId(owner,"../../others"));
});
