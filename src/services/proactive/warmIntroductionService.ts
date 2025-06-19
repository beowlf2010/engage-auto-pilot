
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from '../enhancedIntelligentConversationAI';

// Generate warm, introductory initial outreach messages using UNIFIED AI
export const generateWarmInitialMessage = async (lead: any, profile: any): Promise<string | null> => {
  try {
    console.log(`🤖 [UNIFIED WARM INTRO] === DEBUGGING CORRY BAGGETT - GENERATING WARM AI MESSAGE ===`);
    console.log(`🤖 [UNIFIED WARM INTRO] Lead name: ${lead.first_name} ${lead.last_name}`);
    console.log(`🤖 [UNIFIED WARM INTRO] Vehicle interest: ${lead.vehicle_interest || 'Not specified'}`);
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
      salespersonName: 'Finn', // Always use Finn
      dealershipName: 'Jason Pilger Chevrolet' // Always use correct dealership
    };

    console.log(`🔄 [UNIFIED WARM INTRO] === CALLING UNIFIED AI ===`);
    console.log(`🔄 [UNIFIED WARM INTRO] Context for AI:`, {
      leadName: context.leadName,
      vehicleInterest: context.vehicleInterest,
      isInitialContact: context.isInitialContact,
      salespersonName: context.salespersonName,
      dealershipName: context.dealershipName
    });

    const aiResponse = await generateEnhancedIntelligentResponse(context);
    
    console.log(`📬 [UNIFIED WARM INTRO] AI response received:`, {
      hasResponse: !!aiResponse,
      hasMessage: !!aiResponse?.message,
      messageLength: aiResponse?.message?.length || 0,
      messagePreview: aiResponse?.message?.substring(0, 50) || 'NO MESSAGE'
    });
    
    if (aiResponse?.message) {
      console.log(`✅ [UNIFIED WARM INTRO] === SUCCESS! Unified AI generated message ===`);
      console.log(`✅ [UNIFIED WARM INTRO] Message: ${aiResponse.message}`);
      return aiResponse.message;
    }

    // Improved fallback templates that are warm and conversational
    console.log('⚠️ [UNIFIED WARM INTRO] === AI FAILED - USING FALLBACK TEMPLATES ===');
    const warmTemplates = [
      `Hi ${lead.first_name}! I'm Finn with Jason Pilger Chevrolet. I noticed you were interested in ${lead.vehicle_interest || 'finding the right vehicle'}. I'd love to help you explore your options and answer any questions you might have. What brought you to look at vehicles today?`,
      
      `Hello ${lead.first_name}! Thanks for your interest in ${lead.vehicle_interest || 'our vehicles'}. I'm Finn with Jason Pilger Chevrolet and I'm here to help you find exactly what you're looking for. I know car shopping can feel overwhelming, so I'm here to make it as easy as possible. What's most important to you in your next vehicle?`,
      
      `Hi ${lead.first_name}! I hope you're having a great day. I'm Finn with Jason Pilger Chevrolet and I saw you were looking at ${lead.vehicle_interest || 'vehicles'}. I'd love to learn more about what you're hoping to find and see how I can help. Are you replacing a current vehicle or adding to the family fleet?`,
      
      `Hello ${lead.first_name}! I'm Finn with Jason Pilger Chevrolet and I noticed your interest in ${lead.vehicle_interest || 'our inventory'}. I really enjoy helping people find the perfect vehicle for their needs. What's prompting your search for a new ride?`
    ];

    const selectedTemplate = warmTemplates[Math.floor(Math.random() * warmTemplates.length)];
    console.log(`📝 [UNIFIED WARM INTRO] === FALLBACK TEMPLATE SELECTED ===`);
    console.log(`📝 [UNIFIED WARM INTRO] Template: ${selectedTemplate}`);
    return selectedTemplate;
  } catch (error) {
    console.error('❌ [UNIFIED WARM INTRO] === CRITICAL ERROR ===');
    console.error('❌ [UNIFIED WARM INTRO] Error generating warm AI introduction:', error);
    console.error('❌ [UNIFIED WARM INTRO] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
};
