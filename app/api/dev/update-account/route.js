import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// Replaced by the founder-only /api/dev/accounts grant system. Subscription
// privileges can be set only by validated paid events, never a free-form
// developer API accepting planTier or stripeCustomerId.
export async function POST(){
 return NextResponse.json({
  error:"The legacy account editor has been retired. Open FUGTH Administration → Accounts to manage a customer."
 },{status:410,headers:{"Cache-Control":"no-store"}});
}
