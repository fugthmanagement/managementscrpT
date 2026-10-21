import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const out=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"no-store"}});
const validId=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const validDemo=x=>/^[a-f0-9]{24}$/.test(String(x||""));
const limits=new Map();
function throttle(req){
 const ip=String(req.headers.get("x-forwarded-for")||"anonymous").split(",")[0].slice(0,75);
 const digest=createHash("sha256").update(ip).digest("hex").slice(0,24),now=Date.now(),v=limits.get(digest);
 if(v&&v.until>now&&v.n>=10)return true;
 limits.set(digest,{n:v&&v.until>now?v.n+1:1,until:now+600000});
 return false;
}
const uri=(v)=>{try{const u=new URL(String(v||""));return u.protocol==="https:"?u.href:""}catch{return ""}};
export async function GET(req){
 if(throttle(req))return out({error:"Google review lookup limit reached. See the official Google Maps listing instead."},429);
 const params=new URL(req.url).searchParams,type=params.get("type"),id=params.get("id");
 if(!(type==="demo"&&validDemo(id)||["published","draft"].includes(type)&&validId(id)))
  return out({error:"Choose a valid business preview."},400);
 let record;
 try{
  const db=firebaseAdmin().firestore();
  if(type==="demo"){
   const snap=await db.doc("prospectDemos/"+id).get(),d=snap.data();
   if(!snap.exists||d.revoked||d.expiresAt&&Date.parse(d.expiresAt)<=Date.now())return out({error:"Demo unavailable."},404);
   record=d.site;
  }else if(type==="published"){
   const snap=await db.doc("publicSites/"+id).get();
   if(!snap.exists||snap.data()?.visibility!=="published")return out({error:"Site is not published."},404);
   record=snap.data();
  }else{
   const user=await authenticatedUser(req);
   if(user?.uid!==id)return out({error:"Private preview needs owner sign-in."},403);
   const snap=await db.doc("siteDrafts/"+id).get();
   record=snap.exists?snap.data():null;
  }
 }catch{return out({error:"Could not retrieve this business's review configuration."},503)}
 const placeId=record?.googlePlaceId;
 if(!record?.showGoogleReviews||!/^[A-Za-z0-9_-]{10,180}$/.test(String(placeId||"")))
  return out({enabled:false,reviews:[]});
 if(!process.env.GOOGLE_MAPS_API_KEY)
  return out({enabled:false,error:"Google Places API is not configured for live review display."},503);
 try{
  const res=await fetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(placeId),{
   headers:{"X-Goog-Api-Key":process.env.GOOGLE_MAPS_API_KEY,
    "X-Goog-FieldMask":"id,displayName,rating,userRatingCount,googleMapsUri,reviews"},
   cache:"no-store",signal:AbortSignal.timeout(9500)});
  if(!res.ok)return out({error:"Google Places could not load this selected business. Check Places API (New), billing and matching Place ID."},502);
  const json=await res.json();
  const reviews=(json.reviews||[]).slice(0,5).map(x=>({
   name:String(x.authorAttribution?.displayName||"Google Maps user").slice(0,95),
   authorUrl:uri(x.authorAttribution?.uri),photoUrl:uri(x.authorAttribution?.photoUri),
   text:String(x.text?.text||x.originalText?.text||"").slice(0,900),
   rating:Number(x.rating)||0,date:String(x.relativePublishTimeDescription||"").slice(0,85),
   url:uri(x.googleMapsUri)||uri(json.googleMapsUri)
  })).filter(x=>x.text&&x.rating>0);
  return out({enabled:true,businessName:String(json.displayName?.text||"").slice(0,125),
   rating:Number(json.rating)||0,reviewCount:Number(json.userRatingCount)||0,
   mapsUrl:uri(json.googleMapsUri),reviews,
   ordering:"Google Places relevance (default). These reviews are not independently verified by Google.",
   source:"Google Maps Places API (New), fetched live; no review text is saved in FUGTH."});
 }catch(e){return out({error:"Live Google review data is temporarily unavailable."},503)}
}
