
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../intelligentConversationAI';
import { formatProperName } from '@/utils/nameFormatter';
import { validatePersonalName, detectLeadSource } from '../nameValidationService';
import { assessLeadDataQuality, generateDataQualityAwareGreeting } from '../unifiedDataQualityService';

// Generate warm, introductory initial outreach messages using UNIFIED AI
export const generateWarmInitialMessage = async (
  lead: any, 
  profile: any, 
  dataQualityOverride?: any
): Promise<string | null> => {
  try {
    console.log(`🤖 [WARM INTRO] Starting message generation for ${lead.first_name}`);

    const dataQuality = dataQualityOverride || await assessLeadDataQuality(lead.first_name, lead.vehicle_interest);
    
    console.log(`🧠 [WARM INTRO] Data quality score: ${dataQuality.overallQualityScore}`);

    // For high-quality data, use AI generation
    if (dataQuality.overallQualityScore > 0.7 && dataQuality.messageStrategy === 'personal_with_vehicle') {
      console.log(`🔄 [WARM INTRO] Using AI generation for high-quality data`);
      
      const formattedName = formatProperName(lead.first_name);
      
      const context = {
        leadId: lead.id,
        leadName: formattedName,
        vehicleInterest: lead.vehicle_interest,
        messages: [],
        leadInfo: {
          phone: '',
          status: 'new',
          lastReplyAt: new Date().toISOString()
        }
      };
      
      try {
        const aiResponse = await generateEnhancedIntelligentResponse(context);
        
        if (aiResponse?.message) {
          console.log(`✅ [WARM INTRO] AI generated message: ${aiResponse.message}`);
          return aiResponse.message;
        }
      } catch (aiError) {
        console.warn(`⚠️ [WARM INTRO] AI generation failed, falling back to template`);
      }
    }

    // Use data-quality-aware template generation
    console.log(`📝 [WARM INTRO] Using template generation`);
    
    const smartMessage = await generateDataQualityAwareGreeting(
      lead.first_name,
      lead.vehicle_interest,
      'Finn',
      'Jason Pilger Chevrolet',
      dataQuality
    );
    
    console.log(`✅ [WARM INTRO] Generated template message: ${smartMessage}`);
    return smartMessage;

  } catch (error) {
    console.error('❌ [WARM INTRO] Error:', error);
    return generateEmergencyFallback(lead);
  }
};

const generateEmergencyFallback = (lead: any): string => {
  return `Hello! Thanks for your interest in finding the right vehicle. I'm Finn with Jason Pilger Chevrolet and I'm here to make your car shopping experience as smooth as possible. What type of vehicle are you looking for?`;
};
