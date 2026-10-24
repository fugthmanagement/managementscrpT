import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeUsSmsNumber,isAppleMobile,isMobileDevice,smsComposeHref,
 smsRecipientHref,hasMessagingPermission} from "../lib/client/sms-compose.js";
import {canPrepareNewMarketingText,canRecordPastText} from "../lib/prospect-outreach-eligibility.js";
const source=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const prospect={id:"prospect_1234567890",phone:"(305) 555-0199",
 businessName:"CHAMPS ELECTRIC INC",phoneMarketingOptIn:true,
 consentSource:"Asked for a preview on a verified call",websitePreviewUrl:"https://www.fugthmanagement.space/demo/site/abc",
 smsSentCount:0};
test("iPhone creates an individual Messages URL and encodes message without automatically sending",()=>{
 assert.equal(isAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)"),true);
 assert.equal(isMobileDevice("Android 15"),true);
 assert.equal(normalizeUsSmsNumber("(305) 555-0199"),"+13055550199");
 const msg="Hi Pierre! Preview: https://www.fugthmanagement.space/demo/site/abc?x=1&y=2";
 const href=smsComposeHref(prospect.phone,msg,"iPhone");
 assert.equal(href,"sms:+13055550199&body="+encodeURIComponent(msg));
 assert.equal(smsComposeHref(prospect.phone,msg,"Android"),"sms:+13055550199?body="+encodeURIComponent(msg));
 assert.equal(smsRecipientHref(prospect.phone),"sms:+13055550199");
 assert.equal(smsComposeHref(prospect.phone,"","iPhone"),"sms:+13055550199");
});
test("Reject malformed and non-US telephone numbers; no foreign destination is created",()=>{
 for(const number of ["","12345","011 44 20 7946 0958","+442079460958","555-1212"]){
  assert.equal(normalizeUsSmsNumber(number),"");
  assert.equal(smsComposeHref(number,"Hello","iPhone"),"");
 }
});
test("Suppression and consent still gate creating a new marketing text",()=>{
 assert.equal(hasMessagingPermission(prospect),true);
 assert.equal(canRecordPastText(prospect,prospect.phone),true);
 assert.equal(canPrepareNewMarketingText(prospect,{phoneValid:true,text:"Here is your website preview",previewValid:true,needsPreview:true}),true);
 for(const blocked of [
  {...prospect,phoneMarketingOptIn:false},{...prospect,doNotCall:true},
  {...prospect,smsOptOut:true},{...prospect,unsubscribed:true},{...prospect,status:"do_not_call"}
 ]){
  assert.equal(hasMessagingPermission(blocked),false);
  assert.equal(canPrepareNewMarketingText(blocked,{phoneValid:true,text:"New promotion"}),false);
 }
});
test("iPhone quick actions are explicit manual draft, launch and sent confirmation",()=>{
 const dispatch=source("components/founder-text-dispatch.jsx");
 assert.match(dispatch,/smsComposeHref/);
 assert.match(dispatch,/isAppleMobile/);
 assert.match(dispatch,/navigator\.userAgent/);
 assert.match(dispatch,/Open Messages/);
 assert.match(dispatch,/Copy draft/);
 assert.match(dispatch,/onClick=\{markSent\}/);
 assert.match(dispatch,/lastLogged===draftId/);
 assert.match(dispatch,/status:"sent_manual"/);
 assert.match(dispatch,/visibilitychange/);
 assert.match(dispatch,/safe-area-inset-bottom/);
 assert.doesNotMatch(dispatch,/stripe\.checkout\.sessions/);
});
test("Mobile finder keeps Pierre call map plus separated SMS and email and active prospect",()=>{
 const sales=source("components/founder-sales-desk.jsx");
 const sms=source("components/founder-text-desk.jsx");
 const workspace=source("components/fugth-workspace.jsx");
 assert.match(sales,/Pierre’s Call Map/);
 assert.match(sales,/Quick mobile sales navigation/);
 assert.match(sales,/onTabChange/);
 assert.match(sms,/Next eligible prospect/);
 assert.match(sms,/SMS ready/);
 assert.match(sms,/id="fugth-sms-send"/);
 assert.match(sms,/phoneMarketingOptIn===true/);
 assert.match(workspace,/onOpenSms/);
 assert.match(workspace,/Founder operations/);
 assert.match(workspace,/onTabChange=\{setLastSalesTab\}/);
});
test("Manually confirmed SMS events appear in shared prospect activity; delivery not fabricated",()=>{
 const route=source("app/api/dev/text-history/route.js");
 const hub=source("components/founder-prospect-business-hub.jsx");
 assert.match(route,/sms_marked_sent/);
 assert.match(route,/sms_history_corrected/);
 assert.match(route,/verifiedDelivery:false/);
 assert.match(route,/prospectRef\.collection\("events"\)/);
 assert.match(hub,/SMS marked sent manually/);
 assert.match(hub,/textPreview/);
});
