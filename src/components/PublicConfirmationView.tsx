import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Calendar, ShieldCheck, RefreshCw, XCircle, ChevronLeft, ArrowRight } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseISO, format } from 'date-fns';

interface PublicConfirmationViewProps {
  appointmentId: string;
  onBack: () => void;
  onOpenBooking: () => void;
  setReschedulePreFill: (data: any) => void;
  clinicName: string;
  clinicLogo?: string;
  footerText?: string;
  data: any[];
}

export function PublicConfirmationView({
  appointmentId,
  onBack,
  onOpenBooking,
  setReschedulePreFill,
  clinicName,
  clinicLogo,
  footerText,
  data
}: PublicConfirmationViewProps) {
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [viewState, setViewState] = useState<'idle' | 'success_confirm' | 'success_cancel' | 'finished' | 'not_found' | 'error'>('idle');

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const existing = data.find((item: any) => item.id === appointmentId);
        if (existing) {
          setAppointment(existing);
          setIsLoading(false);
          return;
        }

        if (db) {
          const docRef = doc(db, 'records', appointmentId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setAppointment({ id: snap.id, ...snap.data() });
          } else {
            setViewState('not_found');
          }
        } else {
          setViewState('not_found');
        }
      } catch (err) {
        console.error('Erro ao buscar agendamento:', err);
        setViewState('error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [appointmentId, data]);

  const handleConfirm = async () => {
    if (!appointment) return;
    setIsActionLoading(true);
    try {
      if (db) {
        const docRef = doc(db, 'records', appointment.id);
        await updateDoc(docRef, { status: 'Agendado' });
      }
      setViewState('success_confirm');
    } catch (err) {
      console.error(err);
      alert('Houve um erro ao confirmar sua consulta. Por favor, tente novamente.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    if (window.confirm('Deseja realmente cancelar o seu agendamento? Esta vaga será liberada imediatamente para outros pacientes.')) {
      setIsActionLoading(true);
      try {
        if (db) {
          const docRef = doc(db, 'records', appointment.id);
          await updateDoc(docRef, { status: 'Cancelado' });
        }
        setViewState('success_cancel');
      } catch (err) {
        console.error(err);
        alert('Houve um erro ao cancelar. Por favor, tente novamente.');
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleReschedule = async () => {
    if (!appointment) return;
    setIsActionLoading(true);
    try {
      if (db) {
        const docRef = doc(db, 'records', appointment.id);
        await updateDoc(docRef, { status: 'Cancelado' });
      }
      setReschedulePreFill({
        dentista: appointment.dentista || '',
        paciente: appointment.paciente || '',
        telefone: appointment.telefone || '',
        procedimento: appointment.procedimento || 'Consulta Inicial'
      });
      onOpenBooking();
    } catch (err) {
      console.error(err);
      alert('Houve um erro ao iniciar o reagendamento. Por favor, tente novamente.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFinish = () => {
    try {
      window.close();
    } catch (e) {
      console.warn('Bloqueado pelo navegador:', e);
    }
    setViewState('finished');
  };

  const formatDateStr = (dStr: string) => {
    try {
      return format(parseISO(dStr), 'dd/MM/yyyy');
    } catch {
      return dStr || '--/--/----';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-brand-cyan selection:text-slate-900 font-sans text-slate-100">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          {clinicLogo ? (
            <img src={clinicLogo} alt={clinicName} className="h-12 max-w-[180px] object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-black text-xl">
              {clinicName ? clinicName.charAt(0) : 'O'}
            </div>
          )}
          <h2 className="text-base font-bold text-slate-200">{clinicName}</h2>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Confirmação de Presença Online</p>
        </div>

        {isLoading ? (
          <div className="w-full bg-slate-800/80 border border-slate-700/50 p-8 rounded-[36px] flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan" />
            <p className="text-xs text-slate-400">Localizando sua consulta...</p>
          </div>
        ) : viewState === 'not_found' ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-slate-800 border border-slate-700/50 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Agendamento não encontrado</h3>
            <p className="text-xs text-slate-400">Não encontramos o registro deste agendamento. Ele pode ter sido reagendado ou expirado.</p>
            <button onClick={onOpenBooking} className="w-full py-3 bg-brand-cyan text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer">
              Agendar Nova Consulta
            </button>
          </motion.div>
        ) : viewState === 'success_confirm' ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-slate-800 border border-emerald-500/25 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Presença Confirmada!</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Agradecemos a confirmação, <strong className="text-emerald-400">{appointment?.paciente}</strong>. Sua vaga está garantida e nossa equipe já está preparada para recebê-lo.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-700/50 space-y-3">
              <button onClick={handleFinish} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/15">
                Concluir e Sair
              </button>
              <p className="text-[10px] text-slate-400 font-medium">Você pode fechar esta aba do seu celular ou navegador com segurança.</p>
            </div>
          </motion.div>
        ) : viewState === 'success_cancel' ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-slate-800 border border-rose-500/25 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-6">
            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Consulta Cancelada</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Seu agendamento foi cancelado com sucesso em nosso sistema e o horário correspondente está liberado para outros pacientes.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-700/50 space-y-3">
              <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Gostaria de sugerir outro horário?</p>
              <button onClick={handleReschedule} className="w-full py-3 bg-brand-cyan hover:bg-brand-cyan/90 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-cyan/15">
                <RefreshCw className="w-4 h-4" />
                Agendar Novo Horário
              </button>
            </div>
          </motion.div>
        ) : viewState === 'finished' ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full bg-slate-800 border border-slate-700/50 p-6 sm:p-8 rounded-[36px] text-center shadow-xl space-y-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Conexão Encerrada com Segurança</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Suas respostas foram salvas no sistema da clínica.</p>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Para garantir a total privacidade dos seus dados, a sua sessão foi encerrada de forma segura.</p>
            </div>
          </motion.div>
        ) : (
          appointment && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-slate-800 border border-slate-700/50 p-6 rounded-[36px] shadow-xl space-y-6">
              <div className="text-center space-y-1">
                <span className="text-[9px] uppercase font-black bg-brand-cyan/10 text-brand-cyan px-2.5 py-1 rounded-full">
                  {appointment.status === 'Cancelado' ? 'Cancelado' : 'Aguardando Resposta'}
                </span>
                <h3 className="text-lg font-black text-white pt-2">Olá, {appointment.paciente}!</h3>
                <p className="text-xs text-slate-400 font-medium">Por favor, selecione uma das ações abaixo para gerenciar sua consulta.</p>
              </div>

              <div className="bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-700/40 space-y-3">
                <div className="flex gap-3 items-center">
                  <div className="w-9 h-9 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan font-black text-xs shrink-0">
                    {appointment.paciente ? appointment.paciente.charAt(0) : 'P'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none mb-1">Paciente</p>
                    <p className="text-sm font-black text-white truncate leading-none">{appointment.paciente}</p>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 grid grid-cols-2 gap-3 text-xs leading-none">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Procedimento</span>
                    <span className="font-bold text-slate-300 block truncate">{appointment.procedimento || 'Consulta Inicial'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Dentista</span>
                    <span className="font-bold text-slate-300 block truncate">{appointment.dentista}</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex items-center gap-4 text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-cyan shrink-0" />
                    <span>{formatDateStr(appointment.data)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-brand-cyan font-black bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/15 text-xs">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{appointment.horario || 'N/D'}</span>
                  </div>
                </div>
              </div>

              {appointment.status === 'Cancelado' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-center text-xs text-rose-300 font-bold leading-relaxed">
                    Esta consulta já consta como CANCELADA e o horário foi liberado de nossa agenda.
                  </div>
                  <button onClick={handleReschedule} className="w-full py-3.5 bg-brand-cyan hover:bg-brand-cyan/90 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-cyan/20">
                    <RefreshCw className="w-4 h-4" />
                    Agendar Novo Horário
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleConfirm}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/15"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isActionLoading ? 'Processando...' : 'Confirmar Consulta'}
                  </button>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleReschedule}
                      className="py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reagendar
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleCancel}
                      className="py-3 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )
        )}

        <div className="text-slate-600 text-[9px] flex items-center justify-center gap-1.5 text-center py-4">
          <ShieldCheck className="w-4 h-4 text-emerald-500/40" />
          <span>Atendimento exclusivo e criptografado da clínica {clinicName}. {footerText}</span>
        </div>
      </div>
    </div>
  );
}
export default PublicConfirmationView;
