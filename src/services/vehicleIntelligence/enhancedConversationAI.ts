
import { supabase } from '@/integrations/supabase/client';
import { vehiclePersonalizationService, PersonalizationContext } from './vehiclePersonalizationService';
import { formatProperName } from '@/utils/nameFormatter';

export interface EnhancedConversationContext {
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
  leadSource?: string;
}

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  vehicleContext?: any;
  followUpScheduled?: boolean;
  inventoryMentioned?: string[];
}

export const generateVehicleIntelligentResponse = async (
  context: EnhancedConversationContext
): Promise<EnhancedAIResponse | null> => {
  try {
    console.log('🚀 [ENHANCED CONVERSATION AI] Generating vehicle-intelligent response');
    
    const formattedName = formatProperName(context.leadName);
    const isInitialContact = context.messages.length === 0;
    
    if (isInitialContact) {
      // Use vehicle personalization for initial contact
      const personalizationContext: PersonalizationContext = {
        leadId: context.leadId,
        leadName: formattedName,
        originalVehicleInterest: context.vehicleInterest,
        leadSource: context.leadSource,
        salespersonName: 'Finn'
      };
      
      const personalizedMessage = await vehiclePersonalizationService.generatePersonalizedMessage(personalizationContext);
      
      return {
        message: personalizedMessage.message,
        confidence: personalizedMessage.confidence,
        reasoning: `Vehicle-intelligent initial contact using ${personalizedMessage.strategy} strategy`,
        vehicleContext: personalizedMessage.vehicleContext,
        followUpScheduled: false,
        inventoryMentioned: personalizedMessage.inventoryReferences
      };
    }
    
    // For follow-up messages, analyze the conversation context
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];
    
    if (lastCustomerMessage) {
      const conversationAnalysis = await analyzeVehicleConversation(lastCustomerMessage.body, context);
      
      if (conversationAnalysis.needsVehicleResponse) {
        return await generateVehicleContextualResponse(context, conversationAnalysis);
      }
    }
    
    // Fallback to standard AI response
    return await generateStandardAIResponse(context);
    
  } catch (error) {
    console.error('❌ [ENHANCED CONVERSATION AI] Error:', error);
    return null;
  }
};

const analyzeVehicleConversation = async (message: string, context: EnhancedConversationContext) => {
  const messageLower = message.toLowerCase();
  
  // Vehicle-specific conversation patterns
  const vehicleQuestions = [
    'what do you have', 'what models', 'what vehicles', 'do you have',
    'show me', 'available', 'in stock', 'inventory', 'price', 'cost',
    'features', 'options', 'trim', 'color', 'miles', 'mileage'
  ];
  
  const needsVehicleResponse = vehicleQuestions.some(pattern => 
    messageLower.includes(pattern)
  );
  
  // Detect specific vehicle mentions
  const vehicleRecognition = await import('./vehicleRecognitionService').then(
    module => module.vehicleRecognitionService.recognizeVehicleInterest(message)
  );
  
  return {
    needsVehicleResponse,
    vehicleRecognition,
    intent: determineVehicleIntent(messageLower),
    urgency: determineUrgency(messageLower)
  };
};

const generateVehicleContextualResponse = async (
  context: EnhancedConversationContext, 
  analysis: any
): Promise<EnhancedAIResponse> => {
  const formattedName = formatProperName(context.leadName);
  const greeting = formattedName ? `${formattedName}, ` : '';
  
  // Check inventory based on their request
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('status', 'available')
    .limit(3);
  
  let message = '';
  let inventoryMentioned: string[] = [];
  
  if (analysis.intent === 'inventory_inquiry' && inventory && inventory.length > 0) {
    const vehicle = inventory[0];
    inventoryMentioned.push(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    
    message = `${greeting}great question! We currently have a ${vehicle.year} ${vehicle.make} ${vehicle.model} available that might interest you. It has ${vehicle.mileage?.toLocaleString()} miles and is priced at $${vehicle.price?.toLocaleString()}. Would you like me to share more details about this vehicle or others we have in stock?`;
  } else if (analysis.intent === 'pricing_inquiry') {
    message = `${greeting}I'd be happy to discuss pricing with you! Our inventory prices are competitive and we often have incentives available. What specific vehicle were you thinking about, and I can get you exact pricing information?`;
  } else if (analysis.intent === 'features_inquiry') {
    message = `${greeting}absolutely! I can go over all the features and options. What aspects are most important to you - technology, safety features, performance, or comfort options?`;
  } else {
    // General vehicle response
    message = `${greeting}I'm here to help you find exactly what you're looking for! Let me know what specific information would be most helpful - availability, pricing, features, or anything else about our vehicles.`;
  }
  
  return {
    message,
    confidence: 0.85,
    reasoning: `Vehicle-contextual response for ${analysis.intent} intent`,
    vehicleContext: analysis.vehicleRecognition,
    followUpScheduled: analysis.urgency === 'high',
    inventoryMentioned
  };
};

const generateStandardAIResponse = async (
  context: EnhancedConversationContext
): Promise<EnhancedAIResponse> => {
  // Call the existing intelligent conversation AI
  const { generateEnhancedIntelligentResponse } = await import('../intelligentConversationAI');
  
  const response = await generateEnhancedIntelligentResponse(context);
  
  if (response) {
    return {
      message: response.message,
      confidence: response.confidence,
      reasoning: response.reasoning,
      followUpScheduled: false
    };
  }
  
  // Final fallback
  const formattedName = formatProperName(context.leadName);
  const greeting = formattedName ? `${formattedName}, ` : '';
  
  return {
    message: `${greeting}thanks for reaching out! I'm here to help you with any questions about our vehicles or to assist you in finding the perfect match for your needs. What can I help you with today?`,
    confidence: 0.6,
    reasoning: 'Standard fallback response',
    followUpScheduled: false
  };
};

const determineVehicleIntent = (message: string): string => {
  if (message.includes('price') || message.includes('cost') || message.includes('payment')) {
    return 'pricing_inquiry';
  }
  if (message.includes('available') || message.includes('have') || message.includes('stock')) {
    return 'inventory_inquiry';
  }
  if (message.includes('features') || message.includes('options') || message.includes('trim')) {
    return 'features_inquiry';
  }
  if (message.includes('test drive') || message.includes('see') || message.includes('visit')) {
    return 'appointment_inquiry';
  }
  return 'general_inquiry';
};

const determineUrgency = (message: string): 'low' | 'medium' | 'high' => {
  const highUrgency = ['asap', 'urgent', 'soon', 'today', 'this week', 'need now'];
  const mediumUrgency = ['next week', 'this month', 'looking to buy', 'ready to'];
  
  if (highUrgency.some(word => message.includes(word))) return 'high';
  if (mediumUrgency.some(word => message.includes(word))) return 'medium';
  return 'low';
};
