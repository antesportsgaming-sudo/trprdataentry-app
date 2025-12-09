import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD-myfLxnW7lIgcrvnUFnxhgtv8nV5CHQc",
  authDomain: "retotalingverification.firebaseapp.com",
  projectId: "retotalingverification",
  storageBucket: "retotalingverification.firebasestorage.app",
  messagingSenderId: "1071488944148",
  appId: "1:1071488944148:web:777119fe1d88593a3a7f01",
  measurementId: "G-4RM7YSDXP8"
};

// Singleton pattern: Check if app already exists to prevent "App already named [DEFAULT] exists" crash
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use standard getFirestore which defaults to WebSockets (much faster than Long Polling)
// The SDK automatically handles fallback if WebSockets are blocked.
const db = getFirestore(app);

const storage = getStorage(app);

export { db, storage };