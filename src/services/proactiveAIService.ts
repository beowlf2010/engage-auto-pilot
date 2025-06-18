
import { supabase } from '@/integrations/supabase/client';
import { generateIntelligentAIMessage } from './intelligentAIMessageService';
import { sendMessage } from './messagesService';
import { toast } from '@/hooks/use-toast';
import { addAIConversationNote } from './vehicleMentionService';

export interface ProactiveMessageResult {
  success: boolean;
  leadId: string;
  message?: string;
  error?: string;
}

// Send immediate first message when AI is enabled
export const sendInitialMessage = async (leadId: string, profile: any): Promise<ProactiveMessageResult> => {
  try {
    console.log(`🚀 Sending initial proactive message to lead ${leadId}`);

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

    // Generate initial message
    const message = await generateInitialMessage(lead);
    if (!message) {
      return { success: false, leadId, error: 'Failed to generate message' };
    }

    // Send the message
    const messageResult = await sendMessage(leadId, message, profile, true);

    // Add AI conversation note about initial contact
    await addAIConversationNote(
      leadId,
      messageResult?.id || null,
      'inventory_discussion',
      `Initial AI contact: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      []
    );

    // Update lead status
    await supabase
      .from('leads')
      .update({
        ai_messages_sent: 1,
        ai_stage: 'initial_contact_sent',
        next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next message in 24 hours
      })
      .eq('id', leadId);

    console.log(`✅ Initial message sent to ${lead.first_name}: ${message}`);
    
    return { success: true, leadId, message };
  } catch (error) {
    console.error(`❌ Error sending initial message to lead ${leadId}:`, error);
    return { 
      success: false, 
      leadId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Generate compelling initial outreach messages
const generateInitialMessage = async (lead: any): Promise<string | null> => {
  try {
    // Try intelligent AI message first
    const aiMessage = await generateIntelligentAIMessage({
      leadId: lead.id,
      stage: 'initial_contact',
      context: {
        urgency_factor: 'new_lead',
        behavioral_trigger: 'first_contact'
      }
    });

    if (aiMessage) {
      return aiMessage;
    }

    // Fallback to template-based messages
    const templates = [
      `Hi ${lead.first_name}! I see you're interested in ${lead.vehicle_interest}. I'd love to help you find the perfect vehicle. Any questions I can answer?`,
      `Hello ${lead.first_name}! Thanks for your interest in ${lead.vehicle_interest}. I have some great options that might be perfect for you. When would be a good time to chat?`,
      `Hi ${lead.first_name}! I noticed you're looking for ${lead.vehicle_interest}. I specialize in helping customers find exactly what they need. What features are most important to you?`
    ];

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template;
  } catch (error) {
    console.error('Error generating initial message:', error);
    return null;
  }
};

// Process all leads that need immediate contact
export const processProactiveMessages = async (profile: any): Promise<ProactiveMessageResult[]> => {
  try {
    console.log('🔍 Processing leads for proactive messaging...');

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
      // Check if scheduled time has passed or if it's immediate
      const shouldSend = !lead.next_ai_send_at || new Date(lead.next_ai_send_at) <= new Date();
      
      if (shouldSend) {
        const result = await sendInitialMessage(lead.id, profile);
        results.push(result);
        
        // Add delay between messages to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error processing proactive messages:', error);
    return [];
  }
};

// Trigger immediate first message for a specific lead
export const triggerImmediateMessage = async (leadId: string, profile: any): Promise<void> => {
  const result = await sendInitialMessage(leadId, profile);
  
  if (result.success) {
    toast({
      title: "Message Sent",
      description: `Initial message sent successfully: ${result.message}`,
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
