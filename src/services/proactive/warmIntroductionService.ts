
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../enhancedIntelligentConversationAI';
import { formatProperName } from '@/utils/nameFormatter';
import { validatePersonalName, detectLeadSource } from '../nameValidationService';
import { assessLeadDataQuality, generateDataQualityAwareGreeting } from '../unifiedDataQualityService';

// Generate warm, introductory initial outreach messages using UNIFIED AI with comprehensive data quality validation
export const generateWarmInitialMessage = async (
  lead: any, 
  profile: any, 
  dataQualityOverride?: any
): Promise<string | null> => {
  try {
    console.log(`🤖 [ENHANCED WARM INTRO] === STARTING COMPREHENSIVE DATA QUALITY VALIDATION ===`);
    console.log(`🤖 [ENHANCED WARM INTRO] Lead data:`, {
      firstName: lead.first_name,
      lastName: lead.last_name,
      vehicleInterest: lead.vehicle_interest || 'Not specified'
    });

    // Use provided data quality override or perform comprehensive assessment
    const dataQuality = dataQualityOverride || assessLeadDataQuality(lead.first_name, lead.vehicle_interest);
    
    console.log(`🧠 [ENHANCED WARM INTRO] Data quality assessment (override: ${!!dataQualityOverride}):`, {
      overallScore: dataQuality.overallQualityScore,
      messageStrategy: dataQuality.messageStrategy,
      nameValid: dataQuality.nameValidation.isValidPersonalName,
      vehicleValid: dataQuality.vehicleValidation.isValidVehicleInterest,
      usePersonalGreeting: dataQuality.recommendations.usePersonalGreeting,
      useSpecificVehicle: dataQuality.recommendations.useSpecificVehicle
    });

    // For high-quality data, use AI generation; for poor quality data, use smart templates
    if (dataQuality.overallQualityScore > 0.7 && dataQuality.messageStrategy === 'personal_with_vehicle') {
      console.log(`🔄 [ENHANCED WARM INTRO] High data quality detected - using AI generation`);
      
      // Legacy validation for AI context
      const nameValidation = validatePersonalName(lead.first_name);
      const leadSource = detectLeadSource(lead);
      
      const formattedName = formatProperName(lead.first_name);
      
      // Prepare context for unified AI with enhanced data quality information
      const context = {
        leadId: lead.id,
        leadName: formattedName,
        vehicleInterest: lead.vehicle_interest,
        messages: [],
        leadInfo: {
          phone: '',
          status: 'new',
          lastReplyAt: new Date().toISOString(),
          dataQuality: {
            nameValidation: dataQuality.nameValidation,
            vehicleValidation: dataQuality.vehicleValidation,
            overallQuality: dataQuality,
            leadSource: leadSource,
            usePersonalGreeting: dataQuality.recommendations.usePersonalGreeting,
            useSpecificVehicle: dataQuality.recommendations.useSpecificVehicle
          }
        },
        isInitialContact: true,
        salespersonName: 'Finn',
        dealershipName: 'Jason Pilger Chevrolet'
      };

      console.log(`🔄 [ENHANCED WARM INTRO] AI context prepared with data quality insights`);
      
      try {
        const aiResponse = await generateEnhancedIntelligentResponse(context);
        
        if (aiResponse?.message) {
          console.log(`✅ [ENHANCED WARM INTRO] AI generated high-quality message: ${aiResponse.message}`);
          return aiResponse.message;
        }
      } catch (aiError) {
        console.warn(`⚠️ [ENHANCED WARM INTRO] AI generation failed, falling back to template`);
      }
    }

    // Use data-quality-aware template generation with override support
    console.log(`📝 [ENHANCED WARM INTRO] Using data-quality-aware template generation`);
    
    const smartMessage = generateDataQualityAwareGreeting(
      lead.first_name,
      lead.vehicle_interest,
      'Finn',
      'Jason Pilger Chevrolet',
      dataQuality
    );
    
    console.log(`✅ [ENHANCED WARM INTRO] Generated data-quality-aware message: ${smartMessage}`);
    return smartMessage;

  } catch (error) {
    console.error('❌ [ENHANCED WARM INTRO] Critical error:', error);
    return generateEmergencyFallback(lead);
  }
};

const generateSmartFallbackTemplate = (lead: any, nameValidation: any, leadSource: string): string => {
  const vehicleInterest = lead.vehicle_interest;
  const hasVehicleInterest = vehicleInterest && vehicleInterest !== 'Not specified';
  
  // Use validation-suggested greeting if available
  if (nameValidation.suggestions.contextualGreeting) {
    let message = nameValidation.suggestions.contextualGreeting;
    
    // Add dealership context
    message += ` I'm Finn with Jason Pilger Chevrolet, and I'd love to help you find exactly what you're looking for.`;
    
    // Add appropriate question based on context
    if (leadSource === 'phone_call') {
      message += ` What brought you to call us today?`;
    } else if (hasVehicleInterest) {
      message += ` What's most important to you in your next vehicle?`;
    } else {
      message += ` What type of vehicle are you looking for?`;
    }
    
    return message;
  }
  
  // Default smart templates based on detected type
  switch (nameValidation.detectedType) {
    case 'city':
    case 'state':
      return `Hello! Thanks for calling from the ${formatProperName(lead.first_name)} area. I'm Finn with Jason Pilger Chevrolet and I'd love to help you find the perfect vehicle. What brought you to call us today?`;
      
    case 'business':
      return `Hello! Thanks for your business inquiry. I'm Finn with Jason Pilger Chevrolet and I'd be happy to help with your vehicle needs. What type of vehicles are you looking for?`;
      
    case 'phone':
      return `Hello! Thanks for calling Jason Pilger Chevrolet. I'm Finn and I'd love to help you find the right vehicle. What can I help you with today?`;
      
    default:
      if (hasVehicleInterest) {
        return `Hello! Thanks for your interest in the ${vehicleInterest}. I'm Finn with Jason Pilger Chevrolet and I'd love to help you explore your options. What's most important to you in your next vehicle?`;
      } else {
        return `Hello! Thanks for your interest in finding the right vehicle. I'm Finn with Jason Pilger Chevrolet and I'm here to help make your car shopping experience as easy as possible. What type of vehicle are you looking for?`;
      }
  }
};

const generatePersonalFallbackTemplate = (formattedName: string, vehicleInterest: string): string => {
  const hasVehicleInterest = vehicleInterest && vehicleInterest !== 'Not specified';
  
  const personalTemplates = [
    hasVehicleInterest 
      ? `Hi ${formattedName}! I'm Finn with Jason Pilger Chevrolet. I noticed you were interested in ${vehicleInterest}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at this vehicle?`
      : `Hi ${formattedName}! I'm Finn with Jason Pilger Chevrolet. I'd love to help you find exactly what you're looking for. What's most important to you in your next vehicle?`,
      
    hasVehicleInterest
      ? `Hello ${formattedName}! Thanks for your interest in ${vehicleInterest}. I'm Finn with Jason Pilger Chevrolet and I'm here to help you find the perfect fit. What questions can I answer for you?`
      : `Hello ${formattedName}! I'm Finn with Jason Pilger Chevrolet and I really enjoy helping people find the perfect vehicle for their needs. What's prompting your search for a new ride?`
  ];

  return personalTemplates[Math.floor(Math.random() * personalTemplates.length)];
};

const generateEmergencyFallback = (lead: any): string => {
  return `Hello! Thanks for your interest in finding the right vehicle. I'm Finn with Jason Pilger Chevrolet and I'm here to make your car shopping experience as smooth as possible. What type of vehicle are you looking for?`;
};
