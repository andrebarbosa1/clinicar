import React from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

type ClinicProfile = {
  id: string;
  firebaseUid: string;
  name?: string;
  email?: string;
  role?: string;
  clinicId?: string;
  [key: string]: unknown;
};

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  profile: ClinicProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(user: FirebaseUser): Promise<ClinicProfile | null> {
  const mappingSnap = await getDoc(doc(db, 'users_by_uid', user.uid));
  if (!mappingSnap.exists()) return null;

  const mapping = mappingSnap.data() as { userDocId?: string; clinicId?: string };
  if (!mapping.userDocId) return null;

  const profileSnap = await getDoc(doc(db, 'users', mapping.userDocId));
  if (!profileSnap.exists()) return null;

  return {
    id: profileSnap.id,
    ...profileSnap.data(),
    firebaseUid: user.uid,
    email: user.email ?? undefined,
    clinicId: (profileSnap.data().clinicId as string | undefined) ?? mapping.clinicId,
  } as ClinicProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [profile, setProfile] = React.useState<ClinicProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setProfile(await loadProfile(user));
      } catch (error) {
        console.error('[AuthProvider] profile load failed:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const logout = React.useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem('odonto_session');
  }, []);

  const value = React.useMemo(
    () => ({ firebaseUser, profile, loading, logout }),
    [firebaseUser, profile, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
