/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  FileText, 
  MessageSquare, 
  MessageCircle, 
  DollarSign, 
  Settings, 
  Shield, 
  Sparkles,
  LogOut,
  Stethoscope,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activePage: string;
  adminTab?: string;
  currentUser: any;
  hasModule: (moduleName: string) => boolean;
  isModuleLockedBySaaS: (moduleName: string) => boolean;
  onNavigate: (page: string, subPage?: string | null) => void;
  onLogout: () => void;
  clinicName: string;
  appointmentsCount?: number;
  patientsCount?: number;
  isImpersonating?: boolean;
  onExitImpersonation?: () => void;
}

export default function Sidebar({
  activePage,
  adminTab,
  currentUser,
  hasModule,
  isModuleLockedBySaaS,
  onNavigate,
  onLogout,
  clinicName,
  appointmentsCount = 0,
  patientsCount = 0,
  isImpersonating = false,
  onExitImpersonation
}: SidebarProps) {
  
  const menuSections = [
    {
      title: 'PRINCIPAL',
      items: [
        {
          id: 'Dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
          module: 'Dashboard',
          badge: null
        },
        {
          id: 'Agenda',
          label: 'Agenda',
          icon: <Calendar className="w-4 h-4 shrink-0" />,
          module: 'Agenda',
          badge: appointmentsCount > 0 ? `${appointmentsCount}` : null
        },
        {
          id: 'Pacientes',
          label: 'Pacientes',
          icon: <Users className="w-4 h-4 shrink-0" />,
          module: 'Pacientes',
          badge: patientsCount > 0 ? `${patientsCount}` : null
        },
        {
          id: 'Documentos',
          label: 'Documentos Clínicos',
          icon: <FileText className="w-4 h-4 shrink-0" />,
          module: 'Documentos',
          badge: null
        }
      ]
    },
    {
      title: 'CLÍNICA & COMUNICAÇÃO',
      items: [
        {
          id: 'IAClinica',
          label: 'IA Clínica & Raio-X',
          icon: <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />,
          module: 'IAClinica',
          badge: 'IA'
        },
        {
          id: 'Mensagens',
          label: 'Mensagens & WhatsApp',
          icon: <MessageSquare className="w-4 h-4 shrink-0" />,
          module: 'Mensagens',
          badge: null
        },
        {
          id: 'Retorno',
          label: 'Retornos Preventivos',
          icon: <MessageCircle className="w-4 h-4 shrink-0" />,
          module: 'Retorno',
          badge: null
        },
        {
          id: 'PortalPaciente',
          label: 'Portal do Paciente',
          icon: <Globe className="w-4 h-4 text-emerald-400 shrink-0" />,
          module: 'PortalPaciente',
          badge: null
        }
      ]
    },
    {
      title: 'GESTÃO & SISTEMA',
      items: [
        {
          id: 'Estoque',
          label: 'Estoque',
          icon: <Package className="w-4 h-4 shrink-0" />,
          module: 'Estoque',
          badge: null
        },
        {
          id: 'Financeiro',
          label: 'Financeiro',
          icon: <DollarSign className="w-4 h-4 shrink-0" />,
          module: 'Financeiro',
          badge: null
        },
        {
          id: 'Administração',
          label: 'Configurações',
          icon: <Settings className="w-4 h-4 shrink-0" />,
          module: 'Administração',
          badge: null
        }
      ]
    }
  ];

  // Show SaaS SuperAdmin if allowed
  const showSuperAdmin = currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador');

  return (
    <aside className={cn(
      "w-64 bg-slate-50/90 backdrop-blur-md text-slate-800 border-r border-slate-200/90 flex flex-col fixed left-0 z-40 select-none shadow-sm transition-all",
      isImpersonating ? "top-10 h-[calc(100vh-2.5rem)]" : "top-0 h-screen"
    )}>
      
      {/* Branding Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200/80 bg-white/80 shrink-0">
        <button 
          onClick={() => onNavigate('Dashboard', null)}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shadow-cyan-600/20 font-black shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          <Stethoscope className="w-5 h-5 text-white" />
        </button>
        <div className="min-w-0 flex-1 text-left">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate flex items-center gap-1.5">
            <span>{clinicName || 'mbsolucoes'}</span>
          </h2>
          <p className="text-[10px] text-cyan-600 font-bold tracking-wider uppercase truncate">
            Gestão Odontológica
          </p>
        </div>
      </div>

      {/* Standard Navigation Menu */}
      <div className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar space-y-5">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(item => hasModule(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1.5">
                {section.title}
              </div>
              
              {visibleItems.map((item) => {
                const isLocked = isModuleLockedBySaaS(item.module);
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id, null)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold transition-all cursor-pointer group",
                      isActive 
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20 font-bold" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:scale-[0.99]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-white" : "text-slate-500 group-hover:text-cyan-600"
                      )}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-cyan-50 text-cyan-700 border border-cyan-200/80"
                        )}>
                          {item.badge}
                        </span>
                      )}

                      {isLocked && (
                        <span className="text-[10px] text-amber-500 font-bold" title="Requer upgrade de plano">
                          ⭐
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Plan / SaaS Section */}
        <div className="pt-2 border-t border-slate-200/80 space-y-1">
          <div className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1.5">
            CONTA
          </div>
          <button
            onClick={() => onNavigate('Assinatura', null)}
            className={cn(
              "w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer",
              activePage === 'Assinatura' 
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold" 
                : "text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/70"
            )}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Meu Plano</span>
            </div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md border border-amber-300/50">
              Pro
            </span>
          </button>

          {showSuperAdmin && (
            <button
              onClick={() => onNavigate('SuperAdmin', null)}
              className={cn(
                "w-full px-3 py-2 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer",
                activePage === 'SuperAdmin' 
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20 font-bold" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              <Shield className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>Painel Master</span>
            </button>
          )}

          {isImpersonating && onExitImpersonation && (
            <button
              onClick={onExitImpersonation}
              className="w-full px-3 py-2 rounded-xl flex items-center gap-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
            >
              <Shield className="w-4 h-4 text-white shrink-0" />
              <span>Sair da Clínica</span>
            </button>
          )}
        </div>
      </div>

      {/* User Profile & Logout Bottom Area */}
      <div className="p-3 border-t border-slate-200/80 bg-white/80 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
              {currentUser?.name ? currentUser.name.slice(0, 2) : 'US'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {currentUser?.name || currentUser?.username || 'Usuário'}
              </p>
              <p className="text-[10px] text-cyan-700 font-medium truncate">
                {currentUser?.role || 'Profissional'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
