import 'server-only';
import { readFileSync } from 'node:fs';
import {
  type App,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Storage, getStorage } from 'firebase-admin/storage';

let _app: App | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;
let _storage: Storage | null = null;

function loadServiceAccount() {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    const content = readFileSync(path, 'utf8');
    return JSON.parse(content) as Record<string, string>;
  }
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    return JSON.parse(inline) as Record<string, string>;
  }
  return null;
}

function getOrInitAdminApp(): App {
  if (_app) return _app;

  const existing = getApps()[0];
  if (existing) {
    _app = existing;
    return _app;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  const serviceAccount = loadServiceAccount();

  if (serviceAccount) {
    _app = initializeApp({
      credential: cert(serviceAccount as never),
      projectId: serviceAccount.project_id ?? projectId,
      storageBucket,
    });
  } else {
    // Production / Cloud Run / Functions / App Hosting use ADC.
    _app = initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }

  return _app;
}

export function getAdminApp(): App {
  return getOrInitAdminApp();
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getOrInitAdminApp());
  return _auth;
}

export function getAdminFirestore(): Firestore {
  if (_firestore) return _firestore;
  _firestore = getFirestore(getOrInitAdminApp());
  return _firestore;
}

export function getAdminStorage(): Storage {
  if (_storage) return _storage;
  _storage = getStorage(getOrInitAdminApp());
  return _storage;
}
