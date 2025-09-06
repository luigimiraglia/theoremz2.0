// /lib/firebaseAdmin.ts
// Assicurati che venga usato solo lato server
import "server-only";

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") // Vercel: newline escaped
  .trim();

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin envs. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
  );
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

export const adminAuth = getAuth(app);
const db = getFirestore(app);
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {}
export const adminDb = db;
