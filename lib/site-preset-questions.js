/**
 * Zero-API, no-LLM visitor assistance. Every answer is derived from the
 * currently saved website fields; only the displayed questions can be asked.
 * No invented booking status or customer data access.
 */
const clean=(v,n=300)=>String(v||"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
export function sitePresetQuestions(site={},preview=false){
 const name=clean(site.name,90)||"this business";
 const phone=clean(site.phone,40),email=clean(site.contactEmail,150);
 const services=site.showServices===false?[]:(Array.isArray(site.services)?site.services:[]).map(x=>clean(x,85)).filter(Boolean).slice(0,6);
 const hours=clean(site.businessHours,160),area=clean(site.serviceArea,160);
 const sample=preview?" These are sample website details until the business approves them.":"";
 const answer=[
  {id:"about",question:"What is this business?",answer:(clean(site.description,360)||"This website introduces "+name+".")+sample},
  {id:"services",question:"What services are shown?",answer:services.length?
   "This website lists: "+services.join("; ")+". Please contact the business to confirm your specific needs."+sample:
   "The site has no verified service list yet. Please contact the business for details."},
  {id:"contact",question:"How can I contact the business?",answer:phone&&email?
   "You can call "+phone+" or email "+email+".":
   phone?"You can call "+phone+".":email?"You can email "+email+".":
   "Please use the contact information on this website when it becomes available."},
  {id:"hours",question:"What are your hours?",answer:hours?
   "Hours shown on this website: "+hours+"."+sample:
   "Business hours have not been added to this website. Please contact the team directly."},
  {id:"area",question:"Which area do you serve?",answer:area?
   "Service area shown: "+area+"."+sample:
   "A verified service area has not yet been provided. Contact the business to confirm."},
  {id:"pricing",question:"Can I get a price or quote?",answer:
   "No confirmed prices or estimates are provided by this sample assistant. Please contact the business for a quote."},
  {id:"appointment",question:"Can I book an appointment?",answer:preview?
   "This is an independent website concept. Use the 'Book a guest consultation' link on the FUGTH preview banner to discuss the site. That does not book a service with "+name+".":
   "Use the business contact options to request a time. Do not consider it booked until you receive an explicit confirmation."},
  {id:"booking-status",question:"Is my appointment already booked?",answer:
   "For privacy, this chat cannot look up private appointments. Check your confirmation reference or contact the business. A request alone is not a confirmed booking."},
  {id:"privacy",question:"Where can I see your privacy and terms?",answer:
   "Open Privacy Policy, Terms of Service, or Data & Information in the website footer. Draft policies require the business owner's review."}
 ];
 const faq=site.showFaq===false?[]:(Array.isArray(site.faqItems)?site.faqItems:[]).slice(0,4).map((entry,i)=>({
  id:"faq-"+i,
  question:clean(entry?.question,150),
  answer:clean(entry?.answer,430)+(preview?" This is part of a sample design.":"")
 })).filter(x=>x.question&&x.answer);
 return [...answer,...faq];
}
export function sitePresetAnswer(site,id,preview=false){
 const selected=sitePresetQuestions(site,preview).find(x=>x.id===id);
 return selected?.answer||null;
}
