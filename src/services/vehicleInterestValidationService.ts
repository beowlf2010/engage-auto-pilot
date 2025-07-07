
/**
 * Vehicle Interest Validation Service
 * Handles validation and sanitization of vehicle interest data with confidence scoring
 */

// Poor data quality patterns that should trigger low confidence
const POOR_QUALITY_PATTERNS = [
  'make unknown',
  'model unknown', 
  'year unknown',
  'unknown make',
  'unknown model',
  'unknown year',
  'not specified',
  'n/a',
  'none',
  'test',
  'sample',
  'demo',
  'null',
  'undefined'
];

// The fallback message to use when vehicle interest is invalid
const FALLBACK_MESSAGE = "I see you're still exploring options—happy to help you find the right fit!";

export interface VehicleInterestValidation {
  isValid: boolean;
  sanitizedMessage: string;
  originalValue: string;
  reason?: string;
  confidence?: number;
}

export interface VehicleValidationResult {
  isValidVehicleInterest: boolean;
  confidence: number;
  detectedIssue?: string;
}

/**
 * Enhanced vehicle interest validation with confidence scoring
 */
export const validateVehicleInterestWithConfidence = (vehicleText: string | null | undefined): VehicleValidationResult => {
  if (!vehicleText || !vehicleText.trim()) {
    return { 
      isValidVehicleInterest: false, 
      confidence: 0.1, 
      detectedIssue: 'No vehicle interest provided' 
    };
  }

  const text = vehicleText.toLowerCase().trim();
  
  // Check for poor data quality indicators
  for (const pattern of POOR_QUALITY_PATTERNS) {
    if (text.includes(pattern)) {
      return { 
        isValidVehicleInterest: false, 
        confidence: 0.2, 
        detectedIssue: `Contains "${pattern}" - poor data quality` 
      };
    }
  }

  // Check minimum length
  if (text.length < 8) {
    return { 
      isValidVehicleInterest: false, 
      confidence: 0.3, 
      detectedIssue: 'Too short - needs more specific vehicle info' 
    };
  }

  // Check for reasonable vehicle patterns
  const hasYear = /\b(19|20)\d{2}\b/.test(text);
  const hasMake = /\b(toyota|ford|honda|nissan|chevrolet|gmc|jeep|ram|dodge|hyundai|kia|mazda|subaru|volkswagen|audi|bmw|mercedes|lexus|acura|infiniti|cadillac|buick|lincoln|volvo|porsche|tesla|ferrari|lamborghini|bentley|rolls|maserati|jaguar|land|range|mini|fiat|alfa|genesis|mitsubishi)\b/i.test(text);
  
  // Good quality indicators
  if (hasYear && hasMake && text.length > 12) {
    return { isValidVehicleInterest: true, confidence: 0.9 };
  } else if ((hasYear || hasMake) && text.length > 10) {
    return { isValidVehicleInterest: true, confidence: 0.75 };
  } else if (text.length > 15) {
    return { isValidVehicleInterest: true, confidence: 0.65 };
  } else {
    return { 
      isValidVehicleInterest: false, 
      confidence: 0.4, 
      detectedIssue: 'Lacks specific make/model/year information' 
    };
  }
};

/**
 * Legacy validation function for backward compatibility
 */
export const validateVehicleInterest = (vehicleInterest: string | null | undefined): VehicleInterestValidation => {
  const result = validateVehicleInterestWithConfidence(vehicleInterest);
  const originalValue = vehicleInterest || '';
  
  return {
    isValid: result.isValidVehicleInterest,
    sanitizedMessage: result.isValidVehicleInterest 
      ? `your interest in ${vehicleInterest?.trim()}` 
      : FALLBACK_MESSAGE,
    originalValue,
    reason: result.detectedIssue || (result.isValidVehicleInterest ? 'Valid vehicle interest' : 'Invalid vehicle interest'),
    confidence: result.confidence
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
