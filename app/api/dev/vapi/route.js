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


/**
 * Founder-only update of existing number → existing assistant association.
 * This does not provision phone numbers, create calls, or modify billing.
 */
export async function POST(req){
 const user=await authenticatedUser(req);
 if(!user?.uid||!isFounder(user))return NextResponse.json({error:"Verified founder account required."},{status:403});
 const key=process.env.VAPI_PRIVATE_KEY||process.env.VOICE_PRIVATE_KEY||"";
 if(!key)return NextResponse.json({error:"Vapi is not connected on this server."},{status:503});
 let body;
 try{const txt=await req.text();if(txt.length>1200)throw Error();body=JSON.parse(txt)}
 catch{return NextResponse.json({error:"Invalid number mapping."},{status:400})}
 const phoneNumberId=String(body.phoneNumberId||"").trim(),
  assistantId=String(body.assistantId||"").trim();
 if(body.action!=="assign_assistant"||
    !/^[A-Za-z0-9-]{8,128}$/.test(phoneNumberId)||
    !/^[A-Za-z0-9-]{8,128}$/.test(assistantId))
  return NextResponse.json({error:"Choose one existing phone number and assistant."},{status:400});
 const headers={Authorization:"Bearer "+key,"Content-Type":"application/json"};
 try{
  // Verify both identifiers belong to the already-connected Vapi organization.
  const [numbersResponse,assistantsResponse]=await Promise.all([
   fetch("https://api.vapi.ai/phone-number",{headers,cache:"no-store",signal:AbortSignal.timeout(7000)}),
   fetch("https://api.vapi.ai/assistant",{headers,cache:"no-store",signal:AbortSignal.timeout(7000)})
  ]);
  if(!numbersResponse.ok||!assistantsResponse.ok)
   return NextResponse.json({error:"Vapi couldn't verify your number and assistant. Nothing changed."},{status:502});
  const phones=await numbersResponse.json(),assistants=await assistantsResponse.json();
  const list=data=>Array.isArray(data)?data:Array.isArray(data?.results)?data.results:Array.isArray(data?.data)?data.data:[];
  if(!list(phones).some(p=>p.id===phoneNumberId)||!list(assistants).some(a=>a.id===assistantId))
   return NextResponse.json({error:"Selected number or assistant isn't in this Vapi workspace."},{status:404});
  const result=await fetch("https://api.vapi.ai/phone-number/"+encodeURIComponent(phoneNumberId),{
   method:"PATCH",headers,body:JSON.stringify({assistantId}),signal:AbortSignal.timeout(10000),cache:"no-store"
  });
  if(!result.ok)return NextResponse.json({error:"Vapi rejected the number update (HTTP "+result.status+"). No phone calls were placed."},{status:502});
  return NextResponse.json({updated:true,phoneNumberId,assistantId,
   message:"Assigned the selected Vapi assistant to this existing business number. No call initiated."});
 }catch(e){
  console.warn("FUGTH_VAPI_MAPPING",{code:String(e?.code||"provider_unavailable")});
  return NextResponse.json({error:"Could not update Vapi number mapping. Try again after checking Vapi connection."},{status:503});
 }
}
