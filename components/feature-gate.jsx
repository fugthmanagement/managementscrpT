import Link from "next/link";

export default function FeatureGate({locked,title,description,children}){
 if(!locked)return children;
 return <div className="relative overflow-hidden rounded-[24px] border border-[#dfe3da] bg-white">
  <div aria-hidden="true" className="pointer-events-none select-none opacity-[.28] grayscale blur-[.25px]">{children}</div>
  <div className="absolute inset-0 grid place-items-center bg-[#f8f9f6]/72 p-5 backdrop-blur-[1px]">
   <div className="max-w-md rounded-2xl border border-[#d9dfd4] bg-white/95 p-6 text-center shadow-[0_18px_60px_rgba(31,42,32,.12)]">
    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#e8ede5] text-lg" aria-hidden="true">🔒</span>
    <h3 className="mt-4 text-lg font-semibold text-[#2d392f]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-[#737d72]">{description}</p>
    <Link href="/plans" className="mt-5 inline-flex rounded-xl bg-[#29372d] px-5 py-3 text-xs font-bold text-white">Compare plans</Link>
   </div>
  </div>
 </div>;
}
