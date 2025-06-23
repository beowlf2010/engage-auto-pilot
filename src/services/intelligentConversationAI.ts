import { supabase } from '@/integrations/supabase/client';
import { unknownMessageLearning, UnknownMessageContext } from './unknownMessageLearning';
import { leadSourceStrategy } from './leadSourceStrategy';
import { LeadSourceData } from '@/types/leadSource';
import { detectObjectionSignals, generateObjectionResponse } from './objectionHandlingService';

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
      console.log('🤖 No customer message found to respond to');
      return null;
    }

    // Check if already responded
    const messagesAfterCustomer = context.messages.filter(msg => 
      new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
    );

    if (messagesAfterCustomer.length > 0) {
      console.log('🤖 Already responded to this customer message');
      return null;
    }

    // First, check for objections and handle them directly
    const objectionSignals = detectObjectionSignals(lastCustomerMessage.body);
    if (objectionSignals.length > 0) {
      console.log('🛡️ Objection detected, generating specific response');
      const objectionResponse = generateObjectionResponse(objectionSignals, context.leadName.split(' ')[0]);
      
      if (objectionResponse) {
        return {
          message: objectionResponse,
          confidence: 0.9,
          reasoning: `Objection handling response for: ${objectionSignals[0].type}`,
          customerIntent: null,
          answerGuidance: null,
          sourceStrategy: 'objection_handling'
        };
      }
    }

    // Get lead source data if available
    let leadSourceData: LeadSourceData | undefined;
    let sourceStrategy: string = 'general';
    
    if (context.leadSource) {
      try {
        leadSourceData = leadSourceStrategy.getLeadSourceData(context.leadSource);
        const strategy = leadSourceStrategy.getConversationStrategy(leadSourceData.sourceCategory);
        sourceStrategy = `${strategy.category} strategy`;
        
        console.log(`🎯 Using ${sourceStrategy} for source: ${context.leadSource}`);
      } catch (error) {
        console.warn('⚠️ Error getting lead source strategy, using general approach:', error);
      }
    }

    // Check for learned patterns
    let learnedResponse: string | null = null;
    try {
      learnedResponse = await unknownMessageLearning.checkForLearnedPatterns(lastCustomerMessage.body);
    } catch (error) {
      console.warn('⚠️ Error checking learned patterns (continuing with AI generation):', error);
    }
    
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

    // Call the AI function with enhanced error handling
    let data, error;
    try {
      const response = await supabase.functions.invoke('intelligent-conversation-ai', {
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
      
      data = response.data;
      error = response.error;
    } catch (fetchError) {
      console.error('❌ Network error calling AI function:', fetchError);
      error = { message: 'Network connection error' };
    }

    if (error || !data?.response) {
      console.error('❌ Error from AI function:', error);
      
      // Capture this as an unknown message scenario using proper context type
      try {
        const unknownContext = convertContextToUnknownMessageContext(context);
        await unknownMessageLearning.captureUnknownMessage(
          context.leadId,
          lastCustomerMessage.body,
          unknownContext,
          `AI function error: ${error?.message || 'No response generated'}`
        );
      } catch (captureError) {
        console.warn('⚠️ Could not capture unknown message (database may be unavailable):', captureError);
      }
      
      // Return a helpful fallback message instead of null
      return {
        message: "Thanks for your message! I'll review this and get back to you shortly with the information you need.",
        confidence: 0.5,
        reasoning: `Fallback response due to AI function error: ${error?.message || 'No response generated'}`,
        customerIntent: null,
        answerGuidance: null,
        sourceStrategy: sourceStrategy
      };
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
    
    // Capture this as an unknown message scenario if possible
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];
      
    if (lastCustomerMessage) {
      try {
        const unknownContext = convertContextToUnknownMessageContext(context);
        await unknownMessageLearning.captureUnknownMessage(
          context.leadId,
          lastCustomerMessage.body,
          unknownContext,
          `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } catch (captureError) {
        console.warn('⚠️ Could not capture unknown message (database may be unavailable):', captureError);
      }
    }
    
    // Return a helpful fallback instead of null
    return {
      message: "I see your message and want to make sure I give you the best response. Let me get the right information for you.",
      confidence: 0.3,
      reasoning: `Fallback response due to system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      customerIntent: null,
      answerGuidance: null,
      sourceStrategy: 'fallback'
    };
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
