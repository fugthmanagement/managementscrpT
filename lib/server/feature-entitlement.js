// Server-side feature checks: never trust the preview tier selected in the browser.
import {firebaseAdmin,isFounder} from "./auth";
import {hasAccess,accessTier} from "./account-entitlements";
export async function businessEntitlement(user,feature){
 if(!user?.uid)return {allowed:false,tier:"none",reason:"Sign in first."};
 if(isFounder(user))return {allowed:true,tier:"elite",reason:null};
 try{
  const db=firebaseAdmin().firestore();
  const [account,grant]=await Promise.all([
   db.doc("users/"+user.uid).get(),
   db.doc("founderAccountGrants/"+user.uid).get()
  ]);
  const profile={...account.data(),founderAccess:grant.exists?grant.data():null};
  const tier=accessTier(profile),addons=profile.billingActive===true?profile.billingAddons||[]:[];
  const allowed=feature==="website"?hasAccess(profile,"website")||profile.websitePurchased===true:
   feature==="crm"||feature==="voice"||feature==="phone"||feature==="bookings"?hasAccess(profile,"starter"):
   feature==="marketing"?hasAccess(profile,"growth")||addons.includes("email"):
   feature==="automation"?hasAccess(profile,"elite")||addons.includes("automation"):
   false;
  return {allowed,tier,reason:allowed?null:
   "This feature requires an active Essential plan or higher. Your website and free preview remain available."};
 }catch(error){
  console.warn("FUGTH entitlement check failed",{code:error?.code||"account"});
  return {allowed:false,tier:"none",reason:"Account access could not be verified. Retry or contact support."};
 }
}
