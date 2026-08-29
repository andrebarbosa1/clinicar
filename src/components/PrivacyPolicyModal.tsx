import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

export function PrivacyPolicyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Política de Privacidade</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Última atualização: Maio 2026</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-slate-600 text-sm leading-relaxed space-y-6">
          <section>
            <h3 className="text-slate-800 font-bold mb-2">1. Coleta de Dados</h3>
            <p>Coletamos dados pessoais como nome, e-mail, telefone e CPF para fins exclusivos de agendamento e prestação de serviços odontológicos em nossa clínica em conformidade com a LGPD.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">2. Uso e Tratamento</h3>
            <p>Os dados armazenados são utilizados estritamente para gestão de prontuários, lembretes de consultas, confirmações automáticas e emissão de notas ou receitas.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">3. Segurança e Criptografia</h3>
            <p>Adotamos protocolos avançados de criptografia e proteção de dados para garantir o sigilo absoluto das informações de saúde dos pacientes.</p>
          </section>
          <section>
            <h3 className="text-slate-800 font-bold mb-2">4. Seus Direitos</h3>
            <p>Você pode solicitar a alteração, anonimização ou exclusão dos seus dados cadastrais a qualquer momento mediante contato com a administração da clínica.</p>
          </section>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer">
            Entendi e Concordo
          </button>
        </div>
      </motion.div>
    </div>
  );
}
export default PrivacyPolicyModal;
