import {buildStarterSite,getTheme} from "./site-presets";
// Each trade is a genuinely different site structure, not just a recolor.
const catalog={
 electrician:{
  industry:"electrician",template:"field-pro",photo:"fg-contractor-project",
  services:["EV charging solutions","Generator & backup power","Panel upgrades","Residential wiring","Electrical troubleshooting","Safety inspections"],
  headline:"Built to power what comes next.",lead:"Electrical projects deserve a clear plan. Explore safe, reliable service for homes and businesses.",
  eyebrow:"ELECTRICAL CONTRACTING • PROJECTS & REPAIRS",
  aboutTitle:"Every connection matters.",aboutDetail:"From an initial site visit to the finished installation, our process focuses on clear scope, practical solutions and communication at each stage.",
  trustPoints:["Project-focused planning","Clear next steps","Residential & commercial inquiries"],
  process:["Describe the issue or project","Review a proposed scope","Plan the service visit","Confirm the work"],
  accent:"#2d9cc8"
 },
 mechanic:{
  industry:"automotive",template:"local-bold",photo:"fg-automotive-garage",
  services:["Computer diagnostics","Engine & transmission service","Brake repairs","Steering & suspension","Scheduled maintenance","AC and electrical diagnostics"],
  headline:"Your next mile starts in the shop.",lead:"Get a straightforward path from the warning light to the repair. Tell us what your vehicle needs.",
  eyebrow:"AUTO REPAIR • DIAGNOSTICS • MAINTENANCE",
  aboutTitle:"Built around the work, not the wait.",aboutDetail:"A clear service conversation, an understandable repair plan and a team that helps you get back to the road.",
  trustPoints:["Straightforward diagnostics","Repair planning","Maintenance conversations"],
  process:["Tell us what is happening","Schedule a diagnostic","Review repair options","Plan pickup"],
  accent:"#b95431"
 },
 plumber:{
  industry:"plumber",template:"appointment",photo:"fg-contractor-plumbing",
  services:["Leak detection","Drain & sewer service","Water heater repairs","Repiping","Bathroom & kitchen fixtures","Commercial plumbing"],
  headline:"Let's get your plumbing back on track.",lead:"From urgent leaks to new installations, reach out with the details and get clear next steps.",
  eyebrow:"PLUMBING • SERVICE REQUESTS • INSTALLATIONS",
  aboutTitle:"Practical help, from first call to follow-up.",aboutDetail:"Describe the issue, talk through possible solutions and arrange the next step with a service-focused team.",
  trustPoints:["Clear service requests","Repair & installation inquiries","Helpful follow-up"],
  process:["Tell us what needs attention","Share the property details","Arrange the next step","Review completed service"],
  accent:"#176f97"
 }
};
export function demoTemplate(kind,name,details={}){
 const p=catalog[kind];if(!p)return null;
 const site=buildStarterSite("preview_"+kind,name||"Your Business",p.industry,details);
 const palette=getTheme(p.template).palette;
 return {...site,industry:p.industry,template:p.template,theme:p.template,
   headerColor:palette.headerColor,mainColor:palette.mainColor,sectionColor:palette.sectionColor,
   accentColor:p.accent,heroImageId:p.photo,
   name:name||"Your Business",services:p.services,headline:p.headline,description:p.lead,
   eyebrow:p.eyebrow,aboutTitle:p.aboutTitle,aboutDetail:p.aboutDetail,
   trustPoints:p.trustPoints,process:p.process,
   showChatbot:false,showTestimonial:false,visibility:"published",
   announcement:"Independent website design concept • Not approved by the business"};
}
export const demoIndustries=Object.keys(catalog);
