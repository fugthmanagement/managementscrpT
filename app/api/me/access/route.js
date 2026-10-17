import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,isAdminEmail,firebaseAdmin} from "../../../../lib/server/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request){
 const user=await authenticatedUser(request);
 if(!user)return NextResponse.json({error:"Not authenticated",isFounder:false},{status:401});
 let founderGrant=null;
 try{
  const doc=await firebaseAdmin().firestore().doc("founderAccountGrants/"+user.uid).get();
  const grant=doc.data();
  const at=Date.now(),from=Date.parse(grant?.startsAt||""),until=Date.parse(grant?.expiresAt||"");
  if(grant?.source==="founder"&&["website","starter","growth","elite"].includes(grant?.tier)&&from<=at&&until>at)
   founderGrant={source:"founder",tier:grant.tier,term:grant.term,startsAt:grant.startsAt,expiresAt:grant.expiresAt};
 }catch{/* Account login is independent of optional founder grants. */}
 return NextResponse.json({isFounder:isFounder(user),accountId:user.uid,founderGrant,
  needsFounderVerification:isAdminEmail(user.email)&&user.email_verified!==true,
  emailVerified:user.email_verified===true},{headers:{"Cache-Control":"private, no-store"}});
}
