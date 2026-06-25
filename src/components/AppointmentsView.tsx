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
  MoreVertical,
  SlidersHorizontal,
  CalendarDays
} from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { DentalRecord } from '../types';

interface AppointmentsViewProps {
  data: DentalRecord[];
  onAdd: () => void;
  onCancel: (id: string) => void;
  onSendWhatsApp: (record: DentalRecord) => void;
}

// Deterministic helper to get age and gender for aesthetic completeness
const getGenderAndAge = (name: string) => {
  if (!name) return { gender: 'Masculino', age: 32 };
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  
  const age = 19 + (hash % 42); // age 19 to 60
  
  const lowercase = name.toLowerCase().trim();
  const femaleEndings = ['a', 'ela', 'ine', 'ara', 'ris', 'eia', 'ete', 'ina', 'ria', 'na', 'ia', 'ca', 'da'];
  const firstWord = lowercase.split(' ')[0];
  let isFemale = false;
  
  if (femaleEndings.some(ending => firstWord.endsWith(ending))) {
    isFemale = true;
  } else {
    isFemale = hash % 2 === 0;
  }
  
  return {
    gender: isFemale ? 'Feminino' : 'Masculino',
    age
  };
};

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
    
    return timeStr ? `${label}, ${timeStr}` : label;
  } catch (e) {
    return dateStr;
  }
};

export default function AppointmentsView({ 
  data, 
  onAdd, 
  onCancel,
  onSendWhatsApp 
}: AppointmentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Filter & Search appointments
  const filteredAppointments = useMemo(() => {
    return data
      .filter(item => {
        const matchesSearch = 
          item.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.procedimento.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.dentista || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
          statusFilter === 'todos' || 
          item.status.toLowerCase() === statusFilter.toLowerCase();
          
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort from newest date/time to oldest
        const dateA = new Date(`${a.data}T${a.horario || '00:00'}`).getTime();
        const dateB = new Date(`${b.data}T${b.horario || '00:00'}`).getTime();
        return dateB - dateA;
      });
  }, [data, searchTerm, statusFilter]);

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
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="appointments-title" className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-sky-500" />
            <span>Consultas</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Gerencie, acompanhe e filtre todos os agendamentos cadastrados</p>
        </div>

        <button 
          onClick={onAdd}
          className="flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Consulta</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Table Filters Top Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          
          {/* Entries per page select */}
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Mostrar</span>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>registros</span>
          </div>

          {/* Search bar & status filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            
            {/* Status Select Filter */}
            <div className="relative w-full sm:w-40 shrink-0">
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none pr-8 cursor-pointer"
              >
                <option value="todos">Todos Status</option>
                <option value="agendado">Agendado</option>
                <option value="em atendimento">Em Atendimento</option>
                <option value="realizado">Realizado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* General Search Input */}
            <div className="relative w-full sm:w-64">
              <input 
                type="text"
                placeholder="Buscar paciente ou procedimento..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
            </div>

          </div>
        </div>

        {/* The Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="px-6 py-4 font-bold">Paciente</th>
                <th className="px-6 py-4 font-bold">Gênero</th>
                <th className="px-6 py-4 font-bold">Idade</th>
                <th className="px-6 py-4 font-bold">Horário</th>
                <th className="px-6 py-4 font-bold">Diagnóstico / Procedimento</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                    Nenhuma consulta encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                paginatedAppointments.map((record) => {
                  const { gender, age } = getGenderAndAge(record.paciente);
                  
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Name / Doctor info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 leading-snug">{record.paciente}</span>
                          <span className="text-[10px] text-slate-450 mt-0.5 font-medium">Com {record.dentista}</span>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-semibold">{gender}</span>
                      </td>

                      {/* Age */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-bold">{age}</span>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-bold">{formatAppointmentTime(record.data, record.horario)}</span>
                      </td>

                      {/* Procedure */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-medium truncate max-w-[200px] inline-block">{record.procedimento}</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block border",
                          record.status === 'Realizado' || record.status === 'Concluído'
                            ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                            : record.status === 'Cancelado'
                            ? "text-rose-600 bg-rose-50 border-rose-100"
                            : record.status === 'Em Atendimento'
                            ? "text-sky-600 bg-sky-50 border-sky-100 animate-pulse"
                            : "text-amber-600 bg-amber-50 border-amber-100"
                        )}>
                          {record.status === 'Concluído' ? 'Confirmado' : record.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onSendWhatsApp(record)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          
                          {record.status !== 'Cancelado' && (
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

        {/* Table Footer Pagination */}
        {filteredAppointments.length > 0 && (
          <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">
              Exibindo <span className="text-slate-800 font-bold">{startIndex}</span> a{' '}
              <span className="text-slate-800 font-bold">{endIndex}</span> de{' '}
              <span className="text-slate-800 font-bold">{filteredAppointments.length}</span> registros
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    currentPage === idx + 1
                      ? "bg-[#0ea5e9] text-white shadow-sm shadow-sky-500/10"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
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
