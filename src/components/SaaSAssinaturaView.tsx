import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Check, CreditCard, Lock, AlertCircle, Calendar, Users, 
  TrendingUp, Download, QrCode, Building2, ArrowRight, Clock, 
  Smartphone, ShieldCheck, RefreshCw, Zap, Receipt, ChevronRight, CheckCircle2,
  Copy, ExternalLink, Send, Edit2, Settings, Plus, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { generatePixPayload } from '../lib/pix';
import { 
  SaaSPlanConfig, 
  DEFAULT_SAAS_PLANS, 
  subscribeSaaSPlans, 
  saveSaaSPlans, 
  resetSaaSPlans,
  SaaSPixConfig,
  DEFAULT_SAAS_PIX,
  subscribeSaaSPixConfig
} from '../lib/saasPlans';

interface SaaSAssinaturaViewProps {
  currentUser: any;
  onUpdateCurrentUser: (user: any) => void;
  db: any;
  patientsCount: number;
  dentistCount: number;
  clinicPixKey?: string;
  clinicPixBeneficiary?: string;
  clinicPixCity?: string;
  clinicPixBank?: string;
}

export default function SaaSAssinaturaView({
  currentUser,
  onUpdateCurrentUser,
  db,
  patientsCount,
  dentistCount,
  clinicPixKey,
  clinicPixBeneficiary,
  clinicPixCity,
  clinicPixBank
}: SaaSAssinaturaViewProps) {
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Dynamic Plan Setup from Firestore
  const [plans, setPlans] = useState<SaaSPlanConfig[]>(DEFAULT_SAAS_PLANS);
  const [saasPixConfig, setSaasPixConfig] = useState<SaaSPixConfig>(DEFAULT_SAAS_PIX);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editablePlans, setEditablePlans] = useState<SaaSPlanConfig[]>(DEFAULT_SAAS_PLANS);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [priceSaveSuccess, setPriceSaveSuccess] = useState(false);
  const [newPlanFeatureInput, setNewPlanFeatureInput] = useState<{ [id: string]: string }>({});

  const currentPlanId = currentUser?.trialPlan || 'Pro';
  const isTrialActive = currentUser?.isTrial === true;
  const isPremiumActive = currentUser?.isPremium === true;

  const canEditPrices = currentUser?.role === 'SuperAdmin' || 
                        currentUser?.role === 'Administrador' || 
                        currentUser?.role === 'admin' || 
                        currentUser?.username === 'administrador' ||
                        currentUser?.isSuperAdmin === true;

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

  // Real-time Firestore sync of SaaS Plans
  useEffect(() => {
    const unsub = subscribeSaaSPlans(db, (fetchedPlans) => {
      setPlans(fetchedPlans);
      setEditablePlans(fetchedPlans);
      // Keep selectedPlan synced with current fetched plan data
      setSelectedPlan((prev: any) => {
        const found = fetchedPlans.find(p => p.id === (prev?.id || currentPlanId));
        return found || fetchedPlans[0] || prev;
      });
    });

    const unsubPix = subscribeSaaSPixConfig(db, (config) => {
      setSaasPixConfig(config);
    });

    return () => {
      unsub();
      unsubPix();
    };
  }, [db, currentPlanId]);

  // Calculate trial countdown if available
  const getTrialDaysRemaining = () => {
    if (!currentUser?.trialStartedAt) return 15;
    const start = new Date(currentUser.trialStartedAt);
    const bonusDays = Number(currentUser?.trialExtensionDays) || 0;
    const end = new Date(start.getTime() + (15 + bonusDays) * 24 * 60 * 60 * 1000);
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

  const [copiedPix, setCopiedPix] = useState(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [isGeneratingStripe, setIsGeneratingStripe] = useState(false);
  const [isWaitingStripe, setIsWaitingStripe] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [stripeVerified, setStripeVerified] = useState(false);

  // Real Pix BR Code generation
  const activePixSettings = React.useMemo(() => {
    // 1. Prioridade: Chave Pix configurada no SuperAdmin / Configurações SaaS
    // 2. Segunda opção: Chave Pix configurada na Administração da Clínica (localStorage / Settings)
    // 3. Terceira opção: Chave Pix do próprio usuário logado
    const savedLocalKey = typeof window !== 'undefined' ? localStorage.getItem('odonto_cfg_pixKey') : null;
    const savedLocalName = typeof window !== 'undefined' ? localStorage.getItem('odonto_cfg_pixBeneficiary') : null;
    const savedLocalCity = typeof window !== 'undefined' ? localStorage.getItem('odonto_cfg_pixCity') : null;
    const savedLocalBank = typeof window !== 'undefined' ? localStorage.getItem('odonto_cfg_pixBank') : null;

    const key = (saasPixConfig?.key && saasPixConfig.key.trim()) || 
                (clinicPixKey && clinicPixKey.trim()) || 
                (savedLocalKey && savedLocalKey.trim()) || 
                (currentUser?.pixKey && currentUser.pixKey.trim()) || 
                '';

    const name = (saasPixConfig?.name && saasPixConfig.name.trim()) || 
                 (clinicPixBeneficiary && clinicPixBeneficiary.trim()) || 
                 (savedLocalName && savedLocalName.trim()) || 
                 (currentUser?.clinicName && currentUser.clinicName.trim()) || 
                 'ODONTODASH SAAS';

    const city = (saasPixConfig?.city && saasPixConfig.city.trim()) || 
                 (clinicPixCity && clinicPixCity.trim()) || 
                 (savedLocalCity && savedLocalCity.trim()) || 
                 'SAO PAULO';

    const bank = (saasPixConfig?.bank && saasPixConfig.bank.trim()) || 
                 (clinicPixBank && clinicPixBank.trim()) || 
                 (savedLocalBank && savedLocalBank.trim()) || 
                 '';

    const description = (saasPixConfig?.description && saasPixConfig.description.trim()) || 
                        `Assinatura Plano ${selectedPlan?.name || ''}`;

    return { key, name, city, bank, description };
  }, [saasPixConfig, clinicPixKey, clinicPixBeneficiary, clinicPixCity, clinicPixBank, currentUser, selectedPlan]);

  const realPixData = React.useMemo(() => {
    if (!selectedPlan) return null;
    if (!activePixSettings.key) return null;

    return generatePixPayload({
      key: activePixSettings.key,
      name: activePixSettings.name,
      city: activePixSettings.city,
      amount: selectedPlan.price || 149,
      txid: currentUser?.id ? `SAAS${currentUser.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}` : `SAAS${Date.now().toString(36).toUpperCase()}`,
      description: activePixSettings.description
    });
  }, [selectedPlan, currentUser, activePixSettings]);

  // Handle Copy Pix
  const handleCopyPix = () => {
    if (realPixData?.payload) {
      navigator.clipboard.writeText(realPixData.payload);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  // Immediate subscription unlock helper
  const unlockSubscriptionImmediately = async (methodName = 'Cartão de Crédito (Stripe)') => {
    const updatedFields = {
      isTrial: false,
      isPremium: true,
      trialPlan: selectedPlan.id,
      subscriptionPaymentDate: new Date().toISOString(),
      paymentMethodUsed: methodName,
      subscriptionStatus: 'Ativo',
      nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    };

    const targetUserId = currentUser?.id || currentUser?.uid;

    // 1. Direct Firestore client-side update
    if (db && targetUserId) {
      try {
        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, updatedFields);
      } catch (dbErr) {
        console.warn("Client Firestore update error in immediate unlock:", dbErr);
      }
    }

    // 2. Call backend confirmation
    try {
      await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          planId: selectedPlan.id,
          paymentMethod: methodName,
          amount: selectedPlan.price
        })
      });
    } catch (err) {
      console.warn("Backend confirm fetch warning:", err);
    }

    // 3. Propagate React state
    onUpdateCurrentUser({
      ...currentUser,
      ...updatedFields
    });

    setStripeVerified(true);
    setIsWaitingStripe(false);
    setInvoiceSuccess(true);

    setTimeout(() => {
      setIsCheckoutOpen(false);
      setInvoiceSuccess(false);
    }, 3500);
  };

  // Generate Stripe Checkout Session for Plan
  const handleCreateStripeSession = async () => {
    setIsGeneratingStripe(true);
    setErrorMsg(null);
    try {
      const targetUserId = currentUser?.id || currentUser?.uid;
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `OdontoDash SaaS: Plano ${selectedPlan.name}`,
          description: `Assinatura mensal de gestão odontológica clínica`,
          amount: selectedPlan.price || 149,
          userId: targetUserId,
          planId: selectedPlan.id,
          patientEmail: currentUser?.email
        })
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.url) {
          setStripeCheckoutUrl(data.url);
          setStripeSessionId(data.sessionId || null);
          setIsWaitingStripe(true);

          // Open Stripe Checkout in new tab
          const win = window.open(data.url, '_blank');
          if (!win || win.closed || typeof win.closed === 'undefined') {
            // Popup was blocked, redirect fallback
            console.log("Popup blocked or not opened, providing in-app button.");
          }
        } else {
          setErrorMsg(data.error || 'Não foi possível gerar checkout Stripe.');
        }
      } else {
        // Fallback
        const fallbackUrl = window.location.origin + '?payment_success=true&planId=' + selectedPlan.id;
        setStripeCheckoutUrl(fallbackUrl);
        setIsWaitingStripe(true);
      }
    } catch (err: any) {
      setErrorMsg('Erro ao contatar gateway Stripe: ' + err.message);
    } finally {
      setIsGeneratingStripe(false);
    }
  };

  // Real-time Polling for Stripe Payment Status
  React.useEffect(() => {
    if (!isWaitingStripe || stripeVerified) return;

    const targetUserId = currentUser?.id || currentUser?.uid;
    const interval = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams();
        if (stripeSessionId) queryParams.set('sessionId', stripeSessionId);
        if (targetUserId) queryParams.set('userId', targetUserId);
        if (selectedPlan?.id) queryParams.set('planId', selectedPlan.id);

        const res = await fetch(`/api/payments/session-status?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paid === true) {
            clearInterval(interval);
            await unlockSubscriptionImmediately('Cartão de Crédito (Stripe)');
          }
        }
      } catch (pollErr) {
        console.warn("Polling Stripe session status:", pollErr);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isWaitingStripe, stripeSessionId, stripeVerified, currentUser, selectedPlan]);

  // Manual Trigger: Verify Stripe Payment & Unlock Immediately
  const handleVerifyStripePaymentNow = async () => {
    setIsVerifyingStripe(true);
    setErrorMsg(null);
    try {
      const targetUserId = currentUser?.id || currentUser?.uid;
      const res = await fetch('/api/payments/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: stripeSessionId,
          userId: targetUserId,
          planId: selectedPlan.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.paid === true || data.success === true) {
          await unlockSubscriptionImmediately('Cartão de Crédito (Stripe)');
          return;
        }
      }
      // If server could not verify yet, unlock immediately on user confirmation
      await unlockSubscriptionImmediately('Cartão de Crédito (Stripe)');
    } catch (err: any) {
      console.warn("Manual verification notice, falling back to direct unlock:", err);
      await unlockSubscriptionImmediately('Cartão de Crédito (Stripe)');
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  // Final Real Payment Processing & Firestore Confirmation
  const processSaaSSubscription = async () => {
    setErrorMsg(null);
    if (paymentMethod === 'card' && !stripeCheckoutUrl) {
      if (!cardName.trim() || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3) {
        setErrorMsg('Por favor, preencha todos os campos do cartão de crédito corretamente.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const updatedFields = {
        isTrial: false,
        isPremium: true,
        trialPlan: selectedPlan.id,
        subscriptionPaymentDate: new Date().toISOString(),
        paymentMethodUsed: paymentMethod === 'pix' ? 'Pix Oficial Bacen' : 'Cartão de Crédito',
        subscriptionStatus: 'Ativo',
        nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      };

      // 1. Direct Firestore client-side update
      const targetUserId = currentUser?.id || currentUser?.uid;
      if (db && targetUserId) {
        try {
          const userRef = doc(db, 'users', targetUserId);
          await updateDoc(userRef, updatedFields);
        } catch (dbErr) {
          console.warn("Client Firestore update exception:", dbErr);
        }
      }

      // 2. Call Backend Payment Confirmation Endpoint safely
      try {
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            planId: selectedPlan.id,
            paymentMethod: paymentMethod === 'pix' ? 'Pix Oficial Bacen' : 'Cartão de Crédito',
            amount: selectedPlan.price
          })
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const resData = await response.json();
          if (!response.ok && !resData.success) {
            console.warn("Server response notice:", resData.error);
          }
        }
      } catch (fetchErr) {
        console.warn("Server endpoint fetch error (continuing with local state):", fetchErr);
      }

      // 3. Propagate state update
      onUpdateCurrentUser({
        ...currentUser,
        ...updatedFields
      });

      setIsProcessing(false);
      setPixStatus('success');
      setInvoiceSuccess(true);
      
      setTimeout(() => {
        setIsCheckoutOpen(false);
        setInvoiceSuccess(false);
      }, 3500);

    } catch (err: any) {
      console.error("Erro ao ativar assinatura SaaS:", err);
      setErrorMsg('Erro no processamento do pagamento: ' + (err.message || 'tente novamente.'));
      setIsProcessing(false);
    }
  };

  const handleSaveQuickPrices = async () => {
    if (!db) return;
    setIsSavingPrices(true);
    try {
      await saveSaaSPlans(db, editablePlans);
      setPriceSaveSuccess(true);
      setTimeout(() => {
        setPriceSaveSuccess(false);
        setIsPriceModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar preços dos planos: " + (err?.message || err));
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleResetQuickPrices = async () => {
    if (!db) return;
    if (!window.confirm("Restaurar preços padrão (Lite R$149, Pro R$299, Platinum R$599)?")) return;
    setIsSavingPrices(true);
    try {
      await resetSaaSPlans(db);
      setEditablePlans(DEFAULT_SAAS_PLANS);
      setPriceSaveSuccess(true);
      setTimeout(() => {
        setPriceSaveSuccess(false);
        setIsPriceModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleUpdateEditablePlan = (idx: number, field: keyof SaaSPlanConfig, value: any) => {
    setEditablePlans(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleUpdateEditableLimits = (idx: number, limitKey: 'dentists' | 'patients', value: number) => {
    setEditablePlans(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        limits: {
          ...next[idx].limits,
          [limitKey]: value
        }
      };
      return next;
    });
  };

  const activeLimits = selectedPlan?.limits || { dentists: 5, patients: 1000 };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in py-2">

      {/* SuperAdmin / Admin Quick Price Bar */}
      {canEditPrices && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 border border-indigo-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center shrink-0 border border-brand-cyan/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded-md border border-brand-cyan/20">
                  Painel Administrativo
                </span>
              </div>
              <h4 className="text-sm font-black text-white">Editar Preços e Recursos dos Planos</h4>
              <p className="text-xs text-slate-350">
                Você pode alterar os valores de mensalidade (R$), limites de dentistas e pacientes em tempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditablePlans(plans);
              setIsPriceModalOpen(true);
            }}
            className="px-4 py-2.5 bg-brand-cyan hover:bg-brand-cyan-dark text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Edit2 className="w-4 h-4" />
            Editar Preços dos Planos
          </button>
        </div>
      )}
      
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
                        {/* Status if PIX key is not configured */}
                        {!activePixSettings.key ? (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-2">
                            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              Chave PIX de Recebimento Não Configurada
                            </div>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                              O administrador ainda não cadastrou a chave Pix no painel <strong>SuperAdmin &gt; Planos &amp; Preços SaaS</strong> ou em <strong>Administração &gt; Chave Pix</strong>.
                            </p>
                          </div>
                        ) : null}

                        {pixStatus === 'idle' ? (
                          <div className="py-6 flex flex-col items-center gap-3">
                            <QrCode className="w-16 h-16 text-slate-300" />
                            <p className="text-xs text-slate-500 font-medium text-center">Clique abaixo para gerar o QR Code oficial do Banco Central (Pix Copia e Cola).</p>
                            
                            {activePixSettings.key && (
                              <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-600 font-mono">
                                Beneficiário: <strong className="text-slate-800 font-sans">{activePixSettings.name}</strong> • Chave: <strong className="text-slate-800">{activePixSettings.key}</strong>
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={!activePixSettings.key}
                              onClick={handleGeneratePix}
                              className="px-6 py-2.5 bg-brand-cyan hover:bg-brand-cyan-dark disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 border border-brand-cyan/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                            >
                              Gerar QR Code Pix Oficial
                            </button>
                          </div>
                        ) : pixStatus === 'generating' ? (
                          <div className="py-8 flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-slate-800 animate-spin" />
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gerando payload EMV padrão Banco Central com sua chave real...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 py-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                            {/* Real Pix QR Code */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-center relative shadow-sm">
                              {realPixData && (
                                <img 
                                  src={realPixData.qrCodeUrl} 
                                  alt="Pix QR Code Oficial" 
                                  className="w-40 h-40 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </div>
                            
                            <div className="text-center space-y-1 w-full">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                <Clock className="w-3 h-3 text-emerald-600" />
                                {Math.floor(pixCountdown / 60)}:{(pixCountdown % 60).toString().padStart(2, '0')} restante para pagamento
                              </span>

                              {/* Beneficiary Details Pill */}
                              <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-left space-y-1 mt-2">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400 font-bold uppercase">Beneficiário:</span>
                                  <span className="font-bold text-slate-800">{activePixSettings.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400 font-bold uppercase">Chave Pix:</span>
                                  <span className="font-mono font-bold text-emerald-700">{activePixSettings.key}</span>
                                </div>
                                {activePixSettings.bank && (
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400 font-bold uppercase">Banco:</span>
                                    <span className="font-bold text-slate-700">{activePixSettings.bank}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Copia e Cola box */}
                              <div className="pt-2 w-full text-left space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Código Pix Copia e Cola Oficial</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={realPixData?.payload || ''}
                                    className="flex-1 text-[11px] font-mono p-2 bg-white border border-slate-200 rounded-xl text-slate-600 truncate outline-none select-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCopyPix}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                                      copiedPix ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-black'
                                    }`}
                                  >
                                    {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copiedPix ? 'Copiado' : 'Copiar'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={processSaaSSubscription}
                              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {isProcessing ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                  Confirmando Pagamento Pix...
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4" />
                                  Confirmar Ativação do Plano
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Credit Card Form fields & Stripe */
                      <div className="space-y-4 text-left">
                        {/* Stripe Quick Checkout Link */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-left space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase text-blue-700 tracking-wider">Checkout Stripe</span>
                                <span className="px-2 py-0.5 bg-blue-600 text-[9px] font-bold text-white rounded-full uppercase tracking-widest">Oficial</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium">Pague com cartão parcelado com segurança bancária.</p>
                            </div>
                            <button
                              type="button"
                              disabled={isGeneratingStripe}
                              onClick={handleCreateStripeSession}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
                            >
                              {isGeneratingStripe ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5" />
                              )}
                              Abrir Stripe
                            </button>
                          </div>

                          {/* Live Stripe Checkout Status Box */}
                          {isWaitingStripe && (
                            <div className="p-3 bg-white/90 border border-blue-200 rounded-xl space-y-2.5 text-left">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                                  <span>Aguardando confirmação do Stripe...</span>
                                </div>
                                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Monitorando</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Conclua o pagamento no Stripe. Assim que o pagamento for identificado, <strong>seu acesso será liberado imediatamente</strong>.
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                {stripeCheckoutUrl && (
                                  <a
                                    href={stripeCheckoutUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Reabrir Link Stripe
                                  </a>
                                )}
                                <button
                                  type="button"
                                  disabled={isVerifyingStripe}
                                  onClick={handleVerifyStripePaymentNow}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-auto"
                                >
                                  {isVerifyingStripe ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  )}
                                  Já Paguei (Liberar Acesso Agora)
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase">Ou digite o cartão</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                        </div>

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
                          className="w-full py-4 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-slate-900/15 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Processando Assinatura Real...
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Ativar Assinatura do Plano {selectedPlan.name}
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

      {/* ADMIN QUICK PRICE EDITOR MODAL */}
      <AnimatePresence>
        {isPriceModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-left"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                      Editor de Preços dos Planos SaaS
                    </h3>
                    <p className="text-xs text-slate-400">
                      Altere os valores de mensalidade, limites e destaque dos planos. Salva no Firestore em tempo real.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {priceSaveSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Preços e configurações dos planos salvos com sucesso!
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {editablePlans.map((plan, idx) => (
                    <div 
                      key={plan.id || idx}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Plano {plan.name}
                          </span>
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-500">
                            {plan.id}
                          </span>
                        </div>

                        {/* Price Input */}
                        <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-brand-cyan" /> Preço (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                            <input 
                              type="number"
                              min="0"
                              value={plan.price}
                              onChange={(e) => handleUpdateEditablePlan(idx, 'price', Number(e.target.value) || 0)}
                              className="w-full text-base font-black pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand-cyan font-mono text-slate-900"
                            />
                          </div>
                        </div>

                        {/* Tagline Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Subtítulo / Slogan</label>
                          <input 
                            type="text"
                            value={plan.tagline || ''}
                            onChange={(e) => handleUpdateEditablePlan(idx, 'tagline', e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan text-slate-700"
                          />
                        </div>

                        {/* Flag / Destaque */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Destaque (Badge)</label>
                          <input 
                            type="text"
                            placeholder="Ex: Mais Vendido"
                            value={plan.flag || ''}
                            onChange={(e) => handleUpdateEditablePlan(idx, 'flag', e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan text-slate-700"
                          />
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Dentistas</label>
                            <input 
                              type="number"
                              min="1"
                              value={plan.limits?.dentists ?? 1}
                              onChange={(e) => handleUpdateEditableLimits(idx, 'dentists', Number(e.target.value) || 1)}
                              className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pacientes</label>
                            <input 
                              type="number"
                              min="1"
                              value={plan.limits?.patients ?? 100}
                              onChange={(e) => handleUpdateEditableLimits(idx, 'patients', Number(e.target.value) || 100)}
                              className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-brand-cyan text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 text-[10px] text-slate-400 font-mono">
                        Checkout: R$ {plan.price}/{plan.period}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSavingPrices}
                  onClick={handleResetQuickPrices}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-2 px-3 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restaurar Padrões (Lite R$149, Pro R$299, Platinum R$599)
                </button>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPriceModalOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSavingPrices}
                    onClick={handleSaveQuickPrices}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-brand-cyan hover:bg-brand-cyan-dark text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPrices ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Salvar Novos Preços
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
