export interface MessageContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
  conversationMetadata?: {
    totalMessages: number;
    lastResponseTime?: string;
    appointmentHistory: any[];
    leadSource?: string;
    leadStatus?: string;
  };
}

export interface UnifiedAIResponse {
  message: string;
  confidence: number;
  responseType: 'greeting' | 'question_response' | 'follow_up' | 'vehicle_inquiry' | 'general';
  intent: {
    primary: string;
    secondary?: string;
  };
  responseStrategy: string;
  reasoning: string[];
}

interface BaseResponse {
  message: string;
  confidence: number;
  responseType: 'greeting' | 'question_response' | 'follow_up' | 'vehicle_inquiry' | 'general';
}

class UnifiedAIResponseEngine {
  generateResponse(context: MessageContext): UnifiedAIResponse {
    console.log('🎤 [UNIFIED-AI] Generating unified AI response...');

    try {
      // Analyze message intent
      const intent = this.analyzeMessageIntent(context.latestMessage);
      
      // Generate appropriate response
      const baseResponse = this.generateBaseResponse(context, intent);
      
      // Create unified response with all required properties
      const unifiedResponse: UnifiedAIResponse = {
        message: baseResponse.message,
        confidence: baseResponse.confidence,
        responseType: baseResponse.responseType,
        intent: {
          primary: intent,
          secondary: this.detectSecondaryIntent(context.latestMessage)
        },
        responseStrategy: this.determineResponseStrategy(intent, context),
        reasoning: this.generateReasoningSteps(intent, context)
      };
      
      console.log(`✅ [UNIFIED-AI] Generated ${unifiedResponse.responseType} response with ${Math.round(unifiedResponse.confidence * 100)}% confidence`);
      return unifiedResponse;
    } catch (error) {
      console.error('❌ [UNIFIED-AI] Unified response generation failed:', error);
      return {
        message: `Hi ${context.leadName}! Thanks for your message. I'm here to help with any questions about vehicles.`,
        confidence: 0.5,
        responseType: 'general',
        intent: { primary: 'general_inquiry' },
        responseStrategy: 'fallback',
        reasoning: ['Fallback response due to processing error']
      };
    }
  }

  validateResponseQuality(message: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!message || message.trim().length === 0) {
      issues.push('Message is empty');
    }
    
    if (message.length < 10) {
      issues.push('Message is too short');
    }
    
    if (message.length > 500) {
      issues.push('Message is too long');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private analyzeMessageIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Check for identity questions FIRST (new priority)
    if (lowerMessage.includes('who are you') || lowerMessage.includes('who is you') || 
        lowerMessage.includes('who am i talking to') || lowerMessage.includes('who is this') ||
        lowerMessage.includes('what is your name') || lowerMessage.includes('your name')) {
      return 'identity_question';
    }
    
    // Check for timing/budget objections (high priority)
    if (lowerMessage.includes('hold off') || lowerMessage.includes('holding off') || 
        lowerMessage.includes('save up') || lowerMessage.includes('saving up') ||
        lowerMessage.includes('need to save') || lowerMessage.includes('not ready')) {
      return 'timing_objection';
    } else if (lowerMessage.includes('too expensive') || lowerMessage.includes('can\'t afford') || 
               lowerMessage.includes('over budget')) {
      return 'budget_objection';
    } else if (lowerMessage.includes('think about') || lowerMessage.includes('need time') || 
               lowerMessage.includes('get back to you')) {
      return 'consideration_pause';
    } else if (lowerMessage.includes('pic') || lowerMessage.includes('photo') || lowerMessage.includes('image') || lowerMessage.includes('pictures')) {
      return 'photo_request';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('payment')) {
      return 'price_inquiry';
    } else if (lowerMessage.includes('available') || lowerMessage.includes('in stock')) {
      return 'availability_inquiry';
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment') || lowerMessage.includes('visit')) {
      return 'appointment_request';
    } else if (lowerMessage.includes('?')) {
      return 'question';
    } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      return 'greeting';
    } else {
      return 'general_inquiry';
    }
  }

  private detectSecondaryIntent(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced secondary intent detection for mixed questions
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('payment')) {
      return 'price_inquiry';
    } else if (lowerMessage.includes('trade') || lowerMessage.includes('exchange')) {
      return 'trade_inquiry';
    } else if (lowerMessage.includes('finance') || lowerMessage.includes('loan')) {
      return 'financing_inquiry';
    } else if (lowerMessage.includes('available') || lowerMessage.includes('in stock')) {
      return 'availability_inquiry';
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment') || lowerMessage.includes('visit')) {
      return 'appointment_request';
    }
    
    return undefined;
  }

  private determineResponseStrategy(intent: string, context: MessageContext): string {
    switch (intent) {
      case 'identity_question':
        return 'professional_introduction';
      case 'timing_objection':
      case 'budget_objection': 
      case 'consideration_pause':
        return 'empathetic_understanding';
      case 'price_inquiry':
        return 'value_focused';
      case 'availability_inquiry':
        return 'urgency_focused';
      case 'appointment_request':
        return 'scheduling_focused';
      case 'greeting':
        return 'relationship_building';
      default:
        return 'consultative';
    }
  }

  private generateReasoningSteps(intent: string, context: MessageContext): string[] {
    const steps = [
      `Detected intent: ${intent}`,
      `Lead has vehicle interest: ${context.vehicleInterest}`,
      `Conversation history length: ${context.conversationHistory.length} messages`
    ];
    
    if (context.conversationHistory.length > 5) {
      steps.push('Established conversation - using personalized approach');
    } else {
      steps.push('New conversation - using introduction approach');
    }
    
    return steps;
  }

  private generateBaseResponse(context: MessageContext, intent: string): BaseResponse {
    // Extract just the first name for more personal responses
    const firstName = context.leadName.split(' ')[0] || context.leadName;
    const secondaryIntent = this.detectSecondaryIntent(context.latestMessage);
    
    // Handle composite responses for mixed questions
    if (intent === 'identity_question' && secondaryIntent) {
      return this.generateCompositeResponse(context, intent, secondaryIntent);
    }
    
    const responses = {
      identity_question: {
        message: `Hi ${firstName}! I'm your sales consultant here at the dealership. I'd be happy to help you with any questions you have about our vehicles. What would you like to know?`,
        confidence: 0.9,
        responseType: 'question_response' as const
      },
      timing_objection: {
        message: `Hi ${firstName}! I completely understand - timing is everything with a major purchase like this. Thanks for letting me know your situation. When you're ready to move forward, I'll be here to help. In the meantime, if you have any questions or want to stay updated on what's available, just let me know!`,
        confidence: 0.95,
        responseType: 'follow_up' as const
      },
      budget_objection: {
        message: `Hi ${firstName}! I totally understand - budget is important. Thanks for being upfront with me. When you're ready to explore options, I'd be happy to discuss different vehicles and financing options that might work better for your situation. No pressure at all!`,
        confidence: 0.95,
        responseType: 'follow_up' as const
      },
      consideration_pause: {
        message: `Hi ${firstName}! That's completely understandable - this is a big decision and you should take the time you need. I'm here whenever you're ready to discuss further. Feel free to reach out with any questions that come up!`,
        confidence: 0.9,
        responseType: 'follow_up' as const
      },
      photo_request: {
        message: `Hi ${firstName}! I'd love to get you photos of ${context.vehicleInterest || 'the vehicle'}. While I don't have photos available to send right now, I can schedule a time for you to see the vehicle in person or provide detailed specifications. Would you prefer to come in for a quick look?`,
        confidence: 0.85,
        responseType: 'vehicle_inquiry' as const
      },
      price_inquiry: {
        message: `Hi ${firstName}! I'd be happy to discuss pricing with you. Let me get you the most current information on ${context.vehicleInterest || 'the vehicles you\'re interested in'}.`,
        confidence: 0.8,
        responseType: 'vehicle_inquiry' as const
      },
      availability_inquiry: {
        message: `Hi ${firstName}! Let me check our current inventory for ${context.vehicleInterest || 'the vehicle you\'re looking for'}. I'll get back to you with availability right away.`,
        confidence: 0.85,
        responseType: 'vehicle_inquiry' as const
      },
      appointment_request: {
        message: `Hi ${firstName}! I'd be happy to schedule a time for you to come in. When works best for your schedule?`,
        confidence: 0.9,
        responseType: 'follow_up' as const
      },
      question: {
        message: `Hi ${firstName}! Thanks for your question. I'm here to help with any information you need about ${context.vehicleInterest || 'our vehicles'}.`,
        confidence: 0.75,
        responseType: 'question_response' as const
      },
      greeting: {
        message: `Hello ${firstName}! Thanks for reaching out. How can I help you with ${context.vehicleInterest || 'finding the right vehicle'} today?`,
        confidence: 0.7,
        responseType: 'greeting' as const
      },
      general_inquiry: {
        message: `Hi ${firstName}! Thanks for your message. I'm here to help you with ${context.vehicleInterest || 'finding the perfect vehicle'}. What questions can I answer for you?`,
        confidence: 0.65,
        responseType: 'general' as const
      }
    };

    return responses[intent as keyof typeof responses] || responses.general_inquiry;
  }

  private generateCompositeResponse(context: MessageContext, primaryIntent: string, secondaryIntent: string): BaseResponse {
    const firstName = context.leadName.split(' ')[0] || context.leadName;
    
    // Handle identity + price inquiry (the specific case from the example)
    if (primaryIntent === 'identity_question' && secondaryIntent === 'price_inquiry') {
      const vehicleContext = context.vehicleInterest && context.vehicleInterest !== 'finding the right vehicle for your needs' 
        ? `on ${context.vehicleInterest}` 
        : '';
      
      return {
        message: `Hi ${firstName}! I'm your sales consultant here at the dealership. I'd be happy to help you with pricing information${vehicleContext}. To give you the most accurate pricing, could you let me know which vehicle you're interested in? I want to make sure I get you the right details.`,
        confidence: 0.95,
        responseType: 'question_response' as const
      };
    }
    
    // Handle identity + other secondary intents
    const secondaryMessages = {
      availability_inquiry: `and check our current inventory for you`,
      appointment_request: `and schedule a time for you to visit`,
      trade_inquiry: `and discuss your trade-in options`,
      financing_inquiry: `and explore financing options that work for you`
    };
    
    const secondaryAction = secondaryMessages[secondaryIntent as keyof typeof secondaryMessages] || 'and answer any questions you have';
    
    return {
      message: `Hi ${firstName}! I'm your sales consultant here at the dealership. I'd be happy to introduce myself properly ${secondaryAction}. What would be most helpful for you today?`,
      confidence: 0.9,
      responseType: 'question_response' as const
    };
  }
}

export const unifiedAIResponseEngine = new UnifiedAIResponseEngine();
