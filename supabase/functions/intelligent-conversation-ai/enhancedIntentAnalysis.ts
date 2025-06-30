// Enhanced intent analysis with diverse response variations
// Response variation logic moved directly into edge function to avoid import issues

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

// Diverse response templates for different intents - moved from responseVariationService
const intentResponseTemplates = {
  general: {
    casual: [
      "Thanks for reaching out! What's on your mind about {vehicle}?",
      "Hey! What questions do you have about {vehicle}?",
      "What can I help you with regarding {vehicle}?",
      "Hi there! What interests you most about {vehicle}?",
      "What would you like to know about {vehicle}?",
      "Ready to chat about {vehicle} - what's your main question?",
      "What's the most important thing about {vehicle} for you?"
    ],
    professional: [
      "Thank you for your interest in {vehicle}. How may I assist you?",
      "I'm here to help with any questions about {vehicle}. What would you like to know?",
      "How can I provide you with information about {vehicle}?",
      "I'd be pleased to discuss {vehicle} with you. What interests you most?",
      "What specific information about {vehicle} would be most valuable to you?",
      "I'm ready to help you learn more about {vehicle}. What questions do you have?",
      "How can I best assist you with {vehicle} today?"
    ],
    enthusiastic: [
      "Great to hear from you! I'm excited to help with {vehicle}!",
      "Awesome! Let's talk about that {vehicle} - what interests you most?",
      "Perfect timing! I'd love to share details about {vehicle}!",
      "Fantastic choice! What would you like to know about {vehicle}?",
      "I love talking about {vehicle}! What questions can I answer?",
      "You picked a great one! What draws you to {vehicle}?",
      "Excellent taste! What's most important to you about {vehicle}?"
    ]
  },
  asking_question: {
    casual: [
      "Great question! Let me help you out with that.",
      "I can definitely answer that for you!",
      "Good thinking! Here's what I know...",
      "Perfect question! I've got the info you need.",
      "Smart question! Let me share what I know.",
      "I love that question! Here's the scoop...",
      "Excellent question! I can help with that."
    ],
    professional: [
      "That's an excellent question. I'm happy to provide that information.",
      "I'll be glad to address that inquiry for you.",
      "Thank you for asking. Here's the information you need...",
      "That's a very good question. Allow me to explain...",
      "I appreciate your question. Here's what I can tell you...",
      "That's exactly the right question to ask. Here's the answer...",
      "Thank you for bringing that up. Let me clarify..."
    ],
    enthusiastic: [
      "Love that question! I have exactly what you need to know!",
      "Perfect question! I'm excited to share this with you!",
      "Great minds think alike! Here's the scoop...",
      "Yes! That's exactly what you should be asking!",
      "Fantastic question! You're going to love this answer!",
      "I'm so glad you asked! Here's what's amazing...",
      "Perfect timing for that question! Here's the exciting part..."
    ]
  },
  showing_interest: {
    casual: [
      "That's awesome! I can tell you're really considering this seriously.",
      "I love your enthusiasm! Let's dive deeper into this.",
      "You've got great taste! Let me share more details.",
      "Nice choice! I can tell you more about why it's so popular.",
      "Smart thinking! Here's what makes this special...",
      "I can see why you're interested! Let me tell you more.",
      "Great eye! You're looking at something really special."
    ],
    professional: [
      "I appreciate your interest. I'd be happy to provide additional details.",
      "Thank you for expressing interest. Let me share more information.",
      "It's great to see your enthusiasm. Here's what I can tell you...",
      "I'm pleased you're considering this option. Allow me to elaborate...",
      "Your interest is well-founded. Here are the key benefits...",
      "I can see why this appeals to you. Let me provide more context...",
      "That's an excellent choice to consider. Here's why..."
    ],
    enthusiastic: [
      "Yes! I can see you're as excited as I am about this!",
      "That's the spirit! Let's make this happen!",
      "I love your energy! This is going to be perfect for you!",
      "Absolutely! You're going to be thrilled with this choice!",
      "I'm getting excited just thinking about you with this!",
      "This is going to be amazing for you! Here's why...",
      "I can already picture you loving this! Let me tell you more..."
    ]
  },
  price_inquiry: {
    casual: [
      "Good question about pricing! Let me break that down for you.",
      "Money talk - I get it! Here's what we're looking at...",
      "Let's talk numbers! I've got all the pricing info.",
      "Smart to ask about price! Here's the deal...",
      "Great question! Let me give you the full picture on pricing.",
      "I appreciate you asking! Here's how the pricing works...",
      "Perfect timing for price talk! Here's what you need to know..."
    ],
    professional: [
      "I'd be happy to discuss the pricing structure with you.",
      "Let me provide you with detailed pricing information.",
      "I can walk you through all the financial options available.",
      "Allow me to outline the pricing details for you.",
      "I'll provide you with comprehensive pricing information.",
      "Let me explain the various pricing options we have.",
      "I'd be pleased to discuss the investment details with you."
    ],
    enthusiastic: [
      "Great question! I have some fantastic pricing options for you!",
      "Perfect timing for pricing! You're going to love what I can offer!",
      "Excellent! Let me show you how affordable this can be!",
      "I'm excited to share our pricing with you!",
      "This is the best part - wait until you see our pricing!",
      "You're going to be pleasantly surprised by our pricing!",
      "I love talking pricing because we have great options!"
    ]
  }
};

// Response variation service logic moved directly into edge function
class ResponseVariationServiceLocal {
  private responseMemory = new Map<string, string[]>();

  selectPersonality(urgencyLevel: string, conversationLength: number): 'casual' | 'professional' | 'enthusiastic' {
    if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
      return 'professional';
    }
    if (conversationLength > 5) {
      return Math.random() < 0.6 ? 'casual' : 'enthusiastic';
    }
    const personalities: ('casual' | 'professional' | 'enthusiastic')[] = 
      ['casual', 'professional', 'enthusiastic'];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  selectRandomAvoid<T>(array: T[], avoid: string[]): T {
    const filtered = array.filter(item => 
      !avoid.some(prev => prev.includes(String(item)))
    );
    return filtered.length > 0 ? this.selectRandom(filtered) : this.selectRandom(array);
  }

  rememberResponse(leadId: string, response: string): void {
    const responses = this.responseMemory.get(leadId) || [];
    responses.push(response);
    
    // Keep only last 5 responses per lead
    if (responses.length > 5) {
      responses.shift();
    }
    
    this.responseMemory.set(leadId, responses);
  }

  generateDiverseFallback(leadName: string, vehicleInterest?: string): string {
    const fallbacks = [
      `Hi ${leadName}! I'm Finn with Jason Pilger Chevrolet. How can I help you today?`,
      `Hello ${leadName}! Thanks for reaching out. What can I assist you with?`,
      `Hey ${leadName}! I'm here to help with any questions you might have.`,
      `Hi there ${leadName}! What brings you our way today?`,
      `Hello ${leadName}! Ready to help you find exactly what you're looking for.`,
      `Hi ${leadName}! Let's make your car shopping experience great!`,
      `Hey ${leadName}! What can I do for you today?`,
      `Hello ${leadName}! I'm excited to help you out.`,
      `Hi ${leadName}! What questions do you have for me?`,
      `Hello ${leadName}! I'm here to make this process easy for you.`
    ];
    
    if (vehicleInterest) {
      fallbacks.push(
        `Hi ${leadName}! I see you're interested in ${vehicleInterest}. Let's chat!`,
        `Hello ${leadName}! The ${vehicleInterest} is a great choice. What would you like to know?`,
        `Hey ${leadName}! Ready to talk about that ${vehicleInterest}?`,
        `Hi ${leadName}! I have some great info about ${vehicleInterest}. What interests you most?`,
        `Hello ${leadName}! ${vehicleInterest} caught your eye - great choice! What questions do you have?`
      );
    }
    
    return this.selectRandom(fallbacks);
  }
}

const responseVariationService = new ResponseVariationServiceLocal();

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
  // Get previous responses for this lead to avoid repetition
  const leadId = `temp_${leadName}_${Date.now()}`;
  const previousResponses = responseVariationService.responseMemory?.get(leadId) || [];

  // Select personality based on context
  const personality = responseVariationService.selectPersonality(context.urgencyLevel, context.conversationLength);
  
  // Get templates for the intent
  const templates = intentResponseTemplates[intent as keyof typeof intentResponseTemplates] || intentResponseTemplates.general;
  const templateSet = templates[personality] || templates.casual;
  
  // Select a diverse template
  const template = responseVariationService.selectRandomAvoid(templateSet, previousResponses);
  const response = template.replace('{vehicle}', vehicleInterest || 'your vehicle of interest');
  
  // Remember this response
  responseVariationService.rememberResponse(leadId, response);
  
  return response;
};

const generateCompetitorPurchaseResponse = (leadName: string): string => {
  const responses = [
    `Congratulations on your new vehicle, ${leadName}! I hope you absolutely love it. Thanks for considering us during your search.`,
    `That's wonderful news, ${leadName}! I'm sure you'll be very happy with your choice. We appreciate you thinking of us.`,
    `Congratulations, ${leadName}! I hope your new vehicle serves you well. Thank you for giving us the opportunity to help.`,
    `So happy for you, ${leadName}! Enjoy your new ride. We're always here if you need anything in the future.`,
    `Fantastic news, ${leadName}! I'm thrilled you found the perfect vehicle. Best wishes with your new purchase!`,
    `That's great to hear, ${leadName}! Thanks for letting me know. Hope you love every mile in your new vehicle!`
  ];
  
  return responseVariationService.selectRandom(responses);
};

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};
