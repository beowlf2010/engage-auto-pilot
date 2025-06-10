
import { PhoneNumber } from '@/types/lead';

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle 10-digit numbers
  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    const tenDigits = digits.slice(1);
    return `+1-${tenDigits.slice(0, 3)}-${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
  }
  
  return phone; // Return original if can't format
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

export const createPhoneNumbers = (
  cellphone?: string,
  dayphone?: string,
  evephone?: string
): PhoneNumber[] => {
  const phones: PhoneNumber[] = [];
  const seen = new Set<string>();

  // Priority order: cell (1), day (2), eve (3)
  if (cellphone && isValidPhoneNumber(cellphone)) {
    const formatted = formatPhoneNumber(cellphone);
    if (!seen.has(formatted)) {
      phones.push({
        number: formatted,
        type: 'cell',
        priority: 1,
        status: 'active'
      });
      seen.add(formatted);
    }
  }

  if (dayphone && isValidPhoneNumber(dayphone)) {
    const formatted = formatPhoneNumber(dayphone);
    if (!seen.has(formatted)) {
      phones.push({
        number: formatted,
        type: 'day',
        priority: 2,
        status: 'active'
      });
      seen.add(formatted);
    }
  }

  if (evephone && isValidPhoneNumber(evephone)) {
    const formatted = formatPhoneNumber(evephone);
    if (!seen.has(formatted)) {
      phones.push({
        number: formatted,
        type: 'eve',
        priority: 3,
        status: 'active'
      });
      seen.add(formatted);
    }
  }

  return phones.sort((a, b) => a.priority - b.priority);
};

export const getPrimaryPhone = (phoneNumbers: PhoneNumber[]): string => {
  const activePhones = phoneNumbers.filter(p => p.status === 'active');
  return activePhones.length > 0 ? activePhones[0].number : '';
};
