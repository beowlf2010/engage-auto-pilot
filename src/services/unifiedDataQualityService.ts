
import { validatePersonalName, type NameValidationResult } from './nameValidationService';
import { validateVehicleInterestWithConfidence, type VehicleValidationResult } from './vehicleInterestValidationService';

export interface DataQualityAssessment {
  overallQualityScore: number;
  nameValidation: NameValidationResult;
  vehicleValidation: VehicleValidationResult;
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
    
    // Validate vehicle interest using enhanced validation
    const vehicleValidation = validateVehicleInterestWithConfidence(vehicleInterest);
    
    // Calculate overall quality score
    const nameScore = nameValidation.confidence;
    const vehicleScore = vehicleValidation.confidence;
    const overallQualityScore = (nameScore + vehicleScore) / 2;
    
    // Determine message strategy
    const usePersonalGreeting = nameValidation.isValidPersonalName && nameScore > 0.7;
    const useSpecificVehicle = vehicleValidation.isValidVehicleInterest && vehicleScore > 0.6;
    
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
        isValidVehicleInterest: false,
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

