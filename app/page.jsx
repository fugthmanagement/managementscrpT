import Link from "next/link";
import SitePhoto from "../components/site-photo";
import HomeFeatureTabs from "../components/home-feature-tabs";
import PublicVoiceDemo from "../components/public-voice-demo";
import {BILLING_PLANS,dollars} from "../lib/billing-catalog";

const packages=Object.values(BILLING_PLANS);
const Arrow=()=> <span aria-hidden="true">↗</span>;
function BusinessDisplay(){
 return <div className="relative mx-auto w-full max-w-[610px]">
  <div className="pointer-events-none absolute -left-12 -top-12 h-72 w-72 rounded-full bg-[#beae79]/35 blur-[80px]"/>
  <div className="relative grid gap-3 rounded-[30px] border border-white/15 bg-[#2b4332] p-3 shadow-[0_38px_110px_rgba(0,0,0,.22)] sm:p-4">
   <div className="flex items-center justify-between px-2 pb-2 pt-1"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dddaae] font-black text-[#28432e]">F</span><div><p className="text-[11px] font-bold text-white">FUGTH Management OS</p><p className="text-[10px] text-[#a3c1a3]">Your business control center</p></div></div><span className="rounded-full bg-[#49684a] px-3 py-1.5 text-[10px] text-[#d8e6ce]">● Workspace preview</span></div>
   <div className="grid grid-cols-2 gap-3">
    <div className="relative col-span-2 h-[155px] overflow-hidden rounded-[18px] sm:h-[190px]"><SitePhoto industry="roofing" slot="marketing-roofing" className="absolute inset-0 h-full w-full"/><div className="absolute inset-0 bg-gradient-to-r from-[#0c2919]/85 via-[#0c2919]/35 to-transparent"/><div className="absolute bottom-4 left-5 max-w-[240px]"><span className="text-[10px] font-bold uppercase tracking-widest text-[#d7e1c7]">PREVIEW WEBSITE</span><p className="mt-2 font-serif text-3xl italic text-white">Built around<br/>your business.</p></div></div>
    <div className="rounded-[17px] bg-[#f7f8ef] p-4 text-[#2f4b34]"><span className="text-[9px] font-bold uppercase tracking-widest text-[#7d9681]">MISSED OPPORTUNITIES</span><p className="mt-4 text-2xl font-bold">One inbox.</p><p className="mt-1 text-xs leading-5 text-[#78907b]">Calls, transcripts and follow-up in a single view.</p><div className="mt-4 flex items-end gap-1">{[9,19,12,25,17,34,24,31].map((h,i)=><span key={i} className="w-2 flex-1 rounded-t-md bg-[#7caa81]" style={{height:h}}/>)}</div></div>
    <div className="relative overflow-hidden rounded-[17px] bg-[#d9e4d0] p-4 text-[#2a4833]"><span className="text-[9px] font-bold uppercase tracking-widest text-[#729074]">RECEPTIONIST</span><div className="mt-4 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#30533b] text-white">✳</span><span className="text-xs font-bold">Ready to answer</span></div><p className="mt-4 font-serif text-[19px] italic leading-snug">“Thank you for calling. How can I help?”</p></div>
   </div>
   <div className="flex items-center justify-between gap-3 px-2 pb-1 text-[10px] text-[#aac1aa]"><span>Website · Voice · CRM · Marketing</span><span className="text-[#d2dabf]">Everything in one place ↗</span></div>
  </div>
  <div className="absolute -bottom-8 -left-3 hidden max-w-[245px] rounded-2xl border border-[#dfe8d8] bg-white p-4 text-[#365238] shadow-[0_20px_50px_rgba(0,0,0,.14)] sm:block"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#759076]">YOUR AI CHATBOT</p><p className="mt-2 text-xs font-semibold">Can I help you book a consultation?</p><p className="mt-2 text-[10px] text-[#869889]">Also works on your existing site.</p></div>
 </div>;
}
export default function Home(){
 return <main className="min-h-screen overflow-x-hidden bg-[#f8f9f4] text-[#273d2d]">
  <header className="sticky top-0 z-40 border-b border-white/10 bg-[#182b21]/95 text-white backdrop-blur-xl"><div className="mx-auto flex min-h-[77px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
   <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9d4a1] font-black text-[#243e2c]">F</span><span className="text-[23px] font-bold tracking-[-.09em]">fugth<span className="text-[#d9d4a1]">.</span></span></Link>
   <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[12px] font-medium text-[#c2d4c0] md:flex"><a href="#platform" className="hover:text-white">Platform</a><a href="#demo" className="hover:text-white">Live demo</a><a href="#website" className="hover:text-white">Website + chat</a><a href="#pricing" className="hover:text-white">Pricing</a></nav>
   <div className="flex gap-2"><Link href="/login" className="rounded-xl border border-white/20 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10">Log in</Link><Link href="/login?signup=1" className="rounded-xl bg-[#dedbad] px-4 py-3 text-xs font-bold text-[#253b2b] hover:bg-[#f0e7bc]">Get started <Arrow/></Link></div>
  </div></header>

  <section className="relative overflow-hidden bg-[#1a2e22] text-white"><div className="pointer-events-none absolute -right-48 -top-28 h-[600px] w-[600px] rounded-full bg-[#466e48]/35 blur-[110px]"/><div className="pointer-events-none absolute -bottom-80 -left-24 h-[460px] w-[460px] rounded-full bg-[#846d48]/20 blur-[100px]"/>
   <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.07fr_.93fr] lg:gap-16 lg:py-32">
    <div><div className="inline-flex items-center gap-3 rounded-full border border-[#789275]/30 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#c1d8b8]"><span className="h-2 w-2 rounded-full bg-[#bad29d]"/>The business manager, reimagined</div>
     <h1 className="mt-8 max-w-[760px] text-[clamp(3.7rem,7.4vw,7.2rem)] font-semibold leading-[.96] tracking-[-.09em]">Your business.<br/><span className="font-serif font-normal italic text-[#ddcea0]">Always in motion.</span></h1>
     <p className="mt-8 max-w-[520px] text-sm leading-8 text-[#bdcebc] sm:text-[17px]">An AI receptionist that answers for you. A website and chatbot that feel like your business. Your leads, conversations, appointments and follow-ups — together.</p>
     <div className="mt-9 flex flex-wrap gap-3"><a href="#demo" className="inline-flex items-center gap-6 rounded-xl bg-[#dddaa9] px-6 py-4 text-sm font-bold text-[#253e2a]">Hear your AI receptionist <Arrow/></a><Link href="/login?signup=1" className="inline-flex items-center gap-4 rounded-xl border border-white/25 px-6 py-4 text-sm font-bold text-white">Explore the free workspace <Arrow/></Link></div>
     <div className="mt-10 flex flex-wrap gap-6 border-t border-white/15 pt-6 text-[11px] font-bold tracking-wide text-[#bed1b8]"><span>✓ 15-second live phone preview</span><span>✓ Your whole site visible on Zero</span><span>✓ Chatbot for existing sites</span></div>
    </div>
    <div className="pb-8"><BusinessDisplay/></div>
   </div>
  </section>
  <div className="border-y border-[#dce4d5] bg-[#e6ebdc] px-5 py-5 text-[#506b4e]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[.16em] sm:px-3"><span>Made for the businesses that keep communities moving</span><span>Home services / Wellness / Professional services / Local retail</span></div></div>
  <HomeFeatureTabs/>
  <PublicVoiceDemo/>
  <section id="website" className="scroll-mt-24 overflow-hidden bg-[#f7f3e8] py-20 text-[#344831] sm:py-28">
   <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[.95fr_1.05fr]">
    <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#857c5e]">WEBSITE CREATOR + FREE CHATBOT</p><h2 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.075em] sm:text-6xl">Your presence.<br/><span className="font-serif italic font-normal text-[#8c8763]">Your way.</span></h2>
     <p className="mt-6 max-w-xl text-sm leading-8 text-[#7b826d]">Explore your complete business website on Zero or Low before choosing a package. Every industry preview comes with a chatbot that knows the business information provided.</p>
     <div className="mt-6 grid gap-3 text-sm leading-6"><p>✳ <strong>Keep your existing website.</strong> Add the FUGTH chatbot with an embed code.</p><p>✳ <strong>Or move to FUGTH.</strong> Personal website design and launch coordination come with eligible packages.</p><p>✳ <strong>Guided appointment requests.</strong> The chatbot helps visitors reach your business without inventing available slots.</p></div>
     <p className="mt-6 max-w-xl rounded-xl border border-[#ded6b9] bg-white/60 p-4 text-xs leading-6 text-[#817861]">Preview templates are starting points, not final custom websites. For qualifying packages we target preparation within 24 hours after receiving complete onboarding materials. Domain or approval delays may extend public launch.</p>
     <Link href="/sites/showcase" className="mt-7 inline-flex rounded-xl bg-[#2b4732] px-6 py-4 text-sm font-bold text-white">Explore real preview styles <Arrow/></Link>
    </div>
    <div className="grid grid-cols-2 gap-3">{[["Editorial","bg-[#d8e2d1] text-[#284e36]","A place\nto grow.","font-serif italic"],["Bold service","bg-[#c47453] text-white","DONE.\nRIGHT.","font-black uppercase"],["Modern care","bg-[#dcd7c7] text-[#636252]","Feel\nbetter.","font-serif italic"],["Creative studio","bg-[#354f43] text-white","Made\nfor you.","font-semibold"]].map(([label,color,headline,font])=><div key={label} className={"flex aspect-[1.02] flex-col justify-between rounded-[24px] p-5 shadow-sm sm:p-7 "+color}><span className="text-[10px] font-bold uppercase tracking-[.16em]">{label}</span><p className={"whitespace-pre-line text-[clamp(1.75rem,3.5vw,3.1rem)] leading-[1.02] tracking-[-.06em] "+font}>{headline}</p><span className="self-start rounded-full border border-current/25 px-3 py-2 text-[10px] font-semibold">✳ Chat ready</span></div>)}</div>
   </div>
  </section>
  <section id="pricing" className="scroll-mt-24 bg-[#f9faf6] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8">
   <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#80977c]">TRANSPARENT PRICING</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.075em] sm:text-6xl">Start small. <span className="font-serif font-normal italic text-[#829c7e]">Build big.</span></h2></div><p className="max-w-sm text-sm leading-7 text-[#81917b]">Monthly business management plus a one-time personalized setup. Add only the workflows you need.</p></div>
   <div className="mt-10 grid gap-4 lg:grid-cols-3">{packages.map(p=><article key={p.key} className={"flex min-h-[410px] flex-col rounded-[25px] border p-7 "+(p.key==="growth"?"border-[#274330] bg-[#263f2e] text-white shadow-xl":"border-[#e0e8dd] bg-white text-[#2b4530]")}>
    <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-widest opacity-65">{p.key==="starter"?"ESSENTIALS":p.key==="growth"?"THE COMPLETE BUSINESS":"THE FULL OPERATION"}</span>{p.key==="growth"&&<span className="rounded-full bg-[#dfe8cd] px-3 py-1.5 text-[10px] font-black text-[#26402a]">POPULAR</span>}</div>
    <h3 className="mt-5 text-2xl font-bold">{p.name}</h3><p className="mt-3 min-h-[70px] text-xs leading-6 opacity-75">{p.description}</p>
    <div className="mt-6"><span className="text-5xl font-bold tracking-tight">{dollars(p.monthly)}</span><span className="ml-1 text-xs opacity-70">/ month</span></div>
    <p className="mt-3 border-b border-current/20 pb-5 text-xs font-semibold">{dollars(p.setup)} one-time professional setup</p>
    <ul className="my-5 flex-1 space-y-3 text-xs leading-6">{p.features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul>
    <Link href={"/plans?plan="+p.key} className={"flex justify-between rounded-xl px-5 py-4 text-sm font-bold "+(p.key==="growth"?"bg-[#e2e3ac] text-[#243b29]":"bg-[#eaf2e6] text-[#35543a]")}>Explore {p.name} <Arrow/></Link>
   </article>)}</div>
   <p className="mt-6 text-xs leading-6 text-[#879686]">Setup fees and subscriptions are separately disclosed at checkout. Add-ons, outbound voice minutes, SMS and third-party usage have defined limits. Businesses must complete an authorized Stripe checkout to activate billing.</p>
  </div></section>
  <section className="bg-[#1a2f22] px-5 py-20 text-white sm:py-28"><div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-10 sm:px-3"><div><p className="text-[11px] font-bold uppercase tracking-[.19em] text-[#aec5a9]">LET'S BUILD YOUR BUSINESS SYSTEM</p><h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.07em] sm:text-6xl">Ready for the next <span className="font-serif italic font-normal text-[#ddcea5]">version of your business?</span></h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#c2d1be]">Start with a free preview, or email our management team to arrange a longer guided demonstration.</p></div><div className="flex flex-col gap-3"><Link href="/login?signup=1" className="rounded-xl bg-[#dedbad] px-6 py-4 text-sm font-bold text-[#29432e]">Open your free workspace ↗</Link><a href="mailto:fugthmanagement@gmail.com?subject=FUGTH%20business%20demo%20request" className="rounded-xl border border-white/25 px-6 py-4 text-sm font-semibold text-white">Request a guided demo ↗</a></div></div></section>
  <footer className="bg-[#f7f8f2] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 text-xs text-[#839282]"><span>© 2026 FUGTH Chat LLC · FUGTH Management OS</span><div className="flex flex-wrap gap-5"><Link href="/login">Client login</Link><Link href="/sites/showcase">Website gallery</Link><Link href="/plans">Plans + setup</Link><a href="mailto:fugthmanagement@gmail.com">Email management</a></div></div></footer>
 </main>;
}
