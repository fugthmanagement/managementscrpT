"use client";
const input="mt-2 w-full rounded-xl border border-[#cce3ef] bg-white p-3 text-sm text-[#173548] outline-none focus:border-[#64bbe9] focus:ring-2 focus:ring-[#ecf9ff]";
function Group({title,hint,children}){return <section className="rounded-2xl border border-[#d9e9f2] bg-white p-4 sm:p-5"><h4 className="text-sm font-black text-[#21495f]">{title}</h4><p className="mt-1 text-xs leading-5 text-[#748e9d]">{hint}</p><div className="mt-4 space-y-3">{children}</div></section>}
export default function SiteDetailFields({site,onChange}){
 const points=Array.isArray(site.trustPoints)?site.trustPoints:[];
 const process=Array.isArray(site.process)?site.process:[];
 const faqs=Array.isArray(site.faqItems)?site.faqItems:[];
 function replace(key,list,i,value){onChange({[key]:list.map((x,j)=>j===i?value:x)});}
 return <div className="mt-5 grid gap-4 lg:grid-cols-2">
  <Group title="Trust and reassurance" hint="Use specific, verifiable service benefits. Avoid invented certifications, testimonials, or awards.">
   {points.map((point,i)=><label key={i} className="block text-xs font-bold text-[#436476]">Proof point {i+1}<input value={point} maxLength={70} className={input} onChange={e=>replace("trustPoints",points,i,e.target.value)}/></label>)}
   <p className="text-[11px] text-[#899caa]">Three concise reasons to choose this business appear in the hero or introduction.</p>
  </Group>
  <Group title="How it works" hint="Edit the steps customers actually follow. Keep commitments accurate.">
   {process.map((step,i)=><label key={i} className="block text-xs font-bold text-[#436476]">Step {i+1}<input value={step} maxLength={90} className={input} onChange={e=>replace("process",process,i,e.target.value)}/></label>)}
   <p className="text-[11px] text-[#899caa]">Reorder the entire process section in the Sections tab.</p>
  </Group>
  <Group title="Frequently asked questions" hint="Answer real customer questions. FAQ content appears only while the section is enabled.">
   {faqs.map((faq,i)=><div key={i} className="rounded-xl border border-[#e1edf3] bg-[#f9fcff] p-3"><div className="flex items-center justify-between"><span className="text-[11px] font-black text-[#49758f]">QUESTION {i+1}</span><button type="button" onClick={()=>onChange({faqItems:faqs.filter((_,j)=>i!==j)})} className="text-[11px] font-bold text-[#a45050] underline">Remove</button></div><label className="mt-3 block text-xs font-bold text-[#436476]">Question<input className={input} value={faq.question||""} maxLength={140} onChange={e=>replace("faqItems",faqs,i,{...faq,question:e.target.value})}/></label><label className="mt-3 block text-xs font-bold text-[#436476]">Answer<textarea className={input} rows={2} maxLength={420} value={faq.answer||""} onChange={e=>replace("faqItems",faqs,i,{...faq,answer:e.target.value})}/></label></div>)}
   <button disabled={faqs.length>=5} type="button" onClick={()=>onChange({faqItems:[...faqs,{question:"New question",answer:"Add a clear answer here."}],showFaq:true})} className="rounded-lg border border-[#a6d8f2] bg-[#e8f7ff] px-4 py-2 text-xs font-black text-[#1e658a] disabled:opacity-40">+ Add FAQ</button>
  </Group>
  <Group title="Visitor details" hint="These practical details help your site feel credible and complete.">
   <label className="block text-xs font-bold text-[#436476]">Business hours<input value={site.businessHours||""} maxLength={100} className={input} onChange={e=>onChange({businessHours:e.target.value})}/></label>
   <label className="block text-xs font-bold text-[#436476]">Announcement bar<input value={site.announcement||""} maxLength={140} className={input} onChange={e=>onChange({announcement:e.target.value})}/></label>
   <label className="block text-xs font-bold text-[#436476]">Photo gallery title<input value={site.galleryTitle||""} maxLength={75} className={input} onChange={e=>onChange({galleryTitle:e.target.value})}/></label>
   <p className="text-[11px] text-[#899caa]">Uploaded business photos remain optional; the Image Library is below the editor.</p>
  </Group>
 </div>;
}
