/**
 * Firestore-backed founder appointment slots. Times use America/New_York,
 * including DST transitions; the client can never invent a bookable time.
 */
export const FOUNDER_TIMEZONE="America/New_York";
export const SLOT_MINUTES=30;
const fmt=new Intl.DateTimeFormat("en-US",{timeZone:FOUNDER_TIMEZONE,
 year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
const pad=n=>String(n).padStart(2,"0");
export function easternParts(date){
 const d=date instanceof Date?date:new Date(date);
 if(!Number.isFinite(d.getTime()))throw Error("Invalid appointment time.");
 const p=Object.fromEntries(fmt.formatToParts(d).map(x=>[x.type,x.value]));
 return {date:[p.year,p.month,p.day].join("-"),day:p.weekday,hour:Number(p.hour),minute:Number(p.minute)};
}
export function easternToUtc(day,hour,minute){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(hour)||hour<0||hour>23||![0,30].includes(minute))
  throw Error("Invalid local appointment slot.");
 const [y,m,d]=day.split("-").map(Number);
 if(new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==day)throw Error("Invalid calendar day.");
 const target=Date.UTC(y,m-1,d,hour,minute);
 let stamp=target;
 for(let i=0;i<4;i++){
  const p=easternParts(new Date(stamp));
  const local=Date.UTC(...p.date.split("-").map((v,j)=>j===1?Number(v)-1:Number(v)),p.hour,p.minute);
  stamp+=target-local;
 }
 const matched=easternParts(new Date(stamp));
 if(matched.date!==day||matched.hour!==hour||matched.minute!==minute)
  throw Error("Local time does not exist in the founder's timezone.");
 return new Date(stamp);
}
export function founderSlotDetails(value,{now=Date.now()}={}){
 const d=new Date(value);
 if(!Number.isFinite(d.getTime())||d.getTime()<now+24*3600000||d.getTime()>now+45*86400000)
  return null;
 const p=easternParts(d);
 if(["Sat","Sun"].includes(p.day)||p.hour<9||p.hour>=17||![0,30].includes(p.minute))
  return null;
 if(easternToUtc(p.date,p.hour,p.minute).getTime()!==d.getTime())return null;
 return {id:p.date.replaceAll("-","")+"_"+pad(p.hour)+pad(p.minute),day:p.date,
  hour:p.hour,minute:p.minute,startTime:d.toISOString(),
  endTime:new Date(d.getTime()+SLOT_MINUTES*60000).toISOString(),
  label:new Intl.DateTimeFormat("en-US",{timeZone:FOUNDER_TIMEZONE,hour:"numeric",minute:"2-digit"}).format(d)+" ET"};
}
export function founderDaySlots(day,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return [];
 try{
  const noon=easternToUtc(day,12,0);
  if(["Sat","Sun"].includes(easternParts(noon).day))return [];
  const slots=[];
  for(let hour=9;hour<17;hour++)for(const minute of [0,30]){
   const d=easternToUtc(day,hour,minute),slot=founderSlotDetails(d,{now});
   if(slot)slots.push(slot);
  }
  return slots;
 }catch{return []}
}
