// Public business opening hours are informational and do NOT grant booking access.
export const PUBLIC_WEEK=[["mon","Monday"],["tue","Tuesday"],["wed","Wednesday"],["thu","Thursday"],["fri","Friday"],["sat","Saturday"],["sun","Sunday"]];
const label={mon:"Mon",tue:"Tue",wed:"Wed",thu:"Thu",fri:"Fri",sat:"Sat",sun:"Sun"};
export function cleanOpeningHours(value){
 const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
 const time=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||""))?v:null;
 return Object.fromEntries(PUBLIC_WEEK.map(([key])=>{
  const day=raw[key]||{},start=time(day.start)||"09:00",end=time(day.end)||"17:00";
  return [key,{open:day.open===true&&start<end,start,end}];
 }));
}
const clock=time=>{
 const [h,m]=time.split(":").map(Number),hour=h%12||12;
 return hour+(m?":"+String(m).padStart(2,"0"):"")+(h>=12?"p":"a");
};
export function formatOpeningHours(raw){
 if(!raw||typeof raw!=="object")return "";
 const week=cleanOpeningHours(raw),groups=[];
 // A newly created profile has no opening hours; avoid falsely announcing "closed" all week.
 if(!Object.values(week).some(day=>day.open))return "";
 for(const [day] of PUBLIC_WEEK){
  const entry=week[day],time=entry.open?clock(entry.start)+"–"+clock(entry.end):"Closed";
  const last=groups[groups.length-1];
  if(last&&last.time===time)last.end=day;
  else groups.push({start:day,end:day,time});
 }
 const parts=groups.map(x=>(x.start===x.end?label[x.start]:label[x.start]+"–"+label[x.end])+" "+x.time);
 const full=parts.join("; ");
 return full.length<=100?full:"Contact us for full opening hours";
}
