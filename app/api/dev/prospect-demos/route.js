import {randomBytes,createHash} from "crypto";
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
 const user=await guard(req);
 if(!user)return NextResponse.json({error:"Verified founder login required"},{status:403});
 if(!credentials())return NextResponse.json({error:"Firebase Admin service account is missing. Run the Firebase connection test above.",code:"firebase_admin_missing"},{status:503});
 let raw;
 try{const body=await req.text();if(body.length>4000)throw Error();raw=JSON.parse(body)}
 catch{return NextResponse.json({error:"Invalid demo form"},{status:400})}
 const kind=clean(raw.kind,30),name=clean(raw.name,80),
  assignedUid=clean(raw.assignedUid,128),prospectId=clean(raw.prospectId,128);
 if(!demoIndustries.includes(kind)||name.length<2)
  return NextResponse.json({error:"Choose a supported industry and business name"},{status:400});
 const hours=Number(raw.hours||0);
 if(!Number.isFinite(hours)||hours<0||hours>24*90)return NextResponse.json({error:"Expiration must be 0–2160 hours"},{status:400});
 if(prospectId&&!/^[A-Za-z0-9_-]{8,128}$/.test(prospectId))
  return NextResponse.json({error:"Invalid prospect"},{status:400});
 if(assignedUid&&!/^[A-Za-z0-9_-]{8,128}$/.test(assignedUid))
  return NextResponse.json({error:"Invalid customer account UID"},{status:400});
 try{
  const db=firebaseAdmin().firestore();
  if(assignedUid){
   const acc=await db.doc("users/"+assignedUid).get();
   if(!acc.exists)return NextResponse.json({error:"Target account does not exist"},{status:404});
  }
  let record,id,reused=false;
  const now=new Date().toISOString();
  const expiresAt=hours?new Date(Date.now()+hours*3600000).toISOString():null;
  if(prospectId){
   const prospectRef=db.doc("users/"+user.uid+"/campaigns/"+prospectId);
   const result=await db.runTransaction(async tx=>{
    const prospect=await tx.get(prospectRef);
    if(!prospect.exists||prospect.data()?.type!=="cold_call_prospect")
     throw Object.assign(Error("Selected prospect was not found in your calling list."),{status:404});
    const p=prospect.data();
    if(String(p.businessName||"").trim().toLowerCase()!==name.toLowerCase())
     throw Object.assign(Error("The business name must match the selected prospect."),{status:409});
    const stable=createHash("sha256").update("fugth-prospect-preview-v1:"+user.uid+":"+prospectId).digest("hex").slice(0,24);
    const previous=/^[a-f0-9]{24}$/.test(String(p.assignedPreviewId||""))?p.assignedPreviewId:stable;
    let ref=db.doc("prospectDemos/"+previous),old=await tx.get(ref);
    if(old.exists&&(old.data()?.founderId!==user.uid||old.data()?.prospectId!==prospectId)){
     ref=db.doc("prospectDemos/"+stable);old=await tx.get(ref);
    }
    if(old.exists&&(old.data()?.founderId!==user.uid||old.data()?.prospectId!==prospectId))
     throw Object.assign(Error("The assigned website belongs to a different prospect."),{status:409});
    const existing=old.exists,original=old.data()||{};
    const site=existing?original.site:
     {...demoTemplate(kind,name,{phone:clean(raw.phone||p.phone,32),contactEmail:clean(raw.email||p.email,120)}),
      ownerId:user.uid,previewMode:true,showChatbot:true,aiAgentMode:"local",aiAgentModel:"auto"};
    if(!site)throw Error("Selected industry has no site template");
    const entry=existing?{
     ...original,updatedAt:now,expiresAt,revoked:false,
     ...(assignedUid?{assignedUid}:{}),site:original.site||site
    }:{
     founderId:user.uid,kind,name,phone:site.phone,contactEmail:site.contactEmail,
     assignedUid:assignedUid||null,prospectId,createdAt:now,updatedAt:now,
     expiresAt,revoked:false,site,revision:1
    };
    if(existing)tx.set(ref,entry,{merge:true});
    else tx.create(ref,entry);
    tx.set(prospectRef,{
     websitePreviewUrl:"https://www.fugthmanagement.space/demo/site/"+ref.id,
     assignedPreviewId:ref.id,assignedPreviewName:name,
     assignedPreviewExpiresAt:expiresAt||"",updatedAt:now
    },{merge:true});
    return {id:ref.id,record:entry,reused:existing};
   });
   id=result.id;record=result.record;reused=result.reused;
  }else{
   id=randomBytes(12).toString("hex");
   const site={...demoTemplate(kind,name,{phone:clean(raw.phone,32),contactEmail:clean(raw.email,120)}),
    ownerId:user.uid,previewMode:true,showChatbot:true,aiAgentMode:"local",aiAgentModel:"auto"};
   record={founderId:user.uid,kind,name,phone:site.phone,contactEmail:site.contactEmail,
    assignedUid:assignedUid||null,prospectId:null,createdAt:now,updatedAt:now,
    expiresAt,revoked:false,site,revision:1};
   await db.doc("prospectDemos/"+id).create(record);
  }
  // A successful write is NOT a verified customer-facing link until the same
  // collection can actually be read back. Do not create another ID on retry.
  const check=await db.doc("prospectDemos/"+id).get();
  if(!check.exists||check.data()?.founderId!==user.uid)
   return NextResponse.json({error:"Preview was written but cannot be verified. Run Firebase connection test.",id,code:"preview_verification_failed"},{status:503});
  return NextResponse.json({
   success:true,id,url:"/demo/site/"+id,record:check.data(),reused,verified:true,
   note:reused?"Reused and renewed this prospect's existing website preview. Its link and design were preserved.":
    "Preview saved and its Firestore record read back successfully."
  },{status:reused?200:201,headers:{"Cache-Control":"private, no-store"}});
 }catch(e){
  const issue=firestoreDemoFailure(e);
  console.error("FUGTH_DEMO_CREATE",{code:issue.code,dbCode:String(e?.code||"unknown")});
  return NextResponse.json({error:e?.status?e.message:issue.error,code:e?.status?"demo_invalid":issue.code,hint:issue.hint},
   {status:e?.status||503,headers:{"Cache-Control":"private, no-store"}});
 }
}
