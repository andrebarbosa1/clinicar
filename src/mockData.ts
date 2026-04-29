/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DentalRecord } from './types';
import { subDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

const PROCEDURES = [
  'Limpeza', 
  'Ortodontia', 
  'Canal', 
  'Extração', 
  'Restauração', 
  'Clareamento', 
  'Implante'
];

const DENTISTS = ['Dr. Silva', 'Dra. Maria', 'Dr. Ricardo', 'Dra. Ana'];
const PATIENTS = [
  'Ana Costa', 'Beto Silva', 'Carlos Santos', 'Diana Lima', 'Eduardo Souza',
  'Fernanda Oliveira', 'Gabriel Pereira', 'Helena Martins', 'Igor Ferreira', 'Julia Gomes'
];

export const generateMockData = (): DentalRecord[] => {
  const records: DentalRecord[] = [];
  const now = new Date();
  
  // Generate data for the last 6 months
  for (let i = 0; i < 180; i++) {
    const date = subDays(now, i);
    const numRecords = Math.floor(Math.random() * 5) + 1; // 1-5 records per day
    
    for (let j = 0; j < numRecords; j++) {
      const statusValue = Math.random();
      let status: DentalRecord['status'] = 'Realizado';
      if (statusValue < 0.2) status = 'Agendado';
      else if (statusValue < 0.25) status = 'Cancelado';
      else if (statusValue < 0.35) status = 'Pendente';

      const paymentValue = Math.random();
      let statusPagamento: DentalRecord['statusPagamento'] = 'Pago';
      if (paymentValue < 0.2) statusPagamento = 'Pendente';
      else if (paymentValue < 0.3) statusPagamento = 'Atrasado';

      records.push({
        id: `rec-${i}-${j}`,
        data: format(date, 'yyyy-MM-dd'),
        paciente: PATIENTS[Math.floor(Math.random() * PATIENTS.length)],
        procedimento: PROCEDURES[Math.floor(Math.random() * PROCEDURES.length)],
        dentista: DENTISTS[Math.floor(Math.random() * DENTISTS.length)],
        status,
        statusPagamento,
        valor: Math.floor(Math.random() * 800) + 150,
      });
    }
  }
  
  return records.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};

export const MOCK_DATA = generateMockData();
