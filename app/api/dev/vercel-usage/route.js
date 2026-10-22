import {NextResponse} from "next/server";
import {authenticatedUser,isFounder} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const limit=100;
const team="team_pvX4ScXWbBLhJcsJ7hJWGTvm";
const url="https://vercel.com/fugth-olorh-s-projects/managementscrp-t/deployments";
const reply=(d,s=200)=>NextResponse.json(d,{status:s,headers:{"Cache-Control":"private, no-store"}});
export async function GET(req){
 const user=await authenticatedUser(req);
 if(!user||!isFounder(user))return reply({error:"Verified FUGTH founder only."},403);
 const token=process.env.VERCEL_READ_TOKEN||"";
 const common={limitPer24Hours:limit,remaining:null,observedCreated:null,
  resetEstimateAt:null,verified:false,
  dashboardUrl:url,project:"managementscrp-t",scope:"FUGTH Vercel team"};
 if(!token)return reply({...common,code:"vercel_read_access_not_connected",
  message:"Live deployment usage cannot be read from this site's runtime. The Vercel dashboard remains the authoritative source; no remaining count or reset time is being invented."});
 try{
  const now=Date.now(),from=now-86400000;
  let total=0,until=null,oldest=null,pages=0;
  // Team-wide results, not just this project. Hard-cap to avoid excessive API calls.
  do{
   const query=new URLSearchParams({teamId:team,limit:"100",since:String(from)});
   if(until)query.set("until",String(until));
   const result=await fetch("https://api.vercel.com/v6/deployments?"+query,{
    headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!result.ok)return reply({...common,code:"vercel_usage_api_unavailable",
    message:"Vercel rejected the read-only usage check (HTTP "+result.status+"). Open the official dashboard for remaining deployment capacity."});
   const value=await result.json();
   const rows=Array.isArray(value.deployments)?value.deployments:[];
   total+=rows.length;
   for(const d of rows){
    const created=Number(d.created||d.createdAt);
    if(Number.isFinite(created)&&created>=from)
     oldest=oldest===null?created:Math.min(oldest,created);
   }
   if(rows.length<100)break;
   const last=Number(rows.at(-1)?.created||rows.at(-1)?.createdAt);
   if(!Number.isFinite(last)||last<=0||last===until)break;
   until=last-1;pages++;
  }while(total<300&&pages<3);
  const remaining=total<=limit?Math.max(0,limit-total):0;
  return reply({...common,observedCreated:total,remaining,verified:false,
   resetEstimateAt:oldest?new Date(oldest+86400000).toISOString():null,
   checkedAt:new Date(now).toISOString(),
   code:"observed_not_authoritative",
   message:"Approximate Vercel team deployment activity in a rolling 24-hour window. Provider limits may include attempted or other deployments not represented in this list. Do not treat this as an exact quota or a guaranteed reset."});
 }catch{return reply({...common,code:"vercel_usage_network_unavailable",
  message:"Could not reach the Vercel usage API. No deployment count can be verified."})}
}
