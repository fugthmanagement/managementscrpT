// FUGTH prospect import: selector-aware normalization. No business data leaves the browser before Firestore save.
export const COLUMNS = [
 ["businessName","Business name"],["phone","Phone number"],["industry","Business category"],
 ["address","Street address"],["city","City / area"],["rating","Google rating"],
 ["reviewCount","Review count"],["hours","Hours / status"],["website","Business website"],
 ["googleMapsUrl","Google Maps link"],["reviewSnippet","Review excerpt"],["description","Description"],
 ["sponsored","Sponsored listing"],["adClickUrl","Ad click URL"],["hasWebsite","Website listed"],
 ["ownerName","Owner / contact"],["status","Call status"],["sourceFile","Source file"],
 ["sourceRow","Source row"],["duplicateFlag","Potential duplicate"],["duplicateScore","Matching fields"],
 ["duplicateGroup","Duplicate group"],["rawColumns","Original scraper columns"]
];
export const MATCH_FIELDS=["phone","address","industry","rating","reviewCount","website","googleMapsUrl","hours","reviewSnippet","description"];
const trim=v=>String(v??"").replace(/[\u200b\u00a0\u202f]/g," ").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim();
const slug=v=>trim(v).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g,"");
const raw=(r,keys)=>{for(const key of keys){const entry=Object.entries(r||{}).find(([k,v])=>slug(k)===slug(key)&&trim(v));if(entry)return trim(entry[1]);}return "";};
const ad=url=>/google\.com\/aclk|googleadservices\.com|[?&]adurl=/i.test(url);
const phone=v=>{const n=trim(v).replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");return n.length===10?"("+n.slice(0,3)+") "+n.slice(3,6)+"-"+n.slice(6):trim(v).slice(0,35);};
const street=v=>/\b\d{1,6}\s+(?:[NSEW]\b|NW\b|SW\b|SE\b|NE\b|[A-Za-z][\w.-]*)/.test(v) && !/\bopen|closed|closes|sponsored|website|directions\b/i.test(v);
const goodURL=v=>/^https?:\/\//.test(v)&&!ad(v)?v:"";
const safeNum=v=>{const n=Number(String(v).replace(/[(),]/g,""));return Number.isFinite(n)?n:null;};

export function parseCsv(text,delimiter=","){
 const rows=[];let row=[],cell="",quoted=false;const value=String(text||"").replace(/^\uFEFF/,"");
 for(let i=0;i<value.length;i++){const c=value[i];if(c==='"'){if(quoted&&value[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(!quoted&&c===delimiter){row.push(cell);cell="";}
 else if(!quoted&&(c==="\n"||c==="\r")){if(c==="\r"&&value[i+1]==="\n")i++;row.push(cell);if(row.some(x=>trim(x)))rows.push(row);row=[];cell="";}
 else cell+=c;}
 row.push(cell);if(row.some(x=>trim(x)))rows.push(row);
 return rows;
}
export function fromMatrix(matrix,fileName){
 if(!Array.isArray(matrix)||matrix.length<2)return [];
 const heads=matrix[0].map((v,i)=>trim(v)||"Column "+(i+1));
 return matrix.slice(1).map((r,i)=>({item:Object.fromEntries(heads.map((k,j)=>[k,r[j]??""])),sourceRow:i+2,sourceFile:fileName})).filter(({item})=>Object.values(item).some(v=>trim(v)));
}
export function cleanProspect(source,{sourceFile="",sourceRow=0}={}){
 if(!source||typeof source!=="object"||Array.isArray(source))return null;
 const r=(source.rawColumns&&typeof source.rawColumns==="object")?source.rawColumns:source;
 const w4=Object.entries(r).filter(([k])=>/^W4Efsd(?: \d+)?$/i.test(k)).map(([,v])=>trim(v)).filter(Boolean);
 const name=raw(source,["businessName","business","name","company"])||raw(r,["xxVWCe","businessName","name"]);
 if(!name)return null;
 const maps=raw(source,["googleMapsUrl","mapsUrl"])||raw(r,["hfpxzc href","googleMapsUrl","mapsUrl"]);
 const number=raw(source,["phone","phoneNumber"])||raw(r,["UsdlK","phone","phoneNumber"]);
 if(!maps&&!number)return null;
 const rawSite=raw(source,["website","websiteUrl"])||raw(r,["lcr4fd href","website","websiteUrl"]);
 const site=goodURL(rawSite);
 const rating= safeNum(raw(source,["rating"])||raw(r,["MW4etd","rating"]));
 const reviews=safeNum(raw(source,["reviewCount"])||raw(r,["UY7F9","reviewCount"]));
 const hrs=[];for(const v of w4){if(/^(?:open|closed|closes?|opens?)\b/i.test(v.replace(/^·\s*/,""))){const h=v.replace(/^·\s*/,"");if(!hrs.includes(h))hrs.push(h);}}
 const rawSnippet=Object.entries(r).filter(([k])=>/^ah5Ghc(?: \d+)?$/i.test(k)).map(([,v])=>trim(v)).filter(Boolean).join(" ").replace(/^"|"$/g,"");
 const category=raw(source,["industry","category","primaryType"])||raw(r,["W4Efsd","category"]);
 const record={
  businessName:name.slice(0,160),phone:phone(number),ownerName:raw(source,["ownerName","contactName"]).slice(0,120),
  industry:category&&category!=="·"?category.slice(0,100):"Local service",
  address:(raw(source,["address","streetAddress"])||w4.find(street)||"").slice(0,230),
  city:raw(source,["city","area"]).slice(0,120),
  rating:rating!==null&&rating>=0&&rating<=5?rating:null,
  reviewCount:reviews!==null&&reviews>=0?Math.floor(reviews):null,
  hours:(raw(source,["hours"])||hrs.join("; ")).slice(0,220),
  website:site.slice(0,500),googleMapsUrl:maps.slice(0,1500),
  reviewSnippet:(raw(source,["reviewSnippet"])||rawSnippet).slice(0,1600),
  description:(raw(source,["description"])||raw(r,["c2ePGf","description"])).slice(0,1600),
  sponsored:source.sponsored===true||raw(r,["jHLihd"]).toLowerCase()==="sponsored",
  adClickUrl:(raw(source,["adClickUrl"])||(ad(rawSite)?rawSite:raw(r,["bm892c href"]))).slice(0,1500),
  hasWebsite:Boolean(site),
  sourceFile:trim(source.sourceFile||sourceFile),sourceRow:Number(source.sourceRow||sourceRow)||0,
  source:"Google Maps scraper",type:"cold_call_prospect",status:trim(source.status||"new"),
  callCount:Number(source.callCount)||0,favorite:Boolean(source.favorite),
  duplicateFlag:Boolean(source.duplicateFlag),duplicateGroup:trim(source.duplicateGroup||""),
  duplicateScore:Number(source.duplicateScore)||0,
  duplicateMatches:Array.isArray(source.duplicateMatches)?source.duplicateMatches:[],
  rawColumns:Object.fromEntries(Object.entries(r).map(([k,v])=>[k,trim(v).slice(0,1800)]))
 };
 if(ad(record.website))record.website="";
 if(!record.website)record.hasWebsite=false;
 return record;
}
export function matchDetails(a,b){
 const same=(k)=>{
  if(k==="rating"||k==="reviewCount")return a[k]!=null&&b[k]!=null&&Number(a[k])===Number(b[k]);
  const x=trim(a[k]),y=trim(b[k]);if(!x||!y)return false;
  if(k==="phone"){const p=x.replace(/\D/g,"").slice(-10),q=y.replace(/\D/g,"").slice(-10);return p.length===10&&p===q;}
  if(k==="googleMapsUrl")return x.split("?")[0]===y.split("?")[0];
  return slug(x)===slug(y);
 };
 const phoneMatch=same("phone"),mapsMatch=same("googleMapsUrl"),nameMatch=slug(a.businessName)===slug(b.businessName);
 if(!phoneMatch&&!mapsMatch&&!nameMatch)return [];
 const fields=MATCH_FIELDS.filter(same);
 return fields.length>=6||(mapsMatch&&fields.length>=3)?fields:[];
}
export function markDuplicates(records){
 const copy=records.map(x=>({...x,duplicateMatches:[...(x.duplicateMatches||[])]}));
 const parent=copy.map((_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<copy.length;i++)for(let j=0;j<i;j++){
  const fields=matchDetails(copy[i],copy[j]);
  if(!fields.length)continue;
  parent[root(i)]=root(j);
  for(const k of [i,j]){copy[k].duplicateFlag=true;copy[k].duplicateScore=Math.max(copy[k].duplicateScore||0,fields.length);copy[k].duplicateMatches=[...new Set([...copy[k].duplicateMatches,...fields])];}
 }
 const groups=new Map();
 for(let i=0;i<copy.length;i++){const k=root(i);groups.set(k,[...(groups.get(k)||[]),i]);}
 for(const g of groups.values())if(g.length>1){const group="dup_"+[...g].sort((a,b)=>a-b).map(x=>copy[x].businessName).join("_").slice(0,180).replace(/[^a-z0-9_]/gi,"_");for(const i of g){copy[i].duplicateFlag=true;copy[i].duplicateGroup=group;}}
 return copy;
}
export function friendlyRawHeader(k){
 const explicit={"hfpxzc href":"Google Maps URL","xxVWCe":"Business name","jHLihd":"Sponsored label","google-symbols":"Listing icon","MW4etd":"Rating","UY7F9":"Review count","W4Efsd":"Business category","UsdlK":"Phone number","lcr4fd href":"Website / ad link","Jn12ke src":"Review profile photo","c2ePGf":"Advertisement description","LDHnMb":"Advertisement headline","NlVald":"Advertisement action","bm892c href":"Advertisement link","doJOZc":"Review badge"};
 if(explicit[k])return explicit[k];
 if(/^W4Efsd \d+$/i.test(k))return "Listing detail "+k.split(" ").pop();
 if(/^ah5Ghc(?: \d+)?$/i.test(k))return "Review excerpt "+(k.split(" ")[1]||"1");
 if(/^Cw1rxd(?: \d+)?$/i.test(k))return "Action icon "+(k.split(" ")[1]||"1");
 if(/^R8c4Qb(?: \d+)?$/i.test(k))return "Action label "+(k.split(" ")[1]||"1");
 return k;
}
