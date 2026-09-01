import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  Settings,
  Database,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  Edit,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Building,
  Palette,
  Share2,
  CreditCard,
  Monitor,
  Sparkles,
  Info,
  Check,
  X,
  Loader2,
  UserCheck,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  QrCode,
  Copy,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { SecurityUtils } from '../lib/security';
import { DentalRecord } from '../types';
import { generatePixPayload, detectPixKeyType } from '../lib/pix';

interface AdminViewProps {
  users: any[];
  data: DentalRecord[];
  patients: any[];
  documents: any[];
  currentUser: any;
  onAddUser: (user: any) => Promise<boolean>;
  onUpdateUser: (id: string, updates: any) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<any>;
  onUnlockUser: (id: string, username: string) => Promise<void>;
  onRestoreBackup: (backupData: any) => Promise<void>;
  clinicName: string;
  clinicLogo: string | null;
  footerText: string;
  providerPhone: string;
  providerName: string;
  clinicPixKey?: string;
  clinicPixType?: string;
  clinicPixBeneficiary?: string;
  clinicPixCity?: string;
  clinicPixBank?: string;
  onUpdateSettings: (updates: {
    clinicName?: string;
    clinicLogo?: string | null;
    footerText?: string;
    providerPhone?: string;
    providerName?: string;
    pixKey?: string;
    pixType?: string;
    pixBeneficiary?: string;
    pixCity?: string;
    pixBank?: string;
  }) => Promise<void>;
  deferredPrompt?: any;
  onInstallPWA?: () => void;
}

export default function AdminView({
  users = [],
  data = [],
  patients = [],
  documents = [],
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUnlockUser,
  onRestoreBackup,
  clinicName,
  clinicLogo,
  footerText,
  providerPhone,
  providerName,
  clinicPixKey,
  clinicPixType,
  clinicPixBeneficiary,
  clinicPixCity,
  clinicPixBank,
  onUpdateSettings,
  deferredPrompt,
  onInstallPWA
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'backup' | 'audit'>('users');

  // Search & Filter state for users
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('Todos');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [unlockingUser, setUnlockingUser] = useState<any | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'Todos' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-8 relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-brand-cyan to-teal-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-brand-cyan/20 border border-white/20">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan bg-brand-cyan/20 px-2.5 py-0.5 rounded-full border border-brand-cyan/30">
                    Módulo Administrativo
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/10 px-2 py-0.5 rounded">
                    Admin Pro
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Painel de Controle & Gestão
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Gerencie acessos de profissionais, parametrizações da clínica e backups de segurança.
                </p>
              </div>
            </div>

            {/* Quick action button */}
            {activeTab === 'users' && (
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="px-5 py-3 bg-brand-cyan hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-cyan/20 shrink-0 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Usuário</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          <nav className="flex gap-2 py-2.5 min-w-max">
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer',
                activeTab === 'users'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              <Users className={cn('w-3.5 h-3.5', activeTab === 'users' ? 'text-brand-cyan' : 'text-slate-400')} />
              <span>Usuários & Profissionais ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer',
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              <Settings className={cn('w-3.5 h-3.5', activeTab === 'settings' ? 'text-brand-cyan' : 'text-slate-400')} />
              <span>Configurações da Clínica</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer',
                activeTab === 'backup'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              )}
            >
              <Database className={cn('w-3.5 h-3.5', activeTab === 'backup' ? 'text-brand-cyan' : 'text-slate-400')} />
              <span>Backup & Restauração</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Tab Content */}
      <div>
        {/* 1. USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou login..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Filtrar Cargo:
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer focus:border-brand-cyan w-full sm:w-auto"
                >
                  <option value="Todos">Todos os Cargos</option>
                  <option value="Admin">Administrador</option>
                  <option value="Dentista">Dentista / Clínico</option>
                  <option value="Recepcionista">Recepcionista</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Usuário / Profissional</th>
                      <th className="px-6 py-4">Cargo / Função</th>
                      <th className="px-6 py-4">Contato / Login</th>
                      <th className="px-6 py-4">Status de Acesso</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsers.map((u) => {
                      const isBlocked = u.isLocked || u.loginAttempts >= 5;
                      return (
                        <tr key={u.id || u.username} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 text-brand-cyan flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                {u.name ? u.name.charAt(0) : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">@{u.username || 'sem_login'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span
                                className={cn(
                                  'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block',
                                  u.role === 'Admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : u.role === 'Dentista'
                                    ? 'bg-cyan-100 text-cyan-800'
                                    : 'bg-slate-100 text-slate-700'
                                )}
                              >
                                {u.role || 'Usuário'}
                              </span>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {u.modules === 'Todos' || !u.modules ? 'Todos os módulos' : `${u.modules.split(',').length} módulo(s) liberado(s)`}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-slate-700 font-medium">{u.email || 'Email não cadastrado'}</div>
                            <div className="text-[10px] text-slate-400">{u.phone || 'Sem telefone'}</div>
                          </td>

                          <td className="px-6 py-4">
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
                                <Lock className="w-3 h-3" /> Bloqueado (Brute-Force)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                <UserCheck className="w-3 h-3" /> Ativo
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isBlocked && (
                                <button
                                  onClick={() => setUnlockingUser(u)}
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Desbloquear Usuário"
                                >
                                  <Unlock className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-2 text-slate-500 hover:text-brand-cyan hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
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

              {filteredUsers.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Nenhum usuário encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <SettingsSection
            clinicName={clinicName}
            clinicLogo={clinicLogo}
            footerText={footerText}
            providerPhone={providerPhone}
            providerName={providerName}
            clinicPixKey={clinicPixKey}
            clinicPixType={clinicPixType}
            clinicPixBeneficiary={clinicPixBeneficiary}
            clinicPixCity={clinicPixCity}
            clinicPixBank={clinicPixBank}
            onUpdateSettings={onUpdateSettings}
            deferredPrompt={deferredPrompt}
            onInstallPWA={onInstallPWA}
          />
        )}

        {/* 3. BACKUP TAB */}
        {activeTab === 'backup' && (
          <BackupSection
            clinicName={clinicName}
            data={data}
            patients={patients}
            users={users}
            documents={documents}
            onRestore={onRestoreBackup}
          />
        )}
      </div>

      {/* User Create / Edit Modal */}
      <AnimatePresence>
        {(isAddUserOpen || editingUser) && (
          <UserFormModal
            user={editingUser}
            currentUser={currentUser}
            isOpen={isAddUserOpen || !!editingUser}
            onClose={() => {
              setIsAddUserOpen(false);
              setEditingUser(null);
            }}
            onDelete={(userToDelete: any) => {
              setEditingUser(null);
              setDeletingUser(userToDelete);
            }}
            onSave={async (userData: any) => {
              if (editingUser) {
                const ok = await onUpdateUser(editingUser.id, userData);
                if (ok) setEditingUser(null);
              } else {
                const ok = await onAddUser(userData);
                if (ok) setIsAddUserOpen(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl border border-rose-100">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-900">Excluir Usuário?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja revogar o acesso de{' '}
                  <strong className="text-slate-800 font-bold">{deletingUser.name}</strong>? Esta ação não pode ser
                  desfeita.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onDeleteUser(deletingUser.id);
                    setDeletingUser(null);
                  }}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200"
                >
                  Excluir Acesso
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlock User Modal */}
      <AnimatePresence>
        {unlockingUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl border border-amber-100">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Unlock className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-900">Desbloquear Conta?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O usuário <strong className="text-slate-800 font-bold">{unlockingUser.name}</strong> excedeu o limite
                  de tentativas de login. Deseja reiniciar as travas de segurança e liberar o acesso?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUnlockingUser(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onUnlockUser(unlockingUser.id, unlockingUser.username);
                    setUnlockingUser(null);
                  }}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-200"
                >
                  Desbloquear Agora
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponent: Settings Section
function SettingsSection({
  clinicName,
  clinicLogo,
  footerText,
  providerPhone,
  providerName,
  clinicPixKey,
  clinicPixType,
  clinicPixBeneficiary,
  clinicPixCity,
  clinicPixBank,
  onUpdateSettings,
  deferredPrompt,
  onInstallPWA
}: any) {
  const [localClinicName, setLocalClinicName] = useState(clinicName || '');
  const [localFooterText, setLocalFooterText] = useState(footerText || '');
  const [localLogo, setLocalLogo] = useState<string | null>(clinicLogo || null);
  const [localProviderPhone, setLocalProviderPhone] = useState(providerPhone || '');
  const [localProviderName, setLocalProviderName] = useState(providerName || '');

  // Pix Settings
  const [localPixKey, setLocalPixKey] = useState(clinicPixKey || '');
  const [localPixType, setLocalPixType] = useState(clinicPixType || 'EMAIL');
  const [localPixBeneficiary, setLocalPixBeneficiary] = useState(clinicPixBeneficiary || clinicName || '');
  const [localPixCity, setLocalPixCity] = useState(clinicPixCity || 'SAO PAULO');
  const [localPixBank, setLocalPixBank] = useState(clinicPixBank || '');
  const [copiedTestPix, setCopiedTestPix] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-detect Pix Key Type
  const detectedPixType = useMemo(() => {
    if (!localPixKey) return null;
    return detectPixKeyType(localPixKey);
  }, [localPixKey]);

  // Generate live EMV Pix QR and payload for preview & test
  const testPixData = useMemo(() => {
    if (!localPixKey.trim()) return null;
    try {
      return generatePixPayload({
        key: localPixKey.trim(),
        name: localPixBeneficiary || localClinicName || 'ODONTODASH CLINICA',
        city: localPixCity || 'SAO PAULO',
        amount: 50.00,
        txid: 'TESTE01',
        description: 'Teste Chave Pix Clinica'
      });
    } catch (e) {
      return null;
    }
  }, [localPixKey, localPixBeneficiary, localClinicName, localPixCity]);

  const handleCopyTestPix = () => {
    if (testPixData?.payload) {
      navigator.clipboard.writeText(testPixData.payload);
      setCopiedTestPix(true);
      setTimeout(() => setCopiedTestPix(false), 2500);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert('A imagem deve ter no máximo 500KB');
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
        providerName: localProviderName,
        pixKey: localPixKey.trim(),
        pixType: localPixType,
        pixBeneficiary: localPixBeneficiary.trim(),
        pixCity: localPixCity.trim(),
        pixBank: localPixBank.trim(),
      });
      alert('Configurações e dados da Chave Pix salvos com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar preferências.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Parâmetros, Identidade & Chave Pix da Clínica</h3>
          <p className="text-xs text-slate-400 mt-1">Configure o cabeçalho de documentos, dados bancários Pix para cobranças e WhatsApp</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Salvar Alterações</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clinic Info */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-cyan flex items-center gap-2">
            <Building className="w-4 h-4" /> Informações Institucionais
          </h4>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nome Oficial da Clínica</label>
            <input
              type="text"
              value={localClinicName}
              onChange={(e) => setLocalClinicName(e.target.value)}
              placeholder="Ex: mbsolucoes"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rodapé de Relatórios & Atestados</label>
            <textarea
              value={localFooterText}
              onChange={(e) => setLocalFooterText(e.target.value)}
              rows={3}
              placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP | Tel: (11) 9999-9999 | CRO-SP 123456"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-brand-cyan resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Branding & Logo */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-cyan flex items-center gap-2">
            <Palette className="w-4 h-4" /> Logotipo & Identidade Visual
          </h4>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-5">
            <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {localLogo ? (
                <img src={localLogo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Building className="w-8 h-8 text-slate-300" />
              )}
            </div>

            <div className="space-y-2">
              <label className="px-4 py-2 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-block">
                Selecionar Imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              {localLogo && (
                <button
                  type="button"
                  onClick={() => setLocalLogo(null)}
                  className="block text-[10px] text-rose-600 font-bold hover:underline"
                >
                  Remover Logotipo
                </button>
              )}
              <p className="text-[10px] text-slate-400">PNG transparente ou JPG (máx. 500KB)</p>
            </div>
          </div>
        </div>

        {/* CHAVE PIX OFICIAL DA CLÍNICA */}
        <div className="lg:col-span-2 space-y-4 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl border border-brand-cyan/30 shadow-xl text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center border border-brand-cyan/30 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">
                    Chave Pix Oficial da Clínica (Recebimentos & Cobranças)
                  </h4>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    Padrão Bacen EMV
                  </span>
                </div>
                <p className="text-xs text-slate-350 mt-0.5">
                  Insira a chave Pix da clínica. Ela será utilizada automaticamente na geração de QR Codes, comprovantes e no Portal do Paciente.
                </p>
              </div>
            </div>

            {localPixKey ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Chave Cadastrada ({detectedPixType || localPixType})
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Sem chave configurada
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Form Fields */}
            <div className="lg:col-span-7 space-y-4">
              {/* Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-350">
                  Tipo de Chave Pix
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'CNPJ', label: 'CNPJ' },
                    { id: 'CPF', label: 'CPF' },
                    { id: 'EMAIL', label: 'E-mail' },
                    { id: 'PHONE', label: 'Celular' },
                    { id: 'EVP', label: 'Aleatória' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLocalPixType(t.id)}
                      className={cn(
                        "py-2 px-2.5 rounded-xl text-xs font-black transition-all border text-center cursor-pointer",
                        localPixType === t.id
                          ? "bg-brand-cyan text-slate-950 border-brand-cyan shadow-md shadow-brand-cyan/20"
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pix Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-cyan" />
                    Chave Pix
                  </label>
                  {detectedPixType && detectedPixType !== 'UNKNOWN' && (
                    <span className="text-[10px] text-brand-cyan font-bold">
                      Detectado: {detectedPixType}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={localPixKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalPixKey(val);
                      const detected = detectPixKeyType(val);
                      if (detected !== 'UNKNOWN') {
                        setLocalPixType(detected);
                      }
                    }}
                    placeholder={
                      localPixType === 'CNPJ' ? '00.000.000/0001-00' :
                      localPixType === 'CPF' ? '000.000.000-00' :
                      localPixType === 'EMAIL' ? 'pix@suaclinica.com.br' :
                      localPixType === 'PHONE' ? '+55 (11) 99999-9999' :
                      '123e4567-e89b-12d3-a456-426614174000'
                    }
                    className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-cyan shadow-inner placeholder:text-slate-500"
                  />
                  {localPixKey && (
                    <button
                      type="button"
                      onClick={() => setLocalPixKey('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title="Limpar chave"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Beneficiary Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-350">
                    Titular / Razão Social (Beneficiário)
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    value={localPixBeneficiary}
                    onChange={(e) => setLocalPixBeneficiary(e.target.value)}
                    placeholder="Ex: ODONTO CLINICA LTDA"
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan shadow-inner placeholder:text-slate-500 uppercase"
                  />
                  <p className="text-[9px] text-slate-400">Nome que aparece no banco do paciente (máx. 25 letras)</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-350">
                    Cidade da Conta (Padrão Bacen)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={localPixCity}
                    onChange={(e) => setLocalPixCity(e.target.value)}
                    placeholder="Ex: SAO PAULO"
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan shadow-inner placeholder:text-slate-500 uppercase"
                  />
                  <p className="text-[9px] text-slate-400">Sem acentos, ex: SAO PAULO (máx. 15 letras)</p>
                </div>
              </div>

              {/* Bank Institution */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-350">
                  Instituição Financeira / Banco (Opcional)
                </label>
                <input
                  type="text"
                  value={localPixBank}
                  onChange={(e) => setLocalPixBank(e.target.value)}
                  placeholder="Ex: Nubank, Itaú, Banco do Brasil, Inter, Bradesco, C6"
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan shadow-inner placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Live QR Code & Copia e Cola Preview Box */}
            <div className="lg:col-span-5 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-between text-center">
              <div className="space-y-2 w-full">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-cyan">
                  Preview do QR Code Pix
                </span>

                {testPixData ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-36 h-36 bg-white p-2.5 rounded-2xl border-2 border-brand-cyan shadow-lg shadow-brand-cyan/10 flex items-center justify-center">
                      <img 
                        src={testPixData.qrCodeUrl} 
                        alt="QR Code Pix" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{localPixBeneficiary || localClinicName || 'CLÍNICA ODONTO'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{localPixCity || 'SAO PAULO'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-36 h-36 mx-auto bg-slate-900 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 p-3 space-y-1">
                    <QrCode className="w-8 h-8 text-slate-600" />
                    <span className="text-[10px] text-center">Digite a chave ao lado para gerar o QR Code</span>
                  </div>
                )}
              </div>

              {testPixData && (
                <div className="w-full pt-3 space-y-2">
                  <button
                    type="button"
                    onClick={handleCopyTestPix}
                    className={cn(
                      "w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md",
                      copiedTestPix
                        ? "bg-emerald-600 text-white"
                        : "bg-brand-cyan hover:bg-cyan-400 text-slate-950"
                    )}
                  >
                    {copiedTestPix ? (
                      <>
                        <Check className="w-4 h-4" /> Código Pix Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copiar Código de Teste
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    Você pode colar o código no app do seu banco para testar a chave.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp & Integrations */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-cyan flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Mensageria & Notificações WhatsApp
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Número Zap Remetente</label>
              <input
                type="text"
                value={localProviderPhone}
                onChange={(e) => setLocalProviderPhone(e.target.value)}
                placeholder="+55 (11) 99999-9999"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Identificador / Provedor</label>
              <input
                type="text"
                value={localProviderName}
                onChange={(e) => setLocalProviderName(e.target.value)}
                placeholder="Ex: CLÍNICA ODONTODASH"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
              />
            </div>
          </div>
        </div>

        {/* Pagamentos Reais & Gateway Pix/Stripe */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-cyan flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Outros Meios de Pagamento & Cartões
          </h4>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Terminal & Links de Cartão de Crédito</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Checkout seguro integrado e link de pagamento para WhatsApp</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Ativo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Cartão de Crédito & Débito
                </div>
                <p className="text-[10px] text-slate-500">Links de cobrança com parcelamento e confirmação em tempo real na ficha do paciente.</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Disparo por WhatsApp
                </div>
                <p className="text-[10px] text-slate-500">Envio direto do código Pix Copia e Cola e link de cartão pelo WhatsApp do paciente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* PWA App */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-cyan flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Aplicativo Instalável (PWA)
          </h4>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-800">Modo Aplicativo Nativo</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Permite rodar em tela cheia com alta performance</p>
            </div>

            {onInstallPWA ? (
              <button
                type="button"
                onClick={onInstallPWA}
                className="px-4 py-2 bg-brand-cyan text-slate-950 font-black text-xs rounded-xl hover:bg-cyan-400 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Instalar Instância / App</span>
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-3 py-1.5 rounded-lg">
                Pronto / Instalado
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Backup Section
function BackupSection({
  clinicName,
  data,
  patients,
  users,
  documents,
  onRestore,
}: any) {
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
        version: '2.4.0',
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
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      'ATENÇÃO: A restauração de backup irá mesclar os dados do arquivo com o banco de dados atual. Deseja prosseguir?'
    );
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const backupData = JSON.parse(content);

        if (!backupData.records && !backupData.patients) {
          throw new Error('Arquivo de backup inválido.');
        }

        await onRestore(backupData);
        alert('Backup restaurado com sucesso!');
      } catch (err: any) {
        console.error(err);
        alert('Erro ao restaurar: ' + err.message);
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-brand-cyan" />
            Backup & Segurança de Dados
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Exporte uma cópia completa dos registros ou faça restauração a partir de um arquivo JSON
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Pacientes</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{patients.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Procedimentos</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{data.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usuários & Acessos</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Exportar Backup Completo</h4>
              <p className="text-[10px] text-slate-400">Gera um arquivo .json seguro com todos os dados</p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Baixar Arquivo JSON</span>
          </button>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan text-slate-950 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Restaurar Dados Anteriores</h4>
              <p className="text-[10px] text-slate-400">Importe pacientes e históricos a partir de um backup</p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="w-full py-3 bg-white border-2 border-dashed border-slate-300 hover:border-brand-cyan text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Selecionar Arquivo JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: User Form Modal (Create / Edit)
function UserFormModal({ user, currentUser, isOpen, onClose, onDelete, onSave }: any) {
  const isEdit = !!user;
  const isMasterAdmin = currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador');
  
  const ALL_SYSTEM_MODULES = [
    { id: 'Dashboard', label: 'Dashboard / Início', desc: 'Métricas e resumo operacional' },
    { id: 'Agenda', label: 'Agenda & Consultas', desc: 'Agendamentos e atendimento do dia' },
    { id: 'Pacientes', label: 'Gestão de Pacientes', desc: 'Fichas cadastrais e histórico' },
    { id: 'Documentos', label: 'Documentos & Prontuários', desc: 'Receitas, atestados e termos' },
    { id: 'IAClinica', label: 'IA Clínica & Raio-X', desc: 'Análise de imagens e assistente clínico' },
    { id: 'PortalPaciente', label: 'Portal do Paciente', desc: 'Link de autoatendimento web' },
    { id: 'Retorno', label: 'Retornos Preventivos', desc: 'Avisos e reconvocação preventiva' },
    { id: 'ChatbotIA', label: 'Chatbot IA WhatsApp', desc: 'Atendente automático 24/7' },
    { id: 'Mensagens', label: 'Mensagens & Avisos', desc: 'Automações e disparos via WhatsApp' },
    { id: 'Estoque', label: 'Controle de Estoque', desc: 'Insumos, alertas e reposição' },
    { id: 'Financeiro', label: 'Financeiro & Fluxo', desc: 'Caixa, procedimentos e DRE' },
    { id: 'Administração', label: 'Administração & Equipe', desc: 'Controle de usuários e clínicas' }
  ];

  // Helper to parse modules from user
  const initialModules = (): string[] => {
    if (!user) return ['Dashboard', 'Agenda', 'Pacientes', 'Documentos'];
    if (user.modules === 'Todos' || !user.modules) {
      if (user.role === 'Admin' || user.role === 'SuperAdmin') {
        return ALL_SYSTEM_MODULES.map(m => m.id);
      }
      if (user.role === 'Recepcionista') {
        return ['Dashboard', 'Agenda', 'Pacientes', 'Retorno', 'Mensagens'];
      }
      return ['Dashboard', 'Agenda', 'Pacientes', 'Documentos', 'IAClinica'];
    }
    if (typeof user.modules === 'string') {
      return user.modules.split(',').map((m: string) => m.trim()).filter(Boolean);
    }
    if (Array.isArray(user.modules)) {
      return user.modules;
    }
    return ['Dashboard', 'Agenda', 'Pacientes'];
  };

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(user?.role || 'Dentista');
  const [password, setPassword] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules);
  const [isActiveStatus, setIsActiveStatus] = useState<boolean>(!user?.isLocked);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleModule = (modId: string) => {
    if (selectedModules.includes(modId)) {
      setSelectedModules(selectedModules.filter(m => m !== modId));
    } else {
      setSelectedModules([...selectedModules, modId]);
    }
  };

  const handleSelectAllModules = () => {
    setSelectedModules(ALL_SYSTEM_MODULES.map(m => m.id));
  };

  const handleApplyRolePreset = (newRole: string) => {
    setRole(newRole);
    if (newRole === 'Admin' || newRole === 'SuperAdmin') {
      setSelectedModules(ALL_SYSTEM_MODULES.map(m => m.id));
    } else if (newRole === 'Recepcionista') {
      setSelectedModules(['Dashboard', 'Agenda', 'Pacientes', 'Retorno', 'Mensagens']);
    } else {
      setSelectedModules(['Dashboard', 'Agenda', 'Pacientes', 'Documentos', 'IAClinica']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-bold">
              <Shield className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-cyan">
                Permissões & Controle de Acesso
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {isEdit ? `Editar Usuário: ${user.name || user.username}` : 'Cadastrar Novo Usuário'}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Fields */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          
          {/* Basic Info: Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(SecurityUtils.sanitizeLettersOnly(e.target.value))}
              placeholder="Ex: Dra. Ana Paula Costa"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
            />
          </div>

          {/* Login & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Usuário / Login</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="anapaula"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cargo / Nível</label>
              <select
                value={role}
                onChange={(e) => handleApplyRolePreset(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan cursor-pointer"
              >
                <option value="Dentista">Dentista / Clínico</option>
                <option value="Admin">Administrador da Clínica</option>
                <option value="Recepcionista">Recepcionista / Atendimento</option>
                {isMasterAdmin && <option value="SuperAdmin">Super Admin (Master)</option>}
              </select>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">E-mail Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(SecurityUtils.sanitizeEmail(e.target.value))}
                placeholder="usuario@clinica.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">WhatsApp / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(SecurityUtils.maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-brand-cyan"
              />
            </div>
          </div>

          {/* Password field (Can edit on existing user or create) */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-brand-cyan" />
                <span>{isEdit ? 'Alterar Senha de Acesso' : 'Senha de Acesso'}</span>
              </label>
              {isEdit && (
                <span className="text-[10px] text-slate-400 font-medium">Deixe em branco para manter a atual</span>
              )}
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Digite uma nova senha (ex: 123)" : "Defina a senha (mínimo 3 caracteres)"}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-brand-cyan"
            />
          </div>

          {/* User Status / Unlock */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold",
                isActiveStatus ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              )}>
                {isActiveStatus ? <UserCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {isActiveStatus ? "Conta Ativa & Desbloqueada" : "Conta Bloqueada / Restrita"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isActiveStatus ? "O usuário pode se autenticar normalmente" : "Acesso impedido temporariamente"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsActiveStatus(!isActiveStatus)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                isActiveStatus 
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs" 
                  : "bg-slate-200 hover:bg-emerald-500 hover:text-white text-slate-700"
              )}
            >
              {isActiveStatus ? "Liberado" : "Desbloquear"}
            </button>
          </div>

          {/* Granular Module Permissions */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Permissões de Módulos & Acesso</span>
                </label>
                <p className="text-[10px] text-slate-400">Selecione quais áreas do sistema este usuário pode visualizar</p>
              </div>
              <button
                type="button"
                onClick={handleSelectAllModules}
                className="text-[10px] font-black text-brand-cyan hover:underline cursor-pointer uppercase tracking-wider"
              >
                Liberar Todos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {ALL_SYSTEM_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <button
                    type="button"
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                      isSelected 
                        ? "bg-cyan-50/60 border-cyan-300/80 shadow-xs" 
                        : "bg-slate-50/70 border-slate-200/80 opacity-70 hover:opacity-100 hover:bg-slate-100/70"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border transition-all",
                      isSelected 
                        ? "bg-brand-cyan border-brand-cyan text-slate-950" 
                        : "border-slate-300 bg-white"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "text-xs font-bold truncate leading-tight",
                        isSelected ? "text-slate-900" : "text-slate-600"
                      )}>
                        {mod.label}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5">
                        {mod.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          {isEdit && onDelete ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onDelete(user)}
              className="py-2.5 px-3.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Excluir</span>
            </button>
          ) : <div />}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                if (!name.trim() || !username.trim() || !email.trim()) {
                  alert('Preencha os campos obrigatórios (Nome, Usuário e Email).');
                  return;
                }
                if (!isEdit && (!password || password.length < 3)) {
                  alert('Defina uma senha com pelo menos 3 caracteres.');
                  return;
                }

                setIsSubmitting(true);
                try {
                  const modulesString = selectedModules.length === ALL_SYSTEM_MODULES.length 
                    ? 'Todos' 
                    : selectedModules.join(',');

                  const payload: any = {
                    name: name.trim(),
                    username: username.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    role,
                    modules: modulesString,
                    isLocked: !isActiveStatus,
                    loginAttempts: isActiveStatus ? 0 : (user?.loginAttempts || 0),
                  };

                  if (password && password.trim().length > 0) {
                    payload.password = password.trim();
                  }

                  await onSave(payload);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 bg-brand-cyan hover:bg-cyan-400 rounded-xl shadow-md shadow-brand-cyan/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isEdit ? 'Salvar Acesso' : 'Cadastrar Usuário'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
