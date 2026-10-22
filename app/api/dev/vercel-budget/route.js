import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
import {deploymentBudget,VERCEL_HOBBY_DEPLOYMENTS_PER_DAY} from "../../../../lib/server/vercel-deployment-budget";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
const projectId="prj_Usbx1CBHCaOEsiJgEs5uC0mqzd0n";
const teamId="team_pvX4ScXWbBLhJcsJ7hJWGTvm";
/** Internal FUGTH founder gauge. Neither this endpoint nor the UI creates deployments. */
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return respond({error:"Founder account required."},403);
 const token=process.env.VERCEL_API_TOKEN||process.env.VERCEL_TOKEN||"";
 // The connected ChatGPT Vercel account is not automatically a runtime API
 // credential inside the FUGTH website. Never claim an exact count without one.
 if(!token)return respond({
  live:false,status:"snapshot_only",projectId,teamLimit:VERCEL_HOBBY_DEPLOYMENTS_PER_DAY,
  checkedAt:"2026-10-22T17:31:33.135Z",observedProjectDeploymentsLast24h:99,
  observedOldestAt:"2026-10-21T17:32:52.971Z",
  remaining:null,canRelease:false,
  note:"Last observed 99 project deployments in a 24-hour period. This is NOT live team-wide quota. Additional deployments may have occurred. Vercel API credentials aren't available to this server; use the Vercel dashboard for the authoritative balance."
 });
 try{
  const rows=[];let before=0,complete=false;
  const cutoff=Date.now()-86400000;
  for(let i=0;i<15;i++){
   const params=new URLSearchParams({teamId,limit:"100",projectId});
   if(before)params.set("until",String(before));
   const response=await fetch("https://api.vercel.com/v6/deployments?"+params.toString(),{
    headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(8500)});
   if(!response.ok)throw Error("Vercel HTTP "+response.status);
   const data=await response.json(),d=Array.isArray(data.deployments)?data.deployments:[];
   rows.push(...d);
   if(!d.length||Number(d.at(-1).created)<cutoff){complete=true;break}
   before=Number(d.at(-1).created)-1;
  }
  const result=deploymentBudget(rows);
  // This project-only count is a LOWER BOUND: other projects on the team
  // might have deployments counted toward the actual shared Hobby quota.
  return respond({live:true,status:complete?"project_count_live":"project_count_partial",scope:"project_only",
   checkedAt:new Date().toISOString(),projectId,...result,
   remaining:null,canRelease:false,
   note:"Live count for this project only. Vercel's Hobby deployment quota is shared across the team. Remaining team-wide quota cannot be calculated from project results. Do not deploy based only on this number."});
 }catch(e){console.warn("FUGTH_DEPLOYMENT_BUDGET",{code:String(e?.message||"unavailable").slice(0,90)});
  return respond({live:false,status:"unavailable",remaining:null,canRelease:false,projectId,
   note:"Vercel quota couldn't be read. No deployment was triggered. Check the Vercel usage panel directly."});
 }
}
