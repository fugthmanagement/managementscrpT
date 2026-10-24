import {browserLocalPersistence,setPersistence} from "firebase/auth";
/**
 * Firebase uses first-party IndexedDB/local storage for secure token refresh.
 * This is not a fake "logged in" cookie. Never persist access tokens manually.
 * A browser that blocks all first-party storage cannot guarantee persistence.
 */
const pending=new WeakMap();
export function ensurePersistentLogin(auth){
 if(!auth)return Promise.reject(Error("FUGTH sign-in is unavailable."));
 if(!pending.has(auth)){
  const work=setPersistence(auth,browserLocalPersistence).catch(error=>{
   pending.delete(auth);
   const code=String(error?.code||"");
   if(/unsupported-persistence|web-storage-unsupported|storage/i.test(code))
    throw Error("Your browser is blocking local sign-in storage. Use regular Safari (not Private Browsing) and allow website data for FUGTH.");
   throw Error("FUGTH could not keep this login on your device. Please check your browser privacy settings and retry.");
  });
  pending.set(auth,work);
 }
 return pending.get(auth);
}
export async function confirmPersistedLogin(user,auth){
 if(!user||auth?.currentUser?.uid!==user.uid)throw Error("Google sign-in did not finish on this device.");
 const token=await user.getIdToken();
 if(!token)throw Error("Your login could not be verified.");
 return true;
}
/**
 * Canonical first-party domain: apex and www have different local auth stores.
 * Kept to an allowlisted domain; do not redirect third-party preview hosts.
 */
export function canonicalAuthUrl(url){
 const value=new URL(url);
 if(value.hostname.toLowerCase()!=="fugthmanagement.space")return null;
 value.hostname="www.fugthmanagement.space";
 return value.toString();
}
