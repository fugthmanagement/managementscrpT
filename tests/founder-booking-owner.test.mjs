import test from "node:test";
import assert from "node:assert/strict";
import {
 FOUNDER_BOOKING_EMAILS,configuredFounderBookingEmail,
 verifiedFounderBookingOwner,BookingOwnerError
} from "../lib/server/founder-booking-owner.js";
function fakeAuth(accounts){
 return {async getUserByEmail(email){
  const data=accounts[email];
  if(!data)throw Object.assign(Error("not found"),{code:"auth/user-not-found"});
  if(data instanceof Error)throw data;
  return {uid:data.uid,email,emailVerified:data.emailVerified,disabled:data.disabled||false};
 }};
}
test("verified preferred founder owns both availability and saved appointments",async()=>{
 const e=FOUNDER_BOOKING_EMAILS[0];
 const auth=fakeAuth({[e]:{uid:"user123456",emailVerified:true}});
 const result=await verifiedFounderBookingOwner(auth,{FUGTH_CALENDAR_OWNER_EMAIL:e});
 assert.deepEqual(result,{uid:"user123456",email:e,fallback:false});
});
test("absent or unverified founder automatically resolves another approved verified founder",async()=>{
 const backup=FOUNDER_BOOKING_EMAILS[1];
 const auth=fakeAuth({[FOUNDER_BOOKING_EMAILS[0]]:{uid:"baduser123",emailVerified:false},
  [backup]:{uid:"validuser123",emailVerified:true}});
 const result=await verifiedFounderBookingOwner(auth,{});
 assert.equal(result.uid,"validuser123");
 assert.equal(result.fallback,true);
 assert.equal(result.email,backup);
});
test("owner can never be a visitor or unknown configured email",async()=>{
 assert.throws(()=>configuredFounderBookingEmail({FUGTH_BOOKING_OWNER_EMAIL:"random@example.com"}),
  e=>e instanceof BookingOwnerError&&e.code==="booking_owner_not_configured");
 await assert.rejects(verifiedFounderBookingOwner(fakeAuth({})),
  e=>e instanceof BookingOwnerError&&e.code==="booking_owner_not_verified");
});
test("unexpected Firebase errors are not misreported as missing users",async()=>{
 const auth=fakeAuth({[FOUNDER_BOOKING_EMAILS[0]]:
  Object.assign(Error("permission denied"),{code:"auth/insufficient-permission"})});
 await assert.rejects(verifiedFounderBookingOwner(auth),
  e=>e instanceof BookingOwnerError&&e.code==="booking_owner_lookup_failed");
});
