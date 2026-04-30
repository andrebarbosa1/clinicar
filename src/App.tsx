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
  MessageCircle,
  Phone
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
import { format, parseISO, startOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MOCK_DATA } from './mockData';
import { DentalRecord } from './types';
import { cn, formatCurrency, formatPercent } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  query, 
  where,
  getDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  { id: '3', name: 'Mariana Lima', role: 'Recepcionista', modules: 'Agenda, Pacientes, Financeiro', username: 'mariana', password: '123', email: 'mariana@clinica.com' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [data, setData] = useState<DentalRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [users, setUsers] = useState<any[]>(INITIAL_USERS);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPublicBooking, setIsPublicBooking] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');
  const [subPage, setSubPage] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [filterProcedure, setFilterProcedure] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPayment, setFilterPayment] = useState<string>('Todos');
  const [searchPatient, setSearchPatient] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportDescription, setSupportDescription] = useState('');
  const [isSendingTicket, setIsSendingTicket] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingPatientEmail, setEditingPatientEmail] = useState<{patientName: string; appointmentId: string} | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'patients'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(list);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const q = query(collection(db, 'support_tickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, []);

  const handleSupportTicket = () => {
    setIsSupportModalOpen(true);
  };

  const handleSendTicket = async () => {
    if (!supportDescription.trim()) return;
    setIsSendingTicket(true);
    const path = 'support_tickets';
    try {
      const ticketId = `ticket-${Date.now()}`;
      const userIdentifier = currentUser?.id || currentUser?.uid || currentUser?.firebaseUid || auth.currentUser?.uid || 'guest';
      const ticketData = {
        id: ticketId,
        userId: userIdentifier,
        userName: currentUser?.name || 'Usuário',
        description: supportDescription,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      await setDoc(doc(db, path, ticketId), ticketData);
      
      // Notify all admins about the new ticket
      const admins = users.filter(u => u.role === 'Admin');
      const shortId = ticketId.includes('-') ? ticketId.split('-')[1] : ticketId;
      console.log(`Notificando ${admins.length} administradores...`);
      for (const admin of admins) {
        // Notification target should match what the admin listener expects (id || uid)
        const targetId = admin.id || admin.uid || admin.firebaseUid;
        const notifId = `notif-ticket-${admin.id}-${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: targetId,
          message: `Novo chamado recebido: #${shortId}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      alert('Chamado aberto com sucesso! Protocolo: #' + ticketId.split('-')[1]);
      setIsSupportModalOpen(false);
      setSupportDescription('');
    } catch (e) {
      console.error("Erro ao enviar chamado:", e);
      handleFirestoreError(e, OperationType.WRITE, path);
      alert('Erro ao abrir chamado. Tente novamente.');
    } finally {
      setIsSendingTicket(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: 'Em Analise' | 'Resolvido') => {
    if (!currentUser) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }
    const path = 'support_tickets';
    try {
      const ticketRef = doc(db, path, ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) {
        alert('Chamado não encontrado.');
        return;
      }
      const ticketData = ticketSnap.data();

      const updateData: any = { status: newStatus };
      if (newStatus === 'Em Analise' || newStatus === 'Resolvido') {
        updateData.assignedTo = currentUser.id || currentUser.uid || currentUser.firebaseUid;
        updateData.assignedToName = currentUser.name;
      }

      await updateDoc(ticketRef, updateData);

      // Create notification for the user who opened the ticket
      if (ticketData?.userId) {
        const notifId = `notif-status-${ticketId}-${Date.now()}`;
        const notifPath = 'notifications';
        const displayStatus = newStatus === 'Resolvido' ? 'RESOLVIDO' : 'em análise';
        const message = newStatus === 'Resolvido' 
          ? `Seu chamado #${ticketId.split('-')[1]} foi RESOLVIDO!` 
          : `Seu chamado #${ticketId.split('-')[1]} agora está em análise.`;

        try {
          await setDoc(doc(db, notifPath, notifId), {
            id: notifId,
            userId: ticketData.userId,
            message: message,
            type: newStatus === 'Resolvido' ? 'success' : 'info',
            read: false,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.error("Erro ao notificar usuário:", err);
        }
      }

      alert(`Chamado ${newStatus === 'Em Analise' ? 'aceito' : 'resolvido'} com sucesso!`);
    } catch (e) {
      console.error("Erro ao atualizar chamado:", e);
      handleFirestoreError(e, OperationType.UPDATE, `${path}/${ticketId}`);
      alert('Erro ao atualizar chamado.');
    }
  };

  // Constants
  const procedures = useMemo(() => ['Todos', ...Array.from(new Set(data.map(r => r.procedimento)))], [data]);
  const statuses = ['Todos', 'Realizado', 'Agendado', 'Pendente', 'Cancelado'];
  const paymentStatuses = ['Todos', 'Pago', 'Pendente', 'Atrasado'];

  // Filtered data based on role
  const filteredRecords = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin' || currentUser.role === 'Recepcionista') return data;
    if (currentUser.role === 'Dentista') {
      return data.filter(r => r.dentista === currentUser.name);
    }
    return [];
  }, [data, currentUser]);

  // Derived Data (Combines role filtering + UI filters)
  const filteredData = useMemo(() => {
    return filteredRecords.filter(record => {
      const matchesProcedure = filterProcedure === 'Todos' || record.procedimento === filterProcedure;
      const matchesStatus = filterStatus === 'Todos' || record.status === filterStatus;
      const matchesPayment = filterPayment === 'Todos' || record.statusPagamento === filterPayment;
      const matchesSearch = (record.paciente || "").toLowerCase().includes((searchPatient || "").toLowerCase());
      return matchesProcedure && matchesStatus && matchesPayment && matchesSearch;
    });
  }, [filteredRecords, filterProcedure, filterStatus, filterPayment, searchPatient]);

  const openTicketsCount = useMemo(() => {
    return tickets.filter(t => t.status === 'Pendente').length;
  }, [tickets]);

  // Seeding Logic
  React.useEffect(() => {
    const seed = async () => {
      if (isAuthReady && auth.currentUser) {
        try {
          // Robust seeding: check and set each user
          for (const u of INITIAL_USERS) {
            const userRef = doc(db, 'users', u.id);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, u);
            }
          }

          // Robust seeding: check and set each mock record
          if (data.length === 0) {
            for (const r of MOCK_DATA) {
              const recordRef = doc(db, 'records', r.id);
              const recordSnap = await getDoc(recordRef);
              if (!recordSnap.exists()) {
                await setDoc(recordRef, r);
              }
            }
          }
        } catch (e) {
          console.warn("Seeding failed (permissions?):", e);
        }
      }
    };
    seed();
  }, [isAuthReady, isAuthenticated, users.length, data.length]);

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
              // Check by email as fallback
              const usersRef = collection(db, 'users');
              const qEmail = query(usersRef, where('email', '==', user.email));
              const emailResult = await getDoc(doc(db, 'patients', 'dummy')); // Just getting permissions early
              // Note: actual query might be better but let's assume mapping is the standard
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

  // 2. Data Listeners (Reactive to Auth Readiness and User Role)
  React.useEffect(() => {
    if (!isAuthReady) return;

    // Users sync (Always active if authenticated or about to be)
    console.log("Starting users monitor...");
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
      const mergedUsers = [...u];
      INITIAL_USERS.forEach((initial: any) => {
        const index = mergedUsers.findIndex(m => m.id === initial.id || m.username === initial.username);
        if (index !== -1) mergedUsers[index] = { ...mergedUsers[index], ...initial };
        else mergedUsers.push(initial);
      });
      setUsers(mergedUsers);
    }, (error) => {
      console.error("Users sync error:", error);
      setUsers(INITIAL_USERS);
    });

    let unsubRecords = () => {};
    if (isAuthenticated && currentUser) {
      let recordsQuery;
      if (currentUser.role === 'Admin' || currentUser.role === 'Recepcionista') {
        recordsQuery = collection(db, 'records');
      } else if (currentUser.role === 'Dentista') {
        recordsQuery = query(collection(db, 'records'), where('dentista', '==', currentUser.name));
      }

      if (recordsQuery) {
        setIsLoadingData(true);
        unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
          const records = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DentalRecord));
          setData(records);
          setIsLoadingData(false);
        }, (error) => {
          console.error("Records sync error:", error);
          setIsLoadingData(false);
        });
      }
    }

    return () => {
      unsubUsers();
      unsubRecords();
    };
  }, [isAuthReady, isAuthenticated, currentUser?.role, currentUser?.name]);

  // Notifications Listener
  React.useEffect(() => {
    if (!currentUser) return;
    console.log("Iniciando monitoramento de notificações...");
    const userId = currentUser.id || currentUser.uid || currentUser.firebaseUid;
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Notificações atualizadas:", list.length);
      // Robust sorting to avoid NaN issues
      const sorted = list.sort((a: any, b: any) => {
        const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dB - dA;
      });
      setNotifications(sorted);
    }, (error) => {
      console.error("Notifications listener error:", error);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleCreatePatient = async (newPatient: any, existingId?: string): Promise<boolean> => {
    if (!newPatient.name) {
      alert('Por favor, informe o nome do paciente.');
      return false;
    }

    // Only create a record for NEW patients
    if (!existingId) {
      const record: DentalRecord = {
        id: `rec-pat-${Date.now()}`,
        data: format(new Date(), 'yyyy-MM-dd'),
        paciente: newPatient.name,
        procedimento: newPatient.procedimento || 'Avaliação Inicial',
        dentista: currentUser?.name || 'Dra. Ana Silveira',
        status: 'Pendente',
        statusPagamento: 'Pendente',
        valor: Number(newPatient.valor) || 0,
      };
      
      try {
        await setDoc(doc(db, 'records', record.id), record);
        
        // Notify the dentist about new patient (initial evaluation)
        const dentist = users.find(u => u.name === record.dentista);
        if (dentist) {
          const dId = dentist.id || dentist.uid || dentist.firebaseUid;
          const nId = `notif-newpat-${Date.now()}`;
          await setDoc(doc(db, 'notifications', nId), {
            id: nId,
            userId: dId,
            message: `Nova avaliação inicial: ${record.paciente}`,
            type: 'info',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn("Error creating initial record:", e);
      }
    }
    
    try {
      console.log(existingId ? "Updating patient..." : "Creating new patient...");
      const patientId = existingId || `pat-${Date.now()}`;
      
      const patientData: any = {
        name: newPatient.name,
        email: newPatient.email,
        phone: newPatient.phone,
        cpf: newPatient.cpf,
        updatedAt: new Date().toISOString()
      };
      
      if (!existingId) {
        patientData.id = patientId;
        patientData.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'patients', patientId), patientData, { merge: true });

      setSubPage(null);
      return true;
    } catch (e: any) {
      console.error("Falha ao salvar paciente:", e);
      alert("Erro ao salvar paciente: " + (e.message || "Permissão negada ou erro de conexão."));
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

    try {
      console.log("Tentando salvar agendamento no Firestore:", record);
      await setDoc(doc(db, 'records', record.id), record);

      // Notify the dentist
      const dentist = users.find(u => u.name === newAppt.dentista);
      if (dentist) {
        const dentistId = dentist.id || dentist.uid || dentist.firebaseUid;
        const notifId = `notif-appt-${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: dentistId,
          message: `Novo agendamento: ${record.paciente} às ${record.data}`,
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

  const handleCreateUser = async (newUser: any): Promise<boolean> => {
    const id = `user-${Date.now()}`;
    const user = {
      id,
      name: newUser.name,
      role: newUser.role,
      modules: newUser.modules || (newUser.role === 'Admin' ? 'Todos' : (newUser.role === 'Dentista' ? 'Dashboard, Agenda, Pacientes' : 'Agenda, Pacientes, Financeiro')),
      username: newUser.username || (newUser.name || "user").toLowerCase().replace(' ', '.'),
      password: newUser.password || '123',
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
    const patient = patients.find(p => p.name === record.paciente);
    
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
          time: "conforme agendado"
        })
      });

      if (response.ok) {
        alert(`Lembrete enviado para ${patient.email}!`);
      } else {
        const err = await response.json();
        alert(`Erro ao enviar: ${err.error || 'Serviço de e-mail não configurado'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleWhatsAppReminder = (record: DentalRecord) => {
    console.log("Acionando lembrete WhatsApp para:", record.paciente);
    
    // Auxiliar para normalizar nomes para comparação (remove acentos, espaços extras e símbolos)
    const normalize = (str: string) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, ' ') // Mantém apenas alfanuméricos como espaços
        .replace(/\s+/g, ' ') // Remove espaços múltiplos
        .trim();
    };

    const normalizedTarget = normalize(record.paciente);
    
    // Procura o paciente com comparação robusta
    const patient = patients.find(p => normalize(p.name) === normalizedTarget);
    
    console.log("Resultado da busca do paciente:", patient ? "Encontrado" : "Não encontrado");
    
    if (!patient) {
      // Se não encontrar pelo nome exato normalizado, tenta ver se o nome do cadastro está contido no agendamento ou vice-versa
      const fallbackPatient = patients.find(p => {
        const pNorm = normalize(p.name);
        return pNorm.includes(normalizedTarget) || normalizedTarget.includes(pNorm);
      });
      
      if (fallbackPatient) {
        console.log("Paciente encontrado via busca flexível:", fallbackPatient.name);
        proceedWithWhatsApp(fallbackPatient, record);
      } else {
        console.warn("Paciente não encontrado na base de dados:", record.paciente);
        console.log("Nomes disponíveis na base (normalizados):", patients.map(p => normalize(p.name)).join(', '));
        alert(`O paciente "${record.paciente}" não foi encontrado no cadastro de pacientes.\n\nCertifique-se de que o nome cadastrado no agendamento é o mesmo que consta na aba 'Pacientes'.`);
      }
    } else {
      proceedWithWhatsApp(patient, record);
    }
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
    const message = `Olá ${record.paciente}, aqui é da Clínica Odontológica. Confirmando sua consulta de ${record.procedimento} para o dia ${format(parseISO(record.data), "dd/MM")}${timeStr} com ${record.dentista}. Podemos confirmar?`;
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

      // 2. Notification for Admin, Dentist and Patient (wrapped in try-catch to not block cancellation)
      try {
        const notifId = `notif-cancel-${Date.now()}`;
        const admins = users.filter(u => u.role === 'Admin');
        const targetUsers = [...admins];
        
        const dentist = users.find(u => u.name === record.dentista);
        if (dentist && !targetUsers.some(u => (u.id || u.uid) === (dentist.id || dentist.uid))) {
          targetUsers.push(dentist);
        }

        // Notify the patient if they exist as a registered user in our system
        const patientUser = users.find(u => u.name === record.paciente);
        if (patientUser && !targetUsers.some(u => (u.id || u.uid) === (patientUser.id || patientUser.uid))) {
          targetUsers.push(patientUser);
        }

        console.log(`Notificando ${targetUsers.length} usuários sobre cancelamento...`);
        for (const u of targetUsers) {
          const uId = u.id || u.uid || u.firebaseUid;
          if (!uId) continue;

          const individualNotifId = `${notifId}-${uId}`;
          await setDoc(doc(db, 'notifications', individualNotifId), {
            id: individualNotifId,
            userId: uId,
            message: `Agendamento de ${record.paciente} CANCELADO.`,
            type: 'warning',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      } catch (notifErr) {
        console.warn("Agendamento cancelado, mas houve erro ao enviar notificações:", notifErr);
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
    if (!record) return;

    try {
      // 1. Update record status
      await setDoc(doc(db, 'records', recordId), {
        status: 'Em Atendimento'
      }, { merge: true });

      // 2. Update current doctor status
      const doctor = users.find(u => u.name === record.dentista);
      if (doctor) {
        await setDoc(doc(db, 'users', doctor.id), {
          availability: 'em_atendimento',
          currentPatient: record.paciente
        }, { merge: true });
      }
    } catch (e) {
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
    // Link the logical user to the current Firebase Auth session
    if (auth.currentUser) {
      try {
        // 1. Update the main user document
        await setDoc(doc(db, 'users', userProfile.id), {
          firebaseUid: auth.currentUser.uid,
          lastLogin: new Date().toISOString()
        }, { merge: true });
        
        // 2. Create/Update a security mapping using UID as key for Rules lookup
        await setDoc(doc(db, 'users_by_uid', auth.currentUser.uid), {
          userDocId: userProfile.id,
          name: userProfile.name,
          role: userProfile.role,
          updatedAt: new Date().toISOString()
        });

        // Add firebaseUid to userProfile so currentUser has it
        userProfile.firebaseUid = auth.currentUser.uid;
      } catch (e) {
        console.error("Error linking Firebase UID:", e);
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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (isPublicBooking) {
    return <PublicBookingView onBack={() => setIsPublicBooking(false)} users={users} />;
  }

  if (!isAuthenticated) {
    return <LoginView users={users} onLogin={handleLogin} onOpenBooking={() => setIsPublicBooking(true)} />;
  }

  const renderContent = () => {
    if (subPage === 'Prontuario' && activePage === 'Pacientes' && selectedPatientId) {
      return <MedicalChartView patientName={selectedPatientId} data={filteredRecords} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'Cadastrar' && activePage === 'Pacientes') {
      return <PatientFormView onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'Editar' && activePage === 'Pacientes' && selectedPatientId) {
      return <PatientFormView isEdit patientId={selectedPatientId} patients={patients} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'NovoAgendamento' && activePage === 'Agenda') {
      return <AppointmentFormView patients={patients} data={filteredRecords} users={users} onSave={handleCreateAppointment} onBack={() => setSubPage(null)} />;
    }

    // Permission Guard for module rendering
    const canAccessFinance = currentUser?.role === 'Admin' || currentUser?.role === 'Recepcionista';
    const canAccessAdmin = currentUser?.role === 'Admin';
    const canAccessConfig = currentUser?.role === 'Admin';

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
            <DashboardView filteredData={filteredData} onSendWhatsApp={handleWhatsAppReminder} />
          </div>
        );
      case 'Retorno':
        return <RecallView data={data} />;
      case 'Documentos':
        return <DocumentsView data={data} users={users} currentUser={currentUser} />;
      case 'Pacientes':
        return (
          <PatientsView 
            data={filteredData} 
            onOpenChart={(id) => { setSelectedPatientId(id); setSubPage('Prontuario'); }}
            onOpenEdit={(id) => { setSelectedPatientId(id); setSubPage('Editar'); }}
            onAdd={() => setSubPage('Cadastrar')}
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
        return canAccessFinance ? <FinanceView data={filteredData} onUpdatePayment={handleUpdatePaymentStatus} /> : <div className="p-8 text-slate-400">Acesso restrito ao Financeiro.</div>;
      case 'Equipe':
        return <TeamView data={filteredData} users={users} currentUser={currentUser} />;
      case 'Administração':
        return canAccessAdmin ? <AdminView users={users} onAddUser={handleCreateUser} tickets={tickets} onOpenSupport={handleSupportTicket} onUpdateTicket={handleUpdateTicketStatus} currentUser={currentUser} initialTab={subPage === 'Suporte' ? 'tickets' : 'users'} /> : <div className="p-8 text-slate-400">Acesso restrito à Administração.</div>;
      default:
        return <DashboardView filteredData={filteredData} onSendWhatsApp={handleWhatsAppReminder} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {editingPatientEmail && (
        <EmailModal 
          patientName={editingPatientEmail.patientName} 
          onClose={() => setEditingPatientEmail(null)} 
          onSave={handleSavePatientEmail} 
        />
      )}

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
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight hidden xs:block">OdontoDash <span className="text-brand-cyan font-normal">Analytics</span></h1>
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
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <RibbonItem 
              icon={<LayoutDashboard className="w-4 h-4" />} 
              label="Dashboard" 
              active={activePage === 'Dashboard'} 
              onClick={() => { setActivePage('Dashboard'); setSubPage(null); }}
            />
            <RibbonItem 
              icon={<Users className="w-4 h-4" />} 
              label="Pacientes" 
              active={activePage === 'Pacientes'} 
              onClick={() => { setActivePage('Pacientes'); setSubPage(null); }}
            />
            <RibbonItem 
              icon={<Calendar className="w-4 h-4" />} 
              label="Agenda" 
              active={activePage === 'Agenda'} 
              onClick={() => { setActivePage('Agenda'); setSubPage(null); }}
            />
            <RibbonItem 
              icon={<RotateCcw className="w-4 h-4" />} 
              label="Retorno" 
              active={activePage === 'Retorno'} 
              onClick={() => { setActivePage('Retorno'); setSubPage(null); }}
            />
            <RibbonItem 
              icon={<FileText className="w-4 h-4" />} 
              label="Documentos" 
              active={activePage === 'Documentos'} 
              onClick={() => { setActivePage('Documentos'); setSubPage(null); }}
            />
            {(currentUser?.role === 'Admin' || currentUser?.role === 'Recepcionista') && (
              <RibbonItem 
                icon={<DollarSign className="w-4 h-4" />} 
                label="Financeiro" 
                active={activePage === 'Financeiro'} 
                onClick={() => { setActivePage('Financeiro'); setSubPage(null); }}
              />
            )}
            <RibbonItem 
              icon={<Stethoscope className="w-4 h-4" />} 
              label="Equipe" 
              active={activePage === 'Equipe'} 
              onClick={() => { setActivePage('Equipe'); setSubPage(null); }}
            />
            {currentUser?.role === 'Admin' && (
              <RibbonItem 
                icon={<Activity className="w-4 h-4" />} 
                label="Adm" 
                active={activePage === 'Administração'} 
                onClick={() => { setActivePage('Administração'); setSubPage(null); }}
              />
            )}
          </nav>

          <div className="hidden lg:block w-px h-6 bg-slate-100 mx-1 shrink-0" />
          
          <button 
            onClick={handleSupportTicket}
            className="flex items-center gap-1.5 px-2 md:px-3 py-2 rounded-xl text-brand-cyan hover:bg-brand-cyan/5 transition-all group shrink-0"
          >
            <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Suporte</span>
          </button>

          <div className="w-px h-6 bg-slate-100 mx-1 shrink-0" />
          
          <div className="flex items-center gap-2">
            {currentUser?.role === 'Admin' && openTicketsCount > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setActivePage('Administração'); setSubPage('Suporte'); }}
                className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-all cursor-pointer group shadow-sm ring-4 ring-rose-500/5 shrink-0"
              >
                <div className="relative">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-rose-50 flex animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest leading-none hidden sm:inline">
                  {openTicketsCount} <span className="hidden md:inline">Chamado{openTicketsCount > 1 ? 's' : ''} Aberto{openTicketsCount > 1 ? 's' : ''}</span>
                </span>
                <span className="text-[10px] font-black text-rose-700 md:hidden">
                  {openTicketsCount}
                </span>
              </motion.button>
            )}

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
                                {notif.createdAt ? format(parseISO(notif.createdAt), 'HH:mm - dd MMM', { locale: ptBR }) : 'Agora'}
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
                <MobileNavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => { setActivePage('Dashboard'); setIsMenuOpen(false); }} />
                <MobileNavItem icon={<Users className="w-5 h-5" />} label="Pacientes" active={activePage === 'Pacientes'} onClick={() => { setActivePage('Pacientes'); setIsMenuOpen(false); }} />
                <MobileNavItem icon={<Calendar className="w-5 h-5" />} label="Agenda" active={activePage === 'Agenda'} onClick={() => { setActivePage('Agenda'); setIsMenuOpen(false); }} />
                <MobileNavItem icon={<RotateCcw className="w-5 h-5" />} label="Retorno" active={activePage === 'Retorno'} onClick={() => { setActivePage('Retorno'); setIsMenuOpen(false); }} />
                <MobileNavItem icon={<FileText className="w-5 h-5" />} label="Documentos" active={activePage === 'Documentos'} onClick={() => { setActivePage('Documentos'); setIsMenuOpen(false); }} />
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Recepcionista') && (
                  <MobileNavItem icon={<DollarSign className="w-5 h-5" />} label="Financeiro" active={activePage === 'Financeiro'} onClick={() => { setActivePage('Financeiro'); setIsMenuOpen(false); }} />
                )}
                <MobileNavItem icon={<Stethoscope className="w-5 h-5" />} label="Equipe" active={activePage === 'Equipe'} onClick={() => { setActivePage('Equipe'); setIsMenuOpen(false); }} />
                {currentUser?.role === 'Admin' && (
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
              onChange={(e) => setSearchPatient(e.target.value)}
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

      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest gap-2">
        <div className="flex items-center gap-4">
          <span>Dentista Responsável: Dra. Helena Vieira</span>
          <span className="hidden md:inline">•</span>
          <span>CRO-SP 123456</span>
        </div>
        <div>Atualizado em tempo real • Sincronizado com Looker Studio</div>
      </footer>

      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-100"
            >
              <div className="bg-brand-cyan p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Suporte Técnico</h3>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest font-mono">ClinicalGate / Infraestrutura</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSupportModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex gap-4 items-start p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <Cpu className="w-8 h-8 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-800 mb-1">Central de Ajuda Direta</p>
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      Descreva detalhadamente sua solicitação técnica ou falha de infraestrutura. 
                      Nossos técnicos responderão via painel administrativo ou e-mail cadastrado.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição do Problema</label>
                  <textarea 
                    autoFocus
                    placeholder="Ex: O sistema está lento ao carregar a agenda de amanhã..."
                    value={supportDescription}
                    onChange={(e) => setSupportDescription(e.target.value)}
                    className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all text-sm text-slate-800 font-sans resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsSupportModalOpen(false)}
                    className="flex-1 py-4 text-slate-400 font-bold border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-xs uppercase"
                  >
                    Descartar
                  </button>
                  <button 
                    disabled={isSendingTicket || !supportDescription.trim()}
                    onClick={handleSendTicket}
                    className="flex-[2] py-4 bg-brand-cyan text-white font-bold rounded-2xl disabled:opacity-50 hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    {isSendingTicket ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        Enviar Chamado
                      </>
                    )}
                  </button>
                </div>

                {tickets.filter(t => t.userId === auth.currentUser?.uid).length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Meus Chamados Recentes</h4>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 no-scrollbar">
                      {tickets.filter(t => t.userId === auth.currentUser?.uid).map(ticket => (
                        <div key={ticket.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-slate-600 truncate italic">"{ticket.description}"</p>
                            <p className="text-[8px] text-slate-400 font-mono mt-1">#{ticket.id.split('-')[1]} • {format(new Date(ticket.createdAt), 'dd/MM HH:mm')}</p>
                          </div>
                          <span className={cn(
                            "text-[8px] font-bold uppercase px-2 py-1 rounded ml-3 shrink-0",
                            ticket.status === 'Resolvido' ? "bg-emerald-100 text-emerald-700" : 
                            ticket.status === 'Em Analise' ? "bg-amber-100 text-amber-700" :
                            "bg-brand-cyan/10 text-brand-cyan"
                          )}>
                            {ticket.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <p className="text-[9px] text-slate-400 font-mono italic">
                  ClinicalGate V2.4.1 | Protocolo de Atendimento Automatizado
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleSupportTicket}
        className="fixed bottom-6 right-6 z-[90] bg-brand-cyan text-white p-4 rounded-full shadow-2xl shadow-brand-cyan/40 hover:shadow-brand-cyan/60 transition-all flex items-center justify-center group"
      >
        <HelpCircle className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] group-hover:ml-2 transition-all duration-500 font-bold text-xs uppercase tracking-widest">
          Suporte
        </span>
      </motion.button>
    </div>
  );
}

function RecallView({ data }: { data: DentalRecord[] }) {
  const recallList = useMemo(() => {
    const lastVisits: { [key: string]: string } = {};
    data.forEach(r => {
      if (!lastVisits[r.paciente] || new Date(r.data) > new Date(lastVisits[r.paciente])) {
        lastVisits[r.paciente] = r.data;
      }
    });

    const sixMonthsAgo = subMonths(new Date(), 6);
    
    return Object.entries(lastVisits)
      .filter(([_, lastDate]) => parseISO(lastDate) < sixMonthsAgo)
      .map(([name, lastDate]) => ({
        name,
        lastDate,
        monthsAway: Math.floor((new Date().getTime() - parseISO(lastDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
      }))
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
            <p className="text-[10px] text-slate-400 uppercase font-mono mb-4">Última consulta: {format(parseISO(p.lastDate), 'dd/MM/yyyy')}</p>
            
            <button 
              onClick={() => {
                const msg = encodeURIComponent(`Olá ${p.name}, aqui é da OdontoDash Analytics! Notamos que faz ${p.monthsAway} meses desde sua última limpeza. Vamos agendar seu retorno?`);
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

function DocumentsView({ data, users, currentUser }: { data: DentalRecord[], users: any[], currentUser: any }) {
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
            <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase">Sorriso & Saúde • CRO-SP 123456</p>
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
  onSendWhatsApp
}: { 
  filteredData: DentalRecord[];
  onSendWhatsApp: (record: DentalRecord) => void;
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
      const month = format(parseISO(r.data), 'MMM', { locale: ptBR });
      months[month] = (months[month] || 0) + r.valor;
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

  const COLORS = ['#0891b2', '#0ea5e9', '#22d3ee', '#38bdf8', '#7dd3fc'];

  return (
    <>
      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard 
          label="Taxa de Conversão" 
          value={formatPercent(metrics.taxaConversao)} 
          description="Realizados vs Agendados"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard 
          label="Pacientes Atendidos" 
          value={metrics.uniquePatients} 
          description="Pacientes únicos no período"
          trend={-2.1}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white p-4 border border-slate-200 shadow-sm h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Crescimento Mensal de Consultas</h2>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-brand-cyan"></span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Faturamento</span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(val: number) => [formatCurrency(val), 'Faturamento']} />
                <Area type="monotone" dataKey="value" stroke="#0891b2" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white border border-slate-200 p-4 h-[320px]">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-4">Mix de Procedimentos</h2>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={procedureDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                  {procedureDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {procedureDistribution.slice(0, 3).map((entry, i) => (
              <div key={entry.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 uppercase truncate max-w-[120px]">{entry.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{Math.round((entry.value / filteredData.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1">
                  <div className="h-1" style={{ backgroundColor: COLORS[i % COLORS.length], width: `${(entry.value / filteredData.length) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white p-4 border border-slate-200 shadow-sm h-[320px]">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-6">Produção por Equipe</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dentistProductivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#1e293b' }} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [formatCurrency(val), 'Produção']} />
                <Bar dataKey="value" fill="#0f172a" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-2 bg-white border border-slate-200 overflow-hidden flex flex-col h-[320px]">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center shrink-0">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Procedimentos Recentes</h2>
            <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 font-bold">{filteredData.length} Registros</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 italic font-serif">Data</th>
                  <th className="px-4 py-2">Paciente</th>
                  <th className="px-4 py-2">Procedimento</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono text-slate-600">
                {filteredData.slice(0, 15).map((record) => (
                  <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">{format(parseISO(record.data), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-2 font-sans font-medium text-slate-900">{record.paciente}</td>
                    <td className="px-4 py-2">{record.procedimento}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(record.valor)}</td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSendWhatsApp(record); }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function PatientsView({ 
  data, 
  onOpenChart, 
  onOpenEdit, 
  onAdd 
}: { 
  data: DentalRecord[]; 
  onOpenChart: (id: string) => void;
  onOpenEdit: (id: string) => void;
  onAdd: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const allPatients = useMemo(() => {
    const list: { [key: string]: { lastVisit: string, totalSpent: number, procedures: number } } = {};
    data.forEach(r => {
      const pName = r.paciente || 'Paciente Sem Nome';
      if (!list[pName]) {
        list[pName] = { lastVisit: r.data, totalSpent: 0, procedures: 0 };
      }
      list[pName].totalSpent += r.valor || 0;
      list[pName].procedures += 1;
      if (new Date(r.data) > new Date(list[pName].lastVisit)) {
        list[pName].lastVisit = r.data;
      }
    });
    return Object.entries(list).map(([name, stats]) => ({ name, ...stats }));
  }, [data]);

  const filteredPatients = useMemo(() => {
    return allPatients
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPatients, searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section className="bg-white border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Base de Pacientes</h2>
          <p className="text-[10px] text-slate-400 font-medium">{filteredPatients.length} pacientes encontrados</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 text-xs focus:ring-1 focus:ring-brand-cyan outline-none rounded transition-all"
            />
          </div>
          <button 
            onClick={onAdd}
            className="whitespace-nowrap text-[10px] bg-brand-cyan text-white px-4 py-2 font-bold rounded cursor-pointer hover:bg-brand-cyan/90 transition-colors shadow-sm"
          >
            Cadastrar Novo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Nome do Paciente</th>
              <th className="px-6 py-4">Última Visita</th>
              <th className="px-6 py-4 text-center">Procedimentos</th>
              <th className="px-6 py-4 text-right">Investimento Total</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono text-slate-600">
            {currentPatients.length > 0 ? (
              currentPatients.map((p) => (
                <tr key={p.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-sans font-semibold text-slate-900 text-sm group-hover:text-brand-cyan transition-colors">{p.name}</div>
                  </td>
                  <td className="px-6 py-4">{format(parseISO(p.lastVisit), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 text-center font-bold">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{p.procedures}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(p.totalSpent)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => onOpenChart(p.name)}
                        className="text-[10px] bg-cyan-50 text-brand-cyan px-2 py-1 rounded border border-cyan-100 hover:bg-cyan-100 font-bold transition-colors cursor-pointer"
                      >
                        Prontuário
                      </button>
                      <button 
                        onClick={() => onOpenEdit(p.name)}
                        className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-sans italic">
                  Nenhum paciente encontrado para a busca "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Exibindo <span className="font-bold text-slate-800">{startIndex + 1}</span> a <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredPatients.length)}</span> de <span className="font-bold text-slate-800">{filteredPatients.length}</span> pacientes
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 mx-2">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                // Mostrar as primeiras 2, a atual, as últimas 2, e reticências se necessário
                if (
                  page <= 2 || 
                  page >= totalPages - 1 || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-bold transition-all ${
                        currentPage === page 
                          ? 'bg-brand-cyan text-white shadow-sm' 
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-brand-cyan/50 hover:text-brand-cyan'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  (page === 3 && currentPage > 4) || 
                  (page === totalPages - 2 && currentPage < totalPages - 3)
                ) {
                  return <span key={page} className="px-1 text-slate-300">...</span>;
                }
                return null;
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
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
  const upcoming = data.filter(r => r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento');
  const cancelled = fullData.filter(r => r.status === 'Cancelado').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <section className="bg-white border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Próximos Agendamentos</h2>
        <div className="flex gap-2">
          <button 
            onClick={onAdd}
            className="text-[10px] bg-brand-cyan text-white px-3 py-1 font-bold rounded cursor-pointer"
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
              "border p-3 rounded flex gap-3 items-start relative hover:border-brand-cyan transition-colors",
              apt.status === 'Em Atendimento' ? "bg-cyan-50/50 border-brand-cyan shadow-sm" : "bg-slate-50/50 border-slate-100"
            )}>
              <div className="bg-white p-2 border border-slate-100 rounded text-center min-w-[50px]">
                <div className="text-[10px] text-slate-400 uppercase">{format(parseISO(apt.data), 'MMM', { locale: ptBR })}</div>
                <div className="text-lg font-bold text-slate-800">{format(parseISO(apt.data), 'dd')}</div>
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
                    title={(apt as any).reminderSent ? `Enviado em: ${new Date((apt as any).reminderSentAt).toLocaleString()}` : "Enviar Lembrete por E-mail"}
                  >
                    <Bell className="w-3.5 h-3.5" />
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
                <span className="text-[10px] font-medium text-slate-600">{c.paciente}</span>
                <span className="text-[8px] text-slate-400 font-mono">({format(parseISO(c.data), 'dd/MM')})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FinanceView({ data, onUpdatePayment }: { data: DentalRecord[]; onUpdatePayment: (id: string, status: any) => void }) {
  const stats = useMemo(() => {
    const paid = data.filter(r => r.statusPagamento === 'Pago').reduce((s, r) => s + r.valor, 0);
    const pending = data.filter(r => r.statusPagamento === 'Pendente').reduce((s, r) => s + r.valor, 0);
    const overdue = data.filter(r => r.statusPagamento === 'Atrasado').reduce((s, r) => s + r.valor, 0);
    return { paid, pending, overdue };
  }, [data]);

  const handleViewReceipt = (patient: string) => {
    alert(`Gerando recibo para ${patient}...\nRecibo #RC-${Math.floor(Math.random() * 10000)} disponível para impressão.`);
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
            <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
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
                      onClick={() => handleViewReceipt(r.paciente)}
                      className="text-[10px] text-brand-cyan underline font-sans cursor-pointer hover:font-bold"
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
    </div>
  );
}

function TeamView({ data, users, currentUser }: { data: DentalRecord[]; users: any[]; currentUser: any }) {
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

  const canSeeFullStats = currentUser?.role === 'Admin' || currentUser?.role === 'Recepcionista';

  return (
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
              <div className="mt-6 flex gap-2">
                 <button className="flex-1 bg-slate-50 py-1.5 text-[9px] font-bold uppercase text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer">Agenda</button>
                 <button className="flex-1 bg-slate-50 py-1.5 text-[9px] font-bold uppercase text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer">Comissões</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
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

function SettingsView() {
  return (
    <div className="bg-white border border-slate-200 p-8 max-w-2xl mx-auto space-y-8 shadow-sm">
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
              <input type="text" defaultValue="Sorriso & Saúde" className="w-full text-xs p-2 border border-slate-100 bg-slate-50" />
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

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button className="text-[10px] font-bold uppercase text-slate-400">Restaurar Padrões</button>
          <button className="bg-slate-900 text-white px-8 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-cyan transition-all cursor-pointer">Salvar Preferências</button>
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
  onUpdate 
}: { 
  patientName: string;
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

function MedicalChartView({ patientName, data, onBack }: { patientName: string; data: DentalRecord[]; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'odontogram' | 'info'>('timeline');
  const patientHistory = data.filter(r => r.paciente === patientName);
  const totalSpent = patientHistory.reduce((s, r) => s + r.valor, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold font-serif italic text-slate-800">{patientName}</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Prontuário Digital</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-right">
           <div className="text-[9px] text-emerald-600 uppercase font-bold">Investimento Total</div>
           <div className="text-lg font-bold text-emerald-800 font-mono">{formatCurrency(totalSpent)}</div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'timeline', label: 'Histórico', icon: Activity },
          { id: 'odontogram', label: 'Odontograma', icon: ClipboardList },
          { id: 'info', label: 'Informações', icon: User }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg flex items-center gap-2",
              activeTab === tab.id 
                ? "bg-white text-brand-cyan shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-brand-cyan" : "text-slate-400")} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 space-y-4">
              {patientHistory.length === 0 ? (
                <div className="py-20 text-center bg-white border border-slate-200 border-dashed rounded-2xl">
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Nenhum histórico registrado para este paciente.</p>
                </div>
              ) : (
                patientHistory.map((record, i) => (
                  <div key={record.id} className="relative pl-8 pb-8 last:pb-0">
                    {i !== patientHistory.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100"></div>}
                    <div className="absolute left-0 top-1.5 w-[24px] h-[24px] bg-white border-2 border-brand-cyan rounded-full flex items-center justify-center">
                      <Activity className="w-3 h-3 text-brand-cyan" />
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{record.procedimento}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">{format(parseISO(record.data), "dd 'de' MMMM, yyyy", { locale: ptBR })} • {record.horario}</p>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{record.dentista}</span>
                        <span className="text-xs font-bold text-slate-800">{formatCurrency(record.valor)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'odontogram' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-300">
             <Odontogram patientName={patientName} />
             <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
                <div className="bg-amber-100 p-3 rounded-xl h-fit">
                  <ClipboardList className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-amber-800 font-bold text-sm mb-1 uppercase tracking-tight">Como utilizar o Odontograma</h4>
                  <p className="text-[11px] text-amber-700/80 leading-relaxed font-medium">
                    O odontograma é a representação visual da boca do paciente. 
                    <br/>- Clique em qualquer dente para abrir o menu de status.
                    <br/>- Marque Cáries, Restaurações ou Extrações para manter o histórico visual atualizado.
                    <br/>- As alterações ficam salvas permanentemente no banco de dados da clínica.
                  </p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Informações Pessoais</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">CPF</label>
                <div className="text-sm font-bold text-slate-800">123.456.789-00</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Nascimento</label>
                <div className="text-sm font-bold text-slate-800">15/05/1985 (39 anos)</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Gênero</label>
                <div className="text-sm font-bold text-slate-800">Feminino</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Celular / WhatsApp</label>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  (11) 98888-7777 
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">E-mail</label>
                <div className="text-sm font-bold text-slate-800 truncate">paciente.exemplo@provedor.com</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Ultima Visita</label>
                <div className="text-sm font-bold text-slate-800">Há 2 meses</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientFormView({ isEdit = false, patientId = '', onBack, onSave, patients = [] }: { isEdit?: boolean; patientId?: string; onBack: () => void; onSave: (p: any, id?: string) => Promise<boolean>; patients?: any[] }) {
  const patient = isEdit ? patients.find(p => p.id === patientId) : null;
  
  const [name, setName] = useState(patient?.name || '');
  const [cpf, setCpf] = useState(patient?.cpf || '');
  const [phone, setPhone] = useState(patient?.phone || patient?.telefone || patient?.celular || '');
  const [email, setEmail] = useState(patient?.email || '');
  const [procedimento, setProcedimento] = useState('Avaliação Inicial');
  const [valor, setValor] = useState('150');
  const [isSaving, setIsSaving] = useState(false);

  // Update state if patient data becomes available (syncing)
  React.useEffect(() => {
    if (isEdit && patient) {
      if (!name) setName(patient.name || '');
      if (!cpf) setCpf(patient.cpf || '');
      if (!phone) setPhone(patient.phone || patient.telefone || patient.celular || '');
      if (!email) setEmail(patient.email || '');
    }
  }, [patient, isEdit]);

  const handleProcedureChange = (procName: string) => {
    setProcedimento(procName);
    const option = PROCEDURES_OPTIONS.find(p => p.name === procName);
    if (option) {
      setValor(option.price.toString());
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} disabled={isSaving} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors disabled:opacity-50">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">{isEdit ? `Editar: ${patient?.name || patientId}` : 'Novo Paciente'}</h2>
      </div>

      <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Nome Completo</label>
            <input 
              disabled={isSaving}
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none disabled:bg-slate-50" 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">CPF</label>
              <input 
                disabled={isSaving}
                type="text" 
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00" 
                className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none disabled:bg-slate-50" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">Celular</label>
              <input 
                disabled={isSaving}
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000" 
                className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none disabled:bg-slate-50" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">E-mail</label>
            <input 
              disabled={isSaving}
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none disabled:bg-slate-50" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Procedimento</label>
              <select 
                disabled={isSaving || isEdit}
                value={procedimento}
                onChange={(e) => handleProcedureChange(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none disabled:bg-slate-50 cursor-pointer"
              >
                {PROCEDURES_OPTIONS.map(opt => (
                  <option key={opt.name} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Valor (R$)</label>
              <input 
                disabled={isSaving || isEdit}
                type="number" 
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none disabled:bg-slate-50" 
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onBack} disabled={isSaving} className="px-6 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">Cancelar</button>
          <button 
            disabled={isSaving}
            onClick={async () => {
              if (name.trim()) {
                setIsSaving(true);
                try {
                  await onSave({ name, cpf, phone, email, procedimento, valor }, isEdit ? patientId : undefined);
                } finally {
                  setIsSaving(false);
                }
              } else {
                alert('Por favor, preencha o nome do paciente.');
              }
            }}
            className="bg-brand-cyan text-white px-8 py-2 rounded text-xs font-bold hover:bg-emerald-600 transition-colors cursor-pointer disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSaving ? 'Salvando...' : (isEdit ? 'Atualizar Cadastro' : 'Confirmar Cadastro')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentFormView({ onBack, onSave, data, users, patients }: { onBack: () => void; onSave: (a: any) => Promise<boolean>; data: DentalRecord[]; users: any[]; patients: any[] }) {
  const [paciente, setPaciente] = useState('');
  const [dataVal, setDataVal] = useState(format(new Date(), 'yyyy-MM-dd'));
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
    if (!paciente || !dentista || !dataVal) {
      alert('Por favor, preencha todos os campos do agendamento.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ paciente, data: dataVal, dentista, procedimento, valor });
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
        <h2 className="text-xl font-bold text-slate-800">Novo Agendamento</h2>
      </div>

      <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm relative overflow-hidden">
        {isSaving && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-brand-cyan animate-spin" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Salvando Agendamento...</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Paciente</label>
            <select 
              disabled={isSaving}
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
                value={dataVal}
                onChange={(e) => setDataVal(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">Horário</label>
              <input 
                disabled={isSaving}
                type="time" 
                className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none cursor-pointer disabled:bg-slate-50" 
              />
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
            {isSaving ? 'Salvando...' : 'Confirmar Agenda'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminView({ 
  users, 
  onAddUser, 
  tickets, 
  onOpenSupport, 
  onUpdateTicket, 
  currentUser,
  initialTab = 'users'
}: { 
  users: any[]; 
  onAddUser: (u: any) => Promise<boolean>; 
  tickets: any[]; 
  onOpenSupport: () => void; 
  onUpdateTicket: (id: string, status: 'Em Analise' | 'Resolvido') => Promise<void>;
  currentUser: any;
  initialTab?: 'users' | 'tickets' | 'settings' | 'import';
}) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Dentista');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'tickets' | 'settings' | 'import'>(initialTab);

  // Sync activeTab with initialTab changes
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isProcessingTicket, setIsProcessingTicket] = useState<string | null>(null);

  const handleTicketAction = async (id: string, status: 'Em Analise' | 'Resolvido') => {
    setIsProcessingTicket(id);
    await onUpdateTicket(id, status);
    setIsProcessingTicket(null);
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
            onClick={() => setActiveTab('tickets')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all shrink-0",
              activeTab === 'tickets' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Suporte ({tickets.filter(t => t.status !== 'Resolvido').length})
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
        {activeTab === 'settings' && <SettingsView />}
        
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
        
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
              <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Chamados de Suporte</h3>
              <span className="text-[10px] bg-slate-50 text-slate-500 px-3 py-1 rounded-full font-mono font-bold border border-slate-100">
                Total: {tickets.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map(ticket => (
                <div key={ticket.id} className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-brand-cyan transition-colors group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={cn(
                        "text-[8px] font-black uppercase px-2 py-1 rounded",
                        ticket.status === 'Resolvido' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        ticket.status === 'Em Analise' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-blue-50 text-blue-600 border border-blue-100"
                      )}>
                        {ticket.status}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">#{ticket.id.split('-')[1]}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-2">{ticket.description}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] uppercase font-bold text-slate-600">{ticket.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] uppercase font-bold text-slate-400">{format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  {ticket.status !== 'Resolvido' && (
                    <div className="flex gap-2 pt-4 border-t border-slate-50">
                      {ticket.status === 'Pendente' && (
                        <button 
                           disabled={isProcessingTicket === ticket.id}
                           onClick={() => handleTicketAction(ticket.id, 'Em Analise')}
                           className="flex-1 py-2 bg-amber-500 text-white text-[9px] font-bold uppercase rounded-lg hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
                        >
                           Assumir
                        </button>
                      )}
                      <button 
                         disabled={isProcessingTicket === ticket.id}
                         onClick={() => handleTicketAction(ticket.id, 'Resolvido')}
                         className="flex-1 py-2 bg-slate-900 text-white text-[9px] font-bold uppercase rounded-lg hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50"
                      >
                         Resolver
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <Cpu className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Nenhum chamado registrado</p>
                </div>
              )}
            </div>
          </div>
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
                        onChange={(e) => setNewUserName(e.target.value)}
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
                      <label className="text-[9px] uppercase font-bold text-slate-400">Login</label>
                      <input 
                        type="text" 
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Senha</label>
                      <input 
                        type="password" 
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-100 text-sm focus:border-brand-cyan outline-none rounded-lg" 
                      />
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
                          setIsSubmitting(true);
                          try {
                            const success = await onAddUser({ 
                              name: newUserName, 
                              role: newUserRole, 
                              username: newUserUsername.toLowerCase().trim(), 
                              password: newUserPassword 
                            }); 
                            
                            if (success) {
                              setNewUserName(''); 
                              setNewUserUsername(''); 
                              setNewUserPassword('123'); 
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
                        <th className="px-6 py-4">Cargo</th>
                        <th className="px-6 py-4">Acesso</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono text-slate-600 divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 font-sans font-bold text-slate-800">{u.name}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-white border border-slate-100 text-slate-600 text-[8px] font-black uppercase rounded shadow-sm">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[9px] text-slate-400 font-sans">{u.modules}</td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex items-center justify-center gap-1.5 font-sans font-bold text-[9px] text-emerald-500 uppercase">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               Ativo
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
                <button 
                  onClick={onOpenSupport}
                  className="w-full py-3 bg-brand-cyan/10 hover:bg-brand-cyan text-brand-cyan hover:text-white text-[9px] font-bold uppercase rounded-xl transition-all border border-brand-cyan/20 group-hover:border-brand-cyan/60"
                >
                  Suporte VIP
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
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

function LoginView({ users, onLogin, onOpenBooking }: { users: any[]; onLogin: (user: any) => void; onOpenBooking: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (attempts >= 5) {
      setError('Muitas tentativas. Tente novamente em 1 minuto.');
      return;
    }

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    
    // Simulate server delay/security check
    await new Promise(resolve => setTimeout(resolve, 1200));

    const user = users.find(u => 
      (u.username || "").toLowerCase() === (username || "").toLowerCase().trim() && 
      u.password === password.trim()
    );

    if (user) {
      try {
        await onLogin(user);
      } catch (e: any) {
        setError(e.message || "Erro durante o login.");
        setIsLoading(false);
      }
    } else {
      setError('Credenciais inválidas.');
      setAttempts(prev => prev + 1);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-brand-cyan/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-8 border border-slate-100"
        >
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-brand-cyan rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-cyan/20">
                <Plus className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Clinical<span className="text-brand-cyan">Gate</span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">Acesse sua conta para continuar</p>
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
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all rounded-xl placeholder:text-slate-300"
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
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-sm py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/5 transition-all rounded-xl placeholder:text-slate-300"
                placeholder="Sua senha"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 text-rose-500 text-[11px] p-3 text-center rounded-xl font-medium border border-rose-100 overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-3.5 text-sm font-bold mt-2 shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 rounded-xl",
                isLoading ? "bg-slate-100 text-slate-400" : "bg-brand-cyan text-white hover:bg-brand-cyan/90 cursor-pointer shadow-brand-cyan/20"
              )}
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
                />
              ) : 'Entrar na Plataforma'}
            </button>
            <button
              type="button"
              onClick={onOpenBooking}
              className="w-full py-3.5 text-sm font-bold mt-2 text-slate-500 hover:text-brand-cyan transition-colors flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 hover:border-brand-cyan"
            >
              <Calendar className="w-4 h-4" />
              Agendar Consulta Online
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-50">
            <div className="flex flex-wrap justify-center gap-2">
              {['ana.admin', 'roberto', 'mariana'].map(u => (
                <button 
                  key={u}
                  onClick={() => { setUsername(u); setPassword('123'); }}
                  className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 hover:border-brand-cyan hover:text-brand-cyan transition-all cursor-pointer"
                >
                  {u}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-300 text-center mt-2 uppercase font-medium">Senha: 123</p>
          </div>
        </motion.div>
        
        <p className="text-slate-400 text-[9px] flex items-center justify-center gap-2 mt-6">
          <Shield className="w-3 h-3 text-brand-cyan/40" />
          SSL Ativo | ClinicalGate 2026
        </p>
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

function PublicBookingView({ onBack, users }: { onBack: () => void; users: any[] }) {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    dentista: '',
    data: format(new Date(), 'yyyy-MM-dd'),
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
    if (!bookingData.paciente || !bookingData.telefone || !bookingData.dentista || !bookingData.horario) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = `booking-${Date.now()}`;
      const record: DentalRecord = {
        id,
        data: bookingData.data,
        paciente: bookingData.paciente,
        procedimento: bookingData.procedimento,
        dentista: bookingData.dentista,
        status: 'Pendente',
        statusPagamento: 'Pendente',
        valor: 150
      };

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
          <div>
            <h1 className="text-xl font-bold text-slate-800">Agendamento Online</h1>
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
                      type="date" 
                      min={format(new Date(), 'yyyy-MM-dd')}
                      value={bookingData.data}
                      onChange={(e) => setBookingData(prev => ({ ...prev, data: e.target.value }))}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-cyan" />
                      Escolha o Horário
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setBookingData(prev => ({ ...prev, horario: time }))}
                          className={cn(
                            "py-2 text-xs font-bold rounded-lg border transition-all",
                            bookingData.horario === time
                              ? "bg-brand-cyan text-white border-brand-cyan shadow-md shadow-brand-cyan/20"
                              : "bg-white text-slate-500 border-slate-100 hover:border-brand-cyan"
                          )}
                        >
                          {time}
                        </button>
                      ))}
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
                        onChange={(e) => setBookingData(prev => ({ ...prev, paciente: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-cyan/5 focus:border-brand-cyan transition-all text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                      <input 
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={bookingData.telefone}
                        onChange={(e) => setBookingData(prev => ({ ...prev, telefone: e.target.value }))}
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
        
        <p className="text-center text-slate-400 text-[10px] mt-8 uppercase tracking-widest font-medium">
          Ambiente Seguro | Agendamento via ClinicalGate Cloud
        </p>
      </div>
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
    if (!email || !email.includes('@')) return;
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
                onChange={(e) => setEmail(e.target.value)}
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


