/**
 * Retrospective contact logging and permission to prepare a NEW marketing SMS
 * are intentionally distinct decisions. Contact history is not a consent grant.
 */
export function canRecordPastText(prospect,phone){
 const number=String(phone||prospect?.phone||"").replace(/\D/g,"");
 return Boolean(/^[A-Za-z0-9_-]{8,128}$/.test(String(prospect?.id||""))&&
  number.length>=7&&number.length<=15);
}
export function canPrepareNewMarketingText(prospect,{phoneValid=false,text="",previewValid=true,
 needsPreview=false}={}){
 const optedIn=prospect?.phoneMarketingOptIn===true&&String(prospect?.consentSource||"").trim().length>=5;
 const suppressed=prospect?.doNotCall===true||prospect?.smsOptOut===true||
  prospect?.unsubscribed===true||prospect?.status==="do_not_call";
 return Boolean(canRecordPastText(prospect,prospect?.phone)&&!suppressed&&optedIn&&
  phoneValid&&String(text||"").trim().length>=10&&(!needsPreview||previewValid));
}
