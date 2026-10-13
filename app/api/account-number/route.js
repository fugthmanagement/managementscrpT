import { NextResponse } from "next/server";
import { authenticatedUser,firebaseAdmin } from "../../../lib/server/auth";
import { allocateFugthAccountNumber } from "../../../lib/server/account-number";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request){
  const user=await authenticatedUser(request);
  if(!user?.uid)return NextResponse.json({error:"Sign in to activate your FUGTH account number."},{status:401});
  if(!(process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY))){
    return NextResponse.json({error:"FUGTH account numbering is being configured. Your account remains available."},{status:503});
  }
  try{
    const result=await allocateFugthAccountNumber(firebaseAdmin().firestore(),user.uid);
    return NextResponse.json({accountNumber:result.number,existing:result.existing});
  }catch(e){
    console.error("FUGTH account-number allocation failed",e?.status||"unexpected");
    return NextResponse.json({error:e.status===409?e.message:"Your FUGTH number could not be assigned yet."},{status:e.status||503});
  }
}
