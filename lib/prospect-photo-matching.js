/**
 * Recommend only explicitly authorized Drive photos filed for the SAME business.
 * Industry-only or name similarity must never reuse another customer's photos.
 */
const norm=s=>String(s||"").trim().toLowerCase().replace(/\s+/g," ");
export function matchProspectPhotos(prospect,images=[]){
 const business=norm(prospect?.businessName),industry=norm(prospect?.industry||prospect?.businessType);
 if(!business)return {heroImageId:null,galleryImageIds:[],matched:0};
 const owned=images.filter(p=>p?.rightsConfirmed===true&&p?.id&&
  norm(p.folder)===business&&/^fugth-upload-[a-f0-9]{32}$/.test(String(p.id||"")));
 const ranked=owned.map(p=>{
  const text=[p.label,...(p.tags||[])].join(" ").toLowerCase();
  const score=(industry&&norm(p.industry)===industry?10:0)+
   (/\b(hero|banner|front|exterior|cover)\b/i.test(text)?25:0)+
   (/\b(team|project|work|gallery|service)\b/i.test(text)?3:0);
  return {id:p.id,score};
 }).sort((a,b)=>b.score-a.score);
 return {heroImageId:ranked[0]?.id||null,
  galleryImageIds:ranked.slice(1,3).map(p=>p.id),matched:ranked.length};
}
