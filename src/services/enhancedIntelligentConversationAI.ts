
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedIntelligentResponse {
  message: string;
  confidence: number;
  reasoning: string;
  customerIntent?: any;
  messageType?: string;
}

export const generateEnhancedIntelligentResponse = async (context: any): Promise<EnhancedIntelligentResponse | null> => {
  try {
    console.log(`🤖 [ENHANCED AI SERVICE] Starting enhanced intelligent response generation`);
    console.log(`📋 [ENHANCED AI SERVICE] Context:`, {
      leadId: context.leadId,
      leadName: context.leadName,
      vehicleInterest: context.vehicleInterest,
      isInitialContact: context.isInitialContact,
      salespersonName: context.salespersonName,
      dealershipName: context.dealershipName,
      messageCount: context.messages?.length || 0
    });

    // Extract the last customer message for regular conversations
    const lastCustomerMessage = context.messages?.filter(msg => msg.direction === 'in').slice(-1)[0]?.body || '';
    
    console.log(`💬 [ENHANCED AI SERVICE] Last customer message: "${lastCustomerMessage}"`);
    console.log(`🎯 [ENHANCED AI SERVICE] Is initial contact: ${context.isInitialContact}`);

    // Call the intelligent conversation AI edge function
    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: context.leadId,
        leadName: context.leadName,
        vehicleInterest: context.vehicleInterest,
        lastCustomerMessage: lastCustomerMessage,
        conversationHistory: context.messages?.map(msg => `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`).join('\n') || '',
        leadInfo: context.leadInfo,
        conversationLength: context.messages?.length || 0,
        inventoryStatus: {
          hasInventory: true,
          totalVehicles: 20
        },
        isInitialContact: context.isInitialContact || false,
        salespersonName: context.salespersonName || 'Your sales representative',
        dealershipName: context.dealershipName || 'our dealership',
        context: context
      }
    });

    if (error) {
      console.error('❌ [ENHANCED AI SERVICE] Edge function error:', error);
      return null;
    }

    if (!data || !data.message) {
      console.error('❌ [ENHANCED AI SERVICE] No message returned from edge function');
      return null;
    }

    console.log(`✅ [ENHANCED AI SERVICE] Generated response:`, {
      message: data.message,
      confidence: data.confidence,
      messageType: data.messageType || 'standard'
    });

    return {
      message: data.message,
      confidence: data.confidence || 0.8,
      reasoning: data.reasoning || 'Enhanced AI response',
      customerIntent: data.customerIntent,
      messageType: data.messageType || 'standard'
    };

  } catch (error) {
    console.error('❌ [ENHANCED AI SERVICE] Error generating enhanced intelligent response:', error);
    return null;
  }
};
