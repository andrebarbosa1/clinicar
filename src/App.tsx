/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Search, 
  Filter,
  Calendar,
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
  MessageSquare,
  Cpu,
  Upload,
  Menu,
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
  Heart,
  ShieldCheck,
  ChevronDown
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
import { format, parseISO, isToday, startOfMonth, subMonths, isWithinInterval, differenceInYears, isValid, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MOCK_DATA } from './mockData';
import { DentalRecord } from './types';
import { cn, formatCurrency, formatPercent } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
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

const OPENING_HOUR = "08:00";
const CLOSING_HOUR = "17:00";

const getSystemInitialDate = () => {
    const now = new Date();
    if (format(now, 'HH:mm') >= CLOSING_HOUR) {
        return format(addDays(now, 1), 'yyyy-MM-dd');
    }
    return format(now, 'yyyy-MM-dd');
};
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// --- SECURITY UTILS ---
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
  LOCKOUT_TIME: 60 * 1000, // 1 minute

  getLockoutStatus: () => {
    const lock = localStorage.getItem(SecurityUtils.BRUTE_FORCE_KEY);
    if (!lock) return { isLocked: false, remaining: 0 };
    
    const { timestamp, attempts } = JSON.parse(lock);
    const now = Date.now();
    const elapsed = now - timestamp;

    if (attempts >= SecurityUtils.MAX_ATTEMPTS && elapsed < SecurityUtils.LOCKOUT_TIME) {
      return { isLocked: true, remaining: Math.ceil((SecurityUtils.LOCKOUT_TIME - elapsed) / 1000) };
    }

    if (elapsed >= SecurityUtils.LOCKOUT_TIME) {
      localStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
      return { isLocked: false, remaining: 0 };
    }

    return { isLocked: false, remaining: 0, attempts };
  },

  recordAttempt: (success: boolean) => {
    const status = SecurityUtils.getLockoutStatus();
    if (success) {
      localStorage.removeItem(SecurityUtils.BRUTE_FORCE_KEY);
    } else {
      const attempts = (status.attempts || 0) + 1;
      localStorage.setItem(SecurityUtils.BRUTE_FORCE_KEY, JSON.stringify({
        timestamp: Date.now(),
        attempts
      }));
    }
  }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling to avoid connection timeouts in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Connection test as required by integration guidelines
async function testConnection() {
  try {
    // Only attempt the connection test if we're in a browser environment
    if (typeof window !== 'undefined') {
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      console.log("Firestore connection established successfully.");
    }
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore connection failure: Please check your Firebase configuration or internet connection.");
    } else {
      console.warn("Firestore connection test completed with status:", error);
    }
  }
}
testConnection();

// Configure Persistence
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence error:", err);
});

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
  { id: '3', name: 'Mariana Lima', role: 'Recepcionista', modules: 'Agenda, Pacientes', username: 'mariana', password: '123', email: 'mariana@clinica.com' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [data, setData] = useState<DentalRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [users, setUsers] = useState<any[]>(INITIAL_USERS);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPublicBooking, setIsPublicBooking] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');
  const [subPage, setSubPage] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientDetail, setSelectedPatientDetail] = useState<any | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [filterProcedure, setFilterProcedure] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPayment, setFilterPayment] = useState<string>('Todos');
  const [filterDentista, setFilterDentista] = useState<string>('Todos');
  const [searchPatient, setSearchPatient] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingPatientEmail, setEditingPatientEmail] = useState<{patientName: string; appointmentId: string} | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfUse, setShowTermsOfUse] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('odonto_cookie_consent') === 'true';
  });
  const [clinicName, setClinicName] = useState('OdontoDash');

  const hasModule = React.useCallback((moduleName: string) => {
    if (!currentUser) return false;
    // Admin always has all access
    if (currentUser.role === 'Admin') return true;
    
    // Explicit module check
    const userModules = (currentUser.modules || '').split(',').map((m: string) => m.trim().toLowerCase());
    
    // Safety: Recepcionista cannot access Financeiro or Administração even if misconfigured
    if (currentUser.role === 'Recepcionista' && (moduleName.toLowerCase() === 'financeiro' || moduleName.toLowerCase() === 'administração')) {
      return false;
    }
    
    return userModules.includes(moduleName.toLowerCase());
  }, [currentUser]);

  React.useEffect(() => {
    if (!isAuthReady) return;

    console.log("[DataSync] Iniciando monitoramento de dados...", { isAuthenticated, role: currentUser?.role, name: currentUser?.name });

    // 2.1 Users sync (Always active if authenticated or about to be)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
      if (u.length === 0) {
        setUsers(INITIAL_USERS);
      } else {
        setUsers(u);
        const sessionUser = JSON.parse(localStorage.getItem('odonto_session') || '{}');
        const selfId = currentUser?.id || sessionUser?.id;
        if (selfId) {
          const updatedSelf = u.find(user => user.id === selfId);
          if (updatedSelf) {
            if (updatedSelf.modules !== currentUser?.modules || updatedSelf.role !== currentUser?.role || updatedSelf.name !== currentUser?.name) {
              console.log("[DataSync] Perfil do usuário atualizado, sincronizando estado local...");
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

    if (isAuthenticated && currentUser && currentUser.name) {
      const role = (currentUser.role || '').toLowerCase();
      
      // 2.2 Patients Query
      let pQuery;
      if (role === 'dentista') {
        pQuery = query(collection(db, 'patients'), where('dentistaResponsavel', '==', currentUser.name));
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

      // 2.3 Records Query
      let rQuery;
      if (role === 'admin' || role === 'recepcionista' || hasModule('Agenda') || hasModule('Financeiro')) {
        rQuery = collection(db, 'records');
      } else if (role === 'dentista') {
        rQuery = query(collection(db, 'records'), where('dentista', '==', currentUser.name));
      }

      if (rQuery) {
        setIsLoadingData(true);
        unsubRecords = onSnapshot(rQuery, (snapshot) => {
          const records = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DentalRecord));
          console.log(`[RecordsSync] ${records.length} registros carregados.`);
          setData(records);
          setIsLoadingData(false);
        }, (err) => {
          console.error("Records sync error:", err);
          setIsLoadingData(false);
        });
      }

      // 2.4 Documents Query
      let dQuery;
      if (role === 'admin' || role === 'recepcionista' || hasModule('Agenda')) {
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
    } else {
      setIsLoadingData(false);
    }

    return () => {
      unsubUsers();
      unsubPatients();
      unsubRecords();
      unsubDocs();
    };
  }, [isAuthReady, isAuthenticated, currentUser?.id, currentUser?.role, currentUser?.name]);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'clinic'), (docSnap) => {
      if (docSnap.exists()) {
        setClinicName(docSnap.data().clinicName || 'OdontoDash');
      }
    }, (error) => {
      console.warn("Settings sync error (clinicName):", error);
    });
    return unsub;
  }, []);

  const procedures = useMemo(() => ['Todos', ...Array.from(new Set(data.map(r => r.procedimento)))], [data]);
  const statuses = ['Todos', 'Realizado', 'Agendado', 'Pendente', 'Cancelado'];
  const paymentStatuses = ['Todos', 'Pago', 'Pendente', 'Atrasado'];
  const doctorsList = useMemo(() => ['Todos', ...Array.from(new Set(users.filter(u => u.role === 'Dentista' || u.role === 'Admin').map(u => u.name)))], [users]);

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
      return matchesProcedure && matchesStatus && matchesPayment && matchesDentista && matchesSearch;
    });
  }, [filteredRecords, filterProcedure, filterStatus, filterPayment, filterDentista, searchPatient]);

  // Seeding Logic (Optimized to avoid quota drain)
  React.useEffect(() => {
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
              
              // For ID '1' (ana.admin), we ALWAYS overwrite to ensure credentials are correct
              if (initialUser.id === '1') {
                const userSnap = await getDoc(userRef);
                console.log(`FORCING update for admin: ${initialUser.name}`);
                await setDoc(userRef, {
                  ...initialUser,
                  updatedAt: new Date().toISOString(),
                  createdAt: userSnap.exists() ? (userSnap.data()?.createdAt || new Date().toISOString()) : new Date().toISOString()
                }); 
              } else if (!seedFlag) {
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                  console.log(`Seeding initial user: ${initialUser.name}`);
                  await setDoc(userRef, {
                    ...initialUser,
                    createdAt: new Date().toISOString()
                  });
                }
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
        console.log("Cleaning up session - no Firebase user found");
        localStorage.removeItem('odonto_session');
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
      
      setIsAuthReady(true);
    });

    return () => unsubAuth();
  }, []);


  // Notifications Listener
  React.useEffect(() => {
    if (!currentUser) return;
    console.log("Iniciando monitoramento de notificações...");
    const userId = currentUser.id || currentUser.uid || currentUser.firebaseUid;
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

    const record: DentalRecord = {
      id: `rec-new-${Date.now()}`,
      data: newAppt.data,
      horario: newAppt.horario || '',
      paciente: newAppt.paciente,
      procedimento: newAppt.procedimento || 'Avaliação',
      dentista: newAppt.dentista,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      valor: Number(newAppt.valor) || 0,
    };

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
        // The notification listener in App already uses where('userId', '==', currentUserId)
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
    const docData = {
      id,
      ...newDoc,
      dentista: currentUser?.name || newDoc.dentista || newDoc.dentistName || 'Administrador',
      createdAt: new Date().toISOString()
    };

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
    const user = {
      id,
      name: newUser.name,
      role: newUser.role,
      modules: newUser.modules || (newUser.role === 'Admin' ? 'Todos' : (newUser.role === 'Dentista' ? 'Dashboard, Agenda, Pacientes' : 'Agenda, Pacientes, Financeiro')),
      username: newUser.username || (newUser.name || "user").toLowerCase().replace(' ', '.'),
      password: newUser.password || '123',
      email: newUser.email || '',
      phone: newUser.phone || '',
      createdAt: new Date().toISOString()
    };
    
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
      await updateDoc(userRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
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
    const dateFormatted = record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), "dd/MM") : "N/D";
    const message = `Olá ${record.paciente}, aqui é da Clínica Odontológica. Confirmando sua consulta de ${record.procedimento} para o dia ${dateFormatted}${timeStr} com ${record.dentista}. Podemos confirmar?`;
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

      // 1. Update Firestore - Using setDoc with merge to ensure it works even if doc wasn't found (seeding issues)
      await setDoc(doc(db, 'records', recordId), {
        status: 'Cancelado'
      }, { merge: true });

      // 2. Clear state and refresh (Notifying via bell is handled by its own listener)
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
      // 1. Update record status
      await setDoc(doc(db, 'records', recordId), {
        status: 'Concluído'
      }, { merge: true });

      // 2. Update doctor status
      const doctor = users.find(u => u.name === record.dentista);
      if (doctor) {
        await setDoc(doc(db, 'users', doctor.id), {
          availability: 'disponivel',
          currentPatient: null
        }, { merge: true });
      }
    } catch (e) {
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
  };

  const handleLogout = () => {
    localStorage.removeItem('odonto_session');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActivePage('Dashboard');
    setSubPage(null);
  };

  const handleUpdateClinicName = async (newName: string) => {
    try {
      await setDoc(doc(db, 'settings', 'clinic'), {
        clinicName: newName,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/clinic');
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

  if (isPublicBooking) {
    return (
      <>
        <PublicBookingView 
          onBack={() => setIsPublicBooking(false)} 
          users={users} 
          data={data} 
          onPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onTerms={() => setShowTermsOfUse(true)}
          clinicName={clinicName}
        />
        {renderLegal()}
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginView 
          users={users} 
          onLogin={handleLogin} 
          onOpenBooking={() => setIsPublicBooking(true)} 
          onPrivacyPolicy={() => setShowPrivacyPolicy(true)}
          onTerms={() => setShowTermsOfUse(true)}
          clinicName={clinicName}
        />
        {renderLegal()}
      </>
    );
  }

  const renderContent = () => {
    if (subPage === 'Prontuario' && activePage === 'Pacientes' && selectedPatientId) {
      return (
        <MedicalChartView 
          patientName={patients.find(p => p.id === selectedPatientId)?.name || selectedPatientId} 
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
          patients={patients}
          documents={documents.filter(d => d.patientName === selectedPatientId || d.patientId === selectedPatientId || (selectedPatientId && d.patientName === patients.find(p => p.id === selectedPatientId)?.name))}
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
          patients={patients} 
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
          patients={patients}
          onSave={handleUpdateAnamnesis}
          onBack={() => setSubPage('Prontuario')}
          patientId={selectedPatientId}
        />
      );
    }
    if (subPage === 'Cadastrar' && activePage === 'Pacientes') {
      return <PatientFormView patients={patients} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'Editar' && activePage === 'Pacientes' && selectedPatientId) {
      return <PatientFormView isEdit patientId={selectedPatientId} patients={patients} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'NovoAgendamento' && activePage === 'Agenda') {
      return <AppointmentFormView patients={patients} data={filteredRecords} users={users} onSave={handleCreateAppointment} onBack={() => setSubPage(null)} />;
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
              onSendWhatsApp={handleWhatsAppReminder} 
              onSendReminder={handleSendManualReminder} 
              canSeeFinancials={canSeeFinancials}
            />
          </div>
        );
      case 'Retorno':
        return <RecallView data={data} clinicName={clinicName} />;
      case 'Documentos':
        return <DocumentsView data={data} users={users} currentUser={currentUser} clinicName={clinicName} />;
      case 'Pacientes':
        return (
          <PatientsView 
            data={filteredData} 
            patients={patients}
            onOpenChart={(id) => { setSelectedPatientId(id); setSubPage('Prontuario'); }}
            onOpenEdit={(id) => { setSelectedPatientId(id); setSubPage('Editar'); }}
            onDelete={(id) => {
              const p = patients.find(pat => pat.id === id);
              if (p) setPatientToDelete(p);
            }}
            currentUserRole={currentUser?.role}
            canSeeFinancials={canSeeFinancials}
            onAdd={() => setSubPage('Cadastrar')}
            onViewDetail={(p) => {
              const fullInfo = patients.find(pat => pat.name === p.name);
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
        return canAccessFinance ? <FinanceView data={filteredData} patients={patients} onUpdatePayment={handleUpdatePaymentStatus} /> : <div className="p-8 text-slate-400">Acesso restrito ao Financeiro.</div>;
      case 'Equipe':
        return <TeamView 
          data={filteredData} 
          users={users} 
          currentUser={currentUser} 
          onViewAgenda={(doctorName) => {
            setFilterDentista(doctorName);
            setActivePage('Agenda');
          }}
          onDeleteUser={handleDeleteUser}
        />;
      case 'Administração':
        return canAccessAdmin ? (
          <AdminView 
            users={users} 
            onAddUser={handleCreateUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
            clinicName={clinicName}
            onUpdateClinicName={handleUpdateClinicName}
            onResetDatabase={handleResetDatabase}
          />
        ) : (
          <div className="p-8 text-slate-400">Acesso restrito à Administração.</div>
        );
      default:
        return <DashboardView filteredData={filteredData} onSendWhatsApp={handleWhatsAppReminder} onSendReminder={handleSendManualReminder} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
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

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 lg:hidden text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-cyan rounded flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight hidden xs:block">{clinicName} <span className="text-brand-cyan font-normal">Analytics</span></h1>
          </div>
          
          {currentUser && (
            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 uppercase">
                {currentUser.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700">{currentUser.name}</span>
                <span className="text-[9px] uppercase font-bold text-brand-cyan tracking-tighter">{currentUser.role}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* RealTime Clock - Topo */}
          <div className="hidden sm:flex items-center mr-2">
            <RealTimeClock />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {hasModule('Dashboard') && (
              <RibbonItem 
                icon={<LayoutDashboard className="w-4 h-4" />} 
                label="Dashboard" 
                active={activePage === 'Dashboard'} 
                onClick={() => { setActivePage('Dashboard'); setSubPage(null); }}
              />
            )}
            {hasModule('Pacientes') && (
              <RibbonItem 
                icon={<Users className="w-4 h-4" />} 
                label="Pacientes" 
                active={activePage === 'Pacientes'} 
                onClick={() => { setActivePage('Pacientes'); setSubPage(null); }}
              />
            )}
            {hasModule('Agenda') && (
              <RibbonItem 
                icon={<Calendar className="w-4 h-4" />} 
                label="Agenda" 
                active={activePage === 'Agenda'} 
                onClick={() => { setActivePage('Agenda'); setSubPage(null); }}
              />
            )}
            {hasModule('Retorno') && (
              <RibbonItem 
                icon={<RotateCcw className="w-4 h-4" />} 
                label="Retorno" 
                active={activePage === 'Retorno'} 
                onClick={() => { setActivePage('Retorno'); setSubPage(null); }}
              />
            )}
            {hasModule('Documentos') && (
              <RibbonItem 
                icon={<FileText className="w-4 h-4" />} 
                label="Documentos" 
                active={activePage === 'Documentos'} 
                onClick={() => { setActivePage('Documentos'); setSubPage(null); }}
              />
            )}
            {hasModule('Financeiro') && (
              <RibbonItem 
                icon={<DollarSign className="w-4 h-4" />} 
                label="Financeiro" 
                active={activePage === 'Financeiro'} 
                onClick={() => { setActivePage('Financeiro'); setSubPage(null); }}
              />
            )}
            {hasModule('Equipe') && (
              <RibbonItem 
                icon={<Stethoscope className="w-4 h-4" />} 
                label="Equipe" 
                active={activePage === 'Equipe'} 
                onClick={() => { setActivePage('Equipe'); setSubPage(null); }}
              />
            )}
            {hasModule('Administração') && (
              <RibbonItem 
                icon={<Activity className="w-4 h-4" />} 
                label="Adm" 
                active={activePage === 'Administração'} 
                onClick={() => { setActivePage('Administração'); setSubPage(null); }}
              />
            )}
          </nav>

          <div className="w-px h-6 bg-slate-100 mx-1 shrink-0" />
          
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-brand-cyan transition-colors cursor-pointer relative group",
                  showNotifications ? "border-brand-cyan text-brand-cyan" : "text-slate-400"
                )}
              >
                <Bell className={cn(
                  "w-4 h-4 transition-transform group-hover:rotate-12",
                  notifications.some(n => !n.read) && "animate-[bell-ring_1s_infinite]"
                )} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white ring-2 ring-rose-500/20" />
                )}
              </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-[60]"
                >
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Notificações</h3>
                    <span className="text-[9px] bg-brand-cyan text-white px-1.5 rounded-full">{notifications.filter(n => !n.read).length} Novas</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-300">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] uppercase font-bold tracking-tighter">Nenhuma notificação</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={async () => {
                            if (!notif.read) {
                              await setDoc(doc(db, 'notifications', notif.id), { read: true }, { merge: true });
                            }
                          }}
                          className={cn(
                            "p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group",
                            !notif.read ? "bg-cyan-50/20" : ""
                          )}
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-all",
                              !notif.read ? "scale-125 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "opacity-30",
                              notif.type === 'warning' ? "bg-amber-500" : 
                              notif.type === 'success' ? "bg-emerald-500" : 
                              "bg-brand-cyan"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-[11px] leading-tight mb-1 transition-colors",
                                !notif.read ? "text-slate-900 font-bold" : "text-slate-500"
                              )}>
                                {notif.message}
                              </p>
                      <p className="text-[9px] text-slate-400 font-medium">
                                {notif.createdAt && isValid(parseISO(notif.createdAt)) ? format(parseISO(notif.createdAt), 'HH:mm - dd MMM', { locale: ptBR }) : 'Agora'}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-1 h-1 bg-brand-cyan rounded-full mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button 
                      onClick={async () => {
                        const batch = notifications.filter(n => !n.read);
                        for (const n of batch) {
                          await setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true });
                        }
                      }}
                      className="w-full py-2.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-brand-cyan hover:text-white transition-colors"
                    >
                      Marcar como lidas
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white shadow-2xl z-[101] lg:hidden flex flex-col pt-20"
            >
              <div className="px-6 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 uppercase">
                  {currentUser.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">{currentUser.name}</span>
                  <span className="text-[10px] uppercase font-bold text-brand-cyan tracking-widest">{currentUser.role}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 space-y-2">
                {hasModule('Dashboard') && <MobileNavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => { setActivePage('Dashboard'); setIsMenuOpen(false); }} />}
                {hasModule('Pacientes') && <MobileNavItem icon={<Users className="w-5 h-5" />} label="Pacientes" active={activePage === 'Pacientes'} onClick={() => { setActivePage('Pacientes'); setIsMenuOpen(false); }} />}
                {hasModule('Agenda') && <MobileNavItem icon={<Calendar className="w-5 h-5" />} label="Agenda" active={activePage === 'Agenda'} onClick={() => { setActivePage('Agenda'); setIsMenuOpen(false); }} />}
                {hasModule('Retorno') && <MobileNavItem icon={<RotateCcw className="w-5 h-5" />} label="Retorno" active={activePage === 'Retorno'} onClick={() => { setActivePage('Retorno'); setIsMenuOpen(false); }} />}
                {hasModule('Documentos') && <MobileNavItem icon={<FileText className="w-5 h-5" />} label="Documentos" active={activePage === 'Documentos'} onClick={() => { setActivePage('Documentos'); setIsMenuOpen(false); }} />}
                {hasModule('Financeiro') && (
                  <MobileNavItem icon={<DollarSign className="w-5 h-5" />} label="Financeiro" active={activePage === 'Financeiro'} onClick={() => { setActivePage('Financeiro'); setIsMenuOpen(false); }} />
                )}
                {hasModule('Equipe') && <MobileNavItem icon={<Stethoscope className="w-5 h-5" />} label="Equipe" active={activePage === 'Equipe'} onClick={() => { setActivePage('Equipe'); setIsMenuOpen(false); }} />}
                {hasModule('Administração') && (
                  <MobileNavItem icon={<Activity className="w-5 h-5" />} label="Administração" active={activePage === 'Administração'} onClick={() => { setActivePage('Administração'); setIsMenuOpen(false); }} />
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sair do Sistema
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Filters Bar */}
      <nav className="bg-slate-50 border-b border-slate-200 px-4 md:px-6 py-2 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 sticky top-[53px] md:top-[61px] z-40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar paciente..."
              className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-brand-cyan outline-none w-full md:w-48 shadow-sm"
              value={searchPatient}
              onChange={(e) => setSearchPatient(SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 100))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider hidden xs:inline">Proc:</span>
            <select 
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none flex-1 md:min-w-[120px] cursor-pointer shadow-sm"
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value)}
            >
              {procedures.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider hidden xs:inline">Status:</span>
            <select 
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none flex-1 md:min-w-[120px] cursor-pointer shadow-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider hidden xs:inline">Fin:</span>
            <select 
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none flex-1 md:min-w-[120px] cursor-pointer shadow-sm"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {(currentUser?.role === 'Admin' || hasModule('Agenda') || hasModule('Pacientes')) && (
            <div className="flex items-center gap-2 flex-1 md:flex-none">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider hidden xs:inline">Médico:</span>
              <select 
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none flex-1 md:min-w-[120px] cursor-pointer shadow-sm"
                value={filterDentista}
                onChange={(e) => setFilterDentista(e.target.value)}
              >
                {doctorsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="p-4 md:p-6 lg:p-8 space-y-6 max-w-(--breakpoint-xl) mx-auto w-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer 
        onPrivacyPolicy={() => setShowPrivacyPolicy(true)} 
        onTerms={() => setShowTermsOfUse(true)} 
      />

      {renderLegal()}
    </div>
  );
}

function RecallView({ data, clinicName }: { data: DentalRecord[], clinicName: string }) {
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
        {recallList.map((p) => (
          <div key={p.name} className="bg-white border border-slate-200 p-5 rounded-2xl hover:shadow-md transition-all group">
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
            
            <button 
              onClick={() => {
                const msg = encodeURIComponent(`Olá ${p.name}, aqui é da ${clinicName}! Notamos que faz ${p.monthsAway} meses desde sua última limpeza. Vamos agendar seu retorno?`);
                window.open(`https://wa.me/5511999999999?text=${msg}`, '_blank');
              }}
              className="w-full py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chamar no WhatsApp
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsView({ data, users, currentUser, clinicName }: { data: DentalRecord[], users: any[], currentUser: any, clinicName: string }) {
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
          <div className="text-center border-b-2 border-slate-100 pb-6 mb-8">
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">
              {docType === 'Receita' ? 'Receituário Odontológico' : 'Atestado de Comparecimento'}
            </h1>
            <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase">{clinicName} • CRO-SP 123456</p>
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

function RibbonItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-4 py-2 gap-1 border-b-2 transition-all group min-w-[80px] cursor-pointer",
        active 
          ? "border-brand-cyan bg-cyan-50/30 text-brand-cyan" 
          : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      <div className={cn(
        "transition-transform duration-200",
        active ? "scale-110" : "group-hover:scale-110"
      )}>
        {icon}
      </div>
      <span className="text-[9px] uppercase font-bold tracking-widest">{label}</span>
    </button>
  );
}

function DashboardView({ 
  filteredData,
  onSendWhatsApp,
  onSendReminder,
  canSeeFinancials = true
}: { 
  filteredData: DentalRecord[];
  onSendWhatsApp: (record: DentalRecord) => void;
  onSendReminder: (record: DentalRecord) => void;
  canSeeFinancials?: boolean;
}) {
  // Metrics
  const metrics = useMemo(() => {
    const totalValue = filteredData.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
    const uniquePatients = new Set(filteredData.map(r => r.paciente)).size;
    const realized = filteredData.filter(r => r.status === 'Realizado').length;
    const scheduled = filteredData.filter(r => r.status === 'Agendado').length;
    
    const ticketMedio = uniquePatients > 0 ? totalValue / uniquePatients : 0;
    const taxaConversao = (realized + scheduled) > 0 ? realized / (realized + scheduled) : 0;

    return {
      totalValue,
      uniquePatients,
      ticketMedio,
      taxaConversao,
      realized,
      pending: filteredData.filter(r => r.status === 'Pendente').length
    };
  }, [filteredData]);

  // Chart Data: Monthly Billing
  const monthlyData = useMemo(() => {
    const months: { [key: string]: number } = {};
    filteredData.slice(0).reverse().forEach(r => {
      if (r.data && isValid(parseISO(r.data))) {
        const month = format(parseISO(r.data), 'MMM', { locale: ptBR });
        months[month] = (months[month] || 0) + r.valor;
      }
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Chart Data: Productivity by Dentist
  const dentistProductivity = useMemo(() => {
    const dentists: { [key: string]: number } = {};
    filteredData.forEach(r => {
      dentists[r.dentista] = (dentists[r.dentista] || 0) + r.valor;
    });
    return Object.entries(dentists).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Chart Data: Procedure Distribution
  const procedureDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredData.forEach(r => {
      counts[r.procedimento] = (counts[r.procedimento] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Upcoming appointments (simulated from filteredData based on status 'Agendado' and date)
  const upcomingAppointments = useMemo(() => {
    return filteredData
      .filter(r => (r.status === 'Agendado' || r.status === 'Pendente') && r.data && isValid(parseISO(r.data)) && isToday(parseISO(r.data)))
      .sort((a, b) => {
        const dateA = parseISO(a.data);
        const dateB = parseISO(b.data);
        return dateA.getTime() - dateB.getTime();
      });
  }, [filteredData]);

  const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {canSeeFinancials ? (
          <>
            <MetricCard 
              label="Faturamento Total" 
              value={formatCurrency(metrics.totalValue)} 
              description="Período selecionado"
              trend={12.5}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <MetricCard 
              label="Ticket Médio" 
              value={formatCurrency(metrics.ticketMedio)} 
              description="Cálculo: Valor / Pacientes"
              trend={0}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </>
        ) : (
          <>
            <MetricCard 
              label="Agendamentos Hoje" 
              value={upcomingAppointments.length.toString()} 
              description="Pacientes marcados para hoje"
              trend={5.2}
              icon={<Calendar className="w-4 h-4" />}
            />
            <MetricCard 
              label="Pacientes Atendidos" 
              value={metrics.uniquePatients} 
              description="Pacientes únicos no período"
              trend={-2.1}
              icon={<Users className="w-4 h-4" />}
            />
          </>
        )}
        <MetricCard 
          label="Taxa de Conversão" 
          value={formatPercent(metrics.taxaConversao)} 
          description="Realizados vs Agendados"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard 
          label="Pendências" 
          value={metrics.pending.toString()} 
          description="Aguardando retorno"
          icon={<AlertCircle className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Próximos Agendamentos Section */}
        <section className={cn(
          "bg-white border border-slate-200 rounded-[32px] overflow-hidden flex flex-col h-[400px] shadow-sm",
          !canSeeFinancials ? "lg:col-span-8" : "lg:col-span-4"
        )}>
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-cyan" />
                Agendamentos Próximos
              </h2>
            </div>
            <span className="text-[10px] font-black bg-brand-cyan/10 text-brand-cyan px-2 py-0.5 rounded-full uppercase">Hoje</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {upcomingAppointments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {upcomingAppointments.map((record) => (
                  <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand-cyan/5 flex items-center justify-center text-brand-cyan font-black text-xs">
                        {record.paciente.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{record.paciente}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-black text-brand-cyan uppercase font-mono tracking-wider">
                          {record.horario || '--:--'}
                        </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[120px]">{record.procedimento}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onSendWhatsApp(record)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center opacity-40">
                <Calendar className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sem agendamentos para hoje.</p>
              </div>
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button className="w-full py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-brand-cyan hover:text-brand-cyan transition-all">
              Ver Agenda Completa
            </button>
          </div>
        </section>

        {/* Mix de Procedimentos */}
        <section className={cn(
          "bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm h-[400px]",
          !canSeeFinancials ? "lg:col-span-4" : "lg:col-span-4"
        )}>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Mix de Procedimentos</h2>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={procedureDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                  {procedureDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {procedureDistribution.slice(0, 4).map((entry, i) => (
              <div key={entry.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{entry.name}</span>
                  <span className="text-[10px] font-black text-slate-400">{Math.round((entry.value / filteredData.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full transition-all" style={{ backgroundColor: COLORS[i % COLORS.length], width: `${(entry.value / filteredData.length) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Monthly Billing Chart - Hidden for Receptionists */}
        {canSeeFinancials && (
          <section className="lg:col-span-4 bg-white p-6 border border-slate-200 rounded-[32px] shadow-sm h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Crescimento</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[9px] text-slate-500 uppercase font-black">Faturamento</span>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} 
                    formatter={(val: number) => [formatCurrency(val), 'Faturamento']} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {canSeeFinancials && (
          <section className="bg-white p-6 border border-slate-200 rounded-[32px] shadow-sm h-[320px] lg:col-span-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Produção por Equipe</h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={dentistProductivity} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 800 }} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                    formatter={(val: number) => [formatCurrency(val), 'Produção']} 
                  />
                  <Bar dataKey="value" barSize={12} radius={[0, 4, 4, 0]}>
                    {dentistProductivity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className={cn(
          "bg-white border border-slate-200 rounded-[32px] overflow-hidden flex flex-col h-[320px] shadow-sm",
          !canSeeFinancials ? "lg:col-span-12" : "lg:col-span-8"
        )}>
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Procedimentos Recentes</h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-brand-cyan uppercase">{filteredData.length} Registros</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 italic font-serif">Data</th>
                  <th className="px-6 py-3">Paciente</th>
                  <th className="px-6 py-3">Procedimento</th>
                  {canSeeFinancials && <th className="px-6 py-3 text-right">Valor</th>}
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono text-slate-600">
                {filteredData.slice(0, 15).map((record) => (
                  <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 text-slate-400">
                      {record.data && isValid(parseISO(record.data)) ? format(parseISO(record.data), 'dd/MM/yyyy') : 'Sem data'}
                    </td>
                    <td className="px-6 py-3 font-sans font-black text-slate-900">{record.paciente}</td>
                    <td className="px-6 py-3 uppercase tracking-tighter text-[10px] font-bold text-slate-500">{record.procedimento}</td>
                    {canSeeFinancials && <td className="px-6 py-3 text-right font-black text-slate-800">{formatCurrency(record.valor)}</td>}
                    <td className="px-6 py-3 text-center">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onSendWhatsApp(record); }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        {(record.status === 'Agendado' || record.status === 'Pendente') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onSendReminder(record); }}
                            className="p-1.5 text-slate-400 hover:text-brand-cyan hover:bg-slate-50 rounded transition-colors cursor-pointer"
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
          </div>
        </section>
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
  const itemsPerPage = 7;

  const canDelete = currentUserRole?.toLowerCase() === 'admin' || currentUserRole?.toLowerCase() === 'dentista';

  const allPatients = useMemo(() => {
    return patients.map(pat => {
      const patientRecords = data.filter(r => r.paciente === pat.name);
      const totalSpent = patientRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
      const sortedByDate = [...patientRecords]
        .filter(r => r.data && isValid(parseISO(r.data)))
        .sort((a,b) => parseISO(b.data).getTime() - parseISO(a.data).getTime());

      const lastVisit = sortedByDate.length > 0 
        ? sortedByDate[0].data 
        : pat.createdAt || pat.dataCadastro || new Date().toISOString();
      
      return {
        id: pat.id,
        name: pat.name,
        lastVisit,
        totalSpent,
        procedures: patientRecords.length,
        ...pat
      };
    });
  }, [data, patients]);

  const filteredPatients = useMemo(() => {
    return allPatients
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPatients, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: allPatients.length,
      active: allPatients.filter(p => p.lastVisit && isValid(parseISO(p.lastVisit)) && parseISO(p.lastVisit).getTime() > Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).length,
      newThisMonth: allPatients.filter(p => isWithinInterval(parseISO(p.createdAt || new Date().toISOString()), {
        start: startOfMonth(new Date()),
        end: new Date()
      })).length
    };
  }, [allPatients]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search and Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Pesquisar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none rounded-2xl transition-all shadow-sm"
            />
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-brand-cyan transition-colors shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={onAdd}
          className="flex items-center gap-2 bg-brand-cyan text-white px-6 py-3 font-semibold text-xs uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-slate-900 transition-all shadow-lg shadow-brand-cyan/20 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Paciente
        </button>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total de Pacientes', value: stats.total, icon: Users, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5' },
          { label: 'Pacientes Ativos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Novos este mês', value: stats.newThisMonth, icon: UserPlus, color: 'text-brand-cyan', bg: 'bg-brand-cyan/5' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content: Patient Grid/List */}
      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Identificação</th>
                <th className="px-6 py-5">Última Visita</th>
                <th className="px-6 py-5 text-center">Consultas</th>
                {canSeeFinancials && <th className="px-6 py-5 text-right">Investimento</th>}
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentPatients.length > 0 ? (
                currentPatients.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-semibold text-sm border-2 border-white shadow-sm ring-1 ring-slate-100">
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <button 
                            onClick={() => onViewDetail(p)}
                            className="text-left group/name hover:text-brand-cyan transition-colors"
                          >
                            <span className="font-sans font-semibold text-slate-800 text-sm leading-tight block">{p.name}</span>
                          </button>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{p.email || 'Sem e-mail'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 italic font-serif">
                          {p.lastVisit && isValid(parseISO(p.lastVisit)) 
                            ? format(parseISO(p.lastVisit), "dd 'de' MMM, yyyy", { locale: ptBR }) 
                            : 'Bem-vindo'}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">
                          {p.lastVisit && isValid(parseISO(p.lastVisit)) 
                            ? (differenceInYears(new Date(), parseISO(p.lastVisit)) === 0 ? 'alguns meses' : `${differenceInYears(new Date(), parseISO(p.lastVisit))} anos`)
                            : 'Primeira vez'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center justify-center min-w-8 h-8 px-2 bg-slate-100 rounded-xl text-[10px] font-semibold text-slate-500 ring-4 ring-slate-50 group-hover:bg-brand-cyan group-hover:text-white transition-all">
                        {p.procedures}
                      </div>
                    </td>
                    {canSeeFinancials && (
                      <td className="px-6 py-5 text-right">
                        <span className="font-semibold text-slate-700 text-sm">{formatCurrency(p.totalSpent)}</span>
                      </td>
                    )}
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => onOpenChart(p.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-cyan text-white text-[10px] font-semibold uppercase tracking-widest rounded-xl shadow-lg shadow-brand-cyan/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Prontuário
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onOpenEdit(p.id)}
                            className="p-2 text-slate-400 hover:text-brand-cyan hover:bg-slate-50 rounded-xl transition-all"
                            title="Editar Perfil"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => onDelete(p.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              title="Excluir Permanente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="max-w-xs mx-auto">
                      <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-loose">
                        Nenhum paciente encontrado para "{searchTerm}"
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Página <span className="text-slate-800">{currentPage}</span> de <span className="text-slate-800">{totalPages || 1}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-brand-cyan/30 hover:text-brand-cyan transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (page <= 3 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-xl text-[10px] font-black transition-all",
                        currentPage === page 
                          ? 'bg-brand-cyan text-white shadow-md shadow-brand-cyan/20' 
                          : 'text-slate-400 hover:text-slate-800'
                      )}
                    >
                      {page}
                    </button>
                  );
                } else if (page === 4 && totalPages > 5) {
                   return <span key={page} className="text-slate-300">...</span>;
                }
                return null;
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-brand-cyan/30 hover:text-brand-cyan transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
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
  const upcoming = data
    .filter(r => r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento')
    .sort((a, b) => {
      const dateA = new Date(`${a.data}T${a.horario || '00:00'}`).getTime();
      const dateB = new Date(`${b.data}T${b.horario || '00:00'}`).getTime();
      return dateA - dateB;
    });
  const cancelled = fullData.filter(r => r.status === 'Cancelado').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <section className="bg-white border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center text-xs">
        <h2 className="font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
          Próximos Agendamentos
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={onAdd}
            className="text-[10px] bg-brand-cyan text-white px-3 py-1 font-bold rounded cursor-pointer hover:bg-brand-cyan-dark transition-colors shadow-sm active:scale-95"
          >
            Novo Agendamento
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcoming.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">Nenhum agendamento pendente.</div>
        ) : (
          upcoming.slice(0, 12).map((apt) => (
            <div key={apt.id} className={cn(
              "border p-3 rounded flex gap-3 items-start relative hover:border-brand-cyan transition-all group",
              apt.status === 'Em Atendimento' ? "bg-cyan-50/50 border-brand-cyan shadow-sm" : "bg-slate-50/50 border-slate-100"
            )}>
              <div className="bg-white p-2 border border-slate-100 rounded text-center min-w-[55px] shadow-sm flex flex-col items-center">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                  {apt.data && isValid(parseISO(apt.data)) ? format(parseISO(apt.data), 'MMM', { locale: ptBR }) : '...'}
                </div>
                <div className="text-base font-black text-slate-800 leading-none my-0.5">
                  {apt.data && isValid(parseISO(apt.data)) ? format(parseISO(apt.data), 'dd') : '-'}
                </div>
                <div className="text-[9px] font-bold bg-brand-cyan/10 text-brand-cyan px-1 rounded-sm mt-1 ring-1 ring-brand-cyan/20">
                  {apt.horario || '--:--'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{apt.paciente}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1">{apt.procedimento}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] bg-white px-1.5 border border-slate-100 rounded text-slate-400 font-bold">{apt.dentista}</span>
                  <StatusBadge status={apt.status} />
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
                </div>

                <div className="flex gap-2">
                  {apt.status === 'Em Atendimento' ? (
                    <button 
                      onClick={() => onFinish(apt.id)}
                      className="flex-1 bg-emerald-500 text-white text-[9px] font-bold uppercase py-1 rounded hover:bg-emerald-600 transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Finalizar
                    </button>
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
              <button className="text-slate-300 hover:text-brand-cyan cursor-pointer"><MoreVertical className="w-4 h-4" /></button>
            </div>
          ))
        )}
      </div>

      {cancelled.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-4">
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

function ImportView({ onImport }: { onImport: (records: any[]) => Promise<void> }) {
  const [data, setData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setError(null);
      setSuccess(null);
      
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error("Os dados devem ser uma lista (array) de objetos.");
      }
      
      parsed.forEach((item, index) => {
        if (!item.paciente || !item.data || !item.procedimento) {
          throw new Error(`Item na posição ${index} está incompleto (faltando paciente, data ou procedimento).`);
        }
      });

      await onImport(parsed);
      setSuccess(`${parsed.length} registros importados com sucesso!`);
      setData('');
    } catch (e: any) {
      setError(e.message || "Erro ao processar dados JSON. Verifique o formato.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        "paciente": "João da Silva",
        "data": new Date().toISOString(),
        "procedimento": "Procedimento Exemplo",
        "dentista": "Nome do Dentista",
        "status": "Realizado",
        "statusPagamento": "Pago",
        "valor": 100.00
      }
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Importação de Dados Legados</h3>
          <p className="text-xs text-slate-500">Traga seu histórico de atendimentos e pacientes de outros sistemas.</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-lg hover:bg-slate-100 transition-all flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-brand-cyan" />
          Baixar Modelo JSON
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Interface de Transferência (JSON)</label>
          <span className="text-[8px] font-mono text-slate-300">UTF-8 Format</span>
        </div>
        <textarea 
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder='Ex: [ { "paciente": "Paciente Exemplo", "data": "2023-10-01", "procedimento": "Limpeza", ... } ]'
          className="w-full h-80 p-6 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-3xl focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 outline-none transition-all shadow-inner"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <p className="text-[10px] font-bold uppercase">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-[10px] font-bold uppercase">{success}</p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
        <p className="text-[9px] text-amber-700 leading-relaxed font-bold uppercase opacity-80">
          Nota: A importação em massa é uma operação sensível. Certifique-se de que os campos coincidam com os nomes das colunas exigidas no modelo.
        </p>
      </div>

      <button 
        disabled={isImporting || !data.trim()}
        onClick={handleImport}
        className="group relative w-full py-5 bg-slate-900 border border-slate-800 text-white font-bold uppercase text-[10px] tracking-[0.2em] rounded-2xl hover:bg-brand-cyan transition-all shadow-2xl disabled:opacity-50 overflow-hidden"
      >
        <div className="relative z-10 flex items-center justify-center gap-3">
          {isImporting ? <Activity className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          {isImporting ? 'Processando Lote de Dados...' : 'Iniciar Ingestão de Dados'}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </button>
    </div>
  );
}

function SettingsView({ 
  clinicName, 
  onUpdateClinicName, 
  onResetDatabase,
  isAdmin 
}: { 
  clinicName: string; 
  onUpdateClinicName: (n: string) => Promise<void>;
  onResetDatabase?: () => Promise<void>;
  isAdmin?: boolean;
}) {
  const [localClinicName, setLocalClinicName] = useState(clinicName);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setLocalClinicName(clinicName);
  }, [clinicName]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateClinicName(localClinicName);
      alert('Configurações salvas com sucesso!');
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert('Erro ao salvar as configurações. Verifique suas permissões.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-8 max-w-2xl mx-auto space-y-8 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">Configurações do Sistema</h2>
        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">v2.4.0-build</span>
      </div>
      
      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">Institucional</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">Nome da Clínica</label>
              <input 
                type="text" 
                value={localClinicName} 
                onChange={(e) => setLocalClinicName(e.target.value)}
                className="w-full text-xs p-2 border border-slate-100 bg-slate-50 outline-none focus:border-brand-cyan transition-all" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400">CRO Responsável</label>
              <input type="text" defaultValue="SP-123456" className="w-full text-xs p-2 border border-slate-100 bg-slate-50" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">Unidades & Localização</h3>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400">Endereço Principal</label>
            <input type="text" defaultValue="Av. Paulista, 1000 - São Paulo, SP" className="w-full text-xs p-2 border border-slate-100 bg-slate-50" />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">Financeiro & Faturamento</h3>
          <div className="flex items-center gap-4">
             <div className="flex-1 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-400">Moeda Padrão</label>
                <select className="w-full text-xs p-2 border border-slate-100 bg-slate-50"><option>BRL (R$)</option></select>
             </div>
             <div className="flex-1 space-y-1 px-4 flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <label className="text-[9px] uppercase font-bold text-slate-400">Gerar Recibo Automático</label>
             </div>
          </div>
        </section>
        
        {isAdmin && onResetDatabase && (
          <section className="pt-8 border-t-2 border-rose-100 mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Zona de Perigo</h3>
            </div>
            <div className="bg-rose-50 p-6 border border-rose-100 rounded-lg space-y-4">
              {!showConfirmReset ? (
                <>
                  <p className="text-[10px] text-rose-700 leading-relaxed font-medium">
                    Limpar o sistema irá remover permanentemente todos os registros, pacientes e documentos do banco de dados. 
                    Esta ação é irreversível e apagará todos os dados inseridos por Admins, Dentistas e Recepcionistas.
                  </p>
                  <button 
                    onClick={() => setShowConfirmReset(true)}
                    className="bg-rose-500 text-white px-6 py-2 text-[10px] font-extrabold uppercase tracking-widest hover:bg-rose-600 transition-all rounded shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Todo o Sistema
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] text-rose-800 font-bold">
                    VOCÊ TEM CERTEZA ABSOLUTA? Esta ação NÃO pode ser desfeita.
                  </p>
                  <p className="text-[10px] text-rose-600">
                    Digite <span className="font-mono bg-rose-100 px-1 rounded">LIMPAR AGORA</span> para confirmar a exclusão total.
                  </p>
                  <input 
                    type="text" 
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full text-xs p-2 border border-rose-200 outline-none focus:border-rose-500"
                    placeholder="Digite LIMPAR AGORA"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (confirmText === 'LIMPAR AGORA') {
                          onResetDatabase();
                          setShowConfirmReset(false);
                          setConfirmText('');
                        } else {
                          alert("Digite o texto de confirmação corretamente.");
                        }
                      }}
                      disabled={confirmText !== 'LIMPAR AGORA'}
                      className="flex-1 bg-rose-600 text-white py-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed rounded"
                    >
                      Confirmar Exclusão Total
                    </button>
                    <button 
                      onClick={() => {
                        setShowConfirmReset(false);
                        setConfirmText('');
                      }}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button className="text-[10px] font-bold uppercase text-slate-400">Restaurar Padrões</button>
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="bg-slate-900 text-white px-8 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-cyan transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
}

function Tooth({ 
  number, 
  status = 'Normal', 
  onClick 
}: { 
  number: number; 
  status?: string; 
  onClick: () => void;
  key?: number | string;
}) {
  const getStatusColor = (s: string) => {
    switch(s) {
      case 'Cárie': return 'bg-red-500 border-red-700';
      case 'Extraído': return 'bg-slate-800 border-slate-900 opacity-20';
      case 'Restauração': return 'bg-emerald-500 border-emerald-700';
      case 'Endodontia': return 'bg-purple-500 border-purple-700';
      default: return 'bg-white border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "w-8 h-10 border-2 rounded-sm cursor-pointer flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 shrink-0",
        getStatusColor(status),
        status === 'Normal' ? 'text-slate-400' : 'text-white'
      )}
      title={`Dente ${number}: ${status}`}
    >
      {number}
    </div>
  );
}

function Odontogram({ 
  patientName,
  currentUser,
  onUpdate 
}: { 
  patientName: string;
  currentUser: any;
  onUpdate?: () => void;
}) {
  const [data, setData] = useState<Record<number, string>>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const docRef = doc(db, 'odontograms', patientName.toLowerCase().replace(/\s+/g, '-'));
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data().teeth || {});
      }
      setLoading(false);
    }, (error) => {
      console.warn("Odontogram sync error:", error);
      setLoading(false);
    });
    return unsub;
  }, [patientName]);

  const handleUpdateTooth = async (status: string) => {
    if (selectedTooth === null) return;
    
    const patientId = patientName.toLowerCase().replace(/\s+/g, '-');
    const newData = { ...data, [selectedTooth]: status };
    
    try {
      await setDoc(doc(db, 'odontograms', patientId), {
        patientName,
        teeth: newData,
        dentista: currentUser?.name || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setData(newData);
      setSelectedTooth(null);
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  if (loading) return <div className="h-40 flex items-center justify-center text-slate-400 text-xs">Carregando Odontograma...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <div className="flex flex-col items-center gap-8 relative overflow-x-auto pb-4 custom-scrollbar">
        
        {/* Upper Arch */}
        <div className="flex gap-4 min-w-max">
          <div className="flex gap-1">
            {upperRight.map(n => <Tooth key={n} number={n} status={data[n] || 'Normal'} onClick={() => setSelectedTooth(n)} />)}
          </div>
          <div className="w-[1px] bg-slate-200 h-10"></div>
          <div className="flex gap-1">
            {upperLeft.map(n => <Tooth key={n} number={n} status={data[n] || 'Normal'} onClick={() => setSelectedTooth(n)} />)}
          </div>
        </div>

        {/* Lower Arch */}
        <div className="flex gap-4 min-w-max">
          <div className="flex gap-1">
            {lowerRight.map(n => <Tooth key={n} number={n} status={data[n] || 'Normal'} onClick={() => setSelectedTooth(n)} />)}
          </div>
          <div className="w-[1px] bg-slate-200 h-10"></div>
          <div className="flex gap-1">
            {lowerLeft.map(n => <Tooth key={n} number={n} status={data[n] || 'Normal'} onClick={() => setSelectedTooth(n)} />)}
          </div>
        </div>

        {/* Floating Menu for Selected Tooth */}
        <AnimatePresence>
          {selectedTooth && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-2xl border border-slate-200 p-4 rounded-xl z-10 w-48"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dente {selectedTooth}</span>
                <button onClick={() => setSelectedTooth(null)} className="p-1 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-3 h-3 text-slate-300 hover:text-slate-600" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {['Normal', 'Cárie', 'Extraído', 'Restauração', 'Endodontia'].map(status => (
                  <button 
                    key={status}
                    onClick={() => handleUpdateTooth(status)}
                    className={cn(
                      "text-left px-3 py-1.5 rounded text-[10px] font-bold transition-all",
                      data[selectedTooth] === status ? "bg-brand-cyan text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap justify-center gap-4 text-[9px] uppercase font-bold text-slate-400 mt-4 border-t border-slate-50 pt-4 w-full">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Cárie</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-800 rounded-full opacity-20"></div> Extraído</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Restauração</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div> Endodontia</div>
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

function OdontogramView({ patientName }: { patientName: string }) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Record<number, any>>({});
  const [statusFilter, setStatusFilter] = useState<'todos' | 'cárie' | 'restaurado' | 'extraído'>('todos');

  const teethNumbersUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const teethNumbersLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const toggleToothStatus = (num: number, status: string) => {
    setTeethData(prev => ({
      ...prev,
      [num]: { ...prev[num], status: prev[num]?.status === status ? null : status }
    }));
  };

  const getToothColor = (num: number) => {
    const status = teethData[num]?.status;
    if (status === 'cárie') return 'fill-rose-500 stroke-rose-600';
    if (status === 'restaurado') return 'fill-brand-cyan stroke-cyan-600';
    if (status === 'extraído') return 'fill-slate-200 stroke-slate-300 opacity-30';
    return 'fill-white stroke-slate-300 hover:fill-slate-50';
  };

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
              {Object.entries(teethData).length > 0 ? (
                Object.entries(teethData).map(([num, data]: [any, any]) => (
                  <div key={num} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400">
                        {num}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 capitalize">{data.status || 'Hígido'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Atualizado em {format(new Date(), 'dd/MM/yyyy')}</p>
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
    <div className="flex flex-col h-full bg-slate-50/50 -m-4 md:-m-8 lg:-m-10">
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
            <OdontogramView patientName={patientName} />
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
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">
          {isClinicalRecord ? 'Nova Evolução Clínica' : 'Novo Agendamento'}
        </h2>
      </div>

      <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm relative overflow-hidden">
        {isSaving && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-brand-cyan animate-spin" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                {isClinicalRecord ? 'Salvando Evolução...' : 'Salvando Agendamento...'}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Paciente</label>
            <select 
              disabled={isSaving || !!presetPatient}
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50"
            >
              <option value="">Selecione um paciente...</option>
              {patientList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">Data</label>
              <input 
                disabled={isSaving}
                type="date" 
                min={minSelectableDate}
                value={dataVal}
                onChange={(e) => {
                  const newData = e.target.value;
                  setDataVal(newData);
                  // Clear time if it becomes invalid with new date
                  if (!isClinicalRecord && newData === format(new Date(), 'yyyy-MM-dd') && horario) {
                    const nowStr = format(new Date(), 'HH:mm');
                    if (horario < nowStr) setHorario('');
                  }
                }}
                className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">Horário</label>
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
                  "w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50",
                  (!isClinicalRecord && ((dataVal === format(new Date(), 'yyyy-MM-dd') && horario && horario < format(new Date(), 'HH:mm')) || (dataVal < format(new Date(), 'yyyy-MM-dd')))) && "border-rose-300 bg-rose-50"
                )} 
              />
              {data.some(r => r.dentista === dentista && r.data === dataVal && r.horario === horario && r.status !== 'Cancelado') && (
                <p className="text-[9px] text-rose-500 font-bold mt-1">Horário já ocupado!</p>
              )}
              {!isClinicalRecord && (
                <>
                  {dataVal < format(new Date(), 'yyyy-MM-dd') && (
                    <p className="text-[9px] text-rose-500 font-bold mt-1">Data no passado!</p>
                  )}
                  {dataVal === format(new Date(), 'yyyy-MM-dd') && horario && horario < format(new Date(), 'HH:mm') && (
                    <p className="text-[9px] text-amber-500 font-bold mt-1">Horário no passado!</p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Dentista Responsável</label>
            <select 
              disabled={isSaving}
              value={dentista}
              onChange={(e) => setDentista(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50"
            >
              <option value="">Selecione o dentista...</option>
              {dentistList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Procedimento</label>
              <select 
                disabled={isSaving}
                value={procedimento}
                onChange={(e) => handleProcedureChange(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50"
              >
                {PROCEDURES_OPTIONS.map(opt => (
                  <option key={opt.name} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Valor (R$)</label>
              <input 
                disabled={isSaving}
                type="number" 
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none disabled:bg-slate-50" 
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button disabled={isSaving} onClick={onBack} className="px-6 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">Descartar</button>
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="bg-brand-cyan text-white px-6 py-2 rounded text-xs font-bold shadow-sm hover:translate-y-[-1px] transition-all cursor-pointer disabled:opacity-50 disabled:translate-y-0"
          >
            {isSaving ? 'Salvando...' : (isClinicalRecord ? 'Gravar Evolução' : 'Confirmar Agendamento')}
          </button>
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
  onUpdateClinicName,
  onResetDatabase
}: { 
  users: any[]; 
  onAddUser: (u: any) => Promise<boolean>; 
  onUpdateUser: (id: string, u: any) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<boolean>;
  currentUser: any;
  clinicName: string;
  onUpdateClinicName: (n: string) => Promise<void>;
  onResetDatabase: () => Promise<void>;
}) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Dentista');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserModules, setNewUserModules] = useState<string[]>(['Dashboard', 'Agenda', 'Pacientes']);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'import'>('users');

  const AVAILABLE_MODULES = ['Dashboard', 'Agenda', 'Pacientes', 'Retorno', 'Financeiro', 'Equipe', 'Administração', 'Documentos'];

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
            onClick={() => setActiveTab('import')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0",
              activeTab === 'import' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Importar
          </button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'settings' && (
          <SettingsView 
            clinicName={clinicName} 
            onUpdateClinicName={onUpdateClinicName} 
            onResetDatabase={onResetDatabase}
            isAdmin={currentUser?.role?.toLowerCase() === 'admin'}
          />
        )}
        
        {activeTab === 'import' && (
          <ImportView 
            onImport={async (records) => {
              for (const record of records) {
                const id = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                await setDoc(doc(db, 'records', id), {
                  ...record,
                  id,
                  createdAt: new Date().toISOString()
                });
              }
            }} 
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
                            <div className="font-sans font-bold text-slate-800">{u.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">@{u.username}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="mb-1">
                              <span className="px-2 py-0.5 bg-white border border-slate-100 text-slate-600 text-[8px] font-black uppercase rounded shadow-sm">
                                {u.role}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-400 font-sans">
                              {u.email && <div>{u.email}</div>}
                              {u.phone && <div>{u.phone}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[9px] text-slate-400 font-sans">{u.modules}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => setEditingUser(u)}
                                className="p-2 text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/5 rounded-lg transition-all"
                                title="Editar Usuário"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
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
      </AnimatePresence>
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
  clinicName
}: { 
  users: any[]; 
  onLogin: (user: any) => void; 
  onOpenBooking: () => void;
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  clinicName: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    
    if (lockout.isLocked) {
      setError(`Muitas tentativas. Tente novamente em ${lockout.remaining}s.`);
      return;
    }

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    
    // Simulate server delay/security check
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Sanitize credentials before checking
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Try to find user in the reactive 'users' list
    let user = users.find(u => {
      const dbUsername = (u.username || "").toString().trim().toLowerCase();
      const dbPassword = (u.password || "").toString().trim();
      return dbUsername === cleanUsername && dbPassword === cleanPassword;
    });

    // ABSOLUTE FALLBACK: If reactive list fails but credentials match the original constants
    if (!user && cleanUsername === 'ana.admin' && cleanPassword === '123') {
      user = INITIAL_USERS.find(u => u.username === 'ana.admin');
    }

    if (user) {
      SecurityUtils.recordAttempt(true);
      try {
        await onLogin(user);
      } catch (e: any) {
        setError(e.message || "Erro durante o login.");
        setIsLoading(false);
      }
    } else {
      SecurityUtils.recordAttempt(false);
      setLockout(SecurityUtils.getLockoutStatus());
      setError('Credenciais inválidas.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f8fafc] flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-brand-cyan/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-[400px] px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl shadow-slate-200/40 p-8 border border-white"
        >
          <div className="mb-8 text-center text-slate-800">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-brand-cyan rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-cyan/20">
                <Plus className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tighter">
                {clinicName.split(' ')[0]}<span className="text-brand-cyan">{clinicName.split(' ').slice(1).join(' ') || 'Gate'}</span>
              </h1>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">Bem-vindo de volta</h3>
            <p className="text-sm text-slate-500">Insira suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-cyan transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                value={username}
                disabled={isLoading}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-slate-100 text-slate-800 text-sm py-4 px-4 pl-11 outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all rounded-2xl placeholder:text-slate-400"
                placeholder="Nome de usuário"
                autoFocus
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-cyan transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input 
                type="password" 
                value={password}
                disabled={isLoading}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-100 text-slate-800 text-sm py-4 px-4 pl-11 outline-none focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all rounded-2xl placeholder:text-slate-400"
                placeholder="Sua senha"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-600 text-[11px] p-4 rounded-2xl flex items-center gap-2 font-bold overflow-hidden"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenBooking}
              className="w-full py-3 text-xs font-bold text-slate-500 hover:text-brand-cyan transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Agendar Consulta Online
            </button>
          </form>

          {/* Quick Access for Demo */}
          <div className="mt-8 pt-6 border-t border-slate-50">
            <div className="flex flex-wrap justify-center gap-2">
              {['ana.admin', 'roberto', 'mariana'].map(u => (
                <button 
                  key={u}
                  onClick={() => { setUsername(u); setPassword('123'); }}
                  className="text-[10px] text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 hover:border-brand-cyan hover:text-brand-cyan transition-all"
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
        
        <p className="text-slate-400 text-[9px] flex items-center justify-center gap-2 mt-8">
          <Shield className="w-3 h-3 text-brand-cyan/40" />
          Conexão Segura | {clinicName} Protocol
        </p>
      </div>
      <Footer onPrivacyPolicy={onPrivacyPolicy} onTerms={onTerms} />
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
  clinicName
}: { 
  onBack: () => void; 
  users: any[]; 
  data: DentalRecord[];
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  clinicName: string;
}) {
  const minDate = getSystemInitialDate();

  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    dentista: '',
    data: minDate,
    horario: '',
    paciente: '',
    telefone: '',
    procedimento: 'Consulta Inicial'
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
      const id = `booking-${Date.now()}`;
      const record: DentalRecord = {
        id,
        data: bookingData.data,
        horario: bookingData.horario,
        paciente: trimmedName,
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[32px] shadow-2xl p-10 text-center max-w-md w-full border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Solicitação Enviada!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Seu pré-agendamento foi recebido. Nossa equipe entrará em contato via WhatsApp ({bookingData.telefone}) para confirmar seu horário.
          </p>
          <button 
            onClick={onBack}
            className="w-full py-4 bg-brand-cyan text-white font-bold rounded-2xl hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20"
          >
            Voltar ao Início
          </button>
        </motion.div>
        <div className="fixed bottom-0 left-0 w-full z-10">
           <Footer onPrivacyPolicy={onPrivacyPolicy} onTerms={onTerms} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={onBack}
            className="p-3 bg-white rounded-2xl text-slate-400 hover:text-brand-cyan shadow-sm border border-slate-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{clinicName} <span className="text-brand-cyan font-normal">Agendamento</span></h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Passo {step} de 3</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 p-8 border border-slate-100 overflow-hidden relative"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
            <motion.div 
              className="h-full bg-brand-cyan"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <div className="pt-4">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-brand-cyan" />
                    Selecione o Profissional
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {doctors.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setBookingData(prev => ({ ...prev, dentista: doc.name }))}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all group",
                          bookingData.dentista === doc.name 
                            ? "border-brand-cyan bg-cyan-50/30 ring-4 ring-brand-cyan/5" 
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-colors",
                            bookingData.dentista === doc.name ? "bg-brand-cyan text-white" : "bg-slate-100 text-slate-400"
                          )}>
                            {doc.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">
                              {doc.role === 'Admin' ? 'Especialista' : 'Clínico Geral'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  disabled={!bookingData.dentista}
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-brand-cyan text-white font-bold rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20"
                >
                  Continuar para Data e Hora
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-brand-cyan" />
                      Escolha o Dia
                    </h2>
                    <input 
                      id="booking-date"
                      type="date" 
                      min={minDate}
                      value={bookingData.data}
                      onChange={(e) => {
                        const newData = e.target.value;
                        setBookingData(prev => {
                          const newBookingData = { ...prev, data: newData };
                          // If today is selected, and current time is past selected time, clear time
                          if (newData === format(new Date(), 'yyyy-MM-dd') && prev.horario) {
                            if (prev.horario < format(new Date(), 'HH:mm')) {
                              newBookingData.horario = '';
                            }
                          }
                          return newBookingData;
                        });
                      }}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-cyan" />
                      Escolha o Horário
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
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
                            onClick={() => {
                          if (bookingData.data === format(new Date(), 'yyyy-MM-dd')) {
                            if (time < format(new Date(), 'HH:mm')) {
                              alert('Este horário já passou. Por favor, escolha um horário futuro.');
                              return;
                            }
                          }
                          setBookingData(prev => ({ ...prev, horario: time }));
                        }}
                            className={cn(
                              "py-2 text-xs font-bold rounded-lg border transition-all",
                              bookingData.horario === time
                                ? "bg-brand-cyan text-white border-brand-cyan shadow-md shadow-brand-cyan/20"
                                : (isTaken || isPast)
                                  ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed italic"
                                  : "bg-white text-slate-500 border-slate-100 hover:border-brand-cyan"
                            )}
                          >
                            {time}
                            {isTaken && <span className="block text-[8px] opacity-60">Ocupado</span>}
                            {isPast && !isTaken && <span className="block text-[8px] opacity-60">Passou</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 text-slate-400 font-bold border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    disabled={!bookingData.horario}
                    onClick={() => setStep(3)}
                    className="flex-[2] py-4 bg-brand-cyan text-white font-bold rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20"
                  >
                    Próximo Passo
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-cyan" />
                    Seus Dados
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input 
                        type="text"
                        placeholder="Como devemos lhe chamar?"
                        value={bookingData.paciente}
                        onChange={(e) => setBookingData(prev => ({ ...prev, paciente: SecurityUtils.limit(SecurityUtils.sanitize(e.target.value), 100) }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                      <input 
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={bookingData.telefone}
                        onChange={(e) => setBookingData(prev => ({ ...prev, telefone: SecurityUtils.maskPhone(e.target.value) }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all text-slate-800 font-mono"
                      />
                    </div>
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                      <p className="text-[10px] text-blue-600 leading-relaxed italic">
                        * Ao finalizar, você concorda que entraremos em contato para confirmar a disponibilidade do horário selecionado.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 text-slate-400 font-bold border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    disabled={isSubmitting || !bookingData.paciente || !bookingData.telefone}
                    onClick={handleSubmit}
                    className="flex-[2] py-4 bg-brand-cyan text-white font-bold rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Finalizar Agendamento
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        <p className="text-center text-slate-400 text-[10px] mt-8 uppercase tracking-widest font-medium mb-12">
          Ambiente Seguro | Agendamento via {clinicName} Cloud
        </p>
      </div>
      <Footer onPrivacyPolicy={onPrivacyPolicy} onTerms={onTerms} />
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
  onTerms 
}: { 
  onPrivacyPolicy: () => void; 
  onTerms: () => void;
}) {
  return (
    <footer className="mt-auto py-8 px-4 border-t border-slate-100 bg-white/50 backdrop-blur-sm w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <span className="text-brand-cyan font-black tracking-tighter text-lg">Sorriso & Saúde</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">© 2026 Todos os direitos reservados</p>
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




