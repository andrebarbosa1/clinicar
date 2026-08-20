/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Stethoscope, 
  FileText, 
  MapPin, 
  HeartPulse, 
  Sparkles,
  Save
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SecurityUtils } from '../lib/security';

export const PROCEDURES_OPTIONS = [
  { name: 'Avaliação Inicial', price: 150 },
  { name: 'Limpeza (Profilaxia)', price: 200 },
  { name: 'Restauração Resina', price: 250 },
  { name: 'Extração Simples', price: 300 },
  { name: 'Tratamento de Canal', price: 1200 },
  { name: 'Clareamento Dental', price: 800 },
  { name: 'Implante Dentário', price: 3500 },
  { name: 'Aparelho Ortodôntico', price: 2500 }
];

interface PatientFormViewProps {
  isEdit?: boolean;
  patientId?: string;
  onBack: () => void;
  onSave: (patientData: any, id?: string) => Promise<boolean>;
  patients?: any[];
  users?: any[];
}

export default function PatientFormView({
  isEdit = false,
  patientId = '',
  onBack,
  onSave,
  patients = [],
  users = []
}: PatientFormViewProps) {
  const patient = isEdit ? patients.find(p => p.id === patientId || p.name === patientId) : null;

  const [name, setName] = useState(patient?.name || '');
  const [cpf, setCpf] = useState(patient?.cpf || '');
  const [phone, setPhone] = useState(patient?.phone || patient?.telefone || patient?.celular || '');
  const [email, setEmail] = useState(patient?.email || '');
  const [birthDate, setBirthDate] = useState(patient?.birthDate || patient?.dataNascimento || '');
  const [gender, setGender] = useState(patient?.gender || patient?.genero || '');
  const [address, setAddress] = useState(patient?.address || patient?.endereco || '');
  const [city, setCity] = useState(patient?.city || patient?.cidade || '');
  const [dentistaResponsavel, setDentistaResponsavel] = useState(patient?.dentistaResponsavel || '');
  const [procedimento, setProcedimento] = useState(patient?.procedimento || 'Avaliação Inicial');
  const [valor, setValor] = useState(patient?.valor || '150');
  const [medicalNotes, setMedicalNotes] = useState(patient?.medicalNotes || patient?.observacoes || '');
  const [allergies, setAllergies] = useState(patient?.allergies || patient?.alergias || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastPatientIdRef = useRef<string | null>(null);

  // Sync state if patient data updates
  useEffect(() => {
    if (isEdit && patient && lastPatientIdRef.current !== patientId) {
      setName(patient.name || '');
      setCpf(patient.cpf || '');
      setPhone(patient.phone || patient.telefone || patient.celular || '');
      setEmail(patient.email || '');
      setBirthDate(patient.birthDate || patient.dataNascimento || '');
      setGender(patient.gender || patient.genero || '');
      setAddress(patient.address || patient.endereco || '');
      setCity(patient.city || patient.cidade || '');
      setDentistaResponsavel(patient.dentistaResponsavel || '');
      setProcedimento(patient.procedimento || 'Avaliação Inicial');
      setValor(patient.valor ? String(patient.valor) : '150');
      setMedicalNotes(patient.medicalNotes || patient.observacoes || '');
      setAllergies(patient.allergies || patient.alergias || '');
      lastPatientIdRef.current = patientId;
    }
  }, [patient, isEdit, patientId]);

  const handleProcedureChange = (procName: string) => {
    setProcedimento(procName);
    const option = PROCEDURES_OPTIONS.find(p => p.name === procName);
    if (option) {
      setValor(option.price.toString());
    }
  };

  const dentistOptions = (users || []).filter(u => 
    u && (u.role?.toLowerCase() === 'dentista' || u.role?.toLowerCase() === 'admin')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('Por favor, preencha o nome do paciente.');
      return;
    }

    if (trimmedName.length < 3) {
      setErrorMessage('O nome do paciente deve conter no mínimo 3 caracteres.');
      return;
    }

    if (!email) {
      setErrorMessage('O e-mail é obrigatório para o cadastro do paciente.');
      return;
    }

    if (!SecurityUtils.isValidEmail(email)) {
      setErrorMessage('Por favor, insira um e-mail válido (ex: paciente@email.com).');
      return;
    }

    // Check duplicate name
    const duplicateName = patients.find(p => 
      p.name?.trim().toLowerCase() === trimmedName.toLowerCase() && 
      (isEdit ? p.id !== (patient?.id || patientId) : true)
    );
    
    if (duplicateName) {
      setErrorMessage(`Já existe um paciente cadastrado com o nome "${trimmedName}".`);
      return;
    }

    // Check duplicate email
    const duplicateEmail = patients.find(p => 
      p.email?.trim().toLowerCase() === email.trim().toLowerCase() && 
      (isEdit ? p.id !== (patient?.id || patientId) : true)
    );

    if (duplicateEmail) {
      setErrorMessage(`O e-mail "${email}" já está cadastrado para o paciente ${duplicateEmail.name}.`);
      return;
    }

    // Check duplicate CPF if provided
    if (cpf) {
      const duplicateCpf = patients.find(p => 
        p.cpf === cpf && 
        (isEdit ? p.id !== (patient?.id || patientId) : true)
      );
      if (duplicateCpf) {
        setErrorMessage(`O CPF "${cpf}" já está cadastrado para o paciente ${duplicateCpf.name}.`);
        return;
      }
    }

    // XSS check
    if (
      SecurityUtils.hasDangerousScript(trimmedName) || 
      SecurityUtils.hasDangerousScript(email) || 
      SecurityUtils.hasDangerousScript(phone) || 
      SecurityUtils.hasDangerousScript(cpf) ||
      SecurityUtils.hasDangerousScript(medicalNotes) ||
      SecurityUtils.hasDangerousScript(allergies)
    ) {
      setErrorMessage('Ação bloqueada por motivos de segurança (conteúdo suspeito detectado).');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: trimmedName,
        cpf: cpf.trim(),
        phone: phone.trim(),
        telefone: phone.trim(),
        celular: phone.trim(),
        email: email.trim().toLowerCase(),
        birthDate,
        dataNascimento: birthDate,
        gender,
        genero: gender,
        address: address.trim(),
        endereco: address.trim(),
        city: city.trim(),
        cidade: city.trim(),
        dentistaResponsavel: dentistaResponsavel || (dentistOptions[0]?.name || ''),
        procedimento,
        valor: Number(valor) || 0,
        medicalNotes: medicalNotes.trim(),
        observacoes: medicalNotes.trim(),
        allergies: allergies.trim(),
        alergias: allergies.trim(),
        updatedAt: new Date().toISOString()
      };

      const success = await onSave(payload, isEdit ? patientId : undefined);
      if (success) {
        onBack();
      }
    } catch (err: any) {
      console.error("Error saving patient:", err);
      setErrorMessage("Houve um problema ao salvar os dados. Verifique os campos e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onBack} 
            disabled={isSaving} 
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-600 transition-all disabled:opacity-50 cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-brand-cyan tracking-widest bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 rounded-full">
                {isEdit ? 'Edição Cadastral' : 'Novo Registro'}
              </span>
              {isEdit && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ID: {patientId}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">
              {isEdit ? `Editar Paciente: ${patient?.name || name}` : 'Cadastrar Novo Paciente'}
            </h1>
            <p className="text-xs text-slate-500">Preencha os dados cadastrais e clínicos para abrir ou atualizar o prontuário.</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 bg-brand-cyan hover:bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/10 active:scale-95 disabled:bg-slate-300 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Cadastrar Paciente')}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 text-xs font-bold animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-black">Atenção ao preencher o formulário:</p>
            <p className="font-medium text-rose-600 mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            ×
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Dados Pessoais */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-brand-cyan flex items-center justify-center font-black text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Dados de Identificação</h2>
              <p className="text-xs text-slate-400">Informações principais do paciente para identificação clínica e legal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nome Completo */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center justify-between">
                <span>Nome Completo do Paciente *</span>
                <span className="text-[10px] text-slate-400 font-normal">Obrigatório</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  required
                  disabled={isSaving}
                  value={name}
                  onChange={(e) => setName(SecurityUtils.limit(SecurityUtils.sanitizeLettersOnly(e.target.value), 100))}
                  placeholder="Ex: Maria dos Santos Oliveira"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                CPF do Paciente
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  disabled={isSaving}
                  value={cpf}
                  onChange={(e) => setCpf(SecurityUtils.maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Data de Nascimento
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="date"
                  disabled={isSaving}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Gênero */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Gênero / Sexo
              </label>
              <select
                disabled={isSaving}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
                <option value="Não informado">Prefiro não informar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contato e Endereço */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Contato & Comunicação</h2>
              <p className="text-xs text-slate-400">Canais diretos para lembretes automáticos e notificações da clínica.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* WhatsApp / Telefone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                WhatsApp / Celular Principal
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  disabled={isSaving}
                  value={phone}
                  onChange={(e) => setPhone(SecurityUtils.maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center justify-between">
                <span>E-mail do Paciente *</span>
                <span className="text-[10px] text-slate-400 font-normal">Obrigatório</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="email"
                  required
                  disabled={isSaving}
                  value={email}
                  onChange={(e) => setEmail(SecurityUtils.sanitizeEmail(e.target.value))}
                  placeholder="paciente@exemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Endereço Residencial (Opcional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  disabled={isSaving}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, complemento"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Cidade / Estado */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Cidade / UF (Opcional)
              </label>
              <input 
                type="text"
                disabled={isSaving}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo / SP"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Informações Clínicas Iniciais */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
              3
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Atendimento & Informações Clínicas</h2>
              <p className="text-xs text-slate-400">Defina o profissional responsável e observações relevantes de saúde.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Dentista Responsável */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Dentista Responsável
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  disabled={isSaving}
                  value={dentistaResponsavel}
                  onChange={(e) => setDentistaResponsavel(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all cursor-pointer"
                >
                  <option value="">Selecione o profissional...</option>
                  {dentistOptions.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Procedimento Inicial */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Procedimento Inicial / Queixa
              </label>
              <select
                disabled={isSaving}
                value={procedimento}
                onChange={(e) => handleProcedureChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all cursor-pointer"
              >
                {PROCEDURES_OPTIONS.map(opt => (
                  <option key={opt.name} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Honorários Previstos */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Honorários Previstos (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <input 
                  type="number"
                  disabled={isSaving}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Alergias / Alertas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1">
                <HeartPulse className="w-3 h-3" /> Alergias ou Alertas Médicos
              </label>
              <input 
                type="text"
                disabled={isSaving}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ex: Alergia a Penicilina, Diabético..."
                className="w-full px-4 py-3 bg-rose-50/50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-900 focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 outline-none transition-all"
              />
            </div>

            {/* Observações Gerais */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                Observações Clínicas Gerais
              </label>
              <textarea
                rows={3}
                disabled={isSaving}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Informações adicionais sobre o histórico do paciente..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-cyan focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 font-medium text-center sm:text-left">
            Os dados do paciente são salvos e criptografados de acordo com a LGPD e normas do CFO.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-3 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-cyan hover:bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/10 active:scale-95 disabled:bg-slate-300 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : (isEdit ? 'Atualizar Prontuário' : 'Finalizar Cadastro')}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
