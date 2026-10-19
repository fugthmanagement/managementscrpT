import Link from "next/link";

export default function FeatureGate({locked,title,description,children}){
 if(!locked)return children;
 return <div className="relative overflow-hidden rounded-[24px] border border-[#d4e8f2] bg-white">
  <div aria-hidden="true" className="pointer-events-none select-none opacity-[.28] grayscale blur-[.25px]">{children}</div>
  <div className="absolute inset-0 grid place-items-center bg-[#f1faff]/72 p-5 backdrop-blur-[1px]">
   <div className="max-w-md rounded-2xl border border-[#d6e8f1] bg-white/95 p-6 text-center shadow-[0_18px_60px_rgba(31,42,32,.12)]">
    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#e0f3ff] text-lg" aria-hidden="true">🔒</span>
    <h3 className="mt-4 text-lg font-semibold text-[#234c63]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-[#6c899a]">{description}</p>
    <Link href="/plans" className="mt-5 inline-flex rounded-xl bg-[#19445b] px-5 py-3 text-xs font-bold text-white">Compare plans</Link>
   </div>
  </div>
 </div>;
}
