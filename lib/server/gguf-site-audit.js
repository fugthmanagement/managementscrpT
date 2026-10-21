/**
 * Safely fetch one prospect's existing public website for a founder-requested audit.
 * No browser cookies, cookies from the customer's site, private IPs, credentials,
 * forms or open-ended crawling. Pin DNS result for TLS connection to avoid
 * DNS rebinding between resolution and the actual HTTPS request.
 */
import https from "node:https";
import dns from "node:dns/promises";
import net from "node:net";

const denied=new net.BlockList();
for(const [n,p] of [
 ["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],
 ["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.168.0.0",16],
 ["198.18.0.0",15],["224.0.0.0",4],["240.0.0.0",4]
])denied.addSubnet(n,p,"ipv4");
for(const [n,p] of [["::",128],["::1",128],["fc00::",7],["fe80::",10],["ff00::",8],["::ffff:0:0",96]])
 denied.addSubnet(n,p,"ipv6");
const clean=s=>String(s||"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim();
function checked(raw,prior=null){
 const source=String(raw||"").trim().slice(0,1500);
 if(!/^https?:\/\//i.test(source))throw Error("Only public HTTP/HTTPS websites can be audited.");
 const u=new URL(source);
 if(u.protocol==="http:")u.protocol="https:";
 if(u.protocol!=="https:"||u.port||u.username||u.password||u.search.length>500||
  net.isIP(u.hostname)||u.hostname==="localhost"||!u.hostname.includes(".")||u.hostname.length>200)
  throw Error("This website URL cannot be audited safely.");
 if(prior){
  const domain=prior.hostname.replace(/^www\./i,"");
  if(u.hostname.replace(/^www\./i,"")!==domain)throw Error("This website redirects to another domain. Audit cancelled.");
 }
 u.hash="";
 return u;
}
async function requestSite(u){
 const answers=await dns.lookup(u.hostname,{all:true,verbatim:true});
 if(!answers.length||answers.some(a=>!net.isIP(a.address)||denied.check(a.address,a.family===6?"ipv6":"ipv4")))
  throw Error("Website resolved to a non-public network address.");
 const selected=answers[0];
 return await new Promise((resolve,reject)=>{
  let settled=false,count=0;
  const finish=(error,value)=>{if(settled)return;settled=true;error?reject(error):resolve(value)};
  const req=https.request(u,{
   method:"GET",servername:u.hostname,timeout:6500,
   headers:{"User-Agent":"FUGTH-SitePreviewReview/1.0","Accept":"text/html"},
   lookup:(_hostname,_options,callback)=>callback(null,selected.address,selected.family),
   rejectUnauthorized:true
  },res=>{
   const status=res.statusCode||0;
   if([301,302,303,307,308].includes(status)){const dest=res.headers.location||"";res.resume();return finish(null,{redirect:dest});}
   if(status!==200){res.resume();return finish(Error("Website returned HTTP "+status));}
   const mime=String(res.headers["content-type"]||"");
   if(!/text\/html/i.test(mime)){res.resume();return finish(Error("Website does not provide an HTML page."));}
   const total=Number(res.headers["content-length"]||0);
   if(total>130000){res.resume();return finish(Error("Page exceeds safe audit size."));}
   const chunks=[];
   res.on("data",piece=>{count+=piece.length;if(count>130000){req.destroy(Error("Page exceeds safe audit size."));return;}chunks.push(piece)});
   res.on("end",()=>finish(null,{html:Buffer.concat(chunks).toString("utf8")}));
   res.on("error",e=>finish(e));
  });
  req.on("timeout",()=>req.destroy(Error("Website did not respond promptly.")));
  req.on("error",e=>finish(e));
  req.end();
 });
}
function txt(v){return clean(String(v||"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">"))}
function first(html,regex){return txt(html.match(regex)?.[1]||"").slice(0,350);}
function headings(html,tag){return [...html.matchAll(new RegExp("<"+tag+"\\b[^>]*>([\\s\\S]*?)<\\/"+tag+">","gi"))].slice(0,12)
 .map(m=>txt(m[1].replace(/<[^>]+>/g," "))).filter(Boolean);}
function extract(html,url){
 const safe=html.replace(/<!--[\s\S]*?-->/g," ")
  .replace(/<(script|style|svg|noscript|iframe|form|template)\b[^>]*>[\s\S]*?<\/\1>/gi," ")
  .replace(/<[^>]*\b(?:hidden|aria-hidden=["']true["'])[^>]*>[\s\S]*?<\/[^>]+>/gi," ");
 const title=first(safe,/<title[^>]*>([\s\S]*?)<\/title>/i);
 const description=first(safe,/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i)||
   first(safe,/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
 const h1=headings(safe,"h1"),h2=headings(safe,"h2");
 const visible=txt(safe.replace(/<[^>]+>/g," ")).slice(0,4400);
 if(!visible||visible.length<45)throw Error("Website content could not be extracted.");
 const evidence=[
  "Website: "+url,"Page title: "+title,
  "Meta description: "+description,"Headlines: "+h1.join(" | "),
  "Section headings: "+h2.join(" | "),
  "Visible excerpts (untrusted site text): "+visible
 ].join("\n").slice(0,5900);
 return {url,title,description,headings:[...h1,...h2].slice(0,16),excerpt:visible.slice(0,3500),evidence};
}
export async function reviewPublicWebsite(original){
 const start=checked(original);
 let current=start;
 for(let redirects=0;redirects<=2;redirects++){
  const result=await requestSite(current);
  if(result.html)return extract(result.html,current.toString());
  if(!result.redirect)throw Error("Website content was not available.");
  current=checked(new URL(result.redirect,current).toString(),start);
 }
 throw Error("Website redirected too many times.");
}
