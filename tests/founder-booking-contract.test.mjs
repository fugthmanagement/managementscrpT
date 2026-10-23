import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const api=read("app/api/public/founder-booking/route.js");
const ui=read("app/book/page.jsx");
const privateApi=read("app/api/dev/founder-bookings/route.js");
test("Public booking GET verifies the same founder account used by POST",()=>{
 const occurrences=api.match(/verifiedFounderBookingOwner\(firebaseAdmin\(\)\.auth\(\),process\.env\)|verifiedFounderBookingOwner\(admin\.auth\(\),process\.env\)/g)||[];
 assert.equal(occurrences.length,2);
 assert.match(api,/bookable:true/);
 assert.match(api,/bookable:false/);
 assert.match(privateApi,/verifiedFounderBookingOwner\(firebaseAdmin\(\)\.auth\(\),process\.env\)/);
});
test("Only an actual Firestore reservation transaction confirms a guest slot",()=>{
 assert.match(api,/tx\.create\(slotRef,/);
 assert.match(api,/tx\.create\(booking,info\)/);
 assert.match(api,/tx\.set\(db\.doc\("users\/"\+uid\+"\/appointments\/guest_"\+bookingId\)/);
 assert.match(api,/booked:true,status:"confirmed",bookingId/);
 assert.match(api,/if\(body\?\.companyWebsite\)return json\(\{booked:false,received:true/);
 assert.match(ui,/result\.booked!==true/);
 assert.match(ui,/result\.status!=="confirmed"/);
 assert.match(ui,/result\.bookingId/);
});
test("After booking, guests have a downloadable invite; emails are not misrepresented",()=>{
 assert.match(ui,/Add to Google Calendar/);
 assert.match(ui,/Download calendar invitation/);
 assert.match(ui,/not sent automatically/);
});
