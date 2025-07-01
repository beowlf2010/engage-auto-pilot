
/**
 * Vehicle Interest Validation Service
 * Handles validation and sanitization of vehicle interest data
 */

// Invalid patterns that should trigger fallback message
const INVALID_PATTERNS = [
  // Null/empty checks handled separately
  /^not specified$/i,
  /^unknown$/i,
  /^n\/a$/i,
  /^na$/i,
  /^null$/i,
  /^undefined$/i,
  /^none$/i,
  /^test$/i,
  /^sample$/i,
  /^demo$/i,
  /^vehicle$/i,
  /^car$/i,
  /^auto$/i,
  /^automobile$/i,
  /^\s*-+\s*$/,  // Just dashes
  /^\s*\.+\s*$/,  // Just periods
];

// The fallback message to use when vehicle interest is invalid
const FALLBACK_MESSAGE = "I see you're still exploring options—happy to help you find the right fit!";

export interface VehicleInterestValidation {
  isValid: boolean;
  sanitizedMessage: string;
  originalValue: string;
  reason?: string;
}

/**
 * Validates vehicle interest and returns appropriate message
 */
export const validateVehicleInterest = (vehicleInterest: string | null | undefined): VehicleInterestValidation => {
  const originalValue = vehicleInterest || '';
  
  // Check for null, undefined, or empty
  if (!vehicleInterest || typeof vehicleInterest !== 'string') {
    return {
      isValid: false,
      sanitizedMessage: FALLBACK_MESSAGE,
      originalValue,
      reason: 'Null or undefined value'
    };
  }

  // Check for empty or whitespace-only strings
  const trimmed = vehicleInterest.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      sanitizedMessage: FALLBACK_MESSAGE,
      originalValue,
      reason: 'Empty or whitespace-only string'
    };
  }

  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        sanitizedMessage: FALLBACK_MESSAGE,
        originalValue,
        reason: `Matched invalid pattern: ${pattern.source}`
      };
    }
  }

  // If we get here, the vehicle interest appears valid
  return {
    isValid: true,
    sanitizedMessage: `your interest in ${trimmed}`,
    originalValue,
    reason: 'Valid vehicle interest'
  };
};

/**
 * Get a contextual message fragment for vehicle interest
 * Returns either the valid vehicle interest or the fallback message
 */
export const getVehicleInterestMessage = (vehicleInterest: string | null | undefined): string => {
  const validation = validateVehicleInterest(vehicleInterest);
  return validation.sanitizedMessage;
};

/**
 * Check if vehicle interest should use fallback
 */
export const shouldUseFallback = (vehicleInterest: string | null | undefined): boolean => {
  const validation = validateVehicleInterest(vehicleInterest);
  return !validation.isValid;
};
