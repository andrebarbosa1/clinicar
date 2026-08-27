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
  origem?: string;
  viaPortal?: boolean;
  canal?: string;
  trialOwnerId?: string;
  clinicId?: string;
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

export const INITIAL_USERS = [
  { id: '1', name: 'Dra. Ana Silveira', role: 'Admin', modules: 'Todos', username: 'ana.admin', password: '123', email: 'andreb202121@gmail.com', clinicName: 'mbsolucoes', clinicId: '1' },
  { id: '2', name: 'Dr. Roberto Santos', role: 'Dentista', modules: 'Dashboard, Agenda, Pacientes', username: 'roberto', password: '123', email: 'roberto@clinica.com', parentTrialId: '1', clinicId: '1', clinicName: 'mbsolucoes' },
  { id: '3', name: 'Mariana Lima', role: 'Recepcionista', modules: 'Dashboard, Agenda, Pacientes', username: 'mariana', password: '123', email: 'mariana@clinica.com', parentTrialId: '1', clinicId: '1', clinicName: 'mbsolucoes' },
  { id: 'super-admin-01', name: 'Suporte OdontoDash', role: 'SuperAdmin', modules: 'Todos', username: 'administrador', password: '123', email: 'suporte@odontodash.com.br' },
];

