import {randomBytes} from "crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../lib/server/auth";
import {demoTemplate,demoIndustries} from "../../../../lib/demo-template";
import {listFounderDemos,firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";export const dynamic="force-dynamic";
const credentials=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
const clean=(s,n)=>String(s||"").trim().slice(0,n).replace(/[<>]/g,"");
async function guard(req){const user=await authenticatedUser(req);return isFounder(user)?user:null;}
export async function GET(req){
 const user=await guard(req);if(!user)return NextResponse.json({error:"Founder authentication required"},{status:403});
 if(!credentials())return NextResponse.json({error:"Firebase Admin credentials required"},{status:503});
 try{
  const result=await listFounderDemos(firebaseAdmin().firestore(),user.uid);
  return NextResponse.json({...result,loaded:true},{headers:{"Cache-Control":"private, no-store"}});
 }catch(err){
  const issue=firestoreDemoFailure(err);
  console.error("FUGTH_DEMOS_LIST",{code:issue.code,dbCode:String(err?.code||"unknown")});
  return NextResponse.json({...issue,loaded:false},{status:503,headers:{"Cache-Control":"private, no-store"}});
 }
}
export async function POST(req){
 const user=await guard(req);if(!user)return NextResponse.json({error:"Founder authentication required"},{status:403});
 if(!credentials())return NextResponse.json({error:"Firebase Admin credentials required"},{status:503});
 try{
 const raw=await req.json(),kind=clean(raw.kind,30),name=clean(raw.name,80);
 if(!demoIndustries.includes(kind)||name.length<2)return NextResponse.json({error:"Select a template and business name"},{status:400});
 const hours=Number(raw.hours||0);if(!Number.isFinite(hours)||hours<0||hours>24*90)return NextResponse.json({error:"Expiration must be 0-2160 hours"},{status:400});
 const assignedUid=clean(raw.assignedUid,128),prospectId=clean(raw.prospectId,128),db=firebaseAdmin().firestore();
 let prospectRef=null,prospect=null;
 if(prospectId){
  if(!/^[A-Za-z0-9_-]{8,128}$/.test(prospectId))return NextResponse.json({error:"Invalid prospect selected."},{status:400});
  prospectRef=db.doc("users/"+user.uid+"/campaigns/"+prospectId);
  const snap=await prospectRef.get();
  if(!snap.exists||snap.data()?.type!=="cold_call_prospect")return NextResponse.json({error:"Selected prospect does not belong to your calling list."},{status:404});
  prospect=snap.data();
  if(String(prospect.businessName||"").trim().toLowerCase()!==name.toLowerCase())
   return NextResponse.json({error:"The site name must match the linked prospect. Re-select the prospect to fill the verified name."},{status:409});
 }
 if(assignedUid){const account=await db.doc("users/"+assignedUid).get();if(!account.exists)return NextResponse.json({error:"Target customer account not found"},{status:404})}
 const id=randomBytes(12).toString("hex"),site=demoTemplate(kind,name,{phone:clean(raw.phone,32),contactEmail:clean(raw.email,120)});
 const now=new Date().toISOString();
 const record={founderId:user.uid,kind,name,phone:site.phone,contactEmail:site.contactEmail,assignedUid:assignedUid||null,prospectId:prospectId||null,createdAt:now,updatedAt:now,expiresAt:hours?new Date(Date.now()+hours*3600000).toISOString():null,revoked:false,site};
 const batch=db.batch();
 batch.create(db.doc("prospectDemos/"+id),record);
 if(prospectRef)batch.set(prospectRef,{
  websitePreviewUrl:"https://www.fugthmanagement.space/demo/site/"+id,
  assignedPreviewId:id,assignedPreviewName:name,assignedPreviewExpiresAt:record.expiresAt||"",
  updatedAt:now
 },{merge:true});
 await batch.commit();
 return NextResponse.json({success:true,id,url:"/demo/site/"+id,record},{status:201});
 }catch(e){console.error("demo create",e?.code);return NextResponse.json({error:"Could not save demo"},{status:503})}
}
