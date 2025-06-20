/**
 * Unified Data Quality Service
 * Combines name validation and vehicle interest validation
 */

import { validatePersonalName, NameValidationResult } from './nameValidationService';
import { validateVehicleInterest, VehicleInterestValidationResult } from './vehicleInterestValidationService';

export interface UnifiedDataQualityResult {
  nameValidation: NameValidationResult;
  vehicleValidation: VehicleInterestValidationResult;
  overallQualityScore: number;
  messageStrategy: 'personal_with_vehicle' | 'personal_generic_vehicle' | 'generic_with_vehicle' | 'fully_generic';
  recommendations: {
    usePersonalGreeting: boolean;
    useSpecificVehicle: boolean;
    fallbackGreeting: string;
    fallbackVehicleMessage: string;
  };
}

export const assessLeadDataQuality = async (
  firstName: string, 
  vehicleInterest: string
): Promise<UnifiedDataQualityResult> => {
  console.log('🔍 [UNIFIED DATA QUALITY] Assessing lead data quality');
  console.log('🔍 [UNIFIED DATA QUALITY] First name:', firstName);
  console.log('🔍 [UNIFIED DATA QUALITY] Vehicle interest:', vehicleInterest);

  const nameValidation = await validatePersonalName(firstName);
  const vehicleValidation = validateVehicleInterest(vehicleInterest);
  
  console.log('📊 [UNIFIED DATA QUALITY] Name validation:', {
    isValid: nameValidation.isValidPersonalName,
    confidence: nameValidation.confidence,
    type: nameValidation.detectedType
  });
  
  console.log('📊 [UNIFIED DATA QUALITY] Vehicle validation:', {
    isValid: vehicleValidation.isValidVehicleInterest,
    confidence: vehicleValidation.confidence,
    issue: vehicleValidation.detectedIssue
  });

  // Calculate overall quality score (weighted average)
  const nameWeight = 0.6;
  const vehicleWeight = 0.4;
  const overallQualityScore = (nameValidation.confidence * nameWeight) + (vehicleValidation.confidence * vehicleWeight);

  // Determine message strategy based on validation results
  let messageStrategy: UnifiedDataQualityResult['messageStrategy'];
  // Lowered threshold from 0.7 to 0.6 for personal greetings
  const usePersonalGreeting = nameValidation.isValidPersonalName && nameValidation.confidence > 0.6;
  const useSpecificVehicle = vehicleValidation.isValidVehicleInterest && vehicleValidation.confidence > 0.5;

  if (usePersonalGreeting && useSpecificVehicle) {
    messageStrategy = 'personal_with_vehicle';
  } else if (usePersonalGreeting && !useSpecificVehicle) {
    messageStrategy = 'personal_generic_vehicle';
  } else if (!usePersonalGreeting && useSpecificVehicle) {
    messageStrategy = 'generic_with_vehicle';
  } else {
    messageStrategy = 'fully_generic';
  }

  console.log('🎯 [UNIFIED DATA QUALITY] Strategy:', messageStrategy);
  console.log('🎯 [UNIFIED DATA QUALITY] Use personal greeting:', usePersonalGreeting, '(confidence:', nameValidation.confidence, ')');

  // Generate recommendations
  const recommendations = {
    usePersonalGreeting,
    useSpecificVehicle,
    fallbackGreeting: nameValidation.suggestions.contextualGreeting || 'Hello! Thanks for your interest.',
    fallbackVehicleMessage: vehicleValidation.suggestions.fallbackMessage || 'finding the right vehicle'
  };

  return {
    nameValidation,
    vehicleValidation,
    overallQualityScore,
    messageStrategy,
    recommendations
  };
};

export const generateDataQualityAwareGreeting = (
  firstName: string,
  vehicleInterest: string,
  salespersonName: string = 'Finn',
  dealershipName: string = 'Jason Pilger Chevrolet',
  dataQuality?: UnifiedDataQualityResult
): string => {
  // Use provided data quality or assess it
  const quality = dataQuality || assessLeadDataQuality(firstName, vehicleInterest);
  const { messageStrategy, recommendations } = quality;

  console.log('💬 [UNIFIED DATA QUALITY] Generating greeting with strategy:', messageStrategy);
  console.log('💬 [UNIFIED DATA QUALITY] Using personal greeting:', recommendations.usePersonalGreeting);

  switch (messageStrategy) {
    case 'personal_with_vehicle':
      return `Hi ${firstName}! I'm ${salespersonName} with ${dealershipName}. I noticed you were interested in ${vehicleInterest}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at this vehicle?`;

    case 'personal_generic_vehicle':
      return `Hi ${firstName}! I'm ${salespersonName} with ${dealershipName}. I'd love to help you find exactly what you're looking for in your next vehicle. What's most important to you in your search?`;

    case 'generic_with_vehicle':
      return `Hello! Thanks for your interest in ${vehicleInterest}. I'm ${salespersonName} with ${dealershipName} and I'd love to help you explore your options. What questions can I answer for you?`;

    case 'fully_generic':
    default:
      return `Hello! Thanks for your interest in ${recommendations.fallbackVehicleMessage}. I'm ${salespersonName} with ${dealershipName} and I'm here to help make your car shopping experience as smooth as possible. What type of vehicle are you looking for?`;
  }
};
