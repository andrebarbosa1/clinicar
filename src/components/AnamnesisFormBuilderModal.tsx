import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Settings2, 
  Sparkles, 
  MoveUp, 
  MoveDown, 
  Sliders, 
  HelpCircle, 
  Save, 
  RotateCcw,
  Layers,
  FileCheck2,
  CheckCircle2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { AnamnesisCustomField, AnamnesisFieldType } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AnamnesisFormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicOwnerId: string;
  customFields: AnamnesisCustomField[];
  onSaveFields: (fields: AnamnesisCustomField[]) => Promise<boolean>;
  currentUser: any;
}

const CATEGORIES = [
  'Geral',
  'Cardiovascular',
  'Cirúrgico',
  'Medicamentos & Alergias',
  'Hábitos & Estilo de Vida',
  'Ortodontia & DTM',
  'Odontopediatria',
  'Outros'
];

const PRESETS: { title: string; desc: string; icon: string; fields: Omit<AnamnesisCustomField, 'id' | 'order'>[] }[] = [
  {
    title: 'Cirúrgico & Implantodontia',
    desc: 'Bifosfonatos, anticoagulantes, cicatrização e próteses',
    icon: '🏥',
    fields: [
      {
        label: 'Faz uso de anticoagulantes, antiagregantes ou AAS?',
        type: 'boolean',
        category: 'Cirúrgico',
        isAlertIfTrue: true,
        placeholder: 'Detalhes da dosagem',
        required: false,
        active: true
      },
      {
        label: 'Fez ou faz uso de Bifosfonatos (Alendronato, Zometa, etc.)?',
        type: 'boolean',
        category: 'Cirúrgico',
        isAlertIfTrue: true,
        placeholder: 'Tempo de uso e indicação',
        required: false,
        active: true
      },
      {
        label: 'Histórico de cicatrização queloideana ou hemorragias?',
        type: 'boolean',
        category: 'Cirúrgico',
        isAlertIfTrue: true,
        required: false,
        active: true
      },
      {
        label: 'Possui prótese valvar cardíaca ou marca-passo?',
        type: 'boolean',
        category: 'Cardiovascular',
        isAlertIfTrue: true,
        required: false,
        active: true
      }
    ]
  },
  {
    title: 'Ortodontia & DTM / Oclusão',
    desc: 'Bruxismo, dores na ATM, estalidos e respiração',
    icon: '🦷',
    fields: [
      {
        label: 'Apresenta dor, estalidos ou ruídos na ATM (abrir/fechar a boca)?',
        type: 'boolean',
        category: 'Ortodontia & DTM',
        isAlertIfTrue: true,
        required: false,
        active: true
      },
      {
        label: 'Hábito de apertar ou ranger os dentes (Bruxismo)?',
        type: 'select',
        category: 'Ortodontia & DTM',
        options: ['Não', 'Sim (Diurno)', 'Sim (Noturno)', 'Sim (Diurno e Noturno)'],
        isAlertIfTrue: true,
        alertTriggerValue: 'Sim (Noturno)',
        required: false,
        active: true
      },
      {
        label: 'Tipo predominante de respiração',
        type: 'select',
        category: 'Ortodontia & DTM',
        options: ['Nasal', 'Bucal', 'Mista'],
        required: false,
        active: true
      }
    ]
  },
  {
    title: 'Ansiedade & Conforto Clínico',
    desc: 'Escala de medo, anestesia e preferências',
    icon: '🧘',
    fields: [
      {
        label: 'Nível de ansiedade / medo de tratamentos odontológicos',
        type: 'select',
        category: 'Hábitos & Estilo de Vida',
        options: ['1 - Muito Tranquilo', '2 - Leve ansiedade', '3 - Moderado', '4 - Alto medo', '5 - Fobia severa'],
        isAlertIfTrue: true,
        alertTriggerValue: '5 - Fobia severa',
        required: false,
        active: true
      },
      {
        label: 'Já teve sensação de desmaio ou tontura na cadeira do dentista?',
        type: 'boolean',
        category: 'Geral',
        isAlertIfTrue: true,
        required: false,
        active: true
      }
    ]
  }
];

export default function AnamnesisFormBuilderModal({
  isOpen,
  onClose,
  clinicOwnerId,
  customFields,
  onSaveFields,
  currentUser
}: AnamnesisFormBuilderModalProps) {
  const [fields, setFields] = useState<AnamnesisCustomField[]>(() => {
    return (customFields || []).map((f, i) => ({ ...f, order: f.order ?? i }));
  });

  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'presets'>('fields');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for add / edit
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<AnamnesisFieldType>('boolean');
  const [fieldCategory, setFieldCategory] = useState('Geral');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldHelperText, setFieldHelperText] = useState('');
  const [fieldIsAlert, setFieldIsAlert] = useState(true);
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<string[]>(['Opção 1', 'Opção 2']);
  const [newOptionInput, setNewOptionInput] = useState('');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartAdd = () => {
    setFieldLabel('');
    setFieldType('boolean');
    setFieldCategory('Geral');
    setFieldPlaceholder('');
    setFieldHelperText('');
    setFieldIsAlert(true);
    setFieldRequired(false);
    setFieldOptions(['Sim', 'Não']);
    setIsEditingId(null);
    setIsAddingNew(true);
  };

  const handleStartEdit = (f: AnamnesisCustomField) => {
    setIsAddingNew(false);
    setIsEditingId(f.id);
    setFieldLabel(f.label);
    setFieldType(f.type);
    setFieldCategory(f.category || 'Geral');
    setFieldPlaceholder(f.placeholder || '');
    setFieldHelperText(f.helperText || '');
    setFieldIsAlert(!!f.isAlertIfTrue);
    setFieldRequired(!!f.required);
    setFieldOptions(f.options && f.options.length > 0 ? f.options : ['Sim', 'Não']);
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setIsEditingId(null);
  };

  const handleSaveFieldItem = () => {
    if (!fieldLabel.trim()) {
      alert('Por favor, informe a pergunta ou rótulo do campo.');
      return;
    }

    if (isAddingNew) {
      const newField: AnamnesisCustomField = {
        id: `cfield-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: fieldLabel.trim(),
        type: fieldType,
        category: fieldCategory,
        placeholder: fieldPlaceholder.trim() || undefined,
        helperText: fieldHelperText.trim() || undefined,
        isAlertIfTrue: fieldIsAlert,
        required: fieldRequired,
        options: fieldType === 'select' ? fieldOptions.filter(o => o.trim()) : undefined,
        active: true,
        order: fields.length
      };
      setFields(prev => [...prev, newField]);
      showToast('Campo personalizado adicionado!');
    } else if (isEditingId) {
      setFields(prev => prev.map(f => {
        if (f.id === isEditingId) {
          return {
            ...f,
            label: fieldLabel.trim(),
            type: fieldType,
            category: fieldCategory,
            placeholder: fieldPlaceholder.trim() || undefined,
            helperText: fieldHelperText.trim() || undefined,
            isAlertIfTrue: fieldIsAlert,
            required: fieldRequired,
            options: fieldType === 'select' ? fieldOptions.filter(o => o.trim()) : undefined
          };
        }
        return f;
      }));
      showToast('Campo atualizado!');
    }

    handleCancelForm();
  };

  const handleDeleteField = (id: string) => {
    if (confirm('Deseja realmente remover este campo personalizado?')) {
      setFields(prev => prev.filter(f => f.id !== id));
      if (isEditingId === id) handleCancelForm();
      showToast('Campo removido.');
    }
  };

  const handleToggleActive = (id: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const newArr = [...fields];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    // update order property
    const reordered = newArr.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    const added: AnamnesisCustomField[] = preset.fields.map((pf, idx) => ({
      ...pf,
      id: `cfield-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      order: fields.length + idx
    }));

    setFields(prev => [...prev, ...added]);
    setActiveTab('fields');
    showToast(`Modelo "${preset.title}" aplicado! (${added.length} perguntas adicionadas)`);
  };

  const handleSaveAllToFirestore = async () => {
    setIsSaving(true);
    try {
      const success = await onSaveFields(fields);
      if (success) {
        showToast('Formulário de Anamnese salvo com sucesso no Firestore!');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      alert('Erro ao salvar no Firestore: ' + (err.message || 'Erro de rede'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOption = () => {
    if (!newOptionInput.trim()) return;
    if (!fieldOptions.includes(newOptionInput.trim())) {
      setFieldOptions([...fieldOptions, newOptionInput.trim()]);
    }
    setNewOptionInput('');
  };

  const handleRemoveOption = (optToRemove: string) => {
    setFieldOptions(fieldOptions.filter(o => o !== optToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Editor de Formulário Dinâmico de Anamnese</h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Personalize as perguntas e campos clínicos adicionais para os pacientes desta clínica
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

        {/* Navigation Sub-header */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('fields'); handleCancelForm(); }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'fields' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-200/60"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Campos Personalizados ({fields.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('presets'); handleCancelForm(); }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'presets' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-200/60"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Modelos Clínicos Sugeridos</span>
            </button>
          </div>

          {activeTab === 'fields' && !isAddingNew && !isEditingId && (
            <button
              onClick={handleStartAdd}
              className="px-3.5 py-1.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Campo</span>
            </button>
          )}
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/70 p-4 rounded-2xl text-amber-900 text-xs">
                <p className="font-bold">Dica Clínica:</p>
                <p className="text-amber-800/90 mt-0.5">
                  Adicione blocos de perguntas pré-configuradas com 1 clique para especialidades cirúrgicas, ortodônticas ou pediátricas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PRESETS.map((preset, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-brand-cyan/40 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="text-2xl">{preset.icon}</div>
                      <h4 className="text-sm font-black text-slate-900">{preset.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{preset.desc}</p>
                      
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Perguntas inclusas:
                        </span>
                        <ul className="text-[11px] text-slate-600 space-y-1">
                          {preset.fields.map((pf, fIdx) => (
                            <li key={fIdx} className="truncate flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-brand-cyan shrink-0" />
                              <span className="truncate">{pf.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="mt-5 w-full py-2 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar ao Questionário</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: FIELDS MANAGEMENT */}
          {activeTab === 'fields' && (
            <div className="space-y-6">

              {/* Form to Add or Edit a Field */}
              {(isAddingNew || isEditingId) && (
                <div className="bg-slate-50 border-2 border-brand-cyan/30 rounded-3xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-brand-cyan" />
                      <span>{isAddingNew ? 'Cadastrar Novo Campo Personalizado' : 'Editar Campo Personalizado'}</span>
                    </h4>
                    <button
                      onClick={handleCancelForm}
                      className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Label */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Pergunta / Rótulo do Campo *
                      </label>
                      <input
                        type="text"
                        value={fieldLabel}
                        onChange={(e) => setFieldLabel(e.target.value)}
                        placeholder="Ex: Faz uso contínuo de anticoagulantes?"
                        className="w-full text-xs font-bold p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/10 text-slate-800"
                      />
                    </div>

                    {/* Field Type */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Tipo de Resposta
                      </label>
                      <select
                        value={fieldType}
                        onChange={(e) => setFieldType(e.target.value as AnamnesisFieldType)}
                        className="w-full text-xs font-bold p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan text-slate-800"
                      >
                        <option value="boolean">Sim / Não (Booleano)</option>
                        <option value="text">Texto Curto (Linha única)</option>
                        <option value="textarea">Texto Longo (Observações detalhadas)</option>
                        <option value="select">Lista de Seleção (Múltipla Escolha)</option>
                        <option value="number">Número (Dosagem / Escala)</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Categoria / Seção Clínica
                      </label>
                      <select
                        value={fieldCategory}
                        onChange={(e) => setFieldCategory(e.target.value)}
                        className="w-full text-xs font-bold p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan text-slate-800"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Options builder for Select Type */}
                    {fieldType === 'select' && (
                      <div className="space-y-2 md:col-span-2 p-4 bg-white rounded-2xl border border-slate-200">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                          Opções da Lista de Seleção
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newOptionInput}
                            onChange={(e) => setNewOptionInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                            placeholder="Digite uma opção e pressione Enter"
                            className="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand-cyan"
                          />
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-brand-cyan hover:text-slate-950 transition-all cursor-pointer"
                          >
                            + Adicionar Opção
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {fieldOptions.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200"
                            >
                              <span>{opt}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(opt)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Placeholder */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Placeholder / Texto de Exemplo (Opcional)
                      </label>
                      <input
                        type="text"
                        value={fieldPlaceholder}
                        onChange={(e) => setFieldPlaceholder(e.target.value)}
                        placeholder="Ex: Detalhe o tempo de uso..."
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan text-slate-800"
                      />
                    </div>

                    {/* Helper text */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Orientação ao Paciente/Dentista (Opcional)
                      </label>
                      <input
                        type="text"
                        value={fieldHelperText}
                        onChange={(e) => setFieldHelperText(e.target.value)}
                        placeholder="Ex: Importante para evitar riscos cirúrgicos"
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-white border border-slate-200/70 hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={fieldIsAlert}
                        onChange={(e) => setFieldIsAlert(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Alerta de Risco Clínico</span>
                        </p>
                        <p className="text-[10px] text-slate-400">Destacar em vermelho na ficha se a resposta for afirmativa</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-white border border-slate-200/70 hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={fieldRequired}
                        onChange={(e) => setFieldRequired(e.target.checked)}
                        className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Campo Obrigatório</p>
                        <p className="text-[10px] text-slate-400">Exigir resposta no preenchimento da ficha</p>
                      </div>
                    </label>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFieldItem}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isAddingNew ? 'Inserir Campo' : 'Salvar Alterações do Campo'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* List of Existing Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Campos Ativos ({fields.filter(f => f.active).length} de {fields.length})</span>
                  <span>Arraste ou use as setas para reordenar</span>
                </div>

                {fields.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3 bg-slate-50/50">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-brand-cyan flex items-center justify-center mx-auto">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nenhum campo personalizado adicionado</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        O formulário usará exclusivamente os 9 campos padrão do sistema até que você crie novas perguntas personalizadas.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={handleStartAdd}
                        className="px-4 py-2 bg-brand-cyan text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-cyan-500 transition-all cursor-pointer"
                      >
                        + Criar Primeiro Campo
                      </button>
                      <button
                        onClick={() => setActiveTab('presets')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        Ver Modelos Sugeridos
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {fields.map((f, idx) => (
                      <div
                        key={f.id}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex items-center justify-between gap-4",
                          f.active 
                            ? "bg-white border-slate-200 hover:border-brand-cyan/40 shadow-xs" 
                            : "bg-slate-50 border-slate-200/50 opacity-60"
                        )}
                      >
                        {/* Order & Drag indicators */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col gap-0.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMove(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                              title="Mover para cima"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === fields.length - 1}
                              onClick={() => handleMove(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                              title="Mover para baixo"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                        </div>

                        {/* Field Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-slate-900 truncate">{f.label}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                              {f.category || 'Geral'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-brand-cyan uppercase">
                              {f.type}
                            </span>
                            {f.isAlertIfTrue && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 flex items-center gap-1 border border-rose-200">
                                <AlertCircle className="w-3 h-3" />
                                <span>Alerta</span>
                              </span>
                            )}
                            {f.required && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          {f.placeholder && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">Ex: {f.placeholder}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(f.id)}
                            className={cn(
                              "p-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                              f.active ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-200"
                            )}
                            title={f.active ? "Desativar campo" : "Ativar campo"}
                          >
                            {f.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(f)}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer text-xs font-bold"
                            title="Editar campo"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteField(f.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Remover campo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer with Persistent Save to Firestore */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>As perguntas personalizadas são compartilhadas entre todos os dentistas da clínica.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handleSaveAllToFirestore}
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-cyan hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-cyan/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando no Firestore...' : 'Salvar Formulário no Firestore'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
