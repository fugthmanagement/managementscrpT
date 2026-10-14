import { getSiteImage,getIndustryPhotos,imageBelongsToIndustry } from "./site-images";
// Public starter site content only. Never include private customer account/billing data.
export const SITE_THEMES = [
  { id: "editorial", name: "Editorial", subtitle: "Minimal and premium", color: "#252525" },
  { id: "bold", name: "Industrial", subtitle: "Strong service presence", color: "#b45e39" },
  { id: "warm", name: "Studio", subtitle: "Welcoming and expressive", color: "#886c63" },
  { id: "professional", name: "Professional", subtitle: "Clean and dependable", color: "#355d72" },
];
export const SITE_ACCENTS = [
  {id:"#3f6650",name:"Forest"},
  {id:"#b45e39",name:"Terracotta"},
  {id:"#355d72",name:"Ocean"},
  {id:"#8a597d",name:"Plum"},
  {id:"#996b26",name:"Amber"},
  {id:"#2d333d",name:"Charcoal"},
];
export const siteAccent = color => SITE_ACCENTS.some(x=>x.id===color)?color:SITE_ACCENTS[0].id;
export const SITE_INDUSTRIES = [
  { id:"general", label:"Local business", theme:"editorial", eyebrow:"WELCOME", headline:"A better experience begins here.", lead:"Learn about our work and get in touch to see how we can help.", services:["Personalized service","Clear next steps","Friendly communication"] },
  { id:"roofing", label:"Roofing & exterior", theme:"bold", eyebrow:"BUILT FOR YOUR PROPERTY", headline:"Good work. Solid foundations.", lead:"Explore our roofing and exterior services, then reach out to discuss your project.", services:["Roof inspections","Repairs and maintenance","Project estimates"] },
  { id:"dental", label:"Dental practice", theme:"professional", eyebrow:"A WELCOMING DENTAL PRACTICE", headline:"Care starts with a conversation.", lead:"Learn about the practice and ask about a convenient time for a visit.", services:["General dentistry","Consultation requests","Patient questions"] },
  { id:"clinic", label:"Medical clinic", theme:"professional", eyebrow:"YOUR NEIGHBORHOOD CLINIC", headline:"A warm welcome to better care.", lead:"Meet the care team, explore clinic services and request an appointment.", services:["General care inquiries","New patient questions","Appointment requests"] },
  { id:"salon", label:"Beauty & wellness", theme:"warm", eyebrow:"YOUR NEXT VISIT", headline:"A little time for yourself.", lead:"Discover services and get in touch to arrange your next appointment.", services:["Styling and care","Service consultation","Appointment requests"] },
  { id:"legal", label:"Law office", theme:"professional", eyebrow:"YOUR NEXT STEP", headline:"Clear conversations. Thoughtful guidance.", lead:"Learn more about the practice and request a confidential consultation.", services:["Initial inquiries","Consultation requests","Practice information"] },
  { id:"hvac", label:"Heating & cooling", theme:"bold", eyebrow:"COMFORT & RELIABILITY", headline:"Comfort when it matters.", lead:"Explore heating and cooling services and ask about an appointment.", services:["Heating service","Cooling service","Maintenance questions"] },
  { id:"automotive", label:"Auto repair", theme:"bold", eyebrow:"BACK ON THE ROAD", headline:"Let's get things moving.", lead:"Talk with the team about your vehicle and the service it may need.", services:["Diagnostics","Repairs","Service appointments"] },
  { id:"realestate", label:"Real estate", theme:"editorial", eyebrow:"FIND YOUR NEXT PLACE", headline:"The next move starts here.", lead:"Explore how the team can help with property questions and consultations.", services:["Buyer inquiries","Seller consultations","Property questions"] },
  { id:"restaurant", label:"Food & hospitality", theme:"warm", eyebrow:"COME ON IN", headline:"Good food. Great company.", lead:"Learn more about the menu, hours and how to plan a visit.", services:["Menu inquiries","Dining questions","Reservation requests"] },
  { id:"landscaping", label:"Landscaping", theme:"warm", eyebrow:"OUTDOOR LIVING", headline:"Make space to enjoy outside.", lead:"Explore lawn and landscape services for your property.", services:["Landscape consultation","Property care","Project questions"] },
  { id:"contractor", label:"Contractor & home services", theme:"bold", eyebrow:"READY FOR THE NEXT PROJECT", headline:"Work you can plan around.", lead:"Learn how to get an estimate and talk through the next step.", services:["Project inquiries","Estimates","Scheduling"] },
];
export function detectIndustry(value) {
  const v=String(value||"").toLowerCase();
  const matching = [
    [/roof|gutter|exterior/,"roofing"],[/dental|dentist|orthodont/,"dental"],[/clinic|medical|healthcare|pediatr|urgent care/,"clinic"],[/salon|beauty|barber|spa|hair/,"salon"],[/law|legal|attorney/,"legal"],
    [/hvac|air condition|heating|cooling/,"hvac"],[/auto|mechanic|car repair/,"automotive"],[/real estate|realtor|property agent/,"realestate"],
    [/restaurant|food|dining|cafe|coffee/,"restaurant"],[/landscap|lawn|gardening/,"landscaping"],[/contractor|plumb|electric|handyman/,"contractor"]
  ];
  return matching.find(([pattern])=>pattern.test(v))?.[1]||"general";
}
export function getIndustry(value) {return SITE_INDUSTRIES.find(x=>x.id===value)||SITE_INDUSTRIES[0];}
export function getTheme(value) {return SITE_THEMES.find(x=>x.id===value)||SITE_THEMES[0];}
export function cleanText(value,max=180) {return String(value||"").replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
export function buildStarterSite(uid, businessName, businessType) {
  const industry=detectIndustry(businessType||businessName);
  const data=getIndustry(industry);
  return {
    ownerId:uid,version:1,visibility:"preview",
    name:cleanText(businessName,80)||"Your business",
    industry,
    theme:data.theme,
    accentColor:siteAccent(),
    announcement:"",
    aboutTitle:"Why work with us",
    aboutDetail:"",
    galleryTitle:"A closer look",
    showFaq:true,
    faqItems:[
      {question:"How can I get started?",answer:"Get in touch with our team and tell us what you need."},
      {question:"How do I ask for an appointment or estimate?",answer:"Use the contact information on this page to reach our team."}
    ],
    showTestimonial:false,
    testimonialQuote:"",
    testimonialAuthor:"",
    eyebrow:data.eyebrow,
    headline:data.headline,
    description:data.lead,
    services:data.services,
    phone:"",
    contactEmail:"",
    serviceArea:"",
    businessHours:"",
    ctaLabel:"Contact our team",
    showHero:true,
    showAbout:true,
    showContact:true,
    showChatbot:true,
    chatbotGreeting:"Hi! Welcome. How can I help you today?",
    showServices:true,
    showGallery:true,
    heroImageId:getSiteImage(null,industry).id,
    galleryImageIds:getIndustryPhotos(industry).slice(1,3).map(x=>x.id),
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}
export function siteFields(data) {
  const industry=getIndustry(data.industry);
  const theme=getTheme(data.theme);
  const list=Array.isArray(data.services)?data.services.slice(0,3):industry.services;
  return {
    name:cleanText(data.name,80)||"Your business",
    industry:industry.id,
    theme:theme.id,
    accentColor:siteAccent(data.accentColor),
    announcement:cleanText(data.announcement,140),
    aboutTitle:cleanText(data.aboutTitle,75)||"Why work with us",
    aboutDetail:cleanText(data.aboutDetail,700),
    galleryTitle:cleanText(data.galleryTitle,75)||"A closer look",
    showFaq:data.showFaq===true,
    faqItems:(Array.isArray(data.faqItems)?data.faqItems:[]).slice(0,5)
      .map(item=>({question:cleanText(item?.question,140),answer:cleanText(item?.answer,420)}))
      .filter(item=>item.question&&item.answer),
    showTestimonial:data.showTestimonial===true,
    testimonialQuote:cleanText(data.testimonialQuote,360),
    testimonialAuthor:cleanText(data.testimonialAuthor,90),
    eyebrow:cleanText(data.eyebrow,70)||industry.eyebrow,
    headline:cleanText(data.headline,150)||industry.headline,
    description:cleanText(data.description,380)||industry.lead,
    services:list.map(x=>cleanText(x,80)).filter(Boolean),
    phone:cleanText(data.phone,32),
    contactEmail:cleanText(data.contactEmail,120),
    serviceArea:cleanText(data.serviceArea,100),
    businessHours:cleanText(data.businessHours,100),
    ctaLabel:cleanText(data.ctaLabel,48)||"Contact our team",
    showHero:data.showHero!==false,
    showAbout:data.showAbout!==false,
    showContact:data.showContact!==false,
    showChatbot:data.showChatbot!==false,
    chatbotGreeting:cleanText(data.chatbotGreeting,160)||"Hi! Welcome. How can I help you today?",
    showServices:data.showServices!==false,
    showGallery:data.showGallery!==false,
    heroImageId:getSiteImage(data.heroImageId,industry.id).id,
    galleryImageIds:(Array.isArray(data.galleryImageIds)?data.galleryImageIds:getIndustryPhotos(industry.id).slice(1,3).map(photo=>photo.id))
      .filter(id=>typeof id==="string"&&imageBelongsToIndustry(id,industry.id))
      .slice(0,2)
  };
}
