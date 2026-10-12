import Link from "next/link";

const offers = [
  { number: "01", icon: "✦", title: "An AI receptionist that answers", detail: "Give callers a natural first conversation, even when your team is busy, closed, or out on a job.", tone: "peach" },
  { number: "02", icon: "◉", title: "Every conversation in one place", detail: "Review call summaries, recordings, follow-ups, and new inquiries from your command center.", tone: "lilac" },
  { number: "03", icon: "↗", title: "Turn interest into appointments", detail: "Capture the information your team needs to follow through—and connect scheduling tools as you grow.", tone: "mint" },
];
const steps = [
  { number: "01", title: "Show us how you work", copy: "Tell your assistant about your services, prices, coverage area, and how you want to sound." },
  { number: "02", title: "Get your voice AI ready", copy: "Set up your phone workflow and choose what happens when a customer asks for help." },
  { number: "03", title: "Stay in the loop", copy: "Use your Fugth dashboard to see calls, conversations, prospects, and next steps." },
];
const industries = ["Dental & medical offices", "Law firms", "Roofing & construction", "HVAC & home services", "Auto repair", "Salons & barbers", "Real estate", "Pet services", "Marketing agencies"];
const plans = [
  { name: "Starter", price: "49", copy: "A better front desk for independent businesses.", features: ["AI voice workspace", "Call records and summaries", "Lead tracking", "Business instructions"] },
  { name: "Growth", price: "149", copy: "More room for busy teams and growing demand.", features: ["Everything in Starter", "Expanded calling allowances", "Campaign planning tools", "Appointment workspace"], featured: true },
  { name: "Elite", price: "499", copy: "Advanced operations with a tailored rollout.", features: ["Everything in Growth", "Higher agent capacity", "Priority support", "Business-specific setup"] },
];
const integrations = [
  { name: "Google Calendar", mark: "31", tone: "cal-google" },
  { name: "Outlook", mark: "O", tone: "cal-outlook" },
  { name: "Calendly", mark: "C", tone: "cal-calendly" },
  { name: "Square", mark: "S", tone: "cal-square" },
  { name: "Stripe", mark: "S", tone: "cal-stripe" },
];
function Arrow({ diagonal=false }) { return <span aria-hidden="true" className="inline-block font-bold">{diagonal?"↗":"→"}</span>; }
function Wave() { return <div className="waveform" aria-hidden="true">{[18,35,54,30,66,80,43,64,31,58,79,42,24,56,33,18,46,74,32,16,54,70,40,25].map((h,i)=><span key={i} style={{height:h+"%"}}/>)}</div>; }
function DemoVisual() { return <div className="hero-visual">
  <div className="visual-halo visual-halo-a"/><div className="visual-halo visual-halo-b"/>
  <div className="demo-phone">
    <div className="demo-phone-notch"/><div className="phone-top"><span className="phone-signal"><i/><i/><i/></span><span>Fugth AI</span><span>● ● ●</span></div>
    <div className="phone-content"><div className="phone-avatar">f<span>✳</span></div><p className="phone-kicker">Your virtual front desk</p><h3>Every call deserves<br/>a great hello.</h3><p className="phone-sub">AI receptionist • Connected</p><Wave/><div className="call-label"><span className="signal-dot"/> Voice assistant ready</div>
      <div className="phone-actions"><span className="phone-action">♬</span><span className="phone-action phone-action-main">☎</span><span className="phone-action">☷</span></div>
    </div>
  </div>
  <div className="floating-card floating-card-top"><div className="floating-icon">✓</div><div><strong>New inquiry captured</strong><span>Caller details saved to your workspace</span></div></div>
  <div className="floating-card floating-card-bottom"><span className="floating-mini-icon">✦</span><div><strong>Always there when it counts</strong><span>After hours · On the job · In meetings</span></div></div>
</div>; }
export default function HomePage(){
  return <main className="fugth-site">
    <div className="announcement"><span className="announcement-dot"/> Your business never stops. Your front desk shouldn't either. <a href="#demo">See how it works <Arrow/></a></div>
    <header className="site-header"><div className="site-header-inner">
      <Link href="/" className="fugth-wordmark" aria-label="Fugth Management home"><span className="brand-symbol">F<span>✳</span></span><span className="wordmark-words"><strong>Fugth<span className="wordmark-dot">.</span></strong><small>MANAGEMENT OS</small></span></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#platform">Platform</a><a href="#industries">Who it's for</a><a href="#integrations">Integrations</a><a href="#pricing">Pricing</a></nav>
      <div className="nav-actions"><Link href="/login" className="login-link">Log in</Link><a href="#demo" className="nav-cta">Book a demo <Arrow diagonal/></a></div>
    </div></header>
    <section className="hero-section" id="top"><div className="hero-inner"><div className="hero-copy">
      <div className="eyebrow"><span className="eyebrow-spark">✳</span> VOICE AI BUILT FOR REAL BUSINESS</div>
      <h1>Make every<br/><span className="hero-line">hello <em>count.</em></span></h1>
      <p className="hero-description">Missed calls shouldn't mean missed business. Meet your new AI front desk—ready to answer questions, capture leads, and help your customers find the next step.</p>
      <div className="hero-actions"><a className="btn btn-ink" href="#demo">See Fugth in action <Arrow diagonal/></a><a className="btn btn-quiet" href="#platform">Explore the platform <Arrow/></a></div>
      <div className="hero-proof"><div className="proof-stars" aria-hidden="true">✳ ✳ ✳</div><span>Built for the conversations that keep small businesses moving.</span></div>
    </div><DemoVisual/></div>
    <div className="hero-bottom-line"><span>BETTER CONVERSATIONS</span><span>LESS MISSED BUSINESS</span><span>MORE TIME FOR WHAT MATTERS</span></div>
    </section>
    <section className="marquee-section" id="industries"><div className="section-shell"><p className="micro-heading">MADE FOR THE WORK YOU DO</p><h2 className="industry-heading">From the front desk<br/>to the <span>field.</span></h2><p className="section-intro">Different industries. One big problem: when the phone rings, someone needs to answer. Fugth is designed to fit your team's everyday conversations.</p><div className="industry-grid">{industries.map((name,i)=><div key={name} className="industry-chip"><span className="industry-index">{String(i+1).padStart(2,"0")}</span><span>{name}</span><span className="chip-arrow">↗</span></div>)}</div></div></section>
    <section className="platform-section" id="platform"><div className="section-shell"><div className="platform-heading"><div><p className="micro-heading">ONE CONNECTED WORKSPACE</p><h2>Everything starts<br/>with a <span>conversation.</span></h2></div><p>Not just a robot picking up the phone. A more organized way to handle inquiries and help your business grow.</p></div><div className="feature-grid">{offers.map((f)=><article className={`feature-tile ${f.tone}`} key={f.number}><div className="feature-header"><span>{f.number} / WHAT YOU GET</span><span className="feature-glyph">{f.icon}</span></div><div className="feature-glyph-large">{f.icon}</div><h3>{f.title}</h3><p>{f.detail}</p></article>)}</div></div></section>
    <section className="process-section" id="how-it-works"><div className="section-shell process-layout"><div className="process-intro"><p className="micro-heading">IT'S YOUR BUSINESS. YOUR RULES.</p><h2>Keep it<br/><em>simple.</em></h2><p>Give your assistant the right context, put your voice workflow in place, and see what happened afterward. You stay in control.</p><a href="#demo" className="process-link">Talk through your setup <Arrow diagonal/></a></div><div className="process-steps">{steps.map(s=><article key={s.number} className="process-step"><span className="step-number">{s.number}</span><div><h3>{s.title}</h3><p>{s.copy}</p></div><span className="step-symbol">↗</span></article>)}</div></div></section>
    <section className="integration-section" id="integrations"><div className="section-shell integration-layout"><div><p className="micro-heading">WORK WITH THE TOOLS YOU ALREADY USE</p><h2>Your tools.<br/><span>Your workflow.</span></h2><p>We’re building a connection hub for calendars, appointment systems, CRMs, and industry software, so your receptionist can become part of how your team works.</p><Link href="/login" className="integrations-link">Explore your workspace <Arrow diagonal/></Link><p className="integration-disclaimer">Integrations vary by provider and may require setup. Featured tools illustrate our integration roadmap—not all are active connections today.</p></div><div className="integration-orbit"><span className="orbit-label">INTEGRATION HUB</span><div className="orbit-center"><span>F<span>✳</span></span><small>YOUR BUSINESS</small></div>{integrations.map((i,n)=><div className={`orbit-app orbit-${n} ${i.tone}`} key={i.name}><b>{i.mark}</b><small>{i.name}</small></div>)}</div></div></section>
    <section className="pricing-section" id="pricing"><div className="section-shell"><div className="pricing-header"><div><p className="micro-heading">PRICING THAT GROWS WITH YOU</p><h2>A smarter front desk.<br/><span>At every stage.</span></h2></div><p>Start with the essentials, then expand when your team and call volume grow.</p></div><div className="pricing-grid">{plans.map(t=><article className={`price-card ${t.featured?"price-featured":""}`} key={t.name}><div className="price-header"><h3>{t.name}</h3>{t.featured&&<span className="popular-pill">MOST POPULAR</span>}</div><p className="price-summary">{t.copy}</p><div className="price-display"><b>$ {t.price}</b><span>/ month</span></div><div className="price-line"/><p className="price-includes">PLAN HIGHLIGHTS</p><ul>{t.features.map(i=><li key={i}><span>✓</span>{i}</li>)}</ul><Link href="/login" className="price-button">Get started <Arrow diagonal/></Link></article>)}</div><p className="pricing-note">Usage allowances, onboarding, integrations, and call charges depend on the selected plan and configuration. Contact us for details before subscribing.</p></div></section>
    <section className="closing-section" id="demo"><div className="section-shell closing-inner"><div><p className="micro-heading">THE NEXT CALL COULD BE YOUR NEXT CUSTOMER</p><h2>Let's make sure<br/>you <em>answer.</em></h2><p>See whether Fugth Management is the right fit for your business. Tell us what you're looking to automate.</p><a className="btn btn-light" href="mailto:fugthmanagement@gmail.com?subject=Fugth%20Management%20Demo%20Request">Let's talk about your business <Arrow diagonal/></a></div><div className="closing-burst" aria-hidden="true">✳</div></div></section>
    <footer className="footer"><div className="section-shell footer-main"><div className="footer-brand"><span className="brand-symbol">F<span>✳</span></span><strong>Fugth<span>.</span></strong><p>A voice AI platform by Fugth Chat LLC.</p></div><div className="footer-links"><a href="#platform">Platform</a><a href="#industries">Industries</a><a href="#integrations">Integrations</a><a href="#pricing">Pricing</a><Link href="/login">Client login</Link><a href="mailto:fugthmanagement@gmail.com">Contact</a></div></div><div className="section-shell footer-base"><span>© {new Date().getFullYear()} Fugth Chat LLC. All rights reserved.</span><span>Built for the conversations that matter.</span></div></footer>
  </main>;
}
