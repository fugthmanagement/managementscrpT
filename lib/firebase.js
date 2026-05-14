import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy_key_for_build",
  authDomain: "fugthmanagement-89c84.firebaseapp.com",
  projectId: "fugthmanagement-89c84",
  storageBucket: "fugthmanagement-89c84.firebasestorage.app",
  messagingSenderId: "161907073123",
  appId: "1:161907073123:web:c48a03483719c8cdc29856"
};

let app;
let auth;

if (typeof window !== "undefined") {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
}

export { app, auth };