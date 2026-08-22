/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  LayoutList, 
  Grid, 
  Users, 
  Activity, 
  Heart, 
  Settings, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  XCircle, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  MessageSquare,
  DollarSign,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Stethoscope,
  Send,
  X,
  Sparkles,
  Download,
  AlertTriangle,
  Cake,
  ExternalLink,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { format, parseISO, isValid, isWithinInterval, startOfMonth, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { DentalRecord } from '../types';

interface PatientsViewProps {
  data: DentalRecord[];
  patients: any[];
  onOpenChart: (id: string) => void;
  onOpenEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onViewDetail?: (p: any) => void;
  onQuickBook?: (patientIdOrName: string) => void;
  currentUserRole?: string;
  canSeeFinancials?: boolean;
  clinicName?: string;
}

export default function PatientsView({
  data,
  patients,
  onOpenChart,
  onOpenEdit,
  onDelete,
  onAdd,
  onViewDetail,
  onQuickBook,
  currentUserRole,
  canSeeFinancials = true,
  clinicName = 'Oral Admin Odontologia'
}: PatientsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'agendados' | 'sem_retorno' | 'aniversariantes'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const itemsPerPage = viewMode === 'list' ? 10 : 12;

  // WhatsApp quick modal state
  const [whatsappModalPatient, setWhatsappModalPatient] = useState<any | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<'lembrete' | 'retorno' | 'aniversario' | 'personalizada'>('lembrete');
  const [customMessageText, setCustomMessageText] = useState('');

  // Quick Patient Detail Drawer Modal state
  const [detailPatient, setDetailPatient] = useState<any | null>(null);

  const canDelete = currentUserRole?.toLowerCase() === 'admin' || currentUserRole?.toLowerCase() === 'dentista';

  // Enriched patients list with appointment history, financial calculations and dates
  const allPatients = useMemo(() => {
    const now = new Date();

    return (patients || []).filter(p => p && typeof p === 'object').map(pat => {
      const patientName = pat.name || 'Paciente Sem Nome';
      const patientRecords = (data || []).filter(r => r && r.paciente === patientName);
      const totalSpent = patientRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
      
      const sortedByDate = [...patientRecords]
        .filter(r => r && r.data && isValid(parseISO(r.data)))
        .sort((a, b) => {
          try {
            return parseISO(b.data).getTime() - parseISO(a.data).getTime();
          } catch { 
            return 0; 
          }
        });

      const lastVisit = sortedByDate.length > 0 
        ? sortedByDate[0].data 
        : pat.createdAt || pat.dataCadastro || null;

      const upcomingAppt = patientRecords
        .filter(r => r.status === 'Agendado' && r.data && isValid(parseISO(r.data)) && parseISO(r.data) >= now)
        .sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime())[0];

      // Calculate months since last visit
      let monthsSinceLastVisit = 0;
      if (lastVisit && isValid(parseISO(lastVisit))) {
        monthsSinceLastVisit = differenceInMonths(now, parseISO(lastVisit));
      }

      // Check birthday this month
      let isBirthdayMonth = false;
      const bDateStr = pat.birthDate || pat.dataNascimento;
      if (bDateStr) {
        try {
          const bDate = parseISO(bDateStr);
          if (isValid(bDate)) {
            isBirthdayMonth = bDate.getMonth() === now.getMonth();
          }
        } catch {}
      }
      
      return {
        id: pat.id,
        name: patientName,
        lastVisit,
        monthsSinceLastVisit,
        upcomingApptDate: upcomingAppt ? upcomingAppt.data : null,
        upcomingApptTime: upcomingAppt ? upcomingAppt.horario : null,
        upcomingApptProcedure: upcomingAppt ? upcomingAppt.procedimento : null,
        upcomingApptDentist: upcomingAppt ? upcomingAppt.dentista : null,
        totalSpent,
        proceduresCount: patientRecords.length,
        records: patientRecords,
        isBirthdayMonth,
        allergies: pat.allergies || pat.alergias || '',
        ...pat
      };
    });
  }, [data, patients]);

  // Filtering
  const filteredPatients = useMemo(() => {
    return allPatients
      .filter(p => {
        const matchesSearch = 
          (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.cpf || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.phone || p.telefone || p.celular || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === 'ativos') {
          return p.proceduresCount > 0;
        }
        if (statusFilter === 'agendados') {
          return !!p.upcomingApptDate;
        }
        if (statusFilter === 'sem_retorno') {
          return p.monthsSinceLastVisit >= 6;
        }
        if (statusFilter === 'aniversariantes') {
          return p.isBirthdayMonth;
        }

        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allPatients, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000;
    
    return {
      total: allPatients.length,
      withAppointments: allPatients.filter(p => !!p.upcomingApptDate).length,
      needRecall: allPatients.filter(p => p.monthsSinceLastVisit >= 6).length,
      birthdays: allPatients.filter(p => p.isBirthdayMonth).length
    };
  }, [allPatients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, viewMode]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-cyan-600 text-white', 
      'bg-indigo-600 text-white', 
      'bg-emerald-600 text-white', 
      'bg-amber-600 text-white', 
      'bg-rose-600 text-white', 
      'bg-slate-800 text-white'
    ];
    const index = (name || 'A').charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Open WhatsApp Modal with pre-configured template
  const handleOpenWhatsAppModal = (patient: any) => {
    setWhatsappModalPatient(patient);
    const firstName = (patient.name || 'Paciente').split(' ')[0];
    
    if (patient.upcomingApptDate) {
      setWhatsappTemplate('lembrete');
      setCustomMessageText(
        `Olá, *${firstName}*! 👋 Lembramos que você tem consulta agendada na clínica *${clinicName}* para o dia ${patient.upcomingApptDate} às ${patient.upcomingApptTime || 'horário marcado'} com ${patient.upcomingApptDentist || 'Dr(a)'}. Responda SIM para confirmar sua presença! 🦷`
      );
    } else if (patient.isBirthdayMonth) {
      setWhatsappTemplate('aniversario');
      setCustomMessageText(
        `Olá, *${firstName}*! 🎉 A equipe da clínica *${clinicName}* deseja a você um feliz aniversário com muita saúde e muitos motivos para sorrir! Parabéns!`
      );
    } else {
      setWhatsappTemplate('retorno');
      setCustomMessageText(
        `Olá, *${firstName}*! Aqui é da clínica *${clinicName}*. Gostaria de convidá-lo(a) para agendar uma avaliação preventiva e limpeza para manter seu sorriso saudável! Vamos marcar um horário?`
      );
    }
  };

  const handleSendWhatsAppDirect = () => {
    if (!whatsappModalPatient) return;
    const phoneStr = whatsappModalPatient.phone || whatsappModalPatient.telefone || whatsappModalPatient.celular || '';
    if (!phoneStr) {
      alert('Paciente não possui número de WhatsApp cadastrado.');
      return;
    }
    const cleanNumber = phoneStr.replace(/\D/g, '');
    const fullNumber = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber;
    const encoded = encodeURIComponent(customMessageText);
    
    window.open(`https://wa.me/${fullNumber}?text=${encoded}`, '_blank');
    setWhatsappModalPatient(null);
  };

  // Export Patients to CSV
  const handleExportCSV = () => {
    if (filteredPatients.length === 0) {
      alert('Nenhum paciente para exportar.');
      return;
    }

    const headers = ['Nome', 'CPF', 'Telefone', 'Email', 'Ultima_Consulta', 'Total_Gasto', 'Qtd_Procedimentos'];
    const rows = filteredPatients.map(p => [
      `"${p.name || ''}"`,
      `"${p.cpf || ''}"`,
      `"${p.phone || p.telefone || ''}"`,
      `"${p.email || ''}"`,
      `"${p.lastVisit || ''}"`,
      `"${p.totalSpent || 0}"`,
      `"${p.proceduresCount || 0}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pacientes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      
      {/* Top Header & Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>Fichas & Prontuários</span>
          </h1>
          <span className="text-xs text-slate-300 font-semibold">•</span>
          <span className="text-xs text-slate-500 font-medium">
            {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes cadastrados'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            title="Exportar lista de pacientes em CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-0.5 border border-slate-200/60 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              title="Visualização em Lista"
              className={cn(
                "p-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer",
                viewMode === 'list' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              title="Visualização em Grade"
              className={cn(
                "p-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer",
                viewMode === 'grid' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* New Patient Button */}
          <button 
            onClick={onAdd}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-brand-cyan hover:bg-slate-900 text-white px-3.5 py-1.5 font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Paciente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de Pacientes</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Fichas ativas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-brand-cyan border border-cyan-100 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Com Consultas Agendadas</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.withAppointments}</p>
            <span className="text-[10px] font-bold text-brand-cyan flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" /> Na agenda da clínica
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sem Retorno (&gt;6 meses)</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.needRecall}</p>
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Oportunidade de recall
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Aniversariantes do Mês</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats.birthdays}</p>
            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
              <Cake className="w-3 h-3" /> Enviar felicitações
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <Cake className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, telefone ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'ativos', label: 'Com Histórico' },
            { id: 'agendados', label: 'Agendados' },
            { id: 'sem_retorno', label: 'Sem Retorno (+6m)' },
            { id: 'aniversariantes', label: 'Aniversariantes' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === f.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Patient Content: List or Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">Nenhum paciente encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não encontramos pacientes com os filtros aplicados. Tente ajustar o termo de busca ou adicione um novo paciente.
          </p>
          <button
            onClick={onAdd}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-cyan text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs hover:bg-slate-900 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Paciente Agora</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <th className="py-4 px-6">Paciente</th>
                  <th className="py-4 px-4">Contatos</th>
                  <th className="py-4 px-4">Última Visita</th>
                  <th className="py-4 px-4">Próxima Consulta</th>
                  {canSeeFinancials && <th className="py-4 px-4 text-right">Total Investido</th>}
                  <th className="py-4 px-6 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {currentPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                    
                    {/* Patient Name + Avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs", getAvatarColor(p.name))}>
                          {(p.name || 'P').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 hover:text-brand-cyan cursor-pointer transition-colors" onClick={() => onOpenChart(p.id)}>
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {p.cpf ? `CPF: ${p.cpf}` : 'Sem CPF'}
                          </p>
                          {p.allergies && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> {p.allergies}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contacts (WhatsApp / Email) */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{p.phone || p.telefone || p.celular || 'Não informado'}</span>
                        </div>
                        {p.email && (
                          <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                            <Mail className="w-3 h-3 text-slate-300" />
                            <span className="truncate max-w-[150px]">{p.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Last Visit */}
                    <td className="py-4 px-4">
                      {p.lastVisit && isValid(parseISO(p.lastVisit)) ? (
                        <div>
                          <p className="font-bold text-slate-800">{format(parseISO(p.lastVisit), 'dd/MM/yyyy')}</p>
                          <span className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                            p.monthsSinceLastVisit >= 6 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {p.monthsSinceLastVisit === 0 ? 'Este mês' : `${p.monthsSinceLastVisit}m atrás`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Novo Cadastro</span>
                      )}
                    </td>

                    {/* Next Appointment */}
                    <td className="py-4 px-4">
                      {p.upcomingApptDate ? (
                        <div>
                          <p className="font-black text-indigo-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {p.upcomingApptDate} às {p.upcomingApptTime}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{p.upcomingApptProcedure}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px] font-bold">Nenhum agendamento</span>
                      )}
                    </td>

                    {/* Financial Spent */}
                    {canSeeFinancials && (
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-slate-800">
                          R$ {p.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-normal">{p.proceduresCount} procedimentos</p>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* WhatsApp Direct Action */}
                        <button
                          onClick={() => handleOpenWhatsAppModal(p)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all cursor-pointer shadow-xs"
                          title="Enviar WhatsApp Direto"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Book Appointment */}
                        <button
                          onClick={() => {
                            if (onQuickBook) {
                              onQuickBook(p.name);
                            }
                          }}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all cursor-pointer shadow-xs"
                          title="Novo Agendamento para este Paciente"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        {/* Open Clinical Chart */}
                        <button
                          onClick={() => onOpenChart(p.id)}
                          className="p-2 bg-cyan-50 hover:bg-brand-cyan hover:text-white text-brand-cyan rounded-xl transition-all cursor-pointer shadow-xs"
                          title="Abrir Prontuário Clínico"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Open Detail Drawer */}
                        <button
                          onClick={() => setDetailPatient(p)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs"
                          title="Ver Ficha Cadastral Completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Patient */}
                        <button
                          onClick={() => onOpenEdit(p.id)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs"
                          title="Editar Cadastro"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Patient (if allowed) */}
                        {canDelete && (
                          <button
                            onClick={() => onDelete(p.id)}
                            className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer shadow-xs"
                            title="Excluir Paciente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentPatients.map(p => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-brand-cyan/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-left"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs", getAvatarColor(p.name))}>
                      {(p.name || 'P').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 
                        onClick={() => onOpenChart(p.id)}
                        className="text-sm font-black text-slate-800 hover:text-brand-cyan cursor-pointer transition-colors truncate max-w-[170px]"
                      >
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {p.cpf ? `CPF: ${p.cpf}` : 'Sem CPF'}
                      </p>
                    </div>
                  </div>

                  {p.isBirthdayMonth && (
                    <span className="p-1.5 bg-rose-50 text-rose-500 rounded-xl text-xs" title="Aniversariante do Mês">
                      🎂
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[10px] text-slate-400 font-bold">WhatsApp:</span>
                    <span className="font-bold">{p.phone || p.telefone || 'Não informado'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[10px] text-slate-400 font-bold">Próx. Consulta:</span>
                    <span className="font-black text-indigo-600">
                      {p.upcomingApptDate ? `${p.upcomingApptDate} (${p.upcomingApptTime})` : 'Nenhum'}
                    </span>
                  </div>

                  {canSeeFinancials && (
                    <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-400 font-bold">Total Gasto:</span>
                      <span className="font-black text-emerald-600">
                        R$ {p.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenWhatsAppModal(p)}
                  className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => onOpenChart(p.id)}
                  className="flex-1 py-2 bg-brand-cyan hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Prontuário</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-600 shadow-sm">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP DIRECT MODAL */}
      <AnimatePresence>
        {whatsappModalPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Enviar WhatsApp Direto</h3>
                    <p className="text-[11px] text-slate-500">Para: {whatsappModalPatient.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setWhatsappModalPatient(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Template Buttons */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Escolha o Modelo:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'lembrete', label: 'Lembrete de Consulta' },
                    { id: 'retorno', label: 'Retorno Preventivo' },
                    { id: 'aniversario', label: 'Felicitações 🎂' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setWhatsappTemplate(t.id as any);
                        const fn = (whatsappModalPatient.name || 'Paciente').split(' ')[0];
                        if (t.id === 'lembrete') {
                          setCustomMessageText(
                            `Olá, *${fn}*! 👋 Lembramos que você tem consulta agendada na clínica *${clinicName}* para o dia ${whatsappModalPatient.upcomingApptDate || 'previsto'} às ${whatsappModalPatient.upcomingApptTime || 'horário marcado'}. Responda SIM para confirmar sua presença! 🦷`
                          );
                        } else if (t.id === 'aniversario') {
                          setCustomMessageText(
                            `Olá, *${fn}*! 🎉 A equipe da clínica *${clinicName}* deseja a você um feliz aniversário com muita saúde e alegria! Parabéns!`
                          );
                        } else {
                          setCustomMessageText(
                            `Olá, *${fn}*! Aqui é da clínica *${clinicName}*. Gostaria de convidá-lo(a) para agendar uma avaliação preventiva e limpeza. Vamos marcar um horário?`
                          );
                        }
                      }}
                      className={cn(
                        "text-xs font-black px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                        whatsappTemplate === t.id
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Message area */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Mensagem Formatada:</label>
                <textarea
                  rows={5}
                  value={customMessageText}
                  onChange={e => setCustomMessageText(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalPatient(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-2xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppDirect}
                  className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Disparar WhatsApp Agora</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK PATIENT DETAIL DRAWER / MODAL */}
      <AnimatePresence>
        {detailPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 text-left max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm", getAvatarColor(detailPatient.name))}>
                    {(detailPatient.name || 'P').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">{detailPatient.name}</h3>
                    <p className="text-xs text-slate-400">{detailPatient.cpf ? `CPF: ${detailPatient.cpf}` : 'Sem CPF registrado'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setDetailPatient(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">WhatsApp / Telefone</span>
                  <p className="font-bold text-slate-800">{detailPatient.phone || detailPatient.telefone || 'Não informado'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">E-mail</span>
                  <p className="font-bold text-slate-800 truncate">{detailPatient.email || 'Não informado'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Data de Nascimento</span>
                  <p className="font-bold text-slate-800">{detailPatient.birthDate || detailPatient.dataNascimento || 'Não informada'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Dentista Preferencial</span>
                  <p className="font-bold text-slate-800">{detailPatient.dentistaResponsavel || 'Geral da Clínica'}</p>
                </div>
              </div>

              {/* Alergias / Alertas */}
              {detailPatient.allergies && (
                <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span><strong>Alergias / Restrições Clínicas:</strong> {detailPatient.allergies}</span>
                </div>
              )}

              {/* Recent Consultations */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Histórico Recente de Procedimentos ({detailPatient.records.length})</h4>
                {detailPatient.records.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">Nenhum atendimento registrado ainda.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detailPatient.records.map((r: any) => (
                      <div key={r.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{r.procedimento}</p>
                          <p className="text-[10px] text-slate-400">{r.data} • {r.dentista}</p>
                        </div>
                        <span className="font-black text-slate-700">R$ {Number(r.valor).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const pid = detailPatient.id;
                    setDetailPatient(null);
                    onOpenChart(pid);
                  }}
                  className="flex-1 py-3 bg-brand-cyan hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Abrir Prontuário Completo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
