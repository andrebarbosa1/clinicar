/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  Sun, 
  Moon, 
  Maximize, 
  Settings, 
  Mail, 
  Globe, 
  CheckSquare,
  HelpCircle,
  Monitor,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  onMenuToggle: () => void;
  currentUser: any;
  notifications: any[];
  onNotificationClick: () => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  clinicName: string;
  onNavigate: (page: string, subPage?: string | null) => void;
  onLogout: () => void;
}

export default function TopBar({
  onMenuToggle,
  currentUser,
  notifications = [],
  onNotificationClick,
  showNotifications,
  setShowNotifications,
  clinicName,
  onNavigate,
  onLogout
}: TopBarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0 select-none fixed top-0 right-0 left-0 lg:left-20 z-30 shadow-xs">
      
      {/* Left Search bar / Mobile trigger */}
      <div className="flex items-center gap-4 flex-1">
        
        {/* Mobile menu trigger */}
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search input bar */}
        <div className="relative w-64 hidden sm:block">
          <input 
            type="text"
            placeholder="Pesquisar..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
        </div>
      </div>

      {/* Right side items: controls & profile */}
      <div className="flex items-center gap-3">
        
        {/* Center Icons from image (Socials, Quick tasks representation) */}
        <div className="hidden md:flex items-center gap-1 bg-slate-50 rounded-xl p-0.5 border border-slate-100/50 mr-2">
          <button 
            onClick={() => onNavigate('Mensagens')}
            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Chat WhatsApp"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              const url = window.location.origin + window.location.pathname + '?booking=true';
              navigator.clipboard.writeText(url);
              alert('Link de agendamento online copiado para o seu clipboard!');
            }}
            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Copiar Link de Agendamento"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onNavigate('Retorno')}
            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Retornos"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Light/Dark mode */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer"
          title="Alternar Tema"
        >
          {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Fullscreen toggle */}
        <button 
          onClick={toggleFullScreen}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer hidden sm:block"
          title="Expandir Tela"
        >
          <Maximize className="w-4.5 h-4.5" />
        </button>

        {/* Notification Bell with indicator badge */}
        <div className="relative">
          <button 
            onClick={onNotificationClick}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Quick Notifications Dropdown menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notificações</span>
                {unreadNotifications.length > 0 && (
                  <span className="text-[9px] bg-rose-50 text-rose-500 font-bold px-1.5 py-0.5 rounded-md">
                    {unreadNotifications.length} Novas
                  </span>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar text-left">
                {notifications.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4 font-semibold">Tudo em dia! Nenhuma nova notificação.</p>
                ) : (
                  notifications.map((n, idx) => (
                    <div key={idx} className={cn("p-2 rounded-xl text-xs hover:bg-slate-50 transition-colors", !n.read && "bg-sky-50/20 font-bold")}>
                      <p className="text-slate-700 leading-snug">{n.text || n.message}</p>
                      {n.createdAt && <span className="text-[8px] text-slate-400 mt-0.5 inline-block">{new Date(n.createdAt).toLocaleTimeString()}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator line */}
        <div className="w-px h-6 bg-slate-100 mx-1 shrink-0" />

        {/* User Info & Profile Avatar & Logout */}
        <div className="flex items-center gap-3 pl-2">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-bold text-slate-700 truncate max-w-[140px] leading-tight">
              {currentUser?.name || 'Administrador'}
            </span>
            <span className="text-[9px] font-black uppercase text-sky-500 tracking-wider leading-none mt-0.5">
              {currentUser?.role || 'Admin'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-500 border border-sky-100 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs select-none">
            {currentUser?.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2) || 'AD'}
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            title="Sair do Sistema"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>

      </div>

    </header>
  );
}
