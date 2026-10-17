import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
export async function GET(req,{params}){
 const id=params.id;if(!/^[a-f0-9]{24}$/.test(id))return NextResponse.json({error:"Invalid link"},{status:404,headers:noStore});
 try{
 const snap=await firebaseAdmin().firestore().doc("prospectDemos/"+id).get();
 if(!snap.exists)return NextResponse.json({error:"Demo not found"},{status:404,headers:noStore});
 const data=snap.data();
 if(data.revoked||(data.expiresAt&&Date.parse(data.expiresAt)<=Date.now()))return NextResponse.json({error:"This demo link has expired"},{status:410,headers:noStore});
 return NextResponse.json({site:data.site,kind:data.kind,name:data.name,expiresAt:data.expiresAt},{headers:noStore});
 }catch{return NextResponse.json({error:"Demo temporarily unavailable"},{status:503,headers:noStore})}
}
export async function PATCH(req,{params}){
 const user=await authenticatedUser(req);if(!isFounder(user))return NextResponse.json({error:"Founder access required"},{status:403});
 if(!/^[a-f0-9]{24}$/.test(params.id))return NextResponse.json({error:"Invalid link"},{status:400});
 const ref=firebaseAdmin().firestore().doc("prospectDemos/"+params.id),snap=await ref.get();if(!snap.exists||snap.data().founderId!==user.uid)return NextResponse.json({error:"Not found"},{status:404});
 const body=await req.json(),updates={updatedAt:new Date().toISOString()};
 if(typeof body.revoked==="boolean")updates.revoked=body.revoked;
 if(body.hours!==undefined){const h=Number(body.hours);if(!Number.isFinite(h)||h<0||h>2160)return NextResponse.json({error:"Invalid hours"},{status:400});updates.expiresAt=h?new Date(Date.now()+h*3600000).toISOString():null}
 await ref.update(updates);return NextResponse.json({success:true,...updates});
}
