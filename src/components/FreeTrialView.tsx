import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, CheckCircle2, ChevronLeft, ArrowRight, Building2, User, Phone, Mail, Lock, AlertCircle, Check, Loader2 } from 'lucide-react';
import { SecurityUtils } from '../lib/security';

interface FreeTrialViewProps {
  onBack: () => void;
  onStartTrial: (details: any) => Promise<void> | void;
  clinicLogo?: string;
  footerText?: string;
}

const AVAILABLE_MODULES = [
  { id: 'Dashboard', name: 'Dashboard & Métricas', desc: 'KPIs, gráficos de faturamento e fluxo' },
  { id: 'Agenda', name: 'Agenda & Consultas', desc: 'Agendamento interativo multi-cadeiras' },
  { id: 'Pacientes', name: 'Gestão de Pacientes', desc: 'Ficha clínica completa e anamnese' },
  { id: 'Documentos', name: 'Documentos & Prontuários', desc: 'Atestados, receitas e evoluções' },
  { id: 'Retorno', name: 'Retornos Preventivos', desc: 'Lembretes pós-consulta e fidelização' },
  { id: 'Mensagens', name: 'Mensagens & WhatsApp', desc: 'Automações e confirmações de horário' },
  { id: 'Estoque', name: 'Controle de Estoque', desc: 'Insumos, alertas e movimentações' },
  { id: 'Financeiro', name: 'Financeiro & Caixa', desc: 'Contas pagar/receber, DRE e recibos' },
  { id: 'Administração', name: 'Administração & Equipe', desc: 'Controle de dentistas e configurações' }
];

export function FreeTrialView({ onBack, onStartTrial, clinicLogo, footerText }: FreeTrialViewProps) {
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Pro');
  const [selectedModules, setSelectedModules] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      if (selectedModules.length <= 1) {
        setErrorMessage('Selecione ao menos 1 módulo para sua experiência de teste.');
        return;
      }
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !clinicName.trim() || !email.trim() || !phone.trim() || !username.trim() || !password.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios do formulário.');
      return;
    }

    if (!SecurityUtils.isValidEmail(email)) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      await onStartTrial({
        name: name.trim(),
        fullName: name.trim(),
        clinicName: clinicName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        cpf: cpf.trim(),
        username: username.trim(),
        password: password.trim(),
        plan: selectedPlan || 'Pro',
        modules: selectedModules,
        selectedModules: selectedModules,
        specialty: 'Geral'
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao criar conta de teste grátis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 selection:bg-brand-cyan selection:text-slate-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para o Login
          </button>
          <div className="flex items-center gap-2 text-brand-cyan text-xs font-black uppercase tracking-wider bg-brand-cyan/10 px-3 py-1.5 rounded-full border border-brand-cyan/20">
            <Sparkles className="w-3.5 h-3.5" />
            7 Dias Grátis • Sem Cartão
          </div>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Comece seu teste grátis no <span className="text-brand-cyan">OdontoDash</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Experimente a plataforma mais completa de gestão odontológica, automações WhatsApp e prontuários inteligentes.
          </p>
        </div>

        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-bold">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-800/80 border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nome do Responsável / Dentista *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Carlos Eduardo"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nome da Clínica ou Consultório *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Clínica Sorriso Perfeito"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">E-mail Profissional *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@clinica.com.br"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">WhatsApp / Telefone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usuário de Acesso *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="dr.carlos"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Senha de Acesso *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-cyan"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Módulos Incluídos no Teste</h3>
              <span className="text-[10px] text-slate-400">{selectedModules.length} de {AVAILABLE_MODULES.length} ativados</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-brand-cyan/10 border-brand-cyan/30 text-white' : 'bg-slate-900/60 border-slate-700/40 text-slate-400'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{mod.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{mod.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-brand-cyan text-slate-900' : 'border border-slate-600'}`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ambiente criptografado com conformidade LGPD.</span>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-cyan hover:bg-brand-cyan/90 disabled:opacity-50 text-slate-900 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-cyan/20 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isLoading ? 'Criando sua Clínica...' : 'Iniciar Teste Grátis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default FreeTrialView;
