
import { supabase } from '@/integrations/supabase/client';
import { appointmentLinkService } from './appointmentLinkService';

export interface EnhancedAIRequest {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  lastCustomerMessage: string;
  conversationHistory: string;
  isInitialContact?: boolean;
}

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  includesAppointmentLink: boolean;
  appointmentIntent?: {
    detected: boolean;
    confidence: number;
    intentType: string;
  };
}

class EnhancedConversationAI {
  // Enhanced appointment intent detection with proactive triggers
  private detectAppointmentIntent(message: string, conversationHistory: string): { detected: boolean; confidence: number; intentType: string } {
    const appointmentKeywords = [
      'appointment', 'schedule', 'meet', 'visit', 'come in', 'stop by',
      'test drive', 'see the car', 'look at', 'check out', 'available',
      'when can', 'what time', 'this week', 'tomorrow', 'today'
    ];

    const questionWords = ['when', 'what time', 'how about', 'can we', 'could we', 'would you'];
    
    // ENHANCED: Detect conversation ending/closing signals (proactive triggers)
    const closingSignals = [
      'nothing else', 'that\'s all', 'sounds good', 'looks good', 'seems good',
      'no other questions', 'no more questions', 'i think that covers it',
      'that answers my questions', 'nothing else concerns me', 'that\'s everything',
      'all set', 'good to know', 'makes sense', 'understand', 'got it'
    ];
    
    // ENHANCED: Detect interest without action signals
    const interestWithoutAction = [
      'interesting', 'nice', 'cool', 'good', 'great', 'perfect', 'excellent',
      'i like', 'sounds nice', 'looks nice', 'that works', 'that\'s good'
    ];

    const messageLower = message.toLowerCase();
    const historyLower = conversationHistory.toLowerCase();
    let confidence = 0;
    let intentType = 'general';

    // Count conversation exchanges to detect if we should be more proactive
    const conversationLines = conversationHistory.split('\n').filter(line => line.trim());
    const customerMessages = conversationLines.filter(line => line.startsWith('Customer:'));
    const salesMessages = conversationLines.filter(line => line.startsWith('Sales:') || line.startsWith('You:'));
    const exchangeCount = Math.min(customerMessages.length, salesMessages.length);

    // Check for direct appointment keywords
    const keywordMatches = appointmentKeywords.filter(keyword => 
      messageLower.includes(keyword)
    ).length;
    confidence += keywordMatches * 0.3;

    // Check for question patterns about availability
    const questionMatches = questionWords.filter(word => 
      messageLower.includes(word)
    ).length;
    confidence += questionMatches * 0.2;

    // ENHANCED: Check for closing/ending signals (PROACTIVE TRIGGER)
    const closingSignalMatches = closingSignals.filter(signal => 
      messageLower.includes(signal)
    ).length;
    if (closingSignalMatches > 0) {
      confidence += 0.6; // High confidence for proactive appointment request
      intentType = 'conversation_ending';
    }

    // ENHANCED: Check for interest without action (PROACTIVE TRIGGER)
    const interestMatches = interestWithoutAction.filter(signal => 
      messageLower.includes(signal)
    ).length;
    if (interestMatches > 0 && exchangeCount >= 2) {
      confidence += 0.4; // Medium-high confidence for follow-up
      intentType = 'interested_but_stalling';
    }

    // ENHANCED: Proactive trigger for extended conversations without progression
    if (exchangeCount >= 3 && !historyLower.includes('appointment') && !historyLower.includes('test drive')) {
      confidence += 0.5; // High confidence for conversations that need direction
      intentType = 'conversation_stalling';
    }

    // ENHANCED: Time-based urgency (if it's later in the day, be more direct)
    const currentHour = new Date().getHours();
    if (currentHour >= 16 && currentHour <= 18) { // 4-6 PM
      confidence += 0.2; // Slight boost for end-of-day urgency
    }

    // Specific intent types (original logic)
    if (messageLower.includes('test drive')) {
      intentType = 'test_drive';
      confidence += 0.4;
    } else if (messageLower.includes('appointment') || messageLower.includes('schedule')) {
      intentType = 'consultation';
      confidence += 0.3;
    } else if (messageLower.includes('visit') || messageLower.includes('come in')) {
      intentType = 'visit';
      confidence += 0.2;
    }

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      detected: confidence > 0.3, // LOWERED threshold from 0.6 to 0.3 for more proactive approach
      confidence,
      intentType
    };
  }

  // Generate enhanced AI response with proactive appointment link injection
  async generateEnhancedResponse(request: EnhancedAIRequest): Promise<EnhancedAIResponse | null> {
    try {
      console.log('🎯 [ENHANCED AI] Processing request for', request.leadName);

      // Enhanced appointment intent detection
      const appointmentIntent = this.detectAppointmentIntent(
        request.lastCustomerMessage, 
        request.conversationHistory
      );
      
      console.log('📅 [ENHANCED AI] Appointment intent:', appointmentIntent);

      // Call the existing intelligent conversation AI
      const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId: request.leadId,
          leadName: request.leadName,
          vehicleInterest: request.vehicleInterest || '',
          lastCustomerMessage: request.lastCustomerMessage,
          conversationHistory: request.conversationHistory,
          isInitialContact: request.isInitialContact || false,
          salespersonName: 'Finn',
          dealershipName: 'Jason Pilger Chevrolet',
          appointmentIntent: appointmentIntent, // Pass enhanced intent to AI
          shouldBeAssertive: appointmentIntent.detected && appointmentIntent.confidence > 0.4 // Tell AI to be more assertive
        }
      });

      if (error || !data?.message) {
        console.error('❌ [ENHANCED AI] Error from base AI:', error);
        return null;
      }

      let finalMessage = data.message;
      let includesAppointmentLink = false;

      // ENHANCED: More aggressive appointment link inclusion (lowered threshold to 0.3)
      if (appointmentIntent.detected && appointmentIntent.confidence > 0.3) {
        console.log('🔗 [ENHANCED AI] Adding appointment booking link (confidence:', appointmentIntent.confidence, ')');
        
        try {
          const appointmentLink = await appointmentLinkService.generateBookingLink({
            leadId: request.leadId,
            leadName: request.leadName,
            vehicleInterest: request.vehicleInterest
          });

          // Use enhanced appointment message generation with context-specific templates
          finalMessage = appointmentLinkService.generateContextualAppointmentMessage(
            appointmentLink,
            request.leadName,
            request.vehicleInterest,
            appointmentIntent.intentType,
            appointmentIntent.confidence
          );

          includesAppointmentLink = true;
          console.log('✅ [ENHANCED AI] Proactive appointment link included in response');
        } catch (linkError) {
          console.error('❌ [ENHANCED AI] Error generating appointment link:', linkError);
          // Fall back to original message if link generation fails
        }
      }

      return {
        message: finalMessage,
        confidence: data.confidence || 0.9,
        reasoning: data.reasoning || 'Enhanced AI with proactive appointment intent detection',
        includesAppointmentLink,
        appointmentIntent
      };

    } catch (error) {
      console.error('❌ [ENHANCED AI] Error in enhanced response generation:', error);
      return null;
    }
  }
}

export const enhancedConversationAI = new EnhancedConversationAI();
