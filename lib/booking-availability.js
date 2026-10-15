const DAYS=["sun","mon","tue","wed","thu","fri","sat"];
const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||""));
export const WEEK_DAYS=[["sun","Sunday"],["mon","Monday"],["tue","Tuesday"],["wed","Wednesday"],
 ["thu","Thursday"],["fri","Friday"],["sat","Saturday"]];
export function defaultAvailability(){
 return {enabled:false,timeZone:"America/New_York",
  week:Object.fromEntries(WEEK_DAYS.map(([day])=>[day,{open:!["sun","sat"].includes(day),start:"09:00",end:"17:00"}])),
  blockedDates:[],updatedAt:null};
}
export function cleanAvailability(raw={}){
 const basic=defaultAvailability();
 raw=raw&&typeof raw==="object"?raw:{};
 let zone=String(raw.timeZone||basic.timeZone).slice(0,100);
 try{Intl.DateTimeFormat("en-US",{timeZone:zone});}catch{zone=basic.timeZone;}
 const week=Object.fromEntries(DAYS.map(day=>{
  const data=raw.week?.[day]||basic.week[day];
  const start=validTime(data.start)?data.start:"09:00",end=validTime(data.end)?data.end:"17:00";
  return [day,{open:data.open===true&&start<end,start,end}];
 }));
 const blockedDates=[...new Set((Array.isArray(raw.blockedDates)?raw.blockedDates:[])
   .filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date||""))).slice(0,90))].sort();
 return {enabled:raw.enabled===true,timeZone:zone,week,blockedDates,
  updatedAt:raw.updatedAt||null};
}
export function checkBusinessHours(raw,start,end){
 const settings=cleanAvailability(raw);
 if(!settings.enabled)return {allowed:true,configured:false};
 const zone=settings.timeZone;
 const parts=instant=>{
  const v=new Intl.DateTimeFormat("en-US",{timeZone:zone,weekday:"short",year:"numeric",
   month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(instant);
  const t=Object.fromEntries(v.map(p=>[p.type,p.value]));
  return {day:String(t.weekday||"").slice(0,3).toLowerCase(),
   date:t.year+"-"+t.month+"-"+t.day,time:t.hour+":"+t.minute};
 };
 const from=parts(start),to=parts(end);
 if(from.date!==to.date)return {allowed:false,reason:"Appointments must begin and end on the same business day."};
 if(settings.blockedDates.includes(from.date))return {allowed:false,reason:"This business is not accepting appointments on that date."};
 const hours=settings.week[from.day];
 if(!hours?.open||from.time<hours.start||to.time>hours.end)
  return {allowed:false,reason:"That time is outside the business's available appointment hours."};
 return {allowed:true,configured:true};
}
