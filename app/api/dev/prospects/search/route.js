import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(v,max=90)=>String(v||"").replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
export async function POST(request){
 const user=await authenticatedUser(request);
 if(!isFounder(user))return NextResponse.json({error:"Verified founder access required."},{status:403});
 let body={};try{const text=await request.text();if(text.length>3000)throw Error();body=JSON.parse(text);}catch{return NextResponse.json({error:"Invalid prospect query."},{status:400});}
 const zipCode=clean(body.zipCode,12);
 const requested=Array.isArray(body.categories)?body.categories:[body.businessType];
 const categories=[...new Set(requested.map(x=>clean(x,70)).filter(Boolean))].slice(0,5);
 const websiteFilter=["all","missing","listed"].includes(body.websiteFilter)?body.websiteFilter:"all";
 const minRating=Math.min(5,Math.max(0,Number(body.minRating)||0)),minReviews=Math.min(1000,Math.max(0,Number(body.minReviews)||0));
 if(!/^\d{5}$/.test(zipCode)||!categories.length)return NextResponse.json({error:"Enter a 5-digit U.S. ZIP code and at least one business category."},{status:400});
 const queries=categories.map(category=>category+" in "+zipCode);
 const mapsUrls=queries.map(query=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(query));
 const apiKey=process.env.GOOGLE_MAPS_API_KEY;
 if(!apiKey)return NextResponse.json({error:"Google Places is not enabled yet. Enable Places API (New), add a restricted GOOGLE_MAPS_API_KEY to Vercel, and redeploy.",mapsUrl:mapsUrls[0],mapsUrls,places:[],configured:false},{status:503});
 const fieldMask="places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.googleMapsUri,places.rating,places.userRatingCount";
 try{
  const results=await Promise.all(queries.map(async textQuery=>{
   const controller=AbortSignal.timeout(11500);
   const response=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":fieldMask},
    body:JSON.stringify({textQuery,maxResultCount:20,languageCode:"en"}),cache:"no-store",signal:controller});
   const json=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(json?.error?.message||"Places API returned "+response.status);
   return json.places||[];
  }));
  const deduped=new Map();
  for(const row of results.flat()){
   const placeId=clean(row.id,180),businessName=clean(row.displayName?.text,110),phone=clean(row.nationalPhoneNumber,35);
   const dedupeId=placeId||businessName.toLowerCase()+"|"+phone;
   if(!businessName||deduped.has(dedupeId))continue;
   const website=clean(row.websiteUri,350);
   deduped.set(dedupeId,{placeId,businessName,address:clean(row.formattedAddress,190),phone,website,
    hasWebsiteListed:Boolean(website),websiteStatus:website?"listed":"not_listed",
    googleMapsUrl:clean(row.googleMapsUri,350),primaryType:clean(row.primaryType,80),
    rating:Number.isFinite(row.rating)?row.rating:null,reviewCount:Number.isInteger(row.userRatingCount)?row.userRatingCount:0,
    types:Array.isArray(row.types)?row.types.slice(0,14).map(x=>clean(x,50)):[]});
  }
  let places=[...deduped.values()];
  if(websiteFilter==="missing")places=places.filter(p=>!p.hasWebsiteListed);
  if(websiteFilter==="listed")places=places.filter(p=>p.hasWebsiteListed);
  if(minRating>0)places=places.filter(p=>p.rating!=null&&p.rating>=minRating);
  if(minReviews>0)places=places.filter(p=>p.reviewCount>=minReviews);
  return NextResponse.json({places,mapsUrl:mapsUrls[0],mapsUrls,queries,searchedCategories:categories,
   totalRetrieved:deduped.size,returned:places.length,configured:true,notice:"Missing website in Google Places is only a lead signal, not proof that the business has no website."},
   {headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  console.error("FUGTH Places search failed",{code:error?.code||"upstream"});
  return NextResponse.json({error:"Google Places search failed. Check the Places API, billing, allowed IP/API restrictions, and quota.",places:[],mapsUrl:mapsUrls[0],mapsUrls},{status:503});
 }
}
