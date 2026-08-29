import React from 'react';
import { cn } from '../lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    'Realizado': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    'Concluído': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    'Agendado': 'bg-sky-50 text-sky-700 border-sky-200/60',
    'Pendente': 'bg-amber-50 text-amber-700 border-amber-200/60',
    'Cancelado': 'bg-rose-50 text-rose-700 border-rose-200/60',
    'Em Atendimento': 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    'Faltou': 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const currentStyle = statusStyles[status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border', currentStyle)}>
      {status || 'Pendente'}
    </span>
  );
}
export default StatusBadge;
