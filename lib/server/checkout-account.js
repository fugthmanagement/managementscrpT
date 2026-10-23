/**
 * Checkout may complete registration for a valid signed-in Firebase user when
 * client-side account setup failed (for example, transient Firestore rules).
 * This must never assign a plan, role, subscription status or privileges.
 */
const isUid=uid=>typeof uid==="string"&&/^[A-Za-z0-9_-]{8,128}$/.test(uid);
export async function ensureCheckoutAccount(db,user){
 if(!isUid(user?.uid)||typeof user.email!=="string"||!user.email.trim())
  throw new Error("Verified Firebase account with email required.");
 const ref=db.doc("users/"+user.uid);
 return db.runTransaction(async tx=>{
  const existing=await tx.get(ref);
  if(existing.exists)return existing.data()||{};
  const now=new Date().toISOString();
  const minimal={email:user.email.trim(),createdAt:now,updatedAt:now,accountSetupPending:true};
  tx.create(ref,minimal);
  return minimal;
 });
}
