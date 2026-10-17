import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(v,max=80)=>String(v||"").replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!isFounder(user))return NextResponse.json({error:"Verified founder access required."},{status:403});
 let body;try{const text=await request.text();if(text.length>2000)throw Error();body=JSON.parse(text);}
 catch{return NextResponse.json({error:"Invalid search."},{status:400});}
 const zipCode=clean(body?.zipCode,16);
 const names=Array.isArray(body?.businessTypes)?body.businessTypes:[body?.businessType];
 const categories=[...new Set(names.map(v=>clean(v,70)).filter(Boolean))].slice(0,5);
 if(!categories.length||!zipCode)return NextResponse.json({error:"Select at least one business category and a ZIP code."},{status:400});
 const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(categories[0]+" in "+zipCode);
 const apiKey=process.env.GOOGLE_MAPS_API_KEY;
 if(!apiKey)return NextResponse.json({error:"Google Maps API key is not configured. Enable Places API (New) in Google Cloud and set GOOGLE_MAPS_API_KEY in Vercel.",mapsUrl,places:[]},{status:503});
 try{
  const calls=await Promise.all(categories.map(async category=>{
   const response=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.googleMapsUri,places.rating,places.userRatingCount"},
    body:JSON.stringify({textQuery:category+" in "+zipCode,maxResultCount:20,languageCode:"en"}),cache:"no-store",signal:AbortSignal.timeout(14000)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error("Google Places rejected "+category+" search: "+String(data.error?.message||response.status).slice(0,150));
   return (data.places||[]).map(place=>({
    placeId:clean(place.id,160),businessName:clean(place.displayName?.text,110),address:clean(place.formattedAddress,180),
    phone:clean(place.nationalPhoneNumber,32),website:clean(place.websiteUri,300),hasWebsite:Boolean(place.websiteUri),
    googleMapsUrl:clean(place.googleMapsUri,300),rating:Number.isFinite(place.rating)?place.rating:null,
    reviewCount:Number.isInteger(place.userRatingCount)?place.userRatingCount:0,
    primaryType:clean(place.primaryType,80),category:category,
    types:Array.isArray(place.types)?place.types.slice(0,12).map(v=>clean(v,50)):[]
   }));
  }));
  const unique=new Map();
  for(const x of calls.flat())if(x.businessName&&!unique.has(x.placeId||x.businessName+"|"+x.phone))unique.set(x.placeId||x.businessName+"|"+x.phone,x);
  return NextResponse.json({places:[...unique.values()].slice(0,100),mapsUrl,categories,query:categories.join(", ")+" in "+zipCode});
 }catch(error){console.error("FUGTH Google Places search failed",{message:String(error?.message||"unavailable").slice(0,170)});
  return NextResponse.json({error:error?.message||"Google Places temporarily unavailable.",mapsUrl,places:[]},{status:503});}
}
