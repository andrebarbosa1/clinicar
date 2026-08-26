import React, { useState } from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  HeartPulse, 
  Save, 
  CheckCircle2, 
  FileText,
  HelpCircle
} from 'lucide-react';
import { AnamnesisCustomField, PatientAnamnesis } from '../types';
import { cn } from '../lib/utils';
import { SecurityUtils } from '../lib/security';

interface AnamnesisPatientEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  anamnesis: PatientAnamnesis;
  customFields: AnamnesisCustomField[];
  onSaveAnamnesis: (patientId: string, updatedData: PatientAnamnesis) => Promise<boolean>;
}

export default function AnamnesisPatientEditModal({
  isOpen,
  onClose,
  patientName,
  patientId,
  anamnesis,
  customFields,
  onSaveAnamnesis
}: AnamnesisPatientEditModalProps) {
  // Standard fields
  const [hasAllergy, setHasAllergy] = useState(!!anamnesis.hasAllergy);
  const [allergyDetails, setAllergyDetails] = useState(anamnesis.allergyDetails || anamnesis.allergies || '');
  const [hasHeartProblem, setHasHeartProblem] = useState(!!anamnesis.hasHeartProblem);
  const [hasHypertension, setHasHypertension] = useState(!!anamnesis.hasHypertension);
  const [hasDiabetes, setHasDiabetes] = useState(!!anamnesis.hasDiabetes);
  const [takesMedication, setTakesMedication] = useState(!!anamnesis.takesMedication);
  const [medicationDetails, setMedicationDetails] = useState(anamnesis.medicationDetails || anamnesis.medications || '');
  const [isSmoker, setIsSmoker] = useState(!!anamnesis.isSmoker);
  const [hasBleedingHistory, setHasBleedingHistory] = useState(!!anamnesis.hasBleedingHistory);
  const [isPregnant, setIsPregnant] = useState(!!anamnesis.isPregnant);
  const [hasAnesthesiaReaction, setHasAnesthesiaReaction] = useState(!!anamnesis.hasAnesthesiaReaction);
  const [generalNotes, setGeneralNotes] = useState(anamnesis.generalNotes || '');
  const [chiefComplaint, setChiefComplaint] = useState(anamnesis.chiefComplaint || '');
  const [medicalHistory, setMedicalHistory] = useState(anamnesis.medicalHistory || '');

  // Custom Fields state: Record<string, any>
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(() => {
    return anamnesis.customFields || {};
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSave = async () => {
    // Basic XSS validation
    if (
      SecurityUtils.hasDangerousScript(allergyDetails) ||
      SecurityUtils.hasDangerousScript(medicationDetails) ||
      SecurityUtils.hasDangerousScript(generalNotes) ||
      SecurityUtils.hasDangerousScript(chiefComplaint) ||
      SecurityUtils.hasDangerousScript(medicalHistory)
    ) {
      alert('Ação bloqueada por motivos de segurança (XSS detectado).');
      return;
    }

    setIsSaving(true);
    const updatedData: PatientAnamnesis = {
      ...anamnesis,
      hasAllergy,
      allergyDetails: hasAllergy ? SecurityUtils.limit(SecurityUtils.sanitize(allergyDetails), 500) : '',
      hasHeartProblem,
      hasHypertension,
      hasDiabetes,
      takesMedication,
      medicationDetails: takesMedication ? SecurityUtils.limit(SecurityUtils.sanitize(medicationDetails), 1000) : '',
      isSmoker,
      hasBleedingHistory,
      isPregnant,
      hasAnesthesiaReaction,
      generalNotes: SecurityUtils.limit(SecurityUtils.sanitize(generalNotes), 3000),
      chiefComplaint: SecurityUtils.limit(SecurityUtils.sanitize(chiefComplaint), 1000),
      medicalHistory: SecurityUtils.limit(SecurityUtils.sanitize(medicalHistory), 3000),
      customFields: customFieldValues,
      updatedAt: new Date().toISOString()
    };

    const success = await onSaveAnamnesis(patientId, updatedData);
    if (success) {
      onClose();
    }
    setIsSaving(false);
  };

  // Group active custom fields by category
  const activeCustomFields = (customFields || []).filter(f => f.active);
  const categories = Array.from(new Set(activeCustomFields.map(f => f.category || 'Personalizados')));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Preencher / Atualizar Questionário de Saúde</h3>
              <p className="text-xs text-slate-400">
                Paciente: <strong className="text-white font-bold">{patientName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Standard General Health questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>1. Perguntas Padrão de Saúde & Risco Cirúrgico</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold">Padrão CFO / Odontologia</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'Possui Alergias?', state: hasAllergy, setter: setHasAllergy, hasDetails: true, details: allergyDetails, detailsSetter: setAllergyDetails, placeholder: 'Descreva quais alergias...' },
                { label: 'Doenças Cardiovasculares?', state: hasHeartProblem, setter: setHasHeartProblem },
                { label: 'Hipertensão Arterial?', state: hasHypertension, setter: setHasHypertension },
                { label: 'Diabetes Mellitus?', state: hasDiabetes, setter: setHasDiabetes },
                { label: 'Uso Contínuo de Medicamentos?', state: takesMedication, setter: setTakesMedication, hasDetails: true, details: medicationDetails, detailsSetter: setMedicationDetails, placeholder: 'Quais medicamentos e dosagens...' },
                { label: 'Fumante / Tabagista?', state: isSmoker, setter: setIsSmoker },
                { label: 'Hábito de Sangramento Excessivo?', state: hasBleedingHistory, setter: setHasBleedingHistory },
                { label: 'Gestante ou Lactante?', state: isPregnant, setter: setIsPregnant },
                { label: 'Reação Adversa a Anestésicos?', state: hasAnesthesiaReaction, setter: setHasAnesthesiaReaction },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5",
                    item.state ? "bg-rose-50/70 border-rose-200" : "bg-slate-50/70 border-slate-200/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 leading-snug">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => item.setter(!item.state)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0",
                        item.state 
                          ? "bg-rose-600 text-white shadow-xs" 
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      )}
                    >
                      {item.state ? 'SIM' : 'NÃO'}
                    </button>
                  </div>

                  {item.hasDetails && item.state && (
                    <input
                      type="text"
                      value={item.details}
                      onChange={(e) => item.detailsSetter && item.detailsSetter(e.target.value)}
                      placeholder={item.placeholder}
                      className="w-full text-xs p-2 bg-white border border-rose-200 rounded-xl outline-none focus:border-rose-400 text-rose-900 placeholder:text-rose-300"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Custom Clinic Anamnesis Fields (Dynamic Form) */}
          {activeCustomFields.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    2. Perguntas Personalizadas da Clínica
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-50 text-brand-cyan border border-brand-cyan/20">
                    {activeCustomFields.length} campos dinâmicos
                  </span>
                </div>
              </div>

              {categories.map((cat) => {
                const fieldsInCat = activeCustomFields.filter(f => (f.category || 'Personalizados') === cat);
                return (
                  <div key={cat} className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      {cat}
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {fieldsInCat.map((field) => {
                        const val = customFieldValues[field.id];
                        const isAlert = field.isAlertIfTrue && (val === true || val === 'Sim' || (field.alertTriggerValue && val === field.alertTriggerValue));

                        return (
                          <div
                            key={field.id}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all space-y-2 bg-white",
                              isAlert ? "border-rose-300 bg-rose-50/40" : "border-slate-200"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-bold text-slate-800 leading-snug">
                                {field.label}
                                {field.required && <span className="text-rose-500 ml-1">*</span>}
                              </label>
                              {field.isAlertIfTrue && isAlert && (
                                <span className="text-[9px] font-black text-rose-600 uppercase flex items-center gap-1 shrink-0">
                                  <AlertCircle className="w-3 h-3" />
                                  Alerta
                                </span>
                              )}
                            </div>

                            {field.helperText && (
                              <p className="text-[10px] text-slate-400">{field.helperText}</p>
                            )}

                            {/* Dynamic Input Based on Field Type */}
                            {field.type === 'boolean' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleCustomFieldChange(field.id, true)}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    val === true 
                                      ? (field.isAlertIfTrue ? "bg-rose-600 text-white" : "bg-brand-cyan text-slate-950 font-black") 
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
                                >
                                  SIM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCustomFieldChange(field.id, false)}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    val === false 
                                      ? "bg-slate-800 text-white" 
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
                                >
                                  NÃO
                                </button>
                              </div>
                            )}

                            {field.type === 'select' && (
                              <select
                                value={val || ''}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                              >
                                <option value="">Selecione uma opção...</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={val || ''}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Digite a resposta...'}
                                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                              />
                            )}

                            {field.type === 'number' && (
                              <input
                                type="number"
                                value={val ?? ''}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Informe o valor numérico...'}
                                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800"
                              />
                            )}

                            {field.type === 'textarea' && (
                              <textarea
                                value={val || ''}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Observações e detalhes clínicos...'}
                                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800 h-20 resize-none"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 3: General Clinical Notes / Complaints */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              3. Queixa Principal & Observações Clínicas
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">Queixa Principal</label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Relato do paciente sobre motivo da consulta..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800 h-24 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">Observações Gerais / Alertas</label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Anotações adicionais do dentista..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan text-slate-800 h-24 resize-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-cyan/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Respostas no Prontuário'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
