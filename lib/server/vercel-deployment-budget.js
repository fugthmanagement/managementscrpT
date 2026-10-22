export const VERCEL_HOBBY_DEPLOYMENTS_PER_DAY=100;
export const ROLLING_WINDOW_MS=86400000;
export function deploymentBudget(rows,now=Date.now(),limit=VERCEL_HOBBY_DEPLOYMENTS_PER_DAY){
 const recent=rows.filter(x=>Number(x.created||x.createdAt)>=now-ROLLING_WINDOW_MS&&Number(x.created||x.createdAt)<=now)
  .sort((a,b)=>Number(a.created||a.createdAt)-Number(b.created||b.createdAt));
 const used=recent.length;
 return {used,limit,remaining:Math.max(0,limit-used),
  oldestAt:used?new Date(Number(recent[0].created||recent[0].createdAt)).toISOString():null,
  nextRollingReleaseAt:used?new Date(Number(recent[0].created||recent[0].createdAt)+ROLLING_WINDOW_MS).toISOString():null,
  low:used>=Math.max(0,limit-10),canRelease:used<limit-5};
}
