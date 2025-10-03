/**
 * Normalizes a phone number to E.164 format for consistent storage and matching
 * @param phone - Raw phone number string
 * @returns Normalized phone number in E.164 format (+1XXXXXXXXXX for US numbers)
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (!digitsOnly) return null;
  
  // Handle US numbers
  if (digitsOnly.length === 10) {
    // 10 digits - add +1 prefix
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // 11 digits starting with 1 - add + prefix
    return `+${digitsOnly}`;
  } else if (digitsOnly.length === 11) {
    // 11 digits not starting with 1 - might be international
    return `+${digitsOnly}`;
  } else if (digitsOnly.length > 11) {
    // Already has country code
    return `+${digitsOnly}`;
  }
  
  // Fallback - return as-is with + if not already there
  return phone.startsWith('+') ? phone : `+${digitsOnly}`;
}
