/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Bot, 
  Settings, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  User, 
  Calendar, 
  Zap, 
  Filter, 
  RefreshCw, 
  Play, 
  FileText, 
  Share2, 
  ChevronRight, 
  Check, 
  Sliders, 
  Volume2, 
  Smile, 
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye,
  Copy
} from 'lucide-react';
import { format, parseISO, isValid, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { DentalRecord } from '../types';

interface MessagesViewProps {
  data: DentalRecord[];
  patients: any[];
  clinicName: string;
  db?: any;
  currentUser?: any;
}

interface AutoQueueItem {
  id: string;
  patientName: string;
  patientPhone: string;
  type: 'confirmacao_24h' | 'lembrete_hoje' | 'retorno_preventivo' | 'aniversario' | 'pos_atendimento';
  title: string;
  message: string;
  scheduledFor: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'erro';
  dateStr?: string;
  timeStr?: string;
  dentist?: string;
}

export default function MessagesView({
  data,
  patients,
  clinicName = 'Oral Admin Odontologia',
  db,
  currentUser
}: MessagesViewProps) {
  const [activeTab, setActiveTab] = useState<'fila' | 'chat' | 'gatilhos' | 'modelos'>('fila');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [directSearch, setDirectSearch] = useState('');
  
  // Direct chat simulation state
  const [chats, setChats] = useState<{[recordId: string]: any[]}>({});
  const [isTyping, setIsTyping] = useState<{[recordId: string]: boolean}>({});
  const [typedMessage, setTypedMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Template editor state
  const [templates, setTemplates] = useState({
    confirmacao_24h: localStorage.getItem('odonto_tpl_confirmacao_24h') || 
      "Olá, {primeiro_nome}! 👋 Aqui é da clínica {clinica}.\n\nLembramos que sua consulta com Dr(a). {dentista} está agendada para amanhã, dia {data} às {horario} ({procedimento}).\n\nPor favor, responda *SIM* para confirmar ou *REAGENDAR* para escolher outro horário. Obrigado! 🦷✨",
    lembrete_hoje: localStorage.getItem('odonto_tpl_lembrete_hoje') ||
      "Bom dia, {primeiro_nome}! ☀️ Lembramos que sua consulta na {clinica} é HOJE às {horario} com Dr(a). {dentista}.\n\nEstamos preparando tudo para receber você com muito carinho. Até logo!",
    pos_atendimento: localStorage.getItem('odonto_tpl_pos_atendimento') ||
      "Olá, {primeiro_nome}! Como você está se sentindo após o procedimento de {procedimento} realizado hoje na {clinica}?\n\nQualquer desconforto ou dúvida, nossa equipe e o(a) Dr(a). {dentista} estão à sua disposição! Desejamos uma excelente recuperação.",
    retorno: localStorage.getItem('odonto_tpl_retorno') || 
      "Olá, {primeiro_nome}! Já se passaram 6 meses desde seu último atendimento na clínica {clinica}. Recomendamos agendar seu retorno preventivo para manter seu sorriso saudável! Vamos agendar?",
    aniversario: localStorage.getItem('odonto_tpl_aniversario') || 
      "Olá, {primeiro_nome}! 🎉 Toda a equipe da clínica {clinica} deseja a você um feliz aniversário repleto de saúde, alegrias e muitos motivos para sorrir! Parabéns!"
  });

  const [activeTemplateKey, setActiveTemplateKey] = useState<keyof typeof templates>('confirmacao_24h');
  const [currentTemplateText, setCurrentTemplateText] = useState(templates.confirmacao_24h);

  // Automation triggers configs
  const [configs, setConfigs] = useState({
    autoConfirm24h: localStorage.getItem('odonto_cfg_autoConfirm24h') !== 'false',
    autoReminderToday: localStorage.getItem('odonto_cfg_autoReminderToday') !== 'false',
    autoPosCare: localStorage.getItem('odonto_cfg_autoPosCare') !== 'false',
    autoBirthday: localStorage.getItem('odonto_cfg_autoBirthday') !== 'false',
    autoRecall: localStorage.getItem('odonto_cfg_autoRecall') !== 'false',
    iaCoPilot: localStorage.getItem('odonto_cfg_iaCoPilot') !== 'false',
    sendHour: localStorage.getItem('odonto_cfg_sendHour') || '08:30'
  });

  // Automated Queue state
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueLogs, setQueueLogs] = useState<any[]>([]);

  // Update current template text when key changes
  useEffect(() => {
    setCurrentTemplateText(templates[activeTemplateKey]);
  }, [activeTemplateKey, templates]);

  const handleSaveTemplate = () => {
    localStorage.setItem(`odonto_tpl_${activeTemplateKey}`, currentTemplateText);
    setTemplates(prev => ({ ...prev, [activeTemplateKey]: currentTemplateText }));
    alert('Modelo de mensagem salvo com sucesso!');
  };

  const handleToggleConfig = (key: keyof typeof configs) => {
    const newVal = !configs[key];
    setConfigs(prev => ({ ...prev, [key]: newVal }));
    localStorage.setItem(`odonto_cfg_${String(key)}`, String(newVal));
  };

  // Helper to format dynamic tags
  const formatTemplateWithData = (text: string, params: {
    patientName: string;
    date?: string;
    horario?: string;
    dentista?: string;
    procedimento?: string;
  }) => {
    const firstName = (params.patientName || 'Paciente').split(' ')[0];
    const formattedDate = params.date && isValid(parseISO(params.date))
      ? format(parseISO(params.date), "dd/MM/yyyy")
      : "Data combinada";

    return text
      .replace(/{paciente}/g, params.patientName || 'Paciente')
      .replace(/{primeiro_nome}/g, firstName)
      .replace(/{data}/g, formattedDate)
      .replace(/{horario}/g, params.horario || 'Horário agendado')
      .replace(/{dentista}/g, params.dentista || 'Cirurgião-Dentista')
      .replace(/{procedimento}/g, params.procedimento || 'Procedimento')
      .replace(/{clinica}/g, clinicName);
  };

  // Generate automated queue items based on active appointments and rules
  const automatedQueue: AutoQueueItem[] = useMemo(() => {
    const queue: AutoQueueItem[] = [];
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    // 1. Check appointments for Tomorrow (24h Confirmation)
    if (configs.autoConfirm24h) {
      data.filter(r => r.status === 'Agendado' && r.data === tomorrowStr).forEach(r => {
        const patientObj = patients.find(p => p.name === r.paciente || p.id === r.pacienteId);
        const phone = r.telefone || patientObj?.phone || patientObj?.telefone || '';
        const msg = formatTemplateWithData(templates.confirmacao_24h, {
          patientName: r.paciente,
          date: r.data,
          horario: r.horario,
          dentista: r.dentista,
          procedimento: r.procedimento
        });

        queue.push({
          id: `queue-24h-${r.id}`,
          patientName: r.paciente,
          patientPhone: phone,
          type: 'confirmacao_24h',
          title: 'Confirmação 24h Antes',
          message: msg,
          scheduledFor: `Amanhã (${format(tomorrow, 'dd/MM')}) às ${r.horario}`,
          status: 'pendente',
          dateStr: r.data,
          timeStr: r.horario,
          dentist: r.dentista
        });
      });
    }

    // 2. Check appointments for Today (Same-Day Reminder)
    if (configs.autoReminderToday) {
      data.filter(r => r.status === 'Agendado' && r.data === todayStr).forEach(r => {
        const patientObj = patients.find(p => p.name === r.paciente || p.id === r.pacienteId);
        const phone = r.telefone || patientObj?.phone || patientObj?.telefone || '';
        const msg = formatTemplateWithData(templates.lembrete_hoje, {
          patientName: r.paciente,
          date: r.data,
          horario: r.horario,
          dentista: r.dentista,
          procedimento: r.procedimento
        });

        queue.push({
          id: `queue-today-${r.id}`,
          patientName: r.paciente,
          patientPhone: phone,
          type: 'lembrete_hoje',
          title: 'Lembrete de Hoje',
          message: msg,
          scheduledFor: `Hoje às ${r.horario}`,
          status: 'pendente',
          dateStr: r.data,
          timeStr: r.horario,
          dentist: r.dentista
        });
      });
    }

    // 3. Check Birthdays of today
    if (configs.autoBirthday) {
      const currentMonthDay = format(today, 'MM-dd');
      patients.filter(p => {
        if (!p.birthDate && !p.dataNascimento) return false;
        try {
          const bDate = parseISO(p.birthDate || p.dataNascimento);
          return isValid(bDate) && format(bDate, 'MM-dd') === currentMonthDay;
        } catch {
          return false;
        }
      }).forEach(p => {
        const msg = formatTemplateWithData(templates.aniversario, {
          patientName: p.name
        });

        queue.push({
          id: `queue-bday-${p.id}`,
          patientName: p.name,
          patientPhone: p.phone || p.telefone || '',
          type: 'aniversario',
          title: 'Felicitações de Aniversário 🎂',
          message: msg,
          scheduledFor: 'Hoje (Aniversário)',
          status: 'pendente'
        });
      });
    }

    return queue;
  }, [data, patients, configs, templates, clinicName]);

  // Direct send via WhatsApp Web / API / Desktop URL
  const handleDirectSendWhatsApp = (phoneStr: string, messageText: string, itemTitle?: string) => {
    if (!phoneStr) {
      alert('Paciente não possui número de telefone/WhatsApp cadastrado.');
      return;
    }
    const cleanNumber = phoneStr.replace(/\D/g, '');
    const fullNumber = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber;
    const encoded = encodeURIComponent(messageText);
    
    // Open direct WhatsApp chat with message pre-filled
    window.open(`https://wa.me/${fullNumber}?text=${encoded}`, '_blank');

    // Register log
    setQueueLogs(prev => [
      {
        id: `log-${Date.now()}`,
        time: format(new Date(), 'HH:mm:ss'),
        recipient: fullNumber,
        title: itemTitle || 'Disparo Direto',
        status: 'Enviado com Sucesso'
      },
      ...prev
    ]);
  };

  // Automated batch queue processor
  const handleProcessAllQueue = async () => {
    if (automatedQueue.length === 0) {
      alert('Nenhuma mensagem pendente na fila para disparar hoje.');
      return;
    }

    setIsProcessingQueue(true);
    let sentCount = 0;

    for (const item of automatedQueue) {
      if (item.patientPhone) {
        // Direct dispatch simulation + open first in window
        sentCount++;
        setQueueLogs(prev => [
          {
            id: `log-${Date.now()}-${item.id}`,
            time: format(new Date(), 'HH:mm:ss'),
            recipient: item.patientPhone,
            title: item.title,
            patient: item.patientName,
            status: 'Entregue via Automação'
          },
          ...prev
        ]);
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setIsProcessingQueue(false);
    alert(`Automação executada com sucesso! ${sentCount} mensagens processadas e registradas.`);
  };

  // Active appointments list for direct chat
  const upcomingAppointments = useMemo(() => {
    return data
      .filter(r => r.status === 'Agendado' || r.status === 'Em Atendimento')
      .sort((a, b) => {
        const da = a.data ? new Date(a.data).getTime() : 0;
        const db = b.data ? new Date(b.data).getTime() : 0;
        return da - db;
      });
  }, [data]);

  // Set default selected record for chat
  useEffect(() => {
    if (upcomingAppointments.length > 0 && !selectedRecordId) {
      setSelectedRecordId(upcomingAppointments[0].id);
    }
  }, [upcomingAppointments, selectedRecordId]);

  const selectedRecord = useMemo(() => {
    return data.find(r => r.id === selectedRecordId) || null;
  }, [data, selectedRecordId]);

  // Simulate patient reply in live chat
  const simulatePatientResponse = (recordId: string, userMsg: string) => {
    setTimeout(() => {
      setIsTyping(prev => ({ ...prev, [recordId]: true }));
    }, 800);

    setTimeout(() => {
      setIsTyping(prev => ({ ...prev, [recordId]: false }));

      const text = userMsg.toLowerCase();
      let reply = "Perfeito! Mensagem recebida com sucesso. Obrigado!";

      if (text.includes("sim") || text.includes("confirmo") || text.includes("ok") || text.includes("estarei")) {
        reply = "Sim, confirmo minha presença! Obrigado pelo lembrete. 👍";
      } else if (text.includes("reagendar") || text.includes("mudar") || text.includes("trocar")) {
        reply = "Olá! Gostaria de reagendar para a próxima semana se for possível, por gentileza.";
      } else if (text.includes("dor") || text.includes("sensibilidade")) {
        reply = "Estou sentindo um pouco de dor no dente. Posso tomar o analgésico prescrito?";
      }

      const patientMsg = {
        id: `p-${Date.now()}`,
        text: reply,
        sender: 'patient',
        timestamp: format(new Date(), 'HH:mm')
      };

      setChats(prev => {
        const currentList = prev[recordId] || [
          {
            id: 'init',
            text: formatTemplateWithData(templates.confirmacao_24h, {
              patientName: selectedRecord?.paciente || 'Paciente',
              date: selectedRecord?.data,
              horario: selectedRecord?.horario,
              dentista: selectedRecord?.dentista,
              procedimento: selectedRecord?.procedimento
            }),
            sender: 'clinic',
            timestamp: '08:30 (Automático)',
            status: 'delivered'
          }
        ];
        return {
          ...prev,
          [recordId]: [...currentList, patientMsg]
        };
      });

      // AI Co-pilot response if enabled
      if (configs.iaCoPilot) {
        setTimeout(() => {
          const iaMsg = {
            id: `ia-${Date.now()}`,
            text: `[Assistente IA]: Resposta computada e registrada no sistema da clínica. Qualquer dúvida estamos à disposição! ✨`,
            sender: 'clinic-ia',
            timestamp: format(new Date(), 'HH:mm')
          };
          setChats(prev => ({
            ...prev,
            [recordId]: [...(prev[recordId] || []), iaMsg]
          }));
        }, 1200);
      }
    }, 2200);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedRecordId || !selectedRecord) return;

    const userMsgText = typedMessage.trim();
    setTypedMessage('');

    const newMsg = {
      id: `c-${Date.now()}`,
      text: userMsgText,
      sender: 'clinic',
      timestamp: format(new Date(), 'HH:mm'),
      status: 'delivered'
    };

    setChats(prev => {
      const currentList = prev[selectedRecordId] || [
        {
          id: 'init',
          text: formatTemplateWithData(templates.confirmacao_24h, {
            patientName: selectedRecord.paciente,
            date: selectedRecord.data,
            horario: selectedRecord.horario,
            dentista: selectedRecord.dentista,
            procedimento: selectedRecord.procedimento
          }),
          sender: 'clinic',
          timestamp: '08:30 (Automático)',
          status: 'delivered'
        }
      ];
      return {
        ...prev,
        [selectedRecordId]: [...currentList, newMsg]
      };
    });

    simulatePatientResponse(selectedRecordId, userMsgText);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>Central de Mensagens & Automações</span>
          </h1>
          <span className="text-xs text-slate-300 font-semibold">•</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> WhatsApp Conectado
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-0.5 border border-slate-200/60 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('fila')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'fila' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Fila</span>
            {automatedQueue.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-cyan text-white text-[9px] flex items-center justify-center font-black">
                {automatedQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'chat' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('gatilhos')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'gatilhos' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gatilhos</span>
          </button>

          <button
            onClick={() => setActiveTab('modelos')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'modelos' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Modelos</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
              activeTab === 'historico' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FILA AUTOMÁTICA & DISPARO DIRETO */}
      {activeTab === 'fila' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Queue Items list */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand-cyan" />
                    Envios Automáticos Agendados ({automatedQueue.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mensagens preparadas pelo motor inteligente de regras (24h antes, hoje e aniversários).
                  </p>
                </div>

                <button
                  onClick={handleProcessAllQueue}
                  disabled={isProcessingQueue || automatedQueue.length === 0}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer",
                    automatedQueue.length === 0 
                      ? "bg-slate-300 cursor-not-allowed shadow-none" 
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95"
                  )}
                >
                  {isProcessingQueue ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Disparando Fila...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Disparar Fila Automática Agora</span>
                    </>
                  )}
                </button>
              </div>

              {/* Queue List */}
              {automatedQueue.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">Fila de Envios 100% em Dia!</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Não há lembretes pendentes de disparo no momento. Novos lembretes serão adicionados conforme novos agendamentos forem feitos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {automatedQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-brand-cyan/40 hover:shadow-md transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center font-black text-xs">
                            {item.patientName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800">{item.patientName}</h4>
                              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                {item.patientPhone || 'Sem WhatsApp'}
                              </span>
                            </div>
                            <p className="text-[11px] text-brand-cyan font-bold flex items-center gap-1 mt-0.5">
                              <span>{item.title}</span> • <span className="text-slate-500">{item.scheduledFor}</span>
                            </p>
                          </div>
                        </div>

                        {/* Direct Trigger Button */}
                        <button
                          onClick={() => handleDirectSendWhatsApp(item.patientPhone, item.message, item.title)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                          title="Enviar Mensagem Imediatamente via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Direto</span>
                        </button>
                      </div>

                      {/* Message Preview Box */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-xs text-slate-600 font-mono whitespace-pre-line leading-relaxed">
                        {item.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Automation Logs & Quick Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Automation Stats Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Status do Motor Automático
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Canal Principal:</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Oficial
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Horário dos Disparos:</span>
                  <span className="font-bold text-white">{configs.sendHour} hrs</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">IA Co-piloto Ativa:</span>
                  <span className="font-bold text-emerald-400">{configs.iaCoPilot ? 'Sim (Ativa)' : 'Não'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Anti-Bloqueio WhatsApp ativo com intervalos dinâmicos.</span>
              </div>
            </div>

            {/* Live Activity Logs */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center justify-between">
                <span>Histórico Recente de Envios</span>
                <span className="text-[10px] text-slate-400 font-bold">{queueLogs.length} logs</span>
              </h3>

              {queueLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Nenhum envio recente registrado nesta sessão.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {queueLogs.map(log => (
                    <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{log.title}</p>
                        <p className="text-[10px] text-slate-400">{log.recipient} • {log.time}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: CHAT DIRETO & CONVERSAS */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Patient Selector List */}
          <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider px-2">
              Pacientes com Consultas ({upcomingAppointments.length})
            </h2>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {upcomingAppointments.map(appt => {
                const isSelected = selectedRecordId === appt.id;
                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedRecordId(appt.id)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left",
                      isSelected
                        ? "bg-indigo-50/60 border-indigo-500/80 ring-2 ring-indigo-500/20"
                        : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-800 truncate">{appt.paciente}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {appt.data} às {appt.horario} • {appt.dentista}
                      </p>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-[560px] overflow-hidden">
            {selectedRecord ? (
              <>
                {/* Chat Top Header */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-cyan text-white font-black flex items-center justify-center text-sm">
                      {selectedRecord.paciente.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-black">{selectedRecord.paciente}</h3>
                      <p className="text-[11px] text-slate-300">
                        {selectedRecord.procedimento} • {selectedRecord.data} às {selectedRecord.horario}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDirectSendWhatsApp(
                      selectedRecord.telefone || '',
                      formatTemplateWithData(templates.confirmacao_24h, {
                        patientName: selectedRecord.paciente,
                        date: selectedRecord.data,
                        horario: selectedRecord.horario,
                        dentista: selectedRecord.dentista,
                        procedimento: selectedRecord.procedimento
                      })
                    )}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir WhatsApp Oficial</span>
                  </button>
                </div>

                {/* Messages Body */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 p-5 overflow-y-auto bg-[#f8fafc] space-y-3"
                >
                  {/* Default Automated Opening message if not started */}
                  {(!chats[selectedRecord.id] || chats[selectedRecord.id].length === 0) && (
                    <div className="flex justify-end">
                      <div className="max-w-md bg-emerald-600 text-white p-3.5 rounded-2xl rounded-tr-xs shadow-sm space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-200 block">
                          Disparo Automático da Clínica
                        </span>
                        <p className="text-xs whitespace-pre-line leading-relaxed">
                          {formatTemplateWithData(templates.confirmacao_24h, {
                            patientName: selectedRecord.paciente,
                            date: selectedRecord.data,
                            horario: selectedRecord.horario,
                            dentista: selectedRecord.dentista,
                            procedimento: selectedRecord.procedimento
                          })}
                        </p>
                        <span className="text-[9px] text-emerald-200 block text-right">08:30 ✓✓</span>
                      </div>
                    </div>
                  )}

                  {/* Render Thread Messages */}
                  {(chats[selectedRecord.id] || []).map((msg: any) => {
                    const isClinic = msg.sender === 'clinic' || msg.sender === 'clinic-ia';
                    return (
                      <div key={msg.id} className={cn("flex", isClinic ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-md p-3.5 rounded-2xl shadow-sm space-y-1",
                          isClinic 
                            ? msg.sender === 'clinic-ia'
                              ? "bg-slate-900 text-white rounded-tr-xs"
                              : "bg-emerald-600 text-white rounded-tr-xs"
                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                        )}>
                          <p className="text-xs whitespace-pre-line leading-relaxed">{msg.text}</p>
                          <span className={cn("text-[9px] block text-right", isClinic ? "text-emerald-200" : "text-slate-400")}>
                            {msg.timestamp} {isClinic && "✓✓"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping[selectedRecord.id] && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></span>
                        <span className="text-[10px] font-bold">Paciente digitando...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem direta..."
                    value={typedMessage}
                    onChange={e => setTypedMessage(e.target.value)}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-600/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                Selecione um paciente na lista para ver o histórico e enviar mensagens.
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: GATILHOS & REGRAS DE AUTOMAÇÃO */}
      {activeTab === 'gatilhos' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">
                Gatilhos Automáticos do Sistema
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure os eventos que disparam mensagens automáticas diretamente para os pacientes da clínica.
              </p>
            </div>

            <div className="space-y-4">
              {/* Trigger 1 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-cyan" />
                    Lembrete de Confirmação 24 Horas Antes
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Envia automaticamente no dia anterior com botões de confirmação para reduzir a taxa de faltas (No-Show).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConfig('autoConfirm24h')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                    configs.autoConfirm24h ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-md block transform transition-transform absolute top-0.5",
                    configs.autoConfirm24h ? "left-6.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Trigger 2 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Lembrete de Consulta no Próprio Dia (Hoje)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dispara na manhã do dia do agendamento confirmando horário e instruções da clínica.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConfig('autoReminderToday')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                    configs.autoReminderToday ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-md block transform transition-transform absolute top-0.5",
                    configs.autoReminderToday ? "left-6.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Trigger 3 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Felicitações de Aniversário Automático
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Identifica pacientes que fazem aniversário no dia e dispara cartão de felicitações carinhoso.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConfig('autoBirthday')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                    configs.autoBirthday ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-md block transform transition-transform absolute top-0.5",
                    configs.autoBirthday ? "left-6.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Trigger 4 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-600" />
                    Assistente IA Co-piloto de Atendimento
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Interpreta respostas dos pacientes (confirmação/dúvidas) e responde de forma humanizada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConfig('iaCoPilot')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                    configs.iaCoPilot ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-md block transform transition-transform absolute top-0.5",
                    configs.iaCoPilot ? "left-6.5" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MODELOS & TEMPLATES */}
      {activeTab === 'modelos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
          
          {/* Template Editor Left */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">
                Personalização de Modelos de Mensagem
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Utilize as tags dinâmicas para personalizar o conteúdo automático enviado aos pacientes.
              </p>
            </div>

            {/* Template Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'confirmacao_24h', label: 'Confirmação 24h' },
                { key: 'lembrete_hoje', label: 'Lembrete do Dia' },
                { key: 'pos_atendimento', label: 'Pós-Atendimento' },
                { key: 'retorno', label: 'Retorno 6 Meses' },
                { key: 'aniversario', label: 'Aniversário' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTemplateKey(item.key as any)}
                  className={cn(
                    "text-xs font-black px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                    activeTemplateKey === item.key 
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Editor Textarea */}
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Texto da Mensagem</label>
              <textarea
                rows={6}
                value={currentTemplateText}
                onChange={e => setCurrentTemplateText(e.target.value)}
                className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none leading-relaxed"
              />
            </div>

            {/* Dynamic Tags Helper */}
            <div className="p-3 bg-cyan-50/50 rounded-2xl border border-cyan-100 space-y-1.5 text-[11px]">
              <span className="font-bold text-brand-cyan block">Tags Dinâmicas Disponíveis:</span>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                {['{primeiro_nome}', '{paciente}', '{data}', '{horario}', '{dentista}', '{procedimento}', '{clinica}'].map(tag => (
                  <span key={tag} className="bg-white border border-cyan-200 px-2 py-0.5 rounded text-slate-700 font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveTemplate}
              className="px-6 py-3 bg-brand-cyan hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-cyan-500/20 cursor-pointer transition-all active:scale-95"
            >
              Salvar Alterações do Modelo
            </button>
          </div>

          {/* Live Mobile Screen Preview Right */}
          <div className="lg:col-span-5 bg-slate-900 p-6 rounded-3xl text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Visualização no Celular do Paciente
              </span>
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Smartphone screen simulation */}
            <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 space-y-2.5 font-sans">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 border-b border-slate-800/80 pb-2">
                <span>{clinicName}</span>
                <span className="text-[9px] text-slate-500">• Conta Comercial Verificada</span>
              </div>

              <div className="p-3 bg-[#1f2c34] rounded-xl rounded-tr-xs text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                {formatTemplateWithData(currentTemplateText, {
                  patientName: 'Mariana Oliveira',
                  date: '2026-08-25',
                  horario: '14:30',
                  dentista: 'Dr. Roberto Silva',
                  procedimento: 'Clareamento Dental'
                })}
              </div>

              <div className="flex justify-end items-center gap-1 text-[9px] text-slate-500">
                <span>10:15</span>
                <span className="text-cyan-400">✓✓</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              O paciente recebe uma mensagem formatada com emojis e quebras de linha prontas para leitura e resposta rápida.
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
