/**
 * Utilitários para Firestore: previne erros de valores `undefined` não suportados pelo SDK.
 */

export function cleanFirestorePayload<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanFirestorePayload(item))
      .filter(item => item !== undefined) as any;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestorePayload(value);
    }
  }
  return cleaned as T;
}
