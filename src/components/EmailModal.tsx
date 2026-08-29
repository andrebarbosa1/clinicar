import React, { useState } from 'react';
import { Mail, X, Check, Loader2 } from 'lucide-react';
import { SecurityUtils } from '../lib/security';

export function EmailModal({ patientName, onClose, onSave }: { patientName: string; onClose: () => void; onSave: (patientName: string, email: string) => Promise<void> | void }) {
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!email || !SecurityUtils.isValidEmail(email)) {
      alert('Por favor, informe um e-mail válido.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(patientName, email.trim().toLowerCase());
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar e-mail.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-cyan/10 text-brand-cyan rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">E-mail do Paciente</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Novo Endereço de E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="paciente@exemplo.com"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-brand-cyan rounded-xl transition-all flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar E-mail
          </button>
        </div>
      </div>
    </div>
  );
}
export default EmailModal;
