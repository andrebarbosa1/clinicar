/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Globe, 
  Smartphone, 
  Calendar, 
  Clock, 
  FileText, 
  QrCode, 
  DollarSign, 
  CheckCircle2, 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Download, 
  Share2, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  Heart, 
  Copy, 
  Check, 
  AlertCircle,
  Plus,
  Send
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PatientPortalViewProps {
  clinicName: string;
  patients: any[];
  records: any[];
  documents: any[];
  doctorsList: string[];
  proceduresList: string[];
  onBookAppointment?: (newBooking: any) => void;
  onBackToSystem?: () => void;
}

export default function PatientPortalView({
  clinicName,
  patients,
  records,
  documents,
  doctorsList,
  proceduresList,
  onBookAppointment,
  onBackToSystem
}: PatientPortalViewProps) {
  // Selected simulated patient or guest
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'guest');
  const [activeTab, setActiveTab] = useState<'booking' | 'appointments' | 'documents' | 'payments'>('booking');

  // Booking state
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(proceduresList[0] || 'Limpeza & Profilaxia');
  const [selectedDoctor, setSelectedDoctor] = useState<string>(doctorsList[0] || 'Qualquer profissional disponível');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:30');
  const [patientNameInput, setPatientNameInput] = useState<string>('');
  const [patientPhoneInput, setPatientPhoneInput] = useState<string>('');
  const [patientCpfInput, setPatientCpfInput] = useState<string>('');
  const [patientEmailInput, setPatientEmailInput] = useState<string>('');
  const [lastBookedDoctor, setLastBookedDoctor] = useState<string>('');
  const [lastBookedPatientName, setLastBookedPatientName] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Copied Pix notification state
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  const currentPatient = patients.find(p => p.id === selectedPatientId) || {
    id: 'guest',
    name: 'Visitante / Novo Paciente',
    phone: '(11) 98888-7777',
    email: 'paciente@exemplo.com'
  };

  // Filter patient specific records & documents
  const patientRecords = records.filter(r => 
    r.pacienteId === currentPatient.id || 
    r.paciente?.toLowerCase() === currentPatient.name?.toLowerCase()
  );

  const patientDocs = documents.filter(d => 
    d.pacienteId === currentPatient.id || 
    d.paciente?.toLowerCase() === currentPatient.name?.toLowerCase()
  );

  const availableTimeSlots = [
    '08:30', '09:30', '10:15', '11:00', '14:00', '15:30', '16:45', '17:30'
  ];

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPatientName = currentPatient.id !== 'guest' ? currentPatient.name : (patientNameInput.trim() || 'Novo Paciente');
    const finalPhone = currentPatient.id !== 'guest' ? (currentPatient.phone || (currentPatient as any).telefone || '') : patientPhoneInput.trim();
    const finalCpf = currentPatient.id !== 'guest' ? (currentPatient.cpf || '') : patientCpfInput.trim();
    const finalEmail = currentPatient.id !== 'guest' ? (currentPatient.email || '') : patientEmailInput.trim();
    const patientId = currentPatient.id !== 'guest' ? currentPatient.id : `pat-${Date.now()}`;
    
    const newAppointment = {
      id: `booking-${Date.now()}`,
      paciente: finalPatientName,
      pacienteId: patientId,
      dentista: selectedDoctor,
      procedimento: selectedSpecialty,
      data: selectedDate,
      horario: selectedTimeSlot,
      status: 'Agendado',
      statusPagamento: 'Pendente',
      valor: 200,
      origem: 'Portal do Paciente',
      viaPortal: true,
      canal: 'Portal Online',
      telefone: finalPhone,
      cpf: finalCpf,
      email: finalEmail,
      observacao: `Agendado via Portal do Paciente Online para o(a) Dr(a). ${selectedDoctor}`
    };

    setLastBookedDoctor(selectedDoctor);
    setLastBookedPatientName(finalPatientName);

    if (onBookAppointment) {
      onBookAppointment(newAppointment);
    }

    setBookingSuccess(true);
  };

  const handleCopyPix = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900/5 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Navigation Bar / White-label Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToSystem && (
            <button
              onClick={onBackToSystem}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Painel</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-cyan to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-cyan-500/20">
              🦷
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <Globe className="w-3 h-3" />
                Portal do Paciente White-label
              </div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">{clinicName}</h1>
              <p className="text-xs text-slate-500">Agendamentos, receitas digitais e pagamentos 100% online</p>
            </div>
          </div>
        </div>

        {/* Patient Switcher for Demonstration */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <User className="w-4 h-4 text-brand-cyan shrink-0 ml-1" />
          <div className="text-left">
            <span className="text-[9px] font-black uppercase text-slate-400 block">Visualizar como:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setBookingSuccess(false);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
            >
              <option value="guest">Novo Paciente / Visitante</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'booking', label: 'Autoagendamento Online', icon: <Calendar className="w-4 h-4" /> },
          { id: 'appointments', label: `Minhas Consultas (${patientRecords.length})`, icon: <Clock className="w-4 h-4" /> },
          { id: 'documents', label: `Receitas & Atestados (${patientDocs.length})`, icon: <FileText className="w-4 h-4" /> },
          { id: 'payments', label: 'Pagamentos & Pix', icon: <DollarSign className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === tab.id
                ? "bg-brand-cyan text-white shadow-md shadow-cyan-500/25"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Autoagendamento Online */}
      {activeTab === 'booking' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-cyan" />
                Agendar Consulta Odontológica
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Escolha o procedimento, dentista e melhor horário disponível para seu atendimento.
              </p>
            </div>

            {bookingSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-emerald-900">Consulta Agendada com Sucesso!</h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 text-xs font-black">
                    <Globe className="w-3.5 h-3.5 text-cyan-700" />
                    Agendamento Realizado via Portal do Paciente
                  </div>
                  <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
                    O paciente <strong>{lastBookedPatientName || currentPatient.name}</strong> já está <strong>cadastrado no sistema</strong> e vinculado ao(à) profissional <strong>{lastBookedDoctor || selectedDoctor}</strong> para a especialidade <strong>{selectedSpecialty}</strong> no dia <strong>{selectedDate} às {selectedTimeSlot}</strong>.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      setActiveTab('appointments');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Ver Minhas Consultas
                  </button>
                  <button
                    onClick={() => setBookingSuccess(false)}
                    className="px-5 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100/50 transition-colors cursor-pointer"
                  >
                    Novo Agendamento
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                {/* Specialty Selection */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                    1. Selecione o Tratamento / Especialidade
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(proceduresList.length > 0 ? proceduresList.slice(0, 6) : ['Limpeza & Profilaxia', 'Clareamento Dental', 'Ortodontia / Alinhadores', 'Implante Dentário', 'Restauração Estética', 'Avaliação Geral']).map((proc) => (
                      <button
                        key={proc}
                        type="button"
                        onClick={() => setSelectedSpecialty(proc)}
                        className={cn(
                          "text-left p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                          selectedSpecialty === proc
                            ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan ring-1 ring-brand-cyan/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        )}
                      >
                        <span>{proc}</span>
                        {selectedSpecialty === proc && <Check className="w-4 h-4 text-brand-cyan stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                    2. Escolha o Cirurgião-Dentista / Médico Responsável
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(doctorsList.length > 0 ? doctorsList : ['Dra. Carolina Mendes', 'Dr. Rafael Costa', 'Dra. Beatriz Santos']).map((docName) => (
                      <button
                        key={docName}
                        type="button"
                        onClick={() => setSelectedDoctor(docName)}
                        className={cn(
                          "p-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer",
                          selectedDoctor === docName
                            ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan ring-1 ring-brand-cyan/20"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        )}
                      >
                        {docName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                      3. Escolha a Data
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-cyan/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                      4. Horário Disponível
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {availableTimeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={cn(
                            "py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                            selectedTimeSlot === slot
                              ? "bg-brand-cyan text-white border-brand-cyan shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Guest Patient Information if not logged in as existing */}
                {currentPatient.id === 'guest' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black uppercase text-slate-600">Seus Dados de Cadastro & Contato</h5>
                      <span className="text-[10px] text-brand-cyan font-bold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">Cadastro Automático no Portal</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={patientNameInput}
                          onChange={(e) => setPatientNameInput(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">WhatsApp / Telefone *</label>
                        <input
                          type="tel"
                          required
                          value={patientPhoneInput}
                          onChange={(e) => setPatientPhoneInput(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">E-mail</label>
                        <input
                          type="email"
                          value={patientEmailInput}
                          onChange={(e) => setPatientEmailInput(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">CPF (Opcional)</label>
                        <input
                          type="text"
                          value={patientCpfInput}
                          onChange={(e) => setPatientCpfInput(e.target.value)}
                          placeholder="000.000.000-00"
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-cyan to-cyan-600 hover:from-cyan-600 hover:to-brand-cyan text-white font-black text-sm shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Agendamento Online
                </button>
              </form>
            )}
          </div>

          {/* Right Info Box */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Instruções de Atendimento</h4>
              
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-50 text-brand-cyan flex items-center justify-center font-bold shrink-0">1</div>
                  <p>Chegue com 10 minutos de antecedência para preenchimento de ficha clínica.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-50 text-brand-cyan flex items-center justify-center font-bold shrink-0">2</div>
                  <p>Traga exames radiográficos anteriores caso possua.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-50 text-brand-cyan flex items-center justify-center font-bold shrink-0">3</div>
                  <p>Confirmações automáticas serão enviadas via WhatsApp 24h antes.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-4 h-4 text-brand-cyan" />
                <span>Atendimento Presencial em Unidade Central</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Minhas Consultas */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Histórico de Atendimentos</h3>
            <span className="text-xs font-bold text-slate-500">{patientRecords.length} consultas registradas</span>
          </div>

          {patientRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientRecords.map((rec) => {
                const isViaPortal = Boolean(rec.viaPortal || rec.origem?.toLowerCase().includes('portal') || (rec as any).canal?.toLowerCase().includes('portal'));
                return (
                  <div key={rec.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-brand-cyan">{rec.procedimento}</span>
                        {isViaPortal && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                            <Globe className="w-2.5 h-2.5" /> Via Portal
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        rec.status === 'Realizado' ? "bg-emerald-100 text-emerald-800" :
                        rec.status === 'Agendado' ? "bg-blue-100 text-blue-800" :
                        "bg-slate-200 text-slate-700"
                      )}>
                        {rec.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-600 space-y-1">
                      <p><strong>Dentista Responsável:</strong> {rec.dentista}</p>
                      <p><strong>Data:</strong> {rec.data} às {rec.horario || '09:00'}</p>
                      <p><strong>Canal de Origem:</strong> {isViaPortal ? 'Portal do Paciente (Online)' : (rec.origem || 'Presencial / Recepção')}</p>
                      {rec.valor && <p><strong>Valor:</strong> R$ {Number(rec.valor).toFixed(2)}</p>}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Status financeiro: <strong className="text-slate-700">{rec.statusPagamento || 'Pendente'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-700">Nenhuma consulta encontrada para este paciente</p>
              <p className="text-xs text-slate-500 mt-1">Use a aba de Autoagendamento para marcar seu primeiro atendimento.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Minhas Receitas & Atestados Digitais */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-cyan" />
                Receitas, Atestados & Prescrições Digitais
              </h3>
              <p className="text-xs text-slate-500">Documentos autenticáveis com QR Code de verificação em farmácias</p>
            </div>
          </div>

          {patientDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientDocs.map((doc) => (
                <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">{doc.type || 'Receita Odontológica'}</span>
                    <span className="text-[10px] font-bold text-slate-400">{doc.date || doc.createdAt || 'Recente'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {doc.content || 'Prescrição odontológica oficial.'}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Assinado Digitalmente</span>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar / Imprimir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-700">Nenhum documento digital emitido no momento</p>
              <p className="text-xs text-slate-500 mt-1">Suas receitas e atestados emitidos pelos dentistas aparecerão aqui automaticamente.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Pagamentos & Pix Dinâmico */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-cyan" />
                Pagamento Instantâneo via Pix
              </h3>
              <p className="text-xs text-slate-500 mt-1">Escaneie o QR Code no app do seu banco ou use a chave Copia e Cola.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
              {/* Dynamic Pix QR Code Box */}
              <div className="w-40 h-40 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center text-white relative overflow-hidden">
                  {/* Visual QR Code Pattern */}
                  <QrCode className="w-28 h-28 text-cyan-400" />
                </div>
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Beneficiário</span>
                  <p className="text-sm font-black text-slate-900">{clinicName}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Valor Sugerido</span>
                  <p className="text-xl font-black text-emerald-600">R$ 200,00</p>
                </div>

                <button
                  onClick={() => handleCopyPix('00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406200.005802BR5913OdontoDash6009SaoPaulo62070503***6304E2CA')}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs",
                    copiedPix ? "bg-emerald-600 text-white" : "bg-brand-cyan hover:bg-cyan-600 text-white"
                  )}
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-4 h-4" />
                      Código Pix Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Código Pix (Copia e Cola)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Orçamentos & Parcelas</h4>
            
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Consulta de Avaliação</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">Quitado via Pix</span>
                </div>
                <span className="text-xs font-black text-emerald-700">R$ 150,00</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Tratamento Profilático</p>
                  <span className="text-[10px] text-amber-700 font-semibold">Pendente na recepção</span>
                </div>
                <span className="text-xs font-black text-slate-900">R$ 200,00</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
