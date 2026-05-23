/**
 * Seed local Firebase emulator with test data
 * Run: node scripts/seed-local.mjs
 * Requires: emulators running (firebase emulators:start)
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "fake-api-key",
  projectId: "writersguild-local",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const INVITE_CODES = [
  "GUILD-0001",
  "GUILD-0002",
  "GUILD-0003",
  "GUILD-0004",
  "GUILD-0005",
];

async function seed() {
  console.log("🌱 Seeding local emulators...\n");

  // Seed invite codes
  for (const code of INVITE_CODES) {
    await setDoc(doc(db, "inviteCodes", code), {
      code,
      used: false,
      createdAt: serverTimestamp(),
    });
    console.log(`✅ Created invite code: ${code}`);
  }

  console.log("\n🎉 Local emulator seeded!");
  console.log("\nTest credentials:");
  console.log("  Invite code: GUILD-0001");
  console.log("\nStart dev server with:");
  console.log("  npm run dev");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err.message);
  console.log("\n💡 Make sure emulators are running:");
  console.log("  firebase emulators:start");
  process.exit(1);
});
