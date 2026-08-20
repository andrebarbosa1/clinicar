import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export const SecurityUtils = {
  sanitize: (val: string) => {
    if (!val || typeof val !== 'string') return val;
    return val
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<[^>]*>?/gm, '')
      .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]*)/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:/gi, '')
      .replace(/[<>\"'`;]/g, '');
  },

  sanitizeLettersOnly: (val: string) => {
    if (!val || typeof val !== 'string') return val;
    return val.replace(/[^a-zA-ZáéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]/g, '');
  },

  isValidEmail: (email: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  },

  sanitizeEmail: (val: string) => {
    if (!val || typeof val !== 'string') return val;
    return val.toLowerCase().replace(/[^a-zA-Z0-9@._%+-]/g, '').trim().slice(0, 100);
  },

  maskCPF: (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
  },

  maskPhone: (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  },

  limit: (val: string, max: number) => {
    if (!val) return val;
    return val.slice(0, max);
  },

  hasDangerousScript: (val: string) => {
    if (!val || typeof val !== 'string') return false;
    const dangerousPatterns = [
      /<script/i,
      /on\w+\s*=/i,
      /javascript:/i,
      /eval\(/i,
      /document\./i,
      /window\./i
    ];
    return dangerousPatterns.some(pattern => pattern.test(val));
  },

  BRUTE_FORCE_KEY: 'odonto_brute_lock',
  MAX_ATTEMPTS: 5,

  getLockoutDelay: (attempts: number) => {
    if (attempts < SecurityUtils.MAX_ATTEMPTS) return 0;
    if (attempts === 5) return 60 * 1000;       // 1 minute lockout
    if (attempts === 6) return 300 * 1000;      // 5 minutes lockout
    if (attempts === 7) return 900 * 1000;      // 15 minutes lockout
    return 3600 * 1000;                         // 1 hour lockout for 8+ failures
  },

  getDeviceId: () => {
    try {
      let dId = localStorage.getItem('odonto_device_id') || sessionStorage.getItem('odonto_device_id');
      if (!dId) {
        dId = 'dev_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('odonto_device_id', dId);
        sessionStorage.setItem('odonto_device_id', dId);
      }
      return dId;
    } catch {
      return 'dev_fallback';
    }
  },

  getLockoutStatus: () => {
    try {
      const win = window as any;
      win.__bruteMemoryAttempts = win.__bruteMemoryAttempts || 0;
      
      const lock = localStorage.getItem(SecurityUtils.BRUTE_FORCE_KEY) || sessionStorage.getItem(SecurityUtils.BRUTE_FORCE_KEY);
      let attempts = win.__bruteMemoryAttempts;
      let timestamp = Date.now();
      
      if (lock) {
        try {
          const parsed = JSON.parse(lock);
          if (parsed.attempts > attempts) {
            attempts = parsed.attempts;
            timestamp = parsed.timestamp;
          }
        } catch {}
      }
      
      if (attempts === 0) return { isLocked: false, remaining: 0 };

      const now = Date.now();
      const elapsed = now - timestamp;
      const lockoutTime = SecurityUtils.getLockoutDelay(attempts);

      if (elapsed < 0) {
        return { isLocked: true, remaining: 3600 };
      }

      if (attempts >= SecurityUtils.MAX_ATTEMPTS && elapsed < lockoutTime) {
        return { isLocked: true, remaining: Math.ceil((lockoutTime - elapsed) / 1000) };
      }

      if (elapsed >= lockoutTime) {
        localStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
        sessionStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
        win.__bruteMemoryAttempts = 0;
        return { isLocked: false, remaining: 0 };
      }

      return { isLocked: false, remaining: 0, attempts };
    } catch {
      return { isLocked: false, remaining: 0 };
    }
  },

  recordAttempt: (success: boolean) => {
    try {
      const win = window as any;
      const status = SecurityUtils.getLockoutStatus();
      if (success) {
        localStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
        sessionStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
        win.__bruteMemoryAttempts = 0;
      } else {
        const attempts = (status.attempts || 0) + 1;
        win.__bruteMemoryAttempts = attempts;
        const payload = JSON.stringify({
          timestamp: Date.now(),
          attempts
        });
        localStorage.setItem(SecurityUtils.BRUTE_FORCE_KEY, payload);
        sessionStorage.setItem(SecurityUtils.BRUTE_FORCE_KEY, payload);
      }
    } catch (e) {
      console.error(e);
    }
  },

  resetBruteForce: (identifier?: string) => {
    try {
      const win = window as any;
      localStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
      sessionStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
      win.__bruteMemoryAttempts = 0;
      if (identifier) {
        localStorage.removeItem(`_brute_${identifier}`);
      }
    } catch (e) {
      console.error(e);
    }
  },

  checkFirestoreLockout: async (username: string): Promise<{ isLocked: boolean; remaining: number }> => {
    if (!username || !db) return { isLocked: false, remaining: 0 };
    const cleanUsername = username.trim().toLowerCase();
    
    try {
      const docRef = doc(db, 'login_attempts', cleanUsername);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lockoutUntil = data?.lockoutUntil || 0;
        const attempts = data?.attempts || 0;
        const now = Date.now();
        
        if (attempts >= SecurityUtils.MAX_ATTEMPTS && lockoutUntil > now) {
          return { isLocked: true, remaining: Math.ceil((lockoutUntil - now) / 1000) };
        }
      }
    } catch (e) {
      console.error("[Prevention] Database security state check was bypassed or unavailable:", e);
    }
    return { isLocked: false, remaining: 0 };
  },

  recordAttemptFirestore: async (username: string, success: boolean): Promise<void> => {
    if (!username || !db) return;
    const cleanUsername = username.trim().toLowerCase();
    
    try {
      const docRef = doc(db, 'login_attempts', cleanUsername);
      if (success) {
        await deleteDoc(docRef);
      } else {
        const docSnap = await getDoc(docRef);
        let attempts = 1;
        if (docSnap.exists()) {
          attempts = (docSnap.data()?.attempts || 0) + 1;
        }
        
        const lockoutDelay = SecurityUtils.getLockoutDelay(attempts);
        const lockoutUntil = attempts >= SecurityUtils.MAX_ATTEMPTS ? Date.now() + lockoutDelay : 0;
        
        await setDoc(docRef, {
          username: cleanUsername,
          attempts,
          lastAttempt: Date.now(),
          lockoutUntil
        });
      }
    } catch (e) {
      console.error("[Prevention] Error logging security tracker:", e);
    }
  },

  checkDeviceLockout: async (): Promise<{ isLocked: boolean; remaining: number }> => {
    if (!db) return { isLocked: false, remaining: 0 };
    const dId = SecurityUtils.getDeviceId();
    try {
      const docRef = doc(db, 'device_attempts', dId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lockoutUntil = data?.lockoutUntil || 0;
        const attempts = data?.attempts || 0;
        const now = Date.now();
        
        if (attempts >= SecurityUtils.MAX_ATTEMPTS && lockoutUntil > now) {
          return { isLocked: true, remaining: Math.ceil((lockoutUntil - now) / 1000) };
        }
      }
    } catch (e) {
      console.error("[Device Security] Check failed:", e);
    }
    return { isLocked: false, remaining: 0 };
  },

  recordDeviceAttempt: async (success: boolean): Promise<void> => {
    if (!db) return;
    const dId = SecurityUtils.getDeviceId();
    try {
      const docRef = doc(db, 'device_attempts', dId);
      if (success) {
        await deleteDoc(docRef);
      } else {
        const docSnap = await getDoc(docRef);
        let attempts = 1;
        if (docSnap.exists()) {
          attempts = (docSnap.data()?.attempts || 0) + 1;
        }
        
        const lockoutDelay = SecurityUtils.getLockoutDelay(attempts);
        const lockoutUntil = attempts >= SecurityUtils.MAX_ATTEMPTS ? Date.now() + lockoutDelay : 0;
        
        await setDoc(docRef, {
          deviceId: dId,
          attempts,
          lastAttempt: Date.now(),
          lockoutUntil
        });
      }
    } catch (e) {
      console.error("[Device Security] Record failed:", e);
    }
  }
};
