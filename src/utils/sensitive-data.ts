// Default patterns for sensitive data fields
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

// Sensitive data masking options
export interface SensitiveDataMaskingOptions {
  sensitiveFields: string[];
  customPatterns?: RegExp[];
  maskCharacter?: string;
  preserveLength?: boolean;
  showFirst?: number;
  showLast?: number;
}

// Main function for masking sensitive data in objects
export function maskSensitiveData(
  data: any,
  options: SensitiveDataMaskingOptions
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, options));
  }
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (shouldMaskField(key, options)) {
      result[key] = maskValue(value, options);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = maskSensitiveData(value, options);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Check if a field should be masked
function shouldMaskField(fieldName: string, options: SensitiveDataMaskingOptions): boolean {
  const { sensitiveFields, customPatterns = [] } = options;
  
  // Check explicit field names
  if (sensitiveFields.some(field => 
    fieldName.toLowerCase().includes(field.toLowerCase())
  )) {
    return true;
  }
  
  // Check default patterns
  if (DEFAULT_SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName))) {
    return true;
  }
  
  // Check custom patterns
  if (customPatterns.some(pattern => pattern.test(fieldName))) {
    return true;
  }
  
  return false;
}

// Mask a single value
function maskValue(value: any, options: SensitiveDataMaskingOptions): string {
  if (value === null || value === undefined) {
    return value;
  }
  
  const str = String(value);
  const {
    maskCharacter = '*',
    preserveLength = true,
    showFirst = 0,
    showLast = 0
  } = options;
  
  if (str.length <= showFirst + showLast) {
    return preserveLength ? maskCharacter.repeat(str.length) : maskCharacter.repeat(3);
  }
  
  const firstPart = str.substring(0, showFirst);
  const lastPart = str.substring(str.length - showLast);
  const middleLength = preserveLength ? str.length - showFirst - showLast : 3;
  const maskedMiddle = maskCharacter.repeat(middleLength);
  
  return firstPart + maskedMiddle + lastPart;
}

// URL parameter masking function
export function maskUrlParameters(url: string, sensitiveParams: string[]): string {
  try {
    const urlObj = new URL(url);
    
    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        const value = urlObj.searchParams.get(param);
        if (value) {
          const maskedValue = maskValue(value, {
            sensitiveFields: [],
            showFirst: 1,
            showLast: 1
          });
          urlObj.searchParams.set(param, maskedValue);
        }
      }
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

// Credit card masking function
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) {
    return cardNumber;
  }
  
  // Remove spaces and dashes
  const cleanCard = cardNumber.replace(/[\s-]/g, '');
  
  if (cleanCard.length < 8) {
    return '*'.repeat(cleanCard.length);
  }
  
  // Show first 4 and last 4 digits
  const firstFour = cleanCard.substring(0, 4);
  const lastFour = cleanCard.substring(cleanCard.length - 4);
  const middleLength = cleanCard.length - 8;
  
  return `${firstFour}${'*'.repeat(middleLength)}${lastFour}`;
}

// Email masking function
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