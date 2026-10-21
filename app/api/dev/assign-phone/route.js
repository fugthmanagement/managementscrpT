import {NextResponse} from "next/server";
import {authenticatedUser,isFounder,firebaseAdmin} from "../../../../lib/server/auth";
import {demoBusiness} from "../../../../lib/server/voice-preview";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=45;
const reply=(value,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
const key=()=>process.env.VOICE_PRIVATE_KEY||process.env.VAPI_PRIVATE_KEY||"";
const validUid=id=>/^[A-Za-z0-9_-]{8,128}$/.test(String(id||""));
const validId=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(id||""));
async function founder(request){
 const user=await authenticatedUser(request);return user&&isFounder(user)?user:null;
}
async function provider(path,{method="GET",body}={}){
 const result=await fetch("https://api.vapi.ai"+path,{
  method,headers:{Authorization:"Bearer "+key().trim(),"Content-Type":"application/json"},
  ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",signal:AbortSignal.timeout(15000)
 });
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Object.assign(new Error("The FUGTH phone network declined this request."),{
  status:result.status,providerCode:data.error?.code||data.code||"unknown"
 });
 return data;
}
function businessAssistant(profile,uid){
 const context=demoBusiness(profile||{});
 const facts=[
  "Business name: "+context.name,"Industry: "+context.industryName,
  "Services: "+(context.services.join(", ")||"ask the business"),
  "Hours: "+(context.hours||"not set"),"Service area: "+(context.area||"not set"),
  "Description: "+(context.description||"not provided")
 ].join("\n");
 return {
  name:("FUGTH | "+context.name).slice(0,40),
  metadata:{ownerId:uid,fugthBusiness:true},
  firstMessage:"Thank you for calling "+context.name+". This call may be recorded. How can I help you?",
  firstMessageMode:"assistant-speaks-first",maxDurationSeconds:600,
  server:{url:(process.env.NEXT_PUBLIC_APP_URL||"https://www.fugthmanagement.space")+"/api/vapi-webhook"},
  serverMessages:["end-of-call-report"],
  artifactPlan:{recordingEnabled:true,recordingFormat:"mp3",transcriptPlan:{enabled:true}},
  analysisPlan:{
   summaryPrompt:"Summarize what the caller needs, any contact details provided, and the real next step. Don't invent a completed appointment.",
   structuredDataPrompt:"Extract only actual facts from the caller. If name, email or appointment details aren't provided, use an empty string.",
   structuredDataSchema:{type:"object",properties:{
    customerName:{type:"string"},email:{type:"string"},phone:{type:"string"},
    request:{type:"string"},service:{type:"string"},preferredDate:{type:"string"},
    preferredTime:{type:"string"}
   }}
  },
  model:{provider:"openai",model:"gpt-4o",temperature:0.4,messages:[{
   role:"system",content:"You are the inbound FUGTH AI receptionist for this business:\n"+facts+
   "\nAlways ask for the caller's name naturally, confirm unclear names or emails by asking for spelling, collect the requested service and a phone number if not already known. "+
   "If an appointment is requested, record preferred date and time but NEVER claim a confirmed booking without a successful calendar-tool operation. "+
   "Do not invent operating hours, prices, availability, contact details or policies. Be concise, polite and business-specific."
  }]},
  voice:{provider:"11labs",voiceId:"sara"}
 };
}

/**
 * Provision a Vapi-managed inbound-only US number and bind it to a new business assistant.
 * This is an explicit founder-authorized action; Vapi may charge for extra numbers.
 * The durable job record prevents accidental repeat provisioning on timeout/retry.
 */
async function provisionNewLine(body,actor){
 const uid=String(body?.uid||"");
 const areaCode=String(body?.areaCode||"");
 if(!validUid(uid)||!requestArea(areaCode))
  return reply({error:"Select a registered business and a valid three-digit US area code."},400);
 if(body?.billingAcknowledged!==true||body?.confirmation!=="PROVISION")
  return reply({error:"Confirm that this action can provision a billable Vapi number."},400);
 if(!key())return reply({error:"Add VOICE_PRIVATE_KEY or VAPI_PRIVATE_KEY to Vercel before provisioning a number."},503);
 const admin=firebaseAdmin(),db=admin.firestore();
 const customer=db.doc("users/"+uid);
 const jobRef=db.doc("fugthPhoneProvisionJobs/"+uid);
 const startedAt=new Date().toISOString();
 let acquired=false,assistantId="",numberId="",phoneNumber="",stage="preflight";
 try{
  const currentUser=await admin.auth().getUser(uid);
  if(currentUser.disabled)return reply({error:"This FUGTH account is disabled."},409);
  const profile=await db.runTransaction(async tx=>{
   const [p,j]=await Promise.all([tx.get(customer),tx.get(jobRef)]);
   if(!p.exists)throw Object.assign(Error("This business has not completed its FUGTH profile."),{status:404});
   const data=p.data()||{};
   if(data.vapiPhoneNumberId||data.assignedNumberId)
    throw Object.assign(Error("This business already has an assigned FUGTH number. Use the existing assignment instead."),{status:409});
   if(j.exists)throw Object.assign(Error("A number-provisioning request already exists for this business. Review its status and Vapi inventory before attempting another purchase."),{status:409});
   tx.create(jobRef,{uid,areaCode,status:"pending",actorUid:actor.uid,startedAt,stage:"reserved",billingAcknowledged:true});
   return data;
  });
  acquired=true;
  stage="assistant";
  const assistant=await provider("/assistant",{method:"POST",body:businessAssistant(profile,uid)});
  if(!validId(assistant?.id))throw Object.assign(Error("The voice network did not return a usable assistant ID."),{status:502});
  assistantId=assistant.id;
  await jobRef.set({assistantId,stage:"assistant_created",updatedAt:new Date().toISOString()},{merge:true});
  stage="number";
  const name=("FUGTH "+String(profile.businessName||"Receptionist")).slice(0,40);
  const created=await provider("/phone-number",{method:"POST",body:{
   provider:"vapi",name,numberDesiredAreaCode:areaCode,assistantId
  }});
  numberId=String(created?.id||"");phoneNumber=String(created?.number||"");
  // Preserve returned IDs even if the number is pending activation.
  await jobRef.set({numberId:numberId||null,number:phoneNumber||null,stage:"provider_created",updatedAt:new Date().toISOString()},{merge:true});
  if(!validId(numberId)||!/^\+?1?\d{10}$/.test(phoneNumber.replace(/[()\s-]/g,"")))
   throw Object.assign(Error("Vapi returned an incomplete phone number. Review inventory before retrying."),{status:502});
  if(numberId===String(process.env.VAPI_PHONE_NUMBER_ID||process.env.VAPI_PHONE_NUMBER||""))
   throw Object.assign(Error("Vapi returned the reserved shared demo line. Manual review required."),{status:409});
  stage="firestore_assignment";
  const now=new Date().toISOString();
  await db.runTransaction(async tx=>{
   const [p,j,n]=await Promise.all([
    tx.get(customer),tx.get(jobRef),tx.get(db.doc("fugthPhoneAssignments/"+numberId))
   ]);
   if(!p.exists||p.data()?.vapiPhoneNumberId||j.data()?.actorUid!==actor.uid)
    throw Object.assign(Error("The account or provisioning reservation changed during setup."),{status:409});
   if(n.exists)throw Object.assign(Error("The provider number is already reserved in FUGTH."),{status:409});
   tx.create(db.doc("fugthPhoneAssignments/"+numberId),{
    uid,numberId,number:phoneNumber,assistantId,status:created?.status==="active"?"active":"activating",
    provider:"vapi",newProvision:true,actorUid:actor.uid,requestedAt:startedAt,updatedAt:now
   });
   tx.set(customer,{
    vapiNumber:phoneNumber,vapiPhoneNumberId:numberId,assignedNumberId:numberId,
    assignedAssistantId:assistantId,vapiAssistantId:assistantId,
    vapiLinked:true,vapiLinkedAt:now,voiceProvisionedAt:now,
    voiceProvider:"vapi",voiceSetupStatus:created?.status==="active"?"test_call_required":"activation_pending"
   },{merge:true});
   tx.set(jobRef,{uid,numberId,number:phoneNumber,assistantId,status:"assigned",stage:"complete",updatedAt:now},{merge:true});
  });
  return reply({assigned:true,created:true,uid,number:phoneNumber,numberId,assistantId,
   providerStatus:created?.status||"unknown",
   message:"Number provisioned and assigned to this account. Activation and a real test call still need verification.",
   nextSteps:[
    "Wait until the Vapi phone number shows active.",
    "Call the assigned number from another phone to test the business-specific greeting and caller intake.",
    "Confirm the test call and any transcript appear in the correct customer account's Calls tab.",
    "If forwarding an existing business line, set up forwarding at the carrier only after testing the FUGTH number.",
    "Vapi-managed numbers are inbound-only and do not provide SMS sending."
   ]});
 }catch(error){
  console.warn("FUGTH new number provision problem",{stage,code:error?.providerCode||error?.code||error?.status||"unknown"});
  if(acquired){
   try{await jobRef.set({
    status:"needs_review",stage,assistantId:assistantId||null,numberId:numberId||null,number:phoneNumber||null,
    issueCode:String(error?.providerCode||error?.code||"provisioning_failed").slice(0,75),
    updatedAt:new Date().toISOString()
   },{merge:true});}catch{}
  }
  return reply({error:acquired?
    "Provisioning needs review. Do not buy another number yet; inspect the Vapi inventory and this account's phone setup.":
    error?.status===409||error?.status===404?error.message:"Couldn't start provisioning this account.",
    issueCode:acquired?"PROVISION_REVIEW":"PREFLIGHT",
    stage,numberCreated:Boolean(numberId),assistantCreated:Boolean(assistantId)},error?.status===409?409:acquired?503:error?.status||503);
 }
}
const requestArea=value=>/^[2-9]\d{2}$/.test(String(value||""));

export async function GET(request){
 const user=await founder(request);
 if(!user)return reply({error:"Verified FUGTH management access required."},403);
 if(!key())return reply({error:"FUGTH voice management isn't configured."},503);
 try{
  const list=await provider("/phone-number?limit=100");
  const items=Array.isArray(list)?list:Array.isArray(list.results)?list.results:
   Array.isArray(list.items)?list.items:[];
  const db=firebaseAdmin().firestore();
  const valid=items.filter(item=>validId(item.id)).slice(0,100);
  const docs=valid.length?await db.getAll(...valid.map(item=>db.doc("fugthPhoneAssignments/"+item.id))):[];
  const reserved=process.env.VAPI_PHONE_NUMBER_ID||process.env.VAPI_PHONE_NUMBER||"";
  return reply({numbers:valid.map((item,i)=>({
   id:item.id,number:item.number||"",provider:item.provider||"",
   assignedTo:docs[i]?.data()?.uid||null,
   availability:item.id===reserved?"demo_reserved":
    docs[i]?.exists?"allocated":item.assistantId?"in_use":"available"
  })),demoLineReserved:true,automaticPurchases:false});
 }catch(error){
  console.error("FUGTH phone pool read",{code:error?.providerCode||error?.code||"server"});
  return reply({error:"FUGTH couldn't load the available line inventory. Check voice and customer storage connections."},503);
 }
}
export async function POST(request){
 const actor=await founder(request);
 if(!actor)return reply({error:"Verified FUGTH management access required."},403);
 let body;
 try{const raw=await request.text();if(raw.length>900)throw Error();body=JSON.parse(raw);}
 catch{return reply({error:"Invalid number assignment request."},400);}
 if(body?.action==="provision")return provisionNewLine(body,actor);
 const uid=body?.uid,numberId=body?.numberId;
 if(!validUid(uid)||!validId(numberId))return reply({error:"Select a business and an available FUGTH number."},400);
 if(!key())return reply({error:"FUGTH voice management isn't connected."},503);
 if(numberId===(process.env.VAPI_PHONE_NUMBER_ID||process.env.VAPI_PHONE_NUMBER||""))
  return reply({error:"The shared demo line cannot be assigned to a single business."},409);
 let lockSet=false,assistantCreated=null;
 try{
  const firebase=firebaseAdmin(),db=firebase.firestore();
  await firebase.auth().getUser(uid);
  const userRef=db.doc("users/"+uid),snap=await userRef.get();
  if(!snap.exists)return reply({error:"This business hasn't finished setting up its FUGTH account."},404);
  const assignmentRef=db.doc("fugthPhoneAssignments/"+numberId);
  const current=await provider("/phone-number/"+numberId);
  if(!validId(current.id)||!current.number||current.status==="inactive")
   return reply({error:"The selected number isn't active or can't receive calls."},409);
  const old=await assignmentRef.get();
  if(old.exists&&old.data()?.uid!==uid)return reply({error:"This number already belongs to another FUGTH business."},409);
  if(current.assistantId&&!old.exists)return reply({error:"This number already has live routing. Choose an unused line."},409);
  const duplicate=await db.collection("users").where("vapiPhoneNumberId","==",numberId).limit(2).get();
  if(duplicate.docs.some(d=>d.id!==uid))return reply({error:"That line is already assigned to another business."},409);
  await db.runTransaction(async tx=>{
   const existing=await tx.get(assignmentRef);
   if(existing.exists&&existing.data()?.uid!==uid)throw Object.assign(new Error("Number already allocated."),{status:409});
   tx.set(assignmentRef,{uid,numberId,status:"provisioning",actorUid:actor.uid,
    requestedAt:new Date().toISOString()},{merge:true});
  });
  lockSet=true;
  if(old.exists&&old.data()?.status==="active"&&snap.data()?.vapiPhoneNumberId===numberId)
   return reply({assigned:true,number:current.number,uid,alreadyAssigned:true});
  const assistant=await provider("/assistant",{method:"POST",body:businessAssistant(snap.data(),uid)});
  if(!validId(assistant.id))throw Error("FUGTH couldn't confirm the assigned business receptionist.");
  assistantCreated=assistant.id;
  const routed=await provider("/phone-number/"+numberId,{method:"PATCH",body:{assistantId:assistantCreated}});
  if(routed.assistantId!==assistantCreated)throw Error("The FUGTH line didn't confirm receptionist routing.");
  const now=new Date().toISOString();
  await db.runTransaction(async tx=>{
   const [assignment,profile]=await Promise.all([tx.get(assignmentRef),tx.get(userRef)]);
   if(assignment.data()?.uid!==uid||!profile.exists)throw Error("Business assignment changed before activation.");
   tx.set(assignmentRef,{uid,numberId,number:current.number,assistantId:assistantCreated,
    status:"active",updatedAt:now,actorUid:actor.uid},{merge:true});
   tx.set(userRef,{
    vapiNumber:current.number,vapiPhoneNumberId:numberId,assignedNumberId:numberId,
    assignedAssistantId:assistantCreated,vapiAssistantId:assistantCreated,
    vapiLinked:true,vapiLinkedAt:now,voiceProvisionedAt:now
   },{merge:true});
  });
  return reply({assigned:true,uid,number:current.number,numberId,
   message:"Business receptionist assigned. The owner must still configure their phone carrier's forwarding."});
 }catch(error){
  console.error("FUGTH existing number assignment failed",{code:error?.providerCode||error?.code||"server",providerStatus:error?.status||null});
  if(lockSet){
   try{await firebaseAdmin().firestore().doc("fugthPhoneAssignments/"+numberId).set({
     status:"needs_review",errorCode:String(error?.providerCode||error?.code||"activation_failed").slice(0,80),
     assistantId:assistantCreated||null,updatedAt:new Date().toISOString()},{merge:true});}catch{}
  }
  return reply({error:error.status===409?error.message:"The phone number couldn't be activated. Check FUGTH voice access and customer storage before retrying.",
   issueCode:"NUMBER_ASSIGNMENT_REVIEW"},error.status===409?409:503);
 }
}
