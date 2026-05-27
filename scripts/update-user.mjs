/**
 * Update a user's email in Firebase Authentication.
 * Usage:
 *   Option A - Service account JSON file:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="writersguild-a93cc-firebase-adminsdk-fbsvc-b5a5373773.json"
 *     node scripts/update-user.mjs <USER_UID> <NEW_EMAIL>
 *
 *   Option B - Individual env vars:
 *     $env:FIREBASE_PROJECT_ID="..."; $env:FIREBASE_CLIENT_EMAIL="..."; $env:FIREBASE_PRIVATE_KEY="..."
 *     node scripts/update-user.mjs <USER_UID> <NEW_EMAIL>
 *
 * Example:
 *   node scripts/update-user.mjs abc123def456 newemail@example.com
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , uid, newEmail] = process.argv;

if (!uid || !newEmail) {
  console.error("Usage: node scripts/update-user.mjs <USER_UID> <NEW_EMAIL>");
  process.exit(1);
}

if (!getApps().length) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath) {
    initializeApp({
      credential: cert(credentialsPath),
    });
  } else {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
}

const auth = getAuth();

async function updateUser() {
  console.log(`Updating user ${uid} with email ${newEmail}...`);
  
  await auth.updateUser(uid, { email: newEmail });
  
  console.log("✅ User email updated successfully!");
  console.log("You can now log in with the new email and your existing password.");
}

updateUser().catch((err) => {
  console.error("❌ Error updating user:", err.message);
  process.exit(1);
});
