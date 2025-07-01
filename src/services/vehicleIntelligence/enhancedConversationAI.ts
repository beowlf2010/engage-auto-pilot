
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
  latestCustomerMessage?: string; // NEW: Direct customer message
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
    
    // Get the actual customer message - prioritize direct parameter
    let customerMessage = context.latestCustomerMessage;
    
    if (!customerMessage && context.messages.length > 0) {
      const lastCustomerMessage = context.messages
        .filter(msg => msg.direction === 'in')
        .slice(-1)[0];
      customerMessage = lastCustomerMessage?.body;
    }

    console.log('📝 [ENHANCED CONVERSATION AI] Processing customer message:', customerMessage?.substring(0, 100) + '...');
    
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
    
    if (customerMessage) {
      const conversationAnalysis = await analyzeVehicleConversation(customerMessage, context);
      
      if (conversationAnalysis.needsVehicleResponse) {
        return await generateVehicleContextualResponse(context, conversationAnalysis, customerMessage);
      }
    }
    
    // Direct fallback with customer message context
    return await generateDirectFallbackResponse(context, customerMessage);
    
  } catch (error) {
    console.error('❌ [ENHANCED CONVERSATION AI] Error:', error);
    return null;
  }
};

const analyzeVehicleConversation = async (message: string, context: EnhancedConversationContext) => {
  const messageLower = message.toLowerCase();
  
  // Check for vehicle interest corrections first
  const vehicleCorrections = [
    "i don't need", "don't need", "i'm not looking for", "not looking for",
    "i don't want", "don't want", "not interested in", "i'm not interested",
    "that's not what", "not what i", "wrong vehicle", "incorrect"
  ];
  
  const isVehicleCorrection = vehicleCorrections.some(pattern => 
    messageLower.includes(pattern)
  );
  
  // Vehicle-specific conversation patterns
  const vehicleQuestions = [
    'what do you have', 'what models', 'what vehicles', 'do you have',
    'show me', 'available', 'in stock', 'inventory', 'price', 'cost',
    'features', 'options', 'trim', 'color', 'miles', 'mileage'
  ];
  
  const needsVehicleResponse = vehicleQuestions.some(pattern => 
    messageLower.includes(pattern)
  ) || isVehicleCorrection;
  
  // Detect specific vehicle mentions
  const vehicleRecognition = await import('./vehicleRecognitionService').then(
    module => module.vehicleRecognitionService.recognizeVehicleInterest(message)
  );
  
  return {
    needsVehicleResponse,
    vehicleRecognition,
    intent: isVehicleCorrection ? 'vehicle_correction' : determineVehicleIntent(messageLower),
    urgency: determineUrgency(messageLower),
    isVehicleCorrection
  };
};

const generateVehicleContextualResponse = async (
  context: EnhancedConversationContext, 
  analysis: any,
  customerMessage: string
): Promise<EnhancedAIResponse> => {
  const formattedName = formatProperName(context.leadName);
  const greeting = formattedName ? `${formattedName}, ` : '';
  
  let message = '';
  let inventoryMentioned: string[] = [];
  
  // Handle vehicle interest corrections
  if (analysis.isVehicleCorrection) {
    message = `${greeting}I apologize for the confusion! It sounds like there may have been a mix-up with your vehicle interest. What type of vehicle are you actually looking for? I'd love to help you find exactly what you need.`;
    
    return {
      message,
      confidence: 0.9,
      reasoning: `Vehicle interest correction response to: "${customerMessage.substring(0, 50)}..."`,
      vehicleContext: analysis.vehicleRecognition,
      followUpScheduled: false,
      inventoryMentioned
    };
  }
  
  // Check inventory based on their request
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .eq('status', 'available')
    .limit(3);
  
  if (analysis.intent === 'inventory_inquiry' && inventory && inventory.length > 0) {
    const vehicle = inventory[0];
    inventoryMentioned.push(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    
    message = `${greeting}great question! We currently have a ${vehicle.year} ${vehicle.make} ${vehicle.model} available that might interest you. It has ${vehicle.mileage?.toLocaleString()} miles and is priced at $${vehicle.price?.toLocaleString()}. Would you like me to share more details about this vehicle or others we have in stock?`;
  } else if (analysis.intent === 'pricing_inquiry') {
    message = `${greeting}I'd be happy to discuss pricing with you! Our inventory prices are competitive and we often have incentives available. What specific vehicle were you thinking about, and I can get you exact pricing information?`;
  } else if (analysis.intent === 'features_inquiry') {
    message = `${greeting}absolutely! I can go over all the features and options. What aspects are most important to you - technology, safety features, performance, or comfort options?`;
  } else {
    // General vehicle response that acknowledges their specific message
    message = `${greeting}I understand you're asking about ${customerMessage.toLowerCase().includes('price') ? 'pricing' : customerMessage.toLowerCase().includes('available') ? 'availability' : 'that'}. I'm here to help you find exactly what you're looking for! Let me know what specific information would be most helpful.`;
  }
  
  return {
    message,
    confidence: 0.85,
    reasoning: `Vehicle-contextual response for ${analysis.intent} intent addressing: "${customerMessage.substring(0, 50)}..."`,
    vehicleContext: analysis.vehicleRecognition,
    followUpScheduled: analysis.urgency === 'high',
    inventoryMentioned
  };
};

const generateDirectFallbackResponse = async (
  context: EnhancedConversationContext,
  customerMessage?: string
): Promise<EnhancedAIResponse> => {
  const formattedName = formatProperName(context.leadName);
  const greeting = formattedName ? `${formattedName}, ` : '';
  
  let message = `${greeting}thanks for reaching out! I'm here to help you with any questions about our vehicles or to assist you in finding the perfect match for your needs.`;
  
  // Add context based on what they said if available
  if (customerMessage) {
    if (customerMessage.toLowerCase().includes('price') || customerMessage.toLowerCase().includes('cost')) {
      message += ' I can definitely help you with pricing information.';
    } else if (customerMessage.toLowerCase().includes('test drive') || customerMessage.toLowerCase().includes('appointment')) {
      message += ' I can help you schedule a test drive or appointment.';
    } else if (customerMessage.toLowerCase().includes('available') || customerMessage.toLowerCase().includes('inventory')) {
      message += ' I can show you what we have available in our inventory.';
    }
  }
  
  message += ' What can I help you with today?';
  
  return {
    message,
    confidence: 0.7,
    reasoning: `Direct contextual fallback ${customerMessage ? `addressing: "${customerMessage.substring(0, 50)}..."` : 'response'}`,
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
