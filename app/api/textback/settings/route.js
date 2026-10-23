import {NextResponse} from "next/server";
import {authenticatedUser,firebaseAdmin,isFounder} from "../../../../lib/server/auth";
import {defaultTextbackSettings,normalizeTextbackSettings} from "../../../../lib/textback-flow";
import {firestoreDemoFailure} from "../../../../lib/server/prospect-demos-directory";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const out=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function actor(req){const user=await authenticatedUser(req);return user?.uid?user:null}
export async function GET(req){
 const user=await actor(req);if(!user)return out({error:"Sign in to access your FUGTH messenger."},401);
 try{
  const db=firebaseAdmin().firestore(),[profile,snap]=await Promise.all([
   db.doc("users/"+user.uid).get(),db.doc("users/"+user.uid+"/textback/settings").get()
  ]);
  const config={...defaultTextbackSettings(profile.data()?.businessName),...(snap.data()||{})};
  return out({config,providerConnected:false,canSimulate:true,
   message:"Configuration is saved privately. Automatic sending stays OFF until an SMS provider and number are verified."});
 }catch(error){const issue=firestoreDemoFailure(error);
  return out({error:"FUGTH couldn't load your private messenger settings.",
   code:issue.code,hint:issue.hint},503);}
}
export async function POST(req){
 const user=await actor(req);if(!user)return out({error:"Sign in to configure text-back."},401);
 let input;try{const raw=await req.text();if(raw.length>2600)throw Error();input=JSON.parse(raw)}
 catch{return out({error:"Invalid settings request."},400)}
 try{
  const db=firebaseAdmin().firestore(),ref=db.doc("users/"+user.uid+"/textback/settings");
  const [snap,profile]=await Promise.all([ref.get(),db.doc("users/"+user.uid).get()]);
  const previous={...defaultTextbackSettings(profile.data()?.businessName),...(snap.data()||{})};
  const saved=normalizeTextbackSettings(input,previous);
  await ref.set({...saved,updatedBy:user.uid},{merge:true});
  return out({saved:true,config:saved,providerConnected:false,sendEnabled:false,
   message:"Text-back preferences saved. No SMS was sent. Add a verified SMS provider before enabling automatic delivery."});
 }catch(error){
  if(String(error?.message||"").startsWith("Use a business-specific")||
     String(error?.message||"").startsWith("Enter a valid")||
     String(error?.message||"").startsWith("Choose an approved"))return out({error:error.message},400);
  const issue=firestoreDemoFailure(error);return out({error:"Text-back settings could not be saved.",
   code:issue.code,hint:issue.hint},503);
 }
}
