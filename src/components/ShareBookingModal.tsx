/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  MessageCircle, 
  ExternalLink, 
  Stethoscope, 
  Building2, 
  Share2, 
  QrCode, 
  User, 
  Calendar,
  Sparkles,
  Link2,
  Send,
  Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ShareBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicName: string;
  clinicId?: string;
  users?: any[];
  currentUser?: any;
  prefillPatientName?: string;
  prefillPatientPhone?: string;
}

export default function ShareBookingModal({
  isOpen,
  onClose,
  clinicName,
  clinicId,
  users = [],
  currentUser,
  prefillPatientName = '',
  prefillPatientPhone = ''
}: ShareBookingModalProps) {
  const doctors = useMemo(() => {
    return users.filter(u => u && (u.role === 'Dentista' || u.role === 'Cirurgião-Dentista' || u.role === 'Médico' || (u.isDentist && u.role === 'Admin')));
  }, [users]);

  const isCurrentUserDoctor = useMemo(() => {
    const role = currentUser?.role?.toLowerCase() || '';
    return role.includes('dentista') || role.includes('médico') || currentUser?.isDentist;
  }, [currentUser]);

  const defaultDoctor = useMemo(() => {
    if (isCurrentUserDoctor && currentUser?.name) {
      return currentUser.name;
    }
    return doctors.length > 0 ? doctors[0].name : '';
  }, [isCurrentUserDoctor, currentUser, doctors]);

  const [selectedDoctor, setSelectedDoctor] = useState<string>(defaultDoctor);
  const [includeDoctor, setIncludeDoctor] = useState<boolean>(true);
  const [patientPhone, setPatientPhone] = useState(prefillPatientPhone);
  const [patientName, setPatientName] = useState(prefillPatientName);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [customNote, setCustomNote] = useState('');

  // Update when prefill props change
  React.useEffect(() => {
    if (prefillPatientName) setPatientName(prefillPatientName);
    if (prefillPatientPhone) setPatientPhone(prefillPatientPhone);
  }, [prefillPatientName, prefillPatientPhone]);

  // Update selected doctor if currentUser is doctor
  React.useEffect(() => {
    if (defaultDoctor && !selectedDoctor) {
      setSelectedDoctor(defaultDoctor);
    }
  }, [defaultDoctor, selectedDoctor]);

  const effectiveClinicId = useMemo(() => {
    if (clinicId) return clinicId;
    return currentUser?.parentTrialId || currentUser?.clinicId || (currentUser?.isTrial ? currentUser?.id : (currentUser?.id === '2' || currentUser?.id === '3' ? '1' : currentUser?.id || '1'));
  }, [clinicId, currentUser]);

  const bookingUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const params = new URLSearchParams();
    params.set('booking', 'true');
    if (effectiveClinicId) {
      params.set('clinicId', String(effectiveClinicId));
    }
    if (clinicName) {
      params.set('clinic', clinicName);
    }
    if (includeDoctor && selectedDoctor && selectedDoctor !== 'Todos') {
      params.set('doctor', selectedDoctor);
    }
    return `${origin}${pathname}?${params.toString()}`;
  }, [effectiveClinicId, clinicName, includeDoctor, selectedDoctor]);

  const formattedWhatsAppMessage = useMemo(() => {
    const docText = includeDoctor && selectedDoctor ? ` com *${selectedDoctor}*` : '';
    const greeting = patientName.trim() ? `Olá, *${patientName.trim()}*!` : 'Olá!';
    const extra = customNote.trim() ? `\n\n📌 _${customNote.trim()}_` : '';
    
    return `${greeting} 👋\n\nSegue o link para você realizar o seu agendamento online na clínica *${clinicName || 'OdontoDash'}*${docText}:\n\n🔗 ${bookingUrl}${extra}\n\nBasta acessar o link, escolher o melhor dia e horário para a sua consulta e confirmar em instantes. Estamos à sua disposição! 🦷✨`;
  }, [includeDoctor, selectedDoctor, patientName, customNote, clinicName, bookingUrl]);

  const handleCopyLinkOnly = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyFormattedMessage = () => {
    navigator.clipboard.writeText(formattedWhatsAppMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = patientPhone.replace(/\D/g, '');
    const encoded = encodeURIComponent(formattedWhatsAppMessage);
    if (cleanPhone) {
      const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 sm:p-7 relative overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>Enviar Link de Agendamento Online</span>
                <span className="text-[10px] bg-brand-cyan/10 text-brand-cyan font-bold px-2 py-0.5 rounded-full uppercase">
                  WhatsApp & Link
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Permita que o paciente escolha seu próprio horário vinculado ao médico
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 space-y-4 text-left overflow-y-auto pr-1">
          
          {/* Clinic & Doctor Selector Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-cyan shrink-0" />
                <span className="text-xs font-black text-slate-800">
                  {clinicName || 'Sua Clínica'}
                </span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Clínica Ativa
              </span>
            </div>

            {/* Doctor link binding */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Profissional Selecionado:</span>
              </label>

              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                {doctors.length > 0 ? (
                  <select
                    value={selectedDoctor}
                    onChange={(e) => {
                      setSelectedDoctor(e.target.value);
                      setIncludeDoctor(true);
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan shadow-2xs max-w-full"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.specialty ? `(${d.specialty})` : ''}
                      </option>
                    ))}
                    <option value="Todos">Qualquer Profissional da Clínica</option>
                  </select>
                ) : (
                  <span className="text-xs font-bold text-slate-700">{currentUser?.name || 'Profissional'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Copy Link Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Link Direto de Autoagendamento:</span>
              </label>
              {includeDoctor && selectedDoctor && (
                <span className="text-[10px] font-bold text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded-md">
                  Vinculado a {selectedDoctor}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={bookingUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLinkOnly}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer",
                  copiedLink 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-900 hover:bg-brand-cyan text-white"
                )}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Sender Box */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Enviar pelo WhatsApp do Paciente</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Pronto para Envio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Nome do Paciente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Oliveira"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  WhatsApp com DDD (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-9999"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Custom note / instruction */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Observação adicional (Ex: "Lembrar de trazer exames anteriores")
              </label>
              <input
                type="text"
                placeholder="Ex: Traga sua documentação ou raio-x"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Message Preview */}
            <div className="p-2.5 bg-white/90 border border-emerald-100 rounded-xl text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
              {formattedWhatsAppMessage}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyFormattedMessage}
                className={cn(
                  "py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer",
                  copiedMessage 
                    ? "bg-emerald-600 text-white border-emerald-600" 
                    : "bg-white hover:bg-emerald-100/50 text-emerald-800 border-emerald-300"
                )}
              >
                {copiedMessage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMessage ? 'Mensagem Copiada!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-brand-cyan hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Visualizar Tela do Paciente</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
