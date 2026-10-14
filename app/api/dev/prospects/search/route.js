import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../../lib/server/auth";

const clean=(value,max=80)=>String(value||"").replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);

export async function POST(request){
 const user=await authenticatedUser(request);
 if(!isFounder(user))return NextResponse.json({error:"Verified founder access required."},{status:403});
 let body={};try{body=await request.json();}catch{}
 const businessType=clean(body.businessType,70),zipCode=clean(body.zipCode,16);
 if(!businessType||!zipCode)return NextResponse.json({error:"Enter a business type and ZIP code."},{status:400});
 const query=`${businessType} in ${zipCode}`;
 const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
 const apiKey=process.env.GOOGLE_MAPS_API_KEY;
 if(!apiKey)return NextResponse.json({error:"Google Places is ready in the app, but GOOGLE_MAPS_API_KEY is not configured yet.",mapsUrl,places:[]},{status:503});
 try{
  const response=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.googleMapsUri"},body:JSON.stringify({textQuery:query,maxResultCount:20,languageCode:"en"}),cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return NextResponse.json({error:data?.error?.message||"Google Places search could not be completed.",mapsUrl,places:[]},{status:response.status});
  const places=(data.places||[]).map(place=>({placeId:clean(place.id,160),businessName:clean(place.displayName?.text,100),address:clean(place.formattedAddress,180),phone:clean(place.nationalPhoneNumber,32),website:clean(place.websiteUri,240),googleMapsUrl:clean(place.googleMapsUri,300),primaryType:clean(place.primaryType,80),types:Array.isArray(place.types)?place.types.slice(0,12).map(type=>clean(type,50)):[]})).filter(place=>place.businessName);
  return NextResponse.json({places,mapsUrl,query});
 }catch(error){console.error("Google Places search failed",error?.message||"unknown");return NextResponse.json({error:"Google Places is temporarily unavailable.",mapsUrl,places:[]},{status:503});}
}
