import test from "node:test";
import assert from "node:assert/strict";
import {BILLING_PLANS,validAddons,dollars} from "../lib/billing-catalog.js";
import {normalizePlan,planLevel} from "../lib/plan-access.js";
test("standalone monthly text-back is 49.99 and doesn't grant receptionist/website entitlements",()=>{
 const plan=BILLING_PLANS.textback;
 assert.equal(plan.monthly,4999);
 assert.equal(plan.setup,0);
 assert.equal(plan.kind,"subscription");
 assert.deepEqual(plan.included,["textback"]);
 assert.equal(dollars(plan.monthly),"$49.99");
 assert.deepEqual(validAddons("textback",[]),[]);
 assert.equal(validAddons("textback",["sms"]),null);
 assert.equal(normalizePlan("textback"),"textback");
 assert.ok(planLevel("textback")<planLevel("website"));
});
