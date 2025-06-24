
// Enhanced intent analysis with better context awareness and customer message understanding

export interface EnhancedIntentAnalysis {
  primaryIntent: 'vehicle_inquiry' | 'expressing_interest' | 'asking_question' | 'providing_info' | 'objection' | 'ready_to_buy' | 'general';
  confidence: number;
  customerContext: {
    mentionedVehicle: string | null;
    isFollowUp: boolean;
    emotionalTone: 'positive' | 'neutral' | 'negative' | 'excited';
    urgencyLevel: 'low' | 'medium' | 'high';
  };
  responseStrategy: 'acknowledge_and_engage' | 'provide_info' | 'ask_discovery' | 'address_concern' | 'move_to_action';
  suggestedResponse: string | null;
}

export const analyzeEnhancedCustomerIntent = (
  customerMessage: string,
  conversationHistory: string,
  vehicleInterest: string,
  leadName: string
): EnhancedIntentAnalysis => {
  const message = customerMessage.toLowerCase().trim();
  const history = conversationHistory.toLowerCase();
  
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

  // Vehicle inquiry detection
  if (mentionedVehicle || message.includes('truck') || message.includes('car') || message.includes('suv')) {
    primaryIntent = 'vehicle_inquiry';
    confidence = 0.8;
    responseStrategy = 'acknowledge_and_engage';
  }

  // Interest expression detection
  if (message.includes('interested') || message.includes('looking for') || message.includes('want') || 
      message.includes('need') || emotionalTone === 'positive') {
    primaryIntent = 'expressing_interest';
    confidence = 0.85;
    responseStrategy = 'acknowledge_and_engage';
  }

  // Question detection
  if (message.includes('?') || message.startsWith('what') || message.startsWith('how') || 
      message.startsWith('when') || message.startsWith('where') || message.includes('tell me')) {
    primaryIntent = 'asking_question';
    confidence = 0.9;
    responseStrategy = 'provide_info';
  }

  // Ready to buy signals
  if (message.includes('buy') || message.includes('purchase') || message.includes('financing') || 
      message.includes('payment') || message.includes('schedule') || message.includes('appointment')) {
    primaryIntent = 'ready_to_buy';
    confidence = 0.9;
    responseStrategy = 'move_to_action';
  }

  // Objection detection
  if (message.includes('expensive') || message.includes('think about') || message.includes('not sure') ||
      emotionalTone === 'negative') {
    primaryIntent = 'objection';
    confidence = 0.8;
    responseStrategy = 'address_concern';
  }

  // Determine urgency level
  let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';
  if (primaryIntent === 'ready_to_buy' || message.includes('today') || message.includes('asap')) urgencyLevel = 'high';
  if (primaryIntent === 'objection' || emotionalTone === 'negative') urgencyLevel = 'low';

  // Generate contextual suggested response
  const suggestedResponse = generateContextualResponse(
    primaryIntent,
    mentionedVehicle,
    leadName,
    vehicleInterest,
    emotionalTone,
    responseStrategy
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
    suggestedResponse
  };
};

const generateContextualResponse = (
  intent: EnhancedIntentAnalysis['primaryIntent'],
  mentionedVehicle: string | null,
  leadName: string,
  vehicleInterest: string,
  tone: 'positive' | 'neutral' | 'negative' | 'excited',
  strategy: EnhancedIntentAnalysis['responseStrategy']
): string => {
  const vehicle = mentionedVehicle || vehicleInterest || 'the vehicle you\'re interested in';
  const cleanVehicle = vehicle.replace(/"/g, '').trim();

  switch (strategy) {
    case 'acknowledge_and_engage':
      if (intent === 'vehicle_inquiry') {
        return `Hi ${leadName}! I see you're interested in the ${cleanVehicle}. That's a fantastic choice! What aspects are most important to you - performance, features, or pricing?`;
      }
      if (intent === 'expressing_interest') {
        return `That's great to hear, ${leadName}! The ${cleanVehicle} is really popular right now. What drew you to this particular model?`;
      }
      break;

    case 'provide_info':
      return `Great question about the ${cleanVehicle}, ${leadName}! I'd be happy to provide those details. Are you most interested in specs, pricing, or availability?`;

    case 'move_to_action':
      return `Perfect timing, ${leadName}! I can definitely help you move forward with the ${cleanVehicle}. When would be a good time for you to take a look in person?`;

    case 'address_concern':
      return `I understand your concerns about the ${cleanVehicle}, ${leadName}. What's your main hesitation? I'm here to help address any questions you might have.`;

    default:
      return `Hi ${leadName}! Thanks for reaching out about the ${cleanVehicle}. I'm here to help make your car shopping experience as smooth as possible. What would be most helpful for you to know?`;
  }

  return `Hi ${leadName}! I'm here to help with the ${cleanVehicle}. What would be most helpful for you to know?`;
};
