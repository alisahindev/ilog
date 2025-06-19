// Hassas veri alanları için varsayılan pattern'lar
const DEFAULT_SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /auth/i,
  /credential/i,
  /ssn/i,
  /social.security/i,
  /credit.card/i,
  /card.number/i,
  /cvv/i,
  /pin/i,
  /email/i,
  /phone/i,
  /mobile/i
];

// Hassas veri maskeleme seçenekleri
export interface SensitiveDataMaskingOptions {
  sensitiveFields: string[];
  customPatterns?: RegExp[];
  maskCharacter?: string;
  preserveLength?: boolean;
  showFirst?: number;
  showLast?: number;
}

// Veriyi maskele
export function maskSensitiveData(
  data: any,
  options: SensitiveDataMaskingOptions
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const {
    sensitiveFields,
    customPatterns = [],
    maskCharacter = '*',
    preserveLength = true,
    showFirst = 0,
    showLast = 0
  } = options;
  
  const allPatterns = [...DEFAULT_SENSITIVE_PATTERNS, ...customPatterns];
  
  return maskObjectRecursively(
    data,
    sensitiveFields,
    allPatterns,
    maskCharacter,
    preserveLength,
    showFirst,
    showLast
  );
}

function maskObjectRecursively(
  obj: any,
  sensitiveFields: string[],
  patterns: RegExp[],
  maskChar: string,
  preserveLength: boolean,
  showFirst: number,
  showLast: number
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => 
      maskObjectRecursively(item, sensitiveFields, patterns, maskChar, preserveLength, showFirst, showLast)
    );
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const masked: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (shouldMaskField(key, sensitiveFields, patterns)) {
      masked[key] = maskValue(value, maskChar, preserveLength, showFirst, showLast);
    } else if (typeof value === 'object') {
      masked[key] = maskObjectRecursively(
        value, 
        sensitiveFields, 
        patterns, 
        maskChar, 
        preserveLength, 
        showFirst, 
        showLast
      );
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

function shouldMaskField(
  fieldName: string,
  sensitiveFields: string[],
  patterns: RegExp[]
): boolean {
  // Exact match kontrolü
  if (sensitiveFields.includes(fieldName.toLowerCase())) {
    return true;
  }
  
  // Pattern match kontrolü
  return patterns.some(pattern => pattern.test(fieldName));
}

function maskValue(
  value: any,
  maskChar: string,
  preserveLength: boolean,
  showFirst: number,
  showLast: number
): string {
  if (value === null || value === undefined) {
    return value;
  }
  
  const stringValue = String(value);
  
  if (stringValue.length === 0) {
    return stringValue;
  }
  
  if (!preserveLength) {
    return '***';
  }
  
  const totalLength = stringValue.length;
  const visibleLength = showFirst + showLast;
  
  if (visibleLength >= totalLength) {
    return stringValue;
  }
  
  const maskLength = totalLength - visibleLength;
  const firstPart = stringValue.substring(0, showFirst);
  const lastPart = stringValue.substring(totalLength - showLast);
  const maskPart = maskChar.repeat(maskLength);
  
  return firstPart + maskPart + lastPart;
}

// Email maskeleme için özel fonksiyon
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email;
  }
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length > 2 
    ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
    : '*'.repeat(localPart.length);
    
  return `${maskedLocal}@${domain}`;
}

// Kredi kartı maskeleme için özel fonksiyon
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) return cardNumber;
  
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return cardNumber;
  
  const lastFour = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 4);
  
  return masked + lastFour;
}

// URL'deki hassas parametreleri maskele
export function maskUrlParameters(url: string, sensitiveParams: string[] = []): string {
  try {
    const urlObj = new URL(url);
    const allSensitiveParams = [...sensitiveParams, 'token', 'key', 'password', 'secret'];
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (allSensitiveParams.some(param => key.toLowerCase().includes(param.toLowerCase()))) {
        urlObj.searchParams.set(key, '***');
      }
    }
    
    return urlObj.toString();
  } catch {
    // Geçersiz URL ise orijinalini döndür
    return url;
  }
} 