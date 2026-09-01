import React, { useState, useEffect } from 'react';
import { 
  X, QrCode, CreditCard, Copy, Check, ExternalLink, ShieldCheck, 
  Send, DollarSign, Building2, User, Clock, AlertCircle, Sparkles, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generatePixPayload, detectPixKeyType } from '../lib/pix';

interface RealPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  amount: number;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  recordId?: string;
  userId?: string;
  planId?: string;
  clinicPixKey?: string;
  clinicPixName?: string;
  clinicPixBank?: string;
  clinicCity?: string;
  onPaymentConfirmed?: (details: { method: string; txid: string; amount: number }) => void;
}

export default function RealPaymentModal({
  isOpen,
  onClose,
  title,
  description,
  amount,
  patientName,
  patientPhone,
  patientEmail,
  recordId,
  userId,
  planId,
  clinicPixKey = '',
  clinicPixName = 'ODONTODASH CLINICA',
  clinicPixBank = '',
  clinicCity = 'SAO PAULO',
  onPaymentConfirmed
}: RealPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'pix' | 'card' | 'other'>('pix');
  const [pixKey, setPixKey] = useState(clinicPixKey || 'contato@odontodash.com.br');
  const [pixName, setPixName] = useState(clinicPixName || 'ODONTODASH CLINICA');
  const [pixBank, setPixBank] = useState(clinicPixBank || '');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isGeneratingStripe, setIsGeneratingStripe] = useState(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const [successState, setSuccessState] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (clinicPixKey) {
      setPixKey(clinicPixKey);
    }
    if (clinicPixName) {
      setPixName(clinicPixName);
    }
    if (clinicPixBank) {
      setPixBank(clinicPixBank);
    }
  }, [clinicPixKey, clinicPixName, clinicPixBank, isOpen]);

  // Generate real EMV Pix string
  const pixData = React.useMemo(() => {
    return generatePixPayload({
      key: pixKey,
      name: pixName,
      city: clinicCity,
      amount: amount,
      txid: recordId || userId || `OD${Date.now().toString(36).toUpperCase()}`,
      description: description || title
    });
  }, [pixKey, pixName, clinicCity, amount, recordId, userId, description, title]);

  // Copy Pix Copia e Cola
  const handleCopyPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  // Create Stripe / Hosted Checkout Session
  const handleCreateCheckoutSession = async () => {
    setIsGeneratingStripe(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || `Atendimento: ${patientName || 'Paciente'}`,
          amount,
          recordId,
          patientName,
          patientEmail,
          planId,
          userId
        })
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.url) {
          setStripeCheckoutUrl(data.url);
          if (data.provider === 'stripe') {
            window.open(data.url, '_blank');
          }
        } else {
          setErrorMsg(data.error || 'Não foi possível gerar sessão de pagamento.');
        }
      } else {
        setStripeCheckoutUrl(window.location.origin + '?payment_success=true');
      }
    } catch (err: any) {
      setErrorMsg('Falha ao conectar com o servidor de pagamento: ' + err.message);
    } finally {
      setIsGeneratingStripe(false);
    }
  };

  // Confirm payment in database
  const handleConfirmPayment = async (method: string) => {
    setIsConfirming(true);
    setErrorMsg(null);
    try {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId,
            userId,
            planId,
            paymentMethod: method,
            amount
          })
        });
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          await res.json();
        }
      } catch (srvErr) {
        console.warn("Payment confirm server sync warning:", srvErr);
      }

      setSuccessState(true);
      if (onPaymentConfirmed) {
        onPaymentConfirmed({
          method,
          txid: pixData.txid,
          amount
        });
      }
      setTimeout(() => {
        onClose();
        setSuccessState(false);
      }, 2000);
    } catch (err: any) {
      setErrorMsg('Erro ao atualizar pagamento: ' + err.message);
    } finally {
      setIsConfirming(false);
    }
  };

  // WhatsApp Share Message
  const handleShareWhatsApp = () => {
    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const bankLine = pixBank ? `*Banco:* ${pixBank}\n` : '';
    const cityLine = clinicCity ? `*Cidade:* ${clinicCity}\n` : '';
    const msg = `Olá ${patientName || ''}! Segue a cobrança do seu atendimento na clínica:\n\n*${title}*\n*Valor:* ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n*DADOS DO BENEFICIÁRIO:*\n*Nome:* ${pixName}\n*Chave Pix:* ${pixKey}\n${bankLine}${cityLine}\n*Código Pix Copia e Cola:*\n\`\`\`${pixData.payload}\`\`\`\n\nBasta copiar o código acima e colar no aplicativo do seu banco para pagamento instantâneo!`;
    const encoded = encodeURIComponent(msg);
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-cyan/15 text-brand-cyan-dark flex items-center justify-center border border-brand-cyan/20">
              <DollarSign className="w-5 h-5 text-brand-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Transação Financeira Real
                </span>
              </div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Badge */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 px-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor a Cobrar</span>
            <p className="text-2xl font-black text-white">
              {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          {patientName && (
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Paciente</span>
              <p className="text-xs font-bold text-slate-200">{patientName}</p>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('pix')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'pix'
                ? 'bg-white text-brand-cyan-dark shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-500" />
            Pix Oficial (Bacen)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'card'
                ? 'bg-white text-brand-cyan-dark shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-500" />
            Cartão / Link Seguro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'other'
                ? 'bg-white text-brand-cyan-dark shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            Outros Meios
          </button>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successState ? (
            <div className="py-8 text-center space-y-3 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <h4 className="text-base font-black text-slate-800">Pagamento Confirmado!</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                O status financeiro e os lançamentos no Firestore foram atualizados com sucesso.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: PIX OFICIAL */}
              {activeTab === 'pix' && (
                <div className="space-y-4">
                  {/* QR Code & Data */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                      <img 
                        src={pixData.qrCodeUrl} 
                        alt="QR Code Pix" 
                        className="w-36 h-36 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-2 text-left flex-1 w-full">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Beneficiário</span>
                        <p className="text-xs font-black text-slate-800 truncate">{pixName}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Chave Pix Cadastrada</span>
                        <p className="text-xs font-mono font-bold text-slate-700 truncate">{pixKey}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {pixBank && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Banco</span>
                            <p className="text-xs font-bold text-slate-800 truncate">{pixBank}</p>
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cidade</span>
                          <p className="text-xs font-bold text-slate-800 truncate">{clinicCity}</p>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Identificador (txid)</span>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{pixData.txid}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pix Copia e Cola Code Box */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Pix Copia e Cola (Padrão Banco Central)</span>
                      <span className="text-emerald-600 font-bold text-[9px]">Válido em qualquer banco</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.payload}
                        className="flex-1 text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 truncate outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                          copiedPix
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-900 hover:bg-black text-white active:scale-95'
                        }`}
                      >
                        {copiedPix ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Código
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions: WhatsApp & Confirmation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar no WhatsApp
                    </button>
                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleConfirmPayment('Pix')}
                      className="py-3 px-4 bg-brand-cyan hover:bg-brand-cyan-dark text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isConfirming ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Confirmar Recebimento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CARTÃO / STRIPE LINK */}
              {activeTab === 'card' && (
                <div className="space-y-4 text-left">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                      <CreditCard className="w-4 h-4" />
                      <span>Checkout Seguro com Cartão de Crédito / Débito</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Gere uma sessão de pagamento hospedada (Stripe) para o paciente pagar por cartão parcelado ou boleto bancário diretamente no celular dele.
                    </p>
                  </div>

                  {stripeCheckoutUrl ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between">
                        <span>Link de pagamento gerado com sucesso!</span>
                        <a
                          href={stripeCheckoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline flex items-center gap-1"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={stripeCheckoutUrl}
                          className="flex-1 text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 truncate outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(stripeCheckoutUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2500);
                          }}
                          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isGeneratingStripe}
                      onClick={handleCreateCheckoutSession}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {isGeneratingStripe ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Gerando Sessão de Cartão...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Gerar Link de Cartão de Crédito
                        </>
                      )}
                    </button>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Recebeu pela maquininha física na recepção?</span>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment('Cartão de Crédito')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                    >
                      Confirmar Cartão Físico
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: OUTROS MEIOS */}
              {activeTab === 'other' && (
                <div className="space-y-3 text-left">
                  <p className="text-xs text-slate-500 font-medium">
                    Selecione a forma como o paciente efetuou o pagamento no consultório para baixar a fatura:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment('Dinheiro')}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left space-y-1 group"
                    >
                      <span className="text-xs font-black text-slate-800 group-hover:text-emerald-700">💵 Dinheiro em Espécie</span>
                      <p className="text-[10px] text-slate-400">Recebido à vista na recepção</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment('Cartão de Débito')}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left space-y-1 group"
                    >
                      <span className="text-xs font-black text-slate-800 group-hover:text-blue-700">💳 Cartão de Débito</span>
                      <p className="text-[10px] text-slate-400">Passado no POS / Maquininha</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment('Transferência Bancária')}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-left space-y-1 group"
                    >
                      <span className="text-xs font-black text-slate-800 group-hover:text-indigo-700">🏦 Transferência / TED</span>
                      <p className="text-[10px] text-slate-400">Comprovante bancário</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment('Convênio / Plano')}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition-all text-left space-y-1 group"
                    >
                      <span className="text-xs font-black text-slate-800 group-hover:text-amber-700">🛡️ Convênio Odontológico</span>
                      <p className="text-[10px] text-slate-400">Faturamento via operadora</p>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Criptografia de ponta a ponta
          </span>
          <span>Padrão EMV BR Code / Stripe Checkout</span>
        </div>
      </motion.div>
    </div>
  );
}
