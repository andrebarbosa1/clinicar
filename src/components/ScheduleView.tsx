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
  Sparkles,
  Info,
  Calendar,
  Layers,
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  X
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
  isSameDay, 
  isSameMonth, 
  parseISO,
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { DentalRecord } from '../types';

interface ScheduleViewProps {
  data: DentalRecord[];
  onAdd: () => void;
  onCancel: (id: string) => void;
  onStart?: (id: string) => void;
  onFinish?: (id: string) => void;
  onCreateAppointment?: (newAppt: any) => Promise<boolean>;
  users?: any[];
  currentUser?: any;
}

const STATIC_EVENT_TAGS = [
  { id: '1', title: 'ALMOÇO / INTERVALO', color: 'bg-sky-500 hover:bg-sky-600 text-white border-sky-600' },
  { id: '2', title: 'REUNIÃO GERAL', color: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' },
  { id: '3', title: 'COMPROMISSO PESSOAL', color: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-600' },
  { id: '4', title: 'CIRURGIA DETALHADA', color: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600' },
  { id: '5', title: 'ESTUDO DE CASO', color: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600' }
];

export default function ScheduleView({ 
  data, 
  onAdd, 
  onCancel,
  onStart,
  onFinish,
  onCreateAppointment,
  users = [],
  currentUser
}: ScheduleViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [removeAfterDrop, setRemoveAfterDrop] = useState(false);

  // Generate days in the current week based on selectedDate
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const hoursOfDay = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  const getAptsForHour = (hour: string, dayApts: DentalRecord[]) => {
    return dayApts.filter(apt => {
      if (!apt.horario) return false;
      const aptHour = apt.horario.split(':')[0];
      const targetHour = hour.split(':')[0];
      return aptHour === targetHour;
    });
  };

  const [activeTags, setActiveTags] = useState(STATIC_EVENT_TAGS);
  const [quickEventModal, setQuickEventModal] = useState<{
    tagId: string;
    title: string;
    color: string;
  } | null>(null);
  const [quickEventTime, setQuickEventTime] = useState('09:00');
  const [quickEventDentist, setQuickEventDentist] = useState('');
  const [quickEventNote, setQuickEventNote] = useState('');
  const [isSavingQuickEvent, setIsSavingQuickEvent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dentistList = useMemo(() => {
    const names = new Set(users.map(u => u.role === 'Dentista' || u.role === 'Admin' ? u.name : null).filter(Boolean));
    if (names.size === 0) return ['Dr. Silva', 'Dra. Maria', 'Dr. Ricardo', 'Dra. Ana'];
    return Array.from(names).sort() as string[];
  }, [users]);

  const handleTagClick = (tag: typeof STATIC_EVENT_TAGS[0]) => {
    setQuickEventModal({
      tagId: tag.id,
      title: tag.title,
      color: tag.color
    });
    const defaultDentist = currentUser?.name || dentistList[0] || 'Dr. Daniel Smith';
    setQuickEventDentist(defaultDentist);
    setQuickEventTime('12:00');
    setQuickEventNote('');
  };

  const handleSaveQuickEvent = async () => {
    if (!quickEventModal) return;
    setIsSavingQuickEvent(true);
    
    const newAppt = {
      paciente: quickEventModal.title,
      procedimento: 'Compromisso',
      dentista: quickEventDentist,
      data: format(selectedDate, 'yyyy-MM-dd'),
      horario: quickEventTime,
      valor: 0,
      observacao: quickEventNote || 'Criado via Eventos Rápidos',
      isQuickEvent: true,
      createdBy: currentUser?.email || currentUser?.name || ''
    };

    let success = false;
    if (onCreateAppointment) {
      success = await onCreateAppointment(newAppt);
    } else {
      console.log("Fallback save:", newAppt);
      success = true;
    }

    if (success) {
      if (removeAfterDrop) {
        setActiveTags(prev => prev.filter(t => t.id !== quickEventModal.tagId));
      }
      setToastMessage(`"${quickEventModal.title}" agendado às ${quickEventTime}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setQuickEventModal(null);
    }
    
    setIsSavingQuickEvent(false);
  };

  // Generate days in the current month grid
  const daysGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Handle month switches
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Filter data so quick events are only visible to the creator/dentist
  const visibleData = useMemo(() => {
    return data.filter(apt => {
      const isQuick = apt.procedimento === 'Compromisso' || (apt as any).isQuickEvent;
      if (!isQuick) return true; // Regular appointments are visible

      // It's a quick event. Visible ONLY if currentUser matches the creator/dentist.
      if (!currentUser) return false;
      
      const creatorEmail = (apt as any).createdBy || '';
      const dentistName = apt.dentista || '';
      
      const isCreator = 
        (currentUser.email && creatorEmail === currentUser.email) ||
        (currentUser.name && creatorEmail === currentUser.name) ||
        (currentUser.name && dentistName === currentUser.name);

      return isCreator;
    });
  }, [data, currentUser]);

  // Group appointments by date string "YYYY-MM-DD"
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

  // List of appointments on the selected day
  const selectedDayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointmentsByDate[dateStr] || [];
  }, [appointmentsByDate, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="schedule-title" className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#0ea5e9]" />
            <span>Agenda</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Navegação mensal interativa com eventos e consultas integradas</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleToday}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
          >
            Hoje
          </button>
          <button 
            onClick={onAdd}
            className="flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Calendar Core Section */}
        <div className="xl:col-span-3 bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Calendar Month Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs cursor-pointer transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs cursor-pointer transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>

            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs shrink-0">
              <button 
                onClick={() => setViewMode('month')}
                className={cn(
                  "px-3 py-1 font-bold text-[10px] uppercase rounded-md cursor-pointer transition-all",
                  viewMode === 'month' ? "bg-sky-50 text-[#0ea5e9]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Mês
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-3 py-1 font-bold text-[10px] uppercase rounded-md cursor-pointer transition-all",
                  viewMode === 'week' ? "bg-sky-50 text-[#0ea5e9]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Semana
              </button>
              <button 
                onClick={() => setViewMode('day')}
                className={cn(
                  "px-3 py-1 font-bold text-[10px] uppercase rounded-md cursor-pointer transition-all",
                  viewMode === 'day' ? "bg-sky-50 text-[#0ea5e9]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Dia
              </button>
            </div>
          </div>

          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <>
              {/* Weekdays Row */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/10 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>

              {/* Monthly Days Grid */}
              <div className="grid grid-cols-7 bg-slate-100/30">
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
                        "min-h-[105px] md:min-h-[120px] bg-white border-b border-r border-slate-100 p-2 flex flex-col justify-between transition-all cursor-pointer relative",
                        !isCurrent && "bg-slate-50/65 opacity-40",
                        isSelected && "ring-2 ring-sky-500/55 bg-sky-50/10 z-10",
                        isTodayDay && "bg-sky-50/20"
                      )}
                    >
                      {/* Day Number Row */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn(
                          "w-6 h-6 flex items-center justify-center text-xs font-bold rounded-lg leading-none",
                          isTodayDay && "bg-[#0ea5e9] text-white shadow-sm shadow-sky-500/25",
                          !isTodayDay && isCurrent && "text-slate-700",
                          !isCurrent && "text-slate-400"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayApts.length > 0 && (
                          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-1 py-0.5 rounded-md font-extrabold leading-none">
                            {dayApts.length}
                          </span>
                        )}
                      </div>

                      {/* Appointments indicators container */}
                      <div className="flex-1 overflow-y-auto space-y-1 mt-1 no-scrollbar max-h-[80px]">
                        {dayApts.slice(0, 3).map(apt => (
                          <div 
                            key={apt.id}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold border truncate shadow-xs",
                              apt.status === 'Realizado' || apt.status === 'Concluído'
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : apt.status === 'Cancelado'
                                ? "bg-rose-50 text-rose-700 border-rose-100 line-through"
                                : apt.status === 'Em Atendimento'
                                ? "bg-sky-50 text-sky-700 border-sky-100 animate-pulse"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            )}
                            title={`${apt.horario || '--:--'} - ${apt.paciente} (${apt.procedimento})`}
                          >
                            <span className="font-mono text-[8px] mr-0.5">{apt.horario || '--'}</span> {apt.paciente}
                          </div>
                        ))}
                        {dayApts.length > 3 && (
                          <div className="text-[8px] text-slate-400 font-extrabold text-center">
                            + {dayApts.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 bg-slate-50 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[400px]">
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayApts = appointmentsByDate[dateStr] || [];
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDay = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex flex-col min-h-[250px] p-3 bg-white transition-all cursor-pointer relative",
                      isSelected && "ring-2 ring-sky-500/55 bg-sky-50/5 z-10",
                      isTodayDay && "bg-sky-50/15"
                    )}
                  >
                    {/* Weekday Header */}
                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-start gap-1 pb-2 border-b border-slate-100 mb-2.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {format(day, 'E', { locale: ptBR })}
                      </span>
                      <span className={cn(
                        "w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg leading-none",
                        isTodayDay && "bg-[#0ea5e9] text-white shadow-sm shadow-sky-500/20",
                        !isTodayDay && isSelected && "bg-slate-100 text-slate-800",
                        !isTodayDay && !isSelected && "text-slate-600"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Day's appointments */}
                    <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar max-h-[300px]">
                      {dayApts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-6 text-center opacity-40">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Livre</span>
                        </div>
                      ) : (
                        dayApts.map(apt => (
                          <div 
                            key={apt.id}
                            className={cn(
                              "p-2.5 rounded-xl border text-[10px] font-bold space-y-1 shadow-xs transition-transform hover:scale-[1.01]",
                              apt.status === 'Realizado' || apt.status === 'Concluído'
                                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                : apt.status === 'Cancelado'
                                ? "bg-rose-50 text-rose-800 border-rose-100 line-through"
                                : apt.status === 'Em Atendimento'
                                ? "bg-sky-50 text-[#0ea5e9] border-sky-150 animate-pulse"
                                : "bg-amber-50 text-amber-800 border-amber-100"
                            )}
                            title={`${apt.horario || '--:--'} - ${apt.paciente} (${apt.procedimento})`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[9px] px-1 py-0.5 bg-white/65 rounded-md border border-slate-100">{apt.horario || '--:--'}</span>
                              {apt.procedimento === 'Compromisso' && (
                                <span className="text-[8px] bg-slate-900 text-white px-1 py-0.5 rounded uppercase font-extrabold">Atalho</span>
                              )}
                            </div>
                            <p className="truncate text-slate-800 font-extrabold mt-1">{apt.paciente}</p>
                            <p className="text-[9px] text-slate-400 font-medium truncate">{apt.procedimento}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div className="bg-white p-5 min-h-[400px] space-y-4">
              {/* Selected Day Info banner */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Visualização Diária</span>
                  <h3 className="text-base font-black text-slate-800">
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 bg-[#0ea5e9]/5 border border-[#0ea5e9]/10 px-3 py-1.5 rounded-xl">
                  <Clock className="w-4 h-4 text-[#0ea5e9]" />
                  <span className="text-xs font-bold text-[#0ea5e9]">
                    {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                {hoursOfDay.map(hour => {
                  const hourApts = getAptsForHour(hour, selectedDayAppointments);

                  return (
                    <div key={hour} className="flex items-start p-3 min-h-[70px] transition-all hover:bg-slate-50/30">
                      {/* Hour badge column */}
                      <div className="w-16 shrink-0 pt-0.5">
                        <span className="text-xs font-black text-slate-400 font-mono">{hour}</span>
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0 flex flex-wrap gap-2.5">
                        {hourApts.length === 0 ? (
                          <div 
                            onClick={() => {
                              setQuickEventModal({
                                tagId: 'personalizado',
                                title: 'Compromisso',
                                color: 'bg-slate-50 text-slate-600 border-slate-200'
                              });
                              setQuickEventTime(hour);
                              setQuickEventDentist(currentUser?.name || dentistList[0] || 'Dentista');
                              setQuickEventNote('');
                            }}
                            className="text-[10px] font-bold text-slate-400 bg-slate-50/50 hover:bg-slate-100/50 border border-dashed border-slate-200 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors w-full flex items-center justify-between select-none"
                          >
                            <span>Horário Disponível</span>
                            <span className="text-[9px] font-extrabold text-[#0ea5e9] uppercase tracking-wider">+ Agendar rápido</span>
                          </div>
                        ) : (
                          hourApts.map(apt => (
                            <div 
                              key={apt.id}
                              className={cn(
                                "flex-1 min-w-[240px] p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition-transform hover:scale-[1.005]",
                                apt.status === 'Realizado' || apt.status === 'Concluído'
                                  ? "bg-emerald-50/80 text-emerald-800 border-emerald-100"
                                  : apt.status === 'Cancelado'
                                  ? "bg-rose-50/80 text-rose-800 border-rose-100 line-through"
                                  : apt.status === 'Em Atendimento'
                                  ? "bg-sky-50/80 text-sky-850 border-sky-150"
                                  : "bg-amber-50/80 text-amber-800 border-amber-100"
                              )}
                            >
                              <div className="space-y-1 min-w-0 text-left">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono bg-white/70 px-1.5 py-0.5 rounded border border-slate-100">
                                    {apt.horario}
                                  </span>
                                  {apt.procedimento === 'Compromisso' && (
                                    <span className="text-[9px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">Atalho</span>
                                  )}
                                  <span className="text-[9.5px] font-bold text-slate-500">({apt.procedimento})</span>
                                </div>
                                <h4 className="text-xs font-black text-slate-800 truncate">{apt.paciente}</h4>
                                {apt.observacao && (
                                  <p className="text-[10px] text-slate-500 font-medium truncate italic">“{apt.observacao}”</p>
                                )}
                              </div>
                              
                              <div className="text-right shrink-0">
                                <span className="text-[9.5px] font-black text-slate-400 block uppercase">Dentista</span>
                                <span className="text-xs font-bold text-slate-700">{apt.dentista}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Draggable/Clickable Events Column */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Eventos Rápidos</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Marcadores de compromissos prontos para o dia selecionado</p>
          </div>

          {/* Active Tags List */}
          <div className="space-y-2">
            {activeTags.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                <p>Todos os marcadores foram utilizados.</p>
                <button 
                  onClick={() => setActiveTags(STATIC_EVENT_TAGS)} 
                  className="mt-2 text-[#0ea5e9] hover:underline font-bold cursor-pointer text-xs block mx-auto"
                >
                  Restaurar marcadores
                </button>
              </div>
            ) : (
              activeTags.map(tag => (
                <div 
                  key={tag.id}
                  onClick={() => handleTagClick(tag)}
                  title="Clique para agendar no dia selecionado"
                  className={cn(
                    "px-3.5 py-3 rounded-xl border border-transparent shadow-xs text-xs font-black tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-between",
                    tag.color
                  )}
                >
                  <span>{tag.title}</span>
                  <span className="text-[9px] opacity-75 font-mono">☉ Agendar</span>
                </div>
              ))
            )}
          </div>

          {activeTags.length < STATIC_EVENT_TAGS.length && (
            <div className="text-right">
              <button 
                onClick={() => setActiveTags(STATIC_EVENT_TAGS)} 
                className="text-[10px] text-[#0ea5e9] hover:underline font-bold cursor-pointer"
              >
                Restaurar todos os marcadores
              </button>
            </div>
          )}

          {/* Option Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3.5 cursor-pointer text-xs text-slate-600 font-bold select-none">
              <input 
                type="checkbox"
                checked={removeAfterDrop}
                onChange={(e) => setRemoveAfterDrop(e.target.checked)}
                className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500 bg-white"
              />
              <span>Remover após uso</span>
            </label>
          </div>

          {/* Create Button */}
          <button 
            onClick={onAdd}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Adicionar Novo Evento
          </button>

          {/* Active Date Panel info */}
          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-500 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Dia {format(selectedDate, 'dd/MM/yyyy')}
              </span>
            </div>
            
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
              {selectedDayAppointments.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-medium">Nenhuma consulta agendada para este dia.</p>
              ) : (
                selectedDayAppointments.map(apt => (
                  <div key={apt.id} className="p-2 bg-white border border-slate-100 rounded-lg flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 truncate">{apt.paciente}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{apt.horario || '--:--'} - {apt.procedimento}</p>
                    </div>
                    {onFinish && apt.status === 'Em Atendimento' && (
                      <button 
                        onClick={() => onFinish(apt.id)}
                        className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md shrink-0 cursor-pointer"
                        title="Finalizar"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Custom Quick Event Dialog */}
      {quickEventModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xl max-w-sm w-full space-y-4 relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setQuickEventModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Atalho de Evento</span>
              <h3 className="text-base font-black text-slate-800 tracking-tight mt-0.5">Agendar Evento Rápido</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Adicionando compromisso para o dia {format(selectedDate, 'dd/MM/yyyy')}</p>
            </div>

            {/* Event Preview Tag */}
            <div className={cn("p-3.5 rounded-xl text-center text-xs font-black tracking-wider border border-transparent shadow-xs", quickEventModal.color)}>
              {quickEventModal.title}
            </div>

            {/* Selection Fields */}
            <div className="space-y-3.5 pt-2">
              
              {/* Preset Time Slots */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Horário Sugerido</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuickEventTime(t)}
                      className={cn(
                        "py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                        quickEventTime === t 
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Time Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Ou Digite um Horário
                </label>
                <input
                  type="text"
                  placeholder="Ex: 09:30"
                  value={quickEventTime}
                  onChange={(e) => setQuickEventTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Dentist Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dentista / Responsável</span>
                </label>
                <select
                  value={quickEventDentist}
                  onChange={(e) => setQuickEventDentist(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  {dentistList.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Note input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sala de reunião 2"
                  value={quickEventNote}
                  onChange={(e) => setQuickEventNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                />
              </div>

            </div>

            {/* Modal Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickEventModal(null)}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickEvent}
                disabled={isSavingQuickEvent}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                {isSavingQuickEvent ? "Salvando..." : "Confirmar"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 z-50 border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
