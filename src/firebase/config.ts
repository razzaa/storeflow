import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCsonan-eGgHGcbTI6YGYzvOWokN7oJGFc',
  authDomain: 'storeflow-236ec.firebaseapp.com',
  projectId: 'storeflow-236ec',
  storageBucket: 'storeflow-236ec.firebasestorage.app',
  messagingSenderId: '645602752117',
  appId: '1:645602752117:android:a6bf2b2485d3701a9f6a3c',
  databaseURL: 'https://storeflow-236ec-default-rtdb.asia-southeast1.firebasedatabase.app',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Resolve persistence before calling initializeAuth (called exactly once).
// async-storage v3 API: createAsyncStorage("namespace")
// Metro requires all require() arguments to be string literals.
let _persistence: any = null;
try {
  // Metro resolves 'firebase/auth' to the RN-specific build when
  // unstable_enablePackageExports=true + 'react-native' is first in conditionNames.
  // That RN build exports getReactNativePersistence (Firebase 12.15.0+).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence } = require('firebase/auth');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createAsyncStorage } = require('@react-native-async-storage/async-storage');
  const rnStorage = createAsyncStorage('firebase-auth');
  if (typeof getReactNativePersistence === 'function') {
    _persistence = getReactNativePersistence(rnStorage);
  }
} catch {}

let auth: ReturnType<typeof getAuth>;
try {
  auth = _persistence
    ? (initializeAuth(app, { persistence: _persistence }) as ReturnType<typeof getAuth>)
    : getAuth(app);
} catch {
  // initializeAuth already called (hot reload) — return existing instance
  auth = getAuth(app);
}

export { auth };
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export default app;
