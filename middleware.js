import {NextResponse} from "next/server";
/** One official host keeps browser-local Firebase auth on the same origin. */
export function middleware(req){
 const url=req.nextUrl;
 if(url.hostname.toLowerCase()!=="fugthmanagement.space")return NextResponse.next();
 if(!["GET","HEAD"].includes(req.method))return NextResponse.next();
 const redirect=url.clone();
 redirect.hostname="www.fugthmanagement.space";
 redirect.protocol="https:";
 return NextResponse.redirect(redirect,308);
}
export const config={matcher:[
 "/login","/dashboard","/plans","/claim/:path*","/sites/:path*",
 "/billing/:path*","/settings/:path*"
]};
