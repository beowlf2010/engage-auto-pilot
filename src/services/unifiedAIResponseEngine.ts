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
    
    if (lowerMessage.includes('pic') || lowerMessage.includes('photo') || lowerMessage.includes('image') || lowerMessage.includes('pictures')) {
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
    
    if (lowerMessage.includes('trade') || lowerMessage.includes('exchange')) {
      return 'trade_inquiry';
    } else if (lowerMessage.includes('finance') || lowerMessage.includes('loan')) {
      return 'financing_inquiry';
    }
    
    return undefined;
  }

  private determineResponseStrategy(intent: string, context: MessageContext): string {
    switch (intent) {
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
    const responses = {
      photo_request: {
        message: `Hi ${context.leadName}! I'd love to get you photos of ${context.vehicleInterest || 'the vehicle'}. While I don't have photos available to send right now, I can schedule a time for you to see the vehicle in person or provide detailed specifications. Would you prefer to come in for a quick look?`,
        confidence: 0.85,
        responseType: 'vehicle_inquiry' as const
      },
      price_inquiry: {
        message: `Hi ${context.leadName}! I'd be happy to discuss pricing with you. Let me get you the most current information on ${context.vehicleInterest || 'the vehicles you\'re interested in'}.`,
        confidence: 0.8,
        responseType: 'vehicle_inquiry' as const
      },
      availability_inquiry: {
        message: `Hi ${context.leadName}! Let me check our current inventory for ${context.vehicleInterest || 'the vehicle you\'re looking for'}. I'll get back to you with availability right away.`,
        confidence: 0.85,
        responseType: 'vehicle_inquiry' as const
      },
      appointment_request: {
        message: `Hi ${context.leadName}! I'd be happy to schedule a time for you to come in. When works best for your schedule?`,
        confidence: 0.9,
        responseType: 'follow_up' as const
      },
      question: {
        message: `Hi ${context.leadName}! Thanks for your question. I'm here to help with any information you need about ${context.vehicleInterest || 'our vehicles'}.`,
        confidence: 0.75,
        responseType: 'question_response' as const
      },
      greeting: {
        message: `Hello ${context.leadName}! Thanks for reaching out. How can I help you with ${context.vehicleInterest || 'finding the right vehicle'} today?`,
        confidence: 0.7,
        responseType: 'greeting' as const
      },
      general_inquiry: {
        message: `Hi ${context.leadName}! Thanks for your message. I'm here to help you with ${context.vehicleInterest || 'finding the perfect vehicle'}. What questions can I answer for you?`,
        confidence: 0.65,
        responseType: 'general' as const
      }
    };

    return responses[intent as keyof typeof responses] || responses.general_inquiry;
  }
}

export const unifiedAIResponseEngine = new UnifiedAIResponseEngine();
