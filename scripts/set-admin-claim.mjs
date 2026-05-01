/* eslint-disable no-console */
// Usage:
//   node scripts/set-admin-claim.mjs <email> [super_admin|admin]
//
// Prereqs:
//   - .env.local with FIREBASE_SERVICE_ACCOUNT_PATH pointing to a service
//     account JSON OR run on a host with Application Default Credentials.
//
// Effect:
//   - Sets `role` on the user's custom claims.
//   - The user must sign out and back in (or call refreshClaims) to pick up
//     the new role on the client.
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

config({ path: '.env.local' });

const [, , email, roleArg = 'super_admin'] = process.argv;
if (!email) {
  console.error('Usage: node scripts/set-admin-claim.mjs <email> [super_admin|admin]');
  process.exit(1);
}
if (!['admin', 'super_admin'].includes(roleArg)) {
  console.error(`Invalid role "${roleArg}". Use "admin" or "super_admin".`);
  process.exit(1);
}

if (!getApps().length) {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    const sa = JSON.parse(readFileSync(path, 'utf8'));
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const auth = getAuth();

const user = await auth.getUserByEmail(email);
const existing = user.customClaims ?? {};
await auth.setCustomUserClaims(user.uid, { ...existing, role: roleArg });

console.log(`✅ Set role="${roleArg}" for ${email} (uid=${user.uid}).`);
console.log('   The user must sign out and back in for the role to apply.');
process.exit(0);
