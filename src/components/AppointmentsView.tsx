/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  MessageCircle,
  SlidersHorizontal,
  CalendarDays,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ArrowRight,
  Filter,
  Layers,
  Phone,
  Check,
  XCircle,
  PlayCircle,
  Globe
} from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow, parseISO, isValid, isThisWeek, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { DentalRecord } from '../types';

interface AppointmentsViewProps {
  data: DentalRecord[];
  patients?: any[];
  onAdd: () => void;
  onCancel: (id: string) => void;
  onSendWhatsApp: (record: DentalRecord) => void;
  onOpenChart?: (patientId: string) => void;
  onStart?: (id: string) => void;
  onFinish?: (id: string) => void;
}

const formatAppointmentTime = (dateStr: string, timeStr?: string) => {
  if (!dateStr) return 'Sem data';
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr + (timeStr ? ` ${timeStr}` : '');
    
    let label = '';
    if (isToday(d)) {
      label = 'Hoje';
    } else if (isYesterday(d)) {
      label = 'Ontem';
    } else if (isTomorrow(d)) {
      label = 'Amanhã';
    } else {
      label = format(d, "dd 'de' MMM", { locale: ptBR });
    }
    
    return timeStr ? `${label}, às ${timeStr}` : label;
  } catch (e) {
    return dateStr;
  }
};

export default function AppointmentsView({ 
  data, 
  patients = [],
  onAdd, 
  onCancel,
  onSendWhatsApp,
  onOpenChart,
  onStart,
  onFinish
}: AppointmentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<'todos' | 'hoje' | 'amanha' | 'semana' | 'mes'>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Stats calculation
  const stats = useMemo(() => {
    const validAppointments = data.filter(item => item.procedimento !== 'Compromisso' && !(item as any).isQuickEvent);
    
    let hojeCount = 0;
    let agendadosCount = 0;
    let realizadosCount = 0;
    let canceladosCount = 0;

    validAppointments.forEach(a => {
      const d = a.data ? parseISO(a.data) : null;
      if (d && isValid(d) && isToday(d)) {
        hojeCount++;
      }
      if (a.status === 'Agendado' || a.status === 'Em Atendimento') {
        agendadosCount++;
      } else if (a.status === 'Realizado' || a.status === 'Concluído') {
        realizadosCount++;
      } else if (a.status === 'Cancelado') {
        canceladosCount++;
      }
    });

    return {
      total: validAppointments.length,
      hoje: hojeCount,
      agendados: agendadosCount,
      realizados: realizadosCount,
      cancelados: canceladosCount
    };
  }, [data]);

  // Filter & Search appointments
  const filteredAppointments = useMemo(() => {
    return data
      .filter(item => {
        // Exclude quick events (Compromissos)
        if (item.procedimento === 'Compromisso' || (item as any).isQuickEvent) {
          return false;
        }

        const matchesSearch = 
          item.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.procedimento.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.dentista || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
          statusFilter === 'todos' || 
          (statusFilter === 'agendado' && (item.status === 'Agendado' || (item.status as string) === 'Agendada' || item.status === 'Pendente')) ||
          (statusFilter === 'em_atendimento' && item.status === 'Em Atendimento') ||
          (statusFilter === 'realizado' && (item.status === 'Realizado' || item.status === 'Concluído')) ||
          (statusFilter === 'cancelado' && item.status === 'Cancelado');

        let matchesDate = true;
        if (dateFilter !== 'todos' && item.data) {
          const d = parseISO(item.data);
          if (isValid(d)) {
            if (dateFilter === 'hoje') matchesDate = isToday(d);
            else if (dateFilter === 'amanha') matchesDate = isTomorrow(d);
            else if (dateFilter === 'semana') matchesDate = isThisWeek(d, { weekStartsOn: 0 });
            else if (dateFilter === 'mes') matchesDate = isThisMonth(d);
          }
        }
          
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.horario || '00:00'}`).getTime();
        const dateB = new Date(`${b.data}T${b.horario || '00:00'}`).getTime();
        return dateB - dateA;
      });
  }, [data, searchTerm, statusFilter, dateFilter]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredAppointments.length / pageSize) || 1;
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(startIndex, startIndex + pageSize);
  }, [filteredAppointments, currentPage, pageSize]);

  // Adjust page number if filters reduce results below current range
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredAppointments.length);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header & Quick Action */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 id="appointments-title" className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-cyan" />
            <span>Consultas e Atendimentos</span>
          </h1>
          <span className="text-xs text-slate-300 font-semibold">•</span>
          <span className="text-xs text-slate-500 font-medium">
            {filteredAppointments.length} {filteredAppointments.length === 1 ? 'consulta encontrada' : 'consultas encontradas'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onAdd}
            className="flex items-center justify-center gap-1.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Consulta</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => { setDateFilter('hoje'); setStatusFilter('todos'); setCurrentPage(1); }}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            dateFilter === 'hoje' ? "border-brand-cyan ring-2 ring-brand-cyan/20" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hoje</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-brand-cyan flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.hoje}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Agendadas para a data atual</p>
        </div>

        <div 
          onClick={() => { setStatusFilter('agendado'); setDateFilter('todos'); setCurrentPage(1); }}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            statusFilter === 'agendado' ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Agendadas</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.agendados}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Aguardando atendimento</p>
        </div>

        <div 
          onClick={() => { setStatusFilter('realizado'); setDateFilter('todos'); setCurrentPage(1); }}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            statusFilter === 'realizado' ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Realizadas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.realizados}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Consultas finalizadas</p>
        </div>

        <div 
          onClick={() => { setStatusFilter('cancelado'); setDateFilter('todos'); setCurrentPage(1); }}
          className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs",
            statusFilter === 'cancelado' ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Canceladas</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.cancelados}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Faltas ou cancelamentos</p>
        </div>
      </div>

      {/* Main Table & Filters Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Table Filters Top Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50/60">
          
          {/* Quick Date Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {[
              { id: 'todos', label: 'Todas as Datas' },
              { id: 'hoje', label: 'Hoje' },
              { id: 'amanha', label: 'Amanhã' },
              { id: 'semana', label: 'Esta Semana' },
              { id: 'mes', label: 'Este Mês' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setDateFilter(tab.id as any); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  dateFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search, Status & Layout Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select Filter */}
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-cyan appearance-none pr-8 cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="agendado">Agendado</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="realizado">Realizado / Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* General Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <input 
                type="text"
                placeholder="Buscar paciente, procedimento ou Dr(a)..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                  viewMode === 'table' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
                title="Modo Tabela"
              >
                Tabela
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                  viewMode === 'cards' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
                title="Modo Cards"
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Content View: Table or Cards */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/40">
                  <th className="px-5 py-3.5 font-bold">Paciente</th>
                  <th className="px-5 py-3.5 font-bold">Data & Horário</th>
                  <th className="px-5 py-3.5 font-bold">Procedimento</th>
                  <th className="px-5 py-3.5 font-bold">Profissional</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs font-medium">
                      Nenhuma consulta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((record) => {
                    const isCompleted = record.status === 'Realizado' || record.status === 'Concluído';
                    const isCancelled = record.status === 'Cancelado';
                    const isInProgress = record.status === 'Em Atendimento';

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Patient info */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan/20 to-cyan-500/20 text-brand-cyan flex items-center justify-center font-black text-xs shrink-0 border border-brand-cyan/30">
                              {record.paciente.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  onClick={() => onOpenChart && onOpenChart(record.paciente)}
                                  className="text-xs font-bold text-slate-800 hover:text-brand-cyan transition-colors cursor-pointer block truncate max-w-[180px]"
                                  title="Abrir Prontuário"
                                >
                                  {record.paciente}
                                </span>
                                {(record.viaPortal || record.origem?.toLowerCase().includes('portal') || (record as any).canal?.toLowerCase().includes('portal')) && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200/80 px-1.5 py-0.2 rounded shrink-0">
                                    <Globe className="w-2.5 h-2.5 text-brand-cyan" /> Portal
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {String(record.id).slice(-4)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                            <Clock className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                            <span>{formatAppointmentTime(record.data, record.horario)}</span>
                          </div>
                        </td>

                        {/* Procedure */}
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-600 font-medium truncate max-w-[180px] inline-block">
                            {record.procedimento}
                          </span>
                        </td>

                        {/* Professional */}
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-500 font-medium">
                            Dr(a). {record.dentista || 'Não informado'}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border",
                            isCompleted
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : isCancelled
                              ? "text-rose-700 bg-rose-50 border-rose-200"
                              : isInProgress
                              ? "text-sky-700 bg-sky-50 border-sky-200 animate-pulse"
                              : "text-amber-700 bg-amber-50 border-amber-200"
                          )}>
                            {isCompleted && <Check className="w-3 h-3" />}
                            {isInProgress && <PlayCircle className="w-3 h-3" />}
                            {isCancelled && <XCircle className="w-3 h-3" />}
                            {!isCompleted && !isInProgress && !isCancelled && <Clock className="w-3 h-3" />}
                            {record.status === 'Concluído' ? 'Realizado' : record.status}
                          </span>
                        </td>

                        {/* Quick Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onOpenChart && (
                              <button 
                                onClick={() => onOpenChart(record.paciente)}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Abrir Prontuário do Paciente"
                              >
                                <Stethoscope className="w-3 h-3 text-brand-cyan" />
                                <span className="hidden sm:inline">Prontuário</span>
                              </button>
                            )}

                            <button 
                              onClick={() => onSendWhatsApp(record)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Enviar Lembrete WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            
                            {!isCancelled && !isCompleted && (
                              <button 
                                onClick={() => onCancel(record.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancelar Consulta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedAppointments.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs font-medium">
                Nenhuma consulta encontrada com os filtros selecionados.
              </div>
            ) : (
              paginatedAppointments.map((record) => {
                const isCompleted = record.status === 'Realizado' || record.status === 'Concluído';
                const isCancelled = record.status === 'Cancelado';
                const isInProgress = record.status === 'Em Atendimento';

                return (
                  <div 
                    key={record.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-brand-cyan/40 hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan/20 to-cyan-500/20 text-brand-cyan flex items-center justify-center font-black text-xs shrink-0 border border-brand-cyan/30">
                            {record.paciente.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 
                                onClick={() => onOpenChart && onOpenChart(record.paciente)}
                                className="text-xs font-bold text-slate-800 hover:text-brand-cyan cursor-pointer truncate max-w-[140px]"
                              >
                                {record.paciente}
                              </h3>
                              {(record.viaPortal || record.origem?.toLowerCase().includes('portal') || (record as any).canal?.toLowerCase().includes('portal')) && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200/80 px-1 py-0.2 rounded shrink-0">
                                  <Globe className="w-2.5 h-2.5 text-brand-cyan" /> Portal
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">Dr(a). {record.dentista || 'Geral'}</p>
                          </div>
                        </div>

                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                          isCompleted
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : isCancelled
                            ? "text-rose-700 bg-rose-50 border-rose-200"
                            : isInProgress
                            ? "text-sky-700 bg-sky-50 border-sky-200"
                            : "text-amber-700 bg-amber-50 border-amber-200"
                        )}>
                          {record.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-brand-cyan" />
                          <span>{formatAppointmentTime(record.data, record.horario)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          <strong>Procedimento:</strong> {record.procedimento}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button 
                        onClick={() => onSendWhatsApp(record)}
                        className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {onOpenChart && (
                          <button 
                            onClick={() => onOpenChart(record.paciente)}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Prontuário</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {!isCancelled && !isCompleted && (
                          <button 
                            onClick={() => onCancel(record.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar Consulta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Table Footer Pagination */}
        {filteredAppointments.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
            <div className="text-xs text-slate-500 font-medium">
              Exibindo <span className="text-slate-800 font-bold">{startIndex}</span> a{' '}
              <span className="text-slate-800 font-bold">{endIndex}</span> de{' '}
              <span className="text-slate-800 font-bold">{filteredAppointments.length}</span> registros
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={cn(
                    "w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    currentPage === idx + 1
                      ? "bg-slate-900 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
