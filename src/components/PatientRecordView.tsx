import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  FileText, 
  Share2, 
  Download, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Shield, 
  FolderPlus, 
  Folder, 
  Image as ImageIcon, 
  DollarSign, 
  ChevronRight, 
  Printer, 
  User, 
  Stethoscope, 
  Info, 
  Eye, 
  Upload, 
  FileCheck, 
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  History,
  HeartPulse,
  Pill,
  Smile,
  FileBadge,
  Sliders,
  Settings2,
  Send,
  Globe,
  Copy
} from 'lucide-react';
import { format, parseISO, differenceInYears, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { DentalRecord, AnamnesisCustomField, PatientAnamnesis } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import AnamnesisFormBuilderModal from './AnamnesisFormBuilderModal';
import AnamnesisPatientEditModal from './AnamnesisPatientEditModal';
import DentalBudgetModal, { DentalBudget } from './DentalBudgetModal';
import ShareBookingModal from './ShareBookingModal';

interface PatientRecordViewProps {
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
  clinicName?: string;
  clinicPixKey?: string;
  clinicPixBeneficiary?: string;
  clinicPixCity?: string;
  clinicPixBank?: string;
}

export default function PatientRecordView({
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
  canSeeClinical = true,
  clinicName = 'Consultório Odontológico',
  clinicPixKey = '',
  clinicPixBeneficiary = '',
  clinicPixCity = 'SAO PAULO',
  clinicPixBank = ''
}: PatientRecordViewProps) {
  const [activeTab, setActiveTab] = useState<
    'Resumo' | 'Odontograma' | 'Anamnese' | 'Evolução' | 'Documentos' | 'Imagens' | 'Planos' | 'Orçamentos' | 'Histórico'
  >('Resumo');

  const [showPlanDetails, setShowPlanDetails] = useState<any | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [selectedPlanForBudget, setSelectedPlanForBudget] = useState<any | null>(null);
  const [selectedBudgetForView, setSelectedBudgetForView] = useState<DentalBudget | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // New Plan State
  const [newPlan, setNewPlan] = useState({
    title: '',
    items: [] as { procedure: string; price: number; teeth?: string }[],
  });

  // Dynamic Anamnesis Custom Fields State & Real-time Firestore Sync
  const [customFields, setCustomFields] = useState<AnamnesisCustomField[]>([]);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showPatientAnamnesisModal, setShowPatientAnamnesisModal] = useState(false);

  const clinicOwnerId = useMemo(() => {
    return currentUser?.parentTrialId || 
      currentUser?.clinicId || 
      (currentUser?.isTrial ? currentUser.id : (currentUser?.role === 'Admin' ? currentUser.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : currentUser?.id || '1')));
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin' || currentUser?.isSuperAdmin;

  useEffect(() => {
    if (!db || !clinicOwnerId) return;
    const settingsRef = doc(db, 'settings', `clinic-${clinicOwnerId}`);
    const unsub = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const sData = docSnap.data();
          if (Array.isArray(sData?.anamnesisCustomFields)) {
            setCustomFields(sData.anamnesisCustomFields);
          }
        }
      },
      (err) => {
        console.error('Erro ao sincronizar campos de anamnese:', err);
      }
    );
    return () => unsub();
  }, [clinicOwnerId]);

  const handleSaveCustomFields = async (newFields: AnamnesisCustomField[]): Promise<boolean> => {
    try {
      const settingsRef = doc(db, 'settings', `clinic-${clinicOwnerId}`);
      await setDoc(settingsRef, {
        anamnesisCustomFields: newFields,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Admin'
      }, { merge: true });
      setCustomFields(newFields);
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar campos personalizados no Firestore:', err);
      alert('Erro ao salvar configurações no Firestore: ' + (err.message || 'Erro desconhecido'));
      return false;
    }
  };

  const handleSavePatientAnamnesis = async (pId: string, updatedData: PatientAnamnesis): Promise<boolean> => {
    try {
      const patientRef = doc(db, 'patients', pId);
      await setDoc(patientRef, {
        anamnesis: updatedData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar anamnese do paciente:', err);
      alert('Erro ao salvar anamnese: ' + (err.message || 'Erro desconhecido'));
      return false;
    }
  };

  const availableProcedures = [
    { name: 'Limpeza e Profilaxia', price: 250 },
    { name: 'Restauração em Resina', price: 350 },
    { name: 'Extração Simples', price: 400 },
    { name: 'Tratamento de Canal (Endodontia)', price: 1200 },
    { name: 'Coroa em Cerâmica / E-max', price: 2200 },
    { name: 'Implante Dentário Titânio', price: 3500 },
    { name: 'Clareamento Dental Laser', price: 800 },
    { name: 'Aplicação de Flúor', price: 150 },
    { name: 'Placa de Bruxismo / Miorrelaxante', price: 650 },
  ];

  const patient = patients.find(p => p.id === (patientId || patientName) || p.name === patientName) || {
    name: patientName,
    id: patientId || patientName,
  };

  const patientHistory = data.filter(r => r.paciente === patient.id || r.paciente === patient.name);
  const anamnesis = patient.anamnesis || {};

  const galleryDocs = documents.filter(
    doc => (doc.type === 'Exame' || doc.type === 'Pasta' || doc.type === 'Foto') && doc.folderId === currentFolderId
  );
  const currentFolder = currentFolderId ? documents.find(d => d.id === currentFolderId) : null;

  const nextAppt = useMemo(() => {
    return data
      .filter(
        r =>
          (r.paciente === patient.id || r.paciente === patient.name) &&
          r.status === 'Agendado' &&
          r.data &&
          isValid(parseISO(r.data)) &&
          parseISO(r.data) >= new Date()
      )
      .sort((a, b) => {
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
      age: isValidBirthDate ? `${differenceInYears(new Date(), birthDate)} anos` : 'Idade não informada',
      birthdate: isValidBirthDate ? format(birthDate, 'dd/MM/yyyy') : 'N/D',
      phone: patient.phone || patient.telefone || patient.celular || 'Não informado',
      status: patient.status || 'Ativo',
      cpf: patient.cpf || 'Não informado',
      email: patient.email || 'Não informado',
      dentist: patient.dentistaResponsavel || patient.dentist || 'Clínico Geral',
    };
  }, [patient, patientName]);

  const totalInvested = useMemo(() => {
    return patientHistory.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [patientHistory]);

  const tabs = [
    { id: 'Resumo', label: 'Resumo Clínico', icon: Activity },
    { id: 'Odontograma', label: 'Odontograma', icon: Smile },
    { id: 'Anamnese', label: 'Anamnese', icon: HeartPulse },
    { id: 'Evolução', label: 'Evolução', icon: Clock },
    { id: 'Documentos', label: 'Documentos & Exames', icon: FileText },
    { id: 'Planos', label: 'Planos de Tratamento', icon: FileBadge },
    { id: 'Orçamentos', label: 'Orçamentos', icon: DollarSign },
    { id: 'Histórico', label: 'Histórico', icon: History },
  ] as const;

  // Real & Persistent Treatment Plans State
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>(() => {
    if (Array.isArray(patient?.treatmentPlans) && patient.treatmentPlans.length > 0) {
      return patient.treatmentPlans;
    }
    return [
      {
        id: 'plan-1',
        title: 'Reabilitação Estética & Ortodontia',
        date: '12/03/2024',
        items: [
          { procedure: 'Limpeza e Profilaxia Ultrassônica', price: 250, teeth: 'Geral' },
          { procedure: 'Clareamento Dental a Laser / Consultório', price: 800, teeth: 'Geral' },
          { procedure: 'Restauração em Resina Composta (2 Faces)', price: 350, teeth: 'Dente 16' },
          { procedure: 'Coroa em Cerâmica / E-max', price: 3100, teeth: 'Dente 21' },
        ],
        status: 'Em Execução',
        progress: 60,
        total: 4500,
        dentist: patient?.dentistaResponsavel || patient?.dentist || 'Clínico Geral'
      },
      {
        id: 'plan-2',
        title: 'Tratamento Endodôntico e Prótese',
        date: '05/02/2024',
        items: [
          { procedure: 'Tratamento de Canal (Endodontia Multirradicular)', price: 1200, teeth: 'Dente 36' },
          { procedure: 'Coroa em Cerâmica / E-max', price: 1600, teeth: 'Dente 36' },
        ],
        status: 'Aprovado',
        progress: 100,
        total: 2800,
        dentist: patient?.dentistaResponsavel || patient?.dentist || 'Clínico Geral'
      },
    ];
  });

  // Real & Persistent Budgets State
  const [budgets, setBudgets] = useState<DentalBudget[]>(() => {
    if (Array.isArray(patient?.budgets) && patient.budgets.length > 0) {
      return patient.budgets;
    }
    return [
      {
        id: 'orc-1',
        budgetNumber: '2024-001',
        planTitle: 'Reabilitação Estética & Ortodontia',
        patientId: patient.id || patient.name,
        patientName: patientData.name,
        patientPhone: patientData.phone,
        dentistName: patientData.dentist,
        date: '2024-03-12',
        validUntil: '2024-04-12',
        items: [
          { id: '1', procedure: 'Limpeza e Profilaxia Ultrassônica', teeth: 'Geral', quantity: 1, unitPrice: 250, total: 250 },
          { id: '2', procedure: 'Clareamento Dental a Laser / Consultório', teeth: 'Geral', quantity: 1, unitPrice: 800, total: 800 },
          { id: '3', procedure: 'Restauração em Resina Composta (2 Faces)', teeth: 'Dente 16', quantity: 1, unitPrice: 350, total: 350 },
          { id: '4', procedure: 'Coroa em Cerâmica / E-max', teeth: 'Dente 21', quantity: 1, unitPrice: 3100, total: 3100 },
        ],
        subtotal: 4500,
        discountType: 'percent',
        discountValue: 10,
        discountAmount: 450,
        total: 4050,
        paymentMethod: 'Cartão de Crédito',
        installments: 12,
        installmentValue: 337.50,
        status: 'Aprovado',
        notes: 'Incluso acompanhamento semestral e manutenção preventiva.'
      },
      {
        id: 'orc-2',
        budgetNumber: '2023-085',
        planTitle: 'Limpeza e Restaurações Preventivas',
        patientId: patient.id || patient.name,
        patientName: patientData.name,
        patientPhone: patientData.phone,
        dentistName: patientData.dentist,
        date: '2023-12-05',
        validUntil: '2024-01-05',
        items: [
          { id: '1', procedure: 'Limpeza e Profilaxia Ultrassônica', teeth: 'Geral', quantity: 1, unitPrice: 250, total: 250 },
          { id: '2', procedure: 'Restauração em Resina Composta (1 Face)', teeth: 'Dente 24', quantity: 1, unitPrice: 950, total: 950 },
        ],
        subtotal: 1200,
        discountType: 'percent',
        discountValue: 0,
        discountAmount: 0,
        total: 1200,
        paymentMethod: 'À Vista (PIX/Dinheiro)',
        installments: 1,
        installmentValue: 1200,
        status: 'Concluído',
        notes: 'Pago à vista via PIX.'
      },
      {
        id: 'orc-3',
        budgetNumber: '2023-042',
        planTitle: 'Endodontia e Coroa',
        patientId: patient.id || patient.name,
        patientName: patientData.name,
        patientPhone: patientData.phone,
        dentistName: patientData.dentist,
        date: '2023-08-20',
        validUntil: '2023-09-20',
        items: [
          { id: '1', procedure: 'Tratamento de Canal (Endodontia Multirradicular)', teeth: 'Dente 36', quantity: 1, unitPrice: 1600, total: 1600 },
          { id: '2', procedure: 'Coroa em Cerâmica / E-max', teeth: 'Dente 36', quantity: 1, unitPrice: 2200, total: 2200 },
        ],
        subtotal: 3800,
        discountType: 'fixed',
        discountValue: 190,
        discountAmount: 190,
        total: 3610,
        paymentMethod: 'Cartão de Crédito',
        installments: 6,
        installmentValue: 601.66,
        status: 'Concluído',
        notes: 'Tratamento concluído.'
      },
    ];
  });

  // Save budget handler
  const handleSaveBudget = async (budget: DentalBudget) => {
    setBudgets(prev => {
      const existingIdx = prev.findIndex(b => b.id === budget.id || b.budgetNumber === budget.budgetNumber);
      let nextBudgets: DentalBudget[];
      if (existingIdx >= 0) {
        nextBudgets = [...prev];
        nextBudgets[existingIdx] = budget;
      } else {
        nextBudgets = [budget, ...prev];
      }

      if (db && patient?.id) {
        setDoc(doc(db, 'patients', patient.id), {
          budgets: nextBudgets,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Aviso ao sincronizar orçamento no Firestore:', err));
      }

      return nextBudgets;
    });

    // Auto-update plan status to 'Aprovado' if applicable
    if (budget.planTitle) {
      setTreatmentPlans(prev => {
        const nextPlans = prev.map(p => {
          if (p.title === budget.planTitle && p.status === 'Pendente') {
            return { ...p, status: 'Aprovado' };
          }
          return p;
        });
        if (db && patient?.id) {
          setDoc(doc(db, 'patients', patient.id), {
            treatmentPlans: nextPlans,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('Aviso ao sincronizar planos no Firestore:', err));
        }
        return nextPlans;
      });
    }

    setActiveTab('Orçamentos');
    alert(`Orçamento #${budget.budgetNumber} gerado e salvo com sucesso!`);
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return;
    setBudgets(prev => {
      const nextBudgets = prev.filter(b => b.id !== id);
      if (db && patient?.id) {
        setDoc(doc(db, 'patients', patient.id), {
          budgets: nextBudgets,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Aviso ao excluir orçamento no Firestore:', err));
      }
      return nextBudgets;
    });
  };

  const handleUpdateBudgetStatus = async (id: string, newStatus: DentalBudget['status']) => {
    setBudgets(prev => {
      const nextBudgets = prev.map(b => b.id === id ? { ...b, status: newStatus } : b);
      if (db && patient?.id) {
        setDoc(doc(db, 'patients', patient.id), {
          budgets: nextBudgets,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Aviso ao atualizar status no Firestore:', err));
      }
      return nextBudgets;
    });
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este plano de tratamento?')) return;
    setTreatmentPlans(prev => {
      const nextPlans = prev.filter(p => p.id !== planId);
      if (db && patient?.id) {
        setDoc(doc(db, 'patients', patient.id), {
          treatmentPlans: nextPlans,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Aviso ao excluir plano no Firestore:', err));
      }
      return nextPlans;
    });
  };

  const handleSaveNewPlan = async () => {
    if (!newPlan.title.trim()) {
      alert('Por favor, defina um título para o plano de tratamento');
      return;
    }
    if (newPlan.items.length === 0) {
      alert('Adicione pelo menos um procedimento ao plano');
      return;
    }

    const calculatedTotal = newPlan.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const createdPlan = {
      id: `plan-${Date.now()}`,
      title: newPlan.title.trim(),
      date: format(new Date(), 'dd/MM/yyyy'),
      items: newPlan.items,
      status: 'Pendente',
      progress: 0,
      total: calculatedTotal,
      dentist: patientData.dentist || currentUser?.name || 'Cirurgião-Dentista'
    };

    setTreatmentPlans(prev => {
      const nextPlans = [createdPlan, ...prev];
      if (db && patient?.id) {
        setDoc(doc(db, 'patients', patient.id), {
          treatmentPlans: nextPlans,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Aviso ao gravar plano no Firestore:', err));
      }
      return nextPlans;
    });

    setIsCreatingPlan(false);
    setNewPlan({ title: '', items: [] });
    alert(`Plano "${createdPlan.title}" criado com sucesso! Agora você já pode clicar em "Gerar Orçamento" para definir as condições de pagamento.`);
  };

  const [showShareBookingModal, setShowShareBookingModal] = useState(false);
  const [copiedPatientBookingLink, setCopiedPatientBookingLink] = useState(false);

  const handleSendBookingLinkWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const params = new URLSearchParams();
    params.set('booking', 'true');
    if (clinicOwnerId) params.set('clinicId', String(clinicOwnerId));
    const doc = patientData.dentist || currentUser?.name || '';
    if (doc && doc !== 'Clínico Geral') {
      params.set('doctor', doc);
    }
    const url = `${origin}${pathname}?${params.toString()}`;
    
    const cleanPhone = (patientData.phone || '').replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 && cleanPhone.length > 0 ? '55' + cleanPhone : cleanPhone;
    const msg = `Olá, *${patientData.name}*! 👋\n\nSegue o link para você agendar sua consulta online com *${doc || 'nosso dentista'}*:\n\n🔗 ${url}\n\nEscolha o melhor dia e horário para você! 🦷`;
    const encoded = encodeURIComponent(msg);
    
    if (finalPhone) {
      window.open(`https://wa.me/${finalPhone}?text=${encoded}`, '_blank');
    } else {
      setShowShareBookingModal(true);
    }
  };

  const handleCopyPatientBookingLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const params = new URLSearchParams();
    params.set('booking', 'true');
    if (clinicOwnerId) params.set('clinicId', String(clinicOwnerId));
    const doc = patientData.dentist || currentUser?.name || '';
    if (doc && doc !== 'Clínico Geral') {
      params.set('doctor', doc);
    }
    const url = `${origin}${pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopiedPatientBookingLink(true);
    setTimeout(() => setCopiedPatientBookingLink(false), 2500);
  };

  const handleWhatsApp = () => {
    if (!patientData.phone || patientData.phone === 'Não informado') {
      alert('Paciente não possui telefone cadastrado.');
      return;
    }
    const cleanPhone = patientData.phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
    const msg = `Olá ${patientData.name}, aqui é da clínica odontológica. Como podemos ajudar hoje?`;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Compact Clinical Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-4 py-3.5 sm:px-5 sm:py-4 relative">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Left: Patient basic details */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={onBack}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all shrink-0 cursor-pointer border border-white/10"
                title="Voltar para lista de pacientes"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-cyan to-teal-600 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-md shadow-brand-cyan/20 border border-white/20 shrink-0">
                {patientData.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate max-w-[280px] sm:max-w-md">
                    {patientData.name}
                  </h1>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                    patientData.status === 'Ativo' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  )}>
                    {patientData.status}
                  </span>
                  {(patient?.origem?.toLowerCase().includes('portal') || (patient as any)?.viaPortal) && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <Globe className="w-2.5 h-2.5" /> Via Portal
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 hidden sm:inline-block">
                    ID: {String(patient.id || '').slice(-6).toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-300 font-medium">
                  <span className="text-slate-200 font-semibold">{patientData.age}</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-slate-300">CPF: {patientData.cpf}</span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="text-brand-cyan hidden sm:inline">Dr(a). {patientData.dentist}</span>
                </div>
              </div>
            </div>

            {/* Right: Sleek Action Shortcuts */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
              <button
                onClick={handleSendBookingLinkWhatsApp}
                className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-emerald-500/30 cursor-pointer"
                title="Enviar Link de Agendamento Online no WhatsApp do Paciente"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Link de Agendamento</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Conversar no WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                onClick={() => onAddAppointment(patient.id || patient.name)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                title="Agendar Consulta"
              >
                <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Agendar</span>
              </button>

              <button
                onClick={() => onAddRecord(patient.id || patient.name)}
                className="px-3 py-1.5 bg-brand-cyan hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-brand-cyan/20 cursor-pointer"
                title="Adicionar Evolução / Procedimento"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Atendimento</span>
              </button>

              <button
                onClick={() => onUpdatePatient(patient.id || patient.name)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 cursor-pointer"
                title="Editar Cadastro do Paciente"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 sm:px-5 overflow-x-auto no-scrollbar">
          <nav className="flex gap-1.5 py-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-brand-cyan" : "text-slate-400")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="min-h-[500px]">
        {/* 1. RESUMO CLÍNICO */}
        {activeTab === 'Resumo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Investido</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(totalInvested)}</div>
                <p className="text-[11px] text-slate-400 mt-1">{patientHistory.length} procedimento(s) realizados</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Próxima Consulta</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-brand-cyan flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {nextAppt && isValid(parseISO(nextAppt.data))
                    ? format(parseISO(nextAppt.data), "dd/MM/yyyy 'às' HH:mm")
                    : 'Sem agendamentos futuros'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {nextAppt ? nextAppt.procedimento : 'Disponível para agendamento'}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alergias & Riscos</span>
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    anamnesis.hasAllergy ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                  )}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className={cn("text-sm font-bold", anamnesis.hasAllergy ? "text-rose-600" : "text-slate-700")}>
                  {anamnesis.hasAllergy ? `Alergia: ${anamnesis.allergyDetails || 'Registrada'}` : 'Nenhuma alergia relatada'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Verificado na Anamnese</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Documentos</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800">{documents.length}</div>
                <p className="text-[11px] text-slate-400 mt-1">Exames, atestados e receitas</p>
              </div>
            </div>

            {/* Quick Prescriptions & Certificates Generator */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-brand-cyan text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Emissão Rápida de Documentos
                </div>
                <h3 className="text-xl font-bold text-white">Precisa emitir receita médica ou atestado?</h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Gere documentos personalizados em PDF com logotipo da clínica, assinatura digital do profissional e termos prontos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onAddPrescription(patient.id || patient.name)}
                  className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Pill className="w-4 h-4 text-brand-cyan" />
                  <span>Emitir Receituário</span>
                </button>
                <button
                  onClick={() => onAddCertificate(patient.id || patient.name)}
                  className="px-5 py-3 bg-brand-cyan text-slate-950 hover:bg-cyan-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Emitir Atestado</span>
                </button>
              </div>
            </div>

            {/* Recent Timeline Preview */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Últimos Atendimentos & Procedimentos</h3>
                  <p className="text-xs text-slate-400">Histórico recente de consultas e intervenções odontológicas</p>
                </div>
                <button
                  onClick={() => setActiveTab('Histórico')}
                  className="text-xs font-bold text-brand-cyan hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {patientHistory.length > 0 ? (
                <div className="space-y-3">
                  {patientHistory.slice(0, 4).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center font-bold text-xs">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{rec.procedimento}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{rec.data ? format(parseISO(rec.data), 'dd/MM/yyyy') : 'Sem data'}</span>
                            <span>•</span>
                            <span>Dr(a). {rec.dentista}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-slate-800">{formatCurrency(rec.valor)}</div>
                        <span className={cn(
                          "inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5",
                          rec.status === 'Realizado' || rec.status === 'Concluído' ? "bg-emerald-100 text-emerald-700" :
                          rec.status === 'Agendado' ? "bg-cyan-100 text-cyan-800" : "bg-amber-100 text-amber-800"
                        )}>
                          {rec.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold uppercase">Nenhum atendimento registrado ainda</p>
                  <button
                    onClick={() => onAddRecord(patient.id || patient.name)}
                    className="mt-3 text-xs font-bold text-brand-cyan hover:underline"
                  >
                    + Registrar primeiro atendimento
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ODONTOGRAMA */}
        {activeTab === 'Odontograma' && (
          <OdontogramSection patientName={patientData.name} currentUser={currentUser} />
        )}

        {/* 3. ANAMNESE */}
        {activeTab === 'Anamnese' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-rose-500" />
                    Questionário de Saúde & Anamnese
                  </h3>
                  {customFields.length > 0 && (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-50 text-brand-cyan border border-brand-cyan/20">
                      +{customFields.filter(f => f.active).length} Campos Personalizados
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Informações de saúde essenciais para segurança em intervenções cirúrgicas e anestésicas
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowFormBuilder(true)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs border border-slate-200"
                    title="Definir campos e perguntas dinâmicas para a clínica no Firestore"
                  >
                    <Sliders className="w-4 h-4 text-brand-cyan" />
                    <span>Editor de Campos (Admin)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-white font-bold">
                      {customFields.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPatientAnamnesisModal(true)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Atualizar Respostas</span>
                </button>
              </div>
            </div>

            {/* Standard Health Questions Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Perguntas Padrão de Saúde & Risco Cirúrgico
                </h4>
                <span className="text-[10px] text-slate-400 font-bold">Padrão CFO</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Possui Alergias?', value: anamnesis.hasAllergy ? `Sim (${anamnesis.allergyDetails || 'Geral'})` : 'Não', alert: !!anamnesis.hasAllergy },
                  { label: 'Doenças Cardiovasculares?', value: anamnesis.hasHeartProblem ? 'Sim' : 'Não', alert: !!anamnesis.hasHeartProblem },
                  { label: 'Hipertensão Arterial?', value: anamnesis.hasHypertension ? 'Sim' : 'Não', alert: !!anamnesis.hasHypertension },
                  { label: 'Diabetes Mellitus?', value: anamnesis.hasDiabetes ? 'Sim' : 'Não', alert: !!anamnesis.hasDiabetes },
                  { label: 'Uso Contínuo de Medicamentos?', value: anamnesis.takesMedication ? `Sim (${anamnesis.medicationDetails || ''})` : 'Não', alert: !!anamnesis.takesMedication },
                  { label: 'Fumante / Tabagista?', value: anamnesis.isSmoker ? 'Sim' : 'Não', alert: !!anamnesis.isSmoker },
                  { label: 'Hábito de Sangramento Excessivo?', value: anamnesis.hasBleedingHistory ? 'Sim' : 'Não', alert: !!anamnesis.hasBleedingHistory },
                  { label: 'Gestante / Lactante?', value: anamnesis.isPregnant ? 'Sim' : 'Não', alert: !!anamnesis.isPregnant },
                  { label: 'Reação a Anestésicos?', value: anamnesis.hasAnesthesiaReaction ? 'Sim' : 'Não', alert: !!anamnesis.hasAnesthesiaReaction },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl border transition-all",
                      item.alert ? "bg-rose-50/60 border-rose-200 text-rose-900" : "bg-slate-50/60 border-slate-200/70 text-slate-800"
                    )}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{item.label}</div>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {item.alert ? (
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Clinic Custom Questions Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    2. Perguntas Personalizadas da Clínica
                  </h4>
                  {customFields.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      ({customFields.filter(f => f.active).length} ativas)
                    </span>
                  )}
                </div>

                {isAdmin && customFields.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFormBuilder(true)}
                    className="text-xs font-bold text-brand-cyan hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Gerenciar Campos Dinâmicos</span>
                  </button>
                )}
              </div>

              {customFields.filter(f => f.active).length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-brand-cyan flex items-center justify-center mx-auto">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Nenhum campo personalizado cadastrado</p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                      O administrador da clínica pode criar perguntas clínicas adicionais (ex: anticoagulantes, bifosfonatos, ATM, anestésicos) salvas no Firestore.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowFormBuilder(true)}
                      className="px-4 py-2 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Abrir Editor de Formulário</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customFields.filter(f => f.active).map((field) => {
                    const val = anamnesis.customFields?.[field.id];
                    const isAnswered = val !== undefined && val !== null && val !== '';
                    const isAlert = field.isAlertIfTrue && (
                      val === true || 
                      val === 'Sim' || 
                      (field.alertTriggerValue && val === field.alertTriggerValue)
                    );
                    
                    let displayValue = 'Não preenchido';
                    if (isAnswered) {
                      if (field.type === 'boolean') {
                        displayValue = val ? 'Sim' : 'Não';
                      } else {
                        displayValue = String(val);
                      }
                    }

                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2.5",
                          isAlert
                            ? "bg-rose-50/70 border-rose-200 text-rose-900"
                            : isAnswered
                            ? "bg-slate-50/70 border-slate-200/80 text-slate-800"
                            : "bg-slate-50/40 border-dashed border-slate-200 text-slate-400"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {field.category || 'Personalizado'}
                            </span>
                            {field.isAlertIfTrue && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Risco
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-800 leading-snug">
                            {field.label}
                          </div>
                          {field.helperText && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{field.helperText}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-bold text-xs pt-2 border-t border-slate-200/50">
                          {isAlert ? (
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : isAnswered ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Info className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={cn(
                            isAlert ? "text-rose-900 font-black" : isAnswered ? "text-slate-700" : "text-slate-400 italic"
                          )}>
                            {displayValue}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes & Complaints */}
            {(anamnesis.chiefComplaint || anamnesis.medicalHistory || anamnesis.generalNotes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {anamnesis.chiefComplaint && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Queixa Principal</div>
                    <p className="text-xs leading-relaxed font-medium">{anamnesis.chiefComplaint}</p>
                  </div>
                )}
                {anamnesis.generalNotes && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-900 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Observações Clínicas Adicionais</div>
                    <p className="text-xs leading-relaxed font-medium">{anamnesis.generalNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. EVOLUÇÃO CLÍNICA */}
        {activeTab === 'Evolução' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Evolução do Tratamento</h3>
                <p className="text-xs text-slate-400 mt-1">Registro cronológico detalhado de consultas e intervenções</p>
              </div>

              <button
                onClick={() => onAddRecord(patient.id || patient.name)}
                className="px-5 py-2.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-cyan/20 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nova Evolução</span>
              </button>
            </div>

            {patientHistory.length > 0 ? (
              <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pl-6">
                {patientHistory.map((rec) => (
                  <div key={rec.id} className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-brand-cyan ring-4 ring-white shadow-sm" />
                    
                    <div className="bg-slate-50/80 border border-slate-200/70 p-5 rounded-2xl space-y-3 hover:border-brand-cyan/40 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {rec.data ? format(parseISO(rec.data), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Data não informada'}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">{rec.procedimento}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(rec.valor)}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            {rec.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 leading-relaxed font-medium">
                        {rec.observacao || 'Nenhuma observação clínica registrada para este procedimento.'}
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Profissional: <strong className="text-slate-700 font-bold">{rec.dentista}</strong></span>
                        <span>Pagamento: <strong className="text-slate-700 font-bold">{rec.statusPagamento || 'Pago'}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Nenhum registro de evolução encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Inicie o registro das consultas para montar o prontuário.</p>
              </div>
            )}
          </div>
        )}

        {/* 5. DOCUMENTOS & EXAMES */}
        {activeTab === 'Documentos' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Documentos, Radiografias & Exames</h3>
                <p className="text-xs text-slate-400 mt-1">Armazenamento digital seguro de laudos, imagens e contratos</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="px-5 py-2.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-cyan/20">
                  <Upload className="w-4 h-4" />
                  <span>Upload de Arquivo</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const base64 = event.target?.result as string;
                        await onUploadDocument({
                          name: file.name,
                          type: file.type.includes('image') ? 'Foto' : 'Exame',
                          url: base64,
                          patientId: patient.id || patient.name,
                          date: new Date().toISOString(),
                          size: (file.size / 1024).toFixed(1) + ' KB',
                          folderId: currentFolderId,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {documents.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-brand-cyan/40 transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="w-full h-28 bg-slate-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-slate-200/60">
                        {docItem.url && docItem.url.startsWith('data:image') ? (
                          <img src={docItem.url} alt={docItem.name} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate" title={docItem.name}>
                        {docItem.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>{docItem.size || 'Arquivo'}</span>
                        <span>{docItem.date ? format(parseISO(docItem.date), 'dd/MM/yy') : ''}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                      {docItem.url && (
                        <button
                          onClick={() => setSelectedImagePreview(docItem.url)}
                          className="text-[10px] font-bold text-brand-cyan hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Visualizar
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteDocument(docItem.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Nenhum documento anexado ainda</p>
                <p className="text-xs text-slate-400 mt-1">Faça upload de fotos intraorais, exames ou receituários.</p>
              </div>
            )}
          </div>
        )}

        {/* 6. PLANOS DE TRATAMENTO */}
        {activeTab === 'Planos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileBadge className="w-5 h-5 text-brand-cyan" />
                    Planos de Tratamento Odontológico
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Planejamentos clínicos estruturados e geração instantânea de orçamentos e propostas comerciais
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingPlan(!isCreatingPlan)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Plano</span>
                </button>
              </div>

              {/* Creator Form */}
              {isCreatingPlan && (
                <div className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Montar Novo Plano de Tratamento
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingPlan(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Título / Diagnóstico do Plano</label>
                    <input
                      type="text"
                      placeholder="Ex: Reabilitação Oral com Implantes e Estética"
                      value={newPlan.title}
                      onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      + Clique para Adicionar Procedimentos ao Plano:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableProcedures.map((proc) => (
                        <button
                          key={proc.name}
                          type="button"
                          onClick={() => {
                            setNewPlan({
                              ...newPlan,
                              items: [...newPlan.items, { procedure: proc.name, price: proc.price, teeth: 'Geral' }],
                            });
                          }}
                          className="px-3 py-2 bg-white hover:bg-brand-cyan hover:text-slate-950 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-brand-cyan" />
                          <span>{proc.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">({formatCurrency(proc.price)})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {newPlan.items.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700">Procedimentos Inclusos no Plano ({newPlan.items.length}):</div>
                      <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 p-2">
                        {newPlan.items.map((item, index) => (
                          <div key={index} className="py-2.5 px-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-800">{item.procedure}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">{formatCurrency(item.price)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewPlan({
                                    ...newPlan,
                                    items: newPlan.items.filter((_, i) => i !== index),
                                  });
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-right pt-2 text-sm font-black text-slate-900">
                        Total Estimado: {formatCurrency(newPlan.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsCreatingPlan(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewPlan}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                    >
                      Salvar Plano de Tratamento
                    </button>
                  </div>
                </div>
              )}

              {/* Treatment Plans Grid */}
              {treatmentPlans.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FileBadge className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Nenhum plano de tratamento cadastrado</p>
                  <p className="text-xs text-slate-400 mt-1">Clique em "Novo Plano" acima para planejar os procedimentos e gerar orçamentos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {treatmentPlans.map((plano) => (
                    <div 
                      key={plano.id || plano.title} 
                      className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{plano.title}</h4>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>{plano.date}</span>
                            <span>•</span>
                            <span>{plano.items?.length || 1} procedimentos</span>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          plano.status === 'Aprovado' || plano.status === 'Concluído' ? "bg-emerald-100 text-emerald-800" :
                          plano.status === 'Em Execução' ? "bg-cyan-100 text-cyan-800" :
                          "bg-amber-100 text-amber-800"
                        )}>
                          {plano.status}
                        </span>
                      </div>

                      {/* Items list preview */}
                      {Array.isArray(plano.items) && plano.items.length > 0 && (
                        <div className="p-3 bg-white rounded-xl border border-slate-100 text-xs space-y-1.5">
                          {plano.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-slate-600 text-[11px]">
                              <span>• {it.procedure || it.name}</span>
                              <span className="font-bold text-slate-800 font-mono">{formatCurrency(it.price || it.valor || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Progresso do Tratamento</span>
                          <span>{plano.progress || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-cyan rounded-full transition-all" style={{ width: `${plano.progress || 0}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Investimento Estimado</p>
                          <p className="text-sm font-black text-slate-900">{formatCurrency(plano.total || 0)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plano.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Excluir Plano"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanForBudget(plano);
                              setSelectedBudgetForView(null);
                              setShowBudgetModal(true);
                            }}
                            className="px-4 py-2 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Gerar Orçamento</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. ORÇAMENTOS */}
        {activeTab === 'Orçamentos' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-brand-cyan" />
                  Histórico de Orçamentos Odontológicos
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Propostas comerciais, simulações de parcelamento, termos de garantia e status de aprovação
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlanForBudget(null);
                  setSelectedBudgetForView(null);
                  setShowBudgetModal(true);
                }}
                className="px-5 py-2.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-cyan/20 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Orçamento</span>
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Nenhum orçamento gerado ainda</p>
                <p className="text-xs text-slate-400 mt-1">
                  Gere um orçamento a partir da aba "Planos de Tratamento" ou clique no botão "+ Novo Orçamento" acima.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Nº Proposta</th>
                      <th className="px-6 py-4">Plano / Descrição</th>
                      <th className="px-6 py-4">Data / Validade</th>
                      <th className="px-6 py-4">Condição de Pagamento</th>
                      <th className="px-6 py-4">Valor Final</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {budgets.map((orc) => {
                      const isApproved = orc.status === 'Aprovado';
                      const isConcluded = orc.status === 'Concluído';
                      const isCanceled = orc.status === 'Cancelado';

                      return (
                        <tr key={orc.id || orc.budgetNumber} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">
                            #{orc.budgetNumber}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{orc.planTitle || 'Tratamento Odontológico'}</p>
                            <p className="text-[10px] text-slate-400">{orc.items?.length || 1} itens inclusos</p>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            <p>{orc.date ? (isValid(parseISO(orc.date)) ? format(parseISO(orc.date), 'dd/MM/yyyy') : orc.date) : '-'}</p>
                            {orc.validUntil && (
                              <p className="text-[10px] text-slate-400">
                                Até {isValid(parseISO(orc.validUntil)) ? format(parseISO(orc.validUntil), 'dd/MM/yyyy') : orc.validUntil}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            <p className="font-semibold">{orc.paymentMethod || 'Cartão de Crédito'}</p>
                            {orc.installments && orc.installments > 1 && (
                              <p className="text-[10px] text-brand-cyan font-bold font-mono">
                                {orc.installments}x de {formatCurrency(orc.installmentValue || (orc.total / orc.installments))}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 font-black text-slate-900">
                            <p className="text-sm text-slate-950 font-mono">{formatCurrency(orc.total)}</p>
                            {orc.discountAmount && orc.discountAmount > 0 ? (
                              <p className="text-[10px] text-emerald-600 font-bold">
                                Desc: -{formatCurrency(orc.discountAmount)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              isApproved ? "bg-emerald-100 text-emerald-800" :
                              isConcluded ? "bg-cyan-100 text-cyan-800" :
                              isCanceled ? "bg-rose-100 text-rose-800" :
                              "bg-amber-100 text-amber-800"
                            )}>
                              {orc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Print/View Modal */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBudgetForView(orc);
                                  setSelectedPlanForBudget(null);
                                  setShowBudgetModal(true);
                                }}
                                className="p-2 text-slate-600 hover:text-brand-cyan hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                title="Visualizar / Imprimir Orçamento"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Quick Share */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!patientData.phone || patientData.phone === 'Não informado') {
                                    alert('O paciente não possui telefone cadastrado.');
                                    return;
                                  }
                                  const cleanPhone = patientData.phone.replace(/\D/g, '');
                                  const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                                  const msg = `Olá *${patientData.name}*! Segue a proposta do seu orçamento *#${orc.budgetNumber}* no valor total de *${formatCurrency(orc.total)}*. Ficamos à disposição para agendar!`;
                                  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                                title="Enviar pelo WhatsApp"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteBudget(orc.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Excluir Orçamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 8. HISTÓRICO COMPLETO */}
        {activeTab === 'Histórico' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Histórico de Atendimentos</h3>
                <p className="text-xs text-slate-400 mt-1">Listagem completa e auditada de todos os registros</p>
              </div>
            </div>

            {patientHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Procedimento</th>
                      <th className="px-6 py-4">Profissional</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Pagamento</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {patientHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {rec.data ? format(parseISO(rec.data), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{rec.procedimento}</td>
                        <td className="px-6 py-4 text-slate-600">{rec.dentista}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            rec.statusPagamento === 'Pago' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {rec.statusPagamento || 'Pago'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">
                          {formatCurrency(rec.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Nenhum histórico registrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImagePreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-3xl w-full relative">
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImagePreview} alt="Preview" className="w-full max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* Admin Dynamic Anamnesis Form Builder Modal */}
      <AnamnesisFormBuilderModal
        isOpen={showFormBuilder}
        onClose={() => setShowFormBuilder(false)}
        clinicOwnerId={clinicOwnerId}
        customFields={customFields}
        onSaveFields={handleSaveCustomFields}
        currentUser={currentUser}
      />

      {/* Patient Anamnesis Fill/Edit Modal */}
      <AnamnesisPatientEditModal
        isOpen={showPatientAnamnesisModal}
        onClose={() => setShowPatientAnamnesisModal(false)}
        patientName={patientData.name}
        patientId={patient.id || patient.name}
        anamnesis={anamnesis}
        customFields={customFields}
        onSaveAnamnesis={handleSavePatientAnamnesis}
      />

      {/* Dental Budget Generator & Viewer Modal */}
      {showBudgetModal && (
        <DentalBudgetModal
          isOpen={showBudgetModal}
          onClose={() => {
            setShowBudgetModal(false);
            setSelectedPlanForBudget(null);
            setSelectedBudgetForView(null);
          }}
          initialPlan={selectedPlanForBudget}
          initialBudget={selectedBudgetForView}
          patient={{
            id: patient.id || patient.name,
            name: patientData.name,
            phone: patientData.phone,
            cpf: patientData.cpf,
            email: patientData.email,
            dentist: patientData.dentist,
          }}
          currentUser={currentUser}
          clinicName={clinicName}
          clinicPixKey={clinicPixKey}
          clinicPixBeneficiary={clinicPixBeneficiary}
          clinicPixCity={clinicPixCity}
          clinicPixBank={clinicPixBank}
          onSaveBudget={handleSaveBudget}
        />
      )}

      {/* Share Booking Modal */}
      <ShareBookingModal
        isOpen={showShareBookingModal}
        onClose={() => setShowShareBookingModal(false)}
        clinicName="Oral Admin Odontologia"
        clinicId={clinicOwnerId}
        currentUser={currentUser}
        prefillPatientName={patientData.name}
        prefillPatientPhone={patientData.phone !== 'Não informado' ? patientData.phone : ''}
      />
    </div>
  );
}

// Subcomponent: Odontogram Section with Tooth Grid & Firebase Sync
function OdontogramSection({ patientName, currentUser }: { patientName: string; currentUser?: any }) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const statuses = [
    { label: 'Hígido / Saudável', key: null, color: 'bg-slate-100 text-slate-700' },
    { label: 'Cárie / Restauração Pendente', key: 'carie', color: 'bg-rose-100 text-rose-800' },
    { label: 'Restaurado', key: 'restaurado', color: 'bg-emerald-100 text-emerald-800' },
    { label: 'Ausente / Extraído', key: 'ausente', color: 'bg-slate-300 text-slate-800' },
    { label: 'Tratamento de Canal', key: 'canal', color: 'bg-amber-100 text-amber-800' },
    { label: 'Implante Dentário', key: 'implante', color: 'bg-cyan-100 text-cyan-800' },
    { label: 'Prótese / Coroa', key: 'coroa', color: 'bg-purple-100 text-purple-800' },
  ];

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const docId = patientName.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, 'odontograms', docId);

    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setTeethData(docSnap.data().teethData || {});
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error syncing odontogram:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [patientName]);

  const updateTooth = async (num: number, statusKey: string | null, notes?: string) => {
    const nextTeeth = {
      ...teethData,
      [num]: {
        status: statusKey,
        notes: notes !== undefined ? notes : teethData[num]?.notes || '',
        updatedAt: new Date().toISOString(),
      },
    };
    setTeethData(nextTeeth);

    if (db) {
      const docId = patientName.toLowerCase().replace(/\s+/g, '-');
      try {
        await setDoc(
          doc(db, 'odontograms', docId),
          {
            patientName,
            teethData: nextTeeth,
            lastUpdatedBy: currentUser?.name || 'Clínico',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error('Error updating tooth in firestore:', e);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Smile className="w-5 h-5 text-brand-cyan" />
            Odontograma Anatômico Interativo
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Clique no dente para registrar tratamentos, implantes, próteses e anotações clínicas
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          {statuses.slice(1).map((st) => (
            <span key={st.key} className={cn('px-2.5 py-1 rounded-full font-bold uppercase tracking-wider', st.color)}>
              {st.label}
            </span>
          ))}
        </div>
      </div>

      {/* Teeth Arc Render */}
      <div className="space-y-6 bg-slate-50/60 p-6 rounded-3xl border border-slate-200/70">
        <div className="text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            Arcada Superior (Maxila)
          </span>
          <div className="flex justify-center gap-1.5 sm:gap-2.5 mt-4 overflow-x-auto pb-2">
            {upperTeeth.map((tooth) => {
              const info = teethData[tooth];
              const isSelected = selectedTooth === tooth;
              return (
                <button
                  key={tooth}
                  onClick={() => setSelectedTooth(isSelected ? null : tooth)}
                  className={cn(
                    'w-9 h-12 sm:w-11 sm:h-14 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer shrink-0 shadow-xs',
                    isSelected
                      ? 'border-brand-cyan bg-slate-900 text-white ring-2 ring-brand-cyan/50 scale-105'
                      : info?.status === 'carie'
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : info?.status === 'restaurado'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : info?.status === 'ausente'
                      ? 'border-slate-400 bg-slate-200 text-slate-600 line-through'
                      : info?.status === 'canal'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : info?.status === 'implante'
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  )}
                >
                  <span className="text-[10px] font-black">{tooth}</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-current opacity-60" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full h-px bg-slate-200/80 my-4" />

        <div className="text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            Arcada Inferior (Mandíbula)
          </span>
          <div className="flex justify-center gap-1.5 sm:gap-2.5 mt-4 overflow-x-auto pb-2">
            {lowerTeeth.map((tooth) => {
              const info = teethData[tooth];
              const isSelected = selectedTooth === tooth;
              return (
                <button
                  key={tooth}
                  onClick={() => setSelectedTooth(isSelected ? null : tooth)}
                  className={cn(
                    'w-9 h-12 sm:w-11 sm:h-14 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer shrink-0 shadow-xs',
                    isSelected
                      ? 'border-brand-cyan bg-slate-900 text-white ring-2 ring-brand-cyan/50 scale-105'
                      : info?.status === 'carie'
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : info?.status === 'restaurado'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : info?.status === 'ausente'
                      ? 'border-slate-400 bg-slate-200 text-slate-600 line-through'
                      : info?.status === 'canal'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : info?.status === 'implante'
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  )}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-current opacity-60" />
                  <span className="text-[10px] font-black">{tooth}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Tooth Drawer / Action Panel */}
      {selectedTooth && (
        <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan text-slate-950 font-black flex items-center justify-center text-base">
                {selectedTooth}
              </div>
              <div>
                <h4 className="font-bold text-sm">Status do Dente {selectedTooth}</h4>
                <p className="text-[10px] text-slate-400">Selecione uma condição clínica para registrar</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTooth(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {statuses.map((st) => {
              const isCurrent = (teethData[selectedTooth]?.status || null) === st.key;
              return (
                <button
                  key={st.key || 'higido'}
                  onClick={() => updateTooth(selectedTooth, st.key)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    isCurrent
                      ? 'bg-brand-cyan text-slate-950 shadow-md ring-2 ring-white/50'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  )}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <input
              type="text"
              placeholder="Observações adicionais para este dente..."
              defaultValue={teethData[selectedTooth]?.notes || ''}
              onBlur={(e) => updateTooth(selectedTooth, teethData[selectedTooth]?.status || null, e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-brand-cyan"
            />
          </div>
        </div>
      )}
    </div>
  );
}
