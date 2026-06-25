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
  HelpCircle
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
  onFinish
}: ScheduleViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [removeAfterDrop, setRemoveAfterDrop] = useState(false);

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

  // Group appointments by date string "YYYY-MM-DD"
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, DentalRecord[]> = {};
    data.forEach(apt => {
      if (!apt.data) return;
      if (!map[apt.data]) {
        map[apt.data] = [];
      }
      map[apt.data].push(apt);
    });
    return map;
  }, [data]);

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
              <button className="px-3 py-1 bg-sky-50 text-[#0ea5e9] font-bold text-[10px] uppercase rounded-md">Mês</button>
              <button className="px-3 py-1 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase rounded-md cursor-pointer">Semana</button>
              <button className="px-3 py-1 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase rounded-md cursor-pointer">Dia</button>
            </div>
          </div>

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
            {daysGrid.map((day, dayIdx) => {
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
        </div>

        {/* Draggable Events Column */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Eventos Rápidos</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Marcadores de compromissos prontos para o dia selecionado</p>
          </div>

          {/* Draggable Tags List */}
          <div className="space-y-2">
            {STATIC_EVENT_TAGS.map(tag => (
              <div 
                key={tag.id}
                className={cn(
                  "px-3.5 py-3 rounded-xl border border-transparent shadow-xs text-xs font-black tracking-wider transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-95 flex items-center justify-between",
                  tag.color
                )}
              >
                <span>{tag.title}</span>
                <span className="text-[9px] opacity-75 font-mono">☉</span>
              </div>
            ))}
          </div>

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
    </div>
  );
}
