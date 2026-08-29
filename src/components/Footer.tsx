import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Footer({ onPrivacyPolicy, onTerms, footerText }: { onPrivacyPolicy: () => void; onTerms: () => void; footerText: string }) {
  return (
    <footer className="mt-auto py-4 px-4 border-t border-slate-100 bg-white/50 backdrop-blur-sm w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{footerText}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <button type="button" onClick={onPrivacyPolicy} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-cyan transition-colors cursor-pointer">
            Política de Privacidade
          </button>
          <button type="button" onClick={onTerms} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-brand-cyan transition-colors cursor-pointer">
            Termos de Uso
          </button>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Segurança LGPD
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-left">
            Sistema Protegido por <br /> ClinicalGate Security
          </span>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
