export const PLAN_LEVELS={none:0,starter:1,growth:2,elite:3};

export const PLAN_OPTIONS=[
 {key:"none",name:"Zero",price:"$0",description:"Workspace preview; paid tools are visible but locked."},
 {key:"starter",name:"Low",price:"$49",description:"AI receptionist, call history and customer leads."},
 {key:"growth",name:"Mid",price:"$149",description:"Website, appointments, AI email marketing and text-back."},
 {key:"elite",name:"High",price:"$499",description:"Advanced campaigns, higher capacity and priority workflows."}
];

export function normalizePlan(value,billingActive=true){
 if(!billingActive)return "none";
 const plan=String(value||"").toLowerCase();
 if(["elite","high","premium"].includes(plan))return "elite";
 if(["growth","mid","pro"].includes(plan))return "growth";
 if(["starter","low","basic"].includes(plan))return "starter";
 return "none";
}

export const planLevel=key=>PLAN_LEVELS[key]??0;
export const planInfo=key=>PLAN_OPTIONS.find(plan=>plan.key===key)||PLAN_OPTIONS[0];
export const hasPlan=(key,minimum)=>planLevel(key)>=planLevel(minimum);

export function accountAccessPlan(profile,verifiedGrant=null,at=Date.now()){
 const paid=normalizePlan(profile?.planTier||profile?.plan,profile?.billingActive===true);
 if(verifiedGrant?.source!=="founder"||!Object.prototype.hasOwnProperty.call(PLAN_LEVELS,verifiedGrant.tier))return paid;
 const from=Date.parse(verifiedGrant.startsAt||""),until=Date.parse(verifiedGrant.expiresAt||"");
 if(!Number.isFinite(from)||!Number.isFinite(until)||from>at||until<=at)return paid;
 return planLevel(verifiedGrant.tier)>planLevel(paid)?verifiedGrant.tier:paid;
}
