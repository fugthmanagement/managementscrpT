import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {inspectPublicSiteLayout} from "../../../../lib/server/gguf-site-audit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=35;
const out=(value,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(req){
 const actor=await authenticatedUser(req);
 if(!actor?.uid||!isFounder(actor))return out({error:"Founder access required."},403);
 let data;try{const raw=await req.text();if(raw.length>1600)throw Error();data=JSON.parse(raw)}
 catch{return out({error:"Invalid layout inspection request."},400)}
 const id=String(data.prospectId||"");
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(id))return out({error:"Select a saved business prospect first."},400);
 try{
  const snap=await firebaseAdmin().firestore().doc("users/"+actor.uid+"/campaigns/"+id).get();
  if(!snap.exists||snap.data()?.type!=="cold_call_prospect")return out({error:"Prospect not found in your calling list."},404);
  const source=String(data.website||snap.data()?.website||"").trim();
  if(!source)return out({error:"This prospect has no website. Add its existing URL or paste one to analyze."},400);
  const layout=await inspectPublicSiteLayout(source);
  return out({layout,saved:false,note:"Structure only; no source text, image assets or review content are saved to Firestore. Click Save in Website Maker to save the generated design."});
 }catch(e){
  console.warn("FUGTH_SITE_LAYOUT_INSPECTION",{code:String(e?.code||"unavailable")});
  return out({error:String(e?.message||"This public website could not be inspected.").slice(0,160)},422);
 }
}
