import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStarterSite,siteFields} from "../lib/site-presets.js";
import {composeFounderProspectSite,shuffleFounderDraft,matchingIndustryPalette} from "../lib/site-founder-quick-build.js";
import {demoAssistant,demoBusiness} from "../lib/server/voice-preview.js";
import {callerSpeechEvidence,voiceConversationHealth} from "../lib/server/voice-conversation-health.js";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Voice call is listening after the greeting: explicit speech-to-text, turn detection and conversational intake",()=>{
 const ctx=demoBusiness({businessName:"CHAMPS ELECTRIC INC",businessType:"electrician",
  businessDescription:"Wiring and EV chargers in Miami-Dade",services:["Panel upgrades","EV charger installations"],serviceArea:"Miami-Dade"});
 const assistant=demoAssistant(ctx,"balanced","schedule",30);
 assert.equal(assistant.transcriber.provider,"deepgram");
 assert.equal(assistant.transcriber.model,"nova-3");
 assert.equal(assistant.transcriber.language,"en");
 assert.ok(assistant.transcriber.endpointing>=100);
 assert.ok(assistant.startSpeakingPlan.waitSeconds>0);
 assert.ok(assistant.stopSpeakingPlan.numWords>0);
 assert.match(assistant.firstMessage,/CHAMPS ELECTRIC INC/);
 const prompt=assistant.model.messages[0].content;
 for(const fact of ["Panel upgrades","EV charger installations","Miami-Dade","first name","email",
   "service/problem","preferred date and time","REQUEST","not a confirmed booking","WAIT for the caller"]){
  // The service/problem is represented in natural wording, not fabricated.
  if(fact==="service/problem")assert.match(prompt,/service\/problem/);
  else if(fact==="preferred date and time")assert.match(prompt,/preferred date and time/);
  else if(fact==="not a confirmed booking")assert.match(prompt,/not a confirmed booking/i);
  else assert.ok(prompt.includes(fact),"missing "+fact);
 }
 assert.ok(assistant.artifactPlan.recordingEnabled);
 assert.ok(assistant.analysisPlan.structuredDataSchema.properties.email);
});
test("Post-call diagnostics distinguish missing caller transcript and real captured user speech",()=>{
 assert.deepEqual(voiceConversationHealth({status:"in-progress"}),{available:false,callerSpeechDetected:null,diagnostic:null});
 const call={status:"ended",endedReason:"silence-timed-out",artifact:{messages:[{role:"assistant",message:"Hello?"}]}};
 assert.equal(callerSpeechEvidence(call),false);
 assert.match(voiceConversationHealth(call).diagnostic,/silence/);
 assert.equal(callerSpeechEvidence({status:"ended",artifact:{messages:[{role:"user",message:"Can I book an appointment?"}]}}),true);
 assert.equal(voiceConversationHealth({status:"ended",transcript:"Caller: I need plumbing help"}).callerSpeechDetected,true);
});
test("Quick prospect factory preserves identity, business facts, photos and approved reviews",()=>{
 const original=buildStarterSite("founder12345678","CHAMPS ELECTRIC INC","electrician",
  {phone:"3055550138",contactEmail:"office@example.com"});
 original.heroImageId="fugth-upload-"+"a".repeat(32);
 original.testimonials=[{text:"Great work",author:"Owner approved",approved:true}];
 const p={id:"prospect12345",businessName:"CHAMPS ELECTRIC INC",website:"https://business.example.org"};
 const generated=composeFounderProspectSite(original,p);
 assert.equal(generated.template,"custom-canvas");
 assert.equal(generated.name,original.name);
 assert.equal(generated.phone,original.phone);
 assert.equal(generated.heroImageId,original.heroImageId);
 assert.deepEqual(generated.testimonials,original.testimonials);
 assert.equal(generated.prospectId,p.id);
 assert.equal(generated.showChatbot,true);
 assert.ok(generated.canvasBlocks.length>=5);
 const saved=siteFields(generated);
 assert.deepEqual(saved.canvasBlocks.map(b=>b.variant),generated.canvasBlocks.map(b=>b.variant));
 const changed=shuffleFounderDraft(generated);
 assert.equal(changed.phone,generated.phone);assert.equal(changed.heroImageId,generated.heroImageId);
});
test("Existing public website inspires visual structure and closest curated colors, not source content",()=>{
 const site=buildStarterSite("founder12345678","Example Plumbing","plumber");
 const original={...site,services:["Leak repair"],phone:"3055550177",contactEmail:"info@example.org"};
 const ref={sourceUrl:"https://old.example.org",layoutStyle:"immersive",paletteHint:"#0d3047",
  hasGallery:true,hasBooking:true,hasTestimonials:true,
  inspectedAt:"2026-10-24T06:30:00.000Z",title:"Untrusted source title",html:"<script>Do not copy</script>"};
 const result=composeFounderProspectSite(original,{id:"prospect_plumb",website:ref.sourceUrl},ref);
 assert.equal(result.canvasBlocks.find(b=>b.type==="hero").variant,"hero-full-bleed");
 assert.equal(result.referenceLayout.layoutStyle,"immersive");
 assert.equal(result.referenceLayout.sourceUrl,ref.sourceUrl);
 assert.ok(matchingIndustryPalette("plumber","#0d3047"));
 assert.deepEqual(result.services,original.services);
 assert.equal(result.contactEmail,original.contactEmail);
 assert.equal(result.phone,original.phone);
 assert.equal(JSON.stringify(result).includes(ref.html),false);
 assert.equal(JSON.stringify(result).includes(ref.title),false);
 assert.ok(!result.canvasBlocks.some(b=>b.type==="reviews")); // no manufactured reviews
});
test("Saved browser session uses Firebase local persistence and a single www origin, never a fake auth cookie",()=>{
 const persistence=source("lib/client/auth-persistence.js");
 const login=source("app/login/page.jsx");
 const mw=source("middleware.js");
 const health=source("components/browser-session-health.jsx");
 assert.match(persistence,/browserLocalPersistence/);
 assert.match(persistence,/setPersistence\(auth,browserLocalPersistence\)/);
 assert.match(login,/ensurePersistentLogin\(auth\)/);
 assert.match(login,/confirmPersistedLogin/);
 assert.match(mw,/www\.fugthmanagement\.space/);
 assert.match(mw,/NextResponse\.redirect\(redirect,308\)/);
 assert.match(health,/getIdToken\(\)/);
 assert.doesNotMatch(health,/document\.cookie\s*=|localStorage\.setItem/);
});
test("Only verified FUGTH founder manages website design after customer-site tab removal",()=>{
 const workspace=source("components/fugth-workspace.jsx");
 const site=source("app/sites/[uid]/page.jsx");
 const api=source("app/api/sites/[uid]/route.js");
 const maker=source("components/founder-prospect-site-maker.jsx");
 assert.doesNotMatch(workspace,/\{ id: "website", label: "Website"/);
 assert.match(workspace,/FounderProspectSiteMaker/);
 assert.doesNotMatch(site,/<SiteStudio/);
 assert.match(api,/!auth\.founder&&action!=="initialize"/);
 assert.match(maker,/Modernize existing/);
 assert.match(maker,/Save this version/);
 assert.match(maker,/beforeunload/);
 assert.match(maker,/fugth:website-preview/);
 assert.match(maker,/dirty/);
});
test("Receptionist status reports no-caller-speech warning without lying about confirmed bookings",()=>{
 const route=source("app/api/receptionist-preview/route.js");
 const ui=source("components/receptionist-preview.jsx");
 assert.match(route,/voiceConversationHealth\(call\)/);
 assert.match(route,/conversationHealth:health/);
 assert.match(route,/firebaseAdmin\(\)\.firestore\(\)/);
 assert.match(ui,/conversationHealth\.callerSpeechDetected/);
 assert.match(ui,/appointment.*request/);
});
