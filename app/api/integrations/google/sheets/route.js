import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../../lib/server/auth";
import {accessGoogleCalendar,ensureGoogleOperationsSheet,integrationConfigured} from "../../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 if(!integrationConfigured())return NextResponse.json({error:"Google connection is not configured yet."},{status:503});
 try{const token=await accessGoogleCalendar(user.uid,"spreadsheets");const sheet=await ensureGoogleOperationsSheet(user.uid,token);return NextResponse.json({created:true,...sheet});}
 catch(error){return NextResponse.json({error:error.message||"Reconnect Google to create the workbook."},{status:409});}
}
