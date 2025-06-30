
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../intelligentConversationAI';
import { generateInitialOutreachMessage } from './initialOutreachService';
import { formatProperName } from '@/utils/nameFormatter';
import { assessLeadDataQuality } from '../unifiedDataQualityService';
import { responseVariationService } from '../responseVariationService';

// Generate warm, introductory initial outreach messages using UNIFIED AI with enhanced variety
export const generateWarmInitialMessage = async (
  lead: any, 
  profile: any, 
  dataQualityOverride?: any
): Promise<string | null> => {
  try {
    console.log(`🤖 [WARM INTRO] Starting diverse message generation for ${lead.first_name}`);

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
          vehicleInterest: lead.vehicle_interest,
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
        vehicleInterest: lead.vehicle_interest,
        salespersonName: profile?.first_name || 'Finn',
        dealershipName: 'Jason Pilger Chevrolet'
      });

      if (outreachResponse?.message) {
        console.log(`✅ [WARM INTRO] Generated diverse initial outreach: ${outreachResponse.message}`);
        return outreachResponse.message;
      }
    } else {
      // Use conversation AI for follow-up messages
      console.log(`🔄 [WARM INTRO] Using enhanced conversation AI for follow-up`);

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
          console.log(`✅ [WARM INTRO] Generated diverse follow-up message: ${aiResponse.message}`);
          return aiResponse.message;
        }
      }
    }

    // Enhanced fallback with variety
    console.log(`⚠️ [WARM INTRO] Using enhanced diverse fallback`);
    return generateEnhancedFallback(lead, profile);

  } catch (error) {
    console.error('❌ [WARM INTRO] Error:', error);
    return generateEnhancedFallback(lead, profile);
  }
};

// Enhanced fallback with multiple variations
const generateEnhancedFallback = (lead: any, profile?: any): string => {
  const salespersonName = profile?.first_name || 'Finn';
  const formattedName = formatProperName(lead.first_name);
  
  // Use response variation service if available
  try {
    const response = responseVariationService.generateDiverseFallback(
      formattedName || 'there', 
      lead.vehicle_interest
    );
    
    if (response && response.length > 20) {
      return response;
    }
  } catch (error) {
    console.log('Response variation service not available for fallback');
  }
  
  // Enhanced fallback templates with much more variety
  const fallbackTemplates = [
    // Professional variations
    `Hello {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. I'm here to help you find the perfect vehicle for your needs. What type of vehicle are you looking for?`,
    `Hi {name}! This is ${salespersonName} from Jason Pilger Chevrolet. I'd love to assist you in finding exactly what you need. What brings you our way today?`,
    `Good day {name}! I'm ${salespersonName} with Jason Pilger Chevrolet, ready to help make your car shopping experience great. What can I do for you?`,
    
    // Casual variations
    `Hey {name}! ${salespersonName} here from Jason Pilger Chevrolet. What can I help you with today?`,
    `Hi there {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. Ready to help you find your perfect ride!`,
    `Hello {name}! ${salespersonName} from Jason Pilger Chevrolet here. What's on your mind for your next vehicle?`,
    
    // Enthusiastic variations
    `Hi {name}! I'm ${salespersonName} with Jason Pilger Chevrolet and I'm excited to help you find an amazing vehicle! What are you looking for?`,
    `Hello {name}! ${salespersonName} here from Jason Pilger Chevrolet. I love helping people find their dream cars - what's yours going to be?`,
    `Hey {name}! This is ${salespersonName} with Jason Pilger Chevrolet. Let's find you something fantastic! What interests you?`,
    
    // Question-focused variations
    `Hi {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. What questions can I answer for you today?`,
    `Hello {name}! ${salespersonName} from Jason Pilger Chevrolet here. What would be most helpful for me to share with you?`,
    `Hey {name}! This is ${salespersonName} with Jason Pilger Chevrolet. What information can I provide to help you out?`,
    
    // Service-focused variations
    `Hello {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. I'm here to make your car shopping as easy as possible. How can I help?`,
    `Hi {name}! ${salespersonName} from Jason Pilger Chevrolet, ready to provide you with excellent service. What do you need to know?`,
    `Good to connect {name}! I'm ${salespersonName} with Jason Pilger Chevrolet. Let me know how I can assist you today.`
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
