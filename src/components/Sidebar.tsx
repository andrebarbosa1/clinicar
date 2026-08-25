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
      "w-64 bg-[#0d1527] text-white border-r border-slate-800 flex flex-col fixed left-0 z-40 select-none shadow-2xl transition-all",
      isImpersonating ? "top-10 h-[calc(100vh-2.5rem)]" : "top-0 h-screen"
    )}>
      
      {/* Branding Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/90 bg-[#0a101f] shrink-0">
        <button 
          onClick={() => onNavigate('Dashboard', null)}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-cyan-400 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20 font-black shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          <Stethoscope className="w-5 h-5 text-slate-950" />
        </button>
        <div className="min-w-0 flex-1 text-left">
          <h2 className="text-sm font-black text-white tracking-tight truncate flex items-center gap-1.5">
            <span>{clinicName || 'OdontoDash'}</span>
          </h2>
          <p className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase truncate">
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
              <div className="px-3 text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">
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
                      "w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs font-bold transition-all cursor-pointer group",
                      isActive 
                        ? "bg-brand-cyan text-slate-950 shadow-md shadow-cyan-500/25 font-black scale-[1.01]" 
                        : "text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.99]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-slate-950" : "text-slate-400 group-hover:text-cyan-400"
                      )}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black",
                          isActive 
                            ? "bg-slate-950 text-white" 
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        )}>
                          {item.badge}
                        </span>
                      )}

                      {isLocked && (
                        <span className="text-[10px] text-amber-400 font-bold" title="Requer upgrade de plano">
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
        <div className="pt-2 border-t border-slate-800 space-y-1">
          <div className="px-3 text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">
            CONTA
          </div>
          <button
            onClick={() => onNavigate('Assinatura', null)}
            className={cn(
              "w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer",
              activePage === 'Assinatura' 
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black" 
                : "text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Meu Plano</span>
            </div>
            <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-400/30">
              Pro
            </span>
          </button>

          {showSuperAdmin && (
            <button
              onClick={() => onNavigate('SuperAdmin', null)}
              className={cn(
                "w-full px-3 py-2 rounded-xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer",
                activePage === 'SuperAdmin' 
                  ? "bg-slate-800 text-cyan-300 border border-cyan-500/30 font-black" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <Shield className="w-4 h-4 text-brand-cyan shrink-0" />
              <span>Painel Master</span>
            </button>
          )}

          {isImpersonating && onExitImpersonation && (
            <button
              onClick={onExitImpersonation}
              className="w-full px-3 py-2 rounded-xl flex items-center gap-3 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs cursor-pointer"
            >
              <Shield className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Sair da Clínica</span>
            </button>
          )}
        </div>
      </div>

      {/* User Profile & Logout Bottom Area */}
      <div className="p-3 border-t border-slate-800 bg-[#0a101f] shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-xs">
              {currentUser?.name ? currentUser.name.slice(0, 2) : 'US'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {currentUser?.name || currentUser?.username || 'Usuário'}
              </p>
              <p className="text-[10px] text-cyan-400/80 font-medium truncate">
                {currentUser?.role || 'Profissional'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
