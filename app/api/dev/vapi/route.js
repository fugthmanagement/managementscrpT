import { NextResponse } from "next/server";
import { authenticatedUser, isFounder } from "../../../../lib/server/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED = {
  assistants: "https://api.vapi.ai/assistant",
  numbers: "https://api.vapi.ai/phone-number",
  calls: "https://api.vapi.ai/call?limit=20",
};
export async function GET(req) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isFounder(user)) return NextResponse.json({ error: "Founder access required." }, { status: 403 });
  const privateKey = process.env.VAPI_PRIVATE_KEY || process.env.VOICE_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: "Vapi API key has not been configured in Vercel." }, { status: 503 });
  try {
    const data = await Promise.all(Object.entries(ALLOWED).map(async ([name, url]) => {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${privateKey}` }, cache: "no-store" });
      if (!response.ok) return [name, { items: [], error: `Provider returned HTTP ${response.status}` }];
      const body = await response.json();
      const rows = Array.isArray(body) ? body : body.results || body.data || [];
      // Return only operational metadata, not transcripts, call content, or credentials.
      const mapped = rows.slice(0, 40).map(row => {
        if (name === "assistants") return { id: row.id, name: row.name || "Unnamed assistant", model: row.model?.model || "", voice: row.voice?.provider || "", createdAt: row.createdAt || "" };
        if (name === "numbers") return { id: row.id, number: row.number || "", name: row.name || "", assistantId: row.assistantId || "" };
        return { id: row.id, status: row.status || "", type: row.type || "", startedAt: row.startedAt || row.createdAt || "", assistantId: row.assistantId || "" };
      });
      return [name, { items: mapped }];
    }));
    return NextResponse.json(Object.fromEntries(data));
  } catch { return NextResponse.json({ error: "Vapi could not be reached. Confirm the account key and try again." }, { status: 502 }); }
}

const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||""));
/**
 * Small, explicitly selected, reversible founder operations. Never accept
 * arbitrary provider URLs or entire assistant payloads from the browser.
 */
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user||!isFounder(user))return NextResponse.json({error:"Verified founder required."},{status:403});
 const key=process.env.VAPI_PRIVATE_KEY||process.env.VOICE_PRIVATE_KEY;
 if(!key)return NextResponse.json({error:"Vapi is not configured."},{status:503});
 let body;
 try{const raw=await req.text();if(raw.length>1200)throw Error();body=JSON.parse(raw)}
 catch{return NextResponse.json({error:"Invalid settings request."},{status:400})}
 const action=body?.action;
 if(!["assign_assistant","rename_assistant"].includes(action))
  return NextResponse.json({error:"Unsupported action."},{status:400});
 const id=action==="assign_assistant"?body.phoneNumberId:body.assistantId;
 if(!uuid(id))return NextResponse.json({error:"Choose a valid Vapi resource."},{status:400});
 if(action==="assign_assistant"&&!uuid(body.assistantId))
  return NextResponse.json({error:"Choose an existing Vapi assistant."},{status:400});
 const rename=String(body?.name||"").replace(/[\r\n<>]/g," ").trim().slice(0,70);
 if(action==="rename_assistant"&&rename.length<2)
  return NextResponse.json({error:"Name must be at least two characters."},{status:400});
 const headers={Authorization:"Bearer "+key.trim(),"Content-Type":"application/json"};
 const base="https://api.vapi.ai/";
 const resource=action==="assign_assistant"?"phone-number/":"assistant/";
 try{
  // Both the number and target assistant must actually belong to this Vapi account.
  const checks=[base+resource+encodeURIComponent(id)];
  if(action==="assign_assistant")checks.push(base+"assistant/"+encodeURIComponent(body.assistantId));
  const verified=await Promise.all(checks.map(async url=>{
   const res=await fetch(url,{headers,cache:"no-store",signal:AbortSignal.timeout(8500)});
   if(!res.ok)return null;
   return res.json().catch(()=>null);
  }));
  if(verified.some(x=>!x?.id))return NextResponse.json({error:"The selected Vapi number or assistant was not found in the connected account."},{status:404});
  const target=base+resource+encodeURIComponent(id);
  const patch=action==="assign_assistant"?{assistantId:body.assistantId}:{name:rename};
  const response=await fetch(target,{method:"PATCH",headers,body:JSON.stringify(patch),
   cache:"no-store",signal:AbortSignal.timeout(9500)});
  if(!response.ok)return NextResponse.json({error:"Vapi declined this configuration change.",providerStatus:response.status},{status:502});
  const result=await response.json().catch(()=>({}));
  return NextResponse.json({saved:true,action,id:result.id||id,
   assistantId:action==="assign_assistant"?body.assistantId:undefined,
   name:action==="rename_assistant"?rename:undefined,
   message:"Updated at Vapi. Refresh the list to confirm."},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Vapi connection failed while updating this setting."},{status:503})}
}
