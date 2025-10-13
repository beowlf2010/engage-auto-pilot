// Centralized service for managing diverse AI response templates
export interface ResponseTemplate {
  greeting: string;
  opener: string;
  vehicleReference?: string;
  callToAction: string;
  personality: 'casual' | 'professional' | 'enthusiastic' | 'warm';
}

export interface ResponseVariationConfig {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  conversationStage: 'initial' | 'follow_up' | 'warm_up' | 'closing';
  lastResponseType?: string;
  customerMessage?: string; // NEW: Direct customer message for context
}

class ResponseVariationService {
  private usedResponses = new Map<string, Set<string>>();
  private responseMemory = new Map<string, string[]>();

  // More professional greeting variations
  private greetings = {
    casual: [
      "Hi {name}!", "Hello {name}!", "Hi there {name}!",
      "Good to hear from you {name}!", "Thanks for reaching out {name}!"
    ],
    professional: [
      "Hello {name},", "Good morning {name},", "Good afternoon {name},", 
      "Thank you for contacting us {name},", "I hope this message finds you well {name},",
      "It's great to connect with you {name},"
    ],
    enthusiastic: [
      "Hi {name}! Great to connect!", "Hello {name}! Thanks for reaching out!",
      "Hi there {name}! I'm here to help!", "Hello {name}! Ready to assist you!"
    ],
    warm: [
      "Hi {name}, hope you're having a great day!", "Hello {name}, thanks for getting in touch!",
      "Hi {name}, I'm here and ready to help!", "Hello there {name}! Nice to connect!"
    ]
  };

  // More professional vehicle references
  private vehicleReferences = [
    "I understand you're interested in the {vehicle}",
    "I see you're considering the {vehicle}",
    "Regarding the {vehicle} you inquired about",
    "I'd be happy to help with information about the {vehicle}",
    "Let me assist you with the {vehicle}",
    "I can provide details about the {vehicle}",
    "The {vehicle} is an excellent choice to consider"
  ];

  // More professional call-to-action variations
  private callToActions = {
    question_based: [
      "What questions can I answer for you?",
      "What information would be most helpful?",
      "How can I best assist you today?",
      "What would you like to know more about?",
      "Is there anything specific I can help clarify?"
    ],
    offer_based: [
      "I'd be happy to provide more information.",
      "Let me know how I can help!",
      "I'm here to assist you with any questions.",
      "I can provide all the details you need.",
      "I'm ready to help you find the right solution."
    ],
    action_based: [
      "Would you like to discuss your options?",
      "Should we go over the details?",
      "Would it be helpful to review the information together?",
      "Shall we discuss what works best for you?",
      "Would you like me to provide more specific information?"
    ],
    casual: [
      "What can I help you with?",
      "How can I assist you?",
      "What would you like to know?",
      "How can I be of help?",
      "What information do you need?"
    ]
  };

  // Time-based openers
  private timeBasedOpeners = {
    morning: [
      "Hope you're starting your day well!",
      "Good morning!",
      "Starting the day with some car shopping?",
      "Early bird looking for the perfect ride?"
    ],
    afternoon: [
      "Hope your day is going great!",
      "Perfect timing to talk cars!",
      "How's your afternoon going?",
      "Great time to explore your options!"
    ],
    evening: [
      "Hope you had a good day!",
      "Evening car shopping - I like it!",
      "End the day on a high note!",
      "Perfect time to plan your next adventure!"
    ]
  };

  // Generate diverse response based on configuration
  generateVariedResponse(config: ResponseVariationConfig): string {
    const personality = this.selectPersonality(config);
    const usedKey = `${config.leadId}_${config.conversationStage}`;
    
    // Get previously used responses for this lead
    const previousResponses = this.responseMemory.get(config.leadId) || [];
    
    // Select varied components
    const greeting = this.selectRandomAvoid(
      this.greetings[personality], 
      previousResponses
    ).replace('{name}', config.leadName || 'there');
    
    const vehicleRef = config.vehicleInterest ? 
      this.selectRandomAvoid(this.vehicleReferences, previousResponses)
        .replace('{vehicle}', config.vehicleInterest) : '';
    
    const timeOpener = Math.random() < 0.3 ? 
      this.selectRandom(this.timeBasedOpeners[config.timeOfDay]) : '';
    
    const callToAction = this.selectCallToAction(personality, previousResponses);
    
    // Construct message with natural flow
    const parts = [greeting, timeOpener, vehicleRef, callToAction].filter(Boolean);
    const response = parts.join(' ').replace(/\s+/g, ' ').trim();
    
    // Remember this response
    this.rememberResponse(config.leadId, response);
    
    return response;
  }

  // Enhanced response generation with customer message context
  generateContextualResponse(config: ResponseVariationConfig): string {
    const personality = this.selectPersonality(config);
    
    // Analyze customer message for context if provided
    let responseContext = 'general';
    if (config.customerMessage) {
      const msgLower = config.customerMessage.toLowerCase();
      if (msgLower.includes('price') || msgLower.includes('cost')) {
        responseContext = 'pricing';
      } else if (msgLower.includes('test drive') || msgLower.includes('appointment')) {
        responseContext = 'scheduling';
      } else if (msgLower.includes('available') || msgLower.includes('inventory')) {
        responseContext = 'availability';
      } else if (msgLower.includes('thank') || msgLower.includes('appreciate')) {
        responseContext = 'appreciation';
      }
    }
    
    const greeting = this.selectRandomAvoid(
      this.greetings[personality], 
      this.responseMemory.get(config.leadId) || []
    ).replace('{name}', config.leadName || 'there');
    
    // Context-aware response building
    let contextualOpener = '';
    if (responseContext === 'pricing' && config.customerMessage) {
      contextualOpener = "I understand you're asking about pricing.";
    } else if (responseContext === 'scheduling' && config.customerMessage) {
      contextualOpener = "I'd be happy to help you schedule something.";
    } else if (responseContext === 'availability' && config.customerMessage) {
      contextualOpener = "Let me help you with availability information.";
    } else if (responseContext === 'appreciation' && config.customerMessage) {
      contextualOpener = "You're very welcome!";
    }
    
    const vehicleRef = config.vehicleInterest && Math.random() < 0.6 ? 
      this.selectRandomAvoid(this.vehicleReferences, this.responseMemory.get(config.leadId) || [])
        .replace('{vehicle}', config.vehicleInterest) : '';
    
    const callToAction = this.selectCallToAction(personality, this.responseMemory.get(config.leadId) || []);
    
    // Construct message with natural flow
    const parts = [greeting, contextualOpener, vehicleRef, callToAction].filter(Boolean);
    const response = parts.join(' ').replace(/\s+/g, ' ').trim();
    
    // Remember this response
    this.rememberResponse(config.leadId, response);
    
    return response;
  }

  // Enhanced fallback with more professional options
  generateDiverseFallback(leadName: string, vehicleInterest?: string, customerMessage?: string): string {
    const fallbacks = [
      `Hi ${leadName}! I'm Tommy with U-J Chevrolet. How can I assist you today?`,
      `Hello ${leadName}! Thank you for reaching out. What information can I provide?`,
      `Hi there ${leadName}! I'm here to help with any questions you might have.`,
      `Hello ${leadName}! What can I help you with regarding your automotive needs?`,
      `Hi ${leadName}! I'm ready to assist you with finding the right vehicle.`,
      `Hello ${leadName}! Let me know how I can help you today.`,
      `Hi ${leadName}! What questions can I answer for you?`,
      `Hello ${leadName}! I'm here to provide the information you need.`
    ];
    
    // Add context-aware fallbacks if customer message is provided
    if (customerMessage) {
      const msgLower = customerMessage.toLowerCase();
      if (msgLower.includes('price') || msgLower.includes('cost')) {
        fallbacks.unshift(
          `Hi ${leadName}! I understand you're asking about pricing. I'd be happy to help with that information.`,
          `Hello ${leadName}! Let me assist you with pricing details.`
        );
      } else if (msgLower.includes('available') || msgLower.includes('inventory')) {
        fallbacks.unshift(
          `Hi ${leadName}! I can help you with availability information.`,
          `Hello ${leadName}! Let me check what we have available for you.`
        );
      }
    }
    
    if (vehicleInterest) {
      fallbacks.push(
        `Hi ${leadName}! I understand you're interested in ${vehicleInterest}. How can I help?`,
        `Hello ${leadName}! I'd be happy to provide information about ${vehicleInterest}.`
      );
    }
    
    return this.selectRandom(fallbacks);
  }

  private selectPersonality(config: ResponseVariationConfig): 'casual' | 'professional' | 'enthusiastic' | 'warm' {
    // More professional by default, especially for initial contacts
    if (config.conversationStage === 'initial') {
      return Math.random() < 0.7 ? 'professional' : 'warm';
    }
    if (config.conversationStage === 'closing') {
      return Math.random() < 0.6 ? 'professional' : 'warm';
    }
    
    // Analyze customer message tone if available
    if (config.customerMessage) {
      const msgLower = config.customerMessage.toLowerCase();
      if (msgLower.includes('thank') || msgLower.includes('appreciate')) {
        return 'warm';
      }
      if (msgLower.length > 50 && !msgLower.includes('!')) {
        return 'professional'; // Longer, more formal messages get professional responses
      }
    }
    
    const personalities: ('casual' | 'professional' | 'enthusiastic' | 'warm')[] = 
      ['professional', 'warm', 'professional', 'casual']; // Weighted toward professional
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  private selectCallToAction(personality: 'casual' | 'professional' | 'enthusiastic' | 'warm', previousResponses: string[]): string {
    let pool: string[];
    
    switch (personality) {
      case 'casual':
        pool = this.callToActions.casual;
        break;
      case 'professional':
        pool = this.callToActions.question_based;
        break;
      case 'enthusiastic':
        pool = this.callToActions.action_based;
        break;
      default:
        pool = this.callToActions.offer_based;
    }
    
    return this.selectRandomAvoid(pool, previousResponses);
  }

  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private selectRandomAvoid<T>(array: T[], avoid: string[]): T {
    const filtered = array.filter(item => 
      !avoid.some(prev => prev.includes(String(item)))
    );
    return filtered.length > 0 ? this.selectRandom(filtered) : this.selectRandom(array);
  }

  private rememberResponse(leadId: string, response: string): void {
    const responses = this.responseMemory.get(leadId) || [];
    responses.push(response);
    
    // Keep only last 5 responses per lead
    if (responses.length > 5) {
      responses.shift();
    }
    
    this.responseMemory.set(leadId, responses);
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  // Reset memory for testing or cleanup
  clearResponseMemory(leadId?: string): void {
    if (leadId) {
      this.responseMemory.delete(leadId);
    } else {
      this.responseMemory.clear();
    }
  }
}

export const responseVariationService = new ResponseVariationService();
