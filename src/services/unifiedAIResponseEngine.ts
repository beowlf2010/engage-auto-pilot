import { vehicleExtractionService, type VehicleDetails } from './vehicleExtractionService';
import { appointmentSchedulingService, type SchedulingIntent } from './appointmentSchedulingService';

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
    tertiary?: string;
  };
  responseStrategy: string;
  reasoning: string[];
  vehicleContext?: VehicleDetails;
  schedulingContext?: SchedulingIntent;
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
      // Analyze message intent with enhanced detection
      const intent = this.analyzeMessageIntent(context.latestMessage);
      const secondaryIntent = this.detectSecondaryIntent(context.latestMessage);
      const tertiaryIntent = this.detectTertiaryIntent(context.latestMessage, intent, secondaryIntent);
      
      // Extract vehicle information
      const vehicleContext = vehicleExtractionService.extractVehicleInfo(context.latestMessage);
      
      // Analyze scheduling intent
      const schedulingContext = appointmentSchedulingService.analyzeSchedulingIntent(context.latestMessage);
      
      // Generate appropriate response with enhanced context
      const baseResponse = this.generateEnhancedResponse(context, intent, secondaryIntent, tertiaryIntent, vehicleContext, schedulingContext);
      
      // Create unified response with all required properties
      const unifiedResponse: UnifiedAIResponse = {
        message: baseResponse.message,
        confidence: baseResponse.confidence,
        responseType: baseResponse.responseType,
        intent: {
          primary: intent,
          secondary: secondaryIntent,
          tertiary: tertiaryIntent
        },
        responseStrategy: this.determineResponseStrategy(intent, context),
        reasoning: this.generateReasoningSteps(intent, context, vehicleContext, schedulingContext),
        vehicleContext: vehicleContext.primary || undefined,
        schedulingContext: schedulingContext.hasSchedulingRequest ? schedulingContext : undefined
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
    
    // Check for browsing stage intent FIRST (highest priority for customer experience)
    if (lowerMessage.includes('just looking') || lowerMessage.includes('just browsing') || 
        lowerMessage.includes('shopping around') || lowerMessage.includes('getting a feel') ||
        lowerMessage.includes('seeing what\'s out there') || lowerMessage.includes('researching') ||
        lowerMessage.includes('comparing') || lowerMessage.includes('looking around')) {
      return 'browsing_stage';
    }
    
    // Check for identity questions SECOND (new priority)
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
    const intentPatterns = [
      { pattern: /\b(price|cost|payment|pricing|how much)\b/i, intent: 'price_inquiry' },
      { pattern: /\b(trade|exchange|trade-in|tradein)\b/i, intent: 'trade_inquiry' },
      { pattern: /\b(finance|loan|financing|credit|monthly)\b/i, intent: 'financing_inquiry' },
      { pattern: /\b(available|in stock|inventory|have)\b/i, intent: 'availability_inquiry' },
      { pattern: /\b(schedule|appointment|visit|come in|meet)\b/i, intent: 'appointment_request' },
      { pattern: /\b(features|specs|options|equipment)\b/i, intent: 'feature_inquiry' },
      { pattern: /\b(color|colors|exterior|interior)\b/i, intent: 'color_inquiry' },
      { pattern: /\b(warranty|service|maintenance)\b/i, intent: 'service_inquiry' }
    ];
    
    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }
    
    return undefined;
  }

  private detectTertiaryIntent(message: string, primary: string, secondary?: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    // Skip if already detected as primary or secondary
    const alreadyDetected = [primary, secondary].filter(Boolean);
    
    const intentPatterns = [
      { pattern: /\b(when|what time|today|tomorrow|weekend)\b/i, intent: 'timing_inquiry' },
      { pattern: /\b(compare|versus|vs|difference|better)\b/i, intent: 'comparison_request' },
      { pattern: /\b(test drive|drive|try)\b/i, intent: 'test_drive_request' },
      { pattern: /\b(lease|leasing|rent)\b/i, intent: 'lease_inquiry' }
    ];
    
    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(lowerMessage) && !alreadyDetected.includes(intent)) {
        return intent;
      }
    }
    
    return undefined;
  }

  private determineResponseStrategy(intent: string, context: MessageContext): string {
    switch (intent) {
      case 'browsing_stage':
        return 'supportive_non_pressuring';
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

  private generateReasoningSteps(
    intent: string, 
    context: MessageContext, 
    vehicleContext?: any, 
    schedulingContext?: SchedulingIntent
  ): string[] {
    const steps = [
      `Detected intent: ${intent}`,
      `Lead has vehicle interest: ${context.vehicleInterest}`,
      `Conversation history length: ${context.conversationHistory.length} messages`
    ];
    
    if (vehicleContext?.hasSpecificVehicle) {
      steps.push(`Specific vehicle detected: ${vehicleContext.extractedText}`);
    }
    
    if (schedulingContext?.hasSchedulingRequest) {
      steps.push(`Scheduling request for: ${schedulingContext.appointmentType.type}`);
    }
    
    if (context.conversationHistory.length > 5) {
      steps.push('Established conversation - using personalized approach');
    } else {
      steps.push('New conversation - using introduction approach');
    }
    
    return steps;
  }

  private generateEnhancedResponse(
    context: MessageContext, 
    intent: string, 
    secondaryIntent?: string, 
    tertiaryIntent?: string,
    vehicleContext?: any,
    schedulingContext?: SchedulingIntent
  ): BaseResponse {
    // Extract just the first name for more personal responses
    const firstName = context.leadName.split(' ')[0] || context.leadName;
    
    // Handle composite responses for mixed questions (2+ intents)
    if (intent === 'identity_question' && secondaryIntent) {
      return this.generateCompositeResponse(context, intent, secondaryIntent, tertiaryIntent, vehicleContext);
    }
    
    // Handle enhanced objection responses
    if (intent.includes('objection')) {
      return this.generateObjectionResponse(context, intent, vehicleContext);
    }
    
    // Handle scheduling responses
    if (schedulingContext?.hasSchedulingRequest) {
      return this.generateSchedulingResponse(context, schedulingContext, vehicleContext);
    }
    
    const responses = {
      browsing_stage: {
        message: `Hi ${firstName}! That's perfectly fine - browsing is smart! No pressure at all. I'm here if you have any questions as you look around, or if you'd like me to share what's popular right now. Take your time!`,
        confidence: 0.95,
        responseType: 'follow_up' as const
      },
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
        message: `Hi ${firstName}! Thanks for your message. I'm here to help you with any questions you might have about vehicles. What would be most helpful to know?`,
        confidence: 0.65,
        responseType: 'general' as const
      }
    };

    return responses[intent as keyof typeof responses] || responses.general_inquiry;
  }

  private generateObjectionResponse(context: MessageContext, intent: string, vehicleContext?: any): BaseResponse {
    const firstName = context.leadName.split(' ')[0] || context.leadName;
    const vehicleMention = vehicleContext?.hasSpecificVehicle ? ` regarding the ${vehicleContext.extractedText}` : '';
    
    const objectionResponses = {
      budget_objection: {
        message: `I completely understand, ${firstName}. Budget is one of the most important factors in this decision${vehicleMention}. Let's explore some options that might work better for you - we have various financing programs and sometimes different vehicles that could meet your needs within your comfort zone. What would feel like a reasonable monthly payment for you?`,
        confidence: 0.9,
        responseType: 'follow_up' as const
      },
      timing_objection: {
        message: `That makes perfect sense, ${firstName}. Timing is everything with a purchase like this${vehicleMention}. I appreciate you being upfront about where you are in the process. When you mentioned you need more time, what would need to happen for the timing to feel right for you?`,
        confidence: 0.9,
        responseType: 'follow_up' as const
      },
      consideration_pause: {
        message: `Absolutely, ${firstName} - this is a significant decision and you should take all the time you need${vehicleMention}. I respect that you want to think it through carefully. Is there any specific information or concerns I could help address while you're considering your options?`,
        confidence: 0.85,
        responseType: 'follow_up' as const
      }
    };
    
    return objectionResponses[intent as keyof typeof objectionResponses] || {
      message: `I understand your concerns, ${firstName}${vehicleMention}. What would be most helpful in addressing them?`,
      confidence: 0.7,
      responseType: 'question_response' as const
    };
  }

  private generateSchedulingResponse(context: MessageContext, schedulingContext: SchedulingIntent, vehicleContext?: any): BaseResponse {
    const firstName = context.leadName.split(' ')[0] || context.leadName;
    const vehicleMention = vehicleContext?.hasSpecificVehicle ? ` for the ${vehicleContext.extractedText}` : '';
    
    return {
      message: `${schedulingContext.suggestedResponse.replace('I\'d be happy to schedule', `Hi ${firstName}! I'd be happy to schedule`)}${vehicleMention}`,
      confidence: schedulingContext.confidence,
      responseType: 'follow_up' as const
    };
  }

  private generateCompositeResponse(
    context: MessageContext, 
    primaryIntent: string, 
    secondaryIntent: string, 
    tertiaryIntent?: string,
    vehicleContext?: any
  ): BaseResponse {
    const firstName = context.leadName.split(' ')[0] || context.leadName;
    
    // Handle identity + price inquiry with enhanced vehicle context
    if (primaryIntent === 'identity_question' && secondaryIntent === 'price_inquiry') {
      let vehicleContextText = '';
      
      if (vehicleContext?.hasSpecificVehicle) {
        vehicleContextText = ` on the ${vehicleContext.extractedText}`;
      } else if (context.vehicleInterest && context.vehicleInterest !== 'finding the right vehicle for your needs') {
        vehicleContextText = ` on ${context.vehicleInterest}`;
      }
      
      // Add tertiary intent handling
      let additionalAction = '';
      if (tertiaryIntent === 'timing_inquiry') {
        additionalAction = ' and discuss timing that works for you';
      } else if (tertiaryIntent === 'test_drive_request') {
        additionalAction = ' and arrange a test drive';
      }
      
      return {
        message: `Hi ${firstName}! I'm your sales consultant here at the dealership. I'd be happy to help you with pricing information${vehicleContextText}${additionalAction}. ${vehicleContext?.hasSpecificVehicle ? 'I can get you specific pricing details on that vehicle.' : 'To give you the most accurate pricing, could you let me know which vehicle you\'re most interested in?'}`,
        confidence: 0.95,
        responseType: 'question_response' as const
      };
    }
    
    // Handle identity + other secondary intents with enhanced context
    const secondaryMessages = {
      availability_inquiry: `and check our current inventory${vehicleContext?.hasSpecificVehicle ? ` for the ${vehicleContext.extractedText}` : ''} for you`,
      appointment_request: `and schedule a time for you to visit${vehicleContext?.hasSpecificVehicle ? ` and see the ${vehicleContext.extractedText}` : ''}`,
      trade_inquiry: `and discuss your trade-in options`,
      financing_inquiry: `and explore financing options that work for you`,
      feature_inquiry: `and go over the features${vehicleContext?.hasSpecificVehicle ? ` of the ${vehicleContext.extractedText}` : ''} you're interested in`
    };
    
    const secondaryAction = secondaryMessages[secondaryIntent as keyof typeof secondaryMessages] || 'and answer any questions you have';
    
    // Add tertiary intent if present
    let tertiaryAction = '';
    if (tertiaryIntent && tertiaryIntent !== secondaryIntent) {
      const tertiaryMessages = {
        timing_inquiry: ', and find a time that works perfectly for your schedule',
        comparison_request: ', and help you compare your options',
        test_drive_request: ', and arrange a test drive when you\'re ready'
      };
      tertiaryAction = tertiaryMessages[tertiaryIntent as keyof typeof tertiaryMessages] || '';
    }
    
    return {
      message: `Hi ${firstName}! I'm your sales consultant here at the dealership. I'd be happy to introduce myself properly ${secondaryAction}${tertiaryAction}. What would be most helpful for you today?`,
      confidence: 0.9,
      responseType: 'question_response' as const
    };
  }
}

export const unifiedAIResponseEngine = new UnifiedAIResponseEngine();
