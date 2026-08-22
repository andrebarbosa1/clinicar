/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  User,
  X,
  PlayCircle,
  CalendarDays,
  Filter,
  Stethoscope,
  Info,
  Phone,
  MessageSquare,
  FileText,
  Search,
  Sparkles,
  Check,
  AlertTriangle,
  Send,
  MoreVertical,
  Activity,
  List
} from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addMonths, 
  subMonths, 
  addDays,
  subDays,
  isSameDay, 
  isSameMonth, 
  parseISO,
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { DentalRecord } from '../types';
import { 
  CLINIC_TIME_SLOTS,
  APPOINTMENT_DURATION_MINUTES,
  normalizeAppointmentDateTime,
  findDentistScheduleConflict,
  doSlotsOverlap,
  minutesToTime,
  timeToMinutes,
  isBusinessDay,
  getNextBusinessDay
} from '../lib/scheduleUtils';

interface ScheduleViewProps {
  data: DentalRecord[];
  onAdd: () => void;
  onCancel: (id: string) => void;
  onStart?: (id: string) => void;
  onFinish?: (id: string) => void;
  onCreateAppointment?: (newAppt: any) => Promise<boolean>;
  onOpenChart?: (patientId: string) => void;
  users?: any[];
  currentUser?: any;
}

const STATIC_EVENT_TAGS = [
  { id: '1', title: 'INTERVALO / ALMOÇO', color: 'bg-cyan-600 text-white' },
  { id: '2', title: 'REUNIÃO CLÍNICA', color: 'bg-amber-500 text-white' },
  { id: '3', title: 'CIRURGIA / BLOQUEIO', color: 'bg-rose-500 text-white' },
  { id: '4', title: 'COMPROMISSO PESSOAL', color: 'bg-indigo-600 text-white' },
  { id: '5', title: 'ESTUDO / CURSO', color: 'bg-slate-800 text-white' }
];

const HOURS_TIMELINE = CLINIC_TIME_SLOTS;

export default function ScheduleView({ 
  data, 
  onAdd, 
  onCancel,
  onStart,
  onFinish,
  onCreateAppointment,
  onOpenChart,
  users = [],
  currentUser
}: ScheduleViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'chairs' | 'list'>('week');
  const [selectedDentist, setSelectedDentist] = useState<string>('todos');
  const [searchScheduleTerm, setSearchScheduleTerm] = useState('');
  const [removeAfterDrop, setRemoveAfterDrop] = useState(false);

  // Quick Slot Booking Modal
  const [slotModal, setSlotModal] = useState<{
    isOpen: boolean;
    date: string;
    time: string;
    dentist: string;
  } | null>(null);
  const [slotPatientName, setSlotPatientName] = useState('');
  const [slotProcedure, setSlotProcedure] = useState('Avaliação / Check-up Geral');
  const [slotValue, setSlotValue] = useState('150');
  const [slotPhone, setSlotPhone] = useState('');
  const [slotNotes, setSlotNotes] = useState('');
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  // Quick Tags Shortcuts Modal
  const [activeTags, setActiveTags] = useState(STATIC_EVENT_TAGS);
  const [quickEventModal, setQuickEventModal] = useState<{
    tagId: string;
    title: string;
    color: string;
  } | null>(null);
  const [quickEventTime, setQuickEventTime] = useState('12:00');
  const [quickEventDentist, setQuickEventDentist] = useState('');
  const [quickEventNote, setQuickEventNote] = useState('');
  const [isSavingQuickEvent, setIsSavingQuickEvent] = useState(false);

  // Interactive Appointment Details & Action Modal
  const [selectedAppointmentModal, setSelectedAppointmentModal] = useState<DentalRecord | null>(null);

  // Active Ongoing Consultation
  const activeOngoingConsultation = useMemo(() => {
    if (!data) return null;
    return (data || []).find(apt => apt && apt.status === 'Em Atendimento');
  }, [data]);

  // WhatsApp quick modal from appointment card
  const [whatsappCardModal, setWhatsappCardModal] = useState<{
    isOpen: boolean;
    patientName: string;
    date: string;
    time: string;
    dentist: string;
  } | null>(null);

  // Dentist list from users
  const dentistList = useMemo(() => {
    const names = new Set(users.map(u => u && (u.role === 'Dentista' || u.role === 'Admin') ? u.name : null).filter(Boolean));
    if (names.size === 0) return ['Dr. Silva', 'Dra. Maria', 'Dr. Daniel', 'Dra. Ana'];
    return Array.from(names).sort() as string[];
  }, [users]);

  // Week days based on selectedDate - Segunda a Sexta (5 dias úteis)
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const end = addDays(start, 4); // Friday
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Month grid
  const daysGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Filter visible records based on user & dentist & search
  const visibleData = useMemo(() => {
    return (data || []).filter(apt => {
      if (!apt) return false;
      const isQuick = apt.procedimento === 'Compromisso' || (apt as any).isQuickEvent;
      if (isQuick) {
        if (!currentUser) return false;
        const creatorEmail = (apt as any).createdBy || '';
        const dentistName = apt.dentista || '';
        const isCreator = 
          (currentUser.email && creatorEmail === currentUser.email) ||
          (currentUser.name && creatorEmail === currentUser.name) ||
          (currentUser.name && dentistName === currentUser.name) ||
          currentUser.role === 'Admin';
        if (!isCreator) return false;
      }

      if (selectedDentist !== 'todos' && apt.dentista !== selectedDentist) {
        return false;
      }

      if (searchScheduleTerm.trim()) {
        const term = searchScheduleTerm.toLowerCase();
        const matchesName = (apt.paciente || '').toLowerCase().includes(term);
        const matchesProc = (apt.procedimento || '').toLowerCase().includes(term);
        const matchesDentist = (apt.dentista || '').toLowerCase().includes(term);
        if (!matchesName && !matchesProc && !matchesDentist) return false;
      }

      return true;
    });
  }, [data, currentUser, selectedDentist, searchScheduleTerm]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, DentalRecord[]> = {};
    visibleData.forEach(apt => {
      if (!apt.data) return;
      if (!map[apt.data]) {
        map[apt.data] = [];
      }
      map[apt.data].push(apt);
    });
    return map;
  }, [visibleData]);

  // Selected Day Appointments sorted by time
  const selectedDayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const apts = appointmentsByDate[dateStr] || [];
    return [...apts].sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  }, [appointmentsByDate, selectedDate]);

  // Day KPIs
  const dayStats = useMemo(() => {
    const total = selectedDayAppointments.length;
    const completed = selectedDayAppointments.filter(a => a.status === 'Realizado' || a.status === 'Concluído').length;
    const inProgress = selectedDayAppointments.filter(a => a.status === 'Em Atendimento').length;
    const scheduled = selectedDayAppointments.filter(a => a.status === 'Agendado').length;
    const canceled = selectedDayAppointments.filter(a => a.status === 'Cancelado').length;
    const revenue = selectedDayAppointments
      .filter(a => a.status !== 'Cancelado')
      .reduce((sum, a) => sum + (Number(a.valor) || 0), 0);

    return { total, completed, inProgress, scheduled, canceled, revenue };
  }, [selectedDayAppointments]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(prev => subMonths(prev, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => subDays(prev, 7));
    } else {
      setSelectedDate(prev => {
        let d = subDays(prev, 1);
        while (!isBusinessDay(d)) d = subDays(d, 1);
        return d;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(prev => addMonths(prev, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => addDays(prev, 7));
    } else {
      setSelectedDate(prev => {
        let d = addDays(prev, 1);
        while (!isBusinessDay(d)) d = addDays(d, 1);
        return d;
      });
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(getNextBusinessDay(now, false));
  };

  // Open slot modal
  const handleOpenSlotModal = (dateStr: string, timeStr: string, dentistStr?: string) => {
    const normalized = normalizeAppointmentDateTime(dateStr, timeStr);
    setSlotModal({
      isOpen: true,
      date: normalized.date,
      time: normalized.time,
      dentist: dentistStr || (selectedDentist !== 'todos' ? selectedDentist : dentistList[0] || 'Dr. Daniel')
    });
    setSlotPatientName('');
    setSlotProcedure('Avaliação / Check-up Geral');
    setSlotValue('150');
    setSlotPhone('');
    setSlotNotes('');
  };

  // Save quick appointment from slot modal with 1.5h conflict protection
  const handleSaveSlotAppointment = async () => {
    if (!slotModal || !slotPatientName.trim()) {
      alert('Por favor, informe o nome do paciente.');
      return;
    }

    const normalized = normalizeAppointmentDateTime(slotModal.date, slotModal.time);
    const finalDate = normalized.date;
    const finalTime = normalized.time;

    const conflict = findDentistScheduleConflict(data, slotModal.dentist, finalDate, finalTime);
    if (conflict) {
      alert(`CONFLITO DE HORÁRIO: O(A) ${slotModal.dentist} já possui consulta agendada (${conflict.horario} - ${conflict.paciente}) que colide com este intervalo de 1h30 no dia ${finalDate}.`);
      return;
    }

    setIsSavingSlot(true);
    const newAppt = {
      paciente: slotPatientName.trim(),
      procedimento: slotProcedure,
      dentista: slotModal.dentist,
      data: finalDate,
      horario: finalTime,
      valor: parseFloat(slotValue) || 0,
      telefone: slotPhone,
      observacao: slotNotes,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      createdBy: currentUser?.email || currentUser?.name || ''
    };

    if (onCreateAppointment) {
      await onCreateAppointment(newAppt);
    }
    setIsSavingSlot(false);
    setSlotModal(null);
  };

  // Save quick event tag with conflict protection
  const handleSaveQuickEvent = async () => {
    if (!quickEventModal) return;

    const chosenDentist = quickEventDentist || dentistList[0] || 'Dr. Daniel';
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const normalized = normalizeAppointmentDateTime(dateStr, quickEventTime);
    const finalDate = normalized.date;
    const finalTime = normalized.time;

    const conflict = findDentistScheduleConflict(data, chosenDentist, finalDate, finalTime);
    if (conflict) {
      alert(`CONFLITO DE HORÁRIO: O(A) ${chosenDentist} já possui agendamento (${conflict.horario} - ${conflict.paciente}) conflitante neste horário no dia ${finalDate}.`);
      return;
    }

    setIsSavingQuickEvent(true);
    const newAppt = {
      paciente: quickEventModal.title,
      procedimento: 'Compromisso',
      dentista: chosenDentist,
      data: finalDate,
      horario: finalTime,
      valor: 0,
      observacao: quickEventNote || 'Criado via Eventos Rápidos',
      isQuickEvent: true,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      createdBy: currentUser?.email || currentUser?.name || ''
    };

    if (onCreateAppointment) {
      await onCreateAppointment(newAppt);
    }

    if (removeAfterDrop) {
      setActiveTags(prev => prev.filter(t => t.id !== quickEventModal.tagId));
    }
    setIsSavingQuickEvent(false);
    setQuickEventModal(null);
  };

  // Direct WhatsApp dispatch
  const handleSendCardWhatsApp = (patientName: string, phone: string, date: string, time: string, dentist: string) => {
    const cleanNumber = (phone || '').replace(/\D/g, '');
    const num = cleanNumber.length <= 11 && cleanNumber.length > 0 ? `55${cleanNumber}` : cleanNumber;
    const msg = `Olá, *${patientName}*! 👋 Confirmamos seu agendamento na clínica para o dia *${date}* às *${time}* com *${dentist}*. Responda SIM para confirmar sua presença! 🦷`;
    const encoded = encodeURIComponent(msg);
    
    if (num) {
      window.open(`https://wa.me/${num}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Realizado':
      case 'Concluído':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Em Atendimento':
        return 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/40';
      case 'Cancelado':
        return 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-70';
      default:
        return 'bg-cyan-50/80 text-cyan-900 border-cyan-200';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 text-left">
      
      {/* HEADER BAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-cyan" />
            <span>Calendário Clínico</span>
          </h1>
          <span className="text-xs text-slate-300 font-semibold">•</span>
          <span className="text-xs text-slate-500 font-medium">
            {visibleData.length} {visibleData.length === 1 ? 'agendamento' : 'agendamentos no período'}
          </span>
        </div>

        {/* View Mode Controls & Top Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Quick Search inside Calendar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Filtrar por paciente/proc..."
              value={searchScheduleTerm}
              onChange={e => setSearchScheduleTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 w-44 md:w-48 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 outline-none"
            />
          </div>

          {/* Dentist Filter */}
          <div className="relative">
            <select
              value={selectedDentist}
              onChange={(e) => setSelectedDentist(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 appearance-none cursor-pointer"
            >
              <option value="todos">Todos os Profissionais</option>
              {dentistList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-0.5 border border-slate-200/60 rounded-xl">
            <button 
              onClick={() => setViewMode('month')}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer",
                viewMode === 'month' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Mês
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer",
                viewMode === 'week' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Semana
            </button>
            <button 
              onClick={() => setViewMode('day')}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer",
                viewMode === 'day' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Dia
            </button>
            <button 
              onClick={() => setViewMode('chairs')}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1",
                viewMode === 'chairs' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
              title="Visão por Cadeiras / Dentistas Lado a Lado"
            >
              <Layers className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Cadeiras</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1",
                viewMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
              title="Lista Detalhada de Atendimentos"
            >
              <List className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Lista</span>
            </button>
          </div>

          {/* New Appointment Primary Button */}
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 bg-brand-cyan hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* ACTIVE ONGOING CONSULTATION BANNER */}
      {activeOngoingConsultation && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white border border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 animate-pulse">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Consulta em Andamento
                </span>
                <span className="text-xs font-mono font-bold text-amber-800">
                  {activeOngoingConsultation.horario || '--:--'}
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">
                Paciente: <span className="text-amber-900 font-extrabold">{activeOngoingConsultation.paciente}</span>
                <span className="text-xs font-semibold text-slate-500 ml-2">
                  ({activeOngoingConsultation.procedimento} • Dr(a). {activeOngoingConsultation.dentista})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onOpenChart && (
              <button
                onClick={() => onOpenChart(activeOngoingConsultation.paciente)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-4 h-4 text-brand-cyan" />
                <span>Prontuário</span>
              </button>
            )}
            {onFinish && (
              <button
                onClick={() => onFinish(activeOngoingConsultation.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir Consulta</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI METRICS ROW FOR SELECTED DAY */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[9px] font-black uppercase text-slate-400">Total do Dia</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">{dayStats.total}</p>
          <span className="text-[9px] text-slate-400 font-bold">{format(selectedDate, 'dd/MM')}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[9px] font-black uppercase text-cyan-600">Agendadas</p>
          <p className="text-xl font-black text-brand-cyan mt-0.5">{dayStats.scheduled}</p>
          <span className="text-[9px] text-slate-400 font-bold">Aguardando</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[9px] font-black uppercase text-amber-600">Em Atendimento</p>
          <p className="text-xl font-black text-amber-600 mt-0.5 flex items-center gap-1.5">
            {dayStats.inProgress}
            {dayStats.inProgress > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </p>
          <span className="text-[9px] text-amber-600 font-bold">Na cadeira</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[9px] font-black uppercase text-emerald-600">Concluídas</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{dayStats.completed}</p>
          <span className="text-[9px] text-emerald-600 font-bold">Finalizadas</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[9px] font-black uppercase text-rose-500">Canceladas</p>
          <p className="text-xl font-black text-rose-500 mt-0.5">{dayStats.canceled}</p>
          <span className="text-[9px] text-slate-400 font-bold">Desmarcadas</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[9px] font-black uppercase text-slate-400">Receita Prevista</p>
          <p className="text-lg font-black text-slate-800 mt-0.5 truncate">
            R$ {dayStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
          <span className="text-[9px] text-emerald-600 font-bold">Hoje</span>
        </div>
      </div>

      {/* MAIN CALENDAR LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* LEFT/MAIN CALENDAR CONTAINER */}
        <div className="xl:col-span-3 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Navigation Bar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrev}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl shadow-2xs cursor-pointer transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handleToday}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black shadow-2xs cursor-pointer transition-colors"
              >
                Hoje
              </button>

              <button 
                onClick={handleNext}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl shadow-2xs cursor-pointer transition-colors"
                title="Próximo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Current Period Label */}
            <h2 className="text-sm sm:text-base font-black text-slate-800 capitalize tracking-tight flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-cyan" />
              <span>
                {viewMode === 'month' && format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                {viewMode === 'week' && weekDays.length > 0 && `Semana de ${format(weekDays[0], 'dd/MM')} a ${format(weekDays[weekDays.length - 1], 'dd/MM/yyyy')}`}
                {(viewMode === 'day' || viewMode === 'chairs' || viewMode === 'list') && format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </h2>

            {/* Legend indicators */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Agendado
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Atendimento
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Concluído
              </span>
            </div>
          </div>

          {/* ===================== VIEW MODE: MÊS (MONTH) ===================== */}
          {viewMode === 'month' && (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div>Segunda</div>
                  <div>Terça</div>
                  <div>Quarta</div>
                  <div>Quinta</div>
                  <div>Sexta</div>
                  <div>Sábado</div>
                  <div>Domingo</div>
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 bg-slate-100/40">
                  {daysGrid.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayApts = appointmentsByDate[dateStr] || [];
                    const isCurrent = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDay = isSameDay(day, new Date());

                    return (
                      <div 
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "min-h-[110px] bg-white border-b border-r border-slate-100 p-2 flex flex-col justify-between transition-all cursor-pointer relative group",
                          !isCurrent && "bg-slate-50/50 opacity-40",
                          isSelected && "ring-2 ring-brand-cyan bg-cyan-50/15 z-10",
                          isTodayDay && "bg-brand-cyan/5"
                        )}
                      >
                        {/* Day header & quick add */}
                        <div className="flex justify-between items-center mb-1">
                          <span className={cn(
                            "w-6 h-6 flex items-center justify-center text-xs font-black rounded-lg leading-none transition-transform group-hover:scale-110",
                            isTodayDay && "bg-brand-cyan text-white shadow-xs shadow-cyan-500/20",
                            !isTodayDay && isCurrent && "text-slate-700",
                            !isCurrent && "text-slate-400"
                          )}>
                            {format(day, 'd')}
                          </span>

                          <div className="flex items-center gap-1">
                            {dayApts.length > 0 && (
                              <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-black">
                                {dayApts.length}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSlotModal(dateStr, '09:00');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-brand-cyan hover:bg-cyan-50 rounded cursor-pointer transition-opacity"
                              title="Agendar neste dia"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Appointments list */}
                        <div className="flex-1 space-y-1 mt-1 overflow-y-auto no-scrollbar max-h-[75px]">
                          {dayApts.slice(0, 3).map(apt => (
                            <div 
                              key={apt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointmentModal(apt);
                              }}
                              className={cn(
                                "px-1.5 py-0.5 rounded-md text-[9px] font-bold border truncate shadow-2xs cursor-pointer hover:opacity-90 flex items-center justify-between gap-1",
                                getStatusColor(apt.status)
                              )}
                              title={`${apt.horario} - ${apt.paciente} (${apt.procedimento})`}
                            >
                              <span className="font-mono text-[8px] font-black">{apt.horario || '--:--'}</span>
                              <span className="truncate">{apt.paciente}</span>
                            </div>
                          ))}
                          {dayApts.length > 3 && (
                            <div className="text-[8px] text-slate-400 font-black text-center pt-0.5">
                              + {dayApts.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW MODE: SEMANA (WEEK) ===================== */}
          {viewMode === 'week' && (
            <div className="overflow-x-auto">
              <div className="min-w-[850px]">
                {/* Weekday Columns Header (Segunda a Sexta) */}
                <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50/80 divide-x divide-slate-200/80">
                  <div className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center">
                    Horário (1h30)
                  </div>
                  {weekDays.map(day => {
                    const isTodayDay = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <div 
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "p-3 text-center cursor-pointer transition-colors",
                          isSelected && "bg-cyan-50/60 font-black",
                          isTodayDay && "bg-brand-cyan/10"
                        )}
                      >
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          {format(day, 'EEE', { locale: ptBR })}
                        </p>
                        <p className={cn(
                          "text-sm font-black mt-0.5 inline-block px-2 py-0.5 rounded-lg",
                          isTodayDay ? "bg-brand-cyan text-white shadow-xs" : "text-slate-800"
                        )}>
                          {format(day, 'dd/MM')}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots Rows (Intervalos de 1h30) */}
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {HOURS_TIMELINE.map(hour => {
                    const endHour = minutesToTime(timeToMinutes(hour) + APPOINTMENT_DURATION_MINUTES);
                    return (
                      <div key={hour} className="grid grid-cols-6 divide-x divide-slate-100 min-h-[58px]">
                        {/* Hour column */}
                        <div className="p-2 text-center bg-slate-50/40 text-[11px] font-black text-slate-500 font-mono flex flex-col items-center justify-center">
                          <span>{hour}</span>
                          <span className="text-[9px] text-slate-400 font-normal">às {endHour}</span>
                        </div>

                        {/* Day cells for this hour */}
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const dayApts = appointmentsByDate[dateStr] || [];
                          const slotApts = dayApts.filter(a => a.horario === hour || doSlotsOverlap(a.horario, 90, hour, 90));

                          return (
                            <div 
                              key={day.toString()}
                              className="p-1.5 relative group hover:bg-slate-50/70 transition-colors flex flex-col justify-center min-h-[58px]"
                            >
                            {slotApts.length === 0 ? (
                              <button
                                onClick={() => handleOpenSlotModal(dateStr, hour)}
                                className="w-full h-full min-h-[44px] rounded-xl border border-transparent hover:border-dashed hover:border-cyan-300 hover:bg-cyan-50/30 flex items-center justify-center opacity-0 group-hover:opacity-100 text-brand-cyan text-[10px] font-black cursor-pointer transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              slotApts.map(apt => (
                                <div
                                  key={apt.id}
                                  className={cn(
                                    "p-1.5 rounded-xl border text-xs space-y-0.5 shadow-2xs group/card relative transition-all hover:scale-[1.01]",
                                    getStatusColor(apt.status)
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-black text-[10px] truncate max-w-[80px]">{apt.paciente}</span>
                                    {apt.status === 'Em Atendimento' && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                    )}
                                  </div>
                                  <p className="text-[9px] opacity-80 truncate">{apt.procedimento}</p>
                                  <p className="text-[8px] opacity-60 truncate">Dr(a). {apt.dentista}</p>

                                  {/* Hover Card Quick Actions Bar */}
                                  <div className="absolute top-1 right-1 hidden group-hover/card:flex items-center gap-1 bg-white/95 p-1 rounded-lg shadow-md border border-slate-200 z-20">
                                    {onStart && apt.status === 'Agendado' && (
                                      <button 
                                        onClick={() => onStart(apt.id)}
                                        className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                        title="Iniciar Consulta"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {onFinish && apt.status === 'Em Atendimento' && (
                                      <button 
                                        onClick={() => onFinish(apt.id)}
                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                        title="Finalizar Atendimento"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {onOpenChart && (
                                      <button 
                                        onClick={() => onOpenChart(apt.paciente)}
                                        className="p-1 text-brand-cyan hover:bg-cyan-50 rounded"
                                        title="Abrir Prontuário"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleSendCardWhatsApp(apt.paciente, (apt as any).telefone || '', apt.data, apt.horario, apt.dentista)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                      title="WhatsApp Direto"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW MODE: DIA (TIMELINE COMPLETA) ===================== */}
          {viewMode === 'day' && (
            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Linha do Tempo</span>
                  <h3 className="text-sm font-black text-slate-800">
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                </div>
                <button
                  onClick={() => handleOpenSlotModal(format(selectedDate, 'yyyy-MM-dd'), '09:00')}
                  className="px-3 py-1.5 bg-brand-cyan text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-xs hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo no Dia</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {HOURS_TIMELINE.map(hour => {
                  const hourApts = selectedDayAppointments.filter(a => a.horario === hour);
                  return (
                    <div key={hour} className="flex items-start p-3 hover:bg-slate-50/50 transition-colors">
                      <div className="w-16 shrink-0 pt-1 font-mono text-xs font-black text-slate-400">
                        {hour}
                      </div>

                      <div className="flex-1 min-w-0">
                        {hourApts.length === 0 ? (
                          <div 
                            onClick={() => handleOpenSlotModal(format(selectedDate, 'yyyy-MM-dd'), hour)}
                            className="p-2 border border-dashed border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/30 rounded-xl text-xs font-bold text-slate-400 hover:text-brand-cyan flex items-center justify-between cursor-pointer transition-all select-none"
                          >
                            <span>Horário Livre</span>
                            <span className="text-[10px] font-black uppercase">+ Agendar este Horário</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {hourApts.map(apt => (
                              <div 
                                key={apt.id}
                                className={cn(
                                  "p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs",
                                  getStatusColor(apt.status)
                                )}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">{apt.paciente}</span>
                                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-white/80 border border-slate-200">
                                      {apt.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 font-bold">{apt.procedimento} • Dr(a). {apt.dentista}</p>
                                  {apt.observacao && (
                                    <p className="text-[10px] text-slate-500 italic">“{apt.observacao}”</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                  {onStart && apt.status === 'Agendado' && (
                                    <button 
                                      onClick={() => onStart(apt.id)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                      title="Iniciar Atendimento"
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" />
                                      <span>Iniciar</span>
                                    </button>
                                  )}
                                  {onFinish && apt.status === 'Em Atendimento' && (
                                    <button 
                                      onClick={() => onFinish(apt.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                      title="Finalizar Atendimento"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Finalizar</span>
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleSendCardWhatsApp(apt.paciente, (apt as any).telefone || '', apt.data, apt.horario, apt.dentista)}
                                    className="p-2 bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 rounded-xl cursor-pointer"
                                    title="WhatsApp Direto"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                  {onOpenChart && (
                                    <button 
                                      onClick={() => onOpenChart(apt.paciente)}
                                      className="p-2 bg-white hover:bg-cyan-50 text-brand-cyan border border-slate-200 rounded-xl cursor-pointer"
                                      title="Abrir Prontuário"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => onCancel(apt.id)}
                                    className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl cursor-pointer"
                                    title="Cancelar Consulta"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== VIEW MODE: CADEIRAS / MULTI-DENTISTA ===================== */}
          {viewMode === 'chairs' && (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Dentist / Chair Columns Header */}
                <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/80 divide-x divide-slate-200">
                  <div className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Horário
                  </div>
                  {dentistList.slice(0, 3).map((dentist, dIdx) => (
                    <div key={dentist} className="p-3 text-center">
                      <span className="text-[9px] font-black uppercase text-brand-cyan tracking-wider">
                        Consultório / Cadeira {dIdx + 1}
                      </span>
                      <p className="text-xs font-black text-slate-800 truncate">{dentist}</p>
                    </div>
                  ))}
                </div>

                {/* Chair Timeline Slots */}
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {HOURS_TIMELINE.map(hour => (
                    <div key={hour} className="grid grid-cols-4 divide-x divide-slate-100 min-h-[50px]">
                      <div className="p-2 text-center bg-slate-50/30 text-[11px] font-black text-slate-400 font-mono flex items-center justify-center">
                        {hour}
                      </div>

                      {dentistList.slice(0, 3).map(dentist => {
                        const dateStr = format(selectedDate, 'yyyy-MM-dd');
                        const chairApts = selectedDayAppointments.filter(a => a.horario === hour && a.dentista === dentist);

                        return (
                          <div key={dentist} className="p-1 relative group hover:bg-slate-50/50 flex flex-col justify-center">
                            {chairApts.length === 0 ? (
                              <button
                                onClick={() => handleOpenSlotModal(dateStr, hour, dentist)}
                                className="w-full h-full min-h-[40px] rounded-xl border border-transparent hover:border-dashed hover:border-cyan-300 hover:bg-cyan-50/30 flex items-center justify-center opacity-0 group-hover:opacity-100 text-brand-cyan text-[10px] font-black cursor-pointer transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              chairApts.map(apt => (
                                <div
                                  key={apt.id}
                                  onClick={() => onOpenChart && onOpenChart(apt.paciente)}
                                  className={cn(
                                    "p-1.5 rounded-xl border text-xs space-y-0.5 shadow-2xs cursor-pointer hover:scale-[1.01] transition-all",
                                    getStatusColor(apt.status)
                                  )}
                                >
                                  <p className="font-black text-slate-900 truncate">{apt.paciente}</p>
                                  <p className="text-[9px] opacity-75 truncate">{apt.procedimento}</p>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW MODE: LISTA (DETAILED APPOINTMENTS LIST) ===================== */}
          {viewMode === 'list' && (
            <div className="p-4 overflow-x-auto">
              <div className="min-w-[650px] space-y-3">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Consultas de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <span className="text-[10px] font-black bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200">
                      {selectedDayAppointments.length} registro(s)
                    </span>
                  </div>
                </div>

                {selectedDayAppointments.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">Nenhum atendimento listado para este dia</p>
                    <p className="text-xs text-slate-400 mt-1">Utilize o botão "Novo Agendamento" ou clique no calendário para marcar.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-2xs">
                    {selectedDayAppointments.map((apt) => {
                      const isRealizado = apt.status === 'Realizado';
                      const isCancelado = apt.status === 'Cancelado';
                      const isEmAtendimento = apt.status === 'Em Atendimento';

                      return (
                        <div 
                          key={apt.id}
                          className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 text-center shrink-0">
                              <span className="font-mono text-xs font-black text-brand-cyan bg-cyan-50 border border-cyan-100 px-2 py-1 rounded-lg block">
                                {apt.horario || '09:00'}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-800 truncate">
                                  {apt.paciente}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-full border",
                                  isRealizado && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                  isEmAtendimento && "bg-amber-50 text-amber-700 border-amber-200 animate-pulse",
                                  isCancelado && "bg-rose-50 text-rose-600 border-rose-200",
                                  !isRealizado && !isCancelado && !isEmAtendimento && "bg-cyan-50 text-cyan-700 border-cyan-200"
                                )}>
                                  {apt.status || 'Agendado'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span>{apt.procedimento}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3 text-brand-cyan" />
                                  {apt.dentista}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-slate-700">
                                  {formatCurrency(Number(apt.valor) || 0)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onOpenChart && (
                              <button
                                onClick={() => onOpenChart(apt.paciente)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-brand-cyan hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                                title="Abrir Prontuário"
                              >
                                Prontuário
                              </button>
                            )}

                            {!isRealizado && !isCancelado && onStart && (
                              <button
                                onClick={() => onStart(apt.id)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Iniciar Atendimento"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            )}

                            {!isRealizado && !isCancelado && onFinish && (
                              <button
                                onClick={() => onFinish(apt.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Concluir Consulta"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {!isRealizado && !isCancelado && (
                              <button
                                onClick={() => onCancel(apt.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancelar Agendamento"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR: QUICK EVENT TAGS & DAY SUMMARY */}
        <div className="space-y-4">
          
          {/* Quick Shortcuts / Event Tags */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-brand-cyan tracking-wider bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">
                Atalhos Rápidos
              </span>
              <h3 className="text-sm font-black text-slate-800 tracking-tight mt-1">Bloqueios & Marcadores</h3>
              <p className="text-[11px] text-slate-400">Clique para lançar um bloqueio na data selecionada ({format(selectedDate, 'dd/MM')})</p>
            </div>

            <div className="space-y-2">
              {activeTags.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => {
                    setQuickEventModal({
                      tagId: tag.id,
                      title: tag.title,
                      color: tag.color
                    });
                    setQuickEventDentist(currentUser?.name || dentistList[0] || 'Dr. Daniel');
                    setQuickEventTime('12:00');
                    setQuickEventNote('');
                  }}
                  className={cn(
                    "p-2.5 rounded-2xl text-xs font-black tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-xs flex items-center justify-between",
                    tag.color
                  )}
                >
                  <span>{tag.title}</span>
                  <span className="text-[9px] opacity-80 uppercase font-mono">+ Lançar</span>
                </div>
              ))}
            </div>

            {activeTags.length < STATIC_EVENT_TAGS.length && (
              <button
                onClick={() => setActiveTags(STATIC_EVENT_TAGS)}
                className="text-[10px] text-brand-cyan hover:underline font-bold cursor-pointer block text-center w-full"
              >
                Restaurar todos os marcadores
              </button>
            )}
          </div>

          {/* Appointments of Selected Day List */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Dia {format(selectedDate, 'dd/MM/yyyy')}
              </h4>
              <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                {selectedDayAppointments.length} consulta(s)
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {selectedDayAppointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum agendamento para este dia.
                </p>
              ) : (
                selectedDayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{apt.paciente}</span>
                      <span className="font-mono text-[10px] font-black text-brand-cyan bg-cyan-50 px-1.5 py-0.5 rounded">
                        {apt.horario}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate max-w-[120px]">{apt.procedimento}</span>
                      <span className="font-bold text-slate-700">R$ {Number(apt.valor).toFixed(0)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => handleOpenSlotModal(format(selectedDate, 'yyyy-MM-dd'), '09:00')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar no Dia</span>
            </button>
          </div>

        </div>

      </div>

      {/* QUICK SLOT BOOKING MODAL */}
      <AnimatePresence>
        {slotModal && slotModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-800">Agendamento Rápido</h3>
                  <p className="text-xs text-slate-400">
                    Data: {slotModal.date} às {slotModal.time}
                  </p>
                </div>
                <button
                  onClick={() => setSlotModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-bold text-slate-700">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">Nome do Paciente *</label>
                  <input 
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={slotPatientName}
                    onChange={e => setSlotPatientName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">Procedimento</label>
                  <select
                    value={slotProcedure}
                    onChange={e => setSlotProcedure(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-brand-cyan"
                  >
                    <option value="Avaliação / Check-up Geral">Avaliação / Check-up Geral</option>
                    <option value="Limpeza & Profilaxia">Limpeza & Profilaxia</option>
                    <option value="Restauração Estética">Restauração Estética</option>
                    <option value="Extração Simples">Extração Simples</option>
                    <option value="Canal / Endodontia">Canal / Endodontia</option>
                    <option value="Ortodontia / Manutenção">Ortodontia / Manutenção</option>
                    <option value="Clareamento Dental">Clareamento Dental</option>
                    <option value="Implante / Cirurgia">Implante / Cirurgia</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400">Dentista</label>
                    <select
                      value={slotModal.dentist}
                      onChange={e => setSlotModal({ ...slotModal, dentist: e.target.value })}
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {dentistList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400">Valor Estimado (R$)</label>
                    <input 
                      type="number"
                      value={slotValue}
                      onChange={e => setSlotValue(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">WhatsApp do Paciente</label>
                  <input 
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={slotPhone}
                    onChange={e => setSlotPhone(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">Observações / Queixa</label>
                  <textarea 
                    rows={2}
                    placeholder="Algum detalhe adicional..."
                    value={slotNotes}
                    onChange={e => setSlotNotes(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSlotModal(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlotAppointment}
                  disabled={isSavingSlot}
                  className="flex-2 py-3 bg-brand-cyan hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingSlot ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE APPOINTMENT DETAILS & CONSULTATION ACTION MODAL */}
      <AnimatePresence>
        {selectedAppointmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 text-left"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5",
                    selectedAppointmentModal.status === 'Em Atendimento' && "bg-amber-100 text-amber-900 border-amber-300",
                    selectedAppointmentModal.status === 'Realizado' && "bg-emerald-100 text-emerald-900 border-emerald-300",
                    selectedAppointmentModal.status === 'Cancelado' && "bg-rose-100 text-rose-900 border-rose-300",
                    (!selectedAppointmentModal.status || selectedAppointmentModal.status === 'Agendado') && "bg-cyan-100 text-cyan-900 border-cyan-300"
                  )}>
                    {selectedAppointmentModal.status === 'Em Atendimento' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    )}
                    {selectedAppointmentModal.status || 'Agendado'}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {selectedAppointmentModal.paciente}
                  </h3>
                  <p className="text-xs font-bold text-brand-cyan">
                    {selectedAppointmentModal.procedimento}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAppointmentModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Details Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Data & Horário</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-brand-cyan" />
                    {(() => {
                      if (!selectedAppointmentModal.data) return '--/--';
                      try {
                        const parsed = parseISO(selectedAppointmentModal.data);
                        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : selectedAppointmentModal.data;
                      } catch {
                        return selectedAppointmentModal.data;
                      }
                    })()} às {selectedAppointmentModal.horario || '08:00'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Profissional / Dentista</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Stethoscope className="w-3.5 h-3.5 text-brand-cyan" />
                    {selectedAppointmentModal.dentista}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Valor Previsto</span>
                  <span className="font-mono font-bold text-emerald-700 mt-0.5 block">
                    {formatCurrency(Number(selectedAppointmentModal.valor) || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Contato</span>
                  <span className="font-mono font-bold text-slate-700 mt-0.5 block">
                    {(selectedAppointmentModal as any).telefone || 'Não informado'}
                  </span>
                </div>

                {selectedAppointmentModal.observacao && (
                  <div className="col-span-2 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Observação Clínica / Motivo</span>
                    <p className="text-slate-600 font-medium italic mt-0.5">
                      “{selectedAppointmentModal.observacao}”
                    </p>
                  </div>
                )}
              </div>

              {/* Primary Consultation Controls */}
              <div className="space-y-2 pt-1">
                {selectedAppointmentModal.status === 'Agendado' && onStart && (
                  <button
                    onClick={() => {
                      onStart(selectedAppointmentModal.id);
                      setSelectedAppointmentModal(prev => prev ? { ...prev, status: 'Em Atendimento' } : null);
                    }}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span>Começar Consulta (Mudar Status para "Em Atendimento")</span>
                  </button>
                )}

                {selectedAppointmentModal.status === 'Em Atendimento' && onFinish && (
                  <button
                    onClick={() => {
                      onFinish(selectedAppointmentModal.id);
                      setSelectedAppointmentModal(prev => prev ? { ...prev, status: 'Realizado' } : null);
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Concluir Consulta (Mudar Status para "Concluído")</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {onOpenChart && (
                    <button
                      onClick={() => {
                        onOpenChart(selectedAppointmentModal.paciente);
                        setSelectedAppointmentModal(null);
                      }}
                      className="py-2.5 bg-slate-50 hover:bg-cyan-50 hover:text-brand-cyan text-slate-700 text-xs font-black rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-brand-cyan" />
                      <span>Abrir Prontuário</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleSendCardWhatsApp(
                        selectedAppointmentModal.paciente,
                        (selectedAppointmentModal as any).telefone || '',
                        selectedAppointmentModal.data,
                        selectedAppointmentModal.horario,
                        selectedAppointmentModal.dentista
                      );
                    }}
                    className="py-2.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-black rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {selectedAppointmentModal.status !== 'Cancelado' && selectedAppointmentModal.status !== 'Realizado' && (
                  <button
                    onClick={() => {
                      onCancel(selectedAppointmentModal.id);
                      setSelectedAppointmentModal(null);
                    }}
                    className="w-full py-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancelar este Agendamento</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK EVENT SHORTCUT MODAL */}
      <AnimatePresence>
        {quickEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-800">Lançar Bloqueio / Marcador</h3>
                  <p className="text-xs text-slate-400">Data: {format(selectedDate, 'dd/MM/yyyy')}</p>
                </div>
                <button
                  onClick={() => setQuickEventModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={cn("p-3 rounded-2xl text-center text-xs font-black shadow-xs", quickEventModal.color)}>
                {quickEventModal.title}
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">Horário</label>
                  <select
                    value={quickEventTime}
                    onChange={e => setQuickEventTime(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {HOURS_TIMELINE.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">Profissional / Cadeira</label>
                  <select
                    value={quickEventDentist}
                    onChange={e => setQuickEventDentist(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {dentistList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">Nota / Motivo</label>
                  <input
                    type="text"
                    placeholder="Ex: Reunião com fornecedor"
                    value={quickEventNote}
                    onChange={e => setQuickEventNote(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickEventModal(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickEvent}
                  disabled={isSavingQuickEvent}
                  className="flex-2 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all"
                >
                  {isSavingQuickEvent ? 'Gravando...' : 'Lançar Bloqueio'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
