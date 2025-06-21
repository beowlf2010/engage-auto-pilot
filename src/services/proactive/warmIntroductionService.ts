
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../intelligentConversationAI';
import { generateInitialOutreachMessage } from './initialOutreachService';
import { formatProperName } from '@/utils/nameFormatter';
import { assessLeadDataQuality } from '../unifiedDataQualityService';

// Generate warm, introductory initial outreach messages using UNIFIED AI
export const generateWarmInitialMessage = async (
  lead: any, 
  profile: any, 
  dataQualityOverride?: any
): Promise<string | null> => {
  try {
    console.log(`🤖 [WARM INTRO] Starting message generation for ${lead.first_name}`);

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
      // Use dedicated initial outreach service for first-time contact
      console.log(`🚀 [WARM INTRO] Using initial outreach service`);
      
      const outreachResponse = await generateInitialOutreachMessage({
        leadId: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        vehicleInterest: lead.vehicle_interest,
        salespersonName: profile?.first_name || 'Finn',
        dealershipName: 'Jason Pilger Chevrolet'
      });

      if (outreachResponse?.message) {
        console.log(`✅ [WARM INTRO] Generated initial outreach: ${outreachResponse.message}`);
        return outreachResponse.message;
      }
    } else {
      // Use conversation AI for follow-up messages
      console.log(`🔄 [WARM INTRO] Using conversation AI for follow-up`);

      const dataQuality = dataQualityOverride || await assessLeadDataQuality(lead.first_name, lead.vehicle_interest);
      
      if (dataQuality.overallQualityScore > 0.7) {
        const formattedName = formatProperName(lead.first_name);
        
        const context = {
          leadId: lead.id,
          leadName: formattedName,
          vehicleInterest: lead.vehicle_interest,
          messages: existingMessages.map(msg => ({
            id: msg.id,
            body: msg.body,
            direction: msg.direction as 'in' | 'out',
            sentAt: msg.sent_at,
            aiGenerated: false
          })),
          leadInfo: {
            phone: '',
            status: 'active',
            lastReplyAt: existingMessages[0]?.sent_at || new Date().toISOString()
          }
        };
        
        const aiResponse = await generateEnhancedIntelligentResponse(context);
        
        if (aiResponse?.message) {
          console.log(`✅ [WARM INTRO] Generated follow-up message: ${aiResponse.message}`);
          return aiResponse.message;
        }
      }
    }

    // Emergency fallback
    console.log(`⚠️ [WARM INTRO] Using emergency fallback`);
    return generateEmergencyFallback(lead, profile);

  } catch (error) {
    console.error('❌ [WARM INTRO] Error:', error);
    return generateEmergencyFallback(lead, profile);
  }
};

const generateEmergencyFallback = (lead: any, profile?: any): string => {
  const salespersonName = profile?.first_name || 'Finn';
  const formattedName = formatProperName(lead.first_name);
  
  // Use personal name if it looks legitimate, otherwise use generic greeting
  const isValidName = formattedName && 
    formattedName.length > 1 && 
    formattedName.length < 20 &&
    !/^(unknown|test|sample|demo|null|undefined)$/i.test(formattedName) &&
    !/\d/.test(formattedName);

  if (isValidName) {
    return `Hi ${formattedName}! I'm ${salespersonName} with Jason Pilger Chevrolet. I'm here to help you find the perfect vehicle for your needs. What type of vehicle are you looking for?`;
  } else {
    return `Hello! Thanks for your interest in finding the right vehicle. I'm ${salespersonName} with Jason Pilger Chevrolet and I'm here to make your car shopping experience as smooth as possible. What type of vehicle are you looking for?`;
  }
};
