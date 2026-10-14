// Canonical customer-facing offers. Amounts are USD cents.
// All fees are disclosed before redirecting to Stripe Checkout.
export const BILLING_PLANS={
 starter:{key:"starter",name:"Low",monthly:4900,setup:150000,
  description:"AI front desk, searchable call records, leads and business essentials.",
  features:["AI receptionist and call inbox","Call timestamps, transcripts and summaries","FUGTH lead directory and customer notes","Business setup and onboarding"],
  included:["crm"]},
 growth:{key:"growth",name:"Mid",monthly:14900,setup:250000,
  description:"A connected business workspace, website service and marketing.",
  features:["Everything in Low","Professional website customization","Appointments and estimates","Email marketing and CRM imports","Analytics and reporting"],
  included:["crm","website","booking","email","analytics"]},
 elite:{key:"elite",name:"High",monthly:49900,setup:350000,
  description:"High-touch growth operations, advanced automation and implementation.",
  features:["Everything in Mid","Advanced marketing workflows","Priority support","One standard business integration","Expanded team workflows"],
  included:["crm","website","booking","email","analytics","automation","priority","integration"]}
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
 const item=BILLING_ADDONS[id];return item&&BILLING_PLANS[plan]?item.prices[plan]:null;
}
export function validAddons(plan,raw){
 if(!BILLING_PLANS[plan])return null;
 if(!Array.isArray(raw)||raw.length>12||raw.some(id=>typeof id!=="string"||!(id in BILLING_ADDONS)))return null;
 return [...new Set(raw)].filter(id=>addonAmount(plan,id)>0);
}
export const dollars=amount=>"$"+(amount/100).toLocaleString("en-US",{maximumFractionDigits:0});
