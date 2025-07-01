import { supabase } from '@/integrations/supabase/client';
import { LeadSourceData } from '@/types/leadSource';
import { UnknownMessageContext } from '@/services/unknownMessageLearning';
import { formatProperName, formatFullName } from '@/utils/nameFormatter';
import { generateVehicleIntelligentResponse } from './vehicleIntelligence/enhancedConversationAI';
import { responseVariationService } from './responseVariationService';
import { contextAwareResponseService, MessageContext } from './contextAwareResponseService';

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

export interface ConversationMessage {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sentAt: string;
  aiGenerated: boolean;
}

export interface IntelligentResponse {
  message: string;
  confidence: number;
  reasoning: string;
  shouldSend: boolean;
  responseStrategy: string;
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

export const shouldGenerateResponse = (context: ConversationContext): boolean => {
  const customerMessages = context.messages.filter(msg => msg.direction === 'in');
  if (customerMessages.length === 0) return false;

  const lastCustomerMessage = customerMessages[customerMessages.length - 1];
  const lastAIMessage = context.messages
    .filter(msg => msg.direction === 'out' && msg.aiGenerated)
    .pop();

  // Only respond if the customer's last message is newer than our last AI response
  if (lastAIMessage && new Date(lastCustomerMessage.sentAt) <= new Date(lastAIMessage.sentAt)) {
    return false;
  }

  return true;
};

export const generateEnhancedIntelligentResponse = async (
  context: ConversationContext
): Promise<IntelligentAIResponse | null> => {
  try {
    console.log('🤖 [ENHANCED AI] Generating contextually aware response for lead:', context.leadId);

    if (!shouldGenerateResponse(context)) {
      console.log('🚫 [ENHANCED AI] No response needed - customer has not sent new message');
      return null;
    }

    // Get the latest customer message
    const customerMessages = context.messages.filter(msg => msg.direction === 'in');
    const latestMessage = customerMessages[customerMessages.length - 1];

    if (!latestMessage) {
      console.log('❌ [ENHANCED AI] No customer message found');
      return null;
    }

    console.log('📨 [ENHANCED AI] Processing customer message:', latestMessage.body.substring(0, 100));

    // Create message context for the context-aware service
    const messageContext: MessageContext = {
      leadId: context.leadId,
      leadName: context.leadName || 'there',
      latestMessage: latestMessage.body,
      conversationHistory: context.messages.map(m => m.body),
      vehicleInterest: context.vehicleInterest,
      previousIntent: undefined // Could be enhanced with conversation memory
    };

    // Generate context-aware response
    const response = contextAwareResponseService.generateResponse(messageContext);

    // Validate response quality
    const qualityCheck = contextAwareResponseService.validateResponseQuality(response.message);
    
    if (!qualityCheck.isValid) {
      console.warn('⚠️ [ENHANCED AI] Response quality issues:', qualityCheck.issues);
      // Could fall back to a safer template here
    }

    console.log('✅ [ENHANCED AI] Generated intelligent response:', {
      intent: response.intent.primary,
      strategy: response.responseStrategy,
      confidence: response.confidence,
      message: response.message.substring(0, 100) + '...'
    });

    return {
      message: response.message,
      confidence: response.confidence,
      reasoning: response.reasoning,
      sourceStrategy: response.responseStrategy,
      customerIntent: response.intent,
      answerGuidance: response.followUpAction
    };

    // Try response variation service first for maximum diversity
    try {
      const variationResponse = responseVariationService.generateContextualResponse({
        leadId: context.leadId,
        leadName: context.leadName,
        vehicleInterest: context.vehicleInterest,
        timeOfDay: getTimeOfDay(),
        conversationStage: context.messages.length <= 2 ? 'initial' : 'follow_up'
      });
      
      if (variationResponse && variationResponse.length > 20) {
        console.log(`✅ [ENHANCED AI] Using response variation service with high diversity`);
        return {
          message: variationResponse,
          confidence: 0.9,
          reasoning: 'Response variation service - maximum diversity',
          sourceStrategy: 'response_variation',
          customerIntent: { type: 'general', confidence: 0.8 }
        };
      }
    } catch (error) {
      console.log('Response variation service not available, continuing with other methods');
    }

    // Try vehicle-intelligent response (this will NOT cause infinite loop now)
    const vehicleResponse = await generateVehicleIntelligentResponse({
      leadId: context.leadId,
      leadName: context.leadName,
      vehicleInterest: context.vehicleInterest,
      messages: context.messages,
      leadInfo: context.leadInfo,
      leadSource: context.leadSource
    });

    if (vehicleResponse && vehicleResponse.confidence > 0.7) {
      console.log(`✅ [ENHANCED AI] Using vehicle-intelligent response with ${vehicleResponse.confidence} confidence`);
      return {
        message: vehicleResponse.message,
        confidence: vehicleResponse.confidence,
        reasoning: vehicleResponse.reasoning,
        sourceStrategy: 'vehicle_intelligent',
        customerIntent: vehicleResponse.vehicleContext,
        answerGuidance: vehicleResponse.inventoryMentioned
      };
    }

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
          vehicleIntelligent: true,
          diverseResponses: true,
          timestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('❌ [ENHANCED AI] Edge function error:', error);
      return generateEnhancedFallback(formattedLeadName, context.vehicleInterest);
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
    return generateEnhancedFallback(formattedLeadName, context.vehicleInterest);

  } catch (error) {
    console.error('❌ [ENHANCED AI] Service error:', error);
    return generateEnhancedFallback(formatProperName(context.leadName) || 'there', context.vehicleInterest);
  }
};

// Enhanced fallback with much more variety - prevents repetitive messages
const generateEnhancedFallback = (leadName: string, vehicleInterest?: string): IntelligentAIResponse => {
  // Try response variation service for fallback
  try {
    const response = responseVariationService.generateDiverseFallback(leadName, vehicleInterest);
    if (response && response.length > 20) {
      return {
        message: response,
        confidence: 0.7,
        reasoning: 'Response variation service fallback - high diversity',
        sourceStrategy: 'diverse_fallback'
      };
    }
  } catch (error) {
    console.log('Using traditional fallback approach');
  }

  // Enhanced fallback templates with personality variations
  const fallbackTemplates = {
    with_vehicle: [
      `Hi ${leadName}! I'm here to help with ${vehicleInterest}. What questions do you have?`,
      `Hello ${leadName}! Ready to discuss ${vehicleInterest} - what interests you most?`,
      `Hey ${leadName}! Let's talk about ${vehicleInterest}. What would you like to know?`,
      `Hi ${leadName}! I have great info about ${vehicleInterest}. What can I share with you?`,
      `Hello ${leadName}! Excited to help with ${vehicleInterest}. What's on your mind?`,
      `Hi ${leadName}! ${vehicleInterest} is a great choice. What features matter most to you?`,
      `Hey ${leadName}! I'd love to tell you about ${vehicleInterest}. What should we cover first?`
    ],
    generic: [
      `Hi ${leadName}! I'm Finn with Jason Pilger Chevrolet. How can I help you today?`,
      `Hello ${leadName}! Ready to help you find exactly what you're looking for. What's on your mind?`,
      `Hey ${leadName}! What can I do for you today?`,
      `Hi ${leadName}! I'm here to make your car shopping easy. What questions do you have?`,
      `Hello ${leadName}! Let's find you the perfect vehicle. What are you thinking?`,
      `Hi ${leadName}! Excited to help you out today. What can I assist with?`,
      `Hey ${leadName}! What brings you our way today?`,
      `Hello ${leadName}! I'm here to help make this process smooth for you. What do you need?`
    ]
  };

  // Select template set based on whether we have vehicle interest
  const templates = vehicleInterest && vehicleInterest !== 'finding the right vehicle' 
    ? fallbackTemplates.with_vehicle 
    : fallbackTemplates.generic;
  
  // Randomly select from templates
  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    message: selectedTemplate,
    confidence: 0.6,
    reasoning: 'Enhanced diverse fallback to prevent repetitive messages',
    sourceStrategy: 'enhanced_fallback'
  };
};

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

// Simple fallback that doesn't cause infinite loops
const generateSimpleFallback = (leadName: string): IntelligentAIResponse => {
  const greeting = leadName && leadName !== 'there' ? `Hi ${leadName}! ` : 'Hello! ';
  
  return {
    message: `${greeting}Thanks for reaching out. I'm Finn with Jason Pilger Chevrolet and I'm here to help you find the perfect vehicle for your needs. What can I assist you with today?`,
    confidence: 0.6,
    reasoning: 'Simple fallback response to prevent infinite loops',
    sourceStrategy: 'fallback'
  };
};
