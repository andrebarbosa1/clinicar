/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProcedureStatus = 'Realizado' | 'Agendado' | 'Cancelado' | 'Pendente' | 'Em Atendimento' | 'Concluído';
export type PaymentStatus = 'Pago' | 'Pendente' | 'Atrasado';

export interface DentalRecord {
  id: string;
  data: string;
  horario?: string;
  paciente: string;
  procedimento: string;
  dentista: string;
  status: ProcedureStatus;
  statusPagamento: PaymentStatus;
  valor: number;
  reminderSent?: boolean;
  reminderSentAt?: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  description: string;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
