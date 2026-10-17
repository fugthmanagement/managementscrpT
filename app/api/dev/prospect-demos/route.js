import {randomBytes} from "crypto";
import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../lib/server/auth";
import {demoTemplate,demoIndustries} from "../../../../lib/demo-template";
export const runtime="nodejs";export const dynamic="force-dynamic";
const credentials=()=>Boolean(process.env.FIREBASE_SERVICE_ACCOUNT||(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY));
const clean=(s,n)=>String(s||"").trim().slice(0,n).replace(/[<>]/g,"");
async function guard(req){const user=await authenticatedUser(req);return isFounder(user)?user:null;}
export async function GET(req){
 const user=await guard(req);if(!user)return NextResponse.json({error:"Founder authentication required"},{status:403});
 if(!credentials())return NextResponse.json({error:"Firebase Admin credentials required"},{status:503});
 try{const snap=await firebaseAdmin().firestore().collection("prospectDemos").where("founderId","==",user.uid).limit(100).get();return NextResponse.json({demos:snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))});}
 catch{return NextResponse.json({error:"Could not list demos"},{status:503})}
}
export async function POST(req){
 const user=await guard(req);if(!user)return NextResponse.json({error:"Founder authentication required"},{status:403});
 if(!credentials())return NextResponse.json({error:"Firebase Admin credentials required"},{status:503});
 try{
 const raw=await req.json(),kind=clean(raw.kind,30),name=clean(raw.name,80);
 if(!demoIndustries.includes(kind)||name.length<2)return NextResponse.json({error:"Select a template and business name"},{status:400});
 const hours=Number(raw.hours||0);if(!Number.isFinite(hours)||hours<0||hours>24*90)return NextResponse.json({error:"Expiration must be 0-2160 hours"},{status:400});
 const assignedUid=clean(raw.assignedUid,128),db=firebaseAdmin().firestore();
 if(assignedUid){const account=await db.doc("users/"+assignedUid).get();if(!account.exists)return NextResponse.json({error:"Target customer account not found"},{status:404})}
 const id=randomBytes(12).toString("hex"),site=demoTemplate(kind,name,{phone:clean(raw.phone,32),contactEmail:clean(raw.email,120)});
 const now=new Date().toISOString();
 const record={founderId:user.uid,kind,name,phone:site.phone,contactEmail:site.contactEmail,assignedUid:assignedUid||null,createdAt:now,updatedAt:now,expiresAt:hours?new Date(Date.now()+hours*3600000).toISOString():null,revoked:false,site};
 await db.doc("prospectDemos/"+id).create(record);
 return NextResponse.json({success:true,id,url:"/demo/site/"+id,record},{status:201});
 }catch(e){console.error("demo create",e?.code);return NextResponse.json({error:"Could not save demo"},{status:503})}
}
