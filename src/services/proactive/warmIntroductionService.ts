
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { generateInitialOutreachMessage } from './initialOutreachService';
import { formatProperName } from '@/utils/nameFormatter';
import { assessLeadDataQuality } from '../unifiedDataQualityService';
import { responseVariationService } from '../responseVariationService';

// Vehicle Interest Validation
const INVALID_PATTERNS = [
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
  /^\s*-+\s*$/,
  /^\s*\.+\s*$/,
];

const FALLBACK_MESSAGE = "I see you're still exploring options—happy to help you find the right fit!";

const validateVehicleInterest = (vehicleInterest: string | null | undefined) => {
  if (!vehicleInterest || typeof vehicleInterest !== 'string') {
    return { isValid: false, message: FALLBACK_MESSAGE };
  }

  const trimmed = vehicleInterest.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: FALLBACK_MESSAGE };
  }

  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, message: FALLBACK_MESSAGE };
    }
  }

  return { isValid: true, message: trimmed };
};

// Generate warm, introductory initial outreach messages using UNIFIED AI with enhanced variety
export const generateWarmInitialMessage = async (
  lead: any, 
  profile: any, 
  dataQualityOverride?: any
): Promise<string | null> => {
  try {
    console.log(`🤖 [WARM INTRO] Starting diverse message generation for ${lead.first_name}`);

    // Validate vehicle interest early
    const vehicleValidation = validateVehicleInterest(lead.vehicle_interest);
    console.log(`🔍 [WARM INTRO] Vehicle validation:`, {
      isValid: vehicleValidation.isValid,
      originalValue: lead.vehicle_interest
    });

    // Check if this lead has any existing conversations
    const { data: existingMessages } = await supabase
      .from('conversations')
      .select('id, direction, body, sent_at')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: false })
      .limit(5);

    const isInitialContact = !existingMessages || existingMessages.length === 0;

    console.log(`🔍 [WARM INTRO] Is initial contact: ${isInitialContact}`);

    if (isInitialContact) {
      // Try response variation service first for maximum diversity
      try {
        const formattedName = formatProperName(lead.first_name);
        const response = responseVariationService.generateContextualResponse({
          leadId: lead.id,
          leadName: formattedName,
          vehicleInterest: vehicleValidation.isValid ? vehicleValidation.message : null,
          timeOfDay: getTimeOfDay(),
          conversationStage: 'initial'
        });
        
        if (response && response.length > 20) {
          console.log(`✅ [WARM INTRO] Using response variation service: ${response}`);
          return response;
        }
      } catch (error) {
        console.log('Response variation service not available, continuing');
      }

      // Use dedicated initial outreach service for first-time contact
      console.log(`🚀 [WARM INTRO] Using enhanced initial outreach service`);
      
      const outreachResponse = await generateInitialOutreachMessage({
        leadId: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        vehicleInterest: vehicleValidation.isValid ? vehicleValidation.message : null,
        salespersonName: profile?.first_name || 'Finn',
        dealershipName: 'Jason Pilger Chevrolet'
      });

      if (outreachResponse?.message) {
        console.log(`✅ [WARM INTRO] Generated diverse initial outreach: ${outreachResponse.message}`);
        return outreachResponse.message;
      }
    } else {
      // Use unified AI for follow-up messages
      console.log(`🔄 [WARM INTRO] Using unified AI for follow-up`);

      const dataQuality = dataQualityOverride || await assessLeadDataQuality(lead.first_name, lead.vehicle_interest);
      
      if (dataQuality.overallQualityScore > 0.7) {
        const formattedName = formatProperName(lead.first_name);
        
        const messageContext: MessageContext = {
          leadId: lead.id,
          leadName: formattedName,
          latestMessage: existingMessages[0]?.body || '',
          conversationHistory: existingMessages.map(msg => msg.body),
          vehicleInterest: lead.vehicle_interest || ''
        };
        
        const aiResponse = unifiedAIResponseEngine.generateResponse(messageContext);
        
        if (aiResponse?.message) {
          console.log(`✅ [WARM INTRO] Generated diverse follow-up message: ${aiResponse.message}`);
          return aiResponse.message;
        }
      }
    }

    // Enhanced fallback with variety
    console.log(`⚠️ [WARM INTRO] Using enhanced diverse fallback`);
    return generateEnhancedFallback(lead, profile, vehicleValidation);

  } catch (error) {
    console.error('❌ [WARM INTRO] Error:', error);
    return generateEnhancedFallback(lead, profile, validateVehicleInterest(lead.vehicle_interest));
  }
};

// Enhanced fallback with multiple variations
const generateEnhancedFallback = (lead: any, profile?: any, vehicleValidation?: any): string => {
  const salespersonName = profile?.first_name || 'Finn';
  const formattedName = formatProperName(lead.first_name);
  
  // Use response variation service if available
  try {
    const response = responseVariationService.generateDiverseFallback(
      formattedName || 'there', 
      vehicleValidation?.isValid ? vehicleValidation.message : null
    );
    
    if (response && response.length > 20) {
      return response;
    }
  } catch (error) {
    console.log('Response variation service not available for fallback');
  }
  
  // Enhanced fallback templates with vehicle interest validation
  const fallbackTemplates = vehicleValidation?.isValid ? [
    // Valid vehicle interest templates
    `Hello {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. I see you're interested in ${vehicleValidation.message}. How can I help you find the perfect fit?`,
    `Hi {name}! This is ${salespersonName} from Jason Pilger Chevrolet. I'd love to assist you with ${vehicleValidation.message}. What questions can I answer?`,
    `Good day {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. Regarding ${vehicleValidation.message}, what would be most helpful to know?`
  ] : [
    // Fallback message templates
    `Hello {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. ${FALLBACK_MESSAGE} What can I do for you?`,
    `Hi {name}! This is ${salespersonName} from Jason Pilger Chevrolet. ${FALLBACK_MESSAGE} Any questions I can answer?`,
    `Good day {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. ${FALLBACK_MESSAGE} How can I assist you today?`
  ];

  // Use personal name if it looks legitimate, otherwise use generic greeting
  const isValidName = formattedName && 
    formattedName.length > 1 && 
    formattedName.length < 20 &&
    !/^(unknown|test|sample|demo|null|undefined)$/i.test(formattedName) &&
    !/\d/.test(formattedName);

  // Select random template
  const template = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];
  
  // Replace name placeholder
  const nameToUse = isValidName ? formattedName : 'there';
  return template.replace('{name}', nameToUse);
};

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};
