import test from "node:test";
import assert from "node:assert/strict";
import { allocateFugthAccountNumber,isFugthAccountNumber,ACCOUNT_ID_CAPACITY } from "../lib/server/account-number.js";

class MockFirestore {
  constructor(){this.documents=new Map();}
  doc(path){return {path};}
  async runTransaction(fn){
    const tx={
      get:async ref=>({exists:this.documents.has(ref.path),data:()=>this.documents.get(ref.path)}),
      create:(ref,value)=>{
        if(this.documents.has(ref.path))throw Error("Duplicate reservation");
        this.documents.set(ref.path,{...value});
      },
      set:(ref,value,options)=>this.documents.set(ref.path,{...(options?.merge?this.documents.get(ref.path):{}),...value}),
    };
    return fn(tx);
  }
}
test("FUGTH numbers have exactly 537 plus three digits",()=>{
  assert.equal(isFugthAccountNumber("537005"),true);
  assert.equal(isFugthAccountNumber("537999"),true);
  assert.equal(isFugthAccountNumber("5371000"),false);
  assert.equal(isFugthAccountNumber(537123),false);
  assert.equal(ACCOUNT_ID_CAPACITY,1000);
});
test("allocation creates reservation and remains stable on repeated sign-in",async()=>{
  const db=new MockFirestore();
  const first=await allocateFugthAccountNumber(db,"fugth_customer_123");
  assert.match(first.number,/^537\d{3}$/);
  assert.equal(first.existing,false);
  const second=await allocateFugthAccountNumber(db,"fugth_customer_123");
  assert.equal(second.number,first.number);
  assert.equal(second.existing,true);
  assert.equal(db.documents.get("users/fugth_customer_123").accountNumber,first.number);
  assert.equal(db.documents.get("fugthAccountNumbers/"+first.number).uid,"fugth_customer_123");
});
test("distinct customers never share an assigned 537xxx account number",async()=>{
  const db=new MockFirestore(),numbers=new Set();
  for(let i=0;i<60;i++){
    const uid=`fugth_customer_${String(i).padStart(4,"0")}`;
    const {number}=await allocateFugthAccountNumber(db,uid);
    assert.ok(!numbers.has(number),"collision must be resolved");
    numbers.add(number);
  }
  assert.equal(numbers.size,60);
});
