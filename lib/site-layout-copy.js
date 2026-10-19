// Distinct editorial voices for each template. These are design-preview examples,
// not factual claims of licensing, years in business, or customer satisfaction.
const copy={
 roofing:{
  field:"Serious protection starts at the roofline.",direct:"Your next roofing project, clearly planned.",bold:"Better roofs. Less runaround.",visual:"The roof is part of the whole picture.",calm:"Let's get your roof questions answered.",editorial:"Built to protect what feels like home."
 },
 hvac:{
  field:"The right fix for the comfort you depend on.",direct:"Heating and cooling, without the guesswork.",bold:"Comfort isn't optional.",visual:"Comfort is in the details.",calm:"Feel comfortable about your next appointment.",editorial:"Make room for better comfort."
 },
 contractor:{
  field:"Built for the details that hold it all together.",direct:"Your project deserves a clear next step.",bold:"Big plans. Real work.",visual:"Picture what your space could become.",calm:"Your next project starts with a conversation.",editorial:"Spaces change. Good planning makes the difference."
 },
 cleaning:{
  field:"Reliable cleaning starts with a clear plan.",direct:"A cleaner space, one easy step away.",bold:"A cleaner space. A better day.",visual:"Give your space the fresh start it deserves.",calm:"A simple path to a cleaner home.",editorial:"Every detail feels a little lighter."
 },
 automotive:{
  field:"Diagnostics, repairs, and the road ahead.",direct:"Get your next repair moving.",bold:"Back on the road. Back to business.",visual:"Craft meets care under the hood.",calm:"Auto service that starts with listening.",editorial:"The details that keep you moving."
 },
 landscaping:{
  field:"Outdoor work with a clear plan.",direct:"Your outdoor space starts here.",bold:"Make the outdoors yours.",visual:"See the potential in every square foot.",calm:"A greener space starts with a conversation.",editorial:"Outside is where the next story begins."
 },
 dental:{
  direct:"A more comfortable place to begin.",calm:"Care begins with a conversation.",visual:"A thoughtful approach to your next visit.",editorial:"Make room for a brighter routine.",bold:"Your smile. Your next step.",field:"Clear plans for your next dental visit."
 },
 clinic:{
  calm:"A thoughtful place to begin your care.",direct:"Questions first. Clear next steps.",editorial:"Care that feels considered.",visual:"A welcoming space for your next visit.",field:"Practical answers for the care you need.",bold:"Feel heard from the first hello."
 },
 salon:{
  editorial:"Your next look starts with a little inspiration.",visual:"An eye for detail. A space for you.",calm:"Book some time just for yourself.",bold:"Show up feeling like you.",direct:"A fresh experience starts here.",field:"A clear path from consultation to style."
 },
 wedding:{
  editorial:"For the moments you'll always remember.",visual:"Imagine the look. Experience the details.",calm:"A personal appointment for your big moment.",bold:"Find the look. Make it yours.",direct:"Start your bridal experience here.",field:"Thoughtful fittings, step by step."
 },
 legal:{
  editorial:"A more considered way to move forward.",calm:"Clear information for an important decision.",direct:"Let's discuss your next step.",visual:"The details deserve attention.",bold:"Your questions matter.",field:"Understand the process before moving ahead."
 },
 restaurant:{
  editorial:"Make time for something delicious.",visual:"A place worth making time for.",calm:"Plan your next visit with ease.",bold:"Pull up a chair.",direct:"Good food starts with a good visit.",field:"Find the details for your next visit."
 },
 realestate:{
  visual:"The next place is worth exploring.",editorial:"Find a space that feels right.",calm:"Your next move starts with good guidance.",bold:"Find the place. Make your move.",direct:"Take the next step toward your next address.",field:"Property questions deserve clear answers."
 },
 petgrooming:{
  editorial:"Fresh looks for your favorite companion.",visual:"A little care goes a long way.",calm:"A calmer grooming visit begins here.",bold:"A clean coat. A happy day.",direct:"Explore your pet's next grooming visit.",field:"A thoughtful routine for every appointment."
 },
 general:{
  editorial:"The details are what make it personal.",visual:"See what comes next.",calm:"Start with a conversation.",bold:"Local work. Big attention to detail.",direct:"A better experience begins here.",field:"A clear plan for what comes next."
 }
};
const toneFor={
 "field-pro":"field","service-pro":"direct","local-bold":"bold",
 "project-showcase":"visual","appointment":"calm","care-pro":"calm",
 "studio-pro":"editorial","signature":"editorial","modern-classic":"editorial","storefront":"editorial"
};
const eyebrowFor={
 field:"PRACTICAL WORK • CLEAR PLANNING",
 direct:"YOUR NEXT STEP STARTS HERE",
 bold:"LOCAL SERVICE. REAL MOMENTUM.",
 visual:"PROJECTS • DETAILS • POSSIBILITIES",
 calm:"HERE TO HELP YOU BEGIN",
 editorial:"THE DETAILS MAKE THE DIFFERENCE"
};
export function themeNarrative(industry,themeId,industryData){
 const tone=toneFor[themeId]||"direct";
 const industryKey=copy[industry]?industry:"general";
 const headline=copy[industryKey]?.[tone]||copy.general[tone];
 const services=industryData?.services||[];
 const servicesText=services.slice(0,2).map(x=>x.toLowerCase()).join(" and ");
 const descriptions={
  field:`Explore ${servicesText||"available services"} with a practical process that keeps each step understandable.`,
  direct:`From ${servicesText||"everyday requests"} to your next question, see how to reach the team and get started.`,
  bold:`Ready to talk about ${servicesText||"your next project"}? Bring your questions and start the conversation.`,
  visual:`Get inspired by the possibilities, explore ${servicesText||"what the team offers"}, and plan your next step.`,
  calm:`Discover ${servicesText||"available services"} and find a comfortable way to ask questions or request a visit.`,
  editorial:`A closer look at ${servicesText||"the services on offer"}, with thoughtful details and an easy way to get in touch.`
 };
 return {headline,eyebrow:eyebrowFor[tone],description:descriptions[tone]};
}
