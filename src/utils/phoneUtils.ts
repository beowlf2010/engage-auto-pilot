
import { PhoneNumber } from '@/types/lead';

// Enhanced phone number formatting for Twilio E.164 compatibility
export const formatPhoneForTwilio = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle 10-digit numbers - add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If already has + at the beginning, keep it
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return phone; // Return original if can't format
};

// Format phone number for display (user-friendly)
export const formatPhoneForDisplay = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle 10-digit numbers
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    const tenDigits = digits.slice(1);
    return `+1 (${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
  }
  
  return phone; // Return original if can't format
};

// Legacy function - now uses Twilio format internally
export const formatPhoneNumber = (phone: string): string => {
  return formatPhoneForTwilio(phone);
};

// Enhanced phone validation - more permissive for CSV imports
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const digits = phone.replace(/\D/g, '');
  
  // Accept 7-15 digit numbers (more flexible for international)
  if (digits.length < 7 || digits.length > 15) return false;
  
  // Accept 10 or 11 digit numbers (US standard)
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
    return true;
  }
  
  // Accept international numbers (7-15 digits)
  if (digits.length >= 7 && digits.length <= 15) {
    return true;
  }
  
  return false;
};

// Strict validation for core system functions
export const isStrictValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  // Only accept 10 or 11 digit numbers for strict validation
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

// Validate E.164 format specifically for Twilio
export const isValidE164Format = (phone: string): boolean => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

// Enhanced phone number parsing - attempts to clean and format various inputs
export const parsePhoneNumber = (phone: string): { number: string; isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  if (!phone || typeof phone !== 'string') {
    return { number: '', isValid: false, warnings: ['Empty phone number'] };
  }
  
  const cleaned = phone.trim();
  if (!cleaned) {
    return { number: '', isValid: false, warnings: ['Empty phone number'] };
  }
  
  // Remove common separators and format characters
  const digits = cleaned.replace(/[\s\-\(\)\+\.]/g, '');
  const numbersOnly = digits.replace(/\D/g, '');
  
  if (numbersOnly.length === 0) {
    return { number: cleaned, isValid: false, warnings: ['No digits found in phone number'] };
  }
  
  // Check for extensions (common patterns)
  if (cleaned.toLowerCase().includes('ext') || cleaned.includes('x')) {
    warnings.push('Phone number contains extension - may need manual review');
  }
  
  // Try to format as valid phone number
  if (isValidPhoneNumber(numbersOnly)) {
    const formatted = formatPhoneForTwilio(numbersOnly);
    return { number: formatted, isValid: true, warnings };
  } else {
    warnings.push(`Phone number has ${numbersOnly.length} digits - may be invalid format`);
    return { number: cleaned, isValid: false, warnings };
  }
};

export const createPhoneNumbers = (
  cellphone?: string,
  dayphone?: string,
  evephone?: string,
  allowPartialData: boolean = false
): { phones: PhoneNumber[]; warnings: string[] } => {
  const phones: PhoneNumber[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];

  console.log('Creating phone numbers from:', { cellphone, dayphone, evephone, allowPartialData });

  // Priority order: cell (1), day (2), eve (3)
  if (cellphone) {
    const parsed = parsePhoneNumber(cellphone);
    warnings.push(...parsed.warnings);
    
    if (parsed.isValid && !seen.has(parsed.number)) {
      phones.push({
        id: crypto.randomUUID(),
        number: parsed.number,
        type: 'cell',
        priority: 1,
        status: 'active',
        isPrimary: true
      });
      seen.add(parsed.number);
      console.log(`Added valid cell phone: ${parsed.number}`);
    } else if (allowPartialData && parsed.number && !seen.has(parsed.number)) {
      // In flexible mode, add even invalid numbers for manual review
      phones.push({
        id: crypto.randomUUID(),
        number: parsed.number,
        type: 'cell',
        priority: 1,
        status: 'needs_review',
        isPrimary: true
      });
      seen.add(parsed.number);
      warnings.push(`Cell phone needs manual review: ${parsed.number}`);
      console.log(`Added cell phone for review: ${parsed.number}`);
    }
  }

  if (dayphone) {
    const parsed = parsePhoneNumber(dayphone);
    warnings.push(...parsed.warnings);
    
    if (parsed.isValid && !seen.has(parsed.number)) {
      phones.push({
        id: crypto.randomUUID(),
        number: parsed.number,
        type: 'day',
        priority: 2,
        status: 'active',
        isPrimary: phones.length === 0
      });
      seen.add(parsed.number);
      console.log(`Added valid day phone: ${parsed.number}`);
    } else if (allowPartialData && parsed.number && !seen.has(parsed.number)) {
      phones.push({
        id: crypto.randomUUID(),
        number: parsed.number,
        type: 'day',
        priority: 2,
        status: 'needs_review',
        isPrimary: phones.length === 0
      });
      seen.add(parsed.number);
      warnings.push(`Day phone needs manual review: ${parsed.number}`);
      console.log(`Added day phone for review: ${parsed.number}`);
    }
  }

  if (evephone) {
    const parsed = parsePhoneNumber(evephone);
    warnings.push(...parsed.warnings);
    
    if (parsed.isValid && !seen.has(parsed.number)) {
      phones.push({
        id: crypto.randomUUID(),
        number: parsed.number,
        type: 'eve',
        priority: 3,
        status: 'active',
        isPrimary: phones.length === 0
      });
      seen.add(parsed.number);
      console.log(`Added valid eve phone: ${parsed.number}`);
    } else if (allowPartialData && parsed.number && !seen.has(parsed.number)) {
      phones.push({
        id: crypto.randomUUID(),
        number: parsed.number,
        type: 'eve',
        priority: 3,
        status: 'needs_review',
        isPrimary: phones.length === 0
      });
      seen.add(parsed.number);
      warnings.push(`Eve phone needs manual review: ${parsed.number}`);
      console.log(`Added eve phone for review: ${parsed.number}`);
    }
  }

  console.log(`Created ${phones.length} phone numbers with ${warnings.length} warnings`);
  return { phones: phones.sort((a, b) => a.priority - b.priority), warnings };
};

export const getPrimaryPhone = (phoneNumbers: PhoneNumber[]): string => {
  const activePhones = phoneNumbers.filter(p => p.status === 'active');
  if (activePhones.length > 0) {
    return activePhones[0].number;
  }
  
  // If no active phones, return the first phone for manual review
  return phoneNumbers.length > 0 ? phoneNumbers[0].number : '';
};

// Helper to check if a lead has at least one usable phone number
export const hasUsablePhoneNumber = (phoneNumbers: PhoneNumber[]): boolean => {
  return phoneNumbers.some(p => p.status === 'active' || p.status === 'needs_review');
};
