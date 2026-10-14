import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request,{params}){
 const uid=params.uid||"";
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid))return new NextResponse("// Invalid business chat ID",{status:400,headers:{"Content-Type":"application/javascript"}});
 const origin="https://www.fugthmanagement.space";
 const js=[
  '(function(){',
  'if(!document.body)return;',
  'var id='+JSON.stringify("fugth-site-chat-"+uid)+';',
  'if(document.getElementById(id))return;',
  'var frame=document.createElement("iframe");',
  'frame.id=id;',
  'frame.title="FUGTH business chat";',
  'frame.src='+JSON.stringify(origin+"/embed/chat/"+uid)+';',
  'frame.loading="lazy";',
  'frame.referrerPolicy="strict-origin-when-cross-origin";',
  'frame.setAttribute("allow","clipboard-write");',
  'frame.style.cssText="position:fixed;z-index:2147482500;right:12px;bottom:12px;width:min(380px,calc(100vw - 24px));height:92px;border:0;background:transparent;transition:height .2s ease;";',
  'document.body.appendChild(frame);',
  'window.addEventListener("message",function(event){',
  'if(event.origin!=='+JSON.stringify(origin)+'||event.source!==frame.contentWindow)return;',
  'if(event.data&&event.data.type==="FUGTH_CHAT_RESIZE")frame.style.height=event.data.open?"min(620px,calc(100dvh - 24px))":"92px";',
  '});',
  '})();'
 ].join("\n");
 return new NextResponse(js,{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff","Access-Control-Allow-Origin":"*"}});
}
