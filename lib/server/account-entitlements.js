// Billing and founder-issued access remain separate sources of truth.
export const TIERS=["none","website","starter","growth","elite"];
const level={none:0,website:0.5,starter:1,growth:2,elite:3};
export function manualAccess(profile,at=Date.now()){
 const access=profile?.founderAccess;
 if(access?.source!=="founder"||!TIERS.includes(access.tier)||access.tier==="none")return null;
 const from=Date.parse(access.startsAt||""),until=Date.parse(access.expiresAt||"");
 return Number.isFinite(from)&&Number.isFinite(until)&&from<=at&&until>at?access:null;
}
export function accessTier(profile,at=Date.now()){
 const paid=profile?.billingActive===true?String(profile.planTier||"none"):"none";
 const active=manualAccess(profile,at)?.tier||"none";
 return (level[active]||0)>(level[paid]||0)?active:(paid==="website"||TIERS.includes(paid))?paid:"none";
}
export const hasAccess=(profile,tier)=>level[accessTier(profile)]>=level[tier];
