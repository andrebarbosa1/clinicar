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
  Award,
  LogIn,
  ExternalLink,
  CheckCircle2,
  RotateCcw
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
import { 
  SaaSPlanConfig, 
  DEFAULT_SAAS_PLANS, 
  subscribeSaaSPlans, 
  saveSaaSPlans, 
  resetSaaSPlans,
  SaaSPixConfig,
  DEFAULT_SAAS_PIX,
  subscribeSaaSPixConfig,
  saveSaaSPixConfig
} from '../lib/saasPlans';

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
  clinicId?: string;
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

interface DeviceLockoutLog {
  id: string; // Device ID
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
  onDeleteUser?: (id: string) => Promise<boolean | any>;
  onAccessClinic?: (user: UserProfile) => void;
  clinicName?: string;
  db: any; // Firestore instance
}

type TabType = 'users' | 'metrics' | 'plans' | 'security' | 'announcements' | 'vouchers';

export default function SuperAdminView({ users, onUpdateUser, onDeleteUser, onAccessClinic, clinicName, db }: SuperAdminViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SaaS Plans Management State
  const [saasPlans, setSaasPlans] = useState<SaaSPlanConfig[]>(DEFAULT_SAAS_PLANS);
  const [isSavingPlans, setIsSavingPlans] = useState(false);
  const [newFeatureInputs, setNewFeatureInputs] = useState<{ [planId: string]: string }>({});

  // SaaS Global PIX Management State
  const [saasPixConfig, setSaasPixConfig] = useState<SaaSPixConfig>(DEFAULT_SAAS_PIX);
  const [isSavingPix, setIsSavingPix] = useState(false);

  // States for live fetched metrics and logs
  const [recordsCountByClinic, setRecordsCountByClinic] = useState<Record<string, number>>({});
  const [securityLogs, setSecurityLogs] = useState<BruteForceLog[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<DeviceLockoutLog[]>([]);
  const [clinicSettingsMap, setClinicSettingsMap] = useState<Record<string, string>>({});
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
    'Documentos',
    'IAClinica',
    'PortalPaciente',
    'Retorno', 
    'ChatbotIA',
    'Mensagens', 
    'Estoque',
    'Financeiro', 
    'Administração'
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

    // 1.5. Subscribe to brute-force device lockout status
    const unsubDeviceLogs = onSnapshot(collection(db, 'device_attempts'), (snapshot) => {
      const logs: DeviceLockoutLog[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        logs.push({
          id: doc.id,
          attempts: d.attempts || 0,
          lastAttempt: d.lastAttempt || 0,
          lockoutUntil: d.lockoutUntil || 0
        });
      });
      setDeviceLogs(logs);
    }, (err) => console.warn("Failed loading device attempts:", err));

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

    // 4. Listen to settings collection to resolve registered clinic names
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d && d.clinicName) {
          map[docSnap.id] = d.clinicName;
        }
      });
      setClinicSettingsMap(map);
    }, (err) => console.warn("Failed loading clinic settings:", err));

    // 5. Heavy database clinical query: Aggregate clinical check-ins (volume de atendimentos) per clinic owner
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

    // 6. Subscribe to real-time SaaS plans configuration
    const unsubPlans = subscribeSaaSPlans(db, (plans) => {
      setSaasPlans(plans);
    });

    // 7. Subscribe to real-time SaaS PIX configuration
    const unsubPix = subscribeSaaSPixConfig(db, (pixConfig) => {
      setSaasPixConfig(pixConfig);
    });

    return () => {
      unsubSecurityLogs();
      unsubDeviceLogs();
      unsubNotice();
      unsubCoupons();
      unsubSettings();
      unsubPlans();
      unsubPix();
    };
  }, [db]);

  // Map each user to their logical Clinic/Tenant grouping
  const usersWithClinic = useMemo(() => {
    const defaultClinic = clinicSettingsMap['clinic-1'] || clinicSettingsMap['clinic'] || clinicName || 'mbsolucoes';

    return users.map(user => {
      let clinic = defaultClinic;
      let idRef = 'Principal';
      
      if (user.clinicName && user.clinicName.trim().length > 0) {
        clinic = user.clinicName.trim();
        idRef = user.parentTrialId || user.clinicId || user.id;
      } else if (user.parentTrialId) {
        const parent = users.find(u => u.id === user.parentTrialId);
        idRef = user.parentTrialId;
        const mappedName = clinicSettingsMap[`clinic-${user.parentTrialId}`] || clinicSettingsMap[user.parentTrialId];
        if (mappedName) {
          clinic = mappedName;
        } else if (parent && parent.clinicName) {
          clinic = parent.clinicName;
        } else {
          clinic = `Clínica [ID: ${user.parentTrialId.substring(0, 8)}]`;
        }
      } else if (user.isTrial) {
        const mappedName = clinicSettingsMap[`clinic-${user.id}`] || clinicSettingsMap[user.id];
        if (mappedName) {
          clinic = mappedName;
        } else {
          clinic = `Clínica Trial [ID: ${user.id.substring(0, 8)}]`;
        }
        idRef = user.id;
      } else if (user.role === 'SuperAdmin' || user.username === 'administrador') {
        clinic = 'Sistemas (Suporte Central)';
        idRef = 'SuperCentral';
      } else {
        const ownerKey = user.clinicId || user.id;
        const mappedName = clinicSettingsMap[`clinic-${ownerKey}`] || clinicSettingsMap['clinic'] || defaultClinic;
        clinic = mappedName;
        idRef = ownerKey;
      }

      return {
        ...user,
        resolvedClinic: clinic,
        clinicKey: idRef
      };
    });
  }, [users, clinicName, clinicSettingsMap]);

  // Group users into distinct Clinics (Tenants), showing ONLY the Clinic and its Owner / Responsible Doctor
  const clinicsList = useMemo(() => {
    const groups: Record<string, {
      clinicKey: string;
      clinicName: string;
      owner: any;
      staff: any[];
      staffCount: number;
    }> = {};

    usersWithClinic.forEach(u => {
      // Ignore super admin in regular customer clinic listings
      if (u.role === 'SuperAdmin' || u.username === 'administrador') return;

      const key = u.clinicKey || 'Principal';
      if (!groups[key]) {
        groups[key] = {
          clinicKey: key,
          clinicName: u.resolvedClinic || 'Clínica',
          owner: null,
          staff: [],
          staffCount: 0
        };
      }

      groups[key].staff.push(u);
      groups[key].staffCount += 1;

      // Identify the clinic owner / doctor responsible
      if (!groups[key].owner) {
        groups[key].owner = u;
      } else {
        const currentOwner = groups[key].owner;
        const uIsRoot = !u.parentTrialId;
        const currIsRoot = !currentOwner.parentTrialId;
        
        if (uIsRoot && !currIsRoot) {
          groups[key].owner = u;
        } else if (u.role === 'Admin' && currentOwner.role !== 'Admin') {
          groups[key].owner = u;
        } else if (u.role === 'Dentista' && currentOwner.role === 'Recepcionista') {
          groups[key].owner = u;
        }
      }
    });

    return Object.values(groups).map(g => {
      const owner = g.owner || g.staff[0];
      return {
        clinicKey: g.clinicKey,
        clinicName: g.clinicName,
        owner,
        staff: g.staff,
        staffCount: g.staffCount,
        responsibleDoctor: owner?.name || 'Médico Responsável',
        isTrial: owner?.isTrial === true,
        isPremium: owner?.isPremium === true,
        trialPlan: owner?.trialPlan || 'Pro',
        trialStartedAt: owner?.trialStartedAt,
        trialExtensionDays: owner?.trialExtensionDays || 0,
        allowedModules: owner?.allowedModules,
        blocked: owner?.blocked === true
      };
    });
  }, [usersWithClinic]);

  // Extract unique clinics for filters
  const uniqueClinics = useMemo(() => {
    const names = new Set<string>();
    clinicsList.forEach(c => {
      if (c.clinicName) names.add(c.clinicName);
    });
    return Array.from(names);
  }, [clinicsList]);

  // Basic numeric metrics based on clinics
  const metrics = useMemo(() => {
    const totalClinics = clinicsList.length;
    const totalUsers = users.length;
    const blockedCount = clinicsList.filter(c => c.blocked).length;
    const trialCount = clinicsList.filter(c => c.isTrial).length;
    const premiumCount = clinicsList.filter(c => c.isPremium).length;

    // Specialty analytics
    const specialtyDistribution: Record<string, number> = {};
    clinicsList.forEach(c => {
      if (c.isTrial || c.isPremium) {
        const spec = c.owner?.trialSpecialty || 'Clínico Geral';
        specialtyDistribution[spec] = (specialtyDistribution[spec] || 0) + 1;
      }
    });

    const totalActiveAccounts = trialCount + premiumCount;
    const conversionRate = totalActiveAccounts > 0 
      ? Math.round((premiumCount / totalActiveAccounts) * 100) 
      : 0;

    return {
      totalClinics,
      totalUsers,
      clinicsCount: totalClinics,
      blockedCount,
      trialCount,
      premiumCount,
      specialtyDistribution,
      totalActiveAccounts,
      conversionRate
    };
  }, [clinicsList, users.length]);

  // Filtered clinics list for the main table
  const filteredClinics = useMemo(() => {
    return clinicsList.filter(clinic => {
      const matchSearch = 
        clinic.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.responsibleDoctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clinic.owner?.username && clinic.owner.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (clinic.owner?.email && clinic.owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (clinic.owner?.phone && clinic.owner.phone.includes(searchTerm)) ||
        (clinic.owner?.cpf && clinic.owner.cpf.includes(searchTerm));

      const matchClinic = selectedClinicFilter === 'all' || clinic.clinicName === selectedClinicFilter;
      const matchPlan = selectedRoleFilter === 'all' || 
        (selectedRoleFilter === 'Trial' && clinic.isTrial) || 
        (selectedRoleFilter === 'Premium' && clinic.isPremium) ||
        (selectedRoleFilter === 'Bloqueada' && clinic.blocked);

      return matchSearch && matchClinic && matchPlan;
    });
  }, [clinicsList, searchTerm, selectedClinicFilter, selectedRoleFilter]);

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

  // Action: Unlock device / clear device brute-force lockout record
  const handleUnlockDevice = async (deviceIdToUnlock: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'device_attempts', deviceIdToUnlock));
      setSuccessMsg(`O bloqueio do dispositivo [${deviceIdToUnlock}] foi cancelado com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro de desbloqueio de dispositivo: ${err?.message || err}`);
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

  // Action: Save SaaS Global PIX Configuration
  const handleSaveSaaSPix = async () => {
    if (!db) return;
    setIsSavingPix(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await saveSaaSPixConfig(db, saasPixConfig);
      setSuccessMsg("Dados da Chave PIX do SaaS salvos com sucesso no Firestore!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to save SaaS PIX config:", err);
      setErrorMsg(`Erro ao salvar Chave Pix do SaaS: ${err?.message || err}`);
    } finally {
      setIsSavingPix(false);
    }
  };

  // Action: Save SaaS Plans Configuration to Firestore
  const handleSaveAllPlans = async () => {
    if (!db) return;
    setIsSavingPlans(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await saveSaaSPlans(db, saasPlans);
      setSuccessMsg("Tabela de Preços e Recursos dos Planos SaaS salva com sucesso no Firestore!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to save SaaS plans:", err);
      setErrorMsg(`Erro ao salvar planos: ${err?.message || err}`);
    } finally {
      setIsSavingPlans(false);
    }
  };

  // Action: Reset SaaS Plans to system default
  const handleResetPlansToDefault = async () => {
    if (!db) return;
    if (!window.confirm("Deseja realmente restaurar os preços e recursos padrão dos planos SaaS (Lite R$149, Pro R$299, Platinum R$599)?")) return;
    
    setIsSavingPlans(true);
    try {
      await resetSaaSPlans(db);
      setSaasPlans(DEFAULT_SAAS_PLANS);
      setSuccessMsg("Planos SaaS restaurados para os valores padrão com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao restaurar planos padrão: " + (err?.message || err));
    } finally {
      setIsSavingPlans(false);
    }
  };

  // Action: Update field of a plan
  const handleUpdatePlanField = (index: number, field: keyof SaaSPlanConfig, value: any) => {
    setSaasPlans(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Action: Update limits of a plan
  const handleUpdatePlanLimits = (index: number, limitKey: 'dentists' | 'patients', value: number) => {
    setSaasPlans(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        limits: {
          ...updated[index].limits,
          [limitKey]: value
        }
      };
      return updated;
    });
  };

  // Action: Add feature to plan
  const handleAddFeatureToPlan = (planId: string, index: number) => {
    const text = newFeatureInputs[planId]?.trim();
    if (!text) return;
    setSaasPlans(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        features: [...updated[index].features, text]
      };
      return updated;
    });
    setNewFeatureInputs(prev => ({ ...prev, [planId]: '' }));
  };

  // Action: Remove feature from plan
  const handleRemoveFeatureFromPlan = (planIndex: number, featureIndex: number) => {
    setSaasPlans(prev => {
      const updated = [...prev];
      const newFeatures = [...updated[planIndex].features];
      newFeatures.splice(featureIndex, 1);
      updated[planIndex] = {
        ...updated[planIndex],
        features: newFeatures
      };
      return updated;
    });
  };

  // Action: Add new custom plan
  const handleAddNewPlan = () => {
    const newId = `Custom_${Date.now().toString(36).toUpperCase()}`;
    const newPlan: SaaSPlanConfig = {
      id: newId,
      name: 'Novo Plano',
      price: 399,
      period: 'mês',
      color: 'from-purple-500 to-indigo-600',
      badgeColor: 'bg-purple-50 text-purple-600 border-purple-100',
      tagline: 'Descrição do novo plano customizado.',
      limits: { dentists: 10, patients: 2000 },
      features: [
        'Acesso completo a todos os módulos',
        'Suporte prioritário via WhatsApp'
      ],
      active: true
    };
    setSaasPlans(prev => [...prev, newPlan]);
  };

  // Action: Delete a plan
  const handleDeletePlan = (index: number) => {
    if (saasPlans.length <= 1) {
      alert("É necessário manter ao menos 1 plano no sistema.");
      return;
    }
    if (!window.confirm(`Deseja excluir o plano "${saasPlans[index].name}"?`)) return;
    setSaasPlans(prev => prev.filter((_, i) => i !== index));
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

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      if (onDeleteUser) {
        const ok = await onDeleteUser(deletingUser.id);
        if (ok) {
          setSuccessMsg(`Usuário ${deletingUser.name || deletingUser.username} foi excluído com sucesso.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          if (editingUser?.id === deletingUser.id) {
            setEditingUser(null);
          }
          setDeletingUser(null);
        }
      } else {
        setErrorMsg("Função de exclusão não configurada.");
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao excluir usuário: ${err?.message || err}`);
    } finally {
      setIsDeleting(false);
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
    <div className="h-full flex flex-col" id="super-admin-main-element">

      {/* FIXED TOP MENU (TABS RIBBON) & ALERTS */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-4 pb-3 space-y-3 shrink-0 px-4 sm:px-6 lg:px-8 border-b border-slate-200/85">
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
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-2 transition-all ${activeTab === 'plans' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Sparkles className="w-4 h-4 text-brand-cyan" />
          Planos & Preços SaaS
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
      </div>

      {/* RENDER TAB CONTENTS - SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

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
                    <option value="all">Todas as Clínicas</option>
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
                    <option value="all">Todos os Planos / Status</option>
                    <option value="Trial">Ambientes em Teste (Trial)</option>
                    <option value="Premium">Assinantes Premium</option>
                    <option value="Bloqueada">Contas Bloqueadas</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Clinics List Card */}
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden text-left">
            <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div className="space-y-0.5">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Gestão Geral de Clínicas & Consultórios
                </h2>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                  Exibindo {filteredClinics.length} clínica{filteredClinics.length === 1 ? '' : 's'} (Exibição dos Donos e Médicos Responsáveis)
                </p>
              </div>
              <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg self-start sm:self-center flex items-center gap-1">
                <ShieldIcon className="w-3 h-3 text-indigo-600" />
                Painel do Super Admin Master
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredClinics.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Nenhuma clínica encontrada para os filtros selecionados.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 select-none">
                      <th className="py-3 px-5">Clínica / Consultório</th>
                      <th className="py-3 px-4">Dono / Médico Responsável</th>
                      <th className="py-3 px-4 text-center">Equipe</th>
                      <th className="py-3 px-4">Contato do Responsável</th>
                      <th className="py-3 px-4 text-center">Plano & Permissões</th>
                      <th className="py-3 px-4 text-center">Prazo Extra (Voucher)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredClinics.map(clinic => {
                      const owner = clinic.owner;
                      const isBlocked = clinic.blocked;
                      const bonusDays = clinic.trialExtensionDays || 0;
                      
                      return (
                        <tr key={clinic.clinicKey} className="hover:bg-slate-50/50 transition-colors">
                          {/* Clinic Name and ID */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-800 leading-tight block truncate text-sm">
                                  {clinic.clinicName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  ID: {clinic.clinicKey.substring(0, 10)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Owner / Responsible Doctor */}
                          <td className="py-3.5 px-4 min-w-[170px]">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{clinic.responsibleDoctor}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{owner?.username || 'usuario'} &bull; <span className="text-indigo-600 font-medium font-sans">Dono / Resp. Técnico</span>
                              </div>
                            </div>
                          </td>

                          {/* Staff size */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200/80">
                              <Users className="w-3 h-3 text-slate-500" />
                              {clinic.staffCount === 1 ? '1 profissional' : `${clinic.staffCount} profissionais`}
                            </span>
                          </td>

                          {/* Contacts of the Owner */}
                          <td className="py-3.5 px-4 text-slate-600 space-y-1">
                            {owner?.email && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`mailto:${owner.email}`} className="hover:underline text-slate-600 truncate max-w-[170px]">{owner.email}</a>
                              </div>
                            )}
                            {owner?.phone && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                                <a href={`https://wa.me/${owner.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline font-medium text-slate-600">{owner.phone}</a>
                              </div>
                            )}
                            {owner?.cpf && (
                              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{owner.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
                              </div>
                            )}
                          </td>

                          {/* Plan & Permissions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                Plano {clinic.trialPlan}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {owner?.modules === 'Todos' || !owner?.modules ? 'Todos os Módulos' : `${owner?.modules?.split(',').filter(Boolean).length || 0} módulos`}
                              </span>
                            </div>
                          </td>

                          {/* Bonus days */}
                          <td className="py-3.5 px-4 text-center font-mono">
                            {bonusDays > 0 ? (
                              <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {bonusDays} dias
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Nenhum</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {isBlocked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                                  <Lock className="w-2.5 h-2.5 text-red-500" /> BLOQUEADA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <Unlock className="w-2.5 h-2.5 text-emerald-500" /> ATIVA
                                </span>
                              )}

                              {clinic.isPremium ? (
                                <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                                  <Crown className="w-3 h-3 text-amber-500 shrink-0" /> PREMIUM
                                </span>
                              ) : clinic.isTrial ? (
                                <span className="inline-flex items-center gap-1 text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                                  TRIAL
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-medium">Assinatura</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onAccessClinic && (
                                <button
                                  type="button"
                                  onClick={() => onAccessClinic(clinic as any)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-emerald-500/20 active:scale-95"
                                  title={`Acessar ambiente da clínica ${clinic.clinicName}`}
                                >
                                  <LogIn className="w-3.5 h-3.5" />
                                  <span>Acessar Clínica</span>
                                </button>
                              )}
                              {owner && (
                                <button
                                  type="button"
                                  onClick={() => setEditingUser(owner)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 border border-indigo-100 hover:border-indigo-200 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                  title="Configurações e Permissões da Clínica"
                                >
                                  <Edit2 className="w-3 h-3" /> Configuração
                                </button>
                              )}
                              {owner && onDeleteUser && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingUser(owner)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100 hover:border-rose-200 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center cursor-pointer"
                                  title="Excluir Clínica e Contas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
                Auditoria de Volume de Atendimentos / Atividades por Clínica
              </h3>
              <p className="text-[10px] text-slate-400">Total de registros de prontuários e evoluções contabilizados em Firestore por clínica</p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredClinics.length === 0 ? (
                <div className="p-8 text-center text-slate-405 text-xs">
                  Sem dados de clínicas cadastradas.
                </div>
              ) : (
                filteredClinics.map((clinic, i) => {
                  const activityCount = recordsCountByClinic[clinic.owner?.id] || recordsCountByClinic[clinic.clinicKey] || 0;
                  const isGold = activityCount > 35;
                  
                  return (
                    <div key={clinic.clinicKey} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5">#{i+1}</span>
                        <div>
                          <p className="font-bold text-slate-850 hover:underline cursor-pointer">{clinic.clinicName}</p>
                          <p className="text-[10px] text-slate-400">Responsável: {clinic.responsibleDoctor} &bull; Plano: {clinic.isPremium ? 'Premium' : 'Trial'}</p>
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

                        {onAccessClinic && (
                          <button
                            type="button"
                            onClick={() => onAccessClinic(clinic as any)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            title={`Acessar ambiente de ${clinic.clinicName}`}
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Acessar Clínica</span>
                          </button>
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
                Seu OdontoDash implementa limites estritos contra distributed brute-force. Endpoints de login que acumulam falhas consecutivas são suspensos temporariamente na nuvem. Abaixo, monitore e cancele bloqueios incorretos solicitados por clientes que erraram suas senhas (por conta ou por dispositivo).
              </p>
            </div>
          </div>

          {/* SECTION A: ACCOUNTS LOGS */}
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">Status de Credenciais e Bloqueios por Conta</h3>
                <p className="text-[10px] text-slate-400">Monitor de tentativas incorretas filtradas por nome de usuário (existente ou não)</p>
              </div>
              <span className="text-[10px] bg-slate-100 px-2 shadow-inner border py-0.5 rounded-full font-bold text-slate-500">
                {securityLogs.length} Registros
              </span>
            </div>

            <div className="overflow-x-auto">
              {securityLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  A segurança de contas está impecável. Nenhuma falha por username registrada recentemente.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-605">
                  <thead className="bg-slate-50 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-3">Username Tentado</th>
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

          {/* SECTION B: DEVICE LOCKOUTS */}
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">Status de Bloqueio por Navegador / Dispositivo</h3>
                <p className="text-[10px] text-slate-400">Monitor de tentativas por impressões digitais de máquina para coibir ataques robotizados rápidos</p>
              </div>
              <span className="text-[10px] bg-slate-100 px-2 shadow-inner border py-0.5 rounded-full font-bold text-slate-500">
                {deviceLogs.length} Dispositivos
              </span>
            </div>

            <div className="overflow-x-auto">
              {deviceLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  A segurança de dispositivos está excelente. Nenhum navegador foi bloqueado recentemente.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-605">
                  <thead className="bg-slate-50 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-3">ID do Dispositivo</th>
                      <th className="px-5 py-3 text-center">Tentativas Acumuladas</th>
                      <th className="px-5 py-3">Último Disparo Recebido</th>
                      <th className="px-5 py-3">Status de Bloqueio</th>
                      <th className="px-5 py-3 text-right">Controles SaaS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105">
                    {deviceLogs.map(log => {
                      const isLocked = log.attempts >= 5 && log.lockoutUntil > Date.now();
                      const timeLock = isLocked 
                        ? Math.ceil((log.lockoutUntil - Date.now()) / 1000 / 60) 
                        : 0;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/30 transition-colors font-medium">
                          <td className="px-5 py-4 font-mono font-bold text-slate-750">
                            {log.id}
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
                                Lock expirado (Dispositivo liberado)
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                                Seguro / Monitorado
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleUnlockDevice(log.id)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-emerald-700 hover:text-emerald-800 text-xs font-extrabold rounded-lg transition-all"
                            >
                              Resetar Dispositivo
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

      {/* TAB: SAAS PLANS & PRICING MANAGER */}
      {activeTab === 'plans' && (
        <div className="space-y-6 text-left animate-in fade-in duration-300">
          
          {/* Header Banner & Global Actions */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Gestão de Planos & Preços SaaS</h3>
                  <p className="text-xs text-slate-500">Configure os valores cobrados em reais (R$), limites de dentistas/pacientes, slogans e recursos inclusos.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                disabled={isSavingPlans}
                onClick={handleResetPlansToDefault}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restaurar planos para valores padrão (Lite R$149, Pro R$299, Platinum R$599)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Restaurar Padrão
              </button>

              <button
                type="button"
                onClick={handleAddNewPlan}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Plano
              </button>

              <button
                type="button"
                disabled={isSavingPlans}
                onClick={handleSaveAllPlans}
                className="px-5 py-2.5 bg-brand-cyan hover:bg-brand-cyan-dark disabled:opacity-50 text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isSavingPlans ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Salvando Firestore...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Salvar Todos os Preços
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 leading-relaxed">
              <strong>Sincronização em Tempo Real:</strong> As alterações salvas nesta tela refletem imediatamente na página <strong>Assinatura & Planos</strong> de todos os usuários, atualizando a geração de <strong>QR Codes Pix</strong>, checkout com <strong>cartão</strong> e faturamento.
            </p>
          </div>

          {/* SaaS Global PIX Receiver Configuration Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    Chave PIX Oficial de Recebimento de Assinaturas (SaaS)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      Padrão EMV Bacen
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Esta é a chave Pix real inserida no painel utilizada para gerar o QR Code Oficial e o Pix Copia e Cola na hora da contratação/ativação dos planos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingPix}
                onClick={handleSaveSaaSPix}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isSavingPix ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando Pix...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Salvar Chave PIX SaaS
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Chave PIX de Recebimento (E-mail, CNPJ, CPF, Celular ou EVP) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: financeiro@odontodash.com.br ou 00.000.000/0001-00"
                  value={saasPixConfig.key}
                  onChange={(e) => setSaasPixConfig({ ...saasPixConfig, key: e.target.value })}
                  className="w-full text-xs font-mono font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-900 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Nome do Beneficiário / Empresa *
                </label>
                <input
                  type="text"
                  maxLength={25}
                  placeholder="Ex: ODONTODASH SAAS"
                  value={saasPixConfig.name}
                  onChange={(e) => setSaasPixConfig({ ...saasPixConfig, name: e.target.value })}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-900 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Cidade do Titular *
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="Ex: SAO PAULO"
                  value={saasPixConfig.city}
                  onChange={(e) => setSaasPixConfig({ ...saasPixConfig, city: e.target.value })}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Banco / Instituição Financeira (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Banco Inter, Itaú, Cora"
                  value={saasPixConfig.bank || ''}
                  onChange={(e) => setSaasPixConfig({ ...saasPixConfig, bank: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-800 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Descrição da Cobrança Pix (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="Ex: Assinatura Mensal OdontoDash"
                  value={saasPixConfig.description || ''}
                  onChange={(e) => setSaasPixConfig({ ...saasPixConfig, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-800 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Grid of Editable Plan Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {saasPlans.map((plan, planIdx) => {
              const isDefaultPlan = ['Lite', 'Pro', 'Platinum'].includes(plan.id);

              return (
                <div 
                  key={plan.id || planIdx}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:border-slate-300"
                >
                  {/* Card Top / Header */}
                  <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-brand-cyan" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {plan.name} ({plan.id})
                        </span>
                      </div>

                      {!isDefaultPlan && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(planIdx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir este plano customizado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Editable Plan Name & Flag */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome do Plano</label>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) => handleUpdatePlanField(planIdx, 'name', e.target.value)}
                          className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destaque / Badge</label>
                        <input
                          type="text"
                          placeholder="Ex: Mais Vendido"
                          value={plan.flag || ''}
                          onChange={(e) => handleUpdatePlanField(planIdx, 'flag', e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Editable Price (R$) & Period */}
                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-brand-cyan" /> Preço (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={plan.price}
                            onChange={(e) => handleUpdatePlanField(planIdx, 'price', Number(e.target.value) || 0)}
                            className="w-full text-base font-black pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-900 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período de Cobrança</label>
                        <select
                          value={plan.period || 'mês'}
                          onChange={(e) => handleUpdatePlanField(planIdx, 'period', e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                        >
                          <option value="mês">mês (Mensal)</option>
                          <option value="ano">ano (Anual)</option>
                          <option value="trimestre">trimestre (Trimestral)</option>
                          <option value="semestre">semestre (Semestral)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Tagline, Limits & Features */}
                  <div className="p-6 space-y-4 flex-1">
                    {/* Tagline */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subtítulo / Slogan</label>
                      <input
                        type="text"
                        value={plan.tagline || ''}
                        onChange={(e) => handleUpdatePlanField(planIdx, 'tagline', e.target.value)}
                        placeholder="Ex: Ideal para clínicas em expansão"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-700"
                      />
                    </div>

                    {/* Limits (Dentists & Patients) */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                          <span>Dentistas</span>
                          <span className="text-[9px] text-slate-400 font-normal">9999=Ilimitado</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={plan.limits?.dentists ?? 1}
                          onChange={(e) => handleUpdatePlanLimits(planIdx, 'dentists', Number(e.target.value) || 1)}
                          className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                          <span>Pacientes</span>
                          <span className="text-[9px] text-slate-400 font-normal">99999=Ilimitado</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={plan.limits?.patients ?? 100}
                          onChange={(e) => handleUpdatePlanLimits(planIdx, 'patients', Number(e.target.value) || 100)}
                          className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Recursos Inclusos ({plan.features?.length || 0})
                      </label>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {plan.features?.map((feat, fIdx) => (
                          <div 
                            key={fIdx}
                            className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 group hover:bg-slate-100/70 transition-all"
                          >
                            <span className="truncate flex-1">• {feat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeatureFromPlan(planIdx, fIdx)}
                              className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                              title="Remover este item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add new feature input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Adicionar recurso..."
                          value={newFeatureInputs[plan.id] || ''}
                          onChange={(e) => setNewFeatureInputs({ ...newFeatureInputs, [plan.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFeatureToPlan(plan.id, planIdx);
                            }
                          }}
                          className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddFeatureToPlan(plan.id, planIdx)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Inserir
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Quick Status */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Valor final no checkout: <strong className="text-slate-800 font-bold">R$ {plan.price}/{plan.period}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={isSavingPlans}
                      onClick={handleSaveAllPlans}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      </div>

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
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  disabled={isUpdating}
                  onClick={() => setDeletingUser(editingUser)}
                  title="Excluir este usuário permanentemente"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Excluir Conta
                </button>

                {editingUser.role !== 'SuperAdmin' && onAccessClinic && (
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    disabled={isUpdating}
                    onClick={() => {
                      const target = editingUser;
                      setEditingUser(null);
                      onAccessClinic(target);
                    }}
                    title="Entrar no painel desta clínica como gestor"
                  >
                    <LogIn className="w-4 h-4 text-emerald-600" />
                    Acessar Ambiente
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
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
        </div>
      )}

      {/* Delete User Confirmation Modal for SuperAdmin */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Ação Irreversível
              </span>
              <h3 className="text-lg font-black text-slate-900">Excluir Conta de Usuário?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você está prestes a remover o acesso e cadastro de{' '}
                <strong className="text-slate-800 font-bold">{deletingUser.name || deletingUser.username}</strong>{' '}
                (<span className="font-mono text-slate-600">@{deletingUser.username}</span>){' '}
                {deletingUser.clinicName ? `da clínica ${deletingUser.clinicName}` : ''}.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-[11px] text-amber-900 mt-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>O usuário perderá instantaneamente o acesso às ferramentas e dados do sistema.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Excluir Conta
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
