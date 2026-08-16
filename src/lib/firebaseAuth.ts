/**
 * Firebase Authentication helpers.
 *
 * This module is intentionally isolated from the legacy login UI so the
 * authentication migration can be introduced without duplicating Firebase
 * Auth configuration throughout the application.
 */
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let persistenceConfigured: Promise<void> | null = null;

export function configureAuthPersistence(): Promise<void> {
  if (!persistenceConfigured) {
    persistenceConfigured = setPersistence(auth, browserLocalPersistence);
  }
  return persistenceConfigured;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await configureAuthPersistence();
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return credential.user;
}

export function observeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function signOutUser(): Promise<void> {
  return firebaseSignOut(auth);
}
