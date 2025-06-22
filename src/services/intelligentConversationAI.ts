
import { supabase } from '@/integrations/supabase/client';
import { unknownMessageLearning } from './unknownMessageLearning';
import { leadSourceStrategy } from './leadSourceStrategy';
import { LeadSourceData } from '@/types/leadSource';

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

export const generateEnhancedIntelligentResponse = async (context: ConversationContext): Promise<AIResponse | null> => {
  try {
    console.log('🤖 Generating source-aware AI response for lead:', context.leadId);

    const recentMessages = context.messages
      .slice(-10)
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');

    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) {
      return null;
    }

    // Check if already responded
    const messagesAfterCustomer = context.messages.filter(msg => 
      new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
    );

    if (messagesAfterCustomer.length > 0) {
      return null;
    }

    // Get lead source data if available
    let leadSourceData: LeadSourceData | undefined;
    let sourceStrategy: string = 'general';
    
    if (context.leadSource) {
      leadSourceData = leadSourceStrategy.getLeadSourceData(context.leadSource);
      const strategy = leadSourceStrategy.getConversationStrategy(leadSourceData.sourceCategory);
      sourceStrategy = `${strategy.category} strategy`;
      
      console.log(`🎯 Using ${sourceStrategy} for source: ${context.leadSource}`);
    }

    // First, check if we've learned how to handle this type of message
    const learnedResponse = await unknownMessageLearning.checkForLearnedPatterns(lastCustomerMessage.body);
    if (learnedResponse) {
      console.log('🎯 Using learned pattern for response');
      return {
        message: learnedResponse,
        confidence: 0.8,
        reasoning: 'Response generated from learned human intervention patterns',
        customerIntent: null,
        answerGuidance: null,
        sourceStrategy: sourceStrategy
      };
    }

    // Check for conversational signals
    const hasConversationalSignals = analyzeConversationalSignals(lastCustomerMessage.body);

    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: context.leadId,
        leadName: context.leadName,
        messageBody: lastCustomerMessage.body,
        conversationHistory: recentMessages,
        hasConversationalSignals,
        leadSource: context.leadSource,
        leadSourceData: leadSourceData,
        vehicleInterest: context.vehicleInterest
      }
    });

    if (error || !data?.response) {
      console.error('❌ Error from AI function:', error);
      
      // Capture this as an unknown message scenario
      await unknownMessageLearning.captureUnknownMessage(
        context.leadId,
        lastCustomerMessage.body,
        {
          conversationHistory: recentMessages,
          leadName: context.leadName,
          vehicleInterest: context.vehicleInterest,
          hasConversationalSignals,
          leadSource: context.leadSource
        },
        `AI function error: ${error?.message || 'No response generated'}`
      );
      
      return null;
    }

    return {
      message: data.response,
      confidence: 0.8,
      reasoning: `Source-aware AI response using ${sourceStrategy}`,
      customerIntent: null,
      answerGuidance: null,
      sourceStrategy: sourceStrategy
    };

  } catch (error) {
    console.error('❌ Error generating response:', error);
    
    // Capture this as an unknown message scenario
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];
      
    if (lastCustomerMessage) {
      await unknownMessageLearning.captureUnknownMessage(
        context.leadId,
        lastCustomerMessage.body,
        context,
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    
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

  // Check for questions or conversational signals
  const hasDirectQuestion = /\?/.test(lastCustomerMessage.body) || 
    /\b(what|how|when|where|why|can you|could you|would you|do you|are you|is there)\b/i.test(lastCustomerMessage.body);

  const hasConversationalSignals = analyzeConversationalSignals(lastCustomerMessage.body);
  
  return hasDirectQuestion || hasConversationalSignals;
};
