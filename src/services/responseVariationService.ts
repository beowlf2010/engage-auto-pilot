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
}

class ResponseVariationService {
  private usedResponses = new Map<string, Set<string>>();
  private responseMemory = new Map<string, string[]>();

  // Diverse greeting variations
  private greetings = {
    casual: [
      "Hey {name}!", "Hi there {name}!", "Hello {name}!", "Hi {name}!",
      "What's up {name}?", "Good to hear from you {name}!", "Hope you're doing well {name}!"
    ],
    professional: [
      "Hello {name},", "Good morning {name},", "Good afternoon {name},", 
      "Thank you for reaching out {name},", "I hope this message finds you well {name},",
      "It's great to connect with you {name},"
    ],
    enthusiastic: [
      "Hi {name}! 🚗", "Hey {name}! Excited to help!", "Hello {name}! Great to connect!",
      "Hi there {name}! Ready to find your perfect ride?", "Hey {name}! Let's find your dream car!"
    ],
    warm: [
      "Hi {name}, hope you're having a great day!", "Hello {name}, thanks for getting in touch!",
      "Hi {name}, I'm here and ready to help!", "Hello there {name}! Nice to meet you!"
    ]
  };

  // Vehicle reference variations
  private vehicleReferences = [
    "I see you're interested in the {vehicle}",
    "I noticed you're looking at the {vehicle}",
    "The {vehicle} caught your eye",
    "You're considering the {vehicle}",
    "I have some great info about the {vehicle}",
    "Let's talk about that {vehicle}",
    "The {vehicle} is a fantastic choice",
    "I'd love to help with the {vehicle}"
  ];

  // Call-to-action variations
  private callToActions = {
    question_based: [
      "What questions can I answer for you?",
      "What would you like to know more about?",
      "Is there anything specific you'd like to discuss?",
      "What information would be most helpful?",
      "What can I help clarify for you?"
    ],
    offer_based: [
      "I'd love to share some details with you.",
      "Let me know how I can help!",
      "I'm here to make this process easy for you.",
      "I can provide all the information you need.",
      "I'm ready to help you every step of the way."
    ],
    action_based: [
      "Should we set up a time to chat?",
      "Would you like to see some photos or details?",
      "Ready to take the next step?",
      "Want to schedule a test drive?",
      "Shall we discuss your options?"
    ],
    casual: [
      "What's on your mind?",
      "How can I help you out?",
      "What do you want to know?",
      "Let's figure this out together!",
      "What are you thinking?"
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

  // Generate fallback responses with variety
  generateDiverseFallback(leadName: string, vehicleInterest?: string): string {
    const fallbacks = [
      `Hi ${leadName}! I'm Finn with Jason Pilger Chevrolet. How can I help you today?`,
      `Hello ${leadName}! Thanks for reaching out. What can I assist you with?`,
      `Hey ${leadName}! I'm here to help with any questions you might have.`,
      `Hi there ${leadName}! What brings you our way today?`,
      `Hello ${leadName}! Ready to help you find exactly what you're looking for.`,
      `Hi ${leadName}! Let's make your car shopping experience great!`,
      `Hey ${leadName}! What can I do for you today?`,
      `Hello ${leadName}! I'm excited to help you out.`
    ];
    
    if (vehicleInterest) {
      fallbacks.push(
        `Hi ${leadName}! I see you're interested in ${vehicleInterest}. Let's chat!`,
        `Hello ${leadName}! The ${vehicleInterest} is a great choice. What would you like to know?`,
        `Hey ${leadName}! Ready to talk about that ${vehicleInterest}?`
      );
    }
    
    return this.selectRandom(fallbacks);
  }

  private selectPersonality(config: ResponseVariationConfig): 'casual' | 'professional' | 'enthusiastic' | 'warm' {
    // Logic to select personality based on context
    if (config.conversationStage === 'initial') {
      return Math.random() < 0.5 ? 'warm' : 'professional';
    }
    if (config.conversationStage === 'closing') {
      return Math.random() < 0.6 ? 'enthusiastic' : 'professional';
    }
    
    const personalities: ('casual' | 'professional' | 'enthusiastic' | 'warm')[] = 
      ['casual', 'professional', 'enthusiastic', 'warm'];
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

  // Generate context-aware response
  generateContextualResponse(config: ResponseVariationConfig): string {
    const timeOfDay = this.getTimeOfDay();
    const fullConfig = { ...config, timeOfDay };
    
    return this.generateVariedResponse(fullConfig);
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
