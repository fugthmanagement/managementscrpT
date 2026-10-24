"use client";
const field="mt-2 w-full rounded-xl border border-[#c6dce8] bg-white px-4 py-3 text-xs text-[#20465c] disabled:opacity-40";
const dock=[["hero","After hero"],["after_services","After services"],["before_contact","Before contact"],["footer","Above footer"]];
const styles=[["compact","Compact rating"],["cards","Customer review cards"],["spotlight","Large featured testimonials"]];
export default function SiteSocialProofStudio({site,onChange,locked=false}){
 const patch=(key,value)=>onChange?.({[key]:value});
 return <section className="overflow-hidden rounded-[24px] border border-[#d2e5ef] bg-white p-5 text-[#25495f] sm:p-7">
  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#6ba5c2]">FUGTH SITE MAKER / MEDIA + SOCIAL PROOF</p>
   <h3 className="mt-3 text-xl font-black">Business photos and real Google reviews</h3>
   <p className="mt-2 text-xs leading-6 text-[#6b8a9d]">Every business can position a Google review dock to suit its template. Reviews come live from Google Maps, with source and author attribution. We do not invent reviews or permanently copy Google review text into Firestore.</p>
  </div>
  <div className="mt-5 grid gap-5 lg:grid-cols-2">
   <div className="rounded-xl border border-[#e1ecf2] bg-[#f8fcfe] p-4">
    <strong className="text-sm">Google review dock</strong>
    <label className="mt-3 flex items-center gap-3 text-xs font-bold">
     <input disabled={locked} type="checkbox" checked={site.showGoogleReviews===true} onChange={e=>patch("showGoogleReviews",e.target.checked)}/>
     Show this business's actual Google Maps reviews
    </label>
    <label className="mt-4 block text-xs font-bold">Google Place ID
     <input disabled={locked} value={site.googlePlaceId||""} maxLength={180} className={field} onChange={e=>patch("googlePlaceId",e.target.value)} placeholder="ChIJ... (verify actual business)"/></label>
    <p className="mt-2 text-[11px] leading-5 text-[#7894a3]">Use the correct Google Maps Place ID for this business. Places API (New), an enabled server key and billing are required for review display.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-bold">Where reviews appear
      <select disabled={locked} className={field} value={site.googleReviewsDock||"after_services"} onChange={e=>patch("googleReviewsDock",e.target.value)}>
       {dock.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
     </label>
     <label className="text-xs font-bold">Review design
      <select disabled={locked} className={field} value={site.googleReviewsStyle||"cards"} onChange={e=>patch("googleReviewsStyle",e.target.value)}>
       {styles.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
     </label>
    </div>
   </div>
   <div className="rounded-xl border border-[#e1ecf2] bg-[#f8fcfe] p-4">
    <strong className="text-sm">Authorized photos from your existing website</strong>
    <p className="mt-2 text-xs leading-6 text-[#6e899c]">Use an image that your business owns or is licensed to display. A URL reference is saved in your FUGTH website's Firestore draft; this does not copy the photo bytes. If hotlinking is blocked, upload an authorized copy to your private photo library instead.</p>
    <label className="mt-4 block text-xs font-bold">Image URL · HTTPS
     <input disabled={locked} type="url" className={field} maxLength={450} value={site.sourceHeroPhotoUrl||""} onChange={e=>patch("sourceHeroPhotoUrl",e.target.value)} placeholder="https://yourbusiness.com/photos/project.webp"/></label>
    <label className="mt-3 block text-xs font-bold">Image source page
     <input disabled={locked} type="url" className={field} maxLength={450} value={site.sourceHeroSourceUrl||""} onChange={e=>patch("sourceHeroSourceUrl",e.target.value)} placeholder="https://yourbusiness.com/gallery"/></label>
    <label className="mt-3 block text-xs font-bold">Photo source credit
     <input disabled={locked} className={field} maxLength={110} value={site.sourcePhotoCredit||""} onChange={e=>patch("sourcePhotoCredit",e.target.value)} placeholder="Business or photographer name"/></label>
    <label className="mt-4 flex items-start gap-2 text-xs font-bold">
     <input disabled={locked} type="checkbox" checked={site.sourceHeroPhotoApproved===true} onChange={e=>patch("sourceHeroPhotoApproved",e.target.checked)}/>
     I confirm the rights or permission to show this photo in the FUGTH website preview.
    </label>
   </div>
  </div>
  <div className="mt-5 rounded-xl border border-[#d6e6ef] bg-[#f5fbff] p-4">
   <h4 className="text-sm font-black">Manual testimonials · no Google API charges</h4>
   <p className="mt-2 text-[11px] leading-5">Use only reviews the business has permission to publish. No fake ratings or automatic Google scraping.</p>
   <label className="mt-3 block text-xs font-bold">Google Maps listing URL
    <input type="url" className={field} disabled={locked} value={site.googleMapsUrl||""} maxLength={450} onChange={e=>patch("googleMapsUrl",e.target.value)} placeholder="https://maps.google.com/…"/></label>
   {(site.testimonials||[]).map((item,i)=><div key={i} className="mt-3 space-y-3 rounded-xl border bg-white p-3">
    <label className="block text-xs font-bold">Reviewer name<input className={field} maxLength={75} disabled={locked} value={item.author||""} onChange={e=>patch("testimonials",(site.testimonials||[]).map((v,j)=>i===j?{...v,author:e.target.value}:v))}/></label>
    <label className="block text-xs font-bold">Authentic review<textarea className={field} rows={2} maxLength={340} disabled={locked} value={item.text||""} onChange={e=>patch("testimonials",(site.testimonials||[]).map((v,j)=>i===j?{...v,text:e.target.value}:v))}/></label>
    <label className="block text-xs font-bold">Original source link (optional)<input type="url" className={field} maxLength={450} disabled={locked} value={item.sourceUrl||""} onChange={e=>patch("testimonials",(site.testimonials||[]).map((v,j)=>i===j?{...v,sourceUrl:e.target.value}:v))}/></label>
    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" disabled={locked} checked={item.approved===true} onChange={e=>patch("testimonials",(site.testimonials||[]).map((v,j)=>i===j?{...v,approved:e.target.checked}:v))}/> Permission confirmed</label>
    <button type="button" disabled={locked} onClick={()=>patch("testimonials",(site.testimonials||[]).filter((_,j)=>i!==j))} className="text-xs font-bold text-rose-700">Remove</button>
   </div>)}
   <button type="button" disabled={locked||(site.testimonials||[]).length>=5} onClick={()=>patch("testimonials",[...(site.testimonials||[]),{author:"",text:"",approved:false,sourceUrl:""}])} className="mt-3 rounded-xl border bg-white px-4 py-2.5 text-xs font-black">+ Add authorized testimonial</button>
  </div>
  {locked&&<p className="mt-4 rounded-xl bg-[#eff7fc] p-3 text-xs text-[#6c91a6]">Free website preview: social-proof controls are visible, but saving/publishing requires website access.</p>}
 </section>;
}
