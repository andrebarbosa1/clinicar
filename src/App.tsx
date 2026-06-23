/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Search, 
  Filter,
  Calendar,
  Building,
  Palette,
  Stethoscope,
  Edit,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Activity,
  Home,
  Settings,
  LayoutDashboard,
  ArrowLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Minus,
  LogOut,
  Shield,
  User,
  UserPlus,
  Send,
  Bell,
  X,
  FileText,
  ClipboardList,
  RotateCcw,
  Printer,
  FileCheck,
  HelpCircle,
  Keyboard,
  MessageSquare,
  Cpu,
  Upload,
  Menu,
  Monitor,
  Mail,
  MailOpen,
  ImageIcon,
  CreditCard,
  History,
  Maximize2,
  Edit3,
  MessageCircle,
  Phone,
  AlertCircle,
  Loader2,
  Trash2,
  FileUp,
  Download,
  FolderPlus,
  Folder,
  Image,
  Share2,
  Link,
  Heart,
  XCircle,
  FileSearch,
  LayoutGrid,
  LayoutList,
  Grid,
  ShieldCheck,
  ChevronDown,
  ImagePlus,
  Info,
  Sparkles,
  Package,
  Layers,
  ShoppingCart,
  TrendingDown,
  Smartphone,
  Check,
  RefreshCw,
  Bot
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO, isToday, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, isWithinInterval, differenceInYears, isValid, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DentalRecord } from './types';
import { cn, formatCurrency, formatPercent } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  getFirestore, 
  initializeFirestore,
  getDocFromServer,
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  query, 
  where,
  getDoc,
  getDocs,
  limit,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

import SaaSAssinaturaView from './components/SaaSAssinaturaView';
import SaaSLockedFeatureView from './components/SaaSLockedFeatureView';
import SuperAdminView from './components/SuperAdminView';

const OPENING_HOUR = "08:00";
const CLOSING_HOUR = "17:00";

const getSystemInitialDate = () => {
    let now = new Date();
    // Se passar do horário de fechamento, pula para o dia seguinte
    if (format(now, 'HH:mm') >= CLOSING_HOUR) {
        now = addDays(now, 1);
    }
    
    // Se o dia cair no final de semana, pula para a próxima segunda-feira
    while (getDay(now) === 0 || getDay(now) === 6) {
        now = addDays(now, 1);
    }
    
    return format(now, 'yyyy-MM-dd');
};

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
      <Clock className="w-3.5 h-3.5 text-brand-cyan" />
      <span>{time.toLocaleTimeString('pt-BR', { hour12: false })}</span>
    </div>
  );
};

const findPatientByRobustMatch = (name: string, patientsList: any[]) => {
  if (!name || !patientsList) return null;
  
  const normalize = (str: string) => {
    if (!str) return '';
    return str.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, ' ') // Mantém apenas alfanuméricos como espaços
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim();
  };

  const normalizedTarget = normalize(name);
  
  // 1. Tenta match exato normalizado
  let patient = patientsList.find(p => normalize(p.name) === normalizedTarget);
  
  // 2. Se não encontrar, tenta busca flexível (contém)
  if (!patient) {
    patient = patientsList.find(p => {
      const pNorm = normalize(p.name);
      return pNorm.includes(normalizedTarget) || normalizedTarget.includes(pNorm);
    });
  }

  return patient;
};

const sendWhatsAppDirectly = (phone: string, message: string) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  let finalPhone = cleanPhone;
  
  // Auto-add 55 for Brazil if it looks like a standard local number
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    finalPhone = '55' + cleanPhone;
  }

  if (finalPhone) {
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    const win = window.open(whatsappUrl, '_blank');
    if (!win) {
      alert("O WhatsApp não pôde ser aberto automaticamente. Verifique se o seu navegador bloqueou o pop-up.");
    }
    return true;
  }
  return false;
};

const SecurityUtils = {
  // Enhanced sanitization to block XSS payloads like: /"/><deTAiLs/open/oNtoGGle=alert(/
  sanitize: (val: string) => {
    if (!val || typeof val !== 'string') return val;
    return val
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // Remove script tags completely
      .replace(/<[^>]*>?/gm, '') // Remove any HTML tags
      .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]*)/gi, '') // Remove event handlers (onclick, etc)
      .replace(/javascript\s*:/gi, '') // Remove javascript URI
      .replace(/data\s*:/gi, '') // Remove data URI
      .replace(/[<>\"'`;]/g, ''); // Remove critical XSS characters specifically
  },

  sanitizeLettersOnly: (val: string) => {
    if (!val || typeof val !== 'string') return val;
    // Permite apenas letras (incluindo acentuadas) e espaços
    return val.replace(/[^a-zA-ZáéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]/g, '');
  },

  isValidEmail: (email: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  },

  sanitizeEmail: (val: string) => {
    if (!val || typeof val !== 'string') return val;
    // Only allow characters valid in an email address
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

  // Brute force state management
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

      // Safety check: Clock rewinding defense
      if (elapsed < 0) {
        return { isLocked: true, remaining: 3600 }; // Lock for 1 hour for tampering attempts
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

  // Layer 2: Firestore lock synced per username to secure against distributed brute-force
  checkFirestoreLockout: async (username: string): Promise<{ isLocked: boolean; remaining: number }> => {
    if (!username) return { isLocked: false, remaining: 0 };
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
    if (!username) return;
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

  // Layer 3: Firestore lock synced per browser/device ID to stop multi-username brute force (existent or non-existent usernames)
  checkDeviceLockout: async (): Promise<{ isLocked: boolean; remaining: number }> => {
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

// Safe Firebase Initialization
let app: any = null;
let db: any = null;
let auth: any = null;

const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey);

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);

    // Configure Persistence
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("Auth persistence error:", err);
    });
  } catch (err) {
    console.error("Error setting up Firebase app:", err);
  }
} else {
  console.warn("WARNING: Firebase API key is missing. Running in fallback offline/simulated mode.");
}

export { app, db, auth };

// Connection test as required by integration guidelines
async function testConnection() {
  if (!db) {
    console.warn("Firestore connection test skipped because Firebase is not initialized.");
    return;
  }
  try {
    // Only attempt the connection test if we're in a browser environment
    if (typeof window !== 'undefined') {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("Firestore connection established successfully.");
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('Could not reach Cloud Firestore backend'))) {
      console.error("Firestore connection failure: Please check your Firebase configuration or internet connection.");
    } else {
      console.warn("Firestore connection test completed with status:", error);
    }
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Constants
const PROCEDURES_OPTIONS = [
  { name: 'Avaliação Inicial', price: 150 },
  { name: 'Limpeza (Profilaxia)', price: 200 },
  { name: 'Restauração Resina', price: 250 },
  { name: 'Extração Simples', price: 300 },
  { name: 'Tratamento de Canal', price: 1200 },
  { name: 'Clareamento Dental', price: 800 },
  { name: 'Implante Dentário', price: 3500 },
  { name: 'Aparelho Ortodôntico', price: 2500 }
];

const INITIAL_USERS = [
  { id: '1', name: 'Dra. Ana Silveira', role: 'Admin', modules: 'Todos', username: 'ana.admin', password: '123', email: 'andreb202121@gmail.com' },
  { id: '2', name: 'Dr. Roberto Santos', role: 'Dentista', modules: 'Dashboard, Agenda, Pacientes', username: 'roberto', password: '123', email: 'roberto@clinica.com' },
  { id: '3', name: 'Mariana Lima', role: 'Recepcionista', modules: 'Dashboard, Agenda, Pacientes', username: 'mariana', password: '123', email: 'mariana@clinica.com' },
  { id: 'super-admin-01', name: 'Suporte OdontoDash', role: 'SuperAdmin', modules: 'Todos', username: 'administrador', password: '123', email: 'suporte@odontodash.com.br' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [globalBanner, setGlobalBanner] = useState<any>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Identificador de isolamento para sessões de teste grátis (trial)
  const trialId = currentUser?.isTrial ? currentUser.id : currentUser?.parentTrialId;

  // SaaS tenant plan helper computations
  const currentPlanId = currentUser?.trialPlan || 'Pro';
  const isTrialActive = currentUser?.isTrial === true;
  const isPremiumActive = currentUser?.isPremium === true;

  const getTrialDaysRemaining = () => {
    if (!currentUser?.trialStartedAt) return 14;
    const start = new Date(currentUser.trialStartedAt);
    const bonusDays = Number(currentUser?.trialExtensionDays) || 0;
    const end = new Date(start.getTime() + (14 + bonusDays) * 24 * 60 * 60 * 1000);
    const diff = end.getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  const isModuleLockedBySaaS = (moduleName: string) => {
    return false;
  };

  const [data, setData] = useState<DentalRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [users, setUsers] = useState<any[]>(INITIAL_USERS);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPublicBooking, setIsPublicBooking] = useState(false);
  const [confirmApptId, setConfirmApptId] = useState<string | null>(null);
  const [reschedulePreFill, setReschedulePreFill] = useState<any | null>(null);

  // Anti-abuse tracking: If a trial expires, immediately flag this device/browser locally
  useEffect(() => {
    if (isTrialActive && trialDaysRemaining <= 0 && currentUser?.email) {
      try {
        localStorage.setItem('_sys_clinic_engine_state_', JSON.stringify({
          lastSession: 'trial-expired',
          hasCompletedTrial: true,
          trialEmail: currentUser.email,
          timestamp: new Date().toISOString()
        }));
        
        const d = new Date();
        d.setTime(d.getTime() + (10 * 365 * 24 * 60 * 60 * 1000)); // 10 years
        document.cookie = `_odontodash_trial_block=true; expires=${d.toUTCString()}; path=/; SameSite=Strict`;
      } catch (e) {
        console.error("Erro ao marcar dispositivo pós-respiração de trial:", e);
      }
    }
  }, [isTrialActive, trialDaysRemaining, currentUser?.email]);

  // Handle public booking and confirmation URLs
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('booking') === 'true') {
        setIsPublicBooking(true);
      }
      const apptId = params.get('confirmAppt');
      if (apptId) {
        setConfirmApptId(apptId);
      }
    }
  }, []);
  const [activePage, setActivePage] = useState('Dashboard');
  const [adminTab, setAdminTab] = useState<'users' | 'settings' | 'backup'>('users');
  
  React.useEffect(() => {
    if (currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador')) {
      setActivePage('SuperAdmin');
    }
  }, [currentUser]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePage !== 'Dashboard') {
        setActivePage('Dashboard');
        setSubPage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage]);
  const [subPage, setSubPage] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientDetail, setSelectedPatientDetail] = useState<any | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [filterProcedure, setFilterProcedure] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPayment, setFilterPayment] = useState<string>('Todos');
  const [filterDentista, setFilterDentista] = useState<string>('Todos');
  const [searchPatient, setSearchPatient] = useState('');
  
  // Date Filters
  const [filterDateRange, setFilterDateRange] = useState<'month' | 'last_month' | 'today' | 'custom'>('month');
  const [filterStartDate, setFilterStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingPatientEmail, setEditingPatientEmail] = useState<{patientName: string; appointmentId: string} | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfUse, setShowTermsOfUse] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('odonto_cookie_consent') === 'true';
  });
  const [clinicName, setClinicName] = useState('OdontoDash');
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  const [footerText, setFooterText] = useState('© 2026 Clínica Odontológica | CRO-SP 123456');
  const [providerPhone, setProviderPhone] = useState(() => localStorage.getItem('odonto_cfg_providerPhone') || '+55 (47) 99999-9999');
  const [providerName, setProviderName] = useState(() => localStorage.getItem('odonto_cfg_providerName') || 'MB.SISTEMAS');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isFreeTrialView, setIsFreeTrialView] = useState(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const hasModule = React.useCallback((moduleName: string) => {
    if (!currentUser) return false;
    // Admin always has all access
    if (currentUser.role === 'Admin') return true;
    
    // Safety: Recepcionista cannot access Financeiro or Administração even if misconfigured
    if (currentUser.role === 'Recepcionista' && (moduleName.toLowerCase() === 'financeiro' || moduleName.toLowerCase() === 'administração')) {
      return false;
    }

    // Recepcionista always gets Dashboard, Agenda, and Pacientes by default
    if (currentUser.role === 'Recepcionista' && (moduleName.toLowerCase() === 'dashboard' || moduleName.toLowerCase() === 'agenda' || moduleName.toLowerCase() === 'pacientes')) {
      return true;
    }
    
    // Explicit module check
    const userModules = (currentUser.modules || '').split(',').map((m: string) => m.trim().toLowerCase());
    
    return userModules.includes(moduleName.toLowerCase());
  }, [currentUser]);

  // Global Keyboard Shortcuts Hook
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in common editable input objects to ignore hotkeys
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // Check if Control (Ctrl) or Command (Cmd on Mac) is pressed
      const hasModifier = e.ctrlKey || e.metaKey;
      if (!hasModifier) return;

      const key = e.key.toLowerCase();

      // Avoid blocking native selecting or copy/paste behaviors when typing inside inputs
      if (isInput) {
        // Only allow Ctrl+/ or Ctrl+K to open shortcuts even when in input
        if (key !== 'k' && key !== '/' && key !== ';') {
          return;
        }
      }

      switch (key) {
        case 'h': // Ctrl+H -> Home/Dashboard
          e.preventDefault();
          setActivePage('Dashboard');
          setSubPage(null);
          break;
        case 'a': // Ctrl+A -> Agenda (Calendar)
          e.preventDefault();
          setActivePage('Agenda');
          setSubPage(null);
          break;
        case 'p': // Ctrl+P -> Patients List
          e.preventDefault();
          setActivePage('Pacientes');
          setSubPage(null);
          break;
        case 'n': // Ctrl+N -> New Patient (Cadastrar)
          e.preventDefault();
          setActivePage('Pacientes');
          setSubPage('Cadastrar');
          break;
        case 'b': // Ctrl+B -> New Appointment Booking
          e.preventDefault();
          setActivePage('Agenda');
          setSubPage('NovoAgendamento');
          break;
        case 'm': // Ctrl+M -> Messages & Whatsapp Simulation
          e.preventDefault();
          setActivePage('Mensagens');
          setSubPage(null);
          break;
        case 'f': // Ctrl+F -> Billing / Financials
          if (hasModule('Financeiro')) {
            e.preventDefault();
            setActivePage('Financeiro');
            setSubPage(null);
          }
          break;
        case 'k': // Ctrl+K or Ctrl+/ -> Trigger Keyboard Shortcuts overlay panel
        case '/':
          e.preventDefault();
          setShowKeyboardShortcuts(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasModule]);

  // Real-time system notifications / announcement banners sync
  React.useEffect(() => {
    if (!db) return;
    const unsubNotice = onSnapshot(doc(db, 'system_announcements', 'global_banner'), (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        setGlobalBanner({
          id: d.id || 'global_banner',
          message: d.message || '',
          type: d.type || 'info',
          active: d.active || false,
          createdAt: d.createdAt || ''
        });
        
        // If a new banner is published with a different ID, reset the dismissed status!
        const dismissedId = localStorage.getItem('dismissed_banner_id');
        if (dismissedId !== d.id) {
          setBannerDismissed(false);
        } else {
          setBannerDismissed(true);
        }
      } else {
        setGlobalBanner(null);
      }
    }, (err) => console.warn("Failed subscribing to announcements:", err));

    return () => unsubNotice();
  }, [db]);

  React.useEffect(() => {
    if (!isAuthReady || !db) return;

    console.log("[DataSync] Iniciando monitoramento de dados...", { isAuthenticated, role: currentUser?.role, name: currentUser?.name, trialId });

    // 2.1 Users sync (Always active if authenticated or about to be)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const dbUsers = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
      console.log(`[UsersSync] ${dbUsers.length} usuários em Firestore. Sincronizando...`);
      
      let merged;
      if (trialId) {
        // Se for trial, NÃO mostra os usuários padrão (INITIAL_USERS) nem outros usuários de outros trials
        // Mostra somente si mesmo e quaisquer sub-usuários criados no seu trial
        merged = dbUsers.filter(du => du.id === currentUser?.id || du.parentTrialId === trialId);
        if (currentUser && !merged.find(m => m.id === currentUser.id)) {
          merged.push(currentUser);
        }
      } else {
        // Use INITIAL_USERS as base, override with Firestore data, and add any new ones
        merged = INITIAL_USERS.map(iu => {
          const found = dbUsers.find(du => du.id === iu.id);
          if (found) {
            if (iu.id === '1') {
              console.log(`[UsersSync] Sincronizando Admin (ID:1). Login: ${found.username}, PWD matches default? ${found.password === iu.password}`);
            }
            return { ...iu, ...found };
          }
          return iu;
        });

        dbUsers.forEach(du => {
          if (!merged.find(m => m.id === du.id)) {
            merged.push(du);
          }
        });
      }

      setUsers(merged);

      if (merged.length > 0) {
        const sessionUser = JSON.parse(localStorage.getItem('odonto_session') || '{}');
        const selfId = currentUser?.id || sessionUser?.id;
        if (selfId) {
          const updatedSelf = merged.find(user => user.id === selfId);
          if (updatedSelf) {
            if (
              updatedSelf.modules !== currentUser?.modules || 
              updatedSelf.role !== currentUser?.role || 
              updatedSelf.name !== currentUser?.name ||
              updatedSelf.isTrial !== currentUser?.isTrial ||
              updatedSelf.isPremium !== currentUser?.isPremium ||
              updatedSelf.trialPlan !== currentUser?.trialPlan
            ) {
              console.log("[DataSync] Perfil do usuário atualizado com dados SaaS, sincronizando estado local...");
              setCurrentUser((prev: any) => ({ ...prev, ...updatedSelf }));
              localStorage.setItem('odonto_session', JSON.stringify({ ...(currentUser || sessionUser), ...updatedSelf }));
            }
          }
        }
      }
    }, (error) => {
      if (error.message.includes('Quota exceeded')) setQuotaExceeded(true);
      console.warn("Users sync error:", error);
    });

    let unsubPatients = () => {};
    let unsubRecords = () => {};
    let unsubDocs = () => {};

    // 2.3 Records Query (Needed for Agenda and for checking availability in Public Booking)
    if (isAuthenticated || isPublicBooking) {
      let rQuery;
      if (!isAuthenticated) {
        // Public booking only needs to know occupied slots
        rQuery = collection(db, 'records');
      } else {
        const role = (currentUser?.role || '').toLowerCase();
        if (trialId) {
          // Se for ambiente trial, filtra pelos dados criados pelo mesmo trial
          rQuery = query(collection(db, 'records'), where('trialOwnerId', '==', trialId));
        } else if (role === 'admin' || role === 'recepcionista' || hasModule('Agenda') || hasModule('Financeiro')) {
          rQuery = collection(db, 'records');
        } else if (role === 'dentista') {
          if (currentUser?.name) {
            rQuery = query(collection(db, 'records'), where('dentista', '==', currentUser.name));
          } else {
            console.warn("Skipping records sync for dentista: name is undefined on currentUser");
          }
        }
      }

      if (rQuery) {
        setIsLoadingData(true);
        unsubRecords = onSnapshot(rQuery, (snapshot) => {
          const records = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DentalRecord));
          console.log(`[RecordsSync] ${records.length} registros carregados. (Auth: ${isAuthenticated})`);
          setData(records);
          setIsLoadingData(false);
         }, (err) => {
          console.error("Records sync error:", err);
          setIsLoadingData(false);
        });
      }
    }

    if (isAuthenticated && currentUser && currentUser.name) {
      const role = (currentUser.role || '').toLowerCase();
      
      // 2.2 Patients Query
      let pQuery;
      if (trialId) {
        // Se for ambiente trial, filtra pelos dados criados pelo mesmo trial
        pQuery = query(collection(db, 'patients'), where('trialOwnerId', '==', trialId));
      } else if (role === 'dentista') {
        pQuery = collection(db, 'patients');
      } else if (role === 'admin' || role === 'recepcionista' || hasModule('Pacientes')) {
        pQuery = collection(db, 'patients');
      }

      if (pQuery) {
        unsubPatients = onSnapshot(pQuery, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`[PatientsSync] ${list.length} pacientes carregados para ${currentUser.name}`);
          setPatients(list);
        }, (err) => console.warn("Patients sync error:", err));
      }

      // 2.4 Documents Query
      let dQuery;
      if (trialId) {
        // Se for ambiente trial, filtra pelos dados criados pelo mesmo trial
        dQuery = query(collection(db, 'documents'), where('trialOwnerId', '==', trialId));
      } else if (role === 'admin' || role === 'recepcionista' || hasModule('Agenda')) {
        dQuery = collection(db, 'documents');
      } else if (role === 'dentista') {
        dQuery = query(collection(db, 'documents'), where('dentista', '==', currentUser.name));
      }

      if (dQuery) {
        unsubDocs = onSnapshot(dQuery, (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          console.log(`[DocsSync] ${docs.length} documentos carregados.`);
          setDocuments(docs);
        }, (err) => console.warn("Docs sync error:", err));
      }
    } else if (!isPublicBooking) {
      setIsLoadingData(false);
    }

    return () => {
      unsubUsers();
      unsubPatients();
      unsubRecords();
      unsubDocs();
    };
  }, [isAuthReady, isAuthenticated, isPublicBooking, currentUser?.id, currentUser?.role, currentUser?.name, trialId]);

  React.useEffect(() => {
    const docId = trialId ? `clinic-${trialId}` : 'clinic';
    const unsub = onSnapshot(doc(db, 'settings', docId), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setClinicName(d.clinicName || 'Dental Analytics');
        setClinicLogo(d.clinicLogo || null);
        setFooterText(d.footerText || `© ${new Date().getFullYear()} Clínica Odontológica | CRO-SP 123456`);
        if (d.providerPhone) {
          setProviderPhone(d.providerPhone);
          localStorage.setItem('odonto_cfg_providerPhone', d.providerPhone);
        }
        if (d.providerName) {
          setProviderName(d.providerName);
          localStorage.setItem('odonto_cfg_providerName', d.providerName);
        }
      } else if (trialId) {
        // Valores padrão limpos para novos ambientes de teste grátis
        setClinicName('Dental Analytics');
        setClinicLogo(null);
        setFooterText(`© ${new Date().getFullYear()} Dental Analytics | Teste Grátis`);
      } else {
        // Default do sistema geral
        setClinicName('OdontoDash');
        setClinicLogo(null);
        setFooterText(`© ${new Date().getFullYear()} Clínica Odontológica | CRO-SP 123456`);
      }
    }, (error) => {
      console.warn("Settings sync error (branding):", error);
    });
    return unsub;
  }, [trialId]);

  const procedures = useMemo(() => ['Todos', ...Array.from(new Set(data.map(r => r.procedimento)))], [data]);
  const statuses = ['Todos', 'Realizado', 'Agendado', 'Pendente', 'Cancelado'];
  const paymentStatuses = ['Todos', 'Pago', 'Pendente', 'Atrasado'];
  const doctorsList = useMemo(() => ['Todos', ...Array.from(new Set(users.filter(u => u.role === 'Dentista' || u.role === 'Admin').map(u => u.name)))], [users]);

  // Patients filtered based on role (Dentists should only see their assigned patients)
  const patientsForUser = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Dentista') {
      const recordPatientNames = new Set(data.map(r => (r.paciente || '').trim().toLowerCase()).filter(Boolean));
      const recordPatientIds = new Set(data.map(r => r.patientId).filter(Boolean));
      return patients.filter(p => {
        const isResp = p.dentistaResponsavel === currentUser.name;
        const nameMatch = recordPatientNames.has((p.name || '').trim().toLowerCase());
        const idMatch = p.id && recordPatientIds.has(p.id);
        return isResp || nameMatch || idMatch;
      });
    }
    return patients;
  }, [patients, currentUser, data]);

  // Filtered data based on role
  const filteredRecords = React.useMemo(() => {
    if (!currentUser) return [];
    // Only Admin and users with 'Financeiro' or 'Pacientes' module (depending on what data is being filtered)
    // Actually, filteredRecords is used for almost everything.
    if (currentUser.role === 'Dentista') {
      return data.filter(r => r.dentista === currentUser.name);
    }
    
    // If it's for general schedule/patients, users with Agenda/Pacientes and Admin see all.
    if (currentUser.role === 'Admin' || hasModule('Agenda') || hasModule('Pacientes') || currentUser.role === 'Recepcionista') return data;
    return [];
  }, [data, currentUser]);

  // Derived Data (Combines role filtering + UI filters)
  const filteredData = useMemo(() => {
    return filteredRecords.filter(record => {
      const matchesProcedure = filterProcedure === 'Todos' || record.procedimento === filterProcedure;
      const matchesStatus = filterStatus === 'Todos' || record.status === filterStatus;
      const matchesPayment = filterPayment === 'Todos' || record.statusPagamento === filterPayment;
      const matchesDentista = filterDentista === 'Todos' || record.dentista === filterDentista;
      const matchesSearch = (record.paciente || "").toLowerCase().includes((searchPatient || "").toLowerCase());
      
      // Date Filter logic
      let matchesDate = true;
      if (record.data && isValid(parseISO(record.data))) {
        const d = parseISO(record.data);
        const start = startOfDay(parseISO(filterStartDate));
        const end = endOfDay(parseISO(filterEndDate));
        matchesDate = isWithinInterval(d, { start, end });
      }

      return matchesProcedure && matchesStatus && matchesPayment && matchesDentista && matchesSearch && matchesDate;
    });
  }, [filteredRecords, filterProcedure, filterStatus, filterPayment, filterDentista, searchPatient, filterStartDate, filterEndDate]);

  // General upcoming appointments that bypasses dashboard date filters but respects developer/role restrictions & searches
  const upcomingAppointments = React.useMemo(() => {
    const todayStart = startOfDay(new Date());
    return filteredRecords
      .filter(r => {
        if (!r.data || !isValid(parseISO(r.data))) return false;
        if (r.status !== 'Agendado' && r.status !== 'Pendente') return false;
        
        // Match dentist filter if set
        if (filterDentista !== 'Todos' && r.dentista !== filterDentista) return false;
        
        // Match patient name search if set
        if (searchPatient && !(r.paciente || "").toLowerCase().includes(searchPatient.toLowerCase())) return false;

        const apptDate = startOfDay(parseISO(r.data));
        return apptDate.getTime() >= todayStart.getTime();
      })
      .sort((a, b) => {
        const dateA = parseISO(a.data);
        const dateB = parseISO(b.data);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        const timeA = a.horario || '';
        const timeB = b.horario || '';
        return timeA.localeCompare(timeB);
      });
  }, [filteredRecords, filterDentista, searchPatient]);

  // Seeding Logic (Optimized to avoid quota drain)
  React.useEffect(() => {
    if (!db) return;
    const seed = async () => {
      if (isAuthReady) {
        // Only seed if not already exceeding quota
        if (quotaExceeded) return;
        
        try {
          const seedFlag = localStorage.getItem('odonto_seeded_v10');
          
          if (!seedFlag) {
            console.log("Checking if minimal seeding is required (v10)...");
          }
          
          // Seed INITIAL_USERS to 'users' collection
          for (const initialUser of INITIAL_USERS) {
            try {
              const userRef = doc(db, 'users', initialUser.id);
              
              // Seed initial user if it doesn't exist
              const userSnap = await getDoc(userRef);
              if (!userSnap.exists()) {
                console.log(`Seeding initial user: ${initialUser.name}`);
                await setDoc(userRef, {
                  ...initialUser,
                  createdAt: new Date().toISOString()
                });
              } else if (initialUser.id === '1' && !seedFlag) {
                // Special case for first run only if needed, but usually we just want the seed
                console.log(`Initial admin ${initialUser.name} already exists.`);
              }
            } catch (err) {
              console.warn(`Failed to seed user ${initialUser.name}:`, err);
            }
          }

          // Restore mapping for current user
          const userId = auth.currentUser?.uid;
          if (userId) {
            const mappingRef = doc(db, 'users_by_uid', userId);
            const foundInitial = INITIAL_USERS.find(u => (u as any).email === auth.currentUser?.email);
            
            if (foundInitial) {
               await setDoc(mappingRef, {
                 userDocId: foundInitial.id,
                 name: foundInitial.name,
                 role: foundInitial.role,
                 updatedAt: new Date().toISOString()
               });
            }
          }

          localStorage.setItem('odonto_seeded_v10', 'true');
        } catch (e) {
          console.warn("Passive seeding skipped:", e);
        }
      }
    };
    seed();
  }, [isAuthReady, isAuthenticated, quotaExceeded]);

  // Consolidated Auth & Context Listeners
  React.useEffect(() => {
    // Initial sync with localStorage to prevent flicker (Optimistic UI)
    const savedSession = localStorage.getItem('odonto_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        setCurrentUser(sessionData);
        setIsAuthenticated(true);
        console.log("Optimistic session loaded from localStorage");
      } catch (e) {
        console.warn("Invalid saved session found");
      }
    }

    if (!auth) {
      setIsAuthReady(true);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state event:", user?.uid ? `Authenticated (${user.uid})` : "Not Authenticated");
      
      if (user) {
        // User is logged into Firebase
        const savedSession = localStorage.getItem('odonto_session');
        let finalUserData = null;

        if (savedSession) {
          try {
            finalUserData = JSON.parse(savedSession);
          } catch(e) { console.error(e); }
        }

        // If no local storage OR UID doesn't match, fetch from Firestore
        if (!finalUserData || (finalUserData.firebaseUid && finalUserData.firebaseUid !== user.uid)) {
          try {
            console.log("Fetching matching user document for UID:", user.uid);
            const mappingRef = doc(db, 'users_by_uid', user.uid);
            const mappingSnap = await getDoc(mappingRef);
            
            if (mappingSnap.exists()) {
              const mappingData = mappingSnap.data();
              const userRef = doc(db, 'users', mappingData.userDocId);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                finalUserData = { ...userSnap.data(), id: userSnap.id, firebaseUid: user.uid };
              }
            } else {
              // Check by email in the 'users' collection for anyone (not just initial users)
              console.log("No mapping found, searching for user by email:", user.email);
              const usersRef = collection(db, 'users');
              const qEmail = query(usersRef, where('email', '==', user.email), limit(1));
              const emailSnap = await getDocs(qEmail);
              
              if (!emailSnap.empty) {
                const docFound = emailSnap.docs[0];
                finalUserData = { ...docFound.data(), id: docFound.id, firebaseUid: user.uid };
                
                // Create the missing mapping
                await setDoc(doc(db, 'users_by_uid', user.uid), {
                  userDocId: finalUserData.id,
                  name: finalUserData.name,
                  role: finalUserData.role,
                  updatedAt: new Date().toISOString()
                });
                console.log("Auto-mapped new user:", finalUserData.name);
              }
            }
          } catch(err) {
            console.error("Error during background session recovery:", err);
          }
        }

        if (finalUserData) {
          setCurrentUser(finalUserData);
          setIsAuthenticated(true);
          localStorage.setItem('odonto_session', JSON.stringify(finalUserData));
        } else {
          // Firebase authenticated but no linked profile found in our DB
          // Check if it's a known initial user that hasn't been mapped yet
          const foundInitial = INITIAL_USERS.find(u => (u as any).email === user.email);
          if (foundInitial) {
             const userData = { ...foundInitial, firebaseUid: user.uid };
             setCurrentUser(userData);
             setIsAuthenticated(true);
             localStorage.setItem('odonto_session', JSON.stringify(userData));
             
             // Create the mapping for future lookups
             try {
                await setDoc(doc(db, 'users_by_uid', user.uid), {
                  userDocId: foundInitial.id,
                  name: foundInitial.name,
                  role: foundInitial.role,
                  updatedAt: new Date().toISOString()
                });
             } catch(e) { console.error("Mapping creation failed:", e); }
          } else {
             // Truly unknown user
             console.warn("Firebase user has no profile mapping.");
          }
        }
      } else {
        // User is NOT logged into Firebase
        console.log("Cleaning up session check - Firebase: no user");
        const savedSessionStr = localStorage.getItem('odonto_session');
        if (savedSessionStr) {
          try {
            const savedSession = JSON.parse(savedSessionStr);
            // ONLY clean if it was a Firebase session. Custom login sessions (no firebaseUid) are preserved.
            if (savedSession.firebaseUid) {
              console.log("Cleaning up Firebase session");
              localStorage.removeItem('odonto_session');
              setCurrentUser(null);
              setIsAuthenticated(false);
            } else {
              console.log("Preserving custom login session");
              // Ensure state matches localStorage
              setCurrentUser(savedSession);
              setIsAuthenticated(true);
            }
          } catch (e) {
            localStorage.removeItem('odonto_session');
          }
        }
      }
      
      setIsAuthReady(true);
    });

    return () => unsubAuth();
  }, []);


  // Notifications Listener
  React.useEffect(() => {
    if (!currentUser || !db) return;
    console.log("Iniciando monitoramento de notificações...");
    const userId = currentUser.id || currentUser.uid || currentUser.firebaseUid;
    if (!userId) {
      console.warn("Skipping notifications listener: userId is undefined on currentUser", currentUser);
      return;
    }
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Notificações atualizadas:", list.length);
      const sorted = list.sort((a: any, b: any) => {
        const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dB - dA;
      });
      setNotifications(sorted);
    }, (error) => {
      if (error.message.includes('Quota exceeded')) setQuotaExceeded(true);
      console.warn("Notifications sync error:", error);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleCreatePatient = async (newPatient: any, existingId?: string): Promise<boolean> => {
    console.log("[handleCreatePatient] Início:", { name: newPatient.name, existingId });
    if (!newPatient.name) {
      alert('Por favor, informe o nome do paciente.');
      return false;
    }

    try {
      const patientId = (existingId && existingId.trim() !== '') ? existingId : `pat-${Date.now()}`;
      console.log(existingId ? `[handleCreatePatient] Atualizando paciente ${existingId}...` : `[handleCreatePatient] Criando novo paciente ${patientId}...`);

      const trimmedName = newPatient.name.trim();
      const trimmedEmail = newPatient.email?.trim() || '';

      if (!existingId) {
        // Validation is already done in the view, but we keep a final check here
        const isDuplicateEmail = trimmedEmail && patients.some(p => p.email?.toLowerCase() === trimmedEmail.toLowerCase());
        if (isDuplicateEmail) {
           console.warn(`[handleCreatePatient] E-mail duplicado detectado para: ${trimmedEmail}`);
           alert(`O e-mail "${trimmedEmail}" já está cadastrado.`);
           return false;
        }
      }
      
      const patientData: any = {
        id: patientId,
        name: trimmedName,
        email: trimmedEmail,
        phone: newPatient.phone || '',
        cpf: newPatient.cpf || '',
        dentistaResponsavel: currentUser?.role === 'Dentista' ? (currentUser.name || '') : (newPatient.dentistaResponsavel || ''),
        updatedAt: new Date().toISOString()
      };
      
      if (trialId) {
        patientData.trialOwnerId = trialId;
      }
      
      if (!existingId || existingId.trim() === '') {
        patientData.createdAt = new Date().toISOString();
      }

      console.log("[handleCreatePatient] Salvando no Firestore:", patientData);
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(patientRef, patientData, { merge: true });
      console.log("[handleCreatePatient] Sucesso ao gravar no Firestore.");
      
      alert(existingId ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!');
      setSubPage(null);
      return true;
    } catch (e: any) {
      console.error("[handleCreatePatient] Falha crítica:", e);
      let errorMsg = "Permissão negada ou falha na rede.";
      try {
        if (e.message && e.message.startsWith('{')) {
          const errObj = JSON.parse(e.message);
          errorMsg = errObj.error || errorMsg;
        }
      } catch {
        errorMsg = e.message || errorMsg;
      }
      alert(`Erro ao salvar paciente: ${errorMsg}`);
      return false;
    }
  };

  const handleCreateAppointment = async (newAppt: any) => {
    if (!newAppt.paciente || !newAppt.dentista || !newAppt.data) {
      alert('Por favor, preencha todos os campos do agendamento.');
      return;
    }

    const matchedPatient = findPatientByRobustMatch(newAppt.paciente, patients);
    const patientPhone = newAppt.telefone || matchedPatient?.phone;

    const record: DentalRecord = {
      id: `rec-new-${Date.now()}`,
      data: newAppt.data,
      horario: newAppt.horario || '',
      paciente: newAppt.paciente,
      telefone: patientPhone || '',
      procedimento: newAppt.procedimento || 'Avaliação',
      dentista: newAppt.dentista,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      valor: Number(newAppt.valor) || 0,
    };

    if (trialId) {
      (record as any).trialOwnerId = trialId;
    }

    const isTaken = data.some(r => 
      r.dentista === record.dentista && 
      r.data === record.data && 
      r.horario === record.horario &&
      r.status !== 'Cancelado'
    );

    if (isTaken) {
      alert('ERRO: Este dentista já possui agendamento para este dia e horário. Por favor, escolha outro horário.');
      return false;
    }

    try {
      console.log("Tentando salvar agendamento no Firestore:", record);
      await setDoc(doc(db, 'records', record.id), record);

      // Notify ONLY the assigned dentist
      const dentist = users.find(u => u.name === newAppt.dentista);
      if (dentist) {
        // Important: we target the dentist specifically.
        const dentistId = dentist.id || dentist.uid || dentist.firebaseUid;
        const notifId = `notif-appt-${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: dentistId,
          message: `Novo agendamento: ${record.paciente} para o dia ${record.data}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      setSubPage(null);
      return true;
    } catch (e: any) {
      console.error("Erro ao salvar agendamento:", e);
      alert("Erro ao salvar agendamento: " + (e.message || "Verifique sua conexão ou permissões."));
      return false;
    }
  };

  const handleCreateClinicalRecord = async (newRecord: any) => {
    if (!newRecord.paciente || !newRecord.dentista || !newRecord.data) {
      alert('Por favor, preencha todos os campos do registro clínico.');
      return false;
    }

    const record: DentalRecord = {
      id: `rec-evo-${Date.now()}`,
      data: newRecord.data,
      horario: newRecord.horario || format(new Date(), 'HH:mm'),
      paciente: newRecord.paciente,
      procedimento: newRecord.procedimento || 'Avaliação',
      dentista: newRecord.dentista,
      status: 'Concluído',
      statusPagamento: 'Pendente',
      valor: Number(newRecord.valor) || 0,
      observacao: newRecord.observacao || '',
    };

    if (trialId) {
      (record as any).trialOwnerId = trialId;
    }

    try {
      await setDoc(doc(db, 'records', record.id), record);
      return true;
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar registro: " + (e.message || "Erro de permissão."));
      return false;
    }
  };

  const handleCreateDocument = async (newDoc: any): Promise<boolean> => {
    if (!newDoc.patientName || !newDoc.content || !newDoc.type) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return false;
    }

    const id = `doc-${Date.now()}`;
    const docData: any = {
      id,
      ...newDoc,
      dentista: currentUser?.name || newDoc.dentista || newDoc.dentistName || 'Administrador',
      createdAt: new Date().toISOString()
    };

    if (trialId) {
      docData.trialOwnerId = trialId;
    }

    try {
      await setDoc(doc(db, 'documents', id), docData);
      // Also add a record for this document in the clinical history
      await handleCreateClinicalRecord({
        paciente: newDoc.patientName,
        data: format(new Date(), 'yyyy-MM-dd'),
        dentista: newDoc.dentistName || 'Administrador',
        procedimento: `Emissão de ${newDoc.type}`,
        valor: 0
      });
      return true;
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar documento: " + (e.message || "Erro de permissão."));
      return false;
    }
  };

  const handleUpdateAnamnesis = async (patientId: string, anamnesisData: any): Promise<boolean> => {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(patientRef, { anamnesis: anamnesisData, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e: any) {
      console.error("Falha ao salvar anamnese:", e);
      alert("Erro ao salvar anamnese: " + (e.message || "Permissão negada."));
      return false;
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    console.log("Attempting to delete patient with ID:", patientId);
    
    // Permission check
    const userRole = currentUser?.role?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'dentista') {
      alert('Apenas dentistas ou administradores podem excluir pacientes.');
      return;
    }

    if (!patientId || typeof patientId !== 'string') {
      console.error("Invalid patientId provided to handleDeletePatient:", patientId);
      alert("ID do paciente é inválido para exclusão.");
      return;
    }

    // Deletion is now handled via state + confirm modal in the UI
    /*
    const confirmMessage = 'Tem certeza que deseja excluir permanentemente o cadastro deste paciente? Todas as informações de prontuário associadas serão removidas.';
    if (!window.confirm(confirmMessage)) {
      console.log("Deletion cancelled by user.");
      return;
    }
    */
    
    try {
      // Find patient name first for record cleanup
      const patientSnap = await getDoc(doc(db, 'patients', patientId));
      const patientName = patientSnap.exists() ? patientSnap.data().name : null;

      console.log(`Deleting patient document: patients/${patientId}`);
      await deleteDoc(doc(db, 'patients', patientId));
      
      // Cleanup related records
      try {
        // First try by ID if available (though schema says name)
        let recordsQuery = query(collection(db, 'records'), where('pacienteId', '==', patientId));
        let recordsSnap = await getDocs(recordsQuery);
        for (const recordDoc of recordsSnap.docs) {
           await deleteDoc(doc(db, 'records', recordDoc.id));
        }

        // Also cleanup by name as the current schema mainly uses name
        if (patientName) {
          recordsQuery = query(collection(db, 'records'), where('paciente', '==', patientName));
          recordsSnap = await getDocs(recordsQuery);
          for (const recordDoc of recordsSnap.docs) {
             await deleteDoc(doc(db, 'records', recordDoc.id));
          }
        }
      } catch (cleanErr) {
        console.warn("Could not clean up some related records:", cleanErr);
      }

      alert('Cadastro do paciente e históricos associados excluídos com sucesso.');
      setSelectedPatientDetail(null);
      
      // Force refresh if needed by hitting the data layer (usually onSnapshot handles it)
      console.log("Patient deletion successful.");
    } catch (e: any) {
      console.error("Critical error deleting patient:", e);
      handleFirestoreError(e, OperationType.DELETE, 'patients/' + patientId);
    }
  };

  const handleCreateUser = async (newUser: any): Promise<boolean> => {
    const id = `user-${Date.now()}`;
    const user: any = {
      id,
      name: newUser.name,
      role: newUser.role,
      modules: newUser.modules || (newUser.role === 'Admin' ? 'Todos' : (newUser.role === 'Dentista' ? 'Dashboard, Agenda, Pacientes' : (newUser.role === 'Recepcionista' ? 'Dashboard, Agenda, Pacientes' : 'Agenda, Pacientes, Financeiro'))),
      username: newUser.username || (newUser.name || "user").toLowerCase().replace(' ', '.'),
      password: newUser.password || '123',
      email: newUser.email || '',
      phone: newUser.phone || '',
      createdAt: new Date().toISOString()
    };

    if (trialId) {
      user.parentTrialId = trialId;
    }
    
    try {
      console.log("Iniciando criação de usuário no Firestore:", user);
      await setDoc(doc(db, 'users', id), user);
      console.log("Sucesso: Usuário gravado!");
      return true;
    } catch (e: any) {
      console.error("Erro crítico ao criar usuário:", e);
      alert("Erro ao gravar usuário. Verifique sua conexão ou permissões. Detalhes: " + (e.message || ""));
      return false;
    }
  };

  const handleUpdateUser = async (userId: string, updatedData: any): Promise<boolean> => {
    try {
      const userRef = doc(db, 'users', userId);
      // Remove id from the data to be updated in the document content
      const { id, ...dataToUpdate } = updatedData;
      
      // Update with exact data from UI
      await setDoc(userRef, {
        ...dataToUpdate,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[Users] Usuário ${userId} salvo em Firestore com sucesso.`, {
        username: dataToUpdate.username,
        hasPassword: !!dataToUpdate.password,
        pwdLength: dataToUpdate.password?.length
      });
      return true;
    } catch (e: any) {
      console.error("Erro ao atualizar usuário:", e);
      alert("Erro ao atualizar usuário: " + (e.message || "Permissão negada."));
      return false;
    }
  };

  const handleDeleteUser = async (userId: string): Promise<boolean> => {
    console.log("handleDeleteUser starting for:", userId);
    
    // Protect core admin ana.admin (ID '1') and self
    if (userId === '1') {
      alert("O usuário administrador principal não pode ser excluído por segurança.");
      return false;
    }

    if (currentUser && (currentUser.id === userId || currentUser.uid === userId)) {
      alert("Você não pode excluir seu próprio usuário enquanto estiver conectado.");
      return false;
    }

    try {
      if (!userId) throw new Error("ID do usuário não fornecido.");
      
      console.log(`Executing deleteDoc for: users/${userId}`);
      await deleteDoc(doc(db, 'users', userId));
      console.log("DeleteDoc users succeeded");
      
      // Also try to delete mapping if it exists
      try {
        const mappingsSnap = await getDocs(query(collection(db, 'users_by_uid'), where('userDocId', '==', userId)));
        for (const mDoc of mappingsSnap.docs) {
          await deleteDoc(doc(db, 'users_by_uid', mDoc.id));
        }
        console.log("User mapping cleanup finished");
      } catch (err) {
        console.warn("Could not clean up user mapping:", err);
      }
      
      alert("Usuário excluído com sucesso.");
      return true;
    } catch (e: any) {
      console.error("Error during handleDeleteUser:", e);
      handleFirestoreError(e, OperationType.DELETE, 'users/' + userId);
      return false;
    }
  };

  const handleUpdatePaymentStatus = async (id: string, newStatus: any) => {
    try {
      await setDoc(doc(db, 'records', id), { statusPagamento: newStatus }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'records/' + id);
    }
  };

  const handleSavePatientEmail = async (patientName: string, email: string) => {
    try {
      const patient = patients.find(p => p.name === patientName);
      const patientId = patient?.id || patientName.toLowerCase().replace(/\s+/g, '-');
      
      await setDoc(doc(db, 'patients', patientId), {
        name: patientName,
        email: email,
        updatedAt: new Date().toISOString(),
        id: patientId
      }, { merge: true });

      alert("E-mail cadastrado com sucesso!");
      
      // If we were trying to send a reminder, trigger it again
      if (editingPatientEmail?.appointmentId) {
        const record = data.find(r => r.id === editingPatientEmail.appointmentId);
        if (record) {
          // We need to wait a bit for the state to sync or just manually call the reminder with the new email
          // For simplicity, let's just close the modal and tell them to click the bell again
          // Actually, let's try to trigger it
          setEditingPatientEmail(null);
          setTimeout(() => {
            handleSendManualReminder({ ...record });
          }, 500);
        } else {
          setEditingPatientEmail(null);
        }
      } else {
        setEditingPatientEmail(null);
      }
    } catch (error) {
      console.error("Erro ao salvar e-mail:", error);
      alert("Erro ao salvar e-mail.");
    }
  };

  const handleSendManualReminder = async (record: DentalRecord) => {
    const patient = findPatientByRobustMatch(record.paciente, patients);
    
    if (!patient || !patient.email) {
      setEditingPatientEmail({ patientName: record.paciente, appointmentId: record.id });
      return;
    }

    try {
      const response = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          patientEmail: patient.email,
          patientName: record.paciente,
          date: record.data,
          time: record.horario || "conforme agendado"
        })
      });

      if (response.ok) {
        alert(`Lembrete enviado para ${patient.email}!`);
      } else {
        const err = await response.json();
        alert(`Erro ao enviar: ${err.error || 'Serviço de e-mail não configurado'}`);
        if (err.error?.includes("not configured") || err.error?.includes("Autenticação")) {
          alert("DICA: Configure EMAIL_USER e EMAIL_PASS corretamente nas Configurações. Se usar Gmail, use uma 'Senha de Aplicativo'.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleWhatsAppReminder = (record: DentalRecord) => {
    console.log("Acionando lembrete WhatsApp para:", record.paciente);
    
    const patient = findPatientByRobustMatch(record.paciente, patients);
    
    if (!patient) {
      console.warn("Paciente não encontrado na base de dados:", record.paciente);
      alert(`O paciente "${record.paciente}" não foi encontrado no cadastro de pacientes.\n\nCertifique-se de que o nome cadastrado no agendamento é o mesmo que consta na aba 'Pacientes'.`);
      return;
    }

    proceedWithWhatsApp(patient, record);
  };

  // Função interna para processar o envio após encontrar o paciente
  const proceedWithWhatsApp = (patient: any, record: DentalRecord) => {
    // Buscando telefone no cadastro do paciente em múltiplos campos comuns
    const phone = patient.phone || patient.telefone || patient.celular || patient.mobile || patient.contato || '';
    
    if (!phone) {
      console.warn("Telefone não encontrado no objeto do paciente:", patient);
      alert(`O paciente "${patient.name}" não tem um telefone cadastrado.\n\nPor favor, vá na aba 'Pacientes', procure por este paciente, clique em 'Editar' e adicione o número de celular.`);
      return;
    }

    const timeStr = record.horario ? ` às ${record.horario}` : '';
    const dateFormatted = record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), "dd/MM/yyyy") : "N/D";
    
    // Gerar link de ação do paciente
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const confirmationLink = `${origin}${pathname}?confirmAppt=${record.id}`;

    const message = `Olá, ${record.paciente}!\n\nConfirmando a sua consulta odontológica de *${record.procedimento}* para o dia *${dateFormatted}*${timeStr} com *${record.dentista}*.\n\nPor favor, responda ou gerencie sua consulta (Confirmar, Cancelar ou Reagendar) clicando no link abaixo:\n\n👉 ${confirmationLink}`;
    const encodedMessage = encodeURIComponent(message);
    
    // Remove caracteres não numéricos e garante o DDI 55 (Brasil) se não houver
    const cleanPhone = phone.toString().replace(/\D/g, '');
    let finalPhone = cleanPhone;
    
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      finalPhone = `55${cleanPhone}`;
    } else if (cleanPhone.length < 10) {
      alert("O telefone cadastrado (" + phone + ") parece estar incompleto ou incorreto. Por favor, verifique o cadastro do paciente.");
      return;
    }
    
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`;
    console.log("Abrindo URL do WhatsApp:", whatsappUrl);
    
    const win = window.open(whatsappUrl, '_blank');
    if (!win) {
      alert("O seu navegador bloqueou a abertura do WhatsApp. Por favor, permita pop-ups para este site.");
    }
  };

  const handleCancelAppointment = async (recordId: string) => {
    console.log("Iniciando cancelamento do agendamento:", recordId);
    const record = data.find(r => r.id === recordId);
    
    if (!record) {
      console.error("Agendamento não localizado no estado.:", recordId);
      alert("Agendamento não encontrado. Tente atualizar a página.");
      return;
    }

    try {
      // Optimistic update for better UX
      setData(prev => prev.map(r => r.id === recordId ? { ...r, status: 'Cancelado' } : r));

      // 1. Update Firestore
      await setDoc(doc(db, 'records', recordId), {
        status: 'Cancelado'
      }, { merge: true });

      // 2. Notification logic
      const matchedPatient = findPatientByRobustMatch(record.paciente, patients);
      const patientPhone = record.telefone || matchedPatient?.phone;
      const patientEmail = matchedPatient?.email;

      if (patientPhone || patientEmail) {
        const confirmNotification = window.confirm(
          `Agendamento de ${record.paciente} cancelado com sucesso.\n\nDeseja enviar uma notificação de cancelamento sugerindo o reagendamento?`
        );

        if (confirmNotification) {
          const formattedDate = format(parseISO(record.data), 'dd/MM/yyyy');
          const message = `Olá ${record.paciente}, informamos que seu agendamento para o dia ${formattedDate} às ${record.horario} com o(a) ${record.dentista} foi cancelado. Gostaria de reagendar para uma nova data? Estamos à disposição!`;
          
          if (patientEmail) {
            const subject = encodeURIComponent('Cancelamento de Agendamento - Clínica Odontológica');
            const body = encodeURIComponent(message);
            window.open(`mailto:${patientEmail}?subject=${subject}&body=${body}`, '_blank');
          }
        }
      }

      console.log(`Cancelamento concluído para ${record.paciente}`);
    } catch (e) {
      console.error("Erro no processo de cancelamento:", e);
      // Revert optimistic update on error
      const originalRecord = data.find(r => r.id === recordId);
      if (originalRecord) {
        setData(prev => prev.map(r => r.id === recordId ? originalRecord : r));
      }
      alert("Não foi possível cancelar o agendamento no servidor. Verifique sua conexão.");
      handleFirestoreError(e, OperationType.UPDATE, 'records/' + recordId);
    }
  };

  const handleStartConsultation = async (recordId: string) => {
    const record = data.find(r => r.id === recordId);
    if (!record) {
      console.error("Agendamento não encontrado para iniciar:", recordId);
      return;
    }

    try {
      // Optimistic update
      setData(prev => prev.map(r => r.id === recordId ? { ...r, status: 'Em Atendimento' } : r));

      // 1. Update record status
      await setDoc(doc(db, 'records', recordId), {
        status: 'Em Atendimento',
        startedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update current doctor status
      const doctor = users.find(u => u.name === record.dentista);
      if (doctor) {
        try {
          await setDoc(doc(db, 'users', doctor.id), {
            availability: 'em_atendimento',
            currentPatient: record.paciente
          }, { merge: true });
        } catch (doctorErr) {
          console.warn("Could not update doctor status (continuing anyway):", doctorErr);
        }
      }
      console.log(`Consulta iniciada para ${record.paciente}`);
    } catch (e) {
      console.error("Erro ao iniciar consulta:", e);
      // Revert optimistic
      const original = data.find(r => r.id === recordId);
      if (original) {
        setData(prev => prev.map(r => r.id === recordId ? original : r));
      }
      handleFirestoreError(e, OperationType.UPDATE, 'records/' + recordId);
    }
  };

  const handleFinishConsultation = async (recordId: string) => {
    const record = data.find(r => r.id === recordId);
    if (!record) return;

    try {
      // Optimistic update
      setData(prev => prev.map(r => r.id === recordId ? { ...r, status: 'Realizado' } : r));

      // 1. Update record status
      await setDoc(doc(db, 'records', recordId), {
        status: 'Realizado'
      }, { merge: true });

      // 2. Update doctor status
      const doctor = users.find(u => u.name === record.dentista);
      if (doctor) {
        try {
          await setDoc(doc(db, 'users', doctor.id), {
            availability: 'disponivel',
            currentPatient: null
          }, { merge: true });
        } catch (doctorErr) {
          console.warn("Could not update doctor status (continuing anyway):", doctorErr);
        }
      }
    } catch (e) {
      console.error("Erro ao finalizar consulta:", e);
      // Revert optimistic
      const original = data.find(r => r.id === recordId);
      if (original) {
        setData(prev => prev.map(r => r.id === recordId ? original : r));
      }
      handleFirestoreError(e, OperationType.UPDATE, 'records/' + recordId);
    }
  };

  const handleLogin = async (userProfile: any) => {
    // Link the logical user to the current Firebase Auth session if present
    if (auth.currentUser) {
      try {
        console.log("Sincronizando perfil com Firebase...");
        // Link logical ID to UID
        await setDoc(doc(db, 'users_by_uid', auth.currentUser.uid), {
          userDocId: userProfile.id,
          name: userProfile.name,
          role: userProfile.role,
          updatedAt: new Date().toISOString()
        });

        // Update main user record
        await setDoc(doc(db, 'users', userProfile.id), {
          firebaseUid: auth.currentUser.uid,
          lastLogin: new Date().toISOString()
        }, { merge: true });

        userProfile.firebaseUid = auth.currentUser.uid;
      } catch (e) {
        console.error("Erro ao vincular UID:", e);
      }
    }

    setCurrentUser(userProfile);
    setIsAuthenticated(true);
    localStorage.setItem('odonto_session', JSON.stringify(userProfile));
    if (userProfile.role === 'SuperAdmin' || userProfile.username === 'administrador') {
      setActivePage('SuperAdmin');
    } else {
      setActivePage('Dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('odonto_session');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActivePage('Dashboard');
    setSubPage(null);
  };

  const handleRestoreData = async (backup: any) => {
    if (currentUser?.role?.toLowerCase() !== 'admin') return;

    try {
      setIsLoadingData(true);
      
      // Restore Patients
      if (backup.patients && Array.isArray(backup.patients)) {
        for (const p of backup.patients) {
          await setDoc(doc(db, 'patients', p.id), p);
        }
      }

      // Restore Records
      if (backup.records && Array.isArray(backup.records)) {
        for (const r of backup.records) {
          await setDoc(doc(db, 'records', r.id), r);
        }
      }

      // Restore Documents
      if (backup.documents && Array.isArray(backup.documents)) {
        for (const d of backup.documents) {
          await setDoc(doc(db, 'documents', d.id), d);
        }
      }

      // Restore Users (Admin only)
      if (backup.users && Array.isArray(backup.users)) {
        for (const u of backup.users) {
          // Careful not to overwrite primary admin or current user if possible, 
          // but for a full restore, we usually want everything.
          await setDoc(doc(db, 'users', u.id), u);
        }
      }

      console.log("Restauração concluída!");
    } catch (error) {
      console.error("Erro na restauração:", error);
      throw error;
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpdateSettings = async (updates: { clinicName?: string; clinicLogo?: string | null; footerText?: string; providerPhone?: string; providerName?: string }) => {
    try {
      const docId = trialId ? `clinic-${trialId}` : 'clinic';
      await setDoc(doc(db, 'settings', docId), {
        id: docId,
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      if (updates.providerPhone) {
        setProviderPhone(updates.providerPhone);
        localStorage.setItem('odonto_cfg_providerPhone', updates.providerPhone);
      }
      if (updates.providerName) {
        setProviderName(updates.providerName);
        localStorage.setItem('odonto_cfg_providerName', updates.providerName);
      }
    } catch (e: any) {
      const docId = trialId ? `clinic-${trialId}` : 'clinic';
      handleFirestoreError(e, OperationType.UPDATE, `settings/${docId}`);
    }
  };

  const handleResetDatabase = async () => {
    console.log("handleResetDatabase requested by:", currentUser?.name, "Role:", currentUser?.role);
    
    if (currentUser?.role?.toLowerCase() !== 'admin') {
      alert("Apenas administradores podem resetar o sistema. Seu cargo atual: " + currentUser?.role);
      return;
    }

    try {
      setIsLoadingData(true);
      const collectionsToClear = ['records', 'patients', 'documents', 'odontograms', 'users', 'users_by_uid', 'notifications', 'support_tickets'];
      
      let successCount = 0;
      let errorCount = 0;

      console.log("Iniciando limpeza total do banco...");
      
      for (const collName of collectionsToClear) {
        try {
          const snap = await getDocs(collection(db, collName));
          console.log(`Limpando ${snap.size} documentos de ${collName}...`);
          
          const batchPromises = snap.docs.map(d => deleteDoc(doc(db, collName, d.id)));
          await Promise.all(batchPromises);
          
          successCount++;
        } catch (err: any) {
          console.error(`Erro ao limpar coleção ${collName}:`, err);
          errorCount++;
        }
      }
      
      if (errorCount > 0) {
        alert(`O sistema foi parcialmente limpo. ${successCount} coleções removidas, ${errorCount} erros encontrados. Verifique o console para detalhes.`);
      } else {
        alert("Sistema limpo com sucesso! Os usuários padrão foram restaurados automaticamente na interface.");
      }
    } catch (e: any) {
      console.error("Erro fatal ao resetar banco:", e);
      alert("Erro ao limpar dados: " + e.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const renderLegal = () => (
    <>
      <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />
      <TermsOfUseModal isOpen={showTermsOfUse} onClose={() => setShowTermsOfUse(false)} />
      <KeyboardShortcutsModal isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} />
      {!cookieConsent && <CookieBanner onAccept={() => {
        setCookieConsent(true);
        localStorage.setItem('odonto_cookie_consent', 'true');
      }} onDecline={() => {
        setCookieConsent(true);
      }} />}
    </>
  );

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (confirmApptId) {
    return (
      <>
        <PublicConfirmationView 
          appointmentId={confirmApptId} 
          onBack={() => setConfirmApptId(null)} 
          onOpenBooking={() => {
            setConfirmApptId(null);
            setIsPublicBooking(true);
          }}
          setReschedulePreFill={setReschedulePreFill}
          clinicName={clinicName}
          clinicLogo={clinicLogo}
          footerText={footerText}
          data={data}
        />
        {renderLegal()}
      </>
    );
  }

  if (isPublicBooking) {
    return (
      <>
        <PublicBookingView 
          onBack={() => {
            setIsPublicBooking(false);
            setReschedulePreFill(null);
          }} 
          users={users} 
          data={data} 
          onPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onTerms={() => setShowTermsOfUse(true)}
          clinicName={clinicName}
          clinicLogo={clinicLogo}
          footerText={footerText}
          initialFormData={reschedulePreFill}
        />
        {renderLegal()}
      </>
    );
  }

  if (!isAuthenticated) {
    if (isFreeTrialView) {
      return (
        <>
          <FreeTrialView 
            onBack={() => setIsFreeTrialView(false)}
            onStartTrial={async (details) => {
              const emailNormalized = details.email.trim().toLowerCase();
              const phoneTrimmed = details.phone.trim();
              const phoneDigits = phoneTrimmed.replace(/\D/g, '');
              const usernameTrimmed = details.username.trim().toLowerCase();

              // Database Anti-Abuse validation checks
              const usersRef = collection(db, 'users');

              // 1. Check duplicate username to prevent authentication collision
              const qUser = query(usersRef, where('username', '==', usernameTrimmed), limit(1));
              const userSnap = await getDocs(qUser);
              if (!userSnap.empty) {
                throw new Error("Este nome de usuário já está sendo utilizado por outra conta.");
              }

              // 2. Check duplicate Email to prevent multiple trials
              const qEmail = query(usersRef, where('email', '==', emailNormalized));
              const emailSnap = await getDocs(qEmail);
              if (!emailSnap.empty) {
                const existingUser = emailSnap.docs[0].data();
                if (existingUser.isTrial === true) {
                  throw new Error("O e-mail informado já foi utilizado para cadastrar uma conta de teste (Trial). Não é permitido criar múltiplos testes grátis com o mesmo e-mail.");
                } else {
                  throw new Error("Este e-mail já pertence a uma conta ativa no sistema.");
                }
              }

              // 3. Check duplicate WhatsApp/Phone (raw phone matching or normalized phone digits matching)
              const qPhoneRaw = query(usersRef, where('phone', '==', phoneTrimmed));
              const phoneRawSnap = await getDocs(qPhoneRaw);
              if (!phoneRawSnap.empty) {
                const existingUser = phoneRawSnap.docs[0].data();
                if (existingUser.isTrial === true) {
                  throw new Error("Este número de WhatsApp já foi utilizado para cadastrar uma conta de teste (Trial). Cada profissional/clínica tem direito a apenas um período de teste de 14 dias.");
                } else {
                  throw new Error("Este número de WhatsApp já está cadastrado em outra conta ativa.");
                }
              }

              const qPhoneNorm = query(usersRef, where('normalizedPhone', '==', phoneDigits));
              const phoneNormSnap = await getDocs(qPhoneNorm);
              if (!phoneNormSnap.empty) {
                const existingUser = phoneNormSnap.docs[0].data();
                if (existingUser.isTrial === true) {
                  throw new Error("Este número de WhatsApp já foi utilizado para cadastrar uma conta de teste (Trial) anteriormente.");
                } else {
                  throw new Error("Este número de WhatsApp correspondente já está cadastrado em outra conta ativa.");
                }
              }

              setClinicName(details.clinicName);
              const trialIdGenerated = `trial-${Date.now()}`;
              try {
                // Salva as configurações diretamente no documento isolado do trial gerado
                await setDoc(doc(db, 'settings', `clinic-${trialIdGenerated}`), {
                  id: `clinic-${trialIdGenerated}`,
                  clinicName: details.clinicName,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              } catch (e) {
                console.error("Erro ao atualizar configurações no Firestore:", e);
              }
              
              const trialUserProfile = {
                id: trialIdGenerated,
                name: details.fullName,
                role: 'Admin',
                modules: 'Todos',
                username: usernameTrimmed,
                password: details.password.trim(),
                email: emailNormalized,
                phone: phoneTrimmed,
                normalizedPhone: phoneDigits,   // Field stored for future digit-normalized lookup checks
                cpf: details.cpf.replace(/\D/g, ''), // Store raw digits only
                isTrial: true,
                trialPlan: details.plan,
                trialSpecialty: details.specialty,
                trialStartedAt: new Date().toISOString()
              };

              try {
                await setDoc(doc(db, 'users', trialUserProfile.id), trialUserProfile);
              } catch (e) {
                console.error("Erro ao persistir profil de trial no Firestore:", e);
                throw e; // Bubble up to let the View display the error
              }

              // Save block markers on local client storage on database register success
              try {
                localStorage.setItem('_sys_clinic_engine_state_', JSON.stringify({
                  lastSession: 'trial-active',
                  hasCompletedTrial: true,
                  trialEmail: emailNormalized,
                  timestamp: new Date().toISOString()
                }));
                
                const d = new Date();
                d.setTime(d.getTime() + (10 * 365 * 24 * 60 * 60 * 1000)); // 10 years duration cookie
                document.cookie = `_odontodash_trial_block=true; expires=${d.toUTCString()}; path=/; SameSite=Strict`;
              } catch (err) {
                console.error("Erro escrevendo marcadores offline:", err);
              }
              
              await handleLogin(trialUserProfile);
              setIsFreeTrialView(false);
            }}
            clinicLogo={clinicLogo}
            footerText={footerText}
          />
          {renderLegal()}
        </>
      );
    }

    return (
      <>
        <LoginView 
          users={users} 
          onLogin={handleLogin} 
          onOpenBooking={() => setIsPublicBooking(true)} 
          onPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onTerms={() => setShowTermsOfUse(true)}
          clinicName={clinicName}
          clinicLogo={clinicLogo}
          footerText={footerText}
          onOpenFreeTrial={() => setIsFreeTrialView(true)}
        />
        {renderLegal()}
      </>
    );
  }

  const renderContent = () => {
    if (subPage === 'Prontuario' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <MedicalChartView 
          patientName={patientsForUser.find(p => p.id === selectedPatientId)?.name || selectedPatientId} 
          patientId={selectedPatientId}
          data={filteredRecords} 
          onBack={() => setSubPage(null)} 
          onAddRecord={(p) => { setSelectedPatientId(p); setSubPage('NovaEvolucao'); }}
          onAddPatient={() => { setSubPage('Cadastrar'); }}
          onAddAppointment={(p) => { 
            if (p) setSelectedPatientId(p);
            setActivePage('Agenda');
          }}
          onAddCertificate={(p) => { setSelectedPatientId(p); setSubPage('NovoAtestado'); }}
          onAddPrescription={(p) => { setSelectedPatientId(p); setSubPage('NovaReceita'); }}
          onUpdateAnamnesis={(p) => { setSelectedPatientId(p); setSubPage('EditarAnamnese'); }}
          patients={patientsForUser}
          documents={documents.filter(d => d.patientName === selectedPatientId || d.patientId === selectedPatientId || (selectedPatientId && d.patientName === patientsForUser.find(p => p.id === selectedPatientId)?.name))}
          onDeleteDocument={handleDeleteDocument}
          onUploadDocument={handleCreateDocument}
          onUpdatePatient={(p) => {
            setSelectedPatientId(p);
            setSubPage('Editar');
          }}
          currentUser={currentUser}
        />
      );
    }
    if (subPage === 'NovaEvolucao' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <ClinicalEvolutionFormView 
          users={users} 
          onSave={handleCreateClinicalRecord} 
          onBack={() => setSubPage('Prontuario')} 
          patientName={selectedPatientId}
        />
      );
    }
    if (subPage === 'NovoRegistro' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <AppointmentFormView 
          patients={patientsForUser} 
          data={filteredRecords} 
          users={users} 
          onSave={handleCreateClinicalRecord} 
          onBack={() => setSubPage('Prontuario')} 
          presetPatient={selectedPatientId}
          isClinicalRecord={true}
        />
      );
    }
    if (subPage === 'NovoAtestado' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <CertificateFormView 
          users={users} 
          onSave={handleCreateDocument} 
          onBack={() => setSubPage('Prontuario')} 
          patientName={selectedPatientId}
        />
      );
    }
    if (subPage === 'NovaReceita' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <PrescriptionFormView 
          users={users} 
          onSave={handleCreateDocument} 
          onBack={() => setSubPage('Prontuario')} 
          patientName={selectedPatientId}
        />
      );
    }
    if (subPage === 'EditarAnamnese' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <AnamnesisFormView 
          patients={patientsForUser}
          onSave={handleUpdateAnamnesis}
          onBack={() => setSubPage('Prontuario')}
          patientId={selectedPatientId}
        />
      );
    }
    if (subPage === 'Cadastrar' && activePage === 'Pacientes') {
      return <PatientFormView patients={patientsForUser} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'Editar' && activePage === 'Pacientes' && selectedPatientId) {
      return <PatientFormView isEdit patientId={selectedPatientId} patients={patientsForUser} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'NovoAgendamento' && activePage === 'Agenda') {
      return <AppointmentFormView patients={patientsForUser} data={filteredRecords} users={users} onSave={handleCreateAppointment} onBack={() => setSubPage(null)} />;
    }

    // Permission Guard for module rendering
    const canAccessFinance = hasModule('Financeiro');
    const canAccessAdmin = hasModule('Administração');
    const canAccessConfig = hasModule('Administração');

    const isRecepcionista = currentUser?.role === 'Recepcionista';
    const canSeeFinancials = hasModule('Financeiro');

    switch (activePage) {
      case 'Dashboard':
        return (
          <div className="space-y-6">
            {isLoadingData && (
              <div className="flex items-center gap-3 bg-brand-cyan/10 border border-brand-cyan/20 p-3 rounded-xl animate-pulse">
                <Activity className="w-4 h-4 text-brand-cyan animate-spin" />
                <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest">Sincronizando dados em tempo real...</span>
              </div>
            )}
            <DashboardView 
              filteredData={filteredData} 
              upcomingAppointments={upcomingAppointments}
              onSendWhatsApp={handleWhatsAppReminder} 
              onSendReminder={handleSendManualReminder} 
              canSeeFinancials={canSeeFinancials}
              users={users}
              onNavigate={(page, subP = null) => { setActivePage(page); setSubPage(subP); }}
            />
          </div>
        );
      case 'Retorno':
        return <RecallView data={data} clinicName={clinicName} patients={patientsForUser} />;
      case 'Mensagens':
        if (!hasModule('Mensagens')) {
          return (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto my-12">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-500 mb-4">
                <Lock className="w-6 h-6" />
              </span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
              <p className="text-slate-500 text-xs">Você não possui permissão para acessar o módulo de Mensagens. Entre em contato com o administrador.</p>
            </div>
          );
        }
        return (
          <MessagesView 
            data={data} 
            patients={patientsForUser} 
            clinicName={clinicName} 
            db={db} 
            currentUser={currentUser}
          />
        );
      case 'Documentos':
        return <DocumentsView 
          data={data} 
          users={users} 
          currentUser={currentUser} 
          clinicName={clinicName} 
          clinicLogo={clinicLogo}
          footerText={footerText}
        />;
      case 'Pacientes':
        return (
          <PatientsView 
            data={filteredData} 
            patients={patientsForUser}
            onOpenChart={(id) => { setSelectedPatientId(id); setSubPage('Prontuario'); }}
            onOpenEdit={(id) => { setSelectedPatientId(id); setSubPage('Editar'); }}
            onDelete={(id) => {
              const p = patientsForUser.find(pat => pat.id === id);
              if (p) setPatientToDelete(p);
            }}
            currentUserRole={currentUser?.role}
            canSeeFinancials={canSeeFinancials}
            onAdd={() => setSubPage('Cadastrar')}
            onViewDetail={(p) => {
              const fullInfo = patientsForUser.find(pat => pat.name === p.name);
              const patientRecords = data.filter(r => r.paciente === p.name);
              const sortedRecords = [...patientRecords].filter(r => r.data && isValid(parseISO(r.data)))
                .sort((a,b) => parseISO(b.data).getTime() - parseISO(a.data).getTime());
              
              const lastRec = sortedRecords[0];
              const nextRec = patientRecords
                .filter(r => r.status === 'Agendado' && r.data && isValid(parseISO(r.data)) && parseISO(r.data) >= new Date())
                .sort((a,b) => parseISO(a.data).getTime() - parseISO(b.data).getTime())[0];
              
              setSelectedPatientDetail({
                ...p,
                ...fullInfo,
                lastVisit: lastRec?.data || p.lastVisit,
                nextAppt: nextRec?.data || null,
                dentist: nextRec?.dentista || lastRec?.dentista || 'Não definido',
                status: 'Ativo',
                onEditAction: (id: string) => {
                  setSelectedPatientId(id);
                  setSubPage('Editar');
                },
              });
            }}
          />
        );
      case 'Agenda':
        return <AgendaView 
          data={filteredData} 
          fullData={data} 
          onAdd={() => setSubPage('NovoAgendamento')} 
          onStart={handleStartConsultation} 
          onFinish={handleFinishConsultation} 
          onCancel={handleCancelAppointment} 
          onSendReminder={handleSendManualReminder}
          onSendWhatsApp={handleWhatsAppReminder}
          onEditEmail={(record) => setEditingPatientEmail({ patientName: record.paciente, appointmentId: record.id })}
        />;
      case 'Financeiro':
        return canAccessFinance ? <FinanceView data={filteredData} patients={patientsForUser} onUpdatePayment={handleUpdatePaymentStatus} /> : <div className="p-8 text-slate-400">Acesso restrito ao Financeiro.</div>;
      case 'Administração':
        return canAccessAdmin ? (
          <AdminView 
            users={users} 
            onAddUser={handleCreateUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
            clinicName={clinicName}
            clinicLogo={clinicLogo}
            footerText={footerText}
            providerPhone={providerPhone}
            providerName={providerName}
            onUpdateSettings={handleUpdateSettings}
            onResetDatabase={handleResetDatabase}
            deferredPrompt={deferredPrompt}
            onInstallPWA={handleInstallPWA}
            data={data}
            patients={patientsForUser}
            documents={documents}
            onRestore={handleRestoreData}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
          />
        ) : (
          <div className="p-8 text-slate-400">Acesso restrito à Administração.</div>
        );
      case 'Estoque':
        return <StockView currentUser={currentUser} />;
      case 'Assinatura':
        return (
          <SaaSAssinaturaView 
            currentUser={currentUser} 
            onUpdateCurrentUser={(updatedFields) => {
              setCurrentUser(updatedFields);
              localStorage.setItem('odonto_session', JSON.stringify(updatedFields));
            }}
            db={db}
            patientsCount={patients.length}
            dentistCount={users.filter((u: any) => u?.role === 'Dentista').length}
          />
        );
      case 'SuperAdmin':
        return (
          <SuperAdminView 
            users={users} 
            onUpdateUser={handleUpdateUser} 
            db={db} 
          />
        );
      default:
        return (
          <DashboardView 
            filteredData={filteredData} 
            upcomingAppointments={upcomingAppointments} 
            onSendWhatsApp={handleWhatsAppReminder} 
            onSendReminder={handleSendManualReminder} 
            users={users} 
            onNavigate={(page, subP = null) => { setActivePage(page); setSubPage(subP); }}
          />
        );
    }
  };

  const renderDashboardBackground = () => {
    const canSeeFinancials = hasModule('Financeiro');
    return (
      <div className="space-y-6 opacity-25 select-none pointer-events-none blur-[1px]">
        {isLoadingData && (
          <div className="flex items-center gap-3 bg-brand-cyan/10 border border-brand-cyan/20 p-3 rounded-xl">
            <Activity className="w-4 h-4 text-brand-cyan animate-spin" />
            <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest">Sincronizando dados em tempo real...</span>
          </div>
        )}
        <DashboardView 
          filteredData={filteredData} 
          upcomingAppointments={upcomingAppointments}
          onSendWhatsApp={handleWhatsAppReminder} 
          onSendReminder={handleSendManualReminder} 
          canSeeFinancials={canSeeFinancials}
          users={users}
          onNavigate={(page, subP = null) => { setActivePage(page); setSubPage(subP); }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 pt-14">
      {/* Unified Fixed Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 text-white z-[110] select-none flex items-center justify-between px-4 font-sans">
        {/* Logo / Branding */}
        <div className="flex items-center gap-2 mr-4 cursor-pointer" onClick={() => { setActivePage('Dashboard'); setSubPage(null); }}>
          {clinicLogo ? (
            <img src={clinicLogo} alt={clinicName} className="h-7 max-w-[130px] object-contain brightness-110 contrast-110" />
          ) : (
            <div className="w-7 h-7 bg-brand-cyan rounded flex items-center justify-center shrink-0 shadow-sm">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-tight leading-none text-white">{clinicName}</span>
            <span className="text-[8px] text-brand-cyan font-bold tracking-wider mt-0.5 uppercase">OdontoDash</span>
          </div>
        </div>

        {/* Desktop Main Navigation Horizontal (Cascading on Hover) */}
        <nav className="hidden lg:flex items-center gap-1.5 h-full">
          {/* Dashboard */}
          {hasModule('Dashboard') && (
            <button
              onClick={() => { setActivePage('Dashboard'); setSubPage(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activePage === 'Dashboard' 
                  ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                  : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Dashboard</span>
            </button>
          )}

          {/* Dropdown Atendimento */}
          {(hasModule('Agenda') || hasModule('Pacientes')) && (
            <div className="relative group/menu h-full flex items-center">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                  ['Agenda', 'Pacientes'].includes(activePage)
                    ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Atendimento</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              {/* Cascade Dropdown Submenu */}
              <div className="absolute top-[85%] left-0 hidden group-hover/menu:block pt-2 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1.5 space-y-0.5">
                  {hasModule('Agenda') && (
                    <>
                      <button
                        onClick={() => { setActivePage('Agenda'); setSubPage(null); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                          activePage === 'Agenda' && subPage === null ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                        <span>Ver Agenda</span>
                      </button>
                      <button
                        onClick={() => { setActivePage('Agenda'); setSubPage('NovoAgendamento'); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                          activePage === 'Agenda' && subPage === 'NovoAgendamento' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                        <span>Novo Agendamento</span>
                      </button>
                    </>
                  )}
                  {hasModule('Pacientes') && (
                    <>
                      <button
                        onClick={() => { setActivePage('Pacientes'); setSubPage(null); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                          activePage === 'Pacientes' && (subPage === null || subPage === 'Prontuario') ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Users className="w-3.5 h-3.5 text-brand-cyan" />
                        <span>Lista de Pacientes</span>
                      </button>
                      <button
                        onClick={() => { setActivePage('Pacientes'); setSubPage('Cadastrar'); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                          activePage === 'Pacientes' && subPage === 'Cadastrar' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-brand-cyan" />
                        <span>Cadastrar Paciente</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dropdown Operacional */}
          {(hasModule('Estoque') || hasModule('Documentos')) && (
            <div className="relative group/menu h-full flex items-center">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                  ['Estoque', 'Documentos'].includes(activePage)
                    ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Package className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Operacional</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-[85%] left-0 hidden group-hover/menu:block pt-2 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1.5 space-y-0.5">
                  {hasModule('Estoque') && (
                    <button
                      onClick={() => { setActivePage('Estoque'); setSubPage(null); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                        activePage === 'Estoque' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Package className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Controle de Estoque</span>
                    </button>
                  )}
                  {hasModule('Documentos') && (
                    <button
                      onClick={() => { setActivePage('Documentos'); setSubPage(null); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                        activePage === 'Documentos' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Gestão de Documentos</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dropdown Comunicação */}
          {(hasModule('Mensagens') || hasModule('Retorno')) && (
            <div className="relative group/menu h-full flex items-center">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                  ['Mensagens', 'Retorno'].includes(activePage)
                    ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Comunicação</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-[85%] left-0 hidden group-hover/menu:block pt-2 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1.5 space-y-0.5">
                  {hasModule('Mensagens') && (
                    <button
                      onClick={() => { setActivePage('Mensagens'); setSubPage(null); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                        activePage === 'Mensagens' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Central WhatsApp</span>
                    </button>
                  )}
                  {hasModule('Retorno') && (
                    <button
                      onClick={() => { setActivePage('Retorno'); setSubPage(null); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                        activePage === 'Retorno' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Controle de Retornos</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dropdown Financeiro */}
          {hasModule('Financeiro') && (
            <div className="relative group/menu h-full flex items-center">
              <button
                onClick={() => { setActivePage('Financeiro'); setSubPage(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activePage === 'Financeiro' 
                    ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <DollarSign className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Financeiro</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-[85%] left-0 hidden group-hover/menu:block pt-2 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setActivePage('Financeiro'); setSubPage(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Painel Geral</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dropdown Administração */}
          {hasModule('Administração') && (
            <div className="relative group/menu h-full flex items-center">
              <button
                onClick={() => { setActivePage('Administração'); setSubPage(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activePage === 'Administração' 
                    ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Activity className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Administração</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-[85%] left-0 hidden group-hover/menu:block pt-2 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setActivePage('Administração'); setAdminTab('users'); setSubPage(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                      activePage === 'Administração' && adminTab === 'users' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Gestão de Usuários</span>
                  </button>
                  <button
                    onClick={() => { setActivePage('Administração'); setAdminTab('settings'); setSubPage(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                      activePage === 'Administração' && adminTab === 'settings' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Settings className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Dados da Clínica</span>
                  </button>
                  <button
                    onClick={() => { setActivePage('Administração'); setAdminTab('backup'); setSubPage(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                      activePage === 'Administração' && adminTab === 'backup' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Restauração & Backup</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dropdown SuperAdmin */}
          {currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador') && (
            <button
              onClick={() => { setActivePage('SuperAdmin'); setSubPage(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activePage === 'SuperAdmin' 
                  ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                  : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Shield className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
              <span>SaaS Central</span>
            </button>
          )}
        </nav>

        {/* Right Section: User Badge, Shortcuts, Clock, and Logout */}
        <div className="flex items-center gap-2 font-sans">
          {/* Agenda online short link */}
          <button 
            onClick={() => {
              const url = window.location.origin + window.location.pathname + '?booking=true';
              navigator.clipboard.writeText(url);
              alert('Link de agendamento online copiado!');
              setIsPublicBooking(true);
            }}
            className="p-1.5 bg-brand-cyan/15 border border-brand-cyan/35 rounded-lg text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all flex items-center justify-center group shrink-0"
            title="Copiar Link de Agendamento Online"
          >
            <Monitor className="w-4 h-4 transition-transform group-hover:scale-105" />
          </button>

          {/* Shortcuts helper */}
          <button 
            onClick={() => setShowKeyboardShortcuts(true)}
            className="hidden md:flex p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-all items-center justify-center"
            title="Atalhos de Teclado (Ctrl + K)"
          >
            <Keyboard className="w-4 h-4 text-brand-cyan" />
          </button>

          <div className="w-px h-6 bg-slate-800 hidden xs:block" />

          {/* Dynamic Clock */}
          <div className="hidden xl:block">
            <RealTimeClock />
          </div>

          {currentUser && (
            <div className="flex items-center gap-2 pl-1.5 py-1">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center uppercase select-none shrink-0 border-brand-cyan/30">
                {currentUser.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="hidden sm:flex flex-col min-w-0 pr-1 select-none">
                <span className="text-[11px] font-bold text-slate-100 leading-tight leading-none truncate">{currentUser.name?.split(' ')[0]}</span>
                <span className="text-[8px] uppercase font-bold text-brand-cyan tracking-wider truncate">{currentUser.role}</span>
              </div>
            </div>
          )}

          {/* Logout Btn */}
          <button 
            onClick={handleLogout}
            className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all rounded-lg cursor-pointer"
            title="Sair do Sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Hamburger for mobile */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 lg:hidden text-slate-305 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal (Central) */}
      <div className="flex-1 flex flex-col min-w-0">
        <AnimatePresence>
        {quotaExceeded && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-lg"
          >
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl shadow-xl flex items-start gap-4">
              <div className="bg-rose-500 p-2 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-sm">Limite de sincronização atingido</h3>
                <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                  O limite gratuito de consultas ao banco de dados foi excedido hoje. 
                  Os dados apresentados podem estar desatualizados. A sincronização em tempo real retornará automaticamente em algumas horas.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {editingPatientEmail && (
        <EmailModal 
          patientName={editingPatientEmail.patientName} 
          onClose={() => setEditingPatientEmail(null)} 
          onSave={handleSavePatientEmail} 
        />
      )}

      <AnimatePresence>
        {selectedPatientDetail && (
          <PatientDetailModal 
            patient={selectedPatientDetail} 
            onClose={() => setSelectedPatientDetail(null)} 
            onDelete={(id) => {
              const p = patients.find(pat => pat.id === id);
              if (p) setPatientToDelete(p);
            }}
            currentUserRole={currentUser?.role}
          />
        )}
        {patientToDelete && (
          <ConfirmDeleteModal 
            patient={patientToDelete}
            onCancel={() => setPatientToDelete(null)}
            onConfirm={async () => {
              const id = patientToDelete.id;
              setPatientToDelete(null);
              await handleDeletePatient(id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Header (apenas Mobile) */}
      <header className="hidden bg-white border-b border-slate-200 px-3 md:px-4 py-2 flex items-center justify-between sticky top-0 z-50 shrink-0 select-none">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 lg:hidden text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              {clinicLogo ? (
                <img src={clinicLogo} alt={clinicName} className="h-7 max-w-[130px] object-contain" />
              ) : (
                <div className="w-7 h-7 bg-brand-cyan rounded flex items-center justify-center shrink-0">
                  <Stethoscope className="h-4.5 w-4.5 text-white" />
                </div>
              )}
              <h1 className="text-sm md:text-base font-bold text-slate-800 tracking-tight hidden xs:block">
                {clinicName} <span className="text-brand-cyan font-normal">Analytics</span>
              </h1>
            </div>
            
            {currentUser && (
              <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-100 shrink-0">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 border border-slate-200 uppercase">
                  {currentUser.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">{currentUser.name}</span>
                  <span className="text-[8px] uppercase font-bold text-brand-cyan tracking-tighter leading-none">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 lg:gap-2">
            {/* RealTime Clock - Topo */}
            <div className="hidden xl:flex items-center mr-1">
              <RealTimeClock />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {hasModule('Dashboard') && (
                <RibbonItem 
                  icon={<LayoutDashboard className="w-3.5 h-3.5" />} 
                  label="Dashboard" 
                  active={activePage === 'Dashboard'} 
                  onClick={() => { setActivePage('Dashboard'); setSubPage(null); }}
                />
              )}
              {hasModule('Pacientes') && (
                <RibbonItem 
                  icon={<Users className="w-3.5 h-3.5" />} 
                  label="Pacientes" 
                  active={activePage === 'Pacientes'} 
                  onClick={() => { setActivePage('Pacientes'); setSubPage(null); }}
                />
              )}
              {hasModule('Agenda') && (
                <RibbonItem 
                  icon={<Calendar className="w-3.5 h-3.5" />} 
                  label="Agenda" 
                  active={activePage === 'Agenda'} 
                  onClick={() => { setActivePage('Agenda'); setSubPage(null); }}
                />
              )}
              {hasModule('Retorno') && (
                <RibbonItem 
                  icon={<RotateCcw className="w-3.5 h-3.5" />} 
                  label="Retorno" 
                  active={activePage === 'Retorno'} 
                  isLocked={isModuleLockedBySaaS('Retorno')}
                  onClick={() => { setActivePage('Retorno'); setSubPage(null); }}
                />
              )}
              {hasModule('Mensagens') && (
                <RibbonItem 
                  icon={<MessageSquare className="w-3.5 h-3.5" />} 
                  label="Mensagens" 
                  active={activePage === 'Mensagens'} 
                  isLocked={isModuleLockedBySaaS('Mensagens')}
                  onClick={() => { setActivePage('Mensagens'); setSubPage(null); }}
                />
              )}
              {hasModule('Documentos') && (
                <RibbonItem 
                  icon={<FileText className="w-3.5 h-3.5" />} 
                  label="Documentos" 
                  active={activePage === 'Documentos'} 
                  isLocked={isModuleLockedBySaaS('Documentos')}
                  onClick={() => { setActivePage('Documentos'); setSubPage(null); }}
                />
              )}
              {hasModule('Financeiro') && (
                <RibbonItem 
                  icon={<DollarSign className="w-3.5 h-3.5" />} 
                  label="Financeiro" 
                  active={activePage === 'Financeiro'} 
                  isLocked={isModuleLockedBySaaS('Financeiro')}
                  onClick={() => { setActivePage('Financeiro'); setSubPage(null); }}
                />
              )}
              {hasModule('Estoque') && (
                <RibbonItem 
                  icon={<Package className="w-3.5 h-3.5" />} 
                   label="Estoque" 
                  active={activePage === 'Estoque'} 
                  isLocked={isModuleLockedBySaaS('Estoque')}
                  onClick={() => { setActivePage('Estoque'); setSubPage(null); }}
                />
              )}
              {hasModule('Administração') && (
                <RibbonItem 
                  icon={<Activity className="w-3.5 h-3.5" />} 
                  label="Adm" 
                  active={activePage === 'Administração'} 
                  onClick={() => { setActivePage('Administração'); setSubPage(null); }}
                />
              )}
            </nav>

            <div className="w-px h-6 bg-slate-100 mx-0.5 shrink-0" />
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  const url = window.location.origin + window.location.pathname + '?booking=true';
                  navigator.clipboard.writeText(url);
                  alert('Link de agendamento online copiado!');
                  setIsPublicBooking(true);
                }}
                className="p-2 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all flex items-center justify-center group shadow-sm hover:shadow-md"
                title="Copiar Link e Ver Tela de Agendamento"
              >
                <Monitor className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          <button 
              onClick={handleLogout}
              className="flex flex-col items-center justify-center px-4 py-1.5 bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer group min-w-[55px] shrink-0 active:scale-95"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] uppercase font-black tracking-widest mt-1">Sair</span>
            </button>
        </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[115] lg:hidden"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-slate-900 text-white shadow-2xl z-[120] lg:hidden flex flex-col pt-16 border-r border-slate-800"
            >
              <div className="px-6 mb-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-350 uppercase shrink-0">
                  {currentUser?.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-100 truncate leading-snug">{currentUser?.name}</span>
                  <span className="text-[10px] uppercase font-bold text-brand-cyan tracking-wider leading-none">{currentUser?.role}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 no-scrollbar font-sans">
                {/* Dashboard */}
                {hasModule('Dashboard') && (
                  <button
                    onClick={() => { setActivePage('Dashboard'); setSubPage(null); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all border text-left cursor-pointer",
                      activePage === 'Dashboard' ? "bg-brand-cyan/20 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-350 hover:bg-white/5"
                    )}
                  >
                    <LayoutDashboard className="w-4 h-4 text-brand-cyan" />
                    <span>Dashboard</span>
                  </button>
                )}

                {/* Group: Atendimento */}
                {(hasModule('Agenda') || hasModule('Pacientes')) && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-brand-cyan" />
                      <span>Atendimento</span>
                    </div>
                    {hasModule('Agenda') && (
                      <>
                        <button
                          onClick={() => { setActivePage('Agenda'); setSubPage(null); setIsMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                            activePage === 'Agenda' && subPage === null ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-350 hover:bg-white/5"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                          <span>Ver Agenda</span>
                        </button>
                        <button
                          onClick={() => { setActivePage('Agenda'); setSubPage('NovoAgendamento'); setIsMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                            activePage === 'Agenda' && subPage === 'NovoAgendamento' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                          <span>Novo Agendamento</span>
                        </button>
                      </>
                    )}
                    {hasModule('Pacientes') && (
                      <>
                        <button
                          onClick={() => { setActivePage('Pacientes'); setSubPage(null); setIsMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                            activePage === 'Pacientes' && (subPage === null || subPage === 'Prontuario') ? "bg-brand-cyan/25 border-brand-cyan/35 text-white font-bold" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5 font-bold"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                          <span>Lista de Pacientes</span>
                        </button>
                        <button
                          onClick={() => { setActivePage('Pacientes'); setSubPage('Cadastrar'); setIsMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                            activePage === 'Pacientes' && subPage === 'Cadastrar' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white font-bold" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5 font-bold"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                          <span>Cadastrar Paciente</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Group: Operacional */}
                {(hasModule('Estoque') || hasModule('Documentos')) && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-brand-cyan" />
                      <span>Operacional</span>
                    </div>
                    {hasModule('Estoque') && (
                      <button
                        onClick={() => { setActivePage('Estoque'); setSubPage(null); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                          activePage === 'Estoque' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                        )}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                        <span>Controle de Estoque</span>
                      </button>
                    )}
                    {hasModule('Documentos') && (
                      <button
                        onClick={() => { setActivePage('Documentos'); setSubPage(null); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                          activePage === 'Documentos' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                        )}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                        <span>Documentos Clínicos</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Group: Comunicação */}
                {(hasModule('Mensagens') || hasModule('Retorno')) && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-brand-cyan" />
                      <span>Comunicação</span>
                    </div>
                    {hasModule('Mensagens') && (
                      <button
                        onClick={() => { setActivePage('Mensagens'); setSubPage(null); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                          activePage === 'Mensagens' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                        )}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                        <span>Central WhatsApp</span>
                      </button>
                    )}
                    {hasModule('Retorno') && (
                      <button
                        onClick={() => { setActivePage('Retorno'); setSubPage(null); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                          activePage === 'Retorno' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                        )}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                        <span>Gestão de Retornos</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Group: Financeiro */}
                {hasModule('Financeiro') && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 text-brand-cyan" />
                      <span>Financeiro</span>
                    </div>
                    <button
                      onClick={() => { setActivePage('Financeiro'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Financeiro' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span>Painel Financeiro</span>
                    </button>
                  </div>
                )}

                {/* Group: Configurações */}
                {hasModule('Administração') && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-brand-cyan" />
                      <span>Administração</span>
                    </div>
                    <button
                      onClick={() => { setActivePage('Administração'); setAdminTab('users'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Administração' && adminTab === 'users' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span>Gestão de Usuários</span>
                    </button>
                    <button
                      onClick={() => { setActivePage('Administração'); setAdminTab('settings'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Administração' && adminTab === 'settings' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span>Dados da Clínica</span>
                    </button>
                    <button
                      onClick={() => { setActivePage('Administração'); setAdminTab('backup'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Administração' && adminTab === 'backup' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span>Backup e Restauro</span>
                    </button>
                  </div>
                )}

                {/* Central SaaS */}
                {currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador') && (
                  <button
                    onClick={() => { setActivePage('SuperAdmin'); setSubPage(null); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all border text-left cursor-pointer",
                      activePage === 'SuperAdmin' ? "bg-brand-cyan/20 border-brand-cyan/35 text-white animate-pulse" : "bg-transparent border-transparent text-slate-350 hover:bg-white/5"
                    )}
                  >
                    <Shield className="w-4 h-4 text-brand-cyan" />
                    <span>SaaS Central Admin</span>
                  </button>
                )}
              </div>

              <div className="p-4 border-t border-slate-800">
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 text-rose-450 font-bold text-sm hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  Sair do Sistema
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Filters removed from main background area because they are now placed permanently inside the active modal windows */}

      <main className="flex-1 overflow-auto bg-slate-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "w-full mx-auto flex-1 flex flex-col",
              (activePage === 'Pacientes' && subPage === 'Prontuario') || activePage === 'SuperAdmin'
                ? "p-0"
                : "p-4 md:p-6 lg:p-8 space-y-6 max-w-(--breakpoint-xl)"
            )}
          >
            {globalBanner && globalBanner.active && !bannerDismissed && (
              <div id="saas-system-banner" className={`p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-4 font-sans shadow-md animate-in slide-in-from-top-4 duration-300 relative overflow-hidden text-left shrink-0 select-none ${
                globalBanner.type === 'warning' 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : globalBanner.type === 'maintenance' 
                  ? 'bg-slate-900 text-slate-100 border-slate-950' 
                  : globalBanner.type === 'amber'
                  ? 'bg-orange-50 border-orange-200 text-orange-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    globalBanner.type === 'warning' 
                      ? 'bg-amber-500/10 text-amber-600' 
                      : globalBanner.type === 'maintenance' 
                      ? 'bg-brand-cyan/20 text-brand-cyan' 
                      : globalBanner.type === 'amber'
                      ? 'bg-orange-500/10 text-orange-600'
                      : 'bg-indigo-500/10 text-indigo-600'
                  }`}>
                    <Bell className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-black/5">
                        {globalBanner.type === 'maintenance' ? 'Manutenção / Atualização' : 'Aviso do Sistema'}
                      </span>
                      {globalBanner.createdAt && (
                        <span className="text-[10px] text-slate-450 font-mono">
                          {new Date(globalBanner.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold leading-relaxed mt-0.5">{globalBanner.message}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setBannerDismissed(true);
                    if (globalBanner.id) {
                      localStorage.setItem('dismissed_banner_id', globalBanner.id);
                    }
                  }}
                  className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-indigo-650 cursor-pointer transition-all"
                >
                  <X className="w-4 h-4 font-black" />
                </button>
              </div>
            )}

            {/* Smart Search Filters, Date/Time and Booking Copier neatly integrated within the workspace layout */}
            {['Agenda', 'Pacientes', 'Financeiro'].includes(activePage) && subPage === null && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm z-30 font-sans">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="relative group w-full lg:w-auto">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Buscar paciente..."
                        className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-brand-cyan outline-none w-full lg:w-48 shadow-sm"
                        value={searchPatient}
                        onChange={(e) => setSearchPatient(SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 100))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Período:</span>
                      <select 
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none cursor-pointer shadow-sm"
                        value={filterDateRange}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setFilterDateRange(val);
                          if (val === 'today') {
                            setFilterStartDate(format(new Date(), 'yyyy-MM-dd'));
                            setFilterEndDate(format(new Date(), 'yyyy-MM-dd'));
                          } else if (val === 'month') {
                            setFilterStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                            setFilterEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                          } else if (val === 'last_month') {
                            const lastMonth = subMonths(new Date(), 1);
                            setFilterStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                            setFilterEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
                          }
                        }}
                      >
                        <option value="month">Este Mês</option>
                        <option value="last_month">Mês Passado</option>
                        <option value="today">Hoje</option>
                        <option value="custom">Customizado</option>
                      </select>

                      {filterDateRange === 'custom' && (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                          <input 
                            type="date"
                            className="text-[10px] border border-slate-200 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none shadow-inner"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                          />
                          <span className="text-[10px] text-slate-400">até</span>
                          <input 
                            type="date"
                            className="text-[10px] border border-slate-200 rounded px-1 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none shadow-inner"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Proc:</span>
                      <select 
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none cursor-pointer shadow-sm"
                        value={filterProcedure}
                        onChange={(e) => setFilterProcedure(e.target.value)}
                      >
                        {procedures.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Status:</span>
                      <select 
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none cursor-pointer shadow-sm"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Fin:</span>
                      <select 
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none cursor-pointer shadow-sm"
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value)}
                      >
                        {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {(currentUser?.role === 'Admin' || hasModule('Agenda') || hasModule('Pacientes')) && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-450">Médico:</span>
                        <select 
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none cursor-pointer shadow-sm"
                          value={filterDentista}
                          onChange={(e) => setFilterDentista(e.target.value)}
                        >
                          {doctorsList.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start xl:self-auto xl:border-l xl:border-slate-200/60 xl:pl-4">
                  <button 
                    onClick={() => {
                      const url = window.location.origin + window.location.pathname + '?booking=true';
                      navigator.clipboard.writeText(url);
                      alert('Link de agendamento online copiado!');
                      setIsPublicBooking(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan text-white rounded-lg hover:bg-brand-cyan/90 text-xs font-bold transition-all shadow-sm active:scale-95"
                    title="Copiar Link de Agendamento"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Agendamento Online</span>
                  </button>
                </div>
              </div>
            )}
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer 
        onPrivacyPolicy={() => setShowPrivacyPolicy(true)} 
        onTerms={() => setShowTermsOfUse(true)} 
        footerText={footerText}
      />

      {renderLegal()}
      </div>
    </div>
  );
}

function MessagesView({ data, patients, clinicName, db, currentUser }: { data: DentalRecord[], patients: any[], clinicName: string, db: any, currentUser: any }) {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'templates' | 'configs'>('status');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  // Simulated chat messages thread state by record ID
  const [chats, setChats] = useState<{[recordId: string]: any[]}>({});
  const [isTyping, setIsTyping] = useState<{[recordId: string]: boolean}>({});
  const [typedMessage, setTypedMessage] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chats, isTyping, selectedRecordId]);

  const simulatePatientResponse = (recordId: string, userMsg: string) => {
    // 1. Set typing status with a slight delay
    setTimeout(() => {
      setIsTyping(prev => ({ ...prev, [recordId]: true }));
    }, 1000);

    // 2. Clear typing and add response after 2.5s
    setTimeout(() => {
      setIsTyping(prev => ({ ...prev, [recordId]: false }));

      const text = userMsg.toLowerCase();
      let reply = "";

      if (text.includes("bom dia") || text.includes("boa tarde") || text.includes("olá") || text.includes("ola")) {
        reply = "Olá! Como vai? Tudo bem por aí?";
      } else if (text.includes("confirma") || text.includes("sim") || text.includes("certo") || text.includes("ok")) {
        reply = "Sim, está tudo confirmado! Já guardei na minha agenda.";
      } else if (text.includes("dor") || text.includes("doendo") || text.includes("sensivel") || text.includes("sinto")) {
        reply = "Estou sentindo um pouco de sensibilidade sim, doutor(a). Obrigado por perguntar.";
      } else if (text.includes("atraso") || text.includes("atrasado") || text.includes("atrasar")) {
        reply = "Sem problemas, eu compreendo! Nos vemos em instantes.";
      } else if (text.includes("documento") || text.includes("carteira") || text.includes("rg") || text.includes("convenio")) {
        reply = "Certo, vou levar sim! Obrigado pelo lembrete.";
      } else {
        const responses = [
          "Combinado! Nos vemos no horário marcado. 👍",
          "Muito obrigado(a) pela mensagem e pelo lembrete!",
          "Tudo bem, anotado por aqui! Até breve.",
          "Obrigado pelo aviso da clínica. Tenha um ótimo dia!"
        ];
        reply = responses[Math.floor(Math.random() * responses.length)];
      }

      const patientMsg = {
        ids: `patient-${Date.now()}`,
        text: reply,
        sender: 'patient',
        timestamp: 'Agora mesmo'
      };

      setChats(prev => {
        const currentList = prev[recordId] || [
          {
            id: 'initial',
            text: formatTemplate(templates.confirmacao, selectedRecord),
            sender: 'clinic',
            timestamp: 'Enviado às 08:30',
            status: 'delivered'
          }
        ];
        return {
          ...prev,
          [recordId]: [...currentList, patientMsg]
        };
      });

      // If IA is active, the assistant replies shortly after!
      if (configs.iaCoPilot) {
        setTimeout(() => {
          const iaMsg = {
            id: `ia-${Date.now()}`,
            text: `Excelente! Resposta automática recebida e computada com sucesso. Qualquer dúvida estamos à disposição! 🎉`,
            sender: 'clinic-ia',
            timestamp: 'Agora mesmo (Auto-resposta)'
          };
          setChats(prev => ({
            ...prev,
            [recordId]: [...(prev[recordId] || []), iaMsg]
          }));
        }, 1200);
      }

    }, 2800);
  };

  const handleSendClinicMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedRecordId || !selectedRecord) return;

    const userMsgText = typedMessage.trim();
    setTypedMessage("");

    const newMsg = {
      id: `clinic-${Date.now()}`,
      text: userMsgText,
      sender: 'clinic',
      timestamp: 'Agora mesmo',
      status: 'delivered'
    };

    setChats(prev => {
      const currentList = prev[selectedRecordId] || [
        {
          id: 'initial',
          text: formatTemplate(templates.confirmacao, selectedRecord),
          sender: 'clinic',
          timestamp: 'Enviado às 08:30 (Automático)',
          status: 'delivered'
        }
      ];
      return {
        ...prev,
        [selectedRecordId]: [...currentList, newMsg]
      };
    });

    simulatePatientResponse(selectedRecordId, userMsgText);
  };

  // Message templates stored in state, hydrated from localStorage or defaults
  const [templates, setTemplates] = useState({
    confirmacao: localStorage.getItem('odonto_tpl_confirmacao') || 
      "Olá, {paciente}! Aqui é da clínica {clinica}. Confirmamos sua consulta de {procedimento} amanhã ({data}) às {horario} com Dr(a). {dentista}. Responda SIM p/ confirmar ou NÃO p/ cancelar.",
    retorno: localStorage.getItem('odonto_tpl_retorno') || 
      "Olá, {paciente}! Já se passaram 6 meses desde o seu tratamento de {procedimento} na {clinica}. Recomendamos agendar um retorno preventivo para manter seu sorriso saudável! Vamos agendar?",
    aniversario: localStorage.getItem('odonto_tpl_aniversario') || 
      "Olá, {paciente}! 🎉 Nós da clínica {clinica} desejamos um feliz aniversário com muita saúde e motivos para sorrir! Parabéns!",
    cobranca: localStorage.getItem('odonto_tpl_cobranca') || 
      "Olá, {paciente}! Identificamos que há um orçamento pendente ou parcela em aberto para o procedimento {procedimento}. Entre em contato para facilitarmos as condições p/ você."
  });

  const [activeTemplateTab, setActiveTemplateTab] = useState<'confirmacao' | 'retorno' | 'aniversario' | 'cobranca'>('confirmacao');
  const [templateText, setTemplateText] = useState(templates.confirmacao);

  // Sync templates modification to localStorage
  const handleSaveTemplate = () => {
    localStorage.setItem(`odonto_tpl_${activeTemplateTab}`, templateText);
    setTemplates(prev => ({ ...prev, [activeTemplateTab]: templateText }));
    alert('Modelo de mensagem salvo com sucesso!');
  };

  useEffect(() => {
    setTemplateText(templates[activeTemplateTab]);
  }, [activeTemplateTab, templates]);

  // Automation Settings Toggle States
  const [configs, setConfigs] = useState({
    autoWhatsapp: localStorage.getItem('odonto_cfg_autoWhatsapp') !== 'false',
    autoSms: localStorage.getItem('odonto_cfg_autoSms') === 'true',
    autoEmail: localStorage.getItem('odonto_cfg_autoEmail') !== 'false',
    birthdayPromo: localStorage.getItem('odonto_cfg_birthdayPromo') !== 'false',
    iaCoPilot: localStorage.getItem('odonto_cfg_iaCoPilot') !== 'false',
    providerPhone: localStorage.getItem('odonto_cfg_providerPhone') || '+55 (47) 99999-9999',
    providerName: localStorage.getItem('odonto_cfg_providerName') || 'MB.SISTEMAS',
  });

  const handleToggleConfig = (key: 'autoWhatsapp' | 'autoSms' | 'autoEmail' | 'birthdayPromo' | 'iaCoPilot') => {
    const newVal = !configs[key];
    setConfigs(prev => ({ ...prev, [key]: newVal }));
    localStorage.setItem(`odonto_cfg_${String(key)}`, String(newVal));
  };

  const handleUpdateConfigString = (key: 'providerPhone' | 'providerName', value: string) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`odonto_cfg_${key}`, value);
  };

  // Only consider active/future appointments or valid records
  const filteredAppointments = useMemo(() => {
    return data.filter(record => record.status !== 'Realizado' && record.status !== 'Concluído')
      .filter(record => {
        // Guard check: Dentists can only see patients linked to them
        if (currentUser?.role === 'Dentista') {
          const isRecordDentist = record.dentista === currentUser.name;
          const patient = findPatientByRobustMatch(record.paciente, patients);
          const isPatientDentist = patient?.dentistaResponsavel === currentUser.name;
          return isRecordDentist || isPatientDentist;
        }
        return true;
      })
      .sort((a,b) => {
        const da = a.data ? new Date(a.data).getTime() : 0;
        const db = b.data ? new Date(b.data).getTime() : 0;
        return da - db;
      });
  }, [data, currentUser, patients]);

  // Set default selected record
  useEffect(() => {
    if (filteredAppointments.length > 0 && !selectedRecordId) {
      setSelectedRecordId(filteredAppointments[0].id);
    }
  }, [filteredAppointments, selectedRecordId]);

  const selectedRecord = useMemo(() => {
    return data.find(r => r.id === selectedRecordId) || null;
  }, [data, selectedRecordId]);

  // Format Helper for printing templates
  const formatTemplate = (text: string, record: any) => {
    if (!record) return text;
    const formattedDate = record.data && isValid(parseISO(record.data))
      ? format(parseISO(record.data), "dd/MM")
      : "N/D";
    return text
      .replace(/{paciente}/g, record.paciente || 'Paciente')
      .replace(/{data}/g, formattedDate)
      .replace(/{horario}/g, record.horario || 'Conforme agendado')
      .replace(/{dentista}/g, record.dentista || 'Dr. Médico')
      .replace(/{procedimento}/g, record.procedimento || 'Procedimento')
      .replace(/{clinica}/g, clinicName);
  };

  // KPI calculations based on current data
  const metrics = useMemo(() => {
    const activeData = currentUser?.role === 'Dentista' ? data.filter(record => {
      const isRecordDentist = record.dentista === currentUser.name;
      const patient = findPatientByRobustMatch(record.paciente, patients);
      const isPatientDentist = patient?.dentistaResponsavel === currentUser.name;
      return isRecordDentist || isPatientDentist;
    }) : data;

    const total = filteredAppointments.length;
    // We can count records with 'confirmationStatus' === 'Confirmado' or record.status === 'Realizado' / Completed
    const confirmed = activeData.filter(r => (r as any).confirmationStatus === 'Confirmado' || r.status === 'Realizado' || r.status === 'Concluído').length;
    const pending = activeData.filter(r => (!(r as any).confirmationStatus || (r as any).confirmationStatus === 'Pendente') && r.status !== 'Cancelado' && r.status !== 'Realizado' && r.status !== 'Concluído').length;
    const cancelled = activeData.filter(r => r.status === 'Cancelado' || (r as any).confirmationStatus === 'Cancelado').length;
    return { total, confirmed, pending, cancelled };
  }, [data, filteredAppointments, currentUser, patients]);

  // Fetch or setup chat history for selected record
  const currentChatMessages = useMemo(() => {
    if (!selectedRecordId || !selectedRecord) return [];
    
    // Default messages
    if (!chats[selectedRecordId]) {
      const defaultMsg = formatTemplate(templates.confirmacao, selectedRecord);
      return [
        {
          id: 'initial',
          text: defaultMsg,
          sender: 'clinic',
          timestamp: 'Enviado às 08:30 (Automático)',
          status: 'delivered'
        }
      ];
    }
    return chats[selectedRecordId];
  }, [selectedRecordId, selectedRecord, chats, templates.confirmacao]);

  // Trigger patient reply simulation
  const handleSimulateResponse = async (type: 'SIM' | 'REAGENDAR' | 'NAO') => {
    if (!selectedRecordId || !selectedRecord) return;

    // 1. Set typing state
    setIsTyping(prev => ({ ...prev, [selectedRecordId]: true }));

    // Outgo/Incoming text structures
    let patientText = "";
    let finalConfirmationStatus = "Pendente";
    let finalAppointmentStatus = selectedRecord.status;
    let aiReplyText = "";

    if (type === 'SIM') {
      patientText = "Sim, está ótimo! Confirmado para amanhã. Obrigado pelo lembrete!";
      finalConfirmationStatus = "Confirmado";
      aiReplyText = "Excelente! Sua consulta está confirmada nos nossos sistemas. Tenha um ótimo dia e até amanhã! 👍😊";
    } else if (type === 'REAGENDAR') {
      patientText = "Olá, infelizmente não vou conseguir ir nesse horário. Conseguimos remarcar para sexta-feira de tarde?";
      finalConfirmationStatus = "Reagendar";
      aiReplyText = "Entendido! O nosso assistente inteligente entrará em contato ou você pode ligar diretamente na clínica para escolhermos o melhor horário. Muito obrigado!";
    } else if (type === 'NAO') {
      patientText = "Infelizmente não poderei comparecer. Favor cancelar ou remarcar para o mês que vem.";
      finalConfirmationStatus = "Cancelado";
      finalAppointmentStatus = "Cancelado";
      aiReplyText = "Sentimos muito! Seu agendamento foi cancelado em nosso sistema. Deseja realizar um novo agendamento no futuro?";
    }

    // Add Simulated delay (1200ms)
    setTimeout(async () => {
      // 1. New dynamic messages
      const patientMsg = {
        id: `patient-${Date.now()}`,
        text: patientText,
        sender: 'patient',
        timestamp: 'Agora mesmo'
      };

      const iaMsg = {
        id: `ia-${Date.now() + 1}`,
        text: aiReplyText,
        sender: 'clinic-ia',
        timestamp: 'Agora mesmo (Auto-resposta)'
      };

      // Set chat messages
      setChats(prev => {
        const currentList = prev[selectedRecordId] || [
          {
            id: 'initial',
            text: formatTemplate(templates.confirmacao, selectedRecord),
            sender: 'clinic',
            timestamp: 'Enviado às 08:30',
            status: 'delivered'
          }
        ];
        return {
          ...prev,
          [selectedRecordId]: [...currentList, patientMsg]
        };
      });

      setIsTyping(prev => ({ ...prev, [selectedRecordId]: false }));

      // Trigger standard Firestore update so it updates real-time
      try {
        await setDoc(doc(db, 'records', selectedRecordId), {
          status: finalAppointmentStatus,
          confirmationStatus: finalConfirmationStatus,
          reminderSent: true,
          reminderSentAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Erro ao registrar confirmação simulada em Firestore:", err);
      }

      // If IA activation is enabled, queue the smart response typing indicator and message
      if (configs.iaCoPilot) {
        setTimeout(() => {
          setChats(prev => ({
            ...prev,
            [selectedRecordId]: [...(prev[selectedRecordId] || []), iaMsg]
          }));
        }, 1000);
      }

    }, 1200);
  };

  const currentConfirmationStatus = selectedRecord ? ((selectedRecord as any).confirmationStatus || 'Pendente') : 'Pendente';

  // Internal WhatsApp proceed simulation
  const proceedWithWhatsApp = (patient: any, record: DentalRecord) => {
    // Guard check: Dentists can only send messages if the patient is linked to them
    if (currentUser?.role === 'Dentista') {
      const isRecordDentist = record.dentista === currentUser.name;
      const isPatientDentist = patient?.dentistaResponsavel === currentUser.name;
      if (!isRecordDentist && !isPatientDentist) {
        alert("Acesso negado: Este paciente não está vinculado ao seu perfil.");
        return;
      }
    }

    const phone = patient.phone || patient.telefone || patient.celular || patient.mobile || patient.contato || '';
    if (!phone) {
      alert(`O paciente "${patient.name}" não tem um telefone cadastrado.\n\nPor favor, adicione seu celular.`);
      return;
    }
    const timeStr = record.horario ? ` às ${record.horario}` : '';
    const dateFormatted = record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), "dd/MM") : "N/D";
    const message = `Olá ${record.paciente}, confirmamos sua consulta de ${record.procedimento} para o dia ${dateFormatted}${timeStr} com ${record.dentista}. Podemos confirmar?`;
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.toString().replace(/\D/g, '');
    let finalPhone = cleanPhone;
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      finalPhone = `55${cleanPhone}`;
    }
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Indicadores KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block">Lembretes Enviados</span>
            <span className="text-2xl font-black text-slate-800">{metrics.total}</span>
            <span className="text-[10px] text-slate-400 block">Agendamentos ativos</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest block">Confirmados via IA/Paciente</span>
            <span className="text-2xl font-black text-emerald-600">{metrics.confirmed}</span>
            <span className="text-[10px] text-slate-400 block">Consultas garantidas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-amber-500 text-[10px] font-bold uppercase tracking-widest block">Aguardando Resposta</span>
            <span className="text-2xl font-black text-amber-600">{metrics.pending}</span>
            <span className="text-[10px] text-slate-400 block">Confirmação pendente</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest block">Cancelados / Desmarcados</span>
            <span className="text-2xl font-black text-rose-600">{metrics.cancelled}</span>
            <span className="text-[10px] text-slate-400 block">Vagas para encaixe</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            type="button"
            onClick={() => setActiveSubTab('status')}
            className={cn(
              "pb-3.5 text-xs font-bold transition-all relative cursor-pointer select-none",
              activeSubTab === 'status' ? "text-brand-cyan" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <span>Central de Confirmações</span>
            {activeSubTab === 'status' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan rounded-full" />}
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={cn(
              "pb-3.5 text-xs font-bold transition-all relative cursor-pointer select-none",
              activeSubTab === 'templates' ? "text-brand-cyan" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <span>Modelos de Mensagem</span>
            {activeSubTab === 'templates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan rounded-full" />}
          </button>

          <button 
            type="button"
            onClick={() => setActiveSubTab('configs')}
            className={cn(
              "pb-3.5 text-xs font-bold transition-all relative cursor-pointer select-none",
              activeSubTab === 'configs' ? "text-brand-cyan" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <span>Configurações & Canais</span>
            {activeSubTab === 'configs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan rounded-full" />}
          </button>
        </div>

        {configs.iaCoPilot && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full text-[10px] font-bold text-brand-cyan">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Co-Pilot IA Ativo</span>
          </div>
        )}
      </div>

      {/* Rendering different sub-tabs */}
      {activeSubTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Appointment list for confirmation */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Próximos Lembretes Automatizados</h3>
              <p className="text-[10px] text-slate-400">Selecione um paciente para simular a resposta dele via WhatsApp no smartphone ao lado.</p>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Não há novos agendamentos ativos na lista de confirmações automáticas.
                </div>
              ) : (
                filteredAppointments.map(record => {
                  const isSelected = record.id === selectedRecordId;
                  const itemStatus = (record as any).confirmationStatus || 'Pendente';
                  
                  return (
                    <div 
                      key={record.id}
                      onClick={() => setSelectedRecordId(record.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 text-left",
                        isSelected 
                          ? "bg-slate-50 border-brand-cyan/30 ring-1 ring-brand-cyan/25" 
                          : "border-slate-100 hover:bg-slate-50/50"
                      )}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 truncate">{record.paciente}</span>
                          <span className={cn(
                            "text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full select-none leading-none",
                            itemStatus === 'Confirmado' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            itemStatus === 'Cancelado' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                            itemStatus === 'Reagendar' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                            "bg-amber-50 text-amber-600 border border-amber-100"
                          )}>
                            {itemStatus}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-600">{record.procedimento}</span>
                          <span className="text-slate-300">•</span>
                          <span>{record.data ? format(parseISO(record.data), "dd/MM/yyyy") : 'N/D'} às {record.horario || 'N/D'}</span>
                          <span className="text-slate-300">•</span>
                          <span>Dr(a). {record.dentista}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const patient = findPatientByRobustMatch(record.paciente, patients);
                            if (patient) proceedWithWhatsApp(patient, record);
                            else alert(`Lembrete disparado para o canal WhatsApp. Aguardando processamento...`);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-lg text-emerald-500 hover:text-emerald-600 transition-all cursor-pointer"
                          title="Enviar Mensagem Manual via Web WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sandbox Interactive Mobile Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {selectedRecord ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Simulador de WhatsApp IA</h4>
                    <p className="text-[9px] text-slate-400">Envie respostas simuladas por parte do paciente.</p>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-bold">Smartphone Mock</span>
                  </div>
                </div>

                {/* Smartphone Box container */}
                <div className="border border-slate-300 rounded-3xl overflow-hidden shadow-lg bg-[#e5ddd5] flex flex-col h-[420px] relative">
                  {/* Whatsapp Client Header */}
                  <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between shrink-0 select-none border-b border-black/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 uppercase flex items-center justify-center shrink-0 border border-white/20 font-sans">
                        {selectedRecord.paciente?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-xs font-bold truncate leading-tight block">{selectedRecord.paciente}</span>
                        <span className="text-[8px] text-emerald-200 leading-normal block font-medium">
                          {isTyping[selectedRecordId!] ? "digitando..." : "online"}
                        </span>
                      </div>
                    </div>
                    {configs.iaCoPilot && (
                      <div className="px-1.5 py-0.5 bg-emerald-400/20 rounded border border-emerald-400/30 text-[7px] tracking-wider uppercase font-extrabold text-emerald-200 animate-pulse leading-none">
                        Co-Pilot Ativo
                      </div>
                    )}
                  </div>

                  {/* Messages Area */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col justify-start">
                    <div className="self-center bg-white/80 text-[8px] text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 select-none border border-black/5 font-sans">
                      Hoje
                    </div>

                    {/* Provedor Homologado Info Box */}
                    <div className="self-center bg-amber-50/95 text-[8px] text-amber-800 font-medium px-3 py-1.5 rounded-lg text-center leading-tight mb-2 max-w-[90%] border border-amber-200/40 shadow-xs font-sans select-none">
                      🔒 Esta conversa ocorre através do seu provedor homologado
                      <strong className="block mt-0.5 text-amber-950">{configs.providerName} ({configs.providerPhone})</strong>
                    </div>

                    {currentChatMessages.map((msg: any) => {
                      const isClinic = msg.sender === 'clinic' || msg.sender === 'clinic-ia';
                      return (
                        <div 
                          key={msg.id || msg.ids}
                          className={cn(
                            "max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-snug relative shadow-sm text-left font-sans animate-in fade-in slide-in-from-bottom-1 duration-150",
                            isClinic 
                              ? "self-end bg-[#dcf8c6] text-slate-800" 
                              : "self-start bg-white text-slate-800"
                          )}
                        >
                          {isClinic && (
                            <span className="text-[7px] text-[#075e54] font-extrabold block mb-1 select-none tracking-wide uppercase border-b border-[#075e54]/10 pb-0.5">
                              {configs.providerName} ({configs.providerPhone})
                            </span>
                          )}
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 select-none">
                            <span className="text-[8px] text-slate-400 font-medium block text-right leading-none">
                              {msg.timestamp}
                            </span>
                            {isClinic && <Check className="w-3 h-3 text-sky-500 shrink-0" />}
                          </div>
                        </div>
                      );
                    })}

                    {isTyping[selectedRecordId!] && (
                      <div className="self-start bg-white max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-snug shadow-sm flex items-center gap-1 text-slate-400 font-sans">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce delay-75">●</span>
                        <span className="animate-bounce delay-150">●</span>
                      </div>
                    )}
                  </div>

                  {/* Real interactive footer input */}
                  <form onSubmit={handleSendClinicMessage} className="bg-[#f0f0f0] border-t border-slate-200 p-2 flex items-center gap-2 shrink-0">
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200 shadow-sm">
                      <input 
                        type="text"
                        placeholder="Digite uma mensagem real..."
                        value={typedMessage}
                        onChange={(e) => setTypedMessage(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400 font-sans"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-8 h-8 rounded-full bg-[#128c7e] text-white flex items-center justify-center hover:bg-[#075e54] transition-all cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Simulated trigger actions */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wide text-left">Simular Ação do Paciente</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => handleSimulateResponse('SIM')}
                      disabled={isTyping[selectedRecordId!] || currentConfirmationStatus === 'Confirmado'}
                      className={cn(
                        "py-2 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-600 rounded-xl font-bold text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer",
                        currentConfirmationStatus === 'Confirmado' && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Responder SIM</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleSimulateResponse('REAGENDAR')}
                      disabled={isTyping[selectedRecordId!] || currentConfirmationStatus === 'Reagendar'}
                      className={cn(
                        "py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer",
                        currentConfirmationStatus === 'Reagendar' && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Pedir Reagenda</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleSimulateResponse('NAO')}
                      disabled={isTyping[selectedRecordId!] || currentConfirmationStatus === 'Cancelado'}
                      className={cn(
                        "py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer",
                        currentConfirmationStatus === 'Cancelado' && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Responder NÃO</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-[400px]">
                <Smartphone className="w-12 h-12 text-slate-200 mb-3" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Nenhum Paciente Selecionado</span>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Selecione um paciente na lista ao lado para abrir o simulador de mensagens instantâneas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Editor block */}
          <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Gerenciador de Modelos Acadêmicos</h3>
              <p className="text-[10px] text-slate-400">Personalize os textos padrões das mensagens. Use as tags na caixa para puxar dados inteligentes.</p>
            </div>

            {/* Template select tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              <button 
                type="button"
                onClick={() => setActiveTemplateTab('confirmacao')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative border cursor-pointer select-none",
                  activeTemplateTab === 'confirmacao' 
                    ? "bg-brand-cyan/10 border-brand-cyan/25 text-brand-cyan font-bold" 
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                )}
              >
                Confirmação de Consulta
              </button>
              
              <button 
                type="button"
                onClick={() => setActiveTemplateTab('retorno')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative border cursor-pointer select-none",
                  activeTemplateTab === 'retorno' 
                    ? "bg-brand-cyan/10 border-brand-cyan/25 text-brand-cyan font-bold" 
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                )}
              >
                Lembrete de Retorno (6M)
              </button>

              <button 
                type="button"
                onClick={() => setActiveTemplateTab('aniversario')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative border cursor-pointer select-none",
                  activeTemplateTab === 'aniversario' 
                    ? "bg-brand-cyan/10 border-brand-cyan/25 text-brand-cyan font-bold" 
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                )}
              >
                Parabéns de Aniversário
              </button>

              <button 
                type="button"
                onClick={() => setActiveTemplateTab('cobranca')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative border cursor-pointer select-none",
                  activeTemplateTab === 'cobranca' 
                    ? "bg-brand-cyan/10 border-brand-cyan/25 text-brand-cyan font-bold" 
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                )}
              >
                Cobrança de Orçamento
              </button>
            </div>

            {/* Textarea fields and helper variable tags */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider text-left">Texto do Modelo</label>
              <textarea 
                rows={5}
                className="w-full text-xs font-sans tracking-wide leading-relaxed border border-slate-200 rounded-xl p-3 shadow-inner focus:ring-1 focus:ring-brand-cyan outline-none resize-none"
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
              />

              {/* Tag Injectors Helper Box */}
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Atalhos de Chaves Inteligentes</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{paciente}', label: 'Nome do Paciente' },
                    { tag: '{data}', label: 'Dia da Consulta' },
                    { tag: '{horario}', label: 'Horário do Lembrete' },
                    { tag: '{dentista}', label: 'Dr(a). da Consulta' },
                    { tag: '{procedimento}', label: 'Procedimento' },
                    { tag: '{clinica}', label: 'Nome de Fantasia' }
                  ].map(item => (
                    <button 
                      type="button"
                      key={item.tag}
                      onClick={() => setTemplateText(prev => prev + item.tag)}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded text-[10px] font-mono text-slate-600 transition-all cursor-pointer select-none"
                      title={`Inserir ${item.label}`}
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>

          {/* Side preview card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Smartphone className="w-4.5 h-4.5 text-brand-cyan" />
                <span className="text-xs font-bold text-slate-800">Visualização de Amostra</span>
              </div>
              <div className="bg-[#e5ddd5] p-3 rounded-2xl min-h-[150px] flex flex-col justify-center border border-slate-200">
                <div className="self-end max-w-[90%] bg-[#dcf8c6] rounded-xl px-2.5 py-1.5 text-[10px] leading-snug shadow-sm">
                  <p className="whitespace-pre-wrap">
                    {formatTemplate(templateText, selectedRecord || (filteredAppointments[0] || null))}
                  </p>
                  <span className="text-[8px] text-slate-400 block text-right mt-1 select-none">Agora</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400">Assim é como o cliente receberá a mensagem pelo canal automatizado selecionado (WhatsApp/SMS).</p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'configs' && (
        <div className="max-w-2xl bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6 text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Canais de Confirmação & Assistência Inteligente</h3>
            <p className="text-[10px] text-slate-400">Habilite, configure e audite disparos automatizados de confirmação odontológica.</p>
          </div>

          <div className="space-y-4">
            {/* Setting Item 1 */}
            <div className="flex items-start justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/40 transition-all gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">Automação de WhatsApp Co-Pilot</span>
                </div>
                <p className="text-[10px] text-slate-400">Dispara lembretes de consultas 24 horas antes do horário marcado coletando dados inteligentes dos agendamentos.</p>
              </div>
              <button 
                type="button"
                onClick={() => handleToggleConfig('autoWhatsapp')}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-all outline-none border cursor-pointer shrink-0 mt-0.5",
                  configs.autoWhatsapp ? "bg-emerald-500 border-emerald-600 flex justify-end" : "bg-slate-100 border-slate-200 flex justify-start"
                )}
              >
                <div className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Setting Item 2 */}
            <div className="flex items-start justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/40 transition-all gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-brand-cyan" />
                  <span className="text-xs font-bold text-slate-700">Assistente IA de Confirmação</span>
                </div>
                <p className="text-[10px] text-slate-400">Permite que a inteligência artificial interprete respostas complexas ("não poderei ir", "posso sim", "quero mudar de dia") e atualize faturamentos e calendários sem necessidade de intervenção humana.</p>
              </div>
              <button 
                type="button"
                onClick={() => handleToggleConfig('iaCoPilot')}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-all outline-none border cursor-pointer shrink-0 mt-0.5",
                  configs.iaCoPilot ? "bg-brand-cyan border-brand-cyan flex justify-end" : "bg-slate-100 border-slate-200 flex justify-start"
                )}
              >
                <div className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Setting Item 3 */}
            <div className="flex items-start justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/40 transition-all gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700">Automação de Backup via SMS Torpedo</span>
                </div>
                <p className="text-[10px] text-slate-400">Ativa o envio de SMS tradicional automático se o cliente não responder ao WhatsApp em até 4 horas.</p>
              </div>
              <button 
                type="button"
                onClick={() => handleToggleConfig('autoSms')}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-all outline-none border cursor-pointer shrink-0 mt-0.5",
                  configs.autoSms ? "bg-indigo-500 border-indigo-600 flex justify-end" : "bg-slate-100 border-slate-200 flex justify-start"
                )}
              >
                <div className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Setting Item 4 */}
            <div className="flex items-start justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/40 transition-all gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-slate-700">Notificações e Lembretes de E-mail</span>
                </div>
                <p className="text-[10px] text-slate-400">Envia lembretes por e-mail com botões inteligentes p/ confirmação instantânea direto do provedor configurado.</p>
              </div>
              <button 
                type="button"
                onClick={() => handleToggleConfig('autoEmail')}
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-all outline-none border cursor-pointer shrink-0 mt-0.5",
                  configs.autoEmail ? "bg-yellow-500 border-yellow-600 flex justify-end" : "bg-slate-100 border-slate-200 flex justify-start"
                )}
              >
                <div className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Provedor Homologado Integrador Section */}
            <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Conexão com Provedor de Mensagens (MB.SISTEMAS)
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">Configure o seu número de contato oficial e nome da sua marca de tecnologia. Essas informações serão mostradas na tela de recebimento do seu cliente final no simulador.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Seu Número de WhatsApp Provedor</label>
                  <input 
                    type="text"
                    value={configs.providerPhone}
                    onChange={(e) => handleUpdateConfigString('providerPhone', e.target.value)}
                    placeholder="Ex: +55 (47) 99347-1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:border-brand-cyan focus:outline-none transition-all placeholder:text-slate-300 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Nome / Marca do Provedor</label>
                  <input 
                    type="text"
                    value={configs.providerName}
                    onChange={(e) => handleUpdateConfigString('providerName', e.target.value)}
                    placeholder="Ex: MB.SISTEMAS"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:border-brand-cyan focus:outline-none transition-all placeholder:text-slate-300 font-sans"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl flex items-start gap-2.5">
                <span className="text-[14px]">📱</span>
                <p className="text-[9.5px] text-emerald-800 leading-relaxed font-medium">
                  <strong>Simulação com Provedor Ativa:</strong> Toda mensagem enviada por esta central de disparo exibirá como remetente oficial a marca <strong className="text-emerald-900">{configs.providerName || 'MB.SISTEMAS'}</strong> de número <strong className="text-emerald-950">{configs.providerPhone || '+55 (47) 99999-9999'}</strong>, oferecendo total credibilidade visual e profissionalismo para demonstrações de venda reais!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecallView({ data, clinicName, patients }: { data: DentalRecord[], clinicName: string, patients: any[] }) {
  const recallList = useMemo(() => {
    const lastVisits: { [key: string]: string } = {};
    data.forEach(r => {
      const rDate = r.data && isValid(parseISO(r.data)) ? parseISO(r.data) : null;
      const lastDateObj = lastVisits[r.paciente] ? parseISO(lastVisits[r.paciente]) : null;

      if (rDate && (!lastDateObj || rDate > lastDateObj)) {
        lastVisits[r.paciente] = r.data;
      }
    });

    const sixMonthsAgo = subMonths(new Date(), 6);
    
    return Object.entries(lastVisits)
      .filter(([_, lastDate]) => lastDate && isValid(parseISO(lastDate)) && parseISO(lastDate) < sixMonthsAgo)
      .map(([name, lastDate]) => {
        const d = parseISO(lastDate);
        return {
          name,
          lastDate,
          monthsAway: Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30))
        };
      })
      .sort((a, b) => b.monthsAway - a.monthsAway);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
            <RotateCcw className="w-6 h-6" />
            Dashboard de Recall (Retorno)
          </h2>
          <p className="text-sm text-emerald-600">Pacientes que não visitam a clínica há mais de 6 meses.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-emerald-700">{recallList.length}</div>
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Oportunidades</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recallList.map((p) => {
          // Resolve patient's actual phone number
          const patObj = patients?.find(pat => pat.name && pat.name.trim().toLowerCase() === p.name.trim().toLowerCase());
          const rawPhone = patObj?.phone || patObj?.telefone || patObj?.celular || patObj?.mobile || '';
          
          return (
            <div key={p.name} className="bg-white border border-slate-200 p-5 rounded-2xl hover:shadow-md transition-all group text-left">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-full">
                  {p.monthsAway} meses ausente
                </span>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{p.name}</h3>
              <p className="text-[10px] text-slate-400 uppercase font-mono mb-4">
                Última consulta: {p.lastDate && isValid(parseISO(p.lastDate)) ? format(parseISO(p.lastDate), 'dd/MM/yyyy') : 'N/D'}
              </p>
              {rawPhone && (
                <p className="text-[10px] text-slate-500 font-mono mb-4 flex items-center gap-1">
                  📞 {rawPhone}
                </p>
              )}
              
              <button 
                onClick={() => {
                  const cleanPhone = rawPhone.replace(/\D/g, '');
                  let finalPhone = cleanPhone;
                  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                    finalPhone = '55' + cleanPhone;
                  }
                  if (!finalPhone) {
                    alert(`O paciente "${p.name}" não possui um número de telefone registrado no cadastro geral.`);
                    return;
                  }
                  const msg = encodeURIComponent(`Olá ${p.name}, aqui é da ${clinicName}! Notamos que faz ${p.monthsAway} meses desde sua última limpeza. Vamos agendar seu retorno?`);
                  window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
                }}
                className="w-full py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chamar no WhatsApp
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentsView({ data, users, currentUser, clinicName, clinicLogo, footerText }: { data: DentalRecord[], users: any[], currentUser: any, clinicName: string, clinicLogo: string | null, footerText: string }) {
  const [docType, setDocType] = useState<'Receita' | 'Atestado'>('Receita');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [content, setContent] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  const patients = useMemo(() => Array.from(new Set(data.map(p => p.paciente))).sort(), [data]);

  const handleGenerate = () => {
    if (!selectedPatient || !content) {
      alert('Preencha o paciente e o conteúdo do documento.');
      return;
    }
    setIsGenerated(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Printer className="w-5 h-5 text-brand-cyan" />
          Gerador de Documentos
        </h2>

        <div className="flex gap-4 p-1 bg-slate-50 rounded-xl">
          <button 
            onClick={() => { setDocType('Receita'); setIsGenerated(false); }}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
              docType === 'Receita' ? "bg-white text-brand-cyan shadow-sm" : "text-slate-400"
            )}
          >
            Receituário
          </button>
          <button 
            onClick={() => { setDocType('Atestado'); setIsGenerated(false); }}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
              docType === 'Atestado' ? "bg-white text-brand-cyan shadow-sm" : "text-slate-400"
            )}
          >
            Atestado Médico
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Paciente</label>
            <select 
              value={selectedPatient}
              onChange={(e) => { setSelectedPatient(e.target.value); setIsGenerated(false); }}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-cyan/20"
            >
              <option value="">Selecione o paciente...</option>
              {patients.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {docType === 'Receita' ? 'Medicação / Posologia' : 'Finalidade / Período'}
            </label>
            <textarea 
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsGenerated(false); }}
              placeholder={docType === 'Receita' ? "Ex: Amoxicilina 500mg - 1 comprimido a cada 8 horas por 7 dias." : "Ex: O paciente necessita de 2 dias de repouso por conta de procedimento cirúrgico."}
              className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-cyan/20 resize-none"
            />
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-brand-cyan transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
        >
          <FileCheck className="w-4 h-4" />
          Gerar Prévia do Documento
        </button>
      </div>

      <div className="relative">
        <div className={cn(
          "bg-white border border-slate-200 shadow-2xl p-10 min-h-[600px] flex flex-col transition-all duration-500",
          !isGenerated ? "opacity-20 blur-sm scale-95 pointer-events-none" : "opacity-100 blur-0 scale-100"
        )}>
          {/* Document Header */}
          <div className="text-center border-b-2 border-slate-100 pb-6 mb-8 flex flex-col items-center">
            {clinicLogo ? (
              <img src={clinicLogo} alt={clinicName} className="h-12 w-auto object-contain mb-2" />
            ) : (
              <Stethoscope className="w-8 h-8 text-brand-cyan mb-2" />
            )}
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">
              {docType === 'Receita' ? 'Receituário Odontológico' : 'Atestado de Comparecimento'}
            </h1>
            <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase">{footerText}</p>
          </div>

          {/* Document Body */}
          <div className="flex-1 font-serif text-slate-700 space-y-8 italic">
            <div className="flex justify-between items-baseline border-b border-slate-50">
              <span className="text-[10px] text-slate-300 uppercase not-italic font-sans">Para:</span>
              <span className="text-lg font-bold text-slate-800">{selectedPatient}</span>
            </div>

            <div className="min-h-[200px] leading-relaxed py-4 whitespace-pre-wrap">
              {content || "O conteúdo do documento aparecerá aqui..."}
            </div>

            <div className="text-right text-[10px] text-slate-400 not-italic font-sans py-10 uppercase tracking-widest">
              São Paulo, {format(new Date(), 'dd \de MMMM \de yyyy', { locale: ptBR })}
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-auto pt-10 flex flex-col items-center">
            <div className="w-48 border-b border-slate-400 mb-2" />
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{currentUser?.name || "Dra. Helena Vieira"}</p>
            <p className="text-[8px] text-slate-400 uppercase">Cirurgiã Dentista</p>
          </div>
          
          <button 
            onClick={() => window.print()}
            className="absolute bottom-4 right-4 p-3 bg-brand-cyan text-white rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
            title="Imprimir"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
        
        {!isGenerated && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-slate-50/50 backdrop-blur-[2px] rounded-3xl">
            <div>
              <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aguardando geração do documento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl transition-all group",
        active 
          ? "bg-brand-cyan text-white shadow-lg shadow-brand-cyan/20" 
          : "text-slate-500 hover:bg-slate-50"
      )}
    >
      <div className={cn(
        "transition-transform group-hover:scale-110",
        active ? "text-white" : "text-slate-400"
      )}>
        {icon}
      </div>
      <span className="text-sm font-bold">{label}</span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
      )}
    </button>
  );
}

function SidebarNavItem({ icon, label, active = false, onClick, isLocked = false }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; isLocked?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold border cursor-pointer select-none text-left",
        active 
          ? "bg-brand-cyan/20 border-brand-cyan/35 text-white font-bold shadow-sm" 
          : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "transition-transform duration-200 shrink-0",
          active ? "scale-105 text-brand-cyan" : "hover:scale-105 text-slate-400"
        )}>
          {icon}
        </div>
        <span className="truncate tracking-wide">{label}</span>
      </div>
      {isLocked && (
        <span className="p-0.5 rounded bg-slate-700/50 text-slate-400 shrink-0 border border-slate-600/30">
          <Lock className="w-2.5 h-2.5 shrink-0" />
        </span>
      )}
    </button>
  );
}

function RibbonItem({ icon, label, active = false, onClick, isLocked = false }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; isLocked?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-1.5 py-1 gap-0.5 border-b-2 transition-all group min-w-[62px] md:min-w-[70px] cursor-pointer relative",
        active 
          ? "border-brand-cyan bg-cyan-50/30 text-brand-cyan" 
          : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      <div className={cn(
        "transition-transform duration-200",
        active ? "scale-105" : "group-hover:scale-105"
      )}>
        {icon}
      </div>
      <span className="text-[8.5px] md:text-[9px] uppercase font-bold tracking-wider leading-none">{label}</span>
      {isLocked && (
        <div className="absolute top-0.5 right-1.5 bg-slate-200 text-slate-500 rounded p-0.5 scale-90 border border-slate-300">
          <Lock className="w-2 h-2" />
        </div>
      )}
    </button>
  );
}

function DashboardView({ 
  filteredData,
  upcomingAppointments = [],
  onSendWhatsApp,
  onSendReminder,
  canSeeFinancials = true,
  users = [],
  onNavigate
}: { 
  filteredData: DentalRecord[];
  upcomingAppointments?: DentalRecord[];
  onSendWhatsApp: (record: DentalRecord) => void;
  onSendReminder: (record: DentalRecord) => void;
  canSeeFinancials?: boolean;
  users?: any[];
  onNavigate?: (page: string, subPage?: string | null) => void;
}) {
  // Get all doctors/dentists
  const doctors = useMemo(() => {
    return users.filter((u: any) => u.role === 'Dentista');
  }, [users]);

  // Metrics
  const metrics = useMemo(() => {
    const activeRecords = filteredData.filter(r => r.status !== 'Cancelado');
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Concluído');
    
    const totalValue = realizedRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
    const uniquePatients = new Set(realizedRecords.map(r => r.paciente).filter(Boolean)).size;
    const realized = realizedRecords.length;
    const scheduled = activeRecords.filter(r => r.status === 'Agendado').length;
    
    const ticketMedio = uniquePatients > 0 ? totalValue / uniquePatients : 0;
    const taxaConversao = (realized + scheduled) > 0 ? realized / (realized + scheduled) : 0;

    return {
      totalValue,
      uniquePatients,
      ticketMedio,
      taxaConversao,
      realized,
      scheduled,
      pending: activeRecords.filter(r => r.status === 'Pendente').length
    };
  }, [filteredData]);

  // Chart Data: Monthly Billing
  const monthlyData = useMemo(() => {
    const months: { [key: string]: number } = {};
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Concluído');
    realizedRecords.slice(0).reverse().forEach(r => {
      if (r.data && isValid(parseISO(r.data))) {
        const month = format(parseISO(r.data), 'MMM', { locale: ptBR });
        months[month] = (months[month] || 0) + (Number(r.valor) || 0);
      }
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Chart Data: Productivity by Dentist
  const dentistProductivity = useMemo(() => {
    const dentists: { [key: string]: number } = {};
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Concluído');
    realizedRecords.forEach(r => {
      const dentista = r.dentista || 'Não definido';
      dentists[dentista] = (dentists[dentista] || 0) + (Number(r.valor) || 0);
    });
    return Object.entries(dentists).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const getFriendlyDate = (dateStr: string) => {
    if (!dateStr || !isValid(parseISO(dateStr))) return '';
    const parsed = parseISO(dateStr);
    if (isToday(parsed)) {
      return 'Hoje';
    }
    const tomorrow = addDays(new Date(), 1);
    const parsedDateStr = format(parsed, 'yyyy-MM-dd');
    const tomorrowDateStr = format(tomorrow, 'yyyy-MM-dd');
    if (parsedDateStr === tomorrowDateStr) {
      return 'Amanhã';
    }
    return format(parsed, 'dd/MM');
  };

  // Chart Data: Procedure Distribution
  const procedureDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Concluído');
    realizedRecords.forEach(r => {
      if (r.procedimento) {
        counts[r.procedimento] = (counts[r.procedimento] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      {/* SECTION 2: Dynamic ERP Quick Action Shortcuts Panel */}
      {onNavigate && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Atalhos Rápidos de Operação</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => onNavigate('Agenda', 'NovoAgendamento')}
              className="p-4 bg-slate-50 hover:bg-brand-cyan/5 border border-slate-150 hover:border-brand-cyan/40 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-brand-cyan/10 flex items-center justify-center border border-slate-200 group-hover:border-transparent transition-all shadow-sm">
                <Calendar className="w-5 h-5 text-brand-cyan group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-brand-cyan uppercase tracking-wider">Novo Agendamento</span>
            </button>

            <button
              onClick={() => onNavigate('Pacientes', 'Cadastrar')}
              className="p-4 bg-slate-50 hover:bg-indigo-500/5 border border-slate-150 hover:border-indigo-500/40 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-indigo-500/10 flex items-center justify-center border border-slate-200 group-hover:border-transparent transition-all shadow-sm">
                <UserPlus className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-indigo-600 uppercase tracking-wider">Cadastrar Paciente</span>
            </button>

            <button
              onClick={() => onNavigate('Pacientes', null)}
              className="p-4 bg-slate-50 hover:bg-violet-500/5 border border-slate-150 hover:border-violet-500/40 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-violet-500/10 flex items-center justify-center border border-slate-200 group-hover:border-transparent transition-all shadow-sm">
                <ClipboardList className="w-5 h-5 text-violet-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-violet-600 uppercase tracking-wider">Prontuários e Fichas</span>
            </button>

            <button
              onClick={() => onNavigate('Estoque', null)}
              className="p-4 bg-slate-50 hover:bg-amber-500/5 border border-slate-150 hover:border-amber-500/40 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-amber-500/10 flex items-center justify-center border border-slate-200 group-hover:border-transparent transition-all shadow-sm">
                <Package className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-amber-600 uppercase tracking-wider">Estoque / Materiais</span>
            </button>

            <button
              onClick={() => onNavigate('Financeiro', null)}
              className="p-4 bg-slate-50 hover:bg-emerald-500/5 border border-slate-150 hover:border-emerald-500/40 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-emerald-500/10 flex items-center justify-center border border-slate-200 group-hover:border-transparent transition-all shadow-sm">
                <DollarSign className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-emerald-600 uppercase tracking-wider">Controle Financeiro</span>
            </button>

            <button
              onClick={() => onNavigate('Mensagens', null)}
              className="p-4 bg-slate-50 hover:bg-pink-500/5 border border-slate-150 hover:border-pink-500/40 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-pink-500/10 flex items-center justify-center border border-slate-200 group-hover:border-transparent transition-all shadow-sm">
                <MessageCircle className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-pink-600 uppercase tracking-wider">SMS / Notificações</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: Multi-dimensional Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {canSeeFinancials ? (
          <>
            <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Receita Faturada</h3>
                  <p className="text-[8px] text-emerald-500 uppercase font-black tracking-wider mt-1">Concluídos e Realizados</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-650 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">
                {formatCurrency(metrics.totalValue)}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-450 font-bold uppercase transition-all">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ticket Médio: <strong className="text-slate-800">{formatCurrency(metrics.ticketMedio)}</strong></span>
              </div>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Fila de Consultas</h3>
                  <p className="text-[8px] text-indigo-500 uppercase font-black tracking-wider mt-1">Status Ativos Hoje</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">
                {(metrics.realized + metrics.scheduled).toString()} <span className="text-xs font-bold text-slate-405 lowercase">consultas</span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-450 font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Atendidos hoje: <strong className="text-slate-800">{metrics.realized}</strong></span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-brand-cyan/45 transition-colors">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-cyan" />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Agenda Geral</h3>
                  <p className="text-[8px] text-brand-cyan uppercase font-black tracking-wider mt-1">Compromissos Faturados</p>
                </div>
                <div className="p-2 bg-cyan-50 text-brand-cyan rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1 text-left">
                {upcomingAppointments.length.toString()} <span className="text-xs font-bold text-slate-405 lowercase">marcadas</span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-450 font-bold uppercase text-left">
                <Info className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                <span>Compromissos futuros na semana</span>
              </div>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-slate-400 transition-colors">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-500" />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Médicos em Atendimento</h3>
                  <p className="text-[8px] text-slate-500 uppercase font-black tracking-wider mt-1">Recursos Humanos Clínicos</p>
                </div>
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1 text-left">
                {doctors.length.toString()} <span className="text-xs font-bold text-slate-405 lowercase">dentistas</span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-450 font-bold uppercase text-left">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Base cadastrada e disponível</span>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Taxa Conversão</h3>
              <p className="text-[8px] text-rose-500 uppercase font-black tracking-wider mt-1">Concluídos vs Total</p>
            </div>
            <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">
            {formatPercent(metrics.taxaConversao)}
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-450 font-bold uppercase">
            <Activity className="w-3.5 h-3.5 text-rose-500" />
            <span>Engajamento: <strong className="text-slate-850">Excelente</strong></span>
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Incompleto / Pendente</h3>
              <p className="text-[8px] text-amber-500 uppercase font-black tracking-wider mt-1">Visitas Pendentes e Recalls</p>
            </div>
            <div className="p-2 bg-amber-50 text-amber-550 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">
            {metrics.pending.toString()} <span className="text-xs font-bold text-slate-405 lowercase">fichas</span>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-450 font-bold uppercase">
            <Bell className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span>Ação: enviar lembretes</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: Real-time Doctors Board (Dolibarr aesthetic) */}
      <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm overflow-hidden text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan shrink-0">
              <Stethoscope className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atendimento Clínico Rápido (Tempo Real)</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Disponibilidade dos cirurgiões dentistas neste momento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl self-start sm:self-center">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Live Sync Ativo</span>
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-300">
            <Users className="w-10 h-10 mb-3 text-slate-200" />
            <p className="text-xs font-black uppercase tracking-widest">Nenhum profissional listado nos cadastros de usuários.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const isBusy = doctor.availability === 'em_atendimento';
              const specialty = doctor.name.match(/ana/i) ? 'Ortodontia Avançada' : 'Cirurgia Geral & Implantes';
              return (
                <div 
                  key={doctor.id} 
                  className={cn(
                    "border rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md duration-300 relative",
                    isBusy 
                      ? "border-cyan-200 bg-sky-50/20" 
                      : "border-slate-250/70 bg-gradient-to-br from-white to-slate-50/30"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm transition-all duration-300",
                      isBusy 
                        ? "bg-brand-cyan text-white border-transparent" 
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      {doctor.name.split(' ').pop()?.charAt(0).toUpperCase() || 'D'}
                    </div>
                    <span className={cn(
                      "absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center",
                      isBusy ? "bg-cyan-500" : "bg-emerald-500"
                    )}>
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="text-sm font-black text-slate-800 leading-tight truncate" title={doctor.name}>{doctor.name}</h3>
                    </div>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5 mb-2">{specialty}</p>
                    
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest py-0.5 px-2 rounded-lg border inline-block",
                      isBusy 
                        ? "bg-cyan-50 text-cyan-600 border-cyan-100" 
                        : "bg-emerald-50/50 text-emerald-600 border-emerald-100/50"
                    )}>
                      {isBusy ? "Consultório Ocupado" : "Livre para Triagem"}
                    </span>

                    {isBusy && doctor.currentPatient && (
                      <p className="text-[10px] text-cyan-700/90 mt-2 font-bold truncate flex items-center gap-1.5 bg-cyan-50/50 px-2 py-1 rounded-xl border border-cyan-100">
                        <User className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span className="truncate">Cadeira: <strong className="font-black text-cyan-800">{doctor.currentPatient}</strong></span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 5: Double Column bento structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        {/* Main Column - Clinical Ledger spreadsheet */}
        <section className={cn(
          "bg-white border border-slate-200 rounded-[32px] overflow-hidden flex flex-col min-h-[460px] shadow-sm",
          !canSeeFinancials ? "lg:col-span-12" : "lg:col-span-8"
        )}>
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-brand-cyan" />
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Registros Clínicos & Financeiros Recentes</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10.5px] font-black bg-brand-cyan/10 text-brand-cyan px-2.5 py-1 rounded-xl uppercase tracking-wider font-mono">
                {filteredData.length} Lançamentos
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <ClipboardList className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum lançamento no histórico.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-[9.5px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Paciente faturado</th>
                    <th className="px-6 py-4 text-center">Fisiologia / Dentista</th>
                    <th className="px-6 py-4">Especialidade / Serviço</th>
                    {canSeeFinancials && <th className="px-6 py-4 text-right">Honorário</th>}
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono text-slate-650 divide-y divide-slate-50">
                  {filteredData.slice(0, 15).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 text-slate-400 font-bold whitespace-nowrap">
                        {record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), 'dd/MM/yyyy') : 'Sem data'}
                      </td>
                      <td className="px-6 py-4 font-sans font-black text-slate-900 whitespace-nowrap uppercase tracking-tighter">
                        {record.paciente}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 font-sans">
                          {record.dentista || 'Clínico'}
                        </span>
                      </td>
                      <td className="px-6 py-4 uppercase tracking-tighter text-[9.5px] font-bold text-slate-500 truncate max-w-[150px]" title={record.procedimento}>
                        {record.procedimento}
                      </td>
                      {canSeeFinancials && (
                        <td className="px-6 py-4 text-right font-black text-slate-800 font-mono whitespace-nowrap">
                          {formatCurrency(record.valor)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onSendWhatsApp(record); }}
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer border border-emerald-200/50"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          {(record.status === 'Agendado' || record.status === 'Pendente') && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onSendReminder(record); }}
                              className="p-1.5 text-slate-400 bg-slate-100 hover:text-brand-cyan hover:bg-cyan-50 rounded-xl border border-slate-200/40 transition-colors cursor-pointer"
                              title="Enviar Lembrete por E-mail"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {onNavigate && (
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estendendo controles com base nas políticas ERP.</span>
              <button 
                onClick={() => onNavigate('Pacientes', null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer active:scale-95 transition-all"
              >
                Gerenciar Fichas
              </button>
            </div>
          )}
        </section>

        {/* Sidebar - Analytics and lists */}
        {canSeeFinancials && (
          <div className="lg:col-span-4 space-y-8 flex flex-col justify-start">
            {/* Widget: Upcoming queue appointments */}
            <section className="bg-white border border-slate-200 rounded-[32px] overflow-hidden flex flex-col h-[380px] shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-cyan" />
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Próximas Consultas</h2>
                </div>
                <span className="text-[9px] font-black bg-brand-cyan/10 text-brand-cyan px-2.5 py-0.5 rounded-lg uppercase tracking-wide">Fila</span>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {upcomingAppointments.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {upcomingAppointments.map((record) => {
                      const friendlyDate = getFriendlyDate(record.data);
                      return (
                        <div key={record.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0e71b8]/5 border border-cyan-100/40 flex items-center justify-center text-brand-cyan font-black text-sm shrink-0">
                              {record.paciente.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 leading-tight truncate">{record.paciente}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8.5px] font-extrabold text-brand-cyan uppercase font-mono tracking-wider bg-cyan-50 border border-cyan-100/50 px-1.5 py-0.5 rounded-md">
                                  {friendlyDate} {record.horario || '--:--'}
                                </span>
                                <span className="text-slate-250 font-bold">•</span>
                                <span className="text-[9.5px] font-bold text-slate-400 uppercase truncate max-w-[110px]" title={record.procedimento}>
                                  {record.procedimento}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <button 
                              onClick={() => onSendWhatsApp(record)}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-emerald-200/40"
                              title="Mensagem Integrada"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center opacity-40">
                    <Calendar className="w-10 h-10 mb-3 text-slate-300 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma visita de urgência ou eletiva.</p>
                  </div>
                )}
              </div>
              
              {onNavigate && (
                <div className="p-3 bg-slate-50 border-t border-slate-200">
                  <button 
                    onClick={() => onNavigate('Agenda', null)}
                    className="w-full py-3 bg-white border border-slate-200 hover:border-brand-cyan rounded-2xl text-[10px] font-black text-slate-500 hover:text-brand-cyan uppercase tracking-widest transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Ver Agenda Completa
                  </button>
                </div>
              )}
            </section>

            {/* Widget: Procedure distribution Mix */}
            <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Procedimentos Praticados</h2>
                  <Activity className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-4 leading-normal">Distribuição das evoluções concluídas</p>
                
                {procedureDistribution.length === 0 ? (
                  <div className="h-[140px] flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-wider">Aguardando dados...</div>
                ) : (
                  <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie 
                          data={procedureDistribution} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={35} 
                          outerRadius={55} 
                          paddingAngle={3} 
                          dataKey="value"
                        >
                          {procedureDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
                {procedureDistribution.slice(0, 3).map((entry, i) => (
                  <div key={entry.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-slate-700">
                      <span className="text-[10px] font-bold uppercase truncate max-w-[140px] text-slate-500">{entry.name}</span>
                      <span className="text-[10px] font-black">{Math.round((entry.value / Math.max(1, filteredData.length)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full transition-all rounded-full" 
                        style={{ 
                          backgroundColor: COLORS[i % COLORS.length], 
                          width: `${(entry.value / Math.max(1, filteredData.length)) * 105}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Widget: Growth trend billing */}
            <section className="bg-white p-6 border border-slate-200 rounded-[32px] shadow-sm h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Evolução Mensal</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Faturamento</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-6">Mapeamento linear do caixa</p>
                
                {monthlyData.length === 0 ? (
                  <div className="h-[210px] flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-wider">Aguardando dados...</div>
                ) : (
                  <div className="h-[210px]">
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9.5, fill: '#94a3b8', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9.5, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} 
                          formatter={(val: number) => [formatCurrency(val), 'Faturamento']} 
                        />
                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>

            {/* Widget: Dentist Performance comparative chart */}
            <section className="bg-white p-6 border border-slate-200 rounded-[32px] shadow-sm h-[320px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Metas por Dentista</h2>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-6">Comparativo de produção em R$</p>
                
                {dentistProductivity.length === 0 ? (
                  <div className="h-[170px] flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-wider">Aguardando dados...</div>
                ) : (
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height={170}>
                      <BarChart data={dentistProductivity} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: '#1e293b', fontWeight: 800 }} width={80} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }} 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                          formatter={(val: number) => [formatCurrency(val), 'Produção']} 
                        />
                        <Bar dataKey="value" barSize={10} radius={[0, 4, 4, 0]}>
                          {dentistProductivity.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientsView({ 
  data, 
  patients,
  onOpenChart, 
  onOpenEdit, 
  onDelete,
  onAdd,
  onViewDetail,
  currentUserRole,
  canSeeFinancials = true
}: { 
  data: DentalRecord[]; 
  patients: any[];
  onOpenChart: (id: string) => void;
  onOpenEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onViewDetail: (p: any) => void;
  currentUserRole?: string;
  canSeeFinancials?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const itemsPerPage = viewMode === 'list' ? 8 : 12;

  const canDelete = currentUserRole?.toLowerCase() === 'admin' || currentUserRole?.toLowerCase() === 'dentista';

  const allPatients = useMemo(() => {
    return (patients || []).filter(p => p && typeof p === 'object').map(pat => {
      const patientName = pat.name || 'Paciente Sem Nome';
      const patientRecords = (data || []).filter(r => r && r.paciente === patientName);
      const totalSpent = patientRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
      const sortedByDate = [...patientRecords]
        .filter(r => r && r.data && isValid(parseISO(r.data)))
        .sort((a,b) => {
          try {
            return parseISO(b.data).getTime() - parseISO(a.data).getTime();
          } catch(e) { return 0; }
        });

      const lastVisit = sortedByDate.length > 0 
        ? sortedByDate[0].data 
        : pat.createdAt || pat.dataCadastro || new Date().toISOString();
      
      return {
        id: pat.id,
        name: patientName,
        lastVisit,
        totalSpent,
        proceduresCount: patientRecords.length,
        ...pat
      };
    });
  }, [data, patients]);

  const filteredPatients = useMemo(() => {
    return allPatients
      .filter(p => 
        (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (p.cpf || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (p.email || '').toLowerCase().includes((searchTerm || '').toLowerCase())
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allPatients, searchTerm]);

  const stats = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000;
    const monthStart = startOfMonth(now);
    
    return {
      total: allPatients.length,
      active: allPatients.filter(p => {
        if (!p.lastVisit) return false;
        const d = parseISO(p.lastVisit);
        return isValid(d) && d.getTime() > sixMonthsAgo;
      }).length,
      newThisMonth: allPatients.filter(p => {
        const d = parseISO(p.createdAt || p.dataCadastro || new Date().toISOString());
        if (!isValid(d)) return false;
        try {
          return isWithinInterval(d, { start: monthStart, end: now });
        } catch (e) {
          return false;
        }
      }).length
    };
  }, [allPatients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-brand-cyan', 'bg-rose-500'];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 text-left">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultados e Ações</h2>
          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Gestão unificada de fichas de pacientes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 border border-slate-200 rounded-2xl shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'list' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 bg-brand-cyan text-white px-6 py-3 font-bold text-[10px] uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-slate-900 transition-all shadow-lg shadow-brand-cyan/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Novo Paciente
          </button>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total cadastrados', value: stats.total, icon: Users, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5', trend: '+12% este mês' },
          { label: 'Em tratamento', value: stats.active, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50', trend: 'Ativos' },
          { label: 'Novos registros', value: stats.newThisMonth, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', trend: 'Meta: 80%' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">{stat.trend}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar - Floating Style */}
      <div className="relative group">
        <Search className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-brand-cyan transition-colors" />
        <input 
          type="text"
          placeholder="Pesquisar por nome, CPF ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-brand-cyan/10 focus:border-brand-cyan outline-none rounded-2xl transition-all shadow-sm"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-5 py-4">Última Visita</th>
                    <th className="px-5 py-4 text-center">Atendimentos</th>
                    {canSeeFinancials && <th className="px-5 py-4 text-right">Total</th>}
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentPatients.length > 0 ? (
                    currentPatients.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-slate-100",
                              getAvatarColor(p.name || '')
                            )}>
                              {(p.name || '?').charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <button 
                                onClick={() => onViewDetail(p)}
                                className="text-left group/name"
                              >
                                <span className="font-sans font-bold text-slate-800 text-sm hover:text-brand-cyan transition-colors">{p.name}</span>
                              </button>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium text-slate-400">{p.cpf || 'Sem CPF'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-slate-600">
                            {p.lastVisit && isValid(parseISO(p.lastVisit)) 
                              ? format(parseISO(p.lastVisit), "dd/MM/yyyy") 
                              : '---'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                            {p.proceduresCount}
                          </div>
                        </td>
                        {canSeeFinancials && (
                          <td className="px-5 py-4 text-right">
                            <span className="font-bold text-slate-700 text-sm">{formatCurrency(p.totalSpent)}</span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => onOpenChart(p.id)}
                              className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-tight rounded-lg hover:bg-brand-cyan transition-all"
                            >
                              Prontuário
                            </button>
                            <button 
                              onClick={() => onOpenEdit(p.id)}
                              className="p-2 text-slate-400 hover:text-brand-cyan hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <p className="text-sm font-medium text-slate-400">Nenhum paciente encontrado.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full"
          >
            {currentPatients.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentPatients.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow ring-1 ring-slate-100",
                        getAvatarColor(p.name || '')
                      )}>
                        {(p.name || '?').charAt(0)}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => onOpenEdit(p.id)}
                          className="p-1.5 text-slate-400 hover:text-brand-cyan transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button 
                            onClick={() => onDelete(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight mb-0.5 truncate">{p.name}</h3>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{p.cpf || 'Sem CPF'}</p>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Última</p>
                          <p className="text-[10px] font-bold text-slate-600 truncate">
                            {p.lastVisit && isValid(parseISO(p.lastVisit)) ? format(parseISO(p.lastVisit), 'dd/MM/yy') : '--'}
                          </p>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Total</p>
                          <p className="text-[10px] font-bold text-slate-600">{p.proceduresCount}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => onOpenChart(p.id)}
                        className="w-full py-2.5 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-brand-cyan transition-all shadow-sm"
                      >
                        Prontuário
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-400">Nenhum resultado.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Pagination Overlay */}
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-lg max-w-xl mx-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
          Pág. <span className="text-brand-cyan">{currentPage}</span> / {totalPages || 1}
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30 hover:border-brand-cyan hover:text-brand-cyan transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30 hover:border-brand-cyan hover:text-brand-cyan transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 text-[10px] font-bold text-slate-300 uppercase tracking-tight hidden sm:block">
          {filteredPatients.length} TOTAL
        </div>
      </div>
    </div>
  );
}

function AgendaView({ 
  data, 
  fullData,
  onAdd, 
  onStart, 
  onFinish, 
  onCancel,
  onSendReminder,
  onSendWhatsApp,
  onEditEmail
}: { 
  data: DentalRecord[]; 
  fullData: DentalRecord[];
  onAdd: () => void; 
  onStart: (id: string) => void; 
  onFinish: (id: string) => void; 
  onCancel: (id: string) => void;
  onSendReminder: (record: DentalRecord) => void;
  onSendWhatsApp: (record: DentalRecord) => void;
  onEditEmail: (record: DentalRecord) => void;
}) {
  const todayStr = useMemo(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }, []);

  // Atuais: agendamentos de hoje (inclusive realizados) ou de datas passadas que ainda estão pendentes
  const currentApts = useMemo(() => {
    return data
      .filter(r => {
        if (r.data === todayStr) {
          return r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento' || r.status === 'Realizado' || r.status === 'Concluído';
        }
        return r.data < todayStr && (r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento');
      })
      .sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return (a.horario || '00:00').localeCompare(b.horario || '00:00');
      });
  }, [data, todayStr]);

  // Próximos agendamentos: agendamentos futuros
  const upcomingApts = useMemo(() => {
    return data
      .filter(r => r.data > todayStr && (r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento'))
      .sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.horario || '00:00'}`).getTime();
        const dateB = new Date(`${b.data}T${b.horario || '00:00'}`).getTime();
        return dateA - dateB;
      });
  }, [data, todayStr]);

  const cancelled = fullData.filter(r => r.status === 'Cancelado').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const renderAppointmentCard = (apt: DentalRecord) => (
    <div key={apt.id} className={cn(
      "border p-3 rounded flex gap-3 items-start relative hover:border-brand-cyan transition-all group",
      apt.status === 'Em Atendimento' ? "bg-cyan-50/50 border-brand-cyan shadow-sm" : 
      (apt.status === 'Realizado' || apt.status === 'Concluído') ? "bg-emerald-50/20 border-emerald-100 opacity-80" : "bg-slate-50/50 border-slate-100"
    )}>
      <div className="bg-white p-2 border border-slate-100 rounded text-center min-w-[55px] shadow-sm flex flex-col items-center">
        <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
          {apt.data && isValid(parseISO(apt.data)) ? format(parseISO(apt.data), 'MMM', { locale: ptBR }) : '...'}
        </div>
        <div className="text-base font-black text-slate-800 leading-none my-0.5">
          {apt.data && isValid(parseISO(apt.data)) ? format(parseISO(apt.data), 'dd') : '-'}
        </div>
        <div className={cn(
          "text-[9px] font-bold px-1 rounded-sm mt-1 ring-1",
          (apt.status === 'Realizado' || apt.status === 'Concluído') 
            ? "bg-emerald-100/15 text-emerald-600 ring-emerald-500/20" 
            : "bg-brand-cyan/10 text-brand-cyan ring-brand-cyan/20"
        )}>
          {apt.horario || '--:--'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900 truncate">{apt.paciente}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">{apt.procedimento}</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] bg-white px-1.5 border border-slate-100 rounded text-slate-400 font-bold">{apt.dentista}</span>
          <StatusBadge status={apt.status} />
          {(apt.status !== 'Realizado' && apt.status !== 'Concluído') && (
            <>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onSendWhatsApp(apt); }}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-all cursor-pointer shadow-sm border border-emerald-100/50 active:scale-95 z-10"
                title="Enviar Lembrete por WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 pointer-events-none" />
              </button>
              <button 
                onClick={() => onSendReminder(apt)}
                className={cn(
                  "p-1.5 transition-all rounded-full cursor-pointer border shadow-sm active:scale-95",
                  (apt as any).reminderSent 
                    ? "text-emerald-600 border-emerald-100 bg-emerald-50" 
                    : "text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-brand-cyan"
                )}
                title={(apt as any).reminderSent ? `E-mail enviado em: ${new Date((apt as any).reminderSentAt).toLocaleString()}` : "Enviar Lembrete por E-mail"}
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onEditEmail(apt)}
                className="p-1.5 text-slate-400 hover:text-brand-cyan hover:bg-slate-50 rounded-full transition-all cursor-pointer border border-slate-100 shadow-sm active:scale-95"
                title="Cadastrar/Editar E-mail do Paciente"
              >
                <MailOpen className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {apt.status === 'Em Atendimento' ? (
            <button 
              onClick={() => onFinish(apt.id)}
              className="flex-1 bg-emerald-500 text-white text-[9px] font-bold uppercase py-1 rounded hover:bg-emerald-600 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Finalizar Atendimento
            </button>
          ) : (apt.status === 'Realizado' || apt.status === 'Concluído') ? (
            <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Atendimento Concluído
            </div>
          ) : (
            <>
              <button 
                onClick={() => onStart(apt.id)}
                className="flex-1 bg-brand-cyan/10 hover:bg-brand-cyan hover:text-white text-brand-cyan text-[9px] font-bold uppercase py-1 rounded transition-colors cursor-pointer"
              >
                Iniciar
              </button>
              <button 
                onClick={() => onCancel(apt.id)}
                className="flex-1 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 text-[9px] font-bold uppercase py-1 rounded transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
      {(apt.status !== 'Realizado' && apt.status !== 'Concluído') && (
        <button className="text-slate-300 hover:text-brand-cyan cursor-pointer"><MoreVertical className="w-4 h-4" /></button>
      )}
    </div>
  );

  return (
    <section className="bg-white border border-slate-200 overflow-hidden flex flex-col rounded-3xl shadow-sm">
      {/* HEADER PRINCIPAL DA AGENDA */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-brand-cyan" />
          <div>
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">
              Agenda do Sistema
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Controle e acompanhamento de consultas diárias e futuras</p>
          </div>
        </div>
        <button 
          onClick={onAdd}
          className="text-xs bg-slate-900 text-white px-4 py-2 font-black rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-sm active:scale-95"
        >
          Novo Agendamento
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* SEÇÃO 1: AGENDAMENTOS ATUAIS & HOJE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Agendamentos Atuais e Pendentes ({currentApts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentApts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Abaixo, nenhum agendamento hoje ou pendências.
              </div>
            ) : (
              currentApts.map(renderAppointmentCard)
            )}
          </div>
        </div>

        {/* SEÇÃO 2: PRÓXIMOS AGENDAMENTOS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-brand-cyan" />
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Próximos Agendamentos ({upcomingApts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingApts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Nenhum agendamento marcado para os próximos dias.
              </div>
            ) : (
              upcomingApts.slice(0, 24).map(renderAppointmentCard)
            )}
          </div>
        </div>
      </div>

      {cancelled.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-6">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cancelados Recentemente</h3>
          <div className="flex flex-wrap gap-2">
            {cancelled.slice(0, 5).map(c => (
              <div key={c.id} className="bg-white border border-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-2 opacity-60">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                <span className="text-[10px] font-semibold text-slate-600">{c.paciente}</span>
                <span className="text-[8px] text-slate-400 font-mono">
                  ({c.data && isValid(parseISO(c.data)) ? format(parseISO(c.data), 'dd/MM') : '--/--'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FinanceView({ data, patients, onUpdatePayment }: { data: DentalRecord[]; patients: any[]; onUpdatePayment: (id: string, status: any) => void }) {
  const [selectedReceipt, setSelectedReceipt] = useState<DentalRecord | null>(null);
  
  const stats = useMemo(() => {
    const paid = data.filter(r => r.statusPagamento === 'Pago').reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const pending = data.filter(r => r.statusPagamento === 'Pendente').reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const overdue = data.filter(r => r.statusPagamento === 'Atrasado').reduce((s, r) => s + (Number(r.valor) || 0), 0);
    return { paid, pending, overdue };
  }, [data]);

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;
    
    const originalContent = document.body.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow) {
      printWindow.document.write('<html><head><title>Recibo</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
        body { font-family: "Inter", sans-serif; padding: 40px; color: #334155; }
        .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #0891b2; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 800; color: #0891b2; }
        .receipt-title { font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #1e293b; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
        .info-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
        .info-value { font-size: 14px; font-weight: 600; color: #334155; }
        .main-content { background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .amount-section { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
        .amount-label { font-size: 16px; font-weight: 700; color: #64748b; }
        .amount-value { font-size: 24px; font-weight: 800; color: #0891b2; }
        .signature-section { margin-top: 60px; display: flex; flex-direction: column; align-items: center; }
        .signature-line { width: 300px; border-top: 1px solid #334155; margin-bottom: 8px; }
        .signature-text { font-size: 12px; color: #64748b; }
        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
        @media print {
          body { padding: 0; }
          .receipt-container { border: none; padding: 0; }
        }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Recebido</div>
          <div className="text-2xl font-mono font-bold text-slate-800 mt-1">{formatCurrency(stats.paid)}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Pendente</div>
          <div className="text-2xl font-mono font-bold text-slate-800 mt-1">{formatCurrency(stats.pending)}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Atrasado</div>
          <div className="text-2xl font-mono font-bold text-slate-800 mt-1">{formatCurrency(stats.overdue)}</div>
        </div>
      </div>
      
      <section className="bg-white border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Controle de Pagamentos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Procedimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status Pagamento</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono text-slate-600">
              {data.slice(0, 15).map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-sans font-medium text-slate-900">{r.paciente}</td>
                  <td className="px-4 py-3">{r.procedimento}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(r.valor)}</td>
                  <td className="px-4 py-3 text-center">
                    <select 
                      value={r.statusPagamento}
                      onChange={(e) => onUpdatePayment(r.id, e.target.value)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold outline-none cursor-pointer border",
                        r.statusPagamento === 'Pago' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        r.statusPagamento === 'Pendente' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-rose-50 text-rose-600 border-rose-100"
                      )}
                    >
                      <option value="Pago">Pago</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => setSelectedReceipt(r)}
                      disabled={r.statusPagamento !== 'Pago'}
                      className={cn(
                        "text-[10px] underline font-sans cursor-pointer hover:font-bold transition-all",
                        r.statusPagamento === 'Pago' ? "text-brand-cyan" : "text-slate-300 pointer-events-none"
                      )}
                    >
                      Ver Recibo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-cyan/10 rounded-xl">
                    <Printer className="w-5 h-5 text-brand-cyan" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">Visualização do Recibo</h3>
                </div>
                <button onClick={() => setSelectedReceipt(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-10">
                <div id="receipt-content" className="bg-white">
                  <div className="receipt-container border border-slate-200 rounded-2xl p-10 max-h-[60vh] overflow-y-auto">
                    <div className="header flex justify-between items-start border-bottom pb-6 mb-8">
                       <div className="logo text-brand-cyan font-extrabold text-2xl tracking-tighter">CLINIC<span className="text-slate-800">DENT</span></div>
                       <div className="receipt-title text-3xl font-black text-slate-900 leading-none">RECIBO</div>
                    </div>

                    <div className="info-grid grid grid-cols-2 gap-8 mb-10">
                       <div>
                         <p className="info-label text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Paciente</p>
                         <p className="info-value text-sm font-bold text-slate-800">{selectedReceipt.paciente}</p>
                         {patients.find(p => p.name === selectedReceipt.paciente)?.cpf && (
                           <p className="text-[10px] text-slate-400 font-mono mt-1">CPF: {patients.find(p => p.name === selectedReceipt.paciente)?.cpf}</p>
                         )}
                       </div>
                       <div className="text-right">
                         <p className="info-label text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</p>
                         <p className="info-value text-sm font-bold text-slate-800">{selectedReceipt.data ? format(parseISO(selectedReceipt.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'N/A'}</p>
                       </div>
                    </div>

                    <div className="main-content bg-slate-50/50 rounded-2xl p-8 mb-8 border border-slate-100">
                       <p className="text-slate-600 text-sm leading-relaxed">
                         Recebemos de <strong className="text-slate-900">{selectedReceipt.paciente}</strong>, 
                         a importância de <strong className="text-brand-cyan">{formatCurrency(selectedReceipt.valor)}</strong>, 
                         referente aos serviços odontológicos de: <strong className="text-slate-800">{selectedReceipt.procedimento}</strong>, 
                         realizado pelo profissional <strong className="text-slate-800">{selectedReceipt.dentista}</strong>.
                       </p>
                       
                       <div className="amount-section mt-10 pt-6 border-t border-slate-200 flex justify-between items-center">
                          <span className="amount-label text-sm font-bold text-slate-400 uppercase tracking-widest">Valor Total</span>
                          <span className="amount-value text-3xl font-black text-brand-cyan">{formatCurrency(selectedReceipt.valor)}</span>
                       </div>
                    </div>

                    <div className="signature-section pt-10 flex flex-col items-center">
                       <div className="signature-line w-64 border-t-2 border-slate-200 mb-2"></div>
                       <p className="signature-text text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Assinatura Responsável</p>
                    </div>

                    <div className="footer mt-10 pt-6 border-t border-slate-50 text-[10px] text-slate-400 text-center uppercase tracking-widest">
                       Este recibo é um documento digital gerado em {new Date().toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => setSelectedReceipt(null)}
                    className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="flex-1 py-4 bg-brand-cyan text-white font-bold uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-brand-cyan/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Recibo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamView({ data, users, currentUser, onViewAgenda, onDeleteUser }: { data: DentalRecord[]; users: any[]; currentUser: any; onViewAgenda: (name: string) => void; onDeleteUser?: (id: string) => void }) {
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const team = useMemo(() => {
    // Only include users who are Dentists or Admins (doctors)
    const doctors = users.filter(u => u.role === 'Dentista' || u.role === 'Admin');
    
    // Total statistics for the provided data
    const statsByDoctor: { [key: string]: { revenue: number, procedures: number, patients: Set<string> } } = {};
    data.forEach(r => {
      if (!statsByDoctor[r.dentista]) {
        statsByDoctor[r.dentista] = { revenue: 0, procedures: 0, patients: new Set() };
      }
      statsByDoctor[r.dentista].revenue += r.valor;
      statsByDoctor[r.dentista].procedures += 1;
      statsByDoctor[r.dentista].patients.add(r.paciente);
    });

    return doctors.map(user => {
      const stats = statsByDoctor[user.name] || { revenue: 0, procedures: 0, patients: new Set() };
      return { 
        name: user.name, 
        id: user.id,
        revenue: stats.revenue,
        procedures: stats.procedures,
        patientCount: stats.patients.size,
        specialty: (user.role === 'Admin' || user.name.includes('Ana')) ? 'Ortodontia' : 'Clínica Geral',
        availability: user.availability || 'disponivel',
        currentPatient: user.currentPatient
      };
    });
  }, [data, users]);

  const canSeeFullStats = currentUser?.role === 'Admin';

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {team.map((member) => (
        <div key={member.id} className="bg-white border border-slate-200 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
          {member.availability === 'em_atendimento' && (
            <div className="absolute top-0 right-0 px-3 py-1 bg-brand-cyan text-white text-[8px] font-black uppercase tracking-widest shadow-sm">
              Em Atendimento
            </div>
          )}
          
          <div className="w-20 h-20 rounded shadow-inner bg-slate-50 flex items-center justify-center text-2xl font-bold border border-slate-100 flex-shrink-0 relative">
             <span className="text-slate-300">{member.name.split(' ')[member.name.split(' ').length - 1][0]}</span>
             <div className={cn(
               "absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-white",
               member.availability === 'em_atendimento' ? "bg-brand-cyan transition-colors" : "bg-emerald-500 transition-colors"
             )} />
          </div>
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-[10px] text-brand-cyan uppercase font-bold tracking-widest">{member.specialty}</p>
                  <span className="text-slate-300">•</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    member.availability === 'em_atendimento' ? "text-brand-cyan" : "text-emerald-500"
                  )}>
                    {member.availability === 'em_atendimento' ? `Atendendo: ${member.currentPatient}` : 'Médico Liberado'}
                  </span>
                </div>
              </div>
              {canSeeFullStats && (
                <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline uppercase cursor-pointer">Desempenho</button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
              <div>
                <div className="text-[8px] text-slate-400 uppercase font-black">Produção</div>
                <div className={cn("text-sm font-mono font-bold", canSeeFullStats ? "text-slate-800" : "text-slate-300 select-none")}>
                  {canSeeFullStats || currentUser?.name === member.name ? formatCurrency(member.revenue) : '***'}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-slate-400 uppercase font-black">Procedimentos</div>
                <div className={cn("text-sm font-mono font-bold", canSeeFullStats ? "text-slate-800" : "text-slate-300 select-none")}>
                  {canSeeFullStats || currentUser?.name === member.name ? member.procedures : '***'}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-slate-400 uppercase font-black">Pacientes</div>
                <div className={cn("text-sm font-mono font-bold", canSeeFullStats ? "text-slate-800" : "text-slate-300 select-none")}>
                  {canSeeFullStats || currentUser?.name === member.name ? member.patientCount : '***'}
                </div>
              </div>
            </div>
            
            {(canSeeFullStats || currentUser?.name === member.name) && (
              <div className="mt-6 flex flex-wrap gap-2">
                 <button 
                  onClick={() => onViewAgenda(member.name)}
                  className="flex-1 bg-slate-50 py-1.5 text-[9px] font-bold uppercase text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer min-w-[80px]"
                 >
                   Agenda
                 </button>
                 <button className="flex-1 bg-slate-50 py-1.5 text-[9px] font-bold uppercase text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer min-w-[80px]">Comissões</button>
                 {currentUser?.role === 'Admin' && onDeleteUser && (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (onDeleteUser) setUserToDelete(member);
                     }}
                     className="p-1.5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 transition-all rounded px-3"
                     title="Excluir Médico"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

      <AnimatePresence>
        {userToDelete && (
          <ConfirmUserDeleteModal 
            user={userToDelete}
            onCancel={() => setUserToDelete(null)}
            onConfirm={async () => {
              const id = userToDelete.id;
              setUserToDelete(null);
              if (onDeleteUser) await onDeleteUser(id);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function BackupView({ data, patients, users, documents, clinicName, onRestore }: { data: any[]; patients: any[]; users: any[]; documents: any[]; clinicName: string; onRestore: (data: any) => Promise<void> }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const backupData = {
        clinicName,
        exportDate: new Date().toISOString(),
        records: data,
        patients,
        users,
        documents,
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${clinicName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar backup:", error);
      alert("Erro ao gerar o arquivo de backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "ATENÇÃO: A restauração de backup irá mesclar os dados do arquivo com os dados atuais. Deseja prosseguir?"
    );

    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        if (!backupData.records || !backupData.patients) {
          throw new Error("Arquivo de backup inválido ou incompatível.");
        }

        await onRestore(backupData);
        alert("Backup restaurado com sucesso!");
      } catch (err: any) {
        console.error("Erro ao restaurar backup:", err);
        alert("Erro ao processar o arquivo: " + err.message);
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-20">
      <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck className="w-32 h-32 text-brand-cyan" />
        </div>

        <div className="space-y-2 border-b border-slate-100 pb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-cyan" />
            Backup de Segurança
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Exporte todos os dados da sua clínica para um arquivo seguro ou restaure dados de um backup anterior.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pacientes</div>
            <div className="text-2xl font-bold text-slate-800">{patients.length}</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registros</div>
            <div className="text-2xl font-bold text-slate-800">{data.length}</div>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleExport}
            disabled={isExporting || isRestoring}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-brand-cyan transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Processando Backup...' : 'Gerar Arquivo de Backup (.json)'}
          </button>

          <div className="relative">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || isRestoring}
              className="w-full py-4 bg-white border-2 border-dashed border-slate-200 text-slate-500 font-bold rounded-2xl hover:border-brand-cyan hover:text-brand-cyan transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isRestoring ? 'Restaurando...' : 'Restaurar de um Arquivo'}
            </button>
          </div>
        </div>

        <div className="bg-brand-cyan/5 border border-brand-cyan/20 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-brand-cyan uppercase tracking-widest flex items-center gap-2">
            <Info className="w-4 h-4" />
            Informações Importantes
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>Recomendamos realizar backups antes de grandes mudanças.</li>
            <li>A restauração adiciona dados novos, mas não remove os atuais.</li>
            <li>Backup inclui: Pacientes, Agenda, Financeiro e Documentos.</li>
          </ul>
        </div>

        <p className="text-[10px] text-slate-400 text-center italic">
          O arquivo é processado localmente. Seus dados estão seguros.
        </p>
      </div>
    </div>
  );
}



function SettingsView({ 
  clinicName, 
  clinicLogo,
  footerText,
  providerPhone,
  providerName,
  onUpdateSettings, 
  onResetDatabase,
  isAdmin,
  deferredPrompt,
  onInstallPWA
}: { 
  clinicName: string; 
  clinicLogo: string | null;
  footerText: string;
  providerPhone: string;
  providerName: string;
  onUpdateSettings: (updates: { clinicName?: string; clinicLogo?: string | null; footerText?: string; providerPhone?: string; providerName?: string }) => Promise<void>;
  onResetDatabase?: () => Promise<void>;
  isAdmin?: boolean;
  deferredPrompt: any;
  onInstallPWA: () => void;
}) {
  const [localClinicName, setLocalClinicName] = useState(clinicName);
  const [localFooterText, setLocalFooterText] = useState(footerText);
  const [localLogo, setLocalLogo] = useState<string | null>(clinicLogo);
  const [localProviderPhone, setLocalProviderPhone] = useState(providerPhone);
  const [localProviderName, setLocalProviderName] = useState(providerName);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'clinic' | 'branding' | 'integrations' | 'pwa' | 'finance'>('clinic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setLocalClinicName(clinicName);
    setLocalFooterText(footerText);
    setLocalLogo(clinicLogo);
    setLocalProviderPhone(providerPhone);
    setLocalProviderName(providerName);
  }, [clinicName, footerText, clinicLogo, providerPhone, providerName]);

  // Check for unsaved changes
  useEffect(() => {
    const isChanged = 
      localClinicName !== clinicName ||
      localFooterText !== footerText ||
      localLogo !== clinicLogo ||
      localProviderPhone !== providerPhone ||
      localProviderName !== providerName;
    setHasUnsavedChanges(isChanged);
  }, [localClinicName, localFooterText, localLogo, localProviderPhone, localProviderName, clinicName, footerText, clinicLogo, providerPhone, providerName]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert("A imagem deve ter no máximo 500KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        clinicName: localClinicName,
        clinicLogo: localLogo,
        footerText: localFooterText,
        providerPhone: localProviderPhone,
        providerName: localProviderName
      });
      alert('Configurações salvas com sucesso!');
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert('Erro ao salvar as configurações. Verifique suas permissões.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm("Deseja realmente restaurar os valores padrão locais?")) {
      setLocalClinicName(clinicName);
      setLocalFooterText(footerText);
      setLocalLogo(clinicLogo);
      setLocalProviderPhone(providerPhone);
      setLocalProviderName(providerName);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl max-w-5xl mx-auto shadow-sm overflow-hidden flex flex-col min-h-[580px]">
      {/* Header com indicador de alterações salvas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 p-6 md:p-8 gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Configurações do Sistema</h2>
            <span className="text-[9px] font-mono bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">v2.4.0-build</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Configure as preferências da clínica, branding visual, integradores de mensagens e aplicativo.</p>
        </div>

        {hasUnsavedChanges && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Alterações Pendentes
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar Abas de Configuração */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/30 p-4 shrink-0">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('clinic')}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all w-full text-left shrink-0",
                activeSubTab === 'clinic' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span>Clínica & Unidade</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('branding')}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all w-full text-left shrink-0",
                activeSubTab === 'branding' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Identidade Visual</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('integrations')}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all w-full text-left shrink-0",
                activeSubTab === 'integrations' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Mensageria & Zap</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('finance')}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all w-full text-left shrink-0",
                activeSubTab === 'finance' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Faturamento</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('pwa')}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all w-full text-left shrink-0",
                activeSubTab === 'pwa' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>Aplicativo (PWA)</span>
            </button>
          </nav>
        </div>

        {/* Painel do Conteúdo Ativo */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between min-h-[420px]">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {activeSubTab === 'clinic' && (
                <motion.div
                  key="clinic"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 text-left"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider">Preferências da Clínica</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure o nome institucional e informações de rodapé de relatórios e documentos.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Nome da Clínica</label>
                      <input 
                        type="text" 
                        value={localClinicName} 
                        onChange={(e) => setLocalClinicName(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan transition-all text-slate-800 font-semibold shadow-inner" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Informações Institucionais / Rodapé</label>
                      <textarea 
                        value={localFooterText}
                        onChange={(e) => setLocalFooterText(e.target.value)}
                        placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP | Tel: (11) 9999-9999 | CRO-SP 123456"
                        className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan min-h-[100px] resize-none text-slate-800 shadow-inner leading-relaxed"
                      />
                      <p className="text-[9px] text-slate-400 italic">Essas informações aparecerão no rodapé da plataforma e em todos os documentos gerados pelo sistema.</p>
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Endereço Principal</label>
                      <input 
                        type="text" 
                        defaultValue="Av. Paulista, 1000 - São Paulo, SP" 
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/30 outline-none text-slate-500" 
                        readOnly
                      />
                      <p className="text-[9px] text-slate-400">Entre em contato com suporte se precisar alterar o endereço cadastrado da matriz.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSubTab === 'branding' && (
                <motion.div
                  key="branding"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 text-left"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider">Identidade Visual & Marca</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Carregue a marca oficial e mude a assinatura corporativa que aparece nos cabeçalhos.</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-6 space-y-4">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block font-semibold">Logotipo da Clínica</label>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="w-24 h-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {localLogo ? (
                            <img src={localLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                          ) : (
                            <ImagePlus className="w-8 h-8 text-slate-300" />
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="bg-slate-900 border border-slate-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer hover:bg-brand-cyan hover:border-brand-cyan transition-all shadow-sm active:scale-95">
                              Fazer Upload do Logo
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                            {localLogo && (
                              <button 
                                type="button"
                                onClick={() => setLocalLogo(null)}
                                className="text-rose-500 border border-rose-200/30 hover:border-rose-250 bg-rose-500/5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                              >
                                Remover Logotipo
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                            Formato recomendado: <strong className="text-slate-700 font-bold font-semibold">PNG transparente</strong> ou <strong className="text-slate-700 font-bold font-semibold">SVG</strong>.<br />
                            Tamanho ideal sugerido: proporção retangular de 300x80px. Limite máximo: <strong className="text-slate-700 font-semibold font-bold">500KB</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSubTab === 'integrations' && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 text-left"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Mensageria & WhatsApp Webhook
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure o número emissor de notificações automáticas de consultas e lembretes para os pacientes.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Meu Número de Zap Emissor</label>
                        <input 
                          type="text" 
                          value={localProviderPhone} 
                          onChange={(e) => setLocalProviderPhone(e.target.value)}
                          placeholder="Ex: +55 (47) 99999-9999"
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan transition-all font-mono text-slate-800 shadow-inner" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Nome / Marca do Provedor</label>
                        <input 
                          type="text" 
                          value={localProviderName} 
                          onChange={(e) => setLocalProviderName(e.target.value)}
                          placeholder="Ex: MB.SISTEMAS"
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan transition-all font-sans text-slate-800 shadow-inner" 
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3 mt-2">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wide">Integração Ativa e Homologada</h4>
                        <p className="text-[10px] text-slate-600 font-medium leading-normal mt-1">
                          A confirmação rápida via chatbot e API de lembretes em lote utilizará estas credenciais registradas para interagir com seus pacientes.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSubTab === 'finance' && (
                <motion.div
                  key="finance"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 text-left"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider">Preferências Financeiras</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure moedas padrão, regras de auditorias e faturamento automatizado.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Moeda Padrão</label>
                      <select className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700">
                        <option>Real Brasileiro - BRL (R$)</option>
                        <option>Dólar Americano - USD ($)</option>
                        <option>Euro - EUR (€)</option>
                      </select>
                    </div>

                    <div className="border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-0.5">
                        <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider block">Recibo Automático</label>
                        <span className="text-[9px] text-slate-400 font-medium font-semibold">Emitir rascunho de recibo ao receber pagamentos</span>
                      </div>
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="w-4 h-4 rounded text-brand-cyan focus:ring-brand-cyan border-slate-300 accent-brand-cyan shrink-0 cursor-pointer" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSubTab === 'pwa' && (
                <motion.div
                  key="pwa"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6 text-left"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider">Progressive Web App (PWA)</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Transforme seu OdontoDash em um sistema de desktop executado nativamente fora do navegador.</p>
                  </div>

                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      Ao instalar, o aplicativo funciona em seu próprio contêiner otimizado, criando atalhos na tela de início, oferecendo suporte a notificações nativas e carregando em frações de segundos.
                    </p>
                    
                    <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl text-[10px] text-amber-850 flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <strong className="font-bold">Observação Importante:</strong><br />
                        Para instalar, você não pode estar utilizando o visualizador em sandbox. Clique em "Abrir em nova aba" ou use o link público compartilhado para habilitar o sinal de PWA no seu navegador Chrome/Edge.
                      </div>
                    </div>

                    <div className="pt-2">
                      {deferredPrompt ? (
                        <button 
                          onClick={onInstallPWA}
                          className="bg-brand-cyan hover:bg-cyan-600 text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                          <Monitor className="w-4 h-4" />
                          Instalar OdontoDash App
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400/80">
                          <ShieldCheck className="w-4 h-4 text-slate-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pendente de sinalização do navegador (já instalado)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Toolbar */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 mt-8 bg-slate-50/30 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-6">
            <button 
              type="button"
              onClick={handleRestoreDefaults}
              className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:underline px-2.5 py-1.5 transition-all"
            >
              Restaurar Padrões Locais
            </button>
            <div className="flex gap-2">
              <button 
                type="button"
                disabled={isSaving || !hasUnsavedChanges}
                onClick={handleSave}
                className={cn(
                  "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm",
                  hasUnsavedChanges 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ patient, onConfirm, onCancel }: { patient: any, onConfirm: () => void, onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 text-slate-900">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-[210] border border-rose-100 p-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir Paciente?</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Tem certeza que deseja excluir permanentemente o cadastro de <span className="font-bold text-slate-800">{patient?.name}</span>? 
            Esta ação não pode ser desfeita e removerá todos os históricos associados.
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 text-slate-500 font-bold bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-rose-200 cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PatientDetailModal({ patient, onClose, onDelete, currentUserRole, canSeeSensitive = true }: { patient: any; onClose: () => void; onDelete?: (id: string) => void; currentUserRole?: string; canSeeSensitive?: boolean }) {
  if (!patient) return null;

  const canDelete = currentUserRole?.toLowerCase() === 'admin' || currentUserRole?.toLowerCase() === 'dentista';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-white/50"
      >
        {/* Header Section */}
        <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
          {/* Animated Background Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/20 rounded-full blur-[80px] -mr-32 -mt-32" />
          
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-2xl transition-all z-20 group"
          >
            <X className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </button>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-28 h-28 bg-gradient-to-br from-brand-cyan to-brand-cyan/40 rounded-[32px] flex items-center justify-center border-4 border-white/10 shrink-0 shadow-2xl shadow-brand-cyan/20">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} className="w-full h-full rounded-[32px] object-cover" />
              ) : (
                <User className="w-14 h-14 text-white" />
              )}
            </div>
            <div className="text-center md:text-left">
              <div className="flex flex-col mb-4">
                <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-[0.2em] mb-1">Perfil do Paciente</span>
                <h2 className="text-3xl font-bold text-white tracking-tight leading-none">{patient.name}</h2>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="text-[9px] bg-white/10 text-white/70 font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/5">
                  ID: {patient.id?.slice(-8).toUpperCase() || 'NO-ID'}
                </span>
                <span className={cn(
                  "text-[9px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-2 border",
                  patient.status === 'Ativo' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", patient.status === 'Ativo' ? "bg-emerald-400" : "bg-rose-400")} />
                  {patient.status || 'Inativo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Telefone de Contato</p>
                  <p className="text-sm font-medium text-slate-700 tracking-tight">{patient.phone || patient.telefone || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Última Consulta</p>
                  <p className="text-sm font-medium text-slate-700">
                    {patient.lastVisit && isValid(parseISO(patient.lastVisit)) ? format(parseISO(patient.lastVisit), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Nenhuma visita registrada'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">E-mail Corporativo/Pessoal</p>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{patient.email || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-5 text-brand-cyan bg-brand-cyan/5 p-5 rounded-3xl border border-brand-cyan/10">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 opacity-60">Próximo Agendamento</p>
                  <p className={cn(
                    "text-sm font-bold",
                    patient.nextAppt && isValid(parseISO(patient.nextAppt)) ? "text-brand-cyan" : "text-slate-400"
                  )}>
                    {patient.nextAppt && isValid(parseISO(patient.nextAppt)) ? format(parseISO(patient.nextAppt), "dd/MM/yyyy 'às' HH:mm") : 'Sem agendamentos'}
                  </p>
                  {patient.nextAppt && <p className="text-[9px] font-bold mt-1 opacity-50 uppercase tracking-tight">Sincronizado com Agenda Google</p>}
                </div>
              </div>

              <div className="flex items-start gap-5 pl-5">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Dentista Responsável</p>
                  <p className="text-sm font-medium text-slate-700">{patient.dentist || 'Não vinculado'}</p>
                </div>
              </div>

              {canSeeSensitive && (
                <div className="flex items-start gap-5 pl-5">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Documento Identificador (CPF)</p>
                    <p className="text-sm font-medium text-slate-700 font-mono tracking-wider">{patient.cpf || 'Não informado'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <div className="flex gap-4 flex-1">
              <button 
                onClick={onClose}
                className="flex-1 py-4 text-slate-500 font-semibold border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-[10px] uppercase tracking-[0.2em] shadow-sm"
              >
                Voltar
              </button>
              {onDelete && canDelete && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!patient.id) {
                      alert("Não foi possível excluir o paciente: ID ausente.");
                      return;
                    }
                    onDelete(patient.id);
                  }}
                  className="flex-1 py-4 bg-rose-50 text-rose-500 font-semibold border-2 border-rose-50 rounded-2xl hover:bg-rose-100 hover:border-rose-100 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                onClose();
                if ((patient as any).onEditAction) {
                  (patient as any).onEditAction(patient.id || patient.name);
                }
              }}
              className="flex-1 py-4 bg-brand-cyan text-white font-semibold rounded-2xl hover:bg-slate-900 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-brand-cyan/20 active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4" />
              Editar Cadastro
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OdontogramView({ patientName, currentUser }: { patientName: string; currentUser?: any }) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    const docId = patientName.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, 'odontograms', docId);
    
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setTeethData(docSnap.data().teethData || {});
      }
      setLoading(false);
    }, (error) => {
      console.error("Error syncing odontogram:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [patientName]);

  const updateFirestore = async (newData: Record<number, any>) => {
    const docId = patientName.toLowerCase().replace(/\s+/g, '-');
    try {
      await setDoc(doc(db, 'odontograms', docId), {
        patientName,
        teethData: newData,
        lastUpdatedBy: currentUser?.name || 'Sistema',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving tooth status:", e);
    }
  };

  const toggleToothStatus = (num: number, status: string) => {
    const newStatus = teethData[num]?.status === status ? null : status;
    const newData = {
      ...teethData,
      [num]: { ...teethData[num], status: newStatus, updatedAt: new Date().toISOString() }
    };
    setTeethData(newData);
    updateFirestore(newData);
  };

  const updateToothNotes = (num: number, notes: string) => {
    const newData = {
      ...teethData,
      [num]: { ...teethData[num], notes, updatedAt: new Date().toISOString() }
    };
    setTeethData(newData);
    updateFirestore(newData);
  };

  const teethNumbersUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const teethNumbersLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const getToothColor = (num: number) => {
    const status = teethData[num]?.status;
    if (status === 'cárie') return 'fill-rose-500 stroke-rose-600';
    if (status === 'restaurado') return 'fill-brand-cyan stroke-cyan-600';
    if (status === 'extraído') return 'fill-slate-200 stroke-slate-300 opacity-30';
    if (status === 'hígido') return 'fill-emerald-500 stroke-emerald-600';
    return 'fill-white stroke-slate-300 hover:fill-slate-50';
  };

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
      <p className="text-[10px] font-bold uppercase tracking-widest">Carregando Histórico Dental...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-cyan" />
            Odontograma Interativo
          </h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Status Clínico: <span className="text-brand-cyan">Dentição Permanente</span></p>
        </div>
        <div className="flex gap-2">
          {['Cárie', 'Restaurado', 'Extraído'].map(s => (
            <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl">
              <div className={cn(
                "w-3 h-3 rounded-full",
                s === 'Cárie' ? 'bg-rose-500' : s === 'Restaurado' ? 'bg-brand-cyan' : 'bg-slate-200'
              )} />
              <span className="text-[9px] font-bold text-slate-500 uppercase">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
        
        <div className="relative space-y-16 overflow-x-auto pb-4">
          {/* Arcada Superior */}
          <div className="flex justify-center gap-2 md:gap-4 lg:gap-6 min-w-max px-4">
            {teethNumbersUpper.map(num => (
              <div 
                key={num}
                onClick={() => setSelectedTooth(num)}
                className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-110",
                  selectedTooth === num ? "scale-110" : "scale-100"
                )}
              >
                <span className="text-[9px] font-black text-slate-400 font-mono">{num}</span>
                <svg width="32" height="40" viewBox="0 0 32 40" className="drop-shadow-sm">
                  <path 
                    d="M6 10C6 4.47715 10.4772 0 16 0C21.5228 0 26 4.47715 26 10V25C26 33.2843 19.2843 40 11 40H21C12.7157 40 6 33.2843 6 25V10Z" 
                    className={cn("transition-colors duration-300", getToothColor(num))}
                    strokeWidth="2"
                  />
                  <path d="M12 10 L20 10 L20 18 L12 18 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
                </svg>
              </div>
            ))}
          </div>

          <div className="w-full h-px bg-slate-100 flex items-center justify-center">
            <span className="bg-white px-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Linha Oclusal</span>
          </div>

          {/* Arcada Inferior */}
          <div className="flex justify-center gap-2 md:gap-4 lg:gap-6 min-w-max px-4">
            {teethNumbersLower.map(num => (
              <div 
                key={num}
                onClick={() => setSelectedTooth(num)}
                className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-110",
                  selectedTooth === num ? "scale-110" : "scale-100"
                )}
              >
                <span className="text-[9px] font-black text-slate-400 font-mono">{num}</span>
                <svg width="32" height="40" viewBox="0 0 32 40" className="drop-shadow-sm">
                  <path 
                    d="M6 10C6 4.47715 10.4772 0 16 0C21.5228 0 26 4.47715 26 10V25C26 33.2843 19.2843 40 11 40H21C12.7157 40 6 33.2843 6 25V10Z" 
                    className={cn("transition-colors duration-300", getToothColor(num))}
                    strokeWidth="2"
                  />
                  <path d="M12 10 L20 10 L20 18 L12 18 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 rounded-[32px] p-8 text-white">
          {selectedTooth ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black">
                  {selectedTooth}
                </div>
                <button onClick={() => setSelectedTooth(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <h4 className="text-lg font-black mb-1">Dente {selectedTooth}</h4>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Procedimentos e Status</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'cárie', label: 'Marcar Cárie', color: 'bg-rose-500' },
                  { id: 'restaurado', label: 'Restauração', color: 'bg-brand-cyan' },
                  { id: 'extraído', label: 'Extraído/Ausente', color: 'bg-slate-400' },
                  { id: 'hígido', label: 'Dente Hígido', color: 'bg-emerald-500' }
                ].map(action => (
                  <button 
                    key={action.id}
                    onClick={() => toggleToothStatus(selectedTooth, action.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center justify-between group transition-all",
                      teethData[selectedTooth]?.status === action.id 
                        ? "bg-white text-slate-900 scale-105" 
                        : "bg-white/5 hover:bg-white/10 text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", action.color)} />
                      <span className="text-xs font-bold uppercase tracking-tight">{action.label}</span>
                    </div>
                    {teethData[selectedTooth]?.status === action.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Observação Clínica</p>
                <textarea 
                  value={teethData[selectedTooth]?.notes || ''}
                  onChange={(e) => updateToothNotes(selectedTooth, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-cyan/50 resize-none h-20"
                  placeholder="Descreva observações específicas para este dente..."
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center opacity-40">
              <Activity className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold">Selecione um dente no gráfico para ver detalhes e editar status.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-brand-cyan" />
              Histórico de Procedimentos por Dente
            </h4>
            <div className="space-y-4">
              {Object.entries(teethData).filter(([_, d]: [any, any]) => d.status).length > 0 ? (
                Object.entries(teethData)
                  .filter(([_, d]: [any, any]) => d.status)
                  .map(([num, data]: [any, any]) => (
                  <div key={num} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400">
                        {num}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 capitalize">{data.status || 'Hígido'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {data.updatedAt && isValid(parseISO(data.updatedAt)) ? `Atualizado em ${format(parseISO(data.updatedAt), 'dd/MM/yyyy HH:mm')}` : 'Sem data'}
                        </p>
                        {data.notes && <p className="text-[10px] text-brand-cyan mt-1 italic">"{data.notes}"</p>}
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-brand-cyan">
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-400 font-bold uppercase">Nenhuma alteração registrada recentemente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MedicalChartView({ 
  patientName, 
  patientId,
  data, 
  onBack,
  onAddRecord,
  onAddPatient,
  onAddAppointment,
  onUpdatePatient,
  onAddCertificate,
  onAddPrescription,
  onUpdateAnamnesis,
  patients,
  documents,
  onDeleteDocument,
  onUploadDocument,
  currentUser,
  canSeeClinical = true
}: { 
  patientName: string; 
  patientId?: string;
  data: DentalRecord[]; 
  onBack: () => void;
  onAddRecord: (p: string) => void;
  onAddPatient: () => void;
  onAddAppointment: (p?: string) => void;
  onUpdatePatient: (id: string) => void;
  onAddCertificate: (p: string) => void;
  onAddPrescription: (p: string) => void;
  onUpdateAnamnesis: (p: string) => void;
  patients: any[];
  documents: any[];
  onDeleteDocument: (id: string) => void;
  onUploadDocument: (doc: any) => Promise<boolean>;
  currentUser: any;
  canSeeClinical?: boolean;
}) {
  const [showPlanDetails, setShowPlanDetails] = useState<any | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState<any | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // New Plan State
  const [newPlan, setNewPlan] = useState({
    title: '',
    items: [] as { procedure: string, price: number, teeth?: string }[],
  });

  const availableProcedures = [
    { name: 'Limpeza e Profilaxia', price: 250 },
    { name: 'Restauração em Resina', price: 350 },
    { name: 'Extração Simples', price: 400 },
    { name: 'Tratamento de Canal', price: 1200 },
    { name: 'Coroa em E-max', price: 2200 },
    { name: 'Implante Dentário', price: 3500 },
    { name: 'Clareamento Dental', price: 800 },
  ];

  const patient = patients.find(p => p.id === (patientId || patientName) || p.name === patientName) || { name: patientName, id: patientId || patientName };
  const patientHistory = data.filter(r => r.paciente === patient.id || r.paciente === patient.name);
  const anamnesis = patient.anamnesis || {};
  
  const galleryDocs = documents.filter(doc => (doc.type === 'Exame' || doc.type === 'Pasta') && (doc.folderId === currentFolderId));
  const currentFolder = currentFolderId ? documents.find(d => d.id === currentFolderId) : null;

  const nextAppt = useMemo(() => {
    return data
      .filter(r => (r.paciente === patient.id || r.paciente === patient.name) && r.status === 'Agendado' && r.data && isValid(parseISO(r.data)) && parseISO(r.data) >= new Date())
      .sort((a,b) => {
        const dateA = parseISO(a.data);
        const dateB = parseISO(b.data);
        return dateA.getTime() - dateB.getTime();
      })[0];
  }, [data, patient.id, patient.name]);

  const patientData = useMemo(() => {
    const birthDate = patient.birthdate ? new Date(patient.birthdate) : null;
    const isValidBirthDate = birthDate && isValid(birthDate);

    return {
      name: patient.name || patientName,
      age: isValidBirthDate ? `${differenceInYears(new Date(), birthDate)} anos` : "Idade não informada",
      birthdate: isValidBirthDate ? format(birthDate, 'dd/MM/yyyy') : "N/D",
      phone: patient.phone || patient.telefone || patient.celular || "Não informado",
      status: patient.status || "Ativo"
    };
  }, [patient, patientName]);

  const navItems = [
    { id: 'Resumo', icon: LayoutDashboard },
    { id: 'Odontograma', icon: ClipboardList },
    { id: 'Anamnese', icon: FileText, hidden: !canSeeClinical },
    { id: 'Evolução', icon: Edit, hidden: !canSeeClinical },
    { id: 'Documentos', icon: FileText },
    { id: 'Imagens', icon: ImageIcon },
    { id: 'Planos de Tratamento', icon: ClipboardList, hidden: !canSeeClinical },
    { id: 'Orçamentos', icon: CreditCard, hidden: !canSeeClinical },
    { id: 'Histórico', icon: History }
  ].filter(item => !item.hidden);

  const [activeTab, setActiveTab] = useState(navItems[0].id);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Top Header/Bar for Prontuario */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 leading-none mb-1 flex items-center gap-2">
              Prontuário Digital: <span className="text-brand-cyan font-semibold">{patientName}</span>
              <button 
                onClick={() => onUpdatePatient(patient.id || patientName)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-cyan transition-colors"
                title="Editar Dados do Paciente"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-widest">Sessão Ativa</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
             <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Dentista Responsável</p>
             <p className="text-xs font-semibold text-slate-700">Dr. Pedro Silva</p>
           </div>
           <div className="w-px h-8 bg-slate-200" />
           <button 
             onClick={() => onAddAppointment(patientName)}
             className="flex items-center gap-2 px-4 py-2 bg-brand-cyan text-white text-[10px] font-semibold uppercase rounded-xl shadow-lg shadow-brand-cyan/20 hover:scale-[1.02] active:scale-95 transition-all"
           >
             <Plus className="w-3 h-3" />
             Nova Consulta
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {showPlanDetails && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-300">
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{showPlanDetails.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{showPlanDetails.date}</p>
                  </div>
                  <button onClick={() => setShowPlanDetails(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Procedimentos Incluídos</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-sm font-bold text-slate-700">Restauração em Resina (Posterior)</span>
                      <span className="text-sm font-semibold text-slate-900">R$ 1.500,00</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-sm font-bold text-slate-700">Gengivectomia Localizada</span>
                      <span className="text-sm font-semibold text-slate-900">R$ 800,00</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-sm font-bold text-slate-700">Coroa Total E-max</span>
                      <span className="text-sm font-semibold text-slate-900">R$ 2.200,00</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-900 rounded-3xl text-white">
                  <span className="text-xs font-semibold uppercase tracking-widest opacity-60">Valor Total do Plano</span>
                  <span className="text-2xl font-bold">{formatCurrency(showPlanDetails.total)}</span>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => {
                       alert(`Enviando orçamento para: ${patientName}`);
                       setShowPlanDetails(null);
                     }}
                     className="flex-1 py-4 bg-brand-cyan text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-cyan/30 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Enviar via WhatsApp
                   </button>
                   <button 
                     onClick={() => setShowPlanDetails(null)}
                     className="px-8 py-4 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-colors"
                   >
                     Fechar
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showBudgetModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-300 border-t-8 border-brand-cyan">
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-cyan font-bold text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-brand-cyan/20">
                      $
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">Orçamento Gerado</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">{showBudgetModal.title}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBudgetModal(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-[32px] p-8 space-y-6">
                   <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                     <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Paciente</span>
                     <span className="text-sm font-medium text-slate-800">{patientName}</span>
                   </div>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center">
                       <span className="text-sm font-bold text-slate-500">Subtotal</span>
                       <span className="text-sm font-bold text-slate-800">{formatCurrency(showBudgetModal.total)}</span>
                     </div>
                     <div className="flex justify-between items-center text-emerald-600">
                       <span className="text-sm font-bold">Desconto à vista (10%)</span>
                       <span className="text-sm font-bold">-{formatCurrency(showBudgetModal.total * 0.1)}</span>
                     </div>
                   </div>
                   <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Valor Final</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(showBudgetModal.total * 0.9)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Parcelamento</p>
                        <p className="text-sm font-bold text-slate-600">12x de {formatCurrency(showBudgetModal.total / 12)}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => {
                        window.print();
                        setShowBudgetModal(null);
                     }}
                     className="flex items-center justify-center gap-3 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
                   >
                     <Download className="w-4 h-4" />
                     Imprimir PDF
                   </button>
                   <button 
                     onClick={() => {
                       alert(`Link de pagamento enviado para o WhatsApp de ${patientName}`);
                       setShowBudgetModal(null);
                     }}
                     className="flex items-center justify-center gap-3 py-4 bg-brand-cyan text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-cyan/30 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     <MessageCircle className="w-4 h-4" />
                     Enviar WhatsApp
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Sidebar Navigation */}
        <div className="w-20 md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
          <div className="flex-1 overflow-y-auto py-8 px-3 md:px-6 space-y-2 no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
              >
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-brand-cyan/10 blur-xl"
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110 shrink-0",
                  activeTab === item.id ? "text-brand-cyan" : "text-slate-300"
                )} />
                <span className="hidden md:block text-[10px] font-semibold uppercase tracking-[0.15em] relative z-10 transition-colors">
                  {item.id}
                </span>
                {activeTab === item.id && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-cyan rounded-l-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm hidden md:block">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <Activity className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Alerta Crítico</p>
              </div>
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                {anamnesis.allergies ? `Alergia: ${anamnesis.allergies}` : "Nenhuma alergia medicamentosa reportada."}
              </p>
            </div>
            <div className="md:hidden flex justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 space-y-12 bg-slate-50/30 scroll-smooth">
          {activeTab === 'Resumo' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Patient Banner */}
              <div className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                
                <div className="w-32 h-32 bg-slate-50 rounded-[32px] flex items-center justify-center border-4 border-white shadow-xl relative z-10">
                  <User className="w-14 h-14 text-slate-200" />
                </div>

                <div className="flex-1 text-center md:text-left relative z-10">
                  <div className="flex flex-col mb-4">
                    <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-[0.2em] mb-1">Ficha Clínica Principal</span>
                    <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-none">{patientData.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Idade</span>
                      <span className="text-xs font-medium text-slate-700">{patientData.age}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Nascimento</span>
                      <span className="text-xs font-medium text-slate-700">{patientData.birthdate}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Telefone</span>
                      <span className="text-xs font-medium text-slate-700">{patientData.phone}</span>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-full text-[9px] font-semibold uppercase tracking-widest border flex items-center gap-2",
                      patientData.status === 'Ativo' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", patientData.status === 'Ativo' ? "bg-emerald-500" : "bg-slate-400")} />
                      {patientData.status}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => onUpdatePatient(patient.id || patientName)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all shadow-sm">
                     <Edit3 className="w-5 h-5" />
                   </button>
                   <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all shadow-sm">
                     <Share2 className="w-5 h-5" />
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Valor em Tratamento', value: formatCurrency(patientHistory.reduce((s, r) => s + (Number(r.valor) || 0), 0)), icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Visitas ao Consultório', value: patientHistory.length, icon: History, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5', border: 'border-brand-cyan/10' },
                  { label: 'Score de Fidelidade', value: '8.9', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { label: 'Status Global', value: 'Saudável', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' }
                ].map((stat, i) => (
                  <div key={i} className={cn("bg-white p-8 rounded-[32px] border shadow-sm flex flex-col items-start gap-5 group hover:scale-[1.02] transition-all", stat.border)}>
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", stat.bg)}>
                      <stat.icon className={cn("w-7 h-7", stat.color)} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-[40px] shadow-sm p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-widest mb-1">Linha do Tempo</span>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        Atividades Recentes
                      </h3>
                    </div>
                    <button className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hover:text-brand-cyan transition-colors">Ver Histórico Completo</button>
                  </div>

                  <div className="space-y-6 relative">
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100" />
                    
                    {patientHistory.slice(0, 4).length > 0 ? (
                      patientHistory.slice(0, 4).map((rec, idx) => (
                        <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-3xl transition-all relative z-10 group">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <div className={cn("w-2 h-2 rounded-full", idx === 0 ? "bg-brand-cyan animate-pulse" : "bg-slate-300")} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{rec.procedimento}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                                <span>{rec.data && isValid(parseISO(rec.data)) ? format(parseISO(rec.data), 'dd/MM/yyyy') : 'Sem data'}</span>
                                <span>•</span>
                                <span>{rec.dentista}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-900">{formatCurrency(rec.valor)}</span>
                            <StatusBadge status={rec.status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                         <History className="w-12 h-12 mb-4" />
                         <p className="text-sm font-bold uppercase tracking-widest">Nenhuma atividade registrada</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[40px] shadow-2xl p-10 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/20 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-brand-cyan/30 transition-all duration-700" />
                  
                  <div className="relative z-10 mt-auto">
                    <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/10">
                      <Calendar className="w-8 h-8 text-brand-cyan" />
                    </div>
                    
                    <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-[0.3em] mb-2 block">Gestão de Agenda</span>
                    <h4 className="text-2xl font-bold text-white tracking-tight mb-8">
                      {nextAppt ? "Próxima Visita" : "Aguardando Agendamento"}
                    </h4>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 backdrop-blur-sm">
                      {nextAppt ? (
                        <div className="space-y-4">
                           <div>
                             <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-1">Data e Horário</p>
                             <p className="text-lg font-bold text-white">
                                {nextAppt.data && isValid(parseISO(nextAppt.data)) 
                                  ? format(parseISO(nextAppt.data), "dd/MM/yyyy 'às' HH:mm") 
                                  : 'Data não informada'}
                              </p>
                           </div>
                           <div>
                             <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-1">Serviço Programado</p>
                             <p className="text-sm font-bold text-white/80">{nextAppt.procedimento}</p>
                           </div>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-white/40 italic">O paciente ainda não possui novas consultas programadas.</p>
                      )}
                    </div>

                    <button 
                      onClick={() => onAddAppointment(patientName)}
                      className="w-full py-5 bg-brand-cyan text-white text-[10px] font-semibold uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-brand-cyan/40 hover:bg-white hover:text-slate-900 transition-all active:scale-95"
                    >
                      {nextAppt ? "Reagendar Consulta" : "Agendar Agora"}
                    </button>
                    {nextAppt && (
                      <button className="w-full mt-4 py-4 text-white/40 text-[9px] font-semibold uppercase tracking-widest hover:text-white transition-colors">
                        Cancelar Agendamento
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Odontograma' && (
            <OdontogramView patientName={patientName} currentUser={currentUser} />
          )}

          {activeTab === 'Anamnese' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="xl:col-span-8 bg-white border border-slate-200 rounded-[32px] shadow-sm p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-brand-cyan/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand-cyan" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-[0.15em]">Anamnese Completa</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Queixa Principal</label>
                      <input readOnly value={anamnesis.chiefComplaint || 'Não informada'} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">História Médica</label>
                      <textarea readOnly value={anamnesis.medicalHistory || 'Sem histórico registrado'} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none h-32 resize-none leading-relaxed" />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Medicações em uso</label>
                      <input readOnly value={anamnesis.medications || 'Nenhuma medicação informada'} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Alergias Conhecidas</label>
                      <div className={cn(
                        "p-4 border rounded-2xl flex items-center gap-3",
                        anamnesis.allergies ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
                      )}>
                        <AlertCircle className={cn("w-4 h-4", anamnesis.allergies ? "text-rose-500" : "text-slate-400")} />
                        <span className={cn("text-xs font-bold", anamnesis.allergies ? "text-rose-600" : "text-slate-500")}>
                          {anamnesis.allergies || 'Nenhuma alergia relatada'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="p-4 bg-slate-50 rounded-2xl text-center">
                         <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Tabagismo</p>
                         <p className="text-xs font-black text-slate-700">{anamnesis.smoking || 'Não'}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl text-center">
                         <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Etilismo</p>
                         <p className="text-xs font-black text-slate-700">{anamnesis.alcohol || 'Não'}</p>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                  <p className="text-[10px] text-slate-400 font-medium italic">Última atualização: 12/03/2024 por Dra. Amanda Costa</p>
                  <button 
                    onClick={() => onUpdateAnamnesis(patientName)}
                    className="px-6 py-3 border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Editar Anamnese
                  </button>
                </div>
              </section>
              <section className="xl:col-span-4 space-y-6">
                <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8">
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest mb-6">Ações Rápidas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Novo Exame', icon: Activity, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5', onClick: () => onAddRecord(patientName) },
                      { label: 'Atestado', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50', onClick: () => onAddCertificate(patientName) },
                      { label: 'Receituário', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50', onClick: () => onAddPrescription(patientName) },
                      { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-50', onClick: () => window.open(`https://wa.me/${patientData.phone.replace(/\D/g,'')}`, '_blank') }
                    ].map(action => (
                      <button 
                        key={action.label} 
                        onClick={action.onClick}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-brand-cyan/30 hover:scale-[1.02] transition-all group"
                      >
                        <div className={cn("w-10 h-10 rounded-xl mb-3 flex items-center justify-center", action.bg)}>
                          <action.icon className={cn("w-5 h-5", action.color)} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase text-center leading-tight">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-brand-cyan to-brand-cyan/80 rounded-[32px] p-8 text-white">
                  <h4 className="font-bold text-sm mb-2">Plano Premium</h4>
                  <p className="text-[11px] text-white/80 leading-relaxed mb-6">Acesso total a todos os módulos de análise avançada e inteligência clínica.</p>
                  <button className="w-full py-3 bg-white text-brand-cyan text-[10px] font-black uppercase rounded-xl shadow-lg">Ver Detalhes</button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'Evolução' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <History className="w-4 h-4 text-brand-cyan" />
                   Linha do Tempo de Evolução
                 </h3>
                 <button 
                   onClick={() => onAddRecord(patientName)}
                   className="px-4 py-2 bg-brand-cyan text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-brand-cyan/20"
                 >
                   Nova Evolução
                 </button>
               </div>
               
               <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                 {patientHistory.map((evo, i) => (
                   <div key={i} className="relative pl-12 group">
                     <div className="absolute left-0 top-1 w-10 h-10 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:border-brand-cyan group-hover:text-brand-cyan transition-all z-10">
                       <Stethoscope className="w-5 h-5" />
                     </div>
                     <div className="bg-white border border-slate-200 rounded-[28px] p-8 shadow-sm group-hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-4">
                         <div>
                           <h4 className="text-base font-bold text-slate-800 mb-1">{evo.procedimento}</h4>
                           <div className="flex items-center gap-3">
                             <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-widest bg-brand-cyan/5 px-2 py-0.5 rounded">
                               {evo.data && isValid(new Date(evo.data)) ? format(new Date(evo.data), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Sem data'}
                             </span>
                             <span className="text-[10px] text-slate-400 font-bold">{evo.horario || 'N/D'}</span>
                           </div>
                         </div>
                         <div className="text-right">
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Responsável</p>
                           <p className="text-xs font-bold text-slate-700">{evo.dentista}</p>
                         </div>
                       </div>
                       <p className="text-sm text-slate-500 leading-relaxed font-sans whitespace-pre-wrap">{evo.observacao || 'Nenhuma observação registrada.'}</p>
                       <div className="mt-6 pt-6 border-t border-slate-50 flex gap-2">
                         <button className="px-3 py-1.5 text-[9px] font-bold text-slate-400 hover:text-brand-cyan transition-colors uppercase">Anexar Exame</button>
                         <button className="px-3 py-1.5 text-[9px] font-bold text-slate-400 hover:text-brand-cyan transition-colors uppercase">Adicionar Nota</button>
                       </div>
                     </div>
                   </div>
                 ))}
                 {patientHistory.length === 0 && (
                   <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-400">Nenhum registro clínico histórico encontrado para este paciente.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'Documentos' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
               <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Documentação Digital</h3>
                 <div className="flex gap-2">
                   <input 
                     type="file" 
                     id="doc-upload" 
                     className="hidden" 
                     onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onload = async (event) => {
                           const content = event.target?.result as string;
                           await onUploadDocument({
                             name: file.name,
                             size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                             type: 'Exame',
                             patientName,
                             content: content.slice(0, 500) + "... [Simulação de Upload]"
                           });
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                   <button 
                     onClick={() => document.getElementById('doc-upload')?.click()}
                     className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-700 transition-colors"
                   >
                     <Plus className="w-3.5 h-3.5" />
                     Upload de Arquivo
                   </button>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {documents.map((doc, i) => (
                   <div key={doc.id || i} className="bg-white border border-slate-200 rounded-[28px] p-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all group flex flex-col items-center text-center">
                     <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
                       <FileText className="w-8 h-8 text-rose-500" />
                       <div className="absolute -top-2 -right-2 bg-brand-cyan text-white text-[8px] font-black px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                         {doc.type}
                       </div>
                     </div>
                     <p className="text-sm font-bold text-slate-800 truncate w-full mb-1">{doc.name || doc.type}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                       {doc.size || 'N/A'} • {doc.createdAt && isValid(new Date(doc.createdAt)) ? format(new Date(doc.createdAt), 'dd/MM/yyyy') : 'Sem data'}
                     </p>
                     <div className="mt-6 flex gap-2 w-full">
                       <button 
                         onClick={() => {
                           if (doc.content) {
                             alert(`Conteúdo do documento (${doc.type}):\n\n${doc.content}`);
                           } else {
                             alert('Conteúdo não disponível para visualização.');
                           }
                         }}
                         className="flex-1 py-2 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-lg hover:bg-brand-cyan hover:text-white transition-all"
                       >
                         Ver
                       </button>
                       <button 
                         onClick={() => {
                           const link = document.createElement('a');
                           link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(doc.content || '');
                           link.download = doc.name || 'documento.txt';
                           alert(`Iniciando download simulado de: ${doc.name}`);
                           // Em ambiente real, o link.click() faria o download.
                         }}
                         className="px-3 py-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => {
                           if (confirm('Tem certeza que deseja excluir este documento?')) {
                             onDeleteDocument(doc.id);
                           }
                         }}
                         className="px-3 py-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))}
                 <div 
                   onClick={() => document.getElementById('doc-upload')?.click()}
                   className="border-2 border-dashed border-slate-200 rounded-[28px] flex flex-col items-center justify-center p-8 min-h-[220px] hover:border-brand-cyan/40 transition-colors cursor-pointer group"
                 >
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-cyan/5 transition-colors">
                      <Plus className="w-6 h-6 text-slate-300 group-hover:text-brand-cyan" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Novo Documento</p>
                 </div>
               </div>

               {documents.length === 0 && (
                 <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                    <FileUp className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <p className="text-sm font-bold text-slate-400 mb-2">Sua galeria de documentos está vazia.</p>
                    <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Faça upload de contratos, termos ou exames</p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'Imagens' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Galeria de Exames</h3>
                   {currentFolderId && (
                     <div className="flex items-center gap-2">
                       <ChevronRight className="w-4 h-4 text-slate-300" />
                       <span className="text-[10px] font-bold text-brand-cyan uppercase bg-brand-cyan/5 px-2 py-0.5 rounded flex items-center gap-1.5">
                         <Folder className="w-3 h-3" />
                         {currentFolder?.name}
                       </span>
                       <button onClick={() => setCurrentFolderId(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                         <X className="w-3 h-3 text-slate-400" />
                       </button>
                     </div>
                   )}
                 </div>
                 <div className="flex gap-2">
                   {isCreatingFolder ? (
                     <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 animate-in slide-in-from-right-2">
                       <input 
                         autoFocus
                         value={newFolderName}
                         onChange={(e) => setNewFolderName(e.target.value)}
                         onKeyDown={async (e) => {
                           if (e.key === 'Enter' && newFolderName.trim()) {
                             await onUploadDocument({
                               name: newFolderName,
                               type: 'Pasta',
                               folderId: currentFolderId,
                               patientName
                             });
                             setNewFolderName('');
                             setIsCreatingFolder(false);
                           }
                           if (e.key === 'Escape') setIsCreatingFolder(false);
                         }}
                         placeholder="Nome da pasta..."
                         className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan/30 w-32"
                       />
                       <button 
                         onClick={async () => {
                           if (newFolderName.trim()) {
                             await onUploadDocument({
                               name: newFolderName,
                               type: 'Pasta',
                               folderId: currentFolderId,
                               patientName
                             });
                             setNewFolderName('');
                             setIsCreatingFolder(false);
                           }
                         }}
                         className="p-1.5 bg-brand-cyan text-white rounded-lg hover:bg-brand-cyan/80 transition-colors"
                       >
                         <CheckCircle2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => setIsCreatingFolder(false)} className="p-1.5 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-200/80 transition-colors">
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setIsCreatingFolder(true)}
                       className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-xl hover:bg-slate-50 transition-all"
                     >
                       <FolderPlus className="w-3.5 h-3.5" />
                       Nova Pasta
                     </button>
                   )}
                   
                   <input 
                     type="file" 
                     id="photo-upload" 
                     multiple
                     accept="image/*"
                     className="hidden" 
                     onChange={async (e) => {
                       const files = Array.from(e.target.files || []) as File[];
                       for (const file of files) {
                         const reader = new FileReader();
                         reader.onload = async (event) => {
                           const content = event.target?.result as string;
                           await onUploadDocument({
                             name: file.name,
                             size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                             type: 'Exame',
                             folderId: currentFolderId,
                             patientName,
                             content: content
                           });
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                   <button 
                     onClick={() => document.getElementById('photo-upload')?.click()}
                     className="flex items-center gap-2 px-4 py-2 bg-brand-cyan text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-brand-cyan/20 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     <Image className="w-3.5 h-3.5" />
                     Adicionar Fotos
                   </button>
                 </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {galleryDocs.map((doc, i) => {
                   if (doc.type === 'Pasta') {
                     return (
                       <div 
                         key={doc.id || i} 
                         onClick={() => setCurrentFolderId(doc.id)}
                         className="bg-white border border-slate-200 rounded-[28px] p-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all group flex flex-col items-center text-center cursor-pointer border-b-4 border-b-slate-100 hover:border-b-brand-cyan"
                       >
                         <div className="w-16 h-16 bg-brand-cyan/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                           <Folder className="w-8 h-8 text-brand-cyan" />
                         </div>
                         <p className="text-sm font-bold text-slate-800 truncate w-full mb-1">{doc.name}</p>
                         <div className="mt-4 flex gap-2 w-full justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               if (confirm('Excluir pasta? (Documentos dentro dela não serão excluídos)')) {
                                 onDeleteDocument(doc.id);
                               }
                             }}
                             className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       </div>
                     );
                   }
                   return (
                     <div key={doc.id || i} className="aspect-square bg-slate-50 border border-slate-100 rounded-[28px] overflow-hidden relative group cursor-pointer shadow-sm hover:ring-2 hover:ring-brand-cyan transition-all">
                       <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 z-10 gap-3">
                         <div className="flex gap-2">
                           <button 
                             onClick={() => {
                               if (doc.content) {
                                  const win = window.open();
                                  win?.document.write(`<img src="${doc.content}" style="max-width:100%; height:auto;" />`);
                               }
                             }}
                             className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                           >
                             <Maximize2 className="w-5 h-5" />
                           </button>
                           <button 
                             onClick={() => {
                               if (confirm('Excluir foto?')) {
                                 onDeleteDocument(doc.id);
                               }
                             }}
                             className="p-2 bg-rose-500/20 backdrop-blur-md rounded-lg text-rose-200 hover:bg-rose-500/40 transition-colors"
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                         </div>
                         <p className="text-[10px] text-white font-bold uppercase tracking-tight px-3 py-1 bg-black/20 backdrop-blur-sm rounded-full">
                           {doc.size}
                         </p>
                       </div>
                       <img 
                         src={doc.content || `https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400&h=400&fit=crop`} 
                         alt={doc.name} 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                       />
                       <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-2 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all text-center">
                         <p className="text-[8px] font-black text-slate-900 uppercase truncate">{doc.name}</p>
                       </div>
                     </div>
                   );
                 })}
                 
                 {galleryDocs.length === 0 && (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                     <ImageIcon className="w-16 h-16 text-slate-200 mb-6" />
                     <p className="text-sm font-bold text-slate-400 mb-2">Esta galeria está vazia.</p>
                     <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Organize exames em pastas e suba fotos do tratamento</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'Planos de Tratamento' && (
            <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Planos Propostos</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => onAddAppointment(patientName)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Nova Consulta
                    </button>
                    <button 
                      onClick={() => setIsCreatingPlan(true)}
                      className="px-6 py-2.5 bg-brand-cyan text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-brand-cyan/20"
                    >
                      Criar Novo Plano
                    </button>
                  </div>
               </div>

               <div className="space-y-6">
                 {isCreatingPlan && (
                    <div className="bg-slate-50 border border-brand-cyan/20 rounded-[32px] p-10 animate-in zoom-in-95 duration-500 mb-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8">
                        <button onClick={() => setIsCreatingPlan(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <X className="w-6 h-6 text-slate-400" />
                        </button>
                      </div>
                      <div className="max-w-3xl mx-auto space-y-10">
                        <div className="text-center">
                          <h4 className="text-2xl font-bold text-slate-900 mb-2">Novo Plano de Tratamento</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Defina os procedimentos e valores do orçamento</p>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Título do Plano</label>
                            <input 
                              type="text"
                              value={newPlan.title}
                              onChange={(e) => setNewPlan({...newPlan, title: e.target.value})}
                              placeholder="Ex: Reabilitação Superior"
                              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-brand-cyan/50 focus:ring-4 focus:ring-brand-cyan/5 transition-all"
                            />
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Procedimentos Selecionados</label>
                              <div className="relative group">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase rounded-lg hover:bg-slate-100 transition-colors">
                                  <Plus className="w-3 h-3" />
                                  Adicionar Procedimento
                                </button>
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 hidden group-hover:block animate-in fade-in slide-in-from-top-2 border-t-4 border-brand-cyan">
                                  {availableProcedures.map(p => (
                                    <button 
                                      key={p.name}
                                      onClick={() => {
                                        setNewPlan({
                                          ...newPlan,
                                          items: [...newPlan.items, { procedure: p.name, price: p.price }]
                                        });
                                      }}
                                      className="w-full text-left p-3 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex justify-between items-center transition-colors"
                                    >
                                      {p.name}
                                      <span className="text-[10px] text-brand-cyan">{formatCurrency(p.price)}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {newPlan.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl animate-in slide-in-from-left-4">
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-800">{item.procedure}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Valor Padrão: {formatCurrency(item.price)}</p>
                                  </div>
                                  <div className="flex items-center gap-6">
                                     <div className="relative">
                                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">R$</span>
                                       <input 
                                         type="number"
                                         value={item.price}
                                         onChange={(e) => {
                                           const newItems = [...newPlan.items];
                                           newItems[idx].price = Number(e.target.value);
                                           setNewPlan({...newPlan, items: newItems});
                                         }}
                                         className="w-32 bg-slate-50 border border-slate-100 rounded-xl p-3 pl-10 text-sm font-black text-slate-900 outline-none text-right"
                                       />
                                     </div>
                                     <button 
                                       onClick={() => {
                                         const newItems = newPlan.items.filter((_, i) => i !== idx);
                                         setNewPlan({...newPlan, items: newItems});
                                       }}
                                       className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                                </div>
                              ))}
                              {newPlan.items.length === 0 && (
                                <div className="py-8 text-center bg-white/50 border border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-sm font-bold text-slate-400">Nenhum procedimento selecionado</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Plano</p>
                            <p className="text-3xl font-bold text-slate-900">{formatCurrency(newPlan.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0))}</p>
                          </div>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => setIsCreatingPlan(false)}
                              className="px-8 py-3 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase rounded-xl hover:bg-slate-100 transition-all"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => {
                                if (!newPlan.title) return alert('Dê um título ao plano');
                                if (newPlan.items.length === 0) return alert('Adicione ao menos um procedimento');
                                alert(`Plano "${newPlan.title}" salvo com sucesso!`);
                                setIsCreatingPlan(false);
                                setNewPlan({ title: '', items: [] });
                              }}
                              className="px-10 py-3 bg-brand-cyan text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-brand-cyan/20 hover:scale-[1.02] transition-all"
                            >
                              Salvar Plano
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                 {[
                   { title: 'Reabilitação Estética Posterior', date: '12/03/2024', items: 3, status: 'Em Aprovação', progress: 0, total: 4500 },
                   { title: 'Tratamento Endodôntico e Restauração', date: '05/02/2024', items: 2, status: 'Em Execução', progress: 50, total: 2800 }
                 ].map((plano, i) => (
                   <div key={i} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 mb-1">{plano.title}</h4>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{plano.date}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">•</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{plano.items} Procedimentos</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                             <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Total Previsto</p>
                             <p className="text-base font-bold text-slate-900">{formatCurrency(plano.total)}</p>
                           </div>
                           <div className={cn(
                             "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border",
                             plano.status === 'Em Execução' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                           )}>
                             {plano.status}
                           </div>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Progresso do Tratamento</span>
                          <span className="text-brand-cyan">{plano.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-cyan transition-all duration-1000 ease-out shadow-sm" style={{ width: `${plano.progress}%` }} />
                        </div>
                     </div>
                     <div className="mt-8 pt-8 border-t border-slate-50 flex gap-4">
                        <button 
                          onClick={() => setShowPlanDetails(plano)}
                          className="flex-1 py-3 bg-slate-50 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          Detalhes do Plano
                        </button>
                        <button 
                          onClick={() => setShowBudgetModal(plano)}
                          className="flex-1 py-3 bg-brand-cyan/5 text-brand-cyan text-[10px] font-black uppercase rounded-xl hover:bg-brand-cyan/10 transition-colors"
                        >
                          Gerar Orçamento
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'Orçamentos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Histórico Financeiro</h3>
                 <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
                   <div className="px-4 text-center border-r border-slate-100">
                     <p className="text-[8px] font-bold text-slate-400 uppercase">Aberto</p>
                     <p className="text-xs font-black text-rose-500">R$ 1.250</p>
                   </div>
                   <div className="px-4 text-center">
                     <p className="text-[8px] font-bold text-slate-400 uppercase">Recebido</p>
                     <p className="text-xs font-black text-emerald-500">R$ 8.420</p>
                   </div>
                 </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                 <table className="w-full text-left font-sans">
                   <thead className="bg-slate-50/50 border-b border-slate-100">
                     <tr>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Nº Orçamento</th>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Data</th>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Valor</th>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Status</th>
                       <th className="px-8 py-5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {[
                       { id: '2024-001', date: '12/03/2024', value: 4500, status: 'Pendente', color: 'bg-amber-50 text-amber-600' },
                       { id: '2023-085', date: '05/12/2023', value: 1200, status: 'Pago', color: 'bg-emerald-50 text-emerald-600' },
                       { id: '2023-042', date: '20/08/2023', value: 3800, status: 'Pago', color: 'bg-emerald-50 text-emerald-600' }
                     ].map((item, i) => (
                       <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-8 py-6 text-sm font-bold text-slate-700">#{item.id}</td>
                         <td className="px-8 py-6 text-xs text-slate-500 font-medium">{item.date}</td>
                         <td className="px-8 py-6 text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</td>
                         <td className="px-8 py-6">
                           <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight", item.color)}>
                             {item.status}
                           </span>
                         </td>
                         <td className="px-8 py-6 text-right">
                           <button 
                             onClick={() => alert(`Visualizando orçamento #${item.id}`)}
                             className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-brand-cyan"
                           >
                             <FileText className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'Histórico' && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
               <div className="bg-white border border-slate-200 rounded-[32px] p-8">
                 <div className="flex items-center gap-6 mb-8 bg-slate-50/50 p-4 rounded-2xl">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtrar Período</label>
                      <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none">
                        <option>Todos os Registros</option>
                        <option>Últimos 12 Meses</option>
                        <option>2024</option>
                        <option>2023</option>
                      </select>
                    </div>
                    <div className="w-px h-10 bg-slate-200" />
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Evento</label>
                      <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none">
                        <option>Todos os Tipos</option>
                        <option>Consultas</option>
                        <option>Financeiro</option>
                        <option>Documentos</option>
                      </select>
                    </div>
                 </div>

                 <div className="space-y-0 border-l border-slate-100 ml-4">
                   {patientHistory.map((rec, i) => (
                     <div key={i} className="relative pl-10 pb-10 last:pb-0">
                       <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 bg-brand-cyan rounded-full shadow-[0_0_0_4px_white,0_0_0_5px_#f1f5f9]" />
                       <div>
                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                           {rec.data && isValid(parseISO(rec.data)) ? format(parseISO(rec.data), 'dd/MM/yyyy') : 'Sem data'}
                         </p>
                         <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:border-brand-cyan/20 transition-all cursor-crosshair">
                           <div className="flex justify-between items-center">
                             <div>
                               <h5 className="text-sm font-bold text-slate-800">{rec.procedimento}</h5>
                               <p className="text-[10px] text-slate-500 font-medium">Atendido por {rec.dentista}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-sm font-black text-brand-cyan">{formatCurrency(rec.valor)}</p>
                               <span className="text-[9px] font-bold text-slate-400 uppercase">{rec.status}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PatientFormView({ isEdit = false, patientId = '', onBack, onSave, patients = [] }: { isEdit?: boolean; patientId?: string; onBack: () => void; onSave: (p: any, id?: string) => Promise<boolean>; patients?: any[] }) {
  const patient = isEdit ? patients.find(p => p.id === patientId || p.name === patientId) : null;
  
  const [name, setName] = useState(patient?.name || '');
  const [cpf, setCpf] = useState(patient?.cpf || '');
  const [phone, setPhone] = useState(patient?.phone || patient?.telefone || patient?.celular || '');
  const [email, setEmail] = useState(patient?.email || '');
  const [procedimento, setProcedimento] = useState('Avaliação Inicial');
  const [valor, setValor] = useState('150');
  const [isSaving, setIsSaving] = useState(false);

  const lastPatientIdRef = React.useRef<string | null>(null);

  // Update state if patient data becomes available (syncing) - only on initial load or ID change
  React.useEffect(() => {
    if (isEdit && patient && lastPatientIdRef.current !== patientId) {
      setName(patient.name || '');
      setCpf(patient.cpf || '');
      setPhone(patient.phone || patient.telefone || patient.celular || '');
      setEmail(patient.email || '');
      lastPatientIdRef.current = patientId;
    }
  }, [patient, isEdit, patientId]);

  const handleProcedureChange = (procName: string) => {
    setProcedimento(procName);
    const option = PROCEDURES_OPTIONS.find(p => p.name === procName);
    if (option) {
      setValor(option.price.toString());
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            onClick={onBack} 
            disabled={isSaving} 
            className="p-3 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em] mb-1">Fluxo de Cadastro</span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{isEdit ? `Editar: ${patient?.name || patientId}` : 'Novo Paciente'}</h2>
          </div>
        </div>

        {isEdit && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Edição Ativa</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] p-10 space-y-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        {/* Visual Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">
                Nome Completo do Paciente <span className="text-rose-500 font-black ml-1">(Obrigatório)</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  disabled={isSaving}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(SecurityUtils.limit(SecurityUtils.sanitizeLettersOnly(e.target.value), 100))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100 placeholder:text-slate-300" 
                  placeholder="Ex: João da Silva Santos"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 font-mono">Documento Identificador (CPF)</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    disabled={isSaving}
                    type="text" 
                    value={cpf}
                    onChange={(e) => setCpf(SecurityUtils.maskCPF(e.target.value))}
                    placeholder="000.000.000-00" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-mono font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 font-mono">Contato Primário (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    disabled={isSaving}
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(SecurityUtils.maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-mono font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">
                Endereço de Correio Eletrônico <span className="text-rose-500 font-black ml-1">(Obrigatório)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  disabled={isSaving}
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(SecurityUtils.sanitizeEmail(e.target.value))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100 placeholder:text-slate-300" 
                  placeholder="exemplo@clinica.com"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Primeira Sessão</h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Procedimento Inicial</label>
                <select 
                  disabled={isSaving}
                  value={procedimento}
                  onChange={(e) => handleProcedureChange(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all cursor-pointer shadow-sm"
                >
                  {PROCEDURES_OPTIONS.map(opt => (
                    <option key={opt.name} value={opt.name}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Honorários Previstos</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                  <input 
                    disabled={isSaving}
                    type="number" 
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all shadow-sm" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
               <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                 <p className="text-[11px] text-slate-500 leading-relaxed font-bold italic">
                   "O preenchimento correto destes campos garante a integridade do prontuário eletrônico."
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row justify-end items-center gap-6">
          <p className="mr-auto text-[10px] text-slate-300 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed hidden sm:block">
            Os dados serão criptografados antes do armazenamento seguro.
          </p>
          <div className="flex gap-4 w-full sm:w-auto">
            <button 
              onClick={onBack} 
              disabled={isSaving} 
              className="flex-1 sm:flex-none px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 border-2 border-transparent hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              disabled={isSaving}
              onClick={async () => {
                const trimmedName = name.trim();
                const words = trimmedName.split(/\s+/).filter(Boolean);

                if (!trimmedName) {
                  alert('Por favor, preencha o nome do paciente.');
                  return;
                }

                if (trimmedName.length < 3) {
                  alert('O nome do paciente deve conter no mínimo 3 caracteres.');
                  return;
                }

                if (!email) {
                  alert('O e-mail é obrigatório para o cadastro do paciente.');
                  return;
                }

                if (!SecurityUtils.isValidEmail(email)) {
                  alert('Por favor, insira um e-mail válido.');
                  return;
                }

                // Check for duplicates
                const duplicateName = patients.find(p => 
                  p.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
                  (isEdit ? p.id !== (patient?.id || patientId) : true)
                );
                
                if (duplicateName) {
                  alert(`Já existe um paciente cadastrado com o nome "${trimmedName}". Não é permitido duplicar o nome.`);
                  return;
                }

                const duplicateEmail = patients.find(p => 
                  p.email?.trim().toLowerCase() === email.trim().toLowerCase() && 
                  (isEdit ? p.id !== (patient?.id || patientId) : true)
                );

                if (duplicateEmail) {
                  alert(`O e-mail "${email}" já está cadastrado para outro paciente (${duplicateEmail.name}).`);
                  return;
                }

                if (cpf) {
                  const duplicateCpf = patients.find(p => 
                    p.cpf === cpf && 
                    (isEdit ? p.id !== (patient?.id || patientId) : true)
                  );
                  if (duplicateCpf) {
                    alert(`O CPF "${cpf}" já está cadastrado para o paciente ${duplicateCpf.name}.`);
                    return;
                  }
                }

                if (SecurityUtils.hasDangerousScript(trimmedName) || SecurityUtils.hasDangerousScript(email) || SecurityUtils.hasDangerousScript(phone) || SecurityUtils.hasDangerousScript(cpf)) {
                  alert('Ação bloqueada por motivos de segurança (XSS detectado).');
                  return;
                }

                setIsSaving(true);
                try {
                  const success = await onSave({ 
                    name: trimmedName, 
                    cpf, 
                    phone, 
                    email, 
                    procedimento, 
                    valor,
                    dentistaResponsavel: isEdit ? patient?.dentistaResponsavel : ''
                  }, isEdit ? patientId : undefined);
                  
                  if (success) {
                    onBack();
                  }
                } catch (err: any) {
                  console.error("Error saving patient in view:", err);
                  alert("Houve um problema ao processar os dados. Verifique os campos e tente novamente.");
                } finally {
                  setIsSaving(false);
                }
              }}
              className="flex-1 sm:flex-none bg-brand-cyan text-white px-12 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-brand-cyan/20 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.98]"
            >
              {isSaving ? 'Processando...' : (isEdit ? 'Atualizar Prontuário' : 'Finalizar Cadastro')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentFormView({ 
  onBack, 
  onSave, 
  data, 
  users, 
  patients,
  presetPatient = '',
  isClinicalRecord = false
}: { 
  onBack: () => void; 
  onSave: (a: any) => Promise<boolean>; 
  data: DentalRecord[]; 
  users: any[]; 
  patients: any[];
  presetPatient?: string;
  isClinicalRecord?: boolean;
}) {
  const minSelectableDate = !isClinicalRecord ? getSystemInitialDate() : undefined;

  const [paciente, setPaciente] = useState(presetPatient);
  const [dataVal, setDataVal] = useState(getSystemInitialDate());
  const [horario, setHorario] = useState('');
  const [dentista, setDentista] = useState('');
  const [procedimento, setProcedimento] = useState('Avaliação Inicial');
  const [valor, setValor] = useState('150');
  const [isSaving, setIsSaving] = useState(false);

  const handleProcedureChange = (procName: string) => {
    setProcedimento(procName);
    const option = PROCEDURES_OPTIONS.find(p => p.name === procName);
    if (option) {
      setValor(option.price.toString());
    }
  };

  // Get unique patients from patients collection and historical records
  const patientList = useMemo(() => {
    const names = new Set([
      ...patients.map(p => p.name),
      ...data.map(m => m.paciente)
    ]);
    return Array.from(names).sort().filter(Boolean);
  }, [data, patients]);

  const dentistList = useMemo(() => {
    const names = new Set(users.map(u => u.role === 'Dentista' || u.role === 'Admin' ? u.name : null).filter(Boolean));
    // Fallback to MOCK dentists if no users found
    if (names.size === 0) return ['Dr. Silva', 'Dra. Maria', 'Dr. Ricardo', 'Dra. Ana'];
    return Array.from(names).sort() as string[];
  }, [users]);

  const handleSave = async () => {
    if (!paciente || !dentista || !dataVal || !horario) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (!isClinicalRecord) {
      if (horario < OPENING_HOUR || horario > CLOSING_HOUR) {
        alert(`A clínica atende apenas entre ${OPENING_HOUR} e ${CLOSING_HOUR}.`);
        return;
      }
    }

    // Prevents scheduling for past date/time (with buffer for appointments, none for clinical records)
    const selectedDateTime = parseISO(`${dataVal}T${horario}`);
    const now = new Date();
    const bufferMinutes = 15; // 15 minute buffer for current appointments
    const limitDate = new Date(now.getTime() - bufferMinutes * 60000);

    if (!isClinicalRecord && selectedDateTime < limitDate) {
      alert('O horário selecionado já passou (limite de 15 min de atraso para novos agendamentos). Para registrar atendimentos passados, utilize a Evolução Clínica no Prontuário.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave({ paciente, data: dataVal, horario, dentista, procedimento, valor });
      if (success) {
        onBack();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            type="button"
            onClick={onBack} 
            disabled={isSaving} 
            className="p-3 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em] mb-1">
              {isClinicalRecord ? 'Fluxo Clínico' : 'Fluxo de Agendamentos'}
            </span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {isClinicalRecord ? 'Nova Evolução Clínica' : 'Novo Agendamento Inteligente'}
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] p-10 space-y-10 shadow-xl shadow-slate-200/50 relative overflow-hidden text-left">
        {/* Visual Decoration Blur */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

        {isSaving && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center backdrop-blur-[2px] transition-all">
            <div className="flex flex-col items-center gap-3">
              <Activity className="w-10 h-10 text-brand-cyan animate-spin" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {isClinicalRecord ? 'Salvando Evolução...' : 'Gravando Agendamento...'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Selectors Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Patient Selector */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Paciente Vinculado</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350" />
                <select 
                  disabled={isSaving || !!presetPatient}
                  value={paciente}
                  onChange={(e) => setPaciente(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all cursor-pointer disabled:bg-slate-100 placeholder:text-slate-300"
                >
                  <option value="">Selecione um paciente cadastrado...</option>
                  {patientList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Date and Time Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 font-mono">Data Prevista</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350 pointer-events-none" />
                  <input 
                    disabled={isSaving}
                    type="date" 
                    min={minSelectableDate}
                    value={dataVal}
                    onChange={(e) => {
                      const newData = e.target.value;
                      setDataVal(newData);
                      if (!isClinicalRecord && newData === format(new Date(), 'yyyy-MM-dd') && horario) {
                        const nowStr = format(new Date(), 'HH:mm');
                        if (horario < nowStr) setHorario('');
                      }
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-mono font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100 cursor-pointer" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 font-mono">Horário do Compromisso</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350 pointer-events-none" />
                  <input 
                    disabled={isSaving}
                    type="time" 
                    value={horario}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      
                      if (!isClinicalRecord) {
                        const isTodaySelected = dataVal === format(new Date(), 'yyyy-MM-dd');
                        const nowStr = format(new Date(), 'HH:mm');
                        if (isTodaySelected && newTime < nowStr) {
                          alert('Este horário já passou. Por favor, escolha um horário futuro.');
                          return;
                        }

                        if (newTime < OPENING_HOUR || newTime > CLOSING_HOUR) {
                          alert(`A clínica atende apenas entre ${OPENING_HOUR} e ${CLOSING_HOUR}.`);
                          return;
                        }
                      }

                      const isTaken = data.some(r => 
                        r.dentista === dentista && 
                        r.data === dataVal && 
                        r.horario === newTime &&
                        r.status !== 'Cancelado'
                      );
                      if (isTaken) {
                        alert('Este dentista já possui agendamento para este dia e horário.');
                        return;
                      }
                      setHorario(newTime);
                    }}
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-mono font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100 cursor-pointer",
                      (!isClinicalRecord && ((dataVal === format(new Date(), 'yyyy-MM-dd') && horario && horario < format(new Date(), 'HH:mm')) || (dataVal < format(new Date(), 'yyyy-MM-dd')))) && "border-rose-300 bg-rose-50"
                    )} 
                  />
                </div>
                {data.some(r => r.dentista === dentista && r.data === dataVal && r.horario === horario && r.status !== 'Cancelado') && (
                  <p className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wide ml-1 mt-1">● Horário do Dentista já Ocupado!</p>
                )}
                {!isClinicalRecord && (
                  <div className="space-y-0.5 ml-1 mt-1">
                    {dataVal < format(new Date(), 'yyyy-MM-dd') && (
                      <p className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wide">● Data informada está no passado!</p>
                    )}
                    {dataVal === format(new Date(), 'yyyy-MM-dd') && horario && horario < format(new Date(), 'HH:mm') && (
                      <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wide">● Horário já expirado hoje!</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dentist Selector */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Dentista Responsável</label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350 pointer-events-none" />
                <select 
                  disabled={isSaving}
                  value={dentista}
                  onChange={(e) => setDentista(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all cursor-pointer disabled:bg-slate-100 placeholder:text-slate-300"
                >
                  <option value="">Selecione o cirurgião-dentista...</option>
                  {dentistList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right Area - Procedimento & Visual Price Summary */}
          <div className="lg:col-span-4 bg-slate-50/60 p-8 rounded-[32px] border border-slate-100 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Serviço e Honorários</h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-450 tracking-widest ml-1">Procedimento Clínico</label>
                  <select 
                    disabled={isSaving}
                    value={procedimento}
                    onChange={(e) => handleProcedureChange(e.target.value)}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all cursor-pointer shadow-sm"
                  >
                    {PROCEDURES_OPTIONS.map(opt => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-455 tracking-widest ml-1">Valor Unitário Cobrado</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                    <input 
                      disabled={isSaving}
                      type="number" 
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all shadow-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Interactive Summary Badge */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/50 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-wider block">Resumo do Lançamento</span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                {paciente ? `@${paciente}` : "Nenhum paciente selecionado"} {horario ? `às ${horario}` : ""} {dataVal ? `no dia ${format(parseISO(dataVal), 'dd/MM/yyyy')}` : ""}.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Rows */}
        <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-6">
          <p className="mr-auto text-[10px] text-slate-300 font-bold uppercase tracking-widest max-w-[220px] leading-relaxed hidden sm:block">
            Conclua para registrar no diário de consultas.
          </p>
          <div className="flex gap-4 w-full sm:w-auto">
            <button 
              type="button"
              onClick={onBack} 
              disabled={isSaving} 
              className="flex-1 sm:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all cursor-pointer border border-transparent"
            >
              Descartar
            </button>
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 sm:flex-none px-8 py-4 bg-brand-cyan hover:bg-brand-cyan/95 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-md shadow-brand-cyan/20 cursor-pointer hover:translate-y-[-1px] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : (isClinicalRecord ? 'Gravar Evolução' : 'Confirmar Agendamento')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificateFormView({ onBack, onSave, patientName, users }: { onBack: () => void; onSave: (d: any) => Promise<boolean>; patientName: string; users: any[] }) {
  const [content, setContent] = useState(`Atesto para os devidos fins que o(a) Sr(a). ${patientName} esteve sob meus cuidados odontológicos nesta data, devendo permanecer em repouso por ___ dias.`);
  const [dentist, setDentist] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave({ 
      type: 'Atestado', 
      patientName, 
      content, 
      dentistName: dentist 
    });
    if (success) onBack();
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h2 className="text-xl font-bold text-slate-800">Novo Atestado</h2>
      </div>
      <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Paciente</label>
            <input readOnly value={patientName} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Dentista</label>
            <select value={dentist} onChange={(e) => setDentist(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none">
              <option value="">Selecione o dentista...</option>
              {users.map(u => (u.role === 'Dentista' || u.role === 'Admin') && <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Conteúdo do Atestado</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 3000))} 
              className="w-full p-4 border border-slate-200 rounded text-sm min-h-[300px] focus:border-brand-cyan outline-none resize-none font-sans leading-relaxed" 
            />
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onBack} className="px-6 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-brand-cyan text-white px-6 py-2 rounded text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
            {isSaving ? 'Salvando...' : 'Gerar e Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrescriptionFormView({ onBack, onSave, patientName, users }: { onBack: () => void; onSave: (d: any) => Promise<boolean>; patientName: string; users: any[] }) {
  const [content, setContent] = useState('1. Amoxicilina 500mg ------ 1 caixa \nTomar 1 cápsula de 8 em 8 horas por 7 dias. \n\n2. Paracetamol 750mg ------ 1 caixa \nTomar 1 comprimido em caso de dor (máx 4x/dia).');
  const [dentist, setDentist] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave({ 
      type: 'Receita', 
      patientName, 
      content, 
      dentistName: dentist 
    });
    if (success) onBack();
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h2 className="text-xl font-bold text-slate-800">Novo Receituário</h2>
      </div>
      <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Paciente</label>
            <input readOnly value={patientName} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Dentista</label>
            <select value={dentist} onChange={(e) => setDentist(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none">
              <option value="">Selecione o dentista...</option>
              {users.map(u => (u.role === 'Dentista' || u.role === 'Admin') && <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Prescrição</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 3000))} 
              className="w-full p-4 border border-slate-200 rounded font-mono text-sm min-h-[300px] focus:border-brand-cyan outline-none resize-none leading-relaxed" 
            />
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onBack} className="px-6 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-brand-cyan text-white px-6 py-2 rounded text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
            {isSaving ? 'Salvando...' : 'Gravar Receita'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnamnesisFormView({ patientId, patients, onSave, onBack }: { patientId: string; patients: any[]; onSave: (id: string, data: any) => Promise<boolean>; onBack: () => void }) {
  const patient = patients.find(p => p.id === patientId || p.name === patientId);
  const anamnesis = patient?.anamnesis || {};

  const [chiefComplaint, setChiefComplaint] = useState(anamnesis.chiefComplaint || '');
  const [medicalHistory, setMedicalHistory] = useState(anamnesis.medicalHistory || '');
  const [medications, setMedications] = useState(anamnesis.medications || '');
  const [allergies, setAllergies] = useState(anamnesis.allergies || '');
  const [smoking, setSmoking] = useState(anamnesis.smoking || 'Não');
  const [alcohol, setAlcohol] = useState(anamnesis.alcohol || 'Não');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (SecurityUtils.hasDangerousScript(chiefComplaint) || SecurityUtils.hasDangerousScript(medicalHistory) || SecurityUtils.hasDangerousScript(medications) || SecurityUtils.hasDangerousScript(allergies)) {
      alert('Ação bloqueada por motivos de segurança (XSS detectado).');
      return;
    }

    setIsSaving(true);
    const success = await onSave(patientId, {
      chiefComplaint: SecurityUtils.limit(SecurityUtils.sanitize(chiefComplaint), 500),
      medicalHistory: SecurityUtils.limit(SecurityUtils.sanitize(medicalHistory), 3000),
      medications: SecurityUtils.limit(SecurityUtils.sanitize(medications), 1000),
      allergies: SecurityUtils.limit(SecurityUtils.sanitize(allergies), 1000),
      smoking,
      alcohol,
      updatedAt: new Date().toISOString()
    });
    if (success) onBack();
    setIsSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} disabled={isSaving} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors disabled:opacity-50"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Editar Anamnese</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{patient?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Queixa Principal</label>
            <textarea 
              value={chiefComplaint} 
              onChange={(e) => setChiefComplaint(e.target.value)} 
              placeholder="Descreva a queixa principal do paciente..."
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-brand-cyan/30 transition-all h-24 resize-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">História Médica</label>
            <textarea 
              value={medicalHistory} 
              onChange={(e) => setMedicalHistory(e.target.value)} 
              placeholder="Doenças crônicas, cirurgias, hospitalizações..."
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-brand-cyan/30 transition-all h-40 resize-none" 
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Medicações em uso</label>
            <textarea 
              value={medications} 
              onChange={(e) => setMedications(e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 outline-none h-24 resize-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Alergias</label>
            <textarea 
              value={allergies} 
              onChange={(e) => setAllergies(e.target.value)} 
              className="w-full p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl text-sm font-bold text-rose-600 outline-none h-24 resize-none" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[8px] uppercase font-bold text-slate-400 tracking-widest ml-1">Tabagismo</label>
               <select value={smoking} onChange={(e) => setSmoking(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none">
                 <option value="Não">Não</option>
                 <option value="Sim">Sim</option>
                 <option value="Ex-fumante">Ex-fumante</option>
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[8px] uppercase font-bold text-slate-400 tracking-widest ml-1">Etilismo</label>
               <select value={alcohol} onChange={(e) => setAlcohol(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none">
                 <option value="Não">Não</option>
                 <option value="Social">Social</option>
                 <option value="Frequente">Frequente</option>
               </select>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pb-12">
        <button onClick={onBack} className="px-8 py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-all">Descartar</button>
        <button onClick={handleSave} disabled={isSaving} className="px-10 py-3 bg-brand-cyan text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-brand-cyan/20 hover:scale-[1.02] active:scale-95 transition-all">
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}

function ClinicalEvolutionFormView({ onBack, onSave, patientName, users }: { onBack: () => void; onSave: (d: any) => Promise<boolean>; patientName: string; users: any[] }) {
  const [evolution, setEvolution] = useState('');
  const [dentist, setDentist] = useState('');
  const [procedure, setProcedure] = useState('Evolução Clínica');
  const [value, setValue] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!evolution || !dentist) {
      alert('Por favor, preencha a evolução e selecione o dentista.');
      return;
    }
    setIsSaving(true);
    const success = await onSave({ 
      paciente: patientName, 
      dentista: dentist,
      procedimento: procedure,
      data: format(new Date(), 'yyyy-MM-dd'),
      valor: Number(value),
      observacao: evolution
    });
    if (success) onBack();
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-6 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={onBack} disabled={isSaving} className="p-3 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <span className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em] mb-1 block leading-none">Registro Clínico Eletrônico</span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Nova Evolução de Paciente</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{patientName}</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-4 px-6 py-3 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 border border-white/5">
           <Activity className="w-4 h-4 text-brand-cyan animate-pulse" />
           <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Sessão de Escrita Ativa</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden relative">
        {isSaving && (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-md">
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-100 border-t-brand-cyan rounded-full animate-spin" />
                <Activity className="w-8 h-8 text-brand-cyan absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2" />
              </div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">Sincronizando com Prontuário...</span>
            </div>
          </div>
        )}

        <div className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Dentista Autor da Nota</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                <select 
                  value={dentist} 
                  onChange={(e) => setDentist(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-all appearance-none cursor-pointer"
                >
                  <option value="">Selecione o profissional responsável</option>
                  {users.map(u => (u.role === 'Dentista' || u.role === 'Admin') && <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Procedimento Realizado</label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                <input 
                  value={procedure}
                  onChange={(e) => setProcedure(SecurityUtils.sanitizeLettersOnly(e.target.value))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-all"
                  placeholder="Ex: Restauração Resinosa, Endodontia, etc."
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Evolução Clínica Detalhada</label>
              <div className="flex items-center gap-2 bg-brand-cyan/5 px-3 py-1.5 rounded-full border border-brand-cyan/10">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></div>
                <span className="text-[8px] font-black text-brand-cyan uppercase tracking-widest">Protocolo de Segurança Ativo</span>
              </div>
            </div>
            <textarea 
              value={evolution} 
              onChange={(e) => setEvolution(e.target.value)} 
              placeholder="Descreva aqui o estado clínico, procedimentos técnicos, materiais específicos, intercorrências e orientações pós-operatórias..."
              className="w-full p-8 bg-slate-50/50 border border-slate-100 rounded-[32px] text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-all min-h-[400px] resize-none leading-relaxed placeholder:text-slate-300" 
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6 border-t border-slate-50">
             <div className="space-y-3 w-full md:w-64">
               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Lançamento Financeiro (R$)</label>
               <input 
                 type="number"
                 value={value}
                 onChange={(e) => setValue(e.target.value)}
                 className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-lg font-black text-brand-cyan outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-all"
               />
             </div>
             
             <div className="flex items-center gap-4 w-full md:w-auto">
               <button 
                 onClick={onBack} 
                 className="flex-1 md:flex-none px-10 py-5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-slate-600 transition-all rounded-2xl border-2 border-transparent hover:bg-slate-50"
               >
                 Descartar
               </button>
               <button 
                 onClick={handleSave} 
                 disabled={isSaving}
                 className="flex-1 md:flex-none px-12 py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-slate-900/20 hover:bg-brand-cyan transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
               >
                 <CheckCircle2 className="w-5 h-5" />
                 Gerar Registro Oficial
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminView({ 
  users, 
  onAddUser, 
  onUpdateUser,
  onDeleteUser,
  currentUser,
  clinicName,
  clinicLogo,
  footerText,
  providerPhone,
  providerName,
  onUpdateSettings,
  onResetDatabase,
  deferredPrompt,
  onInstallPWA,
  data,
  patients,
  documents,
  onRestore,
  adminTab,
  setAdminTab
}: { 
  users: any[]; 
  onAddUser: (u: any) => Promise<boolean>; 
  onUpdateUser: (id: string, u: any) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<boolean>;
  currentUser: any;
  clinicName: string;
  clinicLogo: string | null;
  footerText: string;
  providerPhone: string;
  providerName: string;
  onUpdateSettings: (updates: { clinicName?: string; clinicLogo?: string | null; footerText?: string; providerPhone?: string; providerName?: string }) => Promise<void>;
  onResetDatabase?: () => Promise<void>;
  deferredPrompt: any;
  onInstallPWA: () => void;
  data: any[];
  patients: any[];
  documents: any[];
  onRestore: (data: any) => Promise<void>;
  adminTab?: 'users' | 'settings' | 'backup';
  setAdminTab?: (tab: 'users' | 'settings' | 'backup') => void;
}) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userToUnlock, setUserToUnlock] = useState<any>(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Dentista');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserModules, setNewUserModules] = useState<string[]>(['Dashboard', 'Agenda', 'Pacientes']);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalTab, setInternalTab] = useState<'users' | 'settings' | 'backup'>('users');
  const activeTab = adminTab || internalTab;
  const setActiveTab = setAdminTab || setInternalTab;

  const AVAILABLE_MODULES = ['Dashboard', 'Agenda', 'Pacientes', 'Retorno', 'Mensagens', 'Financeiro', 'Administração', 'Documentos'];

  const toggleModule = (module: string, currentModules: string[], setter: (m: string[]) => void) => {
    if (currentModules.includes(module)) {
      setter(currentModules.filter(m => m !== module));
    } else {
      setter([...currentModules, module]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="bg-slate-900 text-white p-6 md:p-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center shadow-lg gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-2 uppercase italic font-serif text-brand-cyan text-center md:text-left">Gestão Estratégica</h2>
          <p className="text-slate-400 text-[10px] font-mono tracking-wider uppercase text-center md:text-left">Controle de usuários, permissões e infraestrutura.</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar w-full md:w-auto">
          <button 
            type="button"
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0",
              activeTab === 'users' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Usuários
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0",
              activeTab === 'settings' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Configurações
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('backup')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0",
              activeTab === 'backup' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Backup
          </button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'backup' && (
          <BackupView 
            data={data}
            patients={patients}
            users={users}
            documents={documents}
            clinicName={clinicName}
            onRestore={onRestore}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView 
            clinicName={clinicName} 
            clinicLogo={clinicLogo}
            footerText={footerText}
            providerPhone={providerPhone}
            providerName={providerName}
            onUpdateSettings={onUpdateSettings} 
            onResetDatabase={onResetDatabase}
            isAdmin={currentUser?.role?.toLowerCase() === 'admin'}
            deferredPrompt={deferredPrompt}
            onInstallPWA={onInstallPWA}
          />
        )}
        
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {showAddUser && (
                <section className="bg-white border-2 border-brand-cyan p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-brand-cyan">Novo Usuário</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Nome</label>
                      <input 
                        type="text" 
                        value={newUserName}
                        onChange={(e) => setNewUserName(SecurityUtils.limit(SecurityUtils.sanitizeLettersOnly(e.target.value), 80))}
                        placeholder="Nome completo"
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Cargo</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg cursor-pointer"
                      >
                        <option>Admin</option>
                        <option>Dentista</option>
                        <option>Recepcionista</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">E-mail</label>
                      <input 
                        type="email" 
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(SecurityUtils.sanitizeEmail(e.target.value))}
                        placeholder="email@clinica.com"
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Telefone</label>
                      <input 
                        type="tel" 
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(SecurityUtils.maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Login</label>
                      <input 
                        type="text" 
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 30))}
                        placeholder="usuario.acesso"
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Senha</label>
                      <input 
                        type="password" 
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(SecurityUtils.limit(e.target.value, 20))}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 block ml-1">Módulos Acessíveis</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {AVAILABLE_MODULES.map(m => (
                        <label key={m} className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                          newUserModules.includes(m) ? "bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan font-bold" : "bg-slate-50 border-slate-100 text-slate-400"
                        )}>
                          <input 
                            type="checkbox" 
                            checked={newUserModules.includes(m)}
                            onChange={() => toggleModule(m, newUserModules, setNewUserModules)}
                            className="hidden"
                          />
                          <span className="text-[10px] uppercase truncate">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setShowAddUser(false)} 
                      className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      disabled={isSubmitting}
                      onClick={async () => { 
                        if(newUserName && newUserUsername && newUserPassword) { 
                          if (SecurityUtils.hasDangerousScript(newUserName) || SecurityUtils.hasDangerousScript(newUserUsername) || SecurityUtils.hasDangerousScript(newUserEmail)) {
                            alert('Ação bloqueada por motivos de segurança (XSS detectado).');
                            return;
                          }

                          if (newUserEmail && !SecurityUtils.isValidEmail(newUserEmail)) {
                            alert('E-mail inválido.');
                            return;
                          }

                          setIsSubmitting(true);
                          try {
                            const success = await onAddUser({ 
                              name: newUserName, 
                              role: newUserRole, 
                              username: newUserUsername.toLowerCase().trim(), 
                              password: newUserPassword,
                              email: newUserEmail,
                              phone: newUserPhone,
                              modules: newUserModules.join(', ')
                            }); 
                            
                            if (success) {
                              setNewUserName(''); 
                              setNewUserUsername(''); 
                              setNewUserPassword('123'); 
                              setNewUserEmail('');
                              setNewUserPhone('');
                              setNewUserModules(['Dashboard', 'Agenda', 'Pacientes']);
                              setShowAddUser(false); 
                            }
                          } finally {
                            setIsSubmitting(false);
                          }
                        }
                      }}
                      className="px-6 py-2 bg-brand-cyan text-white text-[10px] font-bold uppercase rounded-lg shadow-md hover:translate-y-[-1px] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : 'Cadastrar'}
                    </button>
                  </div>
                </section>
              )}

              {editingUser && (
                <section className="bg-white border-2 border-emerald-500 p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600">Editar Usuário: {editingUser.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Nome</label>
                      <input 
                        type="text" 
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({...editingUser, name: SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 80)})}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-emerald-500 outline-none rounded-lg" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Cargo</label>
                      <select 
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-emerald-500 outline-none rounded-lg cursor-pointer"
                      >
                        <option>Admin</option>
                        <option>Dentista</option>
                        <option>Recepcionista</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">E-mail</label>
                      <input 
                        type="email" 
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({...editingUser, email: SecurityUtils.sanitizeEmail(e.target.value)})}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-emerald-500 outline-none rounded-lg" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Telefone</label>
                      <input 
                        type="tel" 
                        value={editingUser.phone || ''}
                        onChange={(e) => setEditingUser({...editingUser, phone: SecurityUtils.maskPhone(e.target.value)})}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-emerald-500 outline-none rounded-lg" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Usuário (Login)</label>
                      <input 
                        type="text" 
                        value={editingUser.username || ''}
                        onChange={(e) => setEditingUser({...editingUser, username: SecurityUtils.limit(e.target.value.toLowerCase().trim(), 30)})}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-emerald-500 outline-none rounded-lg font-mono" 
                        placeholder="nome.usuario"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Nova Senha</label>
                      <input 
                        type="password" 
                        value={editingUser.password || ''}
                        onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-emerald-500 outline-none rounded-lg" 
                        placeholder="Senha de acesso"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 block ml-1">Módulos Acessíveis</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {AVAILABLE_MODULES.map(m => {
                        const currentModules = (editingUser.modules || '').split(', ').filter(Boolean);
                        const isChecked = currentModules.includes(m);
                        return (
                          <label key={m} className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                            isChecked ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-bold" : "bg-slate-50 border-slate-100 text-slate-400"
                          )}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {
                                let newModules;
                                if (isChecked) {
                                  newModules = currentModules.filter(mod => mod !== m);
                                } else {
                                  newModules = [...currentModules, m];
                                }
                                setEditingUser({ ...editingUser, modules: newModules.join(', ') });
                              }}
                              className="hidden"
                            />
                            <span className="text-[10px] uppercase truncate">{m}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setEditingUser(null)} 
                      className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      disabled={isSubmitting}
                      onClick={async () => { 
                        if (SecurityUtils.hasDangerousScript(editingUser.name) || SecurityUtils.hasDangerousScript(editingUser.email) || SecurityUtils.hasDangerousScript(editingUser.username)) {
                          alert('Ação bloqueada por motivos de segurança (XSS detectado).');
                          return;
                        }
                        if (editingUser.email && !SecurityUtils.isValidEmail(editingUser.email)) {
                          alert('E-mail inválido.');
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          const success = await onUpdateUser(editingUser.id, editingUser); 
                          if (success) {
                            alert('Usuário atualizado com sucesso!');
                            setEditingUser(null);
                          }
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="px-6 py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-md hover:translate-y-[-1px] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : 'Atualizar'}
                    </button>
                  </div>
                </section>
              )}

              <section className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Base de Acesso</h3>
                  <button 
                    onClick={() => setShowAddUser(true)}
                    className="text-[10px] font-bold bg-slate-900 text-white px-4 py-2 rounded-lg tracking-widest uppercase hover:bg-brand-cyan transition-all shadow-sm"
                  >
                    + Novo Usuário
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Cargo / Contato</th>
                        <th className="px-6 py-4">Acesso</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono text-slate-600 divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-sans font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                              {u.name}
                              {u.isNonExistent && (
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-400 text-[7px] font-bold rounded uppercase tracking-wider">
                                  Inexistente
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">@{u.username}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="mb-1.5 flex flex-wrap gap-1.5 items-center">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black uppercase rounded shadow-sm">
                                {u.role}
                              </span>
                              {u.blocked ? (
                                <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 text-[8px] font-black uppercase rounded shadow-sm flex items-center gap-1 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                  Bloqueado ({u.isNonExistent ? "3/3" : "5/5"})
                                </span>
                              ) : u.loginAttempts && u.loginAttempts > 0 ? (
                                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[8px] font-black uppercase rounded shadow-sm">
                                  Erros: {u.loginAttempts}/{u.isNonExistent ? 3 : 5}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[8px] font-black uppercase rounded shadow-sm">
                                  {u.isNonExistent ? "Inexistente Limpo" : "Ativo"}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 font-sans">
                              {u.email && <div>{u.email}</div>}
                              {u.phone && <div>{u.phone}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[9px] text-slate-400 font-sans">{u.modules}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(u.blocked || (u.loginAttempts && u.loginAttempts > 0)) && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserToUnlock(u);
                                  }}
                                  className="p-2 text-rose-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Desbloquear Usuário"
                                >
                                  <Unlock className="w-4 h-4" />
                                </button>
                              )}
                              {!u.isNonExistent && (
                                <button 
                                  onClick={() => setEditingUser(u)}
                                  className="p-2 text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/5 rounded-lg transition-all"
                                  title="Editar Usuário"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserToDelete(u);
                                }}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-50 pb-2 tracking-widest">Diagnóstico</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-emerald-500 font-bold">Cloud Sync Ativa</span>
                    <Activity className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-500 uppercase">Usuários Ativos</span>
                    <span className="text-slate-800 font-bold">{users.length}</span>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 p-6 rounded-2xl text-white space-y-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-10%] opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                  <Shield className="w-32 h-32" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-brand-cyan">Infraestrutura</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">Sistema rodando em ambiente seguro. Backups redundantes ativos.</p>
              </section>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {userToDelete && (
          <ConfirmUserDeleteModal 
            user={userToDelete}
            onCancel={() => setUserToDelete(null)}
            onConfirm={async () => {
              const id = userToDelete.id;
              setUserToDelete(null);
              await onDeleteUser(id);
            }}
          />
        )}
        {userToUnlock && (
          <ConfirmUserUnlockModal 
            user={userToUnlock}
            onCancel={() => setUserToUnlock(null)}
            onConfirm={async () => {
              const u = userToUnlock;
              setUserToUnlock(null);
              const updatedUser = { ...u, blocked: false, loginAttempts: 0 };
              const success = await onUpdateUser(u.id, updatedUser);
              if (success) {
                try {
                  // Clear the distributed database temporary lockout key
                  await deleteDoc(doc(db, 'login_attempts', u.username.trim().toLowerCase()));
                } catch (err) {
                  console.warn("Failed reset of login attempts collection doc:", err);
                }
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmUserUnlockModal({ user, onConfirm, onCancel }: { user: any, onConfirm: () => void, onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 text-slate-900">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm shadow-none"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-[210] border border-emerald-100 p-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <Unlock className="w-8 h-8 text-emerald-500 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Desbloquear Usuário?</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Deseja restaurar o acesso e zerar as tentativas incorretas de login de <span className="font-bold text-slate-800">{user?.isNonExistent ? `@${user?.username}` : user?.name}</span>?
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 text-slate-500 font-bold bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 cursor-pointer"
            >
              Desbloquear
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmUserDeleteModal({ user, onConfirm, onCancel }: { user: any, onConfirm: () => void, onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 text-slate-900">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm shadow-none"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-[210] border border-rose-100 p-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir Usuário?</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Tem certeza que deseja excluir permanentemente o acesso de <span className="font-bold text-slate-800">{user?.name}</span>? 
            Esta ação removerá o login do usuário do sistema.
          </p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 text-slate-500 font-bold bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-rose-200 cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


function MetricCard({ label, value, description, icon, trend }: {
  label: string;
  value: string | number;
  description: string;
  icon?: React.ReactNode;
  trend?: number;
}) {
  return (
    <div className="bg-white p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-brand-cyan transition-colors">
      <div className="absolute top-0 left-0 w-1 h-full bg-brand-cyan opacity-20 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className="p-1 bg-slate-50 rounded text-slate-400">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-mono font-bold text-slate-800 tracking-tighter">{value}</div>
      <div className="flex items-center gap-2 mt-2">
        {trend !== undefined && (
          <span className={cn(
            "text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
            trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend > 0 ? <Plus className="w-2 h-2" /> : <Minus className="w-2 h-2" />}
            {Math.abs(trend)}%
          </span>
        )}
        <span className="text-[9px] text-slate-400 font-medium italic">{description}</span>
      </div>
    </div>
  );
}

function LoginView({ 
  users, 
  onLogin, 
  onOpenBooking,
  onPrivacyPolicy,
  onTerms,
  clinicName,
  clinicLogo,
  footerText,
  onOpenFreeTrial
}: { 
  users: any[]; 
  onLogin: (user: any) => void; 
  onOpenBooking: () => void;
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  clinicName: string;
  clinicLogo: string | null;
  footerText: string;
  onOpenFreeTrial?: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockout, setLockout] = useState(SecurityUtils.getLockoutStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      const status = SecurityUtils.getLockoutStatus();
      setLockout(status);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Sanitize credentials before checking
    let cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.startsWith('/') || cleanUsername.startsWith('.')) {
      cleanUsername = cleanUsername.replace(/^[\/\.]+/, '');
    }
    const cleanPassword = password.trim();

    // Layer 1: Local Device Lockout
    if (lockout.isLocked) {
      setError(`Seu dispositivo está bloqueado devido a múltiplas tentativas malsucedidas de login. Tente de novo em ${lockout.remaining}s.`);
      return;
    }

    // Layer 1.5: Firestore Device Lockout (distributed protection per browser/device ID)
    try {
      const devLock = await SecurityUtils.checkDeviceLockout();
      if (devLock.isLocked) {
        setError(`Este dispositivo foi temporariamente bloqueado após exceder o limite de tentativas de login incorretas no sistema. Tente de novo em ${devLock.remaining}s.`);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    // Layer 2: Find the matching user in the system to verify definitive blocks immediately
    const matchedUser = users.find(u => {
      const dbUsername = (u.username || "").toString().trim().toLowerCase();
      return dbUsername === cleanUsername;
    });

    if (matchedUser && matchedUser.blocked === true) {
      if (matchedUser.isNonExistent) {
        setError(`Acesso bloqueado definitivamente. A conta inexistente de "@${cleanUsername}" foi bloqueada por excesso de tentativas de login incorretas. Entre em contato com o administrador para liberar o seu acesso.`);
      } else {
        setError(`Acesso bloqueado definitivamente. A conta de "@${cleanUsername}" foi bloqueada por excesso de tentativas de login incorretas. Entre em contato com o administrador para liberar o seu acesso.`);
      }
      setIsLoading(false);
      return;
    }

    // Layer 3: Firestore Database Lockout (distributed protection per username)
    try {
      const dbLockout = await SecurityUtils.checkFirestoreLockout(cleanUsername);
      if (dbLockout.isLocked) {
        setError(`Esta conta ("${cleanUsername}") encontra-se bloqueada temporariamente para conter ataques de força bruta. Tente de novo em ${dbLockout.remaining}s.`);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    // Layer 3.5: Second layer device lockout check
    try {
      const devLockout = await SecurityUtils.checkDeviceLockout();
      if (devLockout.isLocked) {
        setError(`Este dispositivo foi temporariamente bloqueado após exceder o limite de tentativas de login incorretas no sistema. Tente de novo em ${devLockout.remaining}s.`);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    
    // Simulate server delay/security check
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Verify authentication credentials
    let user = null;
    let isCorrectPassword = false;

    if (matchedUser && !matchedUser.isNonExistent) {
      const dbPassword = (matchedUser.password || "").toString().trim();
      if (dbPassword === cleanPassword) {
        isCorrectPassword = true;
        user = matchedUser;
      }
    } else {
      // ABSOLUTE FALLBACK ONLY if not found in ANY reactive list and using original default (for admin)
      if (cleanUsername === 'ana.admin' && cleanPassword === '123') {
        const initialAna = INITIAL_USERS.find(u => u.username === 'ana.admin');
        if (initialAna && initialAna.password === '123') {
          user = initialAna;
          isCorrectPassword = true;
        }
      } else if (cleanUsername === 'administrador' && cleanPassword === '123') {
        const initialAdmin = INITIAL_USERS.find(u => u.username === 'administrador');
        if (initialAdmin && initialAdmin.password === '123') {
          user = initialAdmin;
          isCorrectPassword = true;
        }
      }
    }

    if (user && isCorrectPassword) {
      SecurityUtils.recordAttempt(true);
      await SecurityUtils.recordAttemptFirestore(cleanUsername, true);
      await SecurityUtils.recordDeviceAttempt(true);

      // Clean consecutive failed login attempts on success
      try {
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, {
          loginAttempts: 0,
          blocked: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Failed reset of login attempts inside users collection:", err);
      }

      try {
        await onLogin(user);
      } catch (e: any) {
        setError(e.message || "Erro durante o login.");
        setIsLoading(false);
      }
    } else {
      SecurityUtils.recordAttempt(false);
      await SecurityUtils.recordAttemptFirestore(cleanUsername, false);
      await SecurityUtils.recordDeviceAttempt(false);
      const updatedLocalLockout = SecurityUtils.getLockoutStatus();
      setLockout(updatedLocalLockout);

      if (matchedUser) {
        if (matchedUser.isNonExistent) {
          try {
            const userRef = doc(db, 'users', matchedUser.id);
            const currentAttempts = (matchedUser.loginAttempts || 0) + 1;
            const isBlockedDefinitively = currentAttempts >= 3;

            await setDoc(userRef, {
              loginAttempts: currentAttempts,
              blocked: isBlockedDefinitively,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            if (isBlockedDefinitively) {
              setError(`Acesso bloqueado definitivamente. A conta inexistente de "@${cleanUsername}" foi bloqueada por excesso de tentativas de login incorretas. Entre em contato com o administrador para liberar o seu acesso.`);
            } else {
              const remaining = 3 - currentAttempts;
              setError(`A conta de usuário "@${cleanUsername}" não existe no sistema. Restam ${remaining} de 3 tentativas antes do bloqueio definitivo de acesso.`);
            }
          } catch (err) {
            console.error("Critical error setting non-existent lock flag inside database:", err);
            setError('Credenciais inválidas.');
          }
        } else {
          try {
            const userRef = doc(db, 'users', matchedUser.id);
            const currentAttempts = (matchedUser.loginAttempts || 0) + 1;
            const isBlockedDefinitively = currentAttempts >= 5;

            await setDoc(userRef, {
              loginAttempts: currentAttempts,
              blocked: isBlockedDefinitively,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            if (isBlockedDefinitively) {
              setError(`Acesso bloqueado definitivamente. A conta de "@${cleanUsername}" errou a senha 5 vezes consecutivas e foi bloqueada. Apenas um administrador poderá desbloquear o seu acesso pelo painel.`);
            } else {
              const remaining = 5 - currentAttempts;
              setError(`Senha incorreta para "@${cleanUsername}". Restam ${remaining} de 5 tentativas antes do bloqueio definitivo della conta.`);
            }
          } catch (err) {
            console.error("Critical error setting lock flag inside database:", err);
            setError('Credenciais inválidas.');
          }
        }
      } else {
        // No match found in user base
        try {
          const mockUserId = `nonexistent_${cleanUsername}`;
          const currentAttempts = 1;

          await setDoc(doc(db, 'users', mockUserId), {
            id: mockUserId,
            name: `Conta Inexistente`,
            username: cleanUsername,
            role: 'Inexistente',
            modules: 'Nenhum',
            isNonExistent: true,
            loginAttempts: currentAttempts,
            blocked: false,
            updatedAt: new Date().toISOString()
          });

          setError(`A conta de usuário "@${cleanUsername}" não existe no sistema. Restam 2 de 3 tentativas antes do bloqueio definitivo de acesso.`);
        } catch (err) {
          console.error("Critical error registering mock user for non-existent block tracking:", err);
          setError('Credenciais inválidas.');
        }
      }
      setIsLoading(false);
    }
  };

  const firstWord = (clinicName.split(' ')[0] || 'odonto').toLowerCase();
  const restWords = (clinicName.split(' ').slice(1).join(' ') || 'dash').toLowerCase();

  return (
    <div className="h-screen w-screen bg-[#f4f6f9] flex flex-col items-center justify-center relative font-sans overflow-hidden select-none p-4">
      {/* subtle clean background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e125_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e125_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-0 opacity-40" />
      
      <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center justify-center">
        {/* Authentic Compact Card Frame */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-white rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-[#cbd5e1] overflow-hidden"
        >
          {/* Elegant Clinic Branding Header */}
          <div className="flex flex-col items-center py-4 px-6 bg-white border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              {clinicLogo ? (
                <img 
                  src={clinicLogo} 
                  alt={clinicName} 
                  referrerPolicy="no-referrer" 
                  className="h-9 max-h-9 object-contain" 
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-200">
                    <Stethoscope className="w-4.5 h-4.5 text-[#2a4f72]" />
                  </div>
                  <span className="text-lg font-black text-slate-800 tracking-tight uppercase">
                    {clinicName}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[9px] text-[#64748b] font-black tracking-widest uppercase mt-1">SISTEMA CLÍNICO INTEGRADO</p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 bg-white text-left font-sans">
            <div className="text-left select-none">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-0.5">Acesso ao Sistema</h2>
              <p className="text-[10px] text-slate-400 font-medium">Insira suas credenciais cadastradas na clínica.</p>
            </div>

            {/* Username/Login Input */}
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-extrabold text-[#475569] uppercase tracking-widest ml-0.5">Nome de Usuário (Login)</label>
              <div className="relative group/input">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-[#2a4f72] transition-colors">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-[4px] font-bold text-slate-850 outline-none focus:border-[#2a4f72] focus:ring-2 focus:ring-[#2a4f72]/10 focus:bg-white transition-all placeholder:text-slate-400 shadow-inner"
                  placeholder="exemplo: ana.admin"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-extrabold text-[#475569] uppercase tracking-widest ml-0.5">Senha (Palavra-passe)</label>
              <div className="relative group/input">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-[#2a4f72] transition-colors">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full text-xs pl-9 pr-9 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-[4px] font-bold text-slate-850 outline-none focus:border-[#2a4f72] focus:ring-2 focus:ring-[#2a4f72]/10 focus:bg-white transition-all placeholder:text-slate-400 shadow-inner"
                  placeholder="sua senha"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message Area */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-rose-50 border border-rose-200 text-rose-755 text-[10px] p-2.5 rounded-[4px] font-bold leading-relaxed w-full flex items-start gap-2 shadow-sm"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button & Clear */}
            <div className="pt-1 flex items-center gap-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#2a4f72] hover:bg-[#1e3a54] text-white border-0 rounded-[4px] py-2.5 px-4 text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow hover:shadow-md disabled:opacity-45 select-none text-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <span>Acessar o Painel</span>
                )}
              </button>

              <button 
                type="button"
                onClick={() => { setUsername(''); setPassword(''); setError(null); }}
                className="px-3 py-2.5 bg-[#e4e4e7] hover:bg-[#d4d4d8] text-slate-600 rounded-[4px] text-[11px] font-bold transition-all cursor-pointer select-none"
              >
                Limpar
              </button>
            </div>

            {/* Compact system info footer inside the card */}
            <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[8px] font-bold text-slate-450 select-none uppercase tracking-wide">
              <div className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-[#10b981] animate-pulse"></span>
                <span>Conectado</span>
              </div>
              <div>
                VERSÃO CLÍNICA 19.3
              </div>
            </div>
          </form>
        </motion.div>

        {/* Compact Portal Shortcuts */}
        <div className="flex flex-wrap justify-center items-center gap-4 mt-4 text-[9px] font-extrabold text-[#2a4f72] tracking-wider uppercase select-none">
          {onOpenFreeTrial && (
            <button 
              type="button" 
              onClick={onOpenFreeTrial} 
              className="hover:text-amber-600 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500/20" />
              <span>Instalar Instância ERP</span>
            </button>
          )}
          {onOpenFreeTrial && <span className="text-slate-300 shrink-0">•</span>}
          <button 
            type="button" 
            onClick={onOpenBooking} 
            className="hover:text-cyan-600 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Calendar className="w-3 h-3 text-[#2a4f72]" />
            <span>Portal de Agendamento do Paciente</span>
          </button>
        </div>

        {/* Brand Copyright & Policy Links */}
        <div className="text-center mt-5 select-none text-[9px] text-slate-400 font-bold uppercase tracking-widest flex flex-col items-center gap-1.5 md:flex-row md:gap-3 justify-center">
          <span>Copyright © 2026 {clinicName}</span>
          <span className="hidden md:inline text-slate-300">•</span>
          <div className="flex gap-2">
            <button type="button" onClick={onPrivacyPolicy} className="hover:text-slate-600 transition-colors cursor-pointer">
              Privacidade
            </button>
            <span className="text-slate-300">•</span>
            <button type="button" onClick={onTerms} className="hover:text-slate-600 transition-colors cursor-pointer">
              Termos de Uso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DentalRecord['status'] }) {
  const styles: Record<string, string> = {
    'Realizado': 'text-emerald-600',
    'Agendado': 'text-blue-500',
    'Pendente': 'text-amber-600',
    'Cancelado': 'text-rose-600',
    'Em Atendimento': 'text-brand-cyan animate-pulse',
    'Concluído': 'text-emerald-500'
  };

  return (
    <span className={cn(
      "text-[10px] font-bold uppercase tracking-tighter font-sans flex items-center gap-1",
      styles[status || 'Pendente']
    )}>
      {status === 'Em Atendimento' && <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />}
      {status}
    </span>
  );
}

function PublicBookingView({ 
  onBack, 
  users, 
  data,
  onPrivacyPolicy,
  onTerms,
  clinicName,
  clinicLogo,
  footerText,
  initialFormData
}: { 
  onBack: () => void; 
  users: any[]; 
  data: DentalRecord[];
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  clinicName: string;
  clinicLogo: string | null;
  footerText: string;
  initialFormData?: {
    dentista?: string;
    data?: string;
    horario?: string;
    paciente?: string;
    telefone?: string;
    procedimento?: string;
  };
}) {
  const minDate = getSystemInitialDate();

  const [step, setStep] = useState(() => initialFormData ? 2 : 1);
  const [bookingData, setBookingData] = useState({
    dentista: initialFormData?.dentista || '',
    data: initialFormData?.data || minDate,
    horario: initialFormData?.horario || '',
    paciente: initialFormData?.paciente || '',
    telefone: initialFormData?.telefone || '',
    procedimento: initialFormData?.procedimento || 'Consulta Inicial'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const doctors = useMemo(() => users.filter(u => u.role === 'Dentista' || u.role === 'Admin'), [users]);
  
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const handleSubmit = async () => {
    const trimmedName = (bookingData.paciente || '').trim();
    const words = trimmedName.split(/\s+/).filter(Boolean);

    if (!trimmedName || !bookingData.telefone || !bookingData.dentista || !bookingData.horario) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    const selectedDateTime = parseISO(`${bookingData.data}T${bookingData.horario}`);
    const now = new Date();
    const bufferMinutes = 15;
    if (selectedDateTime < new Date(now.getTime() - bufferMinutes * 60000)) {
      alert('O horário selecionado já passou. Por favor, escolha um horário futuro.');
      setStep(2);
      return;
    }

    if (trimmedName.length < 3) {
      alert('O seu nome deve conter no mínimo 3 caracteres.');
      return;
    }

    if (words.length < 2) {
      alert('Por favor, preencha seu nome e sobrenome.');
      return;
    }

    if (SecurityUtils.hasDangerousScript(trimmedName) || SecurityUtils.hasDangerousScript(bookingData.telefone)) {
      alert('Ação bloqueada por segurança (XSS detectado).');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPatientId = '';
      try {
        console.log("[PortalBooking] Buscando pacientes para verificar duplicados...");
        const patientsSnap = await getDocs(collection(db, 'patients'));
        const patientsList = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const existingPatient = findPatientByRobustMatch(trimmedName, patientsList);

        if (!existingPatient) {
          finalPatientId = `pat-${Date.now()}`;
          console.log("[PortalBooking] Paciente não cadastrado. Criando registro para o paciente:", finalPatientId);
          const patientData = {
            id: finalPatientId,
            name: trimmedName,
            email: '',
            phone: bookingData.telefone || '',
            cpf: '',
            dentistaResponsavel: bookingData.dentista || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'patients', finalPatientId), patientData);
        } else {
          finalPatientId = existingPatient.id;
          console.log("[PortalBooking] Paciente já cadastrado:", existingPatient.name);
          const needsUpdate = !existingPatient.phone || !existingPatient.dentistaResponsavel;
          if (needsUpdate) {
            const updatedPatientData = {
              phone: existingPatient.phone || bookingData.telefone || '',
              dentistaResponsavel: existingPatient.dentistaResponsavel || bookingData.dentista || '',
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'patients', existingPatient.id), updatedPatientData, { merge: true });
          }
        }
      } catch (patientAutoErr) {
        console.error("[PortalBooking] Erro ao cadastrar paciente automaticamente:", patientAutoErr);
      }

      const id = `booking-${Date.now()}`;
      const record: DentalRecord = {
        id,
        data: bookingData.data,
        horario: bookingData.horario,
        paciente: trimmedName,
        pacienteId: finalPatientId || undefined,
        telefone: bookingData.telefone,
        procedimento: bookingData.procedimento,
        dentista: bookingData.dentista,
        status: 'Pendente',
        statusPagamento: 'Pendente',
        valor: 150
      };
      
      const isTaken = data.some(r => 
        r.dentista === record.dentista && 
        r.data === record.data && 
        r.horario === record.horario &&
        r.status !== 'Cancelado'
      );

      if (isTaken) {
        alert('Este horário já foi preenchido por outro paciente enquanto você preenchia os dados. Por favor, selecione outro horário.');
        setStep(2);
        return;
      }

      await setDoc(doc(db, 'records', id), record);
      setIsSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Erro ao agendar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white md:bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-cyan/5 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white md:rounded-[40px] md:shadow-2xl md:shadow-slate-200/50 p-8 md:p-12 text-center max-w-lg w-full md:border border-slate-100 relative z-10"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 -rotate-3" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Tudo pronto!</h2>
          <p className="text-slate-500 text-base leading-relaxed mb-10">
            Sua solicitação de agendamento foi enviada. Nossa equipe entrará em contato via WhatsApp 
            <span className="font-bold text-slate-800"> ({bookingData.telefone})</span> para confirmar seu horário.
          </p>
          <button 
            onClick={onBack}
            className="w-full py-5 bg-brand-cyan text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-brand-cyan/90 transition-all shadow-xl shadow-brand-cyan/20 active:scale-[0.98]"
          >
            Voltar para a home
          </button>
        </motion.div>
        
        <div className="mt-12 text-center relative z-10">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Ambiente Seguro por ClinicalGate</p>
          <Footer onPrivacyPolicy={onPrivacyPolicy} onTerms={onTerms} footerText={footerText} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             {clinicLogo ? (
              <img src={clinicLogo} alt={clinicName} className="h-8 md:h-10 w-auto object-contain" />
            ) : (
              <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tighter">
                {clinicName} <span className="text-brand-cyan font-normal">Agendamento</span>
              </h1>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={cn(
                  "w-8 h-1 rounded-full transition-all duration-500",
                  step === s ? "bg-brand-cyan w-12" : (step > s ? "bg-emerald-400" : "bg-slate-100")
                )} 
              />
            ))}
          </div>
          <button 
            onClick={onBack}
            className="text-xs font-bold text-slate-400 hover:text-brand-cyan uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-8 md:py-16">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
              {step === 1 && "Com qual profissional deseja agendar?"}
              {step === 2 && "Quando você prefere vir?"}
              {step === 3 && "Só mais alguns detalhes..."}
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Passo {step} de 3 — {step === 1 ? "Escolha do Especialista" : step === 2 ? "Dia e Horário" : "Confirmação"}
            </p>
          </div>

          <div className="bg-white md:rounded-[40px] shadow-2xl shadow-slate-200/40 p-6 md:p-12 border border-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <Calendar className="w-64 h-64 text-slate-900" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {doctors.map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => setBookingData(prev => ({ ...prev, dentista: doc.name }))}
                          className={cn(
                            "p-6 rounded-[32px] border-2 text-left transition-all relative group flex flex-col items-center text-center overflow-hidden",
                            bookingData.dentista === doc.name 
                              ? "border-brand-cyan bg-brand-cyan/[0.03] shadow-2xl shadow-brand-cyan/10 ring-1 ring-brand-cyan/20" 
                              : "border-slate-50 hover:border-slate-200 bg-white hover:shadow-xl hover:shadow-slate-200/40"
                          )}
                        >
                          {/* Selection Indicator */}
                          <div className={cn(
                            "absolute -top-12 -right-12 w-24 h-24 bg-brand-cyan transition-transform duration-500 rounded-full",
                            bookingData.dentista === doc.name ? "translate-x-0 translate-y-0" : "translate-x-full translate-y-full"
                          )}>
                            <CheckCircle2 className="absolute bottom-6 left-6 w-5 h-5 text-white" />
                          </div>

                          <div className={cn(
                            "relative w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black mb-6 transition-all duration-500",
                            bookingData.dentista === doc.name 
                              ? "bg-brand-cyan text-white shadow-2xl shadow-brand-cyan/40 scale-110" 
                              : "bg-slate-50 text-slate-300 group-hover:bg-slate-100 group-hover:text-brand-cyan"
                          )}>
                            {doc.name[0]}
                          </div>

                          <div className="space-y-2 relative z-10">
                            <p className="text-xl font-black text-slate-900 tracking-tight">{doc.name}</p>
                            <div className="flex flex-col gap-2 items-center">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                {doc.role === 'Admin' ? 'Especialista Sênior' : 'Clínico Geral'}
                              </span>
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Disponível</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex justify-center pt-4">
                      <button 
                        disabled={!bookingData.dentista}
                        onClick={() => setStep(2)}
                        className="w-full max-w-sm py-5 bg-brand-cyan text-white font-black text-sm uppercase tracking-widest rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-xl shadow-brand-cyan/20 active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        Continuar para data e hora
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-brand-cyan" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Selecione o melhor dia</h3>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                          <input 
                            id="booking-date"
                            type="date" 
                            min={minDate}
                            value={bookingData.data}
                            onChange={(e) => {
                              const newData = e.target.value;
                              if (!newData) return;
                              
                              const dateObj = parseISO(newData);
                              const day = getDay(dateObj);

                              if (day === 0 || day === 6) {
                                alert("Desculpe, a clínica não realiza atendimentos aos sábados e domingos. Por favor, escolha um dia útil de segunda a sexta.");
                                e.target.value = bookingData.data; // Reset visually
                                return;
                              }

                              setBookingData(prev => {
                                const newBookingData = { ...prev, data: newData };
                                if (newData === format(new Date(), 'yyyy-MM-dd') && prev.horario) {
                                  if (prev.horario < format(new Date(), 'HH:mm')) {
                                    newBookingData.horario = '';
                                  }
                                }
                                return newBookingData;
                              });
                            }}
                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all font-bold text-slate-800"
                          />
                          <p className="mt-4 text-xs text-slate-500 flex items-center gap-2 px-1">
                            <Info className="w-3.5 h-3.5 text-brand-cyan" />
                            Atendimentos de Segunda a Sexta das 08h às 17h.
                          </p>
                          <p className="mt-2 text-xs text-slate-500 flex items-center gap-2 px-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Exibindo horários para {format(parseISO(bookingData.data), "eeee, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-indigo-500" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Horários disponíveis</h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                          {timeSlots.map(time => {
                            const isTaken = data.some(r => 
                              r.dentista === bookingData.dentista && 
                              r.data === bookingData.data && 
                              r.horario === time &&
                              r.status !== 'Cancelado'
                            );

                            const isTodaySelected = bookingData.data === format(new Date(), 'yyyy-MM-dd');
                            const isPast = isTodaySelected && time <= format(new Date(), 'HH:mm');
                            
                            return (
                              <button
                                key={time}
                                disabled={isTaken || isPast}
                                onClick={() => setBookingData(prev => ({ ...prev, horario: time }))}
                                className={cn(
                                  "py-3 text-sm font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5",
                                  bookingData.horario === time
                                    ? "bg-brand-cyan text-white border-brand-cyan shadow-lg shadow-brand-cyan/20 scale-105 z-10"
                                    : (isTaken || isPast)
                                      ? "bg-slate-100/50 text-slate-300 border-transparent cursor-not-allowed grayscale"
                                      : "bg-white text-slate-600 border-white hover:border-brand-cyan hover:shadow-md"
                                )}
                              >
                                {time}
                                {isTaken && <span className="text-[7px] uppercase opacity-50">Ocupado</span>}
                                {isPast && !isTaken && <span className="text-[7px] uppercase opacity-50">Passou</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <button 
                        onClick={() => setStep(1)}
                        className="flex-1 py-5 text-slate-400 font-black text-sm uppercase tracking-widest border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                      >
                        Voltar
                      </button>
                      <button 
                        disabled={!bookingData.horario}
                        onClick={() => setStep(3)}
                        className="flex-[2] py-5 bg-brand-cyan text-white font-black text-sm uppercase tracking-widest rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-xl shadow-brand-cyan/20 active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        Próximo passo
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-500" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Seus dados para contato</h3>
                        </div>

                        <div className="space-y-6 bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input 
                              type="text"
                              placeholder="Como devemos lhe chamar?"
                              value={bookingData.paciente}
                              onChange={(e) => setBookingData(prev => ({ ...prev, paciente: SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 100) }))}
                              className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all text-slate-800 font-bold placeholder:font-normal"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                            <input 
                              type="tel"
                              placeholder="(00) 00000-0000"
                              value={bookingData.telefone}
                              onChange={(e) => setBookingData(prev => ({ ...prev, telefone: SecurityUtils.maskPhone(e.target.value) }))}
                              className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all text-slate-800 font-mono font-bold placeholder:font-normal"
                            />
                          </div>
                          <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                             <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                             <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
                              Ao finalizar, você autoriza o contato de nossa equipe via WhatsApp para confirmação definitiva do seu horário.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-amber-500" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Resumo da solicitação</h3>
                        </div>

                        <div className="bg-slate-900 rounded-[48px] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40 border border-white/5">
                          {/* Design accents */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 blur-[60px] pointer-events-none" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 blur-[40px] pointer-events-none" />
                          
                          {/* Ticket edge pattern visual */}
                          <div className="absolute left-0 top-1/2 -ml-2 w-4 h-8 bg-white rounded-full -translate-y-1/2 hidden lg:block" />
                          <div className="absolute right-0 top-1/2 -mr-2 w-4 h-8 bg-white rounded-full -translate-y-1/2 hidden lg:block" />

                          <div className="space-y-8 relative z-10">
                            <div className="pb-6 border-b border-white/10 text-center">
                              <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.3em] mb-3">Profissional Selecionado</p>
                              <div className="flex items-center justify-center gap-4">
                                <div className="w-12 h-12 bg-brand-cyan rounded-2xl flex items-center justify-center text-xl font-black">
                                  {bookingData.dentista[0]}
                                </div>
                                <p className="text-2xl font-black text-white tracking-tight">{bookingData.dentista}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-3xl bg-white/5 border border-white/5 space-y-1 backdrop-blur-sm">
                                <p className="text-[8px] text-white/30 uppercase font-black tracking-widest">Data Marcada</p>
                                <p className="text-lg font-black text-brand-cyan">{format(parseISO(bookingData.data), 'dd/MM')}</p>
                                <p className="text-[9px] text-white/50 font-bold">{format(parseISO(bookingData.data), 'yyyy')}</p>
                              </div>
                              <div className="p-4 rounded-3xl bg-white/5 border border-white/5 space-y-1 backdrop-blur-sm">
                                <p className="text-[8px] text-white/30 uppercase font-black tracking-widest">Início Previsto</p>
                                <p className="text-lg font-black text-brand-cyan">{bookingData.horario}</p>
                                <p className="text-[9px] text-white/50 font-bold">Horário Local</p>
                              </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between px-2">
                                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Procedimento</p>
                                  <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                                </div>
                                <div className="mt-2 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                  <Stethoscope className="w-4 h-4 text-brand-cyan" />
                                  <p className="text-sm font-bold">Primeira Avaliação Clínica</p>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <button 
                        onClick={() => setStep(2)}
                        className="flex-1 py-5 text-slate-400 font-black text-sm uppercase tracking-widest border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                      >
                        Voltar
                      </button>
                      <button 
                        disabled={isSubmitting || !bookingData.paciente || !bookingData.telefone}
                        onClick={handleSubmit}
                        className="flex-[2] py-5 bg-brand-cyan text-white font-black text-sm uppercase tracking-widest rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-xl shadow-brand-cyan/20 active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Finalizar agora
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-center text-slate-400 text-[10px] mt-12 uppercase tracking-[0.3em] font-black opacity-40">
            ClinicalGate Security Protocol 2.0
          </p>
        </div>
      </main>

      <footer className="py-12 bg-white border-t border-slate-100 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="text-center md:text-left">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">{footerText}</p>
          </div>
          <div className="flex gap-8">
            <button 
              onClick={onPrivacyPolicy} 
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-cyan transition-colors"
            >
              Privacidade
            </button>
            <button 
              onClick={onTerms} 
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-cyan transition-colors"
            >
              Termos
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan/50">Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EmailModal({ 
  patientName, 
  onClose, 
  onSave 
}: { 
  patientName: string; 
  onClose: () => void; 
  onSave: (name: string, email: string) => Promise<void> 
}) {
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!email || !SecurityUtils.isValidEmail(email)) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }
    if (SecurityUtils.hasDangerousScript(email)) {
      alert('Ação bloqueada: Conteúdo perigoso detectado.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(patientName, email);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="bg-brand-cyan p-6 text-white">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cadastrar E-mail</h3>
          </div>
          <p className="text-cyan-50 text-xs mt-1">O e-mail é necessário para enviar lembretes automáticos.</p>
        </div>

        <div className="p-8 space-y-6 relative">
          {isSaving && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
              <Activity className="w-8 h-8 text-brand-cyan animate-spin" />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Paciente</label>
            <div className="text-slate-800 font-bold">{patientName}</div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400">Endereço de E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
              <input 
                autoFocus
                disabled={isSaving}
                type="email"
                placeholder="exemplo@email.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:opacity-50"
                value={email}
                onChange={(e) => setEmail(SecurityUtils.sanitizeEmail(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && email && handleSave()}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              disabled={isSaving}
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              disabled={!email || !email.includes('@') || isSaving}
              onClick={handleSave}
              className="flex-1 px-4 py-3 rounded-xl bg-brand-cyan text-white font-bold text-sm shadow-lg shadow-brand-cyan/20 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              {isSaving ? 'Salvando...' : 'Salvar e Enviar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- LEGAL COMPONENTS ---

function PrivacyPolicyModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Política de Privacidade</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Última atualização: Maio 2026</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-slate-600 text-sm leading-relaxed space-y-6">
          <section>
            <h3 className="text-slate-800 font-bold mb-2">1. Coleta de Dados</h3>
            <p>Coletamos dados pessoais como nome, e-mail, telefone e CPF para fins exclusívos de agendamento e prestação de serviços odontológicos em nossa clínica.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">2. Uso das Informações</h3>
            <p>Suas informações são utilizadas para:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Confirmar agendamentos via WhatsApp ou E-mail.</li>
              <li>Manter seu histórico clínico (prontuário) atualizado.</li>
              <li>Processar pagamentos e emissão de recibos.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">3. Proteção de Dados (LGPD)</h3>
            <p>Em conformidade com a LGPD, garantimos que seus dados são armazenados de forma segura e não são compartilhados com terceiros para fins de marketing sem seu consentimento explícito.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">4. Contato do DPO (Encarregado de Dados)</h3>
            <p>Para dúvidas sobre seus dados, entre em contato com nosso DPO através do e-mail: <strong>dpo@clinica-odonto.com</strong> ou pelo telefone da clínica.</p>
          </section>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-right">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-brand-cyan text-white font-bold rounded-xl shadow-lg shadow-brand-cyan/20 hover:scale-105 active:scale-95 transition-all"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'H'], label: 'Início / Dashboard', desc: 'Acessa a visão geral dos indicadores e metas da clínica.' },
    { keys: ['Ctrl', 'A'], label: 'Agenda / Calendário', desc: 'Abre a visualização do calendário de consultas.' },
    { keys: ['Ctrl', 'P'], label: 'Base de Pacientes', desc: 'Acessa a listagem geral com pesquisa dos pacientes cadastrados.' },
    { keys: ['Ctrl', 'N'], label: 'Novo Paciente', desc: 'Abre diretamente o formulário de cadastro de paciente.' },
    { keys: ['Ctrl', 'B'], label: 'Nova Consulta (Booking)', desc: 'Abre diretamente a tela de novo agendamento de consulta.' },
    { keys: ['Ctrl', 'M'], label: 'Central de Mensagens', desc: 'Gerencie e simule envios de WhatsApp.' },
    { keys: ['Ctrl', 'F'], label: 'Módulo Financeiro', desc: 'Acessa faturamentos, receitas e fluxo de caixa.' },
    { keys: ['Ctrl', 'K'], label: 'Guia de Atalhos', desc: 'Abra ou feche este guia de atalhos a qualquer momento.' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200" id="shortcut-modal">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-brand-cyan/25 p-2 rounded-xl text-brand-cyan">
              <Keyboard className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm tracking-wide">Atalhos de Teclado</h3>
              <p className="text-[10px] text-slate-300">Navegue com velocidade e agilidade no OdontoDash</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer select-none"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed text-left">
            💡 <strong>DICA DO PRO:</strong> Os modificadores funcionam tanto com a tecla <strong>Control (Ctrl)</strong> quanto no macOS com a tecla <strong>Command (⌘)</strong>. Atalhos são bloqueados dinamicamente quando você está escrevendo em campos de digitação para garantir sua escrita!
          </p>

          <div className="divide-y divide-slate-100 text-left">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 leading-normal flex items-center gap-1.5">
                    {shortcut.label}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-normal truncate">
                    {shortcut.desc}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {shortcut.keys.map((k, kIdx) => (
                    <kbd 
                      key={kIdx} 
                      className="px-2 py-1 bg-slate-100 text-[#0f172a] text-[10px] font-black tracking-wide rounded-md border border-slate-300 shadow-xs font-mono uppercase"
                    >
                      {k === 'Ctrl' ? 'Ctrl / ⌘' : k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">Use <strong className="font-black text-slate-600">Ctrl + K</strong> em qualquer lugar do sistema</span>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function TermsOfUseModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Termos de Uso</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Vigência: 2026</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-slate-600 text-sm leading-relaxed space-y-6">
          <section>
            <h3 className="text-slate-800 font-bold mb-2">1. Aceitação dos Termos</h3>
            <p>Ao utilizar este sistema de agendamento, você concorda em fornecer informações verídicas e atualizadas.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">2. Agendamentos</h3>
            <p>As solicitações feitas online são pré-agendamentos e dependem de confirmação manual pela nossa equipe de recepção.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">3. Cancelamentos</h3>
            <p>Solicitamos que cancelamentos sejam feitos com pelo menos 24 horas de antecedência para permitir que outros pacientes utilizem o horário.</p>
          </section>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CookieBanner({ onAccept, onDecline }: { onAccept: () => void, onDecline: () => void }) {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[999]"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Nós respeitamos sua privacidade</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Utilizamos cookies para melhorar sua experiência de agendamento e segurança do site. Ao continuar, você concorda com nossa política.
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button 
          onClick={onAccept}
          className="flex-1 py-3 bg-brand-cyan text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-cyan/20 hover:bg-brand-cyan/90 transition-all"
        >
          Aceitar Cookies
        </button>
        <button 
          onClick={onDecline}
          className="flex-1 py-3 bg-slate-50 text-slate-500 text-xs font-bold rounded-xl border border-slate-100 hover:bg-slate-100 transition-all"
        >
          Recusar
        </button>
      </div>
    </motion.div>
  );
}

function Footer({ 
  onPrivacyPolicy, 
  onTerms,
  footerText
}: { 
  onPrivacyPolicy: () => void; 
  onTerms: () => void;
  footerText: string;
}) {
  return (
    <footer className="mt-auto py-4 px-4 border-t border-slate-100 bg-white/50 backdrop-blur-sm w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{footerText}</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6">
          <button 
            type="button"
            onClick={onPrivacyPolicy}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-cyan transition-colors"
          >
            Política de Privacidade
          </button>
          <button 
            type="button"
            onClick={onTerms}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-cyan transition-colors"
          >
            Termos de Uso
          </button>
          <a href="#" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-cyan transition-colors">Segurança</a>
          <a href="#" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-cyan transition-colors">Ajuda</a>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-left">Site Protegido por <br/> ClinicalGate Security</span>
        </div>
      </div>
    </footer>
  );
}

interface FreeTrialDetails {
  fullName: string;
  clinicName: string;
  email: string;
  phone: string;
  plan: string;
  specialty: string;
  username: string;
  password: string;
  cpf: string;
}

// Complex Mathematical CPF Validation algorithm (Brazilian format)
const isValidCPFMathematic = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // Exclude equal sequences like 111.111.111-11
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Check for emojis or forbidden characters
const hasEmojisOrSpecialChars = (val: string, type: 'name' | 'clinic' | 'username' | 'password' | 'email') => {
  // Regex to detect emojis
  const emojiRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2000-\u3300]|\ud83e[\udd00-\udfff]/g;
  if (emojiRegex.test(val)) return true;

  if (type === 'name') {
    // Letters, standard Portuguese accents, spaces and dots only
    const nameRegex = /^[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s.]+$/;
    return !nameRegex.test(val);
  }

  if (type === 'clinic') {
    // Alphanumeric with special accents, spaces, digits, dots, hyphens, and standard symbols
    const clinicRegex = /^[a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s.\-&,]+$/;
    return !clinicRegex.test(val);
  }

  if (type === 'username') {
    // Alphanumeric, dot, underscore, dash. (No spaces, no weird symbols)
    const usernameRegex = /^[a-zA-Z0-9.\-_]+$/;
    return !usernameRegex.test(val);
  }

  if (type === 'email') {
    const emailRegex = /^[a-zA-Z0-9._%\-+]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return !emailRegex.test(val);
  }

  if (type === 'password') {
    const forbidden = /[<>\\]/;
    return forbidden.test(val);
  }

  return false;
};

function FreeTrialView({
  onBack,
  onStartTrial,
  clinicLogo,
  footerText
}: {
  onBack: () => void;
  onStartTrial: (details: FreeTrialDetails) => Promise<void>;
  clinicLogo: string | null;
  footerText: string;
}) {
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [plan, setPlan] = useState('Pro'); // Default Pro
  const [specialty, setSpecialty] = useState('Geral');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isBlockedByFingerprint, setIsBlockedByFingerprint] = useState(false);
  const [successCredentials, setSuccessCredentials] = useState<FreeTrialDetails | null>(null);

  useEffect(() => {
    // Client-side anti-abuse tracking: verify persistent LocalStorage and cookies
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    let hasLocalBlock = false;
    try {
      const storedStatus = localStorage.getItem('_sys_clinic_engine_state_');
      if (storedStatus) {
        const parsed = JSON.parse(storedStatus);
        if (parsed && parsed.hasCompletedTrial === true) {
          hasLocalBlock = true;
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (hasLocalBlock || getCookie('_odontodash_trial_block') === 'true') {
      setIsBlockedByFingerprint(true);
      setError('Aviso de Segurança: Este dispositivo já utilizou um período de teste grátis (Trial) do OdontoDash.');
    }
  }, []);

  const steps = [
    "Validando dados cadastrais e consultando integridade do CPF...",
    "Buscando duplicidades de conta no banco de dados central...",
    "Instanciando ambientes seguros em sandbox regulacionada LGPD...",
    "Disparando chaves de ativação via WhatsApp e E-mail de destino..."
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Filter/validate fields are filled
    if (!fullName.trim() || !clinicName.trim() || !email.trim() || !phone.trim() || !username.trim() || !password.trim() || !cpf.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios do formulário.');
      return;
    }

    // Mathematically validate the CPF
    if (!isValidCPFMathematic(cpf)) {
      setError('CPF inválido. Por favor, insira um CPF matematicamente válido para ativar sua conta de teste.');
      return;
    }

    // Emojis and Special Character limits verification
    if (hasEmojisOrSpecialChars(fullName, 'name')) {
      setError('O Nome Completo não deve conter emojis ou caracteres especiais (use apenas letras, acentos e espaços).');
      return;
    }
    if (hasEmojisOrSpecialChars(clinicName, 'clinic')) {
      setError('O Nome da Clínica não deve conter emojis ou caracteres especiais complexos.');
      return;
    }
    if (hasEmojisOrSpecialChars(username, 'username')) {
      setError('O Nome de Usuário não deve conter espaços, emojis ou caracteres especiais inválidos (permitido: letras, números, ponto, hífen e subscrito).');
      return;
    }
    if (hasEmojisOrSpecialChars(email, 'email')) {
      setError('E-mail institucional inválido. Verifique se digitou corretamente sem espaços ou símbolos com emojis.');
      return;
    }
    if (hasEmojisOrSpecialChars(password, 'password')) {
      setError('A Senha não deve conter emojis ou caracteres especiais de código (<, >, \\).');
      return;
    }

    // Strict spaces check
    if (username.trim().includes(' ')) {
      setError('O nome de usuário não pode conter espaços.');
      return;
    }

    if (password.trim().length < 3) {
      setError('A senha de acesso deve ter pelo menos 3 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep(0);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCPF = cpf.replace(/\D/g, '');

    // Execute real-time database pre-flight checks in parallel with the first wizard delay steps!
    try {
      const usersRef = collection(db, 'users');

      // Step 1: Check duplicate username
      const qUser = query(usersRef, where('username', '==', cleanUsername), limit(1));
      const userSnap = await getDocs(qUser);
      if (!userSnap.empty) {
        throw new Error(`O usuário "${cleanUsername}" já está em uso por outro consultório.`);
      }

      // Step 2: Check duplicate email
      const qEmail = query(usersRef, where('email', '==', cleanEmail), limit(1));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        throw new Error("Este e-mail corporativo já foi cadastrado para outra conta de testes.");
      }

      // Step 3: Check duplicate Phone
      const qPhone = query(usersRef, where('normalizedPhone', '==', cleanPhone), limit(1));
      const phoneSnap = await getDocs(qPhone);
      if (!phoneSnap.empty) {
        throw new Error("Este número de WhatsApp já possui um ambiente de testes ativo.");
      }

      // Step 4: Check duplicate CPF
      const qCpf = query(usersRef, where('cpf', '==', cleanCPF), limit(1));
      const cpfSnap = await getDocs(qCpf);
      if (!cpfSnap.empty) {
        throw new Error("Este CPF já foi utilizado para criar um período de testes gratuito.");
      }

    } catch (err: any) {
      setError(err?.message || 'Falha na validação de pre-flight do banco de dados.');
      setIsSubmitting(false);
      return;
    }

    // Pre-flight database validation succeeds! Let's smoothly animate steps
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Set success credentials with the registration parameters 
    setSuccessCredentials({
      fullName,
      clinicName,
      email: cleanEmail,
      phone,
      plan,
      specialty,
      username: cleanUsername,
      password: password.trim(),
      cpf: cleanCPF
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-screen bg-[#f8fafc] flex flex-col items-center justify-start py-12 px-4 md:px-8 relative overflow-x-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-cyan/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-blue-400/10 blur-[130px]" />
      </div>

      <div className="w-full max-w-5xl relative z-10 flex flex-col gap-8">
        
        {/* Back Button and Logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <button 
            type="button"
            onClick={onBack}
            className="group px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors flex items-center gap-1 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/50 shadow-sm self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Voltar ao Login
          </button>
          
          <div className="flex items-center gap-2">
            {clinicLogo ? (
              <img src={clinicLogo} alt="OdontoDash" className="h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-brand-cyan rounded-lg flex items-center justify-center text-white shadow-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-lg font-black text-slate-800 tracking-tight">
                  Odonto<span className="text-brand-cyan">Dash</span>
                </span>
              </>
            )}
            <span className="text-[10px] bg-brand-cyan/10 text-brand-cyan font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Free Trial Hub
            </span>
          </div>
        </div>

        {/* Central Grid container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Premium Value Proposition & Plan choice */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                Sem compromisso, cancele quando quiser
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Experimente o <span className="text-brand-cyan">OdontoDash</span> gratuitamente por 14 dias
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Acesse todas as ferramentas de gestão, faturamento d3, controle de agendamentos e prontuários que vão alavancar os lucros da sua clínica.
              </p>
            </div>

            {/* Core Features list */}
            <div className="space-y-3 bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-slate-200/50">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Incluso na versão de Teste:</h4>
              {[
                { title: "Dashboards analíticos de faturamento", desc: "Fluxo de caixa claro e transparente" },
                { title: "Agenda Inteligente integrada", desc: "Prevenção de faltas com lembretes WhatsApp" },
                { title: "Prontuário Odontológico Digital", desc: "Grave evoluções de tratamento e receitas" },
                { title: "Gestão completa de pacientes", desc: "Ficha médica, histórico financeiro e anamnese" }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{item.title}</h5>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Secure Badging */}
            <div className="bg-slate-100/60 p-4 rounded-2xl border border-slate-200/40 flex items-center gap-3">
              <Shield className="w-8 h-8 text-slate-400 shrink-0" />
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Seus dados de teste estão seguros em um ambiente sandbox criptografado com conformidade total à <strong>LGPD médica</strong>.
              </p>
            </div>
          </div>

          {/* Right Column: Loading Setup Wizard OR Setup Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 p-8 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {isBlockedByFingerprint ? (
                // Blocked View
                <motion.div 
                  key="blocked-trial"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shadow-sm animate-pulse">
                    <Shield className="w-8 h-8 text-rose-500" />
                  </div>

                  <div className="space-y-2 max-w-sm border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Acesso de Testes Esgotado</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Identificamos que seu dispositivo ou rede local já utilizou um ambiente de teste gratuito (Trial) no OdontoDash. 
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Para manter a estabilidade do sistema e assegurar conformidade médica, limitamos a criação de múltiplos ambientes teste por usuário.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 text-left space-y-1 w-full max-w-md">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Deseja continuar utilizando?</span>
                    <p className="text-[10px] text-slate-650 leading-normal font-medium">
                      Para estender seu período de experimentação ou contratar um de nossos planos comerciais de clínica, por favor clique no botão abaixo para contactar diretamente nosso time de suporte e regularização.
                    </p>
                  </div>

                  <div className="flex gap-3 w-full max-w-sm pt-2">
                    <button
                      type="button"
                      onClick={onBack}
                      className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                    >
                      Voltar ao Login
                    </button>
                    <a
                      href="mailto:suporte@odontodash.com.br?subject=Reativar%20Acesso%20OdontoDash"
                      className="flex-1 py-3 bg-brand-cyan text-white text-xs font-bold rounded-xl text-center hover:bg-brand-cyan/95 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-brand-cyan/15"
                    >
                      Falar c/ Vendas
                    </a>
                  </div>
                </motion.div>
              ) : successCredentials ? (
                // Simulated activation receipt / success details
                <motion.div 
                  key="success-receipt"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-left"
                >
                  <div className="flex flex-col items-center justify-center text-center pb-4 border-b border-slate-100">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm mb-4">
                      <ShieldCheck className="w-8 h-8 text-emerald-500 animate-bounce" />
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-1">
                      Cadastro Ativado com Sucesso! 🚀
                    </span>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Ativação Enviada</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                      Sua conta de testes foi estabelecida com segurança. Os detalhes de login e instruções de ativação foram disparados com sucesso para os canais cadastrados:
                    </p>
                  </div>

                  {/* WhatsApp and Email Targets badges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                    <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-cyan/10 flex items-center justify-center text-brand-cyan flex-shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] uppercase font-bold text-slate-400">Ativação via WhatsApp</span>
                        <p className="text-xs font-bold text-slate-800 truncate">{successCredentials.phone}</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-cyan/10 flex items-center justify-center text-brand-cyan flex-shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] uppercase font-bold text-slate-400">Ativação via E-mail</span>
                        <p className="text-xs font-bold text-slate-800 truncate">{successCredentials.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary of Generated Accounts */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/65 space-y-3">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Credenciais Administrativas Oficiais</span>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold block">Nome de Usuário</span>
                        <span className="font-mono text-slate-800 font-semibold">{successCredentials.username}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold block">Senha de Acesso</span>
                        <span className="font-mono text-slate-850 font-bold">{successCredentials.password}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold block">CPF Vinculado</span>
                        <span className="font-mono text-slate-800 font-semibold">{successCredentials.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold block">Plano Ativo</span>
                        <span className="font-bold text-emerald-600">{successCredentials.plan} (14 Dias Grátis)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100/70 p-4 rounded-xl text-[10px] text-amber-800 leading-relaxed font-semibold">
                    ⚠️ <strong>Atenção:</strong> Por motivos de segurança regulatória e conformidade LGPD médica, guarde estes dados cuidadosamente. Nós enviamos as instruções para as contas mostradas acima.
                  </div>

                  {/* Continue CTA */}
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await onStartTrial(successCredentials);
                      } catch (err: any) {
                        setError(err?.message || 'Erro ao inicializar o banco.');
                        setIsSubmitting(false);
                      }
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold uppercase text-xs tracking-wider py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-white" />
                    Confirmar Ativação & Entrar no Painel
                  </button>
                </motion.div>
              ) : isSubmitting ? (
                // Setup loader animation wizard
                <motion.div 
                  key="loader-wizard"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-8"
                >
                  <div className="relative">
                    {/* Ring loader */}
                    <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-brand-cyan animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Cpu className="w-7 h-7 text-brand-cyan animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-sm">
                    <h3 className="text-lg font-bold text-slate-800">Preparando seu Espaço Virtual</h3>
                    <p className="text-xs text-slate-400 font-mono transition-all duration-300">
                      {steps[currentStep]}
                    </p>
                  </div>

                  {/* Progress dots bar */}
                  <div className="flex gap-2 justify-center">
                    {steps.map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300", 
                          i === currentStep ? "w-6 bg-brand-cyan" : i < currentStep ? "w-3 bg-brand-cyan/40" : "w-1.5 bg-slate-100"
                        )} 
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                // Form View
                <motion.div 
                  key="trial-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">Configure sua Conta Experimental</h3>
                    <p className="text-xs text-slate-400">Preencha os dados e tenha acesso imediato ao painel de testes.</p>
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[10px] uppercase font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Input name and Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Seu Nome Completo *</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full text-xs p-3.5 pl-10 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                            placeholder="Ex: Dr. Arthur Rezende"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mail Profissional *</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full text-xs p-3.5 pl-10 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                            placeholder="Ex: darthur@odonto.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clinic Name, CPF and Phone/WhatsApp in 3 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nome da Clínica *</label>
                        <div className="relative">
                          <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="text"
                            required
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            className="w-full text-xs p-3.5 pl-10 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                            placeholder="Ex: Clínica Sorriso"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CPF do Profissional *</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="text"
                            required
                            value={cpf}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, '').substring(0, 11);
                              let masked = cleanVal;
                              if (cleanVal.length > 9) {
                                masked = `${cleanVal.substring(0, 3)}.${cleanVal.substring(3, 6)}.${cleanVal.substring(6, 9)}-${cleanVal.substring(9, 11)}`;
                              } else if (cleanVal.length > 6) {
                                masked = `${cleanVal.substring(0, 3)}.${cleanVal.substring(3, 6)}.${cleanVal.substring(6)}`;
                              } else if (cleanVal.length > 3) {
                                masked = `${cleanVal.substring(0, 3)}.${cleanVal.substring(3)}`;
                              }
                              setCpf(masked);
                            }}
                            className="w-full text-xs p-3.5 pl-10 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                            placeholder="Ex: 000.000.000-00"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">WhatsApp p/ Ativação *</label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, '').substring(0, 11);
                              let masked = cleanVal;
                              if (cleanVal.length > 7) {
                                masked = `(${cleanVal.substring(0, 2)}) ${cleanVal.substring(2, 7)}-${cleanVal.substring(7)}`;
                              } else if (cleanVal.length > 2) {
                                masked = `(${cleanVal.substring(0, 2)}) ${cleanVal.substring(2)}`;
                              }
                              setPhone(masked);
                            }}
                            className="w-full text-xs p-3.5 pl-10 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                            placeholder="Ex: (11) 99999-9999"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Credentials for subsequent logins */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Nome de Usuário para Acesso *
                        </label>
                        <input 
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan bg-white focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                          placeholder="Ex: arthur.odonto (sem espaços)"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          Senha de Acesso *
                        </label>
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan bg-white focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                          placeholder="Ex: darthur123"
                        />
                      </div>
                    </div>

                    {/* Select Specialty Preset */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Especialidade Principal da Clínica</label>
                      <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-medium"
                      >
                        <option value="Geral">Clínica Geral & Estética</option>
                        <option value="Ortodontia">Ortodontia & Alinhadores</option>
                        <option value="Implantodontia">Implantodontia & Próteses</option>
                        <option value="Odontopediatria">Odontopediatria & Endodontia</option>
                      </select>
                    </div>

                    {/* Desired Plan Tabs Selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Selecione o Plano desejado para simular</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { title: 'Lite', desc: '1 consultório, agenda simples', price: 'R$ 149/mês' },
                          { title: 'Pro', desc: 'Multi-cadeiras, KPI, WhatsApp', price: 'R$ 299/mês', flag: 'Recomendado' },
                          { title: 'Platinum', desc: 'Franquias, suporte 24h dedicado', price: 'R$ 599/mês' }
                        ].map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPlan(p.title)}
                            className={cn(
                              "text-left p-4 rounded-xl border transition-all relative flex flex-col justify-between h-28 focus:outline-none",
                              plan === p.title 
                                ? "bg-brand-cyan/[0.03] border-brand-cyan ring-4 ring-brand-cyan/5 shadow-md" 
                                : "bg-white border-slate-200/60 hover:border-slate-300"
                            )}
                          >
                            {p.flag && (
                              <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-brand-cyan text-white text-[8px] font-bold uppercase tracking-wider">
                                {p.flag}
                              </span>
                            )}
                            <div>
                              <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">{p.title}</h5>
                              <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{p.desc}</p>
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{p.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Launch Trial CTA Button */}
                    <button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold uppercase text-xs tracking-wider py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                      Inicializar Meu OdontoDash Grátis
                    </button>

                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Footing disclaimer */}
        <p className="text-[10px] text-slate-400 text-center mt-4">
          {footerText} | Dental Analytics trial sandbox env.
        </p>

      </div>
    </div>
  );
}

interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  priceUnit: number;
  supplier: string;
  location: string;
  lastUpdated: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  operator: string;
  date: string;
}

const DEFAULT_STOCK_ITEMS: StockItem[] = [
  {
    id: 'st-1',
    name: 'Anestésico Lidofrim 2%',
    category: 'Anestésicos',
    quantity: 45,
    minQuantity: 20,
    unit: 'Frascos',
    priceUnit: 3.50,
    supplier: 'Dental Cremer',
    location: 'Gaveta A2-Consultório 1',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'st-2',
    name: 'Luva de Látex Descartável M',
    category: 'Descartáveis',
    quantity: 8,
    minQuantity: 15,
    unit: 'Caixas',
    priceUnit: 28.00,
    supplier: 'OdontoMed Corp',
    location: 'Armário Geral Prateleira 1',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'st-3',
    name: 'Resina Aplic Z350 XT A2',
    category: 'Dentística',
    quantity: 12,
    minQuantity: 5,
    unit: 'Seringas',
    priceUnit: 130.00,
    supplier: 'Dental Cremer',
    location: 'Gaveta B1-Consultório 2',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'st-4',
    name: 'Babador Descartável c/ 100',
    category: 'Descartáveis',
    quantity: 4,
    minQuantity: 5,
    unit: 'Pacotes',
    priceUnit: 15.00,
    supplier: 'OdontoMed Corp',
    location: 'Armário Geral Prateleira 2',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'st-5',
    name: 'Broca Diamantada FG 1014',
    category: 'Instrumentais',
    quantity: 25,
    minQuantity: 15,
    unit: 'Unidades',
    priceUnit: 12.50,
    supplier: 'Dental Speed',
    location: 'Gaveta C3-Esterilização',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'st-6',
    name: 'Álcool em Gel 70% 1L',
    category: 'Higienização',
    quantity: 2,
    minQuantity: 4,
    unit: 'Frascos',
    priceUnit: 18.90,
    supplier: 'Comercial Sul',
    location: 'Esterilização Pia',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'st-7',
    name: 'Fio de Sutura Nylon 4-0',
    category: 'Ortodontia',
    quantity: 18,
    minQuantity: 8,
    unit: 'Envelopes',
    priceUnit: 8.40,
    supplier: 'Dental Speed',
    location: 'Gaveta D1-Consultório 1',
    lastUpdated: new Date().toISOString()
  }
];

const DEFAULT_MOVEMENTS: StockMovement[] = [
  {
    id: 'm-1',
    itemId: 'st-1',
    itemName: 'Anestésico Lidofrim 2%',
    type: 'in',
    quantity: 50,
    reason: 'Compra periódica via distribuidor',
    operator: 'Dra. Ana Admin',
    date: subMonths(new Date(), 1).toISOString()
  },
  {
    id: 'm-2',
    itemId: 'st-2',
    itemName: 'Luva de Látex Descartável M',
    type: 'out',
    quantity: 12,
    reason: 'Uso clínico intensivo cirurgias',
    operator: 'Dr. Arthur Rezende',
    date: subMonths(new Date(), 1).toISOString()
  },
  {
    id: 'm-3',
    itemId: 'st-4',
    itemName: 'Babador Descartável c/ 100',
    type: 'out',
    quantity: 2,
    reason: 'Consumo do consultório 3',
    operator: 'Dr. Arthur Rezende',
    date: new Date().toISOString()
  }
];

function StockView({ currentUser }: { currentUser: any }) {
  // Initialize from LocalStorage
  const [items, setItems] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('odonto_stock_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    localStorage.setItem('odonto_stock_items', JSON.stringify(DEFAULT_STOCK_ITEMS));
    return DEFAULT_STOCK_ITEMS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('odonto_stock_movements');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    localStorage.setItem('odonto_stock_movements', JSON.stringify(DEFAULT_MOVEMENTS));
    return DEFAULT_MOVEMENTS;
  });

  // Save changes to LocalStorage whenever state updates
  useEffect(() => {
    localStorage.setItem('odonto_stock_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('odonto_stock_movements', JSON.stringify(movements));
  }, [movements]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos'); // 'Todos', 'Baixo', 'Adequado'

  // Modals / Actions
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [showHistory, setShowHistory] = useState(false);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Descartáveis',
    quantity: '',
    minQuantity: '',
    unit: 'Unidades',
    priceUnit: '',
    supplier: '',
    location: ''
  });

  // Movement Form State
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('Consumo rotina clínica');

  // Edit State
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<StockItem | null>(null);

  // Calculated Properties
  const lowStockCount = useMemo(() => {
    return items.filter(item => item.quantity <= item.minQuantity).length;
  }, [items]);

  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.priceUnit), 0);
  }, [items]);

  const uniqueCategories = useMemo(() => {
    return ['Todos', ...new Set(items.map(i => i.category))];
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'Todos' || item.category === categoryFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'Baixo') {
        matchesStatus = item.quantity <= item.minQuantity;
      } else if (statusFilter === 'Adequado') {
        matchesStatus = item.quantity > item.minQuantity;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // Add Item Handler
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const item: StockItem = {
      id: `st-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      quantity: Math.max(0, parseInt(newItem.quantity) || 0),
      minQuantity: Math.max(0, parseInt(newItem.minQuantity) || 0),
      unit: newItem.unit,
      priceUnit: Math.max(0, parseFloat(newItem.priceUnit) || 0),
      supplier: newItem.supplier.trim() || 'Não especificado',
      location: newItem.location.trim() || 'Almoxarifado',
      lastUpdated: new Date().toISOString()
    };

    setItems(prev => [item, ...prev]);

    // Add movement for initial stock
    if (item.quantity > 0) {
      const movement: StockMovement = {
        id: `m-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        type: 'in',
        quantity: item.quantity,
        reason: 'Cadastro inicial de estoque',
        operator: currentUser?.name || 'Administrador',
        date: new Date().toISOString()
      };
      setMovements(prev => [movement, ...prev]);
    }

    // Reset Form
    setNewItem({
      name: '',
      category: 'Descartáveis',
      quantity: '',
      minQuantity: '',
      unit: 'Unidades',
      priceUnit: '',
      supplier: '',
      location: ''
    });
    setShowAddForm(false);
  };

  // Edit Item Handler
  const handleEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    setItems(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...editingItem,
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    }));

    setEditingItem(null);
  };

  // Delete Item Handler
  const handleDeleteItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setDeletingItem(item);
    }
  };

  const confirmDelete = () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;

    setItems(prev => {
      const updated = prev.filter(i => i.id !== targetId);
      localStorage.setItem('odonto_stock_items', JSON.stringify(updated));
      return updated;
    });

    setMovements(prev => {
      const updated = prev.filter(m => m.itemId !== targetId);
      localStorage.setItem('odonto_stock_movements', JSON.stringify(updated));
      return updated;
    });

    setDeletingItem(null);
  };

  // Registrar Entrada / Saída
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedItemForMovement) {
        alert("Por favor, selecione um material cadastrado para registrar a movimentação.");
        return;
      }

      const liveItem = items.find(i => i.id === selectedItemForMovement.id);
      if (!liveItem) {
        alert("Produto não encontrado no estoque atual.");
        return;
      }

      const qty = Math.max(1, parseInt(movementQty) || 1);

      // If outflow, check boundaries
      if (movementType === 'out' && liveItem.quantity < qty) {
        alert(`Quantidade insuficiente no estoque atual para o material "${liveItem.name}".\n\nEstoque Atual: ${liveItem.quantity} ${liveItem.unit}\nQuantidade Solicitada: ${qty} ${liveItem.unit}\n\nPor favor, ajuste o valor.`);
        return;
      }

      // Update quantities
      setItems(prev => {
        const updated = prev.map(item => {
          if (item.id === liveItem.id) {
            const newQty = movementType === 'in' ? item.quantity + qty : item.quantity - qty;
            return {
              ...item,
              quantity: newQty,
              lastUpdated: new Date().toISOString()
            };
          }
          return item;
        });
        localStorage.setItem('odonto_stock_items', JSON.stringify(updated));
        return updated;
      });

      // Record movement logs
      const movement: StockMovement = {
        id: `m-${Date.now()}`,
        itemId: liveItem.id,
        itemName: liveItem.name,
        type: movementType,
        quantity: qty,
        reason: movementReason.trim() || (movementType === 'in' ? 'Entrada manual' : 'Saída manual'),
        operator: currentUser?.name || 'Clínico',
        date: new Date().toISOString()
      };

      setMovements(prev => {
        const updated = [movement, ...prev];
        localStorage.setItem('odonto_stock_movements', JSON.stringify(updated));
        return updated;
      });

      // Reset Form
      setMovementQty('');
      setMovementReason('Consumo rotina clínica');
      setSelectedItemForMovement(null);
      setShowMovementForm(false);

      // Success alerts in Portuguese matching exactly the requested confirmation
      alert(`Movimentação salva com sucesso!\n\nMaterial: ${liveItem.name}\nOperação: ${movementType === 'in' ? 'Entrada (+)' : 'Saída (-)'}\nQuantidade: ${qty} ${liveItem.unit}\nNovo Estoque: ${movementType === 'in' ? liveItem.quantity + qty : liveItem.quantity - qty} ${liveItem.unit}`);

    } catch (error: any) {
      console.error("Erro ao registrar movimentação:", error);
      alert("Ocorreu um erro ao salvar a movimentação: " + error.message);
    }
  };

  return (
    <div className="space-y-6 container mx-auto pb-12 font-sans text-left">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Registro do Almoxarifado
          </h2>
          <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider leading-none mt-1">Materiais ativos e rastreio de validade</p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => {
              setSelectedItemForMovement(null);
              setMovementType('out');
              setMovementQty('1');
              setMovementReason('Consumo rotina clínica');
              setShowMovementForm(true);
            }}
            className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200/50 hover:bg-rose-100 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center gap-1.5"
          >
            <TrendingDown className="w-4 h-4 text-rose-500" />
            Registrar Saída / Consumo
          </button>
          
          <button 
            onClick={() => {
              setSelectedItemForMovement(null);
              setMovementType('in');
              setMovementQty('1');
              setMovementReason('Nova compra / Reposição de estoque');
              setShowMovementForm(true);
            }}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200/50 hover:bg-emerald-100 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-500 animate-pulse" />
            Adicionar Entrada de Lote
          </button>

          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Item
          </button>
        </div>
      </div>

      {/* Grid KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Itens card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de Itens</span>
            <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{items.length}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Variedade de suprimentos</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts card */}
        <button 
          onClick={() => {
            setStatusFilter('Baixo');
            setCategoryFilter('Todos');
          }}
          className={cn(
            "p-5 rounded-2xl border text-left shadow-sm flex items-center justify-between transition-all outline-none focus:outline-none",
            lowStockCount > 0 
              ? "bg-amber-50/[0.3] border-amber-200 shadow-amber-100/10 cursor-pointer hover:bg-amber-50" 
              : "bg-white border-slate-100 cursor-default"
          )}
        >
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estoque Crítico / Baixo</span>
            <p className={cn("text-2xl font-black tracking-tight mt-1", lowStockCount > 0 ? "text-amber-500" : "text-slate-800")}>
              {lowStockCount}
            </p>
            <span className={cn("text-[10px] mt-1 block font-bold", lowStockCount > 0 ? "text-amber-600 animate-pulse" : "text-slate-400")}>
              {lowStockCount > 0 ? "Exige reposição imediata" : "Nenhuma pendência"}
            </span>
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", lowStockCount > 0 ? "bg-amber-100/60 text-amber-500 animate-bounce" : "bg-slate-50 text-slate-400")}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </button>

        {/* Financial Value card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor total de Estoque</span>
            <p className="text-2xl font-black text-rose-500 tracking-tight mt-1">{formatCurrency(totalStockValue)}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Patrimônio ativo estocado</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* History tracker widget */}
        <button 
          onClick={() => setShowHistory(true)}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:bg-slate-50 text-left transition-all outline-none"
        >
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Log de Movimentações</span>
            <p className="text-2xl font-black text-brand-cyan tracking-tight mt-1">{movements.length}</p>
            <span className="text-[10px] text-brand-cyan underline block font-bold">Ver histórico de entradas/saídas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
            <History className="w-6 h-6" />
          </div>
        </button>

      </div>

      {/* Filter and Table area */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-lg p-6 space-y-6">
        
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            
            {/* Search */}
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar por nome, fornecedor, local..."
                className="pl-9 pr-3 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Filter dropdown */}
            <div className="w-full sm:w-auto shrink-0">
              <select 
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 outline-none cursor-pointer shadow-sm font-semibold text-slate-700"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {uniqueCategories.map((cat, i) => (
                  <option key={i} value={cat}>Categorias: {cat}</option>
                ))}
              </select>
            </div>

            {/* Status Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/50 w-full sm:w-auto overflow-x-auto">
              {[
                { label: 'Todos', value: 'Todos' },
                { label: 'Crítico/Baixo ⚠️', value: 'Baixo' },
                { label: 'Adequado', value: 'Adequado' }
              ].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStatusFilter(btn.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                    statusFilter === btn.value
                      ? "bg-white text-slate-800 shadow-sm font-black"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>

          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('Todos');
              setStatusFilter('Todos');
            }}
            className="text-[10px] font-black uppercase text-slate-400 tracking-wider hover:text-slate-700 underline focus:outline-none"
          >
            Limpar Filtros
          </button>
        </div>

        {/* Stock Items Table */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-5">Material / Suprimento</th>
                  <th className="py-4 px-4">Categoria</th>
                  <th className="py-4 px-4 text-center">Nível / Quantidade</th>
                  <th className="py-4 px-4 text-right">Preço Unitário</th>
                  <th className="py-4 px-4 text-right">Valor Total Estocado</th>
                  <th className="py-4 px-4 hidden md:table-cell">Fornecedor & Localização</th>
                  <th className="py-4 px-5 text-center">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 bg-slate-50/20 font-medium">
                      Nenhum material encontrado com as especificações inseridas.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.quantity <= item.minQuantity;
                    const pct = item.minQuantity > 0 ? Math.min(100, Math.round((item.quantity / (item.minQuantity * 2.5)) * 100)) : 100;
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        
                        {/* Material Info */}
                        <td className="py-4 px-5">
                          <div>
                            <div className="font-bold text-slate-800 text-sm group-hover:text-brand-cyan transition-colors">{item.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-mono">Última atualização: {new Date(item.lastUpdated).toLocaleDateString()}</span>
                              {isLow && (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] bg-red-50 text-red-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                  CRÍTICO/BAIXO
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px]">
                            {item.category}
                          </span>
                        </td>

                        {/* Stock Quantity */}
                        <td className="py-4 px-4 min-w-[150px]">
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-bold text-slate-700 text-sm">
                              {item.quantity} <span className="text-[10px] text-slate-400 font-normal">/ {item.minQuantity} {item.unit}</span>
                            </span>
                            <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 text-center">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isLow ? "bg-red-500" : pct < 60 ? "bg-amber-400" : "bg-emerald-500"
                                )} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>
                        </td>

                        {/* Price Unit */}
                        <td className="py-4 px-4 text-right font-medium text-slate-500">
                          {formatCurrency(item.priceUnit)}
                        </td>

                        {/* Price Total */}
                        <td className="py-4 px-4 text-right font-bold text-slate-700">
                          {formatCurrency(item.quantity * item.priceUnit)}
                        </td>

                        {/* Supplier Location */}
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="text-[11px] text-slate-600 font-medium max-w-xs truncate">{item.supplier}</div>
                          <div className="text-[9.5px] text-slate-400 italic truncate">{item.location}</div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            
                            {/* Inflow button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemForMovement(item);
                                setMovementType('in');
                                setMovementQty('1');
                                setMovementReason('Nova compra / Reposição de estoque');
                                setShowMovementForm(true);
                              }}
                              className="p-1 px-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 border border-emerald-100 rounded-lg transition-colors shadow-sm bg-white"
                              title="Adicionar entrada"
                            >
                              + Entrada
                            </button>

                            {/* Outflow button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemForMovement(item);
                                setMovementType('out');
                                setMovementQty('1');
                                setMovementReason('Consumo rotina clínica');
                                setShowMovementForm(true);
                              }}
                              className="p-1 px-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg transition-colors shadow-sm bg-white"
                              title="Registrar consumo"
                            >
                              - Saída
                            </button>

                            <div className="w-[1px] h-6 bg-slate-100" />

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200/50 rounded-lg transition-colors hover:bg-slate-100"
                              title="Editar item cadastrado"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 bg-rose-50/50 text-rose-500 hover:text-rose-700 border border-rose-100/50 rounded-lg transition-colors hover:bg-rose-100"
                              title="Remover produto permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: CADASTRO DE NOVO ITEM */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-cyan" />
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Cadastrar Suprimento do Estoque</h3>
                </div>
                <button onClick={() => setShowAddForm(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="p-6 space-y-4">
                
                {/* Nome do Item */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nome do Produto / Material *</label>
                  <input 
                    type="text" 
                    required
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                    placeholder="Ex: Alginato Kelldent 454g"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Categoria</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-semibold"
                    >
                      <option value="Descartáveis">Descartáveis</option>
                      <option value="Anestésicos">Anestésicos</option>
                      <option value="Ortodontia">Ortodontia</option>
                      <option value="Dentística">Dentística</option>
                      <option value="Instrumentais">Instrumentais</option>
                      <option value="Higienização">Higienização</option>
                      <option value="Prevenção">Prevenção</option>
                    </select>
                  </div>

                  {/* Unidade de Medida */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Unidade de Medida</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-semibold"
                    >
                      <option value="Unidades">Unidades</option>
                      <option value="Caixas">Caixas</option>
                      <option value="Seringas">Seringas</option>
                      <option value="Envelopes">Envelopes</option>
                      <option value="Pacotes">Pacotes</option>
                      <option value="Frascos">Frascos</option>
                      <option value="Kits">Kits</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Qtd Inicial */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Qtd Inicial *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                      placeholder="Ex: 15"
                    />
                  </div>

                  {/* Qtd Mínima */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Qtd Ponto Compra *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={newItem.minQuantity}
                      onChange={(e) => setNewItem({ ...newItem, minQuantity: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                      placeholder="Ex: 5"
                    />
                  </div>

                  {/* Preço Unitário */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Preço Unitário R$ *</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0.01"
                      value={newItem.priceUnit}
                      onChange={(e) => setNewItem({ ...newItem, priceUnit: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                      placeholder="Ex: 34.90"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fornecedor */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fornecedor Principal</label>
                    <input 
                      type="text" 
                      value={newItem.supplier}
                      onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                      placeholder="Ex: Dental Speed"
                    />
                  </div>

                  {/* Localização */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Local de Armazenamento</label>
                    <input 
                      type="text" 
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                      placeholder="Ex: Armário Clínico 2B"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-brand-cyan hover:bg-brand-cyan/90 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-xl shadow-slate-900/10 mt-2 active:scale-[0.99]"
                >
                  Confirmar Cadastro do Material
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MOVER ESTOQUE (ENTRADA / SAÍDA QUICK) */}
      <AnimatePresence>
        {showMovementForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: movementType === 'in' ? '#f0fdf4' : '#fff5f5' }}>
                <div className="flex items-center gap-2">
                  <Layers className={cn("w-5 h-5", movementType === 'in' ? "text-emerald-500 animate-pulse" : "text-rose-500")} />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    {movementType === 'in' ? 'Registrar Nova Entrada (Compra/Lote)' : 'Registrar Consumo / Saída'}
                  </h3>
                </div>
                <button onClick={() => { setShowMovementForm(false); setSelectedItemForMovement(null); }} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMovement} className="p-6 space-y-4 text-left">
                
                {/* Item Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Selecione o Produto *</label>
                  <select
                    required
                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all text-slate-700 font-semibold"
                    value={selectedItemForMovement?.id || ""}
                    onChange={(e) => {
                      const found = items.find(i => i.id === e.target.value);
                      setSelectedItemForMovement(found || null);
                    }}
                  >
                    <option value="">Selecione um produto cadastrado...</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name} (Disponível: {i.quantity} {i.unit})</option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantidade ({selectedItemForMovement?.unit || 'Unidades'}) *</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                    placeholder="Ex: 5"
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                  />
                </div>

                {/* Motivação/Motivo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Motivo da Movimentação</label>
                  <input 
                    type="text" 
                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all font-semibold text-slate-700"
                    placeholder={movementType === 'in' ? 'Ex: Fornecimento de rotina ou compra emergencial' : 'Ex: Tratamento do canal Dr. Carlos'}
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className={cn(
                      "w-full py-4 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-md active:scale-[0.99]",
                      movementType === 'in' 
                        ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10" 
                        : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/10"
                    )}
                  >
                    {movementType === 'in' ? 'Confirmar Entrada de Materiais' : 'Confirmar Baixa do Estoque'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDITAR PRODUTO */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-100/50">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Editar Informações do Produto</h3>
                <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditItem} className="p-6 space-y-4 text-left">
                
                {/* Nome do Item */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nome Completo do Produto</label>
                  <input 
                    type="text" 
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fornecedor */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fornecedor Principal</label>
                    <input 
                      type="text" 
                      value={editingItem.supplier}
                      onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700"
                    />
                  </div>

                  {/* Localização */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Localização interna</label>
                    <input 
                      type="text" 
                      value={editingItem.location}
                      onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ponto de Compra */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Qtd Ponto Compra Mínimo</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={editingItem.minQuantity}
                      onChange={(e) => setEditingItem({ ...editingItem, minQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700"
                    />
                  </div>

                  {/* Preco Unitario */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Preço Unitário R$</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0.01"
                      value={editingItem.priceUnit}
                      onChange={(e) => setEditingItem({ ...editingItem, priceUnit: Math.max(0.01, parseFloat(e.target.value) || 0) })}
                      className="w-full text-xs p-3.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-brand-cyan hover:bg-brand-cyan/90 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-md mt-2 active:scale-[0.99]"
                >
                  Salvar Alterações
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: HISTÓRICO DE LOGS DE COMPRAS E CONSUMO */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-cyan" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Registro Cronológico de Movimentações</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-4 flex-1">
                {movements.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-xs font-medium">Nenhuma movimentação registrada.</p>
                ) : (
                  movements.map((m) => {
                    const isIn = m.type === 'in';
                    return (
                      <div key={m.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", isIn ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500")}>
                            {isIn ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {isIn ? 'Entrada / Adicionamento' : 'Baixa / Consumo'} de <span className="text-brand-cyan">{m.itemName}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Motivo: {m.reason}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] text-slate-400">
                              <span>Por: <strong>{m.operator}</strong></span>
                              <span>•</span>
                              <span>Data/Hora: {new Date(m.date).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className={cn("text-sm font-black shrink-0", isIn ? "text-emerald-500" : "text-rose-500")}>
                          {isIn ? '+' : '-'}{m.quantity}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowHistory(false)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider"
                >
                  Fechar Histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRMAR REMOVER ITEM */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/55">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-rose-100 text-rose-600 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-black uppercase text-rose-700 tracking-wider">Confirmar Exclusão</h3>
                </div>
                <button 
                  onClick={() => setDeletingItem(null)} 
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 text-center space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-left">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none mb-1">Material Selecionado</p>
                  <p className="font-bold text-slate-800 text-sm">{deletingItem.name}</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10.5px]">
                    <span className="text-slate-400">Estoque Atual:</span>
                    <span className="font-black text-slate-700">{deletingItem.quantity} {deletingItem.unit}</span>
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-500 font-medium">
                  Tem certeza absoluta que deseja remover este item permanentemente do estoque? Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 py-3 border border-slate-200 bg-white text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-md shadow-rose-500/10 active:scale-[0.98]"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function PublicConfirmationView({
  appointmentId,
  onBack,
  onOpenBooking,
  setReschedulePreFill,
  clinicName,
  clinicLogo,
  footerText,
  data
}: {
  appointmentId: string;
  onBack: () => void;
  onOpenBooking: () => void;
  setReschedulePreFill: (data: any) => void;
  clinicName: string;
  clinicLogo: string | null;
  footerText: string;
  data: any[];
}) {
  const [appt, setAppt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewStatus, setViewStatus] = useState<'idle' | 'success_confirm' | 'success_cancel' | 'not_found' | 'error' | 'finished'>('idle');

  const handleCloseWindow = () => {
    try {
      window.close();
    } catch (e) {
      console.warn("Bloqueado pelo navegador:", e);
    }
    setViewStatus('finished');
  };

  useEffect(() => {
    const fetchAppt = async () => {
      try {
        setLoading(true);
        // Procure localmente primeiro
        const local = data.find(r => r.id === appointmentId);
        if (local) {
          setAppt(local);
          setLoading(false);
          return;
        }

        // Se nao achar localmente, busca no Firestore
        const docRef = doc(db, 'records', appointmentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAppt({ id: docSnap.id, ...docSnap.data() });
        } else {
          setViewStatus('not_found');
        }
      } catch (err) {
        console.error("Erro ao buscar agendamento:", err);
        setViewStatus('error');
      } finally {
        setLoading(false);
      }
    };
    fetchAppt();
  }, [appointmentId, data]);

  const handleConfirm = async () => {
    if (!appt) return;
    setActionLoading(true);
    try {
      const docRef = doc(db, 'records', appt.id);
      await updateDoc(docRef, { status: 'Agendado' });
      setViewStatus('success_confirm');
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao confirmar sua consulta. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appt) return;
    if (!window.confirm("Deseja realmente cancelar o seu agendamento? Esta vaga será liberada imediatamente para outros pacientes.")) {
      return;
    }
    setActionLoading(true);
    try {
      const docRef = doc(db, 'records', appt.id);
      await updateDoc(docRef, { status: 'Cancelado' });
      setViewStatus('success_cancel');
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao cancelar. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!appt) return;
    setActionLoading(true);
    try {
      // 1. Libera a vaga atual
      const docRef = doc(db, 'records', appt.id);
      await updateDoc(docRef, { status: 'Cancelado' });
      
      // 2. Pre-preenche os dados para o novo agendamento
      setReschedulePreFill({
        dentista: appt.dentista || '',
        paciente: appt.paciente || '',
        telefone: appt.telefone || '',
        procedimento: appt.procedimento || 'Consulta Inicial'
      });

      // 3. Abre a tela de agendamento publico
      onOpenBooking();
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao iniciar o reagendamento. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando dados da consulta...</p>
      </div>
    );
  }

  if (viewStatus === 'not_found' || !appt) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <XCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tight mb-2">Agendamento não localizado</h1>
        <p className="text-slate-400 max-w-sm text-xs mb-6 leading-relaxed">
          O link de confirmação parece estar inválido ou expirado. Entre em contato direto com a clínica para confirmar o seu horário.
        </p>
        <button onClick={handleCloseWindow} className="px-6 py-2.5 bg-brand-cyan text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-cyan/90 transition-all cursor-pointer">
          Fechar Página
        </button>
      </div>
    );
  }

  const friendlyDate = appt.data && isValid(parseISO(appt.data)) 
    ? format(parseISO(appt.data), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) 
    : "--/--/----";

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 selection:bg-brand-cyan selection:text-slate-900">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-6 sm:py-12">
        
        {/* Logo/Header */}
        <div className="flex flex-col items-center gap-2 mb-6 text-center">
          {clinicLogo ? (
            <img src={clinicLogo} alt={clinicName} className="h-10 w-auto object-contain mb-2" />
          ) : (
            <div className="w-12 h-12 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl flex items-center justify-center mb-2">
              <Activity className="w-6 h-6 text-brand-cyan" />
            </div>
          )}
          <h2 className="text-[10px] font-black uppercase text-brand-cyan tracking-widest">{clinicName}</h2>
          <h1 className="text-xl font-black text-white tracking-tight">Confirmação de Agendamento</h1>
        </div>

        {/* Visual Content Box */}
        {viewStatus === 'success_confirm' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-slate-800 border border-emerald-500/25 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-6"
          >
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Presença Confirmada!</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Olá, <b>{appt.paciente}</b>! Registramos a sua confirmação com sucesso em nosso sistema acadêmico-clínico. Obrigado!
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/30 text-left space-y-2 text-xs text-slate-300 font-medium">
              <div className="flex gap-2.5 items-center">
                <Calendar className="w-4 h-4 text-brand-cyan shrink-0" />
                <span>{friendlyDate}</span>
              </div>
              <div className="flex gap-2.5 items-center">
                <Clock className="w-4 h-4 text-brand-cyan shrink-0" />
                <span className="font-bold text-brand-cyan bg-brand-cyan/5 px-2 py-0.5 rounded border border-brand-cyan/10">{appt.horario || 'N/D'}</span>
              </div>
              <div className="flex gap-2.5 items-center">
                <User className="w-4 h-4 text-brand-cyan shrink-0" />
                <span>Dentista: {appt.dentista}</span>
              </div>
            </div>
            <div className="space-y-3">
              <button 
                onClick={handleCloseWindow}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                Concluir e Sair
              </button>
              <p className="text-[10px] text-slate-400 font-medium">
                Você pode fechar esta aba do seu celular ou navegador com segurança.
              </p>
            </div>
          </motion.div>
        )}

        {viewStatus === 'success_cancel' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-slate-800 border border-rose-500/25 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-6"
          >
            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Consulta Cancelada</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Seu agendamento foi cancelado com sucesso em nosso sistema e o horário correspondente está liberado para outros pacientes.
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-700/50 space-y-3">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Gostaria de sugerir outro horário?</p>
              <button 
                onClick={handleReschedule}
                className="w-full py-3 bg-brand-cyan hover:bg-brand-cyan/90 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-cyan/15"
              >
                <RefreshCw className="w-4 h-4" />
                Agendar Novo Horário
              </button>
            </div>
          </motion.div>
        )}

        {viewStatus === 'finished' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-slate-800 border border-slate-700/50 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-6"
          >
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Conexão Encerrada com Segurança</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Suas respostas foram salvas no sistema da clínica.
              </p>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Para garantir a total privacidade dos seus dados, a sua sessão foi encerrada de forma segura. Você já pode fechar esta aba no seu celular ou navegador.
              </p>
            </div>
          </motion.div>
        )}

        {viewStatus === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-slate-800 border border-slate-700/50 p-6 rounded-[36px] shadow-xl space-y-6"
          >
            <div className="text-center space-y-1">
              <span className="text-[9px] uppercase font-black bg-brand-cyan/10 text-brand-cyan px-2.5 py-1 rounded-full">
                {appt.status === 'Cancelado' ? 'Cancelado' : 'Aguardando Resposta'}
              </span>
              <h3 className="text-lg font-black text-white pt-2">Olá, {appt.paciente}!</h3>
              <p className="text-xs text-slate-400 font-medium">Por favor, selecione uma das ações abaixo para gerenciar sua consulta.</p>
            </div>

            {/* Information Details Card */}
            <div className="bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-700/40 space-y-3">
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan font-black text-xs shrink-0">
                  {appt.paciente ? appt.paciente.charAt(0) : 'P'}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none mb-1">Paciente</p>
                  <p className="text-sm font-black text-white truncate leading-none">{appt.paciente}</p>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 grid grid-cols-2 gap-3 text-xs leading-none">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Procedimento</span>
                  <span className="font-bold text-slate-300 block truncate">{appt.procedimento || 'Consulta Inicial'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Dentista</span>
                  <span className="font-bold text-slate-300 block truncate">{appt.dentista}</span>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center gap-4 text-xs font-bold text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-cyan shrink-0" />
                  <span>{format(parseISO(appt.data), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-brand-cyan font-black bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/15 xs:text-[11px]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{appt.horario || 'N/D'}</span>
                </div>
              </div>
            </div>

            {/* Interaction Row */}
            {appt.status === 'Cancelado' ? (
              <div className="space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-center text-xs text-rose-300 font-bold leading-relaxed">
                  Esta consulta já consta como CANCELADA e o horário foi liberado de nossa agenda.
                </div>
                <button 
                  onClick={handleReschedule}
                  className="w-full py-3.5 bg-brand-cyan hover:bg-brand-cyan/90 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-cyan/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  Agendar Novo Horário
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirm}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading ? 'Processando...' : 'Confirmar Consulta'}
                </button>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReschedule}
                    className="py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reagendar
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancel}
                    className="py-3 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>

      <div className="text-slate-600 text-[9px] flex items-center justify-center gap-1.5 text-center py-4">
        <ShieldCheck className="w-4 h-4 text-emerald-500/40" />
        <span>Atendimento exclusivo e criptografado da clínica {clinicName}. {footerText}</span>
      </div>
    </div>
  );
}




