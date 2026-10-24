import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canvasIndustryRecipe,industryCanvasBlocks,newCanvasBlock,newCanvasSite,sanitizeCanvasBlocks} from "../lib/site-canvas.js";
import {buildStarterSite,siteFields,detectIndustry,getIndustry} from "../lib/site-presets.js";
import {getIndustryPhotos,getSiteImage} from "../lib/site-images.js";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("electrical and plumbing websites are their own industry, not generic contractor",()=>{
 assert.equal(detectIndustry("Residential electrician"),"electrician");
 assert.equal(detectIndustry("Electrical panel service"),"electrician");
 assert.equal(detectIndustry("Plumbing and drain cleaning"),"plumber");
 assert.equal(getIndustry("electrician").id,"electrician");
 assert.equal(getIndustry("plumber").id,"plumber");
 assert.match(canvasIndustryRecipe("electrician").services.join(" "),/EV charger/i);
 assert.match(canvasIndustryRecipe("plumber").services.join(" "),/water heater/i);
 assert.ok(getIndustryPhotos("electrician").length>0);
 assert.ok(getIndustryPhotos("plumber").length>0);
 assert.notEqual(getSiteImage(null,"electrician").id,"fg-general-office");
});
test("a unique blank layout or industry blueprint is available without changing the published version",()=>{
 const original=buildStarterSite("founder123456789","Demo Electric","electrician");
 const draft=newCanvasSite(original,"electrician");
 assert.equal(original.template,"field-pro");
 assert.equal(draft.template,"custom-canvas");
 assert.ok(draft.canvasBlocks.length>4);
 assert.notDeepEqual(industryCanvasBlocks("electrician"),industryCanvasBlocks("salon"));
 const blank=newCanvasSite(original,"electrician",{blank:true});
 assert.deepEqual(blank.canvasBlocks.map(x=>x.type),["hero","contact"]);
});
test("sanitizer persists custom blocks safely while removing unknown markup and oversized payloads",()=>{
 const original=buildStarterSite("founder123456789","Trade Test","electrician");
 const draft=newCanvasSite(original,"electrician");
 const injected={id:"service-unique",type:"services",title:"<script>alert(1)</script>",body:"<b>Real service</b>",items:Array(30).fill("<bad>tag</bad>".repeat(30)),style:"unsupported",enabled:true};
 const fields=siteFields({...draft,canvasBlocks:[injected,{...injected},newCanvasBlock("process","second", "electrician"),{id:"fake",type:"html",title:"Unsafe"}]});
 assert.equal(fields.template,"custom-canvas");
 assert.equal(fields.industry,"electrician");
 assert.equal(fields.canvasBlocks.length,2);
 assert.doesNotMatch(fields.canvasBlocks[0].title,/[<>]/);
 assert.ok(fields.canvasBlocks[0].items.length<=6);
 assert.ok(fields.canvasBlocks[0].items.every(x=>x.length<=90));
 assert.equal(fields.canvasBlocks[0].style,"split");
 assert.ok(JSON.stringify(fields).length<48000);
});
test("legacy templates stay on their original renderer and do not get a custom block payload",()=>{
 const normal=siteFields(buildStarterSite("founder123456789","Dental Test","dental"));
 assert.equal(normal.template,"care-pro");
 assert.equal(Object.hasOwn(normal,"canvasBlocks"),false);
});
test("prospect and customer publishing share one custom site sanitizer",()=>{
 const render=source("components/site-renderer.jsx");
 const preview=source("app/sites/preview-canvas/page.jsx");
 const prospect=source("app/api/dev/prospect-site/route.js");
 const account=source("app/api/sites/[uid]/route.js");
 const canvas=source("components/site-canvas-editor.jsx");
 assert.match(render,/"custom-canvas":SiteCustomCanvas/);
 assert.match(preview,/siteFields\(raw\)/);
 assert.match(prospect,/siteFields\(\{\.\.\.current\.site,\.\.\.body\.site\}\)/);
 assert.match(account,/siteFields\(data\)/);
 assert.match(canvas,/start\(true\)/);
 assert.match(canvas,/Save custom design/);
});
test("Private site previews are readable but website edits are founder managed",()=>{
 const page=source("app/sites/[uid]/page.jsx");
 const api=source("app/api/sites/[uid]/route.js");
 assert.match(page,/if\(preview&&user\)/);
 assert.match(page,/ownerPreview=page.preview&&page.owner/);
 assert.doesNotMatch(page,/<SiteStudio/);
 assert.match(api,/user.uid!==uid&&!isFounder\(user\)/);
 assert.match(api,/if\(!auth\.founder\)/);
});
test("saved prospect links still open when the prospect list is paginated, without stale business details",()=>{
 const list=source("components/founder-prospect-demos.jsx");
 const maker=source("components/founder-prospect-site-maker.jsx");
 assert.match(list,/onOpenSiteMaker\(p\|\|\{id:r\.prospectId/);
 assert.ok(maker.includes('setSite(null);setProspect(null);setPreviewUrl("");setPreviewId("")'));
 assert.ok(maker.includes('setRevision(null);setPreviewStatus("checking");setPreviewError("")'));
});

test("Spanish preview cannot erase an unknown custom canvas hero heading",()=>{
 const page=source("app/demo/site/[id]/page.jsx");
 assert.match(page,/\|\|state\.site\?\.headline/);
});
