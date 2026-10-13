import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request){
 const user=await authenticatedUser(request);
 if(!user)return NextResponse.json({error:"Not authenticated",isFounder:false},{status:401});
 return NextResponse.json({isFounder:isFounder(user),accountId:user.uid});
}
