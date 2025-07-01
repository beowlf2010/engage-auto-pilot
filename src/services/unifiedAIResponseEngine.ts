
export interface MessageContext {
  leadId: string;
  leadName: string;
  latestMessage: string;
  conversationHistory: string[];
  vehicleInterest: string;
}

interface BaseResponse {
  message: string;
  confidence: number;
  responseType: 'greeting' | 'question_response' | 'follow_up' | 'vehicle_inquiry' | 'general';
}

class UnifiedAIResponseEngine {
  generateResponse(context: MessageContext): BaseResponse {
    console.log('🎤 [UNIFIED-AI] Generating base AI response...');

    try {
      // Analyze message intent
      const intent = this.analyzeMessageIntent(context.latestMessage);
      
      // Generate appropriate response
      const response = this.generateBaseResponse(context, intent);
      
      console.log(`✅ [UNIFIED-AI] Generated ${response.responseType} response with ${Math.round(response.confidence * 100)}% confidence`);
      return response;
    } catch (error) {
      console.error('❌ [UNIFIED-AI] Base response generation failed:', error);
      return {
        message: `Hi ${context.leadName}! Thanks for your message. I'm here to help with any questions about vehicles.`,
        confidence: 0.5,
        responseType: 'general'
      };
    }
  }

  private analyzeMessageIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('payment')) {
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

  private generateBaseResponse(context: MessageContext, intent: string): BaseResponse {
    const responses = {
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
