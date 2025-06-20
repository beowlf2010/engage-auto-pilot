
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../enhancedIntelligentConversationAI';
import { formatProperName } from '@/utils/nameFormatter';
import { validatePersonalName, detectLeadSource, generateContextualGreeting } from '../nameValidationService';

// Generate warm, introductory initial outreach messages using UNIFIED AI with smart name validation
export const generateWarmInitialMessage = async (lead: any, profile: any): Promise<string | null> => {
  try {
    console.log(`🤖 [SMART WARM INTRO] === STARTING INTELLIGENT MESSAGE GENERATION ===`);
    console.log(`🤖 [SMART WARM INTRO] Lead data:`, {
      firstName: lead.first_name,
      lastName: lead.last_name,
      vehicleInterest: lead.vehicle_interest || 'Not specified'
    });

    // Validate the lead's name using smart validation
    const nameValidation = validatePersonalName(lead.first_name);
    const leadSource = detectLeadSource(lead);
    
    console.log(`🧠 [SMART WARM INTRO] Name validation result:`, {
      isValidPersonalName: nameValidation.isValidPersonalName,
      confidence: nameValidation.confidence,
      detectedType: nameValidation.detectedType,
      leadSource: leadSource
    });

    // Determine the appropriate name to use
    let formattedName = '';
    let usePersonalGreeting = false;
    
    if (nameValidation.isValidPersonalName && nameValidation.confidence > 0.7) {
      // High confidence personal name
      formattedName = formatProperName(lead.first_name);
      usePersonalGreeting = true;
      console.log(`✅ [SMART WARM INTRO] Using personal greeting with name: ${formattedName}`);
    } else {
      // Use generic greeting
      usePersonalGreeting = false;
      console.log(`🔄 [SMART WARM INTRO] Using generic greeting due to: ${nameValidation.detectedType} (confidence: ${nameValidation.confidence})`);
    }

    // Generate contextual greeting
    const contextualGreeting = generateContextualGreeting(lead, nameValidation, leadSource);
    
    // Prepare context for unified AI with enhanced data quality information
    const context = {
      leadId: lead.id,
      leadName: usePersonalGreeting ? formattedName : 'there',
      vehicleInterest: lead.vehicle_interest || '',
      messages: [], // No previous messages for initial contact
      leadInfo: {
        phone: '',
        status: 'new',
        lastReplyAt: new Date().toISOString(),
        dataQuality: {
          nameValidation: nameValidation,
          leadSource: leadSource,
          usePersonalGreeting: usePersonalGreeting
        }
      },
      isInitialContact: true,
      salespersonName: 'Finn',
      dealershipName: 'Jason Pilger Chevrolet',
      contextualGreeting: contextualGreeting
    };

    console.log(`🔄 [SMART WARM INTRO] Context prepared:`, {
      usePersonalGreeting: usePersonalGreeting,
      leadName: context.leadName,
      detectedType: nameValidation.detectedType,
      contextualGreeting: contextualGreeting
    });

    // If we have low confidence or detected non-personal data, use fallback logic
    if (nameValidation.suggestions.useGenericGreeting || !usePersonalGreeting) {
      console.log(`📝 [SMART WARM INTRO] Using smart fallback template`);
      
      const smartTemplate = generateSmartFallbackTemplate(lead, nameValidation, leadSource);
      console.log(`✅ [SMART WARM INTRO] Smart fallback generated: ${smartTemplate}`);
      return smartTemplate;
    }

    // For high-confidence personal names, use the unified AI
    console.log(`🔄 [SMART WARM INTRO] Using unified AI for personal greeting`);
    const aiResponse = await generateEnhancedIntelligentResponse(context);
    
    if (aiResponse?.message) {
      console.log(`✅ [SMART WARM INTRO] Unified AI generated: ${aiResponse.message}`);
      return aiResponse.message;
    }

    // Final fallback with personal name if AI fails
    console.log(`⚠️ [SMART WARM INTRO] AI failed, using personal fallback template`);
    const personalFallback = generatePersonalFallbackTemplate(formattedName, lead.vehicle_interest);
    console.log(`✅ [SMART WARM INTRO] Personal fallback: ${personalFallback}`);
    return personalFallback;

  } catch (error) {
    console.error('❌ [SMART WARM INTRO] Critical error:', error);
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
  const vehicleInterest = lead.vehicle_interest;
  const hasVehicleInterest = vehicleInterest && vehicleInterest !== 'Not specified';
  
  if (hasVehicleInterest) {
    return `Hello! Thanks for your interest in the ${vehicleInterest}. I'm Finn with Jason Pilger Chevrolet and I'd love to help you find exactly what you're looking for. What questions can I answer for you?`;
  } else {
    return `Hello! Thanks for your interest in finding the right vehicle. I'm Finn with Jason Pilger Chevrolet and I'm here to make your car shopping experience as smooth as possible. What type of vehicle are you looking for?`;
  }
};
