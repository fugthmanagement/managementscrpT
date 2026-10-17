import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const clean=(x,n=100)=>String(x||"").replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,n);
const categories={
 electrician:["craft","electrician"],plumber:["craft","plumber"],mechanic:["shop","car_repair"],"auto repair":["shop","car_repair"],
 roofing:["craft","roofer"],"roofing contractor":["craft","roofer"],"electrical contractor":["craft","electrician"],
 "plumbing contractor":["craft","plumber"],hvac:["craft","hvac"],"heating & cooling":["craft","hvac"],
 cleaning:["craft","cleaning"],landscaping:["craft","gardener"],"landscaping contractor":["craft","gardener"],
 salon:["shop","hairdresser"],barber:["shop","hairdresser"],restaurant:["amenity","restaurant"],
 cafe:["amenity","cafe"],dentist:["amenity","dentist"],lawyer:["office","lawyer"],accountant:["office","accountant"]
};
function tagsFor(term){const s=term.toLowerCase();return categories[s]||Object.entries(categories).find(([key])=>s.includes(key))?.[1]||null;}
const cache=new Map();
export async function POST(request){
 const user=await authenticatedUser(request);if(!isFounder(user))return NextResponse.json({error:"Founder access required"},{status:403});
 const body=await request.json().catch(()=>({})),zip=clean(body.zipCode,12),chosen=Array.isArray(body.categories)&&body.categories.length?body.categories:[body.businessType],types=[...new Set(chosen.map(v=>clean(v,70)).filter(Boolean))].slice(0,5);
 if(!/^\d{5}$/.test(zip)||!types.length)return NextResponse.json({error:"Enter a US 5-digit ZIP and category"},{status:400});
 const unsupported=types.filter(t=>!tagsFor(t));if(unsupported.length)return NextResponse.json({error:"OpenStreetMap does not yet have a mapped category for: "+unsupported.join(", ")+". Try electrician, plumber, auto repair, roofing, cleaning, HVAC, landscaping, salon or restaurant."},{status:400});
 const websiteFilter=["missing","listed","all"].includes(body.websiteFilter)?body.websiteFilter:"all",key=JSON.stringify([zip,types,websiteFilter]);
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return NextResponse.json({...hit.data,cached:true});
 try{
 const geo=await fetch("https://api.zippopotam.us/us/"+zip,{signal:AbortSignal.timeout(6000),cache:"no-store"});
 if(!geo.ok)throw Error("ZIP lookup unavailable");const place=await geo.json();const lat=Number(place.places?.[0]?.latitude),lon=Number(place.places?.[0]?.longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error("Unknown ZIP");
 const clauses=types.map(t=>{const [k,v]=tagsFor(t);return `nwr["${k}"="${v}"](around:7000,${lat},${lon});`}).join("");
 const query=`[out:json][timeout:20];(${clauses});out center 180;`;
 const upstream=await fetch("https://overpass.kumi.systems/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"FUGTHManagement/1.0 (business research; contact: fugthmanagement@gmail.com)"},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(24000),cache:"no-store"});
 if(!upstream.ok)throw Error("OpenStreetMap is busy ("+upstream.status+")");
 const json=await upstream.json();const seen=new Set();let places=[];
 for(const item of (json.elements||[])){
 const t=item.tags||{},businessName=clean(t.name||t["name:en"],110);if(!businessName)continue;
 const phone=clean(t.phone||t["contact:phone"],35),website=clean(t.website||t["contact:website"]||t.url,350),location=clean([t["addr:housenumber"],t["addr:street"],t["addr:city"]||place.places?.[0]?.["place name"],t["addr:state"]||place.places?.[0]?.state].filter(Boolean).join(" "),190);
 const k=businessName.toLowerCase()+"|"+location.toLowerCase();if(seen.has(k))continue;seen.add(k);
 places.push({placeId:"osm_"+item.type+"_"+item.id,businessName,address:location,phone,website,hasWebsiteListed:!!website,websiteStatus:website?"listed":"not_listed",googleMapsUrl:"https://www.openstreetmap.org/"+item.type+"/"+item.id,primaryType:clean(t.craft||t.shop||t.amenity||t.office,75),rating:null,reviewCount:0,types:[],source:"OpenStreetMap"});
 }
 const count=places.length;if(websiteFilter==="missing")places=places.filter(p=>!p.website);else if(websiteFilter==="listed")places=places.filter(p=>!!p.website);
 const data={places,returned:places.length,totalRetrieved:count,source:"OpenStreetMap",notice:"No website tagged in OpenStreetMap does not mean the business has no website. OSM coverage and phone listings vary; verify each lead.",configured:true};
 if(cache.size>60)cache.clear();cache.set(key,{data,expires:Date.now()+15*60*1000});return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return NextResponse.json({error:"Free OpenStreetMap lookup could not complete: "+clean(e.message,110)+". Retry later or use CSV import.",places:[]},{status:503})}
}
