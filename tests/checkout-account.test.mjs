import test from "node:test";
import assert from "node:assert/strict";
import {ensureCheckoutAccount} from "../lib/server/checkout-account.js";
function memoryDb(existing=null){
 let saved=existing,created=0;
 return {db:{
  doc(path){assert.equal(path,"users/aBc123456");return {path};},
  async runTransaction(fn){return fn({
   async get(){return saved?{exists:true,data:()=>({...saved})}:{exists:false};},
   create(ref,value){assert.equal(ref.path,"users/aBc123456");created++;saved={...value};}
  });}},
  read:()=>({saved,created})};
}
test("real authenticated buyer with missing client profile gets a minimal unpaid document",async()=>{
 const store=memoryDb(),profile=await ensureCheckoutAccount(store.db,{uid:"aBc123456",email:"buyer@example.com"});
 assert.equal(profile.accountSetupPending,true);
 assert.equal(profile.email,"buyer@example.com");
 assert.equal(store.read().created,1);
 for(const field of ["planTier","billingActive","role","isAdmin","stripeCustomerId"]){
  assert.equal(Object.hasOwn(profile,field),false);
 }
});
test("existing paid account is preserved without any writes",async()=>{
 const original={email:"buyer@example.com",billingActive:true,planTier:"growth",role:"owner"};
 const store=memoryDb(original);
 assert.deepEqual(await ensureCheckoutAccount(store.db,{uid:"aBc123456",email:"buyer@example.com"}),original);
 assert.equal(store.read().created,0);
});
test("unauthenticated or malformed account cannot be provisioned",async()=>{
 const store=memoryDb();
 for(const u of [null,{uid:"bad/path",email:"a@b.com"},{uid:"aBc123456",email:""}])
  await assert.rejects(ensureCheckoutAccount(store.db,u),/Verified Firebase account/);
 assert.equal(store.read().created,0);
});
