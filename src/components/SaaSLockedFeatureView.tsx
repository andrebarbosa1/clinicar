import React from 'react';
import { Lock, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface SaaSLockedFeatureViewProps {
  featureName: string;
  requiredPlan: 'Pro' | 'Platinum';
  currentPlan: string;
  onUpgradeClick: () => void;
}

export default function SaaSLockedFeatureView({
  featureName,
  requiredPlan,
  currentPlan,
  onUpgradeClick
}: SaaSLockedFeatureViewProps) {
  const planDetails = {
    Pro: {
      name: 'Pro',
      color: 'text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5',
      desc: 'Módulo avançado de faturamento, lembretes inteligentes, odontograma virtual e integração de equipes.'
    },
    Platinum: {
      name: 'Platinum',
      color: 'text-slate-800 border-slate-200 bg-slate-50',
      desc: 'Módulo de Estoque e Suprimentos Completo, backups automáticos ilimitados, APIs e Multi-profissionais.'
    }
  };

  const planInfo = planDetails[requiredPlan];

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/60 shadow-lg text-center relative overflow-hidden animate-fade-in text-slate-800">
      <div className="absolute top-[-20%] right-[-10%] w-60 h-60 bg-brand-cyan/10 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-15%] w-52 h-52 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center space-y-5">
        {/* Animated Double Icon Lock indicator */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
            <Lock className="w-7 h-7 text-slate-500 animate-pulse" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 p-1 bg-brand-cyan text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow">
            <Sparkles className="w-2.5 h-2.5" />
            SaaS Lock
          </span>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-slate-400">
            Recurso Bloqueado
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-850">
            {featureName}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Sua conta atual ({currentPlan}) não possui acesso a esta ferramenta. Desbloqueie todo o ecossistema com uma licença ativa.
          </p>
        </div>

        {/* Required License Highlight Badge bar */}
        <div className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 ${planInfo.color}`}>
          <div className="p-1 rounded-lg bg-white shadow-sm mt-0.5 shrink-0">
            <Zap className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">
              Requer Plano {planInfo.name} ou superior
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              {planInfo.desc}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onUpgradeClick}
            className="flex-1 py-3 bg-brand-cyan hover:bg-brand-cyan-dark text-slate-900 border border-brand-cyan/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer select-none active:scale-95 shadow flex items-center justify-center gap-2"
          >
            Fazer Upgrade Agora
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Gateway SSL criptografado OdontoDash CRM
        </div>
      </div>
    </div>
  );
}
