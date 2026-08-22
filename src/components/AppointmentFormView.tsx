/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Stethoscope, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  MessageSquare, 
  Plus, 
  DollarSign, 
  Info, 
  Phone, 
  FileText,
  ChevronRight,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';
import { format, parseISO, isValid, addDays, isWeekend, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { DentalRecord } from '../types';
import {
  CLINIC_TIME_SLOTS,
  CLINIC_OPEN_TIME,
  CLINIC_CLOSE_TIME,
  APPOINTMENT_DURATION_MINUTES,
  getSystemInitialDate,
  isBusinessDay,
  getNextBusinessDay,
  normalizeAppointmentDateTime,
  getOccupiedSlotsForDentist,
  findDentistScheduleConflict,
  minutesToTime,
  timeToMinutes
} from '../lib/scheduleUtils';

interface AppointmentFormViewProps {
  patients: any[];
  data: DentalRecord[];
  users: any[];
  onSave: (appointment: any) => Promise<boolean>;
  onBack: () => void;
  presetPatient?: string;
  isClinicalRecord?: boolean;
  clinicName?: string;
  onQuickAddPatient?: (patientData: any) => Promise<string | null>;
}

export const PROCEDURES_CATALOG = [
  { name: 'Avaliação Inicial & Diagnóstico', price: 150, durationMin: 90, category: 'Diagnóstico' },
  { name: 'Profilaxia e Limpeza Dental (Tartarectomia)', price: 180, durationMin: 90, category: 'Prevenção' },
  { name: 'Restauração em Resina Composta (1 Face)', price: 220, durationMin: 90, category: 'Dentística' },
  { name: 'Restauração Complexa (Multi-faces)', price: 320, durationMin: 90, category: 'Dentística' },
  { name: 'Extração Dentária Simples', price: 250, durationMin: 90, category: 'Cirurgia' },
  { name: 'Extração de Terceiro Molar (Siso Incluso)', price: 550, durationMin: 90, category: 'Cirurgia' },
  { name: 'Tratamento Endodôntico (Canal Unirradicular)', price: 480, durationMin: 90, category: 'Endodontia' },
  { name: 'Tratamento Endodôntico (Canal Molar)', price: 750, durationMin: 90, category: 'Endodontia' },
  { name: 'Clareamento Dental a Laser / Consultório', price: 850, durationMin: 90, category: 'Estética' },
  { name: 'Clareamento Dental Caseiro c/ Moldeiras', price: 450, durationMin: 90, category: 'Estética' },
  { name: 'Gengivoplastia / Periodontia', price: 380, durationMin: 90, category: 'Periodontia' },
  { name: 'Aplicação Tópica de Flúor / Selante', price: 120, durationMin: 90, category: 'Prevenção' },
  { name: 'Manutenção de Aparelho Ortodôntico', price: 160, durationMin: 90, category: 'Ortodontia' },
  { name: 'Instalação de Prótese / Coroa Provisória', price: 400, durationMin: 90, category: 'Prótese' },
  { name: 'Implante Dentário (Etapa Cirúrgica)', price: 1800, durationMin: 90, category: 'Implantodontia' },
  { name: 'Consulta de Emergência / Alívio de Dor', price: 200, durationMin: 90, category: 'Urgência' },
];

export default function AppointmentFormView({
  patients,
  data,
  users,
  onSave,
  onBack,
  presetPatient = '',
  isClinicalRecord = false,
  clinicName = 'Oral Admin Odontologia',
  onQuickAddPatient
}: AppointmentFormViewProps) {
  const [paciente, setPaciente] = useState(presetPatient);
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [showQuickNewPatient, setShowQuickNewPatient] = useState(false);
  
  // Quick patient modal form state
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientCpf, setNewPatientCpf] = useState('');

  // Date and Time selection (Regra: Segunda a Sexta, até 17:00, slots de 1h30)
  const initialDate = getSystemInitialDate();
  const [dataVal, setDataVal] = useState(initialDate);
  const [horario, setHorario] = useState('');
  
  // Dentist selection
  const [dentista, setDentista] = useState('');
  
  // Procedure & Price
  const [procedimento, setProcedimento] = useState(PROCEDURES_CATALOG[0].name);
  const [valor, setValor] = useState(PROCEDURES_CATALOG[0].price.toString());
  const [observacao, setObservacao] = useState('');
  const [appointmentTag, setAppointmentTag] = useState<'Normal' | 'Primeira Vez' | 'Urgência' | 'Retorno' | 'Convenio'>('Normal');
  
  // Automation settings
  const [sendAutoWhatsapp, setSendAutoWhatsapp] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dentists list derived from users or defaults
  const dentistList = useMemo(() => {
    const fromUsers = users
      .filter(u => u.role === 'Dentista' || u.role === 'Admin' || u.role === 'SuperAdmin')
      .map(u => ({
        id: u.id || u.username,
        name: u.name,
        cro: u.cro || 'CRO-SP 10293',
        specialty: u.specialty || (u.role === 'Admin' ? 'Responsável Técnico' : 'Cirurgião-Dentista')
      }));

    if (fromUsers.length > 0) return fromUsers;

    return [
      { id: '1', name: 'Dr. Roberto Silva', cro: 'CRO-SP 45892', specialty: 'Implantodontia & Prótese' },
      { id: '2', name: 'Dra. Maria Fernanda', cro: 'CRO-SP 78210', specialty: 'Ortodontia & Estética' },
      { id: '3', name: 'Dr. Carlos Eduardo', cro: 'CRO-SP 63145', specialty: 'Endodontia' },
      { id: '4', name: 'Dra. Camila Alves', cro: 'CRO-SP 89520', specialty: 'Clínica Geral & Periodontia' }
    ];
  }, [users]);

  // Set default dentist
  useEffect(() => {
    if (!dentista && dentistList.length > 0) {
      setDentista(dentistList[0].name);
    }
  }, [dentistList, dentista]);

  // Selected patient object
  const selectedPatientObj = useMemo(() => {
    return patients.find(p => p.id === paciente || p.name === paciente) || null;
  }, [patients, paciente]);

  // Filtered patients for searchable input
  const filteredPatientsList = useMemo(() => {
    const q = patientSearch.toLowerCase().trim();
    if (!q) return patients.slice(0, 15);
    return patients.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.cpf || '').includes(q) ||
      (p.phone || p.telefone || '').includes(q)
    ).slice(0, 15);
  }, [patients, patientSearch]);

  // Occupied slots calculation for selected dentist and date (1.5h intervals)
  const slotStatuses = useMemo(() => {
    if (!dentista || !dataVal) return [];
    return getOccupiedSlotsForDentist(data, dentista, dataVal);
  }, [data, dentista, dataVal]);

  const handleProcedureChange = (procName: string) => {
    setProcedimento(procName);
    const item = PROCEDURES_CATALOG.find(p => p.name === procName);
    if (item) {
      setValor(item.price.toString());
    }
  };

  const handleDateChange = (rawDate: string) => {
    if (!rawDate) return;
    const target = parseISO(rawDate);
    if (!isBusinessDay(target)) {
      const nextBiz = getNextBusinessDay(target, false);
      const nextBizStr = format(nextBiz, 'yyyy-MM-dd');
      alert('A clínica funciona exclusivamente de Segunda a Sexta-feira (até 17h00). A data selecionada caiu no final de semana e foi ajustada para a próxima segunda-feira útil.');
      setDataVal(nextBizStr);
    } else {
      setDataVal(rawDate);
    }
    setHorario('');
  };

  const handleDateShortcut = (daysToAdd: number) => {
    let target = addDays(new Date(), daysToAdd);
    target = getNextBusinessDay(target, false);
    const str = format(target, 'yyyy-MM-dd');
    setDataVal(str);
    setHorario('');
  };

  // WhatsApp formatted reminder preview
  const whatsappPreviewMessage = useMemo(() => {
    const patName = selectedPatientObj ? selectedPatientObj.name.split(' ')[0] : (paciente ? paciente.split(' ')[0] : 'Paciente');
    const formattedDate = dataVal && isValid(parseISO(dataVal)) ? format(parseISO(dataVal), "dd 'de' MMMM", { locale: ptBR }) : 'data marcada';
    const hour = horario ? `${horario} (Duração: 1h30)` : 'horário agendado';
    return `Olá, *${patName}*! 👋\n\nConfirmamos seu agendamento na clínica *${clinicName}*:\n\n📅 *Data:* ${formattedDate}\n⏰ *Horário:* ${hour}\n🩺 *Dentista:* ${dentista}\n📋 *Procedimento:* ${procedimento}\n\nPor favor, responda *SIM* para confirmar sua presença ou *REAGENDAR* caso precise de outro horário. Aguardamos você! 🦷✨`;
  }, [paciente, selectedPatientObj, dataVal, horario, dentista, procedimento, clinicName]);

  const handleSaveAppointment = async () => {
    if (!paciente) {
      alert('Por favor, selecione ou cadastre o paciente.');
      return;
    }
    if (!dentista) {
      alert('Por favor, selecione o dentista responsável.');
      return;
    }
    if (!dataVal) {
      alert('Por favor, informe a data do agendamento.');
      return;
    }
    if (!horario) {
      alert('Por favor, selecione o horário do agendamento.');
      return;
    }

    // Regra: Normaliza data e horário caso caia em fim de semana ou passe das 17h00
    const normalized = normalizeAppointmentDateTime(dataVal, horario);
    if (normalized.wasAdjusted) {
      const confirmAdjust = window.confirm(
        `${normalized.reason}\n\nDeseja confirmar o agendamento para ${format(parseISO(normalized.date), 'dd/MM/yyyy')} às ${normalized.time}?`
      );
      if (!confirmAdjust) return;
    }

    const finalDate = normalized.date;
    const finalTime = normalized.time;

    // Check 1.5h conflict for dentist on this date
    const conflict = findDentistScheduleConflict(data, dentista, finalDate, finalTime);
    if (conflict) {
      alert(
        `CONFLITO DE HORÁRIO: O(A) ${dentista} já possui consulta marcada (${conflict.horario} - ${conflict.paciente}) que colide com este intervalo de 1h30 no dia ${format(parseISO(finalDate), 'dd/MM/yyyy')}.\n\nPor favor, escolha outro horário disponível.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const patientPhone = selectedPatientObj?.phone || selectedPatientObj?.telefone || '';
      
      const payload = {
        paciente: selectedPatientObj ? selectedPatientObj.name : paciente,
        pacienteId: selectedPatientObj?.id,
        telefone: patientPhone,
        data: finalDate,
        horario: finalTime,
        dentista,
        procedimento,
        valor: Number(valor) || 0,
        observacao: observacao ? `[${appointmentTag}] ${observacao}` : `[${appointmentTag}]`,
        sendAutoWhatsapp,
        whatsappMessage: whatsappPreviewMessage
      };

      const success = await onSave(payload);
      if (success) {
        // If sendAutoWhatsapp is checked and patient has phone, trigger instant send
        if (sendAutoWhatsapp && patientPhone) {
          const cleanPhone = patientPhone.replace(/\D/g, '');
          const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
          const encoded = encodeURIComponent(whatsappPreviewMessage);
          
          // Show confirmation toast / open direct link
          const openDirect = window.confirm(`Agendamento realizado com sucesso! Deseja abrir o WhatsApp imediatamente para enviar a confirmação para ${selectedPatientObj?.name || paciente}?`);
          if (openDirect) {
            window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
          }
        }
        onBack();
      }
    } catch (e: any) {
      alert('Erro ao salvar agendamento: ' + (e.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onBack} 
            disabled={isSaving} 
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl transition-all cursor-pointer shadow-xs active:scale-95"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-brand-cyan tracking-widest bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 rounded-full">
                Agendamento Inteligente
              </span>
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">• Sistema com Automação de WhatsApp</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-0.5">
              {isClinicalRecord ? 'Registrar Atendimento Clínico' : 'Novo Agendamento de Consulta'}
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Verificação de Conflitos Ativa</span>
        </div>
      </div>

      {/* Main Grid: Form Left (7 cols) + Live Summary & WhatsApp Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Patient Selection */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-brand-cyan">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">1. Identificação do Paciente</h2>
              </div>

              {!showQuickNewPatient && (
                <button
                  type="button"
                  onClick={() => setShowQuickNewPatient(true)}
                  className="text-xs font-bold text-brand-cyan hover:text-cyan-700 flex items-center gap-1 cursor-pointer bg-cyan-50 hover:bg-cyan-100/70 px-2.5 py-1 rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo</span>
                </button>
              )}
            </div>

            {showQuickNewPatient ? (
              <div className="p-4 bg-cyan-50/40 border border-cyan-200/70 rounded-2xl space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-cyan" /> Cadastro Rápido de Paciente
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowQuickNewPatient(false)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    Voltar para busca
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo *</label>
                    <input 
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={newPatientName}
                      onChange={e => {
                        setNewPatientName(e.target.value);
                        setPaciente(e.target.value);
                      }}
                      className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp / Celular *</label>
                    <input 
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={newPatientPhone}
                      onChange={e => setNewPatientPhone(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 bg-white/80 p-2 rounded-xl border border-slate-200/60 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>O paciente será vinculado e poderá receber as confirmações automáticas.</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={selectedPatientObj ? selectedPatientObj.name : (paciente || patientSearch)}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setPaciente(e.target.value);
                      setIsPatientDropdownOpen(true);
                    }}
                    onFocus={() => setIsPatientDropdownOpen(true)}
                    placeholder="Digite o nome, CPF ou telefone do paciente..."
                    className="w-full pl-10 pr-10 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {paciente && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaciente('');
                        setPatientSearch('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isPatientDropdownOpen && filteredPatientsList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto p-1.5">
                    {filteredPatientsList.map(pat => (
                      <div
                        key={pat.id || pat.name}
                        onClick={() => {
                          setPaciente(pat.name);
                          setPatientSearch('');
                          setIsPatientDropdownOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-cyan-50/60 cursor-pointer flex items-center justify-between text-left transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{pat.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {pat.cpf ? `CPF: ${pat.cpf} ` : ''}
                            {pat.phone || pat.telefone ? `• Cel: ${pat.phone || pat.telefone}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-black uppercase text-brand-cyan bg-cyan-50 px-2 py-0.5 rounded-md">
                          Selecionar
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected patient preview chip */}
            {selectedPatientObj && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-cyan text-white font-black text-xs flex items-center justify-center">
                    {selectedPatientObj.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{selectedPatientObj.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {selectedPatientObj.phone || selectedPatientObj.telefone ? `WhatsApp: ${selectedPatientObj.phone || selectedPatientObj.telefone}` : 'Sem WhatsApp cadastrado'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-xl">
                  ✓ Ficha Vinculada
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Dentist Selection */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Stethoscope className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">2. Cirurgião-Dentista Responsável</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dentistList.map(dent => {
                const isSelected = dentista === dent.name;
                return (
                  <div
                    key={dent.name}
                    onClick={() => setDentista(dent.name)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 text-left",
                      isSelected
                        ? "bg-indigo-50/50 border-indigo-500/80 ring-2 ring-indigo-500/20"
                        : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/60"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                      isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {dent.name.split(' ')[1] ? dent.name.split(' ')[1][0] : 'D'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-800 truncate">{dent.name}</p>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-indigo-600 font-bold truncate">{dent.specialty}</p>
                      <p className="text-[9px] text-slate-400">{dent.cro}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Date & Time Scheduling Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">3. Data & Horário</h2>
              </div>

              {/* Date Quick Shortcuts */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleDateShortcut(0)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    dataVal === initialDate ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Próx. Disponível
                </button>
                <button
                  type="button"
                  onClick={() => handleDateShortcut(1)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  +1 Dia Útil
                </button>
                <button
                  type="button"
                  onClick={() => handleDateShortcut(3)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  +3 Dias Úteis
                </button>
              </div>
            </div>

            {/* Clinic schedule rule info banner */}
            <div className="p-3 bg-cyan-50/70 border border-cyan-200/60 rounded-2xl flex items-center gap-2.5 text-xs text-cyan-900 font-medium">
              <Info className="w-4 h-4 text-brand-cyan shrink-0" />
              <span>
                <strong>Horário Clínico:</strong> Segunda a Sexta, das 08h00 às 17h00. Cada atendimento possui <strong>1h30 de duração</strong> exclusiva.
              </span>
            </div>

            {/* Date Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Data Selecionada (Segunda a Sexta)</label>
                <input 
                  type="date"
                  value={dataVal}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Horário Escolhido (1h30)</label>
                <div className="mt-1 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-black text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {horario ? `${horario} hrs (até ${minutesToTime(timeToMinutes(horario) + 90)})` : 'Nenhum selecionado'}
                  </span>
                  {horario && (
                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                      1h30 Reservada
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Time Slot Grid */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-600">Grade de Horários Disponíveis (1h30):</span>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Livre</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Ocupado</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                {slotStatuses.map(({ slot, isOccupied, isPast, conflictingPatient }) => {
                  const isBlocked = isOccupied || isPast;
                  const isSelected = horario === slot;
                  const endSlot = minutesToTime(timeToMinutes(slot) + APPOINTMENT_DURATION_MINUTES);

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => setHorario(slot)}
                      className={cn(
                        "py-3 px-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border text-center relative",
                        isBlocked 
                          ? "bg-rose-50/50 text-rose-400 border-rose-100 cursor-not-allowed" 
                          : isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]"
                            : "bg-white text-slate-700 border-slate-200/80 hover:border-emerald-400 hover:bg-emerald-50/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-sm font-black">
                        <span>{slot}</span>
                        <span className="text-[10px] opacity-70">às {endSlot}</span>
                      </div>
                      
                      <div className="mt-1">
                        {isOccupied ? (
                          <span className="text-[9px] font-bold uppercase bg-rose-100/80 text-rose-700 px-2 py-0.5 rounded-md">
                            Ocupado {conflictingPatient ? `(${conflictingPatient.split(' ')[0]})` : ''}
                          </span>
                        ) : isPast ? (
                          <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md">
                            Horário Passado
                          </span>
                        ) : isSelected ? (
                          <span className="text-[9px] font-bold uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-md">
                            ✓ Selecionado
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">
                            Disponível
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 4: Procedure, Value & Tags */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">4. Procedimento & Honorários</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Procedimento</label>
                <select
                  value={procedimento}
                  onChange={e => handleProcedureChange(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none cursor-pointer"
                >
                  {PROCEDURES_CATALOG.map(proc => (
                    <option key={proc.name} value={proc.name}>
                      {proc.name} ({proc.durationMin}min - R$ {proc.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Valor Cobrado (R$)</label>
                <input 
                  type="number"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Appointment Tag Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Tipo / Tag do Agendamento</label>
              <div className="flex flex-wrap gap-2">
                {(['Normal', 'Primeira Vez', 'Urgência', 'Retorno', 'Convenio'] as const).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setAppointmentTag(tag)}
                    className={cn(
                      "text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                      appointmentTag === tag
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Observações Clínicas / Internas (Opcional)</label>
              <input 
                type="text"
                placeholder="Ex: Paciente com queixa de sensibilidade no dente 16..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="w-full mt-1 p-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-400 outline-none"
              />
            </div>
          </div>

        </div>

        {/* Right Column: Live Summary, Automation Preview & Actions */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Summary of Appointment */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase text-brand-cyan tracking-widest">Resumo do Agendamento</span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Paciente:</span>
                <span className="font-black text-slate-800 text-right truncate max-w-[200px]">
                  {selectedPatientObj?.name || paciente || 'Não selecionado'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Data & Hora:</span>
                <span className="font-black text-slate-800">
                  {dataVal && isValid(parseISO(dataVal)) ? format(parseISO(dataVal), 'dd/MM/yyyy') : '--/--'} às {horario || '--:--'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Dentista:</span>
                <span className="font-black text-slate-800 text-right">{dentista || 'Não selecionado'}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Procedimento:</span>
                <span className="font-bold text-slate-700 text-right truncate max-w-[200px]">{procedimento}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Classificação:</span>
                <span className="font-black text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                  {appointmentTag}
                </span>
              </div>
            </div>

            {/* Automation Toggle */}
            <div className="pt-3 border-t border-slate-100">
              <label className="flex items-start gap-3 p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl cursor-pointer hover:bg-cyan-50 transition-all">
                <input 
                  type="checkbox"
                  checked={sendAutoWhatsapp}
                  onChange={e => setSendAutoWhatsapp(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-brand-cyan rounded focus:ring-brand-cyan cursor-pointer"
                />
                <div>
                  <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-brand-cyan" />
                    Enviar Notificação Automática por WhatsApp
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Dispara confirmação com link interativo e dados completos da consulta direto no WhatsApp do paciente.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSaving || !paciente || !horario || !dentista}
                onClick={handleSaveAppointment}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  isSaving || !paciente || !horario || !dentista
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-brand-cyan hover:bg-slate-900 shadow-cyan-500/25 active:scale-98"
                )}
              >
                {isSaving ? (
                  <span>Gravando Agendamento...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Agendar Consulta</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onBack}
                disabled={isSaving}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                Cancelar e Voltar
              </button>
            </div>
          </div>

          {/* Card: Live WhatsApp Mockup Preview */}
          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Prévia da Mensagem WhatsApp
                </span>
              </div>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Chat Bubble Mockup */}
            <div className="bg-[#0b141a] p-3.5 rounded-2xl border border-slate-800 space-y-2 font-sans">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold border-b border-slate-800/80 pb-1.5">
                <span>{clinicName}</span>
                <span className="text-[9px] text-slate-500">• Conta Comercial Oficial</span>
              </div>

              <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                {whatsappPreviewMessage}
              </p>

              <div className="flex justify-end items-center gap-1 text-[9px] text-slate-500 pt-1">
                <span>Agora</span>
                <span className="text-cyan-400">✓✓</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              💡 As tags de paciente, data, horário e dentista são calculadas e enviadas instantaneamente via disparador direto.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
