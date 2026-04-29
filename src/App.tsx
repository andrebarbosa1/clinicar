/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  Upload
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
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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

const INITIAL_USERS = [
  { id: '1', name: 'Dra. Ana Silveira', role: 'Admin', modules: 'Todos', username: 'ana.admin', password: '123' },
  { id: '2', name: 'Dr. Roberto Santos', role: 'Dentista', modules: 'Dashboard, Agenda, Pacientes', username: 'roberto', password: '123' },
  { id: '3', name: 'Mariana Lima', role: 'Recepcionista', modules: 'Agenda, Pacientes, Financeiro', username: 'mariana', password: '123' },
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
      console.log(`Notificando ${admins.length} administradores...`);
      for (const admin of admins) {
        // Notification target should match what the admin listener expects (id || uid)
        const targetId = admin.id || admin.uid || admin.firebaseUid;
        const notifId = `notif-ticket-${admin.id}-${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: targetId,
          message: `Novo chamado recebido: #${ticketId.split('-')[1]}`,
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

  // Firebase Auth & Initial Listeners
  React.useEffect(() => {
    // Check for existing session or just set ready
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user?.uid);
      if (!user) {
        signInAnonymously(auth).catch(err => console.error("Erro na auth anônima:", err));
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Listeners (Reactive to Auth and Role)
  React.useEffect(() => {
    if (!isAuthReady) return;

    console.log("Iniciando monitoramento de usuários no Firestore...");
    // Users sync - Allowed for any user (now public read)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
      console.log("Usuários sincronizados do Firestore:", u.length, u.map((user: any) => user.username));
      
      // If we have users in Firestore, use them. 
      // We also merge with INITIAL_USERS to ensure defaults always work
      const mergedUsers = [...u];
      INITIAL_USERS.forEach((initial: any) => {
        const index = mergedUsers.findIndex(m => m.id === initial.id || m.username === initial.username);
        if (index !== -1) {
          // Ensure core credentials from INITIAL_USERS take precedence if there's a conflict
          mergedUsers[index] = { ...mergedUsers[index], ...initial };
        } else {
          mergedUsers.push(initial);
        }
      });
      
      setUsers(mergedUsers);
    }, (error) => {
      console.error("Erro crítico na sincronização de usuários:", error);
      // Fallback to initial users on error so UI doesn't break
      setUsers(INITIAL_USERS);
    });

    let unsubRecords = () => {};

    // Records sync - Conditional on Role/Authentication
    if (isAuthenticated && currentUser) {
      let recordsQuery;
      
      if (currentUser.role === 'Admin' || currentUser.role === 'Recepcionista') {
        // Admin/Recepcionists see everything
        recordsQuery = collection(db, 'records');
      } else if (currentUser.role === 'Dentista') {
        // Dentists see only their own
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
          // If we get permission error, it might be due to session desync or rule updates
          if (error.message.includes('permissions')) {
            console.warn("Permission denied for records sync. Might need fresh login.");
          }
        });
      }
    } else {
      // If not "logically" authenticated (still in login screen), don't try to sync sensitive records
      setData([]);
    }

    return () => {
      unsubUsers();
      unsubRecords();
    };
  }, [isAuthReady, isAuthenticated, currentUser?.role, currentUser?.name]);

  // Sync session if already signed in
  React.useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Try to recover session if user was already fully authenticated
        const savedSession = localStorage.getItem('odonto_session');
        if (savedSession) {
          try {
            const sessionData = JSON.parse(savedSession);
            setCurrentUser(sessionData);
            setIsAuthenticated(true);
            
            // Re-verify the mapping in Firestore if needed
            if (user && sessionData.id) {
              const mappingRef = doc(db, 'users_by_uid', user.uid);
              const mappingSnap = await getDoc(mappingRef);
              if (!mappingSnap.exists()) {
                console.log("Restaurando mapeamento de segurança...");
                await setDoc(mappingRef, {
                  userDocId: sessionData.id,
                  name: sessionData.name,
                  role: sessionData.role,
                  updatedAt: new Date().toISOString()
                });
              }
            }
          } catch (e) {
            console.error("Erro ao restaurar sessão:", e);
          }
        }
      }
    });
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
  }, []);

  const handleCreatePatient = async (newPatient: any): Promise<boolean> => {
    if (!newPatient.name) {
      alert('Por favor, informe o nome do paciente.');
      return false;
    }

    const record: DentalRecord = {
      id: `rec-pat-${Date.now()}`,
      data: format(new Date(), 'yyyy-MM-dd'),
      paciente: newPatient.name,
      procedimento: 'Avaliação Inicial',
      dentista: currentUser?.name || 'Dra. Ana Silveira',
      status: 'Pendente',
      statusPagamento: 'Pendente',
      valor: 0,
    };
    
    try {
      console.log("Processando cadastro de paciente no Firestore...");
      await setDoc(doc(db, 'records', record.id), record);
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
      paciente: newAppt.paciente,
      procedimento: 'Avaliação',
      dentista: newAppt.dentista,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      valor: 150,
    };

    try {
      console.log("Tentando salvar agendamento:", record);
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
    } catch (e) {
      console.error("Erro ao salvar agendamento:", e);
      handleFirestoreError(e, OperationType.WRITE, 'records/' + record.id);
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
      await updateDoc(doc(db, 'records', recordId), {
        status: 'Cancelado'
      });

      // 2. Notification for Admin and Dentist
      const notifId = `notif-${Date.now()}`;
      const admins = users.filter(u => u.role === 'Admin');
      const targetUsers = [...admins];
      const dentist = users.find(u => u.name === record.dentista);
      if (dentist && !targetUsers.some(u => u.id === dentist.id)) {
        targetUsers.push(dentist);
      }

      console.log(`Notificando ${targetUsers.length} usuários sobre cancelamento...`);
      for (const u of targetUsers) {
        const uId = u.id || u.uid || u.firebaseUid;
        const individualNotifId = `${notifId}-${u.id}`;
        await setDoc(doc(db, 'notifications', individualNotifId), {
          id: individualNotifId,
          userId: uId,
          message: `Agendamento de ${record.paciente} CANCELADO.`,
          type: 'warning',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      console.log(`Cancelamento concluído para ${record.paciente}`);
    } catch (e) {
      console.error("Erro no processo de cancelamento:", e);
      // Revert optimistic update on error by letting onSnapshot fix it or just alert
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
    // Ensure we have a Firebase Auth session
    let fbUser = auth.currentUser;
    if (!fbUser) {
      try {
        const cred = await signInAnonymously(auth);
        fbUser = cred.user;
      } catch (authErr) {
        console.error("Critical: Failed to establish Firebase session during login.", authErr);
      }
    }

    // Link the logical user to the current Firebase Auth session
    if (fbUser) {
      try {
        // 1. Update the main user document
        await setDoc(doc(db, 'users', userProfile.id), {
          firebaseUid: fbUser.uid,
          lastLogin: new Date().toISOString()
        }, { merge: true });
        
        // 2. Create/Update a security mapping using UID as key for Rules lookup
        await setDoc(doc(db, 'users_by_uid', fbUser.uid), {
          userDocId: userProfile.id,
          name: userProfile.name,
          role: userProfile.role,
          updatedAt: new Date().toISOString()
        });

        // Add firebaseUid to userProfile so currentUser has it
        userProfile.firebaseUid = fbUser.uid;
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
      return <PatientFormView isEdit patientName={selectedPatientId} onSave={handleCreatePatient} onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'NovoAgendamento' && activePage === 'Agenda') {
      return <AppointmentFormView data={filteredRecords} users={users} onSave={handleCreateAppointment} onBack={() => setSubPage(null)} />;
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
            <DashboardView filteredData={filteredData} />
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
        return <AgendaView data={filteredData} onAdd={() => setSubPage('NovoAgendamento')} onStart={handleStartConsultation} onFinish={handleFinishConsultation} onCancel={handleCancelAppointment} />;
      case 'Financeiro':
        return canAccessFinance ? <FinanceView data={filteredData} onUpdatePayment={handleUpdatePaymentStatus} /> : <div className="p-8 text-slate-400">Acesso restrito ao Financeiro.</div>;
      case 'Equipe':
        return <TeamView data={filteredData} users={users} currentUser={currentUser} />;
      case 'Administração':
        return canAccessAdmin ? <AdminView users={users} onAddUser={handleCreateUser} tickets={tickets} onOpenSupport={handleSupportTicket} onUpdateTicket={handleUpdateTicketStatus} currentUser={currentUser} /> : <div className="p-8 text-slate-400">Acesso restrito à Administração.</div>;
      default:
        return <DashboardView filteredData={filteredData} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-cyan rounded flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">OdontoDash <span className="text-brand-cyan font-normal">Analytics</span></h1>
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
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
            <div className="w-px h-6 bg-slate-100 mx-1 shrink-0" />
            <button 
              onClick={handleSupportTicket}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-brand-cyan hover:bg-brand-cyan/5 transition-all group"
            >
              <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Suporte</span>
            </button>
          </div>
          <div className="w-px h-6 bg-slate-100 mx-1 shrink-0" />
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-brand-cyan transition-colors cursor-pointer relative",
                showNotifications ? "border-brand-cyan text-brand-cyan" : "text-slate-400"
              )}
            >
              <Bell className="w-4 h-4" />
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

      {/* Filters Bar (Swapped from Ribbon) */}
      <nav className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center gap-6 sticky top-[61px] z-40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar paciente..."
              className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-brand-cyan outline-none w-48 shadow-sm"
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Procedimento:</span>
            <select 
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none min-w-[120px] cursor-pointer shadow-sm"
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value)}
            >
              {procedures.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Atendimento:</span>
            <select 
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none min-w-[120px] cursor-pointer shadow-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Financeiro:</span>
            <select 
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-cyan outline-none min-w-[120px] cursor-pointer shadow-sm"
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
            className="p-6 space-y-6 max-w-(--breakpoint-xl) mx-auto w-full"
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

function DashboardView({ filteredData }: { filteredData: DentalRecord[] }) {
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
  const patients = useMemo(() => {
    const list: { [key: string]: { lastVisit: string, totalSpent: number, procedures: number } } = {};
    data.forEach(r => {
      if (!list[r.paciente]) {
        list[r.paciente] = { lastVisit: r.data, totalSpent: 0, procedures: 0 };
      }
      list[r.paciente].totalSpent += r.valor;
      list[r.paciente].procedures += 1;
      if (new Date(r.data) > new Date(list[r.paciente].lastVisit)) {
        list[r.paciente].lastVisit = r.data;
      }
    });
    return Object.entries(list).map(([name, stats]) => ({ name, ...stats }));
  }, [data]);

  return (
    <section className="bg-white border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Base de Pacientes</h2>
        <button 
          onClick={onAdd}
          className="text-[10px] bg-brand-cyan text-white px-3 py-1 font-bold rounded cursor-pointer"
        >
          Cadastrar Novo
        </button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
          <tr>
            <th className="px-4 py-3">Nome do Paciente</th>
            <th className="px-4 py-3">Última Visita</th>
            <th className="px-4 py-3 text-center">Procedimentos</th>
            <th className="px-4 py-3 text-right">Investimento Total</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="text-xs font-mono text-slate-600">
          {patients.map((p) => (
            <tr key={p.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-sans font-medium text-slate-900">{p.name}</td>
              <td className="px-4 py-3">{format(parseISO(p.lastVisit), 'dd/MM/yyyy')}</td>
              <td className="px-4 py-3 text-center">{p.procedures}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(p.totalSpent)}</td>
              <td className="px-4 py-3 text-center">
                <button 
                  onClick={() => onOpenChart(p.name)}
                  className="text-[10px] text-brand-cyan underline font-sans mr-3 cursor-pointer"
                >
                  Prontuário
                </button>
                <button 
                  onClick={() => onOpenEdit(p.name)}
                  className="text-[10px] text-slate-400 underline font-sans cursor-pointer"
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AgendaView({ data, onAdd, onStart, onFinish, onCancel }: { data: DentalRecord[]; onAdd: () => void; onStart: (id: string) => void; onFinish: (id: string) => void; onCancel: (id: string) => void }) {
  const upcoming = data.filter(r => r.status === 'Agendado' || r.status === 'Pendente' || r.status === 'Em Atendimento');
  const cancelled = data.filter(r => r.status === 'Cancelado').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

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
                        onClick={() => {
                          if (confirm(`Deseja cancelar o agendamento de ${apt.paciente}?`)) {
                            onCancel(apt.id);
                          }
                        }}
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

function MedicalChartView({ patientName, data, onBack }: { patientName: string; data: DentalRecord[]; onBack: () => void }) {
  const patientHistory = data.filter(r => r.paciente === patientName);
  const totalSpent = patientHistory.reduce((s, r) => s + r.valor, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold font-serif italic text-slate-800">{patientName}</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Prontuário Digital</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-2">Informações Cadastrais</h3>
          <div className="space-y-3 font-mono">
            <div>
              <div className="text-[9px] text-slate-400 uppercase">CPF</div>
              <div className="text-sm">123.456.789-00</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Data Nasc.</div>
              <div className="text-sm">15/05/1985</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Telefone</div>
              <div className="text-sm">(11) 98888-7777</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-2">Histórico Clínico</h3>
          <div className="space-y-4 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
            {patientHistory.map((h, i) => (
              <div key={i} className="flex gap-4 border-l-2 border-slate-100 pl-4 relative">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-brand-cyan"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-900">{h.procedimento}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{format(parseISO(h.data), 'dd/MM/yyyy')}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Dentista: {h.dentista} - Status: {h.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] uppercase font-bold text-slate-400">Resumo Financeiro</h3>
          <div className="text-sm font-bold text-emerald-600 font-mono">Total Investido: {formatCurrency(totalSpent)}</div>
        </div>
        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: '100%' }}></div>
        </div>
      </div>
    </div>
  );
}

function PatientFormView({ isEdit = false, patientName = '', onBack, onSave }: { isEdit?: boolean; patientName?: string; onBack: () => void; onSave: (p: any) => Promise<boolean> }) {
  const [name, setName] = useState(patientName);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} disabled={isSaving} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors disabled:opacity-50">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">{isEdit ? `Editar: ${patientName}` : 'Novo Paciente'}</h2>
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
          <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onBack} disabled={isSaving} className="px-6 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">Cancelar</button>
          <button 
            disabled={isSaving}
            onClick={async () => {
              if (name.trim()) {
                setIsSaving(true);
                try {
                  await onSave({ name, cpf, phone, email });
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

function AppointmentFormView({ onBack, onSave, data, users }: { onBack: () => void; onSave: (a: any) => void; data: DentalRecord[]; users: any[] }) {
  const [paciente, setPaciente] = useState('');
  const [dataVal, setDataVal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dentista, setDentista] = useState('');

  // Get unique patients and dentists from live data
  const patientList = useMemo(() => {
    const names = new Set(data.map(m => m.paciente));
    return Array.from(names).sort();
  }, [data]);

  const dentistList = useMemo(() => {
    const names = new Set(users.map(u => u.role === 'Dentista' || u.role === 'Admin' ? u.name : null).filter(Boolean));
    // Fallback to MOCK dentists if no users found
    if (names.size === 0) return ['Dr. Silva', 'Dra. Maria', 'Dr. Ricardo', 'Dra. Ana'];
    return Array.from(names).sort() as string[];
  }, [users]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Novo Agendamento</h2>
      </div>

      <div className="bg-white border border-slate-200 p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Paciente</label>
            <select 
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none cursor-pointer"
            >
              <option value="">Selecione um paciente...</option>
              {patientList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">Data</label>
              <input 
                type="date" 
                value={dataVal}
                onChange={(e) => setDataVal(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none cursor-pointer" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-mono text-[9px]">Horário</label>
              <input type="time" className="w-full p-2 border border-slate-200 rounded text-xs font-mono focus:border-brand-cyan outline-none cursor-pointer" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Dentista Responsável</label>
            <select 
              value={dentista}
              onChange={(e) => setDentista(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded text-sm focus:border-brand-cyan outline-none cursor-pointer"
            >
              <option value="">Selecione o dentista...</option>
              {dentistList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onBack} className="px-6 py-2 rounded text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">Descartar</button>
          <button 
            onClick={() => onSave({ paciente, data: dataVal, dentista })}
            className="bg-brand-cyan text-white px-6 py-2 rounded text-xs font-bold shadow-sm hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            Confirmar Agenda
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
  currentUser 
}: { 
  users: any[]; 
  onAddUser: (u: any) => Promise<boolean>; 
  tickets: any[]; 
  onOpenSupport: () => void; 
  onUpdateTicket: (id: string, status: 'Em Analise' | 'Resolvido') => Promise<void>;
  currentUser: any;
}) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Dentista');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'tickets' | 'settings' | 'import'>('users');
  const [isProcessingTicket, setIsProcessingTicket] = useState<string | null>(null);

  const handleTicketAction = async (id: string, status: 'Em Analise' | 'Resolvido') => {
    setIsProcessingTicket(id);
    await onUpdateTicket(id, status);
    setIsProcessingTicket(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="bg-slate-900 text-white p-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center shadow-lg gap-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-2 uppercase italic font-serif text-brand-cyan">Gestão Estratégica</h2>
          <p className="text-slate-400 text-[10px] font-mono tracking-wider uppercase">Controle de usuários, permissões e infraestrutura.</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl shadow-inner">
          <button 
            type="button"
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
              activeTab === 'users' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Usuários
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
              activeTab === 'tickets' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Suporte ({tickets.filter(t => t.status !== 'Resolvido').length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
              activeTab === 'settings' ? "bg-brand-cyan text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Configurações
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('import')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
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


