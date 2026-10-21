import test from "node:test";
import assert from "node:assert/strict";
import {easternParts,easternToUtc,founderDaySlots,founderSlotDetails} from "../lib/server/founder-calendar.js";
test("FireStore founder slot uses New York's winter/summer UTC offsets",()=>{
 const jan=easternToUtc("2027-01-11",10,0);
 const jul=easternToUtc("2027-07-12",10,0);
 assert.equal(jan.toISOString(),"2027-01-11T15:00:00.000Z");
 assert.equal(jul.toISOString(),"2027-07-12T14:00:00.000Z");
 assert.equal(easternParts(jan).hour,10);
 assert.equal(easternParts(jul).hour,10);
});
test("weekday slots have 16 non-overlapping 30-minute IDs",()=>{
 const now=Date.parse("2027-01-08T10:00:00.000Z");
 const slots=founderDaySlots("2027-01-11",now);
 assert.equal(slots.length,16);
 assert.equal(slots[0].id,"20270111_0900");
 assert.equal(slots[15].id,"20270111_1630");
 assert.equal(new Set(slots.map(s=>s.id)).size,slots.length);
 assert.ok(slots.every(s=>Date.parse(s.endTime)-Date.parse(s.startTime)===30*60000));
});
test("weekends, out-of-hours, past and misaligned slots are rejected",()=>{
 const now=Date.parse("2027-01-08T10:00:00.000Z");
 assert.equal(founderDaySlots("2027-01-09",now).length,0);
 assert.equal(founderDaySlots("2027-01-10",now).length,0);
 assert.equal(founderSlotDetails("2027-01-11T15:15:00.000Z",{now}),null);
 assert.equal(founderSlotDetails("2027-01-11T23:00:00.000Z",{now}),null);
 assert.equal(founderSlotDetails("2027-01-08T14:00:00.000Z",{now}),null);
 assert.equal(founderSlotDetails("2027-03-11T14:00:00.000Z",{now}),null);
});
test("spring daylight-saving switch preserves local 9AM and no malformed dates",()=>{
 const day="2027-03-15",now=Date.parse("2027-03-12T08:00:00.000Z");
 const slots=founderDaySlots(day,now);
 assert.equal(slots.length,16);
 assert.equal(slots[0].startTime,"2027-03-15T13:00:00.000Z");
 assert.equal(founderDaySlots("2027-02-30",now).length,0);
});
