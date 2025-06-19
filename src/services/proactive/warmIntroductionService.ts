
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../enhancedIntelligentConversationAI';

// Generate warm, introductory initial outreach messages using ENHANCED AI
export const generateWarmInitialMessage = async (lead: any, profile: any): Promise<string | null> => {
  try {
    console.log(`🤖 Generating warm AI introduction for ${lead.first_name}`);
    
    // Use the enhanced AI service for warm initial contact with introduction context
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
      salespersonName: profile?.first_name || 'Your sales representative',
      dealershipName: 'our dealership'
    };

    const aiResponse = await generateEnhancedIntelligentResponse(context);
    
    if (aiResponse?.message) {
      console.log(`✅ Enhanced AI generated warm introduction: ${aiResponse.message}`);
      return aiResponse.message;
    }

    // Improved fallback templates that are warm and conversational
    console.log('⚠️ Enhanced AI failed, using warm fallback templates');
    const warmTemplates = [
      `Hi ${lead.first_name}! I'm ${profile?.first_name || 'your sales representative'} from the dealership. I noticed you were interested in ${lead.vehicle_interest || 'finding the right vehicle'}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at vehicles today?`,
      
      `Hello ${lead.first_name}! Thanks for your interest in ${lead.vehicle_interest || 'our vehicles'}. I'm ${profile?.first_name || 'here'} to help you find exactly what you're looking for. I know car shopping can feel overwhelming, so I'm here to make it as easy as possible. What's most important to you in your next vehicle?`,
      
      `Hi ${lead.first_name}! I hope you're having a great day. I'm ${profile?.first_name || 'your sales representative'} and I saw you were looking at ${lead.vehicle_interest || 'vehicles'}. I'd love to learn more about what you're hoping to find and see how I can help. Are you replacing a current vehicle or adding to the family fleet?`,
      
      `Hello ${lead.first_name}! I'm ${profile?.first_name || 'reaching out'} because I noticed your interest in ${lead.vehicle_interest || 'our inventory'}. I really enjoy helping people find the perfect vehicle for their needs. What's prompting your search for a new ride?`
    ];

    return warmTemplates[Math.floor(Math.random() * warmTemplates.length)];
  } catch (error) {
    console.error('Error generating warm AI introduction:', error);
    return null;
  }
};
