
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractAndStoreMemory } from './aiMemoryService';
import { addDisclaimersToMessage, validateMessageForCompliance } from './pricingDisclaimerService';
import type { MessageData } from '@/types/conversation';
import { getBusinessHours, isWithinBusinessHours } from "./businessHours";
import { fetchDisclaimerFooter } from "./disclaimerFooter";

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
  isAI: boolean = false,
  complianceFunctions?: {
    checkSuppressed: (contact: string, type: "sms" | "email") => Promise<boolean>;
    enforceConsent: (leadId: string, channel: "sms" | "email") => Promise<boolean>;
    storeConsent: (params: any) => Promise<void>;
  }
) => {
  try {
    // Business hours enforcement
    const bh = await getBusinessHours();
    if (!isWithinBusinessHours(new Date(), bh)) {
      toast({
        title: "Out of Business Hours",
        description: `Messages can only be sent between ${bh.start} and ${bh.end} (${bh.timezone})`,
        variant: "destructive"
      });
      throw new Error("Cannot send message outside allowed business hours.");
    }

    // ENFORCE: Confirm suppression and consent before outbound message
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (phoneError || !phoneData) {
      throw new Error('No primary phone number found for this lead');
    }

    // Check for suppression (opt-outs) if compliance functions are provided
    if (complianceFunctions) {
      const isSuppressed = await complianceFunctions.checkSuppressed(phoneData.number, "sms");
      if (isSuppressed) {
        toast({
          title: "Cannot Send Message",
          description: "This lead has opted out of SMS messages.",
          variant: "destructive"
        });
        throw new Error("Lead is suppressed and cannot be messaged by SMS.");
      }

      // Fail-safe: enforce consent log exists for this lead/channel
      await complianceFunctions.enforceConsent(leadId, "sms"); // will throw if missing
    }

    console.log('Starting to send message for lead:', leadId);
    console.log('Message content:', message);
    console.log('Profile:', profile);
    
    if (!leadId || !message || !profile) {
      throw new Error('Missing required parameters: leadId, message, or profile');
    }
    
    // Validate compliance for pricing content
    const complianceCheck = validateMessageForCompliance(message);
    
    if (!complianceCheck.isCompliant && !isAI) {
      toast({
        title: "Pricing Compliance Warning",
        description: "This message contains pricing but may be missing disclaimers. Please review.",
        variant: "default"
      });
    }

    // For AI messages, automatically add disclaimers
    let finalMessage = message;
    if (isAI && complianceCheck.hasPrice && !complianceCheck.hasDisclaimer) {
      finalMessage = await addDisclaimersToMessage(message, {
        isInventoryRelated: true,
        mentionsFinancing: message.toLowerCase().includes('financ'),
        mentionsTradeIn: message.toLowerCase().includes('trade'),
        mentionsLease: message.toLowerCase().includes('lease')
      });
    }

    // Always append global disclaimer footer for outbound
    const footer = await fetchDisclaimerFooter('sms');
    if (footer && !finalMessage.includes(footer)) {
      finalMessage = `${finalMessage}\n\n${footer}`;
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

    // Try to send SMS via Telnyx
    console.log('Calling send-sms function...');
    try {
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
            sms_error: `SMS service error: ${error.message || 'Unknown error'}`
          })
          .eq('id', conversation.id);
        
        // Show warning but don't throw - message is saved locally
        toast({
          title: "Message Saved Locally",
          description: "SMS sending failed but your message has been saved. Please check your SMS configuration.",
          variant: "default"
        });
        
        return { success: true, warning: 'SMS sending failed but message saved' };
      }

      // Update conversation with success status
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: data?.telnyxMessageId || data?.messageSid
        })
        .eq('id', conversation.id);

      console.log('Updated conversation with success status');

    } catch (smsError) {
      console.error('SMS function error:', smsError);
      
      // Update conversation with error status
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: `SMS function error: ${smsError.message || 'Function call failed'}`
        })
        .eq('id', conversation.id);
      
      // Show warning but don't throw - message is saved locally
      toast({
        title: "Message Saved Locally",
        description: "SMS sending failed but your message has been saved. Please check your Telnyx configuration in settings.",
        variant: "default"
      });
      
      return { success: true, warning: 'SMS sending failed but message saved' };
    }

    // After successful send, auto-log consent audit if first message (opt-in confirmation)
    if (complianceFunctions) {
      await complianceFunctions.storeConsent({
        leadId,
        channel: "sms",
        method: "webform", // reference: update if sending from another source
        consentText: "Express written consent confirmed via message send.",
        ipAddress: null,
        userAgent: null,
        capturedBy: profile?.id,
      });
    }

    // Store memory from outgoing message
    try {
      await extractAndStoreMemory(leadId, finalMessage, 'out');
    } catch (memoryError) {
      console.error('Memory extraction error:', memoryError);
      // Don't fail the message for memory errors
    }

    console.log(`Message sent successfully to lead ${leadId}`);
    
    // Show success message
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
