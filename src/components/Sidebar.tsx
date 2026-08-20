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
  ClipboardList,
  Zap,
  ChevronRight
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
  patientsCount = 0
}: SidebarProps) {
  
  const menuSections = [
    {
      title: 'CLÍNICA',
      items: [
        {
          id: 'Dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-5 h-5" />,
          module: 'Dashboard',
          badge: null
        },
        {
          id: 'Consultas',
          label: 'Consultas',
          icon: <ClipboardList className="w-5 h-5" />,
          module: 'Agenda',
          badge: appointmentsCount > 0 ? `${appointmentsCount}` : null
        },
        {
          id: 'Agenda',
          label: 'Agenda Interativa',
          icon: <Calendar className="w-5 h-5" />,
          module: 'Agenda',
          badge: null
        }
      ]
    },
    {
      title: 'PACIENTES',
      items: [
        {
          id: 'Pacientes',
          label: 'Gestão de Pacientes',
          icon: <Users className="w-5 h-5" />,
          module: 'Pacientes',
          badge: patientsCount > 0 ? `${patientsCount}` : null
        },
        {
          id: 'Documentos',
          label: 'Documentos & Prontuários',
          icon: <FileText className="w-5 h-5" />,
          module: 'Documentos',
          badge: null
        },
        {
          id: 'Retorno',
          label: 'Retornos Preventivos',
          icon: <MessageCircle className="w-5 h-5" />,
          module: 'Retorno',
          badge: null
        }
      ]
    },
    {
      title: 'COMUNICAÇÃO',
      items: [
        {
          id: 'Mensagens',
          label: 'Mensagens & Automações',
          icon: <MessageSquare className="w-5 h-5" />,
          module: 'Mensagens',
          badge: 'Auto'
        }
      ]
    },
    {
      title: 'GESTÃO',
      items: [
        {
          id: 'Estoque',
          label: 'Controle de Estoque',
          icon: <Package className="w-5 h-5" />,
          module: 'Estoque',
          badge: null
        },
        {
          id: 'Financeiro',
          label: 'Financeiro & Fluxo',
          icon: <DollarSign className="w-5 h-5" />,
          module: 'Financeiro',
          badge: null
        },
        {
          id: 'Administração',
          label: 'Administração & Configs',
          icon: <Settings className="w-5 h-5" />,
          module: 'Administração',
          badge: null
        }
      ]
    }
  ];

  // Show SaaS SuperAdmin if allowed
  const showSuperAdmin = currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador');

  return (
    <aside className="w-20 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed top-0 left-0 z-40 select-none py-5 items-center justify-between shadow-xs">
      
      {/* Branding Header Logo */}
      <div className="flex flex-col items-center shrink-0">
        <button 
          onClick={() => onNavigate('Dashboard', null)}
          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-cyan to-cyan-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
          title={clinicName || 'Oral Admin Odontologia'}
        >
          <Stethoscope className="w-6 h-6" />
        </button>
        <span className="text-[9px] font-black tracking-widest text-slate-400 mt-1 uppercase">
          ODONTO
        </span>
      </div>

      {/* Menu Area */}
      <div className="flex-1 flex flex-col items-center justify-start gap-4 my-6 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-2">
        {menuSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => hasModule(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="w-full flex flex-col items-center gap-2">
              {sIdx > 0 && <div className="w-6 h-px bg-slate-100 my-0.5" />}
              
              {visibleItems.map((item) => {
                const isLocked = isModuleLockedBySaaS(item.module);
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id, null)}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center relative group cursor-pointer transition-all duration-200",
                      isActive 
                        ? "bg-brand-cyan text-white shadow-lg shadow-cyan-500/25 scale-105" 
                        : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-cyan rounded-r-full shadow-xs" />
                    )}

                    {item.icon}
                    
                    {/* Badge */}
                    {item.badge && !isActive && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] bg-emerald-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}

                    {isLocked && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[9px] animate-pulse">
                        ⭐
                      </span>
                    )}

                    {/* Floating Tooltip */}
                    <div className="absolute left-16 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-black px-3 py-2 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Plan / Subscription Link */}
        <div className="w-full flex flex-col items-center pt-2">
          <div className="w-6 h-px bg-slate-100 my-1" />
          <button
            onClick={() => onNavigate('Assinatura', null)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center relative group cursor-pointer transition-all duration-200",
              activePage === 'Assinatura' 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                : "text-amber-500 hover:text-amber-700 hover:bg-amber-50 bg-amber-50/50"
            )}
            title="Meu Plano SaaS"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            
            <div className="absolute left-16 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-black px-3 py-2 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap z-50">
              Meu Plano SaaS
            </div>
          </button>
        </div>

        {/* SuperAdmin Link */}
        {showSuperAdmin && (
          <button
            onClick={() => onNavigate('SuperAdmin', null)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center relative group cursor-pointer transition-all duration-200 mt-1",
              activePage === 'SuperAdmin' 
                ? "bg-slate-900 text-white shadow-lg" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Shield className="w-5 h-5 text-brand-cyan" />
            
            <div className="absolute left-16 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-black px-3 py-2 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap z-50">
              SaaS Central Admin
            </div>
          </button>
        )}
      </div>

      {/* User Avatar Pill / Logout Button */}
      <div className="flex flex-col items-center shrink-0 pt-2 border-t border-slate-100 w-full px-2">
        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer group relative"
          title="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4" />
          <div className="absolute left-14 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-rose-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50">
            Sair do Sistema
          </div>
        </button>
      </div>
    </aside>
  );
}
