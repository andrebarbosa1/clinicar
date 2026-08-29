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
  Bot,
  Crown,
  Zap,
  ShieldAlert
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
import { 
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { 
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
import { app, db, auth, isFirebaseConfigured } from './lib/firebase';
export { app, db, auth };

import SaaSAssinaturaView from './components/SaaSAssinaturaView';
import SaaSLockedFeatureView from './components/SaaSLockedFeatureView';
import SuperAdminView from './components/SuperAdminView';
import CustomDashboardView from './components/DashboardView';
import PatientRecordView from './components/PatientRecordView';
import CustomAdminView from './components/AdminView';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import AppointmentsView from './components/AppointmentsView';
import ScheduleView from './components/ScheduleView';
import CustomPatientsView from './components/PatientsView';
import CustomPatientFormView from './components/PatientFormView';
import CustomAppointmentFormView from './components/AppointmentFormView';
import CustomMessagesView from './components/MessagesView';
import RadiographyAIView from './components/RadiographyAIView';
import PatientPortalView from './components/PatientPortalView';
import WhatsAppChatbotView from './components/WhatsAppChatbotView';
import TreatmentPlanAIModal from './components/TreatmentPlanAIModal';
import PublicBookingView from './components/PublicBookingView';
import LoginView from './components/LoginView';
import ShareBookingModal from './components/ShareBookingModal';
import CustomFinanceView from './components/FinanceView';
import {
  CLINIC_TIME_SLOTS,
  CLINIC_OPEN_TIME,
  CLINIC_CLOSE_TIME,
  APPOINTMENT_DURATION_MINUTES,
  getSystemInitialDate,
  isBusinessDay,
  getNextBusinessDay,
  normalizeAppointmentDateTime,
  findDentistScheduleConflict,
  doSlotsOverlap,
  timeToMinutes,
  minutesToTime
} from './lib/scheduleUtils';

const OPENING_HOUR = CLINIC_OPEN_TIME;
const CLOSING_HOUR = CLINIC_CLOSE_TIME;

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
      .replace(/[^a-z0-9]/g, ' ') // Mant√©m apenas alfanum√©ricos como espa√ßos
      .replace(/\s+/g, ' ') // Remove espa√ßos m√∫ltiplos
      .trim();
  };

  const normalizedTarget = normalize(name);
  
  // 1. Tenta match exato normalizado
  let patient = patientsList.find(p => normalize(p.name) === normalizedTarget);
  
  // 2. Se n√£o encontrar, tenta busca flex√≠vel (cont√©m)
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
      alert("O WhatsApp n√£o p√¥de ser aberto automaticamente. Verifique se o seu navegador bloqueou o pop-up.");
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
    // Permite apenas letras (incluindo acentuadas) e espa√ßos
    return val.replace(/[^a-zA-Z√°√©√≠√≥√∫√¢√™√Æ√¥√ª√†√®√¨√≤√π√£√µ√ß√Å√â√ç√ì√ö√Ç√ä√é√î√õ√Ä√à√å√í√ô√É√ï√á\s]/g, '');
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

  // Layer 2: Firestore lock synced per username to secure against distributed brute-force
  checkFirestoreLockout: async (username: string): Promise<{ isLocked: boolean; remaining: number }> => {
    if (!username || !db) return { isLocked: false, remaining: 0 };
    const cleanUsername = username.trim().toLowerCase().replace(/^[@\/.\s#]+/, '');
    
    // Never lock out super admin master accounts
    if (cleanUsername === 'administrador' || cleanUsername === 'suporte@odontodash.com.br' || cleanUsername === 'superadmin') {
      return { isLocked: false, remaining: 0 };
    }
    
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
      console.warn("[Prevention] Database security check:", e);
    }
    return { isLocked: false, remaining: 0 };
  },

  recordAttemptFirestore: async (username: string, success: boolean): Promise<void> => {
    if (!username || !db) return;
    const cleanUsername = username.trim().toLowerCase().replace(/^[@\/.\s#]+/, '');
    
    try {
      const docRef = doc(db, 'login_attempts', cleanUsername);
      if (success) {
        await deleteDoc(docRef).catch(() => {});
        const atDocRef = doc(db, 'login_attempts', `@${cleanUsername}`);
        await deleteDoc(atDocRef).catch(() => {});
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
      console.warn("[Prevention] Security logging:", e);
    }
  },

  // Layer 3: Firestore lock synced per browser/device ID to stop multi-username brute force (existent or non-existent usernames)
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
      console.warn("[Device Security] Check unavailable (offline/fallback mode):", e);
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
      console.warn("[Device Security] Record unavailable (offline/fallback mode):", e);
    }
  }
};

// Firebase instances imported at top


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
  { name: 'Avalia√ß√£o Inicial', price: 150 },
  { name: 'Limpeza (Profilaxia)', price: 200 },
  { name: 'Restaura√ß√£o Resina', price: 250 },
  { name: 'Extra√ß√£o Simples', price: 300 },
  { name: 'Tratamento de Canal', price: 1200 },
  { name: 'Clareamento Dental', price: 800 },
  { name: 'Implante Dent√°rio', price: 3500 },
  { name: 'Aparelho Ortod√¥ntico', price: 2500 }
];

const INITIAL_USERS = [
  { id: '1', name: 'Dra. Ana Silveira', role: 'Admin', modules: 'Todos', username: 'ana.admin', password: '123', email: 'andreb202121@gmail.com', clinicName: 'mbsolucoes', clinicId: '1' },
  { id: '2', name: 'Dr. Roberto Santos', role: 'Dentista', modules: 'Dashboard, Agenda, Pacientes', username: 'roberto', password: '123', email: 'roberto@clinica.com', parentTrialId: '1', clinicId: '1', clinicName: 'mbsolucoes' },
  { id: '3', name: 'Mariana Lima', role: 'Recepcionista', modules: 'Dashboard, Agenda, Pacientes', username: 'mariana', password: '123', email: 'mariana@clinica.com', parentTrialId: '1', clinicId: '1', clinicName: 'mbsolucoes' },
  { id: 'super-admin-01', name: 'Suporte OdontoDash', role: 'SuperAdmin', modules: 'Todos', username: 'administrador', password: '123', email: 'suporte@odontodash.com.br' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [impersonatingSuperAdmin, setImpersonatingSuperAdmin] = useState<any>(null);
  const [globalBanner, setGlobalBanner] = useState<any>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Identificador de isolamento para sess√µes de teste gr√°tis (trial) ou inquilinos (cl√≠nicas)
  const trialId = currentUser?.parentTrialId || currentUser?.clinicId || (currentUser?.isTrial ? currentUser.id : (currentUser?.role === 'Admin' ? currentUser.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : null)));

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
  const [bookingClinicId, setBookingClinicId] = useState<string | undefined>(undefined);
  const [bookingDoctor, setBookingDoctor] = useState<string | undefined>(undefined);
  const [bookingClinicName, setBookingClinicName] = useState<string | undefined>(undefined);
  const [showShareBookingModal, setShowShareBookingModal] = useState(false);
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
        console.error("Erro ao marcar dispositivo p√≥s-respira√ß√£o de trial:", e);
      }
    }
  }, [isTrialActive, trialDaysRemaining, currentUser?.email]);

  // Handle public booking and confirmation URLs
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('booking') === 'true') {
        setIsPublicBooking(true);
        const cId = params.get('clinicId') || params.get('trialOwnerId');
        const doc = params.get('doctor') || params.get('dentista');
        const cName = params.get('clinicName');
        if (cId) setBookingClinicId(cId);
        if (doc) setBookingDoctor(doc);
        if (cName) setBookingClinicName(cName);
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
  const [clinicName, setClinicName] = useState('mbsolucoes');
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  const [footerText, setFooterText] = useState('¬© 2026 Cl√≠nica Odontol√≥gica | CRO-SP 123456');
  const [providerPhone, setProviderPhone] = useState(() => localStorage.getItem('odonto_cfg_providerPhone') || '+55 (47) 99999-9999');
  const [providerName, setProviderName] = useState(() => localStorage.getItem('odonto_cfg_providerName') || 'MB.SISTEMAS');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isFreeTrialView, setIsFreeTrialView] = useState(false);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const [aiTreatmentPatient, setAiTreatmentPatient] = useState<any>(null);

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
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Erro ao solicitar instala√ß√£o PWA:", err);
      }
    } else {
      alert("Para instalar a inst√¢ncia do OdontoDash como aplicativo (PWA):\n\n‚Ä¢ No Computador (Chrome/Edge): Clique no √≠cone de 'Instalar' no lado direito da barra de endere√ßo do navegador, ou acesse o Menu (tr√™s pontos) > 'Instalar OdontoDash'.\n‚Ä¢ No Celular Android (Chrome): Abra o menu (tr√™s pontos) e toque em 'Adicionar √† tela inicial' ou 'Instalar aplicativo'.\n‚Ä¢ No iPhone/iPad (Safari): Toque no √≠cone de Compartilhar e selecione 'Adicionar √† Tela de In√≠cio'.");
    }
  };

  const hasModule = React.useCallback((moduleName: string) => {
    if (!currentUser) return false;
    
    // SuperAdmin or standard full Admin always has all access unless trial has specific custom modules
    if (
      currentUser.role === 'Admin' || 
      currentUser.role === 'SuperAdmin' || 
      currentUser.username === 'administrador' ||
      currentUser.modules === 'Todos' ||
      (currentUser.modules && currentUser.modules.toLowerCase().includes('todos'))
    ) {
      if (currentUser.isTrial && currentUser.modules && currentUser.modules !== 'Todos') {
        const userModules = (currentUser.modules || '').split(',').map((m: string) => m.trim().toLowerCase());
        return userModules.includes(moduleName.toLowerCase());
      }
      return true;
    }
    
    // Safety: Recepcionista cannot access Financeiro or Administra√ß√£o even if misconfigured
    if (currentUser.role === 'Recepcionista' && (moduleName.toLowerCase() === 'financeiro' || moduleName.toLowerCase() === 'administra√ß√£o')) {
      return false;
    }

    // Recepcionista gets Dashboard, Agenda, Pacientes, Mensagens, Retorno and Documentos by default
    if (currentUser.role === 'Recepcionista') {
      const lower = moduleName.toLowerCase();
      if (['dashboard', 'agenda', 'pacientes', 'mensagens', 'retorno', 'documentos'].includes(lower)) {
        return true;
      }
    }

    // New AI & Patient Portal modules are accessible to authenticated team members
    const lowerMod = moduleName.toLowerCase();
    if (lowerMod === 'iaclinica' || lowerMod === 'portalpaciente' || lowerMod === 'chatbotia' || lowerMod === 'mensagens') {
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
      console.log(`[UsersSync] ${dbUsers.length} usu√°rios em Firestore. Sincronizando...`);
      
      let merged;
      if (trialId) {
        // Se for trial, N√ÉO mostra os usu√°rios padr√£o (INITIAL_USERS) nem outros usu√°rios de outros trials
        // Mostra somente si mesmo e quaisquer sub-usu√°rios criados no seu trial
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
              console.log("[DataSync] Perfil do usu√°rio atualizado com dados SaaS, sincronizando estado local...");
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
    if (!isAuthenticated || !currentUser) {
      setClinicName('mbsolucoes');
      setClinicLogo(null);
      setFooterText(`¬© ${new Date().getFullYear()} mbsolucoes`);
      return;
    }

    const clinicOwnerId = currentUser?.parentTrialId || currentUser?.clinicId || (currentUser?.isTrial ? currentUser.id : (currentUser?.role === 'Admin' ? currentUser.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : currentUser?.id || '1')));
    const docId = `clinic-${clinicOwnerId}`;

    const unsub = onSnapshot(doc(db, 'settings', docId), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setClinicName(d.clinicName || currentUser?.clinicName || 'mbsolucoes');
        setClinicLogo(d.clinicLogo || null);
        setFooterText(d.footerText || `¬© ${new Date().getFullYear()} ${d.clinicName || currentUser?.clinicName || 'mbsolucoes'}`);
        if (d.providerPhone) {
          setProviderPhone(d.providerPhone);
          localStorage.setItem('odonto_cfg_providerPhone', d.providerPhone);
        }
        if (d.providerName) {
          setProviderName(d.providerName);
          localStorage.setItem('odonto_cfg_providerName', d.providerName);
        }
      } else {
        // Valores padr√£o para cl√≠nicas que ainda n√£o customizaram suas configura√ß√µes
        const fallbackName = currentUser?.clinicName || 'mbsolucoes';
        setClinicName(fallbackName);
        setClinicLogo(null);
        setFooterText(`¬© ${new Date().getFullYear()} ${fallbackName}`);
      }
    }, (error) => {
      console.warn("Settings sync error (branding):", error);
    });
    return unsub;
  }, [isAuthenticated, currentUser?.id, currentUser?.parentTrialId, currentUser?.clinicId, currentUser?.isTrial, currentUser?.role, currentUser?.clinicName]);

  const procedures = useMemo(() => ['Todos', ...Array.from(new Set(data.map(r => r.procedimento)))], [data]);
  const statuses = ['Todos', 'Realizado', 'Agendado', 'Pendente', 'Cancelado'];
  const paymentStatuses = ['Todos', 'Pago', 'Pendente', 'Atrasado'];
  const doctorsList = useMemo(() => ['Todos', ...Array.from(new Set(users.filter(u => u.role === 'Dentista').map(u => u.name)))], [users]);

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
        
        // Exclude quick events (Compromissos) from upcoming patient queue
        if (r.procedimento === 'Compromisso' || (r as any).isQuickEvent) return false;
        
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
    console.log("Iniciando monitoramento de notifica√ß√µes...");
    const userId = currentUser.id || currentUser.uid || currentUser.firebaseUid;
    if (!userId) {
      console.warn("Skipping notifications listener: userId is undefined on currentUser", currentUser);
      return;
    }
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Notifica√ß√µes atualizadas:", list.length);
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
    console.log("[handleCreatePatient] In√≠cio:", { name: newPatient.name, existingId });
    if (!newPatient.name) {
      alert('Por favor, informe o nome do paciente.');
      return false;
    }

    try {
      const patientId = (existingId && existingId.trim() !== '') ? existingId : `pat-${Date.now()}`;
      console.log(existingId ? `[handleCreatePatient] Atualizando paciente ${existingId}...` : `[handleCreatePatient] Criando novo paciente ${patientId}...`);

      const trimmedName = newPatient.name.trim();
      const trimmedEmail = newPatient.email?.trim() || '';

      // Verifica√ß√£o de duplicidade de e-mail no Firestore
      if (trimmedEmail) {
        try {
          let pQuery;
          if (trialId) {
            pQuery = query(collection(db, 'patients'), where('trialOwnerId', '==', trialId));
          } else {
            pQuery = collection(db, 'patients');
          }
          const snapshot = await getDocs(pQuery);
          const duplicateDoc = snapshot.docs.find(docSnap => {
            const data = docSnap.data() as any;
            const docEmail = (data.email || '').trim().toLowerCase();
            const docId = docSnap.id;
            return docEmail === trimmedEmail.toLowerCase() && docId !== patientId;
          });

          if (duplicateDoc) {
            const dupData = duplicateDoc.data() as any;
            const duplicatePatientName = dupData.name || 'outro paciente';
            console.warn(`[handleCreatePatient] E-mail duplicado detectado no Firestore para: ${trimmedEmail}`);
            alert(`Aten√ß√£o: O e-mail "${trimmedEmail}" j√° est√° vinculado a outro paciente (${duplicatePatientName}) no sistema.`);
            return false;
          }
        } catch (queryErr) {
          console.warn("[handleCreatePatient] Erro ao consultar duplicidade no Firestore, aplicando verifica√ß√£o local:", queryErr);
          const localDuplicate = patients.find(p => 
            (p.email || '').trim().toLowerCase() === trimmedEmail.toLowerCase() && p.id !== patientId
          );
          if (localDuplicate) {
            console.warn(`[handleCreatePatient] E-mail duplicado detectado para: ${trimmedEmail}`);
            alert(`Aten√ß√£o: O e-mail "${trimmedEmail}" j√° est√° vinculado a outro paciente (${localDuplicate.name || 'Paciente'}) no sistema.`);
            return false;
          }
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
      console.error("[handleCreatePatient] Falha cr√≠tica:", e);
      let errorMsg = "Permiss√£o negada ou falha na rede.";
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
      return false;
    }

    // Normaliza data (segunda a sexta) e hor√°rio (respeita 17h00 e slots de 1h30)
    const normalized = normalizeAppointmentDateTime(newAppt.data, newAppt.horario || '08:00');
    const finalDate = normalized.date;
    const finalTime = normalized.time;

    const trimmedPatientName = (newAppt.paciente || '').trim();
    const matchedPatient = findPatientByRobustMatch(trimmedPatientName, patients);
    let finalPatientId = newAppt.pacienteId || matchedPatient?.id;
    const patientPhone = newAppt.telefone || newAppt.phone || matchedPatient?.phone || '';
    const isFromPortal = Boolean(newAppt.viaPortal || newAppt.origem?.toLowerCase().includes('portal') || newAppt.canal?.toLowerCase().includes('portal'));

    // Garante que o paciente esteja cadastrado no sistema vinculado ao m√©dico/dentista selecionado
    try {
      if (!matchedPatient) {
        finalPatientId = finalPatientId || `pat-${Date.now()}`;
        const newPatientData: any = {
          id: finalPatientId,
          name: trimmedPatientName,
          email: newAppt.email || '',
          phone: patientPhone,
          cpf: newAppt.cpf || '',
          dentistaResponsavel: newAppt.dentista, // Vincula ao m√©dico/dentista selecionado no portal
          origem: isFromPortal ? 'Portal do Paciente' : (newAppt.origem || 'Agenda'),
          canal: isFromPortal ? 'Portal Online' : (newAppt.canal || 'Recep√ß√£o'),
          viaPortal: isFromPortal,
          status: 'Ativo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (trialId) {
          newPatientData.trialOwnerId = trialId;
        }
        console.log('[handleCreateAppointment] Auto-cadastrando novo paciente via agendamento:', newPatientData);
        await setDoc(doc(db, 'patients', finalPatientId), newPatientData, { merge: true });
      } else {
        finalPatientId = matchedPatient.id;
        const needsUpdate = !matchedPatient.dentistaResponsavel || isFromPortal || (newAppt.telefone && !matchedPatient.phone);
        if (needsUpdate) {
          const updatedPatientData: any = {
            dentistaResponsavel: matchedPatient.dentistaResponsavel || newAppt.dentista,
            updatedAt: new Date().toISOString()
          };
          if (newAppt.telefone && !matchedPatient.phone) {
            updatedPatientData.phone = newAppt.telefone;
          }
          if (newAppt.cpf && !matchedPatient.cpf) {
            updatedPatientData.cpf = newAppt.cpf;
          }
          if (newAppt.email && !matchedPatient.email) {
            updatedPatientData.email = newAppt.email;
          }
          if (isFromPortal && !matchedPatient.origem) {
            updatedPatientData.origem = 'Portal do Paciente';
            updatedPatientData.canal = 'Portal Online';
            updatedPatientData.viaPortal = true;
          }
          await setDoc(doc(db, 'patients', matchedPatient.id), updatedPatientData, { merge: true });
        }
      }
    } catch (patSyncErr) {
      console.warn('[handleCreateAppointment] Aviso ao sincronizar paciente no Firestore:', patSyncErr);
    }

    const record: DentalRecord = {
      id: `rec-new-${Date.now()}`,
      data: finalDate,
      horario: finalTime,
      paciente: trimmedPatientName,
      pacienteId: finalPatientId || undefined,
      telefone: patientPhone || '',
      procedimento: newAppt.procedimento || 'Avalia√ß√£o',
      dentista: newAppt.dentista,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      valor: Number(newAppt.valor) || 0,
      observacao: newAppt.observacao || (isFromPortal ? 'Agendamento realizado via Portal do Paciente Online' : ''),
      origem: isFromPortal ? 'Portal do Paciente' : (newAppt.origem || 'Agenda'),
      viaPortal: isFromPortal,
      canal: isFromPortal ? 'Portal Online' : (newAppt.canal || 'Presencial'),
      isQuickEvent: newAppt.isQuickEvent || false,
      createdBy: newAppt.createdBy || (isFromPortal ? 'Portal do Paciente' : '')
    } as any;

    if (trialId) {
      (record as any).trialOwnerId = trialId;
    }

    // Verifica√ß√£o de conflito para o dentista (intervalo de 1h30)
    const conflict = findDentistScheduleConflict(data, record.dentista, finalDate, finalTime);

    if (conflict) {
      alert(`CONFLITO DE HOR√ÅRIO: O(A) ${record.dentista} j√° possui atendimento marcado (${conflict.horario} - ${conflict.paciente}) que colide com este intervalo de 1h30 no dia ${finalDate}. Por favor, escolha outro hor√°rio dispon√≠vel.`);
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
          message: `Novo agendamento: ${record.paciente} para o dia ${record.data} √†s ${record.horario}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      setSubPage(null);
      return true;
    } catch (e: any) {
      console.error("Erro ao salvar agendamento:", e);
      alert("Erro ao salvar agendamento: " + (e.message || "Verifique sua conex√£o ou permiss√µes."));
      return false;
    }
  };

  const handleCreateClinicalRecord = async (newRecord: any) => {
    if (!newRecord.paciente || !newRecord.dentista || !newRecord.data) {
      alert('Por favor, preencha todos os campos do registro cl√≠nico.');
      return false;
    }

    const record: DentalRecord = {
      id: `rec-evo-${Date.now()}`,
      data: newRecord.data,
      horario: newRecord.horario || format(new Date(), 'HH:mm'),
      paciente: newRecord.paciente,
      procedimento: newRecord.procedimento || 'Avalia√ß√£o',
      dentista: newRecord.dentista,
      status: 'Conclu√≠do',
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
      alert("Erro ao salvar registro: " + (e.message || "Erro de permiss√£o."));
      return false;
    }
  };

  const handleCreateDocument = async (newDoc: any): Promise<boolean> => {
    if (!newDoc.patientName || !newDoc.content || !newDoc.type) {
      alert('Por favor, preencha todos os campos obrigat√≥rios.');
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
        procedimento: `Emiss√£o de ${newDoc.type}`,
        valor: 0
      });
      return true;
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar documento: " + (e.message || "Erro de permiss√£o."));
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
      alert("Erro ao salvar anamnese: " + (e.message || "Permiss√£o negada."));
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
      alert("ID do paciente √© inv√°lido para exclus√£o.");
      return;
    }

    // Deletion is now handled via state + confirm modal in the UI
    /*
    const confirmMessage = 'Tem certeza que deseja excluir permanentemente o cadastro deste paciente? Todas as informa√ß√µes de prontu√°rio associadas ser√£o removidas.';
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

      alert('Cadastro do paciente e hist√≥ricos associados exclu√≠dos com sucesso.');
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
    const clinicOwnerId = currentUser?.parentTrialId || currentUser?.clinicId || (currentUser?.isTrial ? currentUser.id : (currentUser?.role === 'Admin' ? currentUser.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : currentUser?.id || '1')));

    const user: any = {
      id,
      name: newUser.name,
      role: newUser.role,
      modules: newUser.modules || (newUser.role === 'Admin' ? 'Todos' : (newUser.role === 'Dentista' ? 'Dashboard, Agenda, Pacientes' : (newUser.role === 'Recepcionista' ? 'Dashboard, Agenda, Pacientes' : 'Agenda, Pacientes, Financeiro'))),
      username: newUser.username || (newUser.name || "user").toLowerCase().replace(' ', '.'),
      password: newUser.password || '123',
      email: newUser.email || '',
      phone: newUser.phone || '',
      clinicName: clinicName || currentUser?.clinicName || 'mbsolucoes',
      clinicId: clinicOwnerId,
      parentTrialId: clinicOwnerId,
      createdAt: new Date().toISOString()
    };
    
    try {
      console.log("Iniciando cria√ß√£o de usu√°rio no Firestore:", user);
      await setDoc(doc(db, 'users', id), user);
      console.log("Sucesso: Usu√°rio gravado!");
      return true;
    } catch (e: any) {
      console.error("Erro cr√≠tico ao criar usu√°rio:", e);
      alert("Erro ao gravar usu√°rio. Verifique sua conex√£o ou permiss√µes. Detalhes: " + (e.message || ""));
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
      
      console.log(`[Users] Usu√°rio ${userId} salvo em Firestore com sucesso.`, {
        username: dataToUpdate.username,
        hasPassword: !!dataToUpdate.password,
        pwdLength: dataToUpdate.password?.length
      });
      return true;
    } catch (e: any) {
      console.error("Erro ao atualizar usu√°rio:", e);
      alert("Erro ao atualizar usu√°rio: " + (e.message || "Permiss√£o negada."));
      return false;
    }
  };

  const handleDeleteUser = async (userId: string): Promise<boolean> => {
    console.log("handleDeleteUser starting for:", userId);
    
    // Evitar que o usu√°rio exclua a si mesmo enquanto estiver logado na sess√£o ativa
    if (currentUser && (currentUser.id === userId || currentUser.uid === userId)) {
      alert("Voc√™ n√£o pode excluir sua pr√≥pria conta enquanto estiver conectado.");
      return false;
    }

    try {
      if (!userId) throw new Error("ID do usu√°rio n√£o fornecido.");
      
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
      
      return true;
    } catch (e: any) {
      console.error("Error during handleDeleteUser:", e);
      handleFirestoreError(e, OperationType.DELETE, 'users/' + userId);
      return false;
    }
  };

  const handleUnlockUser = async (userId: string, username: string) => {
    try {
      if (username) {
        SecurityUtils.resetBruteForce(username);
      }
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { isLocked: false, loginAttempts: 0 }, { merge: true });
      try {
        if (username) {
          const attemptRef = doc(db, 'login_attempts', username.toLowerCase().trim());
          await setDoc(attemptRef, { count: 0, lockedUntil: null }, { merge: true });
        }
      } catch (e) {
        console.warn("Could not reset firestore attempt doc:", e);
      }
      alert(`Usu√°rio ${username || userId} desbloqueado com sucesso!`);
    } catch (err: any) {
      console.error("Erro ao desbloquear usu√°rio:", err);
      alert("Erro ao desbloquear usu√°rio: " + (err.message || "Erro desconhecido"));
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
        alert(`Erro ao enviar: ${err.error || 'Servi√ßo de e-mail n√£o configurado'}`);
        if (err.error?.includes("not configured") || err.error?.includes("Autentica√ß√£o")) {
          alert("DICA: Configure EMAIL_USER e EMAIL_PASS corretamente nas Configura√ß√µes. Se usar Gmail, use uma 'Senha de Aplicativo'.");
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
      console.warn("Paciente n√£o encontrado na base de dados:", record.paciente);
      alert(`O paciente "${record.paciente}" n√£o foi encontrado no cadastro de pacientes.\n\nCertifique-se de que o nome cadastrado no agendamento √© o mesmo que consta na aba 'Pacientes'.`);
      return;
    }

    proceedWithWhatsApp(patient, record);
  };

  // Fun√ß√£o interna para processar o envio ap√≥s encontrar o paciente
  const proceedWithWhatsApp = (patient: any, record: DentalRecord) => {
    // Buscando telefone no cadastro do paciente em m√∫ltiplos campos comuns
    const phone = patient.phone || patient.telefone || patient.celular || patient.mobile || patient.contato || '';
    
    if (!phone) {
      console.warn("Telefone n√£o encontrado no objeto do paciente:", patient);
      alert(`O paciente "${patient.name}" n√£o tem um telefone cadastrado.\n\nPor favor, v√° na aba 'Pacientes', procure por este paciente, clique em 'Editar' e adicione o n√∫mero de celular.`);
      return;
    }

    const timeStr = record.horario ? ` √†s ${record.horario}` : '';
    const dateFormatted = record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), "dd/MM/yyyy") : "N/D";
    
    // Gerar link de a√ß√£o do paciente
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const confirmationLink = `${origin}${pathname}?confirmAppt=${record.id}`;

    const message = `Ol√°, ${record.paciente}!\n\nConfirmando a sua consulta odontol√≥gica de *${record.procedimento}* para o dia *${dateFormatted}*${timeStr} com *${record.dentista}*.\n\nPor favor, responda ou gerencie sua consulta (Confirmar, Cancelar ou Reagendar) clicando no link abaixo:\n\nüëâ ${confirmationLink}`;
    const encodedMessage = encodeURIComponent(message);
    
    // Remove caracteres n√£o num√©ricos e garante o DDI 55 (Brasil) se n√£o houver
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
      console.error("Agendamento n√£o localizado no estado.:", recordId);
      alert("Agendamento n√£o encontrado. Tente atualizar a p√°gina.");
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
          `Agendamento de ${record.paciente} cancelado com sucesso.\n\nDeseja enviar uma notifica√ß√£o de cancelamento sugerindo o reagendamento?`
        );

        if (confirmNotification) {
          const formattedDate = format(parseISO(record.data), 'dd/MM/yyyy');
          const message = `Ol√° ${record.paciente}, informamos que seu agendamento para o dia ${formattedDate} √†s ${record.horario} com o(a) ${record.dentista} foi cancelado. Gostaria de reagendar para uma nova data? Estamos √† disposi√ß√£o!`;
          
          if (patientEmail) {
            const subject = encodeURIComponent('Cancelamento de Agendamento - Cl√≠nica Odontol√≥gica');
            const body = encodeURIComponent(message);
            window.open(`mailto:${patientEmail}?subject=${subject}&body=${body}`, '_blank');
          }
        }
      }

      console.log(`Cancelamento conclu√≠do para ${record.paciente}`);
    } catch (e) {
      console.error("Erro no processo de cancelamento:", e);
      // Revert optimistic update on error
      const originalRecord = data.find(r => r.id === recordId);
      if (originalRecord) {
        setData(prev => prev.map(r => r.id === recordId ? originalRecord : r));
      }
      alert("N√£o foi poss√≠vel cancelar o agendamento no servidor. Verifique sua conex√£o.");
      handleFirestoreError(e, OperationType.UPDATE, 'records/' + recordId);
    }
  };

  const handleStartConsultation = async (recordId: string) => {
    const record = data.find(r => r.id === recordId);
    if (!record) {
      console.error("Agendamento n√£o encontrado para iniciar:", recordId);
      return;
    }

    const servingTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const doctor = users.find(u => u.name === record.dentista || (record.dentista && u.name?.includes(record.dentista)));

    try {
      // Optimistic update for records
      setData(prev => prev.map(r => r.id === recordId ? { ...r, status: 'Em Atendimento', startedAt: new Date().toISOString() } : r));

      // Optimistic update for users (Reception & Doctor status)
      setUsers(prev => prev.map(u => (u.name === record.dentista || (doctor && u.id === doctor.id)) ? {
        ...u,
        availability: 'em_atendimento',
        currentPatient: record.paciente,
        servingSince: servingTime
      } : u));

      // 1. Update record status in Firestore
      await setDoc(doc(db, 'records', recordId), {
        status: 'Em Atendimento',
        startedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update current doctor status in Firestore
      if (doctor) {
        try {
          await setDoc(doc(db, 'users', doctor.id), {
            availability: 'em_atendimento',
            currentPatient: record.paciente,
            servingSince: servingTime
          }, { merge: true });
        } catch (doctorErr) {
          console.warn("Could not update doctor status in Firestore (continuing anyway):", doctorErr);
        }
      }
      console.log(`Consulta iniciada para ${record.paciente} com Dr(a). ${record.dentista}`);
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

    const doctor = users.find(u => u.name === record.dentista || (record.dentista && u.name?.includes(record.dentista)));

    try {
      // Optimistic update for records
      setData(prev => prev.map(r => r.id === recordId ? { ...r, status: 'Realizado', finishedAt: new Date().toISOString() } : r));

      // Optimistic update for users (Reception & Doctor status restored to available)
      setUsers(prev => prev.map(u => (u.name === record.dentista || (doctor && u.id === doctor.id)) ? {
        ...u,
        availability: 'disponivel',
        currentPatient: null,
        servingSince: null
      } : u));

      // 1. Update record status in Firestore
      await setDoc(doc(db, 'records', recordId), {
        status: 'Realizado',
        finishedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update doctor status in Firestore
      if (doctor) {
        try {
          await setDoc(doc(db, 'users', doctor.id), {
            availability: 'disponivel',
            currentPatient: null,
            servingSince: null
          }, { merge: true });
        } catch (doctorErr) {
          console.warn("Could not update doctor status in Firestore (continuing anyway):", doctorErr);
        }
      }
      console.log(`Consulta conclu√≠da para ${record.paciente}`);
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
    setImpersonatingSuperAdmin(null);
    setIsAuthenticated(false);
    setActivePage('Dashboard');
    setSubPage(null);
  };

  const handleAccessClinic = (target: any) => {
    if (!currentUser) return;
    const targetOwner = target?.owner || target;
    const resolvedClinicName = target?.clinicName || targetOwner?.resolvedClinic || targetOwner?.clinicName || 'Cl√≠nica';
    const responsibleDoctorName = target?.responsibleDoctor || targetOwner?.name || targetOwner?.username;

    setImpersonatingSuperAdmin(currentUser);
    setCurrentUser({
      ...targetOwner,
      name: responsibleDoctorName,
      clinicName: resolvedClinicName,
      role: 'Admin', // Guarantee administrative context for this clinic
    });
    setActivePage('Dashboard');
    setSubPage(null);
  };

  const handleExitImpersonation = () => {
    if (impersonatingSuperAdmin) {
      setCurrentUser(impersonatingSuperAdmin);
      setImpersonatingSuperAdmin(null);
      setActivePage('SuperAdmin');
      setSubPage(null);
    }
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

      console.log("Restaura√ß√£o conclu√≠da!");
    } catch (error) {
      console.error("Erro na restaura√ß√£o:", error);
      throw error;
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpdateSettings = async (updates: { clinicName?: string; clinicLogo?: string | null; footerText?: string; providerPhone?: string; providerName?: string }) => {
    const clinicOwnerId = currentUser?.parentTrialId || currentUser?.clinicId || (currentUser?.isTrial ? currentUser.id : (currentUser?.role === 'Admin' ? currentUser.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : currentUser?.id || '1')));
    const docId = `clinic-${clinicOwnerId}`;

    try {
      await setDoc(doc(db, 'settings', docId), {
        id: docId,
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Atualiza tamb√©m no perfil do usu√°rio no Firestore para persistir com o usu√°rio admin
      if (currentUser?.id) {
        try {
          const userUpdates: any = { updatedAt: new Date().toISOString() };
          if (updates.clinicName) userUpdates.clinicName = updates.clinicName;
          await setDoc(doc(db, 'users', currentUser.id), userUpdates, { merge: true });
        } catch (uErr) {
          console.warn("Could not sync clinicName to user doc:", uErr);
        }
      }

      if (updates.providerPhone) {
        setProviderPhone(updates.providerPhone);
        localStorage.setItem('odonto_cfg_providerPhone', updates.providerPhone);
      }
      if (updates.providerName) {
        setProviderName(updates.providerName);
        localStorage.setItem('odonto_cfg_providerName', updates.providerName);
      }
    } catch (e: any) {
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
          console.error(`Erro ao limpar cole√ß√£o ${collName}:`, err);
          errorCount++;
        }
      }
      
      if (errorCount > 0) {
        alert(`O sistema foi parcialmente limpo. ${successCount} cole√ß√µes removidas, ${errorCount} erros encontrados. Verifique o console para detalhes.`);
      } else {
        alert("Sistema limpo com sucesso! Os usu√°rios padr√£o foram restaurados automaticamente na interface.");
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
            if (typeof window !== 'undefined' && window.history.pushState) {
              const newUrl = window.location.pathname;
              window.history.pushState({}, '', newUrl);
            }
          }} 
          users={users} 
          data={data} 
          onPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onTerms={() => setShowTermsOfUse(true)}
          clinicName={bookingClinicName || clinicName}
          clinicLogo={clinicLogo}
          footerText={footerText}
          clinicId={bookingClinicId || currentUser?.clinicId || currentUser?.trialOwnerId}
          targetDoctor={bookingDoctor}
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
                throw new Error("Este nome de usu√°rio j√° est√° sendo utilizado por outra conta.");
              }

              // 2. Check duplicate Email to prevent multiple trials
              const qEmail = query(usersRef, where('email', '==', emailNormalized));
              const emailSnap = await getDocs(qEmail);
              if (!emailSnap.empty) {
                const existingUser = emailSnap.docs[0].data();
                if (existingUser.isTrial === true) {
                  throw new Error("O e-mail informado j√° foi utilizado para cadastrar uma conta de teste (Trial). N√£o √© permitido criar m√∫ltiplos testes gr√°tis com o mesmo e-mail.");
                } else {
                  throw new Error("Este e-mail j√° pertence a uma conta ativa no sistema.");
                }
              }

              // 3. Check duplicate WhatsApp/Phone (raw phone matching or normalized phone digits matching)
              const qPhoneRaw = query(usersRef, where('phone', '==', phoneTrimmed));
              const phoneRawSnap = await getDocs(qPhoneRaw);
              if (!phoneRawSnap.empty) {
                const existingUser = phoneRawSnap.docs[0].data();
                if (existingUser.isTrial === true) {
                  throw new Error("Este n√∫mero de WhatsApp j√° foi utilizado para cadastrar uma conta de teste (Trial). Cada profissional/cl√≠nica tem direito a apenas um per√≠odo de teste de 14 dias.");
                } else {
                  throw new Error("Este n√∫mero de WhatsApp j√° est√° cadastrado em outra conta ativa.");
                }
              }

              const qPhoneNorm = query(usersRef, where('normalizedPhone', '==', phoneDigits));
              const phoneNormSnap = await getDocs(qPhoneNorm);
              if (!phoneNormSnap.empty) {
                const existingUser = phoneNormSnap.docs[0].data();
                if (existingUser.isTrial === true) {
                  throw new Error("Este n√∫mero de WhatsApp j√° foi utilizado para cadastrar uma conta de teste (Trial) anteriormente.");
                } else {
                  throw new Error("Este n√∫mero de WhatsApp correspondente j√° est√° cadastrado em outra conta ativa.");
                }
              }

              const clinicNameValue = (details.clinicName || '').trim() || 'mbsolucoes';
              setClinicName(clinicNameValue);
              const trialIdGenerated = `trial-${Date.now()}`;
              try {
                // Salva as configura√ß√µes diretamente no documento isolado do trial gerado
                await setDoc(doc(db, 'settings', `clinic-${trialIdGenerated}`), {
                  id: `clinic-${trialIdGenerated}`,
                  clinicName: clinicNameValue,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              } catch (e) {
                console.error("Erro ao atualizar configura√ß√µes no Firestore:", e);
              }
              
              const selectedMods = details.selectedModules && details.selectedModules.length > 0
                ? details.selectedModules
                : ['Dashboard', 'Agenda', 'Pacientes', 'Documentos', 'Retorno', 'Mensagens', 'Estoque', 'Financeiro', 'Administra√ß√£o'];
              const modulesString = selectedMods.length >= 9 ? 'Todos' : selectedMods.join(',');

              const trialUserProfile = {
                id: trialIdGenerated,
                name: details.fullName,
                clinicName: clinicNameValue,
                clinicId: trialIdGenerated,
                role: 'Admin',
                modules: modulesString,
                username: usernameTrimmed,
                password: details.password.trim(),
                email: emailNormalized,
                phone: phoneTrimmed,
                normalizedPhone: phoneDigits,   // Field stored for future digit-normalized lookup checks
                cpf: details.cpf.replace(/\D/g, ''), // Store raw digits only
                isTrial: true,
                trialPlan: details.plan,
                trialSpecialty: details.specialty,
                trialModules: selectedMods,
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
          onPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onTerms={() => setShowTermsOfUse(true)}
          clinicName={clinicName}
          clinicLogo={clinicLogo}
          footerText={footerText}
          onOpenFreeTrial={() => setIsFreeTrialView(true)}
          onInstallPWA={handleInstallPWA}
          deferredPrompt={deferredPrompt}
        />
        {renderLegal()}
      </>
    );
  }

  const renderContent = () => {
    if (subPage === 'Prontuario' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <PatientRecordView 
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
          currentUser={currentUser}
        />
      );
    }
    if (subPage === 'Cadastrar' && activePage === 'Pacientes') {
      return <CustomPatientFormView patients={patientsForUser} users={users} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'Editar' && activePage === 'Pacientes' && selectedPatientId) {
      return <CustomPatientFormView isEdit patientId={selectedPatientId} patients={patientsForUser} users={users} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'NovoAgendamento' && (activePage === 'Agenda' || activePage === 'Consultas' || activePage === 'Pacientes')) {
      return (
        <CustomAppointmentFormView 
          patients={patientsForUser} 
          data={filteredRecords} 
          users={users} 
          currentUser={currentUser}
          onSave={handleCreateAppointment} 
          onQuickAddPatient={handleCreatePatient}
          onBack={() => setSubPage(null)} 
          presetPatient={selectedPatientId}
          clinicName={clinicName}
        />
      );
    }

    // Permission Guard for module rendering
    const canAccessFinance = hasModule('Financeiro');
    const canAccessAdmin = hasModule('Administra√ß√£o');
    const canAccessConfig = hasModule('Administra√ß√£o');

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
            <CustomDashboardView 
              filteredData={filteredData} 
              upcomingAppointments={upcomingAppointments}
              onSendWhatsApp={handleWhatsAppReminder} 
              onSendReminder={handleSendManualReminder} 
              canSeeFinancials={canSeeFinancials}
              users={users}
              currentUser={currentUser}
              onStart={handleStartConsultation}
              onFinish={handleFinishConsultation}
              onNavigate={(page, subP = null) => { setActivePage(page); setSubPage(subP); }}
              clinicName={clinicName}
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
              <p className="text-slate-500 text-xs">Voc√™ n√£o possui permiss√£o para acessar o m√≥dulo de Mensagens. Entre em contato com o administrador.</p>
            </div>
          );
        }
        return (
          <CustomMessagesView 
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
          <CustomPatientsView 
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
            onQuickBook={(patientIdOrName) => {
              const p = patientsForUser.find(pat => pat.id === patientIdOrName || pat.name === patientIdOrName);
              setSelectedPatientId(p ? p.id : patientIdOrName);
              setActivePage('Agenda');
              setSubPage('NovoAgendamento');
            }}
            clinicName={clinicName}
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
                dentist: nextRec?.dentista || lastRec?.dentista || 'N√£o definido',
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
        return <ScheduleView 
          data={data} 
          onAdd={() => setSubPage('NovoAgendamento')} 
          onCancel={handleCancelAppointment}
          onStart={handleStartConsultation}
          onFinish={handleFinishConsultation}
          onCreateAppointment={handleCreateAppointment}
          onOpenChart={(patientIdOrName) => {
            const p = patientsForUser.find(pat => pat.id === patientIdOrName || pat.name === patientIdOrName);
            setSelectedPatientId(p ? p.id : patientIdOrName);
            setActivePage('Pacientes');
            setSubPage('Prontuario');
          }}
          users={users}
          currentUser={currentUser}
          clinicName={clinicName}
          clinicId={currentUser?.clinicId || currentUser?.trialOwnerId || currentUser?.id || '1'}
        />;
      case 'Consultas':
        return <AppointmentsView 
          data={data} 
          patients={patientsForUser}
          onAdd={() => setSubPage('NovoAgendamento')} 
          onCancel={handleCancelAppointment}
          onSendWhatsApp={handleWhatsAppReminder}
          onStart={handleStartConsultation}
          onFinish={handleFinishConsultation}
          onOpenChart={(patientIdOrName) => {
            const p = patientsForUser.find(pat => pat.id === patientIdOrName || pat.name === patientIdOrName);
            setSelectedPatientId(p ? p.id : patientIdOrName);
            setActivePage('Pacientes');
            setSubPage('Prontuario');
          }}
        />;
      case 'Financeiro':
        return canAccessFinance ? (
          <CustomFinanceView
            data={filteredData}
            patients={patientsForUser}
            onUpdatePayment={handleUpdatePaymentStatus}
            clinicName={clinicName}
            users={users}
            currentUser={currentUser}
          />
        ) : <div className="p-8 text-slate-400">Acesso restrito ao Financeiro.</div>;
      case 'Administra√ß√£o':
        return canAccessAdmin ? (
          <CustomAdminView 
            users={users} 
            data={data}
            patients={patientsForUser}
            documents={documents}
            currentUser={currentUser}
            onAddUser={handleCreateUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser}
            onUnlockUser={handleUnlockUser}
            onRestoreBackup={handleRestoreData}
            clinicName={clinicName}
            clinicLogo={clinicLogo}
            footerText={footerText}
            providerPhone={providerPhone}
            providerName={providerName}
            onUpdateSettings={handleUpdateSettings}
            deferredPrompt={deferredPrompt}
            onInstallPWA={handleInstallPWA}
          />
        ) : (
          <div className="p-8 text-slate-400">Acesso restrito √† Administra√ß√£o.</div>
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
            onDeleteUser={handleDeleteUser}
            onAccessClinic={handleAccessClinic}
            clinicName={clinicName}
            db={db} 
          />
        );
      case 'IAClinica':
        return (
          <RadiographyAIView 
            patients={patientsForUser}
            onOpenTreatmentPlanModal={(patientData) => {
              setAiTreatmentPatient(patientData);
              setShowTreatmentPlanModal(true);
            }}
          />
        );
      case 'PortalPaciente':
        return (
          <PatientPortalView 
            clinicName={clinicName}
            patients={patientsForUser}
            records={data}
            documents={documents}
            doctorsList={doctorsList.filter(d => d !== 'Todos')}
            proceduresList={procedures.filter(p => p !== 'Todos')}
            onBookAppointment={(newBooking) => {
              handleCreateAppointment(newBooking);
            }}
            onBackToSystem={() => setActivePage('Dashboard')}
          />
        );
      case 'ChatbotIA':
        return (
          <WhatsAppChatbotView 
            clinicName={clinicName}
            doctorsList={doctorsList.filter(d => d !== 'Todos')}
            records={data}
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
            clinicName={clinicName}
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
          clinicName={clinicName}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex font-sans text-slate-900 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        <Sidebar 
          activePage={activePage}
          adminTab={adminTab}
          currentUser={currentUser}
          hasModule={hasModule}
          isModuleLockedBySaaS={isModuleLockedBySaaS}
          onNavigate={(page, subPage = null) => { setActivePage(page); setSubPage(subPage); }}
          onLogout={handleLogout}
          clinicName={clinicName}
          appointmentsCount={upcomingAppointments.length}
          patientsCount={patientsForUser.length}
          isImpersonating={!!impersonatingSuperAdmin}
          onExitImpersonation={handleExitImpersonation}
        />
      </div>

      {/* Mobile Slide-out Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-2xl z-55 lg:hidden"
            >
              <Sidebar 
                activePage={activePage}
                adminTab={adminTab}
                currentUser={currentUser}
                hasModule={hasModule}
                isModuleLockedBySaaS={isModuleLockedBySaaS}
                onNavigate={(page, subPage = null) => { setActivePage(page); setSubPage(subPage); setIsMenuOpen(false); }}
                onLogout={() => { handleLogout(); setIsMenuOpen(false); }}
                clinicName={clinicName}
                appointmentsCount={upcomingAppointments.length}
                patientsCount={patientsForUser.length}
                isImpersonating={!!impersonatingSuperAdmin}
                onExitImpersonation={handleExitImpersonation}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SuperAdmin Impersonation Banner */}
      {impersonatingSuperAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[120] bg-gradient-to-r from-amber-600 via-indigo-700 to-indigo-950 text-white px-4 py-2.5 flex items-center justify-between shadow-2xl text-xs select-none border-b border-amber-400/30">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-900" />
              Acesso Master / Suporte
            </span>
            <span className="text-white/95 font-medium">
              Cl√≠nica: <strong className="text-amber-200">{currentUser?.clinicName || clinicName || 'Cl√≠nica'}</strong> &bull; Respons√°vel T√©cnico: <strong className="text-white">{currentUser?.name || currentUser?.username}</strong> (Administrador da Cl√≠nica)
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitImpersonation}
            className="bg-white hover:bg-amber-50 text-slate-900 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-white/50 shrink-0 ml-3"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-700" />
            <span>Sair da Cl√≠nica / Painel Master</span>
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className={cn("flex-1 flex flex-col min-h-screen min-w-0", impersonatingSuperAdmin ? "pt-26" : "pt-16")}>
        {/* Top Navbar */}
        <TopBar 
          onMenuToggle={() => setIsMenuOpen(true)}
          currentUser={currentUser}
          isImpersonating={!!impersonatingSuperAdmin}
          notifications={notifications}
          onNotificationClick={() => setShowNotifications(!showNotifications)}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          clinicName={clinicName}
          onNavigate={(page, subPage = null) => { setActivePage(page); setSubPage(subPage); }}
          onLogout={handleLogout}
          activePage={activePage}
          searchPatient={searchPatient}
          setSearchPatient={setSearchPatient}
          filterDateRange={filterDateRange}
          setFilterDateRange={setFilterDateRange}
          filterStartDate={filterStartDate}
          setFilterStartDate={setFilterStartDate}
          filterEndDate={filterEndDate}
          setFilterEndDate={setFilterEndDate}
          filterProcedure={filterProcedure}
          setFilterProcedure={setFilterProcedure}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterPayment={filterPayment}
          setFilterPayment={setFilterPayment}
          filterDentista={filterDentista}
          setFilterDentista={setFilterDentista}
          procedures={procedures}
          statuses={statuses}
          paymentStatuses={paymentStatuses}
          doctorsList={doctorsList}
          onOnlineBookingClick={() => {
            setShowShareBookingModal(true);
          }}
        />

    <div className="hidden">
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
                      <span>Gest√£o de Documentos</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dropdown Comunica√ß√£o */}
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
                <span>Comunica√ß√£o</span>
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

          {/* Dropdown Administra√ß√£o */}
          {hasModule('Administra√ß√£o') && (
            <div className="relative group/menu h-full flex items-center">
              <button
                onClick={() => { setActivePage('Administra√ß√£o'); setSubPage(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activePage === 'Administra√ß√£o' 
                    ? "bg-brand-cyan/25 text-white border border-brand-cyan/40" 
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Activity className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Administra√ß√£o</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-[85%] left-0 hidden group-hover/menu:block pt-2 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setActivePage('Administra√ß√£o'); setAdminTab('users'); setSubPage(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                      activePage === 'Administra√ß√£o' && adminTab === 'users' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Gest√£o de Usu√°rios</span>
                  </button>
                  <button
                    onClick={() => { setActivePage('Administra√ß√£o'); setAdminTab('settings'); setSubPage(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                      activePage === 'Administra√ß√£o' && adminTab === 'settings' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Settings className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Dados da Cl√≠nica</span>
                  </button>
                  <button
                    onClick={() => { setActivePage('Administra√ß√£o'); setAdminTab('backup'); setSubPage(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer",
                      activePage === 'Administra√ß√£o' && adminTab === 'backup' ? "bg-brand-cyan text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Restaura√ß√£o & Backup</span>
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
    </div> {/* Close first hidden block */}

      {/* Conte√∫do Principal (Central) */}
      <div className="relative">
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
                <h3 className="font-bold text-rose-900 text-sm">Limite de sincroniza√ß√£o atingido</h3>
                <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                  O limite gratuito de consultas ao banco de dados foi excedido hoje. 
                  Os dados apresentados podem estar desatualizados. A sincroniza√ß√£o em tempo real retornar√° automaticamente em algumas horas.
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
        {showTreatmentPlanModal && (
          <TreatmentPlanAIModal
            isOpen={showTreatmentPlanModal}
            onClose={() => {
              setShowTreatmentPlanModal(false);
              setAiTreatmentPatient(null);
            }}
            patientName={aiTreatmentPatient?.patientName || ''}
            clinicalFindings={aiTreatmentPatient?.clinicalFindings || ''}
            onApplyPlan={(plan) => {
              if (aiTreatmentPatient?.patientName) {
                handleCreateDocument({
                  patientName: aiTreatmentPatient.patientName,
                  type: 'Plano de Tratamento IA',
                  content: `PLANO DE TRATAMENTO SUGERIDO POR IA: ${plan.title}\n\nDiagn√≥stico: ${plan.diagnosis}\nInvestimento Estimado: R$ ${plan.estimatedCost}\n\nFases Cl√≠nicas:\n` + 
                    (plan.phases || []).map((ph: any) => `‚Ä¢ ${ph.phaseName} (Dura√ß√£o: ${ph.duration}):\n  ${ph.procedures?.join(', ')}`).join('\n\n')
                });
              }
              setShowTreatmentPlanModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div> {/* Close relative container */}

    <div className="hidden">
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
              {hasModule('Administra√ß√£o') && (
                <RibbonItem 
                  icon={<Activity className="w-3.5 h-3.5" />} 
                  label="Adm" 
                  active={activePage === 'Administra√ß√£o'} 
                  onClick={() => { setActivePage('Administra√ß√£o'); setSubPage(null); }}
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

          <button 
              onClick={handleLogout}
              className="flex flex-col items-center justify-center px-4 py-1.5 bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer group min-w-[55px] shrink-0 active:scale-95"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] uppercase font-black tracking-widest mt-1">Sair</span>
            </button>
          </div>
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
                        <span>Documentos Cl√≠nicos</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Group: Comunica√ß√£o */}
                {(hasModule('Mensagens') || hasModule('Retorno')) && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-brand-cyan" />
                      <span>Comunica√ß√£o</span>
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
                        <span>Gest√£o de Retornos</span>
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

                {/* Group: Configura√ß√µes */}
                {hasModule('Administra√ß√£o') && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3.5 mb-1.5 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-brand-cyan" />
                      <span>Administra√ß√£o</span>
                    </div>
                    <button
                      onClick={() => { setActivePage('Administra√ß√£o'); setAdminTab('users'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Administra√ß√£o' && adminTab === 'users' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span>Gest√£o de Usu√°rios</span>
                    </button>
                    <button
                      onClick={() => { setActivePage('Administra√ß√£o'); setAdminTab('settings'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Administra√ß√£o' && adminTab === 'settings' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span>Dados da Cl√≠nica</span>
                    </button>
                    <button
                      onClick={() => { setActivePage('Administra√ß√£o'); setAdminTab('backup'); setSubPage(null); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border text-left pl-6 cursor-pointer",
                        activePage === 'Administra√ß√£o' && adminTab === 'backup' ? "bg-brand-cyan/25 border-brand-cyan/35 text-white" : "bg-transparent border-transparent text-slate-355 hover:bg-white/5"
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
    </div> {/* Closing hidden old container wrapper */}


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
                ? "p-0 h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f4f7fa]"
                : activePage === 'Dashboard'
                ? "p-0 min-h-[calc(100vh-4rem)] bg-[#f4f7fa]"
                : "p-3 sm:p-4 md:p-5 space-y-4 max-w-7xl"
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
                        {globalBanner.type === 'maintenance' ? 'Manuten√ß√£o / Atualiza√ß√£o' : 'Aviso do Sistema'}
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

            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer 
        onPrivacyPolicy={() => setShowPrivacyPolicy(true)} 
        onTerms={() => setShowTermsOfUse(true)} 
        footerText={footerText}
      />

      <ShareBookingModal
        isOpen={showShareBookingModal}
        onClose={() => setShowShareBookingModal(false)}
        clinicName={clinicName}
        clinicId={currentUser?.clinicId || currentUser?.trialOwnerId || currentUser?.id || '1'}
        users={users}
        currentUser={currentUser}
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

      if (text.includes("bom dia") || text.includes("boa tarde") || text.includes("ol√°") || text.includes("ola")) {
        reply = "Ol√°! Como vai? Tudo bem por a√≠?";
      } else if (text.includes("confirma") || text.includes("sim") || text.includes("certo") || text.includes("ok")) {
        reply = "Sim, est√° tudo confirmado! J√° guardei na minha agenda.";
      } else if (text.includes("dor") || text.includes("doendo") || text.includes("sensivel") || text.includes("sinto")) {
        reply = "Estou sentindo um pouco de sensibilidade sim, doutor(a). Obrigado por perguntar.";
      } else if (text.includes("atraso") || text.includes("atrasado") || text.includes("atrasar")) {
        reply = "Sem problemas, eu compreendo! Nos vemos em instantes.";
      } else if (text.includes("documento") || text.includes("carteira") || text.includes("rg") || text.includes("convenio")) {
        reply = "Certo, vou levar sim! Obrigado pelo lembrete.";
      } else {
        const responses = [
          "Combinado! Nos vemos no hor√°rio marcado. üëç",
          "Muito obrigado(a) pela mensagem e pelo lembrete!",
          "Tudo bem, anotado por aqui! At√© breve.",
          "Obrigado pelo aviso da cl√≠nica. Tenha um √≥timo dia!"
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
            timestamp: 'Enviado √†s 08:30',
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
            text: `Excelente! Resposta autom√°tica recebida e computada com sucesso. Qualquer d√∫vida estamos √† disposi√ß√£o! üéâ`,
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
          timestamp: 'Enviado √†s 08:30 (Autom√°tico)',
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
      "Ol√°, {paciente}! Aqui √© da cl√≠nica {clinica}. Confirmamos sua consulta de {procedimento} amanh√£ ({data}) √†s {horario} com Dr(a). {dentista}. Responda SIM p/ confirmar ou N√ÉO p/ cancelar.",
    retorno: localStorage.getItem('odonto_tpl_retorno') || 
      "Ol√°, {paciente}! J√° se passaram 6 meses desde o seu tratamento de {procedimento} na {clinica}. Recomendamos agendar um retorno preventivo para manter seu sorriso saud√°vel! Vamos agendar?",
    aniversario: localStorage.getItem('odonto_tpl_aniversario') || 
      "Ol√°, {paciente}! üéâ N√≥s da cl√≠nica {clinica} desejamos um feliz anivers√°rio com muita sa√∫de e motivos para sorrir! Parab√©ns!",
    cobranca: localStorage.getItem('odonto_tpl_cobranca') || 
      "Ol√°, {paciente}! Identificamos que h√° um or√ßamento pendente ou parcela em aberto para o procedimento {procedimento}. Entre em contato para facilitarmos as condi√ß√µes p/ voc√™."
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
    return data.filter(record => record.status !== 'Realizado' && record.status !== 'Conclu√≠do')
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
      .replace(/{dentista}/g, record.dentista || 'Dr. M√©dico')
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
    const confirmed = activeData.filter(r => (r as any).confirmationStatus === 'Confirmado' || r.status === 'Realizado' || r.status === 'Conclu√≠do').length;
    const pending = activeData.filter(r => (!(r as any).confirmationStatus || (r as any).confirmationStatus === 'Pendente') && r.status !== 'Cancelado' && r.status !== 'Realizado' && r.status !== 'Conclu√≠do').length;
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
          timestamp: 'Enviado √†s 08:30 (Autom√°tico)',
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
      patientText = "Sim, est√° √≥timo! Confirmado para amanh√£. Obrigado pelo lembrete!";
      finalConfirmationStatus = "Confirmado";
      aiReplyText = "Excelente! Sua consulta est√° confirmada nos nossos sistemas. Tenha um √≥timo dia e at√© amanh√£! üëçüòä";
    } else if (type === 'REAGENDAR') {
      patientText = "Ol√°, infelizmente n√£o vou conseguir ir nesse hor√°rio. Conseguimos remarcar para sexta-feira de tarde?";
      finalConfirmationStatus = "Reagendar";
      aiReplyText = "Entendido! O nosso assistente inteligente entrar√° em contato ou voc√™ pode ligar diretamente na cl√≠nica para escolhermos o melhor hor√°rio. Muito obrigado!";
    } else if (type === 'NAO') {
      patientText = "Infelizmente n√£o poderei comparecer. Favor cancelar ou remarcar para o m√™s que vem.";
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
            timestamp: 'Enviado √†s 08:30',
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
        console.error("Erro ao registrar confirma√ß√£o simulada em Firestore:", err);
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
        alert("Acesso negado: Este paciente n√£o est√° vinculado ao seu perfil.");
        return;
      }
    }

    const phone = patient.phone || patient.telefone || patient.celular || patient.mobile || patient.contato || '';
    if (!phone) {
      alert(`O paciente "${patient.name}" n√£o tem um telefone cadastrado.\n\nPor favor, adicione seu celular.`);
      return;
    }
    const timeStr = record.horario ? ` √†s ${record.horario}` : '';
    const dateFormatted = record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), "dd/MM") : "N/D";
    const message = `Ol√° ${record.paciente}, confirmamos sua consulta de ${record.procedimento} para o dia ${dateFormatted}${timeStr} com ${record.dentista}. Podemos confirmar?`;
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
            <span className="text-[10px] text-slate-400 block">Confirma√ß√£o pendente</span>
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
            <span>Central de Confirma√ß√µes</span>
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
            <span>Configura√ß√µes & Canais</span>
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
              <h3 className="text-sm font-bold text-slate-800">Pr√≥ximos Lembretes Automatizados</h3>
              <p className="text-[10px] text-slate-400">Selecione um paciente para simular a resposta dele via WhatsApp no smartphone ao lado.</p>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  N√£o h√° novos agendamentos ativos na lista de confirma√ß√µes autom√°ticas.
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
                          <span className="text-slate-300">‚Ä¢</span>
                          <span>{record.data ? format(parseISO(record.data), "dd/MM/yyyy") : 'N/D'} √†s {record.horario || 'N/D'}</span>
                          <span className="text-slate-300">‚Ä¢</span>
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
                      üîí Esta conversa ocorre atrav√©s do seu provedor homologado
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
                        <span className="animate-bounce">‚óè</span>
                        <span className="animate-bounce delay-75">‚óè</span>
                        <span className="animate-bounce delay-150">‚óè</span>
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
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wide text-left">Simular A√ß√£o do Paciente</span>
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
                      <span>Responder N√ÉO</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-[400px]">
                <Smartphone className="w-12 h-12 text-slate-200 mb-3" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Nenhum Paciente Selecionado</span>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Selecione um paciente na lista ao lado para abrir o simulador de mensagens instant√¢neas.</p>
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
              <h3 className="text-sm font-bold text-slate-800">Gerenciador de Modelos Acad√™micos</h3>
              <p className="text-[10px] text-slate-400">Personalize os textos padr√µes das mensagens. Use as tags na caixa para puxar dados inteligentes.</p>
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
                Confirma√ß√£o de Consulta
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
                Parab√©ns de Anivers√°rio
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
                Cobran√ßa de Or√ßamento
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
                    { tag: '{horario}', label: 'Hor√°rio do Lembrete' },
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
                <span>Salvar Altera√ß√µes</span>
              </button>
            </div>
          </div>

          {/* Side preview card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Smartphone className="w-4.5 h-4.5 text-brand-cyan" />
                <span className="text-xs font-bold text-slate-800">Visualiza√ß√£o de Amostra</span>
              </div>
              <div className="bg-[#e5ddd5] p-3 rounded-2xl min-h-[150px] flex flex-col justify-center border border-slate-200">
                <div className="self-end max-w-[90%] bg-[#dcf8c6] rounded-xl px-2.5 py-1.5 text-[10px] leading-snug shadow-sm">
                  <p className="whitespace-pre-wrap">
                    {formatTemplate(templateText, selectedRecord || (filteredAppointments[0] || null))}
                  </p>
                  <span className="text-[8px] text-slate-400 block text-right mt-1 select-none">Agora</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400">Assim √© como o cliente receber√° a mensagem pelo canal automatizado selecionado (WhatsApp/SMS).</p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'configs' && (
        <div className="max-w-2xl bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6 text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Canais de Confirma√ß√£o & Assist√™ncia Inteligente</h3>
            <p className="text-[10px] text-slate-400">Habilite, configure e audite disparos automatizados de confirma√ß√£o odontol√≥gica.</p>
          </div>

          <div className="space-y-4">
            {/* Setting Item 1 */}
            <div className="flex items-start justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/40 transition-all gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">Automa√ß√£o de WhatsApp Co-Pilot</span>
                </div>
                <p className="text-[10px] text-slate-400">Dispara lembretes de consultas 24 horas antes do hor√°rio marcado coletando dados inteligentes dos agendamentos.</p>
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
                  <span className="text-xs font-bold text-slate-700">Assistente IA de Confirma√ß√£o</span>
                </div>
                <p className="text-[10px] text-slate-400">Permite que a intelig√™ncia artificial interprete respostas complexas ("n√£o poderei ir", "posso sim", "quero mudar de dia") e atualize faturamentos e calend√°rios sem necessidade de interven√ß√£o humana.</p>
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
                  <span className="text-xs font-bold text-slate-700">Automa√ß√£o de Backup via SMS Torpedo</span>
                </div>
                <p className="text-[10px] text-slate-400">Ativa o envio de SMS tradicional autom√°tico se o cliente n√£o responder ao WhatsApp em at√© 4 horas.</p>
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
                  <span className="text-xs font-bold text-slate-700">Notifica√ß√µes e Lembretes de E-mail</span>
                </div>
                <p className="text-[10px] text-slate-400">Envia lembretes por e-mail com bot√µes inteligentes p/ confirma√ß√£o instant√¢nea direto do provedor configurado.</p>
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
                  Conex√£o com Provedor de Mensagens (MB.SISTEMAS)
                </h4>
                <p className="text-[10px] text-slate-400 mt-1">Configure o seu n√∫mero de contato oficial e nome da sua marca de tecnologia. Essas informa√ß√µes ser√£o mostradas na tela de recebimento do seu cliente final no simulador.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Seu N√∫mero de WhatsApp Provedor</label>
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
                <span className="text-[14px]">üì±</span>
                <p className="text-[9.5px] text-emerald-800 leading-relaxed font-medium">
                  <strong>Simula√ß√£o com Provedor Ativa:</strong> Toda mensagem enviada por esta central de disparo exibir√° como remetente oficial a marca <strong className="text-emerald-900">{configs.providerName || 'MB.SISTEMAS'}</strong> de n√∫mero <strong className="text-emerald-950">{configs.providerPhone || '+55 (47) 99999-9999'}</strong>, oferecendo total credibilidade visual e profissionalismo para demonstra√ß√µes de venda reais!
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
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-600" />
            <span>Dashboard de Recall (Retorno Preventivo)</span>
          </h2>
          <span className="text-xs text-slate-300 font-semibold">‚Ä¢</span>
          <span className="text-xs text-slate-500 font-medium">
            {recallList.length} oportunidades de retorno (&gt;6 meses)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200">
            {recallList.length} Pacientes
          </span>
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
                √öltima consulta: {p.lastDate && isValid(parseISO(p.lastDate)) ? format(parseISO(p.lastDate), 'dd/MM/yyyy') : 'N/D'}
              </p>
              {rawPhone && (
                <p className="text-[10px] text-slate-500 font-mono mb-4 flex items-center gap-1">
                  üìû {rawPhone}
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
                    alert(`O paciente "${p.name}" n√£o possui um n√∫mero de telefone registrado no cadastro geral.`);
                    return;
                  }
                  const msg = encodeURIComponent(`Ol√° ${p.name}, aqui √© da ${clinicName}! Notamos que faz ${p.monthsAway} meses desde sua √∫ltima limpeza. Vamos agendar seu retorno?`);
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
      alert('Preencha o paciente e o conte√∫do do documento.');
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
            Receitu√°rio
          </button>
          <button 
            onClick={() => { setDocType('Atestado'); setIsGenerated(false); }}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
              docType === 'Atestado' ? "bg-white text-brand-cyan shadow-sm" : "text-slate-400"
            )}
          >
            Atestado M√©dico
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
              {docType === 'Receita' ? 'Medica√ß√£o / Posologia' : 'Finalidade / Per√≠odo'}
            </label>
            <textarea 
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsGenerated(false); }}
              placeholder={docType === 'Receita' ? "Ex: Amoxicilina 500mg - 1 comprimido a cada 8 horas por 7 dias." : "Ex: O paciente necessita de 2 dias de repouso por conta de procedimento cir√∫rgico."}
              className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-cyan/20 resize-none"
            />
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-brand-cyan transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
        >
          <FileCheck className="w-4 h-4" />
          Gerar Pr√©via do Documento
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
              {docType === 'Receita' ? 'Receitu√°rio Odontol√≥gico' : 'Atestado de Comparecimento'}
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
              {content || "O conte√∫do do documento aparecer√° aqui..."}
            </div>

            <div className="text-right text-[10px] text-slate-400 not-italic font-sans py-10 uppercase tracking-widest">
              S√£o Paulo, {format(new Date(), 'dd \de MMMM \de yyyy', { locale: ptBR })}
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-auto pt-10 flex flex-col items-center">
            <div className="w-48 border-b border-slate-400 mb-2" />
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{currentUser?.name || "Dra. Helena Vieira"}</p>
            <p className="text-[8px] text-slate-400 uppercase">Cirurgi√£ Dentista</p>
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
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aguardando gera√ß√£o do documento</p>
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
  onNavigate,
  clinicName = 'DentalSoft'
}: { 
  filteredData: DentalRecord[];
  upcomingAppointments?: DentalRecord[];
  onSendWhatsApp: (record: DentalRecord) => void;
  onSendReminder: (record: DentalRecord) => void;
  canSeeFinancials?: boolean;
  users?: any[];
  onNavigate?: (page: string, subPage?: string | null) => void;
  clinicName?: string;
}) {
  return (
    <CustomDashboardView 
      filteredData={filteredData}
      upcomingAppointments={upcomingAppointments}
      onSendWhatsApp={onSendWhatsApp}
      onSendReminder={onSendReminder}
      canSeeFinancials={canSeeFinancials}
      users={users}
      onNavigate={onNavigate}
      clinicName={clinicName}
    />
  );
}

function OldDashboardView_Unused({ 
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
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Conclu√≠do');
    
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
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Conclu√≠do');
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
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Conclu√≠do');
    realizedRecords.forEach(r => {
      const dentista = r.dentista || 'N√£o definido';
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
      return 'Amanh√£';
    }
    return format(parsed, 'dd/MM');
  };

  // Chart Data: Procedure Distribution
  const procedureDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Conclu√≠do');
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
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Atalhos R√°pidos de Opera√ß√£o</h2>
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
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-violet-600 uppercase tracking-wider">Prontu√°rios e Fichas</span>
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
              <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-pink-600 uppercase tracking-wider">SMS / Notifica√ß√µes</span>
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
                  <p className="text-[8px] text-emerald-500 uppercase font-black tracking-wider mt-1">Conclu√≠dos e Realizados</p>
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
                <span>Ticket M√©dio: <strong className="text-slate-800">{formatCurrency(metrics.ticketMedio)}</strong></span>
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
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">M√©dicos em Atendimento</h3>
                  <p className="text-[8px] text-slate-500 uppercase font-black tracking-wider mt-1">Recursos Humanos Cl√≠nicos</p>
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
                <span>Base cadastrada e dispon√≠vel</span>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Taxa Convers√£o</h3>
              <p className="text-[8px] text-rose-500 uppercase font-black tracking-wider mt-1">Conclu√≠dos vs Total</p>
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
            <span>A√ß√£o: enviar lembretes</span>
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
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atendimento Cl√≠nico R√°pido (Tempo Real)</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Disponibilidade dos cirurgi√µes dentistas neste momento</p>
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
            <p className="text-xs font-black uppercase tracking-widest">Nenhum profissional listado nos cadastros de usu√°rios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const isBusy = doctor.availability === 'em_atendimento';
              const specialty = doctor.name.match(/ana/i) ? 'Ortodontia Avan√ßada' : 'Cirurgia Geral & Implantes';
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
                      {isBusy ? "Consult√≥rio Ocupado" : "Livre para Triagem"}
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
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Registros Cl√≠nicos & Financeiros Recentes</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10.5px] font-black bg-brand-cyan/10 text-brand-cyan px-2.5 py-1 rounded-xl uppercase tracking-wider font-mono">
                {filteredData.length} Lan√ßamentos
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <ClipboardList className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum lan√ßamento no hist√≥rico.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-[9.5px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Paciente faturado</th>
                    <th className="px-6 py-4 text-center">Fisiologia / Dentista</th>
                    <th className="px-6 py-4">Especialidade / Servi√ßo</th>
                    {canSeeFinancials && <th className="px-6 py-4 text-right">Honor√°rio</th>}
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">A√ß√µes R√°pidas</th>
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
                          {record.dentista || 'Cl√≠nico'}
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
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estendendo controles com base nas pol√≠ticas ERP.</span>
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
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pr√≥ximas Consultas</h2>
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
                                <span className="text-slate-250 font-bold">‚Ä¢</span>
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma visita de urg√™ncia ou eletiva.</p>
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
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-4 leading-normal">Distribui√ß√£o das evolu√ß√µes conclu√≠das</p>
                
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
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Evolu√ß√£o Mensal</h2>
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
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-6">Comparativo de produ√ß√£o em R$</p>
                
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
                          formatter={(val: number) => [formatCurrency(val), 'Produ√ß√£o']} 
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
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultados e A√ß√µes</h2>
          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Gest√£o unificada de fichas de pacientes</p>
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
          { label: 'Total cadastrados', value: stats.total, icon: Users, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5', trend: '+12% este m√™s' },
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
                    <th className="px-5 py-4">√öltima Visita</th>
                    <th className="px-5 py-4 text-center">Atendimentos</th>
                    {canSeeFinancials && <th className="px-5 py-4 text-right">Total</th>}
                    <th className="px-6 py-4 text-right">A√ß√µes</th>
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
                              Prontu√°rio
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
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">√öltima</p>
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
                        Prontu√°rio
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
          P√°g. <span className="text-brand-cyan">{currentPage}</span> / {totalPages || 1}
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

  // Atuais: agendamentos de hoje (inclusive realizados) ou de datas passadas que ainda est√£o pendentes
  const currentApts = useMemo(() => {
    return data
      .filter(r => {
        if (r.data === todayStr) {
          return r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento' || r.status === 'Realizado' || r.status === 'Conclu√≠do';
        }
        return r.data < todayStr && (r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento');
      })
      .sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return (a.horario || '00:00').localeCompare(b.horario || '00:00');
      });
  }, [data, todayStr]);

  // Pr√≥ximos agendamentos: agendamentos futuros
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
      (apt.status === 'Realizado' || apt.status === 'Conclu√≠do') ? "bg-emerald-50/20 border-emerald-100 opacity-80" : "bg-slate-50/50 border-slate-100"
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
          (apt.status === 'Realizado' || apt.status === 'Conclu√≠do') 
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
          {(apt.status !== 'Realizado' && apt.status !== 'Conclu√≠do') && (
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
          ) : (apt.status === 'Realizado' || apt.status === 'Conclu√≠do') ? (
            <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Atendimento Conclu√≠do
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
      {(apt.status !== 'Realizado' && apt.status !== 'Conclu√≠do') && (
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
            <p className="text-[10px] text-slate-400 font-medium">Controle e acompanhamento de consultas di√°rias e futuras</p>
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
        {/* SE√á√ÉO 1: AGENDAMENTOS ATUAIS & HOJE */}
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
                Abaixo, nenhum agendamento hoje ou pend√™ncias.
              </div>
            ) : (
              currentApts.map(renderAppointmentCard)
            )}
          </div>
        </div>

        {/* SE√á√ÉO 2: PR√ìXIMOS AGENDAMENTOS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-brand-cyan" />
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Pr√≥ximos Agendamentos ({upcomingApts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingApts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Nenhum agendamento marcado para os pr√≥ximos dias.
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

function TeamView({ data, users, currentUser, onViewAgenda, onDeleteUser }: { data: DentalRecord[]; users: any[]; currentUser: any; onViewAgenda: (name: string) => void; onDeleteUser?: (id: string) => void }) {
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const team = useMemo(() => {
    // Only include users who are Dentists
    const doctors = users.filter(u => u.role === 'Dentista');
    
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
        specialty: user.specialty || 'Cirurgi√£o-Dentista',
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
                  <span className="text-slate-300">‚Ä¢</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    member.availability === 'em_atendimento' ? "text-brand-cyan" : "text-emerald-500"
                  )}>
                    {member.availability === 'em_atendimento' ? `Atendendo: ${member.currentPatient}` : 'M√©dico Liberado'}
                  </span>
                </div>
              </div>
              {canSeeFullStats && (
                <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline uppercase cursor-pointer">Desempenho</button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
              <div>
                <div className="text-[8px] text-slate-400 uppercase font-black">Produ√ß√£o</div>
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
                 <button className="flex-1 bg-slate-50 py-1.5 text-[9px] font-bold uppercase text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer min-w-[80px]">Comiss√µes</button>
                 {currentUser?.role === 'Admin' && onDeleteUser && (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (onDeleteUser) setUserToDelete(member);
                     }}
                     className="p-1.5 bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 transition-all rounded px-3"
                     title="Excluir M√©dico"
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
      "ATEN√á√ÉO: A restaura√ß√£o de backup ir√° mesclar os dados do arquivo com os dados atuais. Deseja prosseguir?"
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
          throw new Error("Arquivo de backup inv√°lido ou incompat√≠vel.");
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
            Backup de Seguran√ßa
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Exporte todos os dados da sua cl√≠nica para um arquivo seguro ou restaure dados de um backup anterior.
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
            Informa√ß√µes Importantes
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>Recomendamos realizar backups antes de grandes mudan√ßas.</li>
            <li>A restaura√ß√£o adiciona dados novos, mas n√£o remove os atuais.</li>
            <li>Backup inclui: Pacientes, Agenda, Financeiro e Documentos.</li>
          </ul>
        </div>

        <p className="text-[10px] text-slate-400 text-center italic">
          O arquivo √© processado localmente. Seus dados est√£o seguros.
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
        alert("A imagem deve ter no m√°ximo 500KB");
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
      alert('Configura√ß√µes salvas com sucesso!');
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert('Erro ao salvar as configura√ß√µes. Verifique suas permiss√µes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm("Deseja realmente restaurar os valores padr√£o locais?")) {
      setLocalClinicName(clinicName);
      setLocalFooterText(footerText);
      setLocalLogo(clinicLogo);
      setLocalProviderPhone(providerPhone);
      setLocalProviderName(providerName);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl max-w-5xl mx-auto shadow-sm overflow-hidden flex flex-col min-h-[580px]">
      {/* Header com indicador de altera√ß√µes salvas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 p-6 md:p-8 gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Configura√ß√µes do Sistema</h2>
            <span className="text-[9px] font-mono bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">v2.4.0-build</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Configure as prefer√™ncias da cl√≠nica, branding visual, integradores de mensagens e aplicativo.</p>
        </div>

        {hasUnsavedChanges && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Altera√ß√µes Pendentes
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar Abas de Configura√ß√£o */}
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
              <span>Cl√≠nica & Unidade</span>
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

        {/* Painel do Conte√∫do Ativo */}
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
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider">Prefer√™ncias da Cl√≠nica</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure o nome institucional e informa√ß√µes de rodap√© de relat√≥rios e documentos.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Nome da Cl√≠nica</label>
                      <input 
                        type="text" 
                        value={localClinicName} 
                        onChange={(e) => setLocalClinicName(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan transition-all text-slate-800 font-semibold shadow-inner" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Informa√ß√µes Institucionais / Rodap√©</label>
                      <textarea 
                        value={localFooterText}
                        onChange={(e) => setLocalFooterText(e.target.value)}
                        placeholder="Ex: Av. Paulista, 1000 - S√£o Paulo, SP | Tel: (11) 9999-9999 | CRO-SP 123456"
                        className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan min-h-[100px] resize-none text-slate-800 shadow-inner leading-relaxed"
                      />
                      <p className="text-[9px] text-slate-400 italic">Essas informa√ß√µes aparecer√£o no rodap√© da plataforma e em todos os documentos gerados pelo sistema.</p>
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Endere√ßo Principal</label>
                      <input 
                        type="text" 
                        defaultValue="Av. Paulista, 1000 - S√£o Paulo, SP" 
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/30 outline-none text-slate-500" 
                        readOnly
                      />
                      <p className="text-[9px] text-slate-400">Entre em contato com suporte se precisar alterar o endere√ßo cadastrado da matriz.</p>
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
                    <p className="text-[10px] text-slate-400 mt-1">Carregue a marca oficial e mude a assinatura corporativa que aparece nos cabe√ßalhos.</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-6 space-y-4">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block font-semibold">Logotipo da Cl√≠nica</label>
                      
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
                            Tamanho ideal sugerido: propor√ß√£o retangular de 300x80px. Limite m√°ximo: <strong className="text-slate-700 font-semibold font-bold">500KB</strong>.
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
                    <p className="text-[10px] text-slate-400 mt-1">Configure o n√∫mero emissor de notifica√ß√µes autom√°ticas de consultas e lembretes para os pacientes.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Meu N√∫mero de Zap Emissor</label>
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
                        <h4 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wide">Integra√ß√£o Ativa e Homologada</h4>
                        <p className="text-[10px] text-slate-600 font-medium leading-normal mt-1">
                          A confirma√ß√£o r√°pida via chatbot e API de lembretes em lote utilizar√° estas credenciais registradas para interagir com seus pacientes.
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
                    <h3 className="text-xs font-black uppercase text-brand-cyan tracking-wider">Prefer√™ncias Financeiras</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Configure moedas padr√£o, regras de auditorias e faturamento automatizado.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Moeda Padr√£o</label>
                      <select className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:border-brand-cyan transition-all font-semibold text-slate-700">
                        <option>Real Brasileiro - BRL (R$)</option>
                        <option>D√≥lar Americano - USD ($)</option>
                        <option>Euro - EUR (‚Ç¨)</option>
                      </select>
                    </div>

                    <div className="border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between gap-4 bg-slate-50/50">
                      <div className="space-y-0.5">
                        <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider block">Recibo Autom√°tico</label>
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
                      Ao instalar, o aplicativo funciona em seu pr√≥prio cont√™iner otimizado, criando atalhos na tela de in√≠cio, oferecendo suporte a notifica√ß√µes nativas e carregando em fra√ß√µes de segundos.
                    </p>
                    
                    <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl text-[10px] text-amber-850 flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <strong className="font-bold">Observa√ß√£o Importante:</strong><br />
                        Para instalar, voc√™ n√£o pode estar utilizando o visualizador em sandbox. Clique em "Abrir em nova aba" ou use o link p√∫blico compartilhado para habilitar o sinal de PWA no seu navegador Chrome/Edge.
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
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pendente de sinaliza√ß√£o do navegador (j√° instalado)</span>
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
              Restaurar Padr√µes Locais
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
                Salvar Prefer√™ncias
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
            Esta a√ß√£o n√£o pode ser desfeita e remover√° todos os hist√≥ricos associados.
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
                  <p className="text-sm font-medium text-slate-700 tracking-tight">{patient.phone || patient.telefone || 'N√£o informado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">√öltima Consulta</p>
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
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{patient.email || 'N√£o informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-5 text-brand-cyan bg-brand-cyan/5 p-5 rounded-3xl border border-brand-cyan/10">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 opacity-60">Pr√≥ximo Agendamento</p>
                  <p className={cn(
                    "text-sm font-bold",
                    patient.nextAppt && isValid(parseISO(patient.nextAppt)) ? "text-brand-cyan" : "text-slate-400"
                  )}>
                    {patient.nextAppt && isValid(parseISO(patient.nextAppt)) ? format(parseISO(patient.nextAppt), "dd/MM/yyyy '√†s' HH:mm") : 'Sem agendamentos'}
                  </p>
                  {patient.nextAppt && <p className="text-[9px] font-bold mt-1 opacity-50 uppercase tracking-tight">Sincronizado com Agenda Google</p>}
                </div>
              </div>

              <div className="flex items-start gap-5 pl-5">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Dentista Respons√°vel</p>
                  <p className="text-sm font-medium text-slate-700">{patient.dentist || 'N√£o vinculado'}</p>
                </div>
              </div>

              {canSeeSensitive && (
                <div className="flex items-start gap-5 pl-5">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-cyan shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Documento Identificador (CPF)</p>
                    <p className="text-sm font-medium text-slate-700 font-mono tracking-wider">{patient.cpf || 'N√£o informado'}</p>
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
                      alert("N√£o foi poss√≠vel excluir o paciente: ID ausente.");
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
    if (status === 'c√°rie') return 'fill-rose-500 stroke-rose-600';
    if (status === 'restaurado') return 'fill-brand-cyan stroke-cyan-600';
    if (status === 'extra√≠do') return 'fill-slate-200 stroke-slate-300 opacity-30';
    if (status === 'h√≠gido') return 'fill-emerald-500 stroke-emerald-600';
    return 'fill-white stroke-slate-300 hover:fill-slate-50';
  };

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
      <p className="text-[10px] font-bold uppercase tracking-widest">Carregando Hist√≥rico Dental...</p>
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
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Status Cl√≠nico: <span className="text-brand-cyan">Denti√ß√£o Permanente</span></p>
        </div>
        <div className="flex gap-2">
          {['C√°rie', 'Restaurado', 'Extra√≠do'].map(s => (
            <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl">
              <div className={cn(
                "w-3 h-3 rounded-full",
                s === 'C√°rie' ? 'bg-rose-500' : s === 'Restaurado' ? 'bg-brand-cyan' : 'bg-slate-200'
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
                  { id: 'c√°rie', label: 'Marcar C√°rie', color: 'bg-rose-500' },
                  { id: 'restaurado', label: 'Restaura√ß√£o', color: 'bg-brand-cyan' },
                  { id: 'extra√≠do', label: 'Extra√≠do/Ausente', color: 'bg-slate-400' },
                  { id: 'h√≠gido', label: 'Dente H√≠gido', color: 'bg-emerald-500' }
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
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Observa√ß√£o Cl√≠nica</p>
                <textarea 
                  value={teethData[selectedTooth]?.notes || ''}
                  onChange={(e) => updateToothNotes(selectedTooth, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-brand-cyan/50 resize-none h-20"
                  placeholder="Descreva observa√ß√µes espec√≠ficas para este dente..."
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center opacity-40">
              <Activity className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold">Selecione um dente no gr√°fico para ver detalhes e editar status.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-brand-cyan" />
              Hist√≥rico de Procedimentos por Dente
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
                        <p className="text-sm font-bold text-slate-700 capitalize">{data.status || 'H√≠gido'}</p>
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
                  <p className="text-xs text-slate-400 font-bold uppercase">Nenhuma altera√ß√£o registrada recentemente.</p>
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
    { name: 'Restaura√ß√£o em Resina', price: 350 },
    { name: 'Extra√ß√£o Simples', price: 400 },
    { name: 'Tratamento de Canal', price: 1200 },
    { name: 'Coroa em E-max', price: 2200 },
    { name: 'Implante Dent√°rio', price: 3500 },
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
      age: isValidBirthDate ? `${differenceInYears(new Date(), birthDate)} anos` : "Idade n√£o informada",
      birthdate: isValidBirthDate ? format(birthDate, 'dd/MM/yyyy') : "N/D",
      phone: patient.phone || patient.telefone || patient.celular || "N√£o informado",
      status: patient.status || "Ativo"
    };
  }, [patient, patientName]);

  const navItems = [
    { id: 'Resumo', icon: LayoutDashboard },
    { id: 'Odontograma', icon: ClipboardList },
    { id: 'Anamnese', icon: FileText, hidden: !canSeeClinical },
    { id: 'Evolu√ß√£o', icon: Edit, hidden: !canSeeClinical },
    { id: 'Documentos', icon: FileText },
    { id: 'Imagens', icon: ImageIcon },
    { id: 'Planos de Tratamento', icon: ClipboardList, hidden: !canSeeClinical },
    { id: 'Or√ßamentos', icon: CreditCard, hidden: !canSeeClinical },
    { id: 'Hist√≥rico', icon: History }
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
              Prontu√°rio Digital: <span className="text-brand-cyan font-semibold">{patientName}</span>
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
              <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-widest">Sess√£o Ativa</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
             <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Dentista Respons√°vel</p>
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
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Procedimentos Inclu√≠dos</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-sm font-bold text-slate-700">Restaura√ß√£o em Resina (Posterior)</span>
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
                       alert(`Enviando or√ßamento para: ${patientName}`);
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
                      <h3 className="text-xl font-bold text-slate-800 mb-1">Or√ßamento Gerado</h3>
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
                       <span className="text-sm font-bold">Desconto √† vista (10%)</span>
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
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Alerta Cr√≠tico</p>
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
                    <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-[0.2em] mb-1">Ficha Cl√≠nica Principal</span>
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
                  { label: 'Visitas ao Consult√≥rio', value: patientHistory.length, icon: History, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5', border: 'border-brand-cyan/10' },
                  { label: 'Score de Fidelidade', value: '8.9', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { label: 'Status Global', value: 'Saud√°vel', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' }
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
                    <button className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hover:text-brand-cyan transition-colors">Ver Hist√≥rico Completo</button>
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
                                <span>‚Ä¢</span>
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
                    
                    <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-[0.3em] mb-2 block">Gest√£o de Agenda</span>
                    <h4 className="text-2xl font-bold text-white tracking-tight mb-8">
                      {nextAppt ? "Pr√≥xima Visita" : "Aguardando Agendamento"}
                    </h4>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 backdrop-blur-sm">
                      {nextAppt ? (
                        <div className="space-y-4">
                           <div>
                             <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-1">Data e Hor√°rio</p>
                             <p className="text-lg font-bold text-white">
                                {nextAppt.data && isValid(parseISO(nextAppt.data)) 
                                  ? format(parseISO(nextAppt.data), "dd/MM/yyyy '√†s' HH:mm") 
                                  : 'Data n√£o informada'}
                              </p>
                           </div>
                           <div>
                             <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-1">Servi√ßo Programado</p>
                             <p className="text-sm font-bold text-white/80">{nextAppt.procedimento}</p>
                           </div>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-white/40 italic">O paciente ainda n√£o possui novas consultas programadas.</p>
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
                      <input readOnly value={anamnesis.chiefComplaint || 'N√£o informada'} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Hist√≥ria M√©dica</label>
                      <textarea readOnly value={anamnesis.medicalHistory || 'Sem hist√≥rico registrado'} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 outline-none h-32 resize-none leading-relaxed" />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Medica√ß√µes em uso</label>
                      <input readOnly value={anamnesis.medications || 'Nenhuma medica√ß√£o informada'} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none" />
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
                         <p className="text-xs font-black text-slate-700">{anamnesis.smoking || 'N√£o'}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl text-center">
                         <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Etilismo</p>
                         <p className="text-xs font-black text-slate-700">{anamnesis.alcohol || 'N√£o'}</p>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                  <p className="text-[10px] text-slate-400 font-medium italic">√öltima atualiza√ß√£o: 12/03/2024 por Dra. Amanda Costa</p>
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
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest mb-6">A√ß√µes R√°pidas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Novo Exame', icon: Activity, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5', onClick: () => onAddRecord(patientName) },
                      { label: 'Atestado', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50', onClick: () => onAddCertificate(patientName) },
                      { label: 'Receitu√°rio', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50', onClick: () => onAddPrescription(patientName) },
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
                  <p className="text-[11px] text-white/80 leading-relaxed mb-6">Acesso total a todos os m√≥dulos de an√°lise avan√ßada e intelig√™ncia cl√≠nica.</p>
                  <button className="w-full py-3 bg-white text-brand-cyan text-[10px] font-black uppercase rounded-xl shadow-lg">Ver Detalhes</button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'Evolu√ß√£o' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <History className="w-4 h-4 text-brand-cyan" />
                   Linha do Tempo de Evolu√ß√£o
                 </h3>
                 <button 
                   onClick={() => onAddRecord(patientName)}
                   className="px-4 py-2 bg-brand-cyan text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-brand-cyan/20"
                 >
                   Nova Evolu√ß√£o
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
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Respons√°vel</p>
                           <p className="text-xs font-bold text-slate-700">{evo.dentista}</p>
                         </div>
                       </div>
                       <p className="text-sm text-slate-500 leading-relaxed font-sans whitespace-pre-wrap">{evo.observacao || 'Nenhuma observa√ß√£o registrada.'}</p>
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
                      <p className="text-sm font-bold text-slate-400">Nenhum registro cl√≠nico hist√≥rico encontrado para este paciente.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'Documentos' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
               <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Documenta√ß√£o Digital</h3>
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
                             content: content.slice(0, 500) + "... [Simula√ß√£o de Upload]"
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
                       {doc.size || 'N/A'} ‚Ä¢ {doc.createdAt && isValid(new Date(doc.createdAt)) ? format(new Date(doc.createdAt), 'dd/MM/yyyy') : 'Sem data'}
                     </p>
                     <div className="mt-6 flex gap-2 w-full">
                       <button 
                         onClick={() => {
                           if (doc.content) {
                             alert(`Conte√∫do do documento (${doc.type}):\n\n${doc.content}`);
                           } else {
                             alert('Conte√∫do n√£o dispon√≠vel para visualiza√ß√£o.');
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
                    <p className="text-sm font-bold text-slate-400 mb-2">Sua galeria de documentos est√° vazia.</p>
                    <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Fa√ßa upload de contratos, termos ou exames</p>
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
                               if (confirm('Excluir pasta? (Documentos dentro dela n√£o ser√£o exclu√≠dos)')) {
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
                     <p className="text-sm font-bold text-slate-400 mb-2">Esta galeria est√° vazia.</p>
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
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Defina os procedimentos e valores do or√ßamento</p>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">T√≠tulo do Plano</label>
                            <input 
                              type="text"
                              value={newPlan.title}
                              onChange={(e) => setNewPlan({...newPlan, title: e.target.value})}
                              placeholder="Ex: Reabilita√ß√£o Superior"
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
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Valor Padr√£o: {formatCurrency(item.price)}</p>
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
                                if (!newPlan.title) return alert('D√™ um t√≠tulo ao plano');
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
                   { title: 'Reabilita√ß√£o Est√©tica Posterior', date: '12/03/2024', items: 3, status: 'Em Aprova√ß√£o', progress: 0, total: 4500 },
                   { title: 'Tratamento Endod√¥ntico e Restaura√ß√£o', date: '05/02/2024', items: 2, status: 'Em Execu√ß√£o', progress: 50, total: 2800 }
                 ].map((plano, i) => (
                   <div key={i} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 mb-1">{plano.title}</h4>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{plano.date}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">‚Ä¢</span>
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
                             plano.status === 'Em Execu√ß√£o' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
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
                          Gerar Or√ßamento
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'Or√ßamentos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Hist√≥rico Financeiro</h3>
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
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">N¬∫ Or√ßamento</th>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Data</th>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Valor</th>
                       <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Status</th>
                       <th className="px-8 py-5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">A√ß√µes</th>
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
                             onClick={() => alert(`Visualizando or√ßamento #${item.id}`)}
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

          {activeTab === 'Hist√≥rico' && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
               <div className="bg-white border border-slate-200 rounded-[32px] p-8">
                 <div className="flex items-center gap-6 mb-8 bg-slate-50/50 p-4 rounded-2xl">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtrar Per√≠odo</label>
                      <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none">
                        <option>Todos os Registros</option>
                        <option>√öltimos 12 Meses</option>
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
  const [procedimento, setProcedimento] = useState('Avalia√ß√£o Inicial');
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
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Edi√ß√£o Ativa</span>
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
                Nome Completo do Paciente <span className="text-rose-500 font-black ml-1">(Obrigat√≥rio)</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  disabled={isSaving}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(SecurityUtils.limit(SecurityUtils.sanitizeLettersOnly(e.target.value), 100))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all disabled:bg-slate-100 placeholder:text-slate-300" 
                  placeholder="Ex: Jo√£o da Silva Santos"
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
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 font-mono">Contato Prim√°rio (WhatsApp)</label>
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
                Endere√ßo de Correio Eletr√¥nico <span className="text-rose-500 font-black ml-1">(Obrigat√≥rio)</span>
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
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Primeira Sess√£o</h3>
            
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
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Honor√°rios Previstos</label>
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
                   "O preenchimento correto destes campos garante a integridade do prontu√°rio eletr√¥nico."
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row justify-end items-center gap-6">
          <p className="mr-auto text-[10px] text-slate-300 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed hidden sm:block">
            Os dados ser√£o criptografados antes do armazenamento seguro.
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
                  alert('O nome do paciente deve conter no m√≠nimo 3 caracteres.');
                  return;
                }

                if (!email) {
                  alert('O e-mail √© obrigat√≥rio para o cadastro do paciente.');
                  return;
                }

                if (!SecurityUtils.isValidEmail(email)) {
                  alert('Por favor, insira um e-mail v√°lido.');
                  return;
                }

                // Check for duplicates
                const duplicateName = patients.find(p => 
                  p.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
                  (isEdit ? p.id !== (patient?.id || patientId) : true)
                );
                
                if (duplicateName) {
                  alert(`J√° existe um paciente cadastrado com o nome "${trimmedName}". N√£o √© permitido duplicar o nome.`);
                  return;
                }

                const duplicateEmail = patients.find(p => 
                  p.email?.trim().toLowerCase() === email.trim().toLowerCase() && 
                  (isEdit ? p.id !== (patient?.id || patientId) : true)
                );

                if (duplicateEmail) {
                  alert(`O e-mail "${email}" j√° est√° cadastrado para outro paciente (${duplicateEmail.name}).`);
                  return;
                }

                if (cpf) {
                  const duplicateCpf = patients.find(p => 
                    p.cpf === cpf && 
                    (isEdit ? p.id !== (patient?.id || patientId) : true)
                  );
                  if (duplicateCpf) {
                    alert(`O CPF "${cpf}" j√° est√° cadastrado para o paciente ${duplicateCpf.name}.`);
                    return;
                  }
                }

                if (SecurityUtils.hasDangerousScript(trimmedName) || SecurityUtils.hasDangerousScript(email) || SecurityUtils.hasDangerousScript(phone) || SecurityUtils.hasDangerousScript(cpf)) {
                  alert('A√ß√£o bloqueada por motivos de seguran√ßa (XSS detectado).');
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
              {isSaving ? 'Processando...' : (isEdit ? 'Atualizar Prontu√°rio' : 'Finalizar Cadastro')}
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
  const [procedimento, setProcedimento] = useState('Avalia√ß√£o Inicial');
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
    const names = new Set(users.map(u => u && (u.role === 'Dentista' || u.role === 'Cirurgi√£o-Dentista' || (u.isDentist && u.role === 'Admin')) ? u.name : null).filter(Boolean));
    return Array.from(names).sort() as string[];
  }, [users]);

  const handleSave = async () => {
    if (!paciente || !dentista || !dataVal || !horario) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (!isClinicalRecord) {
      if (horario < OPENING_HOUR || horario > CLOSING_HOUR) {
        alert(`A cl√≠nica atende apenas entre ${OPENING_HOUR} e ${CLOSING_HOUR}.`);
        return;
      }
    }

    // Prevents scheduling for past date/time (with buffer for appointments, none for clinical records)
    const selectedDateTime = parseISO(`${dataVal}T${horario}`);
    const now = new Date();
    const bufferMinutes = 15; // 15 minute buffer for current appointments
    const limitDate = new Date(now.getTime() - bufferMinutes * 60000);

    if (!isClinicalRecord && selectedDateTime < limitDate) {
      alert('O hor√°rio selecionado j√° passou (limite de 15 min de atraso para novos agendamentos). Para registrar atendimentos passados, utilize a Evolu√ß√£o Cl√≠nica no Prontu√°rio.');
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
              {isClinicalRecord ? 'Fluxo Cl√≠nico' : 'Fluxo de Agendamentos'}
            </span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {isClinicalRecord ? 'Nova Evolu√ß√£o Cl√≠nica' : 'Novo Agendamento Inteligente'}
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
                {isClinicalRecord ? 'Salvando Evolu√ß√£o...' : 'Gravando Agendamento...'}
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
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 font-mono">Hor√°rio do Compromisso</label>
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
                          alert('Este hor√°rio j√° passou. Por favor, escolha um hor√°rio futuro.');
                          return;
                        }

                        if (newTime < OPENING_HOUR || newTime > CLOSING_HOUR) {
                          alert(`A cl√≠nica atende apenas entre ${OPENING_HOUR} e ${CLOSING_HOUR}.`);
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
                        alert('Este dentista j√° possui agendamento para este dia e hor√°rio.');
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
                  <p className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wide ml-1 mt-1">‚óè Hor√°rio do Dentista j√° Ocupado!</p>
                )}
                {!isClinicalRecord && (
                  <div className="space-y-0.5 ml-1 mt-1">
                    {dataVal < format(new Date(), 'yyyy-MM-dd') && (
                      <p className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wide">‚óè Data informada est√° no passado!</p>
                    )}
                    {dataVal === format(new Date(), 'yyyy-MM-dd') && horario && horario < format(new Date(), 'HH:mm') && (
                      <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wide">‚óè Hor√°rio j√° expirado hoje!</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dentist Selector */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Dentista Respons√°vel</label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350 pointer-events-none" />
                <select 
                  disabled={isSaving}
                  value={dentista}
                  onChange={(e) => setDentista(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all cursor-pointer disabled:bg-slate-100 placeholder:text-slate-300"
                >
                  <option value="">Selecione o cirurgi√£o-dentista...</option>
                  {dentistList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right Area - Procedimento & Visual Price Summary */}
          <div className="lg:col-span-4 bg-slate-50/60 p-8 rounded-[32px] border border-slate-100 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Servi√ßo e Honor√°rios</h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-450 tracking-widest ml-1">Procedimento Cl√≠nico</label>
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
                  <label className="text-[10px] uppercase font-black text-slate-455 tracking-widest ml-1">Valor Unit√°rio Cobrado</label>
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
              <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-wider block">Resumo do Lan√ßamento</span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                {paciente ? `@${paciente}` : "Nenhum paciente selecionado"} {horario ? `√†s ${horario}` : ""} {dataVal ? `no dia ${format(parseISO(dataVal), 'dd/MM/yyyy')}` : ""}.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Rows */}
        <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-6">
          <p className="mr-auto text-[10px] text-slate-300 font-bold uppercase tracking-widest max-w-[220px] leading-relaxed hidden sm:block">
            Conclua para registrar no di√°rio de consultas.
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
              {isSaving ? 'Salvando...' : (isClinicalRecord ? 'Gravar Evolu√ß√£o' : 'Confirmar Agendamento')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificateFormView({ onBack, onSave, patientName, users }: { onBack: () => void; onSave: (d: any) => Promise<boolean>; patientName: string; users: any[] }) {
  const [content, setContent] = useState(`Atesto para os devidos fins que o(a) Sr(a). ${patientName} esteve sob meus cuidados odontol√≥gicos nesta data, devendo permanecer em repouso por ___ dias.`);
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
              {users.map(u => u.role === 'Dentista' && <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Conte√∫do do Atestado</label>
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
  const [content, setContent] = useState('1. Amoxicilina 500mg ------ 1 caixa \nTomar 1 c√°psula de 8 em 8 horas por 7 dias. \n\n2. Paracetamol 750mg ------ 1 caixa \nTomar 1 comprimido em caso de dor (m√°x 4x/dia).');
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
        <h2 className="text-xl font-bold text-slate-800">Novo Receitu√°rio</h2>
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
              {users.map(u => u.role === 'Dentista' && <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Prescri√ß√£o</label>
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

function AnamnesisFormView({ patientId, patients, onSave, onBack, currentUser }: { patientId: string; patients: any[]; onSave: (id: string, data: any) => Promise<boolean>; onBack: () => void; currentUser?: any }) {
  const patient = patients.find(p => p.id === patientId || p.name === patientId);
  const anamnesis = patient?.anamnesis || {};

  const clinicOwnerId = currentUser?.parentTrialId || 
    currentUser?.clinicId || 
    (currentUser?.isTrial ? currentUser.id : (currentUser?.role === 'Admin' ? currentUser.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : currentUser?.id || '1')));

  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(() => {
    return anamnesis.customFields || {};
  });

  useEffect(() => {
    if (!db || !clinicOwnerId) return;
    const settingsRef = doc(db, 'settings', `clinic-${clinicOwnerId}`);
    const unsub = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.anamnesisCustomFields)) {
          setCustomFields(data.anamnesisCustomFields);
        }
      }
    }, (err) => {
      console.error("Erro ao carregar campos personalizados na edi√ß√£o:", err);
    });
    return () => unsub();
  }, [clinicOwnerId]);

  const [chiefComplaint, setChiefComplaint] = useState(anamnesis.chiefComplaint || '');
  const [medicalHistory, setMedicalHistory] = useState(anamnesis.medicalHistory || '');
  const [medications, setMedications] = useState(anamnesis.medications || anamnesis.medicationDetails || '');
  const [allergies, setAllergies] = useState(anamnesis.allergies || anamnesis.allergyDetails || '');
  const [hasAllergy, setHasAllergy] = useState(!!anamnesis.hasAllergy);
  const [hasHeartProblem, setHasHeartProblem] = useState(!!anamnesis.hasHeartProblem);
  const [hasHypertension, setHasHypertension] = useState(!!anamnesis.hasHypertension);
  const [hasDiabetes, setHasDiabetes] = useState(!!anamnesis.hasDiabetes);
  const [takesMedication, setTakesMedication] = useState(!!anamnesis.takesMedication);
  const [hasBleedingHistory, setHasBleedingHistory] = useState(!!anamnesis.hasBleedingHistory);
  const [isPregnant, setIsPregnant] = useState(!!anamnesis.isPregnant);
  const [hasAnesthesiaReaction, setHasAnesthesiaReaction] = useState(!!anamnesis.hasAnesthesiaReaction);
  const [generalNotes, setGeneralNotes] = useState(anamnesis.generalNotes || '');
  const [smoking, setSmoking] = useState(anamnesis.smoking || (anamnesis.isSmoker ? 'Sim' : 'N√£o'));
  const [alcohol, setAlcohol] = useState(anamnesis.alcohol || 'N√£o');
  const [isSaving, setIsSaving] = useState(false);

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  const handleSave = async () => {
    if (SecurityUtils.hasDangerousScript(chiefComplaint) || SecurityUtils.hasDangerousScript(medicalHistory) || SecurityUtils.hasDangerousScript(medications) || SecurityUtils.hasDangerousScript(allergies) || SecurityUtils.hasDangerousScript(generalNotes)) {
      alert('A√ß√£o bloqueada por motivos de seguran√ßa (XSS detectado).');
      return;
    }

    setIsSaving(true);
    const success = await onSave(patientId, {
      ...anamnesis,
      chiefComplaint: SecurityUtils.limit(SecurityUtils.sanitize(chiefComplaint), 1000),
      medicalHistory: SecurityUtils.limit(SecurityUtils.sanitize(medicalHistory), 3000),
      medications: SecurityUtils.limit(SecurityUtils.sanitize(medications), 1000),
      medicationDetails: SecurityUtils.limit(SecurityUtils.sanitize(medications), 1000),
      allergies: SecurityUtils.limit(SecurityUtils.sanitize(allergies), 1000),
      allergyDetails: SecurityUtils.limit(SecurityUtils.sanitize(allergies), 1000),
      hasAllergy: hasAllergy || !!allergies.trim(),
      hasHeartProblem,
      hasHypertension,
      hasDiabetes,
      takesMedication: takesMedication || !!medications.trim(),
      isSmoker: smoking === 'Sim' || smoking === 'Ex-fumante',
      hasBleedingHistory,
      isPregnant,
      hasAnesthesiaReaction,
      generalNotes: SecurityUtils.limit(SecurityUtils.sanitize(generalNotes), 3000),
      smoking,
      alcohol,
      customFields: customFieldValues,
      updatedAt: new Date().toISOString()
    });
    if (success) onBack();
    setIsSaving(false);
  };

  const activeCustomFields = customFields.filter(f => f.active);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} disabled={isSaving} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors disabled:opacity-50"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Editar Anamnese & Question√°rio de Sa√∫de</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{patient?.name}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Standard Questions */}
        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">1. Perguntas Padr√£o de Sa√∫de</h3>
            <span className="text-[10px] text-slate-400 font-bold">Padr√£o Odontol√≥gico</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Doen√ßas Card√≠acas?', state: hasHeartProblem, setter: setHasHeartProblem },
              { label: 'Hipertens√£o Arterial?', state: hasHypertension, setter: setHasHypertension },
              { label: 'Diabetes?', state: hasDiabetes, setter: setHasDiabetes },
              { label: 'Sangramento Excessivo?', state: hasBleedingHistory, setter: setHasBleedingHistory },
              { label: 'Gestante / Lactante?', state: isPregnant, setter: setIsPregnant },
              { label: 'Rea√ß√£o a Anest√©sicos?', state: hasAnesthesiaReaction, setter: setHasAnesthesiaReaction },
            ].map((item, idx) => (
              <div key={idx} className={cn("p-3 rounded-2xl border flex items-center justify-between gap-2", item.state ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200/80")}>
                <span className="text-xs font-bold text-slate-800">{item.label}</span>
                <button
                  type="button"
                  onClick={() => item.setter(!item.state)}
                  className={cn("px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer", item.state ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-700")}
                >
                  {item.state ? 'SIM' : 'N√ÉO'}
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Medica√ß√µes em uso cont√≠nuo</label>
              <textarea 
                value={medications} 
                onChange={(e) => {
                  setMedications(e.target.value);
                  setTakesMedication(!!e.target.value.trim());
                }} 
                placeholder="Informe medicamentos, dosagens e hor√°rios..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 outline-none h-20 resize-none focus:border-brand-cyan" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Alergias conhecidas</label>
              <textarea 
                value={allergies} 
                onChange={(e) => {
                  setAllergies(e.target.value);
                  setHasAllergy(!!e.target.value.trim());
                }} 
                placeholder="Medicamentos, l√°tex, alimentos, etc..."
                className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 outline-none h-20 resize-none focus:border-rose-400" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[8px] uppercase font-bold text-slate-400 tracking-widest ml-1">Tabagismo</label>
               <select value={smoking} onChange={(e) => setSmoking(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
                 <option value="N√£o">N√£o</option>
                 <option value="Sim">Sim</option>
                 <option value="Ex-fumante">Ex-fumante</option>
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[8px] uppercase font-bold text-slate-400 tracking-widest ml-1">Etilismo</label>
               <select value={alcohol} onChange={(e) => setAlcohol(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
                 <option value="N√£o">N√£o</option>
                 <option value="Social">Social</option>
                 <option value="Frequente">Frequente</option>
               </select>
             </div>
          </div>
        </div>

        {/* Dynamic Clinic Custom Fields */}
        {activeCustomFields.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">2. Perguntas Personalizadas da Cl√≠nica</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-50 text-brand-cyan border border-brand-cyan/20">
                  {activeCustomFields.length} campos din√¢micos
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCustomFields.map((field) => {
                const val = customFieldValues[field.id];
                const isAlert = field.isAlertIfTrue && (val === true || val === 'Sim' || (field.alertTriggerValue && val === field.alertTriggerValue));

                return (
                  <div key={field.id} className={cn("p-4 rounded-2xl border transition-all space-y-2 bg-slate-50/50", isAlert ? "border-rose-300 bg-rose-50/40" : "border-slate-200")}>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800">
                        {field.label}
                        {field.required && <span className="text-rose-500 ml-1">*</span>}
                      </label>
                      {field.category && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{field.category}</span>
                      )}
                    </div>

                    {field.helperText && <p className="text-[10px] text-slate-400">{field.helperText}</p>}

                    {field.type === 'boolean' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCustomFieldChange(field.id, true)}
                          className={cn("flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer", val === true ? (field.isAlertIfTrue ? "bg-rose-600 text-white" : "bg-brand-cyan text-slate-950 font-black") : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
                        >
                          SIM
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCustomFieldChange(field.id, false)}
                          className={cn("flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer", val === false ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
                        >
                          N√ÉO
                        </button>
                      </div>
                    )}

                    {field.type === 'select' && (
                      <select
                        value={val || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                      >
                        <option value="">Selecione uma op√ß√£o...</option>
                        {(field.options || []).map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={val || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || 'Digite a resposta...'}
                        className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={val ?? ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || 'Informe o n√∫mero...'}
                        className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        value={val || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || 'Observa√ß√µes e detalhes cl√≠nicos...'}
                        className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800 h-20 resize-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Complaints and Medical History */}
        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">3. Queixa Principal & Hist√≥rico Geral</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Queixa Principal</label>
              <textarea 
                value={chiefComplaint} 
                onChange={(e) => setChiefComplaint(e.target.value)} 
                placeholder="Descreva a queixa principal do paciente..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-cyan transition-all h-28 resize-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest ml-1">Hist√≥ria M√©dica & Cir√∫rgica Geral</label>
              <textarea 
                value={medicalHistory} 
                onChange={(e) => setMedicalHistory(e.target.value)} 
                placeholder="Doen√ßas cr√¥nicas, cirurgias, hospitaliza√ß√µes..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-cyan transition-all h-28 resize-none" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pb-12">
        <button onClick={onBack} className="px-8 py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-all cursor-pointer">Descartar</button>
        <button onClick={handleSave} disabled={isSaving} className="px-10 py-3 bg-brand-cyan text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-brand-cyan/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50">
          {isSaving ? 'Salvando...' : 'Salvar Altera√ß√µes no Prontu√°rio'}
        </button>
      </div>
    </div>
  );
}

function ClinicalEvolutionFormView({ onBack, onSave, patientName, users }: { onBack: () => void; onSave: (d: any) => Promise<boolean>; patientName: string; users: any[] }) {
  const [evolution, setEvolution] = useState('');
  const [dentist, setDentist] = useState('');
  const [procedure, setProcedure] = useState('Evolu√ß√£o Cl√≠nica');
  const [value, setValue] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!evolution || !dentist) {
      alert('Por favor, preencha a evolu√ß√£o e selecione o dentista.');
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
            <span className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em] mb-1 block leading-none">Registro Cl√≠nico Eletr√¥nico</span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Nova Evolu√ß√£o de Paciente</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{patientName}</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-4 px-6 py-3 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 border border-white/5">
           <Activity className="w-4 h-4 text-brand-cyan animate-pulse" />
           <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Sess√£o de Escrita Ativa</span>
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
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">Sincronizando com Prontu√°rio...</span>
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
                  <option value="">Selecione o profissional respons√°vel</option>
                  {users.map(u => u.role === 'Dentista' && <option key={u.id} value={u.name}>{u.name}</option>)}
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
                  placeholder="Ex: Restaura√ß√£o Resinosa, Endodontia, etc."
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Evolu√ß√£o Cl√≠nica Detalhada</label>
              <div className="flex items-center gap-2 bg-brand-cyan/5 px-3 py-1.5 rounded-full border border-brand-cyan/10">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></div>
                <span className="text-[8px] font-black text-brand-cyan uppercase tracking-widest">Protocolo de Seguran√ßa Ativo</span>
              </div>
            </div>
            <textarea 
              value={evolution} 
              onChange={(e) => setEvolution(e.target.value)} 
              placeholder="Descreva aqui o estado cl√≠nico, procedimentos t√©cnicos, materiais espec√≠ficos, intercorr√™ncias e orienta√ß√µes p√≥s-operat√≥rias..."
              className="w-full p-8 bg-slate-50/50 border border-slate-100 rounded-[32px] text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-all min-h-[400px] resize-none leading-relaxed placeholder:text-slate-300" 
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6 border-t border-slate-50">
             <div className="space-y-3 w-full md:w-64">
               <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Lan√ßamento Financeiro (R$)</label>
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

  const AVAILABLE_MODULES = ['Dashboard', 'Agenda', 'Pacientes', 'Retorno', 'Mensagens', 'Financeiro', 'Administra√ß√£o', 'Documentos'];

  const toggleModule = (module: string, currentModules: string[], setter: (m: string[]) => void) => {
    if (currentModules.includes(module)) {
      setter(currentModules.filter(m => m !== module));
    } else {
      setter([...currentModules, module]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
      
      {/* Redesigned Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-1">√Årea de Administra√ß√£o</span>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Gest√£o Estrat√©gica</h2>
          <p className="text-slate-500 text-xs font-medium">Controle de acessos, par√¢metros globais da cl√≠nica, seguran√ßa e c√≥pias de seguran√ßa.</p>
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar w-full sm:w-auto self-start sm:self-center gap-1">
          <button 
            type="button"
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0 cursor-pointer",
              activeTab === 'users' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Usu√°rios
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0 cursor-pointer",
              activeTab === 'settings' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Configura√ß√µes
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('backup')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0 cursor-pointer",
              activeTab === 'backup' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
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
                  <h3 className="text-xs font-bold uppercase tracking-widest text-brand-cyan">Novo Usu√°rio</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xúÏΩ€rG∂ ˙ÓØHcªM∞Ä/∫–›Iπ5≠[î=#k‰"P™U®Ç´
i6#ˆÃy8ó8;Œ5NÙÀlœ<Ï”;¬q‚DœûòËW¸…˛ÅôOòµVfVefeVHJñ›F∑)†.yYπrÂ∫Øwßg/Ÿl:ıìÅó˙Ï$é≤ÓqYÊüe›4Ù2øª±∫⁄⁄yO¸Ìï–;ˆ√ùòı≥D”Y∆wÀŒß˛Ω6‹r?tÍÖ3ˇﬁE‰ø˘"ıì'ﬁƒøt>G{c/¡„mô›€a©ü=)^l˘ÉYdÁ_dAòˆ¬`d∆µ‘ãÇ,¯÷‰gôü§O£ºÌ˜2/˘YèÜ≤‹awVóó›ÉòÜﬁ¿»¸‰^°ƒÒd˙Y‹ræ3Ω4≈!ﬁkΩÈûÃ¬êMªkÏx$ æπ é„ˇàÀ˝’U±,X®¡,›∑è/vÁ^ƒ‚Yëﬂç‚»gI<ãÜ˛∞éú _±/Êˆ 08u‹Ç;Í“)Ãø{ﬁÌ∑úxAX£æC≥x—˜ˆ`=‚:‰K˝–T`üéXœ‚jàÖ/ö(‚nËù/4ÏN„§;çÉ0⁄ÖÇ.(„iƒ—ŒÓpD€+‚WÌ„˚~îiÊ5„ô?ß¯÷‰µÌæºb´˚ÜÅƒ£$2¸”ƒa
K4Ú¶›Fˇ ;‡†;ÒÇFËØè-5&¿¯Ùï6
ΩÈ ∑¸û±ãö“Xö¿ØÄ˝¡¿Î±˝ôŒä7Æãeœaè¡›õ:ÁõcŸ·zΩñ—õñMºÙ5ø~EkØÆ.≥U¸tÒœOø~2îÒQ<¬sÍ]3¶¯_tUÊTæº ÉZÊJ◊õs•≥tÊ%A‹ÉKi˙3[*ﬂ∏.Í˘—ÿª‘õ¬ﬁ –öLÒ¬’h¶xŸä~:ûuÿZ%ö˝x1F‹h@%&≠πàﬁıàáÒ‡5õÑà™èÁŒ¬8eª∏UÁﬂü˙AZâaµ‰:ùl?7àzª&¬ÿ≈ÓóªÌﬁtÍÒ”˝/¡a:mO⁄néû‡µ~Ôbr©åÊbπﬂb¨u˙g,»¸I⁄¯(Æ·)"ç@!]≤a‡J†––ı¬∞’©ËHlö«1¿÷O{A4gC?mOñŸg¨ÿZ‡›J_¢¨zq]‡´Çü˘r∂ÿµa`|	’s∫·ËÚ•[j™ß$¯·‘d0ˆØè„≥
jÇzÃÊ4≈˜∆«èBbà¬dÒh˙ºôˆ§cÄΩ£P q©¶}≠«¡pËGn–9˜?ˇl√é ;¥ø™o—,ôEX¶÷‡1àúRÖ[M¯]TÛmõﬂœ“,89Ô˙—êvÕ:õfnu<À≤8r·,d^ÀuÑu:«ováC\´ˆâ¶˛Ú•Îee`”3†0S†îÃ_'	«ß~≤•\ºÖ€¶ÿ‡@º‚$µ/økˆºh‡á^‚Xë+Åk§ﬁqà;'Hèf«pjfA4r·r\/=èåÉ¯¬Ω5Éì∂¢¸dÃñSπ$OÚÂ™±Ifúıc/›«≠T6=$¡4S;]f¯k˙Ç÷B/ë`Ü]I º–O≤ˆ“Ó¸Êˇ1∆sÚõôÔ=6ç6â≥‡ °¯:öÆÃˇ¡cÌﬂ¡•Ãdﬁ0^Ó--ZŸC‚g≥$™zÊ“∂#U¿™3¬•˘PáAê~ÈÖ¡êk<Æ2{Æ˙aAt:ˇäﬂˆú`˜?T–∫D—ØÏ1KŒkf2à£4cÈlÄLª«º7^ê¡∆ê¶yÒÉ¯µ≈Ì‘ΩëƒaÒÍlkﬂò	<ﬁ2˜[/ã≈o¸dHX{πó%¡§Ω\€údÈ∑ÃΩZ≈®‡á‘[˘[Ñ*uØLQŸQtÑøÍ^ôxÀ‰ç~‹U{©√ññ+∏\˛¥ ï7q€l®€Ã¥È,-’uÕlíˆbØÂ“Rm}°7˘>_™€£¨§¬ZË±ZÌK˚^:>éΩdàk∂;n¿√oáﬁ @é:]zŸ§ŸÚq_3Â*∆Ìíù∞‰uT¡$4¢„J∫µËùK◊ùkπ≈πM‡< õ1»';S01c£+Èû7›…P25»≈Osﬁ}—Ìc∫‰í≥[1öpnÄ±ß£±! —,y·)L#ÓızK ù,Ì¡°ôBØ…íã'usC~2õ≈fπt∏\¯√ GÜÿÖdY$‹m©´k¡a/ƒ©5˘≈ü¯âJ´ (ﬁbR<ﬂê†?ôy±o„xˇvÔn≤!p	ı5xU.Ÿ⁄Yheö∑«Î%Å·,µÆ>@v&ÿ}Äÿîqlë√ºEÊÄÄó∞/“Ÿ¸ª$à∑4òÙHè∏Ω2^ˇ)Ëcﬂ±ü@	é)ƒä∑€∞[î÷:ÇÈ∏éäˆŒÍÚÂªSû©„'©oΩI7 oíÖ}*ÒÜ≥û:2º_h≥ì@≥?2“˚Óù‘]DØ†`…¡e‡g·Õ$§°‹ﬁØ≠ˆ„¶∏Ôﬁ!@≈(ko£Ñ∞‹–e‡'äMÕïÕÔ;—ì<5kì'¿Úƒ{JÌ—ç£k°ñ™∑÷:4UÎÔ ósGqê5Ü§äûpcp±+?
ä˙$>ıÿ·8†VÒ÷Õ”÷\È˘>≥øMëéñ	’~3?{ºeœ∑ëÄ,& Y•(ª«⁄*≤M7«ıÂ^:ÅníÜªwÑ ˛¥Ô« ±yQÖÍë˜§{‹d]Ë}™6sw+‹0S·HquWäwËL¡8pÔâbÀô:∫5πKmÿ€ú®ÛùhÊ=±†ˇÑ‚AëC§⁄°°Ï2Qg¸`,Ù3¥—D´”Âs€J>úzÎ
~äÊÀà-∂l".˛Û·Ω{¨
ÀÂÁí˘!üÖ}6yŸ†ø⁄'Ã”ãô«ój+ƒ–ËU”á”‹ ?π¥‘8µº∑ñZ«ÿk.0∏é˘áœãä!?ªºü∑ÌÚ“¿?≈‘Ù7Û7)i®MJ`5o€Y•Œ≠√MzºeM]ç´Jpç¶ø†∑ ’'µ†õJùìäÀEÂãÈ6'—"¡∞√îﬂ’ÊÚ‹s•ÜóÕ`IæÙ¿®RJ"÷˘
ÿ®ŸÎçå˘ãöÚoÃ\ØJ{?{˝ÆXı∆^ﬂ¿ØsÍ»Â0Ç4Æ÷BÙ$ÑÎÇŸ±åÀ8Á-‚¿qπ7âL„é˝ÏçÔGö‘ÿ∏_B„lv⁄˚[;˜Ò*–vùcß%øÍà≠v¡%‚f«Ö⁄i‰Ω´ÔëÇsQvÉÈ PLöÔ√CFﬂ9ÿ∂É}3|¬ûƒßqÓa≈gÆª0›¿®œ∫ﬁ,ãÌ¯ê·é∂®¢^°íI∂,Ù¶©Ôb:≥1˙Ñ^Ÿ¿4N÷∞ ∫}ÙQëËRfIÖU5€(ÈÜÙ⁄»∆WyóÃÚlÖÌ¡|º,æj3rÛ\ÂmAπ·ë˚'?≠j
Ó9‡Ño¡∫ñ˜8û;˝ÇP£mí¿FÿJ›s˘E"É[Ü¸fJ⁄ØYM‹MñpM—¯ëKM∂îõUC=S∏`#ÿ˘SÁ@xC«rU¶¶ÙÜ–I°{;“ﬂA≠êC}Ö◊ªoØzúp5@˘cA˙$éŒÇ4ÉûÏ.i•ô¢6Ä¢ﬂ€D`¨¬?9®QkÂ:#çmŒI¡mùZÏ:mÏ«ô˘y˘br~˝ƒjı¯©â‘©∞±‰è(°B.ÖqhÁW∞XR¸∫¨Ì∂Æcﬂä˚7ÉÃìcZyBÿ;	[Òr-Ô°5m¡™µ´‚‘≠ßÓ8Úî_Â®Æ«'XÉj)1óFàçë’Åî«W€v*Äí8µòàËj˙u%‡8àR?˜/ùŒB'+P3ë7Ñ-c˙+0b9‰¨pƒy?∞ˇ[u⁄@˛π/1kó(›g¨µæ≤Nj˜ÕïÕ÷eµè?ªuÄgΩÌÔª@kö•HUÕK;lıF›õ√"óVù_Œóùˇ|[õÇ±ÉñiZõÂÂäÏÎ †Õzush_à%£M#€Õ€•Qï3å=
&”ò–vıh≠É‰ª>’êj¬«‰:lG^'`á{N)Ô”ÖFÔøµSñ5ÇåUXa.Ø◊Q£ÿje–ËΩT-®‰ø~€≈)˜á?∞v3⁄∏º‹ê≠V’´üB´‡747‚«Ô•Y<=L‚©7¢Äâvs~R?Cu≈Û¯ãgﬂû5zØ÷hÜu°•±E˛ö-EUÊRêBÎt]ájÛn0à,»B¿æü
ı~“Qˇz#.ÅNÁ6ÄKÿht˙WõxäO›˛jB“U0”f~õ’é?6ú∞ÿïïEçµ≤y#Xaƒ¯‹B`´?8:4^WÓ?¡üÆ¿U®”iSNôˆ˝–œ¸Fî©]jåÅ©R$ók†ûDº≥A8öc^ƒyûxÈxÌjx◊ÎÆ…f∏ıwUô7H{g7öê∏°éŸaK±93∏<˙nïxà+Y]0˛Qµ∑îb!≠¯¢÷è&:i¿‰È1n”6≤x£h˛g‡¢ÀàFvΩL•càÕ T6r›íG¨5*SQxØÌÏÖÒl»é–≈ÂØJËÿﬁÖ’=≤s}S≠√¶Zgf'é]÷8PÈ]¿D.ªÇÖ3~J â”JàT4{G¥Pâá~4 ∆LN€gı&n∂#öπÎ£ö-9Ò·Õ‡‘7≠°Nıªπúﬁqá34k«”Óÿ¯øx…í`4Œ–@ç?§!∫è«IF*√5ﬁzóü7‚Í∆¶z∆–◊ì8ôÅ—˝Uáii˚h¯·–@ﬁ5ƒﬁ5+∂∫ñbºq≠®ÍÇkkÌ<åNÓ$≥∆¥e√“ﬂ‘EÈ˙˙ﬁ;√≈:±MIèêûx ⁄!Èô?aﬁ‰ò“+poû∏«Ó√Xg”÷zx·aÊÊ—ËmØL;@úÚsM?i∂wπñ0ÒS?(ßÌ…Ûò,¸ˆ^ù…˘"˛ƒcò`®3yÿ¿=≠˝lé|Œ>^„≥∏ù˘
Ôÿp3`$\Æ—◊ZÌæMŒÕ⁄ß˘êÙÁ·œêêçß4Üo≈˜¢BL´Ä(¢¢¸°Ü2ıu!:À tBSÌœ|H4EæQ‰° çí;Ì¨√Ñ‚cãëPáizé-∂ .Ì≠U˙^Õ»„JÈ∞4§'+óˇ◊ 
€Qêœ∆>zˆdI Ï+ Ë…;&:èﬁ«â≈≥mÆññ¯®áÑ_˚Ò†=ƒˇé;lâ  XÇi‰6-¢•«m-[dìK6≤¡òµ˝$±˚ê!„–ÔΩÒí®›z‡!L)@ÚÑ/ìc`Ë≈ 9ÊV´√∞]K∑T˝Æ›/€+V“îì5ËÒÚÉNfä}˚¥/_;öwÚM¬.∑øΩ≈ºË\yfKlÇ”G>Ø^eóêZTFâì
0" cwï}€}\˜KãY»PN•2gÚSu}A„®áÂ0ûŸÉ=!œr⁄(|Ö!H{†Ø>‡üô˚ı\“ñÄ(nŸ¯9_ïÎYŸÄﬂp AÙÓá≥ÌcÇ…¡¯*)uÆ4ùh:0O¬jÔÓfß~÷‚È~ßf˛Zµ	Xö≈'Ö_Ö–ƒ;Îí=–‰‡r÷1£òa7•Ù9”(ATÏ+„N6eÿ°é›¢‘6õx”ÌﬂB≥‚-fW|“Ñjxr\ø¨∫…;–’ùí¸í€-è°”Åo0àe6«"è  QSE˛∑Ç•E˚ô)aZ¯?XFCÄÅˆnô†1yËÃˇΩáÙ4ÛÄŸLX,Ç¨Ωèºî°¢—æ— NÄ≤x‰ÛÕ©/|)…<.w!Û|V≤ã}˝´èƒù‹/‚k¥æ“%·&A‚—gƒßU(Cÿ¿„)8¬õ+oWˇUï“F#úÓ£yf›Ñæ≈SQAWÿÑÜ3S_èì§óàn·°*·â…ù[£(ÏZ≠ê·«QC–∏=öKBd4Ì¢∞ÙÆÖV-¿ã NŸëµ∞3àÄˆs{•8:säÛ3«¿~Ê~úY~0v¡¥I\ùW∞^AöCﬁg`DﬁW‹ü∞Åüd˛∑≤'<q	æËÓƒãHRÂ<√ï8Ìp◊Oú‡Jò«œÇ87ˇ∫|GÙNƒ¡˜î´≥z?Û?J˛ ∑$6f
ˇ«ksπcÂ"€ÒÌ≤Oÿœí`∞Á%C‡(íπ√D-òÖw¬coñ`012–=Ω≈P	çPBÔ…Ï,ö°S!ﬁQöR_¿F?€bœ|oêıËÔìxË„Ín…&ö˘aÉ‹AÉ»´JCÉDàR•ïr–qı*CÍÃOÃá#(ªÙ]UK∏≥ƒ⁄™få(¨JäÀ ë∞ÄY`í	Ú_`PUx|Kg…ñyAR2@ô„Da≠*ÂRpˇÁ“Ö˚Íõ√!2E ä3ƒ"üOÜ∆#d.xvû \Å=Ù˛ÇÔ$ÃÅ≥=	"ò±© 7§î‘Dıü,¶a˙±ÍA*€b§0·É„»F íR∂^ëïD2CöπJÈÃî#j'€á·,’˘¥ñë±:ÿ~DŒ˚˙apÒÿÀ∆=ÿzmj˘ÚÕ‘QQ±8∞ﬂq·ÉŸ‡Ï¡Ÿ®°P8„tq	fGôóÕ“˚ﬁp‰NÈΩ¯˜-Üπ@Ωô? zÙbâ_]z)E,a»Œ)jõìŸé ∑;hs†A,°ÂA“K[l…\œ%é	"9∫Úà$tí ·>¢W˛@ÓA.ü'ø“Üƒ˘ƒ¡ÑÌf–NÄü“UAµ–Åº·ÛÕø∑Ã ]~˙AÈ¥pÔ&•≥ê6A
ò°eèy»7_îbM1´R∏óË˚‚B<tàÇ	Èù‹4&B±¸*[DÙp˘Åæl§åR5÷f»–|ãùR‰«‚T~?Ú‡˝ÄêU6?ËïwT˝¿ß≈˚p9Rﬁ»ÛòÚüÙ∆aOÇ‘ﬂ∆7wÿ‚ø†«©bç˝%7⁄·Æ +à'É˙„€ÇÇÈáˆº∆œﬂ$Cü¶yèï-ÜhI˚0œÊZô#¬»!≤∆ÄOﬁiútP/$∫‚ÛƒÂ¥j
àÀ| ı:Ï}õÈ7∂(,’üˇ$@˛`ì¸%rnTCÅßö]Bµ$JK%¬≤≠aûhÆîCAmZÕïpÈÿÈï:&MÁrÀ¢sYD	u≠SGU°‘™†Úß˚7°aôKÃÆÉOÆ◊¶ËÃ+:˘"V•≈N1◊M)˘1‚øFÌPÛr´‰>SßÙ¿àkQœÅ…îœÜ~£§G)+<pí9{R ∞s˝÷ŒSπOÁbëOô Io0ı`˚—i }Ü˛‰–=\fY<ôáÆ}ÜüãÈYfëÔ‰æR∑r¡≈`â≈)˚û;ÂeK–≤·v¯›¢jQ_ﬂ4/0ÔGŸE”Ó√ßËµ,Á|:¢Úõ§yt4MKÍJˇÿ4UkGñâ±¶¸≤ävˇ<ÖÙï√tÀ~±MÛ\^Ç@A˛§s´»èné(•Ì>z•Ωúc …ƒÎ$ ˜W÷XWM'ÉÑµ…Ås˘òôÇ¥ôçÉ®πP”À~wÆ,á∏Q`„•;Zb/⁄neÁi5%|È¶^ö˝ÃüL√¯WÙ¨Ω4ª%›kà;töt$Îµ©_’Í-“˚2œãÏf(~(Åk´Õ Õ^%·èL≥KÅz•ª÷L∫ƒC-êŸﬁ‚◊GøÒœ˜„7Qﬁ∞ﬂ{Ìüé)1⁄y<a¡˙µK≠’—®˙}¨(äßYŸ(`WÜ÷c†™.EûªÅ≤ÙL"ìÇ(BËu}≥ƒ¨R6ç∫<}7Ø1.Ä§pÊ|óÂ©gó~µD…Ìj¡X ¡U!È™ìUÜ]IÖ¨oG[Œ≠5$Óµævß§¿∂ÏÀ‚öˆfıÚúÜ%˝Núƒ˝πn\èΩ≤¬∫›.{t˘Ó#∂˜ÙÒ·”'Oû·EE†=LÇSop~√ÇûK¡6HüN˝®#%SÆn·∑ Î)«q«&∑J•	~¸Öe)Ä†˚Áß◊êGÓòÚpÏﬂ‚	˛V¯ªVoßÁz◊+ƒºÄﬂ∆›w6O«/KBâf©≠EP¯pÊ~™œy¶°+F™°Ìí_˛∂n®ÂAËT#◊áÛÔÅÈß‹ËÉ°7.rºf4›‘˝æI  óPÊ3XÀ<3"…˚[≤÷|ÌñiÀ,ùbÇ¿ñ3òœbV‘tRn≥âËËwaœdPM˚∑IMLZb£rT;ß¸f÷å0@àÕ {$⁄∂=0¡"ëZaÈ˜ÿõå–c6LZé˚⁄ûÓg&òüaS4ç{:'ObÜ:BÌ¿$x √{á∏4zÙÜõ⁄1[=OÆÍëéóåËî‹ı∏Bà2Ø&ßà)ãá0d@‚?èPr≈Äé(NSÊ8ˇ>º6c6¨Ò7™µ˚ıQ^ Fä„…‘eÄÕ»±Pyå•8µpé®˝Üªò≠R¿…ˆLìU¬ Õ∫pN0Ûˇ&ŸqòKƒD,ÿFjÙr, ú28Ÿø{Y∫;ù-‰+ ºbiÂ±G¥)ıglCòˇ9ËKò«¨=M :‹OaYI|ÍlÔ0âQA£¬X`1&@ëIê¶b…ìn¬lb{eæì%^Ô°¶7Ûs4§¡⁄è>?‹_∂ÆÛ¡ı¥∏ÃDU)Ò´«˘0◊@uÄ˛AËp∞î€á¶Ï¡"}ÎGtaàÏ¸á2>BœAìÄ*Ä7cz{Ä•¯Aß ÓÇ&`—_˚îß4ÖmÇká:d¨„&vŸŸ‘¯ùmöçûL5àÓ,˚áOY˚ xI‚è0Ìë±∏á8π·¸/ßÓó4>NT(≈â≤qßI] lê:û<†˙ßÛ?•ÿ3'N[ÌRq4⁄N„_@à“Â%` øç;dÍáqAÃÜQú⁄£ g≤2À`ÀBI!Ñ-€Ÿ®≠Z˙“∞‹…%¯:˘@ë&â§4Ü©lJ…Ä_∏ªY5Ø/>J√—0∆Õ‹Êé® ÖSÊ£qúdÉYñ.¬îz5¶<∑Á§≤S¨û@√º¿•tãΩX⁄Àí´¸zÈeG˙∑,=åpÀbŒNµ|4|1˘0U†8ß—ä⁄!íâ ¿7ÄÇc®…Ñ{∑+8ºƒ.;éÓw’Óπ%3Ü¬FC¢¯Jˇ∏%©wÖ¡√˝6(ûfD£t¬™˙=T˚ïizã‚ÿÂI„·á‹DLw?0&ﬂÃ@¨$LÂª0ÆÑá´U#x¢éÄí› Óç)åêûÇH∫ga1Yﬁ}óC®Íıæ—´á$ì¿≈∞‹≤’À˝{H§àãpƒ*[•@æj è’Ï!UE$ÚŸc?J±9ˆü˚â¡î ß“ &Ìì°Åü`íΩ®ÍÍÅ⁄ï(cƒ*]‡@+-ÚâáÒ¬ú_Ë ã‡à…@ù¬ŸôÄvpV9ªﬂ®]~>Tªôé„T´áTˇƒåaR) v$ûı¯≥˝FΩér¨@Cí›æºûp”ªœRªÔ‚ß°7∫"Î*Â¥OÄ#¡’Z⁄-Ôµ$ÍNêÙ9}»Jrıãµ5y∫8,YƒõT˜vîS˝ïV~…~2<ıÀïKÁ±
√¡«◊Õ‚n¬NËQI®KNeSœÆ››¨ ≥⁄Mü≠˙eâ˝
Ê∆*ÎÊ ⁄¶VJ™—’zì„ñGú.’¢ª∆¶ë≥VìÏ∞-°Ì§‹ØŒñ5åöö†µ#v!n≤Á˛ ùulYG)&÷©`üw
¸3Á¬OÅ}„™Ü≤&à]Ù=äŸS‚˜4-K_5Q˝∂KK•T√ëÈ∑uODt®ëöâ^Z“!gŒ"QJA◊πu√x¡e-úÉº$∫D!Ôµ ˝Û7gfjJßö™F¥ù≥_Ïú„ï7®PŸ›Z’TvBèbOC”q6ué€Y¿PŸ~h31U4ÆMÒﬂ˛˝ˇ˛].uÏ?‹€e˚OŸ·≥ß[Ö¨Ò4≈bV¡IŒØ!ß
kË¡~Ò"!÷‡)ì…õB©*âC÷∆cnπhé(|–|‚û9ﬁùLÄv∞ˆ?ˇØˇOÒjOä\Ïî^9∏=·|û¿Ë8øÅ= áwÊˇàÂ¸;Üﬁá˛©/n¿ÉSæ©á¡(êJíTÖH∏8ÛË-∏˝°Ü9”J£ï=A{^}Œˇãú·¶,Ìm˘≥Á‡Ÿ≤-g;ıI©⁄·	]”xﬁ]Î59*\ew´cÇ&p6æÈ:r∫XDœ*r¥KçPØ`ãI∞âÑr∏ı∏µmLÓ‹>UŒ‹éd.búE˝≥öa!ﬂ∂»®V†»Õ¢}‡jí zÌXêb »or‹z›aØ:∞JÙˆ˙xË ÃG(áÔ7,eF	Ç˚zÊqÁøY=Èﬂ^Û^ZJÎP
`ÌŒ	€dh•}ÎEÿÇV:°»$e≠}˘ nØπΩõ∏s¥··/Å°	ÔµmIqÒ p∂&mvvG
©“E˝]ª%P;±ƒqVœÇ9÷Œ∫õ<…≠[◊SKKçÛ}•¯âcÆ/_Rˇ2É∆qB≥D¥vhY>aø)N†Ïπ¸ŒÄí+jÂM˜˘§ºé´Zé…)øË˜uﬂj√\tßoe∞N¶ÀZ=ÁTXµ∫´Á~2Iüû¿z˛lI˛Ÿí¸N-…àzú≠˚ÇÍfΩ}ÛÒó¡h˛è¿
{[?[ãﬂkÒ.i‡§û7e+¨Êõ›‹‹ôpÖö8,„oGàÉÛ∞=<hN‚=ö√Ñä±“ﬂ£^5Äπ’—+ÂÌ{õ6‡]≈™jü6ö™ 9òpÿ'\iGËµ»•´i2ˇSW3–¢∂{ä¡9°∂%+.4Hk0W¥Hy¬˙Ì3¶æ0õ˙SzÏùAaΩ'Ω‰*¿p$` ÕüıÜ±˜å0iíµn¬œµÿ°	œ∆ÉfËÅ?‰dÄÀê©†â≠∆≥,—4˝„ à16B:˘õ∞◊’ÚpJπ„õ5”›2x£‘∫V§]’Dn≠Æb±æÄ\Ù6¨o{h—Ô{QDeΩ„hw úu(ﬂ„Äv±0ÚÜôÍE<TüÎ•Ã8(l2´´ˆ"
◊¿˘
[Nítx&îÜ‚$√8	J˙zãMÜ[tÖ(8¸»ca™Xç´Ø÷‡Ï|µâí—±◊^Ì–ˇz˝Õe3IÅ»@pÀ¡Kæ¥.≈æ¬ÇÒhlScaâˆ√ê◊>!"⁄G±öŸÅÇöÎÿ:´<-í’Óç}3]ôr™ÊÍ«jÕÆÂ^±zoñî∂‰éÓP¢`˘∞÷Œì˘ü1[l:ı=CÌ’TÛ•”“ŸZX°≥‘‘9Vg+˘Çú¢é∏aÑ´«ƒë6
⁄F…	⁄XÚ®RäWì†ñ˘px≈‰+¿qíîŒ]È=Åe∞Ö”†3ÒHÛ†w≈œ∏:ï'±êFÖ0Ú›ØRFwûªCYE∂®#ÉnáπkJâ˘TèsHâ t©≤≠Ä tÕ PxªÎXV	©M“bü¯30KïC√ú∞&ﬁÍ«ÖqFpEèˇç#ÕÅZƒ˝íå¶◊zÙ9L3è6ﬁ∞D˝“€⁄u≠•"Iàı`·™ã1‰ùî=§ü®ÙÓ·¶ùMKÙßë≤ßTÕêŒé€(vÚπÃ– ∑Ë{ø©ñÎ»Ωíë
µ+◊o\‚+ÚkqÈ&;å9«o‘{¥Ü∫Uœ•π§(ªTC5'WõÃDÀÕ_éΩ<ŒÏúÀºí¡ªXháΩ∑‡–Tu0ÿ8ÒOÓµ˛¶ıLaÁ(?≈∑Wº˜h\ªøüı!’Ö;r”‘dº„ªä\£'Ñ©c:MÕç≠4Ç‰ÈÆÎQ÷6U§lY$_ëLÍ°–ÿ#‰^»y`*Ñ8Åùò¨Ï∞=Ó±~Ì1åX p‰T)s™Zú∑§€>Ò>{ê¯˛Ûd£}?ÛÇ0•Sè"-ï∆∏âqÊU-a^†Ü⁄Ö–”ro/LkàBUqQf…’^¯æÅ3TƒÙDkã¸¸·c^ã3yÔ≈Kö%˜ª|˛Ï·Ó£Wª_Ó>|¥{ˇ—¡´«O˜øxtp$º0/X =,©ñ| ≈%ˆ1{<ˇ¶+Û∑±ﬂ>L;lîÃø;°t‰.\÷§ü<è6ÕQú¿|óRÃØ≥ﬁc¢sÆX*zûóÁﬁÄ™∑ö¬È”*R˝
6Å«ÇÓ {ê–„JØ{¬w_ÔTuØ˝~é6}Ó˛nqæ|∆Ö)9ßS¯™jºI‰cûú˙n˜„¡åkÇHÁ◊`ŒáE|Å:ÌÉDÜÜ+†á3Æjk“˜3?ãì(.:RËù®H—Á£<É¬ƒ¿ÆÙßƒ•íô;ΩÍ=?–ni›´Nïb ˘%ò∏t¢T&çâ§*Q”‚X%©Á2&Of∏Dñ!§˙vŒ$§O,nä˛¬Ñ'r ⁄BüƒßR‡Ÿ†.GÔRsÒΩ◊…—ç≥ËîÇR
IVp≠è1G˛≥ñä4Ëuw8rÖéørç‰ﬁ“o@ˇ§P’ AÇ	ì–’8?…’Sˇ ]B±^Ìè3Üy¡ÄJ"RXeÊ!HÄ+ºd„	kﬂOºoAáÉÖ‘ﬁŸ≤†^"ìºX4§´≠P¬Â‹⁄'≥ÒWx	{ºát≥ó¯î†ΩÚ’˛ ®√D~"¥ EÈ& ◊ÔÁ&AJ}#ü]˘◊ÌØÜÀ_ı/˙´ó≠Ùp[ÊÔ/Ø`ŸJ+âûxhAÇ+ü≤0xÌC'˝û¯Ø€Ô@l=–hÉ^Â≤Y¬⁄x-†+œ6ªˇ|ÚâL*Ñrï$©ˇ0*F”C=Ên÷`XødÌ˛*Î≤ÄÊ|)∫ÅMœp¶p£ç≠¸g-'J7´≠ùˇ"∞ú —…bŒ‹]6√gZ3À˛Íï¶Ÿ◊¶˘é¶ÿ_uÃQ\¬ƒLp$ãùA?ú≤?â§Q≈…1∑úbãÍI˙ÅÃÉï–sOì#Œ;Ï¡#E—>ı¬"wJ'∞qü/±?∞%Œ∞–W…^–…W–‚_ñÚ¥Z0∫g˛vm&”Oâ1Êõä~ÚgÓ±ï_ÕˆÔ¨Æv·ü˚ºƒü{¸Á¯˘ºªægΩ∫o^Öﬂk´Ù{}}uüﬁY˜·ÍpHWá'''/WFrIäq=†(VÄÉ[<âp·û7âO0’G~Üp∆T}¿#ßs'Ÿl4É≥úy‰£Ò&SÜnÉ√8#c/¨√ÇçÊ¯◊/ºÓ∑ª›5ˇn˛˜Ûˇ0ˇèÛ?Õˇﬂ˘?ŒøüˇÛ?œˇ”¸üÊˇy˛ üˇˇ¸ﬂÃˇv˛oÁˇ√¸ûˇOÛˇe˛ÔÊ7ˇ?ÊˇÁ¸ˇöˇﬂÛ?Œˇ«˘ˇˆU⁄{˘…G+<›ñò‘áyO≈å9öó&*ñ^ôÍn8{p¿≈1L›"˘PsûÓ∫àˇ∆¯w|>√˘‹°˘ÁpJœ'¿‰ß
xó%@¨vÔﬁ ,æÍ~‹)√CÈ≤"˘p¿Ñ¶€°ú†I:àL√¸oèµüƒ9d¢òΩÅC;ü˛≤2ŸÅ0˛WÂ·ko‘N@n‘•O∫fÌ’/æÍ~ÚÚì_icx˘…W=q·Â≈ZÁ“P—\Ìhr¢®†bH∂wæ˙Í•ﬁG˛Ä•ùz"≠,¥¢RH˚2ﬂ¥/HìâµÏ:ÙÌÌ8tªìÀiè‚QlQíÊoö*Pµ∏7‰¬‡VI<,ÁD¸TÎSÀ¬Ã=â*¥´"9¢7)9‚Ò£"ôb!ä“{˘O˝ù	e{ƒ¿´©o7O⁄H≤,=yàﬂ™F4=·CôûTµ¢C6_ÙÁ §(Ó }ˇƒ1Å\ºôÕÙ˙ë¸•∑Ò9j0¥ÂÎ»zqQ5`%ZÛAäœÚ7ú~M}{[JÁ;\üÓêÃ…•vÇà6È√eÆ¥»˚úPªT™,£+¥ﬁñº049Å	»™#JÙœÔÃ@Êô,Ì¥ÈŸe¡¥9;g«ì Àîºù˘kÓŒfI}e˛î„EÒ[{qUCÃ$¡dúàò¯Õ9±´vär˘PÔÛz~˜œA∂˘…œƒ†m∑™á/*ÙÌ%>	@põ/mÈ≤6∆í*…mﬁæ»lDà¬◊ôπ)}ÆÒ≤)ŸP<çâ|ù¢jïD§ÁS—7RtZ5ÛßÅ«Ìf»öÁı§•Næƒ⁄œMUËÜ4ÖçÆFQ4/´†¿ÒjÉ(t∫`_∏ÛÅ| s•™kˇ<çBü˜Ükõ˙·PÀªk_÷|Â´÷†KEÚ-ÍGIGk{X¡€ 	©5ÛæñX¶§„RüMDD+ŸÍm&z<}%ì≠ûÀ∂(⁄hYsÑ'AòQeTT¿≥πãôi´_µ¿Ω^ØDΩ©çÚ¬¡?89ÅG€j˛a*…Iói¿›µÇÆw<S‹[Ëµúú£ﬂV*J£=ä^xî≈	†!±‘≈VŒ1d‰í."b®Ja≠\*ñ2Ó¡s_ >∫ä=—„m^~˝©ˆ,¶“@©ëﬁÈ•”0»⁄ÙˆqyÔÎ|eh”‡√pÎ¨Â¬ø5çßÌÂœD3Kü.-˜“qpíµ)∑õd}ŒØ∏ƒÅ 5 €DàD√ÿr—YO`,Û¨_><…∫±Œi  ÌaÊO⁄KØ“ÛÙß3Ø`ÙA‰ø¬‰€˛´%m~j[*ñÁ†J}¨È˚/éû>È—/˝çâ∞R^FÄ√D–\˝ÿE'Åê≤3kUQÕÈsπUﬁΩ‘vFQ[uYÉVS•ì≥]§gŒ	Åﬁ¨Lé\ )û˝≈úWÚ’ƒ≈SI%éE'íˆìTM:≠Râ›”Ä◊*Ïx[®b•˙µ”çjß1˚˝¸;·∏œ0ˇˆ˝\cû%„±Ë	¶ÓMYõ πå=EkNOh∑vÿãóÍ9ØOãl-ÆxƒP=ûãF¶FÑvì¥€xÌ
£ÑGÕ¬O‘ÛÙz"≥|Î˛,FfSÙÛƒßR·∏ö°ì*;ÜcÅ& ∫·iî&F(H]ƒfdëÓTTÈ¶DO)‹:éœ`Ûåf°G!ëCû\Gif‡àQÖòtbÏùÚQPeGÆ⁄’…º≤\´õáπ—P¸≤ÃôóWd]˜e©òq29@CÅBä¸ﬁî„ﬁvúMíh> ‚Ωr µ¿hK√a ºøÜ°?Ãë˜C)â˙√îM≤ê}‘´<«§rÅDıÇQÀò?$8|≠˝Èâ¯©·æ@j%g<Ã⁄è–"[ìu•2˙3>NÇëGâ£b ¿£$…pfró–QµÂ·9À°ÑuüÿÿÙ‚®∑ï‡A$ì⁄3kÊ{|ù?yÁ<‡Uº¡u¬,Ó~«Q›r®€'≈’ót‹	—çÌI-'¿µîï–1 ˚*˘≤©>€Ö¿,tz∂I?eO‚â/ÏÃM{ß|ß˙Öˆu+«Éf&.j"¡¡≥‹õ˙ëó‚Yïx®‰˘ª`Ôañ∂Â⁄ÆI®R|ŒWL¿û4>.:n¨<√0Wm!J+∫¥™—˙ya;Àh:u„ŒëñCxø„≠|9¢˘_&~ÇÌLcäßœø?Ò#tùSåu|ıız©y≥ÕUêTÿDYêÕàLáÍF˚íêöß@„zUú(/πÀw¶+ì–@(§ÛÔQµ(B8tÆ<ÉBù°(ÏlÛÿÖC:/éVxÍﬂåb÷ﬁÓ∞ù˚Í+7¿%98BWÇLÍ’h…ßbñú/“3∫E›f∫M„a	›™G∆99ÌD»e!∂n[J`√cWñL<E¢ò®AÎ
Ï™G`®XTŒJ◊°êﬁD»%ı[\%°A1ã≈o¸dœ>V4®ºHj@xK=Dk^!} º¬èYªeu3l~Pú˘LOü¯^ÿ≈‹}@Ù2ÔΩÜ‡∏ÌûÑË1ƒ1iùK¿2Ñ‹¢Åg‰Iê@óo0Új´zÁú¸–!S §“g˛	.C”2óÊ£òÎOYKX8àß≥Ñ∑÷Ù7∏ –.Üü∑eGˆfò–.®(tuÔZ”’E\ÓÉ±›_Œ1¶ÒQ‰Më=£∫.¿“Ô«É¥M˝iBŒáÚŸû?ôfÁ™Ïëç—S6Úﬂ0éÀ_?-ˆOÎ£m,ó-b”E¬ã	<»=≥(I2ŒƒÓÙ
!Ú“€ZlÑp:Ã$.:Ä∆i±1z√.z√Ø•¯çZO®ƒZ$Àà:$@”"^.“úƒÅíyçÛO.ìuJ{-7ƒ÷À£}ßCLnEƒxrâ‡[HÍ∞£Knÿ—Ó∂√éø©¡.∫)ÏƒÈ≠&P#‡ùŒ‰I•lT¿ã∏–∏
je®I∆9áŸﬁÙƒ1 R:î–≥√	#x⁄!ËCáèx≤)têbJTíπs&cå∏MZNA\ˆ≤Ê9-Å®P $º™∏ÂHÉ[üı&òn‰S—¥^à|Å'$ë<=¨Béá¶ƒ´rÊâ¶Vër±áJ”í˙ü>C§õ˜áÈáhæ_©y«Ÿd%º∆È=5fÛ*°ª‚\◊¸KJglêèìØ,.ê∞¸µ·(èC,LF%2û√Iª[^Ì∞;´´π*≤`{»±á,∞Çπ	°8ª@ÿ'2Mz‚£{ì@Ÿ¸–ñCœ"âõÖl!ÆG’Çd ‹»'†ÖNÇ#∑πâÖì™v<‰ÔÊ˛™ï
]∂‰é {—ï∞f”„¿û’«0ß–∏ãÈô@ x#øè∫/˛Ê‰Œâw2xiÑêX}©yå ¶õY„·-ì·eê-W±=Às»"Öπ6¶PA´Ûàºπ±XÙ•J>ï¶5l)J_î±ïı$÷Wô»÷—%EL À√)*b^¥Œ^t˚´øx…{ﬂﬂ`Ú1Ú´Áﬂ‹ÖW˙õLîß¬HŒóz‡¢´kD
=nBè<Ñ¥Ë˛vﬁ˝mG˜X%scu”∆âŒ◊çŒu/˝≤øΩíﬁbÛ,,∏®Ãï£
∫ÔﬂiY¢q‰B≥˚<|UËPô9Go;ùëLı©∂*≤fLèo,‘ß‰i·eõã‹47áaÕQ√√0\YΩäÿ‚r9ú˙";ôV™“t" ,
˝¬»≥äÅªpàæy;«f°óV
nùQQ`eÇÙuÜ•ï_∆!ÜWz1‚T©Kk	ﬂQo_! êπpkaüïì≈ìKì¡=Â±KÁ≈ΩV°ü◊t∆∏ëﬁËΩ¯¯˜òëë∏aKÂπe∂UÓ∞>Öôö—cïö⁄Hm%à6èìµß•+WN∂%ÑîÀcœ¿f§…ã(öŸ© ≈±≠#„–∑∑≠fNÂi@])„l◊∑ÕU2™UÂË2éà’R%¬⁄P…Ñ…‘o•*⁄Ê@—Éq√€Øg«˙ À˘∫Í”ü…Ã–ü'¡ê	ú≠IáÜˆ#Üê`•@ò¬—ñÚsçü!j&ÇñcÛ‚ à¶Ï¡I9â∂êAû`Ï/…¯,)∑¶eˇò°gå„`‡k√+∆CÈ"4 sã*óÆtíÆjàfF_î˛•ÎLƒàªŒs˙ôÁ∫¶”ly#O
¢‘“vAŒ3«ñØÚ◊°olÒuÿ‚Î•Äπöƒ¬¯9¢Zì)…i‹IaÚú¢ò∫›OJ˚Õ∫-È´0ÅÜåVﬁêπ¨‡G‚ôáÔ›…Û1∏H yr»îÔıÑEÕ2LêB©–y£Ó®ø¡ÜÅgz,Á÷≤∆Zc:ÂERJ‡á≤™#áã5<ÃLîP5ûmgƒ„W:Z€pΩCª]F√YãîJ0<—œ)7	ΩS}†I0ú*ƒÕf≤Ai⁄ˆdÃ˙iåt(N|ˆ¿«!Râë<ò^umS≠⁄l)EùöŒsª$KÍÎrfërÊMeÛÈÅ°•pxJ¥Ùı˛iLöêÅÖ÷·9Í8∂Ã§#ù•ø`Yêa	ÁVÓÀÖ6Hè«Éó"[2 ™ı@K∞èsK0ûë¯2†
à√-ôtﬂﬁ°`|OÜ¡àêû˚xCØËá›Â*ên—ÓS‘.ñä±öï†Aq˛ã≤QlüáEØü'XQ]â$Âl–<pS÷Ù)£%Û@H•ËC™@ì¬&'Û?aˆ≤éZSÈ§àÇ+b([ÃLk˙íßò≈É√ù∫∏*yqëá≈Œ…ïòHû-æ‚(júì; ∑‚<ª…~∑IÖπ$É–_krY'„iÀäòﬂo.ímπµsÅÄËV\¬÷‹t4€0#πlèíócÂ¨¨óÕ4π.“J1Â>Ô√:◊ëU5ET≈UÍ¢ü6‰±„¶5b_©‚]ê–<Ωî•‘r”Df“l5áÆÖõ…zÂ~ZÇ(NL™_:4í`ö≈@OPõç¥N+"ñ≈@´ÿ¸ÔÛÑÌËÚ$âGëØΩ·˘YµÍ∏Êœà˝ëlı£ò Äz⁄Ÿî˝KnB|˙L¸F◊ß8Í€ˆ$g.¥∏UdöŒ4iH3µ™Kö=÷.ÁF…eË+∫µ"ÓxAôπª∞;Œ[ƒ}RaãgÜ·î∑ü-_mÒA“‹:Êt…ﬂ–ñ>€ëﬂñ“√∑ﬁ›M5}mÒq‰ªÔıÌ/˘gA∂pOzV|‰hëUÂÇ<!ÚT••>öR}ÃÃc
6üﬂËå“që^ÎØ™˙/]™qêı"%FSs>5ò∞Ñ◊öP—¬¯*Uü∂"‘Æ%ﬂß‘∏X&õ÷eWz{pé4eÈ(ŒE\DøW»å',	 Ì„†bÏ!ôÉ–yN)∏®yŸ∆3ÜF#Ó2]Úπ-YYs#bÓt´’éÈŸ≥Ù;ÎSﬂh$¡ÒUFúùXH#ÛéeÅõ");Úì)œòËLŒáí9ó ∆Ì©9>ôˇ%ÃÇ)∫`Æπ,(∏J/	Û™ÑAs4◊≤Ë7‰)6ï EâT=a˜ƒ—™d>ÖÃÊLÎ£kËZ;˚>Ê∑-R-J”u4å?sWÕh»ß‹⁄\êOQPÉ{io®vs?◊n Ωà$"2≤SÈ$ÿÓ)YGπgÄ%wÄB}á–É‹j—¸ä€}¡c‚äºc%•ııál\≠e«ãwrü't_Ñ∆ê©‡âÃ®Úñ–NIU©°PŸiV2‰≠p£ÉÏnÀRÒ©¥1wˆGŒb9vÜä;∑ÎRBñÌEZÈÉ¿‹yYWg V°¯∏‘m◊Q`m±(w=G”<Q⁄˚≥xK`’Øä¿,˝⁄;N>Kgdèπ˜ÃÁ^ﬁøX[Âg|Q¨9/œ“ì™Lí5ÈÊ’f2¥‰<Ìo.∂ZºOïˆ%*yL¶\-o!¡’L!]|–VGu1ËGXô–w»aƒ]IHü3ÕÿJÓ~"¬€Øƒ¬ã6∫¢’òxd…cﬂÕr≈«¬™¶ã+Ò‘Wc‰ë◊t≥¢. Ÿòù_DÎ‰∂êL˝ƒÕW•§VXzõ·„F=∞[>®]ó™ﬁhË¥Û‹nò^’a[‚˘≠pÿìulwq	E≈—å(‚áÏø˝˚?˛≠cöéEÓ»ãé4±ÙÓÅ]—i‡a k	˘	O	hõÚﬂG•üî\âß¿`ëOªH¬›√:Hr¬1◊6áx 1ü‚&E≠ƒÆ«ÓMHÜÒíº¯{ W@∏”b¿UD¡-Eâ„≠õaèP9îª§¢wK~Ó%#?KŸ±7˘iIG(Z≠3OÜä!xMp]”c7óU*…∞éeï4†Ü»-)([MMıèÆ˛ÕÃ§6∞ƒ™dˇG¬[YxNÁ1wO=˙fÜ1ÉeG'™§CvBWQBÒÜùv›i&;i[Zç’¨"#‘≠uw;3˘u/ åDè‹?]äˆòπ7–œXkÁ1Ö	¸têïáæΩST%ÊÎ°™ÛÜ„8öM&^rŒ‚ˆπa≤Y`≠w@¢¨È†´t6©tn9.øa≈4◊jπLpÕSˆÙ$†U´›àg·öax—x/K–¨:k∏÷»ô¶ü≠3ÑµœÕæäj°∂äRÖJ◊ÜÁ“œ˛≤∫◊ÖË√€ŸëÖ‰äÉÇÿ¶“ì„ ¡?.hQ"‹ ÃxÈ˜wà]Zf˚´·≈˙Âr˘üµÀÂïk}‘Ô}¥÷˚hΩ˚—Fk˘«aÙÑ‰‹·[PM≈µ–ÅÉ–◊%k˜7ÿ~ ÙÚsû≤d˘ ™b¨X⁄Â 8ãDÿ˘-8E7ñaa5k•név”‚+/	â‹¿ÂìwÛ§Q)˚5Yq(¡π» Âœÿ°¢•óû_ï ≠.ÖR]ıõ@€∂¨≠†ÑY~ÍüíÅ„;l’U“?ü5h™Í˝≠Ê)ÌüeÓ[≈ìg©È•lô„CòÓ9{>	¢a—5Â‚ÕZ—¥…Â˙p‘#/jQsÚ™ˆ1∂∫é´ïË± ®Œçµ∆Ÿ|nèÆµ:ú·ﬂÜ^]ÍÁÇØ«g|]zî `ãC‹eM™!ä"Î§˝si)>.õΩI‹¬K{ìcX!™Ûk¨øÉÚ‚m›xZT√.,ä¸·;W4∫ˇÛˇ˛ø˛óøÀΩîv3·«πU«$;®N?ÂNRJM:n“#/HO‰’œÌ”™øSáçf^2$◊*_˙[f}·f√£
}>*…ñùÍJ5û∏'Âª∆Cz2ÙÄìírıZpd≤Î˙lÔ˘ÆK¸©0
÷õsÉ†H=UIî*ÚeX˙Vr?î?<ƒWÕl9úmWÑV[GÌ∂∆Àhƒp™¿„ÂÉEpµñ8±zîui∞÷ÎV+”	UŸ&°TÃ+≈_p¬j8÷n‡®ï6b|ŒØ√∞ÁpìªÀC?Kñ¡ªäÆSÏõa1¥agï´Æ≥ÆA¡I«˜DIìÑ)ÍïèŸ∫$Ë?pàëF°uü∫Ï¡u÷D5≠Ø”éH>èaÏ·íp#Zy^ï+ôy[]ﬁ¬œû ˙‹πöïRzÅ:N&Ó◊
++Ø©D l»*r!FAxq¥nî}Ï§Ù†jC•90ùZb:]=Á!‡pr˘Âæ`e3•ÂΩÈLü”mò“Ìí“∂>\ãZª>ªRﬂHc€º≠N˜á ¬ã‹è(*WÏÀ ¡⁄◊∞ÊÇW/Ëƒw8„Ÿ)∫ÎNÀ6` •ÿPSÄøt†‡UÃráI<J»á!&Kú√ùNkÕ∞âœÇãGØ:,pDù(ù9ègîrÈ~†Ê≈ ™íÅ0Ñ⁄à}≠\¢Nïêl¶,T|Z≥ä¥ƒ`€ÂÁˇûïçU|=∏ùßpÅpKüNò8∂§Ã¡?WÙ™±|‰Êe˜vrkÔRÏ~”nÅCÌÌz¬\¡m°ÅßÙû(ÊS $’6S‚IØK©àÚ,¨±êê≥DM¥»»†s®ó_=%fJIæµ8¢LÀ®≤o”≤’sCı…w∏‹ûÚ»<kÃØ"∂⁄å:Õ9(„€≈Jv\·dY•œæa‹¨∞Tí&Å√¶RIÏ<Ró/≠«)Ó$ à_Ωw°f'æ¥!æÀ≥……)=å¶3^¬IqÛh 25ÒÏ®µr
nØ$x'Dõã∂M–j33“‰˛r{Öz©≈b©xâ≤!⁄ÿ> 4ÑŒò}®ø≤∆î‰(Át¡òCΩÈú:hm+u`\ÅÕª)¸$˛7≥ ÒÀíè˙°º˙˜.d*ÆjÌ[Ì6è‡yÃÁŒ”à… ?møóëßQèöt™⁄¯ß,°KZ…].¶!¶]qÈ7Y<ÀHÖJ…£N‚¡,›ínçjñºé’`î
#∞i≤$ÜUuŸØúŸ®∆@Ê¸‰^Î‡lãÌ'=∂õd„Y¬û˘ﬂ¢;UÿQm™™0æº/€V$f¯$HSûw¯mm\”sÂ˝Ÿ∏‰rs;ó˚ó,ºmÈ–¯yœÚOiœ=⁄∞"Ê „ﬁ‚û≠∏Âdxı4Fπ)È&2îﬁt%w"Ã‚Lq¬Õm¨’Ï¡˙èÇ=(%û[D‰ lßÉxÍøü¥ÊfôÑ"?Á‚Ù¶(˜˜3—·ü—)*˛µ2H»ÜÒªa–Bd{ò.·ØaÎNO‹≥U>¯Q“‰ÈQ"~m[[2Ê˜∞º’kØvdEÎ™&AûxÈk*j%{™{)/çœ-w´lõÚì˜ıµ»%èMhÉ^_æÏYÔ≠wÿ-◊Ω[Ë˛≤kΩwó Q=s}î ÄÂ…›˙!'w›¡ØøÌ¡7`Õ}^#∂ÕGQÉ∂ì¥¸¸ùg´´´=Ò_∑J°˛”>”rv|∫¢öÀﬂö‹À=3  “˜ÈdªAÒóG˝5m∑#†m][æ\f÷õkËƒqÄ›æ.˝_{˚√øôÄ§ÎüœÄ≈ŒÄ6Ïv?]¸ÛæiQ®.1SS`ıD AX˘ñÇ~oJ{"#áîÿ™ïÜs–?ÙNÖ˚;?Í6KGù+π}•Û∫≈ƒÚÜˆ¿òQ∫·¥˙*U#?RëıÍó»Uw◊ûlÕ$∂«ö8‘ÚX™äGmJY‹dK1∫)2î;≠ø;zT¢F\´€„Z]¨!^î1\v7TÎ˙‹ìèb”9Ùä{“àØ{€PÜ÷›ÃVÃı‹äá‚Ωü∑"}\ñ˛⁄˙’7^≈-ÁëDqJ≤¢ovŒ(·h9#yﬁﬁ¬ª¯-ÿMEQ+lqK4¶ ò(&éö›≥Õ√≥úê»ûœrc©◊s`6Gˆ@ıãﬂ#.∏Çz≈SrFÁên}éa≠ù‹BEø—á>ÕÊ hA˘ç[|ödtÆ^kß¯MÓp0Ë |·FN0H¥hXˇçï;í˘ü3ÿ@ã7Õ¥M…œ-°AÎ(†`(z™k}{Ö#¯µƒ ∫((éeÅ˚≥p+m.‰)_QêÀ™ËD„ÇZΩ∂¶Vıë˛ﬁﬁ9÷¨‚,T'ﬁJ÷‚ 8q <"7è¬}‚èÊÒ5ÿç™_Ü'©~∂Í…Y\ÂúÖ∫™Ê|aèÿΩDÎ¬€*ü°w—®6åÌ˘ˇ8\D;ÓrOw<NS∂7¶ÓM”4Ï3LUÒÀñ M∑ÿPÚ•£’Ü_œct∑Upf…V/¢‘à®t_¥Û ƒÚÙ≈‡ß=•†p≥&'^‰ç|t(6õï5*>fÚbáIîLiÔ∂öQ©ke¢`≈î÷Ø2n ?’IT˘á"x{Ω†&Æ∑I⁄U˛…c-yî•Æ•m¡qØùwâ1§÷ÿTW«Ä¿Méÿ™&ÏGíã©ÃÚŸ™ZV¸Lh´6ÉÚ˘’™M?c-g:”2ã$É+›¯gãi	Çå,¥πw∏HÄ\ƒ]Âå\uï+V[.é6@U3’©iiu·‚dP¶A(ò	™¬÷úñ4âpF®öDã[ñ€ÅûπôI°aÖ ='ªgV¡ÌX˛hËßÿ&p∏~ÓÑTÜÂπjâÃ"d∆Ahû«£QËÛ	Ài÷u∫Åë$Ü“¢Oâ™î+Ä%/±°≥ê%6ëJû.H}ò≤‰µèñ)Œ ã’ﬁÍ∆À2µYπ¬Úì}f ak´ãê"Iå4™V$ÖπùS'ıŒ:ê$Yà¯ñ|B^®å˛‚üö5ØM´·Æl Bá/“ú◊¶Ì(˜PüiOy∑"Áû33õ%ï-S°œS—≈<y£89Ø… §g|À¬Ü˜ù£Q≥c§—l§ÊÁ√!à$e„[†Xewrª—.g,_R2ª4/—UÆ-Ããv5ÿ–ÍñÆb(2“¶à¡›£ˇı{t˘≤…B_(√˙¯ckäÇ"È&,yÌw_¨S±Ï:‹p)õ=d)˙`&íRÀ¢rï<]1™©‡Â	÷ÑçU√‘Å’1+o-ÒçSk≤Ôß®BÁ≈[ü{«íŸâõáÔÁ∫íw®L=R0VÂŸ÷ÜT˝c(ÏÖ)%£OÍ™Wpõwß}≠dEı¬•G∞-ódë¬•>1eRÍÏàJü8É)∞c‹4	¯⁄≥èX„Ó d˛èı‚ÆÏÍdŒºß«–I–xCEΩ¥√~s¯∞ìg˛’;Zª+:Í 5ÛFx—«⁄#—∞N’zGé&öMä!< ıÕ,¿ﬁeùëµç1‹≈§C√XƒÊ›|∂µo]ò<~ãª¡[s—¢»⁄ûÚíÖ7/“
~s„∆∏M ”wÑ¢]U–◊ûO®`Êb.üjµG~¨<Á∫ÖÁdB˝_V¸Áï6Zı›U≤õ∑\ÏÊ[x{∏œ‹—›≈ßƒÿÂ>Å]Ù\¿¿QÖy›]:ÀÍ‚(&ãË*âﬁÄ≥™;◊õpë5{≈ùE@y¶™∫®≠ÇãÜCZ[tTÈ∑´±ac5(A)t’îª®ÖÅKÓf√oS⁄—iè®rvˇÙ1∑ú\Ã#ÑÉ1£‰iîÓ>ç¬Õ¬4®ïR¨É∫C?Ì‰dã(r‘Æ7ìí5LÉƒÿC%›c¶Tîôn¯"—–r{{s;,ò¥≈¨‰k:Uü7ë’¸ç˚ é)⁄0HP¡ƒ»ñ’®$›ÜD(±\@1ÙòŒãË≈Oû√3óÏ¿Íc÷∂y·y√pª»Ú∏~t⁄S∆<ÕG¨ÏÀ¸+à)ó|@ ß‡˛ŸQ^?\"Ì#Z1∏€.J3(™´ø•ˆ@ΩˆÕÃã2J5Ï‚±ü‡µI˝÷ryô˙*ë¶/ËbÒ0ó”0Ä®<à(q}µk^ö}1b>„‚ryfèa3£ç«2;‹@KWûsFíLm-¡B,+µ‰öu‚{©>∆xä…ˇcm.8bm¿\±ª`˜ãGœ_=∫˜õWü<>⁄*÷Ê≈Kvè°à¬5ƒdkJA¢]‚‹_ß•›WJ—"ˆ(∆'I0akøãß>òäª≈Ñ66˘m◊V˘EæÑ(§≈ª :Æ˜6≈ì≈:.	Ù›Kê†äwä%]˙‹;≈Bªk]’à«‰‰¥Öé¸7læ∂ó{Y¸ËÈw1«\≈$ŸËY”·ÛhvJæpèÄ¸ z‡%Ÿ¸ªSêpó°§‹ `∫cÅRSÉ“ûúy ≠›È≠ñ°ƒ	‰cêË˜‚dZ”n2·nµ‹WÂÀJÑ(ﬁ§÷uH=Û” Ç%Å±ÿøZﬂ\eø{dÉQîÕøO—c¶°˛öD:Ñé|îF˝ıUêö°“˝æéJk◊–Ü†˚ﬁ1∫ÙË84Xa˝’’Ei£Jáﬁ Nê6oën NõúËÛ€cÒ]oË±üå˙e =§ƒîﬂÀ§5Q2∂¿ÙlpZ´ KGSﬂ:QioΩ{ê¬âBıh)tÏ˙0∫•√h˛o¬A<¡ü›^˝Î?*Ë◊¡(#c
Ñ, ⁄hF¥˚wzwÀ‡ŸkB≥∞*Ï0Æô€:dî∆ˇhñÕ ;üúá lt-;¨p∏+S!°æ£Ê Ç›gµ4wzWDú˝˛5è≥^~j2èü~y¯‡…s…HÊ∆∆LrÓ@Ú9*«Pp:5\C¡˛òÄï;J≤=à0SX&L”7ˇ3j©‰”K«3hYÏÇ-Z⁄OºÚµºzê∏/X§ŸÒcX“q⁄.†‘a˝z<ö‰Áæ:ÛµÚÃõb˛»˜πŒ∑ _§1Hó$‰CA ;ÖKA2KFA~ i”7sS›÷- ÿ(É†˛´ Ä9¬˜IÃ®Ù•Ç˙ÎOºv_úÃ"Ó÷A˚ So∂/d∂Q
h∫‹b⁄J∞Œ.y∞„ 
äßâß œ'ÒÑ=¬"˜–X‚ç¸§∑≈í±;î*ø·6õ•˛QC€VòÛù∂örûøõ@'çPi∏7‚µóxÃ´€xEΩ»TÌ•IÔqôîÑ^zl¸ã£ßOz ™ßæxÏS%ë¸2N∫èCøÁÛtÒxü⁄πÃ	U>ú¥b8ﬁTÇìÛ∂EBYcC≥<Å˜/·©§A≥8X%≥Ä∂ n◊oﬁ„˚‚bHN0Á¥ﬁ‰¸æbÃ¡f
HYkxÕﬁå˝»?E36ÇôÕËB=@˛‡‰ƒd§Øé+tô¸≤#∂—K>∆+wU≥¸V—e~ÈeöAà B±¥@»‘˜í¡¯∑3?9'î<*~´HŸ^‚Ë#ﬁíÃoî^‹”.ÈÔí€´÷ .¡,U^?R.ÿ_∆Ià$›¡ö›ñvá>–‰aº$Ê˘8b$Ì
|ÇŒî>«Òõ›·”Û.ãﬂZèE)ÂEπµ∑’ã5M◊\YxZæ(@nΩg'∑Ï,öÖ·Nˇ™=»%'ñF\Ç÷ñ™ÕŸi„/s≤øÆ%ñQ¸∂NëC˝	Y4<JMOM¬yÜ˜®π'¸ª÷‘Ö ı.*@ 4W^¨ïç‰É
[Êió4ìÎ‘lSï´€Ï\[¯]±ù‰[œàó–^‰óÙw%ßë†.÷ìLó∑îÒ`dÊ»0ﬂå|!äﬂb⁄Ukj_π–¨->Ã=/ƒb~Ëqsò {î
i
„7Ù˛Â≠>ˆ'±F8≈©@∂wBƒÉ®/>Åˇˆ$û∞Ì{¸ÇÇ&À"6¡Fß˘≤8#∫<Ü5D‚gø›ÜÍ–%n@üMÿ'¨≠Èó|D96sªj=4¯` óøô˘ÇÃ†™GÛ"'ïΩ^ #?„9°‹!ny˘•≠„¸ÿÄ"0Ãâ∏LWØ∞8íÛ‡≠MêªS~ˆ0±RHÄˇ}øÒì=/En8wÒUN-˝ëe,
$⁄∂®mπ›Ø‘~}Ûív,ﬁºÙ¢≤ÅGû∞ò≥E;l…aA¨7Œü∆0»üæg>ot¬≥¡†S:¿≤PÚ1bï„ôw«`5}äŸFÌî(Z ˝‰Á{ÛÆv‹=I€ê¿MÒ>˛∏Í‚Ôã7t©oS$Ç
UbéT÷&ﬂX¿yÛ◊‰⁄ù‰[ãªz√m∫{òÓ-êΩA÷√Á‡eì˘@?|º∂Ôüx s∂.ˇCqä≠îD`>ıO?Pƒ	úÖboÅN%®Qû˛ÑÁè.P ÌEÒõˆÚÂ◊“ãÜŸñ^‰≈).íW‰≈A˛ÿÀ∆@õŒ0ùâ£¨-_ìè—˛^Õ€◊˝ T∫Ø∑¡y˘˛íw>°‘ˆÉ0ˆä÷Æ∑]∞Ú…ÇÚ†®ÜŸ‘ ˙˛|"‹…‰÷Ãô˘~AZä˜w√I|Ê%¡âˆjCM‡±¿)Ác”)ba7 xE†néºíi°@UQßÉë∞í#†π-WóM¬/⁄04z

ú80∞PÒP_¡Pø¡ı<˘qR‹4{:*j„.(T=X0KÚ™såå·|V⁄+>ä&Ê3^níñ-/^(ÒS´ã&PLQ#+7…eı
k¯åB∫ê¶»’ºy˚B€ﬁKKÂ›lÂ…m\πÉ/wqÊVﬁ‹∆ùó¯sIîô!Ÿ)¢ÿ•∆W–^º}‚´0‹∏‹ÍÔ
Ç\⁄Ñ¯/gŸ÷)ﬂ`¢b¨⁄~0TOKqÿ©ÒUÄ™@†‹iN744î> 
”'œ Âbjä–Qà˘∫ê·W≠BÆM·–PRêq`Âºg4îØ V&°X¿Àh¯]πy‰hEí>^äPå˚ûVzìp@ïäÖ.Ü…ÛU<DUû˙(å“Ö:˝‰:,|ù–D2Ÿ˘T?Ñ© >rﬁÚÍä-—]¡¶ä’◊ÊHéΩLôöå_VB& ~Â9ThÃûáÜeƒ}Êèàé'º
Â–c®äú?Ù \ùr∆]ç∏®EY	…∫%ïxX¬®›¬˙∫'ﬁiL*7à ¢)zÑëO’Äly8BíOÃ√≥ö†"ãgØ•D|®à≠0ŸBéNÂéunG«‘0Nö™lÀ6∑$Œ≤òEƒLEXΩóÊ≈Úhf÷˘k>o2µrŒØØpïäöáX∞æƒn]9¡¨0'a¸Ñ
#:FˇG/·Í9Uc«e‘»°»!ß©HO8öÚ¨øÊG+eÊ	¢tÏcÄNu•YÛÂåãïn}të˜B1i≠ﬁW—W—Åxi_⁄b Cr(óÍE<≈/øäîQ≈!åùÌoÏœ)òË°˜&∆√úzaúÙæÆ_ 1?°$√Q¿’I/«v∞ ıQ◊|˙…Z¥'Âo	_ ´äÍ÷œı¬.É”d]º™RYŒn¸¿˘7~«<èy±√ùÄÆGu&-ÙÙÄ≤x7xÃÿ	¥B¢ƒâ"óÑÒ(’6ÙJ
>ÿ$mkôRá¶©∑Hﬂÿd]E¨H2¬nIûE/ÇÕºƒ–„å%yeππ¨"sç\AL©íS‹ª”"¡,ÑZãú˛M—Kìóò°ﬁó*}„_ØJù}˛é√T0Ú9√Ù§⁄bƒ`èx!v~L`Å{7õçf0	Æ—B/nˇòèúecüíbÖ«°‰jI∫-ä”Ê±∆∞‘Oa*Ò4J∞¯!íˆ«‚à—N:bæäû"ö—Àx∑s€ü,´h€Ó./ißM≈Û$>çô8Õ™˙*µí4óÔy.wˆµÑºZ“>6ã⁄ÎVÛñ¨[_pX:µ’Í0z4_x¡Á<"ó¯3d€|—≠CôE€b-ò5“õƒÏ%9FKÑ·
ê›¿¡gXFyFy¢(5“IΩ(U™ßJO~¯µOµ=¨!Z
òmÂ¿∂;zâœÈåi ≥úÂ…åà¿…∞HaFÁLU˛258∂"=Ç_R§ã“b∂«k•àcèI'[zâj[‰ñØ’∞T)/%™*y*?D˝r‰”ˆ xM˚mç≠“À∆ÆÀ¸É©?	0ÏßµÛœ˚,m7hk”»e®œEè (WúRi⁄%ü˚Bûä4î⁄|ÙQ—X’ÀZ§¸≤,p^≈Uõ"–—mLF∏¨…¨5%Ì Û™ÒæMrA’St¸Ù+i|©É6œ¥
…Ê’:ægÀy.k[Àzæz·^Ku_‹ÔjVßº‰ØËh•D;¢ R=ÇÏÓ¶;w†ôõFôó±ﬂûÉÑè˚ÒõHè3≤	 ™¿•@1æe≈±∂¬ƒ¢ÿ6k9,ÒáFFÈ/‚xh\Ñ3öÿÙõE˛jßÁ,}˙[GÃ"¯ë/ö˜®£ßºcb®º˛^!Èa8´Nu©}:S≤aË$g÷≥ƒÆÿ)=-_ÂzâÙv|≈î |OZ5w7Î· ?±∞∏Gõ–Ìÿ”#7ë£¸oø9|òVpauIﬂ¬ëÚs£Tã3ˇÇ˝=Gœ<∞Ü¨rßEâ∫ÿøiw≥I-ä<RxR,ÿ;˝.E»6»≥∫XÇ>Ò°œÁn<∑ƒ»‚\3ÖJÎ{¡u©"ªj)»ær^∆(9êHìı%*)IëˇOg”Ñ‰âÿ2ëR‘ªπ™oP@„=mˆq8#F†6åõÛŒ¸i3wÿˆ!¿ùzµoA∑å›då”‘¸D“±]..ó1∂L”*èY√°µ-Ωe>5ü“Ωf5OY˘—≤ä‹*-«Ó)¨,∞mL“h…r^ëWEw›€a´¶KOö‚aÏ0ñ°y±⁄+2¶´k≈6Á˙<!ÄNo˙/€*•Pq&LAB"ZrãJΩï„ËS©ÇﬂKÊﬂgK≥¬{ji	bÑùûXH«≤Hüâl<ñ´îÉMßF≠r6µ≠%3·@a*-@VP£‚Ïn0Z‰÷å‰˙ÿ7å]∂{påP#V0§¡Ñ2√{‘Í?œ&ÎÁˇØeŒzQjI`∞RÃ:2ÈÇMæ'˙<1êæ≤9¨–25…ˆîú∫5Ä€&BY.Û◊êó∏FJ-AŸ¶—6≈ùmˇ™ÿÜ/—ˆ≈˝çÒ‰ujo≥RÙtpòIƒÀˆH◊?8oéŒÀ7«Pb9Ö…¸?EAÃU:$ÿ°ì€≤R∑–å•»•rcÜ˚qz…Q0änÑ´A|†oXÈëQÍ•û≠–0 Ç“;⁄fémI!à≠®`Z?‘!˙(·>Rˇ‰_áWèYwTnp∫OÆtÇÀó Kg·Œó»˜ B`xÈÄÎJ∏†ûÆ§§Q∫Qn]+'—êg/ähê{‚⁄GFY¬>„–3¶Öc…K|ØâÕAŒw›±UDb=±[¬ÏØ[LöFnπ`}∆éΩ§Ús◊]©5Zlî©EÙ€Î"ù3ˆ˘∆V˚C˚¡ãWëóºôõÃU)Xd¸V{πµQJæ∑-Zu◊
vW
÷Ús¥Ä˙Ìíê‰ —ñeÎ˘ã-©º\ﬂîrãÂõZ•±˚3tíeS8Ÿ£x‚w–S:Ú˛›^»Ü›Îı y T’WÿΩÀ¶	◊WÆÂ)∏’¸«MäUI’ó≠Vï^çÌfJWÂ'Kyr≤÷W0QŒtg≠ÚUºPWÁÀT¶YrQ›%„!(«0âßC‘Ë◊!∏πoÏÜ"zì˚µï—ƒ]Ä¨¡jJ˝ı◊ÜÊàpì™aä!s+|Éj4”/∫ñ^èi∂˙Üö§ )Ú.Ã‡9û}ÜRïW÷πuï	\Ó»¶ºtã—wë∞rÊH{¡0¢ä('Å¶¸ ,7jf∂¶™F»ù+’RTÎz≈∏πZ:1rÖËÁÿ=≥Wè≤$ñæ–ã!-u8XÛﬂ∂Õ≈;R)≤B*ˆœ¸˚ˇ˙_˛NiÉÎŸ™€»# ä◊ÚK•åÕ"OÛqπ1≈ùï”ùïπ.≥EPä0ûä*á20kV0•hêΩ¬ê+ónuq!FÑà≥JQLÆÂu¡O)Í/üûıq©?Tíˇ⁄rÉ:ÔJÜ™kàäÏßFìπCÆlX”)[¬ñÙßÊ(‰JBkê2°∞\±‡§ÁöÿåãÛw…jîm† ñmi™qÎsnÎÌı$√ÚcmÕBÿ≤®∂ïÅËÛ(òLÅΩ√y$ZM;ßuNì∏≈ÅPsâ•RŸÂ‚UA?ß∆„`8Ù#Ö´™i¯vFCs0,$ˇã1P}2M˝2îç}oh…[õ%Ü@ñ◊•øù◊Ï:.O˘∫∫€IüiÂ,πŸ⁄ëﬁå—ëõ√∂W≤ÒÕÄ‘ì≥ãæ™f mÌ<ôè)™VX·yµû¸0ÒÁˇ3å∑£§à◊jåÎ0πÙ WÚ-ÿ†@›…pãféá‰Ç˚ò'ıëô˜Ï`SáÁ.◊±gÛÔ¶)Nl≠¡’§Ñ‘+V¨ﬁŒé„°¶ﬂÄ›h◊=g‚ãÅ«g©!/¥Ù
B°D#™ˆ≠¨jyÑÚ:ÙÜGS/∫wq˚“ÄIMÀƒlluGÆUyÌn)¬Lî@ÙˆR%ŒY¿>àRxÄﬂ≥O`%≥–˚¢¿Q	g∫>:@â•drÛ¥„Yqç√‰2∞52d¨¸Ü0‘¯¢ jJt¯/¢Èm#zzE§®-¸íÅ∏ºˇ¬ÀÀ8w¯◊>Î≈ö2xH†9À#4Ï)iÑQ@(◊Ö"eLE…Á™c(—ËatWî/hn%‡ŒWlzh€öPÂ*˘≈NÑÓIa2*ïN‹ãC÷[|4œ‰IU·Áº1ª6⁄V‡Åo¸8ﬁ`˛«0&*ì4$‡<Ñ&§Ñ-SÇÙ£¬€2:§a∂æ˝±Ã'ààá≥iUz¡Ω∏”€ƒ)£…/ú Ò˚≠‹ùè¯@ß>wCS
ì∏%#›]_sÑ±ΩgÛ˜¸·ﬁ”ï˚ª˜¥~¬ç@XW§Îj‡‘πrÁz∂˚ﬁp‰_eóµ∆⁄KÊ¬W’èqñàU7ï¡¨Y8æÛ≤Çïp¨^≠Ä‰CA¸Ø H∆+1æËo÷NÆ⁄PQÂê∞`-W˝ISk˜ŒÖvP^.d™¶Œ#4Üóπ"öRéÿKqâ}öÏ∏Fœî k:ré5µ!Ø)‹ëë]cfÎ>ˆZKU/$9Ê„”k®ÖÜ≥Ñ¢…®ï]§8›ÁZNñ…	©mvK˜oŸ~Jzõ&e!Î°ëfÁ!@‚ç˜Ÿxã}˝—å·Ú_≥À⁄∑ùµa¯ÁPﬁCÃ•B¬›’àE!‹ï…cÆ2´ƒ;”œ$–ì%Uå©ÈÏ∏∏y#”≥÷êZtrÓÏ~◊öÏë»ÄC¬/%Æ4eªtΩ¿)†ﬁ™8A'ﬁY˜/ïWø‘ÙWıÏÆΩÁªú[3®x 8Jù…Auù5Ä?7Á;ç/Ä_/äT≥ˆñWxF»≤—wW5ŸC©&≠cqπÊ¨®fy  é¡I$†Q	ö[£:Í◊(én‡’OE–ìíﬁß¶Ö˙0® ◊\ÅQï/]/T à¡SÂœeıÎ^¿ôiI/VòX5∆™FUÚiP„´TSUIŸPÿ~§±¶ì®‚Ω÷Ó0¿d8^"]©™ﬂ´cµ>ëyÄj8Ääbo≈7‹SûNÊØ{«Y£`+ﬂª÷ñk)kü¸{∞ÀÚ([=ñ∂¥øÚ€∑≥πäÏX“ÎmÆnëZÀ˝i∏∑ íÿbm∆›[ö@FÓaµªîÚ
˛‡{”H≥Gªm1¥2¸äöò»+úF*ë –"˜Î7ÅT8E¿( ›Td-ªfm”6å—,Ω‹úöã|Å?8¶ò9e∆´+°ã -+ZàøÅ/tÌ∂=Ïøø∂»7S ÙŒNÿT‰àõ˙ ∏E»H#yÆ°cµXÛ<ÒR=Î«ç„Õuª°?÷„Ërπt—‚øFfN”}çd ∆QeÓ«O˜wm±Ω›˝›£Áœû≤˝ˆ‰ÈóO÷“Q=πù5l/î¶’†$ag˛êåèYW1uﬁÂﬁﬁ«ﬁ‡5:Ñb¸iÇgﬁ∑›@œ6˝≤°Á¢<Ø)Zâ¥…®a¢Ÿ[Ì0ä;áoΩªõeñ@¥w˙˘;˝Ú˛Yê-‘Cùóº‡™bKÑì◊¿^6µóö6Yﬂ%ì∫±p¿Û‹‚U•›."ı-∫·“"74∂Ÿ›I¨—…H6Kv˙∞=^/)?4ó6ªªÀãªãHVáe·¿ÇE Ú≥Ò∫ÕÂ¡Jpd¿Ru:ûéÏ“dV•Mâè–8’≤áì~"x≈’ˆÔ,@∑ŸÂmgØŸæç >ò˜UWøw°eÈ7¶ZÑáÿ,W•H˙ûƒÖ•⁄Wn.ª°wõ<o2†JP¶Y])åÛø‹^°Ó¨qQ‡ß2ê?òí.H¸°ı¶p∆VãÿŸõ?yûÈ\TG°$ÿ"ﬂπÓ\Á°ΩY∑ˇîNˇé¸∂påâøXÃ/?Z‹ ¡Ÿ€G ı¬Bˇ∆·jî±çÕçëÌeÎ÷≤m°2ó2éLÜZ∆ërîì¸(ÜÂ¿sp“ãmô∑±iØ?Á…£DÏõÅÁu∂ÊÊÿ^dÛoàÒ7ÇÛ9CÒ÷êﬂ∞"ÎyÎ¨s1÷2˛É/AK´y–⁄—~∫£?¨M©%Ë[;ÍØ*Jˇ∂väÔ6¢î1«iÂ?lF´a›⁄—~.ÿî^Ìπµ£ˇ^∞±CJ£.ZR~T7cè—ë˜ÏÙç”%Q”Ç‚è˝!|oÈSi§7Gß»a‚⁄4äW	˘ô>Ÿßk‡π¨•íØÎ¢ªnœŒºè-¸w¡óè|ú9æ.ø-ÿ@^áºµì]tß{É8√ƒó_%‚[;‚ÀÇØˇ&»‡]¸{m ‚∏|MÜjΩÜ°˙m6ƒ –îÉÂ}%Y⁄´…UÖË!ÖèhÜ.DÒ£F °“F˜ZN§Asˇ¥k≈"S¸ª$åÔë∞bW˙õˆGÌ ï „1Ï1⁄˙&ÔÔ¡çc<ƒl˜lè˚î∑¬  ˇˇÏ]›n€H≤æœSÙh kÀ±'véÌlÇM∆^€… ¥HŸú°DÅ§g<Œú´}Ç9ó{ªè‡79O≤U’›dw≥õ§,ˇ%c!p$ä§ö›U’ıÛUï6Äá≈
*ærjn–˙ã=2Ñdàõ„3GÏ¡2Ei†ˇuÔ|ëf¡£ª∞ËZ9Œ9'Ãì
ßg•◊ﬁ#„H∆Y~⁄]sú]≈<é√∑ÏSÚ"*W*C‹áÏÖ#/öö)+ú∆%Ü…!ßSÛK—ÜÚë]$ª†ªTÒ√Q8¨◊kl9ZÜÔÉ•l%˙N∂íÅ˜kÄ— øC⁄ŒŒS”v—Nıë∂ÛH2‡äÑÏ~≈ñ^›‚Œ‡Ñ˚p∫H)Úh˚˝ÚB∏ΩRæ2mk´#FπxÄÄ¸Zv£Zv¬QEø(ñ+©6Ëí^^ˇ”BwmÌs˘πlS∫-ZS%,o¡Ï«y$≤"ƒ[äÒb8◊ƒØ8ç
KŒÛ%ä¯F¡≤ºﬂ˚∏{¿vèˆ˛ˆaóuv::ÿ⁄Ÿ¬b[Wˇo˛ˆ·Ìˆ_göÉ[THÈ#¬EæÓ·2MÑÀ=`ZZE∫.Ó	=–6"Á÷ù])€Í/Ù˝˛Sj≥ˆß~øø“_i√|›0Êù˜5H‘ˆ¢ﬁ5GgÃ:á◊“≤‘∫’FçÔº¶ÔÃes@MéòûPc›‹ÕÏ
¯3%q‰ΩÌ∏Áf;´.w≈âz.ª∑≠
– w.™⁄	÷∑
¬,»?»G>∑ËciÄWºJ(â
°>|~$‚Á0Ô]†~*°>·¡J/…wµÀ+ùZ9Ë%v˛Ì7÷j5D-πRnxâô>ŒEUám£d¶+•ÇÂ˘O¿ê≠m¬¯Àöø‚0ÖÙ‡ôJo„Aé‘.†˝`¨Tá’DGÍËÏ™Ë©˛0ØlCemƒR—áM¯è¿d¨≥¶£xH%∑÷·ˆJâ¯@ÓôÍ!ï+“ úÒ?ói@aâ¢«ˆCî :nö«I£~¬2B›æúô?XÈü≠î;‰yu∏]ø/€∂it@Å“›æ9§RÕπ´©œãØ	PÉdNÅÅq∆˝AÛÙﬁÓ∫o.CıNoï|[ŸÔóL+öC˝rß≤ƒ≤2G3Ài4Nj'C∫5^tîxôó√ﬂ{ﬁ–ãÿN“e€^≈©U«.±Oùú+DRÈÕ2F…äÃ\ˆWE&Yùs©aIÕÛtkN%∞≥mæ#WI;9NñUÖUk≥îõæZTVŒõ_,˜+^º6çë'è(7îg‡›ÏÍDsÌ Õ>ÖMiÔô∑]&f)N¡r⁄ûí,‚0DÌ6ñ” ∫+Á€ÓŒ€£≠∂∞∑Û·hØôì-(Rg˝kÚuÔ˛µùA∆3Wm)d7óƒ%“ù±&0¶®úZ§„8|AŒl-5AúÃπ?Ç∫:[kr'Œ∑ë∑ÖÆ∆(‡zON1˜ó≥•»ÿ	Û∂T∫•¯•r´öø5•V|oŸUè–ÀÀB¿◊ÅóTìÒÜôLm‚}ﬂ`ê|î‘˛dXìNsƒx<H51>`\»≠£„-]éÈˆÉ÷˝@©ΩÑ?ÁÄ˘È¡OwÄBW˘ÂöHÙjñ—Èººøwﬁìi‰%ivòôn Ùà/Ã|ÔÂ"˘$Ëq–∂˜çÅÀøhπ ◊ÇóWÛÉ3/∏F%‚u{PñpvÚñ}ì–¿Å?%–ãŒºÑmaO·©‹ó˚ÒÕ€√£´º›¶JVÔˆ˛ràˇoÔΩﬂ?ÿ:d¯Óß√Ô˙%”¢¯£_RæÓ›/iÎ∫¶7J¿ÛNÁ>=[9;˝|Ø^ õ/remÊ=më´kbÚvÙ—$∆—’øODkÙR¯´v%ˇ˚¨vÂÍ¯ï˜}’Ω¶DÏ6U,èB5Îa6*QÉΩ/ô“∏LíãlK∆˚èy˘S¬Ô†Jqh•Ôu7ÊGÂÅ∫⁄Ü„ßñaM˙ÖΩ≤l–Õ‘∏õ,U◊}◊Ä@J•ﬁ[ âµm÷%´‘"wOõH∑u™å…./R–ﬂ2ﬁY~íJ˜¸˜ôﬁC§v?ím∑QôXË"åòfﬂå‚Í«Wän!≤≤	 Æ=ı§¢Ÿ8JÇ°"Ë√HÁAÍIè<?ìü¥Éç≈ÌßUwj–%°zºìµ0≥∂#¥O@[∆èÁô,üN‡

!Û¿ÒºD2∑/Q€Û(€ƒ&í:¨8~€∞€N˝Ûó•Jπ≈äŸøÇSî¿Û¨É Î&˘aïÛù´ÿ Ÿ’Æ-oGfÈø÷¨ï€Ê>‚¸7pû‡D∆∞uz∞C·DÚÉÕ:ÜÒª˝ˇˇ¸ﬂ$ßÔxô7ˇ&N<µ‹†ã-‡äpuõæ?éÀÎ æ∑»!KÑV
E∫XÂ…$B$Á†?ØÃµ//ÍÎÉ‘<p≈óSî˘µ‹≥Nk-Ù’¨zCZíîÍ (m™–¡ú∂Ø®|m;°ëﬁVm4S◊–7ñú[ÚU›—PjïiÍ~)W/¡fFÒÎ†w
F1>ﬁ’øP'’ıC∑`É¡˚˙Ì¡˚≠v∞À„öWvˆ±J˘#0Á°¿0}wÃ…[T4≤xÛZÙ∂¶KSŸº•^ì`È)ıËçæÖ1ÁÚS€j«Áö°’qË⁄9'6¶Ûb¸•™•BºçS¬/_√ln$ëwæñP§ë|∆u#	kZ€ÓÖöŒ⁄FÎZ5´™I[˜_eßq5ÊX]–µ¿'á}ÕP
ã-"Óv£„ /%-sÄ®sºU—÷áR◊è,
u„êùñÌw∂…S∏hr˜e6¬?nçGNı≠sI´]§Ëˇ}À∂∞ÎÚzïˆÏËÆJdD+å©Qíõ¥„5ùO'çdX≠±RS?√≥Œ€v~	í,¯’cﬁqG„Ãc8K>(?{,M?Çˆ8Íc¥˝@4úhùˆŒpÓ-‚üQk
◊√Ì˙AòyÂˆÙBj ‡6&µë°À©r≥∫±EWbÓˆ√˝z˘>µ„kâÚm‘À»KKÓöÌﬂ[yœùIÊ∑2Å@â‘);’4*±∫rzB9r˜¨i‰.Ãrµ"l>˜∑hü‰ÁÉë|˘‰I<‰ç>˜««∞`R¬C√‡K]øﬁhá√E»[3O‚·+òH˛no_≈1N+ ∂:“ﬁi‡è#¸È◊a·Ò^ÊAóπ¯Ù.>âÒS?éas9Ç%√OæóyO.◊YÈó◊YJÓîÁ˘÷ÁÂ≥8Ùüõ£1ø¥çŒ¡ü[;‰´vr1\ıWãaÀ£å'?◊ûBΩ$ø˝ßœ0ﬂ3ÙT‹q˛	.õ≈am¡õœÏß¡a+∂ßãovÚ‹cqUì2Aæ„Ô’kãÆ{ÚWhyﬂ)Wm©G¥kEÑ‚‚3 ¸jú“ïÛè⁄p€°mq;˜zAö˛C0Ω~å∆Ÿ?(πö>I'ÙÆ”õ¬µ7;¸û0ñ|0“æS˛=¬‘ﬁåYÚ5T|°∫=<π#ºAóXˇøw ƒ!œ√;«Q–˝‚%√NÎUÑ;#∞>ÏõläﬁYpüíı÷,ì	‰úΩ¥πË„¶ì.i–0;ª˝~–À:Í EÓz ¡UáG“Ø√”õL™è¬îÖ6[*Œœ#∏Ω7NB-F|ìßñ7aRxC¯è“ÉHë<_>¡ﬂLdæº∆k èÑ}÷°kg¥8ê†[Ò’s˝9ﬁÇ†‰ãáÄä#óO‘ß9`÷c∂Ë◊)iñèAÚ≤aÃ^á	j0I`<ù˜Ç>>^‹Î¯«≥¨ç(´ƒO€≥Œ'ÀØ<z#\ä/^ò±PtCcƒπ›‡<L≥¥3cüíÇ∞íÁÜ˛,Ñ‰Gú˛‚|î9`Lìy+ï¿
ÜQ/{"/óÑù$ÍÄ$quZªÉ…•©Lòw}ø ˙Ükü?q¸<Á–¸˚K‰;¶ÉHıEÁ£º‰s¬ÁLy9KRPŸ\à:?[ÿû+ø‡¬¸Ä¬tF£.S“©Ã£2X#˙…∞I†|$N'„˙˙Rô≈⁄24aÎ¨ΩE≥Î«me°çI5eeIL©´©Ø•∫X†è$Yßı&üQâ@,s/˜i§cè˜!çÄÒŸ~ú∞æw'≥†$°∏∆gDA∑ï¡\ﬂ“\™k|ôÀ<m≈H‹O≤`tXJn>˙∂ ·¶çîn=°«≤F5V…Xò4gﬁâáfÃ’Ô,
è
ÿÖhUâ\Ë Axò9ùÅ~«–çàSx˙b∫’a]ﬁ?5	›Ω9Òmˆ¶©IÃ˙›—O°´›”√^≥ÿeÔà>ò†}wæå≈Äñ∫û%®ÎßÍDí
z≈âéUz/Ê∂§◊v
¡åù¨`≥B%G,?RMívëF.˘@ú&?öße`∆Åï%OìKw≠8éÔ.‚é !:}[à$Ÿ‹†-7.˝≈§,wŸ÷1Ë7˛4en+3¿Fd¥»ô–‘ˇ≤⁄7Ñ4J; ãä!‹.Cp›ãŒêc704¶£eÁNÁ“^¢A·÷§c%GÈUG}VU[qÃ*.Ûáeô∫tuXÀ)bóæ‡„ò+ﬁò‹¡1∫{Õ™eÔô”≈Ø˜¿º¶Kq€K–Áa{lÂ+€bWEI)c‡jä\ä¬‚@'’é˘ç	qÙ¿ñÈø∑√§ç9WqUVçæ≈¥™s„t±<˝QÕÙg·…iÜ˜Zjmn)ºJ>∆H$ç°∑˚t±rùwzxìÎ7_ÕΩÍ	»ÖÛ@è§Ô¡÷?¸•ÖTÉ∏ü$i––äù¥ágWøG!–C<f¡˘(§¢[T$N‡•ˆÙ¡‰¿¬\Ò §Pè∆ı∏P.î,Æçú∆	ÂJûSÕcZÇWñl⁄K[ppâ˜õV1˙≈≠ÈæE”˚]Ì√›÷Ö◊}c`c¶q2G™∫QRD·˜Ø~«˛â ÉÎÆ-+S	s8ÅΩ∆èæ"ÑÜΩ˚hkı”è@0~ágÓuÚoA]£ªΩdT! ≥ù2ÀZº¿¨Y€⁄Ï=º¯ªØj·ˆL$	⁄({u õøÈ:kÕÕÕ”øππ…bç£ØÀœft˝‚È`ù–•TBıµ.éÎ´û/Ç-å3∑8Å …+∫Œ9ÿµHúX•—!˙TYÛ¸OV=âÁﬂ /z⁄¥Vé ÖÎA@ç».
◊[	KªNXöÙ^(']¬>û…ÆS«≤£˙Ù¨ÒÒœ0ΩsƒÏ·êÀ-=¿YÜ öœFõms:-ö—HÂª%=Y≈‡U¬G–-f$•˚j-$Ω‰d÷¬zêæYTO#RÂLkS]˛Köªv£Q7:mß)¢˜\ƒcu˙b◊1v#VÖÙ˚1˚8Bÿ&joÏU|ÆëÒÖπÁó\ú&4«ê©Ö«¨ö‡ï	¡1ÂÃß\aÄXßDµñ”“
á∑£* …üñWÛeé?Œùã ˝™Ÿ¨cÑ,R P/%5!')•°m®—çÌ”†˜◊ƒ	°ØÎ9¬ùái·E%:±”0eW¶ÿï”À+º˚ﬁ6–â]64$…[•Ò◊^tı˚,(#õö≠\yº˘ìEô†"{“y§0ÍA¿¿1jI√ﬂ§pI0 ∫Á˘WˇÄM6'4%–®ˆéìÈ?òèfFìÃøÜm[Y`M~ÑSó
ƒGNΩEJÖ2üÀ5ëxÎ∆F[®i*›⁄‚◊€¿∫ õ¨¶$As ÆoCÑUur`¨xÖÈT¶_nÊ	*†- }éç∫ã†/°v≤ ÉãÔﬁh¯AÑ⁄9e\£˜·ß˘ùˆùMÿDU‹ÃäÔ‰ÓúÕü”¸Y&reÜPa“îŒµ¶Ë.€ÇΩas√ò∫¬7Pe›»mÑ∑≠a©íly©@§SºüÏ–+Ö˝ùA'ÊÃ-Ì-‘ˆ1Ó]˝ãÉy˙‹4ÈsLe—JÌ—ò<Ë„"∆…≈zp2ÜôÅ]…Ñ˛‘ãj;>aFâÔπU)˛65©%rjîäPπæEw±*PVÁ—ΩÎNπÁX:‘Ω;RúıÄ\ »à_£aOÈÇ3PˇFÒ–'á1g¨ä·©kËNïã1 úy+?r’™b∞H™5›ÕdGaÆX¿◊â—ío?üIòßœÁÎ•vÿp#*B#ìÏCKE‹¯FTÀ∑‹UR∑_©⁄OÉÌj„ Ë=ûniäˆÊ6ıwâŸ±Lç∂πõÿ7r∏Õ7∫ch\ˆ}Zﬁáßa˘d?ºÕ#8G;v‰vBË ‹áπÍsW{…ÿKÌ ˛0§7K±ÃKä8'πo¯E»°v∏ïqÓ„nt¿ŒH0c˜ÀQûWP˜å•ÅZ)¢’≥¬iê¬>à”å{dêO5*•Ë≠™fWh´?√˛g’XánçıNTTélúRÃ¿ﬂgÂ^p≥≤≈*S	[äNπ
Ü=π£BA(9ÕMªÌ}0≥1°Öñm8»*Nï%TP/µO”{âO1·¡ä•ÇÔ√z°√xõÓv3|n7‚Ûkm* ÑTÈ*ÑÚ#e≤z60Tx.ÙK–≥®YÑs1ëvåzyÒ∫‹ﬂ	2/åRl+·ó Ÿ5q‡—˛∑“»è˜¥R/u9iñk]4•-s6™5£„ñN•µ€•I∆Õ0˜¯ÿRtRÍ’>wQRneùåOµ˜-ç
\ôJñÿÂ«úö~]\Y”∑•¡Ìãgiî˙f©U†EÖ∆√ê’üiï]‹ñ≤;¸Â5Ÿ(ÀÛœx¢úQuI–£$ }¥÷µjîñ;›“ìGW¨â‘™»Ç´Òﬁæt~oπ<˘ä‘¬¡ú)xd}«S%ù±∑7M5Ó›[¶]{¢¯SΩïÂaÆùÉæÿµÂØﬂd‹§àúTÄF⁄æ?ˇ˛˝<BD⁄Ó⁄-≈´ÛI´ˆá“f3Y»cÖùßÎJÂ«§ñ„8XHÙî˛6õ≈I‚*’ƒj9dQ:∞¸%œW;àøîtçÂœ¨;Ê21'»:W∞n∑p)Ô\U§fG‰¡G‚™zÎåqÃª‘ﬂ»ê"PYµ1€ﬁ˙i{˜6‡÷êhîÂ˛F? _•'\õ∂¨ﬂkW=®w¬π‹p%Ã€7Óà[≤TÀµ2÷ƒŒ∏fÓ∏âíMm’õ	Ym˘^ë8l˘ﬁSÔ8
¸Z‚¢çnÃê#G)LJaµ!G9¢uaßÁÙ*—UG+TÁÜ TûæHh_ìˆ¬dH˝kçÊjR«≥⁄*é‚≈e¬sh‘†±8Z’ˆtì„D9°‹”kºà»C—pŸ®PIäéL¯¶0‡R*|#JD∆¿[û“∂"n)óÎÇcÏ@d_îìÈ+âË>…Ä+!çI@’)Ù ú£ı†≠SÌò~Ù`ç4◊SÉ≥™Ö{ªkÆÜÍxÿÁ±Æ≥Z=ß#´&h”©U«ëÆ§∫√-äÖ§nOuµû+Û[VnÂy@u∞∞≥/,Ié≤¯$Ò˙§-*9*§∑À.ä
Ü†Ã≠Q~^ˇ  ˇˇ "“qC