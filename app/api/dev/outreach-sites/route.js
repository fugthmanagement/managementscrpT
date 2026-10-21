import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(v,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request){
 const actor=await authenticatedUser(request);
 if(!actor||!isFounder(actor))return respond({error:"Verified founder sign-in required."},403);
 try{
  const cursor=new URL(request.url).searchParams.get("after")||"";
  if(cursor&&!/^[A-Za-z0-9_-]{8,128}$/.test(cursor))return respond({error:"Invalid site cursor."},400);
  const db=firebaseAdmin().firestore();
  let q=db.collection("publicSites").orderBy("__name__").limit(101);
  if(cursor)q=q.startAfter(db.doc("publicSites/"+cursor));
  const snap=await q.get(),page=snap.docs.slice(0,100);
  const sites=page.filter(doc=>doc.data()?.visibility==="published")
   .map(doc=>({id:doc.id,name:String(doc.data().name||"Business website").slice(0,100),
    industry:String(doc.data().industry||"").slice(0,60),
    url:"https://www.fugthmanagement.space/sites/"+encodeURIComponent(doc.id)}));
  return respond({sites,nextCursor:snap.size>100?page.at(-1)?.id||null:null,
    note:"Only published public sites are eligible for customer text messages. Private drafts are excluded."});
 }catch(e){
  console.warn("Outreach public site directory unavailable",{code:e?.code||"server"});
  return respond({error:"Unable to list published Site Maker designs."},503);
 }
}
