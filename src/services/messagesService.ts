
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractAndStoreMemory } from './aiMemoryService';
import { addDisclaimersToMessage, validateMessageForCompliance } from './pricingDisclaimerService';

export const sendMessage = async (
  leadId: string, 
  message: string, 
  profile: any, 
  isAI: boolean = false
) => {
  try {
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
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (phoneError || !phoneData) {
      throw new Error('No primary phone number found for this lead');
    }

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
      throw conversationError;
    }

    // Send SMS via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneData.number,
        message: finalMessage,
        conversationId: conversation.id
      }
    });

    if (error) {
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

    // Update conversation with success status and Twilio message ID
    await supabase
      .from('conversations')
      .update({
        sms_status: 'sent',
        twilio_message_id: data?.messageSid
      })
      .eq('id', conversation.id);

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
