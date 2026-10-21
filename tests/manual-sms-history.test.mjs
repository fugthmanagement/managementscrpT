import test from "node:test";
import assert from "node:assert/strict";
import {canRecordPastText,canPrepareNewMarketingText} from "../lib/prospect-outreach-eligibility.js";
const p={id:"prospect_AAA000112233",phone:"(305) 555-0199",businessName:"Champs Electric",
  phoneMarketingOptIn:false,consentSource:"",websitePreviewUrl:""};
test("past texts can be recorded even with an unassigned website and no SMS marketing consent",()=>{
 assert.equal(canRecordPastText(p,p.phone),true);
 assert.equal(canPrepareNewMarketingText(p,{phoneValid:true,text:"A promotional message"}),false);
});
test("future marketing sends remain blocked for opted-out contacts",()=>{
 const opted={...p,phoneMarketingOptIn:true,consentSource:"Permission on 2026-10-21"};
 assert.equal(canPrepareNewMarketingText(opted,{phoneValid:true,text:"Your preview is ready"}),true);
 assert.equal(canPrepareNewMarketingText({...opted,smsOptOut:true},{phoneValid:true,text:"Your preview is ready"}),false);
});
test("history still requires a saved prospect and a plausible phone",()=>{
 assert.equal(canRecordPastText({...p,id:""},p.phone),false);
 assert.equal(canRecordPastText({...p,phone:"1234"},"1234"),false);
});
