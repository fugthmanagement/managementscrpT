import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const validUid=x=>/^[A-Za-z0-9_-]{8,128}$/.test(String(x||""));
const clean=(x,n=160)=>String(x??"").replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const configured=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function context(request,uid){
 if(!validUid(uid))return {error:response({error:"Invalid business site."},400)};
 const user=await authenticatedUser(request);
 if(!user)return {error:response({error:"Sign in to view your private account."},401)};
 if(!configured())return {error:response({error:"Secure customer records are not configured yet."},503)};
 const db=firebaseAdmin().firestore(),owner=user.uid===uid;
 const site=await db.doc("publicSites/"+uid).get();
 if(!site.exists||(!owner&&site.data()?.visibility!=="published"))return {error:response({error:"This business website is not published."},404)};
 return {db,user,uid,owner,site:site.data()};
}
export async function GET(request,{params}){
 try{
  const c=await context(request,params.uid);if(c.error)return c.error;
  const root=c.db.collection("siteCustomers").doc(c.uid),member=root.collection("members").doc(c.user.uid);
  if(c.owner){
   const [people,records]=await Promise.all([root.collection("members").orderBy("createdAt","desc").limit(200).get(),root.collection("records").orderBy("createdAt","desc").limit(300).get()]);
   return response({role:"owner",businessName:c.site.name,members:people.docs.map(x=>({id:x.id,...x.data()})),records:records.docs.map(x=>({id:x.id,...x.data()}))});
  }
  const [profile,items]=await Promise.all([member.get(),root.collection("records").where("customerUid","==",c.user.uid).limit(100).get()]);
  return response({role:"customer",businessName:c.site.name,member:profile.exists?profile.data():null,records:items.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))});
 }catch(e){console.error("site customer portal GET",e?.code||e?.message);return response({error:"Could not load this private account."},503)}
}
export async function POST(request,{params}){
 try{
  const c=await context(request,params.uid);if(c.error)return c.error;
  const raw=await request.text();if(raw.length>5000)return response({error:"Request too large."},413);
  let data;try{data=JSON.parse(raw)}catch{return response({error:"Invalid request."},400)}
  const root=c.db.collection("siteCustomers").doc(c.uid),now=new Date().toISOString();
  if(data.action==="profile"){
   if(c.owner)return response({error:"Open a customer's own profile to change their information."},403);
   const displayName=clean(data.displayName,90),phone=clean(data.phone,35),address=clean(data.address,240);
   if(!displayName)return response({error:"Enter your name."},400);
   const ref=root.collection("members").doc(c.user.uid),previous=await ref.get();
   await ref.set({customerUid:c.user.uid,businessUid:c.uid,displayName,phone,address,
    email:c.user.email_verified?clean(c.user.email,140):"",updatedAt:now,
    createdAt:previous.exists?previous.data()?.createdAt||now:now},{merge:true});
   return response({saved:true,member:(await ref.get()).data()});
  }
  if(data.action==="record"){
   if(!c.owner)return response({error:"Only the business owner can record work or payments."},403);
   const customerUid=clean(data.customerUid,128);
   if(!validUid(customerUid))return response({error:"Choose a registered customer."},400);
   const member=await root.collection("members").doc(customerUid).get();
   if(!member.exists)return response({error:"That customer has not joined this business."},404);
   const title=clean(data.title,110),description=clean(data.description,700),status=["scheduled","in_progress","completed","cancelled"].includes(data.status)?data.status:"scheduled";
   const cost=Number(data.totalCents),paid=Number(data.paidCents);
   if(!title||!Number.isSafeInteger(cost)||!Number.isSafeInteger(paid)||cost<0||paid<0||cost>100000000||paid>cost)return response({error:"Enter a job title and valid total/paid amounts."},400);
   const recordId=clean(data.recordId,128);
   const ref=recordId?root.collection("records").doc(recordId):root.collection("records").doc();
   const existing=recordId?await ref.get():null;
   if(recordId&&(!existing?.exists||existing.data()?.customerUid!==customerUid))return response({error:"Record not found for this customer."},404);
   const record={customerUid,businessUid:c.uid,title,description,status,totalCents:cost,paidCents:paid,
    serviceDate:clean(data.serviceDate,16),updatedAt:now,createdAt:existing?.data()?.createdAt||now};
   await ref.set(record);return response({saved:true,id:ref.id,record});
  }
  return response({error:"Unknown action."},400);
 }catch(e){console.error("site customer portal POST",e?.code||e?.message);return response({error:"Could not save customer information."},503)}
}
