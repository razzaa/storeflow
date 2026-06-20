import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, set, get, update } from 'firebase/database';
import * as ImageManipulator from 'expo-image-manipulator';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { auth, storage, rtdb } from './config';

// ─── Session management (1-week expiry) ──────────────────────────────────────

const SESSION_KEY = 'session_login_at';

// ─── Pending photo upload (local-first) ──────────────────────────────────────

const photoStorage = createAsyncStorage('storeflow-photo');
const PENDING_PHOTO_KEY = 'pending_photo_uri';

export async function savePendingPhoto(localUri: string): Promise<void> {
  try { await photoStorage.setItem(PENDING_PHOTO_KEY, localUri); } catch {}
}

export async function clearPendingPhoto(): Promise<void> {
  try { await photoStorage.removeItem(PENDING_PHOTO_KEY); } catch {}
}

export async function getPendingPhoto(): Promise<string | null> {
  try { return await photoStorage.getItem(PENDING_PHOTO_KEY); } catch { return null; }
}

/** Called on app start — if there's a locally saved photo and the user is
 *  online, silently upload it and clear the pending queue. */
export async function flushPendingPhoto(): Promise<void> {
  if (!auth.currentUser) return;
  const pending = await getPendingPhoto();
  if (!pending) return;
  try {
    await uploadProfilePhoto(pending);
    await clearPendingPhoto();
  } catch {
    // Still offline or storage not ready — leave it pending
  }
}
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const sessionStorage = createAsyncStorage('storeflow-session');

async function saveLoginTimestamp(): Promise<void> {
  try {
    await sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {}
}

export async function clearLoginTimestamp(): Promise<void> {
  try {
    await sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export async function isSessionExpired(): Promise<boolean> {
  try {
    const ts = await sessionStorage.getItem(SESSION_KEY);
    if (!ts) return false; // no timestamp = skip_auth or first install, don't force logout
    return Date.now() - parseInt(ts, 10) > SESSION_DURATION_MS;
  } catch {
    return false;
  }
}

export async function getSessionAge(): Promise<number | null> {
  try {
    const ts = await sessionStorage.getItem(SESSION_KEY);
    if (!ts) return null;
    return Math.floor((Date.now() - parseInt(ts, 10)) / 1000 / 60 / 60 / 24); // days
  } catch {
    return null;
  }
}

// ─── Auth functions ───────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await saveLoginTimestamp();
  return cred.user;
}

export async function signupWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await saveLoginTimestamp();
  // RTDB profile write is best-effort — don't let it block or fail signup
  try {
    await set(dbRef(rtdb, `users/${cred.user.uid}/profile`), {
      uid: cred.user.uid,
      email,
      displayName,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('Could not write user profile to RTDB:', e);
  }
  return cred.user;
}

export async function logout(): Promise<void> {
  await clearLoginTimestamp();
  await signOut(auth);
}

export async function updateDisplayName(displayName: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not logged in');
  await updateProfile(auth.currentUser, { displayName });
  try {
    await update(dbRef(rtdb, `users/${auth.currentUser.uid}/profile`), { displayName });
  } catch {}
}

export async function uploadProfilePhoto(localUri: string): Promise<string> {
  if (!auth.currentUser) throw new Error('Not logged in');

  // Always save locally first so we never lose the photo
  await savePendingPhoto(localUri);

  // Compress: resize to 400×400 max, JPEG at 75% quality
  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Show local photo immediately by setting the local URI as photoURL in Auth
  await updateProfile(auth.currentUser, { photoURL: compressed.uri });

  const resp = await fetch(compressed.uri);
  const blob = await resp.blob();

  let url: string;
  try {
    const sRef = storageRef(storage, `users/${auth.currentUser.uid}/profile.jpg`);
    await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
    url = await getDownloadURL(sRef);
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'storage/unknown' || code === 'storage/unauthorized') {
      // Return local URI so avatar updates immediately; upload retried on next launch
      return compressed.uri;
    }
    // Network error — keep pending, return local URI
    if (code === 'storage/retry-limit-exceeded' || !code) {
      return compressed.uri;
    }
    throw e;
  }

  // Upload succeeded — replace with remote URL and clear pending
  await updateProfile(auth.currentUser, { photoURL: url });
  await clearPendingPhoto();
  try {
    await update(dbRef(rtdb, `users/${auth.currentUser.uid}/profile`), { photoURL: url });
  } catch {}
  return url;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not logged in');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string) {
  try {
    const snap = await get(dbRef(rtdb, `users/${uid}/profile`));
    return snap.exists() ? snap.val() : null;
  } catch {
    return null;
  }
}
