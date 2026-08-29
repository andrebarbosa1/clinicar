import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function CookieBanner({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[999]">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Nós respeitamos sua privacidade</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Utilizamos cookies essenciais para segurança, persistência e desempenho do sistema em conformidade com a LGPD.</p>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onAccept} className="flex-1 py-3 bg-brand-cyan text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-cyan/20 hover:bg-brand-cyan/90 transition-all cursor-pointer">
          Aceitar Cookies
        </button>
        <button onClick={onDecline} className="flex-1 py-3 bg-slate-50 text-slate-500 text-xs font-bold rounded-xl border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer">
          Recusar
        </button>
      </div>
    </motion.div>
  );
}
export default CookieBanner;
