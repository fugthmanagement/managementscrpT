import {NextResponse} from "next/server";
import {authenticatedUser} from "../../../../../lib/server/auth";
import {accessGoogleCalendar,integrationConfigured,integrationDoc} from "../../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const output=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
async function testApi(url,token){
 try{
  const r=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(9000)});
  if(r.ok)return {ok:true};
  const detail=await r.json().catch(()=>({}));
  const reason=String(detail.error?.status||detail.error?.errors?.[0]?.reason||"").slice(0,50);
  return {ok:false,code:r.status,reason,
   message:r.status===403?"Google denied access. Check that the API is enabled in Google Cloud and reauthorize the requested permission.":
    r.status===401?"Google access is expired. Reconnect this business account.":
    "Google responded with an error ("+r.status+")."};
 }catch{return {ok:false,message:"Could not contact Google. Try again."};}
}
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid)return output({error:"Sign in first."},401);
 if(!integrationConfigured())return output({connected:false,ready:false,error:"Google OAuth settings are incomplete on the FUGTH server."},503);
 try{
  const doc=await integrationDoc(user.uid).get();
  if(!doc.exists)return output({connected:false,ready:false,error:"Connect your own Google account in Settings → Connections."});
  const scopes=String(doc.data()?.scopes||"").split(" ");
  const has=s=>scopes.includes("https://www.googleapis.com/auth/"+s);
  const required={calendar:has("calendar"),drive:has("drive.file")};
  if(!required.calendar||!required.drive)
    return output({connected:true,ready:false,required,error:"Google authorization is missing Calendar or Drive permissions. Reconnect this business."});
  let token;
  try{token=await accessGoogleCalendar(user.uid);}catch(e){
   return output({connected:true,ready:false,required,error:String(e.message||"Reconnect Google").slice(0,170)});
  }
  const [calendar,drive]=await Promise.all([
   testApi("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1&fields=items(id)",token),
   testApi("https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)",token)
  ]);
  return output({connected:true,ready:calendar.ok&&drive.ok,required,calendar,drive,
    email:doc.data()?.googleEmail||null,
    note:"Checks Google Calendar and Drive API access; it does not upload a recording or create an appointment."});
 }catch(e){console.warn("Google health test failed",{code:e?.code||"provider"});
  return output({connected:false,ready:false,error:"Google connection could not be tested. Check server credentials and your saved connection."},503);}
}
