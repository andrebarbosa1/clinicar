/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Stethoscope, 
  LayoutDashboard, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  CheckCircle,
  CheckCircle2,
  Volume2,
  PhoneCall,
  MessageSquare,
  Plus,
  ArrowUpRight,
  Activity,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  CalendarDays,
  MoreHorizontal,
  Send,
  User,
  HeartPulse
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '../lib/utils';
import { DentalRecord } from '../types';

export default function CustomDashboardView({ 
  filteredData,
  upcomingAppointments = [],
  onSendWhatsApp,
  onSendReminder,
  canSeeFinancials = true,
  users = [],
  onNavigate,
  clinicName = 'DentalSoft'
}: { 
  filteredData: DentalRecord[];
  upcomingAppointments?: DentalRecord[];
  onSendWhatsApp: (record: DentalRecord) => void;
  onSendReminder: (record: DentalRecord) => void;
  canSeeFinancials?: boolean;
  users?: any[];
  onNavigate?: (page: string, subPage?: string | null) => void;
  clinicName?: string;
}) {
  // States for interactive widgets & consultation calling
  const [isServingActive, setIsServingActive] = useState(false);
  const [currentServingPatient, setCurrentServingPatient] = useState<string | null>(null);
  const [activeCalendarDay, setActiveCalendarDay] = useState<number | null>(new Date().getDate());
  const [callingToast, setCallingToast] = useState<string | null>(null);

  // Get logged in user name from session
  const loggedInUser = useMemo(() => {
    try {
      const session = localStorage.getItem('odonto_session');
      if (session) return JSON.parse(session);
    } catch (e) {}
    return null;
  }, []);
  const doctorName = loggedInUser?.name || 'Dr. Daniel Smith';

  const isTrialUser = useMemo(() => {
    return !!(loggedInUser?.isTrial || loggedInUser?.parentTrialId);
  }, [loggedInUser]);

  // Greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Get active days from actual appointments
  const appointmentDays = useMemo(() => {
    const days = new Set<number>();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    filteredData.forEach(appt => {
      if (appt.data) {
        try {
          const date = parseISO(appt.data);
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            days.add(date.getDate());
          }
        } catch (e) {}
      }
    });
    return days;
  }, [filteredData]);

  // Dynamic values based on original analytics to match the design metrics
  const totalPatientsMetrics = useMemo(() => {
    const unique = new Set(filteredData.map(r => r.paciente).filter(Boolean)).size;
    if (isTrialUser) {
      return {
        lastMonth: unique,
        thisWeek: Math.min(unique, filteredData.length),
        today: filteredData.filter(r => r.data === format(new Date(), 'yyyy-MM-dd')).length
      };
    }
    const fallbackUnique = unique || 12;
    return {
      lastMonth: fallbackUnique * 3 + 4,
      thisWeek: fallbackUnique + 9,
      today: Math.max(1, Math.round(fallbackUnique / 4))
    };
  }, [filteredData, isTrialUser]);

  const reportMetrics = useMemo(() => {
    const unique = new Set(filteredData.map(r => r.paciente).filter(Boolean)).size;
    const completed = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Concluído').length;
    const scheduled = filteredData.filter(r => r.status === 'Agendado').length;
    const surgeries = filteredData.filter(r => {
      const proc = (r.procedimento || '').toLowerCase();
      return proc.includes('cirurg') || proc.includes('implante') || proc.includes('extra') || proc.includes('canal');
    }).length;

    if (isTrialUser) {
      return {
        patients: unique,
        consultations: scheduled,
        treatments: completed,
        surgeries: surgeries
      };
    }

    return {
      patients: unique || 12,
      consultations: scheduled || 23,
      treatments: completed || 11,
      surgeries: surgeries || 4
    };
  }, [filteredData, isTrialUser]);

  // Financial summary when permitted
  const financialSummary = useMemo(() => {
    if (!canSeeFinancials) return null;
    const activeRecords = filteredData.filter(r => r.status !== 'Cancelado');
    const realizedRecords = filteredData.filter(r => r.status === 'Realizado' || r.status === 'Concluído');
    const totalReceived = realizedRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
    const totalPending = activeRecords.filter(r => r.status === 'Agendado').reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
    const avgTicket = realizedRecords.length > 0 ? totalReceived / realizedRecords.length : 0;
    
    return {
      totalReceived,
      totalPending,
      avgTicket,
      completedCount: realizedRecords.length
    };
  }, [filteredData, canSeeFinancials]);

  // Notifications (dynamic + fallback)
  const notifications = useMemo(() => {
    const items = [];
    const colors = ['bg-sky-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'];
    
    const realAppts = upcomingAppointments.slice(0, 4);
    realAppts.forEach((appt, idx) => {
      items.push({
        id: `noti-${appt.id}`,
        title: `${appt.procedimento} - ${appt.paciente}`,
        time: appt.horario || '08:30 AM',
        date: appt.data ? format(parseISO(appt.data), 'dd MMM yyyy') : 'Hoje',
        colorClass: colors[idx % colors.length],
        record: appt
      });
    });

    if (isTrialUser) {
      return items;
    }

    if (items.length < 4) {
      const fallbacks = [
        { title: "Novo agendamento confirmado", time: "08:30", date: format(new Date(), 'dd MMM yyyy'), colorClass: "bg-sky-500" },
        { title: "Cirurgia de Implante agendada", time: "10:00", date: format(new Date(), 'dd MMM yyyy'), colorClass: "bg-cyan-500" },
        { title: "Consulta de Avaliação clínica", time: "14:30", date: format(new Date(), 'dd MMM yyyy'), colorClass: "bg-emerald-500" },
        { title: "Lembrete de retorno preventivo", time: "16:00", date: format(new Date(), 'dd MMM yyyy'), colorClass: "bg-amber-500" }
      ];
      fallbacks.slice(0, 4 - items.length).forEach((fb, idx) => {
        items.push({
          id: `noti-fallback-${idx}`,
          title: fb.title,
          time: fb.time,
          date: fb.date,
          colorClass: fb.colorClass,
          record: null
        });
      });
    }
    return items;
  }, [upcomingAppointments, isTrialUser]);

  // Frequent Patients (dynamic + fallback)
  const frequentPatients = useMemo(() => {
    const list = [];
    const names = Array.from(new Set(filteredData.map(r => r.paciente).filter(Boolean)));
    
    if (isTrialUser) {
      names.slice(0, 4).forEach((name, i) => {
        const initial = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        list.push({
          id: `freq-${i}`,
          name,
          time: "Ativo",
          initial,
          colorClass: "bg-teal-50 text-teal-700 border-teal-200"
        });
      });
      return list;
    }

    const defaultPatients = [
      { name: "Isabel Horvat", time: "Há 2 horas", initial: "IH", color: "bg-teal-50 text-teal-700 border-teal-200" },
      { name: "Alena Steves", time: "Há 4 horas", initial: "AS", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { name: "Ivan Drake", time: "Ontem", initial: "ID", color: "bg-sky-50 text-sky-700 border-sky-200" },
      { name: "Maggie Fletcher", time: "Há 2 dias", initial: "MF", color: "bg-purple-50 text-purple-700 border-purple-200" }
    ];

    for (let i = 0; i < 4; i++) {
      const name = names[i] || defaultPatients[i].name;
      const initial = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || defaultPatients[i].initial;
      list.push({
        id: `freq-${i}`,
        name,
        time: defaultPatients[i].time,
        initial,
        colorClass: defaultPatients[i].color
      });
    }
    return list;
  }, [filteredData, isTrialUser]);

  // Waiting Room patients (dynamic + fallback)
  const waitingRoomPatients = useMemo(() => {
    const list = [];
    const realAppts = upcomingAppointments.slice(0, 5);
    const times = ["10 Min", "20 Min", "35 Min", "45 Min", "60 Min"];
    
    if (isTrialUser) {
      realAppts.forEach((appt, i) => {
        list.push({
          id: appt.id,
          name: appt.paciente,
          type: appt.procedimento || 'Consulta Odontológica',
          time: times[i % times.length],
          initial: appt.paciente.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          colorClass: "bg-sky-50 text-sky-700 border-sky-200",
          record: appt
        });
      });
      return list;
    }

    const defaultPatients = [
      { name: "Isabel Horvat", type: "Avaliação Geral", initial: "IH", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      { name: "Ivan Drake", type: "Limpeza & Profilaxia", initial: "ID", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { name: "Joshua Holcombe", type: "Restauração", initial: "JH", color: "bg-amber-50 text-amber-700 border-amber-200" },
      { name: "Maggie Fletcher", type: "Manutenção Aparelho", initial: "MF", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { name: "Valerie Burke", type: "Cirurgia Implante", initial: "VB", color: "bg-rose-50 text-rose-700 border-rose-200" }
    ];

    for (let i = 0; i < 5; i++) {
      const appt = realAppts[i];
      if (appt) {
        list.push({
          id: appt.id,
          name: appt.paciente,
          type: appt.procedimento || 'Consulta',
          time: times[i % times.length],
          initial: appt.paciente.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          colorClass: "bg-sky-50 text-sky-700 border-sky-200",
          record: appt
        });
      } else {
        list.push({
          id: `wait-def-${i}`,
          name: defaultPatients[i].name,
          type: defaultPatients[i].type,
          time: times[i],
          initial: defaultPatients[i].initial,
          colorClass: defaultPatients[i].color,
          record: null
        });
      }
    }
    return list;
  }, [upcomingAppointments, isTrialUser]);

  // Recent Patients (dynamic + fallback)
  const recentPatients = useMemo(() => {
    const list = [];
    const uniqueNames = Array.from(new Set(filteredData.map(r => r.paciente).filter(Boolean)));
    
    if (isTrialUser) {
      uniqueNames.slice(0, 5).forEach((name, idx) => {
        const initial = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        list.push({
          id: `recent-${idx}`,
          name,
          time: "Recente",
          initial
        });
      });
      return list;
    }

    const defaultRecent = [
      { name: "Alena Steves", time: "Há 15 minutos", initial: "AS" },
      { name: "Ivan Drake", time: "Há 30 minutos", initial: "ID" },
      { name: "Joshua Holcombe", time: "Há 1 hora", initial: "JH" },
      { name: "Maggie Fletcher", time: "Há 3 horas", initial: "MF" },
      { name: "Valerie Burke", time: "Há 5 horas", initial: "VB" }
    ];

    for (let i = 0; i < 5; i++) {
      const name = uniqueNames[i] || defaultRecent[i].name;
      const initial = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || defaultRecent[i].initial;
      list.push({
        id: `recent-${i}`,
        name,
        time: defaultRecent[i].time,
        initial
      });
    }
    return list;
  }, [filteredData, isTrialUser]);

  // Calendar Day generation
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        isToday: d === now.getDate()
      });
    }
    return days;
  }, []);

  // Voice calling synthesis function
  const handleCallNextPatient = () => {
    if (!isServingActive) {
      setCallingToast("Ative o interruptor de atendimento primeiro!");
      setTimeout(() => setCallingToast(null), 3500);
      return;
    }

    // Pick first patient in the waiting room
    const nextPatient = waitingRoomPatients[0];
    if (nextPatient) {
      setCurrentServingPatient(nextPatient.name);
      setCallingToast(`Chamando paciente: ${nextPatient.name}`);
      setTimeout(() => setCallingToast(null), 5000);

      // Play voice synthesis call in Portuguese
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const speech = new SpeechSynthesisUtterance(`Atenção, paciente ${nextPatient.name}. Favor dirigir-se ao consultório odontológico.`);
          speech.lang = 'pt-BR';
          speech.rate = 0.95;
          speech.pitch = 1.05;
          window.speechSynthesis.speak(speech);
        }
      } catch (err) {
        console.error("Speech synthesis failed", err);
      }
    }
  };

  return (
    <div className="flex w-full bg-[#f8fafc] text-slate-900 font-sans select-none text-left relative min-h-full">
      
      {/* Toast Overlay for voice calling & actions */}
      {callingToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[250] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border border-slate-700/80 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Chamada em Andamento</p>
            <p className="text-xs font-semibold text-slate-100">{callingToast}</p>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE PANEL */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 gap-6 max-w-7xl mx-auto w-full">
        
        {/* HEADER SECTION: MODERN GREETING & QUICK ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {clinicName}
              </span>
              <span className="text-xs text-slate-400 font-semibold">•</span>
              <span className="text-xs text-slate-500 font-medium capitalize">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, <span className="text-cyan-700">{doctorName.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Aqui está o resumo operacional e a movimentação da clínica para hoje.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={() => onNavigate?.('Agenda', 'NovoAgendamento')}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
            <button 
              onClick={() => onNavigate?.('Pacientes', 'Cadastrar')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-2xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Novo Paciente</span>
            </button>
            <button 
              onClick={() => onNavigate?.('Agenda')}
              className="p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-2xl text-xs font-bold transition-all border border-slate-200 flex items-center justify-center cursor-pointer"
              title="Abrir Agenda Completa"
            >
              <Calendar className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* FINANCIAL SUMMARY BANNER (IF ALLOWED) */}
        {canSeeFinancials && financialSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-sm border border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Faturado</p>
                <h4 className="text-xl font-black text-emerald-400 tracking-tight truncate">
                  {formatCurrency(financialSummary.totalReceived)}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{financialSummary.completedCount} procedimentos</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-700/60 pt-3 sm:pt-0 sm:pl-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Previsto em Aberto</p>
                <h4 className="text-xl font-black text-amber-400 tracking-tight truncate">
                  {formatCurrency(financialSummary.totalPending)}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Consultas agendadas</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-700/60 pt-3 sm:pt-0 sm:pl-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ticket Médio</p>
                <h4 className="text-xl font-black text-cyan-400 tracking-tight truncate">
                  {formatCurrency(financialSummary.avgTicket)}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Por atendimento</p>
              </div>
            </div>
          </div>
        )}

        {/* ROW 1: KEY PERFORMANCE INDICATORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Patients */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total de Pacientes</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{reportMetrics.patients}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-700">
                <TrendingUp className="w-3 h-3" />
                <span>Base ativa da clínica</span>
              </div>
            </div>
          </div>

          {/* Card 2: Scheduled Appointments */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Consultas Agendadas</span>
              <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-sky-600 tracking-tight leading-none">{reportMetrics.consultations}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-sky-700">
                <Clock className="w-3 h-3" />
                <span>Próximos horários</span>
              </div>
            </div>
          </div>

          {/* Card 3: Completed Treatments */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tratamentos Concluídos</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-emerald-600 tracking-tight leading-none">{reportMetrics.treatments}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-700">
                <CheckCircle className="w-3 h-3" />
                <span>Finalizados com sucesso</span>
              </div>
            </div>
          </div>

          {/* Card 4: Surgeries & Procedures */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cirurgias & Procedimentos</span>
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-rose-600 tracking-tight leading-none">{reportMetrics.surgeries}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-rose-700">
                <HeartPulse className="w-3 h-3" />
                <span>Casos cirúrgicos e implantes</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENTS GRID: 2 COLUMNS (8 COLS FOR CALENDAR & PATIENTS, 4 COLS FOR QUEUE & CONSOLE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 8 COLUMNS: INTERACTIVE CALENDAR & RECENT PATIENTS */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Calendar Widget */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Calendário de Atendimentos</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Visualize a ocupação diária do consultório</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate?.('Agenda')}
                  className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Ver Agenda</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Month Selector Bar */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 mb-4">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">
                  {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                </span>
                <div className="flex items-center gap-2 text-slate-400">
                  <button className="p-1 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="p-1 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex flex-col">
                <div className="grid grid-cols-7 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-3 font-mono">
                  {calendarDays.map((cell, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => cell.day && setActiveCalendarDay(cell.day)}
                      className={cn(
                        "h-10 rounded-2xl flex flex-col items-center justify-center text-xs font-bold relative transition-all",
                        !cell.day ? "opacity-0 pointer-events-none" : "cursor-pointer",
                        cell.day === activeCalendarDay 
                          ? "bg-cyan-600 text-white shadow-sm font-extrabold" 
                          : cell.isToday 
                            ? "bg-cyan-50 text-cyan-800 font-extrabold border border-cyan-200" 
                            : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <span>{cell.day}</span>
                      
                      {/* Appointment Highlight Indicators */}
                      {isTrialUser ? (
                        cell.day && appointmentDays.has(cell.day) && (
                          <span className={cn(
                            "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                            cell.day === activeCalendarDay ? "bg-white" : "bg-cyan-500"
                          )} />
                        )
                      ) : (
                        cell.day && (
                          <div className="flex gap-0.5 absolute bottom-1">
                            {cell.day % 4 === 0 && (
                              <span className={cn("w-1 h-1 rounded-full", cell.day === activeCalendarDay ? "bg-white" : "bg-sky-500")} />
                            )}
                            {cell.day % 7 === 0 && (
                              <span className={cn("w-1 h-1 rounded-full", cell.day === activeCalendarDay ? "bg-white" : "bg-emerald-500")} />
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Patients List */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Pacientes Recentes</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Histórico recente de interações e consultas</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate?.('Pacientes')}
                  className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Ver Todos</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {recentPatients.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum paciente recente registrado.
                  </div>
                ) : (
                  recentPatients.map((patient) => (
                    <div 
                      key={patient.id} 
                      onClick={() => onNavigate?.('Pacientes')}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-2xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center font-extrabold text-xs shrink-0">
                          {patient.initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{patient.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{patient.time}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 px-2.5 py-1 bg-slate-100 rounded-full">
                        Ver Prontuário
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* RIGHT 4 COLUMNS: WAITING ROOM & SERVING CONSOLE */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* SERVING NOW & VOICE CALLING CONSOLE */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      isServingActive ? "bg-emerald-500 animate-ping" : "bg-slate-300"
                    )} />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Atendimento Atual</h3>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                    isServingActive 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {isServingActive ? "Painel Aberto" : "Fechado"}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Paciente em Atendimento</p>
                  {currentServingPatient ? (
                    <p className="text-sm font-extrabold text-cyan-800 truncate">
                      {currentServingPatient}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">
                      Nenhum paciente chamado no momento.
                    </p>
                  )}
                </div>
              </div>

              {/* Call Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Chave de Atendimento:</span>
                  <button 
                    onClick={() => setIsServingActive(!isServingActive)}
                    className={cn(
                      "w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative cursor-pointer",
                      isServingActive ? "bg-cyan-600" : "bg-slate-300"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300",
                        isServingActive ? "translate-x-6" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <button 
                  onClick={handleCallNextPatient}
                  className={cn(
                    "w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm",
                    isServingActive 
                      ? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20" 
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  )}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Chamar Próximo Paciente</span>
                </button>
              </div>
            </div>

            {/* WAITING ROOM QUEUE */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fila de Espera</h3>
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-extrabold text-[10px] flex items-center justify-center">
                    {waitingRoomPatients.length}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Tempo Estimado</span>
              </div>

              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {waitingRoomPatients.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum paciente aguardando na recepção.
                  </div>
                ) : (
                  waitingRoomPatients.map((p, idx) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-extrabold text-[10px] shrink-0">
                          {p.initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-cyan-700 font-semibold truncate">{p.type}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {p.time}
                        </span>
                        {p.record ? (
                          <button 
                            onClick={() => onSendWhatsApp(p.record!)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setCallingToast(`Ação rápida para ${p.name}`);
                              setTimeout(() => setCallingToast(null), 2000);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Opções"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* QUICK NOTIFICATIONS & ALERTS */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Avisos & Lembretes</h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {notifications.map((noti) => (
                  <div key={noti.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-2.5">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", noti.colorClass)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 leading-snug truncate">{noti.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{noti.time} • {noti.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
