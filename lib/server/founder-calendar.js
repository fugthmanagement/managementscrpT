/**
 * FUGTH founder booking: 24 hours a day, 7 days a week, 30-minute slots.
 * Source of truth: Firestore founderCalendarSlots/{slot.id}.
 * Never accept an unverified browser-suggested time.
 */
export const FOUNDER_TIMEZONE="America/New_York";
export const SLOT_MINUTES=30;
export const MIN_NOTICE_MINUTES=30;
export const MAX_BOOKING_DAYS=45;
const pad=x=>String(x).padStart(2,"0");
const fmt=new Intl.DateTimeFormat("en-US",{timeZone:FOUNDER_TIMEZONE,
 year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function easternParts(value){
 const date=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(date.getTime()))throw Error("Invalid appointment time.");
 const p=Object.fromEntries(fmt.formatToParts(date).map(x=>[x.type,x.value]));
 return {date:[p.year,p.month,p.day].join("-"),day:p.weekday,
  hour:Number(p.hour),minute:Number(p.minute)};
}
function dateParts(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day)))throw Error("Invalid calendar day.");
 const [y,m,d]=day.split("-").map(Number);
 const expected=new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10);
 if(expected!==day)throw Error("Invalid calendar day.");
 return {y,m,d};
}
/**
 * Two possible UTC offsets cover Eastern Standard and Daylight time.
 * Match against the real time zone so nonexistent 2 AM spring-forward slots
 * are never offered, while repeated 1 AM fall-back slots remain distinct.
 */
export function easternUtcCandidates(day,hour,minute){
 const {y,m,d}=dateParts(day);
 if(!Number.isInteger(hour)||hour<0||hour>23||![0,30].includes(minute))
  throw Error("Invalid local appointment slot.");
 const wall=Date.UTC(y,m-1,d,hour,minute);
 const candidates=[];
 for(const offsetHours of [4,5]){
  const utc=new Date(wall+offsetHours*3600000);
  const p=easternParts(utc);
  if(p.date===day&&p.hour===hour&&p.minute===minute)
   candidates.push(utc);
 }
 return candidates.sort((a,b)=>a.getTime()-b.getTime());
}
export function easternToUtc(day,hour,minute,occurrence=0){
 const candidates=easternUtcCandidates(day,hour,minute);
 if(!Number.isInteger(occurrence)||!candidates[occurrence])
  throw Error("Local time does not exist in the founder's timezone.");
 return candidates[occurrence];
}
export function founderSlotDetails(value,{now=Date.now()}={}){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||
    date.getTime()<now+MIN_NOTICE_MINUTES*60000||
    date.getTime()>now+MAX_BOOKING_DAYS*86400000)return null;
 const p=easternParts(date);
 if(![0,30].includes(p.minute)||date.getUTCSeconds()!==0||date.getUTCMilliseconds()!==0)
  return null;
 const candidates=easternUtcCandidates(p.date,p.hour,p.minute);
 const occurrence=candidates.findIndex(x=>x.getTime()===date.getTime());
 if(occurrence<0)return null;
 const localId=p.date.replaceAll("-","")+"_"+pad(p.hour)+pad(p.minute);
 const id=occurrence===0?localId:localId+"b";
 const label=new Intl.DateTimeFormat("en-US",{timeZone:FOUNDER_TIMEZONE,
  hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(date);
 return {id,day:p.date,hour:p.hour,minute:p.minute,occurrence,
  startTime:date.toISOString(),
  endTime:new Date(date.getTime()+SLOT_MINUTES*60000).toISOString(),label};
}
export function founderDaySlots(day,now=Date.now()){
 let parts;
 try{parts=dateParts(day)}catch{return []}
 const slots=[];
 for(let hour=0;hour<24;hour++)for(const minute of [0,30]){
  for(const time of easternUtcCandidates(day,hour,minute)){
   const slot=founderSlotDetails(time,{now});
   if(slot)slots.push(slot);
  }
 }
 return slots.sort((a,b)=>a.startTime.localeCompare(b.startTime));
}
export function founderNoSlotsReason(day,now=Date.now()){
 try{
  dateParts(day);
  const all=founderDaySlots(day,now-MAX_BOOKING_DAYS*86400000);
  if(!all.length)return {code:"outside_range",message:"Choose a date within the next 45 days."};
  if(all.every(x=>Date.parse(x.startTime)<now+MIN_NOTICE_MINUTES*60000))
   return {code:"past",message:"This date has passed. Choose a later date or time."};
  return {code:"no_slots",message:"No remaining time slots on this date. Try another day."};
 }catch{return {code:"invalid_date",message:"Choose a valid appointment date."}}
}
