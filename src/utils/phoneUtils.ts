
import { PhoneNumber } from '@/types/lead';

// Format phone number for Twilio E.164 compatibility
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

export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  // Accept 10 or 11 digit numbers (more flexible)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

// Validate E.164 format specifically for Twilio
export const isValidE164Format = (phone: string): boolean => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

export const createPhoneNumbers = (
  cellphone?: string,
  dayphone?: string,
  evephone?: string
): PhoneNumber[] => {
  const phones: PhoneNumber[] = [];
  const seen = new Set<string>();

  console.log('Creating phone numbers from:', { cellphone, dayphone, evephone });

  // Priority order: cell (1), day (2), eve (3)
  if (cellphone && isValidPhoneNumber(cellphone)) {
    const formatted = formatPhoneForTwilio(cellphone);
    if (!seen.has(formatted)) {
      phones.push({
        id: crypto.randomUUID(),
        number: formatted,
        type: 'cell',
        priority: 1,
        status: 'active',
        isPrimary: true
      });
      seen.add(formatted);
      console.log(`Added cell phone: ${formatted}`);
    }
  } else if (cellphone) {
    console.log(`Invalid cell phone: ${cellphone}`);
  }

  if (dayphone && isValidPhoneNumber(dayphone)) {
    const formatted = formatPhoneForTwilio(dayphone);
    if (!seen.has(formatted)) {
      phones.push({
        id: crypto.randomUUID(),
        number: formatted,
        type: 'day',
        priority: 2,
        status: 'active',
        isPrimary: phones.length === 0
      });
      seen.add(formatted);
      console.log(`Added day phone: ${formatted}`);
    }
  } else if (dayphone) {
    console.log(`Invalid day phone: ${dayphone}`);
  }

  if (evephone && isValidPhoneNumber(evephone)) {
    const formatted = formatPhoneForTwilio(evephone);
    if (!seen.has(formatted)) {
      phones.push({
        id: crypto.randomUUID(),
        number: formatted,
        type: 'eve',
        priority: 3,
        status: 'active',
        isPrimary: phones.length === 0
      });
      seen.add(formatted);
      console.log(`Added eve phone: ${formatted}`);
    }
  } else if (evephone) {
    console.log(`Invalid eve phone: ${evephone}`);
  }

  console.log(`Created ${phones.length} valid phone numbers`);
  return phones.sort((a, b) => a.priority - b.priority);
};

export const getPrimaryPhone = (phoneNumbers: PhoneNumber[]): string => {
  const activePhones = phoneNumbers.filter(p => p.status === 'active');
  return activePhones.length > 0 ? activePhones[0].number : '';
};
