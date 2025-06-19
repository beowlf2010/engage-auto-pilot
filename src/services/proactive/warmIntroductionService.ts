
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../enhancedIntelligentConversationAI';

// Generate warm, introductory initial outreach messages using UNIFIED AI
export const generateWarmInitialMessage = async (lead: any, profile: any): Promise<string | null> => {
  try {
    console.log(`🤖 [UNIFIED WARM INTRO] Generating warm AI introduction for ${lead.first_name}`);
    console.log(`👤 [UNIFIED WARM INTRO] Using profile:`, {
      profileFirstName: profile?.first_name,
      hasProfile: !!profile
    });
    
    // Use the unified AI service for warm initial contact
    const context = {
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name}`,
      vehicleInterest: lead.vehicle_interest || '',
      messages: [], // No previous messages for initial contact
      leadInfo: {
        phone: '',
        status: 'new',
        lastReplyAt: new Date().toISOString()
      },
      isInitialContact: true, // Flag for warm introduction
      salespersonName: profile?.first_name || 'Finn',
      dealershipName: 'our dealership'
    };

    console.log(`🔄 [UNIFIED WARM INTRO] Calling unified AI with context:`, {
      leadName: context.leadName,
      vehicleInterest: context.vehicleInterest,
      isInitialContact: context.isInitialContact,
      salespersonName: context.salespersonName
    });

    const aiResponse = await generateEnhancedIntelligentResponse(context);
    
    if (aiResponse?.message) {
      console.log(`✅ [UNIFIED WARM INTRO] Unified AI generated warm introduction: ${aiResponse.message}`);
      return aiResponse.message;
    }

    // Improved fallback templates that are warm and conversational
    console.log('⚠️ [UNIFIED WARM INTRO] Unified AI failed, using warm fallback templates');
    const warmTemplates = [
      `Hi ${lead.first_name}! I'm ${profile?.first_name || 'Finn'} from the dealership. I noticed you were interested in ${lead.vehicle_interest || 'finding the right vehicle'}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at vehicles today?`,
      
      `Hello ${lead.first_name}! Thanks for your interest in ${lead.vehicle_interest || 'our vehicles'}. I'm ${profile?.first_name || 'Finn'} to help you find exactly what you're looking for. I know car shopping can feel overwhelming, so I'm here to make it as easy as possible. What's most important to you in your next vehicle?`,
      
      `Hi ${lead.first_name}! I hope you're having a great day. I'm ${profile?.first_name || 'Finn'} and I saw you were looking at ${lead.vehicle_interest || 'vehicles'}. I'd love to learn more about what you're hoping to find and see how I can help. Are you replacing a current vehicle or adding to the family fleet?`,
      
      `Hello ${lead.first_name}! I'm ${profile?.first_name || 'Finn'} because I noticed your interest in ${lead.vehicle_interest || 'our inventory'}. I really enjoy helping people find the perfect vehicle for their needs. What's prompting your search for a new ride?`
    ];

    const selectedTemplate = warmTemplates[Math.floor(Math.random() * warmTemplates.length)];
    console.log(`📝 [UNIFIED WARM INTRO] Using fallback template: ${selectedTemplate}`);
    return selectedTemplate;
  } catch (error) {
    console.error('❌ [UNIFIED WARM INTRO] Error generating warm AI introduction:', error);
    return null;
  }
};
