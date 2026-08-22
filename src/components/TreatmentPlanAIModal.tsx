/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Brain, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Clock, 
  Layers, 
  ChevronRight, 
  FileText, 
  Plus, 
  Check, 
  AlertCircle, 
  Printer, 
  Share2,
  Stethoscope,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TreatmentPlanAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  patientName?: string;
  clinicalFindings?: string;
  onApplyPlan?: (planData: any) => void;
  onApplyPlanAsBudget?: (planData: any) => void;
}

export default function TreatmentPlanAIModal({
  isOpen,
  onClose,
  patient,
  patientName,
  clinicalFindings: initialFindings,
  onApplyPlan,
  onApplyPlanAsBudget
}: TreatmentPlanAIModalProps) {
  const currentPatientName = patientName || patient?.name || 'Paciente em Consulta';
  const [chiefComplaint, setChiefComplaint] = useState(patient?.anamnesis?.queixaPrincipal || 'Sensibilidade ao mastigar e desejo de melhorar a estética do sorriso.');
  const [clinicalFindings, setClinicalFindings] = useState(initialFindings || 'Restaurações antigas escurecidas em dentes 14 e 15, acúmulo de tártaro em anteroinferiores.');
  const [missingTeeth, setMissingTeeth] = useState('Dente 46 ausente (espaço protético preservado).');
  const [medicalHistory, setMedicalHistory] = useState(patient?.anamnesis?.alergias || 'Sem alergias conhecidas. Não hipertenso.');
  const [budgetPreference, setBudgetPreference] = useState<'Econômico' | 'Equilibrado' | 'Premium / Alta Estética'>('Equilibrado');

  const [isLoading, setIsLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plano_ideal');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGeneratePlans = async () => {
    setIsLoading(true);
    setError(null);
    setAppliedSuccess(false);

    try {
      const res = await fetch('/api/ai/treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patient?.name || 'Paciente',
          patientAge: patient?.age || '32',
          chiefComplaint,
          clinicalFindings,
          missingTeeth,
          medicalHistory,
          budgetPreference
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Falha ao gerar os planos de tratamento.');
      }

      setPlanResult(data.data);
      if (data.data?.plans?.length > 0) {
        setSelectedPlanId(data.data.plans[1]?.id || data.data.plans[0].id);
      }
    } catch (err: any) {
      console.error("Error generating plans:", err);
      setError(err.message || 'Erro ao gerar propostas com IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBudget = () => {
    if (!planResult || !selectedPlanId) return;
    const chosenPlan = planResult.plans.find((p: any) => p.id === selectedPlanId);
    if (chosenPlan) {
      if (onApplyPlan) {
        onApplyPlan(chosenPlan);
      }
      if (onApplyPlanAsBudget) {
        onApplyPlanAsBudget({
          plan: chosenPlan,
          diagnosticSummary: planResult.diagnosticSummary,
          patientName: currentPatientName
        });
      }
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 w-64 h-64 bg-brand-cyan/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-cyan-300 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Brain className="w-3 h-3" />
                Planejamento Clínico com Gemini IA
              </div>
              <h2 className="text-xl font-black text-white">
                Sugestão de Diagnósticos & Planos de Tratamento
              </h2>
              <p className="text-xs text-slate-300">
                Paciente: <strong className="text-cyan-300">{currentPatientName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Clinical Case Input Form */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-brand-cyan" />
              Dados Clínicos do Paciente para o Gemini
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Queixa Principal do Paciente</label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Ex: Dor ao mastigar doce, dente quebrado..."
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Achados do Exame Clínico / Odontograma</label>
                <input
                  type="text"
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  placeholder="Ex: Cárie oclusal dente 26, retração gengival..."
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dentes Ausentes ou com Indicação de Extração</label>
                <input
                  type="text"
                  value={missingTeeth}
                  onChange={(e) => setMissingTeeth(e.target.value)}
                  placeholder="Ex: Elemento 46 ausente, sisos inclusos..."
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-brand-cyan/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferência de Investimento do Paciente</label>
                <div className="flex gap-2">
                  {(['Econômico', 'Equilibrado', 'Premium / Alta Estética'] as const).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setBudgetPreference(pref)}
                      className={cn(
                        "flex-1 text-[11px] font-bold py-2 rounded-xl border transition-all cursor-pointer",
                        budgetPreference === pref
                          ? "bg-brand-cyan text-white border-brand-cyan shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">A IA irá gerar 3 abordagens comparativas (Conservadora, Ideal e Preventiva).</span>
              <button
                onClick={handleGeneratePlans}
                disabled={isLoading}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer",
                  isLoading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-brand-cyan to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 active:scale-95"
                )}
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Elaborando Propostas Clínicas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    Gerar Propostas com IA
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results: 3 Comparative Proposals Cards */}
          {planResult && (
            <div className="space-y-6">
              
              {/* Diagnostic Overview */}
              <div className="p-4 bg-cyan-50/70 border border-cyan-200/80 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-black uppercase text-cyan-900 tracking-wider">Diagnóstico Clínico Geral</h5>
                  <p className="text-xs text-cyan-950 mt-0.5 font-medium leading-relaxed">
                    {planResult.diagnosticSummary}
                  </p>
                </div>
              </div>

              {/* Plans 3 Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {planResult.plans?.map((plan: any) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        "rounded-2xl p-5 border-2 transition-all flex flex-col justify-between relative cursor-pointer group",
                        isSelected
                          ? "bg-white border-brand-cyan shadow-lg ring-2 ring-brand-cyan/20 scale-[1.02]"
                          : "bg-white border-slate-200/80 hover:border-slate-300 opacity-80 hover:opacity-100 shadow-xs"
                      )}
                    >
                      {/* Highlight Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                          plan.color === 'emerald' ? "bg-emerald-100 text-emerald-800" :
                          plan.color === 'cyan' ? "bg-cyan-100 text-cyan-800 font-black" :
                          "bg-amber-100 text-amber-800"
                        )}>
                          {plan.highlight}
                        </span>

                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                          isSelected ? "bg-brand-cyan text-white" : "border border-slate-300 text-transparent"
                        )}>
                          ✓
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">{plan.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{plan.subtitle}</p>

                        {/* Price & Sessions Estimates */}
                        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Estimativa:</span>
                            <span className="font-black text-slate-900">{plan.estimatedPriceRange}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Sessões:</span>
                            <span className="font-bold text-slate-700">{plan.estimatedSessions} consultas (~{plan.estimatedDurationWeeks} sem)</span>
                          </div>
                        </div>

                        {/* Procedures Phases */}
                        <div className="space-y-2.5 mb-4">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Etapas do Tratamento:</span>
                          {plan.phases?.map((phase: any, pIdx: number) => (
                            <div key={pIdx} className="text-xs space-y-1">
                              <p className="font-bold text-slate-800 text-[11px]">{phase.phaseName}</p>
                              <ul className="space-y-0.5 pl-3">
                                {phase.procedures?.map((proc: string, procIdx: number) => (
                                  <li key={procIdx} className="text-[11px] text-slate-600 list-disc">
                                    {proc}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        {/* Patient Pitch */}
                        <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[10px] text-indigo-900 leading-snug mb-3">
                          <strong className="block text-indigo-950 font-bold mb-0.5">Argumento para o Paciente:</strong>
                          "{plan.patientFriendlyPitch}"
                        </div>
                      </div>

                      <button
                        type="button"
                        className={cn(
                          "w-full py-2 rounded-xl text-xs font-bold transition-all text-center mt-2",
                          isSelected 
                            ? "bg-brand-cyan text-white shadow-xs" 
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {isSelected ? 'Plano Selecionado' : 'Escolher este Plano'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Prescriptions & Contraindications Footer */}
              {planResult.prescriptionsSuggested?.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-4 h-4 text-brand-cyan shrink-0" />
                    <span><strong>Prescrição sugerida:</strong> {planResult.prescriptionsSuggested.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {planResult ? 'Selecione o plano desejado e clique em converter para orçamento.' : 'Preencha os dados e clique em "Gerar Propostas com IA".'}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {planResult && (
              <button
                onClick={handleApplyBudget}
                disabled={!selectedPlanId}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              >
                {appliedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Orçamento Gerado com Sucesso!
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Converter Plano em Orçamento
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
