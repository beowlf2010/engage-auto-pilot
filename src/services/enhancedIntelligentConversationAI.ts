
import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  messages: Array<{
    id: string;
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated?: boolean;
  }>;
  leadInfo?: {
    phone: string;
    status: string;
    lastReplyAt?: string;
  };
}

export interface AIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  customerIntent?: any;
  answerGuidance?: any;
}

// Enhanced AI service that ONLY uses the unified edge function
export const generateEnhancedIntelligentResponse = async (context: ConversationContext): Promise<AIResponse | null> => {
  try {
    console.log('🤖 [ENHANCED AI] Generating response via UNIFIED edge function for lead:', context.leadId);

    // Get recent conversation history (last 10 messages)
    const recentMessages = context.messages
      .slice(-10)
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');

    // Get the last customer message to understand what they're asking
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) {
      console.log('❌ [ENHANCED AI] No customer message found to respond to');
      return null;
    }

    // Check if we've already responded to this message
    const messagesAfterCustomer = context.messages.filter(msg => 
      new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
    );

    if (messagesAfterCustomer.length > 0) {
      console.log('✅ [ENHANCED AI] Already responded to latest customer message');
      return null;
    }

    console.log('🔄 [ENHANCED AI] Calling UNIFIED intelligent-conversation-ai edge function');

    // Call the UNIFIED edge function that has the fixed logic and unknown vehicle filtering
    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: context.leadId,
        leadName: context.leadName,
        vehicleInterest: context.vehicleInterest || '',
        lastCustomerMessage: lastCustomerMessage.body,
        conversationHistory: recentMessages,
        leadInfo: context.leadInfo,
        conversationLength: context.messages.length,
        isInitialContact: false, // This is for follow-up messages
        salespersonName: 'Finn',
        dealershipName: 'Jason Pilger Chevrolet'
      }
    });

    if (error) {
      console.error('❌ [ENHANCED AI] Error from unified edge function:', error);
      return null;
    }

    if (!data?.message) {
      console.error('❌ [ENHANCED AI] No message returned from unified edge function');
      return null;
    }

    // Additional validation to ensure the message doesn't contain "Unknown" vehicles
    if (data.message.includes('Unknown') || data.message.toLowerCase().includes('unknown')) {
      console.warn('⚠️ [ENHANCED AI] Generated message contains "Unknown" - filtering out');
      return null;
    }

    console.log('✅ [ENHANCED AI] Generated response via unified edge function:', data.message);
    
    return {
      message: data.message,
      confidence: data.confidence || 0.9,
      reasoning: data.reasoning || 'Enhanced AI via unified edge function with unknown vehicle filtering',
      customerIntent: data.customerIntent || null,
      answerGuidance: data.answerGuidance || null
    };

  } catch (error) {
    console.error('❌ [ENHANCED AI] Error generating response via unified edge function:', error);
    return null;
  }
};

export const shouldGenerateResponse = (context: ConversationContext): boolean => {
  // Only generate if there's a recent customer message we haven't responded to
  const lastCustomerMessage = context.messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  if (!lastCustomerMessage) return false;

  // Check if we've already responded
  const messagesAfterCustomer = context.messages.filter(msg => 
    new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
  );

  return messagesAfterCustomer.length === 0;
};
