import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generateProceduralSite,randomizeProceduralSite,variantCount,
 layoutCombinationCount,validateVariant,PROCEDURAL_VARIANTS} from "../lib/site-procedural-engine.js";
import {siteFields,buildStarterSite} from "../lib/site-presets.js";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Procedural component library supplies real layout variants without AI calls",()=>{
 assert.ok(variantCount>=30);assert.ok(layoutCombinationCount>100);
 assert.equal(validateVariant("hero","hero-full-bleed"),"hero-full-bleed");
 assert.notEqual(validateVariant("hero","arbitrary-html"),"arbitrary-html");
 assert.ok(PROCEDURAL_VARIANTS.reviews.length>=3);
});
test("Deterministic design generation preserves original business facts and is reproducible",()=>{
 const original=buildStarterSite("uid123456789","Jack's Electric","electrician",
  {phone:"3055550000",contactEmail:"test@example.org"});
 const prospect={id:"prospect12345"};
 const a=generateProceduralSite(original,prospect),b=generateProceduralSite(original,prospect);
 assert.deepEqual(a,b);
 assert.equal(a.name,original.name);assert.equal(a.phone,original.phone);
 assert.equal(a.contactEmail,original.contactEmail);
 assert.equal(a.template,"custom-canvas");assert.ok(a.canvasBlocks.length>=5);
 assert.match(a.designTokens.accent,/^#[0-9a-f]{6}$/);
 assert.ok(a.canvasBlocks.every(x=>x.variant));
});
test("Randomizing individual section never changes adjacent sections, business copy or palette",()=>{
 const original=generateProceduralSite(buildStarterSite("uid123456789","Trade Co","plumber"),{id:"prospect12345"});
 const id=original.canvasBlocks[0].id;
 const updated=randomizeProceduralSite(original,id);
 assert.notEqual(updated.canvasBlocks[0].variant,original.canvasBlocks[0].variant);
 assert.deepEqual(updated.canvasBlocks.slice(1),original.canvasBlocks.slice(1));
 assert.deepEqual(updated.designTokens,original.designTokens);
 assert.equal(updated.name,original.name);
});
test("Manual testimonials only display after explicit approval; never fabricate reviews",()=>{
 const site=buildStarterSite("uid123456789","FUGTH Example","electrician");
 const a=generateProceduralSite(site,{testimonials:[{text:"Not approved",approved:false}]});
 assert.ok(!a.canvasBlocks.some(x=>x.type==="reviews"));
 const b=generateProceduralSite(site,{googleMapsUrl:"https://maps.google.com/place/test"});
 assert.ok(b.canvasBlocks.some(x=>x.type==="reviews"));
 const fields=siteFields({...b,testimonials:[{author:"Sam",text:"Nice service",approved:true},
  {author:"Bad",text:"False",approved:false}]});
 assert.equal(fields.testimonials.length,1);
 assert.equal(fields.testimonials[0].author,"Sam");
});
test("Shared prospect is founder-scoped and channels remain separate",()=>{
 const store=source("lib/client/active-prospect.js");
 const sales=source("components/founder-sales-desk.jsx");
 for(const path of ["components/founder-cold-call.jsx","components/founder-text-desk.jsx",
  "components/founder-email-outreach.jsx","components/founder-prospect-demos.jsx"]){
   assert.match(source(path),/useActiveProspect/);
 }
 assert.match(store,/fugth:active-prospect/);
 assert.match(store,/KEY\(uid\)/);
 assert.match(sales,/FounderActiveProspectBar/);
 assert.match(sales,/Pierre’s Call Map/);
 assert.match(sales,/"sms","SMS Outreach"/);
 assert.match(sales,/"email","Email Outreach"/);
});
test("Visual source inspector stores structural hints only and is founder-scoped",()=>{
 const audit=source("lib/server/gguf-site-audit.js");
 const route=source("app/api/dev/prospect-layout/route.js");
 assert.match(audit,/inspectPublicSiteLayout/);
 assert.match(audit,/requestSite\(current\)/);
 assert.match(route,/isFounder\(actor\)/);
 assert.match(route,/structure/i);
 assert.doesNotMatch(route,/tx\.set\(|\.doc\([^)]*\)\.set\(/);
});
test("Domain buying and publishing are locked behind verification, keys are encrypted",()=>{
 const api=source("app/api/dev/domain-launch/route.js");
 const cfg=source("lib/server/namecheap-domains.js");
 assert.match(api,/action==="purchase"\|\|action==="publish"/);
 assert.match(api,/launch_gates_incomplete/);
 assert.match(api,/staged_unpublished/);
 assert.match(cfg,/aes-256-gcm/);
 assert.match(cfg,/INTEGRATION_ENCRYPTION_KEY/);
 assert.doesNotMatch(api,/namecheap\.domains\.create/);
});
test("Business Hub syncs only to draft preview, never auto-publishes a customer's website",()=>{
 const profile=source("app/api/dev/prospect-profile/route.js");
 const maker=source("components/founder-prospect-site-maker.jsx");
 const admin=source("components/fugth-workspace.jsx");
 assert.match(profile,/prospectDemos\//);
 assert.doesNotMatch(profile,/publicSites\//);
 assert.match(maker,/FounderProspectBusinessHub/);
 assert.match(maker,/FounderSiteReferenceInspector/);
 assert.match(admin,/FounderDomainLaunch/);
 assert.match(admin,/Accounts & websites/);
 assert.match(admin,/Sales & AI tools/);
 assert.match(admin,/Platform & billing/);
});
