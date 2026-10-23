import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const out=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(req){
 const actor=await authenticatedUser(req);
 if(!actor||!isFounder(actor))return out({error:"Founder only."},403);
 const token=process.env.VERCEL_API_TOKEN||process.env.VERCEL_TOKEN;
 const info={connected:false,source:"unavailable",project:"managementscrp-t",
  latestBuildCommit:process.env.VERCEL_GIT_COMMIT_SHA||null,
  projectDeployments24h:null,projectEventsChecked:0,remainingDeployments:null,
  nextQuotaResetAt:null,nextObservedProjectEventExpiryAt:null,calculatedAt:new Date().toISOString(),
  note:"Vercel does not publish a guaranteed per-project deployment allowance here. Remaining quota and reset are unavailable; do not infer them from project history."};
 if(!token)return out(info);
 try{
  const u=new URL("https://api.vercel.com/v6/deployments");
  u.searchParams.set("projectId","prj_Usbx1CBHCaOEsiJgEs5uC0mqzd0n");
  u.searchParams.set("teamId","team_pvX4ScXWbBLhJcsJ7hJWGTvm");u.searchParams.set("limit","100");
  const res=await fetch(u,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(9000)});
  if(!res.ok)return out({...info,source:"vercel_permission_denied",note:"Vercel project history is not authorized for this server token. Deployment quota remains unknown."});
  const obj=await res.json(),list=Array.isArray(obj.deployments)?obj.deployments:[];
  const dayAgo=Date.now()-86400000,observed=list.filter(d=>Number(d.created||0)>dayAgo);
  const oldest=observed.length?Math.min(...observed.map(d=>Number(d.created))):null;
  const nextObservedProjectEventExpiryAt=oldest?new Date(oldest+86400000).toISOString():null;
  return out({...info,connected:true,source:"vercel_project_history",
   projectDeployments24h:observed.length,projectEventsChecked:list.length,nextObservedProjectEventExpiryAt,
   sampleTruncated:list.length===100,
   note:"This counts observed deployments for THIS PROJECT during the last 24h. The next observed event leaving this rolling window is NOT the Vercel team quota reset, does not include other projects, and does not predict remaining builds."});
 }catch{return out({...info,source:"vercel_request_failed"})}
}
