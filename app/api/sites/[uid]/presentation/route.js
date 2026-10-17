import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(x,status=200)=>NextResponse.json(x,{status,headers:{"Cache-Control":"private, no-store"}});
const okId=x=>/^[A-Za-z0-9_-]{8,128}$/.test(x||"");
const str=(x,n=110)=>String(x??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
const url=x=>{const v=str(x,450);try{return v&&new URL(v).protocol==="https:"?v:"";}catch{return "";}};
async function access(req,uid){
 const user=await authenticatedUser(req);if(!user)return {error:reply({error:"Sign in required."},401)};
 if(!okId(uid)||(user.uid!==uid&&!isFounder(user)))return {error:reply({error:"This presentation belongs to another customer."},403)};
 const admin=firebaseAdmin(),db=admin.firestore(),profile=await db.doc("users/"+uid).get();
 if(!profile.exists)return {error:reply({error:"Customer account not found."},404)};
 const p=profile.data()||{},founder=isFounder(user);
 if(!founder&&!p.websitePurchased&&!(p.billingActive&&["website","starter","growth","elite"].includes(p.planTier)))
  return {error:reply({error:"This presentation requires an active website package."},403)};
 return {user,founder,db,profile:p};
}
export async function GET(req,{params}){
 try{const a=await access(req,params.uid);if(a.error)return a.error;
  const doc=await a.db.doc("clientShowcases/"+params.uid).get();
  return reply({showcase:doc.exists?doc.data():{handle:"",items:[],sessions:[]},industry:a.profile.businessType||"general"});
 }catch(e){return reply({error:"Presentation database unavailable."},503);}
}
export async function PUT(req,{params}){
 let raw;
 try{const text=await req.text();if(text.length>40000)throw Error();raw=JSON.parse(text);}catch{return reply({error:"Presentation data is too large or invalid."},400);}
 if(!raw||typeof raw!=="object"||!Array.isArray(raw.items)||!Array.isArray(raw.sessions)||raw.items.length>80||raw.sessions.length>40)
  return reply({error:"Invalid presentation details."},400);
 const items=raw.items.map((v,i)=>({id:str(v.id,60)||"item"+i,title:str(v.title,110),brand:str(v.brand,90),category:str(v.category,65),mediaUrl:url(v.mediaUrl),note:str(v.note,240)})).filter(x=>x.title);
 const ids=new Set(items.map(x=>x.id));
 const sessions=raw.sessions.map((s,i)=>({id:str(s.id,60)||"session"+i,customerName:str(s.customerName,95),appointmentAt:str(s.appointmentAt,60),
  favorites:Array.isArray(s.favorites)?[...new Set(s.favorites.map(x=>str(x,60)).filter(x=>ids.has(x)))].slice(0,80):[]})).filter(s=>s.customerName);
 try{const a=await access(req,params.uid);if(a.error)return a.error;
  const saved={handle:str(raw.handle,45),items,sessions,industry:["wedding","realestate"].includes(raw.industry)?raw.industry:"wedding",
   updatedAt:new Date().toISOString(),updatedBy:a.user.uid};
  await a.db.doc("clientShowcases/"+params.uid).set(saved);
  return reply({saved:true,showcase:saved});
 }catch{return reply({error:"Could not save the presentation. Check Firebase administrator permissions."},503);}
}
