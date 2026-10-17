import Link from "next/link";
import SitePhoto from "../components/site-photo";
import HomeFeatureTabs from "../components/home-feature-tabs";
import PublicVoiceDemo from "../components/public-voice-demo";
import {BILLING_PLANS,dollars} from "../lib/billing-catalog";

const packages=Object.values(BILLING_PLANS);
const Arrow=()=> <span aria-hidden="true">↗</span>;
function BusinessDisplay(){
 const levels=[12,22,34,19,46,35,14,25,41,29,17,43,31,14,27,37,20,43,17,30,25,12];
 return <div className="relative mx-auto w-full max-w-[655px]">
  <div className="pointer-events-none absolute -inset-8 rounded-[80px] bg-[#cbd5a0]/10 blur-3xl"/>
  <div className="relative overflow-hidden rounded-[27px] border border-white/25 bg-[#f9faf3] text-[#293e30] shadow-[0_45px_120px_rgba(0,0,0,.38)]">
   <div className="flex items-center justify-between gap-2 border-b border-[#dfe6d9] px-4 py-4 sm:px-6">
    <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#294d35] text-sm font-black text-[#eee5bb]">F</span><div><p className="text-[11px] font-black leading-4 tracking-tight">FUGTH <span className="font-medium text-[#97a597]">/ CONTROL ROOM</span></p><p className="text-[9px] text-[#7e9281]">All your conversations, one place</p></div></div>
    <span className="flex items-center gap-1.5 rounded-full border border-[#dce5d7] bg-white px-3 py-2 text-[9px] font-bold text-[#4c6852]"><span className="h-1.5 w-1.5 rounded-full bg-[#6b9d71]"/> INTERFACE PREVIEW</span>
   </div>
   <div className="grid grid-cols-[51px_minmax(0,1fr)] sm:grid-cols-[128px_minmax(0,1fr)]">
    <aside className="flex min-h-[415px] flex-col gap-2 border-r border-[#e0e8db] bg-[#eff3eb] p-2 sm:p-3">
     <p className="hidden p-2 text-[9px] font-black uppercase tracking-widest text-[#a2b1a0] sm:block">YOUR BUSINESS</p>
     {[["⌂","Overview"],["◉","Call library"],["✧","Customers"],["▣","Website"]].map(([symbol,label],i)=><div key={label} className={"flex items-center gap-2.5 rounded-xl px-2.5 py-3 text-xs font-bold "+(i===1?"bg-[#295038] text-white shadow-md":"text-[#708776]")}><span className="text-base">{symbol}</span><span className="hidden sm:inline">{label}</span></div>)}
     <div className="mt-auto hidden rounded-xl border border-[#d2dfcd] bg-white p-3 text-[10px] leading-5 text-[#7b917b] sm:block">The receptionist, website, and leads work together.</div>
    </aside>
    <div className="min-w-0 p-3 sm:p-5">
     <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#90a08d]">CONVERSATION DESK</p><h3 className="mt-1 text-xl font-semibold tracking-[-.06em] sm:text-2xl">One call. <em className="font-serif font-normal">Every detail.</em></h3></div><span className="rounded-lg bg-[#e7f0df] px-2.5 py-2 text-[9px] font-bold text-[#547353]">CALL RECORDED</span></div>
     <div className="mt-5 rounded-[17px] bg-[#24402e] p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-widest text-[#b5d0b4]">INBOUND SERVICE INQUIRY</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] text-[#d4e4d1]">00:34 · Example</span></div>
      <div className="mt-4 flex items-center justify-between gap-3"><div><p className="font-semibold">AI receptionist</p><p className="mt-1 text-[10px] text-[#bdcdbc]">Audio · Transcript · Customer lead</p></div><div className="grid h-11 w-11 place-items-center rounded-full bg-[#dfe7bf] text-lg text-[#2b4a35]">▶</div></div>
      <div className="mt-5 flex h-12 items-center gap-1 overflow-hidden">{levels.map((h,i)=><span key={i} className="w-1 flex-1 rounded-full bg-[#b7d6b0]" style={{height:h,opacity:i%4===0?0.45:1}}/>)}</div>
      <p className="mt-2 text-[10px] text-[#afc6ad]">Every answered call can become a customer record.</p>
     </div>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="rounded-[15px] border border-[#dee8d9] bg-white p-4"><p className="text-[9px] font-black uppercase tracking-widest text-[#839b82]">CAPTURED LEAD</p><p className="mt-3 text-sm font-semibold">Estimate requested</p><p className="mt-2 text-[11px] leading-5 text-[#7b927c]">Caller details, reason for calling and a follow-up summary.</p><div className="mt-3 rounded-full bg-[#eef5e8] px-3 py-1.5 text-[10px] font-bold text-[#557454]">Needs follow-up ↗</div></div>
      <div className="relative overflow-hidden rounded-[15px] border border-[#dee8d9] bg-[#e4e9db]">
       <div className="absolute inset-0"><SitePhoto industry="roofing" slot="marketing-roofing" className="h-full w-full"/></div><div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1e3b2b]/50 to-[#1e3b2b]/95"/><div className="absolute bottom-4 left-4 right-3 text-white"><p className="text-[9px] font-bold uppercase tracking-widest text-[#d1debf]">WEBSITE + CHAT</p><p className="mt-1 font-serif text-xl italic">Your business, online.</p></div>
      </div>
     </div>
    </div>
   </div>
  </div>
  <div className="absolute -bottom-7 -right-2 hidden rotate-3 rounded-[17px] border border-[#ebe1c0] bg-[#e6dec2] px-5 py-4 text-[#314a35] shadow-2xl sm:block"><p className="text-[9px] font-black uppercase tracking-widest text-[#8d926f]">WORK SMARTER</p><p className="mt-1 font-serif text-lg italic">A business that remembers.</p></div>
 </div>;
}
export default function Home(){
 return <main className="min-h-screen overflow-x-hidden bg-[#faf7f1] text-[#483d32]">
  <header className="sticky top-0 z-40 border-b border-[#e5d9c8] bg-[#fffaf2]/95 text-[#453c32] backdrop-blur-xl"><div className="mx-auto flex min-h-[77px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
   <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ede0ca] to-[#c6af8f] font-black text-[#4e4030] shadow-[0_6px_20px_rgba(44,216,192,.22)]">F</span><span className="text-[23px] font-bold tracking-[-.09em]">fugth<span className="text-[#b59c78]">.</span></span></Link>
   <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[12px] font-medium text-[#81725f] md:flex"><a href="#platform" className="hover:text-white">Platform</a><a href="#demo" className="hover:text-white">Live demo</a><a href="#website" className="hover:text-white">Website + chat</a><a href="#pricing" className="hover:text-white">Pricing</a></nav>
   <div className="flex gap-2"><Link href="/login" className="rounded-xl border border-[#d8cbb8] px-4 py-3 text-xs font-semibold text-[#514637] hover:bg-[#f6ecdf]">Log in</Link><Link href="/login?signup=1" className="rounded-xl bg-[#5c4c38] px-4 py-3 text-xs font-bold text-white hover:bg-[#40372e]">Get started <Arrow/></Link></div>
  </div></header>

  <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#fffaf1_0%,#f1e8da_55%,#e8d8c1_100%)] text-[#493b2e]"><div className="pointer-events-none absolute -right-48 -top-28 h-[600px] w-[600px] rounded-full bg-[#ffffff]/25 blur-[110px]"/><div className="pointer-events-none absolute -bottom-80 -left-24 h-[460px] w-[460px] rounded-full bg-[#a0a0a0]/25 blur-[100px]"/>
   <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.07fr_.93fr] lg:gap-16 lg:py-32">
    <div><div className="inline-flex items-center gap-3 rounded-full border border-[#cbb99e] bg-[#fffaf2]/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#806b4f]"><span className="h-2 w-2 rounded-full bg-[#ffffff]"/>The business manager, reimagined</div>
     <h1 className="mt-8 max-w-[760px] text-[clamp(3.7rem,7.4vw,7.2rem)] font-semibold leading-[.96] tracking-[-.09em]">Your business.<br/><span className="font-serif font-normal italic text-[#a68761]">Always in motion.</span></h1>
     <p className="mt-8 max-w-[520px] text-sm leading-8 text-[#786b5a] sm:text-[17px]">When a customer calls, your business keeps the conversation. An AI receptionist answers, records the request, builds a customer lead and keeps the next step organized — alongside your website and chatbot.</p>
     <div className="mt-9 flex flex-wrap gap-3"><a href="#demo" className="inline-flex items-center gap-6 rounded-xl bg-gradient-to-r from-[#5c4b36] to-[#776046] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_32px_rgba(44,211,199,.23)]">Hear your AI receptionist <Arrow/></a><Link href="/login?signup=1" className="inline-flex items-center gap-4 rounded-xl border border-white/25 px-6 py-4 text-sm font-bold text-white">Explore the free workspace <Arrow/></Link></div>
     <div className="mt-10 flex flex-wrap gap-6 border-t border-white/15 pt-6 text-[11px] font-bold tracking-wide text-[#c5c5c5]"><span>✓ 30-second real phone demo</span><span>✓ Your whole site visible on Zero</span><span>✓ Chatbot for existing sites</span></div>
    </div>
    <div className="pb-8"><BusinessDisplay/></div>
   </div>
  </section>
  <div className="border-y border-[#dddddd] bg-[#efefef] px-5 py-5 text-[#444444]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[.16em] sm:px-3"><span>One operating system for every conversation</span><span>Home services / Wellness / Professional services / Local retail</span></div></div>
  <section aria-label="How FUGTH turns calls into customer opportunities" className="border-b border-[#dcdcdc] bg-[#fafafa] px-5 py-12 sm:px-8">
   <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">{[
    ["01","The phone rings","Your receptionist answers business questions and asks what the caller needs."],
    ["02","The conversation becomes a lead","The call history, available contact details and a clear summary stay together."],
    ["03","The next step is visible","Review the recording, follow up with the customer and prepare appointment requests."]
   ].map(([step,title,body])=><div key={step} className="border-l-2 border-[#888888] pl-5"><span className="font-serif text-3xl italic text-[#555555]">{step}</span><h3 className="mt-3 text-lg font-semibold tracking-tight text-[#333333]">{title}</h3><p className="mt-2 max-w-xs text-xs leading-6 text-[#777777]">{body}</p></div>)}</div>
  </section>
  <HomeFeatureTabs/>
  <PublicVoiceDemo/>
  <section id="website" className="scroll-mt-24 overflow-hidden bg-[#f7f7f7] py-20 text-[#24454e] sm:py-28">
   <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[.95fr_1.05fr]">
    <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#666666]">WEBSITE CREATOR + FREE CHATBOT</p><h2 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.075em] sm:text-6xl">Your presence.<br/><span className="font-serif italic font-normal text-[#444444]">Your way.</span></h2>
     <p className="mt-6 max-w-xl text-sm leading-8 text-[#757575]">Explore your complete business website on Zero or Low before choosing a package. Every industry preview comes with a chatbot that knows the business information provided.</p>
     <div className="mt-6 grid gap-3 text-sm leading-6"><p>✳ <strong>Keep your existing website.</strong> Add the FUGTH chatbot with an embed code.</p><p>✳ <strong>Or move to FUGTH.</strong> Personal website design and launch coordination come with eligible packages.</p><p>✳ <strong>Guided appointment requests.</strong> The chatbot helps visitors reach your business without inventing available slots.</p></div>
     <p className="mt-6 max-w-xl rounded-xl border border-[#dddddd] bg-white/75 p-4 text-xs leading-6 text-[#666666]">Preview templates are starting points, not final custom websites. For qualifying packages we target preparation within 24 hours after receiving complete onboarding materials. Domain or approval delays may extend public launch.</p>
     <Link href="/sites/showcase" className="mt-7 inline-flex rounded-xl bg-[#111111] px-6 py-4 text-sm font-bold text-white hover:bg-[#333333]">Explore real preview styles <Arrow/></Link>
    </div>
    <div className="grid grid-cols-2 gap-3">{[["Editorial","bg-[#d8e2d1] text-[#284e36]","A place\nto grow.","font-serif italic"],["Bold service","bg-[#c47453] text-white","DONE.\nRIGHT.","font-black uppercase"],["Modern care","bg-[#dcd7c7] text-[#636252]","Feel\nbetter.","font-serif italic"],["Creative studio","bg-[#354f43] text-white","Made\nfor you.","font-semibold"]].map(([label,color,headline,font])=><div key={label} className={"flex aspect-[1.02] flex-col justify-between rounded-[24px] p-5 shadow-sm sm:p-7 "+color}><span className="text-[10px] font-bold uppercase tracking-[.16em]">{label}</span><p className={"whitespace-pre-line text-[clamp(1.75rem,3.5vw,3.1rem)] leading-[1.02] tracking-[-.06em] "+font}>{headline}</p><span className="self-start rounded-full border border-current/25 px-3 py-2 text-[10px] font-semibold">✳ Chat ready</span></div>)}</div>
   </div>
  </section>
  <section id="pricing" className="scroll-mt-24 bg-[#faf7f1] py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8">
   <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-[#80977c]">TRANSPARENT PRICING</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.075em] sm:text-6xl">Start small. <span className="font-serif font-normal italic text-[#829c7e]">Build big.</span></h2></div><p className="max-w-sm text-sm leading-7 text-[#81917b]">Monthly business management with a clearly disclosed setup package. Add only the workflows you need.</p></div>
   <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{packages.map(p=><article key={p.key} className={"flex min-h-[410px] flex-col rounded-[25px] border p-7 "+(p.key==="growth"?"border-[#beaa90] bg-[linear-gradient(155deg,#f4ebdc,#dfcfb9)] text-[#4e3e2e] shadow-[0_24px_55px_rgba(11,49,64,.23)]":"border-[#e6daca] bg-white text-[#453b30]")}>
    <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-widest opacity-65">{p.key==="website_one_time"?"ONE-TIME OWNERSHIP":p.key==="website"?"WEBSITE MANAGEMENT":p.key==="starter"?"FOUNDING CUSTOMERS":p.key==="growth"?"POPULAR":"FUGTH BUSINESS"}</span>{p.key==="growth"&&<span className="rounded-full bg-[#dfe8cd] px-3 py-1.5 text-[10px] font-black text-[#26402a]">POPULAR</span>}</div>
    <h3 className="mt-5 text-2xl font-bold">{p.name}</h3><p className="mt-3 min-h-[70px] text-xs leading-6 opacity-75">{p.description}</p>
    <div className="mt-6"><span className="text-5xl font-bold tracking-tight">{dollars(p.monthly)}</span><span className="ml-1 text-xs opacity-70">{p.kind==="one_time"?"once":"/ month"}</span></div>
    <p className="mt-3 border-b border-current/20 pb-5 text-xs font-semibold">{dollars(p.setup)} {p.setup?"one-time professional setup":"additional setup fee"}</p>
    <ul className="my-5 flex-1 space-y-3 text-xs leading-6">{p.features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul>
    <Link href={"/plans?plan="+p.key} className={"flex justify-between rounded-xl px-5 py-4 text-sm font-bold "+(p.key==="growth"?"bg-[#5c4b36] text-white":"bg-[#f1e8d9] text-[#5b4b38]")}>Explore {p.name} <Arrow/></Link>
   </article>)}</div>
   <p className="mt-6 text-xs leading-6 text-[#879686]">Setup fees and subscriptions are separately disclosed at checkout. Add-ons, outbound voice minutes, SMS and third-party usage have defined limits. Subscription purchases activate only after verified secure checkout.</p>
  </div></section>
  <section className="bg-[linear-gradient(135deg,#ebddc8,#f8f2e8)] px-5 py-20 text-[#4b3e30] sm:py-28"><div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-10 sm:px-3"><div><p className="text-[11px] font-bold uppercase tracking-[.19em] text-[#dddddd]">LET'S BUILD YOUR BUSINESS SYSTEM</p><h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.07em] sm:text-6xl">Ready for the next <span className="font-serif italic font-normal text-[#ededed]">version of your business?</span></h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#cccccc]">Start with a free preview, or email our management team to arrange a longer guided demonstration.</p></div><div className="flex flex-col gap-3"><Link href="/login?signup=1" className="rounded-xl bg-[#554535] px-6 py-4 text-sm font-bold text-white">Open your free workspace ↗</Link><a href="mailto:fugthmanagement@gmail.com?subject=FUGTH%20business%20demo%20request" className="rounded-xl border border-[#bfac91] px-6 py-4 text-sm font-semibold text-[#504134]">Request a guided demo ↗</a></div></div></section>
  <footer className="border-t border-[#ddcfbc] bg-[#f3ebdf] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 text-xs text-[#806f5a]"><span>© 2026 FUGTH Chat LLC · FUGTH Management OS</span><div className="flex flex-wrap gap-5"><Link href="/login">Client login</Link><Link href="/sites/showcase">Website gallery</Link><Link href="/plans">Plans + setup</Link><a href="mailto:fugthmanagement@gmail.com">Email management</a></div></div></footer>
 </main>;
}
