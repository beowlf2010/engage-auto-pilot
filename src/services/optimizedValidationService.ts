import { getBatchLearnedNameValidations, type LearnedNameValidation } from './nameValidationLearningService';

export interface OptimizedValidationStatus {
  nameValidation: boolean;
  vehicleValidation: boolean;
  nameConfidence: number;
  vehicleConfidence: number;
  hasLearningData: boolean;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  vehicle_interest?: string;
  ai_opt_in?: boolean;
}

// Pre-compiled regex patterns for better performance
const POOR_QUALITY_PATTERNS = [
  /make unknown/i,
  /model unknown/i, 
  /year unknown/i,
  /unknown make/i,
  /unknown model/i,
  /unknown year/i,
  /not specified/i,
  /\bn\/a\b/i,
  /\bnone\b/i,
  /\btest\b/i,
  /\bsample\b/i,
  /\bdemo\b/i
];

const VEHICLE_YEAR_REGEX = /\b(19|20)\d{2}\b/;
const VEHICLE_MAKE_REGEX = /\b(toyota|ford|honda|nissan|chevrolet|gmc|jeep|ram|dodge|hyundai|kia|mazda|subaru|volkswagen|audi|bmw|mercedes|lexus|acura|infiniti|cadillac|buick|lincoln|volvo|porsche|tesla|ferrari|lamborghini|bentley|rolls|maserati|jaguar|land|range|mini|fiat|alfa|genesis|mitsubishi)\b/i;

/**
 * Optimized vehicle validation with pre-compiled patterns
 */
const validateVehicleInterestOptimized = (vehicleText: string): { confidence: number; isValid: boolean; issue?: string } => {
  if (!vehicleText || !vehicleText.trim()) {
    return { confidence: 0.1, isValid: false, issue: 'No vehicle interest provided' };
  }

  const text = vehicleText.toLowerCase().trim();
  
  // Check for poor data quality indicators using pre-compiled patterns
  for (const pattern of POOR_QUALITY_PATTERNS) {
    if (pattern.test(text)) {
      return { confidence: 0.2, isValid: false, issue: `Contains poor data quality pattern` };
    }
  }

  // Check minimum length
  if (text.length < 8) {
    return { confidence: 0.3, isValid: false, issue: 'Too short - needs more specific vehicle info' };
  }

  // Check for reasonable vehicle patterns using pre-compiled regex
  const hasYear = VEHICLE_YEAR_REGEX.test(text);
  const hasMake = VEHICLE_MAKE_REGEX.test(text);
  
  // Good quality indicators
  if (hasYear && hasMake && text.length > 12) {
    return { confidence: 0.9, isValid: true };
  } else if ((hasYear || hasMake) && text.length > 10) {
    return { confidence: 0.75, isValid: true };
  } else if (text.length > 15) {
    return { confidence: 0.65, isValid: true };
  } else {
    return { confidence: 0.4, isValid: false, issue: 'Lacks specific make/model/year information' };
  }
};

/**
 * Batch process validation for multiple leads
 * Significantly reduces database queries and processing time
 */
export const getBatchValidationStatuses = async (
  leads: Lead[]
): Promise<Map<string, OptimizedValidationStatus>> => {
  const statusMap = new Map<string, OptimizedValidationStatus>();
  
  // Filter leads that need validation (non-AI-enabled only)
  const leadsNeedingValidation = leads.filter(lead => !lead.ai_opt_in);
  
  if (leadsNeedingValidation.length === 0) {
    return statusMap;
  }

  console.log(`🚀 [BATCH VALIDATION] Processing ${leadsNeedingValidation.length} leads for validation`);

  try {
    // Extract all unique first names for batch processing
    const firstNames = leadsNeedingValidation
      .map(lead => lead.first_name)
      .filter(name => name && name.trim())
      .map(name => name.trim());

    // Batch fetch name validations in single query
    const nameValidationsMap = await getBatchLearnedNameValidations(firstNames);

    // Process each lead with optimized validation
    const nameThreshold = 0.6;
    const vehicleThreshold = 0.6;

    for (const lead of leadsNeedingValidation) {
      const firstName = lead.first_name || '';
      const vehicleInterest = lead.vehicle_interest || '';
      
      // Get name validation from batch results
      const nameValidation = firstName.trim() ? nameValidationsMap.get(firstName.trim()) : null;
      
      // Optimized vehicle validation (no async needed)
      const vehicleValidationResult = validateVehicleInterestOptimized(vehicleInterest);
      
      // Calculate name validation with safe fallbacks
      const hasValidName = firstName && firstName.trim().length > 2;
      const nameConfidence = nameValidation?.confidence || (hasValidName ? 0.7 : 0.3);
      
      statusMap.set(lead.id, {
        nameValidation: nameValidation ? nameValidation.confidence >= nameThreshold : hasValidName,
        vehicleValidation: vehicleValidationResult.confidence >= vehicleThreshold,
        nameConfidence,
        vehicleConfidence: vehicleValidationResult.confidence,
        hasLearningData: !!nameValidation
      });
    }

    console.log(`✅ [BATCH VALIDATION] Processed ${statusMap.size} lead validations`);
    return statusMap;

  } catch (error) {
    console.error('❌ [BATCH VALIDATION] Error in batch validation:', error);
    
    // Fallback to basic validation for all leads
    for (const lead of leadsNeedingValidation) {
      const firstName = lead.first_name || '';
      const hasValidName = firstName && firstName.trim().length > 2;
      
      statusMap.set(lead.id, {
        nameValidation: hasValidName,
        vehicleValidation: false,
        nameConfidence: hasValidName ? 0.7 : 0.3,
        vehicleConfidence: 0.3,
        hasLearningData: false
      });
    }
    
    return statusMap;
  }
};

/**
 * Get cached validation status with memoization support
 */
export const getCachedValidationStatus = (() => {
  const cache = new Map<string, { result: OptimizedValidationStatus; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  return (leadId: string, validationStatusMap: Map<string, OptimizedValidationStatus>): OptimizedValidationStatus | null => {
    // Check memory cache first
    const cached = cache.get(leadId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }

    // Get from current validation map
    const result = validationStatusMap.get(leadId);
    if (result) {
      cache.set(leadId, { result, timestamp: Date.now() });
      return result;
    }

    return null;
  };
})();