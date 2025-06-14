
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractAndStoreMemory } from './aiMemoryService';
import { addDisclaimersToMessage, validateMessageForCompliance } from './pricingDisclaimerService';
import type { MessageData } from '@/types/conversation';

export const fetchMessages = async (leadId: string): Promise<MessageData[]> => {
  try {
    console.log('Fetching messages for lead:', leadId);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data?.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      direction: msg.direction as 'in' | 'out',
      body: msg.body,
      sentAt: msg.sent_at,
      aiGenerated: msg.ai_generated,
      smsStatus: msg.sms_status,
      smsError: msg.sms_error
    })) || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const sendMessage = async (
  leadId: string, 
  message: string, 
  profile: any, 
  isAI: boolean = false
) => {
  try {
    console.log('Starting to send message for lead:', leadId);
    console.log('Message content:', message);
    console.log('Profile:', profile);
    
    if (!leadId || !message || !profile) {
      throw new Error('Missing required parameters: leadId, message, or profile');
    }
    
    // Validate compliance for pricing content
    const compliance = validateMessageForCompliance(message);
    
    if (!compliance.isCompliant && !isAI) {
      // For manual messages, warn but don't block
      toast({
        title: "Pricing Compliance Warning",
        description: "This message contains pricing but may be missing disclaimers. Please review.",
        variant: "default"
      });
    }

    // For AI messages, automatically add disclaimers
    let finalMessage = message;
    if (isAI && compliance.hasPrice && !compliance.hasDisclaimer) {
      finalMessage = await addDisclaimersToMessage(message, {
        isInventoryRelated: true, // Assume AI messages are often inventory-related
        mentionsFinancing: message.toLowerCase().includes('financ'),
        mentionsTradeIn: message.toLowerCase().includes('trade'),
        mentionsLease: message.toLowerCase().includes('lease')
      });
    }

    // Get lead's primary phone number
    console.log('Looking up phone number for lead:', leadId);
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (phoneError || !phoneData) {
      console.error('Phone lookup error:', phoneError);
      throw new Error('No primary phone number found for this lead');
    }

    console.log('Found phone number:', phoneData.number);

    // Store the conversation record first
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        body: finalMessage,
        direction: 'out',
        ai_generated: isAI,
        sent_at: new Date().toISOString(),
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating conversation record:', conversationError);
      throw conversationError;
    }

    console.log('Created conversation record:', conversation.id);

    // Send SMS via Telnyx (using the send-sms function)
    console.log('Calling send-sms function...');
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneData.number,
        body: finalMessage,
        conversationId: conversation.id
      }
    });

    console.log('SMS function response:', data, error);

    if (error) {
      console.error('SMS sending error:', error);
      // Update conversation with error status
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: error.message
        })
        .eq('id', conversation.id);
      
      throw error;
    }

    // Update conversation with success status and message ID
    await supabase
      .from('conversations')
      .update({
        sms_status: 'sent',
        twilio_message_id: data?.telnyxMessageId || data?.messageSid
      })
      .eq('id', conversation.id);

    console.log('Updated conversation with success status');

    // Store memory from outgoing message
    await extractAndStoreMemory(leadId, finalMessage, 'out');

    console.log(`Message sent successfully to lead ${leadId}`);
    
    // Show compliance info if disclaimers were added
    if (finalMessage !== message) {
      toast({
        title: "Message Sent with Disclaimers",
        description: "Pricing disclaimers were automatically added for compliance",
      });
    } else {
      toast({
        title: "Message Sent",
        description: "Your message has been delivered",
      });
    }

    return { success: true };

  } catch (error) {
    console.error('Error sending message:', error);
    toast({
      title: "Failed to send message",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive"
    });
    throw error;
  }
};
