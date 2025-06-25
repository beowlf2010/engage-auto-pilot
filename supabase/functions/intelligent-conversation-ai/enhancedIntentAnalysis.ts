// Enhanced intent analysis with better context awareness and customer message understanding

import { detectEnhancedObjectionSignals, EnhancedObjectionSignal } from './enhancedObjectionDetection.ts';
import { formatProperName, getFirstName } from './nameFormatter.ts';

export interface EnhancedIntentAnalysis {
  primaryIntent: 'competitor_purchase' | 'vehicle_inquiry' | 'expressing_interest' | 'asking_question' | 'providing_info' | 'objection' | 'ready_to_buy' | 'general';
  confidence: number;
  customerContext: {
    mentionedVehicle: string | null;
    isFollowUp: boolean;
    emotionalTone: 'positive' | 'neutral' | 'negative' | 'excited';
    urgencyLevel: 'low' | 'medium' | 'high';
  };
  responseStrategy: 'congratulate_competitor_purchase' | 'acknowledge_and_engage' | 'provide_info' | 'ask_discovery' | 'address_concern' | 'move_to_action';
  suggestedResponse: string | null;
  objectionSignals?: EnhancedObjectionSignal[];
}

export const analyzeEnhancedCustomerIntent = (
  customerMessage: string,
  conversationHistory: string,
  vehicleInterest: string,
  leadName: string
): EnhancedIntentAnalysis => {
  const message = customerMessage.toLowerCase().trim();
  const history = conversationHistory.toLowerCase();
  
  // Use only the first name for responses
  const firstName = getFirstName(leadName) || 'there';
  
  // First, check for objection signals (including competitor purchases)
  const objectionSignals = detectEnhancedObjectionSignals(customerMessage, conversationHistory);
  
  // If competitor purchase is detected, this takes highest priority
  if (objectionSignals.length > 0 && objectionSignals[0].type === 'competitor_purchase') {
    return {
      primaryIntent: 'competitor_purchase',
      confidence: objectionSignals[0].confidence,
      customerContext: {
        mentionedVehicle: vehicleInterest,
        isFollowUp: history.includes('finn') || history.includes('jason pilger'),
        emotionalTone: 'neutral',
        urgencyLevel: 'low'
      },
      responseStrategy: 'congratulate_competitor_purchase',
      suggestedResponse: `Congratulations on your new vehicle, ${firstName}! I'm sure you'll love it. Thank you for considering us during your search. If you ever need service, parts, or have friends or family looking for their next vehicle, please don't hesitate to reach out. We'd love to help in the future!`,
      objectionSignals
    };
  }
  
  // Extract mentioned vehicles from the message
  const vehicleKeywords = ['silverado', 'tahoe', 'suburban', 'blazer', 'equinox', 'traverse', 'camaro', 'corvette', 'malibu'];
  const mentionedVehicle = vehicleKeywords.find(v => message.includes(v)) || 
    (vehicleInterest && vehicleInterest.toLowerCase().includes('chevrolet') ? vehicleInterest : null);

  // Detect if this is a follow-up to previous conversation
  const isFollowUp = history.includes('finn') || history.includes('jason pilger') || 
    conversationHistory.split('\n').filter(line => line.trim()).length > 2;

  // Analyze emotional tone
  let emotionalTone: 'positive' | 'neutral' | 'negative' | 'excited' = 'neutral';
  const positiveWords = ['great', 'love', 'excellent', 'perfect', 'amazing', 'interested', 'yes', 'thanks', 'awesome'];
  const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'no', 'not interested', 'cancel', 'stop'];
  const excitedWords = ['!', 'wow', 'fantastic', 'definitely', 'absolutely'];
  
  if (positiveWords.some(word => message.includes(word))) emotionalTone = 'positive';
  if (negativeWords.some(word => message.includes(word))) emotionalTone = 'negative';
  if (excitedWords.some(word => message.includes(word)) || customerMessage.includes('!')) emotionalTone = 'excited';

  // Determine primary intent with better context awareness
  let primaryIntent: EnhancedIntentAnalysis['primaryIntent'] = 'general';
  let confidence = 0.5;
  let responseStrategy: EnhancedIntentAnalysis['responseStrategy'] = 'acknowledge_and_engage';

  // Check for other objections first
  if (objectionSignals.length > 0) {
    primaryIntent = 'objection';
    confidence = objectionSignals[0].confidence;
    responseStrategy = 'address_concern';
  }
  // Vehicle inquiry detection
  else if (mentionedVehicle || message.includes('truck') || message.includes('car') || message.includes('suv')) {
    primaryIntent = 'vehicle_inquiry';
    confidence = 0.8;
    responseStrategy = 'acknowledge_and_engage';
  }
  // Interest expression detection
  else if (message.includes('interested') || message.includes('looking for') || message.includes('want') || 
      message.includes('need') || emotionalTone === 'positive') {
    primaryIntent = 'expressing_interest';
    confidence = 0.85;
    responseStrategy = 'acknowledge_and_engage';
  }
  // Question detection
  else if (message.includes('?') || message.startsWith('what') || message.startsWith('how') || 
      message.startsWith('when') || message.startsWith('where') || message.includes('tell me')) {
    primaryIntent = 'asking_question';
    confidence = 0.9;
    responseStrategy = 'provide_info';
  }
  // Ready to buy signals
  else if (message.includes('buy') || message.includes('purchase') || message.includes('financing') || 
      message.includes('payment') || message.includes('schedule') || message.includes('appointment')) {
    primaryIntent = 'ready_to_buy';
    confidence = 0.9;
    responseStrategy = 'move_to_action';
  }

  // Determine urgency level
  let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';
  if (primaryIntent === 'ready_to_buy' || message.includes('today') || message.includes('asap')) urgencyLevel = 'high';
  if (primaryIntent === 'objection' || emotionalTone === 'negative') urgencyLevel = 'low';

  // Generate contextual suggested response with first name only
  const suggestedResponse = generateContextualResponse(
    primaryIntent,
    mentionedVehicle,
    firstName,
    vehicleInterest,
    emotionalTone,
    responseStrategy,
    objectionSignals
  );

  return {
    primaryIntent,
    confidence,
    customerContext: {
      mentionedVehicle,
      isFollowUp,
      emotionalTone,
      urgencyLevel
    },
    responseStrategy,
    suggestedResponse,
    objectionSignals
  };
};

const generateContextualResponse = (
  intent: EnhancedIntentAnalysis['primaryIntent'],
  mentionedVehicle: string | null,
  firstName: string,
  vehicleInterest: string,
  tone: 'positive' | 'neutral' | 'negative' | 'excited',
  strategy: EnhancedIntentAnalysis['responseStrategy'],
  objectionSignals?: EnhancedObjectionSignal[]
): string => {
  const vehicle = mentionedVehicle || vehicleInterest || 'the vehicle you\'re interested in';
  const cleanVehicle = vehicle.replace(/"/g, '').trim();

  // Handle objections with specific responses
  if (objectionSignals && objectionSignals.length > 0) {
    const primarySignal = objectionSignals[0];
    
    switch (primarySignal.suggestedResponse) {
      case 'congratulate_competitor_purchase':
        return `Congratulations on your new vehicle, ${firstName}! I'm sure you'll love it. Thank you for considering us during your search. If you ever need service, parts, or have friends or family looking for their next vehicle, please don't hesitate to reach out. We'd love to help in the future!`;
      case 'address_pricing_discrepancy':
        return `I completely understand your confusion about the pricing, ${firstName}. Online prices typically show the base MSRP and don't include additional packages, options, or dealer fees that might apply to ${cleanVehicle}. Let me clarify exactly what's included in that price difference so there are no surprises. What specific features or packages were mentioned when you called?`;
      case 'empathetic_pricing_response':
        return `I totally understand that pricing surprise, ${firstName} - nobody likes unexpected costs when they're excited about ${cleanVehicle}. Let's work together to find the right solution within your budget. What monthly payment would feel comfortable for you, and are there specific features that are must-haves versus nice-to-haves?`;
      case 'address_price':
        return `I understand budget is a major consideration, ${firstName}. Let's find a way to make ${cleanVehicle} work for you. What monthly payment range feels comfortable? We have financing options and sometimes incentives that can help bring the cost down.`;
      case 'probe_deeper':
        return `I want to make sure I address your main concern about ${cleanVehicle}, ${firstName}. Is it the pricing, timing, or specific features that are holding you back?`;
    }
  }

  // Handle other intents with first name only
  switch (strategy) {
    case 'acknowledge_and_engage':
      if (intent === 'vehicle_inquiry') {
        return `Hi ${firstName}! I see you're interested in the ${cleanVehicle}. That's a fantastic choice! What aspects are most important to you - performance, features, or pricing?`;
      }
      if (intent === 'expressing_interest') {
        return `That's great to hear, ${firstName}! The ${cleanVehicle} is really popular right now. What drew you to this particular model?`;
      }
      break;

    case 'provide_info':
      return `Great question about the ${cleanVehicle}, ${firstName}! I'd be happy to provide those details. Are you most interested in specs, pricing, or availability?`;

    case 'move_to_action':
      return `Perfect timing, ${firstName}! I can definitely help you move forward with the ${cleanVehicle}. When would be a good time for you to take a look in person?`;

    case 'address_concern':
      return `I understand your concerns about the ${cleanVehicle}, ${firstName}. What's your main hesitation? I'm here to help address any questions you might have.`;

    default:
      return `Hi ${firstName}! Thanks for reaching out about the ${cleanVehicle}. I'm here to help make your car shopping experience as smooth as possible. What would be most helpful for you to know?`;
  }

  return `Hi ${firstName}! I'm here to help with the ${cleanVehicle}. What would be most helpful for you to know?`;
};
