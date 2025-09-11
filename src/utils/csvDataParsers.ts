// Smart parsers for CSV data processing

export interface ParsedName {
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface ParsedVehicle {
  year?: string;
  make?: string;
  model?: string;
  fullString?: string;
}

export interface ParsedPhone {
  number: string;
  formatted: string;
  isValid: boolean;
}

/**
 * Parse combined "Last, First" or "Last, First Middle" name format
 */
export const parseClientName = (clientName: string): ParsedName => {
  if (!clientName || clientName.trim() === '') {
    return { firstName: '', lastName: '' };
  }

  const trimmed = clientName.trim();
  
  // Handle "Last, First" or "Last, First Middle" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    const lastName = parts[0] || '';
    const firstMiddle = parts[1] || '';
    
    if (firstMiddle.includes(' ')) {
      const firstMiddleParts = firstMiddle.split(' ').filter(p => p.trim());
      return {
        firstName: firstMiddleParts[0] || '',
        lastName,
        middleName: firstMiddleParts.slice(1).join(' ') || undefined
      };
    }
    
    return {
      firstName: firstMiddle,
      lastName
    };
  }
  
  // Handle "First Last" format as fallback
  const parts = trimmed.split(' ').filter(p => p.trim());
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
  
  // Single word - assume it's the last name
  return {
    firstName: '',
    lastName: trimmed
  };
};

/**
 * Parse vehicle string like "2024 Ford Mustang" or "1900 None None"
 */
export const parseVehicleString = (vehicleString: string): ParsedVehicle => {
  if (!vehicleString || vehicleString.trim() === '' || vehicleString.toLowerCase().includes('none')) {
    return {};
  }

  const trimmed = vehicleString.trim();
  const parts = trimmed.split(' ').filter(p => p.trim());
  
  if (parts.length === 0) return {};
  
  // First part might be year (4 digits)
  const yearPattern = /^\d{4}$/;
  let year: string | undefined;
  let remainingParts = [...parts];
  
  if (yearPattern.test(parts[0])) {
    year = parts[0];
    remainingParts = parts.slice(1);
  }
  
  // Next parts are make and model
  const make = remainingParts[0] || undefined;
  const model = remainingParts.slice(1).join(' ') || undefined;
  
  return {
    year,
    make,
    model,
    fullString: trimmed
  };
};

/**
 * Parse and validate phone number
 */
export const parsePhoneNumber = (phone: string): ParsedPhone => {
  if (!phone || phone.trim() === '') {
    return { number: '', formatted: '', isValid: false };
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Validate US phone number (10 or 11 digits)
  const isValid = digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  
  if (!isValid) {
    return { number: phone.trim(), formatted: phone.trim(), isValid: false };
  }
  
  // Format as (XXX) XXX-XXXX
  const phoneDigits = digits.length === 11 ? digits.slice(1) : digits;
  const formatted = `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  
  return {
    number: phoneDigits,
    formatted,
    isValid: true
  };
};

/**
 * Parse salesperson name (could be "Last, First" or "First Last")
 */
export const parseSalesperson = (salesperson: string): ParsedName => {
  return parseClientName(salesperson);
};

/**
 * Parse privacy flags (handles various true/false formats)
 */
export const parsePrivacyFlag = (flag: string | undefined | null): boolean => {
  if (!flag) return false;
  
  const normalized = flag.toString().toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || 
         normalized === 'federal contact exception' || normalized === 'dealer contact exception';
};

/**
 * Parse prospect type to status mapping
 */
export const parseProspectTypeToStatus = (prospectType: string): string => {
  if (!prospectType) return 'new';
  
  const normalized = prospectType.toLowerCase().trim();
  
  const mappings: Record<string, string> = {
    'new prospect': 'new',
    'new': 'new',
    'internet': 'new',
    'phone': 'contacted',
    'walk-in': 'engaged',
    'duplicate internet lead': 'duplicate',
    'bought elsewhere': 'lost',
    'unable to finance-equity': 'bad',
    'duplicate': 'duplicate'
  };
  
  return mappings[normalized] || 'new';
};

/**
 * Clean and standardize field values
 */
export const cleanFieldValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  return value.toString()
    .trim()
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Parse DMS ID (remove any prefixes, keep numeric part)
 */
export const parseDmsId = (dmsId: string): string => {
  if (!dmsId) return '';
  
  const digits = dmsId.replace(/\D/g, '');
  return digits;
};