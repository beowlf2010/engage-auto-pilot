
// Enhanced intent analysis with diverse response variations
import { responseVariationService } from '../../../src/services/responseVariationService.ts';

export interface CustomerContext {
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  priceRange?: string;
  timeframe?: string;
  familySize?: number;
  currentVehicle?: string;
  conversationLength: number;
}

export interface ObjectionSignal {
  type: string;
  confidence: number;
  keywords: string[];
  suggestedResponse: string;
}

export interface EnhancedIntentResult {
  primaryIntent: string;
  confidence: number;
  responseStrategy: string;
  suggestedResponse?: string;
  objectionSignals?: ObjectionSignal[];
  customerContext: CustomerContext;
}

// Diverse response templates for different intents
const intentResponseTemplates = {
  general: {
    casual: [
      "Thanks for reaching out! What's on your mind about {vehicle}?",
      "Hey! What questions do you have about {vehicle}?",
      "What can I help you with regarding {vehicle}?"
    ],
    professional: [
      "Thank you for your interest in {vehicle}. How may I assist you?",
      "I'm here to help with any questions about {vehicle}. What would you like to know?",
      "How can I provide you with information about {vehicle}?"
    ],
    enthusiastic: [
      "Great to hear from you! I'm excited to help with {vehicle}!",
      "Awesome! Let's talk about that {vehicle} - what interests you most?",
      "Perfect timing! I'd love to share details about {vehicle}!"
    ]
  },
  asking_question: {
    casual: [
      "Great question! Let me help you out with that.",
      "I can definitely answer that for you!",
      "Good thinking! Here's what I know..."
    ],
    professional: [
      "That's an excellent question. I'm happy to provide that information.",
      "I'll be glad to address that inquiry for you.",
      "Thank you for asking. Here's the information you need..."
    ],
    enthusiastic: [
      "Love that question! I have exactly what you need to know!",
      "Perfect question! I'm excited to share this with you!",
      "Great minds think alike! Here's the scoop..."
    ]
  },
  showing_interest: {
    casual: [
      "That's awesome! I can tell you're really considering this seriously.",
      "I love your enthusiasm! Let's dive deeper into this.",
      "You've got great taste! Let me share more details."
    ],
    professional: [
      "I appreciate your interest. I'd be happy to provide additional details.",
      "Thank you for expressing interest. Let me share more information.",
      "It's great to see your enthusiasm. Here's what I can tell you..."
    ],
    enthusiastic: [
      "Yes! I can see you're as excited as I am about this!",
      "That's the spirit! Let's make this happen!",
      "I love your energy! This is going to be perfect for you!"
    ]
  },
  price_inquiry: {
    casual: [
      "Good question about pricing! Let me break that down for you.",
      "Money talk - I get it! Here's what we're looking at...",
      "Let's talk numbers! I've got all the pricing info."
    ],
    professional: [
      "I'd be happy to discuss the pricing structure with you.",
      "Let me provide you with detailed pricing information.",
      "I can walk you through all the financial options available."
    ],
    enthusiastic: [
      "Great question! I have some fantastic pricing options for you!",
      "Perfect timing for pricing! You're going to love what I can offer!",
      "Excellent! Let me show you how affordable this can be!"
    ]
  }
};

export const analyzeEnhancedCustomerIntent = (
  message: string,
  conversationHistory: string,
  vehicleInterest: string,
  leadName: string
): EnhancedIntentResult => {
  const messageLower = message.toLowerCase();
  
  // Check for competitor purchase first (highest priority)
  if (detectCompetitorPurchase(messageLower)) {
    return {
      primaryIntent: 'competitor_purchase',
      confidence: 0.95,
      responseStrategy: 'congratulate_and_maintain_relationship',
      suggestedResponse: generateCompetitorPurchaseResponse(leadName),
      customerContext: {
        urgencyLevel: 'low',
        conversationLength: conversationHistory.split('\n').length
      }
    };
  }

  // Analyze intent with enhanced context
  const intentAnalysis = analyzeMessageIntent(messageLower, conversationHistory);
  const customerContext = buildCustomerContext(messageLower, conversationHistory);
  
  // Generate diverse response based on intent
  const suggestedResponse = generateDiverseResponse(
    intentAnalysis.intent,
    leadName,
    vehicleInterest,
    customerContext
  );

  return {
    primaryIntent: intentAnalysis.intent,
    confidence: intentAnalysis.confidence,
    responseStrategy: intentAnalysis.strategy,
    suggestedResponse,
    objectionSignals: intentAnalysis.objections,
    customerContext
  };
};

const detectCompetitorPurchase = (message: string): boolean => {
  const purchasePatterns = [
    /bought.*from/i, /purchased.*at/i, /got.*from/i, /went with/i,
    /decided.*on/i, /chose.*instead/i, /found.*better/i,
    /already.*bought/i, /just.*purchased/i, /ended up/i
  ];
  
  const competitorIndicators = [
    'toyota', 'honda', 'ford', 'nissan', 'hyundai', 'kia', 'mazda',
    'dealer', 'dealership', 'lot', 'another', 'different'
  ];
  
  return purchasePatterns.some(pattern => pattern.test(message)) &&
         competitorIndicators.some(comp => message.includes(comp));
};

const analyzeMessageIntent = (message: string, history: string) => {
  // Enhanced intent detection with multiple indicators
  const questionWords = ['what', 'how', 'when', 'where', 'why', 'which', 'can you', 'do you', 'is it', 'are there'];
  const interestWords = ['interested', 'like', 'love', 'want', 'need', 'looking for', 'considering'];
  const priceWords = ['price', 'cost', 'payment', 'finance', 'lease', 'down payment', 'monthly'];
  
  let intent = 'general';
  let confidence = 0.5;
  let strategy = 'acknowledge_and_engage';
  const objections: ObjectionSignal[] = [];

  if (questionWords.some(word => message.includes(word))) {
    intent = 'asking_question';
    confidence = 0.9;
    strategy = 'provide_detailed_info';
  } else if (interestWords.some(word => message.includes(word))) {
    intent = 'showing_interest';
    confidence = 0.8;
    strategy = 'nurture_interest';
  } else if (priceWords.some(word => message.includes(word))) {
    intent = 'price_inquiry';
    confidence = 0.85;
    strategy = 'address_pricing';
  }

  return { intent, confidence, strategy, objections };
};

const buildCustomerContext = (message: string, history: string): CustomerContext => {
  const urgencyWords = {
    critical: ['asap', 'urgent', 'immediately', 'right now', 'today'],
    high: ['soon', 'quickly', 'this week', 'need by', 'deadline'],
    medium: ['next week', 'this month', 'planning', 'thinking'],
    low: ['someday', 'eventually', 'future', 'maybe', 'considering']
  };

  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  
  for (const [level, words] of Object.entries(urgencyWords)) {
    if (words.some(word => message.includes(word))) {
      urgencyLevel = level as any;
      break;
    }
  }

  return {
    urgencyLevel,
    conversationLength: history.split('\n').length
  };
};

const generateDiverseResponse = (
  intent: string,
  leadName: string,
  vehicleInterest: string,
  context: CustomerContext
): string => {
  // Use response variation service for consistent diversity
  const config = {
    leadId: `temp_${Date.now()}`, // Temporary ID for this generation
    leadName,
    vehicleInterest,
    timeOfDay: getTimeOfDay(),
    conversationStage: context.conversationLength <= 2 ? 'initial' as const : 'follow_up' as const
  };

  // Try to generate contextual response first
  try {
    return responseVariationService.generateContextualResponse(config);
  } catch (error) {
    console.log('Falling back to template-based response');
  }

  // Fallback to template-based responses
  const templates = intentResponseTemplates[intent as keyof typeof intentResponseTemplates] || intentResponseTemplates.general;
  const personality = selectPersonalityForContext(context);
  const templateSet = templates[personality] || templates.casual;
  
  const template = templateSet[Math.floor(Math.random() * templateSet.length)];
  return template.replace('{vehicle}', vehicleInterest || 'your vehicle of interest');
};

const selectPersonalityForContext = (context: CustomerContext): 'casual' | 'professional' | 'enthusiastic' => {
  if (context.urgencyLevel === 'critical' || context.urgencyLevel === 'high') {
    return 'professional';
  }
  if (context.conversationLength > 5) {
    return Math.random() < 0.6 ? 'casual' : 'enthusiastic';
  }
  return ['casual', 'professional', 'enthusiastic'][Math.floor(Math.random() * 3)] as any;
};

const generateCompetitorPurchaseResponse = (leadName: string): string => {
  const responses = [
    `Congratulations on your new vehicle, ${leadName}! I hope you absolutely love it. Thanks for considering us during your search.`,
    `That's wonderful news, ${leadName}! I'm sure you'll be very happy with your choice. We appreciate you thinking of us.`,
    `Congratulations, ${leadName}! I hope your new vehicle serves you well. Thank you for giving us the opportunity to help.`,
    `So happy for you, ${leadName}! Enjoy your new ride. We're always here if you need anything in the future.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};
