import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin} from "../../../../../lib/server/auth";
import {accessGoogleCalendar,integrationConfigured} from "../../../../../lib/server/google-calendar";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const DRIVE_FILE_SCOPE="drive.file";
async function authorize(req){
 const user=await authenticatedUser(req);
 if(!user)return {error:NextResponse.json({error:"Please sign in to connect Google services."},{status:401})};
 if(!integrationConfigured())return {error:NextResponse.json({error:"Google account connection is not configured yet."},{status:503})};
 try{return {user,token:await accessGoogleCalendar(user.uid,DRIVE_FILE_SCOPE)};}
 catch{return {error:NextResponse.json({error:"Reconnect your Google account to enable FUGTH Docs and Drive links."},{status:409})};}
}
export async function GET(req){
 const auth=await authorize(req);if(auth.error)return auth.error;
 try{
  const params=new URLSearchParams({q:"mimeType = 'application/vnd.google-apps.document' and trashed = false",pageSize:"50",fields:"nextPageToken,files(id,name,webViewLink,modifiedTime,description)",orderBy:"modifiedTime desc"});
  const r=await fetch("https://www.googleapis.com/drive/v3/files?"+params,{headers:{Authorization:"Bearer "+auth.token},cache:"no-store"});
  if(!r.ok)return NextResponse.json({error:"Google Drive could not list documents currently available to FUGTH."},{status:502});
  const info=await r.json();
  return NextResponse.json({files:(info.files||[]).map(x=>({id:x.id,name:x.name,url:x.webViewLink||"https://docs.google.com/document/d/"+encodeURIComponent(x.id)+"/edit",updatedAt:x.modifiedTime})),limitedTo:"Documents created or opened with this FUGTH integration",hasMore:Boolean(info.nextPageToken)});
 }catch{return NextResponse.json({error:"Could not load connected Google Docs."},{status:503});}
}
export async function POST(req){
 const auth=await authorize(req);if(auth.error)return auth.error;
 let data;
 try{data=await req.json();}catch{return NextResponse.json({error:"Invalid document request."},{status:400});}
 const title=String(data.title||"").trim().slice(0,100).replace(/[<>\x00-\x1f]/g,"");
 const notes=String(data.content||"").trim().slice(0,8000).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"");
 if(title.length<2||notes.length<5)return NextResponse.json({error:"Add a title and at least one sentence of notes."},{status:400});
 if(/\b(social security number|credit card number|patient diagnosis)\b/i.test(notes))return NextResponse.json({error:"Remove sensitive customer or patient information before creating this document."},{status:400});
 try{
  const db=firebaseAdmin().firestore(),limit=db.doc("googleDocQuotas/"+auth.user.uid+"_"+new Date().toISOString().slice(0,10));
  await db.runTransaction(async tx=>{const snap=await tx.get(limit);if((snap.data()?.count||0)>=20)throw Object.assign(new Error("Daily document limit reached."),{status:429});tx.set(limit,{count:(snap.data()?.count||0)+1,updatedAt:new Date().toISOString()},{merge:true});});
  const created=await fetch("https://docs.googleapis.com/v1/documents",{
    method:"POST",headers:{Authorization:"Bearer "+auth.token,"Content-Type":"application/json"},
    body:JSON.stringify({title}),cache:"no-store"
  });
  if(!created.ok)return NextResponse.json({error:"Google declined the document request. Reconnect your account if needed."},{status:502});
  const document=await created.json();
  const inserted=await fetch("https://docs.googleapis.com/v1/documents/"+encodeURIComponent(document.documentId)+":batchUpdate",{
    method:"POST",headers:{Authorization:"Bearer "+auth.token,"Content-Type":"application/json"},
    body:JSON.stringify({requests:[{insertText:{endOfSegmentLocation:{},text:notes+"\n"}}]}),cache:"no-store"
  });
  if(!inserted.ok)return NextResponse.json({error:"Document created, but the notes couldn't be inserted.",documentUrl:"https://docs.google.com/document/d/"+encodeURIComponent(document.documentId)+"/edit"},{status:502});
  return NextResponse.json({created:true,title,url:"https://docs.google.com/document/d/"+encodeURIComponent(document.documentId)+"/edit"});
 }catch(e){return NextResponse.json({error:e.status===429?e.message:"Could not save Google document right now."},{status:e.status||503});}
}
