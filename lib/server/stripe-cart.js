import {BILLING_ADDONS,BILLING_PLANS,addonAmount} from "../billing-catalog.js";
export const TEXTBACK_LIVE_PRICE="price_1UTPooHGcNIhcRMjPDGqXQXf";
/** Match exact Stripe-created product and price, not client-submitted claims. */
export function stripeCartLines(cart,{textbackPrice=null}={}){
 const key=cart.planKey;
 const isStatic=key==="textback"&&!!textbackPrice;
 const line_items=[isStatic?{price:textbackPrice,quantity:1}:{
  price_data:{currency:"usd",unit_amount:cart.baseCents*cart.multiplier,
   ...(cart.mode==="subscription"?{recurring:{interval:cart.interval}}:{}),
   product_data:{name:"FUGTH "+cart.plan.name,
    metadata:{brand:"fugth_management",planKey:key,kind:cart.plan.kind}}},
  quantity:1
 }];
 for(const addon of cart.addonLines){
  line_items.push({price_data:{currency:"usd",unit_amount:addon.amountCents,
   recurring:{interval:cart.interval},
   product_data:{name:"FUGTH add-on — "+addon.label,
    metadata:{brand:"fugth_management",kind:"addon",addonKey:addon.id}}},quantity:1});
 }
 if(cart.setupCents>0)line_items.push({price_data:{currency:"usd",unit_amount:cart.setupCents,
  product_data:{name:"FUGTH "+cart.plan.name+" one-time onboarding",
   metadata:{brand:"fugth_management",kind:"setup"}}},quantity:1});
 if(cart.websiteOneTime)line_items.push({price_data:{currency:"usd",
  unit_amount:BILLING_PLANS.website_one_time.monthly,
  product_data:{name:"FUGTH One-time Website",metadata:{brand:"fugth_management",
   kind:"website_one_time",planKey:"website_one_time"}}},quantity:1});
 return line_items;
}
const priceOf=line=>line?.price||{};
const productOf=line=>typeof priceOf(line).product==="object"?priceOf(line).product:{};
export function isVerifiedWebsiteLine(line){
 const price=priceOf(line),product=productOf(line),meta=product.metadata||{};
 return price.currency==="usd"&&price.unit_amount===BILLING_PLANS.website_one_time.monthly&&
   !price.recurring&&meta.brand==="fugth_management"&&
   meta.planKey==="website_one_time"&&
   ["website_one_time","one_time"].includes(meta.kind);
}
export function verifyWebsiteCartLines(lines){
 return Array.isArray(lines)&&lines.some(isVerifiedWebsiteLine);
}
export function verifiedRecurringAddons(sub){
 const meta=sub.metadata||{},raw=String(meta.addons||"").split(",").filter(Boolean);
 const unique=[...new Set(raw)],cycle=meta.billingCycle==="yearly"?"yearly":"monthly";
 if(raw.length!==unique.length)return null;
 const key=meta.planKey;
 const multiplier=cycle==="yearly"?12:1;
 if(unique.some(id=>!BILLING_ADDONS[id]||!(addonAmount(key,id)>0)))return null;
 for(const id of unique){
  const expected=addonAmount(key,id)*multiplier,interval=cycle==="yearly"?"year":"month";
  const name="FUGTH add-on — "+BILLING_ADDONS[id].name;
  const exists=(sub.items?.data||[]).some(line=>{
   const price=priceOf(line),product=productOf(line),mark=product.metadata||{};
   return price.currency==="usd"&&price.active!==false&&price.unit_amount===expected&&
    price.recurring?.interval===interval&&(mark.brand==="fugth_management"&&mark.addonKey===id||
      /* Older FUGTH-created Stripe products lacked explicit add-on metadata. */
      product.name===name);
  });
  if(!exists)return null;
 }
 return unique;
}
/** Return null rather than activate a subscription with an unverified price. */
export function verifiedStripeCartSubscription(sub,priceDetails){
 const meta=sub.metadata||{},plan=BILLING_PLANS[meta.planKey];
 const cycle=meta.billingCycle==="yearly"?"yearly":"monthly";
 const amount=Number(meta.baseAmountCents);
 const lines=sub.items?.data||[];
 let matched=null;
 if(plan?.kind==="subscription"&&meta.kind==="subscription"&&meta.planTier===plan.tier&&
    Number.isSafeInteger(amount)&&amount>0){
  const base=lines.some(line=>{
   const price=priceOf(line),product=productOf(line),marks=product.metadata||{};
   const staticTextback=meta.planKey==="textback"&&
      price.id===(process.env?.STRIPE_MISSED_CALL_TEXTBACK_PRICE_ID||TEXTBACK_LIVE_PRICE)&&
      amount===4999&&cycle==="monthly";
   return price.active!==false&&price.currency==="usd"&&price.unit_amount===amount&&
     price.recurring?.interval===(cycle==="yearly"?"year":"month")&&
     (staticTextback||(marks.brand==="fugth_management"&&marks.planKey===meta.planKey));
  });
  if(base){
   const addons=verifiedRecurringAddons(sub);
   if(addons!==null)matched={tier:plan.tier,cycle,offer:meta.planKey,addons};
  }
 }
 if(!matched&&typeof priceDetails==="function"){
  for(const line of lines){
   const legacy=priceDetails(priceOf(line).id||"");
   if(legacy){matched={...legacy,addons:[]};break;}
  }
 }
 return matched;
}
