import {buildStarterSite} from "./site-presets";
const catalog={
 electrician:{industry:"contractor",services:["EV charger installation","Generator & transfer switch installation","Electrical panel upgrades","Home & business wiring","Safety inspections","Troubleshooting & repairs"],headline:"Power your plans with electrical service that puts safety first.",lead:"From EV charging to backup power and panel upgrades, let's talk about the next project.",accent:"#b86b23"},
 mechanic:{industry:"automotive",services:["Computer diagnostics","Engine & transmission repair","Brake service","Suspension & steering","Preventive maintenance","AC & electrical diagnostics"],headline:"Get back on the road with a smarter service experience.",lead:"Discover repairs, diagnostics and everyday auto care with straightforward next steps.",accent:"#c25131"},
 plumber:{industry:"contractor",services:["Leak detection","Drain & sewer cleaning","Water heater service","Pipe repairs & repiping","Bathroom & kitchen fixtures","Commercial plumbing"],headline:"A better answer when plumbing problems can't wait.",lead:"Get help planning pipe repairs, drain service, water heaters and fixture installations.",accent:"#176b87"}
};
export function demoTemplate(kind,name,details={}){
 const p=catalog[kind];if(!p)return null;
 const site=buildStarterSite("preview_"+kind,name||"Your Business",p.industry,details);
 return {...site,industry:p.industry,name:name||"Your Business",services:p.services,headline:p.headline,description:p.lead,eyebrow:kind.toUpperCase()+" SERVICES",accentColor:p.accent,showChatbot:false,showTestimonial:false,visibility:"published",announcement:"Website design concept • Details and availability subject to business approval"};
}
export const demoIndustries=Object.keys(catalog);
