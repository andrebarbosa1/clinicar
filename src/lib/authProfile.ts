import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface AuthProfile {
  id: string;
  uid: string;
  name: string;
  email?: string;
  role?: string;
  clinicId?: string;
}

export async function loadAuthProfile(user: User): Promise<AuthProfile | null> {
  const db = getFirestore();
  const snapshot = await getDoc(doc(db, 'users_by_uid', user.uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: user.uid,
    uid: user.uid,
    name: typeof data.name === 'string' ? data.name : (user.displayName || user.email || 'Usuário'),
    email: typeof data.email === 'string' ? data.email : user.email || undefined,
    role: typeof data.role === 'string' ? data.role : undefined,
    clinicId: typeof data.clinicId === 'string' ? data.clinicId : undefined,
  };
}
