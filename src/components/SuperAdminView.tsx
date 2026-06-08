import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Building2, 
  Users, 
  Lock, 
  Unlock, 
  Edit2, 
  Check, 
  X, 
  AlertTriangle,
  Mail,
  Phone,
  CreditCard,
  Crown,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  UserCheck,
  BarChart3,
  Flame,
  ShieldAlert as ShieldIcon,
  Bell,
  Ticket,
  Plus,
  Trash2,
  Calendar,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  updateDoc 
} from 'firebase/firestore';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  phone?: string;
  cpf?: string;
  role: string;
  modules?: string;
  clinicName?: string;
  isTrial?: boolean;
  trialPlan?: string;
  trialSpecialty?: string;
  trialStartedAt?: string;
  trialExtensionDays?: number;
  parentTrialId?: string;
  blocked?: boolean;
  isPremium?: boolean;
}

interface BruteForceLog {
  username: string;
  attempts: number;
  lastAttempt: number;
  lockoutUntil: number;
}

interface GlobalNotice {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'amber' | 'maintenance';
  active: boolean;
  createdAt: string;
}

interface Coupon {
  id: string;
  code: string;
  extraDays: number;
  maxUses: number;
  usesCount: number;
  active: boolean;
}

interface SuperAdminViewProps {
  users: UserProfile[];
  onUpdateUser: (id: string, updatedData: any) => Promise<boolean>;
  db: any; // Firestore instance
}

type TabType = 'users' | 'metrics' | 'security' | 'announcements' | 'vouchers';

export default function SuperAdminView({ users, onUpdateUser, db }: SuperAdminViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for live fetched metrics and logs
  const [recordsCountByClinic, setRecordsCountByClinic] = useState<Record<string, number>>({});
  const [securityLogs, setSecurityLogs] = useState<BruteForceLog[]>([]);
  const [globalNotice, setGlobalNotice] = useState<GlobalNotice>({
    id: 'global_banner',
    message: '',
    type: 'info',
    active: false,
    createdAt: ''
  });
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);

  // States for creating a voucher / editing standard notices
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDays, setCouponDays] = useState(15);
  const [couponMaxUses, setCouponMaxUses] = useState(10);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Available SaaS modules
  const ALL_MODULES = [
    'Dashboard', 
    'Agenda', 
    'Pacientes', 
    'Retorno', 
    'Mensagens', 
    'Financeiro', 
    'Equipe', 
    'Administração', 
    'Documentos',
    'Estoque'
  ];

  // Fetch real-time security logs, system notice banner configurations, and active coupon codes
  useEffect(() => {
    if (!db) return;

    // 1. Subscribe to brute-force accounts lockout status
    const unsubSecurityLogs = onSnapshot(collection(db, 'login_attempts'), (snapshot) => {
      const logs: BruteForceLog[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        logs.push({
          username: doc.id,
          attempts: d.attempts || 0,
          lastAttempt: d.lastAttempt || 0,
          lockoutUntil: d.lockoutUntil || 0
        });
      });
      setSecurityLogs(logs);
    }, (err) => console.warn("Failed loading login attempts:", err));

    // 2. Fetch or subscribe to general notice banner Configuration
    const unsubNotice = onSnapshot(doc(db, 'system_announcements', 'global_banner'), (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        setGlobalNotice({
          id: d.id || 'global_banner',
          message: d.message || '',
          type: d.type || 'info',
          active: d.active || false,
          createdAt: d.createdAt || ''
        });
      }
    }, (err) => console.warn("Failed subscription to announcements banner:", err));

    // 3. Subscribe to active promotions vouchers/coupons
    const unsubCoupons = onSnapshot(collection(db, 'saas_coupons'), (snapshot) => {
      const coupons: Coupon[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        coupons.push({
          id: doc.id,
          code: d.code || '',
          extraDays: d.extraDays || 0,
          maxUses: d.maxUses || 0,
          usesCount: d.usesCount || 0,
          active: d.active === true
        });
      });
      setCouponsList(coupons);
    }, (err) => console.warn("Failed loading promotional coupons:", err));

    // 4. Heavy database clinical query: Aggregate clinical check-ins (volume de atendimentos) per clinic owner
    const fetchClinicActivityRecords = async () => {
      try {
        const snap = await getDocs(collection(db, 'records'));
        const counts: Record<string, number> = {};
        snap.forEach(doc => {
          const d = doc.data();
          const trialId = d.trialOwnerId || 'Principal';
          counts[trialId] = (counts[trialId] || 0) + 1;
        });
        setRecordsCountByClinic(counts);
      } catch (err) {
        console.warn("Records metrics query skipped or limited:", err);
      }
    };
    fetchClinicActivityRecords();

    return () => {
      unsubSecurityLogs();
      unsubNotice();
      unsubCoupons();
    };
  }, [db]);

  // Map each user to their logical Clinic/Tenant grouping
  const usersWithClinic = useMemo(() => {
    return users.map(user => {
      let clinic = 'Clínica Corporativa Principal';
      let idRef = 'Principal';
      
      if (user.clinicName) {
        clinic = user.clinicName;
        idRef = user.parentTrialId || user.id;
      } else if (user.parentTrialId) {
        const parent = users.find(u => u.id === user.parentTrialId);
        idRef = user.parentTrialId;
        if (parent && parent.clinicName) {
          clinic = parent.clinicName;
        } else {
          clinic = `Trial Workspace [ID: ${user.parentTrialId.substring(0, 8)}]`;
        }
      } else if (user.isTrial) {
        clinic = `Trial Clínica [ID: ${user.id.substring(0, 8)}]`;
        idRef = user.id;
      } else if (user.role === 'SuperAdmin' || user.username === 'administrador') {
        clinic = 'Sistemas (Suporte Central)';
        idRef = 'SuperCentral';
      }

      return {
        ...user,
        resolvedClinic: clinic,
        clinicKey: idRef
      };
    });
  }, [users]);

  // Extract unique clinics for filters
  const uniqueClinics = useMemo(() => {
    const names = new Set<string>();
    usersWithClinic.forEach(u => {
      if (u.resolvedClinic) names.add(u.resolvedClinic);
    });
    return Array.from(names);
  }, [usersWithClinic]);

  // Basic numeric metrics
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const clinicsCount = uniqueClinics.filter(c => c !== 'Sistemas (Suporte Central)').length;
    const blockedCount = users.filter(u => u.blocked === true).length;
    const trialCount = users.filter(u => u.isTrial === true).length;
    const premiumCount = users.filter(u => u.isPremium === true).length;

    // Specialty analytics
    const specialtyDistribution: Record<string, number> = {};
    users.forEach(u => {
      if (u.isTrial || u.isPremium) {
        const spec = u.trialSpecialty || 'Clínico Geral';
        specialtyDistribution[spec] = (specialtyDistribution[spec] || 0) + 1;
      }
    });

    const totalActiveAccounts = trialCount + premiumCount;
    const conversionRate = totalActiveAccounts > 0 
      ? Math.round((premiumCount / totalActiveAccounts) * 100) 
      : 0;

    return {
      totalUsers,
      clinicsCount,
      blockedCount,
      trialCount,
      premiumCount,
      specialtyDistribution,
      totalActiveAccounts,
      conversionRate
    };
  }, [users, uniqueClinics]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return usersWithClinic.filter(user => {
      const matchSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.resolvedClinic && user.resolvedClinic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.cpf && user.cpf.includes(searchTerm));

      const matchClinic = selectedClinicFilter === 'all' || user.resolvedClinic === selectedClinicFilter;
      const matchRole = selectedRoleFilter === 'all' || user.role === selectedRoleFilter;

      return matchSearch && matchClinic && matchRole;
    });
  }, [usersWithClinic, searchTerm, selectedClinicFilter, selectedRoleFilter]);

  // Action: Unlock access / clear brute-force lockout record
  const handleUnlockAccount = async (usernameToUnlock: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'login_attempts', usernameToUnlock));
      setSuccessMsg(`O bloqueio anti-abuso de @${usernameToUnlock} foi cancelado com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro de desbloqueio: ${err?.message || err}`);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Action: Save general system announcement banner parameters
  const handlePublishGlobalNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsPublishingNotice(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Use unique alert ID so clinican clients dismiss state is reset on any published updating
      const newBannerConfig = {
        id: `banner_${Date.now()}`,
        message: globalNotice.message.trim(),
        type: globalNotice.type,
        active: globalNotice.active,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'system_announcements', 'global_banner'), newBannerConfig);
      setSuccessMsg(newBannerConfig.active 
        ? "Banner de Notificação Global publicado e ativado para todos os consultórios!" 
        : "A Notificação Geral do Sistema foi ocultada com sucesso."
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao salvar banner: ${err?.message || err}`);
    } finally {
      setIsPublishingNotice(false);
    }
  };

  // Action: Create and persist a new free trial promotion coupon / voucher
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !couponCode) return;
    setIsCreatingCoupon(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const cleanCode = couponCode.trim().toUpperCase().replace(/\s+/g, '');
      const couponDocId = cleanCode;

      const newCouponData = {
        code: cleanCode,
        extraDays: Number(couponDays) || 15,
        maxUses: Number(couponMaxUses) || 50,
        usesCount: 0,
        active: true
      };

      await setDoc(doc(db, 'saas_coupons', couponDocId), newCouponData);
      setSuccessMsg(`Cupom de teste grátis '${cleanCode}' (+${couponDays} dias) gerado de forma ativa!`);
      setCouponCode('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao criar voucher promocional: ${err?.message || err}`);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  // Action: Toggle Coupon active state or delete coupon
  const handleToggleCouponState = async (coupon: Coupon) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'saas_coupons', coupon.id), {
        active: !coupon.active
      });
      setSuccessMsg(`Status do cupom ${coupon.code} atualizado.`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!db || !window.confirm("Deseja realmente remover este cupom?")) return;
    try {
      await deleteDoc(doc(db, 'saas_coupons', couponId));
      setSuccessMsg(`Cupom removido com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.warn(err);
    }
  };

  // Action: Save the edited user parameters
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updatedProfile = { ...editingUser };

      if (!updatedProfile.modules) {
        updatedProfile.modules = '';
      }

      if (updatedProfile.isPremium) {
        updatedProfile.isTrial = false;
      }

      // Convert inputs back to number safely
      updatedProfile.trialExtensionDays = Number(updatedProfile.trialExtensionDays) || 0;

      // Perform the update in Firestore
      const success = await onUpdateUser(updatedProfile.id, updatedProfile);

      if (success) {
        if (updatedProfile.isTrial || updatedProfile.parentTrialId) {
          const ownerId = updatedProfile.parentTrialId || updatedProfile.id;
          try {
            await setDoc(doc(db, 'settings', `clinic-${ownerId}`), {
              clinicName: updatedProfile.clinicName || updatedProfile.resolvedClinic,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (settingsError) {
            console.warn("Failed to synchronize clinic settings document:", settingsError);
          }
        }

        setSuccessMsg(`Acesso do usuário @${updatedProfile.username} atualizado com sucesso!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setEditingUser(null);
      } else {
        setErrorMsg("Erro ao aplicar as alterações na conta do cliente.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Falha na atualização: ${err?.message || err}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle module selection helper
  const handleToggleModuleInEditing = (moduleName: string) => {
    if (!editingUser) return;
    
    let currentModulesList: string[] = [];
    if (editingUser.modules === 'Todos') {
      currentModulesList = [...ALL_MODULES];
    } else if (editingUser.modules) {
      currentModulesList = editingUser.modules.split(',').map(m => m.trim());
    }

    let nextModulesList: string[];
    if (currentModulesList.includes(moduleName)) {
      nextModulesList = currentModulesList.filter(m => m !== moduleName);
    } else {
      nextModulesList = [...currentModulesList, moduleName];
    }

    let modulesStr = '';
    if (nextModulesList.length === ALL_MODULES.length) {
      modulesStr = 'Todos';
    } else {
      modulesStr = nextModulesList.join(',');
    }

    setEditingUser({
      ...editingUser,
      modules: modulesStr
    });
  };

  const isModuleCheckedInEditing = (moduleName: string) => {
    if (!editingUser) return false;
    if (editingUser.modules === 'Todos') return true;
    if (!editingUser.modules) return false;
    return editingUser.modules.split(',').map(m => m.trim()).includes(moduleName);
  };

  return (
    <div className="space-y-6" id="super-admin-main-element">
      
      {/* SaaS Header Banner - compact & sticky */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-3 px-5 rounded-2xl border border-white/10 text-white shadow-lg backdrop-blur-md relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-radial-gradient opacity-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[8px] bg-brand-cyan/20 text-brand-cyan font-bold tracking-widest px-2 py-0.5 rounded-md border border-brand-cyan/30">
                PROVEDOR SAAS CENTRAL
              </span>
              <span className="text-[8px] bg-indigo-500/10 text-indigo-200 font-medium px-2 py-0.5 rounded-md border border-indigo-500/20">
                LGPD COMPLIANT
              </span>
            </div>
            <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-cyan animate-pulse" />
              Painel Central SaaS
            </h1>
          </div>
          
          <button 
            type="button"
            onClick={() => window.location.reload()}
            className="self-end sm:self-center bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/15 text-[10px] font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Forçar Sincronização
          </button>
        </div>
      </div>

      {/* Success and Error Warnings */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm animate-in fade-in duration-300">
          <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 bg-emerald-100 p-1 rounded-full" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm animate-in fade-in duration-300">
          <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0 bg-red-100 p-1 rounded-full" />
          {errorMsg}
        </div>
      )}

      {/* SaaS Operations Tabs Ribbon */}
      <div className="flex overflow-x-auto gap-1 bg-white p-1.5 rounded-2xl border border-slate-200/50 shadow-sm no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Users className="w-4 h-4" />
          Clientes & Contas
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-2 transition-all ${activeTab === 'metrics' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Painel de Conversão & Métricas
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-2 transition-all ${activeTab === 'security' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Lock className="w-4 h-4" />
          Bloqueios Brute-Force ({securityLogs.filter(l => l.attempts >= 5).length})
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-2 transition-all ${activeTab === 'announcements' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Bell className="w-4 h-4" />
          Comunicados & Banners
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-2 transition-all ${activeTab === 'vouchers' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Ticket className="w-4 h-4" />
          Cupons & Ativação de Teste
        </button>
      </div>

      {/* RENDER TAB CONTENTS */}

      {/* TAB 1: CLIENTS & USER LIST */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clínicas</span>
                <span className="text-xl font-black text-slate-800">{metrics.clinicsCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usuários</span>
                <span className="text-xl font-black text-slate-800">{metrics.totalUsers}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teste Grátis</span>
                <span className="text-xl font-black text-slate-800">{metrics.trialCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assinantes Premium</span>
                <span className="text-xl font-black text-slate-800">{metrics.premiumCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bloqueados</span>
                <span className="text-xl font-black text-slate-800">{metrics.blockedCount}</span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, username (@), email, clínica ou CPF do cliente..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all text-xs text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:w-96">
                <div>
                  <select
                    value={selectedClinicFilter}
                    onChange={(e) => setSelectedClinicFilter(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-xs text-slate-700 font-medium bg-white"
                  >
                    <option value="all">Filtro por Clínica (Todas)</option>
                    {uniqueClinics.map(clinic => (
                      <option key={clinic} value={clinic}>{clinic}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-xs text-slate-700 font-medium bg-white"
                  >
                    <option value="all">Todos os Cargos</option>
                    <option value="Admin">Admin</option>
                    <option value="Dentista">Dentista</option>
                    <option value="Recepcionista">Recepcionista</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Customers List Card */}
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden text-left">
            <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div className="space-y-0.5">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cadastro Geral de Contas</h2>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                  Exibindo {Math.min(10, filteredUsers.length)} de {filteredUsers.length} usuários (Filtro ativo)
                </p>
              </div>
              <div className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg self-start sm:self-center">
                Limite de 10 Contas Ativo
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Nenhuma conta ou clínica encontrada para os filtros selecionados.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 select-none">
                      <th className="py-3 px-5">Cliente / Profissional</th>
                      <th className="py-3 px-4">Clínica Referente</th>
                      <th className="py-3 px-4">Contato & Identificação</th>
                      <th className="py-3 px-4 text-center">Permissões SaaS</th>
                      <th className="py-3 px-4 text-center">Prazo Extra (Voucher)</th>
                      <th className="py-3 px-4 text-center">Contrato / Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsers.slice(0, 10).map(user => {
                      const isBlocked = user.blocked === true;
                      const isSuper = user.role === 'SuperAdmin';
                      const bonusDays = user.trialExtensionDays || 0;
                      
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${isSuper ? 'bg-indigo-600/10 text-indigo-600' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-bold text-xs uppercase shrink-0`}>
                                {user.name.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 leading-tight block truncate">
                                  {user.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                                  @{user.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700 min-w-[150px]">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{user.resolvedClinic}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 space-y-1">
                            {user.email && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`mailto:${user.email}`} className="hover:underline text-slate-600 truncate max-w-[170px]">{user.email}</a>
                              </div>
                            )}
                            {user.phone && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                                <a href={`https://wa.me/${user.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline font-medium text-slate-600">{user.phone}</a>
                              </div>
                            )}
                            {user.cpf && (
                              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                {user.role}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {user.modules === 'Todos' ? '10 Módulos Ativos' : `${user.modules?.split(',').filter(Boolean).length || 0} de 10 módulos`}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono">
                            {bonusDays > 0 ? (
                              <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {bonusDays} dias
                              </span>
                            ) : (
                              <span className="text-slate-400">Nenhum</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {isBlocked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                                  <Lock className="w-2.5 h-2.5 text-red-500" /> BLOQUEADO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <Unlock className="w-2.5 h-2.5 text-emerald-500" /> ATIVO
                                </span>
                              )}

                              {user.isPremium ? (
                                <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                                  <Crown className="w-3 h-3 text-amber-500 shrink-0" /> PREMIUM
                                </span>
                              ) : user.isTrial ? (
                                <span className="inline-flex items-center gap-1 text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                                  TRIAL ({user.trialPlan})
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-medium">Regular</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setEditingUser(user)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 border border-indigo-100 hover:border-indigo-200 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" /> Configuração
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METRICS, CHARTS & CONVERSION TRACKING */}
      {activeTab === 'metrics' && (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">
          
          {/* Top Conversion rate meter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Crown className="w-32 h-32 text-indigo-950" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-indigo-500 tracking-wider">Conversão Real de Planos</span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-extrabold text-slate-800">{metrics.conversionRate}%</h3>
                  <span className="text-xs text-emerald-500 font-bold inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +4.2% este mês
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Relação de clínicas pagantes (Premium) sobre o total de novas contas cadastradas.
                </p>
              </div>

              {/* Graphical Circular Progress Meter inside SVG */}
              <div className="pt-4 flex items-center justify-between">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>{metrics.premiumCount} Premium Ativo</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-550 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span>{metrics.trialCount} Free Trials</span>
                  </div>
                </div>

                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                    <circle cx="32" cy="32" r="26" stroke="#10b981" strokeWidth="6" fill="transparent"
                            strokeDasharray={163.36}
                            strokeDashoffset={163.36 - (163.36 * metrics.conversionRate) / 100} />
                  </svg>
                  <span className="absolute text-[10px] font-black font-mono">{metrics.conversionRate}%</span>
                </div>
              </div>
            </div>

            {/* Trial Registrations specialties distribution bar meters */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm col-span-1 md:col-span-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Especialidades Odontológicas Ativas (Trials & Premium)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(metrics.specialtyDistribution).length === 0 ? (
                  <p className="text-slate-400 text-xs col-span-2 py-8 text-center bg-slate-50 rounded-xl">Sem dados suficientes registradas.</p>
                ) : (
                  Object.entries(metrics.specialtyDistribution).map(([spec, count]) => {
                    const pct = metrics.totalActiveAccounts > 0 
                      ? Math.round((Number(count) / metrics.totalActiveAccounts) * 100) 
                      : 0;
                    return (
                      <div key={spec} className="space-y-1 border border-slate-100 p-3 rounded-xl bg-slate-50/40">
                        <div className="flex justify-between items-baseline text-xs font-semibold">
                          <span className="text-slate-705 truncate max-w-[150px]">{spec}</span>
                          <span className="font-bold text-indigo-600 font-mono">{count} clinicas ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Volume de Atendimentos por Clínica - Activity Tracker list */}
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                Auditoria de Volume de Atendimentos / Atividades Clínica
              </h3>
              <p className="text-[10px] text-slate-400">Total de registros de prontuários (records) contabilizados em Firestore por cliente</p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.filter(u => u.role === 'Admin').length === 0 ? (
                <div className="p-8 text-center text-slate-405 text-xs">
                  Sem dados de consultórios de teste cadastrados.
                </div>
              ) : (
                filteredUsers.filter(u => u.isTrial || u.isPremium).map((u, i) => {
                  const activityCount = recordsCountByClinic[u.id] || recordsCountByClinic[u.parentTrialId || ''] || 0;
                  const isGold = activityCount > 35;
                  
                  return (
                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5">#{i+1}</span>
                        <div>
                          <p className="font-bold text-slate-850 hover:underline cursor-pointer">{u.resolvedClinic}</p>
                          <p className="text-[10px] text-slate-400">Gestor Administrador: @{u.username} • Plano: {u.isPremium ? 'Premium' : 'Trial'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-500 mr-2">Evoluções Feitas:</span>
                          <span className={`font-mono font-extrabold text-sm px-2.5 py-1 rounded-xl ${isGold ? 'bg-amber-500/10 text-amber-600 border border-amber-200/55' : 'bg-slate-105 text-slate-700'}`}>
                            {activityCount} atendimentos
                          </span>
                        </div>

                        {isGold && (
                          <span className="bg-amber-500 text-white rounded-lg p-1" title="Clínica Ultra Ativa!">
                            <Award className="w-4 h-4 shrink-0" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT & BRUTE FORCE LOGS */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">
          
          <div className="bg-amber-550/10 border border-amber-500/20 rounded-3xl p-5 text-amber-900 flex items-start gap-4">
            <Flame className="w-10 h-10 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider">Segurança Ativa Contra Força Bruta</h4>
              <p className="text-xs leading-relaxed max-w-2xl text-slate-650">
                Seu OdontoDash implementa limites estritos contra distributed brute-force. Endpoints de login que acumulam falhas consecutivas são suspensos temporariamente na nuvem. Abaixo, monitore e cancele bloqueios incorretos solicitados por clientes que erraram suas senhas.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">Status de Credenciais e Bloqueios Firestore</h3>
              <p className="text-[10px] text-slate-400">Monitor de tentativas incorretas arquivadas nos últimos acessos</p>
            </div>

            <div className="overflow-x-auto">
              {securityLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  A segurança está impecável. Nenhuma falha de login registrada recentemente.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-605">
                  <thead className="bg-slate-50 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-3">Username Associado</th>
                      <th className="px-5 py-3 text-center">Tentativas Consecutivas</th>
                      <th className="px-5 py-3">Último Erro Registrado</th>
                      <th className="px-5 py-3">Status de Bloqueio</th>
                      <th className="px-5 py-3 text-right">Controles SaaS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105">
                    {securityLogs.map(log => {
                      const isLocked = log.attempts >= 5 && log.lockoutUntil > Date.now();
                      const timeLock = isLocked 
                        ? Math.ceil((log.lockoutUntil - Date.now()) / 1000 / 60) 
                        : 0;

                      return (
                        <tr key={log.username} className="hover:bg-slate-50/30 transition-colors font-medium">
                          <td className="px-5 py-4 font-bold text-slate-750">
                            @{log.username}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${log.attempts >= 5 ? 'bg-red-50 text-red-650 ring-1 ring-red-200' : 'bg-slate-100 text-slate-600'}`}>
                              {log.attempts} tentativas
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                            {log.lastAttempt ? new Date(log.lastAttempt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-5 py-4">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                Bloqueado por {timeLock} min
                              </span>
                            ) : log.attempts >= 5 ? (
                              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                Lock expirado (Acesso liberado)
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                                Seguro / Monitorado
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleUnlockAccount(log.username)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-emerald-700 hover:text-emerald-800 text-xs font-extrabold rounded-lg transition-all"
                            >
                              Resetar Tentativas
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL NOTICES AND ANNOUNCEMENTS BANNERS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-left">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm md:col-span-2 space-y-6">
            <div>
              <h3 className="text-md font-extrabold text-slate-800">Publicador de Avisos Gerais</h3>
              <p className="text-xs text-slate-400">Escreva um banner global que será exibido no topo do sistema de todas as clínicas ativas.</p>
            </div>

            <form onSubmit={handlePublishGlobalNotice} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estilo Temático do Banner</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'info', label: 'Informativo (Azul)', style: 'bg-indigo-50 border-indigo-250 text-indigo-800' },
                    { type: 'warning', label: 'Crítico (Amarelo)', style: 'bg-amber-55 text-amber-250 text-amber-800' },
                    { type: 'amber', label: 'Aviso (Laranja)', style: 'bg-orange-50 border-orange-200 text-orange-850' },
                    { type: 'maintenance', label: 'Manutenção (Preto)', style: 'bg-slate-900 border-slate-950 text-white' }
                  ].map(thm => (
                    <button
                      key={thm.type}
                      type="button"
                      onClick={() => setGlobalNotice({ ...globalNotice, type: thm.type as any })}
                      className={`p-3 text-xs font-bold rounded-xl border text-center transition-all ${globalNotice.type === thm.type ? 'ring-2 ring-indigo-600 scale-[1.01] border-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {thm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <label>Conteúdo da Mensagem</label>
                  <span>{globalNotice.message.length} / 150 caracteres</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={150}
                  value={globalNotice.message}
                  onChange={(e) => setGlobalNotice({ ...globalNotice, message: e.target.value })}
                  placeholder="Ex: Informamos que o sistema passará por manutenção programada no domingo às 02h da manhã..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-medium"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <div>
                  <p className="text-xs font-bold text-slate-800">Status de Ativação do Comunicado</p>
                  <p className="text-[10px] text-slate-400">Ativa ou oculta instantaneamente o banner na sessões dos dentistas.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalNotice({ ...globalNotice, active: !globalNotice.active })}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${globalNotice.active ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-500'}`}
                >
                  {globalNotice.active ? '🟢 Ativo' : '⚪ Inativo'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPublishingNotice}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 "
                >
                  {isPublishingNotice ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publicando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" /> Atualizar Comunicado
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Visual Simulation Display of Banner */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-300 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Simulação do Visual (Mobile / Desktop)</span>
              <p className="text-xs text-slate-500 leading-normal">
                Veja uma simulação de como o aviso aparecerá destacado na tela inicial de todos os terapeutas e recepcionistas.
              </p>
            </div>

            {globalNotice.message ? (
              <div className={`p-4 rounded-xl border flex items-center justify-between text-left gap-3 text-xs font-bold shadow-sm ${
                globalNotice.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                globalNotice.type === 'maintenance' ? 'bg-slate-900 text-slate-100 border-slate-950' :
                globalNotice.type === 'amber' ? 'bg-orange-50 border-orange-200 text-orange-900' :
                'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <div>
                  <div className="text-[9px] uppercase tracking-wider bg-black/5 px-1.5 py-0.5 rounded inline-block mb-1">
                    {globalNotice.type === 'maintenance' ? 'Manutenção' : 'Comunicado'}
                  </div>
                  <p className="leading-relaxed">{globalNotice.message}</p>
                </div>
                <X className="w-4 h-4 text-slate-400 shrink-0 select-none cursor-not-allowed" />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 border border-slate-200 rounded-xl bg-white text-xs">
                Mensagem vazia. Digite algo para obter o Mock de renderização global.
              </div>
            )}

            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Controle instantâneo em tempo real via Listener Snapshot.
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SAAS PROMOTIONAL COUPONS MANAGER */}
      {activeTab === 'vouchers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300 text-left">
          
          {/* Coupon Generator and Form Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
            <div>
              <h3 className="text-md font-extrabold text-slate-800">Gerador de Cupons Premium</h3>
              <p className="text-xs text-slate-400">Gere vouchers que dão dias de teste extra grátis para as clínicas aplicarem no menu assinatura.</p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Código de Ativação</label>
                <input
                  required
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ex: BRASILDENTO15, PROMO30"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-705 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Prazo Concedido</label>
                  <select
                    value={couponDays}
                    onChange={(e) => setCouponDays(Number(e.target.value))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-600 font-semibold"
                  >
                    <option value={7}>+07 dias grátis</option>
                    <option value={15}>+15 dias grátis</option>
                    <option value={30}>+30 dias grátis</option>
                    <option value={60}>+60 dias grátis</option>
                    <option value={90}>+90 dias grátis</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Limite de Usos</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={1000}
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(Number(e.target.value))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-705 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingCoupon}
                className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
              >
                <Plus className="w-4.5 h-4.5" />
                Criar Voucher Inteligente
              </button>
            </form>
          </div>

          {/* Active Promo Codes List */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm md:col-span-2 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-805 tracking-wider">Promoções e Vouchers Criados</h3>
                  <p className="text-[10px] text-slate-400">Lista ativa persistida em Firestore para a validação no plano</p>
                </div>
                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  {couponsList.length} cupons definidos
                </span>
              </div>

              <div className="overflow-x-auto min-h-[300px]">
                {couponsList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhum código promocional ou voucher cadastrado. Crie um ao lado!
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-650">
                    <thead className="bg-slate-50 font-black text-[9px] uppercase text-slate-400 select-none">
                      <tr>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3 text-center">Bônus Concedido</th>
                        <th className="px-4 py-3 text-center">Uso Registrado</th>
                        <th className="px-4 py-3 text-center">Disponível em Trial</th>
                        <th className="px-4 py-3 text-right">Ações de Gestão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {couponsList.map(cup => {
                        const isExpired = cup.usesCount >= cup.maxUses;
                        
                        return (
                          <tr key={cup.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-indigo-750">
                              {cup.code}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">
                              +{cup.extraDays} dias extras
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-600">
                              {cup.usesCount} / {cup.maxUses}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isExpired ? (
                                <span className="text-[9px] font-black text-red-500 bg-red-50 rounded px-1.5 py-0.5">Esgotado</span>
                              ) : cup.active ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5">Ativo & Válido</span>
                              ) : (
                                <span className="text-[9px] font-black text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">Suspenso</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right flex justify-end gap-2 items-center">
                              <button
                                onClick={() => handleToggleCouponState(cup)}
                                className={`px-2.5 py-1 text-[10px] font-bold border rounded-lg transition-colors ${cup.active ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-205'}`}
                              >
                                {cup.active ? 'Desativar' : 'Reativar'}
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(cup.id)}
                                className="p-1 hover:bg-red-50 text-rose-500 hover:text-rose-700 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t text-[10px] text-slate-400 leading-normal">
              Os cupons podem ser divulgados para os clientes utilizarem no menu de suas assinaturas (no painel e botão de faturamento) para expandir e testar os planos.
            </div>
          </div>
        </div>
      )}

      {/* Edit Access Control Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Configurar Acesso do Cliente</h3>
                  <p className="text-[10px] text-slate-400">Usuário: @{editingUser.username} | ID: {editingUser.id}</p>
                </div>
              </div>

              <button
                type="button"
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                onClick={() => setEditingUser(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1 p-6 space-y-6">
              
              {/* Account Status / Alert Message */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status de Acesso LGPD</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, blocked: false })}
                      className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all border ${!editingUser.blocked ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      ✅ Ativo & Liberado
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, blocked: true })}
                      className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all border ${editingUser.blocked ? 'bg-red-500 text-white border-red-650' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      🚫 Suspender / Bloqueado
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipo de Contrato SaaS</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, isPremium: false, isTrial: true })}
                      className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all border ${!editingUser.isPremium ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      ⚡ Teste Grátis (Trial)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, isPremium: true, isTrial: false })}
                      className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all border ${editingUser.isPremium ? 'bg-amber-500 text-white border-amber-600' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                    >
                      👑 Premium ILIMITADO
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal details & context fields */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b pb-1">DADOS CADASTRAIS & IDENTIFICAÇÃO</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nome Completo</label>
                    <input 
                      type="text"
                      required
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Identificador Clínico (Clínica)</label>
                    <input 
                      type="text"
                      required
                      value={editingUser.clinicName || editingUser.resolvedClinic || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, clinicName: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nome de Usuário (@)</label>
                    <input 
                      type="text"
                      required
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().trim() })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Senha do Cliente (recuperação)</label>
                    <input 
                      type="text"
                      required
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Prazo Bonus em Dias (Trial)</label>
                    <input 
                      type="number"
                      min={0}
                      value={editingUser.trialExtensionDays || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, trialExtensionDays: Number(e.target.value) || 0 })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-indigo-600 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">WhatsApp corporativo</label>
                    <input 
                      type="text"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">E-mail corporativo</label>
                    <input 
                      type="email"
                      required
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Cargo Funcional</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 bg-white"
                    >
                      <option value="Admin">Admin (Dono do Consultório)</option>
                      <option value="Dentista">Dentista associado</option>
                      <option value="Recepcionista">Recepcionista</option>
                      <option value="SuperAdmin">SuperAdmin (Central)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">SaaS Plano Nível (Se Trial)</label>
                    <select
                      value={editingUser.trialPlan || 'Pro'}
                      onChange={(e) => setEditingUser({ ...editingUser, trialPlan: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-700 bg-white"
                    >
                      <option value="Lite">Lite</option>
                      <option value="Pro">Pro (Completo)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Module selection list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">LIBERAÇÃO DE MÓDULOS DE ACESSO DO CLIENTE</span>
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, modules: editingUser.modules === 'Todos' ? '' : 'Todos' })}
                    className="text-[10px] text-indigo-600 hover:underline font-bold bg-transparent border-0 cursor-pointer"
                  >
                    {editingUser.modules === 'Todos' ? 'Remover Todos' : 'Conceder Todos'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-transparent border-0">
                  {ALL_MODULES.map(moduleName => {
                    const checked = isModuleCheckedInEditing(moduleName);
                    return (
                      <button
                        type="button"
                        key={moduleName}
                        onClick={() => handleToggleModuleInEditing(moduleName)}
                        className={`p-3 text-left rounded-xl border text-xs font-semibold flex items-center justify-between transition-all select-none hover:shadow-sm ${checked ? 'bg-indigo-50 border-indigo-250 text-indigo-700' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                      >
                        <span>{moduleName}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                className="px-5 py-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-all"
                disabled={isUpdating}
                onClick={() => setEditingUser(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-2 border-0"
                disabled={isUpdating}
                onClick={handleSaveEdit}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" /> Salvar Alterações
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
