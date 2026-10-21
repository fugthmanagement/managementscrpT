/**
 * Plain-language starter policies for FUGTH Site Maker websites.
 * These are editable suggestions, NOT legal advice or an assertion about
 * services or data practices not enabled on the customer's actual website.
 */
const text=(x,max=160)=>String(x||"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,max);
export const SITE_LEGAL_TYPES=["privacy","terms","data"];
export const SITE_LEGAL_TITLES={privacy:"Privacy Policy",terms:"Terms of Service",data:"Data & Information"};
export function siteLegalPages(site={},isConcept=false){
 const name=text(site.name,90)||"This business";
 const email=text(site.legalContactEmail||site.contactEmail,160);
 const phone=text(site.phone,36);
 const contact=email?"Email "+email:phone?"Call "+phone:"Use the contact option shown on this website";
 const sample=isConcept||site.legalApproved!==true;
 const prefix=sample?
  "DRAFT FOR REVIEW — This is a template for "+name+". The business has not adopted or verified these terms. Specific practices must be confirmed before the site is published.":
  "Information for visitors to "+name+".";
 const introduction="Contact: "+contact+".";
 const privacy=[
  {heading:"Information you provide",body:"When you choose to contact "+name+", you may provide your name, business name, phone, email address, and message. Do not submit sensitive or confidential information through an ordinary website chat or contact link."},
  {heading:"How information may be used",body:"Contact details are intended to answer requests and arrange business conversations. This sample website does not establish whether "+name+" uses additional forms, marketing services, analytics, or third-party systems."},
  {heading:"Messages and optional chat",body:"The website may offer preset answers or an AI-powered chat. When live AI is enabled, messages may be processed by FUGTH's configured services to answer business questions. Responses are not guaranteed to be accurate; confirm important information directly with the business."},
  {heading:"Your choices and requests",body:"You can ask the business about information you have provided or request changes through its listed contact method. Any final privacy notices must accurately describe actual data storage, sharing, retention, and applicable rights."}
 ];
 const terms=[
  {heading:"Site information",body:"Information and sample services are presented for general inquiries. Photos, reviews, qualifications, prices and service availability are not guaranteed unless the business has verified them."},
  {heading:"Estimates and appointments",body:"Contact forms, chat responses and appointment requests do not by themselves form a service contract. An appointment is confirmed only when the business or the FUGTH booking system explicitly confirms the reservation."},
  {heading:"Use of this website",body:"Do not misuse the contact channels or submit misleading or unlawful information. The business may change website details as appropriate."},
  {heading:"Contact and changes",body:"For questions about these draft terms or any request to update them, "+introduction}
 ];
 const data=[
  {heading:"Business details",body:"This site displays the business name, service descriptions, location or service area, hours and contact methods entered in its website settings. Those details are editable by the business."},
  {heading:"Visitor submissions",body:"If a visitor sends an email, message, or booking request, the information is sent only through the selected channel. A requested appointment is not a booking until it has been confirmed and saved."},
  {heading:"AI and preview data",body:"Quick-answer chat uses the website's saved details. Optional live AI may submit a question and relevant business information to the configured FUGTH model. Independent concept websites can include sample details that are not owner-approved."},
  {heading:"Updates and corrections",body:"Information shown here may be incomplete. To ask for corrections, request access to your submitted details, or discuss deletion, "+introduction}
 ];
 const items={privacy,terms,data};
 return Object.fromEntries(SITE_LEGAL_TYPES.map(kind=>{
  const custom=text(site["legal"+kind[0].toUpperCase()+kind.slice(1)+"Custom"],3800);
  return [kind,{title:SITE_LEGAL_TITLES[kind],intro:prefix,
   sections:custom?[{heading:"Business-provided wording",body:custom}]:items[kind],
   sample,contact}];
 }));
}
