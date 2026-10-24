/**
 * Individual, user-initiated SMS compose links for the founder's own phone.
 * A compose link never sends SMS or verifies delivery.
 * iOS uses a de-facto '&body=' form: not officially guaranteed by Apple.
 * Always offer a separate Copy message button as a fallback.
 */
export function normalizeUsSmsNumber(value){
 const raw=String(value??"").replace(/\D/g,"");
 const digits=raw.length===11&&raw.startsWith("1")?raw.slice(1):raw;
 return digits.length===10?"+1"+digits:"";
}
export const isAppleMobile=ua=>/\b(iPhone|iPad|iPod)\b/i.test(String(ua||""));
export const isMobileDevice=ua=>isAppleMobile(ua)||/\bAndroid\b/i.test(String(ua||""));
export function smsComposeHref(phone,message="",userAgent=""){
 const number=normalizeUsSmsNumber(phone);
 if(!number)return "";
 const body=String(message??"").trim().slice(0,1300);
 if(!body)return "sms:"+number;
 return "sms:"+number+(isAppleMobile(userAgent)?"&body=":"?body=")+encodeURIComponent(body);
}
export function smsRecipientHref(phone){const number=normalizeUsSmsNumber(phone);return number?"sms:"+number:""}
export function hasMessagingPermission(prospect){
 return Boolean(prospect?.phoneMarketingOptIn===true&&
  String(prospect?.consentSource||"").trim().length>=5&&
  !prospect?.doNotCall&&!prospect?.smsOptOut&&!prospect?.unsubscribed&&prospect?.status!=="do_not_call");
}
