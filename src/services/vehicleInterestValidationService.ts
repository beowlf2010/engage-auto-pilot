
/**
 * Vehicle Interest Validation Service
 * Detects corrupted or suspicious vehicle interest data
 */

// Known corruption patterns in vehicle interest data
const CORRUPTION_PATTERNS = [
  'make unknown',
  'unknown m',
  'model unknown',
  'year unknown',
  'unknown make',
  'unknown model',
  'unknown year',
  'not specified',
  'n/a',
  'na',
  'null',
  'undefined',
  'none',
  'test',
  'sample',
  'demo'
];

// Generic vehicle terms that indicate poor data quality
const GENERIC_VEHICLE_TERMS = [
  'vehicle',
  'car',
  'auto',
  'automobile',
  'truck',
  'suv',
  'sedan',
  'coupe',
  'hatchback'
];

// Pattern to detect incomplete year/make/model combinations
const INCOMPLETE_PATTERN = /^\d{4}\s+(make|model|unknown|year)/i;

export interface VehicleInterestValidationResult {
  isValidVehicleInterest: boolean;
  confidence: number;
  detectedIssue: 'corruption' | 'generic' | 'incomplete' | 'quoted_data' | 'valid';
  suggestions: {
    useGenericVehicleMessage: boolean;
    fallbackMessage?: string;
  };
}

export const validateVehicleInterest = (vehicleInterest: string): VehicleInterestValidationResult => {
  if (!vehicleInterest || typeof vehicleInterest !== 'string') {
    return {
      isValidVehicleInterest: false,
      confidence: 0,
      detectedIssue: 'corruption',
      suggestions: {
        useGenericVehicleMessage: true,
        fallbackMessage: 'finding the right vehicle'
      }
    };
  }

  // Clean the interest by removing quotes and normalizing
  const cleanInterest = vehicleInterest
    .replace(/"/g, '') // Remove all quotes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .toLowerCase();
  
  // Check if the original had excessive quotes (indicates data quality issue)
  const hasExcessiveQuotes = (vehicleInterest.match(/"/g) || []).length > 2;
  
  // Check for known corruption patterns
  const hasCorruption = CORRUPTION_PATTERNS.some(pattern => 
    cleanInterest.includes(pattern)
  );
  
  if (hasCorruption) {
    return {
      isValidVehicleInterest: false,
      confidence: 0.1,
      detectedIssue: 'corruption',
      suggestions: {
        useGenericVehicleMessage: true,
        fallbackMessage: 'finding the perfect vehicle for your needs'
      }
    };
  }

  // Check for incomplete patterns like "2025 Make Unknown"
  if (INCOMPLETE_PATTERN.test(cleanInterest)) {
    return {
      isValidVehicleInterest: false,
      confidence: 0.2,
      detectedIssue: 'incomplete',
      suggestions: {
        useGenericVehicleMessage: true,
        fallbackMessage: 'finding a great vehicle'
      }
    };
  }

  // Handle quoted data issue - lower confidence but still usable
  if (hasExcessiveQuotes) {
    return {
      isValidVehicleInterest: true,
      confidence: 0.7, // Lower confidence due to data quality issues
      detectedIssue: 'quoted_data',
      suggestions: {
        useGenericVehicleMessage: false,
        fallbackMessage: 'exploring your vehicle options'
      }
    };
  }

  // Check if it's just generic vehicle terms
  const isOnlyGeneric = GENERIC_VEHICLE_TERMS.some(term => 
    cleanInterest === term || cleanInterest === `${term}s`
  );
  
  if (isOnlyGeneric) {
    return {
      isValidVehicleInterest: false,
      confidence: 0.4,
      detectedIssue: 'generic',
      suggestions: {
        useGenericVehicleMessage: true,
        fallbackMessage: 'finding the right vehicle'
      }
    };
  }

  // If it contains specific make/model information, it's likely valid
  const hasSpecificInfo = /\b(chevrolet|chevy|ford|toyota|honda|nissan|bmw|mercedes|audi|silverado|camaro|equinox|traverse|tahoe|suburban|malibu|cruze|sonic|spark|bolt|corvette|colorado|express|impala|trailblazer|blazer|acadia|terrain|yukon|sierra|canyon|tundra|camry|corolla|prius|rav4|highlander|4runner|tacoma|sienna)\b/i.test(cleanInterest);
  
  if (hasSpecificInfo) {
    return {
      isValidVehicleInterest: true,
      confidence: 0.9,
      detectedIssue: 'valid',
      suggestions: {
        useGenericVehicleMessage: false
      }
    };
  }

  // Check length and structure for reasonable vehicle descriptions
  if (cleanInterest.length > 50 || cleanInterest.split(' ').length > 8) {
    return {
      isValidVehicleInterest: false,
      confidence: 0.3,
      detectedIssue: 'corruption',
      suggestions: {
        useGenericVehicleMessage: true,
        fallbackMessage: 'finding the perfect vehicle'
      }
    };
  }

  // Default to valid but low confidence for unknown patterns
  return {
    isValidVehicleInterest: true,
    confidence: 0.6,
    detectedIssue: 'valid',
    suggestions: {
      useGenericVehicleMessage: false
    }
  };
};

export const shouldUseGenericVehicleMessage = (vehicleInterest: string): boolean => {
  const validation = validateVehicleInterest(vehicleInterest);
  return validation.suggestions.useGenericVehicleMessage || validation.confidence < 0.5;
};

export const getCleanVehicleInterest = (vehicleInterest: string): string => {
  const validation = validateVehicleInterest(vehicleInterest);
  
  if (validation.suggestions.useGenericVehicleMessage) {
    return validation.suggestions.fallbackMessage || 'finding the right vehicle';
  }
  
  // Clean and return the vehicle interest
  return vehicleInterest
    .replace(/"/g, '') // Remove all quotes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};
