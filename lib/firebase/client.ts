import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  type AppCheck,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import { type Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  type FirebaseStorage,
  getStorage,
  connectStorageEmulator,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const useEmulator =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' &&
  typeof window !== 'undefined';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _appCheck: AppCheck | null = null;
let _emulatorWired = false;

function getOrInitApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps()[0] ?? initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseApp(): FirebaseApp {
  return getOrInitApp();
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getOrInitApp());
  if (useEmulator && !_emulatorWired) {
    connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return _auth;
}

export function getFirebaseFirestore(): Firestore {
  if (_firestore) return _firestore;
  const app = getOrInitApp();
  const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
  const useNamedDb = !!dbId && dbId !== '(default)';
  if (typeof window !== 'undefined') {
    _firestore = initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        // QUIC drops cause "QUIC_TOO_MANY_RTOS" mid-listener which leaves
        // the UI stuck on stale state. Auto-detect lets the SDK fall back
        // to long-polling whenever streaming is unstable.
        experimentalAutoDetectLongPolling: true,
      },
      useNamedDb ? dbId : undefined,
    );
  } else {
    _firestore = useNamedDb ? getFirestore(app, dbId!) : getFirestore(app);
  }
  if (useEmulator && !_emulatorWired) {
    connectFirestoreEmulator(_firestore, '127.0.0.1', 8080);
  }
  return _firestore;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getOrInitApp());
  if (useEmulator && !_emulatorWired) {
    connectStorageEmulator(_storage, '127.0.0.1', 9199);
    _emulatorWired = true;
  }
  return _storage;
}

/**
 * Initializes Firebase App Check on the browser. Safe to call multiple times.
 * If the site key is not configured, this is a no-op (dev convenience).
 * Must be called from a Client Component or effect — never on the server.
 */
export function initAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (_appCheck) return _appCheck;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[firebase] App Check site key missing — skipping initialization.',
      );
    }
    return null;
  }

  _appCheck = initializeAppCheck(getOrInitApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return _appCheck;
}
