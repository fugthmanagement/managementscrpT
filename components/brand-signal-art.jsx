// Custom FUGTH visual language: a hand-composed signal-routing diagram,
// not an AI illustration or a generic stock dashboard.
export default function BrandSignalArt({compact=false}){
 return <div className={"fugth-signal-art "+(compact?"fugth-signal-art-compact":"")} role="img" aria-label="Illustrated example of a customer call moving from missed call through AI reception to a saved lead and appointment">
  <div className="fugth-signal-art-top">
   <div className="flex items-center gap-2"><span className="fugth-signal-art-mark">F / SIGNAL</span><span className="fugth-signal-art-division">Customer flow · 01—03</span></div>
   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em]"><span className="h-2 w-2 rounded-full bg-[#84d6bf]"/> System listening</div>
  </div>
  <div className="fugth-signal-art-canvas">
   <svg aria-hidden="true" viewBox="0 0 760 346" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
    <defs><pattern id="fugth-art-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" stroke="#bed6dd" strokeWidth=".65" fill="none" opacity=".43"/></pattern><linearGradient id="fugth-art-line"><stop stopColor="#2d6e8f"/><stop offset=".5" stopColor="#9bdcef"/><stop offset="1" stopColor="#2d6e8f"/></linearGradient></defs>
    <rect width="760" height="346" fill="url(#fugth-art-grid)"/>
    <path d="M45 204 H187 Q220 204 220 172 V95 Q220 70 245 70 H430 Q461 70 461 106 V231 Q461 257 494 257 H720" stroke="url(#fugth-art-line)" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M45 204 H187 Q220 204 220 172 V95 Q220 70 245 70 H430 Q461 70 461 106 V231 Q461 257 494 257 H720" stroke="#f8fcff" strokeWidth="2" strokeDasharray="4 13" fill="none" strokeLinecap="round"/>
    {[[220,170],[461,170],[603,257]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="11" fill="#193344" stroke="#b0e6ff" strokeWidth="3"/><circle cx={x} cy={y} r="3" fill="#b0e6ff"/></g>)}
    <path d="M640 41 h66 M673 9 v66" stroke="#7db6ce" strokeWidth="1" opacity=".5"/>
    <circle cx="673" cy="41" r="18" fill="none" stroke="#7db6ce" strokeWidth="1" opacity=".5"/>
   </svg>
   <div className="fugth-signal-art-node fugth-signal-art-node-call">
    <div className="flex items-center justify-between gap-2"><small>01 / THE RING</small><span>↗</span></div>
    <strong>Incoming call</strong>
    <p>A potential customer is calling while you're on a job.</p>
    <div className="fugth-art-wave" aria-hidden="true">{[11,18,25,16,31,20,14,24,11,18,9].map((v,i)=><i key={i} style={{height:v}}/>)}</div>
   </div>
   <div className="fugth-signal-art-node fugth-signal-art-node-reception">
    <div className="flex items-center justify-between gap-2"><small>02 / THE RESPONSE</small><span className="h-2 w-2 rounded-full bg-[#7dcbae]"/></div>
    <strong>Receptionist</strong>
    <p>“Hi! What kind of service can we help with?”</p>
    <span className="fugth-art-capsule">Conversation captured</span>
   </div>
   <div className="fugth-signal-art-node fugth-signal-art-node-lead">
    <div className="flex items-center justify-between gap-2"><small>03 / THE NEXT STEP</small><span>✓</span></div>
    <strong>Lead, saved.</strong>
    <p>Details organized for a callback or appointment.</p>
    <div className="flex items-center gap-2 text-[10px] font-bold text-[#366b84]"><span className="h-1.5 w-7 rounded-full bg-[#72bee2]"/> Ready for follow-up</div>
   </div>
   <div className="fugth-signal-coordinate">26° / BUSINESS OPERATIONS<br/>ILLUSTRATIVE FLOW</div>
  </div>
  <div className="fugth-signal-art-foot"><span>Keep the conversation moving, even when you're busy.</span><span>FUGTH © 2026</span></div>
 </div>;
}
