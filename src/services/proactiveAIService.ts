
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from './enhancedIntelligentConversationAI';
import { sendMessage } from './messagesService';
import { toast } from '@/hooks/use-toast';
import { addAIConversationNote } from './vehicleMention/aiConversationNotes';
import { processAITakeovers } from './aiTakeoverService';

export interface ProactiveMessageResult {
  success: boolean;
  leadId: string;
  message?: string;
  error?: string;
}

// Send immediate first message when AI is enabled - NOW USES ENHANCED AI WITH WARM INTRODUCTION
export const sendInitialMessage = async (leadId: string, profile: any): Promise<ProactiveMessageResult> => {
  try {
    console.log(`🚀 Sending warm initial proactive message to lead ${leadId} using ENHANCED AI`);

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, leadId, error: 'Lead not found' };
    }

    if (!lead.ai_opt_in) {
      return { success: false, leadId, error: 'AI not enabled for lead' };
    }

    // Check if we've already sent a message
    const { data: existingMessages } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(1);

    if (existingMessages && existingMessages.length > 0) {
      return { success: false, leadId, error: 'Already contacted this lead' };
    }

    // Generate warm initial message using ENHANCED AI with introduction context
    const message = await generateWarmInitialMessage(lead, profile);
    if (!message) {
      return { success: false, leadId, error: 'Failed to generate message' };
    }

    // Send the message
    try {
      await sendMessage(leadId, message, profile, true);
      
      // Get the most recent conversation for this lead to get the message ID
      const { data: recentMessage } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('direction', 'out')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const messageId = recentMessage?.id || null;

      // Add AI conversation note about initial contact
      await addAIConversationNote(
        leadId,
        messageId,
        'inventory_discussion',
        `Enhanced AI warm introduction: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        []
      );
    } catch (error) {
      console.error('Error sending message or adding note:', error);
      return { success: false, leadId, error: 'Failed to send message' };
    }

    // Update lead status
    await supabase
      .from('leads')
      .update({
        ai_messages_sent: 1,
        ai_stage: 'initial_contact_sent',
        next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', leadId);

    console.log(`✅ Enhanced AI warm introduction sent to ${lead.first_name}: ${message}`);
    
    return { success: true, leadId, message };
  } catch (error) {
    console.error(`❌ Error sending enhanced AI warm introduction to lead ${leadId}:`, error);
    return { 
      success: false, 
      leadId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Generate warm, introductory initial outreach messages using ENHANCED AI
const generateWarmInitialMessage = async (lead: any, profile: any): Promise<string | null> => {
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

// Process all leads that need immediate contact
export const processProactiveMessages = async (profile: any): Promise<ProactiveMessageResult[]> => {
  try {
    console.log('🔍 Processing leads for proactive messaging...');

    // First, process any AI takeovers that are due
    await processAITakeovers();

    // Get leads that have AI enabled but no outgoing messages yet
    const { data: leadsNeedingContact } = await supabase
      .from('leads')
      .select(`
        id, 
        first_name, 
        last_name, 
        vehicle_interest,
        ai_opt_in,
        next_ai_send_at,
        ai_messages_sent
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .or('ai_messages_sent.is.null,ai_messages_sent.eq.0')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!leadsNeedingContact || leadsNeedingContact.length === 0) {
      console.log('📭 No leads need proactive contact');
      return [];
    }

    console.log(`📬 Found ${leadsNeedingContact.length} leads needing proactive contact`);

    const results: ProactiveMessageResult[] = [];

    for (const lead of leadsNeedingContact) {
      const shouldSend = !lead.next_ai_send_at || new Date(lead.next_ai_send_at) <= new Date();
      
      if (shouldSend) {
        const result = await sendInitialMessage(lead.id, profile);
        results.push(result);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error processing proactive messages:', error);
    return [];
  }
};

export const triggerImmediateMessage = async (leadId: string, profile: any): Promise<void> => {
  const result = await sendInitialMessage(leadId, profile);
  
  if (result.success) {
    toast({
      title: "Message Sent",
      description: `Enhanced AI warm introduction sent successfully: ${result.message}`,
      variant: "default"
    });
  } else {
    toast({
      title: "Error",
      description: result.error || "Failed to send initial message",
      variant: "destructive"
    });
  }
};
