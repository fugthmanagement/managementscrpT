import {BILLING_PLANS,BILLING_ADDONS,addonAmount,validAddons} from "./billing-catalog.js";

export class ServiceCartError extends Error {
 constructor(message){super(message);this.name="ServiceCartError";}
}
const validCents=(n)=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
/**
 * The browser supplies selections, never prices. The server recalculates
 * every line from this same catalog and validates founder-priced overrides.
 * Exactly one recurring base plan is permitted.
 */
export function makeServiceCart(selection,override={}){
 const key=String(selection?.planKey||"");
 const plan=BILLING_PLANS[key];
 if(!plan)throw new ServiceCartError("Select one FUGTH service package.");
 const cycle=selection?.billingCycle||"monthly";
 if(!["monthly","yearly"].includes(cycle))throw new ServiceCartError("Choose a valid billing cycle.");
 if(cycle==="yearly"&&(plan.kind==="one_time"||key==="textback"))
  throw new ServiceCartError("This service can only be purchased at its stated billing interval.");
 const addons=validAddons(key,selection?.addons??[]);
 if(!addons)throw new ServiceCartError("One or more selected upgrades are unavailable for this plan.");
 const siteExtra=selection?.websiteOneTime===true;
 if(siteExtra&&key!=="textback")
  throw new ServiceCartError("The separate one-time website is available with Text-Back; website plans already include website service.");
 const baseCents=override.baseCents??plan.monthly;
 const setupCents=override.setupCents??plan.setup;
 if(!validCents(baseCents)||!validCents(setupCents)||baseCents===0)
  throw new ServiceCartError("The selected package price is invalid.");
 const multiplier=cycle==="yearly"?12:1;
 const addonLines=addons.map(id=>({id,label:BILLING_ADDONS[id].name,
  amountCents:addonAmount(key,id)*multiplier}));
 const recurringCents=(baseCents+addons.reduce((sum,id)=>sum+addonAmount(key,id),0))*multiplier;
 const websiteCents=siteExtra?BILLING_PLANS.website_one_time.monthly:0;
 const lines=[
  {id:"plan:"+key,label:plan.name,amountCents:baseCents*multiplier,
   period:plan.kind==="one_time"?"once":cycle},
  ...addonLines.map(a=>({id:"addon:"+a.id,label:a.label,amountCents:a.amountCents,period:cycle})),
  ...(setupCents?[{id:"setup",label:"One-time professional setup",amountCents:setupCents,period:"once"}]:[]),
  ...(websiteCents?[{id:"website_once",label:"One-time website purchase",amountCents:websiteCents,period:"once"}]:[])
 ];
 return {planKey:key,plan,cycle,interval:cycle==="yearly"?"year":"month",
  addons,addonLines,websiteOneTime:siteExtra,websiteCents,baseCents,setupCents,
  multiplier,mode:plan.kind==="one_time"?"payment":"subscription",
  recurringCents:plan.kind==="one_time"?0:recurringCents,
  firstChargeCents:recurringCents+setupCents+websiteCents,
  lines,count:1+addons.length+(siteExtra?1:0)};
}
