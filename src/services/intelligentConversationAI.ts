import { supabase } from '@/integrations/supabase/client';
import { LeadSourceData } from '@/types/leadSource';
import { UnknownMessageContext } from '@/services/unknownMessageLearning';
import { formatProperName, formatFullName } from '@/utils/nameFormatter';

export interface ConversationContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  leadSource?: string;
  leadSourceData?: LeadSourceData;
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
  sourceStrategy?: string;
}

// Simple conversational awareness detection
const analyzeConversationalSignals = (message: string): boolean => {
  const text = message.toLowerCase();
  
  const conversationalPatterns = [
    /\b(will be handling|handling it|taking over)\b/,
    /\b(don't know if you know|meet|this is|here is)\s+\w+\b/,
    /\b(letting you know|wanted to tell you|heads up)\b/,
    /\b(by the way|also|additionally)\b/
  ];
  
  return conversationalPatterns.some(pattern => pattern.test(text));
};

const convertContextToUnknownMessageContext = (context: ConversationContext): UnknownMessageContext => {
  const recentMessages = context.messages
    .slice(-10)
    .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
    .join('\n');

  const lastCustomerMessage = context.messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  return {
    conversationHistory: recentMessages,
    leadName: context.leadName,
    vehicleInterest: context.vehicleInterest,
    hasConversationalSignals: lastCustomerMessage ? analyzeConversationalSignals(lastCustomerMessage.body) : false,
    leadSource: context.leadSource
  };
};

export interface IntelligentAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  sourceStrategy?: string;
  customerIntent?: any;
  answerGuidance?: any;
}

export const generateEnhancedIntelligentResponse = async (
  context: ConversationContext
): Promise<IntelligentAIResponse | null> => {
  try {
    console.log('🤖 [ENHANCED AI] Generating contextually aware response for lead:', context.leadId);

    // Format the lead name properly before sending to edge function
    const formattedLeadName = formatProperName(context.leadName) || 'there';

    // Format conversation history for AI analysis
    const conversationHistory = context.messages
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');

    console.log('📝 [ENHANCED AI] Conversation context:', {
      leadId: context.leadId,
      leadName: formattedLeadName,
      vehicleInterest: context.vehicleInterest,
      messageCount: context.messages.length,
      lastMessageDirection: context.messages[context.messages.length - 1]?.direction
    });

    // Call the enhanced edge function with formatted name
    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: context.leadId,
        leadName: formattedLeadName,
        vehicleInterest: context.vehicleInterest,
        conversationHistory,
        leadInfo: context.leadInfo,
        conversationLength: context.messages.length,
        inventoryStatus: {
          hasInventory: true,
          totalVehicles: 15
        },
        isInitialContact: context.messages.length === 0,
        salespersonName: 'Finn',
        dealershipName: 'Jason Pilger Chevrolet',
        context: {
          enhancedMode: true,
          timestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('❌ [ENHANCED AI] Edge function error:', error);
      return null;
    }

    if (data?.message) {
      console.log(`✅ [ENHANCED AI] Generated enhanced response: "${data.message}"`);
      console.log(`🎯 [ENHANCED AI] Strategy used: ${data.intentAnalysis?.strategy || 'unknown'}`);
      console.log(`📊 [ENHANCED AI] Confidence: ${(data.confidence * 100).toFixed(0)}%`);
      
      return {
        message: data.message,
        confidence: data.confidence || 0.8,
        reasoning: data.reasoning || 'Enhanced contextual AI response',
        sourceStrategy: data.intentAnalysis?.strategy,
        customerIntent: data.customerIntent,
        answerGuidance: data.answerGuidance
      };
    }

    console.log('⚠️ [ENHANCED AI] No message generated from enhanced AI');
    return null;

  } catch (error) {
    console.error('❌ [ENHANCED AI] Service error:', error);
    return null;
  }
};

export const shouldGenerateResponse = (context: ConversationContext): boolean => {
  const lastCustomerMessage = context.messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  if (!lastCustomerMessage) return false;

  // Check if already responded
  const messagesAfterCustomer = context.messages.filter(msg => 
    new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
  );

  if (messagesAfterCustomer.length > 0) return false;

  // CHANGED: Always attempt to respond to ANY inbound customer message
  // This removes the previous restrictive logic that only responded to questions
  return true;
};
