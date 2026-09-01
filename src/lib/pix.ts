/**
 * Banco Central do Brasil - Padrão EMV BR Code (PIX)
 * Gerador e Validador de Chave e Carga Pix Oficial (Copia e Cola + QR Code)
 */

export interface PixPayloadOptions {
  key: string;            // Chave PIX (CPF, CNPJ, E-mail, Celular ou Aleatória EVP)
  name: string;           // Nome do Titular / Razão Social (máx 25 caracteres, sem acentos)
  city: string;           // Cidade do Titular (máx 15 caracteres, sem acentos)
  amount?: number;        // Valor em Reais (ex: 150.00)
  txid?: string;          // Identificador da transação (máx 25 chars alfanuméricos)
  description?: string;   // Descrição da cobrança (opcional)
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com o padrão EMV do Bacen
 */
export function sanitizeText(text: string, maxLength: number): string {
  if (!text) return '';
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim();
  return normalized.slice(0, maxLength);
}

/**
 * Formata um campo no padrão TLV (Tag-Length-Value) do EMVCo
 */
function formatTLV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

/**
 * Calcula o checksum CRC16-CCITT (0xFFFF / 0x1021) exigido pelo Banco Central no final do código PIX
 */
export function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera a string Pix Copia e Cola Oficial (BR Code)
 */
export function generatePixPayload(options: PixPayloadOptions): {
  payload: string;
  qrCodeUrl: string;
  txid: string;
  formattedAmount: string;
} {
  const { key, name, city, amount, description } = options;
  const cleanKey = key.trim();
  const cleanName = sanitizeText(name || 'ODONTODASH CLINICA', 25) || 'ODONTODASH CLINICA';
  const cleanCity = sanitizeText(city || 'SAO PAULO', 15) || 'SAO PAULO';
  
  // Tratar txid (se não informado, gerar identificador único de até 25 caracteres)
  const rawTxid = options.txid ? options.txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) : '';
  const finalTxid = rawTxid || `OD${Date.now().toString(36).toUpperCase()}`.slice(0, 25);

  // 00: Payload Format Indicator (01)
  let payload = formatTLV('00', '01');

  // 26: Merchant Account Information - Pix
  // Sub-tag 00: Domínio do Bacen (br.gov.bcb.pix)
  // Sub-tag 01: Chave Pix
  // Sub-tag 02: Descrição da cobrança (opcional)
  let merchantAccountInfo = formatTLV('00', 'br.gov.bcb.pix');
  merchantAccountInfo += formatTLV('01', cleanKey);
  if (description) {
    const cleanDesc = sanitizeText(description, 40);
    if (cleanDesc) {
      merchantAccountInfo += formatTLV('02', cleanDesc);
    }
  }
  payload += formatTLV('26', merchantAccountInfo);

  // 52: Merchant Category Code (0000 padrão geral)
  payload += formatTLV('52', '0000');

  // 53: Transaction Currency (986 = Real Brasileiro BRL)
  payload += formatTLV('53', '986');

  // 54: Transaction Amount (se fornecido)
  if (amount && amount > 0) {
    const formattedVal = amount.toFixed(2);
    payload += formatTLV('54', formattedVal);
  }

  // 58: Country Code (BR)
  payload += formatTLV('58', 'BR');

  // 59: Merchant Name
  payload += formatTLV('59', cleanName);

  // 60: Merchant City
  payload += formatTLV('60', cleanCity);

  // 62: Additional Data Field Template (txid)
  const additionalData = formatTLV('05', finalTxid || '***');
  payload += formatTLV('62', additionalData);

  // 63: CRC16 (Calculado sobre toda a string anterior concatenada com '6304')
  payload += '6304';
  const crc = calculateCRC16(payload);
  const finalPayload = payload + crc;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(finalPayload)}`;

  return {
    payload: finalPayload,
    qrCodeUrl,
    txid: finalTxid,
    formattedAmount: amount ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Valor livre'
  };
}

/**
 * Detecta o tipo de chave Pix
 */
export function detectPixKeyType(key: string): 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP' | 'UNKNOWN' {
  const clean = key.trim();
  const digits = clean.replace(/\D/g, '');

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return 'EMAIL';
  }
  if (digits.length === 11 && (clean.includes('.') || clean.includes('-') || !clean.startsWith('+'))) {
    return 'CPF';
  }
  if (digits.length === 14) {
    return 'CNPJ';
  }
  if (/^\+?[1-9]\d{1,14}$/.test(clean.replace(/[\s()-]/g, '')) && (digits.length >= 10 && digits.length <= 13)) {
    return 'PHONE';
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return 'EVP';
  }
  return 'UNKNOWN';
}
