import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../../lib/server/auth";
import {accessGoogleCalendar,ensureGoogleOperationsSheet} from "../../../../../lib/server/google-calendar";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const safe=value=>{const text=String(value??"").replace(/[\u0000-\u001f]/g," ").slice(0,500);return /^[=+\-@]/.test(text)?"'"+text:text;};
const dateValue=value=>{try{return value?.toDate?.().toISOString?.()||String(value||"");}catch{return "";}};

export async function POST(request){
 const user=await authenticatedUser(request);
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 if(!isFounder(user))return NextResponse.json({error:"Founder access required."},{status:403});
 try{
  const token=await accessGoogleCalendar(user.uid,"spreadsheets");
  const workbook=await ensureGoogleOperationsSheet(user.uid,token);
  const spreadsheetId=workbook.spreadsheetId;
  const metadataResponse=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!metadataResponse.ok)throw Error("Could not inspect the operations workbook.");
  const metadata=await metadataResponse.json();
  if(!metadata.sheets?.some(sheet=>sheet.properties?.title==="Cold Calls")){
   const add=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({requests:[{addSheet:{properties:{title:"Cold Calls"}}}]})});
   if(!add.ok)throw Error("Could not add the Cold Calls sheet.");
  }
  const snapshot=await firebaseAdmin().firestore().collection(`users/${user.uid}/campaigns`).where("type","==","cold_call_prospect").limit(500).get();
  const header=["Business","Owner","Phone","Industry","City / Area","Status","Last outcome","Last called","Follow-up","Notes","Updated"];
  const rows=snapshot.docs.map(item=>{const value=item.data();return [value.businessName,value.ownerName,value.phone,value.industry,value.city,value.status,value.lastOutcome,dateValue(value.lastCalledAt),value.followUpAt,value.notes,dateValue(value.updatedAt)].map(safe);});
  const range=encodeURIComponent("Cold Calls!A:K");
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:clear`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:"{}"});
  const write=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent("Cold Calls!A1")}?valueInputOption=RAW`,{method:"PUT",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({range:"Cold Calls!A1",majorDimension:"ROWS",values:[header,...rows]})});
  if(!write.ok)throw Error("Google Sheets did not accept the prospect list.");
  return NextResponse.json({synced:true,rows:rows.length,url:workbook.url});
 }catch(error){console.error("Founder prospect sync failed",error?.message||"unknown");return NextResponse.json({error:error?.message||"Could not sync the private call sheet."},{status:503});}
}
