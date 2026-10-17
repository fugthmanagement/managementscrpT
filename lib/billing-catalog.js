// Canonical customer-facing offers. Amounts are USD cents.
// All fees are disclosed before redirecting to Stripe Checkout.
export const BILLING_PLANS={
 website_one_time:{key:"website_one_time",name:"Website purchase",monthly:29900,setup:0,kind:"one_time",tier:"website",
  description:"Buy a tailored template-based business website once; delivery starts after complete content is received. Hosting and updates are separate.",
  features:["Responsive, personalized business website","Private preview before delivery","One-time purchase, no automatic recurring charge","Delivery target: 24 hours after required materials are approved"],included:["website"]},
 website:{key:"website",name:"Managed Website",monthly:5900,setup:29900,kind:"subscription",tier:"website",
  description:"Website hosting, edits and a customer dashboard without paying for an AI receptionist.",
  features:["Managed professional business website","Hosting and basic upkeep","Customer website editor and contact forms","Add AI reception later without rebuilding your site"],included:["website"]},
 starter:{key:"starter",name:"Essential · Founding",monthly:14900,regularMonthly:19900,setup:100000,kind:"subscription",tier:"starter",
  description:"Founding rate for business websites and a connected AI front desk. Limited minutes and fair-use allowances apply.",
  features:["Professional managed website and chatbot","AI receptionist and call inbox","Customer leads and appointment intake","300 included AI call minutes each month","Founding-rate price protection per your checkout agreement"],included:["crm","website","booking"]},
 essential:{key:"essential",name:"Essential",monthly:19900,setup:100000,kind:"subscription",tier:"starter",
  description:"Complete website and AI front desk at the regular Essential rate.",
  features:["Professional managed website and chatbot","AI receptionist and call inbox","Customer leads and appointment intake","300 included AI call minutes each month"],included:["crm","website","booking"]},
 growth:{key:"growth",name:"Growth",monthly:39900,setup:200000,kind:"subscription",tier:"growth",
  description:"Website, AI receptionist, advanced lead operations, and marketing.",
  features:["Everything in Essential","800 included AI call minutes","Calendar booking and appointment reminders","Email campaigns and advanced CRM tools","Reporting and automation"],included:["crm","website","booking","email","analytics"]},
 elite:{key:"elite",name:"Elite",monthly:79900,setup:350000,kind:"subscription",tier:"elite",
  description:"Advanced voice operations, priority onboarding and support for busy businesses.",
  features:["Everything in Growth","2,000 included AI call minutes","Advanced automations and reporting","Staff and multi-location workflows","Priority onboarding and support"],included:["crm","website","booking","email","analytics","automation","priority","integration"]}
};
// Add-on surcharges fall with higher plans to reward upgrades.
// Provider usage (voice minutes/SMS/email volume) is separately limited and never unlimited.
export const BILLING_ADDONS={
 website:{name:"Managed website customization",description:"Personalized website design and launch coordination.",prices:{starter:12900,growth:0,elite:0}},
 booking:{name:"Booking and appointment workflows",description:"Appointment intake and follow-up.",prices:{starter:10900,growth:0,elite:0}},
 email:{name:"Email campaign builder",description:"Contact lists, templates and provider-connected email delivery.",prices:{starter:12900,growth:0,elite:0}},
 analytics:{name:"Advanced reports",description:"Customer, call and campaign performance reports.",prices:{starter:7900,growth:0,elite:0}},
 automation:{name:"Marketing automation",description:"Multi-step campaigns and follow-up workflows.",prices:{starter:19900,growth:9900,elite:0}},
 priority:{name:"Priority implementation support",description:"Priority technical and onboarding assistance.",prices:{starter:15900,growth:9900,elite:0}},
 integration:{name:"Custom business integration",description:"One supported third-party CRM or scheduling connection.",prices:{starter:17900,growth:8900,elite:0}},
 voice:{name:"Extra voice allowance",description:"Additional 200-minute usage pool, subject to provider limits.",prices:{starter:9900,growth:7900,elite:5900}},
 location:{name:"Additional business location",description:"Extra office or branch configuration.",prices:{starter:8900,growth:6900,elite:4900}},
 staff:{name:"Additional staff seat",description:"Add one permitted employee login.",prices:{starter:2900,growth:1900,elite:900}},
 sms:{name:"SMS follow-up workflows",description:"Text automation tooling; outbound messaging fees separate.",prices:{starter:10900,growth:6900,elite:3900}}
};
export const customSetupLabel="Enterprise multi-location implementation: quoted separately, typically from $5,000.";
export function addonAmount(plan,id){
 const item=BILLING_ADDONS[id];return item&&BILLING_PLANS[plan]&&["starter","essential","growth","elite"].includes(plan)?(BILLING_PLANS[plan].included?.includes(id)?0:item.prices[plan==="essential"?"starter":plan]):null;
}
export function validAddons(plan,raw){
 if(!BILLING_PLANS[plan])return null;
 if(["website","website_one_time"].includes(plan))return Array.isArray(raw)&&raw.length===0?[]:null;
 if(!Array.isArray(raw)||raw.length>12||raw.some(id=>typeof id!=="string"||!(id in BILLING_ADDONS)))return null;
 return [...new Set(raw)].filter(id=>addonAmount(plan,id)>0);
}
export const dollars=amount=>"$"+(amount/100).toLocaleString("en-US",{maximumFractionDigits:0});
