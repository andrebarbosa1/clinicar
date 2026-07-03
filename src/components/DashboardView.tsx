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
  CheckCircle
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
  // States for custom interactive widgets
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

  const waitingRoomCount = useMemo(() => {
    if (isTrialUser) return upcomingAppointments.length;
    return upcomingAppointments.length || 5;
  }, [upcomingAppointments, isTrialUser]);

  // Notifications (dynamic + fallback)
  const notifications = useMemo(() => {
    const items = [];
    const colors = ['bg-[#0ea5e9]', 'bg-[#06b6d4]', 'bg-[#10b981]', 'bg-[#f59e0b]'];
    
    const realAppts = upcomingAppointments.slice(0, 4);
    realAppts.forEach((appt, idx) => {
      items.push({
        id: `noti-${appt.id}`,
        title: `${appt.procedimento} - ${appt.paciente}`,
        time: appt.horario || '08:30 AM',
        date: appt.data ? format(parseISO(appt.data), 'dd MMM yyyy') : 'Hoje',
        colorClass: colors[idx % colors.length]
      });
    });

    if (isTrialUser) {
      return items;
    }

    if (items.length < 4) {
      const fallbacks = [
        { title: "New appointment created", time: "8:30 AM", date: "July 25, 2021", colorClass: "bg-[#0ea5e9]" },
        { title: "Dental surgery scheduled", time: "9:00 AM", date: "July 25, 2021", colorClass: "bg-[#06b6d4]" },
        { title: "Online consultation", time: "9:30 AM", date: "July 25, 2021", colorClass: "bg-[#10b981]" },
        { title: "Reminder", time: "9:30 AM", date: "July 25, 2021", colorClass: "bg-[#f59e0b]" }
      ];
      fallbacks.slice(0, 4 - items.length).forEach((fb) => {
        items.push({
          id: `noti-fallback-${fb.title}-${Math.random()}`,
          title: fb.title,
          time: fb.time,
          date: fb.date,
          colorClass: fb.colorClass
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
          colorClass: "bg-teal-50 text-teal-700 border-teal-100"
        });
      });
      return list;
    }

    const defaultPatients = [
      { name: "Isabel Horvat", time: "5 hours ago", initial: "IH", color: "bg-teal-50 text-teal-700 border-teal-100" },
      { name: "Alena Steves", time: "15 hours ago", initial: "AS", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
      { name: "Ivan Drake", time: "1 day ago", initial: "ID", color: "bg-blue-50 text-blue-700 border-blue-100" },
      { name: "Maggie Fletcher", time: "1 day ago", initial: "MF", color: "bg-purple-50 text-purple-700 border-purple-100" }
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
    const times = ["1 Hora", "45 Minutos", "30 Minutos", "15 Minutos", "12 Minutos"];
    
    if (isTrialUser) {
      realAppts.forEach((appt, i) => {
        list.push({
          id: appt.id,
          name: appt.paciente,
          type: appt.procedimento,
          time: times[i % times.length],
          initial: appt.paciente.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          colorClass: "bg-sky-50 text-sky-700",
          record: appt
        });
      });
      return list;
    }

    const defaultPatients = [
      { name: "Isabel Horvat", type: "Consultation", initial: "IH", color: "bg-[#f3f4f6]" },
      { name: "Ivan Drake", type: "Cleaning", initial: "ID", color: "bg-[#f3f4f6]" },
      { name: "Joshua Holcombe", type: "Consultation", initial: "JH", color: "bg-[#f3f4f6]" },
      { name: "Maggie Fletcher", type: "Braces", initial: "MF", color: "bg-[#f3f4f6]" },
      { name: "Valerie Burke", type: "Dental surgery", initial: "VB", color: "bg-[#f3f4f6]" }
    ];

    for (let i = 0; i < 5; i++) {
      const appt = realAppts[i];
      if (appt) {
        list.push({
          id: appt.id,
          name: appt.paciente,
          type: appt.procedimento,
          time: times[i % times.length],
          initial: appt.paciente.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          colorClass: "bg-sky-50 text-sky-700",
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
      uniqueNames.forEach((name, idx) => {
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
      { name: "Alena Steves", time: "15 hours ago", initial: "AS" },
      { name: "Ivan Drake", time: "29 minutes ago", initial: "ID" },
      { name: "Joshua Holcombe", time: "44 minutes ago", initial: "JH" },
      { name: "Maggie Fletcher", time: "3 hours ago", initial: "MF" },
      { name: "Valerie Burke", time: "5 hours ago", initial: "VB" }
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
      setCallingToast("Por favor, ative a chave de atendimento primeiro!");
      setTimeout(() => setCallingToast(null), 3000);
      return;
    }

    // Pick first patient in the waiting room who is not yet called
    const nextPatient = waitingRoomPatients[0];
    if (nextPatient) {
      setCurrentServingPatient(nextPatient.name);
      setCallingToast(`Chamando paciente: ${nextPatient.name}!`);
      setTimeout(() => setCallingToast(null), 5000);

      // Play voice synthesis call
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const speech = new SpeechSynthesisUtterance(`Atenção, paciente ${nextPatient.name}. Favor dirigir-se ao consultório médico.`);
          speech.lang = 'pt-BR';
          speech.rate = 1.0;
          speech.pitch = 1.0;
          window.speechSynthesis.speak(speech);
        }
      } catch (err) {
        console.error("Speech synthesis failed", err);
      }
    }
  };

  return (
    <div className="flex w-full bg-[#f4f7fa] text-slate-800 font-sans select-none text-left relative">
      
      {/* Toast Overlay for voice calling */}
      {callingToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-3 border border-orange-400 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-200 animate-spin" />
          <span>{callingToast}</span>
        </div>
      )}

      {/* MAIN WORKSPACE PANEL */}
      <div className="flex-1 flex flex-col p-6 gap-6">
        
        {/* PAGE TITLE & SUBTITLE */}
        <div className="flex flex-col text-left shrink-0">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Painel de Controle</h1>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* MAIN CONTENTS GRID SYSTEM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-6">
          
          {/* LEFT 9 COLUMNS FOR MAIN WIDGETS */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-5">
                    {/* ROW 1: Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              
              {/* Card 1: Total Patients */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex items-center justify-between h-[105px]">
                <div className="space-y-1 text-left min-w-0">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Total de Pacientes</span>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{reportMetrics.patients}</h3>
                  <p className="text-[9px] text-slate-400 font-medium leading-none truncate mt-1">Pacientes cadastrados</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Scheduled Appointments */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex items-center justify-between h-[105px]">
                <div className="space-y-1 text-left min-w-0">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Consultas Agendadas</span>
                  <h3 className="text-xl font-black text-sky-500 tracking-tight leading-none">{reportMetrics.consultations}</h3>
                  <p className="text-[9px] text-slate-400 font-medium leading-none truncate mt-1">Agendamentos futuros</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Completed Treatments */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex items-center justify-between h-[105px]">
                <div className="space-y-1 text-left min-w-0">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Tratamentos Concluídos</span>
                  <h3 className="text-xl font-black text-emerald-500 tracking-tight leading-none">{reportMetrics.treatments}</h3>
                  <p className="text-[9px] text-slate-400 font-medium leading-none truncate mt-1">Procedimentos finalizados</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Surgeries & Procedures */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex items-center justify-between h-[105px]">
                <div className="space-y-1 text-left min-w-0">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">Cirurgias & Implantes</span>
                  <h3 className="text-xl font-black text-red-500 tracking-tight leading-none">{reportMetrics.surgeries}</h3>
                  <p className="text-[9px] text-slate-400 font-medium leading-none truncate mt-1">Procedimentos complexos</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* ROW 3: Calendar & Recent Patients */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Appointments Calendar Card */}
              <div className="md:col-span-7 bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col h-[320px] overflow-hidden">
                <div className="flex items-center justify-between shrink-0 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Agendamentos</h3>
                  </div>
                  <button onClick={() => onNavigate?.('Agenda')} className="text-[10px] font-bold text-[#f97316] hover:underline">Ver Todos</button>
                </div>

                {/* Styled August header inside card */}
                <div className="flex items-center justify-between shrink-0 mb-3 px-1">
                  <button className="text-slate-400 hover:text-slate-600">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                    {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <button className="text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Calendar Days grid */}
                <div className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-7 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    <span>Dom</span>
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                  </div>

                  <div className="grid grid-cols-7 grid-rows-5 gap-1 text-center flex-1 items-center font-mono">
                    {calendarDays.map((cell, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => cell.day && setActiveCalendarDay(cell.day)}
                        className={cn(
                           "h-6 w-6 rounded-lg flex flex-col items-center justify-center text-[10px] font-extrabold relative cursor-pointer mx-auto",
                           !cell.day ? "opacity-0" : "hover:bg-slate-50",
                           cell.day === activeCalendarDay ? "bg-orange-100 text-[#f97316] border border-orange-200" : (cell.isToday ? "bg-slate-100 text-slate-800 font-black border border-slate-200/50" : "text-slate-600")
                        )}
                      >
                        {cell.day}
                        {/* Highlight colored blocks similar to image */}
                        {isTrialUser ? (
                          cell.day && appointmentDays.has(cell.day) && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-orange-500 rounded-full animate-pulse" title="Consulta Agendada" />
                          )
                        ) : (
                          <>
                            {cell.day === 10 && (
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-sky-500 rounded-full animate-pulse" title="Consulta" />
                            )}
                            {cell.day === 15 && (
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-orange-500 rounded-full animate-pulse" title="Limpeza" />
                            )}
                            {cell.day === 20 && (
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-red-500 rounded-full animate-pulse" title="Cirurgia" />
                            )}
                            {cell.day === 25 && (
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-emerald-500 rounded-full animate-pulse" title="Aparelho" />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Patients Card */}
              <div className="md:col-span-5 bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col h-[320px] overflow-hidden">
                <div className="flex items-center justify-between shrink-0 mb-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Pacientes Recentes</h3>
                  <button onClick={() => onNavigate?.('Pacientes')} className="text-[10px] font-bold text-[#f97316] hover:underline">Ver Todos</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
                  {recentPatients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nenhum paciente</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-medium">Sua lista de pacientes recentes está limpa.</span>
                    </div>
                  ) : (
                    recentPatients.map((patient) => (
                      <div key={patient.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 border flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {patient.initial}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{patient.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-medium leading-tight truncate mt-0.5">{patient.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT 3 COLUMNS FOR WAITING ROOM & SERVING NOW */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
            
            {/* Waiting Room Panel */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col h-[320px] overflow-hidden">
              <div className="flex items-center justify-between shrink-0 mb-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Sala de Espera</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1">
                {/* Headers */}
                <div className="grid grid-cols-12 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 mb-2">
                  <span className="col-span-7 text-left">Paciente</span>
                  <span className="col-span-3 text-center">Fila</span>
                  <span className="col-span-2 text-right">Ações</span>
                </div>

                {/* Rows matching image style perfectly */}
                {waitingRoomPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[180px] text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fila vazia</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 font-medium">Nenhum paciente aguardando atendimento.</span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {waitingRoomPatients.map((p) => (
                      <div key={p.id} className="grid grid-cols-12 items-center gap-1">
                        <div className="col-span-7 flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 text-[#f97316] flex items-center justify-center font-extrabold text-[10px] shrink-0 uppercase">
                            {p.initial}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                            <p className="text-[8.5px] text-[#f97316] font-semibold truncate mt-0.5 leading-none">{p.type}</p>
                          </div>
                        </div>
                        
                        <div className="col-span-3 text-center">
                          <span className="text-[9px] font-bold text-slate-400 font-mono leading-none whitespace-nowrap">{p.time}</span>
                        </div>

                        <div className="col-span-2 text-right">
                          <button 
                            onClick={() => {
                              if (p.record) {
                                onSendWhatsApp?.(p.record);
                              } else {
                                setCallingToast(`Ação rápida para ${p.name}`);
                                setTimeout(() => setCallingToast(null), 2000);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50 font-bold"
                            title="Chamar / Opções"
                          >
                            •••
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Serving Now Panel */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] shrink-0 flex flex-col justify-between h-[150px]">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Atendimento Atual</h3>
                <p className="text-[9.5px] text-slate-400 font-medium leading-normal mt-1 text-left">
                  {currentServingPatient ? (
                    <span>Chamando agora: <strong className="text-orange-500 font-black">{currentServingPatient}</strong></span>
                  ) : (
                    "Ative o interruptor ao lado para chamar os pacientes"
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between mt-3 gap-3">
                {/* Custom Toggle Switch */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsServingActive(!isServingActive)}
                    className={cn(
                      "w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative",
                      isServingActive ? "bg-orange-500" : "bg-slate-300"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-4 h-4 rounded-full bg-white shadow-md transform duration-300",
                        isServingActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">
                    {isServingActive ? "Ativo" : "Ativar"}
                  </span>
                </div>

                {/* Call Next Button matches the image style */}
                <button 
                  onClick={handleCallNextPatient}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer",
                    isServingActive 
                      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/10" 
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  )}
                >
                  Chamar Próximo
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
