/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Stethoscope, 
  FileText,
  Building2,
  Sparkles,
  ShieldCheck,
  MapPin,
  Check,
  Copy,
  Heart,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isValid, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, formatCurrency } from '../lib/utils';
import { DentalRecord } from '../types';
import { 
  CLINIC_TIME_SLOTS, 
  normalizeAppointmentDateTime, 
  findDentistScheduleConflict, 
  getSystemInitialDate 
} from '../lib/scheduleUtils';
import { findPatientByRobustMatch } from '../lib/patientUtils';

interface PublicBookingViewProps {
  onBack: () => void;
  users: any[];
  data: DentalRecord[];
  onPrivacyPolicy: () => void;
  onTerms: () => void;
  clinicName: string;
  clinicLogo: string | null;
  footerText: string;
  clinicId?: string;
  targetDoctor?: string;
  initialFormData?: {
    dentista?: string;
    data?: string;
    horario?: string;
    paciente?: string;
    telefone?: string;
    procedimento?: string;
  };
}

export default function PublicBookingView({
  onBack,
  users = [],
  data = [],
  onPrivacyPolicy,
  onTerms,
  clinicName: initialClinicName,
  clinicLogo: initialClinicLogo,
  footerText,
  clinicId,
  targetDoctor,
  initialFormData
}: PublicBookingViewProps) {
  const minDate = getSystemInitialDate();
  const [currentClinicName, setCurrentClinicName] = useState(initialClinicName || 'Clínica Odontológica');
  const [currentClinicLogo, setCurrentClinicLogo] = useState<string | null>(initialClinicLogo);
  const [clinicSettingsLoaded, setClinicSettingsLoaded] = useState(false);

  // Sync clinic settings if clinicId is passed
  useEffect(() => {
    if (clinicId) {
      const unsub = onSnapshot(doc(db, 'settings', `clinic-${clinicId}`), (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          if (d.clinicName) setCurrentClinicName(d.clinicName);
          if (d.clinicLogo) setCurrentClinicLogo(d.clinicLogo);
        }
        setClinicSettingsLoaded(true);
      }, (err) => {
        console.warn("Public booking clinic settings sync error:", err);
        setClinicSettingsLoaded(true);
      });
      return unsub;
    } else {
      setClinicSettingsLoaded(true);
    }
  }, [clinicId]);

  // Filter doctors for this specific clinic
  const doctors = useMemo(() => {
    let list = users.filter(u => u.role === 'Dentista' || u.role === 'Médico' || u.role === 'Doctor');
    if (clinicId) {
      const filtered = list.filter(u => 
        String(u.clinicId) === String(clinicId) || 
        String(u.parentTrialId) === String(clinicId) || 
        String(u.id) === String(clinicId) || 
        String(u.trialOwnerId) === String(clinicId)
      );
      if (filtered.length > 0) {
        list = filtered;
      }
    }

    if (targetDoctor) {
      const found = list.find(d => d.name.toLowerCase() === targetDoctor.toLowerCase());
      if (found) {
        return [found, ...list.filter(d => d.id !== found.id)];
      } else {
        return [{ id: 'doc-target', name: targetDoctor, role: 'Dentista', specialty: 'Cirurgião-Dentista Responsável' }, ...list];
      }
    }

    return list.length > 0 ? list : [
      { id: 'default-1', name: 'Dra. Carolina Mendes', role: 'Dentista', specialty: 'Clínica Geral & Estética' },
      { id: 'default-2', name: 'Dr. Roberto Santos', role: 'Dentista', specialty: 'Ortodontia & Implantes' }
    ];
  }, [users, clinicId, targetDoctor]);

  const initialDoc = initialFormData?.dentista || targetDoctor || (doctors.length === 1 ? doctors[0].name : (doctors[0]?.name || ''));

  const [step, setStep] = useState(() => (initialFormData || (targetDoctor && doctors.length > 0)) ? 2 : 1);
  const [bookingData, setBookingData] = useState({
    dentista: initialDoc,
    data: initialFormData?.data || minDate,
    horario: initialFormData?.horario || '',
    paciente: initialFormData?.paciente || '',
    telefone: initialFormData?.telefone || '',
    procedimento: initialFormData?.procedimento || 'Consulta Inicial'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleCopySummary = () => {
    const formattedDate = bookingData.data ? format(parseISO(bookingData.data), "dd/MM/yyyy") : '';
    const text = `📋 Confirmação de Agendamento\n🏥 Clínica: ${currentClinicName}\n👨‍⚕️ Profissional: ${bookingData.dentista}\n🗓️ Data: ${formattedDate} às ${bookingData.horario}\n👤 Paciente: ${bookingData.paciente}\n🦷 Procedimento: ${bookingData.procedimento || 'Consulta Inicial'}\n📱 WhatsApp: ${bookingData.telefone}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleResetBooking = () => {
    setBookingData({
      dentista: initialDoc,
      data: minDate,
      horario: '',
      paciente: '',
      telefone: '',
      procedimento: 'Consulta Inicial'
    });
    setStep(1);
    setIsSuccess(false);
  };

  const timeSlots = CLINIC_TIME_SLOTS;

  // Filter occupied time slots for the chosen date and dentist
  const occupiedSlots = useMemo(() => {
    if (!bookingData.dentista || !bookingData.data) return [];
    return data
      .filter(r => {
        const matchesDentist = r.dentista === bookingData.dentista;
        const matchesDate = r.data === bookingData.data;
        const isNotCanceled = r.status !== 'Cancelado';
        return matchesDentist && matchesDate && isNotCanceled;
      })
      .map(r => r.horario);
  }, [data, bookingData.dentista, bookingData.data]);

  const handleSubmit = async () => {
    const trimmedName = (bookingData.paciente || '').trim();
    if (!trimmedName || !bookingData.telefone || !bookingData.dentista || !bookingData.horario) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const normalized = normalizeAppointmentDateTime(bookingData.data, bookingData.horario);
    const finalDate = normalized.date;
    const finalTime = normalized.time;
    const selectedDateTime = parseISO(`${finalDate}T${finalTime}`);
    const now = new Date();
    const bufferMinutes = 15;
    if (selectedDateTime < new Date(now.getTime() - bufferMinutes * 60000)) {
      alert('O horário selecionado já passou. Por favor, escolha um horário futuro.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const targetClinicId = clinicId || '1';
      let finalPatientId = '';

      try {
        console.log("[PortalBooking] Buscando pacientes para vincular ao médico:", bookingData.dentista);
        const patientsSnap = await getDocs(collection(db, 'patients'));
        const patientsList = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const existingPatient = findPatientByRobustMatch(trimmedName, patientsList);

        if (!existingPatient) {
          finalPatientId = `pat-${Date.now()}`;
          console.log("[PortalBooking] Paciente novo criado via portal:", finalPatientId);
          const patientData = {
            id: finalPatientId,
            name: trimmedName,
            email: '',
            phone: bookingData.telefone || '',
            cpf: '',
            dentistaResponsavel: bookingData.dentista || '',
            origem: 'Portal do Paciente',
            canal: 'Portal Online',
            viaPortal: true,
            status: 'Ativo',
            trialOwnerId: targetClinicId,
            clinicId: targetClinicId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'patients', finalPatientId), patientData);
        } else {
          finalPatientId = existingPatient.id;
          console.log("[PortalBooking] Paciente existente atualizado:", existingPatient.name);
          const updatedPatientData: any = {
            phone: existingPatient.phone || bookingData.telefone || '',
            dentistaResponsavel: existingPatient.dentistaResponsavel || bookingData.dentista || '',
            updatedAt: new Date().toISOString()
          };
          if (!existingPatient.origem) {
            updatedPatientData.origem = 'Portal do Paciente';
            updatedPatientData.canal = 'Portal Online';
            updatedPatientData.viaPortal = true;
          }
          if (targetClinicId && !existingPatient.trialOwnerId) {
            updatedPatientData.trialOwnerId = targetClinicId;
            updatedPatientData.clinicId = targetClinicId;
          }
          await setDoc(doc(db, 'patients', existingPatient.id), updatedPatientData, { merge: true });
        }
      } catch (patientAutoErr) {
        console.error("[PortalBooking] Erro ao cadastrar paciente automaticamente:", patientAutoErr);
      }

      const id = `booking-${Date.now()}`;
      const record: DentalRecord = {
        id,
        data: finalDate,
        horario: finalTime,
        paciente: trimmedName,
        pacienteId: finalPatientId || undefined,
        telefone: bookingData.telefone,
        procedimento: bookingData.procedimento,
        dentista: bookingData.dentista,
        status: 'Pendente',
        statusPagamento: 'Pendente',
        valor: 150,
        trialOwnerId: targetClinicId,
        clinicId: targetClinicId,
        origem: 'Portal do Paciente',
        viaPortal: true,
        canal: 'Portal Online',
        observacao: `Agendamento online realizado para ${currentClinicName}`
      };

      const conflict = findDentistScheduleConflict(data, record.dentista, finalDate, finalTime);
      if (conflict) {
        alert('Este horário já foi preenchido ou colide com outra consulta deste profissional. Por favor, selecione outro horário.');
        setStep(2);
        return;
      }

      await setDoc(doc(db, 'records', id), record);
      setIsSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Erro ao agendar consulta. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const patientFirstName = (bookingData.paciente || 'Paciente').trim().split(' ')[0];
    const formattedDate = bookingData.data ? format(parseISO(bookingData.data), "dd/MM/yyyy") : '';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-cyan/5 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 blur-[100px] pointer-events-none rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-9 text-center max-w-lg w-full border border-slate-100 relative z-10"
        >
          {/* Top Clinic Branding */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            {currentClinicLogo ? (
              <img src={currentClinicLogo} alt={currentClinicName} className="h-9 max-w-[150px] object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full border border-emerald-200/80 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Agendamento Registrado</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
            Muito obrigado, {patientFirstName}!
          </h2>

          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
            Recebemos a sua solicitação de agendamento na clínica <strong className="text-slate-800 font-bold">{currentClinicName}</strong> com sucesso.
          </p>

          {/* Ticket / Details Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2.5 mb-6 shadow-2xs">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Clínica:</span>
              <span className="font-black text-slate-800">{currentClinicName}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Profissional:</span>
              <span className="font-black text-brand-cyan">{bookingData.dentista}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Procedimento:</span>
              <span className="font-bold text-slate-800">{bookingData.procedimento || 'Consulta / Avaliação'}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Data e Horário:</span>
              <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                {formattedDate} às {bookingData.horario}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Paciente:</span>
              <span className="font-bold text-slate-800">{bookingData.paciente}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">WhatsApp informado:</span>
              <span className="font-bold text-slate-800">{bookingData.telefone}</span>
            </div>
          </div>

          {/* Reassurance Notice */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-left mb-6 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed font-medium">
              <span className="font-black block text-emerald-950 mb-0.5">Próximos passos:</span>
              Nossa recepção entrará em contato via WhatsApp no número <strong className="font-bold text-emerald-950">{bookingData.telefone}</strong> para enviar a confirmação e todas as orientações para o seu atendimento.
            </div>
          </div>

          {/* Patient Actions (Without returning to system login) */}
          <div className="space-y-2.5">
            <button 
              type="button"
              onClick={handleCopySummary}
              className={cn(
                "w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border shadow-2xs",
                copiedSummary 
                  ? "bg-emerald-600 text-white border-emerald-600" 
                  : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
              )}
            >
              {copiedSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSummary ? 'Comprovante Copiado!' : 'Copiar Dados do Agendamento'}</span>
            </button>

            <button 
              type="button"
              onClick={handleResetBooking}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Fazer Outro Agendamento
            </button>
          </div>

          <p className="text-[11px] text-slate-400 font-medium mt-6">
            Você já pode fechar esta página com segurança. Nos vemos em breve! ✨
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-left">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentClinicLogo ? (
              <img src={currentClinicLogo} alt={currentClinicName} className="h-8 max-w-[140px] object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-brand-cyan text-white flex items-center justify-center font-black text-sm shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
            )}
            <div>
              <span className="text-sm font-black text-slate-900 block leading-tight">
                {currentClinicName}
              </span>
              <span className="text-[10px] font-bold text-brand-cyan tracking-wider uppercase">
                Portal de Agendamento Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={cn(
                    "w-6 h-1.5 rounded-full transition-all duration-300",
                    step === s ? "bg-brand-cyan w-10" : (step > s ? "bg-emerald-500" : "bg-slate-200")
                  )} 
                />
              ))}
            </div>
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Ambiente Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Banner with clinic & doctor indicator */}
        <div className="mb-6 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Agendamento Direto na Clínica
              </span>
              <span className="text-sm font-black text-slate-900">
                {currentClinicName}
              </span>
            </div>
          </div>
          {bookingData.dentista && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Stethoscope className="w-4 h-4 text-brand-cyan shrink-0" />
              <span className="text-xs font-black text-slate-800">
                {bookingData.dentista}
              </span>
            </div>
          )}
        </div>

        {/* Step Wizard Box */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 relative">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {step === 1 && "1. Escolha o Profissional"}
              {step === 2 && "2. Escolha o Dia e Horário"}
              {step === 3 && "3. Seus Dados de Contato"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 1 && `Selecione um dos profissionais da clínica ${currentClinicName}`}
              {step === 2 && `Selecione uma data e horário disponível com ${bookingData.dentista || 'o profissional'}`}
              {step === 3 && "Informe seu nome e WhatsApp para confirmarmos sua consulta"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctors.map((doc) => {
                    const isSelected = bookingData.dentista === doc.name;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setBookingData(prev => ({ ...prev, dentista: doc.name }))}
                        className={cn(
                          "p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer",
                          isSelected
                            ? "border-brand-cyan bg-brand-cyan/5 shadow-md shadow-brand-cyan/10"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 text-brand-cyan font-black text-lg flex items-center justify-center">
                            {doc.name[0]}
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-brand-cyan text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="mt-4">
                          <h4 className="text-base font-black text-slate-900">{doc.name}</h4>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                            {doc.specialty || 'Cirurgião-Dentista'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={!bookingData.dentista}
                    onClick={() => setStep(2)}
                    className={cn(
                      "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
                      bookingData.dentista
                        ? "bg-brand-cyan text-white hover:bg-slate-900 shadow-md"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Date selection */}
                  <div>
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-2">
                      <Calendar className="w-4 h-4 text-brand-cyan" />
                      <span>Data da Consulta</span>
                    </label>
                    <input
                      type="date"
                      min={minDate}
                      value={bookingData.data}
                      onChange={(e) => setBookingData(prev => ({ ...prev, data: e.target.value, horario: '' }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan focus:bg-white transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Consultas disponíveis de Segunda a Sexta
                    </p>
                  </div>

                  {/* Procedure selection */}
                  <div>
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-2">
                      <Stethoscope className="w-4 h-4 text-brand-cyan" />
                      <span>Motivo da Consulta</span>
                    </label>
                    <select
                      value={bookingData.procedimento}
                      onChange={(e) => setBookingData(prev => ({ ...prev, procedimento: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan focus:bg-white transition-colors"
                    >
                      <option value="Consulta Inicial">Consulta Inicial / Avaliação</option>
                      <option value="Limpeza / Profilaxia">Limpeza / Profilaxia</option>
                      <option value="Restauração">Restauração Dentária</option>
                      <option value="Ortodontia">Ortodontia / Aparelho</option>
                      <option value="Clareamento Dental">Clareamento Dental</option>
                      <option value="Urgência / Dor">Urgência / Dor</option>
                    </select>
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-2">
                    <Clock className="w-4 h-4 text-brand-cyan" />
                    <span>Horários Disponíveis</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {timeSlots.map((time) => {
                      const isOccupied = occupiedSlots.includes(time);
                      const isSelected = bookingData.horario === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setBookingData(prev => ({ ...prev, horario: time }))}
                          className={cn(
                            "py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
                            isOccupied
                              ? "bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-brand-cyan text-white shadow-md font-black"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!bookingData.horario || !bookingData.data}
                    onClick={() => setStep(3)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
                      bookingData.horario && bookingData.data
                        ? "bg-brand-cyan text-white hover:bg-slate-900 shadow-md"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Summary badge */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Resumo:</span>
                    <span className="font-black text-slate-800">
                      {bookingData.procedimento} com {bookingData.dentista}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Data e Hora:</span>
                    <span className="font-black text-brand-cyan">
                      {format(parseISO(bookingData.data), "dd/MM/yyyy")} às {bookingData.horario}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-1.5">
                      <User className="w-4 h-4 text-brand-cyan" />
                      <span>Nome Completo *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Eduardo Silva"
                      value={bookingData.paciente}
                      onChange={(e) => setBookingData(prev => ({ ...prev, paciente: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-1.5">
                      <Phone className="w-4 h-4 text-brand-cyan" />
                      <span>WhatsApp / Celular com DDD *</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: (11) 98765-4321"
                      value={bookingData.telefone}
                      onChange={(e) => setBookingData(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan focus:bg-white transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enviaremos a confirmação e lembretes para este WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !bookingData.paciente.trim() || !bookingData.telefone.trim()}
                    onClick={handleSubmit}
                    className={cn(
                      "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md",
                      bookingData.paciente.trim() && bookingData.telefone.trim() && !isSubmitting
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <span>Registrando...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Agendamento</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{footerText || `© ${new Date().getFullYear()} ${currentClinicName}`}</span>
          <div className="flex items-center gap-3">
            <button onClick={onPrivacyPolicy} className="hover:underline">Privacidade</button>
            <span>•</span>
            <button onClick={onTerms} className="hover:underline">Termos de Uso</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
