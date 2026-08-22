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
  ChevronRight,
  Scan,
  Globe,
  Bot
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
          shortLabel: 'Início',
          icon: <LayoutDashboard className="w-5 h-5" />,
          module: 'Dashboard',
          badge: null
        },
        {
          id: 'Agenda',
          label: 'Agenda & Consultas',
          shortLabel: 'Agenda',
          icon: <Calendar className="w-5 h-5" />,
          module: 'Agenda',
          badge: appointmentsCount > 0 ? `${appointmentsCount}` : null
        },
        {
          id: 'IAClinica',
          label: 'IA Clínica & Raio-X',
          shortLabel: 'IA Clínica',
          icon: <Sparkles className="w-5 h-5 text-brand-cyan" />,
          module: 'IAClinica',
          badge: 'IA'
        }
      ]
    },
    {
      title: 'PACIENTES',
      items: [
        {
          id: 'Pacientes',
          label: 'Gestão de Pacientes',
          shortLabel: 'Pacientes',
          icon: <Users className="w-5 h-5" />,
          module: 'Pacientes',
          badge: patientsCount > 0 ? `${patientsCount}` : null
        },
        {
          id: 'PortalPaciente',
          label: 'Portal do Paciente',
          shortLabel: 'Portal',
          icon: <Globe className="w-5 h-5 text-emerald-500" />,
          module: 'PortalPaciente',
          badge: 'App'
        },
        {
          id: 'Retorno',
          label: 'Retornos Preventivos',
          shortLabel: 'Retornos',
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
          label: 'Mensagens & WhatsApp IA',
          shortLabel: 'Mensagens',
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
          shortLabel: 'Estoque',
          icon: <Package className="w-5 h-5" />,
          module: 'Estoque',
          badge: null
        },
        {
          id: 'Financeiro',
          label: 'Financeiro & Fluxo',
          shortLabel: 'Financeiro',
          icon: <DollarSign className="w-5 h-5" />,
          module: 'Financeiro',
          badge: null
        },
        {
          id: 'Administração',
          label: 'Administração & Configs',
          shortLabel: 'Admin',
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
    <aside className="w-[84px] bg-white border-r border-slate-200/80 flex flex-col h-screen fixed top-0 left-0 z-40 select-none py-2 items-center justify-between shadow-xs overflow-hidden">
      
      {/* Branding Header Logo */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <button 
          onClick={() => onNavigate('Dashboard', null)}
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-cyan to-cyan-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group"
          title={clinicName || 'OdontoDash'}
        >
          <Stethoscope className="w-5 h-5 group-hover:rotate-6 transition-transform" />
        </button>
        <span className="text-[8px] font-black tracking-wider text-slate-400 mt-1 uppercase">
          ODONTO
        </span>
      </div>

      {/* Menu Area - Compact with Icon on top and clear name below */}
      <div className="flex-1 flex flex-col items-center justify-start gap-1 my-1.5 w-full px-1.5 overflow-y-auto no-scrollbar">
        {menuSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => hasModule(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="w-full flex flex-col items-center gap-1">
              {sIdx > 0 && <div className="w-8 h-px bg-slate-100 my-0.5" />}
              
              {visibleItems.map((item) => {
                const isLocked = isModuleLockedBySaaS(item.module);
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id, null)}
                    className={cn(
                      "w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 relative group cursor-pointer transition-all duration-150",
                      isActive 
                        ? "bg-brand-cyan text-slate-950 font-black shadow-sm shadow-cyan-500/25 scale-[1.02]" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:scale-95"
                    )}
                    title={item.label}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-cyan rounded-r-full shadow-xs" />
                    )}

                    <div className={cn(
                      "transition-transform group-hover:scale-110",
                      isActive ? "text-slate-950" : ""
                    )}>
                      {item.icon}
                    </div>

                    {/* Label Below Icon */}
                    <span className={cn(
                      "text-[9px] tracking-tight leading-[11px] font-bold truncate max-w-full text-center px-0.5",
                      isActive ? "text-slate-950 font-black" : "text-slate-500 group-hover:text-slate-800 font-medium"
                    )}>
                      {item.shortLabel || item.label}
                    </span>
                    
                    {/* Badge */}
                    {item.badge && !isActive && (
                      <span className="absolute top-1 right-1.5 px-1 min-w-[14px] h-3.5 bg-emerald-500 text-white rounded-full text-[7.5px] font-black flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}

                    {isLocked && (
                      <span className="absolute top-1 right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-white text-[7.5px] animate-pulse">
                        ⭐
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Plan / Subscription Link */}
        <div className="w-full flex flex-col items-center pt-0.5">
          <div className="w-8 h-px bg-slate-100 my-0.5" />
          <button
            onClick={() => onNavigate('Assinatura', null)}
            className={cn(
              "w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 relative group cursor-pointer transition-all duration-150",
              activePage === 'Assinatura' 
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-bold" 
                : "text-amber-600 hover:text-amber-700 hover:bg-amber-50/80 bg-amber-50/40"
            )}
            title="Meu Plano SaaS"
          >
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            <span className="text-[9px] font-bold tracking-tight leading-[11px] truncate">
              Plano
            </span>
          </button>
        </div>

        {/* SuperAdmin Link */}
        {showSuperAdmin && (
          <button
            onClick={() => onNavigate('SuperAdmin', null)}
            className={cn(
              "w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 relative group cursor-pointer transition-all duration-150 mt-0.5",
              activePage === 'SuperAdmin' 
                ? "bg-slate-900 text-white shadow-sm font-bold" 
                : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80"
            )}
            title="SaaS Central Admin"
          >
            <Shield className="w-4.5 h-4.5 text-brand-cyan" />
            <span className="text-[9px] font-bold tracking-tight leading-[11px] truncate">
              Master
            </span>
          </button>
        )}
      </div>

      {/* User Avatar Pill / Logout Button */}
      <div className="flex flex-col items-center shrink-0 pt-1 border-t border-slate-100 w-full px-1.5 pb-0.5">
        <button
          onClick={onLogout}
          className="w-full py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group"
          title="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-[8.5px] font-bold tracking-tight leading-[10px] text-slate-400 group-hover:text-rose-600">
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}
