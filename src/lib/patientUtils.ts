/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes a patient name for robust comparison (removes accents, trims, lowercases, removes excess spaces)
 */
export function normalizePatientName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Robustly matches a patient in a list by exact match, normalized match, or matching email/phone
 */
export function findPatientByRobustMatch(
  searchQuery: string,
  patients: any[]
): any | null {
  if (!searchQuery || !patients || patients.length === 0) return null;

  const normalizedQuery = normalizePatientName(searchQuery);
  if (!normalizedQuery) return null;

  // 1. Exact ID match
  const matchById = patients.find(p => p.id === searchQuery || p.id === normalizedQuery);
  if (matchById) return matchById;

  // 2. Normalized name match
  const matchByName = patients.find(p => normalizePatientName(p.name || '') === normalizedQuery);
  if (matchByName) return matchByName;

  // 3. Match by phone digits if query looks like phone
  const cleanDigits = searchQuery.replace(/\D/g, '');
  if (cleanDigits.length >= 8) {
    const matchByPhone = patients.find(p => {
      const pPhone = (p.phone || '').replace(/\D/g, '');
      return pPhone.length >= 8 && (pPhone.includes(cleanDigits) || cleanDigits.includes(pPhone));
    });
    if (matchByPhone) return matchByPhone;
  }

  // 4. Substring full name match
  const matchBySub = patients.find(p => {
    const pNorm = normalizePatientName(p.name || '');
    return pNorm.length > 3 && (pNorm.includes(normalizedQuery) || normalizedQuery.includes(pNorm));
  });
  if (matchBySub) return matchBySub;

  return null;
}
