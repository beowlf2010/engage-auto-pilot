
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
  // Detect appointment intent in customer messages
  private detectAppointmentIntent(message: string): { detected: boolean; confidence: number; intentType: string } {
    const appointmentKeywords = [
      'appointment', 'schedule', 'meet', 'visit', 'come in', 'stop by',
      'test drive', 'see the car', 'look at', 'check out', 'available',
      'when can', 'what time', 'this week', 'tomorrow', 'today'
    ];

    const questionWords = ['when', 'what time', 'how about', 'can we', 'could we', 'would you'];
    
    const messageLower = message.toLowerCase();
    let confidence = 0;
    let intentType = 'general';

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

    // Specific intent types
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
      detected: confidence > 0.6, // Only consider high-confidence detections
      confidence,
      intentType
    };
  }

  // Generate enhanced AI response with automatic appointment link injection
  async generateEnhancedResponse(request: EnhancedAIRequest): Promise<EnhancedAIResponse | null> {
    try {
      console.log('🎯 [ENHANCED AI] Processing request for', request.leadName);

      // Detect appointment intent in the customer's message
      const appointmentIntent = this.detectAppointmentIntent(request.lastCustomerMessage);
      
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
          appointmentIntent: appointmentIntent // Pass intent to AI
        }
      });

      if (error || !data?.message) {
        console.error('❌ [ENHANCED AI] Error from base AI:', error);
        return null;
      }

      let finalMessage = data.message;
      let includesAppointmentLink = false;

      // If appointment intent is detected with high confidence, add booking link
      if (appointmentIntent.detected && appointmentIntent.confidence > 0.7) {
        console.log('🔗 [ENHANCED AI] Adding appointment booking link');
        
        try {
          const appointmentLink = await appointmentLinkService.generateBookingLink({
            leadId: request.leadId,
            leadName: request.leadName,
            vehicleInterest: request.vehicleInterest
          });

          // Replace the AI message with one that includes the appointment link
          finalMessage = appointmentLinkService.generateAppointmentMessage(
            appointmentLink,
            request.leadName,
            request.vehicleInterest
          );

          includesAppointmentLink = true;
          console.log('✅ [ENHANCED AI] Appointment link included in response');
        } catch (linkError) {
          console.error('❌ [ENHANCED AI] Error generating appointment link:', linkError);
          // Fall back to original message if link generation fails
        }
      }

      return {
        message: finalMessage,
        confidence: data.confidence || 0.9,
        reasoning: data.reasoning || 'Enhanced AI with appointment intent detection',
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
