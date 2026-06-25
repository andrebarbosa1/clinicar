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
  ClipboardList
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
}

export default function Sidebar({
  activePage,
  adminTab,
  currentUser,
  hasModule,
  isModuleLockedBySaaS,
  onNavigate,
  onLogout,
  clinicName
}: SidebarProps) {
  
  const menuItems = [
    {
      id: 'Dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      module: 'Dashboard',
    },
    {
      id: 'Consultas',
      label: 'Consultas',
      icon: <ClipboardList className="w-5 h-5" />,
      module: 'Agenda', // utilizes Agenda permissions
    },
    {
      id: 'Agenda',
      label: 'Agenda',
      icon: <Calendar className="w-5 h-5" />,
      module: 'Agenda',
    },
    {
      id: 'Pacientes',
      label: 'Pacientes',
      icon: <Users className="w-5 h-5" />,
      module: 'Pacientes',
    },
    {
      id: 'Estoque',
      label: 'Estoque',
      icon: <Package className="w-5 h-5" />,
      module: 'Estoque',
    },
    {
      id: 'Documentos',
      label: 'Documentos',
      icon: <FileText className="w-5 h-5" />,
      module: 'Documentos',
    },
    {
      id: 'Mensagens',
      label: 'Mensagens',
      icon: <MessageSquare className="w-5 h-5" />,
      module: 'Mensagens',
    },
    {
      id: 'Retorno',
      label: 'Retornos',
      icon: <MessageCircle className="w-5 h-5" />,
      module: 'Retorno',
    },
    {
      id: 'Financeiro',
      label: 'Financeiro',
      icon: <DollarSign className="w-5 h-5" />,
      module: 'Financeiro',
    },
    {
      id: 'Administração',
      label: 'Administração',
      icon: <Settings className="w-5 h-5" />,
      module: 'Administração',
    }
  ];

  // Show SaaS SuperAdmin if they are allowed
  const showSuperAdmin = currentUser && (currentUser.role === 'SuperAdmin' || currentUser.username === 'administrador');

  return (
    <aside className="w-20 bg-white border-r border-slate-100 flex flex-col h-screen fixed top-0 left-0 z-40 select-none py-6 items-center justify-between">
      
      {/* Branding Header Logo */}
      <div className="flex flex-col items-center shrink-0">
        <div 
          onClick={() => onNavigate('Dashboard', null)}
          className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/25 cursor-pointer hover:scale-105 transition-all duration-200"
          title={clinicName || 'Oral Admin'}
        >
          <Stethoscope className="w-6 h-6" />
        </div>
      </div>

      {/* Menu Area */}
      <div className="flex-1 flex flex-col items-center justify-start gap-3.5 my-8 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-2">
        {menuItems.map((item) => {
          if (!hasModule(item.module)) return null;
          const isLocked = isModuleLockedBySaaS(item.module);
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id, null)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center relative group cursor-pointer transition-all duration-200",
                isActive 
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20 scale-105" 
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {item.icon}
              
              {isLocked && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[9px] animate-pulse">
                  ⭐
                </span>
              )}

              {/* Elegant floating tooltip */}
              <div className="absolute left-16 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          );
        })}

        {/* Subscription / Plan Link */}
        <button
          onClick={() => onNavigate('Assinatura', null)}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center relative group cursor-pointer transition-all duration-200 mt-2",
            activePage === 'Assinatura' 
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
              : "text-amber-500 hover:text-amber-700 hover:bg-amber-50 bg-amber-50/40"
          )}
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          
          <div className="absolute left-16 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50">
            Meu Plano SaaS
          </div>
        </button>

        {/* SuperAdmin Link */}
        {showSuperAdmin && (
          <button
            onClick={() => onNavigate('SuperAdmin', null)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center relative group cursor-pointer transition-all duration-200",
              activePage === 'SuperAdmin' 
                ? "bg-[#0ea5e9] text-white shadow-lg shadow-sky-500/20" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <Shield className="w-5 h-5 text-sky-500" />
            
            <div className="absolute left-16 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 origin-left bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-50">
              SaaS Central Admin
            </div>
          </button>
        )}
      </div>

      {/* Footer / Info Trigger removed as it is redundant with 'Administração' menu item */}
    </aside>
  );
}
