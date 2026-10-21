import test from "node:test";
import assert from "node:assert/strict";
import {
 FOUNDER_TIMEZONE,MIN_NOTICE_MINUTES,SLOT_MINUTES,
 easternParts,easternToUtc,easternUtcCandidates,
 founderDaySlots,founderSlotDetails,founderNoSlotsReason
} from "../lib/server/founder-calendar.js";

const now=Date.parse("2026-10-21T20:20:00.000Z");
test("Founder calendar works 24/7, no weekday or business-hour restrictions",()=>{
 assert.equal(FOUNDER_TIMEZONE,"America/New_York");
 assert.equal(SLOT_MINUTES,30);
 assert.equal(MIN_NOTICE_MINUTES,30);
 for(const day of ["2026-10-22","2026-10-23","2026-10-24","2026-10-25"]){
  const slots=founderDaySlots(day,now);
  assert.equal(slots.length,48,day+" (including Saturday and Sunday)");
  assert.equal(slots[0].hour,0,day);
  assert.equal(slots[0].minute,0,day);
  assert.equal(slots.at(-1).hour,23,day);
  assert.equal(slots.at(-1).minute,30,day);
  assert.equal(new Set(slots.map(s=>s.id)).size,48);
  assert.ok(slots.every(s=>Date.parse(s.endTime)-Date.parse(s.startTime)===30*60000));
  assert.ok(slots.every(s=>s.label));
 }
});
test("Booking exactly 30 minutes ahead is accepted, one minute sooner is not",()=>{
 const clock=Date.parse("2026-10-21T18:00:00.000Z"); // Wednesday 2:00 PM ET
 assert.equal(founderSlotDetails("2026-10-21T18:30:00.000Z",{now:clock})?.id,"20261021_1430");
 assert.equal(founderSlotDetails("2026-10-21T18:00:00.000Z",{now:clock}),null);
 const later=clock+60000; // 2:01 PM
 assert.equal(founderSlotDetails("2026-10-21T18:30:00.000Z",{now:later}),null);
 assert.equal(founderSlotDetails("2026-10-21T19:00:00.000Z",{now:later})?.id,"20261021_1500");
});
test("Overnight slots near midnight, Sunday evenings and Monday early morning are legitimate",()=>{
 assert.equal(founderSlotDetails("2026-10-24T04:00:00.000Z",{now})?.hour,0); // Saturday midnight
 assert.equal(founderSlotDetails("2026-10-26T03:30:00.000Z",{now})?.hour,23); // Sunday 11:30 PM ET
 assert.equal(founderSlotDetails("2026-10-26T04:00:00.000Z",{now})?.hour,0); // Monday midnight ET
});
test("Timezone conversion remains correct across winter and summer",()=>{
 assert.equal(easternToUtc("2027-01-11",10,0).toISOString(),"2027-01-11T15:00:00.000Z");
 assert.equal(easternToUtc("2027-07-12",10,0).toISOString(),"2027-07-12T14:00:00.000Z");
 assert.equal(easternParts(easternToUtc("2027-07-12",10,0)).hour,10);
});
test("Spring-forward Sunday has 46 distinct valid slots and no nonexistent 2AM",()=>{
 const day="2027-03-14",previous=Date.parse("2027-03-12T10:00:00Z");
 const slots=founderDaySlots(day,previous);
 assert.equal(slots.length,46);
 assert.equal(new Set(slots.map(s=>s.id)).size,46);
 assert.ok(slots.every(s=>s.hour!==2));
 assert.equal(easternUtcCandidates(day,2,0).length,0);
});
test("Fall-back Sunday has 50 distinct slots, including two different 1AM periods",()=>{
 const day="2026-11-01";
 const slots=founderDaySlots(day,now);
 assert.equal(slots.length,50);
 assert.equal(new Set(slots.map(s=>s.id)).size,50);
 assert.equal(slots.filter(s=>s.hour===1).length,4);
 assert.ok(slots.some(s=>s.id==="20261101_0100"));
 assert.ok(slots.some(s=>s.id==="20261101_0100b"));
 assert.notEqual(
  slots.find(s=>s.id==="20261101_0100").startTime,
  slots.find(s=>s.id==="20261101_0100b").startTime
 );
});
test("Invalid dates, seconds, quarter-hour intervals and over-45-day requests are rejected",()=>{
 assert.deepEqual(founderDaySlots("2026-02-30",now),[]);
 assert.equal(founderSlotDetails("2026-10-22T17:15:00.000Z",{now}),null);
 assert.equal(founderSlotDetails("2026-10-22T17:30:01.000Z",{now}),null);
 assert.equal(founderSlotDetails("2027-02-01T14:30:00.000Z",{now}),null);
});
test("Weekend dates no longer display false weekday-only closure messages",()=>{
 const saturday=founderNoSlotsReason("2026-10-24",now);
 assert.notEqual(saturday.code,"weekend");
 assert.doesNotMatch(saturday.message,/weekday|monday|friday/i);
 assert.equal(founderNoSlotsReason("2026-10-20",now).code,"past");
});
