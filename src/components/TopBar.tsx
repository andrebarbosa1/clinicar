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
  LogOut,
  Filter,
  Calendar,
  ChevronDown,
  X,
  Stethoscope,
  Sparkles,
  User,
  DollarSign,
  Activity,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

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
  isImpersonating?: boolean;

  // Filter props moved from page body to TopBar
  activePage?: string;
  searchPatient?: string;
  setSearchPatient?: (val: string) => void;
  filterDateRange?: 'month' | 'last_month' | 'today' | 'custom';
  setFilterDateRange?: (val: 'month' | 'last_month' | 'today' | 'custom') => void;
  filterStartDate?: string;
  setFilterStartDate?: (val: string) => void;
  filterEndDate?: string;
  setFilterEndDate?: (val: string) => void;
  filterProcedure?: string;
  setFilterProcedure?: (val: string) => void;
  filterStatus?: string;
  setFilterStatus?: (val: string) => void;
  filterPayment?: string;
  setFilterPayment?: (val: string) => void;
  filterDentista?: string;
  setFilterDentista?: (val: string) => void;
  procedures?: string[];
  statuses?: string[];
  paymentStatuses?: string[];
  doctorsList?: string[];
  onOnlineBookingClick?: () => void;
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
  onLogout,
  activePage = 'Dashboard',
  searchPatient = '',
  setSearchPatient,
  filterDateRange = 'month',
  setFilterDateRange,
  filterStartDate = '',
  setFilterStartDate,
  filterEndDate = '',
  setFilterEndDate,
  filterProcedure = 'Todos',
  setFilterProcedure,
  filterStatus = 'Todos',
  setFilterStatus,
  filterPayment = 'Todos',
  setFilterPayment,
  filterDentista = 'Todos',
  setFilterDentista,
  procedures = ['Todos'],
  statuses = ['Todos'],
  paymentStatuses = ['Todos'],
  doctorsList = ['Todos'],
  onOnlineBookingClick,
  isImpersonating = false
}: TopBarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleCopyBooking = () => {
    if (onOnlineBookingClick) {
      onOnlineBookingClick();
    } else {
      const url = window.location.origin + window.location.pathname + '?booking=true';
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  // Check if any filter is active (different from default)
  const hasActiveFilters = 
    filterDateRange !== 'month' || 
    filterProcedure !== 'Todos' || 
    filterStatus !== 'Todos' || 
    filterPayment !== 'Todos' || 
    filterDentista !== 'Todos' || 
    (searchPatient && searchPatient.trim().length > 0);

  const showFiltersInHeader = ['Dashboard', 'Agenda', 'Pacientes', 'Consultas', 'Financeiro'].includes(activePage);

  return (
    <header className={cn(
      "h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none fixed right-0 left-0 lg:left-64 z-30 shadow-xs transition-all",
      isImpersonating ? "top-10" : "top-0"
    )}>
      
      {/* LEFT SECTION: Mobile Trigger + Search & Context Filters */}
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
        
        {/* Mobile menu trigger */}
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Patient Search Input */}
        {setSearchPatient ? (
          <div className="relative w-36 sm:w-44 md:w-48 shrink-0">
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-6 py-1.5 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            {searchPatient && (
              <button 
                onClick={() => setSearchPatient('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-36 hidden sm:block shrink-0">
            <input 
              type="text"
              placeholder="Buscar..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-cyan"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        )}

        {/* TOP BAR FILTER SELECTS (MOVED UP FROM PAGE BODY ACCORDING TO USER REQUEST) */}
        {showFiltersInHeader && setFilterDateRange && (
          <div className="hidden xl:flex items-center gap-2 bg-slate-50/80 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar">
            
            {/* PERÍODO SELECT */}
            <div className="flex items-center gap-1 text-slate-600 px-1">
              <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Período:</span>
              <select 
                value={filterDateRange}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setFilterDateRange(val);
                  if (setFilterStartDate && setFilterEndDate) {
                    if (val === 'today') {
                      setFilterStartDate(format(new Date(), 'yyyy-MM-dd'));
                      setFilterEndDate(format(new Date(), 'yyyy-MM-dd'));
                    } else if (val === 'month') {
                      setFilterStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                      setFilterEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                    } else if (val === 'last_month') {
                      const lastMonth = subMonths(new Date(), 1);
                      setFilterStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                      setFilterEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
                    }
                  }
                }}
                className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-brand-cyan cursor-pointer transition-all shadow-2xs"
              >
                <option value="month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="today">Hoje</option>
                <option value="custom">Customizado</option>
              </select>

              {filterDateRange === 'custom' && setFilterStartDate && setFilterEndDate && (
                <div className="flex items-center gap-1 ml-1 animate-in fade-in">
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5"
                  />
                  <span className="text-[9px] text-slate-400">até</span>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5"
                  />
                </div>
              )}
            </div>

            {/* PROC SELECT */}
            {setFilterProcedure && (
              <div className="flex items-center gap-1 text-slate-600 px-1 border-l border-slate-200/60">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Proc:</span>
                <select 
                  value={filterProcedure}
                  onChange={(e) => setFilterProcedure(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-brand-cyan cursor-pointer transition-all max-w-[120px] truncate shadow-2xs"
                >
                  {procedures.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* STATUS SELECT */}
            {setFilterStatus && (
              <div className="flex items-center gap-1 text-slate-600 px-1 border-l border-slate-200/60">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Status:</span>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-brand-cyan cursor-pointer transition-all shadow-2xs"
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* FIN SELECT */}
            {setFilterPayment && (
              <div className="flex items-center gap-1 text-slate-600 px-1 border-l border-slate-200/60">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Fin:</span>
                <select 
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-brand-cyan cursor-pointer transition-all shadow-2xs"
                >
                  {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* MÉDICO / DENTISTA SELECT */}
            {setFilterDentista && (
              <div className="flex items-center gap-1 text-slate-600 px-1 border-l border-slate-200/60">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">Médico:</span>
                <select 
                  value={filterDentista}
                  onChange={(e) => setFilterDentista(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none hover:border-brand-cyan cursor-pointer transition-all max-w-[130px] truncate shadow-2xs"
                >
                  {doctorsList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}

          </div>
        )}

        {/* COMPACT FILTER POPOVER BUTTON (FOR MEDIUM & SMALL SCREENS) */}
        {showFiltersInHeader && setFilterDateRange && (
          <div className="xl:hidden relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs",
                hasActiveFilters
                  ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan font-black"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-brand-cyan" />
              )}
            </button>

            {/* Dropdown Filters on smaller screens */}
            {showFilterDropdown && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Filtros da Clínica</span>
                  <button 
                    onClick={() => setShowFilterDropdown(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Período */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Período</label>
                  <select 
                    value={filterDateRange}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setFilterDateRange(val);
                      if (setFilterStartDate && setFilterEndDate) {
                        if (val === 'today') {
                          setFilterStartDate(format(new Date(), 'yyyy-MM-dd'));
                          setFilterEndDate(format(new Date(), 'yyyy-MM-dd'));
                        } else if (val === 'month') {
                          setFilterStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                          setFilterEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                        } else if (val === 'last_month') {
                          const lastMonth = subMonths(new Date(), 1);
                          setFilterStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                          setFilterEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
                        }
                      }
                    }}
                    className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="month">Este Mês</option>
                    <option value="last_month">Mês Passado</option>
                    <option value="today">Hoje</option>
                    <option value="custom">Customizado</option>
                  </select>
                </div>

                {/* Procedimento */}
                {setFilterProcedure && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Procedimento</label>
                    <select 
                      value={filterProcedure}
                      onChange={(e) => setFilterProcedure(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {procedures.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}

                {/* Status */}
                {setFilterStatus && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {/* Financeiro */}
                {setFilterPayment && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Financeiro</label>
                    <select 
                      value={filterPayment}
                      onChange={(e) => setFilterPayment(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {/* Médico */}
                {setFilterDentista && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Médico / Dentista</label>
                    <select 
                      value={filterDentista}
                      onChange={(e) => setFilterDentista(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {doctorsList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => setShowFilterDropdown(false)}
                  className="w-full py-2 bg-brand-cyan text-white rounded-xl text-xs font-black uppercase"
                >
                  Aplicar Filtros
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* RIGHT SECTION: Quick Actions, Booking Link, Fullscreen, Notifications & Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Link de Agendamento Online / WhatsApp */}
        <button 
          onClick={handleCopyBooking}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs group"
          title="Copiar e Enviar Link de Agendamento Online para o Paciente"
        >
          {copiedLink ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          )}
          <span className="hidden sm:inline">
            {copiedLink ? 'Link Copiado!' : 'Link de Agendamento'}
          </span>
        </button>

        {/* Fullscreen toggle */}
        <button 
          onClick={toggleFullScreen}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer hidden lg:block"
          title="Modo Tela Cheia"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {/* Notification Bell with indicator badge */}
        <div className="relative">
          <button 
            onClick={onNotificationClick}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer transition-all relative"
            title="Notificações e Avisos"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Quick Notifications Dropdown menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notificações da Clínica</span>
                {unreadNotifications.length > 0 && (
                  <span className="text-[9px] bg-rose-50 text-rose-600 font-black px-2 py-0.5 rounded-full border border-rose-100">
                    {unreadNotifications.length} {unreadNotifications.length === 1 ? 'Nova' : 'Novas'}
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 no-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-5 font-semibold">Tudo em dia! Nenhuma nova notificação.</p>
                ) : (
                  notifications.map((n, idx) => (
                    <div key={idx} className={cn("p-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors border border-transparent", !n.read && "bg-cyan-50/30 border-cyan-100/50 font-bold")}>
                      <p className="text-slate-700 leading-snug">{n.text || n.message}</p>
                      {n.createdAt && (
                        <span className="text-[9px] text-slate-400 mt-1 inline-block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator line */}
        <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

        {/* User Info & Profile Avatar & Logout */}
        <div className="flex items-center gap-2 pl-1">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-black text-slate-800 truncate max-w-[130px] leading-tight">
              {currentUser?.name || 'Administrador'}
            </span>
            <span className="text-[9px] font-black uppercase text-brand-cyan tracking-wider leading-none mt-0.5">
              {currentUser?.role || 'Admin'}
            </span>
          </div>
          
          <div 
            onClick={() => onNavigate('Administração')}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-cyan-500 border border-cyan-100 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
            title="Ver Perfil / Configurações"
          >
            {currentUser?.name?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2) || 'AD'}
          </div>

          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>

    </header>
  );
}
