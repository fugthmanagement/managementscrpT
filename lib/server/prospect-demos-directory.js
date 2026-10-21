/**
 * Private FUGTH saved-demo directory. Every returned record is scoped to the
 * authenticated founder; never return an unfiltered Firestore scan to clients.
 */
const toCode = (error) => String(error?.code ?? error?.status ?? "").toLowerCase();
const toMessage = (error) => String(error?.details || error?.message || "").toLowerCase();
const isIndexError = (error) => {
  const code = toCode(error), message = toMessage(error);
  return code === "9" || code.includes("failed-precondition") ||
    message.includes("requires an index") || message.includes("index is not defined");
};
const cleanSort = (value) => {
  if (typeof value === "string") return value;
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value && typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  return "";
};
const sortDemos = demos => demos.sort((a,b) =>
  cleanSort(b.createdAt).localeCompare(cleanSort(a.createdAt))).slice(0,100);

export function firestoreDemoFailure(error) {
  const code = toCode(error), details = toMessage(error);
  // Codes originate only from the FUGTH server-side credential preflight.
  // Never expose the provider's raw exception or any secret in the response.
  const credentialCodes=new Set([
   "firebase_private_key_invalid","firebase_private_key_format",
   "firebase_private_key_missing","firebase_private_key_encrypted","firebase_private_key_type",
   "firebase_credentials_missing","firebase_credentials_incomplete",
   "firebase_service_account_email_invalid","firebase_service_account_json_invalid",
   "firebase_project_mismatch"
  ]);
  if(credentialCodes.has(code))return {
   code,error:String(error.message||"Firebase Admin credentials are invalid.").slice(0,240),
   hint:code==="firebase_project_mismatch"?
    "The Firebase service account does not belong to the site's project. Run Firebase preview connection test and compare the nonsecret project IDs.":
    "Run Firebase preview connection test for the exact credential status. If the key is invalid, replace FIREBASE_PRIVATE_KEY in Vercel Production with the complete private_key from its matching Firebase service-account JSON and redeploy. Do not paste the key in chat."
  };
  if (code === "7" || code.includes("permission-denied") ||
      details.includes("permission denied") || details.includes("insufficient permission")) {
    return {
      code:"firestore_permission_denied",
      error:"Saved previews could not be read because the server's Firebase service account lacks Firestore access.",
      hint:"Check that FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY on Vercel belong to the same Firebase project as NEXT_PUBLIC_FIREBASE_PROJECT_ID, and grant the service account appropriate Cloud Firestore access."
    };
  }
  if (code === "5" || code.includes("not-found") || details.includes("database (default) does not exist")) {
    return {
      code:"firestore_database_not_found",
      error:"The Firestore database used by this Vercel server could not be found.",
      hint:"Check that Firestore (default database) exists in the Firebase project configured for this site's backend."
    };
  }
  if (isIndexError(error)) {
    return {
      code:"firestore_index_needed",
      error:"Firestore rejected the saved-preview index query.",
      hint:"Re-enable the founderId single-field index for prospectDemos. FUGTH will try a private, bounded owner-filtered fallback while that index is unavailable."
    };
  }
  if (code === "14" || code.includes("unavailable") || details.includes("deadline") || details.includes("timeout")) {
    return {
      code:"firestore_temporarily_unavailable",
      error:"The Firestore service could not be reached. Your previews have not been confirmed missing.",
      hint:"Try Refresh again shortly. If this continues, check the Firestore project connection and Vercel runtime logs."
    };
  }
  return {
    code:"firestore_demo_read_failed",
    error:"Could not read saved previews from Firestore.",
    hint:"The preview list failed to load. Check Vercel function logs for FUGTH_DEMOS_LIST and the Firebase Admin connection. Do not assume the list is empty."
  };
}

export async function listFounderDemos(db, founderUid) {
  try {
    const snap=await db.collection("prospectDemos").where("founderId","==",founderUid).limit(100).get();
    const demos=snap.docs.filter(d=>d.data()?.founderId===founderUid)
      .map(d=>({id:d.id,...d.data()}));
    return {demos:sortDemos(demos),partial:snap.size===100,source:"founder_index"};
  } catch (error) {
    if (!isIndexError(error)) throw error;
    // This bounded index-free recovery path is intentionally server-side,
    // scans at most 1000 documents, filters OWNER before any response is built.
    // It must not silently present a partial list as complete.
    const found=[],pageSize=250,maxPages=4;
    let cursor=null,truncated=false;
    for(let page=0;page<maxPages;page++){
      let query=db.collection("prospectDemos").orderBy("__name__").limit(pageSize);
      if(cursor)query=query.startAfter(cursor);
      const snap=await query.get();
      for(const doc of snap.docs) {
        const data=doc.data();
        if(data?.founderId===founderUid)found.push({id:doc.id,...data});
      }
      if(snap.docs.length<pageSize){truncated=false;break;}
      cursor=snap.docs[snap.docs.length-1];
      truncated=page===maxPages-1;
    }
    return {demos:sortDemos(found),partial:truncated||found.length>100,
      source:"bounded_owner_scan",
      warning:truncated
        ?"Firestore owner index is unavailable. Only the first 1000 database previews were scanned; results may be incomplete."
        :"Firestore owner index is unavailable. Showing a private owner-filtered recovery list."};
  }
}
