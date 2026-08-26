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
  pacienteId?: string;
  telefone?: string;
  procedimento: string;
  dentista: string;
  status: ProcedureStatus;
  statusPagamento: PaymentStatus;
  valor: number;
  observacao?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  startedAt?: string;
  finishedAt?: string;
  servingSince?: string;
  isQuickEvent?: boolean;
  createdBy?: string;
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

export type AnamnesisFieldType = 'boolean' | 'text' | 'textarea' | 'select' | 'number';

export interface AnamnesisCustomField {
  id: string;
  label: string;
  type: AnamnesisFieldType;
  category?: string;
  options?: string[];
  placeholder?: string;
  helperText?: string;
  isAlertIfTrue?: boolean;
  alertTriggerValue?: string;
  required?: boolean;
  active: boolean;
  order: number;
}

export interface PatientAnamnesis {
  hasAllergy?: boolean;
  allergyDetails?: string;
  hasHeartProblem?: boolean;
  hasHypertension?: boolean;
  hasDiabetes?: boolean;
  takesMedication?: boolean;
  medicationDetails?: string;
  isSmoker?: boolean;
  hasBleedingHistory?: boolean;
  isPregnant?: boolean;
  hasAnesthesiaReaction?: boolean;
  generalNotes?: string;
  chiefComplaint?: string;
  medicalHistory?: string;
  medications?: string;
  allergies?: string;
  smoking?: string;
  alcohol?: string;
  customFields?: Record<string, any>;
  updatedAt?: string;
  updatedBy?: string;
}
