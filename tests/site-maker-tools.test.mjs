import test from "node:test";
import assert from "node:assert/strict";
import {deterministicSitePlan,validateSiteActions,applySiteActions} from "../lib/site-edit-toolkit.js";
import {matchProspectPhotos} from "../lib/prospect-photo-matching.js";
import {buildStarterSite,siteFields} from "../lib/site-presets.js";
const site=siteFields(buildStarterSite("owner","Electrical Studio","contractor"));
test("ordinary founder color instruction yields existing button control",()=>{
 const list=deterministicSitePlan("Make the buttons purple",site);
 assert.ok(list.some(x=>x.field==="accentColor"&&x.value==="#7c3aed"));
 const changed=applySiteActions(site,list);
 assert.equal(changed.accentColor,"#7c3aed");
});
test("black and white design request sets only four safe preset color slots",()=>{
 const list=deterministicSitePlan("Give it a black and white theme",site);
 assert.ok(list.some(x=>x.field==="headerColor"&&x.value==="#171717"));
 assert.equal(applySiteActions(site,list).mainColor,"#ffffff"); // White is already set: no-op edits are omitted.
 assert.ok(list.every(x=>["headerColor","mainColor","accentColor","template"].includes(x.field)));
});
test("tools refuse arbitrary code or fabricated claims",()=>{
 const attempted=validateSiteActions([
  {field:"script",value:"alert(1)"},
  {field:"headline",value:"100% guaranteed fully licensed"},
  {field:"accentColor",value:"red; background:url(evil)"},
  {field:"template",value:"http://evil.invalid"},
  {field:"showFaq",value:"true"},
  {field:"showServices",value:false}
 ],site);
 assert.deepEqual(attempted.map(x=>x.field),["showServices"]);
});
test("approved exact text can update an editable headline without inventing new services",()=>{
 const list=deterministicSitePlan("Set the headline to 'Your project, clearly planned'",site);
 assert.equal(list[0].field,"headline");
 assert.equal(list[0].value,"Your project, clearly planned");
});
test("business photo matching refuses other clients' files even if industry matches",()=>{
 const one="fugth-upload-"+("a".repeat(32)),other="fugth-upload-"+("b".repeat(32));
 const match=matchProspectPhotos({businessName:"Electric Bay",industry:"Electrical"},[
  {id:other,folder:"Different Company",industry:"Electrical",tags:["hero"],rightsConfirmed:true},
  {id:one,folder:"Electric Bay",industry:"Electrical",tags:["hero","electrician"],rightsConfirmed:true}
 ]);
 assert.equal(match.heroImageId,one);
 assert.equal(match.matched,1);
});
test("unconfirmed photo license does not auto-insert image",()=>{
 const result=matchProspectPhotos({businessName:"Electric Bay"},[
  {id:"fugth-upload-"+("a".repeat(32)),folder:"Electric Bay",rightsConfirmed:false}
 ]);
 assert.equal(result.matched,0);
});
