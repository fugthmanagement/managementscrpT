import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(value,max=90)=>String(value||"").replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const options=new Set(["Roofing contractor","Plumber","HVAC contractor","Electrician","Cleaning service","Landscaping service","Dentist","Dental clinic","Bridal shop","Wedding planner","Real estate agency","Hair salon","Barber shop","Auto repair shop","General contractor","Restaurant","Photographer","Law firm","Pet groomer"]);
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!isFounder(user))return NextResponse.json({error:"Verified FUGTH founder access required."},{status:403});
 let body;try{const raw=await request.text();if(raw.length>2200)throw Error();body=JSON.parse(raw);}
 catch{return NextResponse.json({error:"Invalid search request."},{status:400});}
 const zip=clean(body.zipCode,10);
 if(!/^[0-9]{5}(?:-[0-9]{4})?$/.test(zip))return NextResponse.json({error:"Enter a valid five-digit ZIP code."},{status:400});
 const input=Array.isArray(body.categories)&&body.categories.length?body.categories:[body.businessType||"Local businesses"];
 const categories=[...new Set(input.map(x=>clean(x,65)))].slice(0,5);
 if(!categories.length||categories.some(c=>!c||(!options.has(c)&&c.length<3)))return NextResponse.json({error:"Choose valid business categories."},{status:400});
 const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(categories.join(" OR ")+" in "+zip);
 const apiKey=process.env.GOOGLE_MAPS_API_KEY;
 if(!apiKey)return NextResponse.json({error:"GOOGLE_MAPS_API_KEY is missing from the production Vercel environment. Enable Places API (New) and redeploy after configuration.",mapsUrl,places:[]},{status:503});
 try{
  const queries=categories.map(category=>category+" in "+zip);
  const results=await Promise.all(queries.map(async textQuery=>{
   const res=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":apiKey,
     "X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.googleMapsUri,places.rating,places.userRatingCount"},
    body:JSON.stringify({textQuery,maxResultCount:20,languageCode:"en"}),cache:"no-store",signal:AbortSignal.timeout(12500)});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Object.assign(new Error(data?.error?.message||"Google Places search failed."),{status:res.status});
   return data.places||[];
  }));
  const unique=new Map();
  for(const place of results.flat()){
   const id=clean(place.id,160);if(!id||unique.has(id))continue;
   unique.set(id,{placeId:id,businessName:clean(place.displayName?.text,110),address:clean(place.formattedAddress,180),
    phone:clean(place.nationalPhoneNumber,32),website:clean(place.websiteUri,300),hasWebsite:Boolean(place.websiteUri),
    googleMapsUrl:clean(place.googleMapsUri,350),rating:Number.isFinite(place.rating)?place.rating:null,
    reviewCount:Number.isFinite(place.userRatingCount)?place.userRatingCount:0,
    primaryType:clean(place.primaryType,80),types:Array.isArray(place.types)?place.types.slice(0,12).map(t=>clean(t,50)):[]});
  }
  return NextResponse.json({places:[...unique.values()].filter(p=>p.businessName),mapsUrl,queries,complete:false,
   note:"Google Places returns a ranked subset, not an exhaustive list of all businesses in a ZIP code. No website listed does not prove a company has no website."});
 }catch(e){console.warn("FUGTH Places category search",{status:e.status||"network"});
  return NextResponse.json({error:e.status===403?"Google Places rejected this API key. Confirm Places API (New), billing, quotas and server-key restrictions.":"Google Places search failed. "+String(e.message||"Try again.").slice(0,160),
   mapsUrl,places:[]},{status:503});}
}
