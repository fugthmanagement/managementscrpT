import { randomInt } from "crypto";
// FUGTH public-facing account reference: 537000–537999. This is NOT an auth token.
// Exactly 1000 IDs exist in the requested 6-digit format. Never recycle issued IDs.
export const ACCOUNT_PREFIX="537";
export const ACCOUNT_ID_CAPACITY=1000;
export function isFugthAccountNumber(v) {return typeof v==="string" && /^537[0-9]{3}$/.test(v);}

export async function allocateFugthAccountNumber(db,uid) {
  if(!uid || !/^[a-zA-Z0-9_-]{8,128}$/.test(uid))throw new Error("Invalid customer account.");
  const userRef=db.doc("users/"+uid);
  // Randomized scan makes IDs unpredictable enough for presentation only.
  // Transactions reserve IDs and user assignment atomically, including parallel signups.
  const first=randomInt(ACCOUNT_ID_CAPACITY);
  for(let index=0;index<ACCOUNT_ID_CAPACITY;index++) {
    const candidate=ACCOUNT_PREFIX+String((first+index)%ACCOUNT_ID_CAPACITY).padStart(3,"0");
    const registryRef=db.doc("fugthAccountNumbers/"+candidate);
    const result=await db.runTransaction(async tx=>{
      const [userSnapshot,registrySnapshot]=await Promise.all([tx.get(userRef),tx.get(registryRef)]);
      const current=userSnapshot.data()?.accountNumber;
      if(isFugthAccountNumber(current))return {number:current,existing:true};
      if(registrySnapshot.exists)return null;
      const now=new Date().toISOString();
      tx.create(registryRef,{uid,number:candidate,issuedAt:now});
      tx.set(userRef,{accountNumber:candidate,accountNumberIssuedAt:now,updatedAt:now},{merge:true});
      return {number:candidate,existing:false};
    });
    if(result)return result;
  }
  const error=new Error("The 537xxx account number range is full. Extend the format before adding more customers.");
  error.status=409;
  throw error;
}
