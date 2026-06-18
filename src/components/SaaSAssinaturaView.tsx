import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Check, CreditCard, Lock, AlertCircle, Calendar, Users, 
  TrendingUp, Download, QrCode, Building2, ArrowRight, Clock, 
  Smartphone, ShieldCheck, RefreshCw, Zap, Receipt, ChevronRight, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

interface SaaSAssinaturaViewProps {
  currentUser: any;
  onUpdateCurrentUser: (user: any) => void;
  db: any;
  patientsCount: number;
  dentistCount: number;
}

export default function SaaSAssinaturaView({
  currentUser,
  onUpdateCurrentUser,
  db,
  patientsCount,
  dentistCount
}: SaaSAssinaturaViewProps) {
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Plan setup
  const plans = [
    {
      id: 'Lite',
      name: 'Lite',
      price: 149,
      period: 'mês',
      color: 'from-blue-500 to-indigo-600',
      badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
      tagline: 'Ideal para profissionais autônomos iniciando.',
      limits: { dentists: 1, patients: 100 },
      features: [
        'Apenas 1 dentista cadastrado',
        'Limite de até 100 pacientes ativos',
        'Agenda clínica completa em tempo real',
        'Prontuário Odontológico Digital',
        'Relatório de faturamento básico',
        'Suporte por e-mail em horário comercial'
      ]
    },
    {
      id: 'Pro',
      name: 'Pro',
      price: 299,
      period: 'mês',
      color: 'from-brand-cyan to-blue-600',
      badgeColor: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
      tagline: 'O plano ideal para clínicas em expansão.',
      limits: { dentists: 5, patients: 1000 },
      flag: 'Mais Vendido',
      features: [
        'Até 5 dentistas integrados na mesma conta',
        'Limite estendido de até 1.000 pacientes',
        'Odontograma virtual interativo ilimitado',
        'Módulo financeiro automatizado + contas',
        'Lembretes inteligentes de consulta',
        'Disparo manual de avisos via WhatsApp',
        'Suporte prioritário via chat online'
      ]
    },
    {
      id: 'Platinum',
      name: 'Platinum',
      price: 599,
      period: 'mês',
      color: 'from-slate-800 to-slate-900',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      tagline: 'Gestão robusta e ilimitada para clínicas grandes.',
      limits: { dentists: 9999, patients: 99999 },
      features: [
        'Preenchimento de faturamento ilimitado',
        'Dentistas e pacientes ilimitados',
        'Personalização total da clínica (Marca Própria)',
        'Módulo de Estoque & Controle de Insumos',
        'Backups diários automatizados exportáveis',
        'Suporte dedicado 24h + assessoria de faturamento',
        'Treinamento online gratuito para a equipe'
      ]
    }
  ];

  const currentPlanId = currentUser?.trialPlan || 'Pro';
  const isTrialActive = currentUser?.isTrial === true;
  const isPremiumActive = currentUser?.isPremium === true;

  const [selectedPlan, setSelectedPlan] = useState<any>(plans.find(p => p.id === currentPlanId) || plans[1]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixStatus, setPixStatus] = useState<'idle' | 'generating' | 'waiting' | 'success'>('idle');
  const [pixCountdown, setPixCountdown] = useState(300); // 5 minutes
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [invoiceList, setInvoiceList] = useState<any[]>([]);

  // Calculate trial countdown if available
  const getTrialDaysRemaining = () => {
    if (!currentUser?.trialStartedAt) return 14;
    const start = new Date(currentUser.trialStartedAt);
    const bonusDays = Number(currentUser?.trialExtensionDays) || 0;
    const end = new Date(start.getTime() + (14 + bonusDays) * 24 * 60 * 60 * 1000);
    const diff = end.getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  const handleClaimVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim() || !db) return;
    setPromoStatus({ type: 'loading', message: 'Validando cupom...' });

    try {
      const cleanCode = promoCodeInput.trim().toUpperCase().replace(/\s+/g, '');
      const couponRef = doc(db, 'saas_coupons', cleanCode);
      const snap = await getDoc(couponRef);

      if (!snap.exists()) {
        setPromoStatus({ type: 'error', message: 'Cupom inválido ou inexistente.' });
        return;
      }

      const couponData = snap.data();
      if (!couponData.active) {
        setPromoStatus({ type: 'error', message: 'Este cupom não está mais ativo.' });
        return;
      }

      const maxUses = couponData.maxUses || 0;
      const usesCount = couponData.usesCount || 0;
      if (usesCount >= maxUses) {
        setPromoStatus({ type: 'error', message: 'Este cupom atingiu o limite de usos.' });
        return;
      }

      const claimedList = currentUser?.claimedCoupons || [];
      if (claimedList.includes(cleanCode)) {
        setPromoStatus({ type: 'error', message: 'Este cupom já foi ativado nesta clínica.' });
        return;
      }

      const extraDays = Number(couponData.extraDays) || 15;
      const newExtensionDays = (currentUser.trialExtensionDays || 0) + extraDays;
      const updatedCoupons = [...claimedList, cleanCode];

      // Update in database
      await updateDoc(doc(db, 'users', currentUser.id), {
        trialExtensionDays: newExtensionDays,
        claimedCoupons: updatedCoupons
      });

      // Update uses count in coupon
      await updateDoc(couponRef, {
        usesCount: usesCount + 1
      });

      // Update local state
      const updatedUser = {
        ...currentUser,
        trialExtensionDays: newExtensionDays,
        claimedCoupons: updatedCoupons
      };
      onUpdateCurrentUser(updatedUser);

      setPromoStatus({ 
        type: 'success', 
        message: `Parabéns! Cupom ativado com sucesso. Mais +${extraDays} dias de teste grátis foram adicionados à sua clínica.` 
      });
      setPromoCodeInput('');
    } catch (err: any) {
      console.error(err);
      setPromoStatus({ type: 'error', message: `Erro ao ativar cupom: ${err?.message || err}` });
    }
  };

  // Load simulated invoice list from local state or config
  useEffect(() => {
    const historicalInvoices = [
      {
        id: 'INV-3882',
        date: currentUser?.trialStartedAt ? new Date(currentUser.trialStartedAt).toLocaleDateString() : new Date().toLocaleDateString(),
        plan: `${currentPlanId} (Teste Grátis)`,
        amount: 'Sem valor (A Combinar)',
        status: 'Instanciado',
        method: 'Licença Única'
      }
    ];

    if (currentUser?.isPremium) {
      historicalInvoices.unshift({
        id: 'INV-4899',
        date: new Date().toLocaleDateString(),
        plan: currentUser.trialPlan || 'Pro',
        amount: `R$ ${plans.find(p => p.id === (currentUser.trialPlan || 'Pro'))?.price.toFixed(2).replace('.', ',')}`,
        status: 'Pago',
        method: currentUser.paymentMethodUsed || 'Cartão de Crédito'
      });
    }

    setInvoiceList(historicalInvoices);
  }, [currentUser?.isPremium, currentUser?.trialPlan]);

  // Pix timer decrement
  useEffect(() => {
    let interval: any = null;
    if (pixStatus === 'waiting' && pixCountdown > 0) {
      interval = setInterval(() => {
        setPixCountdown(prev => prev - 1);
      }, 1000);
    } else if (pixCountdown === 0) {
      setPixStatus('idle');
    }
    return () => clearInterval(interval);
  }, [pixStatus, pixCountdown]);

  // Format credit card numbers beautifully with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    const parts = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.slice(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  // Format expiry on change
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length > 2) {
      setCardExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      setCardExpiry(val);
    }
  };

  const startCheckout = (planItem: any) => {
    setSelectedPlan(planItem);
    setIsCheckoutOpen(true);
    setPixStatus('idle');
    setErrorMsg(null);
  };

  // Simulated Pix QR Generation
  const handleGeneratePix = () => {
    setPixStatus('generating');
    setTimeout(() => {
      setPixStatus('waiting');
      setPixCountdown(300);
    }, 1200);
  };

  // Final Payment Processing Simulator
  const processSaaSSubscription = async () => {
    setErrorMsg(null);
    if (paymentMethod === 'card') {
      if (!cardName.trim() || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3) {
        setErrorMsg('Por favor, preencha todos os campos do cartão de crédito corretamente.');
        return;
      }
    }

    setIsProcessing(true);
    // Mimic database registration delays and license handshakes
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', currentUser.id);
        const updatedFields = {
          isTrial: false,
          isPremium: true,
          trialPlan: selectedPlan.id,
          subscriptionPaymentDate: new Date().toISOString(),
          paymentMethodUsed: paymentMethod === 'pix' ? 'Pix Automático' : 'Cartão de Crédito Visa',
          subscriptionStatus: 'Ativo',
          nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        };

        await updateDoc(userRef, updatedFields);
        
        // Propagate state update
        onUpdateCurrentUser({
          ...currentUser,
          ...updatedFields
        });

        setIsProcessing(false);
        setPixStatus('success');
        setInvoiceSuccess(true);
        
        // Auto close checkout after positive feedback delay
        setTimeout(() => {
          setIsCheckoutOpen(false);
          setInvoiceSuccess(false);
        }, 5000);

      } catch (err: any) {
        console.error("Erro ao ativar assinatura SaaS:", err);
        setErrorMsg('Instabilidade no gateway de faturamento do Firestore: ' + (err.message || 'tente novamente.'));
        setIsProcessing(false);
      }
    }, 2000);
  };

  const activeLimits = selectedPlan?.limits || { dentists: 5, patients: 1000 };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in py-2">
      
      {/* Dynamic Status Greeting Header - Only for Trial/Test accounts, otherwise empty */}
      {isTrialActive ? (
        <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl border border-slate-800 text-left">
          <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-brand-cyan/15 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[90px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                Status da Conta de Experiência
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                Ambiente de Teste Ativo no <span className="text-brand-cyan">OdontoDash</span>
              </h1>
              <p className="text-slate-400 text-xs max-w-xl">
                Seu acesso de teste é gratuito e sem valor cobrado agora. A licença única definitiva será combinada diretamente com o cliente/atendimento.
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:min-w-[280px] space-y-3 shrink-0">
              <h3 className="text-xs font-black uppercase text-brand-cyan tracking-widest flex items-center justify-between">
                Status do Período de Teste
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-slate-350 uppercase font-black tracking-wider">Modo:</span>
                  <span className="text-xs font-mono font-black text-amber-450">{currentPlanId}</span>
                </div>
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/20 text-amber-305 rounded-xl flex items-center gap-2 text-xs font-bold leading-tight">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                  <span>Seu teste expira em <strong className="text-base font-black">{trialDaysRemaining}</strong> dias</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Real SaaS Tenant Limit Progress Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Capacidade de Profissionais (Dentistas)
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-slate-500 font-medium">Equipe clínica ativa</span>
              <span className="font-bold text-slate-800 font-mono">
                {dentistCount} / {currentPlanId === 'Lite' ? 1 : currentPlanId === 'Pro' ? 5 : 'Ilimitado'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  currentPlanId === 'Lite' && dentistCount >= 1 ? 'bg-amber-500' : 'bg-brand-cyan'
                }`}
                style={{ 
                  width: `${currentPlanId === 'Lite' ? Math.min(100, (dentistCount / 1) * 100) : currentPlanId === 'Pro' ? Math.min(100, (dentistCount / 5) * 100) : 10}%` 
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            {currentPlanId === 'Lite' ? 'Migre para o plano Pro para adicionar até 5 profissionais.' : currentPlanId === 'Pro' ? 'Ainda restam vagas de profissionais no seu cadastro.' : 'Seu plano Platinum concede licenças ilimitadas.'}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            Capacidade de Pacientes Ativos
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-slate-500 font-medium">Pacientes cadastrados</span>
              <span className="font-bold text-slate-800 font-mono">
                {patientsCount} / {currentPlanId === 'Lite' ? 100 : currentPlanId === 'Pro' ? 1000 : 'Ilimitado'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  (patientsCount >= (currentPlanId === 'Lite' ? 100 : 1000)) ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{ 
                  width: `${currentPlanId === 'Lite' ? Math.min(100, (patientsCount / 100) * 100) : currentPlanId === 'Pro' ? Math.min(100, (patientsCount / 1000) * 100) : 5}%` 
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            Armazenamento em lote isolado sob a ID {currentUser?.id || 'trial-default'}.
          </p>
        </div>
      </div>

      {/* Pricing Cards Deck */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Planos e Precificação</h2>
          <p className="text-slate-500 text-xs">Expanda os recursos do sistema e integre toda sua equipe clínica num ambiente seguro.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, idx) => {
            const isCurrent = p.id === currentPlanId;
            return (
              <div 
                key={idx} 
                className={`bg-white rounded-3xl border transition-all duration-300 relative flex flex-col justify-between overflow-hidden ${
                  isCurrent 
                    ? 'border-brand-cyan shadow-xl shadow-brand-cyan/5 ring-2 ring-brand-cyan/20 scale-[1.01]' 
                    : 'border-slate-200/70 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Visual Accent Banner */}
                {p.flag && (
                  <span className="absolute -top-1.5 right-6 px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-b-xl shadow-md">
                    {p.flag}
                  </span>
                )}
                
                <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
                  {/* Name and Pricing */}
                  <div className="space-y-2">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${p.badgeColor}`}>
                      {p.name}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{p.tagline}</p>
                    <div className="pt-2 flex items-baseline">
                      <span className="text-2xl font-black text-slate-800">R$ {p.price}</span>
                      <span className="text-slate-400 text-xs font-bold font-mono ml-1">/{p.period}</span>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Limits and Details */}
                  <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100/50 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Dentistas Autorizados:</span>
                      <span className="font-bold text-slate-700">{p.limits.dentists === 9999 ? 'Ilimitado' : p.limits.dentists}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Pacientes Máximos:</span>
                      <span className="font-bold text-slate-700">{p.limits.patients === 99999 ? 'Ilimitado' : p.limits.patients}</span>
                    </div>
                  </div>

                  {/* Feature Lists */}
                  <div className="space-y-3 pt-2 text-left flex-1 flex flex-col justify-start">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incluso no plano:</h5>
                    <ul className="space-y-2.5">
                      {p.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex gap-2 text-xs text-slate-600 items-start">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card footer checkout button */}
                <div className="p-6 md:p-8 pt-0 border-t border-slate-100 bg-slate-50/30">
                  {isCurrent ? (
                    <div className="w-full text-center py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl font-extrabold uppercase text-[10px] tracking-widest flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Seu Plano Ativo
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCheckout(p)}
                      className={`w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer select-none active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 ${
                        p.flag 
                          ? 'bg-brand-cyan hover:bg-brand-cyan-dark text-slate-900' 
                          : 'bg-white hover:bg-slate-100/90 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Assinar Plano {p.name}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History log of invoices */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm text-left">
        <div className="flex sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5 flex-col sm:flex-row">
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-400" />
              Histórico de Faturas SaaS
            </h3>
            <p className="text-slate-400 text-xs">Visualize e emita faturas e comprovantes de pagamentos.</p>
          </div>
          <button className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-slate-500 text-[10px] uppercase tracking-wider font-bold border border-slate-200/50 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Atualizar logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 font-black text-slate-400 uppercase text-[9px] tracking-wider rounded-xl">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Código</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoiceList.map((inv, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-400">{inv.id}</td>
                  <td className="px-4 py-3.5">{inv.date}</td>
                  <td className="px-4 py-3.5 font-bold">{inv.plan}</td>
                  <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">{inv.method}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">{inv.amount}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-center ${
                      inv.status === 'Pago' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : inv.status === 'Instanciado' 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promotional Claim Voucher Widget */}
      <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-indigo-100/30 rounded-3xl p-6 md:p-8 border border-indigo-100 shadow-sm text-left grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <span className="text-[10px] bg-indigo-600/10 text-indigo-700 border border-indigo-100 font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
            CAMPANHAS DE TESTE SAAS
          </span>
          <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500 animate-pulse" />
            Ativar Cupom / Voucher Promocional
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed max-w-lg">
            Possui um cupom de ativação ou voucher de prazo extra disponibilizado por um administrador de suporte? Insira o código exclusivo abaixo para estender seu período de experimentação gratuita instantaneamente.
          </p>
        </div>

        <div>
          <form onSubmit={handleClaimVoucher} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => {
                  setPromoCodeInput(e.target.value.toUpperCase());
                  setPromoStatus({ type: 'idle', message: '' });
                }}
                placeholder="DIGITE O SEU CUPOM"
                className="w-full pl-4 pr-10 py-3 text-xs font-mono font-bold tracking-wider placeholder-slate-400 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 ring-indigo-500 transition-all text-slate-850"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                🎟️
              </span>
            </div>

            {promoStatus.type !== 'idle' && (
              <p className={`text-[11px] font-bold ${
                promoStatus.type === 'success' ? 'text-emerald-700 bg-emerald-50 border border-emerald-150 p-2.5 rounded-lg' :
                promoStatus.type === 'error' ? 'text-rose-700 bg-rose-50 border border-rose-150 p-2.5 rounded-lg' :
                'text-slate-500 animate-pulse'
              }`}>
                {promoStatus.message}
              </p>
            )}

            <button
              type="submit"
              disabled={promoStatus.type === 'loading' || !promoCodeInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-95 flex items-center justify-center gap-2"
            >
              {promoStatus.type === 'loading' ? 'Validando...' : 'Aplicar Cupom'}
            </button>
          </form>
        </div>
      </div>

      {/* Checkout and Payment Gateway simulator Modal Drawer */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200/60 max-w-xl w-full shadow-2xl p-6 md:p-8 relative overflow-hidden flex flex-col"
            >
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs"
              >
                ✕ Esc
              </button>

              <div className="space-y-4">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-brand-cyan text-xs font-black uppercase tracking-wider">
                    <CreditCard className="w-4 h-4" />
                    Gateway de Pagamento Integrado
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Ativação do Plano {selectedPlan.name}</h3>
                  <p className="text-slate-400 text-xs">Faça a transação simulada segura para atualizar sua assinatura no servidor Firestore remoto em tempo real.</p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {invoiceSuccess ? (
                  /* Success Screen */
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/10 animate-bounce">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div className="space-y-2 text-center max-w-sm">
                      <h4 className="text-lg font-extrabold text-slate-800">Transação confirmada!</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Sua licença Premium do plano <strong>{selectedPlan.name}</strong> foi autorizada.
                        Sincronizando os ambientes e permissões locais de faturamento...
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Form and Switch Screen */
                  <div className="space-y-5">
                    {/* Plan Summary row */}
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total a Pagar</p>
                        <p className="text-sm font-black text-slate-800">OdontoDash SaaS: Plano {selectedPlan.name}</p>
                      </div>
                      <span className="text-lg font-black text-slate-800">R$ {selectedPlan.price || '0,00'}/mês</span>
                    </div>

                    {/* Selector of modes */}
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          paymentMethod === 'pix' 
                            ? 'bg-slate-900/5 text-slate-800 border-slate-800/20' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        Pix Instantâneo
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          paymentMethod === 'card' 
                            ? 'bg-slate-900/5 text-slate-800 border-slate-800/20' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Cartão de Crédito
                      </button>
                    </div>

                    {/* Dynamic checkout body */}
                    {paymentMethod === 'pix' ? (
                      <div className="space-y-4">
                        {pixStatus === 'idle' ? (
                          <div className="py-6 flex flex-col items-center gap-3">
                            <QrCode className="w-16 h-16 text-slate-300" />
                            <p className="text-xs text-slate-500 font-medium text-center">Clique abaixo para gerar o QR Code dinâmico com chave de sandbox de simulação de transações.</p>
                            <button
                              type="button"
                              onClick={handleGeneratePix}
                              className="px-6 py-2.5 bg-brand-cyan hover:bg-brand-cyan-dark text-slate-900 border border-brand-cyan/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                            >
                              Gerar QR Code Pix
                            </button>
                          </div>
                        ) : pixStatus === 'generating' ? (
                          <div className="py-8 flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Conectando ao terminal Banco Central SaaS...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 py-2 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100">
                            {/* Dummy QR image generated via Gemini generation rules or generic patterns */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-center relative shadow-sm">
                              <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=trial-saas-payment" 
                                alt="Pix QR Code" 
                                className="w-36 h-36 border-0"
                              />
                              <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.5px] pointer-events-none rounded-xl" />
                            </div>
                            
                            <div className="text-center space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                                <Clock className="w-3 h-3" />
                                {Math.floor(pixCountdown / 60)}:{(pixCountdown % 60).toString().padStart(2, '0')} restante
                              </span>
                              <p className="text-slate-400 text-[10px]">Chave Pix Copa Copiar: <strong className="font-mono text-[9px] text-slate-600">00020101021226870014br.trial.saas.dental.analytics...</strong></p>
                            </div>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={processSaaSSubscription}
                              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                              {isProcessing ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                  Confirmando Depósito Pix...
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4" />
                                  Simular Confirmação do Pix
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Credit Card Form fields */
                      <div className="space-y-4 text-left">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nome Impresso no Cartão *</label>
                          <input 
                            type="text"
                            required
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan"
                            placeholder="Ex: ARTHUR REZENDE"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Número do Cartão *</label>
                          <input 
                            type="text"
                            required
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan font-mono"
                            placeholder="4000 1234 5678 9010"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Validade *</label>
                            <input 
                              type="text"
                              required
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan font-mono"
                              placeholder="MM/AA"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">CVV / Segurança *</label>
                            <input 
                              type="text"
                              required
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none focus:border-brand-cyan font-mono"
                              placeholder="123"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={processSaaSSubscription}
                          className="w-full py-4 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-slate-900/15 flex items-center justify-center gap-2 active:scale-95"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Processando Cartão via Gateway Remoto...
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Ativar Plano {selectedPlan.name}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
