import React from 'react';
import { X, Sparkles } from 'lucide-react';

export function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  const shortcuts = [
    { keys: ['Ctrl', 'H'], label: 'Início / Dashboard', desc: 'Acessa a visão geral dos indicadores e metas da clínica.' },
    { keys: ['Ctrl', 'A'], label: 'Agenda / Calendário', desc: 'Abre a visualização do calendário de consultas.' },
    { keys: ['Ctrl', 'P'], label: 'Base de Pacientes', desc: 'Acessa a listagem geral com pesquisa dos pacientes cadastrados.' },
    { keys: ['Ctrl', 'N'], label: 'Novo Paciente', desc: 'Abre diretamente o formulário de cadastro de paciente.' },
    { keys: ['Ctrl', 'B'], label: 'Nova Consulta (Booking)', desc: 'Abre diretamente a tela de novo agendamento de consulta.' },
    { keys: ['Ctrl', 'M'], label: 'Central de Mensagens', desc: 'Gerencie e simule envios de WhatsApp.' },
    { keys: ['Ctrl', 'F'], label: 'Módulo Financeiro', desc: 'Acessa faturamentos, receitas e fluxo de caixa.' },
    { keys: ['Ctrl', 'K'], label: 'Guia de Atalhos', desc: 'Abra ou feche este guia de atalhos a qualquer momento.' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200" id="shortcut-modal">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-brand-cyan/25 p-2 rounded-xl text-brand-cyan">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm tracking-wide">Atalhos de Teclado</h3>
              <p className="text-[10px] text-slate-300">Navegue com velocidade e agilidade no OdontoDash</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer select-none" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed text-left">
            💡 <strong>DICA DO PRO:</strong> Os modificadores funcionam tanto com a tecla <strong>Control (Ctrl)</strong> quanto no macOS com a tecla <strong>Command (⌘)</strong>.
          </p>
          <div className="divide-y divide-slate-100 text-left">
            {shortcuts.map((s, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 leading-normal flex items-center gap-1.5">{s.label}</span>
                  <span className="text-[10px] text-slate-400 leading-normal truncate">{s.desc}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {s.keys.map((k, kIdx) => (
                    <kbd key={kIdx} className="px-2 py-1 bg-slate-100 text-[#0f172a] text-[10px] font-black tracking-wide rounded-md border border-slate-300 shadow-xs font-mono uppercase">
                      {k === 'Ctrl' ? 'Ctrl / ⌘' : k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">Use <strong className="font-black text-slate-600">Ctrl + K</strong> em qualquer lugar do sistema</span>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shadow-sm">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
export default KeyboardShortcutsModal;
