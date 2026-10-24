"use client";
import {useEffect,useState} from "react";
import SiteRenderer from "../../../../components/site-renderer";
export default function SavedDemo({params}){
 const [state,setState]=useState({loading:true});
 const [lang,setLang]=useState("en");
 useEffect(()=>{fetch("/api/demo/"+encodeURIComponent(params.id),{cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||"Unavailable");setState({loading:false,...body})}).catch(e=>setState({loading:false,error:e.message}))},[params.id]);
 if(state.loading)return <main className="grid min-h-screen place-items-center">Loading preview…</main>;
 if(state.error)return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-3xl font-bold">Preview unavailable</h1><p className="mt-3">{state.error}</p></div></main>;
 const translated=lang==="es"?{...state.site,headline:({electrician:"Instalaciones eléctricas para su próximo proyecto.",mechanic:"Su vehículo merece un servicio confiable.",plumber:"Soluciones para sus necesidades de plomería."}[state.kind]||state.site?.headline),description:state.site?.description||"Consulte nuestros servicios y solicite información.",ctaLabel:"Solicitar información"}:state.site;
 return <div><div className="sticky top-0 z-[90] flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-[#fff9e9] px-5 py-3 text-xs text-[#665431]"><span><strong>FUGTH preview</strong> · {lang==="es"?"Concepto no aprobado por la empresa":"Independent design concept — not approved by the business"}</span><div className="flex gap-2"><button onClick={()=>setLang("en")} className={"rounded-lg px-3 py-2 "+(lang==="en"?"bg-[#263b38] text-white":"bg-white")}>English</button><button onClick={()=>setLang("es")} className={"rounded-lg px-3 py-2 "+(lang==="es"?"bg-[#263b38] text-white":"bg-white")}>Español</button></div></div><section className="border-b border-[#d4e9f2] bg-[#ecf8ff] px-5 py-6 text-center text-[#24475f]">
   <h2 className="text-lg font-black">Like this independent website concept?</h2>
   <p className="mx-auto mt-2 max-w-xl text-xs leading-6">This is a first design concept, not an official business site. If you like the layout, you can claim the preview after verifying ownership and tell us which colors, photos, sections, services, and other details you want improved. You can also book a walkthrough without signing in.</p>
   <div className="mt-4 flex flex-wrap justify-center gap-3">
    <a href={"/claim/"+encodeURIComponent(params.id)} className="rounded-xl bg-[#17495f] px-5 py-3 text-xs font-black text-white">Create account & request claim ↗</a>
    <a href={"/book?site="+encodeURIComponent(params.id)} className="rounded-xl border border-[#9dc9db] bg-white px-5 py-3 text-xs font-black">Book a guest consultation ↗</a>
   </div>
  </section><SiteRenderer data={translated} preview={true} demoId={params.id}/><section className="bg-[#fff9e9] p-8 text-center text-sm text-[#665431]"><p>Independent concept only. Some starter copy and images are illustrative until verified by the owner; authorized original photos and Google reviews, if shown, are identified separately. Booking a FUGTH consultation does not claim ownership of this business.</p></section></div>;
}