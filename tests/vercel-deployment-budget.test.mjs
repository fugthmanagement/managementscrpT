import test from "node:test";
import assert from "node:assert/strict";
import {deploymentBudget,VERCEL_HOBBY_DEPLOYMENTS_PER_DAY} from "../lib/server/vercel-deployment-budget.js";
test("project count includes all builds in the rolling 24-hour window, including previews",()=>{
 const now=Date.parse("2026-10-22T17:40:00.000Z");
 const r=deploymentBudget([
  {created:now-1000,state:"READY"},
  {created:now-3600000,state:"CANCELED"},
  {created:now-86400001,state:"READY"}
 ],now);
 assert.equal(r.used,2);assert.equal(r.remaining,98);
 assert.equal(r.nextRollingReleaseAt,new Date(now-3600000+86400000).toISOString());
});
test("low remaining capacity makes release policy cautious",()=>{
 const now=Date.parse("2026-10-22T17:40:00.000Z");
 const rows=Array.from({length:99},(_,i)=>({created:now-i*1000}));
 const result=deploymentBudget(rows,now);
 assert.equal(VERCEL_HOBBY_DEPLOYMENTS_PER_DAY,100);
 assert.equal(result.used,99);
 assert.equal(result.remaining,1);
 assert.equal(result.low,true);
 assert.equal(result.canRelease,false);
});
