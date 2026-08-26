import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  DollarSign, 
  Printer, 
  Send, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  CreditCard, 
  Sparkles, 
  FileText, 
  Percent, 
  Building2,
  Stethoscope,
  ShieldCheck,
  Clock,
  ChevronDown
} from 'lucide-react';
import { format, addDays, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../lib/utils';

export interface BudgetItem {
  id: string;
  procedure: string;
  teeth?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DentalBudget {
  id: string;
  budgetNumber: string;
  planTitle: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  patientCpf?: string;
  dentistName: string;
  clinicName?: string;
  date: string;
  validUntil: string;
  items: BudgetItem[];
  subtotal: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'À Vista (PIX/Dinheiro)' | 'Cartão de Crédito' | 'Boleto Bancário' | 'Carnê / Parcelado' | 'Convênio / Misto';
  installments: number;
  installmentValue: number;
  status: 'Pendente' | 'Aprovado' | 'Em Andamento' | 'Concluído' | 'Cancelado';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DentalBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: any;
  initialBudget?: DentalBudget | null;
  existingBudget?: DentalBudget | null;
  patient: {
    id?: string;
    name: string;
    phone?: string;
    cpf?: string;
    email?: string;
    dentist?: string;
  };
  currentUser?: any;
  clinicName?: string;
  onSaveBudget: (budget: DentalBudget) => void | Promise<any>;
}

export const CATALOG_PROCEDURES = [
  { name: 'Limpeza e Profilaxia Ultrassônica', price: 250 },
  { name: 'Restauração em Resina Composta (1 Face)', price: 280 },
  { name: 'Restauração em Resina Composta (2 Faces)', price: 350 },
  { name: 'Extração Simples de Dente', price: 400 },
  { name: 'Tratamento de Canal (Endodontia Unirradicular)', price: 850 },
  { name: 'Tratamento de Canal (Endodontia Multirradicular)', price: 1200 },
  { name: 'Coroa em Cerâmica / E-max', price: 2200 },
  { name: 'Implante Dentário Titânio Cone Morse', price: 3500 },
  { name: 'Clareamento Dental a Laser / Consultório', price: 800 },
  { name: 'Aplicação de Flúor e Verniz', price: 150 },
  { name: 'Placa Miorrelaxante de Bruxismo em Acrílico', price: 650 },
  { name: 'Gengivoplastia / Aumento de Coroa', price: 600 },
  { name: 'Manutenção Ortodôntica Mensal', price: 220 },
];

export default function DentalBudgetModal({
  isOpen,
  onClose,
  initialPlan,
  initialBudget,
  existingBudget,
  patient,
  currentUser,
  clinicName = 'Consultório Odontológico',
  onSaveBudget,
}: DentalBudgetModalProps) {
  const currentBudget = initialBudget || existingBudget;
  const [activeView, setActiveView] = useState<'editor' | 'preview'>(currentBudget ? 'preview' : 'editor');
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [budgetNumber, setBudgetNumber] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [date, setDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [status, setStatus] = useState<DentalBudget['status']>('Pendente');
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<DentalBudget['paymentMethod']>('Cartão de Crédito');
  const [installments, setInstallments] = useState<number>(12);
  const [notes, setNotes] = useState('');

  // Quick procedure add
  const [customProcName, setCustomProcName] = useState('');
  const [customProcPrice, setCustomProcPrice] = useState('');
  const [customProcTeeth, setCustomProcTeeth] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const defaultValid = format(addDays(new Date(), 30), 'yyyy-MM-dd');

    if (existingBudget) {
      setBudgetNumber(existingBudget.budgetNumber || `ORC-${format(new Date(), 'yyyy')}-${Math.floor(100 + Math.random() * 900)}`);
      setPlanTitle(existingBudget.planTitle || 'Tratamento Odontológico');
      setDate(existingBudget.date || todayStr);
      setValidUntil(existingBudget.validUntil || defaultValid);
      setDentistName(existingBudget.dentistName || patient.dentist || currentUser?.name || 'Dr(a). Responsável');
      setStatus(existingBudget.status || 'Pendente');
      setItems(existingBudget.items || []);
      setDiscountType(existingBudget.discountType || 'percent');
      setDiscountValue(existingBudget.discountValue !== undefined ? existingBudget.discountValue : 10);
      setPaymentMethod(existingBudget.paymentMethod || 'Cartão de Crédito');
      setInstallments(existingBudget.installments || 12);
      setNotes(existingBudget.notes || 'Validade da proposta de 30 dias. Valores sujeitos a confirmação após avaliação clínica presencial.');
    } else if (initialPlan) {
      setBudgetNumber(`ORC-${format(new Date(), 'yyyy')}-${Math.floor(100 + Math.random() * 900)}`);
      setPlanTitle(initialPlan.title || 'Plano de Reabilitação Oral');
      setDate(todayStr);
      setValidUntil(defaultValid);
      setDentistName(patient.dentist || currentUser?.name || 'Dr(a). Responsável');
      setStatus('Pendente');

      // Convert initialPlan.items to BudgetItem[]
      let planItems: BudgetItem[] = [];
      if (Array.isArray(initialPlan.items) && initialPlan.items.length > 0) {
        planItems = initialPlan.items.map((it: any, idx: number) => {
          const unitP = Number(it.price || it.valor || (initialPlan.total ? initialPlan.total / initialPlan.items.length : 350)) || 350;
          return {
            id: `item-${Date.now()}-${idx}`,
            procedure: it.procedure || it.name || it.title || 'Procedimento Clínico',
            teeth: it.teeth || it.tooth || it.dente || 'Geral',
            quantity: it.quantity || 1,
            unitPrice: unitP,
            total: (it.quantity || 1) * unitP
          };
        });
      } else {
        // Default items if empty
        const totalVal = initialPlan.total || 1500;
        planItems = [
          {
            id: `item-${Date.now()}-1`,
            procedure: initialPlan.title || 'Tratamento Odontológico Planejado',
            teeth: 'Geral',
            quantity: 1,
            unitPrice: totalVal,
            total: totalVal
          }
        ];
      }
      setItems(planItems);
      setDiscountType('percent');
      setDiscountValue(10);
      setPaymentMethod('Cartão de Crédito');
      setInstallments(12);
      setNotes('Validade desta proposta: 30 dias. Garantia de 1 ano para restaurações e próteses mediante comparecimento às consultas preventivas semestrais.');
    } else {
      // Clean blank budget
      setBudgetNumber(`ORC-${format(new Date(), 'yyyy')}-${Math.floor(100 + Math.random() * 900)}`);
      setPlanTitle('Orçamento Odontológico Geral');
      setDate(todayStr);
      setValidUntil(defaultValid);
      setDentistName(patient.dentist || currentUser?.name || 'Dr(a). Responsável');
      setStatus('Pendente');
      setItems([
        {
          id: `item-${Date.now()}-0`,
          procedure: 'Avaliação Clínica e Planejamento',
          teeth: 'Geral',
          quantity: 1,
          unitPrice: 150,
          total: 150
        }
      ]);
      setDiscountType('percent');
      setDiscountValue(5);
      setPaymentMethod('À Vista (PIX/Dinheiro)');
      setInstallments(1);
      setNotes('Validade da proposta de 30 dias. Condições facilitadas de pagamento.');
    }
  }, [isOpen, initialPlan, existingBudget, patient, currentUser]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * Math.min(Math.max(discountValue || 0, 0), 100)) / 100;
    }
    return Math.min(Math.max(discountValue || 0, 0), subtotal);
  }, [subtotal, discountType, discountValue]);

  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const installmentValue = useMemo(() => {
    const inst = Math.max(1, installments || 1);
    return finalTotal / inst;
  }, [finalTotal, installments]);

  const handleAddItem = (procedureName: string, price: number, teeth?: string) => {
    const newItem: BudgetItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      procedure: procedureName,
      teeth: teeth || 'Geral',
      quantity: 1,
      unitPrice: price,
      total: price
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<BudgetItem>) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        const nextQty = updates.quantity !== undefined ? Math.max(1, updates.quantity) : it.quantity;
        const nextPrice = updates.unitPrice !== undefined ? Math.max(0, updates.unitPrice) : it.unitPrice;
        return {
          ...it,
          ...updates,
          quantity: nextQty,
          unitPrice: nextPrice,
          total: nextQty * nextPrice
        };
      }
      return it;
    }));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      alert('Adicione pelo menos um procedimento ao orçamento.');
      return;
    }

    setIsSaving(true);
    try {
      const budgetPayload: DentalBudget = {
        id: existingBudget?.id || `budget-${Date.now()}`,
        budgetNumber: budgetNumber || `ORC-${Date.now()}`,
        planTitle: planTitle || 'Orçamento Odontológico',
        patientId: patient.id || patient.name,
        patientName: patient.name,
        patientPhone: patient.phone,
        patientCpf: patient.cpf,
        dentistName: dentistName || 'Dr(a). Responsável',
        clinicName,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        validUntil: validUntil || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        total: finalTotal,
        paymentMethod,
        installments,
        installmentValue,
        status,
        notes,
        updatedAt: new Date().toISOString(),
        createdAt: existingBudget?.createdAt || new Date().toISOString()
      };

      await onSaveBudget(budgetPayload);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err);
      alert('Erro ao gravar orçamento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!patient.phone || patient.phone === 'Não informado') {
      alert('O paciente não possui número de telefone cadastrado.');
      return;
    }
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    const itemsSummary = items.map((it, idx) => `  ${idx + 1}. ${it.procedure} (${it.teeth || 'Geral'}) - ${formatCurrency(it.total)}`).join('\n');
    
    let paymentDesc = `À Vista: ${formatCurrency(finalTotal)}`;
    if (paymentMethod === 'Cartão de Crédito' && installments > 1) {
      paymentDesc = `${installments}x de ${formatCurrency(installmentValue)} sem juros no cartão de crédito`;
    } else {
      paymentDesc = `${paymentMethod}: ${formatCurrency(finalTotal)}`;
    }

    const msg = 
`🦷 *ORÇAMENTO ODONTOLÓGICO - ${clinicName.toUpperCase()}*

Olá, *${patient.name}*! Segue a proposta do seu plano de tratamento:

📋 *Plano:* ${planTitle}
📄 *Nº Orçamento:* ${budgetNumber}
📅 *Data:* ${date ? format(parseISO(date), 'dd/MM/yyyy') : '-'}
⏳ *Validade:* ${validUntil ? format(parseISO(validUntil), 'dd/MM/yyyy') : '30 dias'}
👨‍⚕️ *Cirurgião-Dentista:* ${dentistName}

*PROCEDIMENTOS PLANEJADOS:*
${itemsSummary}

-----------------------------------
💰 *Subtotal:* ${formatCurrency(subtotal)}
🏷️ *Desconto Aplicado:* -${formatCurrency(discountAmount)}
⭐ *INVESTIMENTO FINAL:* *${formatCurrency(finalTotal)}*

💳 *CONDIÇÕES DE PAGAMENTO:*
${paymentDesc}

${notes ? `📝 *Observações:* ${notes}\n\n` : ''}Ficamos à total disposição para tirar dúvidas e agendar o início do seu tratamento! ✨`;

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white flex items-center justify-between shrink-0 border-b border-cyan-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-cyan text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shadow-brand-cyan/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {existingBudget ? 'Orçamento Odontológico' : 'Gerar Orçamento do Plano'}
                </h2>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                  status === 'Aprovado' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  status === 'Concluído' ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" :
                  status === 'Cancelado' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                  "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                )}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-cyan-300/80 mt-0.5">
                Paciente: <strong className="text-white">{patient.name}</strong> • Nº {budgetNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="hidden sm:flex bg-white/10 p-1 rounded-xl border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveView('editor')}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeView === 'editor' ? "bg-white text-slate-900 shadow-xs" : "text-white/70 hover:text-white"
                )}
              >
                Edição & Valores
              </button>
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  activeView === 'preview' ? "bg-white text-slate-900 shadow-xs" : "text-white/70 hover:text-white"
                )}
              >
                Documento / Impressão
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          
          {activeView === 'editor' ? (
            <div className="space-y-6">
              
              {/* General Metadata Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Título da Proposta</label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={e => setPlanTitle(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                    placeholder="Ex: Reabilitação e Implantes"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cirurgião-Dentista</label>
                  <input
                    type="text"
                    value={dentistName}
                    onChange={e => setDentistName(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                    placeholder="Nome do Dentista"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status do Orçamento</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                  >
                    <option value="Pendente">🟡 Pendente (Aguardando Paciente)</option>
                    <option value="Aprovado">🟢 Aprovado pelo Paciente</option>
                    <option value="Em Andamento">🔵 Em Execução Clínica</option>
                    <option value="Concluído">✅ Concluído e Pago</option>
                    <option value="Cancelado">🔴 Cancelado / Recusado</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 col-span-1 sm:col-span-3 pt-1 border-t border-slate-200/60">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data de Emissão</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Validade da Proposta</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={e => setValidUntil(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-cyan"
                    />
                  </div>
                </div>
              </div>

              {/* Procedures Item Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-brand-cyan" />
                    Procedimentos do Orçamento ({items.length})
                  </h3>
                  <span className="text-xs font-black text-slate-700">
                    Subtotal: {formatCurrency(subtotal)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                    <p className="text-xs text-slate-400 font-bold">Nenhum procedimento adicionado ainda.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Procedimento</th>
                            <th className="px-3 py-3 w-28">Dente / Região</th>
                            <th className="px-3 py-3 w-20 text-center">Qtd</th>
                            <th className="px-3 py-3 w-28 text-right">Valor Unit.</th>
                            <th className="px-4 py-3 w-28 text-right">Total</th>
                            <th className="px-3 py-3 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800">
                                <input
                                  type="text"
                                  value={item.procedure}
                                  onChange={e => handleUpdateItem(item.id, { procedure: e.target.value })}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-cyan focus:bg-white outline-none px-1 py-0.5 rounded text-xs font-bold text-slate-800"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={item.teeth || ''}
                                  onChange={e => handleUpdateItem(item.id, { teeth: e.target.value })}
                                  placeholder="Ex: Dente 16"
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-cyan focus:bg-white outline-none px-1 py-0.5 rounded text-xs text-slate-600"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={e => handleUpdateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                  className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                                />
                              </td>
                              <td className="px-3 py-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="10"
                                  value={item.unitPrice}
                                  onChange={e => handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-black text-slate-900">
                                {formatCurrency(item.total)}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remover procedimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quick Add Buttons & Custom Input */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    + Adicionar Procedimentos Rápidos do Catálogo:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATALOG_PROCEDURES.map(proc => (
                      <button
                        key={proc.name}
                        type="button"
                        onClick={() => handleAddItem(proc.name, proc.price)}
                        className="px-2.5 py-1.5 bg-white hover:bg-brand-cyan hover:text-slate-950 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Plus className="w-3 h-3 text-brand-cyan" />
                        <span>{proc.name}</span>
                        <span className="font-mono text-[10px] font-bold text-slate-400">({formatCurrency(proc.price)})</span>
                      </button>
                    ))}
                  </div>

                  {/* Manual add custom procedure */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Outro procedimento personalizado..."
                      value={customProcName}
                      onChange={e => setCustomProcName(e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                    />
                    <input
                      type="text"
                      placeholder="Dente/Região"
                      value={customProcTeeth}
                      onChange={e => setCustomProcTeeth(e.target.value)}
                      className="w-full sm:w-28 p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-brand-cyan"
                    />
                    <input
                      type="number"
                      placeholder="Valor (R$)"
                      value={customProcPrice}
                      onChange={e => setCustomProcPrice(e.target.value)}
                      className="w-full sm:w-28 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customProcName.trim()) return alert('Informe o nome do procedimento');
                        const pVal = parseFloat(customProcPrice) || 0;
                        handleAddItem(customProcName.trim(), pVal, customProcTeeth.trim());
                        setCustomProcName('');
                        setCustomProcPrice('');
                        setCustomProcTeeth('');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Financial Conditions, Discounts & Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Payment Methods */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-cyan" />
                    Forma de Pagamento Acordada
                  </h4>

                  <div className="space-y-2">
                    {[
                      { id: 'À Vista (PIX/Dinheiro)', label: 'À Vista (PIX / Dinheiro)', desc: 'Desconto direto aplicado' },
                      { id: 'Cartão de Crédito', label: 'Cartão de Crédito', desc: 'Parcelamento em até 12x' },
                      { id: 'Boleto Bancário', label: 'Boleto Bancário', desc: 'Entrada + Parcelas' },
                      { id: 'Carnê / Parcelado', label: 'Carnê da Clínica', desc: 'Parcelamento interno' },
                      { id: 'Convênio / Misto', label: 'Convênio / Misto', desc: 'Co-participação' },
                    ].map(method => (
                      <label
                        key={method.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                          paymentMethod === method.id 
                            ? "bg-white border-brand-cyan shadow-xs ring-1 ring-brand-cyan/40" 
                            : "bg-white/60 border-slate-200 hover:bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === method.id}
                            onChange={() => setPaymentMethod(method.id as any)}
                            className="accent-brand-cyan"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{method.label}</p>
                            <p className="text-[10px] text-slate-400">{method.desc}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {paymentMethod === 'Cartão de Crédito' && (
                    <div className="p-3 bg-cyan-50/50 border border-cyan-200/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Número de Parcelas no Cartão:
                        </label>
                        <select
                          value={installments}
                          onChange={e => setInstallments(parseInt(e.target.value) || 1)}
                          className="p-1.5 bg-white border border-cyan-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>
                              {n}x de {formatCurrency(finalTotal / n)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] font-bold text-cyan-800">
                        ✨ Proposta: {installments}x de {formatCurrency(installmentValue)} sem juros.
                      </p>
                    </div>
                  )}
                </div>

                {/* Summary & Totals */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-5 flex flex-col justify-between shadow-lg">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Resumo Financeiro da Proposta
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal dos Procedimentos:</span>
                        <span className="font-mono font-bold text-white">{formatCurrency(subtotal)}</span>
                      </div>

                      {/* Discount selector */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-bold">Desconto Concedido:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDiscountType('percent')}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold",
                                discountType === 'percent' ? "bg-brand-cyan text-slate-950" : "bg-white/10 text-white"
                              )}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiscountType('fixed')}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold",
                                discountType === 'fixed' ? "bg-brand-cyan text-slate-950" : "bg-white/10 text-white"
                              )}
                            >
                              R$
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="number"
                            min="0"
                            max={discountType === 'percent' ? 100 : subtotal}
                            value={discountValue}
                            onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-24 p-1.5 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white outline-none focus:border-brand-cyan"
                          />
                          <span className="text-emerald-400 font-bold text-xs font-mono">
                            -{formatCurrency(discountAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/15 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total com Desconto</p>
                        <p className="text-2xl sm:text-3xl font-black text-brand-cyan">{formatCurrency(finalTotal)}</p>
                      </div>
                      {installments > 1 && (
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parcelamento</p>
                          <p className="text-xs font-bold text-white">
                            {installments}x de <span className="text-brand-cyan font-black">{formatCurrency(installmentValue)}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Notes and Terms */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Observações e Garantias da Proposta
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-brand-cyan focus:bg-white"
                  placeholder="Informações sobre garantias, recomendações pós-procedimento e prazos..."
                />
              </div>

            </div>
          ) : (
            /* Printable PDF Preview */
            <div id="printable-budget-document" className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8 print:p-0 print:border-none">
              
              {/* Document Header */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-brand-cyan flex items-center justify-center font-black">
                      🦷
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{clinicName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Excelência em Odontologia Integrada & Estética</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-900 uppercase tracking-wider">
                    Orçamento #{budgetNumber}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Emitido em: {date ? format(parseISO(date), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
              </div>

              {/* Patient & Clinic Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dados do Paciente</p>
                  <p className="font-bold text-slate-900 text-sm">{patient.name}</p>
                  <p className="text-slate-600">CPF: {patient.cpf || 'Não informado'}</p>
                  <p className="text-slate-600">Telefone: {patient.phone || 'Não informado'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Responsável Clínico</p>
                  <p className="font-bold text-slate-900">{dentistName}</p>
                  <p className="text-slate-600">Plano: {planTitle}</p>
                  <p className="text-slate-600 font-bold text-emerald-700">
                    Válido até: {validUntil ? format(parseISO(validUntil), 'dd/MM/yyyy') : '30 dias'}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Discriminação de Procedimentos</h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-4 py-2.5">Procedimento</th>
                      <th className="px-4 py-2.5">Região/Dente</th>
                      <th className="px-4 py-2.5 text-center">Qtd</th>
                      <th className="px-4 py-2.5 text-right">Valor Unit.</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="px-4 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{it.procedure}</td>
                        <td className="px-4 py-2.5 text-slate-600">{it.teeth || 'Geral'}</td>
                        <td className="px-4 py-2.5 text-center text-slate-800 font-bold">{it.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900">{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Box */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Desconto Aplicado ({discountType === 'percent' ? `${discountValue}%` : 'Fixo'}):</span>
                  <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Valor Total da Proposta:</span>
                  <span className="text-xl text-slate-950">{formatCurrency(finalTotal)}</span>
                </div>
                <div className="pt-2 text-xs text-slate-700">
                  <span className="font-bold">Condição de Pagamento: </span>
                  {paymentMethod} 
                  {paymentMethod === 'Cartão de Crédito' && installments > 1 ? ` (${installments}x de ${formatCurrency(installmentValue)} sem juros)` : ''}
                </div>
              </div>

              {notes && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Termos & Observações:</p>
                  <p>{notes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
                <div className="space-y-2">
                  <div className="w-full border-b border-slate-400 pb-1" />
                  <p className="font-bold text-slate-900">{patient.name}</p>
                  <p className="text-[10px] text-slate-400">Assinatura do Paciente / Responsável</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full border-b border-slate-400 pb-1" />
                  <p className="font-bold text-slate-900">{dentistName}</p>
                  <p className="text-[10px] text-slate-400">Cirurgião-Dentista Responsável</p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              disabled={isSaving || items.length === 0}
              onClick={handleSave}
              className="px-6 py-2.5 bg-slate-900 hover:bg-brand-cyan hover:text-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Orçamento</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
