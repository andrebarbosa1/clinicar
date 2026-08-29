import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export function ConfirmUserDeleteModal({ user, onCancel, onConfirm }: { user: any; onCancel: () => void; onConfirm: () => Promise<void> | void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="p-3 bg-rose-50 rounded-xl">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Excluir Usuário</h3>
            <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Tem certeza de que deseja excluir permanentemente o usuário <strong className="text-slate-900">{user.name || user.username}</strong>?
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onConfirm();
              } finally {
                setIsDeleting(false);
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}
export default ConfirmUserDeleteModal;
