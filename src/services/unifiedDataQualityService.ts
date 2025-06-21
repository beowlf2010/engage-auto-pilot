
import { validatePersonalName, type NameValidationResult } from './nameValidationService';

export interface DataQualityAssessment {
  overallQualityScore: number;
  nameValidation: NameValidationResult;
  vehicleValidation: {
    isValid: boolean;
    confidence: number;
    detectedIssue: string;
  };
  messageStrategy: 'personal_with_vehicle' | 'personal_generic_vehicle' | 'generic_with_vehicle' | 'fully_generic';
  recommendations: {
    usePersonalGreeting: boolean;
    useSpecificVehicle: boolean;
    contextualGreeting?: string;
  };
}

export const assessLeadDataQuality = async (
  firstName: string,
  vehicleInterest?: string
): Promise<DataQualityAssessment> => {
  try {
    console.log(`🔍 [DATA QUALITY] Assessing quality for name: "${firstName}", vehicle: "${vehicleInterest}"`);

    // Validate the name
    const nameValidation = await validatePersonalName(firstName);
    
    // Validate vehicle interest
    const vehicleValidation = assessVehicleInterest(vehicleInterest);
    
    // Calculate overall quality score
    const nameScore = nameValidation.confidence;
    const vehicleScore = vehicleValidation.confidence;
    const overallQualityScore = (nameScore + vehicleScore) / 2;
    
    // Determine message strategy
    const usePersonalGreeting = nameValidation.isValidPersonalName && nameScore > 0.7;
    const useSpecificVehicle = vehicleValidation.isValid && vehicleScore > 0.6;
    
    let messageStrategy: DataQualityAssessment['messageStrategy'];
    if (usePersonalGreeting && useSpecificVehicle) {
      messageStrategy = 'personal_with_vehicle';
    } else if (usePersonalGreeting) {
      messageStrategy = 'personal_generic_vehicle';
    } else if (useSpecificVehicle) {
      messageStrategy = 'generic_with_vehicle';
    } else {
      messageStrategy = 'fully_generic';
    }
    
    console.log(`✅ [DATA QUALITY] Assessment complete:`, {
      overallScore: overallQualityScore,
      strategy: messageStrategy,
      usePersonal: usePersonalGreeting,
      useVehicle: useSpecificVehicle
    });
    
    return {
      overallQualityScore,
      nameValidation,
      vehicleValidation,
      messageStrategy,
      recommendations: {
        usePersonalGreeting,
        useSpecificVehicle,
        contextualGreeting: nameValidation.suggestions.contextualGreeting
      }
    };
    
  } catch (error) {
    console.error('❌ [DATA QUALITY] Error assessing quality:', error);
    
    // Return safe fallback assessment
    return {
      overallQualityScore: 0.5,
      nameValidation: {
        isValidPersonalName: false,
        confidence: 0.5,
        detectedType: 'unknown',
        suggestions: {
          useGenericGreeting: true,
          contextualGreeting: 'Hello! Thanks for your interest in finding the right vehicle.'
        }
      },
      vehicleValidation: {
        isValid: false,
        confidence: 0.5,
        detectedIssue: 'Generic vehicle interest'
      },
      messageStrategy: 'fully_generic',
      recommendations: {
        usePersonalGreeting: false,
        useSpecificVehicle: false,
        contextualGreeting: 'Hello! Thanks for your interest in finding the right vehicle.'
      }
    };
  }
};

const assessVehicleInterest = (vehicleInterest?: string): {
  isValid: boolean;
  confidence: number;
  detectedIssue: string;
} => {
  if (!vehicleInterest || vehicleInterest.trim() === '') {
    return {
      isValid: false,
      confidence: 0.1,
      detectedIssue: 'No vehicle interest specified'
    };
  }
  
  const cleanVehicle = vehicleInterest.trim().toLowerCase();
  
  // Check for generic phrases
  const genericPhrases = [
    'finding the right vehicle',
    'finding the right vehicle for your needs',
    'not specified',
    'unknown',
    'car',
    'truck',
    'vehicle',
    'auto'
  ];
  
  if (genericPhrases.some(phrase => cleanVehicle.includes(phrase))) {
    return {
      isValid: false,
      confidence: 0.3,
      detectedIssue: 'Generic vehicle interest phrase'
    };
  }
  
  // Check for specific vehicle information
  const hasYear = /\b(19|20)\d{2}\b/.test(cleanVehicle);
  const hasMake = /\b(chevrolet|chevy|ford|toyota|honda|nissan|hyundai|kia|bmw|mercedes|audi)\b/.test(cleanVehicle);
  const hasModel = /\b(equinox|malibu|silverado|cruze|tahoe|suburban|camaro|corvette|pacifica)\b/.test(cleanVehicle);
  
  let confidence = 0.5;
  if (hasYear) confidence += 0.2;
  if (hasMake) confidence += 0.2;
  if (hasModel) confidence += 0.3;
  
  // Cap at 0.9 to leave room for improvement
  confidence = Math.min(confidence, 0.9);
  
  if (confidence > 0.6) {
    return {
      isValid: true,
      confidence,
      detectedIssue: 'None'
    };
  }
  
  return {
    isValid: false,
    confidence,
    detectedIssue: 'Insufficient vehicle details'
  };
};
