import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!isFounder(user))return NextResponse.json({error:"Verified founder access required."},{status:403});
 if(!(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)))return NextResponse.json({error:"Secure Firebase connection not configured."},{status:503});
 try{
  const db=firebaseAdmin().firestore();
  const url=new URL(req.url),cursor=url.searchParams.get("after")||"";
  if(cursor&&!/^[A-Za-z0-9_-]{8,128}$/.test(cursor))return NextResponse.json({error:"Invalid directory cursor."},{status:400});
  let q=db.collection("users").orderBy("__name__").limit(26);
  if(cursor)q=q.startAfter(db.collection("users").doc(cursor));
  const snapshot=await q.get(),rows=snapshot.docs.slice(0,25);
  const accounts=await Promise.all(rows.map(async doc=>{
    const record=doc.data();
    const [site,draft]=await Promise.all([db.doc("publicSites/"+doc.id).get(),db.doc("siteDrafts/"+doc.id).get()]);
    return {uid:doc.id,accountNumber:record.accountNumber||null,businessName:record.businessName||record.displayName||"Business account",
      email:record.email||"",industry:draft.data()?.industry||site.data()?.industry||record.businessType||"general",
      websiteStatus:site.data()?.visibility||"not_created",hasDraft:draft.exists,updatedAt:draft.data()?.updatedAt||site.data()?.updatedAt||null};
  }));
  return NextResponse.json({accounts,nextCursor:snapshot.docs.length>25?rows.at(-1)?.id:null});
 }catch(e){console.error("FUGTH founder site directory unavailable",e?.code||"unexpected");return NextResponse.json({error:"Could not list client website designs."},{status:503});}
}
