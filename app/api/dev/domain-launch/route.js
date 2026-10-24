import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {domainName,getNamecheapConfig,setNamecheapConfig,clearNamecheapConfig,checkNamecheapDomain} from "../../../../lib/server/namecheap-domains";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=30;
const send=(j,s=200)=>NextResponse.json(j,{status:s,headers:{"Cache-Control":"private, no-store"}});
const validId=s=>/^[A-Za-z0-9_-]{8,128}$/.test(String(s||""));
const authFounder=async req=>{const u=await authenticatedUser(req);return u?.uid&&isFounder(u)?u:null};
const domainConfigStatus=()=>({vercelApiConfigured:Boolean(process.env.VERCEL_API_TOKEN&&process.env.VERCEL_PROJECT_ID),
 staticOutboundIpRequired:true,hostnameRouterReady:false,automatedPurchaseEnabled:false,
 note:"A staged domain is NOT published. Confirm your registrar API, DNS, customer hosting mode, independent site deployment and a live HTTPS response before activating."});
export async function GET(req){
 const actor=await authFounder(req);if(!actor)return send({error:"Founder access required."},403);
 try{
  const db=firebaseAdmin().firestore(),config=await getNamecheapConfig(actor.uid);
  const prospectId=new URL(req.url).searchParams.get("prospectId")||"";
  let launch=null;
  if(prospectId){
   if(!validId(prospectId))return send({error:"Invalid prospect."},400);
   const doc=await db.doc("users/"+actor.uid+"/domainLaunches/"+prospectId).get();
   launch=doc.exists?doc.data():null;
  }
  return send({namecheap:config,launch,readiness:domainConfigStatus(),
   setupUrl:"https://www.namecheap.com/support/api/intro/",
   vercelDomainSetup:"https://vercel.com/docs/domains/set-up-custom-domain"});
 }catch(e){return send({error:"Domain launch configuration could not load. Check secure Firestore."},503)}
}
export async function POST(req){
 const actor=await authFounder(req);if(!actor)return send({error:"Founder access required."},403);
 let body;try{const raw=await req.text();if(raw.length>4500)throw Error();body=JSON.parse(raw)}
 catch{return send({error:"Invalid domain request."},400)}
 const action=String(body.action||"");
 try{
  if(action==="configure"){
   const config=await setNamecheapConfig(actor.uid,body);
   return send({saved:true,namecheap:config,readiness:domainConfigStatus(),
    note:"Namecheap key is encrypted server-side. Test the read-only availability check before any future purchase workflow."});
  }
  if(action==="disconnect"){
   if(body.confirm!==true)return send({error:"Confirm removal of the encrypted API credentials."},400);
   await clearNamecheapConfig(actor.uid);return send({disconnected:true});
  }
  if(action==="check"){
   const result=await checkNamecheapDomain(actor.uid,body.domain);
   return send({checked:true,result});
  }
  if(action==="stage"){
   const prospectId=String(body.prospectId||""),domain=domainName(body.domain);
   const ownership=String(body.ownership||"");
   const hosting=String(body.hosting||"");
   if(!validId(prospectId)||!domain||!["client_owned","new_purchase"].includes(ownership)||!["isolated","managed"].includes(hosting))
    return send({error:"Select a valid prospect, domain, ownership and hosting option."},400);
   const db=firebaseAdmin().firestore(),p=await db.doc("users/"+actor.uid+"/campaigns/"+prospectId).get();
   if(!p.exists||p.data()?.type!=="cold_call_prospect")return send({error:"Prospect not found."},404);
   const uid=actor.uid,now=new Date().toISOString();
   const ref=db.doc("users/"+uid+"/domainLaunches/"+prospectId);
   const existing=await ref.get();
   const staged={prospectId,businessName:String(p.data().businessName||"").slice(0,80),
    domain,ownership,hosting,linkedPreviewId:String(p.data().assignedPreviewId||"").slice(0,48),
    status:"staged_unpublished",registered:false,dnsVerified:false,sslVerified:false,
    independentRuntimeReady:false,published:false,createdAt:existing.data()?.createdAt||now,updatedAt:now,
    ...(existing.data()?.createdAt?{changedBy:uid}:{createdBy:uid})};
   await ref.set(staged);
   await db.doc("users/"+uid+"/campaigns/"+prospectId).collection("events").add({
    type:"domain_launch_staged",domain,hosting,at:now,actorUid:uid});
   return send({staged:true,launch:staged,readiness:domainConfigStatus(),
    next:"Domain not purchased or connected yet. Verify registrar ownership, choose hosting boundary and prepare DNS instructions from the actual Vercel project before launch."});
  }
  if(action==="purchase"||action==="publish")return send({error:"Live purchases and publishing are intentionally disabled until the registrar egress-IP, registrant details, explicit price approval, hostname routing and independent hosting checks are verified. The launch plan can be staged safely now.",code:"launch_gates_incomplete"},409);
  return send({error:"Choose an available domain setup action."},400);
 }catch(e){
  console.warn("FUGTH_DOMAIN_LAUNCH",{action,code:e?.code||"unavailable"});
  return send({error:e?.status===400?e.message:e?.message?.includes("INTEGRATION_ENCRYPTION_KEY")?
   "Set INTEGRATION_ENCRYPTION_KEY in Vercel to securely store Namecheap credentials.":
   String(e?.message||"Domain setup operation failed.").slice(0,170)},e?.status===400?400:503);
 }
}
