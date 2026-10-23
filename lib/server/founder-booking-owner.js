/**
 * One source of truth for the private FUGTH consultation calendar.
 * Both public booking and founder management MUST resolve the same owner.
 * Never silently assign a public appointment to an arbitrary customer.
 */
export const FOUNDER_BOOKING_EMAILS=Object.freeze([
 "fugthmanagement@gmail.com","fugthchat@gmail.com",
 "mepenginestudio@gmail.com","novaeriahengine@gmail.com"
]);
export class BookingOwnerError extends Error{
 constructor(code,message){super(message);this.name="BookingOwnerError";this.code=code;}
}
export function configuredFounderBookingEmail(env={}){
 const email=String(env.FUGTH_BOOKING_OWNER_EMAIL||
  env.FUGTH_CALENDAR_OWNER_EMAIL||FOUNDER_BOOKING_EMAILS[0]).trim().toLowerCase();
 if(!FOUNDER_BOOKING_EMAILS.includes(email))
  throw new BookingOwnerError("booking_owner_not_configured",
   "The configured booking calendar owner is not a permitted FUGTH founder account.");
 return email;
}
/**
 * If an approved address has not completed Firebase signup, select another
 * VERIFIED founder account from the known allowlist; never a visitor-supplied
 * address. Preserve the same selection order in all request handlers.
 */
export async function verifiedFounderBookingOwner(auth,env={}){
 const preferred=configuredFounderBookingEmail(env);
 const candidates=[preferred,...FOUNDER_BOOKING_EMAILS.filter(e=>e!==preferred)];
 for(const email of candidates){
  let record;
  try{record=await auth.getUserByEmail(email);}
  catch(error){
   if(error?.code==="auth/user-not-found")continue;
   throw new BookingOwnerError("booking_owner_lookup_failed",
    "Firebase Authentication could not verify the booking calendar owner.");
  }
  if(!record?.uid||record.disabled||record.emailVerified!==true)continue;
  return {uid:record.uid,email,fallback:email!==preferred};
 }
 throw new BookingOwnerError("booking_owner_not_verified",
  "No approved FUGTH booking owner has a verified, enabled Firebase login.");
}
