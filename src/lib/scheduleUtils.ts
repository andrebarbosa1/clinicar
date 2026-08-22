/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, parseISO, isValid, addDays, getDay, isWeekend, isToday } from 'date-fns';
import { DentalRecord } from '../types';

export const CLINIC_OPEN_TIME = "08:00";
export const CLINIC_CLOSE_TIME = "17:00";
export const APPOINTMENT_DURATION_MINUTES = 90; // 1 hora e meia (90 min)

// Grade de horários com intervalos de 1 hora e meia entre 08:00 e 17:00
// 08:00 -> 09:30
// 09:30 -> 11:00
// 11:00 -> 12:30
// 12:30 -> 14:00
// 14:00 -> 15:30
// 15:30 -> 17:00
export const CLINIC_TIME_SLOTS = [
  "08:00",
  "09:30",
  "11:00",
  "12:30",
  "14:00",
  "15:30"
];

/**
 * Converte string 'HH:mm' para total de minutos desde a meia-noite
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Converte minutos para string 'HH:mm'
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Verifica se a data é dia útil (Segunda a Sexta)
 */
export function isBusinessDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return false;
  const day = getDay(d);
  return day >= 1 && day <= 5; // 1 = Segunda, 5 = Sexta
}

/**
 * Retorna o próximo dia útil a partir de uma data
 * Se 'strictNext' for true, sempre pula para o dia seguinte; caso contrário, se a data já for dia útil, mantém.
 */
export function getNextBusinessDay(fromDate: Date | string = new Date(), strictNext: boolean = false): Date {
  let d = typeof fromDate === 'string' ? parseISO(fromDate) : new Date(fromDate);
  if (!isValid(d)) d = new Date();

  if (strictNext) {
    d = addDays(d, 1);
  }

  // Se cair no sábado (6) ou domingo (0), avança até segunda-feira (1)
  while (getDay(d) === 0 || getDay(d) === 6) {
    d = addDays(d, 1);
  }

  return d;
}

/**
 * Retorna a data inicial do sistema respeitando o horário limite (17:00 / 15:30 para consulta de 1h30) e dias úteis
 */
export function getSystemInitialDate(): string {
  let now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lastSlotMinutes = timeToMinutes("15:30"); // Último horário disponível do dia

  // Se já passou do último horário de 1h30 útil do dia (15:30), joga para o próximo dia útil
  if (currentMinutes > lastSlotMinutes) {
    now = getNextBusinessDay(now, true);
  } else {
    // Se for sábado ou domingo, joga para a próxima segunda-feira
    now = getNextBusinessDay(now, false);
  }

  return format(now, 'yyyy-MM-dd');
}

/**
 * Valida e ajusta uma data e horário de agendamento de acordo com as regras:
 * 1. Segunda a Sexta apenas (fins de semana jogados para próxima segunda)
 * 2. Horário limite às 17:00 (duração de 1h30, então se início for após 15:30 ou final ultrapassar 17:00, joga para o próximo dia útil às 08:00)
 */
export function normalizeAppointmentDateTime(
  dateStr: string, 
  timeStr: string
): { 
  date: string; 
  time: string; 
  wasAdjusted: boolean; 
  reason?: string 
} {
  let targetDate = parseISO(dateStr);
  if (!isValid(targetDate)) {
    targetDate = new Date();
  }

  let adjusted = false;
  let reason = '';
  let selectedTime = timeStr || CLINIC_TIME_SLOTS[0];

  // 1. Verifica se é fim de semana
  const dayOfWeek = getDay(targetDate);
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    targetDate = getNextBusinessDay(targetDate, false);
    adjusted = true;
    reason = 'A clínica funciona de segunda a sexta-feira. A data foi transferida para o próximo dia útil.';
  }

  // 2. Verifica se o horário ultrapassa as 17:00 (início + 90min > 17:00)
  const startMin = timeToMinutes(selectedTime);
  const endMin = startMin + APPOINTMENT_DURATION_MINUTES;
  const closingMin = timeToMinutes(CLINIC_CLOSE_TIME); // 17:00 = 1020 min

  if (endMin > closingMin || startMin < timeToMinutes(CLINIC_OPEN_TIME)) {
    // Ultrapassa as 17:00 -> joga para o próximo dia útil às 08:00
    targetDate = getNextBusinessDay(targetDate, true);
    selectedTime = CLINIC_TIME_SLOTS[0]; // 08:00
    adjusted = true;
    reason = 'O atendimento ultrapassa o horário de encerramento da clínica (17:00). O agendamento foi realocado para o próximo dia útil às 08:00.';
  }

  return {
    date: format(targetDate, 'yyyy-MM-dd'),
    time: selectedTime,
    wasAdjusted: adjusted,
    reason
  };
}

/**
 * Verifica se dois intervalos de horário colidem (overlap)
 */
export function doSlotsOverlap(
  timeA: string,
  durationA: number = APPOINTMENT_DURATION_MINUTES,
  timeB: string,
  durationB: number = APPOINTMENT_DURATION_MINUTES
): boolean {
  if (!timeA || !timeB) return false;
  const startA = timeToMinutes(timeA);
  const endA = startA + durationA;
  const startB = timeToMinutes(timeB);
  const endB = startB + durationB;

  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Verifica se existe conflito de horário para o mesmo médico na mesma data
 */
export function findDentistScheduleConflict(
  existingRecords: DentalRecord[],
  dentist: string,
  dateStr: string,
  timeStr: string,
  excludeRecordId?: string,
  durationMin: number = APPOINTMENT_DURATION_MINUTES
): DentalRecord | null {
  if (!dentist || !dateStr || !timeStr) return null;

  const conflict = existingRecords.find(record => {
    if (record.id === excludeRecordId) return false;
    if (record.status === 'Cancelado') return false;
    if (record.dentista !== dentist) return false;
    if (record.data !== dateStr) return false;
    if (!record.horario) return false;

    return doSlotsOverlap(timeStr, durationMin, record.horario, APPOINTMENT_DURATION_MINUTES);
  });

  return conflict || null;
}

/**
 * Retorna os horários ocupados para um determinado médico em uma data
 */
export function getOccupiedSlotsForDentist(
  existingRecords: DentalRecord[],
  dentist: string,
  dateStr: string,
  excludeRecordId?: string
): { slot: string; isOccupied: boolean; isPast: boolean; conflictingPatient?: string }[] {
  const isSelectedToday = dateStr === format(new Date(), 'yyyy-MM-dd');
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return CLINIC_TIME_SLOTS.map(slot => {
    const slotMin = timeToMinutes(slot);
    const isPast = isSelectedToday && (slotMin <= nowMin);

    const conflict = findDentistScheduleConflict(
      existingRecords,
      dentist,
      dateStr,
      slot,
      excludeRecordId,
      APPOINTMENT_DURATION_MINUTES
    );

    return {
      slot,
      isOccupied: !!conflict,
      isPast,
      conflictingPatient: conflict ? conflict.paciente : undefined
    };
  });
}
