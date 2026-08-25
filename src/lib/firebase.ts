import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let db: any = null;
let auth: any = null;

export const isFirebaseConfigured = !!(firebaseConfig && (firebaseConfig as any).apiKey);

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    if (dbId) {
      try {
        db = initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
        }, dbId);
      } catch {
        db = getFirestore(app, dbId);
      }
    } else {
      try {
        db = initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
        });
      } catch {
        db = getFirestore(app);
      }
    }
    auth = getAuth(app);

    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn("Auth persistence warning:", err);
    });
  } catch (err) {
    console.error("Error setting up Firebase app:", err);
    try {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      const dbId = (firebaseConfig as any).firestoreDatabaseId;
      db = dbId ? getFirestore(app, dbId) : getFirestore(app);
      auth = getAuth(app);
    } catch (e2) {
      console.error("Fallback setup error:", e2);
    }
  }
} else {
  console.warn("WARNING: Firebase API key is missing. Running in fallback offline/simulated mode.");
}

export { app, db, auth };

