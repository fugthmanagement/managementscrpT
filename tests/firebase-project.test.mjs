import test from "node:test";
import assert from "node:assert/strict";
import {FUGTH_FIREBASE_PROJECT,resolveFirebaseProjectId,serviceAccountProjectFromEmail} from "../lib/server/firebase-project.js";
test("backend selects the same canonical Firebase project as the existing browser when Vercel omits public project variable",()=>{
 assert.equal(FUGTH_FIREBASE_PROJECT,"fugthmanagement-89c84");
 assert.equal(resolveFirebaseProjectId({}),FUGTH_FIREBASE_PROJECT);
});
test("explicit server Firebase project takes precedence, then public project",()=>{
 assert.equal(resolveFirebaseProjectId({FIREBASE_PROJECT_ID:"server-production",NEXT_PUBLIC_FIREBASE_PROJECT_ID:"public-preview"}),"server-production");
 assert.equal(resolveFirebaseProjectId({NEXT_PUBLIC_FIREBASE_PROJECT_ID:"production-verified"}),"production-verified");
});
test("project ID can be checked without exposing service-account secrets",()=>{
 assert.equal(serviceAccountProjectFromEmail("firebase-adminsdk-abc123@fugthmanagement-89c84.iam.gserviceaccount.com"),FUGTH_FIREBASE_PROJECT);
 assert.equal(serviceAccountProjectFromEmail("owner@example.com"),null);
});
