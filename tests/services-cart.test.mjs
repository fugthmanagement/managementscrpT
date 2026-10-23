import test from "node:test";
import assert from "node:assert/strict";
import {makeServiceCart,ServiceCartError} from "../lib/billing-cart.js";
import {stripeCartLines,verifyWebsiteCartLines,verifiedStripeCartSubscription,TEXTBACK_LIVE_PRICE}
 from "../lib/server/stripe-cart.js";
test("one base plan and several paid upgrades are priced once in a single cart",()=>{
 const c=makeServiceCart({planKey:"starter",billingCycle:"monthly",addons:["email","analytics","email"]});
 assert.equal(c.count,3);
 assert.deepEqual(c.addons,["email","analytics"]);
 assert.equal(c.recurringCents,14900+12900+7900);
 assert.equal(c.firstChargeCents,c.recurringCents+100000);
 const items=stripeCartLines(c);
 assert.equal(items.length,4);
 assert.equal(items.filter(x=>x.price_data?.recurring).length,3);
 assert.equal(items.filter(x=>!x.price_data?.recurring).length,1);
});
test("yearly cart has one annual recurring charge per selected item and one-time setup",()=>{
 const c=makeServiceCart({planKey:"growth",billingCycle:"yearly",addons:["automation"]});
 assert.equal(c.recurringCents,(39900+9900)*12);
 assert.equal(c.firstChargeCents,(39900+9900)*12+200000);
 const lines=stripeCartLines(c);
 assert.equal(lines[0].price_data.recurring.interval,"year");
 assert.equal(lines[1].price_data.recurring.interval,"year");
 assert.equal(lines[2].price_data.recurring,undefined);
});
test("text-back can include website as a verified one-time item, without repeating it monthly",()=>{
 const c=makeServiceCart({planKey:"textback",billingCycle:"monthly",addons:[],websiteOneTime:true});
 assert.equal(c.firstChargeCents,4999+29900);
 const lines=stripeCartLines(c,{textbackPrice:TEXTBACK_LIVE_PRICE});
 assert.equal(lines.length,2);
 assert.equal(lines[0].price,TEXTBACK_LIVE_PRICE);
 assert.equal(lines[1].price_data.recurring,undefined);
 const mockLine={price:{currency:"usd",unit_amount:29900,recurring:null,product:{metadata:{
  brand:"fugth_management",kind:"website_one_time",planKey:"website_one_time"}}}};
 assert.equal(verifyWebsiteCartLines([mockLine]),true);
 assert.equal(verifyWebsiteCartLines([{price:{currency:"usd",unit_amount:29900,product:{metadata:{}}}}]),false);
});
test("standalone website remains a one-time Stripe payment",()=>{
 const c=makeServiceCart({planKey:"website_one_time",billingCycle:"monthly",addons:[]});
 assert.equal(c.mode,"payment");
 assert.equal(c.firstChargeCents,29900);
 assert.equal(stripeCartLines(c)[0].price_data.recurring,undefined);
});
test("invalid item/cycle combinations cannot reach Stripe",()=>{
 for(const s of [
  {planKey:"textback",billingCycle:"yearly"},
  {planKey:"website_one_time",addons:["email"]},
  {planKey:"growth",websiteOneTime:true},
  {planKey:"starter",addons:["fake_upgrade"]},
  {planKey:"starter",billingCycle:"every_decade"}
 ])assert.throws(()=>makeServiceCart(s),ServiceCartError);
});
test("founder amounts cannot be negative, fractional, or unsafe",()=>{
 assert.throws(()=>makeServiceCart({planKey:"starter"},{baseCents:12.5}),ServiceCartError);
 assert.throws(()=>makeServiceCart({planKey:"starter"},{setupCents:-1}),ServiceCartError);
});
test("unpaid or nonexistent addon lines never grant feature access",()=>{
 const c=makeServiceCart({planKey:"starter",addons:["email"]});
 const items=stripeCartLines(c).filter(x=>x.price_data?.recurring).map(x=>({
  price:{active:true,currency:"usd",unit_amount:x.price_data.unit_amount,
   recurring:x.price_data.recurring,product:{metadata:x.price_data.product_data.metadata,
    name:x.price_data.product_data.name}}}));
 const sub={metadata:{planKey:"starter",planTier:"starter",kind:"subscription",
  baseAmountCents:"14900",billingCycle:"monthly",addons:"email"},items:{data:items}};
 assert.deepEqual(verifiedStripeCartSubscription(sub,()=>null)?.addons,["email"]);
 sub.items.data.pop();
 assert.equal(verifiedStripeCartSubscription(sub,()=>null),null);
});
