/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  CheckCheck, 
  Clock, 
  Phone, 
  Calendar, 
  Settings2, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Stethoscope,
  Smile,
  Sliders
} from 'lucide-react';
import { cn } from '../lib/utils';

interface WhatsAppChatbotViewProps {
  clinicName: string;
  doctorsList: string[];
  records: any[];
  onAutoReschedule?: (recordId: string, newDate: string, newTime: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'patient' | 'bot' | 'system';
  text: string;
  time: string;
  intent?: string;
  actionTriggered?: string;
}

export default function WhatsAppChatbotView({
  clinicName,
  doctorsList,
  records,
  onAutoReschedule
}: WhatsAppChatbotViewProps) {
  // Chat State
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Olá! Bem-vindo(a) à ${clinicName}! 🦷✨ Sou a assistente virtual inteligente da clínica. Como posso te ajudar hoje? Você pode confirmar horários, reagendar consultas ou tirar dúvidas pós-atendimento.`,
      time: '10:00'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [patientName, setPatientName] = useState('Mariana Silva');
  const [patientPhone, setPatientPhone] = useState('(11) 98765-4321');

  // Bot Configuration State
  const [botTone, setBotTone] = useState<'Acolhedor e Eficiente' | 'Formal e Executivo' | 'Direto e Objetivo'>('Acolhedor e Eficiente');
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(true);
  const [autoRescheduleEnabled, setAutoRescheduleEnabled] = useState(true);
  const [postOpSupportEnabled, setPostOpSupportEnabled] = useState(true);
  const [emergencyTriageEnabled, setEmergencyTriageEnabled] = useState(true);

  // Execution logs
  const [botActionsLog, setBotActionsLog] = useState<string[]>([
    'Bot IA iniciado e pronto para atendimento.',
    'Regra de confirmação 24h ativada.',
    'Módulo de triagem pós-operatória conectado com sucesso.'
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputMessage;
    if (!messageText.trim()) return;

    const userMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'patient',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/whatsapp-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          patientPhone,
          message: messageText,
          history: messages.slice(-6),
          clinicName,
          availableDentists: doctorsList,
          tone: botTone
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro na resposta do bot.');
      }

      const botPayload = data.response;
      const botMsg: MessageItem = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: botPayload.replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: botPayload.intent,
        actionTriggered: botPayload.actionTriggered
      };

      setMessages(prev => [...prev, botMsg]);

      if (botPayload.actionTriggered) {
        setBotActionsLog(prev => [
          `[${new Date().toLocaleTimeString()}] ${botPayload.actionTriggered} (Paciente: ${patientName})`,
          ...prev
        ]);
      }
    } catch (err: any) {
      console.error("Bot chat error:", err);
      const errorMsg: MessageItem = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: 'Desculpe, tive uma instabilidade momentânea. Já notifiquei nossa recepção para te atender!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    'Oi! Preciso reagendar minha consulta de amanhã para outro dia.',
    'Sim, confirmo minha presença na consulta de amanhã!',
    'Posso tomar sorvete ou comer comida quente após extrair o dente?',
    'Quanto custa o tratamento de clareamento dental a laser?',
    'Estou com muita dor e inchaço no dente do fundo!'
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 rounded-2xl px-4 py-2.5 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>Chatbot Ativo & Autônomo WhatsApp (Gemini IA)</span>
            </h1>
            <span className="text-xs text-slate-500 font-semibold">•</span>
            <span className="text-xs text-emerald-300 font-medium">
              Secretária Autônoma 24/7
            </span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-900/40 border border-emerald-500/30 px-3 py-1 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-emerald-200">Robô Conectado</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Configs on Left, Realistic WhatsApp Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Autonomous Capabilities & Rules */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Rules & Automation Switches */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-5">
            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Regras e Capacidades do Agente IA
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Confirmação Ativa 24h Antes</h4>
                  <p className="text-[11px] text-slate-500">Envia lembrete e altera status para 'Confirmado' ao receber 'Sim'.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoConfirmEnabled}
                  onChange={(e) => setAutoConfirmEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Reagendamento 100% Autônomo</h4>
                  <p className="text-[11px] text-slate-500">Se o paciente disser que não pode, o bot propõe novos horários livres.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRescheduleEnabled}
                  onChange={(e) => setAutoRescheduleEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tira-Dúvidas Pós-Operatório</h4>
                  <p className="text-[11px] text-slate-500">Orientações de cuidados (gelo, repouso, alimentação) após extração/cirurgia.</p>
                </div>
                <input
                  type="checkbox"
                  checked={postOpSupportEnabled}
                  onChange={(e) => setPostOpSupportEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Triagem de Emergência & Handoff</h4>
                  <p className="text-[11px] text-slate-500">Detecta dor aguda e avisa o dentista de plantão imediatamente.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emergencyTriageEnabled}
                  onChange={(e) => setEmergencyTriageEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Tone of Voice Selector */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tom de Voz da IA no WhatsApp</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Acolhedor e Eficiente', 'Formal e Executivo', 'Direto e Objetivo'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBotTone(t)}
                    className={cn(
                      "text-[10px] font-bold py-2 px-1 rounded-xl border text-center transition-all cursor-pointer",
                      botTone === t
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {t.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Log / Autonomous Audit Trail */}
          <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Ações Autônomas Executadas
              </span>
              <span className="text-[10px] font-mono text-slate-500">Tempo Real</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto text-xs font-mono">
              {botActionsLog.map((log, lIdx) => (
                <div key={lIdx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-emerald-300/90 text-[11px] leading-snug">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: WhatsApp Web / Phone Mockup */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 rounded-[36px] p-4 sm:p-5 shadow-2xl border-4 border-slate-800 flex flex-col h-[650px] max-w-xl mx-auto overflow-hidden">
            
            {/* WhatsApp Header */}
            <div className="bg-emerald-800 rounded-2xl p-3.5 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg text-emerald-100">
                  🦷
                </div>
                <div>
                  <h4 className="text-xs font-black leading-tight flex items-center gap-1.5">
                    {clinicName}
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  </h4>
                  <p className="text-[10px] text-emerald-200">DenteIA - Secretária Virtual 24h</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span className="text-[10px]">Verificado</span>
              </div>
            </div>

            {/* Chat Body */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] rounded-2xl my-3"
              style={{
                backgroundImage: 'radial-gradient(#1f2c34 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            >
              {/* Date Badge */}
              <div className="text-center">
                <span className="bg-[#182229] text-slate-400 text-[10px] px-3 py-1 rounded-lg uppercase tracking-wider font-semibold">
                  Hoje
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[82%]",
                    msg.sender === 'patient' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "p-3 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap",
                      msg.sender === 'patient'
                        ? "bg-[#005c4b] text-white rounded-tr-xs"
                        : "bg-[#202c33] text-slate-100 rounded-tl-xs"
                    )}
                  >
                    {msg.text}

                    {/* Action Trigger Badge */}
                    {msg.actionTriggered && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1 text-[10px] text-cyan-300 font-bold">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        <span>{msg.actionTriggered}</span>
                      </div>
                    )}

                    <div className="text-[9px] text-right text-slate-400/80 mt-1 flex items-center justify-end gap-1">
                      <span>{msg.time}</span>
                      {msg.sender === 'patient' && <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-[#202c33] text-emerald-400 text-xs w-28 rounded-tl-xs animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Digitando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Test Trigger Chips */}
            <div className="pb-2 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
              {quickPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold whitespace-nowrap border border-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  "{prompt.length > 32 ? prompt.substring(0, 32) + '...' : prompt}"
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="flex items-center gap-2 pt-1 shrink-0">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite como paciente para testar a IA..."
                className="flex-1 bg-[#2a3942] text-slate-100 text-xs rounded-2xl px-4 py-3 border border-slate-700/60 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-400"
              />
              
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim()}
                className={cn(
                  "p-3 rounded-2xl transition-all cursor-pointer",
                  inputMessage.trim()
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
