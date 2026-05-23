/**
 * Seed invite codes into Firestore.
 * Usage:
 *   1. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in your shell env
 *      (or use a service account JSON file path via GOOGLE_APPLICATION_CREDENTIALS)
 *   2. npm install firebase-admin  (one-time)
 *   3. node scripts/seed-invites.mjs
 *
 * Each code doc ID becomes the invite code users type at sign-up.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

function generateSecureCode(length = 20) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

const INVITE_CODES = Array.from({ length: 10 }, () => generateSecureCode(20));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

async function seed() {
  console.log(`Seeding ${INVITE_CODES.length} invite codes...`);
  const batch = db.batch();

  for (const code of INVITE_CODES) {
    const ref = db.collection("inviteCodes").doc(code);
    batch.set(ref, {
      code,
      used: false,
      createdAt: Timestamp.now(),
    });
  }

  await batch.commit();
  console.log("✅ Done! Invite codes created:");
  INVITE_CODES.forEach((c) => console.log(" •", c));
}

seed().catch((err) => {
  console.error("Error seeding:", err);
  process.exit(1);
});
