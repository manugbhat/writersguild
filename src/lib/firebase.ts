import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const USE_EMULATOR = process.env.NEXT_PUBLIC_EMULATOR === "true";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "fake-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-writersguild",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "localhost",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000:web:000",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators when NEXT_PUBLIC_EMULATOR=true
if (USE_EMULATOR) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9090", { disableWarnings: true });
  } catch { /* already connected */ }
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch { /* already connected */ }
  try {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  } catch { /* already connected */ }
}

export { auth, db, storage };
export default app;
